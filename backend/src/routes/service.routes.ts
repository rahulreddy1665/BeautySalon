import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createServiceController,
  deleteServiceController,
  getServiceByIdController,
  getServiceCategoriesController,
  getServicesController,
  importServicesController,
  updateServiceController,
} from "../controller/service.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("service:read"),
  getServicesController,
);

router.get(
  "/categories",
  authenticate,
  requirePermission("service:read"),
  getServiceCategoriesController,
);

router.post(
  "/import",
  authenticate,
  requirePermission("service:create"),
  upload.single("file"),
  importServicesController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("service:read"),
  getServiceByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("service:create"),
  createServiceController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("service:create"),
  updateServiceController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("service:delete"),
  deleteServiceController,
);

export default router;
