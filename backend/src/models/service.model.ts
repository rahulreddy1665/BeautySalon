import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Service = mongoose.model<IService>("Service", serviceSchema);
