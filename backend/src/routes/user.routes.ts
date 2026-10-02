import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("user:read"),
  (req, res) => {
    res.json({
      success: true,
      message: "User list",
      currentUser: req.user,
    });
  }
);

router.post(
  "/",
  authenticate,
  requirePermission("user:create"),
  (req, res) => {
    res.json({
      success: true,
      message: "User created",
    });
  }
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("user:delete"),
  (req, res) => {
    res.json({
      success: true,
      message: "User deleted",
    });
  }
);

export default router;