import {
  CreateServiceDto,
  ServiceListQuery,
  UpdateServiceDto,
} from "../dto/service.dto";
import { Service } from "../models/service.model";

function normalizeDuration(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 5) return 30;
  // Snap to nearest step of 5
  return Math.max(5, Math.round(n / 5) * 5);
}

function normalizePrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export const createService = async (data: CreateServiceDto) => {
  try {
    const name = String(data.name ?? "").trim();
    const category = String(data.category ?? "").trim();
    const price = normalizePrice(data.price);
    if (!name || !category) {
      return { statusCode: 400, data: null, message: "Name and category are required" };
    }
    if (price === null) {
      return { statusCode: 400, data: null, message: "Price must be a non-negative number" };
    }

    const existing = await Service.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      category: { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") },
    });
    if (existing) {
      return {
        statusCode: 409,
        data: null,
        message: "A service with this name already exists in this category",
      };
    }

    const service = await Service.create({
      name,
      category,
      price,
      durationMinutes: normalizeDuration(data.durationMinutes),
    });
    return { statusCode: 200, data: service };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getServices = async (query: ServiceListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const filter: Record<string, unknown> = {};

    if (query.category?.trim()) {
      filter.category = {
        $regex: new RegExp(`^${escapeRegex(query.category.trim())}$`, "i"),
      };
    }
    if (query.search?.trim()) {
      const q = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Service.find(filter)
        .sort({ category: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Service.countDocuments(filter),
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

export const getServiceCategories = async () => {
  try {
    const categories = await Service.distinct("category");
    return {
      statusCode: 200,
      data: (categories as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getServiceById = async (id: string) => {
  try {
    const service = await Service.findById(id);
    if (!service) return { statusCode: 404, data: null, message: "Service not found" };
    return { statusCode: 200, data: service };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateService = async (id: string, data: UpdateServiceDto) => {
  try {
    const current = await Service.findById(id);
    if (!current) return { statusCode: 404, data: null, message: "Service not found" };

    const nextName = data.name !== undefined ? String(data.name).trim() : current.name;
    const nextCategory =
      data.category !== undefined ? String(data.category).trim() : current.category;

    if (!nextName || !nextCategory) {
      return { statusCode: 400, data: null, message: "Name and category are required" };
    }

    const duplicate = await Service.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegex(nextName)}$`, "i") },
      category: { $regex: new RegExp(`^${escapeRegex(nextCategory)}$`, "i") },
    });
    if (duplicate) {
      return {
        statusCode: 409,
        data: null,
        message: "A service with this name already exists in this category",
      };
    }

    const update: Record<string, unknown> = {
      name: nextName,
      category: nextCategory,
    };
    if (data.price !== undefined) {
      const price = normalizePrice(data.price);
      if (price === null) {
        return { statusCode: 400, data: null, message: "Price must be a non-negative number" };
      }
      update.price = price;
    }
    if (data.durationMinutes !== undefined) {
      update.durationMinutes = normalizeDuration(data.durationMinutes);
    }

    const service = await Service.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: service };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteService = async (id: string) => {
  try {
    const service = await Service.findByIdAndDelete(id);
    if (!service) return { statusCode: 404, data: null, message: "Service not found" };
    return { statusCode: 200, data: service };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export type ImportRowResult = {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  reason?: string;
  name?: string;
  category?: string;
};

/** Upsert by name + category. Never fails the whole file for one bad row. */
export const importServices = async (
  rows: Array<{
    name?: string;
    category?: string;
    price?: unknown;
    durationMinutes?: unknown;
  }>,
) => {
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2; // +2 accounts for header row in spreadsheet
    const raw = rows[i] ?? {};
    const name = String(raw.name ?? "").trim();
    const category = String(raw.category ?? "").trim();
    const price = normalizePrice(raw.price);
    const durationRaw = raw.durationMinutes;
    const durationBlank =
      durationRaw === undefined ||
      durationRaw === null ||
      String(durationRaw).trim() === "";

    if (!name || !category) {
      results.push({
        row: rowNum,
        status: "error",
        reason: "Name and category are required",
        name,
        category,
      });
      continue;
    }
    if (price === null || price <= 0) {
      results.push({
        row: rowNum,
        status: "error",
        reason: "Price must be a positive number",
        name,
        category,
      });
      continue;
    }

    try {
      const existing = await Service.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
        category: { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") },
      });

      const durationMinutes = durationBlank
        ? 30
        : normalizeDuration(durationRaw);

      if (existing) {
        const same =
          existing.price === price &&
          existing.durationMinutes === durationMinutes &&
          existing.name === name &&
          existing.category === category;
        if (same) {
          results.push({ row: rowNum, status: "skipped", name, category, reason: "No changes" });
          continue;
        }
        existing.name = name;
        existing.category = category;
        existing.price = price;
        existing.durationMinutes = durationMinutes;
        await existing.save();
        results.push({ row: rowNum, status: "updated", name, category });
      } else {
        await Service.create({ name, category, price, durationMinutes });
        results.push({ row: rowNum, status: "created", name, category });
      }
    } catch (error) {
      results.push({
        row: rowNum,
        status: "error",
        name,
        category,
        reason: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  return {
    statusCode: 200,
    data: {
      results,
      summary: {
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        error: results.filter((r) => r.status === "error").length,
      },
    },
  };
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
