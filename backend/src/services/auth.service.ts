import jwt from "jsonwebtoken";

import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/auth";
import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Designation } from "../models/designation.model";
import { Role } from "../models/role.model";
import { User } from "../models/user.model";
import {
  comparePassword,
  hashPassword,
  isValidPassword,
  normalizeUsername,
  publicUser,
} from "../utils/password";

export async function resolvePermissions(user: {
  role: { name?: string; permissions?: Array<{ name: string }> };
  designation?: unknown;
}): Promise<{
  permissions: string[];
  canViewRevenue: boolean;
  canExport: boolean;
  maxDiscountPercent: number;
}> {
  const role = user.role as {
    name?: string;
    permissions?: Array<{ name: string }>;
  };
  if (role?.name === "admin") {
    return {
      permissions: (role.permissions ?? []).map((p) => p.name),
      canViewRevenue: true,
      canExport: true,
      maxDiscountPercent: 100,
    };
  }

  if (user.designation) {
    const des =
      typeof user.designation === "object" &&
      user.designation &&
      "permissions" in (user.designation as object)
        ? (user.designation as {
            permissions: string[];
            canViewRevenue: boolean;
            canExport: boolean;
            maxDiscountPercent: number;
          })
        : await Designation.findById(user.designation as string);
    if (des) {
      return {
        permissions: des.permissions ?? [],
        canViewRevenue: Boolean(des.canViewRevenue),
        canExport: Boolean(des.canExport),
        maxDiscountPercent: Number(des.maxDiscountPercent) || 0,
      };
    }
  }

  return {
    permissions: (role.permissions ?? []).map((p) => p.name),
    canViewRevenue: false,
    canExport: false,
    maxDiscountPercent: 0,
  };
}

function signToken(payload: {
  id: string;
  roleId: string;
  role: string;
  permissions: string[];
  tokenVersion: number;
  mustChangePassword: boolean;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const loginUser = async (identifier: string, password: string) => {
  const id = String(identifier || "").trim().toLowerCase();
  if (!id || !password) {
    return fail(
      401,
      ErrorMessages.INVALID_CREDENTIALS,
      ErrorCodes.INVALID_CREDENTIALS,
    );
  }

  const user = await User.findOne({
    $or: [{ email: id }, { username: normalizeUsername(id) }],
  })
    .select("+password")
    .populate({
      path: "role",
      populate: { path: "permissions" },
    })
    .populate("designation");

  if (!user || !user.isActive) {
    return fail(
      401,
      ErrorMessages.INVALID_CREDENTIALS,
      ErrorCodes.INVALID_CREDENTIALS,
    );
  }

  const passwordValid = await comparePassword(password, user.password);
  if (!passwordValid) {
    return fail(
      401,
      ErrorMessages.INVALID_CREDENTIALS,
      ErrorCodes.INVALID_CREDENTIALS,
    );
  }

  const role = user.role as unknown as {
    _id: { toString: () => string };
    name: string;
  };
  const resolved = await resolvePermissions(user as never);
  const token = signToken({
    id: user._id.toString(),
    roleId: role._id.toString(),
    role: role.name,
    permissions: resolved.permissions,
    tokenVersion: user.tokenVersion ?? 0,
    mustChangePassword: Boolean(user.mustChangePassword),
  });

  return {
    statusCode: 200,
    data: {
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: publicUser({
        ...user.toObject(),
        role,
        permissions: resolved.permissions,
        canViewRevenue: resolved.canViewRevenue,
        canExport: resolved.canExport,
        maxDiscountPercent: resolved.maxDiscountPercent,
      }),
    },
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);

  const ok = await comparePassword(currentPassword, user.password);
  if (!ok) {
    return fail(400, ErrorMessages.WRONG_PASSWORD, ErrorCodes.WRONG_PASSWORD);
  }

  if (!isValidPassword(newPassword)) {
    return fail(400, "Password must be at least 8 characters");
  }

  if (await comparePassword(newPassword, user.password)) {
    return fail(400, ErrorMessages.PASSWORD_SAME, ErrorCodes.PASSWORD_SAME);
  }

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  const populated = await User.findById(user._id)
    .populate({ path: "role", populate: { path: "permissions" } })
    .populate("designation");
  if (!populated) return fail(500, ErrorMessages.INTERNAL, ErrorCodes.INTERNAL);

  const role = populated.role as unknown as {
    _id: { toString: () => string };
    name: string;
  };
  const resolved = await resolvePermissions(populated as never);
  const token = signToken({
    id: populated._id.toString(),
    roleId: role._id.toString(),
    role: role.name,
    permissions: resolved.permissions,
    tokenVersion: populated.tokenVersion,
    mustChangePassword: false,
  });

  return {
    statusCode: 200,
    data: {
      token,
      mustChangePassword: false,
      user: publicUser({
        ...populated.toObject(),
        role,
        permissions: resolved.permissions,
        canViewRevenue: resolved.canViewRevenue,
        canExport: resolved.canExport,
        maxDiscountPercent: resolved.maxDiscountPercent,
      }),
    },
    message: "Password updated",
  };
};

export const changeEmail = async (
  userId: string,
  newEmail: string,
  currentPassword: string,
) => {
  const user = await User.findById(userId).select("+password").populate("role");
  if (!user) return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);

  const role = user.role as { name?: string };
  if (role?.name !== "admin") {
    return fail(403, ErrorMessages.FORBIDDEN, ErrorCodes.FORBIDDEN);
  }

  const ok = await comparePassword(currentPassword, user.password);
  if (!ok) {
    return fail(400, ErrorMessages.WRONG_PASSWORD, ErrorCodes.WRONG_PASSWORD);
  }

  const email = String(newEmail || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(400, ErrorMessages.INVALID_EMAIL);
  }

  const taken = await User.findOne({ email, _id: { $ne: user._id } });
  if (taken) {
    return fail(409, ErrorMessages.EMAIL_TAKEN, ErrorCodes.EMAIL_TAKEN);
  }

  user.email = email;
  await user.save();

  return {
    statusCode: 200,
    data: { email: user.email },
    message: "Email updated",
  };
};

/** Ensure a Role named staff exists for staff-login users */
export async function getOrCreateStaffRole() {
  let role = await Role.findOne({ name: "staff" });
  if (!role) {
    role = await Role.create({ name: "staff", permissions: [] });
  }
  return role;
}
