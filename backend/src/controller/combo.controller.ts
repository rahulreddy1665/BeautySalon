import { Response } from "express";

import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import {
  createCombo,
  getComboById,
  listCombos,
  softDeleteCombo,
  updateCombo,
} from "../services/combo.service";

export const listCombosController = async (req: AuthRequest, res: Response) => {
  try {
    const activeOnly =
      req.query.activeOnly === "1" || req.query.activeOnly === "true";
    const data = await listCombos({ activeOnly });
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

export const getComboByIdController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getComboById(String(req.params.id));
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "OK" : "Failed"),
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

export const createComboController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await createCombo(req.body);
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

export const updateComboController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await updateCombo(String(req.params.id), req.body);
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

export const deleteComboController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await softDeleteCombo(String(req.params.id));
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
