import { Request, Response } from "express";

import { sendResponse } from "../middlewares/response.middleware";
import { getPublicBranding } from "../services/public-branding.service";

export const getPublicBrandingController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data = await getPublicBranding();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: "Public branding",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Public branding failed",
      errors: error,
    });
  }
};
