import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  /** Legacy: older records split the name; new records keep it all in `name`. */
  lastName: string;
  email: string;
  /** The only required field. */
  phone: number;
  isActive: boolean;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      default: "",
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Default list order (newest first) for the paginated customer list.
customerSchema.index({ createdAt: -1 });

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
