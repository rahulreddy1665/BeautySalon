import mongoose, { Schema } from "mongoose";

/**
 * Logo images stored once, keyed by the SHA-256 of their content.
 * Invoices reference a logo by id instead of embedding ~300 KB of base64 each.
 * Content-addressed, so a stored logo never changes: old invoices keep the logo
 * they were issued with even after the salon uploads a new one.
 */
export interface ILogo {
  _id: string;
  base64: string;
  mimeType: string;
}

const logoSchema = new Schema<ILogo>(
  {
    _id: { type: String, required: true },
    base64: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export const Logo = mongoose.model<ILogo>("Logo", logoSchema);
