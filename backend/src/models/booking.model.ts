import mongoose, { Document, Schema } from "mongoose";
import "./user.model";
import "./customer.model";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  date: string;
  invoice: string;
  service: string;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    invoice: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
