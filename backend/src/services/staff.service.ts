import { CreateStaffDto, StaffListQuery, UpdateStaffDto } from "../dto/staff.dto";
import { Staff } from "../models/staff.model";

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

export const createStaff = async (data: CreateStaffDto) => {
  try {
    const error = validateStaffPayload(data);
    if (error) return { statusCode: 400, data: null, message: error };

    const staff = await Staff.create({
      name: String(data.name).trim(),
      age: Number(data.age),
      gender: data.gender,
      isActive: data.isActive !== false,
    });
    return { statusCode: 200, data: staff };
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
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Staff.countDocuments(filter),
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

export const getStaffById = async (id: string) => {
  try {
    const staff = await Staff.findById(id);
    if (!staff) return { statusCode: 404, data: null, message: "Staff not found" };
    return { statusCode: 200, data: staff };
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

    const staff = await Staff.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!staff) return { statusCode: 404, data: null, message: "Staff not found" };
    return { statusCode: 200, data: staff };
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
