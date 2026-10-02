import { Request, Response } from "express";

import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../services/customer.service";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createCustomerController = async (req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await createCustomer(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Customer created" : "Customer created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer created failed",
      errors: error,
    });
  }
};

export const getCustomersController = async (_req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await getCustomers();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Customer Get" : "Customer Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer get failed",
      errors: error,
    });
  }
};

export const getCustomerByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getCustomerById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Customer Get By Id"
          : "Customer Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer get failed",
      errors: error,
    });
  }
};

export const updateCustomerController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await updateCustomer(
      req.params.id,
      req.body,
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Customer Update" : "Customer Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer update failed",
      errors: error,
    });
  }
};

export const deleteCustomerController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await deleteCustomer(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Customer Update" : "Customer Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer delete failed",
      errors: error,
    });
  }
};
