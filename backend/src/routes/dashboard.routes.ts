import { Router } from "express";

import { getDashboardController } from "../controller/dashboard.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("dashboard:read"),
  getDashboardController,
);

export default router;
