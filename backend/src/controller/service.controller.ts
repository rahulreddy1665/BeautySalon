import { Request, Response } from "express";
import * as XLSX from "xlsx";

import {
  createService,
  deleteService,
  getServiceById,
  getServiceCatalog,
  getServiceCategories,
  getServices,
  importServices,
  updateService,
} from "../services/service.service";
import { sendResponse } from "../middlewares/response.middleware";

export const createServiceController = async (req: Request, res: Response) => {
  try {
    const data = await createService(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Service created" : "Service created failed"),
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

export const getServicesController = async (req: Request, res: Response) => {
  try {
    const data = await getServices({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      categoryId:
        typeof req.query.categoryId === "string"
          ? req.query.categoryId
          : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
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

export const getServiceCatalogController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data = await getServiceCatalog();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Service catalog" : "Service catalog failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service catalog failed",
      errors: error,
    });
  }
};

export const getServiceCategoriesController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const data = await getServiceCategories();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Service categories"
          : "Service categories failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service categories failed",
      errors: error,
    });
  }
};

export const getServiceByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await getServiceById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200
          ? "Service Get By Id"
          : "Service Get By Id failed"),
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
    const data = await updateService(req.params.id, req.body);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Service Update" : "Service Update failed"),
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
    const data = await deleteService(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Service deleted" : "Service delete failed"),
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

export const importServicesController = async (req: Request, res: Response) => {
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
          const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
          if (key !== undefined) return row[key];
        }
        return undefined;
      };
      return {
        name: pick("name", "service name", "service"),
        category: pick("category", "service category"),
        price: pick("price", "price (inr)", "amount"),
      };
    });

    const data = await importServices(
      mapped.map((r) => ({
        name: r.name !== undefined ? String(r.name) : undefined,
        category: r.category !== undefined ? String(r.category) : undefined,
        price: r.price,
      })),
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message: "Service import complete",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Service import failed",
      errors: error,
    });
  }
};
