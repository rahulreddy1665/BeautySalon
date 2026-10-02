/** Atomic invoice sequence — never resets on prefix change. */
import mongoose, { Document, Schema } from "mongoose";

export interface IInvoiceSequence extends Document {
  key: string;
  seq: number;
}

const invoiceSequenceSchema = new Schema<IInvoiceSequence>({
  key: { type: String, required: true, unique: true, default: "main" },
  seq: { type: Number, required: true, default: 0 },
});

export const InvoiceSequence = mongoose.model<IInvoiceSequence>(
  "InvoiceSequence",
  invoiceSequenceSchema,
);
