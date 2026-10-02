import mongoose, { Document, Schema } from "mongoose";
import "./permission.model";

export interface IRole extends Document {
  name: string;
  permissions: mongoose.Types.ObjectId[];
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.model<IRole>("Role", roleSchema);