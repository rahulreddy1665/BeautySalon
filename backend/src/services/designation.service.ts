import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { validatePermissionsOrError } from "../constants/permissions";
import { Designation } from "../models/designation.model";
import { Staff } from "../models/staff.model";

export interface DesignationInput {
  name?: string;
  isActive?: boolean;
  permissions?: string[];
  maxDiscountPercent?: number;
  canViewRevenue?: boolean;
  canExport?: boolean;
}

async function withStaffCounts<T extends { _id: unknown; toObject?: () => object }>(
  docs: T[],
) {
  const ids = docs.map((d) => d._id);
  const counts = await Staff.aggregate<{ _id: unknown; count: number }>([
    { $match: { designation: { $in: ids } } },
    { $group: { _id: "$designation", count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  return docs.map((d) => {
    const base =
      typeof d.toObject === "function" ? d.toObject() : (d as unknown as object);
    return {
      ...base,
      staffCount: map.get(String(d._id)) ?? 0,
    };
  });
}

export const listDesignations = async () => {
  try {
    const items = await Designation.find().sort({
      isSystemAdmin: -1,
      name: 1,
    });
    return { statusCode: 200, data: await withStaffCounts(items) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const createDesignation = async (data: DesignationInput) => {
  try {
    const name = String(data.name ?? "").trim();
    if (!name) return fail(400, "Name is required");
    const exists = await Designation.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (exists) {
      return fail(409, "Designation name already exists", ErrorCodes.CONFLICT);
    }

    let permissions: string[] = [];
    if (data.permissions !== undefined) {
      const checked = validatePermissionsOrError(data.permissions);
      if (!checked.ok) {
        return fail(
          400,
          `Unknown permission keys: ${checked.unknown.join(", ")}`,
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      permissions = checked.permissions;
    }

    const doc = await Designation.create({
      name,
      isActive: data.isActive !== false,
      permissions,
      maxDiscountPercent: Math.min(
        100,
        Math.max(0, Number(data.maxDiscountPercent) || 0),
      ),
      canViewRevenue: Boolean(data.canViewRevenue),
      canExport: Boolean(data.canExport),
    });
    return {
      statusCode: 200,
      data: { ...doc.toObject(), staffCount: 0 },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateDesignation = async (
  id: string,
  data: DesignationInput,
) => {
  try {
    const doc = await Designation.findById(id);
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    if (doc.isSystemAdmin) {
      return fail(
        400,
        "Admin designation cannot be edited",
        ErrorCodes.FORBIDDEN,
      );
    }

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) return fail(400, "Name is required");
      doc.name = name;
    }
    if (data.permissions !== undefined) {
      const checked = validatePermissionsOrError(data.permissions);
      if (!checked.ok) {
        return fail(
          400,
          `Unknown permission keys: ${checked.unknown.join(", ")}`,
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      doc.permissions = checked.permissions;
    }
    if (data.maxDiscountPercent !== undefined) {
      doc.maxDiscountPercent = Math.min(
        100,
        Math.max(0, Number(data.maxDiscountPercent) || 0),
      );
    }
    if (data.canViewRevenue !== undefined) {
      doc.canViewRevenue = Boolean(data.canViewRevenue);
    }
    if (data.canExport !== undefined) {
      doc.canExport = Boolean(data.canExport);
    }
    if (data.isActive !== undefined) {
      if (data.isActive === false) {
        const activeStaff = await Staff.countDocuments({
          designation: doc._id,
          isActive: true,
        });
        if (activeStaff > 0) {
          return fail(
            400,
            ErrorMessages.DESIGNATION_IN_USE,
            ErrorCodes.DESIGNATION_IN_USE,
          );
        }
      }
      doc.isActive = Boolean(data.isActive);
    }

    await doc.save();
    const [withCount] = await withStaffCounts([doc]);
    return { statusCode: 200, data: withCount };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteDesignation = async (id: string) => {
  try {
    const doc = await Designation.findById(id);
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    if (doc.isSystemAdmin) {
      return fail(
        400,
        "Admin designation cannot be deleted",
        ErrorCodes.FORBIDDEN,
      );
    }
    const staffCount = await Staff.countDocuments({ designation: doc._id });
    if (staffCount > 0) {
      return fail(
        400,
        ErrorMessages.DESIGNATION_IN_USE,
        ErrorCodes.DESIGNATION_IN_USE,
      );
    }
    await Designation.findByIdAndDelete(id);
    return { statusCode: 200, data: { ...doc.toObject(), staffCount: 0 } };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
