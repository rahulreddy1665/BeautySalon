import mongoose, { Document, Schema } from "mongoose";
import "./role.model";

export interface IUser extends Document {
  name: string;
  email?: string | null;
  username?: string | null;
  password: string;
  role: mongoose.Types.ObjectId;
  designation?: mongoose.Types.ObjectId | null;
  staff?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  mustChangePassword: boolean;
  /** Bump to invalidate existing JWTs */
  tokenVersion: number;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      // omit when unset — sparse unique fails if many docs have email: null
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    designation: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },

    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>("User", userSchema);
