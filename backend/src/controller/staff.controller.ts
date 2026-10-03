import { Request, Response } from "express";

import {
  createStaff,
  deleteStaff,
  getStaffById,
  getStaffList,
  updateStaff,
} from "../services/staff.service";
import {
  disableStaffLogin,
  enableStaffLogin,
  resetStaffPassword,
} from "../services/staff-login.service";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { sendResponse } from "../middlewares/response.middleware";

export const createStaffController = async (req: Request, res: Response) => {
  try {
    const data = await createStaff(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Staff created" : "Staff created failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff created failed",
      errors: error,
    });
  }
};

export const getStaffListController = async (req: Request, res: Response) => {
  try {
    const data = await getStaffList({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      isActive:
        typeof req.query.isActive === "string" ? req.query.isActive : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Staff Get" : "Staff Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff get failed",
      errors: error,
    });
  }
};

export const getStaffByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await getStaffById(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Staff Get By Id" : "Staff Get By Id failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff get failed",
      errors: error,
    });
  }
};

export const updateStaffController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await updateStaff(req.params.id, req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Staff Update" : "Staff Update failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff update failed",
      errors: error,
    });
  }
};

export const deleteStaffController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await deleteStaff(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Staff deleted" : "Staff delete failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Staff delete failed",
      errors: error,
    });
  }
};

function sendStaffLoginResult(
  res: Response,
  data: {
    statusCode: number;
    message?: string;
    data?: unknown;
    errors?: unknown;
  },
  okMessage: string,
) {
  return sendResponse(res, {
    statusCode: data.statusCode,
    message: data.message ?? (data.statusCode === 200 ? okMessage : "Failed"),
    data: data.data,
    errors: data.errors ?? null,
  });
}

export const enableStaffLoginController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await enableStaffLogin(req.params.id, req.body);
    return sendStaffLoginResult(res, data, "Login enabled");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const resetStaffPasswordController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await resetStaffPassword(
      req.params.id,
      req.body?.temporaryPassword,
    );
    return sendStaffLoginResult(res, data, "Password reset");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const disableStaffLoginController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await disableStaffLogin(
      String(req.params.id),
      req.user?.id,
    );
    return sendStaffLoginResult(res, data, "Login turned off");
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};
