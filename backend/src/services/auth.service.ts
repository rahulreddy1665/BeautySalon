import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User } from "../models/user.model";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/auth";

export const loginUser = async (
  email: string,
  password: string
) => {
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

  const passwordValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  const role = user.role as any;

  const permissions = role.permissions.map(
    (permission: any) => permission.name
  );

  const token = jwt.sign(
    {
      id: user._id.toString(),
      roleId: role._id.toString(),
      role: role.name,
      permissions,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

  return {
    token,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: role.name,
      permissions,
    },
  };
};