import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  cancelAppointmentController,
  changeAppointmentStatusController,
  createAppointmentController,
  getAppointmentByIdController,
  getAppointmentsController,
  updateAppointmentController,
} from "../controller/appointment.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("appointment:read"),
  getAppointmentsController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("appointment:read"),
  getAppointmentByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("appointment:create"),
  createAppointmentController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("appointment:update"),
  updateAppointmentController,
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("appointment:update"),
  changeAppointmentStatusController,
);

router.post(
  "/:id/cancel",
  authenticate,
  requirePermission("appointment:update"),
  cancelAppointmentController,
);

export default router;
