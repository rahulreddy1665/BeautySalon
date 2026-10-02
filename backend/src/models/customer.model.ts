import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  lastName: string;
  email: string;
  phone: number;
  address: string;
  address1: string;
  pincode: number;
  isActive: boolean;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
    },
    phone: {
      type: Number,
      unique: true,
      required: true,
      trim: true,
    },
    address: {
      type: String,
    },
    address1: {
      type: String,
    },
    pincode: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
