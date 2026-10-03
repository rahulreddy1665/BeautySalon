import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requirePermission =
  (permission: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const hasPermission = req.user.permissions.includes(permission);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: "Permission denied",
        errors: { code: "FORBIDDEN" },
      });
      return;
    }

    next();
  };