import mongoose, { Document, Schema } from "mongoose";
import "./category.model";

export interface IService extends Document {
  name: string;
  /** Denormalized category name (kept for migration / legacy filters). */
  category: string;
  /** Managed category master reference. */
  categoryId?: mongoose.Types.ObjectId | null;
  price: number;
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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ name: 1, category: 1 }, { unique: true });

export const Service = mongoose.model<IService>("Service", serviceSchema);
