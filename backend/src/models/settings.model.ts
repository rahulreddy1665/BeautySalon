import mongoose, { Document, Schema } from "mongoose";

export type RoundingRule = "none" | "nearest" | "up" | "down";
export type InvoiceTemplateId = "classic" | "compact" | "thermal";

export interface ITaxRatePair {
  cgstPercent: number;
  sgstPercent: number;
}

export interface IBusinessSettings {
  salonName: string;
  logoBase64?: string | null;
  logoMimeType?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  invoiceFooterNote?: string;
}

export interface ITaxSettings {
  gstEnabled: boolean;
  pricesIncludeGst: boolean;
  services: ITaxRatePair;
  products: ITaxRatePair;
}

export interface IInvoiceSettings {
  prefix: string;
  includeYear: boolean;
  numberPadding: number;
  rounding: RoundingRule;
  templateId: InvoiceTemplateId;
}

export interface IAppointmentSettings {
  startHour: number;
  endHour: number;
  slotMinutes: number;
}

export interface ILoyaltySettings {
  enabled: boolean;
  earnPointsPer100Inr: number;
  redeemValuePerPoint: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  pointsExpiryDays: number;
}

export interface ISettings extends Document {
  business: IBusinessSettings;
  tax: ITaxSettings;
  invoice: IInvoiceSettings;
  appointments: IAppointmentSettings;
  loyalty: ILoyaltySettings;
  updatedAt: Date;
  createdAt: Date;
}

export const DEFAULT_SETTINGS = {
  business: {
    salonName: "BeautySalon",
    logoBase64: null as string | null,
    logoMimeType: null as string | null,
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    gstin: "",
    invoiceFooterNote: "Thank you, visit again",
  },
  tax: {
    gstEnabled: true,
    pricesIncludeGst: false,
    services: { cgstPercent: 9, sgstPercent: 9 },
    products: { cgstPercent: 9, sgstPercent: 9 },
  },
  invoice: {
    prefix: "INV",
    includeYear: true,
    numberPadding: 5,
    rounding: "none" as RoundingRule,
    templateId: "classic" as InvoiceTemplateId,
  },
  appointments: {
    startHour: 9,
    endHour: 21,
    slotMinutes: 30,
  },
  loyalty: {
    enabled: true,
    earnPointsPer100Inr: 10,
    redeemValuePerPoint: 1,
    minRedeemPoints: 50,
    maxRedeemPercent: 50,
    pointsExpiryDays: 365,
  },
};

const taxRateSchema = new Schema<ITaxRatePair>(
  {
    cgstPercent: { type: Number, default: 9, min: 0, max: 50 },
    sgstPercent: { type: Number, default: 9, min: 0, max: 50 },
  },
  { _id: false },
);

const settingsSchema = new Schema<ISettings>(
  {
    business: {
      salonName: { type: String, required: true, trim: true, default: "BeautySalon" },
      logoBase64: { type: String, default: null },
      logoMimeType: { type: String, default: null },
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      gstin: { type: String, trim: true, default: "" },
      invoiceFooterNote: { type: String, trim: true, default: "Thank you, visit again" },
    },
    tax: {
      gstEnabled: { type: Boolean, default: true },
      pricesIncludeGst: { type: Boolean, default: false },
      services: { type: taxRateSchema, default: () => ({ cgstPercent: 9, sgstPercent: 9 }) },
      products: { type: taxRateSchema, default: () => ({ cgstPercent: 9, sgstPercent: 9 }) },
    },
    invoice: {
      prefix: { type: String, default: "INV", trim: true },
      includeYear: { type: Boolean, default: true },
      numberPadding: { type: Number, default: 5, min: 1, max: 10 },
      rounding: {
        type: String,
        enum: ["none", "nearest", "up", "down"],
        default: "none",
      },
      templateId: {
        type: String,
        enum: ["classic", "compact", "thermal"],
        default: "classic",
      },
    },
    appointments: {
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 21, min: 1, max: 24 },
      slotMinutes: { type: Number, default: 30, min: 5, max: 120 },
    },
    loyalty: {
      enabled: { type: Boolean, default: true },
      earnPointsPer100Inr: { type: Number, default: 10, min: 0 },
      redeemValuePerPoint: { type: Number, default: 1, min: 0 },
      minRedeemPoints: { type: Number, default: 50, min: 0 },
      maxRedeemPercent: { type: Number, default: 50, min: 0, max: 100 },
      pointsExpiryDays: { type: Number, default: 365, min: 0 },
    },
  },
  { timestamps: true },
);

export const Settings = mongoose.model<ISettings>("Settings", settingsSchema);
