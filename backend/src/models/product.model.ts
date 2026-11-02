import mongoose, { Document, Schema } from "mongoose";

export type ProductType = "retail" | "consumable";

export interface IProduct extends Document {
  name: string;
  price: number;
  type: ProductType;
  /** When false, stockQty is ignored ("Not tracked"). */
  trackStock: boolean;
  /** Derived from ledger; updated only via stock operations. */
  stockQty: number;
  unit?: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["retail", "consumable"],
      default: "retail",
      index: true,
    },
    trackStock: {
      type: Boolean,
      default: false,
    },
    stockQty: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
