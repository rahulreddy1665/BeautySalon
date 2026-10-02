import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createBulkServiceController,
  createServiceController,
  deleteServiceController,
  getServiceByIdController,
  getServicesController,
  updateServiceController,
} from "../controller/service.controller";

const router = Router();

router.get(
  "/",
  //   authenticate,
  //   requirePermission("service:read"),
  getServicesController,
);

router.get("/:id", getServiceByIdController);

router.post("/", createServiceController);

router.post("/bulk", createBulkServiceController);

router.patch("/:id", updateServiceController);

router.delete("/:id", deleteServiceController);

export default router;
