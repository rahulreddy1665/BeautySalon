import { Response } from "express";

import type { ApiResponseOptions } from "../dto/response.dto";

export const sendResponse = (res: Response, options: ApiResponseOptions) => {
  return res.status(options.statusCode).json({
    success: options.statusCode >= 200 && options.statusCode < 300,
    status: options.statusCode,
    message: options.message,
    data: options.data,
    errors: options.errors,
  });
};
