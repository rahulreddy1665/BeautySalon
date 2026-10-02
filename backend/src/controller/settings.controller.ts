import { Request, Response } from "express";
import multer from "multer";

import {
  getSettings,
  removeLogo,
  updateAppointmentSettings,
  updateBusinessSettings,
  updateInvoiceSettings,
  updateLoyaltySettings,
  updateTaxSettings,
  uploadLogo,
} from "../services/settings.service";
import { sendResponse } from "../middlewares/response.middleware";

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const getSettingsController = async (_req: Request, res: Response) => {
  try {
    const data = await getSettings();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Settings" : "Settings failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Settings failed",
      errors: error,
    });
  }
};

export const patchBusinessController = async (req: Request, res: Response) => {
  try {
    const data = await updateBusinessSettings(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Business settings saved" : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const patchTaxController = async (req: Request, res: Response) => {
  try {
    const data = await updateTaxSettings(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Tax settings saved" : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const patchInvoiceSettingsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await updateInvoiceSettings(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Invoice settings saved" : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const patchAppointmentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await updateAppointmentSettings(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200
          ? "Appointment settings saved"
          : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const patchLoyaltySettingsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await updateLoyaltySettings(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Loyalty settings saved" : "Save failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Save failed",
      errors: error,
    });
  }
};

export const uploadLogoController = async (req: Request, res: Response) => {
  try {
    const data = await uploadLogo(req.file);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Logo uploaded" : "Upload failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Upload failed",
      errors: error,
    });
  }
};

export const removeLogoController = async (_req: Request, res: Response) => {
  try {
    const data = await removeLogo();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Logo removed" : "Remove failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Remove failed",
      errors: error,
    });
  }
};
