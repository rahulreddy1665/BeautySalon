import { Response } from "express";

import { sendResponse } from "../middlewares/response.middleware";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  changeEmail,
  changePassword,
  loginUser,
} from "../services/auth.service";

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const identifier = req.body.identifier ?? req.body.email ?? req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
      sendResponse(res, {
        statusCode: 400,
        message: "Username/email and password are required",
        errors: { code: "VALIDATION_ERROR" },
      });
      return;
    }

    const result = await loginUser(String(identifier), String(password));
    sendResponse(res, {
      statusCode: result.statusCode,
      message:
        result.statusCode === 200
          ? "Login successful"
          : ((result as { message?: string }).message ?? "Login failed"),
      data: result.data,
      errors: (result as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    sendResponse(res, {
      statusCode: 500,
      message: error instanceof Error ? error.message : "Login failed",
      errors: error,
    });
  }
};

export const changePasswordController = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, { statusCode: 401, message: "Unauthorized" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword(
      userId,
      String(currentPassword ?? ""),
      String(newPassword ?? ""),
    );
    sendResponse(res, {
      statusCode: result.statusCode,
      message: result.message ?? (result.statusCode === 200 ? "OK" : "Failed"),
      data: result.data,
      errors: (result as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    sendResponse(res, {
      statusCode: 500,
      message: "Password change failed",
      errors: error,
    });
  }
};

export const changeEmailController = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, { statusCode: 401, message: "Unauthorized" });
      return;
    }
    const { email, currentPassword } = req.body;
    const result = await changeEmail(
      userId,
      String(email ?? ""),
      String(currentPassword ?? ""),
    );
    sendResponse(res, {
      statusCode: result.statusCode,
      message: result.message ?? (result.statusCode === 200 ? "OK" : "Failed"),
      data: result.data,
      errors: (result as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    sendResponse(res, {
      statusCode: 500,
      message: "Email change failed",
      errors: error,
    });
  }
};
