import { Request, Response } from "express";

import {
  createPermission,
  deletePermission,
  getPermissionById,
  getPermissions,
  updatePermission,
} from "../services/permission.service";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createPermissionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await createPermission(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Permission created"
          : "Permission created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Permission created failed",
      errors: error,
    });
  }
};

export const getPermissionsController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getPermissions();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Permission Get" : "Permission Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Permission get failed",
      errors: error,
    });
  }
};

export const getPermissionByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getPermissionById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Permission Get By Id"
          : "Permission Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Permission get failed",
      errors: error,
    });
  }
};

export const updatePermissionController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await updatePermission(
      req.params.id,
      req.body,
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Permission Update"
          : "Permission Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Permission update failed",
      errors: error,
    });
  }
};

export const deletePermissionController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await deletePermission(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Permission Update"
          : "Permission Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Permission delete failed",
      errors: error,
    });
  }
};
