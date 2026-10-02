import { Request, Response } from "express";

import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../services/role.service";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createRoleController = async (req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await createRole(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Role created" : "Role created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Role created failed",
      errors: error,
    });
  }
};

export const getRolesController = async (_req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await getRoles();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Role Get" : "Role Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Role get failed",
      errors: error,
    });
  }
};

export const getRoleByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getRoleById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Role Get By Id" : "Role Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Role get failed",
      errors: error,
    });
  }
};

export const updateRoleController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await updateRole(req.params.id, req.body);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Role Update" : "Role Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Role update failed",
      errors: error,
    });
  }
};

export const deleteRoleController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await deleteRole(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Role Update" : "Role Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Role delete failed",
      errors: error,
    });
  }
};
