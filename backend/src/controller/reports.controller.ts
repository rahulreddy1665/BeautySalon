import { Response } from "express";

import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import {
  exportReportsAppointments,
  exportReportsCustomers,
  exportReportsProducts,
  exportReportsSales,
  exportReportsServices,
  exportReportsStaff,
  getReportsAppointments,
  getReportsCustomers,
  getReportsOverview,
  getReportsProducts,
  getReportsSales,
  getReportsServices,
  getReportsStaff,
  getReportsStaffLines,
} from "../services/reports.service";

function canViewRevenue(req: AuthRequest): boolean {
  return req.user?.role === "admin" || Boolean(req.user?.canViewRevenue);
}

function send(
  res: Response,
  data: {
    statusCode: number;
    message?: string;
    data?: unknown;
    errors?: unknown;
  },
  fallbackMessage: string,
) {
  return sendResponse(res, {
    statusCode: data.statusCode,
    message: data.message ?? fallbackMessage,
    data: data.data,
    errors: "errors" in data ? data.errors : undefined,
  });
}

export const getReportsOverviewController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsOverview({
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Reports overview");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Reports overview failed",
      errors: error,
    });
  }
};

export const getReportsSalesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsSales(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Sales report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Sales report failed",
      errors: error,
    });
  }
};

export const exportReportsSalesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsSales(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Sales export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Sales export failed",
      errors: error,
    });
  }
};

export const getReportsStaffController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsStaff(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Staff report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff report failed",
      errors: error,
    });
  }
};

export const exportReportsStaffController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsStaff(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Staff export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff export failed",
      errors: error,
    });
  }
};

export const getReportsStaffLinesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const staffId = String(req.params.staffId ?? "");
    const data = await getReportsStaffLines(staffId, req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Staff line items");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff line items failed",
      errors: error,
    });
  }
};

export const getReportsCustomersController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsCustomers(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Customers report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customers report failed",
      errors: error,
    });
  }
};

export const exportReportsCustomersController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsCustomers(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Customers export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customers export failed",
      errors: error,
    });
  }
};

export const getReportsAppointmentsController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsAppointments(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Appointments report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointments report failed",
      errors: error,
    });
  }
};

export const exportReportsAppointmentsController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsAppointments(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Appointments export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointments export failed",
      errors: error,
    });
  }
};

export const getReportsServicesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsServices(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Services report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Services report failed",
      errors: error,
    });
  }
};

export const exportReportsServicesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsServices(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Services export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Services export failed",
      errors: error,
    });
  }
};

export const getReportsProductsController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getReportsProducts(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Products report");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Products report failed",
      errors: error,
    });
  }
};

export const exportReportsProductsController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await exportReportsProducts(req.query, {
      canViewRevenue: canViewRevenue(req),
    });
    return send(res, data, "Products export");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Products export failed",
      errors: error,
    });
  }
};
