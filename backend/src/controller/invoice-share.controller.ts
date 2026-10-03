import { Request, Response } from "express";

import { sendResponse } from "../middlewares/response.middleware";
import {
  createOrReuseShareLink,
  getPublicInvoiceByToken,
  revokeShareLink,
} from "../services/invoice-share.service";

export const createShareLinkController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const renew = Boolean(req.body?.renew);
    const data = await createOrReuseShareLink(req.params.id, { renew });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.message ?? "Share link",
      data: data.data,
      errors: "errors" in data ? data.errors : undefined,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Share link failed",
      errors: error,
    });
  }
};

export const revokeShareLinkController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await revokeShareLink(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.message ?? "Revoke share link",
      data: data.data,
      errors: "errors" in data ? data.errors : undefined,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Revoke share link failed",
      errors: error,
    });
  }
};

export const getPublicInvoiceController = async (
  req: Request<{ token: string }>,
  res: Response,
) => {
  try {
    const data = await getPublicInvoiceByToken(req.params.token);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.message ?? "Public invoice",
      data: data.data,
      errors: "errors" in data ? data.errors : undefined,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Public invoice failed",
      errors: error,
    });
  }
};
