import mongoose from "mongoose";

import { CreateStaffDto, StaffListQuery, UpdateStaffDto } from "../dto/staff.dto";
import { Designation } from "../models/designation.model";
import { Staff } from "../models/staff.model";
import { attachLoginMeta } from "./staff-login.service";

const GENDERS = new Set(["Male", "Female", "Other"]);

function validateStaffPayload(
  data: Partial<CreateStaffDto>,
  partial = false,
): string | null {
  if (!partial || data.name !== undefined) {
    if (!String(data.name ?? "").trim()) return "Name is required";
  }
  if (!partial || data.age !== undefined) {
    const age = Number(data.age);
    if (!Number.isFinite(age) || age < 14 || age > 80) {
      return "Age must be between 14 and 80";
    }
  }
  if (!partial || data.gender !== undefined) {
    if (!GENDERS.has(String(data.gender))) {
      return "Gender must be Male, Female, or Other";
    }
  }
  return null;
}

async function resolveDesignationId(
  designationId?: string | null,
): Promise<{ id: mongoose.Types.ObjectId | null; error?: string }> {
  if (designationId === undefined) return { id: null };
  if (designationId === null || designationId === "") return { id: null };
  if (!mongoose.isValidObjectId(designationId)) {
    return { id: null, error: "Invalid designation" };
  }
  const des = await Designation.findById(designationId);
  if (!des || !des.isActive) return { id: null, error: "Designation not found" };
  return { id: des._id as mongoose.Types.ObjectId };
}

export const createStaff = async (data: CreateStaffDto) => {
  try {
    const error = validateStaffPayload(data);
    if (error) return { statusCode: 400, data: null, message: error };

    const des = await resolveDesignationId(data.designationId);
    if (des.error) return { statusCode: 400, data: null, message: des.error };

    const staff = await Staff.create({
      name: String(data.name).trim(),
      age: Number(data.age),
      gender: data.gender,
      isActive: data.isActive !== false,
      designation: des.id,
    });
    const created = await Staff.findById(staff._id).populate(
      "designation",
      "name isActive",
    );
    if (!created) return { statusCode: 500, data: null, message: "Create failed" };
    return { statusCode: 200, data: await attachLoginMeta(created) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getStaffList = async (query: StaffListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const filter: Record<string, unknown> = {};

    if (query.isActive === "true") filter.isActive = true;
    if (query.isActive === "false") filter.isActive = false;
    if (query.search?.trim()) {
      filter.name = { $regex: query.search.trim(), $options: "i" };
    }

    const [items, total] = await Promise.all([
      Staff.find(filter)
        .populate("designation", "name isActive")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Staff.countDocuments(filter),
    ]);

    const withMeta = await Promise.all(items.map((s) => attachLoginMeta(s)));

    return {
      statusCode: 200,
      data: {
        items: withMeta,
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

export const getStaffById = async (id: string) => {
  try {
    const staff = await Staff.findById(id).populate("designation", "name isActive");
    if (!staff) return { statusCode: 404, data: null, message: "Staff not found" };
    return { statusCode: 200, data: await attachLoginMeta(staff) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateStaff = async (id: string, data: UpdateStaffDto) => {
  try {
    const error = validateStaffPayload(data, true);
    if (error) return { statusCode: 400, data: null, message: error };

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = String(data.name).trim();
    if (data.age !== undefined) update.age = Number(data.age);
    if (data.gender !== undefined) update.gender = data.gender;
    if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
    if (data.designationId !== undefined) {
      const des = await resolveDesignationId(data.designationId);
      if (des.error) return { statusCode: 400, data: null, message: des.error };
      update.designation = des.id;
    }

    const staff = await Staff.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).populate("designation", "name isActive");
    if (!staff) return { statusCode: 404, data: null, message: "Staff not found" };
    return { statusCode: 200, data: await attachLoginMeta(staff) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteStaff = async (id: string) => {
  try {
    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) return { statusCode: 404, data: null, message: "Staff not found" };
    return { statusCode: 200, data: staff };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
