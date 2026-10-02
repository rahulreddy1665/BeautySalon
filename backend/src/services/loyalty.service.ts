import mongoose from "mongoose";

import { Customer } from "../models/customer.model";
import { LoyaltyBalance, LoyaltyLedger } from "../models/loyalty.model";
import {
  getOrCreateSettings,
  publicSettings,
  updateLoyaltySettings,
} from "./settings.service";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const getLoyaltyRules = async () => {
  try {
    const doc = await getOrCreateSettings();
    return { statusCode: 200, data: publicSettings(doc).loyalty };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const patchLoyaltyRules = async (
  data: Parameters<typeof updateLoyaltySettings>[0],
) => updateLoyaltySettings(data);

async function getOrCreateBalance(customerId: string) {
  let bal = await LoyaltyBalance.findOne({ customer: customerId });
  if (!bal) {
    bal = await LoyaltyBalance.create({ customer: customerId, points: 0 });
  }
  return bal;
}

export const listLoyaltyBalances = async (customerIds?: string[]) => {
  try {
    const filter: Record<string, unknown> = {};
    if (customerIds?.length) {
      filter.customer = {
        $in: customerIds.filter((id) => mongoose.isValidObjectId(id)),
      };
    }
    const items = await LoyaltyBalance.find(filter)
      .populate("customer", "name lastName phone")
      .sort({ points: -1 });
    return {
      statusCode: 200,
      data: items.map((b) => ({
        customerId: String(b.customer?._id ?? b.customer),
        points: b.points,
        updatedAt: (b as { updatedAt?: Date }).updatedAt,
        customer: b.customer,
      })),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getLoyaltyBalance = async (customerId: string) => {
  try {
    if (!mongoose.isValidObjectId(customerId)) {
      return { statusCode: 400, data: null, message: "Invalid customer id" };
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return { statusCode: 404, data: null, message: "Customer not found" };
    }
    const bal = await getOrCreateBalance(customerId);
    return {
      statusCode: 200,
      data: {
        customerId,
        points: bal.points,
        updatedAt: (bal as { updatedAt?: Date }).updatedAt,
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const listLoyaltyLedger = async (customerId?: string) => {
  try {
    const filter: Record<string, unknown> = {};
    if (customerId) {
      if (!mongoose.isValidObjectId(customerId)) {
        return { statusCode: 400, data: null, message: "Invalid customer id" };
      }
      filter.customer = customerId;
    }
    const items = await LoyaltyLedger.find(filter)
      .populate("customer", "name lastName phone")
      .sort({ createdAt: -1 })
      .limit(200);
    return { statusCode: 200, data: items };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const adjustLoyalty = async (data: {
  customerId: string;
  type: "earn" | "redeem" | "adjust";
  points: number;
  reason: string;
  createdBy?: string | null;
}) => {
  try {
    if (!mongoose.isValidObjectId(data.customerId)) {
      return { statusCode: 400, data: null, message: "Invalid customer id" };
    }
    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      return { statusCode: 404, data: null, message: "Customer not found" };
    }
    const pts = Math.floor(Number(data.points));
    if (!Number.isFinite(pts) || pts <= 0) {
      return {
        statusCode: 400,
        data: null,
        message: "Points must be a positive integer",
      };
    }
    const reason = String(data.reason ?? "").trim();
    if (reason.length < 2) {
      return { statusCode: 400, data: null, message: "Reason is required" };
    }
    if (!["earn", "redeem", "adjust"].includes(data.type)) {
      return { statusCode: 400, data: null, message: "Invalid type" };
    }

    const bal = await getOrCreateBalance(data.customerId);
    let next = bal.points;
    if (data.type === "earn") next = bal.points + pts;
    else if (data.type === "redeem") {
      if (pts > bal.points) {
        return {
          statusCode: 400,
          data: null,
          message: "Insufficient points",
        };
      }
      next = bal.points - pts;
    } else {
      // adjust = set absolute balance
      next = pts;
    }
    bal.points = next;
    await bal.save();

    const entry = await LoyaltyLedger.create({
      customer: data.customerId,
      type: data.type,
      points: data.type === "adjust" ? pts : data.type === "redeem" ? -pts : pts,
      reason,
      balanceAfter: next,
      createdBy: data.createdBy || null,
    });

    return {
      statusCode: 200,
      data: {
        balance: { customerId: data.customerId, points: next },
        ledger: entry,
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

/** Apply redeem + earn on invoice pay. Mutates balances. */
export const applyInvoiceLoyalty = async (opts: {
  customerId: string;
  redeemPoints: number;
  earnBaseAmount: number;
  invoiceId: string;
  createdBy?: string | null;
}) => {
  const settings = await getOrCreateSettings();
  const rules = settings.loyalty;
  if (!rules.enabled) {
    return { redeemedPoints: 0, redeemedValue: 0, earnedPoints: 0 };
  }

  let redeemedPoints = 0;
  let redeemedValue = 0;
  const bal = await getOrCreateBalance(opts.customerId);

  if (opts.redeemPoints > 0) {
    redeemedPoints = Math.min(
      Math.floor(opts.redeemPoints),
      bal.points,
    );
    if (redeemedPoints < rules.minRedeemPoints && opts.redeemPoints > 0) {
      // caller should validate; skip redeem if below min
      redeemedPoints = 0;
    }
    const maxByPercent = Math.floor(
      (opts.earnBaseAmount * (rules.maxRedeemPercent || 0)) /
        100 /
        Math.max(rules.redeemValuePerPoint, 0.01),
    );
    // max redeem by % of post-discount pre-tax amount — apply after we know value
    redeemedValue = round2(redeemedPoints * rules.redeemValuePerPoint);
  }

  // Recalculate max against value after knowing redeem value intent
  if (redeemedPoints > 0) {
    const maxValue = round2(
      (opts.earnBaseAmount * rules.maxRedeemPercent) / 100,
    );
    if (redeemedValue > maxValue) {
      redeemedPoints = Math.floor(
        maxValue / Math.max(rules.redeemValuePerPoint, 0.01),
      );
      redeemedValue = round2(redeemedPoints * rules.redeemValuePerPoint);
    }
    if (redeemedPoints > bal.points) {
      redeemedPoints = bal.points;
      redeemedValue = round2(redeemedPoints * rules.redeemValuePerPoint);
    }
    if (redeemedPoints > 0) {
      bal.points -= redeemedPoints;
      await bal.save();
      await LoyaltyLedger.create({
        customer: opts.customerId,
        type: "redeem",
        points: -redeemedPoints,
        reason: "Redeemed on invoice",
        balanceAfter: bal.points,
        invoice: opts.invoiceId,
        createdBy: opts.createdBy || null,
      });
    }
  }

  // Earn on net after discounts and redemption, excluding tax and tip
  const earnBase = Math.max(0, opts.earnBaseAmount - redeemedValue);
  const earnedPoints =
    rules.earnPointsPer100Inr > 0
      ? Math.floor((earnBase / 100) * rules.earnPointsPer100Inr)
      : 0;

  if (earnedPoints > 0) {
    bal.points += earnedPoints;
    await bal.save();
    await LoyaltyLedger.create({
      customer: opts.customerId,
      type: "earn",
      points: earnedPoints,
      reason: "Earned on invoice",
      balanceAfter: bal.points,
      invoice: opts.invoiceId,
      createdBy: opts.createdBy || null,
    });
  }

  return { redeemedPoints, redeemedValue, earnedPoints };
};
