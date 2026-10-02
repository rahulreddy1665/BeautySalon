import mongoose, { Document, Schema } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description?: string;
}

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = mongoose.model<IPermission>(
  "Permission",
  permissionSchema
);