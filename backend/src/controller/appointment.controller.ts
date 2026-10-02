import { Request, Response } from "express";

import {
  cancelAppointment,
  changeAppointmentStatus,
  createAppointment,
  getAppointmentById,
  getAppointments,
  updateAppointment,
} from "../services/appointment.service";
import { sendResponse } from "../middlewares/response.middleware";

export const createAppointmentController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    const data = await createAppointment({
      ...req.body,
      createdBy: userId ?? null,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200
          ? "Appointment created"
          : "Appointment created failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment created failed",
      errors: error,
    });
  }
};

export const getAppointmentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await getAppointments({
      date: typeof req.query.date === "string" ? req.query.date : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      staffId:
        typeof req.query.staffId === "string" ? req.query.staffId : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.statusCode == 200 ? "Appointment Get" : "Appointment Get failed",
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment get failed",
      errors: error,
    });
  }
};

export const getAppointmentByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await getAppointmentById(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200
          ? "Appointment Get By Id"
          : "Appointment Get By Id failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment get failed",
      errors: error,
    });
  }
};

export const updateAppointmentController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await updateAppointment(req.params.id, req.body);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200
          ? "Appointment Update"
          : "Appointment Update failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment update failed",
      errors: error,
    });
  }
};

export const changeAppointmentStatusController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const status = req.body?.status;
    if (!["booked", "completed", "cancelled", "no_show"].includes(status)) {
      return sendResponse(res, {
        statusCode: 400,
        message: "Invalid status",
        data: null,
      });
    }
    const data = await changeAppointmentStatus(req.params.id, status);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200 ? "Appointment status updated" : "Failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment status update failed",
      errors: error,
    });
  }
};

export const cancelAppointmentController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = await cancelAppointment(req.params.id);
    return sendResponse(res, {
      statusCode: data.statusCode,
      message:
        data.message ??
        (data.statusCode == 200 ? "Appointment cancelled" : "Cancel failed"),
      data: data.data,
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: "Appointment cancel failed",
      errors: error,
    });
  }
};
