import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  /** Lowercase trimmed name for case-insensitive uniqueness */
  nameKey: string;
  isActive: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
