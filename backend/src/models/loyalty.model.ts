import mongoose, { Document, Schema } from "mongoose";

export type LoyaltyMovementType = "earn" | "redeem" | "adjust";

export interface ILoyaltyBalance extends Document {
  customer: mongoose.Types.ObjectId;
  points: number;
}

export interface ILoyaltyLedger extends Document {
  customer: mongoose.Types.ObjectId;
  type: LoyaltyMovementType;
  points: number;
  reason: string;
  balanceAfter: number;
  invoice?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId | null;
}

const balanceSchema = new Schema<ILoyaltyBalance>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    points: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

const ledgerSchema = new Schema<ILoyaltyLedger>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["earn", "redeem", "adjust"],
      required: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const LoyaltyBalance = mongoose.model<ILoyaltyBalance>(
  "LoyaltyBalance",
  balanceSchema,
);

export const LoyaltyLedger = mongoose.model<ILoyaltyLedger>(
  "LoyaltyLedger",
  ledgerSchema,
);
