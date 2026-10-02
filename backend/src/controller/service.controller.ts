import { Request, Response } from "express";

import {
  createService,
  deleteService,
  getServiceById,
  getServices,
  updateService,
} from "../services/service.service";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createServiceController = async (req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await createService(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Service created" : "Service created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service created failed",
      errors: error,
    });
  }
};

export const createBulkServiceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await createService(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Service bulk created"
          : "Service bulk created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service bulk created failed",
      errors: error,
    });
  }
};

export const getServicesController = async (_req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await getServices();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Service Get" : "Service Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service get failed",
      errors: error,
    });
  }
};

export const getServiceByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getServiceById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Service Get By Id"
          : "Service Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service get failed",
      errors: error,
    });
  }
};

export const updateServiceController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await updateService(
      req.params.id,
      req.body,
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Service Update" : "Service Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service update failed",
      errors: error,
    });
  }
};

export const deleteServiceController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await deleteService(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Service Update" : "Service Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service delete failed",
      errors: error,
    });
  }
};
