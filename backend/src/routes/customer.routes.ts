import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createCustomerController,
  deleteCustomerController,
  getCustomerByIdController,
  getCustomersController,
  importCustomersController,
  updateCustomerController,
} from "../controller/customer.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("customer:read"),
  getCustomersController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("customer:read"),
  getCustomerByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("customer:create"),
  createCustomerController,
);

router.post(
  "/import",
  authenticate,
  requirePermission("customer:create"),
  upload.single("file"),
  importCustomersController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("customer:create"),
  updateCustomerController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("customer:delete"),
  deleteCustomerController,
);

export default router;
