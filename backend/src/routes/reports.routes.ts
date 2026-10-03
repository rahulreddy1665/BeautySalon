import { Router } from "express";

import {
  exportReportsAppointmentsController,
  exportReportsCustomersController,
  exportReportsProductsController,
  exportReportsSalesController,
  exportReportsServicesController,
  exportReportsStaffController,
  getReportsAppointmentsController,
  getReportsCustomersController,
  getReportsOverviewController,
  getReportsProductsController,
  getReportsSalesController,
  getReportsServicesController,
  getReportsStaffController,
  getReportsStaffLinesController,
} from "../controller/reports.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireExport,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

router.get(
  "/overview",
  authenticate,
  requirePermission("report:read"),
  getReportsOverviewController,
);

router.get(
  "/sales",
  authenticate,
  requirePermission("report:read"),
  getReportsSalesController,
);
router.get(
  "/sales/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsSalesController,
);

router.get(
  "/staff",
  authenticate,
  requirePermission("report:read"),
  getReportsStaffController,
);
router.get(
  "/staff/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsStaffController,
);
router.get(
  "/staff/:staffId/lines",
  authenticate,
  requirePermission("report:read"),
  getReportsStaffLinesController,
);

router.get(
  "/customers",
  authenticate,
  requirePermission("report:read"),
  getReportsCustomersController,
);
router.get(
  "/customers/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsCustomersController,
);

router.get(
  "/appointments",
  authenticate,
  requirePermission("report:read"),
  getReportsAppointmentsController,
);
router.get(
  "/appointments/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsAppointmentsController,
);

router.get(
  "/services",
  authenticate,
  requirePermission("report:read"),
  getReportsServicesController,
);
router.get(
  "/services/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsServicesController,
);

router.get(
  "/products",
  authenticate,
  requirePermission("report:read"),
  getReportsProductsController,
);
router.get(
  "/products/export",
  authenticate,
  requirePermission("report:read"),
  requireExport,
  exportReportsProductsController,
);

export default router;
