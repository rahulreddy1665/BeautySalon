import { Request, Response } from "express";
import * as XLSX from "xlsx";

import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  importProducts,
  updateProduct,
} from "../services/product.service";
import {
  addStock,
  adjustStock,
  listStockLedger,
  useStock,
} from "../services/stock.service";
import { sendResponse } from "../middlewares/response.middleware";

export const createProductController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await createProduct(req.body, {
      createdBy: req.user?.id ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Product created" : "Product created failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product created failed",
      errors: error,
    });
  }
};

export const getProductsController = async (req: Request, res: Response) => {
  try {
    const data = await getProducts({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      type:
        typeof req.query.type === "string"
          ? (req.query.type as "retail" | "consumable" | "all")
          : undefined,
      retailOnly: req.query.retailOnly as string | undefined,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Product Get" : "Product Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product get failed",
      errors: error,
    });
  }
};

export const getProductByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await getProductById(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200
          ? "Product Get By Id"
          : "Product Get By Id failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product get failed",
      errors: error,
    });
  }
};

export const updateProductController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await updateProduct(String(req.params.id), req.body, {
      createdBy: req.user?.id ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Product Update" : "Product Update failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product update failed",
      errors: error,
    });
  }
};

export const deleteProductController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await deleteProduct(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode == 200 ? "Product deleted" : "Product delete failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product delete failed",
      errors: error,
    });
  }
};

export const importProductsController = async (
  req: AuthRequest,
  res: Response,
) => {
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
        name: pick("name", "product name", "product"),
        price: pick("price", "price (inr)", "amount"),
        type: pick("type", "product type"),
        unit: pick("unit", "uom"),
        openingStock: pick("opening stock", "openingstock", "stock", "qty"),
      };
    });

    const data = await importProducts(
      mapped.map((r) => ({
        name: r.name !== undefined ? String(r.name) : undefined,
        price: r.price,
        type: r.type,
        unit: r.unit,
        openingStock: r.openingStock,
      })),
      { createdBy: req.user?.id ?? null },
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message: "Product import complete",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Product import failed",
      errors: error,
    });
  }
};

export const addStockController = async (req: AuthRequest, res: Response) => {
  try {
    const data = await addStock({
      productId: String(req.params.id),
      quantity: Number(req.body?.quantity),
      note: req.body?.note,
      createdBy: req.user?.id ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Stock added" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const useStockController = async (req: AuthRequest, res: Response) => {
  try {
    const data = await useStock({
      productId: String(req.params.id),
      quantity: Number(req.body?.quantity),
      reason: String(req.body?.reason ?? ""),
      staffId: req.body?.staffId ?? null,
      createdBy: req.user?.id ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Stock used" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const adjustStockController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await adjustStock({
      productId: String(req.params.id),
      countedQty: Number(req.body?.countedQty ?? req.body?.quantity),
      reason: String(req.body?.reason ?? ""),
      createdBy: req.user?.id ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "Stock adjusted" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};

export const listStockLedgerController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await listStockLedger(String(req.params.id), {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        (data as { message?: string }).message ??
        (data.statusCode === 200 ? "OK" : "Failed"),
      data: data.data,
      errors: (data as { errors?: unknown }).errors ?? null,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Failed",
      errors: error,
    });
  }
};
