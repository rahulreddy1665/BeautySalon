import mongoose, { Document, Schema } from "mongoose";

export interface IDesignation extends Document {
  name: string;
  isActive: boolean;
  /** Permission names matching permissions.json */
  permissions: string[];
  maxDiscountPercent: number;
  canViewRevenue: boolean;
  canExport: boolean;
  /** Fixed admin designation cannot be edited/deleted */
  isSystemAdmin?: boolean;
}

const designationSchema = new Schema<IDesignation>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    permissions: { type: [String], default: [] },
    maxDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    canViewRevenue: { type: Boolean, default: false },
    canExport: { type: Boolean, default: false },
    isSystemAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Designation = mongoose.model<IDesignation>(
  "Designation",
  designationSchema,
);
