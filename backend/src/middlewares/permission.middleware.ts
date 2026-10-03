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

/** Designation canExport flag and/or report:export permission. */
export const requireExport = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return;
  }

  const allowed =
    req.user.role === "admin" ||
    Boolean(req.user.canExport) ||
    req.user.permissions.includes("report:export");

  if (!allowed) {
    res.status(403).json({
      success: false,
      message: "Permission denied",
      errors: { code: "FORBIDDEN" },
    });
    return;
  }

  next();
};