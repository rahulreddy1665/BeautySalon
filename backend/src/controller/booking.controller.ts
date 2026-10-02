import { Request, Response } from "express";

import {
  createBooking,
  deleteBooking,
  getBookingById,
  getBookings,
  updateBooking,
} from "../services/booking.service";
import { sendResponse } from "../middlewares/response.middleware";
import { ApiResponseOptions } from "../dto/response.dto";

export const createBookingController = async (req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await createBooking(req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Booking created" : "Booking created failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Booking created failed",
      errors: error,
    });
  }
};

export const getBookingsController = async (_req: Request, res: Response) => {
  try {
    const data: ApiResponseOptions = await getBookings();
    return sendResponse(res, {
      statusCode: data.statusCode,
      message: data.statusCode == 200 ? "Booking Get" : "Booking Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Booking get failed",
      errors: error,
    });
  }
};

export const getBookingByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await getBookingById(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200
          ? "Booking Get By Id"
          : "Booking Get By Id failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Booking get failed",
      errors: error,
    });
  }
};

export const updateBookingController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await updateBooking(
      req.params.id,
      req.body,
    );

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Booking Update" : "Booking Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Booking update failed",
      errors: error,
    });
  }
};

export const deleteBookingController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data: ApiResponseOptions = await deleteBooking(req.params.id);

    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Booking Update" : "Booking Update failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Booking delete failed",
      errors: error,
    });
  }
};
