import { Router } from "express";

import {
  createCategoryController,
  listCategoriesController,
  migrateCategoriesController,
  updateCategoryController,
} from "../controller/category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

/** Reuses Services permissions. */
router.get(
  "/",
  authenticate,
  requirePermission("service:read"),
  listCategoriesController,
);

router.post(
  "/migrate",
  authenticate,
  requirePermission("service:create"),
  migrateCategoriesController,
);

router.post(
  "/",
  authenticate,
  requirePermission("service:create"),
  createCategoryController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("service:update"),
  updateCategoryController,
);

export default router;
