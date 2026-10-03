import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectDatabase } from "../config/database";
import { Designation } from "../models/designation.model";
import { Permission } from "../models/permission.model";
import { Role } from "../models/role.model";
import { User } from "../models/user.model";

import permissionData from "../extra/permissions.json";

dotenv.config();

const permissions = permissionData;

const STYLIST_PERMS = [
  "dashboard:read",
  "appointment:read",
  "appointment:create",
  "appointment:update",
  "customer:read",
  "service:read",
  "product:read",
  "invoice:read",
  "invoice:create",
  "staff:read",
];

const RECEPTIONIST_PERMS = [
  ...STYLIST_PERMS,
  "customer:create",
  "customer:update",
  "loyalty:read",
];

const MANAGER_PERMS = [
  ...RECEPTIONIST_PERMS,
  "staff:create",
  "staff:update",
  "service:create",
  "service:update",
  "product:create",
  "product:update",
  "loyalty:update",
  "loyalty:adjust",
  "settings:read",
  "settings:update",
  "invoice:update",
  "report:read",
];

const seed = async (): Promise<void> => {
  try {
    await connectDatabase();

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

    let adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "admin",
        permissions: permissionIds,
      });
    } else {
      adminRole.permissions = permissionIds;
      await adminRole.save();
    }

    let staffRole = await Role.findOne({ name: "staff" });
    if (!staffRole) {
      staffRole = await Role.create({ name: "staff", permissions: [] });
    }

    const allPermNames = permissions.map((p) => p.name);
    const adminDes = await Designation.findOne({ isSystemAdmin: true });
    if (!adminDes) {
      await Designation.create({
        name: "Admin",
        isActive: true,
        isSystemAdmin: true,
        permissions: allPermNames,
        maxDiscountPercent: 100,
        canViewRevenue: true,
        canExport: true,
      });
      console.log("Designation created: Admin (system)");
    }

    const designations = [
      {
        name: "Manager",
        permissions: MANAGER_PERMS,
        maxDiscountPercent: 20,
        canViewRevenue: true,
        canExport: true,
      },
      {
        name: "Receptionist",
        permissions: RECEPTIONIST_PERMS,
        maxDiscountPercent: 10,
        canViewRevenue: false,
        canExport: false,
      },
      {
        name: "Stylist",
        permissions: STYLIST_PERMS,
        maxDiscountPercent: 5,
        canViewRevenue: false,
        canExport: false,
      },
    ];

    for (const d of designations) {
      const existing = await Designation.findOne({ name: d.name });
      if (!existing) {
        await Designation.create({ ...d, isActive: true });
        console.log(`Designation created: ${d.name}`);
      } else {
        existing.permissions = d.permissions;
        existing.maxDiscountPercent = d.maxDiscountPercent;
        existing.canViewRevenue = d.canViewRevenue;
        existing.canExport = d.canExport;
        await existing.save();
      }
    }

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
        mustChangePassword: false,
        tokenVersion: 0,
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
