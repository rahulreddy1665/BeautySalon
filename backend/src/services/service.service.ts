import mongoose from "mongoose";

import {
  CreateServiceDto,
  ServiceListQuery,
  UpdateServiceDto,
} from "../dto/service.dto";
import { Category } from "../models/category.model";
import { Service } from "../models/service.model";
import { ensureCategoryByName } from "./category.service";

function normalizePrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveCategory(input: {
  categoryId?: string;
  category?: string;
}): Promise<{ categoryId: mongoose.Types.ObjectId; category: string } | null> {
  if (input.categoryId && mongoose.Types.ObjectId.isValid(input.categoryId)) {
    const doc = await Category.findById(input.categoryId);
    if (!doc || !doc.isActive) return null;
    return { categoryId: doc._id as mongoose.Types.ObjectId, category: doc.name };
  }
  const name = String(input.category ?? "").trim();
  if (!name) return null;
  const doc = await ensureCategoryByName(name);
  if (!doc) return null;
  return { categoryId: doc._id as mongoose.Types.ObjectId, category: doc.name };
}

export const createService = async (data: CreateServiceDto) => {
  try {
    const name = String(data.name ?? "").trim();
    const price = normalizePrice(data.price);
    if (!name) {
      return { statusCode: 400, data: null, message: "Name and category are required" };
    }
    if (price === null) {
      return { statusCode: 400, data: null, message: "Price must be a non-negative number" };
    }

    const resolved = await resolveCategory({
      categoryId: data.categoryId,
      category: data.category,
    });
    if (!resolved) {
      return { statusCode: 400, data: null, message: "Name and category are required" };
    }

    const existing = await Service.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      category: { $regex: new RegExp(`^${escapeRegex(resolved.category)}$`, "i") },
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
      category: resolved.category,
      categoryId: resolved.categoryId,
      price,
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

    if (query.categoryId && mongoose.Types.ObjectId.isValid(query.categoryId)) {
      filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
    } else if (query.category?.trim()) {
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
        .populate("categoryId", "name isActive")
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

/** Active category names from the master (falls back to distinct strings). */
export const getServiceCategories = async () => {
  try {
    const master = await Category.find({ isActive: true }).sort({ name: 1 });
    if (master.length > 0) {
      return {
        statusCode: 200,
        data: master.map((c) => c.name),
      };
    }
    const categories = await Service.distinct("category");
    return {
      statusCode: 200,
      data: (categories as string[])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getServiceById = async (id: string) => {
  try {
    const service = await Service.findById(id).populate("categoryId", "name isActive");
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
    let nextCategory = current.category;
    let nextCategoryId = current.categoryId ?? null;

    if (data.categoryId !== undefined || data.category !== undefined) {
      const resolved = await resolveCategory({
        categoryId: data.categoryId,
        category: data.category,
      });
      if (!resolved) {
        return { statusCode: 400, data: null, message: "Name and category are required" };
      }
      nextCategory = resolved.category;
      nextCategoryId = resolved.categoryId;
    }

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
      categoryId: nextCategoryId,
    };
    if (data.price !== undefined) {
      const price = normalizePrice(data.price);
      if (price === null) {
        return { statusCode: 400, data: null, message: "Price must be a non-negative number" };
      }
      update.price = price;
    }

    const service = await Service.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "name isActive");
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
  categoryCreated?: boolean;
};

/** Upsert by name + category. Unknown category names create a new master. */
export const importServices = async (
  rows: Array<{
    name?: string;
    category?: string;
    price?: unknown;
  }>,
) => {
  const results: ImportRowResult[] = [];
  const categoriesCreated = new Set<string>();

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const raw = rows[i] ?? {};
    const name = String(raw.name ?? "").trim();
    const categoryName = String(raw.category ?? "").trim();
    const price = normalizePrice(raw.price);

    if (!name || !categoryName) {
      results.push({
        row: rowNum,
        status: "error",
        reason: "Name and category are required",
        name,
        category: categoryName,
      });
      continue;
    }
    if (price === null || price <= 0) {
      results.push({
        row: rowNum,
        status: "error",
        reason: "Price must be a positive number",
        name,
        category: categoryName,
      });
      continue;
    }

    try {
      const nameKey = categoryName.toLowerCase();
      const existedBefore = await Category.findOne({ nameKey });
      const cat = await ensureCategoryByName(categoryName);
      if (!cat) {
        results.push({
          row: rowNum,
          status: "error",
          reason: "Could not resolve category",
          name,
          category: categoryName,
        });
        continue;
      }
      const categoryCreated = !existedBefore;
      if (categoryCreated) categoriesCreated.add(cat.name);

      const existing = await Service.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
        category: { $regex: new RegExp(`^${escapeRegex(cat.name)}$`, "i") },
      });

      if (existing) {
        const same =
          existing.price === price &&
          existing.name === name &&
          existing.category === cat.name &&
          String(existing.categoryId ?? "") === String(cat._id);
        if (same) {
          results.push({
            row: rowNum,
            status: "skipped",
            name,
            category: cat.name,
            reason: "No changes",
            categoryCreated,
          });
          continue;
        }
        existing.name = name;
        existing.category = cat.name;
        existing.categoryId = cat._id as mongoose.Types.ObjectId;
        existing.price = price;
        await existing.save();
        results.push({
          row: rowNum,
          status: "updated",
          name,
          category: cat.name,
          categoryCreated,
        });
      } else {
        await Service.create({
          name,
          category: cat.name,
          categoryId: cat._id,
          price,
        });
        results.push({
          row: rowNum,
          status: "created",
          name,
          category: cat.name,
          categoryCreated,
        });
      }
    } catch (error) {
      results.push({
        row: rowNum,
        status: "error",
        name,
        category: categoryName,
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
        categoriesCreated: categoriesCreated.size,
        newCategories: [...categoriesCreated],
      },
    },
  };
};
