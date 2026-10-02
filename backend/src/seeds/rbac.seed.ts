import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectDatabase } from "../config/database";
import { Permission } from "../models/permission.model";
import { Role } from "../models/role.model";
import { User } from "../models/user.model";

dotenv.config();

const permissions = [
  {
    name: "user:create",
    description: "Create users",
  },
  {
    name: "user:read",
    description: "View users",
  },
  {
    name: "user:update",
    description: "Update users",
  },
  {
    name: "user:delete",
    description: "Delete users",
  },
];

const seed = async (): Promise<void> => {
  try {
    await connectDatabase();

    // 1. Create permissions
    const permissionIds = [];

    for (const permissionData of permissions) {
      let permission = await Permission.findOne({
        name: permissionData.name,
      });

      if (!permission) {
        permission = await Permission.create(permissionData);
      }

      permissionIds.push(permission._id);
    }

    // 2. Create admin role
    let adminRole = await Role.findOne({
      name: "admin",
    });

    if (!adminRole) {
      adminRole = await Role.create({
        name: "admin",
        permissions: permissionIds,
      });
    } else {
      adminRole.permissions = permissionIds;
      await adminRole.save();
    }

    // 3. Create admin user
    const email = "admin@example.com";

    let admin = await User.findOne({ email });

    if (!admin) {
      const password = await bcrypt.hash("Admin@123", 12);

      admin = await User.create({
        name: "Admin",
        email,
        password,
        role: adminRole._id,
        isActive: true,
      });

      console.log("Admin user created.");
    } else {
      console.log("Admin user already exists.");
    }

    console.log("RBAC seed completed.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seed();