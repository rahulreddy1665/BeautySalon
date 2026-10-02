import mongoose from "mongoose";

import { Appointment } from "../models/appointment.model";
import { Service } from "../models/service.model";
import { Staff } from "../models/staff.model";
import { Customer } from "../models/customer.model";

export interface AppointmentServiceInput {
  serviceId: string;
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

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function buildServiceLines(services: AppointmentServiceInput[]) {
  if (!Array.isArray(services) || services.length === 0) {
    throw Object.assign(new Error("At least one service is required"), {
      statusCode: 400,
    });
  }

  const lines = [];
  for (const item of services) {
    const service = await Service.findById(item.serviceId);
    if (!service) {
      throw Object.assign(new Error(`Service not found: ${item.serviceId}`), {
        statusCode: 400,
      });
    }
    const staff = await Staff.findById(item.staffId);
    if (!staff) {
      throw Object.assign(new Error(`Staff not found: ${item.staffId}`), {
        statusCode: 400,
      });
    }
    if (!staff.isActive) {
      throw Object.assign(
        new Error(`Staff "${staff.name}" is inactive and cannot be booked`),
        { statusCode: 400 },
      );
    }
    lines.push({
      service: service._id as mongoose.Types.ObjectId,
      name: service.name,
      durationMinutes: service.durationMinutes ?? 30,
      staff: staff._id as mongoose.Types.ObjectId,
    });
  }
  return lines;
}

async function assertNoStaffConflict(opts: {
  date: string;
  startMin: number;
  endMin: number;
  staffIds: string[];
  excludeId?: string;
}) {
  const filter: Record<string, unknown> = {
    date: opts.date,
    status: { $in: ["booked", "completed"] },
    "services.staff": { $in: opts.staffIds },
  };
  if (opts.excludeId) filter._id = { $ne: opts.excludeId };

  const existing = await Appointment.find(filter);
  for (const appt of existing) {
    const otherStart = parseTimeToMinutes(appt.startTime);
    const otherEnd = parseTimeToMinutes(appt.endTime);
    if (otherStart === null || otherEnd === null) continue;
    if (!rangesOverlap(opts.startMin, opts.endMin, otherStart, otherEnd)) {
      continue;
    }
    const conflictingStaff = appt.services.find((s) =>
      opts.staffIds.includes(String(s.staff)),
    );
    const staffName = conflictingStaff
      ? String(conflictingStaff.staff)
      : "staff";
    const staffDoc = conflictingStaff
      ? await Staff.findById(conflictingStaff.staff)
      : null;
    throw Object.assign(
      new Error(
        `Conflicts with ${staffDoc?.name ?? staffName}'s appointment ${appt.startTime}–${appt.endTime} on ${appt.date}`,
      ),
      { statusCode: 409 },
    );
  }
}

function assertNotPast(date: string, startTime: string, allowPast: boolean) {
  if (allowPast) return;
  const startMin = parseTimeToMinutes(startTime);
  if (startMin === null) {
    throw Object.assign(new Error("Invalid startTime (use HH:mm)"), {
      statusCode: 400,
    });
  }
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (date < today) {
    throw Object.assign(new Error("Cannot book in the past"), {
      statusCode: 400,
    });
  }
  if (date === today) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (startMin < nowMin) {
      throw Object.assign(new Error("Cannot book a past time today"), {
        statusCode: 400,
      });
    }
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
    const totalDuration = lines.reduce((sum, l) => sum + l.durationMinutes, 0);
    const endMin = startMin + totalDuration;
    const endTime = minutesToTime(endMin);
    const staffIds = [...new Set(lines.map((l) => String(l.staff)))];

    await assertNoStaffConflict({
      date: data.date,
      startMin,
      endMin,
      staffIds,
    });

    const customerFields = await resolveCustomerFields(data);

    const appointment = await Appointment.create({
      ...customerFields,
      services: lines,
      date: data.date,
      startTime: data.startTime,
      endTime,
      status: "booked",
      notes: data.notes?.trim() || undefined,
      createdBy: data.createdBy || null,
    });

    return { statusCode: 200, data: appointment };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    return {
      statusCode,
      data: null,
      message: error instanceof Error ? error.message : "Create failed",
    };
  }
};

export const getAppointments = async (query: AppointmentListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const filter: Record<string, unknown> = {};

    if (query.date) filter.date = query.date;
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) (filter.date as Record<string, string>).$gte = query.from;
      if (query.to) (filter.date as Record<string, string>).$lte = query.to;
    }
    if (query.status) filter.status = query.status;
    if (query.staffId) filter["services.staff"] = query.staffId;

    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .populate("customer", "name lastName phone")
        .populate("services.staff", "name isActive")
        .populate("services.service", "name durationMinutes price")
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
      .populate("services.service", "name durationMinutes price")
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
    if (current.status === "completed") {
      return {
        statusCode: 400,
        data: null,
        message: "Completed appointments cannot be edited",
      };
    }
    if (current.status === "cancelled") {
      return {
        statusCode: 400,
        data: null,
        message: "Cancelled appointments cannot be edited",
      };
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

    // Reschedule may keep past original; only enforce past when changing date/time
    const changingSchedule =
      (data.date !== undefined && data.date !== current.date) ||
      (data.startTime !== undefined && data.startTime !== current.startTime);
    assertNotPast(date, startTime, !changingSchedule);

    const lines = data.services
      ? await buildServiceLines(data.services)
      : current.services.map((s) => ({
          service: s.service,
          name: s.name,
          durationMinutes: s.durationMinutes,
          staff: s.staff,
        }));

    const totalDuration = lines.reduce((sum, l) => sum + l.durationMinutes, 0);
    const endMin = startMin + totalDuration;
    const endTime = minutesToTime(endMin);
    const staffIds = [...new Set(lines.map((l) => String(l.staff)))];

    await assertNoStaffConflict({
      date,
      startMin,
      endMin,
      staffIds,
      excludeId: id,
    });

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
      endTime,
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
    if (current.status === "completed") {
      return {
        statusCode: 400,
        data: null,
        message: "Completed appointments cannot change status",
      };
    }
    if (status === "cancelled" && current.status === "completed") {
      return {
        statusCode: 400,
        data: null,
        message: "Completed appointments cannot be cancelled",
      };
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
