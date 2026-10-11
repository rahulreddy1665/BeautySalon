import mongoose from "mongoose";

import { Appointment } from "../models/appointment.model";
import { Combo } from "../models/combo.model";
import { Service } from "../models/service.model";
import { Staff } from "../models/staff.model";
import { Customer } from "../models/customer.model";
import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { getOrCreateSettings } from "./settings.service";
import type { Weekday } from "../models/settings.model";
import {
  getSalonNow,
  isAppointmentLocked,
  isFinalAppointmentStatus,
  parseHhMm,
} from "../utils/salonTime";

const WEEKDAY_KEYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

async function assertWithinBusinessHours(date: string, startMin: number) {
  const settings = await getOrCreateSettings();
  const open =
    settings.business.openingTime ||
    `${String(settings.appointments.startHour).padStart(2, "0")}:00`;
  const close =
    settings.business.closingTime ||
    `${String(settings.appointments.endHour).padStart(2, "0")}:00`;
  const openMin = parseTimeToMinutes(open);
  const closeMin = parseTimeToMinutes(close);
  if (openMin == null || closeMin == null) return;

  const working =
    settings.business.workingDays?.length
      ? settings.business.workingDays
      : (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as Weekday[]);

  const dow = new Date(`${date}T12:00:00`).getDay();
  const dayKey = WEEKDAY_KEYS[dow];
  if (!working.includes(dayKey)) {
    throw Object.assign(new Error(ErrorMessages.NON_WORKING_DAY), {
      statusCode: 400,
      code: ErrorCodes.SALON_CLOSED,
    });
  }

  if (startMin < openMin || startMin >= closeMin) {
    const openLabel = formatAmPm(openMin);
    const closeLabel = formatAmPm(closeMin);
    throw Object.assign(
      new Error(ErrorMessages.OUTSIDE_HOURS(openLabel, closeLabel)),
      { statusCode: 400, code: ErrorCodes.SALON_CLOSED },
    );
  }
}

function formatAmPm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface AppointmentServiceInput {
  /** Regular service line. Omit when expanding a combo. */
  serviceId?: string;
  /** Expand combo into component services (same staff). */
  comboId?: string;
  staffId: string;
}

export interface CreateAppointmentDto {
  customerId?: string | null;
  guestName?: string;
  guestPhone?: string;
  services: AppointmentServiceInput[];
  date: string;
  startTime: string;
  notes?: string;
  createdBy?: string | null;
}

export interface UpdateAppointmentDto {
  customerId?: string | null;
  guestName?: string;
  guestPhone?: string;
  services?: AppointmentServiceInput[];
  date?: string;
  startTime?: string;
  notes?: string;
}

export interface AppointmentListQuery {
  date?: string;
  from?: string;
  to?: string;
  staffId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}


function badRequest(message: string) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function assertObjectId(id: string | undefined, label: string): string {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw badRequest(`${label} not found: ${id ?? ""}`);
  }
  return id;
}

/**
 * Resolves booking lines with a fixed number of queries regardless of how many
 * lines there are: staff + combos in parallel, then every service (direct and
 * combo components) in one `$in`. Previously each line did its own findById.
 */
async function buildServiceLines(services: AppointmentServiceInput[]) {
  if (!Array.isArray(services) || services.length === 0) {
    throw badRequest("At least one service is required");
  }

  const staffIds = new Set<string>();
  const comboIds = new Set<string>();
  const directServiceIds = new Set<string>();
  for (const item of services) {
    staffIds.add(assertObjectId(item.staffId, "Staff"));
    if (item.comboId) {
      comboIds.add(assertObjectId(item.comboId, "Combo"));
    } else if (item.serviceId) {
      directServiceIds.add(assertObjectId(item.serviceId, "Service"));
    } else {
      throw badRequest("serviceId or comboId is required");
    }
  }

  // Round trip 1: staff and combos together.
  const [staffDocs, comboDocs] = await Promise.all([
    Staff.find({ _id: { $in: [...staffIds] } })
      .select("name isActive")
      .lean(),
    comboIds.size
      ? Combo.find({
          _id: { $in: [...comboIds] },
          isDeleted: false,
          isActive: true,
        })
          .select("services")
          .lean()
      : Promise.resolve([]),
  ]);
  const staffById = new Map(staffDocs.map((d) => [String(d._id), d]));
  const comboById = new Map(comboDocs.map((d) => [String(d._id), d]));

  // Round trip 2: every service referenced directly or through a combo.
  const allServiceIds = new Set(directServiceIds);
  for (const combo of comboDocs) {
    for (const row of combo.services) allServiceIds.add(String(row.service));
  }
  const serviceDocs = await Service.find({ _id: { $in: [...allServiceIds] } })
    .select("name")
    .lean();
  const serviceById = new Map(serviceDocs.map((d) => [String(d._id), d]));

  // Build lines in request order; same validation and messages as before.
  const lines = [];
  for (const item of services) {
    const staff = staffById.get(String(item.staffId));
    if (!staff) throw badRequest(`Staff not found: ${item.staffId}`);
    if (!staff.isActive) {
      throw badRequest(`Staff "${staff.name}" is inactive and cannot be booked`);
    }
    const staffId = staff._id as mongoose.Types.ObjectId;

    if (item.comboId) {
      const combo = comboById.get(String(item.comboId));
      if (!combo) throw badRequest(`Combo not found: ${item.comboId}`);
      for (const row of combo.services) {
        const service = serviceById.get(String(row.service));
        if (!service) {
          throw badRequest(`Service not found in combo: ${String(row.service)}`);
        }
        const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
        for (let i = 0; i < qty; i += 1) {
          lines.push({
            service: service._id as mongoose.Types.ObjectId,
            name: service.name,
            staff: staffId,
          });
        }
      }
      continue;
    }

    const service = serviceById.get(String(item.serviceId));
    if (!service) throw badRequest(`Service not found: ${item.serviceId}`);
    lines.push({
      service: service._id as mongoose.Types.ObjectId,
      name: service.name,
      staff: staffId,
    });
  }
  return lines;
}

function assertNotPast(date: string, startTime: string, allowPast: boolean) {
  if (allowPast) return;
  const startMin = parseHhMm(startTime);
  if (startMin === null) {
    throw Object.assign(new Error("Invalid startTime (use HH:mm)"), {
      statusCode: 400,
    });
  }
  const salon = getSalonNow();
  if (date < salon.dateKey) {
    throw Object.assign(new Error("Cannot book in the past"), {
      statusCode: 400,
      code: ErrorCodes.APPOINTMENT_LOCKED,
    });
  }
  if (date === salon.dateKey && startMin < salon.totalMinutes) {
    throw Object.assign(new Error("Cannot book a past time today"), {
      statusCode: 400,
      code: ErrorCodes.APPOINTMENT_LOCKED,
    });
  }
}

async function resolveCustomerFields(data: {
  customerId?: string | null;
  guestName?: string;
  guestPhone?: string;
}) {
  if (data.customerId) {
    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      throw Object.assign(new Error("Customer not found"), { statusCode: 400 });
    }
    return {
      customer: customer._id,
      guestName: undefined,
      guestPhone: undefined,
    };
  }
  const guestName = String(data.guestName ?? "").trim();
  if (!guestName) {
    throw Object.assign(
      new Error("Provide a customer or guest name"),
      { statusCode: 400 },
    );
  }
  return {
    customer: null,
    guestName,
    guestPhone: String(data.guestPhone ?? "").trim() || undefined,
  };
}

export const createAppointment = async (data: CreateAppointmentDto) => {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return { statusCode: 400, data: null, message: "date must be YYYY-MM-DD" };
    }
    const startMin = parseTimeToMinutes(data.startTime);
    if (startMin === null) {
      return { statusCode: 400, data: null, message: "startTime must be HH:mm" };
    }

    assertNotPast(data.date, data.startTime, false);
    const lines = await buildServiceLines(data.services);

    await assertWithinBusinessHours(data.date, startMin);

    const customerFields = await resolveCustomerFields(data);

    const appointment = await Appointment.create({
      ...customerFields,
      services: lines,
      date: data.date,
      startTime: data.startTime,
      status: "booked",
      notes: data.notes?.trim() || undefined,
      createdBy: data.createdBy || null,
    });

    return { statusCode: 200, data: appointment };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    const code = (error as { code?: string }).code;
    return {
      statusCode,
      data: null,
      message: error instanceof Error ? error.message : "Create failed",
      errors: code ? { code } : null,
    };
  }
};

export const getAppointments = async (query: AppointmentListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(1000, Math.max(1, Number(query.limit) || 50));
    const filter: Record<string, unknown> = {};

    if (query.from || query.to) {
      filter.date = {};
      if (query.from) (filter.date as Record<string, string>).$gte = query.from;
      if (query.to) (filter.date as Record<string, string>).$lte = query.to;
    } else if (query.date) {
      filter.date = query.date;
    }
    if (query.status) filter.status = query.status;
    if (query.staffId) filter["services.staff"] = query.staffId;

    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .populate("customer", "name lastName phone")
        .populate("services.staff", "name isActive")
        .populate("services.service", "name price")
        .sort({ date: 1, startTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return {
      statusCode: 200,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getAppointmentById = async (id: string) => {
  try {
    const appointment = await Appointment.findById(id)
      .populate("customer", "name lastName phone")
      .populate("services.staff", "name isActive")
      .populate("services.service", "name price")
      .populate("invoice");
    if (!appointment) {
      return { statusCode: 404, data: null, message: "Appointment not found" };
    }
    return { statusCode: 200, data: appointment };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateAppointment = async (
  id: string,
  data: UpdateAppointmentDto,
) => {
  try {
    const current = await Appointment.findById(id);
    if (!current) {
      return { statusCode: 404, data: null, message: "Appointment not found" };
    }
    if (
      isAppointmentLocked(current.status, current.date, current.startTime)
    ) {
      return fail(
        400,
        ErrorMessages[ErrorCodes.APPOINTMENT_LOCKED],
        ErrorCodes.APPOINTMENT_LOCKED,
      );
    }

    const date = data.date ?? current.date;
    const startTime = data.startTime ?? current.startTime;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { statusCode: 400, data: null, message: "date must be YYYY-MM-DD" };
    }
    const startMin = parseTimeToMinutes(startTime);
    if (startMin === null) {
      return { statusCode: 400, data: null, message: "startTime must be HH:mm" };
    }

    // New schedule must not be in the past (salon zone).
    assertNotPast(date, startTime, false);

    const lines = data.services
      ? await buildServiceLines(data.services)
      : current.services.map((s) => ({
          service: s.service,
          name: s.name,
          staff: s.staff,
        }));

    await assertWithinBusinessHours(date, startMin);

    let customerFields: {
      customer: mongoose.Types.ObjectId | null;
      guestName?: string;
      guestPhone?: string;
    } = {
      customer: current.customer ?? null,
      guestName: current.guestName,
      guestPhone: current.guestPhone,
    };

    if (
      data.customerId !== undefined ||
      data.guestName !== undefined ||
      data.guestPhone !== undefined
    ) {
      customerFields = await resolveCustomerFields({
        customerId: data.customerId !== undefined ? data.customerId : current.customer ? String(current.customer) : null,
        guestName: data.guestName !== undefined ? data.guestName : current.guestName,
        guestPhone: data.guestPhone !== undefined ? data.guestPhone : current.guestPhone,
      });
    }

    current.set({
      ...customerFields,
      services: lines,
      date,
      startTime,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
    });
    await current.save();

    return { statusCode: 200, data: current };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    return {
      statusCode,
      data: null,
      message: error instanceof Error ? error.message : "Update failed",
    };
  }
};

export const changeAppointmentStatus = async (
  id: string,
  status: "booked" | "completed" | "cancelled" | "no_show",
) => {
  try {
    const current = await Appointment.findById(id);
    if (!current) {
      return { statusCode: 404, data: null, message: "Appointment not found" };
    }
    if (isFinalAppointmentStatus(current.status)) {
      return fail(
        400,
        ErrorMessages[ErrorCodes.APPOINTMENT_LOCKED],
        ErrorCodes.APPOINTMENT_LOCKED,
      );
    }
    // Cancel is blocked once the start time has passed; no-show / completed still OK.
    if (
      status === "cancelled" &&
      isAppointmentLocked(current.status, current.date, current.startTime)
    ) {
      return fail(
        400,
        ErrorMessages[ErrorCodes.APPOINTMENT_LOCKED],
        ErrorCodes.APPOINTMENT_LOCKED,
      );
    }
    if (current.status !== "booked") {
      return fail(
        400,
        ErrorMessages[ErrorCodes.APPOINTMENT_LOCKED],
        ErrorCodes.APPOINTMENT_LOCKED,
      );
    }
    current.status = status;
    await current.save();
    return { statusCode: 200, data: current };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const cancelAppointment = async (id: string) =>
  changeAppointmentStatus(id, "cancelled");
