import { Response } from "express";

import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import {
  createCategory,
  listCategories,
  migrateCategoriesFromServices,
  updateCategory,
} from "../services/category.service";

export const listCategoriesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const activeOnly = req.query.activeOnly === "1" || req.query.activeOnly === "true";
    const data = await listCategories({ activeOnly });
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

export const createCategoryController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await createCategory(req.body);
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

export const updateCategoryController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await updateCategory(String(req.params.id), req.body);
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

export const migrateCategoriesController = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await migrateCategoriesFromServices();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode === 200 ? "Migrated" : "Migration failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Migration failed",
      errors: error,
    });
  }
};
