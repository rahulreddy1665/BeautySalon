import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "../config/auth";
import { ErrorCodes, ErrorMessages } from "../constants/errors";
import { User } from "../models/user.model";
import { resolvePermissions } from "../services/auth.service";
import type { Request } from "express";

export interface AuthUser {
  id: string;
  roleId: string;
  role: string;
  permissions: string[];
  tokenVersion: number;
  mustChangePassword: boolean;
  canViewRevenue?: boolean;
  canExport?: boolean;
  maxDiscountPercent?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const CHANGE_PASSWORD_PATHS = new Set([
  "/api/auth/change-password",
  "/auth/change-password",
]);

function pathAllowsMustChange(req: AuthRequest): boolean {
  const full = `${req.baseUrl || ""}${req.path || ""}`;
  return (
    CHANGE_PASSWORD_PATHS.has(full) ||
    CHANGE_PASSWORD_PATHS.has(req.originalUrl?.split("?")[0] || "") ||
    full.endsWith("/auth/change-password")
  );
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authorization header is required",
        errors: { code: ErrorCodes.UNAUTHORIZED },
      });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format",
        errors: { code: ErrorCodes.UNAUTHORIZED },
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    const dbUser = await User.findById(decoded.id)
      .select("isActive tokenVersion mustChangePassword")
      .populate({
        path: "role",
        populate: { path: "permissions" },
      })
      .populate("designation");

    if (!dbUser || !dbUser.isActive) {
      res.status(401).json({
        success: false,
        message: ErrorMessages.UNAUTHORIZED,
        errors: { code: ErrorCodes.UNAUTHORIZED },
      });
      return;
    }

    if ((dbUser.tokenVersion ?? 0) !== (decoded.tokenVersion ?? 0)) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please sign in again.",
        errors: { code: ErrorCodes.UNAUTHORIZED },
      });
      return;
    }

    if (dbUser.mustChangePassword && !pathAllowsMustChange(req)) {
      res.status(403).json({
        success: false,
        message: ErrorMessages.MUST_CHANGE_PASSWORD,
        errors: { code: ErrorCodes.MUST_CHANGE_PASSWORD },
      });
      return;
    }

    const role = dbUser.role as unknown as {
      _id: { toString: () => string };
      name: string;
      permissions?: Array<{ name: string }>;
    };
    const resolved = await resolvePermissions({
      role,
      designation: dbUser.designation,
    });

    req.user = {
      id: decoded.id,
      roleId: role?._id?.toString?.() ?? decoded.roleId,
      role: role?.name ?? decoded.role,
      permissions: resolved.permissions,
      tokenVersion: dbUser.tokenVersion ?? 0,
      mustChangePassword: Boolean(dbUser.mustChangePassword),
      canViewRevenue: resolved.canViewRevenue,
      canExport: resolved.canExport,
      maxDiscountPercent: resolved.maxDiscountPercent,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      errors: { code: ErrorCodes.UNAUTHORIZED },
    });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: ErrorMessages.UNAUTHORIZED,
      errors: { code: ErrorCodes.UNAUTHORIZED },
    });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: ErrorMessages.FORBIDDEN,
      errors: { code: ErrorCodes.FORBIDDEN },
    });
    return;
  }
  next();
};
