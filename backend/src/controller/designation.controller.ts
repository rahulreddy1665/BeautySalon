import { Response } from "express";

import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import {
  createDesignation,
  deleteDesignation,
  listDesignations,
  updateDesignation,
} from "../services/designation.service";

export const listDesignationsController = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await listDesignations();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode === 200 ? "OK" : "Failed",
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

export const createDesignationController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await createDesignation(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Created" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const updateDesignationController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await updateDesignation(String(req.params.id), req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Updated" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const deleteDesignationController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await deleteDesignation(String(req.params.id));
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Deleted" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};
