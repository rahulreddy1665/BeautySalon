import { Request, Response } from "express";

import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  getStaffSalesSummary,
} from "../services/invoice.service";
import { sendResponse } from "../middlewares/response.middleware";

export const createInvoiceController = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    const data = await createInvoice({
      ...req.body,
      createdBy: userId ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200 ? "Invoice created" : "Invoice created failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Invoice created failed",
      errors: error,
    });
  }
};

export const getInvoicesController = async (req: Request, res: Response) => {
  try {
    const data = await getInvoices({
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      paymentMode:
        typeof req.query.paymentMode === "string"
          ? req.query.paymentMode
          : undefined,
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Invoice Get" : "Invoice Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Invoice get failed",
      errors: error,
    });
  }
};

export const getInvoiceByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await getInvoiceById(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200
          ? "Invoice Get By Id"
          : "Invoice Get By Id failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Invoice get failed",
      errors: error,
    });
  }
};

export const getStaffSalesController = async (req: Request, res: Response) => {
  try {
    const data = await getStaffSalesSummary(
      typeof req.query.from === "string" ? req.query.from : undefined,
      typeof req.query.to === "string" ? req.query.to : undefined,
    );
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Staff sales summary"
          : "Staff sales summary failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff sales summary failed",
      errors: error,
    });
  }
};
