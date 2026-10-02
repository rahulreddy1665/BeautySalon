import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createBookingController,
  deleteBookingController,
  getBookingByIdController,
  getBookingsController,
  updateBookingController,
} from "../controller/booking.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("booking:read"),
  getBookingsController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("booking:read"),
  getBookingByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("booking:create"),
  createBookingController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("booking:create"),
  updateBookingController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("booking:delete"),
  deleteBookingController,
);

export default router;
