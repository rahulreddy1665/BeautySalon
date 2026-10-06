import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  addStockController,
  adjustStockController,
  createProductController,
  deleteProductController,
  getProductByIdController,
  getProductsController,
  importProductsController,
  listStockLedgerController,
  updateProductController,
  useStockController,
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
  "/:id/stock/ledger",
  authenticate,
  requirePermission("product:read"),
  listStockLedgerController,
);

router.post(
  "/:id/stock/add",
  authenticate,
  requirePermission("product:create"),
  addStockController,
);

router.post(
  "/:id/stock/use",
  authenticate,
  requirePermission("product:create"),
  useStockController,
);

/** Adjust stock requires Edit. */
router.post(
  "/:id/stock/adjust",
  authenticate,
  requirePermission("product:update"),
  adjustStockController,
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
  requirePermission("product:update"),
  updateProductController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("product:delete"),
  deleteProductController,
);

export default router;
