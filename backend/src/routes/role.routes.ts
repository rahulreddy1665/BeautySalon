import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createRoleController,
  deleteRoleController,
  getRoleByIdController,
  getRolesController,
  updateRoleController,
} from "../controller/role.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("role:read"),
  getRolesController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("role:read"),
  getRoleByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("role:create"),
  createRoleController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("role:create"),
  updateRoleController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("role:delete"),
  deleteRoleController,
);

export default router;
