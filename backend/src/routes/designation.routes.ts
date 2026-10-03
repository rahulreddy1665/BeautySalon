import { Router, Response, NextFunction } from "express";

import {
  createDesignationController,
  deleteDesignationController,
  listDesignationsController,
  updateDesignationController,
} from "../controller/designation.controller";
import {
  authenticate,
  requireAdmin,
  type AuthRequest,
} from "../middlewares/auth.middleware";
import { ErrorCodes, ErrorMessages } from "../constants/errors";

const router = Router();

function canListDesignations(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const perms = req.user?.permissions ?? [];
  if (
    req.user?.role === "admin" ||
    perms.includes("staff:read") ||
    perms.includes("settings:read")
  ) {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    message: ErrorMessages.FORBIDDEN,
    errors: { code: ErrorCodes.FORBIDDEN },
  });
}

router.get("/", authenticate, canListDesignations, listDesignationsController);

router.post("/", authenticate, requireAdmin, createDesignationController);

router.patch("/:id", authenticate, requireAdmin, updateDesignationController);

router.delete("/:id", authenticate, requireAdmin, deleteDesignationController);

export default router;
