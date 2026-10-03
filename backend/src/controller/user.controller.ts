import { Response } from "express";

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../services/user.service";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createUserController = async (req: AuthRequest, res: Response) => {
  try {
    const data: ApiResponseOptions = await createUser(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "User created" : "User created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "User created failed",
      errors: error,
    });
  }
};

export const getUsersController = async (_req: AuthRequest, res: Response) => {
  try {
    const data: ApiResponseOptions = await getUsers();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "User Get" : "User Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "User get failed",
      errors: error,
    });
  }
};

export const getUserByIdController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getUserById(String(req.params.id));

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "User Get By Id" : "User Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "User get failed",
      errors: error,
    });
  }
};

export const updateUserController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const id = String(req.params.id);
    const data: ApiResponseOptions = await updateUser(
      id,
      req.body,
      req.user?.id,
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "User Update"
          : ((data as { message?: string }).message ?? "User Update failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "User update failed",
      errors: error,
    });
  }
};

export const deleteUserController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const id = String(req.params.id);
    const data: ApiResponseOptions = await deleteUser(id, req.user?.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "User Update"
          : ((data as { message?: string }).message ?? "User Update failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "User delete failed",
      errors: error,
    });
  }
};
