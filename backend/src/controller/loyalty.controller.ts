import { Request, Response } from "express";

import {
  adjustLoyalty,
  getLoyaltyBalance,
  getLoyaltyRules,
  listLoyaltyBalances,
  listLoyaltyLedger,
  patchLoyaltyRules,
} from "../services/loyalty.service";
import { sendResponse } from "../middlewares/response.middleware";

export const getLoyaltyRulesController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data = await getLoyaltyRules();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Loyalty rules" : "Failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const patchLoyaltyRulesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await patchLoyaltyRules(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Loyalty rules saved" : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const listBalancesController = async (req: Request, res: Response) => {
  try {
    const ids =
      typeof req.query.customerIds === "string"
        ? req.query.customerIds.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
    const data = await listLoyaltyBalances(ids);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Loyalty balances" : "Failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const getBalanceController = async (
  req: Request<{ customerId: string }>,
  res: Response,
) => {
  try {
    const data = await getLoyaltyBalance(req.params.customerId);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Loyalty balance" : "Failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const listLedgerController = async (req: Request, res: Response) => {
  try {
    const data = await listLoyaltyLedger(
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : undefined,
    );
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Loyalty ledger" : "Failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const adjustLoyaltyController = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    const data = await adjustLoyalty({
      ...req.body,
      createdBy: userId ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Points updated" : "Adjust failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Adjust failed",
      errors: error,
    });
  }
};
