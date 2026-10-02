import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createStaffController,
  deleteStaffController,
  getStaffByIdController,
  getStaffListController,
  updateStaffController,
} from "../controller/staff.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("staff:read"),
  getStaffListController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("staff:read"),
  getStaffByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("staff:create"),
  createStaffController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("staff:create"),
  updateStaffController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("staff:delete"),
  deleteStaffController,
);

export default router;
