import mongoose from "mongoose";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Appointment, type IAppointment } from "../models/appointment.model";
import { Combo } from "../models/combo.model";
import {
  Invoice,
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

async function highestExistingInvoiceSeq(
  invoice: Awaited<ReturnType<typeof getOrCreateSettings>>["invoice"],
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
    .lean();
  let max = 0;
  for (const row of latest) {
    const m = String(row.invoiceNumber).match(pattern);
    if (m?.[1]) max = Math.max(max, Number(m[1]) || 0);
  }
  return max;
}

async function nextInvoiceNumberFromSettings(): Promise<{
  invoiceNumber: string;
  seq: number;
}> {
  const settings = await getOrCreateSettings();
  const floor = await highestExistingInvoiceSeq(settings.invoice);
  const existing = await InvoiceSequence.findOne({ key: "main" });
  const base = Math.max(existing?.seq ?? 0, floor);
  if (!existing || existing.seq < floor) {
    await InvoiceSequence.findOneAndUpdate(
      { key: "main" },
      { $set: { seq: base } },
      { upsert: true },
    );
  }
  const counter = await InvoiceSequence.findOneAndUpdate(
    { key: "main" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return {
    invoiceNumber: formatInvoiceNumber(settings.invoice, counter.seq),
    seq: counter.seq,
  };
}

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

    let appointment: IAppointment | null = null;
    if (data.appointmentId) {
      appointment = await Appointment.findById(data.appointmentId);
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

    const serviceItems = [];
    let serviceSubtotal = 0;
    let serviceDiscountTotal = 0;

    for (const line of serviceInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Service qty must be >= 1" };
      }
      const service = await Service.findById(line.serviceId);
      if (!service) {
        return {
          statusCode: 400,
          data: null,
          message: `Service not found: ${line.serviceId}`,
        };
      }
      const staff = await Staff.findById(line.staffId);
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
        service: service._id,
        name: service.name,
        price: service.price,
        qty,
        staff: staff._id,
        discount: {
          type: line.discount?.type === "percent" ? "percent" : "amount",
          value: Math.max(0, Number(line.discount?.value) || 0),
        },
        lineTotal,
      });
    }

    const comboItems = [];
    for (const line of comboInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Combo qty must be >= 1" };
      }
      const combo = await Combo.findOne({
        _id: line.comboId,
        isDeleted: false,
        isActive: true,
      });
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
        const service = await Service.findById(row.service);
        if (!service) {
          return {
            statusCode: 400,
            data: null,
            message: `Service not found in combo: ${String(row.service)}`,
          };
        }
        const staffId = providedMap.get(String(row.service))!;
        const staff = await Staff.findById(staffId);
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
        combo: combo._id,
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

    const productItems = [];
    let productSubtotal = 0;
    let productDiscountTotal = 0;

    for (const line of productInputs) {
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { statusCode: 400, data: null, message: "Product qty must be >= 1" };
      }
      const product = await Product.findById(line.productId);
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
      const staff = await Staff.findById(line.staffId);
      if (!staff) {
        return {
          statusCode: 400,
          data: null,
          message: `Staff not found: ${line.staffId}`,
        };
      }
      const base = round2(product.price * qty);
      const { discountAmount, lineTotal } = applyDiscount(base, line.discount);
      productSubtotal = round2(productSubtotal + base);
      productDiscountTotal = round2(productDiscountTotal + discountAmount);
      productItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        qty,
        staff: staff._id,
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

    const settings = await getOrCreateSettings();
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
      const c = await Customer.findById(data.customerId);
      if (!c) {
        return { statusCode: 400, data: null, message: "Customer not found" };
      }
      customer = c._id as mongoose.Types.ObjectId;
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
    let loyaltyEarnedPoints = 0;

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

    const afterLoyalty = round2(Math.max(0, afterTax - loyaltyRedeemValue));
    const { rounded, roundOff } = applyRounding(
      afterLoyalty,
      settings.invoice.rounding,
    );
    const amountPayable = round2(rounded + tip);
    const grandTotal = amountPayable;

    if (appointment) {
      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appointment._id,
          status: "booked",
          $or: [{ invoice: null }, { invoice: { $exists: false } }],
        },
        { $set: { status: "completed" } },
        { new: true },
      );
      if (!claimed) {
        return {
          statusCode: 409,
          data: null,
          message: "This appointment has already been billed",
        };
      }
    }

    const { invoiceNumber } = await nextInvoiceNumberFromSettings();
    const b = settings.business;

    const invoice = await Invoice.create({
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
      loyaltyRedeemPoints,
      loyaltyRedeemValue,
      loyaltyEarnedPoints: 0,
      roundOff,
      roundingRule: settings.invoice.rounding,
      tip,
      amountPayable,
      grandTotal,
      templateId:
        settings.invoice.templateId === "classic"
          ? "creamGold"
          : settings.invoice.templateId,
      templateSnapshot: {
        templateId:
          settings.invoice.templateId === "classic"
            ? "creamGold"
            : settings.invoice.templateId,
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
        address: [b.address, b.city, b.state, b.pincode].filter(Boolean).join(", "),
        phone: b.phone,
        email: b.email,
        invoiceFooterNote: b.invoiceFooterNote,
        logoBase64: b.logoBase64,
        logoMimeType: b.logoMimeType,
      },
      paymentMode: data.paymentMode,
      status: "paid",
      createdBy: data.createdBy || null,
    });

    if (customer && settings.loyalty.enabled) {
      const loyaltyResult = await applyInvoiceLoyalty({
        customerId: String(customer),
        redeemPoints: loyaltyRedeemPoints,
        earnBaseAmount: netAfterDiscounts,
        invoiceId: String(invoice._id),
        createdBy: data.createdBy,
      });
      // Sync actual redeem if balance was lower
      invoice.loyaltyRedeemPoints = loyaltyResult.redeemedPoints;
      invoice.loyaltyRedeemValue = loyaltyResult.redeemedValue;
      invoice.loyaltyEarnedPoints = loyaltyResult.earnedPoints;
      // If redeem value changed due to balance, recalculate payable is too late;
      // applyInvoiceLoyalty already capped. Recompute only if redeem dropped.
      if (loyaltyResult.redeemedValue !== loyaltyRedeemValue) {
        const afterLoyalty2 = round2(
          Math.max(0, afterTax - loyaltyResult.redeemedValue),
        );
        const r2 = applyRounding(afterLoyalty2, settings.invoice.rounding);
        invoice.roundOff = r2.roundOff;
        invoice.amountPayable = round2(r2.rounded + tip);
        invoice.grandTotal = invoice.amountPayable;
      }
      await invoice.save();
    }

    if (appointment) {
      await Appointment.findByIdAndUpdate(appointment._id, {
        invoice: invoice._id,
        status: "completed",
      });
    }

    // Deduct tracked retail stock after invoice exists; roll back invoice on failure.
    for (const line of productItems) {
      const deduct = await applySaleDeduction({
        productId: String(line.product),
        quantity: line.qty,
        invoiceId: String(invoice._id),
        createdBy: data.createdBy,
      });
      if (deduct.statusCode !== 200) {
        await Invoice.findByIdAndDelete(invoice._id);
        if (appointment) {
          await Appointment.findByIdAndUpdate(appointment._id, {
            $unset: { invoice: 1 },
            $set: { status: "booked" },
          });
        }
        return {
          statusCode: deduct.statusCode,
          data: null,
          message:
            (deduct as { message?: string }).message ??
            ErrorMessages.INSUFFICIENT_STOCK,
          errors: (deduct as { errors?: unknown }).errors ?? {
            code: ErrorCodes.INSUFFICIENT_STOCK,
          },
        };
      }
    }

    const populated = await Invoice.findById(invoice._id)
      .populate("customer", "name lastName phone")
      .populate("serviceItems.staff", "name")
      .populate("productItems.staff", "name")
      .populate("comboItems.components.staff", "name");

    return { statusCode: 200, data: populated ?? invoice };
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

    let items = await Invoice.find(filter)
      .populate("customer", "name lastName phone")
      .populate("serviceItems.staff", "name")
      .populate("productItems.staff", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter((inv) => {
        const cust = inv.customer as { name?: string; lastName?: string } | null;
        const name = cust
          ? `${cust.name ?? ""} ${cust.lastName ?? ""}`
          : inv.walkInName ?? "";
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q)
        );
      });
    }

    const total = await Invoice.countDocuments(filter);

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
    return { statusCode: 200, data: invoice };
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

    const invoices = await Invoice.find(match).lean();
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

    const invoices = await Invoice.find({ status: "paid" })
      .select("serviceItems productItems")
      .lean();

    const serviceQty = new Map<string, number>();
    const productQty = new Map<string, number>();

    for (const inv of invoices) {
      for (const line of inv.serviceItems ?? []) {
        if (!line.service) continue;
        const id = String(line.service);
        serviceQty.set(id, (serviceQty.get(id) ?? 0) + Number(line.qty ?? 1));
      }
      for (const line of inv.productItems ?? []) {
        if (!line.product) continue;
        const id = String(line.product);
        productQty.set(id, (productQty.get(id) ?? 0) + Number(line.qty ?? 1));
      }
    }

    const topServiceIds = [...serviceQty.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    const topProductIds = [...productQty.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

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
