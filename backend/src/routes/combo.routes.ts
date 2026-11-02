import { Router } from "express";

import {
  createComboController,
  deleteComboController,
  getComboByIdController,
  listCombosController,
  updateComboController,
} from "../controller/combo.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

/** Reuses Services permissions. */
router.get(
  "/",
  authenticate,
  requirePermission("service:read"),
  listCombosController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("service:read"),
  getComboByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("service:create"),
  createComboController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("service:update"),
  updateComboController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("service:delete"),
  deleteComboController,
);

export default router;
