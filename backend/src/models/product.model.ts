import mongoose, { Document, Schema } from "mongoose";

/** Catalog product — name + price only (no stock). */
export interface IProduct extends Document {
  name: string;
  price: number;
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
  },
  { timestamps: true },
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
