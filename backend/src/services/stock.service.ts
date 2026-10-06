import mongoose from "mongoose";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Product } from "../models/product.model";
import {
  StockLedger,
  type StockLedgerType,
} from "../models/stock-ledger.model";
import { getOrCreateSettings } from "./settings.service";

function roundQty(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

async function allowNegativeStock(): Promise<boolean> {
  const settings = await getOrCreateSettings();
  return Boolean(settings.business?.allowNegativeStock);
}

async function writeLedger(opts: {
  productId: mongoose.Types.ObjectId;
  type: StockLedgerType;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  note?: string;
  reference?: mongoose.Types.ObjectId | null;
  staff?: mongoose.Types.ObjectId | null;
  createdBy?: string | null;
}) {
  return StockLedger.create({
    product: opts.productId,
    type: opts.type,
    quantity: opts.quantity,
    balanceAfter: opts.balanceAfter,
    reason: opts.reason,
    note: opts.note,
    reference: opts.reference ?? null,
    staff: opts.staff ?? null,
    createdBy: opts.createdBy || null,
  });
}

/**
 * Atomically apply a signed delta to stockQty when trackStock is on.
 * Rejects oversell when allow-negative is off.
 */
export async function applyStockDelta(opts: {
  productId: string;
  delta: number;
  type: StockLedgerType;
  reason?: string;
  note?: string;
  reference?: string | null;
  staffId?: string | null;
  createdBy?: string | null;
  /** Force allow/deny negative; defaults to settings. */
  allowNegative?: boolean;
}) {
  if (!mongoose.Types.ObjectId.isValid(opts.productId)) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  const delta = roundQty(Number(opts.delta));
  if (!Number.isFinite(delta) || delta === 0) {
    return fail(400, "Stock quantity change must be a non-zero number");
  }

  const product = await Product.findById(opts.productId);
  if (!product) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  if (!product.trackStock) {
    return fail(400, "Stock tracking is not enabled for this product");
  }

  const allowNeg =
    opts.allowNegative !== undefined
      ? opts.allowNegative
      : await allowNegativeStock();

  const filter: Record<string, unknown> = {
    _id: product._id,
    trackStock: true,
  };
  if (delta < 0 && !allowNeg) {
    filter.stockQty = { $gte: Math.abs(delta) };
  }

  const updated = await Product.findOneAndUpdate(
    filter,
    { $inc: { stockQty: delta } },
    { new: true },
  );

  if (!updated) {
    const available = product.stockQty;
    return fail(
      409,
      ErrorMessages.INSUFFICIENT_STOCK_FOR(product.name, available),
      ErrorCodes.INSUFFICIENT_STOCK,
      {
        code: ErrorCodes.INSUFFICIENT_STOCK,
        productId: String(product._id),
        productName: product.name,
        available,
        requested: Math.abs(delta),
      },
    );
  }

  const entry = await writeLedger({
    productId: updated._id as mongoose.Types.ObjectId,
    type: opts.type,
    quantity: delta,
    balanceAfter: updated.stockQty,
    reason: opts.reason,
    note: opts.note,
    reference: opts.reference
      ? new mongoose.Types.ObjectId(opts.reference)
      : null,
    staff: opts.staffId
      ? new mongoose.Types.ObjectId(opts.staffId)
      : null,
    createdBy: opts.createdBy,
  });

  return {
    statusCode: 200,
    data: { product: updated, entry },
  };
}

export const addStock = async (opts: {
  productId: string;
  quantity: number;
  note?: string;
  createdBy?: string | null;
  type?: "opening" | "purchase";
}) => {
  const qty = roundQty(Number(opts.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    return fail(400, "Quantity must be greater than 0");
  }
  const product = await Product.findById(opts.productId);
  if (!product) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  if (!product.trackStock) {
    product.trackStock = true;
    await product.save();
  }
  return applyStockDelta({
    productId: opts.productId,
    delta: qty,
    type: opts.type ?? "purchase",
    note: opts.note,
    createdBy: opts.createdBy,
    allowNegative: true,
  });
};

export const useStock = async (opts: {
  productId: string;
  quantity: number;
  reason: string;
  staffId?: string | null;
  createdBy?: string | null;
}) => {
  const qty = roundQty(Number(opts.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    return fail(400, "Quantity must be greater than 0");
  }
  const reason = String(opts.reason ?? "").trim();
  if (!reason) {
    return fail(400, "Reason is required for stock usage");
  }
  return applyStockDelta({
    productId: opts.productId,
    delta: -qty,
    type: "usage",
    reason,
    staffId: opts.staffId,
    createdBy: opts.createdBy,
  });
};

export const adjustStock = async (opts: {
  productId: string;
  countedQty: number;
  reason: string;
  createdBy?: string | null;
}) => {
  const counted = roundQty(Number(opts.countedQty));
  if (!Number.isFinite(counted)) {
    return fail(400, "Counted quantity must be a number");
  }
  const reason = String(opts.reason ?? "").trim();
  if (!reason) {
    return fail(400, "Reason is required for stock adjustment");
  }
  const product = await Product.findById(opts.productId);
  if (!product) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  if (!product.trackStock) {
    product.trackStock = true;
    product.stockQty = 0;
    await product.save();
  }
  const delta = roundQty(counted - product.stockQty);
  if (delta === 0) {
    return {
      statusCode: 200,
      data: { product, entry: null, message: "No change" },
    };
  }
  return applyStockDelta({
    productId: opts.productId,
    delta,
    type: "adjustment",
    reason,
    createdBy: opts.createdBy,
    allowNegative: true,
  });
};

/** Deduct sold qty for a tracked retail product (invoice sale). */
export const applySaleDeduction = async (opts: {
  productId: string;
  quantity: number;
  invoiceId: string;
  createdBy?: string | null;
}) => {
  const qty = roundQty(Number(opts.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    return fail(400, "Sale quantity must be greater than 0");
  }
  const product = await Product.findById(opts.productId);
  if (!product) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  if (!product.trackStock) {
    return { statusCode: 200, data: { skipped: true, product } };
  }
  return applyStockDelta({
    productId: opts.productId,
    delta: -qty,
    type: "sale",
    reference: opts.invoiceId,
    createdBy: opts.createdBy,
  });
};

export const listStockLedger = async (
  productId: string,
  opts: { page?: number; limit?: number } = {},
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 50));
    const filter = { product: productId };
    const [items, total] = await Promise.all([
      StockLedger.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("staff", "name")
        .populate("reference", "invoiceNumber"),
      StockLedger.countDocuments(filter),
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

/** Enable tracking and write opening balance (or adjust to target). */
export const enableTrackingWithOpening = async (opts: {
  productId: string;
  openingQty: number;
  createdBy?: string | null;
}) => {
  const product = await Product.findById(opts.productId);
  if (!product) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  const opening = roundQty(Number(opts.openingQty));
  if (!Number.isFinite(opening) || opening < 0) {
    return fail(400, "Opening stock must be a non-negative number");
  }

  if (!product.trackStock) {
    product.trackStock = true;
    product.stockQty = 0;
    await product.save();
    if (opening === 0) {
      return { statusCode: 200, data: product };
    }
    return applyStockDelta({
      productId: opts.productId,
      delta: opening,
      type: "opening",
      createdBy: opts.createdBy,
      allowNegative: true,
    });
  }

  if (product.stockQty === opening) {
    return { statusCode: 200, data: product };
  }
  return adjustStock({
    productId: opts.productId,
    countedQty: opening,
    reason: "Opening stock",
    createdBy: opts.createdBy,
  });
};
