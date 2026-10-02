import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createPermissionController,
  deletePermissionController,
  getPermissionByIdController,
  getPermissionsController,
  updatePermissionController,
} from "../controller/permission.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("permission:read"),
  getPermissionsController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("permission:read"),
  getPermissionByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("permission:create"),
  createPermissionController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("permission:create"),
  updatePermissionController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("permission:delete"),
  deletePermissionController,
);

export default router;
