import mongoose from "mongoose";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Appointment, type IAppointment } from "../models/appointment.model";
import { Combo } from "../models/combo.model";
import {
  Invoice,
  INVOICE_LIST_PROJECTION,
  type DiscountType,
  type PaymentMode,
} from "../models/invoice.model";
import { InvoiceSequence } from "../models/invoice-sequence.model";
import { Product } from "../models/product.model";
import { Service } from "../models/service.model";
import { Staff } from "../models/staff.model";
import { Customer } from "../models/customer.model";
import { allocateComboAmount } from "./combo.service";
import { applyInvoiceLoyalty } from "./loyalty.service";
import { ensureLogo, withInvoiceLogo } from "./logo.service";
import {
  applyRounding,
  computeSectionTax,
  formatInvoiceNumber,
  getOrCreateSettings,
} from "./settings.service";
import { applySaleDeduction } from "./stock.service";

export interface LineDiscountInput {
  type?: DiscountType;
  value?: number;
}

export interface ServiceLineInput {
  serviceId: string;
  staffId: string;
  qty: number;
  discount?: LineDiscountInput;
}

export interface ProductLineInput {
  productId: string;
  staffId: string;
  qty: number;
  discount?: LineDiscountInput;
}

export interface ComboComponentInput {
  serviceId: string;
  staffId: string;
}

export interface ComboLineInput {
  comboId: string;
  qty: number;
  discount?: LineDiscountInput;
  /** One staff assignment per combo component service. */
  components: ComboComponentInput[];
}

export interface CreateInvoiceDto {
  customerId?: string | null;
  walkIn?: boolean;
  walkInName?: string;
  walkInPhone?: string;
  appointmentId?: string | null;
  serviceItems?: ServiceLineInput[];
  productItems?: ProductLineInput[];
  comboItems?: ComboLineInput[];
  /** Section-level discount applied after per-line discounts (lines usually 0). */
  serviceDiscount?: LineDiscountInput;
  productDiscount?: LineDiscountInput;
  paymentMode: PaymentMode;
  tip?: number;
  loyaltyRedeemPoints?: number;
  createdBy?: string | null;
}

export interface InvoiceListQuery {
  from?: string;
  to?: string;
  paymentMode?: string;
  search?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function applyDiscount(
  base: number,
  discount?: LineDiscountInput,
): { discountAmount: number; lineTotal: number } {
  const type = discount?.type === "percent" ? "percent" : "amount";
  const value = Math.max(0, Number(discount?.value) || 0);
  let discountAmount = 0;
  if (type === "percent") {
    discountAmount = round2((base * Math.min(value, 100)) / 100);
  } else {
    discountAmount = round2(Math.min(value, base));
  }
  return { discountAmount, lineTotal: round2(base - discountAmount) };
}

type SalonSettings = Awaited<ReturnType<typeof getOrCreateSettings>>;

async function highestExistingInvoiceSeq(
  invoice: SalonSettings["invoice"],
  session?: mongoose.ClientSession,
): Promise<number> {
  const prefix = String(invoice.prefix || "INV").trim().toUpperCase();
  const year = new Date().getFullYear();
  const pattern = invoice.includeYear
    ? new RegExp(`^${prefix}-${year}-(\\d+)$`)
    : new RegExp(`^${prefix}-(\\d+)$`);
  const latest = await Invoice.find({ invoiceNumber: { $regex: pattern } })
    .sort({ invoiceNumber: -1 })
    .limit(50)
    .select("invoiceNumber")
    .session(session ?? null)
    .lean();
  let max = 0;
  for (const row of latest) {
    const m = String(row.invoiceNumber).match(pattern);
    if (m?.[1]) max = Math.max(max, Number(m[1]) || 0);
  }
  return max;
}

/**
 * Next invoice number. The counter never goes below the highest number already
 * issued (guards against imports / prefix changes). "Raise to floor, then +1" is
 * a single atomic pipeline update instead of read → set → increment.
 * Inside a transaction, an aborted bill also rolls the counter back (no gaps).
 */
async function nextInvoiceNumber(
  invoiceSettings: SalonSettings["invoice"],
  session?: mongoose.ClientSession,
): Promise<{ invoiceNumber: string; seq: number }> {
  const floor = await highestExistingInvoiceSeq(invoiceSettings, session);
  const counter = await InvoiceSequence.findOneAndUpdate(
    { key: "main" },
    [
      {
        $set: {
          seq: { $add: [{ $max: [{ $ifNull: ["$seq", 0] }, floor] }, 1] },
        },
      },
    ],
    { upsert: true, new: true, session },
  );
  return {
    invoiceNumber: formatInvoiceNumber(invoiceSettings, counter.seq),
    seq: counter.seq,
  };
}

type ObjectId = mongoose.Types.ObjectId;
type LineDiscountSnapshot = { type: "percent" | "amount"; value: number };

interface ServiceItemRow {
  service: ObjectId;
  name: string;
  price: number;
  qty: number;
  staff: ObjectId;
  discount: LineDiscountSnapshot;
  lineTotal: number;
}

interface ProductItemRow {
  product: ObjectId;
  name: string;
  price: number;
  qty: number;
  staff: ObjectId;
  discount: LineDiscountSnapshot;
  lineTotal: number;
}

interface ComboItemRow {
  combo: ObjectId;
  name: string;
  price: number;
  qty: number;
  discount: LineDiscountSnapshot;
  lineTotal: number;
  listTotal: number;
  components: Array<{
    service: ObjectId;
    name: string;
    listPrice: number;
    allocatedAmount: number;
    staff: ObjectId;
  }>;
}

/** Thrown inside the transaction to abort it and return this response. */
class BillingAbort extends Error {
  constructor(
    public readonly result: {
      statusCode: number;
      data: null;
      message?: string;
      errors?: unknown;
    },
  ) {
    super(result.message ?? "Billing aborted");
  }
}

const isObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

/** `$in` lookup keyed by string id. Invalid ids are dropped (they become "not found"). */
async function findByIds<T extends { _id: unknown }>(
  ids: Iterable<unknown>,
  query: (validIds: string[]) => Promise<T[]>,
): Promise<Map<string, T>> {
  const valid = [...new Set([...ids].filter(isObjectId))];
  if (valid.length === 0) return new Map();
  const docs = await query(valid);
  return new Map(docs.map((d) => [String(d._id), d]));
}

/**
 * Creates a bill.
 *
 * Phase 1 (validate, no writes): every lookup is batched. Settings, appointment,
 * customer, combos, products and staff load in parallel; then all services
 * (direct + combo components) in one `$in`. Previously each line did its own
 * findById, so query count grew with the bill size.
 *
 * Phase 2 (write, one transaction): claim appointment, invoice number, loyalty,
 * invoice, stock. Any failure rolls back everything, including loyalty points,
 * which the old manual cleanup did not undo.
 */
export const createInvoice = async (data: CreateInvoiceDto) => {
  try {
    const serviceInputs = data.serviceItems ?? [];
    const productInputs = data.productItems ?? [];
    const comboInputs = data.comboItems ?? [];
    if (
      serviceInputs.length === 0 &&
      productInputs.length === 0 &&
      comboInputs.length === 0
    ) {
      return {
        statusCode: 400,
        data: null,
        message: "At least one service, product, or combo line is required",
      };
    }

    if (!["upi", "cash", "card"].includes(data.paymentMode)) {
      return { statusCode: 400, data: null, message: "Invalid paymentMode" };
    }

    const tip = Math.max(0, round2(Number(data.tip) || 0));
    const requestedRedeem = Math.max(
      0,
      Math.floor(Number(data.loyaltyRedeemPoints) || 0),
    );

    // ---- Phase 1a: everything that doesn't depend on another lookup, in parallel.
    const staffIds = new Set<unknown>([
      ...serviceInputs.map((l) => l.staffId),
      ...productInputs.map((l) => l.staffId),
      ...comboInputs.flatMap((l) =>
        Array.isArray(l.components) ? l.components.map((c) => c.staffId) : [],
      ),
    ]);
    const [settings, appointment, customerDoc, comboById, productById, staffById] =
      await Promise.all([
        getOrCreateSettings(),
        data.appointmentId
          ? isObjectId(data.appointmentId)
            ? Appointment.findById(data.appointmentId)
            : null
          : null,
        data.customerId
          ? isObjectId(data.customerId)
            ? Customer.findById(data.customerId).select("_id").lean()
            : null
          : null,
        findByIds(
          comboInputs.map((l) => l.comboId),
          (ids) =>
            Combo.find({ _id: { $in: ids }, isDeleted: false, isActive: true }).lean(),
        ),
        findByIds(
          productInputs.map((l) => l.productId),
          (ids) => Product.find({ _id: { $in: ids } }).lean(),
        ),
        findByIds(staffIds, (ids) =>
          Staff.find({ _id: { $in: ids } }).select("_id").lean(),
        ),
      ]);

    // ---- Phase 1b: all services (direct lines + combo components) in one query.
    const serviceById = await findByIds(
      [
        ...serviceInputs.map((l) => l.serviceId),
        ...[...comboById.values()].flatMap((c) =>
          c.services.map((s) => String(s.service)),
        ),
      ],
      (ids) => Service.find({ _id: { $in: ids } }).select("name price").lean(),
    );

    // ---- Validation, in the same order and with the same messages as before.
    if (data.appointmentId) {
      if (!appointment) {
        return {
          statusCode: 404,
          data: null,
          message: "Appointment not found",
        };
      }
      if (appointment.status === "completed" || appointment.invoice) {
        return {
          statusCode: 409,
          data: null,
          message: "This appointment has already been billed",
        };
      }
      if (appointment.status !== "booked") {
        return {
          statusCode: 400,
          data: null,
          message: "Only booked appointments can be billed",
        };
      }
    }

    const serviceItems: ServiceItemRow[] = [];
    let serviceSubtotal = 0;
    let serviceDiscountTotal = 0;

    for (const line of serviceInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Service qty must be >= 1" };
      }
      const service = serviceById.get(String(line.serviceId));
      if (!service) {
        return {
          statusCode: 400,
          data: null,
          message: `Service not found: ${line.serviceId}`,
        };
      }
      const staff = staffById.get(String(line.staffId));
      if (!staff) {
        return {
          statusCode: 400,
          data: null,
          message: `Staff not found: ${line.staffId}`,
        };
      }
      const base = round2(service.price * qty);
      const { discountAmount, lineTotal } = applyDiscount(base, line.discount);
      serviceSubtotal = round2(serviceSubtotal + base);
      serviceDiscountTotal = round2(serviceDiscountTotal + discountAmount);
      serviceItems.push({
        service: service._id as ObjectId,
        name: service.name,
        price: service.price,
        qty,
        staff: staff._id as ObjectId,
        discount: {
          type: line.discount?.type === "percent" ? "percent" : "amount",
          value: Math.max(0, Number(line.discount?.value) || 0),
        },
        lineTotal,
      });
    }

    const comboItems: ComboItemRow[] = [];
    for (const line of comboInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Combo qty must be >= 1" };
      }
      const combo = comboById.get(String(line.comboId));
      if (!combo) {
        return {
          statusCode: 400,
          data: null,
          message: `Combo not found: ${line.comboId}`,
        };
      }
      const expectedIds = combo.services.map((s) => String(s.service));
      const provided = Array.isArray(line.components) ? line.components : [];
      if (provided.length !== expectedIds.length) {
        return fail(
          400,
          ErrorMessages.COMBO_INVALID_COMPONENTS,
          ErrorCodes.COMBO_INVALID_COMPONENTS,
        );
      }
      const providedMap = new Map(
        provided.map((c) => [String(c.serviceId), String(c.staffId)]),
      );
      for (const sid of expectedIds) {
        if (!providedMap.has(sid)) {
          return fail(
            400,
            ErrorMessages.COMBO_INVALID_COMPONENTS,
            ErrorCodes.COMBO_INVALID_COMPONENTS,
          );
        }
      }

      const componentRows: Array<{
        service: mongoose.Types.ObjectId;
        name: string;
        listPrice: number;
        staff: mongoose.Types.ObjectId;
      }> = [];
      let listTotal = 0;
      for (const row of combo.services) {
        const service = serviceById.get(String(row.service));
        if (!service) {
          return {
            statusCode: 400,
            data: null,
            message: `Service not found in combo: ${String(row.service)}`,
          };
        }
        const staffId = providedMap.get(String(row.service))!;
        const staff = staffById.get(staffId);
        if (!staff) {
          return {
            statusCode: 400,
            data: null,
            message: `Staff not found: ${staffId}`,
          };
        }
        const componentQty = Math.max(1, Math.floor(Number(row.qty) || 1));
        const listPrice = round2(service.price * componentQty * qty);
        listTotal = round2(listTotal + listPrice);
        componentRows.push({
          service: service._id as mongoose.Types.ObjectId,
          name: service.name,
          listPrice,
          staff: staff._id as mongoose.Types.ObjectId,
        });
      }

      const base = round2(combo.comboPrice * qty);
      const { discountAmount, lineTotal } = applyDiscount(base, line.discount);
      serviceSubtotal = round2(serviceSubtotal + base);
      serviceDiscountTotal = round2(serviceDiscountTotal + discountAmount);

      const allocations = allocateComboAmount(
        lineTotal,
        componentRows.map((c) => ({ listPrice: c.listPrice })),
      );
      comboItems.push({
        combo: combo._id as ObjectId,
        name: combo.name,
        price: combo.comboPrice,
        qty,
        discount: {
          type: line.discount?.type === "percent" ? "percent" : "amount",
          value: Math.max(0, Number(line.discount?.value) || 0),
        },
        lineTotal,
        listTotal,
        components: componentRows.map((c, i) => ({
          service: c.service,
          name: c.name,
          listPrice: c.listPrice,
          allocatedAmount: allocations[i] ?? 0,
          staff: c.staff,
        })),
      });
    }

    const productItems: ProductItemRow[] = [];
    const trackStockById = new Map<string, boolean>();
    let productSubtotal = 0;
    let productDiscountTotal = 0;

    for (const line of productInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Product qty must be >= 1" };
      }
      const product = productById.get(String(line.productId));
      if (!product) {
        return {
          statusCode: 400,
          data: null,
          message: `Product not found: ${line.productId}`,
        };
      }
      if (product.type === "consumable") {
        return fail(
          400,
          ErrorMessages.PRODUCT_NOT_BILLABLE,
          ErrorCodes.PRODUCT_NOT_BILLABLE,
          {
            code: ErrorCodes.PRODUCT_NOT_BILLABLE,
            productId: String(product._id),
            productName: product.name,
          },
        );
      }
      const staff = staffById.get(String(line.staffId));
      if (!staff) {
        return {
          statusCode: 400,
          data: null,
          message: `Staff not found: ${line.staffId}`,
        };
      }
      trackStockById.set(String(product._id), Boolean(product.trackStock));
      const base = round2(product.price * qty);
      const { discountAmount, lineTotal } = applyDiscount(base, line.discount);
      productSubtotal = round2(productSubtotal + base);
      productDiscountTotal = round2(productDiscountTotal + discountAmount);
      productItems.push({
        product: product._id as ObjectId,
        name: product.name,
        price: product.price,
        qty,
        staff: staff._id as ObjectId,
        discount: {
          type: line.discount?.type === "percent" ? "percent" : "amount",
          value: Math.max(0, Number(line.discount?.value) || 0),
        },
        lineTotal,
      });
    }

    // Section discounts (after line discounts; FE sends line discounts as 0)
    const serviceAfterLines = round2(serviceSubtotal - serviceDiscountTotal);
    const productAfterLines = round2(productSubtotal - productDiscountTotal);
    const serviceSection = applyDiscount(
      serviceAfterLines,
      data.serviceDiscount,
    );
    const productSection = applyDiscount(
      productAfterLines,
      data.productDiscount,
    );
    serviceDiscountTotal = round2(
      serviceDiscountTotal + serviceSection.discountAmount,
    );
    productDiscountTotal = round2(
      productDiscountTotal + productSection.discountAmount,
    );

    const serviceNet = round2(serviceSubtotal - serviceDiscountTotal);
    const productNet = round2(productSubtotal - productDiscountTotal);
    const netAfterDiscounts = round2(serviceNet + productNet);

    const taxCfg = settings.tax;

    const serviceTax = computeSectionTax({
      netAmount: serviceNet,
      cgstPercent: taxCfg.services.cgstPercent,
      sgstPercent: taxCfg.services.sgstPercent,
      inclusive: taxCfg.pricesIncludeGst,
      enabled: taxCfg.gstEnabled,
    });
    const productTax = computeSectionTax({
      netAmount: productNet,
      cgstPercent: taxCfg.products.cgstPercent,
      sgstPercent: taxCfg.products.sgstPercent,
      inclusive: taxCfg.pricesIncludeGst,
      enabled: taxCfg.gstEnabled,
    });

    const tax = {
      gstEnabled: taxCfg.gstEnabled,
      pricesIncludeGst: taxCfg.pricesIncludeGst,
      servicesCgstPercent: taxCfg.services.cgstPercent,
      servicesSgstPercent: taxCfg.services.sgstPercent,
      productsCgstPercent: taxCfg.products.cgstPercent,
      productsSgstPercent: taxCfg.products.sgstPercent,
      servicesTaxable: serviceTax.taxable,
      productsTaxable: productTax.taxable,
      servicesCgst: serviceTax.cgstAmount,
      servicesSgst: serviceTax.sgstAmount,
      productsCgst: productTax.cgstAmount,
      productsSgst: productTax.sgstAmount,
      cgstTotal: round2(serviceTax.cgstAmount + productTax.cgstAmount),
      sgstTotal: round2(serviceTax.sgstAmount + productTax.sgstAmount),
      taxTotal: round2(serviceTax.taxTotal + productTax.taxTotal),
    };

    // After GST amount (exclusive: net + tax; inclusive: gross already includes tax)
    const afterTax = taxCfg.gstEnabled
      ? taxCfg.pricesIncludeGst
        ? round2(serviceTax.gross + productTax.gross)
        : round2(netAfterDiscounts + tax.taxTotal)
      : netAfterDiscounts;

    let customer: mongoose.Types.ObjectId | null = null;
    let walkIn = Boolean(data.walkIn);
    let walkInName = data.walkInName?.trim();
    let walkInPhone = data.walkInPhone?.trim();

    if (data.customerId) {
      if (!customerDoc) {
        return { statusCode: 400, data: null, message: "Customer not found" };
      }
      customer = customerDoc._id as mongoose.Types.ObjectId;
      walkIn = false;
    } else if (appointment?.customer) {
      customer = appointment.customer as mongoose.Types.ObjectId;
      walkIn = false;
    } else if (appointment?.guestName) {
      walkIn = true;
      walkInName = walkInName || appointment.guestName;
      walkInPhone = walkInPhone || appointment.guestPhone;
    } else {
      walkIn = true;
    }

    // Loyalty redeem value computed against net after discounts (pre-tax)
    let loyaltyRedeemPoints = 0;
    let loyaltyRedeemValue = 0;

    if (customer && settings.loyalty.enabled && requestedRedeem > 0) {
      const maxValue = round2(
        (netAfterDiscounts * settings.loyalty.maxRedeemPercent) / 100,
      );
      const maxPtsByValue = Math.floor(
        maxValue / Math.max(settings.loyalty.redeemValuePerPoint, 0.01),
      );
      loyaltyRedeemPoints = Math.min(requestedRedeem, maxPtsByValue);
      if (
        loyaltyRedeemPoints > 0 &&
        loyaltyRedeemPoints < settings.loyalty.minRedeemPoints
      ) {
        return {
          statusCode: 400,
          data: null,
          message: `Minimum redeem is ${settings.loyalty.minRedeemPoints} points`,
        };
      }
      loyaltyRedeemValue = round2(
        loyaltyRedeemPoints * settings.loyalty.redeemValuePerPoint,
      );
    }

    const b = settings.business;
    const templateId =
      settings.invoice.templateId === "classic"
        ? "creamGold"
        : settings.invoice.templateId;
    const allowNegativeStock = Boolean(settings.business?.allowNegativeStock);
    // The invoice stores a reference; the logo itself is stored once.
    const logoId = await ensureLogo(b.logoBase64, b.logoMimeType);
    // Known up front so loyalty, stock ledger and the appointment can reference it
    // before the invoice document is written (lets us write the invoice once).
    const invoiceId = new mongoose.Types.ObjectId();

    // ---- Phase 2: all writes succeed together or not at all.
    const session = await mongoose.startSession();
    try {
      // withTransaction retries the callback on transient errors (e.g. two bills
      // racing for the invoice counter), so everything inside is recomputed per attempt.
      await session.withTransaction(async () => {
        if (appointment) {
          // Claim and link in one write; the filter makes double-billing impossible.
          const claimed = await Appointment.findOneAndUpdate(
            {
              _id: appointment._id,
              status: "booked",
              $or: [{ invoice: null }, { invoice: { $exists: false } }],
            },
            { $set: { status: "completed", invoice: invoiceId } },
            { new: true, session },
          );
          if (!claimed) {
            throw new BillingAbort({
              statusCode: 409,
              data: null,
              message: "This appointment has already been billed",
            });
          }
        }

        const { invoiceNumber } = await nextInvoiceNumber(settings.invoice, session);

        let redeemPoints = loyaltyRedeemPoints;
        let redeemValue = loyaltyRedeemValue;
        let earnedPoints = 0;
        if (customer && settings.loyalty.enabled) {
          const loyaltyResult = await applyInvoiceLoyalty({
            customerId: String(customer),
            redeemPoints: loyaltyRedeemPoints,
            earnBaseAmount: netAfterDiscounts,
            invoiceId: String(invoiceId),
            createdBy: data.createdBy,
            rules: settings.loyalty,
            session,
          });
          // Actual redeem may be lower if the balance was lower.
          redeemPoints = loyaltyResult.redeemedPoints;
          redeemValue = loyaltyResult.redeemedValue;
          earnedPoints = loyaltyResult.earnedPoints;
        }

        const afterLoyalty = round2(Math.max(0, afterTax - redeemValue));
        const { rounded, roundOff } = applyRounding(
          afterLoyalty,
          settings.invoice.rounding,
        );
        const amountPayable = round2(rounded + tip);

        await Invoice.create(
          [
            {
              _id: invoiceId,
              invoiceNumber,
              customer,
              walkIn,
              walkInName,
              walkInPhone,
              source: appointment ? "appointment" : "walk-in",
              appointment: appointment?._id ?? null,
              serviceItems,
              productItems,
              comboItems,
              serviceSubtotal,
              productSubtotal,
              serviceDiscountTotal,
              productDiscountTotal,
              tax,
              loyaltyRedeemPoints: redeemPoints,
              loyaltyRedeemValue: redeemValue,
              loyaltyEarnedPoints: earnedPoints,
              roundOff,
              roundingRule: settings.invoice.rounding,
              tip,
              amountPayable,
              grandTotal: amountPayable,
              templateId,
              templateSnapshot: {
                templateId,
                accentPreset: settings.invoice.accentPreset ?? "gold",
                accentColor: settings.invoice.accentColor ?? "#FFD700",
                showStaffNames: settings.invoice.showStaffNames !== false,
                showLogo: settings.invoice.showLogo !== false,
                termsText: settings.invoice.termsText ?? "",
                thankYouText: settings.invoice.thankYouText ?? "",
              },
              businessSnapshot: {
                salonName: b.salonName,
                gstin: b.gstin,
                address: [b.address, b.city, b.state, b.pincode]
                  .filter(Boolean)
                  .join(", "),
                phone: b.phone,
                email: b.email,
                invoiceFooterNote: b.invoiceFooterNote,
                logoId,
              },
              paymentMode: data.paymentMode,
              status: "paid",
              createdBy: data.createdBy || null,
            },
          ],
          { session },
        );

        for (const line of productItems) {
          const deduct = await applySaleDeduction({
            productId: String(line.product),
            quantity: line.qty,
            invoiceId: String(invoiceId),
            createdBy: data.createdBy,
            trackStock: trackStockById.get(String(line.product)),
            allowNegative: allowNegativeStock,
            session,
          });
          if (deduct.statusCode !== 200) {
            throw new BillingAbort({
              statusCode: deduct.statusCode,
              data: null,
              message:
                (deduct as { message?: string }).message ??
                ErrorMessages.INSUFFICIENT_STOCK,
              errors: (deduct as { errors?: unknown }).errors ?? {
                code: ErrorCodes.INSUFFICIENT_STOCK,
              },
            });
          }
        }
      });
    } catch (error) {
      if (error instanceof BillingAbort) return error.result;
      throw error;
    } finally {
      await session.endSession();
    }

    // ---- Phase 3: committed; return it with names filled in.
    const populated = await Invoice.findById(invoiceId)
      .populate("customer", "name lastName phone")
      .populate("serviceItems.staff", "name")
      .populate("productItems.staff", "name")
      .populate("comboItems.components.staff", "name");

    return {
      statusCode: 200,
      data: await withInvoiceLogo(populated),
      message: undefined,
    };
  } catch (error) {
    return {
      statusCode: 500,
      data: null,
      message: error instanceof Error ? error.message : "Invoice create failed",
      errors: error,
    };
  }
};

export const getInvoices = async (query: InvoiceListQuery = {}) => {
  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const filter: Record<string, unknown> = {};

    if (query.paymentMode) filter.paymentMode = query.paymentMode;
    if (query.customerId && mongoose.Types.ObjectId.isValid(query.customerId)) {
      filter.customer = new mongoose.Types.ObjectId(query.customerId);
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        const end = new Date(query.to);
        end.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = end;
      }
    }

    // Search is part of the query (not a filter on the fetched page), so it
    // finds matches anywhere in the history and `total` / paging stay correct.
    const search = query.search?.trim();
    if (search) {
      const pattern = escapeRegex(search);
      const digits = search.replace(/\D/g, "");
      const customerMatch: Record<string, unknown>[] = [
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ["$name", ""] },
                  " ",
                  { $ifNull: ["$lastName", ""] },
                ],
              },
              regex: pattern,
              options: "i",
            },
          },
        },
      ];
      if (digits.length >= 3) {
        customerMatch.push(
          digits.length === 10
            ? { phone: Number(digits) }
            : {
                $expr: {
                  $regexMatch: { input: { $toString: "$phone" }, regex: digits },
                },
              },
        );
      }
      const matchingCustomers = await Customer.find({ $or: customerMatch })
        .select("_id")
        .limit(1000)
        .lean();
      filter.$or = [
        { invoiceNumber: { $regex: pattern, $options: "i" } },
        { walkInName: { $regex: pattern, $options: "i" } },
        ...(matchingCustomers.length
          ? [{ customer: { $in: matchingCustomers.map((c) => c._id) } }]
          : []),
      ];
    }

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .select(INVOICE_LIST_PROJECTION)
        .populate("customer", "name lastName phone")
        .populate("serviceItems.staff", "name")
        .populate("productItems.staff", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    return {
      statusCode: 200,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getInvoiceById = async (id: string) => {
  try {
    const invoice = await Invoice.findById(id)
      .populate("customer", "name lastName phone email")
      .populate("serviceItems.staff", "name")
      .populate("productItems.staff", "name")
      .populate("comboItems.components.staff", "name")
      .populate("appointment");
    if (!invoice) {
      return { statusCode: 404, data: null, message: "Invoice not found" };
    }
    return { statusCode: 200, data: await withInvoiceLogo(invoice) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getStaffSalesSummary = async (from?: string, to?: string) => {
  try {
    const match: Record<string, unknown> = {};
    if (from || to) {
      match.createdAt = {};
      if (from) (match.createdAt as Record<string, Date>).$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        (match.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const invoices = await Invoice.find(match)
      .select("serviceItems productItems comboItems serviceSubtotal serviceDiscountTotal productSubtotal productDiscountTotal")
      .lean();
    const byStaff = new Map<
      string,
      { staffId: string; serviceSales: number; productSales: number }
    >();

    const bump = (
      staffId: string,
      kind: "service" | "product",
      amount: number,
    ) => {
      const row = byStaff.get(staffId) ?? {
        staffId,
        serviceSales: 0,
        productSales: 0,
      };
      if (kind === "service") row.serviceSales = round2(row.serviceSales + amount);
      else row.productSales = round2(row.productSales + amount);
      byStaff.set(staffId, row);
    };

    for (const inv of invoices) {
      for (const line of inv.serviceItems ?? []) {
        bump(String(line.staff), "service", line.lineTotal);
      }
      for (const combo of inv.comboItems ?? []) {
        for (const comp of combo.components ?? []) {
          bump(String(comp.staff), "service", Number(comp.allocatedAmount) || 0);
        }
      }
      for (const line of inv.productItems ?? []) {
        bump(String(line.staff), "product", line.lineTotal);
      }
    }

    const staffIds = [...byStaff.keys()];
    const staffDocs = await Staff.find({ _id: { $in: staffIds } });
    const nameById = new Map(staffDocs.map((s) => [String(s._id), s.name]));

    const rows = [...byStaff.values()]
      .map((r) => ({
        staffId: r.staffId,
        staffName: nameById.get(r.staffId) ?? "Unknown",
        serviceSales: r.serviceSales,
        productSales: r.productSales,
        totalSales: round2(r.serviceSales + r.productSales),
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    return { statusCode: 200, data: rows };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getPopularBillingItems = async (limitRaw?: unknown) => {
  try {
    const limit = Math.min(50, Math.max(1, Math.floor(Number(limitRaw) || 12)));

    // Count in the database: returns at most `limit` rows per type instead of
    // shipping every paid invoice's lines to Node. Ties keep first-sold order
    // (earliest invoice _id), matching the previous in-memory behaviour.
    const topSold = (itemsField: "serviceItems" | "productItems", idField: string) =>
      Invoice.aggregate<{ _id: mongoose.Types.ObjectId; qty: number }>([
        { $match: { status: "paid" } },
        { $project: { [itemsField]: 1 } },
        { $unwind: { path: `$${itemsField}`, includeArrayIndex: "lineIndex" } },
        { $match: { [`${itemsField}.${idField}`]: { $ne: null } } },
        {
          $group: {
            _id: `$${itemsField}.${idField}`,
            qty: { $sum: { $ifNull: [`$${itemsField}.qty`, 1] } },
            firstSeen: { $min: { invoice: "$_id", line: "$lineIndex" } },
          },
        },
        { $sort: { qty: -1, firstSeen: 1 } },
        { $limit: limit },
      ]);

    const [topServices, topProducts] = await Promise.all([
      topSold("serviceItems", "service"),
      topSold("productItems", "product"),
    ]);
    const serviceQty = new Map(topServices.map((r) => [String(r._id), r.qty]));
    const productQty = new Map(topProducts.map((r) => [String(r._id), r.qty]));
    const topServiceIds = topServices.map((r) => String(r._id));
    const topProductIds = topProducts.map((r) => String(r._id));

    const [serviceDocs, productDocs] = await Promise.all([
      Service.find({ _id: { $in: topServiceIds } })
        .select("name price")
        .lean(),
      Product.find({ _id: { $in: topProductIds } })
        .select("name price")
        .lean(),
    ]);

    const serviceById = new Map(
      serviceDocs.map((s) => [String(s._id), s]),
    );
    const productById = new Map(
      productDocs.map((p) => [String(p._id), p]),
    );

    const services = topServiceIds
      .map((id) => {
        const doc = serviceById.get(id);
        if (!doc) return null;
        return {
          id,
          name: doc.name,
          price: Number(doc.price ?? 0),
          timesSold: serviceQty.get(id) ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const products = topProductIds
      .map((id) => {
        const doc = productById.get(id);
        if (!doc) return null;
        return {
          id,
          name: doc.name,
          price: Number(doc.price ?? 0),
          timesSold: productQty.get(id) ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    return { statusCode: 200, data: { services, products } };
  } catch (error) {
    return { statusCode: 500, data: null, message: "Popular items failed", errors: error };
  }
};
