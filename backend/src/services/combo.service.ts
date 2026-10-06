import mongoose from "mongoose";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Combo } from "../models/combo.model";
import { Service } from "../models/service.model";

export interface ComboServiceInput {
  serviceId: string;
  qty?: number;
}

export interface ComboInput {
  name?: string;
  isActive?: boolean;
  services?: ComboServiceInput[];
  comboPrice?: number;
  /** Required when comboPrice >= current listTotal. */
  confirmPriceAboveList?: boolean;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeServices(raw: ComboServiceInput[] | undefined) {
  if (!Array.isArray(raw) || raw.length < 2) {
    return {
      ok: false as const,
      error: fail(
        400,
        ErrorMessages.COMBO_TOO_FEW_SERVICES,
        ErrorCodes.COMBO_TOO_FEW_SERVICES,
      ),
    };
  }
  const seen = new Set<string>();
  const lines: Array<{ service: mongoose.Types.ObjectId; qty: number }> = [];
  for (const row of raw) {
    const id = String(row.serviceId ?? "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        ok: false as const,
        error: fail(400, `Invalid service id: ${id}`),
      };
    }
    if (seen.has(id)) {
      return {
        ok: false as const,
        error: fail(
          400,
          ErrorMessages.COMBO_DUPLICATE_SERVICE,
          ErrorCodes.COMBO_DUPLICATE_SERVICE,
        ),
      };
    }
    seen.add(id);
    const qty = Math.floor(Number(row.qty) || 1);
    if (qty < 1) {
      return { ok: false as const, error: fail(400, "Service qty must be >= 1") };
    }
    lines.push({
      service: new mongoose.Types.ObjectId(id),
      qty,
    });
  }
  return { ok: true as const, lines };
}

async function computeTotals(
  services: Array<{ service: mongoose.Types.ObjectId; qty: number }>,
) {
  const ids = services.map((s) => s.service);
  const docs = await Service.find({ _id: { $in: ids } });
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  let listTotal = 0;
  let totalDuration = 0;
  const populated = [];
  for (const line of services) {
    const svc = byId.get(String(line.service));
    if (!svc) {
      return {
        ok: false as const,
        error: fail(400, `Service not found: ${String(line.service)}`),
      };
    }
    listTotal = round2(listTotal + svc.price * line.qty);
    totalDuration += svc.durationMinutes * line.qty;
    populated.push({
      service: {
        _id: svc._id,
        name: svc.name,
        price: svc.price,
        durationMinutes: svc.durationMinutes,
        category: svc.category,
        categoryId: svc.categoryId,
      },
      qty: line.qty,
    });
  }
  return {
    ok: true as const,
    listTotal,
    totalDuration,
    populated,
  };
}

function toPublic(
  doc: {
    toObject?: () => object;
    comboPrice: number;
  },
  extras: {
    listTotal: number;
    totalDuration: number;
    services: unknown[];
  },
) {
  const base =
    typeof doc.toObject === "function" ? doc.toObject() : (doc as object);
  const comboPrice = round2(Number(doc.comboPrice) || 0);
  return {
    ...base,
    services: extras.services,
    listTotal: extras.listTotal,
    comboPrice,
    saving: round2(extras.listTotal - comboPrice),
    totalDuration: extras.totalDuration,
  };
}

async function enrichCombo(doc: InstanceType<typeof Combo>) {
  const totals = await computeTotals(doc.services);
  if (!totals.ok) return totals.error;
  return {
    statusCode: 200 as const,
    data: toPublic(doc, {
      listTotal: totals.listTotal,
      totalDuration: totals.totalDuration,
      services: totals.populated,
    }),
  };
}

export const listCombos = async (
  opts: { activeOnly?: boolean; includeDeleted?: boolean } = {},
) => {
  try {
    const filter: Record<string, unknown> = {};
    if (!opts.includeDeleted) filter.isDeleted = false;
    if (opts.activeOnly) filter.isActive = true;
    const items = await Combo.find(filter).sort({ name: 1 });
    const data = [];
    for (const doc of items) {
      const enriched = await enrichCombo(doc);
      if (enriched.statusCode !== 200) continue;
      data.push(enriched.data);
    }
    return { statusCode: 200, data };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getComboById = async (id: string) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    const doc = await Combo.findOne({ _id: id, isDeleted: false });
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    return enrichCombo(doc);
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const createCombo = async (data: ComboInput) => {
  try {
    const name = String(data.name ?? "").trim();
    if (!name) return fail(400, "Combo name is required");
    const comboPrice = round2(Number(data.comboPrice));
    if (!Number.isFinite(comboPrice) || comboPrice <= 0) {
      return fail(400, "Combo price must be greater than 0");
    }
    const normalized = normalizeServices(data.services);
    if (!normalized.ok) return normalized.error;

    const totals = await computeTotals(normalized.lines);
    if (!totals.ok) return totals.error;

    if (comboPrice >= totals.listTotal && !data.confirmPriceAboveList) {
      return fail(
        400,
        ErrorMessages.COMBO_PRICE_NOT_BELOW_LIST,
        ErrorCodes.COMBO_PRICE_NOT_BELOW_LIST,
        {
          code: ErrorCodes.COMBO_PRICE_NOT_BELOW_LIST,
          listTotal: totals.listTotal,
          comboPrice,
        },
      );
    }

    const doc = await Combo.create({
      name,
      isActive: data.isActive !== false,
      isDeleted: false,
      services: normalized.lines,
      comboPrice,
    });
    return enrichCombo(doc);
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateCombo = async (id: string, data: ComboInput) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    const doc = await Combo.findOne({ _id: id, isDeleted: false });
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) return fail(400, "Combo name is required");
      doc.name = name;
    }
    if (data.isActive !== undefined) {
      doc.isActive = Boolean(data.isActive);
    }

    let services = doc.services.map((s) => ({
      service: s.service as mongoose.Types.ObjectId,
      qty: s.qty,
    }));
    if (data.services !== undefined) {
      const normalized = normalizeServices(data.services);
      if (!normalized.ok) return normalized.error;
      services = normalized.lines;
      doc.services = normalized.lines;
    }

    let comboPrice = doc.comboPrice;
    if (data.comboPrice !== undefined) {
      comboPrice = round2(Number(data.comboPrice));
      if (!Number.isFinite(comboPrice) || comboPrice <= 0) {
        return fail(400, "Combo price must be greater than 0");
      }
      doc.comboPrice = comboPrice;
    }

    const totals = await computeTotals(services);
    if (!totals.ok) return totals.error;

    if (comboPrice >= totals.listTotal && !data.confirmPriceAboveList) {
      return fail(
        400,
        ErrorMessages.COMBO_PRICE_NOT_BELOW_LIST,
        ErrorCodes.COMBO_PRICE_NOT_BELOW_LIST,
        {
          code: ErrorCodes.COMBO_PRICE_NOT_BELOW_LIST,
          listTotal: totals.listTotal,
          comboPrice,
        },
      );
    }

    await doc.save();
    return enrichCombo(doc);
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const softDeleteCombo = async (id: string) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    const doc = await Combo.findOne({ _id: id, isDeleted: false });
    if (!doc) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
    doc.isDeleted = true;
    doc.isActive = false;
    await doc.save();
    return { statusCode: 200, data: { _id: doc._id, isDeleted: true } };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

/**
 * Split `net` across components by listPrice weight.
 * Rounds each share to 2 decimals; remainder goes to the largest listPrice row
 * so parts sum exactly to `net`.
 */
export function allocateComboAmount(
  net: number,
  components: Array<{ listPrice: number }>,
): number[] {
  const total = round2(net);
  if (components.length === 0) return [];
  const weights = components.map((c) => Math.max(0, Number(c.listPrice) || 0));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    const even = round2(total / components.length);
    const amounts = components.map(() => even);
    const drift = round2(total - amounts.reduce((a, b) => a + b, 0));
    amounts[amounts.length - 1] = round2(amounts[amounts.length - 1] + drift);
    return amounts;
  }
  const amounts = weights.map((w) => round2((total * w) / weightSum));
  let allocated = round2(amounts.reduce((a, b) => a + b, 0));
  let remainder = round2(total - allocated);
  if (remainder !== 0) {
    let largestIdx = 0;
    for (let i = 1; i < weights.length; i += 1) {
      if (weights[i] > weights[largestIdx]) largestIdx = i;
    }
    amounts[largestIdx] = round2(amounts[largestIdx] + remainder);
  }
  return amounts;
}
