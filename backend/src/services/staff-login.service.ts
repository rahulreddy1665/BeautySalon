import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Designation } from "../models/designation.model";
import { Role } from "../models/role.model";
import { Staff } from "../models/staff.model";
import { User } from "../models/user.model";
import { getOrCreateStaffRole } from "./auth.service";
import {
  generateTemporaryPassword,
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
} from "../utils/password";

function loginStatus(user: {
  isActive?: boolean;
  mustChangePassword?: boolean;
} | null): "login_enabled" | "login_off" | "must_change_password" | "no_login" {
  if (!user) return "no_login";
  if (!user.isActive) return "login_off";
  if (user.mustChangePassword) return "must_change_password";
  return "login_enabled";
}

export async function attachLoginMeta(staffDoc: {
  _id: unknown;
  user?: unknown;
  toObject?: () => Record<string, unknown>;
}) {
  const base =
    typeof staffDoc.toObject === "function"
      ? staffDoc.toObject()
      : (staffDoc as unknown as Record<string, unknown>);
  let user = null;
  if (staffDoc.user) {
    user = await User.findById(staffDoc.user).select(
      "isActive mustChangePassword username",
    );
  }
  return {
    ...base,
    loginStatus: loginStatus(user),
    username: user?.username ?? null,
    // never password
  };
}

export const enableStaffLogin = async (
  staffId: string,
  data: { username: string; temporaryPassword?: string },
) => {
  try {
    const staff = await Staff.findById(staffId);
    if (!staff) return fail(404, "Staff not found", ErrorCodes.NOT_FOUND);
    if (!staff.designation) {
      return fail(
        400,
        ErrorMessages.DESIGNATION_REQUIRED,
        ErrorCodes.DESIGNATION_REQUIRED,
      );
    }
    const designation = await Designation.findById(staff.designation);
    if (!designation || !designation.isActive) {
      return fail(400, "Active designation is required");
    }

    const username = normalizeUsername(data.username);
    if (!isValidUsername(username)) {
      return fail(
        400,
        "Username must be 4–20 chars: letters, numbers, dot, or underscore",
      );
    }

    const temp =
      data.temporaryPassword && String(data.temporaryPassword).trim()
        ? String(data.temporaryPassword)
        : generateTemporaryPassword();
    if (!isValidPassword(temp)) {
      return fail(400, "Password must be at least 8 characters");
    }

    const taken = await User.findOne({
      username,
      ...(staff.user ? { _id: { $ne: staff.user } } : {}),
    });
    if (taken) {
      return fail(409, ErrorMessages.USERNAME_TAKEN, ErrorCodes.USERNAME_TAKEN);
    }

    const role = await getOrCreateStaffRole();
    const passwordHash = await hashPassword(temp);

    if (staff.user) {
      const user = await User.findById(staff.user).select("+password");
      if (!user) {
        staff.user = null;
      } else {
        user.username = username;
        user.password = passwordHash;
        user.mustChangePassword = true;
        user.isActive = true;
        user.designation = designation._id;
        user.name = staff.name;
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        user.email = undefined;
        user.markModified("email");
        await user.save();
        return {
          statusCode: 200,
          data: {
            staffId: staff._id,
            username,
            temporaryPassword: temp,
            loginStatus: "must_change_password",
          },
          message: "Login enabled",
        };
      }
    }

    const user = await User.create({
      name: staff.name,
      username,
      password: passwordHash,
      role: role._id,
      designation: designation._id,
      staff: staff._id,
      isActive: true,
      mustChangePassword: true,
      tokenVersion: 0,
    });
    staff.user = user._id;
    await staff.save();

    return {
      statusCode: 200,
      data: {
        staffId: staff._id,
        username,
        temporaryPassword: temp,
        loginStatus: "must_change_password",
      },
      message: "Login enabled",
    };
  } catch (error) {
    return {
      statusCode: 500,
      data: null,
      message: error instanceof Error ? error.message : "Failed",
      errors: error,
    };
  }
};

export const resetStaffPassword = async (
  staffId: string,
  temporaryPassword?: string,
) => {
  try {
    const staff = await Staff.findById(staffId);
    if (!staff?.user) {
      return fail(400, "This staff member has no login");
    }
    const user = await User.findById(staff.user).select("+password");
    if (!user) return fail(404, "Login account not found", ErrorCodes.NOT_FOUND);

    const temp =
      temporaryPassword && String(temporaryPassword).trim()
        ? String(temporaryPassword)
        : generateTemporaryPassword();
    if (!isValidPassword(temp)) {
      return fail(400, "Password must be at least 8 characters");
    }

    user.password = await hashPassword(temp);
    user.mustChangePassword = true;
    user.isActive = true;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return {
      statusCode: 200,
      data: {
        staffId: staff._id,
        username: user.username,
        temporaryPassword: temp,
        loginStatus: "must_change_password",
      },
      message: "Password reset",
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const disableStaffLogin = async (
  staffId: string,
  actorId?: string,
) => {
  try {
    const staff = await Staff.findById(staffId);
    if (!staff?.user) {
      return fail(400, "This staff member has no login");
    }
    const user = await User.findById(staff.user).populate("role");
    if (!user) {
      staff.user = null;
      await staff.save();
      return { statusCode: 200, data: { loginStatus: "no_login" } };
    }

    const roleName = (user.role as { name?: string } | null)?.name;
    if (roleName === "admin") {
      if (actorId && String(actorId) === String(user._id)) {
        return fail(
          400,
          ErrorMessages.LAST_ADMIN,
          ErrorCodes.LAST_ADMIN,
        );
      }
      const adminRole = await Role.findOne({ name: "admin" });
      const activeAdmins = adminRole
        ? await User.countDocuments({ role: adminRole._id, isActive: true })
        : 0;
      if (activeAdmins <= 1) {
        return fail(
          400,
          ErrorMessages.LAST_ADMIN,
          ErrorCodes.LAST_ADMIN,
        );
      }
    }

    user.isActive = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return {
      statusCode: 200,
      data: { loginStatus: "login_off" },
      message: "Login turned off",
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
