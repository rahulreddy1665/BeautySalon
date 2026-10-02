import { CreateProductDto, ProductListQuery, UpdateProductDto } from "../dto/product.dto";
import { Product } from "../models/product.model";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export const createProduct = async (data: CreateProductDto) => {
  try {
    const name = String(data.name ?? "").trim();
    const price = normalizePrice(data.price);
    if (!name) {
      return { statusCode: 400, data: null, message: "Name is required" };
    }
    if (price === null) {
      return {
        statusCode: 400,
        data: null,
        message: "Price must be a non-negative number",
      };
    }

    const existing = await Product.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    });
    if (existing) {
      return {
        statusCode: 409,
        data: null,
        message: "A product with this name already exists",
      };
    }

    const product = await Product.create({ name, price });
    return { statusCode: 200, data: product };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getProducts = async (query: ProductListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const filter: Record<string, unknown> = {};

    if (query.search?.trim()) {
      filter.name = {
        $regex: escapeRegex(query.search.trim()),
        $options: "i",
      };
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
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

export const getProductById = async (id: string) => {
  try {
    const product = await Product.findById(id);
    if (!product) {
      return { statusCode: 404, data: null, message: "Product not found" };
    }
    return { statusCode: 200, data: product };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateProduct = async (id: string, data: UpdateProductDto) => {
  try {
    const current = await Product.findById(id);
    if (!current) {
      return { statusCode: 404, data: null, message: "Product not found" };
    }

    const nextName =
      data.name !== undefined ? String(data.name).trim() : current.name;
    if (!nextName) {
      return { statusCode: 400, data: null, message: "Name is required" };
    }

    const duplicate = await Product.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegex(nextName)}$`, "i") },
    });
    if (duplicate) {
      return {
        statusCode: 409,
        data: null,
        message: "A product with this name already exists",
      };
    }

    const update: Record<string, unknown> = { name: nextName };
    if (data.price !== undefined) {
      const price = normalizePrice(data.price);
      if (price === null) {
        return {
          statusCode: 400,
          data: null,
          message: "Price must be a non-negative number",
        };
      }
      update.price = price;
    }

    const product = await Product.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: product };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return { statusCode: 404, data: null, message: "Product not found" };
    }
    return { statusCode: 200, data: product };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export type ProductImportRowResult = {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  reason?: string;
  name?: string;
};

/** Upsert by name. Never fails the whole file for one bad row. */
export const importProducts = async (
  rows: Array<{ name?: string; price?: unknown }>,
) => {
  const results: ProductImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let error = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2; // header is row 1
    const name = String(rows[i]?.name ?? "").trim();
    const price = normalizePrice(rows[i]?.price);

    if (!name && (rows[i]?.price === undefined || rows[i]?.price === "")) {
      results.push({ row: rowNum, status: "skipped", reason: "Empty row" });
      skipped += 1;
      continue;
    }
    if (!name) {
      results.push({
        row: rowNum,
        status: "error",
        reason: "Name is required",
      });
      error += 1;
      continue;
    }
    if (price === null) {
      results.push({
        row: rowNum,
        status: "error",
        name,
        reason: "Price must be a non-negative number",
      });
      error += 1;
      continue;
    }

    try {
      const existing = await Product.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      });
      if (existing) {
        existing.price = price;
        await existing.save();
        results.push({ row: rowNum, status: "updated", name });
        updated += 1;
      } else {
        await Product.create({ name, price });
        results.push({ row: rowNum, status: "created", name });
        created += 1;
      }
    } catch (err) {
      results.push({
        row: rowNum,
        status: "error",
        name,
        reason: err instanceof Error ? err.message : "Save failed",
      });
      error += 1;
    }
  }

  return {
    statusCode: 200,
    data: {
      results,
      summary: { created, updated, skipped, error, total: rows.length },
    },
  };
};
