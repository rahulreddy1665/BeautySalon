import mongoose, { Document, Schema } from "mongoose";

export type AppointmentStatus =
  | "booked"
  | "completed"
  | "cancelled"
  | "no_show";

export interface IAppointmentServiceLine {
  service: mongoose.Types.ObjectId;
  name: string;
  staff: mongoose.Types.ObjectId;
}

export interface IAppointment extends Document {
  customer?: mongoose.Types.ObjectId | null;
  guestName?: string;
  guestPhone?: string;
  services: IAppointmentServiceLine[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  invoice?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId | null;
}

const appointmentServiceSchema = new Schema<IAppointmentServiceLine>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    name: { type: String, required: true },
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
  },
  { _id: false },
);

const appointmentSchema = new Schema<IAppointment>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    services: {
      type: [appointmentServiceSchema],
      required: true,
      validate: {
        validator: (v: IAppointmentServiceLine[]) => Array.isArray(v) && v.length > 0,
        message: "At least one service is required",
      },
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled", "no_show"],
      default: "booked",
    },
    notes: { type: String, trim: true },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ "services.staff": 1, date: 1, startTime: 1 });

export const Appointment = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema,
);
