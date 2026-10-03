import mongoose, { Document, Schema } from "mongoose";

export type StaffGender = "Male" | "Female" | "Other";

export interface IStaff extends Document {
  name: string;
  age: number;
  gender: StaffGender;
  isActive: boolean;
  designation?: mongoose.Types.ObjectId | null;
  user?: mongoose.Types.ObjectId | null;
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
    designation: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
