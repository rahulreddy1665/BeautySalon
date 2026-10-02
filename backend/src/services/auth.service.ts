import bcrypt from "bcrypt";

import { User } from "../models/user.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middlewares/jwt";

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
  })
    .select("+password")
    .populate({
      path: "role",
      populate: {
        path: "permissions",
      },
    });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  const passwordValid = await bcrypt.compare(password, user.password);

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  const role = user.role as any;

  const permissions = role.permissions.map(
    (permission: any) => permission.name,
  );

  // Access token payload
  const accessPayload = {
    id: user._id.toString(),
    roleId: role._id.toString(),
    role: role.name,
    permissions,
  };

  // Refresh token payload
  const refreshPayload = {
    userId: user._id.toString(),
  };

  const accessToken = generateAccessToken(accessPayload);
  const refreshToken = generateRefreshToken(refreshPayload);

  return {
    accessToken,
    refreshToken,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: role.name,
      permissions,
    },
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken) as {
    userId: string;
  };

  const user = await User.findById(decoded.userId).populate({
    path: "role",
    populate: {
      path: "permissions",
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  const role = user.role as any;

  const permissions = role.permissions.map(
    (permission: any) => permission.name,
  );

  const accessPayload = {
    id: user._id.toString(),
    roleId: role._id.toString(),
    role: role.name,
    permissions,
  };

  const accessToken = generateAccessToken(accessPayload);

  return {
    accessToken,
  };
};
