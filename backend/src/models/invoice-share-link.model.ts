import mongoose, { Document, Schema } from "mongoose";

export interface IInvoiceShareLink extends Document {
  invoice: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}

const invoiceShareLinkSchema = new Schema<IInvoiceShareLink>(
  {
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

invoiceShareLinkSchema.index({ invoice: 1, revoked: 1, expiresAt: 1 });

export const InvoiceShareLink = mongoose.model<IInvoiceShareLink>(
  "InvoiceShareLink",
  invoiceShareLinkSchema,
);
