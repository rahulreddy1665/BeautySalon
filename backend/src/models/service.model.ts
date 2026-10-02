import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
  category: string;
  price: number;
  /** Duration in minutes; default 30, min 5, step 5. */
  durationMinutes: number;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 5,
    },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ name: 1, category: 1 }, { unique: true });

export const Service = mongoose.model<IService>("Service", serviceSchema);
