import {
  CreateProductDto,
  ProductListQuery,
  UpdateProductDto,
  type ProductType,
} from "../dto/product.dto";
import { Product } from "../models/product.model";
import { enableTrackingWithOpening } from "./stock.service";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function normalizeType(value: unknown): ProductType {
  const t = String(value ?? "retail").trim().toLowerCase();
  return t === "consumable" ? "consumable" : "retail";
}

export const createProduct = async (
  data: CreateProductDto,
  opts: { createdBy?: string | null } = {},
) => {
  try {
    const name = String(data.name ?? "").trim();
    const type = normalizeType(data.type);
    const price =
      data.price !== undefined
        ? normalizePrice(data.price)
        : type === "consumable"
          ? 0
          : null;
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

    const trackStock = Boolean(data.trackStock);
    const unit = String(data.unit ?? "").trim();
    const product = await Product.create({
      name,
      price,
      type,
      trackStock: false,
      stockQty: 0,
      unit,
    });

    if (trackStock || data.openingStock !== undefined) {
      const opening =
        data.openingStock !== undefined ? Number(data.openingStock) : 0;
      const tracked = await enableTrackingWithOpening({
        productId: String(product._id),
        openingQty: opening,
        createdBy: opts.createdBy,
      });
      if (tracked.statusCode !== 200) {
        await Product.findByIdAndDelete(product._id);
        return tracked;
      }
      const refreshed = await Product.findById(product._id);
      return { statusCode: 200, data: refreshed ?? product };
    }

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

    const retailOnly =
      query.retailOnly === true ||
      query.retailOnly === "true" ||
      query.retailOnly === "1";
    if (retailOnly) {
      filter.type = "retail";
    } else if (query.type && query.type !== "all") {
      filter.type = normalizeType(query.type);
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

export const updateProduct = async (
  id: string,
  data: UpdateProductDto,
  opts: { createdBy?: string | null } = {},
) => {
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

    current.name = nextName;
    if (data.type !== undefined) {
      current.type = normalizeType(data.type);
    }
    if (data.unit !== undefined) {
      current.unit = String(data.unit ?? "").trim();
    }
    if (data.price !== undefined) {
      const price = normalizePrice(data.price);
      if (price === null) {
        return {
          statusCode: 400,
          data: null,
          message: "Price must be a non-negative number",
        };
      }
      current.price = price;
    } else if (current.type === "consumable" && data.type === "consumable") {
      // keep price; consumables may be 0
    }

    await current.save();

    if (data.trackStock === true || data.openingStock !== undefined) {
      const opening =
        data.openingStock !== undefined
          ? Number(data.openingStock)
          : current.stockQty;
      const tracked = await enableTrackingWithOpening({
        productId: id,
        openingQty: Number.isFinite(opening) ? opening : 0,
        createdBy: opts.createdBy,
      });
      if (tracked.statusCode !== 200) return tracked;
    } else if (data.trackStock === false) {
      current.trackStock = false;
      await current.save();
    }

    const product = await Product.findById(id);
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
  rows: Array<{
    name?: string;
    price?: unknown;
    type?: unknown;
    unit?: unknown;
    openingStock?: unknown;
  }>,
  opts: { createdBy?: string | null } = {},
) => {
  const results: ProductImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let error = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2; // header is row 1
    const name = String(rows[i]?.name ?? "").trim();
    const type = normalizeType(rows[i]?.type);
    const unit = String(rows[i]?.unit ?? "").trim();
    const openingRaw = rows[i]?.openingStock;
    const openingBlank =
      openingRaw === undefined ||
      openingRaw === null ||
      String(openingRaw).trim() === "";
    const price =
      rows[i]?.price === undefined || rows[i]?.price === ""
        ? type === "consumable"
          ? 0
          : null
        : normalizePrice(rows[i]?.price);

    if (
      !name &&
      (rows[i]?.price === undefined || rows[i]?.price === "") &&
      openingBlank
    ) {
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
      const trackStock = !openingBlank;
      const openingStock = openingBlank ? undefined : Number(openingRaw);

      if (existing) {
        const result = await updateProduct(
          String(existing._id),
          {
            name,
            price,
            type,
            unit,
            trackStock: trackStock || existing.trackStock,
            openingStock,
          },
          opts,
        );
        if (result.statusCode !== 200) {
          results.push({
            row: rowNum,
            status: "error",
            name,
            reason: (result as { message?: string }).message ?? "Update failed",
          });
          error += 1;
        } else {
          results.push({ row: rowNum, status: "updated", name });
          updated += 1;
        }
      } else {
        const result = await createProduct(
          {
            name,
            price,
            type,
            unit,
            trackStock,
            openingStock,
          },
          opts,
        );
        if (result.statusCode !== 200) {
          results.push({
            row: rowNum,
            status: "error",
            name,
            reason: (result as { message?: string }).message ?? "Create failed",
          });
          error += 1;
        } else {
          results.push({ row: rowNum, status: "created", name });
          created += 1;
        }
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
