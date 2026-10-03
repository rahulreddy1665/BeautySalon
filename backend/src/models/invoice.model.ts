import mongoose, { Document, Schema } from "mongoose";

export type PaymentMode = "upi" | "cash" | "card";
export type DiscountType = "percent" | "amount";
export type InvoiceStatus = "paid" | "partial" | "unpaid";
export type InvoiceSource = "walk-in" | "appointment";
export type RoundingRule = "none" | "nearest" | "up" | "down";
export type InvoiceTemplateId =
  | "creamGold"
  | "blush"
  | "compact"
  | "thermal"
  | "classic";

export type InvoiceAccentPreset =
  | "gold"
  | "blush"
  | "teal"
  | "charcoal"
  | "sage"
  | "plum"
  | "custom";

export interface IInvoiceTemplateSnapshot {
  templateId: InvoiceTemplateId;
  accentPreset: InvoiceAccentPreset;
  accentColor: string;
  showStaffNames: boolean;
  showLogo: boolean;
  termsText: string;
  thankYouText: string;
}

export interface ILineDiscount {
  type: DiscountType;
  value: number;
}

export interface IServiceItem {
  service: mongoose.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  staff: mongoose.Types.ObjectId;
  discount: ILineDiscount;
  lineTotal: number;
}

export interface IProductItem {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  staff: mongoose.Types.ObjectId;
  discount: ILineDiscount;
  lineTotal: number;
}

export interface ITaxSnapshot {
  gstEnabled: boolean;
  pricesIncludeGst: boolean;
  servicesCgstPercent: number;
  servicesSgstPercent: number;
  productsCgstPercent: number;
  productsSgstPercent: number;
  servicesTaxable: number;
  productsTaxable: number;
  servicesCgst: number;
  servicesSgst: number;
  productsCgst: number;
  productsSgst: number;
  cgstTotal: number;
  sgstTotal: number;
  taxTotal: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  customer?: mongoose.Types.ObjectId | null;
  walkIn: boolean;
  walkInName?: string;
  walkInPhone?: string;
  source: InvoiceSource;
  appointment?: mongoose.Types.ObjectId | null;
  serviceItems: IServiceItem[];
  productItems: IProductItem[];
  serviceSubtotal: number;
  productSubtotal: number;
  serviceDiscountTotal: number;
  productDiscountTotal: number;
  tax: ITaxSnapshot;
  loyaltyRedeemPoints: number;
  loyaltyRedeemValue: number;
  loyaltyEarnedPoints: number;
  roundOff: number;
  roundingRule: RoundingRule;
  tip: number;
  amountPayable: number;
  grandTotal: number;
  templateId: InvoiceTemplateId;
  /** Full presentation snapshot so old invoices never change with settings. */
  templateSnapshot?: IInvoiceTemplateSnapshot;
  businessSnapshot: {
    salonName: string;
    gstin?: string;
    address?: string;
    phone?: string;
    email?: string;
    invoiceFooterNote?: string;
    logoBase64?: string | null;
    logoMimeType?: string | null;
  };
  paymentMode: PaymentMode;
  status: InvoiceStatus;
  createdBy?: mongoose.Types.ObjectId | null;
}

const discountSchema = new Schema<ILineDiscount>(
  {
    type: { type: String, enum: ["percent", "amount"], default: "amount" },
    value: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const serviceItemSchema = new Schema<IServiceItem>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    discount: { type: discountSchema, default: () => ({ type: "amount", value: 0 }) },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const productItemSchema = new Schema<IProductItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    discount: { type: discountSchema, default: () => ({ type: "amount", value: 0 }) },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const taxSnapshotSchema = new Schema(
  {
    gstEnabled: { type: Boolean, default: false },
    pricesIncludeGst: { type: Boolean, default: false },
    servicesCgstPercent: { type: Number, default: 0 },
    servicesSgstPercent: { type: Number, default: 0 },
    productsCgstPercent: { type: Number, default: 0 },
    productsSgstPercent: { type: Number, default: 0 },
    servicesTaxable: { type: Number, default: 0 },
    productsTaxable: { type: Number, default: 0 },
    servicesCgst: { type: Number, default: 0 },
    servicesSgst: { type: Number, default: 0 },
    productsCgst: { type: Number, default: 0 },
    productsSgst: { type: Number, default: 0 },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    walkIn: { type: Boolean, default: false },
    walkInName: { type: String, trim: true },
    walkInPhone: { type: String, trim: true },
    source: {
      type: String,
      enum: ["walk-in", "appointment"],
      default: "walk-in",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    serviceItems: { type: [serviceItemSchema], default: [] },
    productItems: { type: [productItemSchema], default: [] },
    serviceSubtotal: { type: Number, required: true },
    productSubtotal: { type: Number, required: true },
    serviceDiscountTotal: { type: Number, required: true },
    productDiscountTotal: { type: Number, required: true },
    tax: { type: taxSnapshotSchema, default: () => ({}) },
    loyaltyRedeemPoints: { type: Number, default: 0 },
    loyaltyRedeemValue: { type: Number, default: 0 },
    loyaltyEarnedPoints: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    roundingRule: {
      type: String,
      enum: ["none", "nearest", "up", "down"],
      default: "none",
    },
    tip: { type: Number, default: 0, min: 0 },
    amountPayable: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    templateId: {
      type: String,
      enum: ["creamGold", "blush", "compact", "thermal", "classic"],
      default: "creamGold",
    },
    templateSnapshot: {
      templateId: {
        type: String,
        enum: ["creamGold", "blush", "compact", "thermal", "classic"],
      },
      accentPreset: {
        type: String,
        enum: ["gold", "blush", "teal", "charcoal", "sage", "plum", "custom"],
      },
      accentColor: { type: String },
      showStaffNames: { type: Boolean, default: true },
      showLogo: { type: Boolean, default: true },
      termsText: { type: String, default: "" },
      thankYouText: { type: String, default: "" },
    },
    businessSnapshot: {
      salonName: { type: String, default: "BeautySalon" },
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      invoiceFooterNote: { type: String, default: "" },
      logoBase64: { type: String, default: null },
      logoMimeType: { type: String, default: null },
    },
    paymentMode: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "paid",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ appointment: 1 }, { sparse: true });

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);

/** @deprecated Prefer InvoiceSequence — kept so old year counters don't break reads */
export interface IInvoiceCounter extends Document {
  year: number;
  seq: number;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>({
  year: { type: Number, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const InvoiceCounter = mongoose.model<IInvoiceCounter>(
  "InvoiceCounter",
  invoiceCounterSchema,
);
