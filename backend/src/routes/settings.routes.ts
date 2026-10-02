import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  getSettingsController,
  logoUpload,
  patchAppointmentsController,
  patchBusinessController,
  patchInvoiceSettingsController,
  patchLoyaltySettingsController,
  patchTaxController,
  removeLogoController,
  uploadLogoController,
} from "../controller/settings.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("settings:read"),
  getSettingsController,
);

router.patch(
  "/business",
  authenticate,
  requirePermission("settings:update"),
  patchBusinessController,
);

router.post(
  "/business/logo",
  authenticate,
  requirePermission("settings:update"),
  logoUpload.single("logo"),
  uploadLogoController,
);

router.delete(
  "/business/logo",
  authenticate,
  requirePermission("settings:update"),
  removeLogoController,
);

router.patch(
  "/tax",
  authenticate,
  requirePermission("settings:update"),
  patchTaxController,
);

router.patch(
  "/invoice",
  authenticate,
  requirePermission("settings:update"),
  patchInvoiceSettingsController,
);

router.patch(
  "/appointments",
  authenticate,
  requirePermission("settings:update"),
  patchAppointmentsController,
);

router.patch(
  "/loyalty",
  authenticate,
  requirePermission("settings:update"),
  patchLoyaltySettingsController,
);

export default router;
