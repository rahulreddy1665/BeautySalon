import { Request, Response } from "express";
import * as XLSX from "xlsx";

import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  importCustomers,
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

export const importCustomersController = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return sendResponse(res, {
        statusCode: 400,
        message: "Upload a .xlsx or .csv file",
        data: null,
      });
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return sendResponse(res, {
        statusCode: 400,
        message: "Spreadsheet has no sheets",
        data: null,
      });
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    const mapped = rawRows.map((row) => {
      const keys = Object.keys(row);
      const pick = (...names: string[]) => {
        for (const name of names) {
          const key = keys.find(
            (k) => k.trim().toLowerCase() === name.toLowerCase(),
          );
          if (key !== undefined) return row[key];
        }
        return undefined;
      };
      return {
        name: pick("name", "customer name", "full name"),
        phone: pick("phone", "mobile", "mobile number", "phone number"),
        email: pick("email", "email address"),
      };
    });

    const data = await importCustomers(mapped);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message: "Customer import complete",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Customer import failed",
      errors: error,
    });
  }
};
