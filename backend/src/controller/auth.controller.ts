import { Request, Response } from "express";

import { loginUser, refreshAccessToken } from "../services/auth.service";

import { sendResponse } from "../middlewares/response.middleware";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendResponse(res, {
        statusCode: 400,
        message: "Email and password are required",
      });

      return;
    }

    const result = await loginUser(email, password);

    sendResponse(res, {
      statusCode: 200,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.log(error);

    sendResponse(res, {
      statusCode: 401,
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      sendResponse(res, {
        statusCode: 401,
        message: "Refresh token is required",
      });

      return;
    }

    const result = await refreshAccessToken(token);

    sendResponse(res, {
      statusCode: 200,
      message: "Access token refreshed successfully",
      data: result,
    });
  } catch (error) {
    console.log(error);

    sendResponse(res, {
      statusCode: 401,
      message:
        error instanceof Error
          ? error.message
          : "Invalid or expired refresh token",
    });
  }
};
