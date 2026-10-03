import { Response } from "express";

import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import {
  getDashboard,
  type DashboardRange,
} from "../services/dashboard.service";

const RANGES = new Set<DashboardRange>(["today", "week", "month"]);

export const getDashboardController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const raw = typeof req.query.range === "string" ? req.query.range : "today";
    const range: DashboardRange = RANGES.has(raw as DashboardRange)
      ? (raw as DashboardRange)
      : "today";

    const canViewRevenue =
      req.user?.role === "admin" || Boolean(req.user?.canViewRevenue);

    const data = await getDashboard(range, { canViewRevenue });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.message ?? "Dashboard",
      data: data.data,
      errors: "errors" in data ? data.errors : undefined,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Dashboard failed",
      errors: error,
    });
  }
};
