import mongoose, { Document, Schema } from "mongoose";

export interface IComboServiceLine {
  service: mongoose.Types.ObjectId;
  qty: number;
}

export interface ICombo extends Document {
  name: string;
  isActive: boolean;
  /** Soft delete only — never hard-delete combos. */
  isDeleted: boolean;
  services: IComboServiceLine[];
  /** Package price in INR; must be > 0. */
  comboPrice: number;
}

const comboServiceSchema = new Schema<IComboServiceLine>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
  },
  { _id: false },
);

const comboSchema = new Schema<ICombo>(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    services: {
      type: [comboServiceSchema],
      required: true,
      validate: {
        validator: (v: IComboServiceLine[]) => Array.isArray(v) && v.length >= 2,
        message: "A combo requires at least two services",
      },
    },
    comboPrice: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true },
);

comboSchema.index({ name: 1, isDeleted: 1 });

export const Combo = mongoose.model<ICombo>("Combo", comboSchema);
