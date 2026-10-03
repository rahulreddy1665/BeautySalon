import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createStaffController,
  deleteStaffController,
  disableStaffLoginController,
  enableStaffLoginController,
  getStaffByIdController,
  getStaffListController,
  resetStaffPasswordController,
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

router.post(
  "/:id/login",
  authenticate,
  requirePermission("staff:create"),
  enableStaffLoginController,
);

router.post(
  "/:id/login/reset",
  authenticate,
  requirePermission("staff:create"),
  resetStaffPasswordController,
);

router.delete(
  "/:id/login",
  authenticate,
  requirePermission("staff:create"),
  disableStaffLoginController,
);

export default router;
