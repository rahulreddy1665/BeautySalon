import mongoose, { Document, Schema } from "mongoose";

export type StaffGender = "Male" | "Female" | "Other";

export interface IStaff extends Document {
  name: string;
  age: number;
  gender: StaffGender;
  isActive: boolean;
}

const staffSchema = new Schema<IStaff>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 14,
      max: 80,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
