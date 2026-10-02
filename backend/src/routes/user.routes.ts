import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  updateUserController,
} from "../controller/user.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("user:read"),
  getUsersController,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("user:read"),
  getUserByIdController,
);

router.post(
  "/",
  authenticate,
  requirePermission("user:create"),
  createUserController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("user:create"),
  updateUserController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("user:delete"),
  deleteUserController,
);

export default router;
