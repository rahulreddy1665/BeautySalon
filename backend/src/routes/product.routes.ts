import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createProductController,
  deleteProductController,
  getProductByIdController,
  getProductsController,
  importProductsController,
  updateProductController,
} from "../controller/product.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("product:read"),
  getProductsController,
);

router.post(
  "/import",
  authenticate,
  requirePermission("product:create"),
  upload.single("file"),
  importProductsController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("product:read"),
  getProductByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("product:create"),
  createProductController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("product:create"),
  updateProductController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("product:delete"),
  deleteProductController,
);

export default router;
