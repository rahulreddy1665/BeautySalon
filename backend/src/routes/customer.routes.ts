import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createCustomerController,
  deleteCustomerController,
  getCustomerByIdController,
  getCustomersController,
  updateCustomerController,
} from "../controller/customer.controller";

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
