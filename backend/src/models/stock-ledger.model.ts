import mongoose, { Document, Schema } from "mongoose";

export type StockLedgerType =
  | "opening"
  | "purchase"
  | "sale"
  | "usage"
  | "adjustment"
  | "return";

export interface IStockLedger extends Document {
  product: mongoose.Types.ObjectId;
  type: StockLedgerType;
  /** Signed quantity change (+ add, − deduct). */
  quantity: number;
  balanceAfter: number;
  reason?: string;
  note?: string;
  reference?: mongoose.Types.ObjectId | null;
  staff?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId | null;
}

const stockLedgerSchema = new Schema<IStockLedger>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["opening", "purchase", "sale", "usage", "adjustment", "return"],
      required: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, trim: true },
    note: { type: String, trim: true },
    reference: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    staff: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

stockLedgerSchema.index({ product: 1, createdAt: -1 });

export const StockLedger = mongoose.model<IStockLedger>(
  "StockLedger",
  stockLedgerSchema,
);
