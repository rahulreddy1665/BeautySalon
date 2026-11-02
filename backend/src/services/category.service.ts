import mongoose from "mongoose";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Category } from "../models/category.model";
import { Service } from "../models/service.model";

export interface CategoryInput {
  name?: string;
  isActive?: boolean;
}

function toNameKey(name: string): string {
  return name.trim().toLowerCase();
}

async function withServiceCounts<T extends { _id: unknown; toObject?: () => object }>(
  docs: T[],
) {
  const ids = docs.map((d) => d._id);
  const counts = await Service.aggregate<{ _id: unknown; count: number }>([
    { $match: { categoryId: { $in: ids } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  return docs.map((d) => {
    const base =
      typeof d.toObject === "function" ? d.toObject() : (d as unknown as object);
    return {
      ...base,
      activeServiceCount: map.get(String(d._id)) ?? 0,
    };
  });
}

export const listCategories = async (opts: { activeOnly?: boolean } = {}) => {
  try {
    const filter: Record<string, unknown> = {};
    if (opts.activeOnly) filter.isActive = true;
    const items = await Category.find(filter).sort({ name: 1 });
    return { statusCode: 200, data: await withServiceCounts(items) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const createCategory = async (data: CategoryInput) => {
  try {
    const name = String(data.name ?? "").trim();
    if (!name) return fail(400, "Category name is required");
    const nameKey = toNameKey(name);
    const exists = await Category.findOne({ nameKey });
    if (exists) {
      return fail(
        409,
        "A category with this name already exists",
        ErrorCodes.CATEGORY_DUPLICATE,
      );
    }
    const doc = await Category.create({
      name,
      nameKey,
      isActive: data.isActive !== false,
    });
    return {
      statusCode: 200,
      data: { ...doc.toObject(), activeServiceCount: 0 },
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return fail(
        409,
        "A category with this name already exists",
        ErrorCodes.CATEGORY_DUPLICATE,
      );
    }
    return { statusCode: 500, data: error };
  }
};

export const updateCategory = async (id: string, data: CategoryInput) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    const doc = await Category.findById(id);
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) return fail(400, "Category name is required");
      const nameKey = toNameKey(name);
      const clash = await Category.findOne({
        nameKey,
        _id: { $ne: doc._id },
      });
      if (clash) {
        return fail(
          409,
          "A category with this name already exists",
          ErrorCodes.CATEGORY_DUPLICATE,
        );
      }
      doc.name = name;
      doc.nameKey = nameKey;
      // Keep denormalized string in sync for linked services
      await Service.updateMany({ categoryId: doc._id }, { $set: { category: name } });
    }

    if (data.isActive !== undefined) {
      if (data.isActive === false) {
        const inUse = await Service.countDocuments({ categoryId: doc._id });
        if (inUse > 0) {
          return fail(
            400,
            ErrorMessages.CATEGORY_IN_USE,
            ErrorCodes.CATEGORY_IN_USE,
            { code: ErrorCodes.CATEGORY_IN_USE, activeServiceCount: inUse },
          );
        }
      }
      doc.isActive = Boolean(data.isActive);
    }

    await doc.save();
    const [withCount] = await withServiceCounts([doc]);
    return { statusCode: 200, data: withCount };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

/** Find-or-create by name (case-insensitive). Returns the category doc. */
export const ensureCategoryByName = async (rawName: string) => {
  const name = String(rawName ?? "").trim();
  if (!name) return null;
  const nameKey = toNameKey(name);
  let doc = await Category.findOne({ nameKey });
  if (!doc) {
    doc = await Category.create({ name, nameKey, isActive: true });
  }
  return doc;
};

/**
 * One-time migration: create categories from distinct service.category strings
 * and set categoryId. Keeps the old string field.
 */
export const migrateCategoriesFromServices = async () => {
  try {
    const services = await Service.find({}, { name: 1, category: 1, categoryId: 1 });
    const groups = new Map<
      string,
      { canonical: string; variants: Set<string>; serviceIds: string[] }
    >();

    for (const s of services) {
      const raw = String(s.category ?? "").trim();
      if (!raw) continue;
      const key = toNameKey(raw);
      if (!groups.has(key)) {
        groups.set(key, {
          canonical: raw,
          variants: new Set([raw]),
          serviceIds: [],
        });
      }
      const g = groups.get(key)!;
      g.variants.add(raw);
      g.serviceIds.push(String(s._id));
    }

    const mapping: Array<{
      categoryName: string;
      variants: string[];
      serviceCount: number;
      categoryId: string;
      created: boolean;
    }> = [];

    for (const [, g] of groups) {
      const nameKey = toNameKey(g.canonical);
      let doc = await Category.findOne({ nameKey });
      let created = false;
      if (!doc) {
        doc = await Category.create({
          name: g.canonical,
          nameKey,
          isActive: true,
        });
        created = true;
      }
      await Service.updateMany(
        { _id: { $in: g.serviceIds } },
        { $set: { categoryId: doc._id, category: doc.name } },
      );
      mapping.push({
        categoryName: doc.name,
        variants: [...g.variants],
        serviceCount: g.serviceIds.length,
        categoryId: String(doc._id),
        created,
      });
    }

    return {
      statusCode: 200,
      data: {
        mapping: mapping.sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName),
        ),
        categoriesCreated: mapping.filter((m) => m.created).length,
        servicesLinked: mapping.reduce((n, m) => n + m.serviceCount, 0),
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
