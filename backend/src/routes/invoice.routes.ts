import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createInvoiceController,
  getInvoiceByIdController,
  getInvoicesController,
  getStaffSalesController,
} from "../controller/invoice.controller";
import {
  createShareLinkController,
  revokeShareLinkController,
} from "../controller/invoice-share.controller";

const router = Router();

router.get(
  "/staff-sales",
  authenticate,
  requirePermission("invoice:read"),
  getStaffSalesController,
);

router.get(
  "/",
  authenticate,
  requirePermission("invoice:read"),
  getInvoicesController,
);

router.post(
  "/:id/share-link",
  authenticate,
  requirePermission("invoice:read"),
  createShareLinkController,
);

router.post(
  "/:id/revoke-share-link",
  authenticate,
  requirePermission("invoice:read"),
  revokeShareLinkController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("invoice:read"),
  getInvoiceByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("invoice:create"),
  createInvoiceController,
);

export default router;
