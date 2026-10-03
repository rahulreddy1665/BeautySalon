import crypto from "crypto";

import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { Invoice } from "../models/invoice.model";
import { InvoiceShareLink } from "../models/invoice-share-link.model";
import { getSettings } from "./settings.service";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function mintToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function publicBaseUrl(): string {
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";
  return base.replace(/\/$/, "");
}

function buildPublicUrl(token: string): string {
  return `${publicBaseUrl()}/i/${token}`;
}

/** Active = not revoked and not expired. */
async function findActiveLink(invoiceId: string) {
  return InvoiceShareLink.findOne({
    invoice: invoiceId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

export const createOrReuseShareLink = async (
  invoiceId: string,
  opts: { renew?: boolean } = {},
) => {
  try {
    const invoice = await Invoice.findById(invoiceId).select("_id");
    if (!invoice) {
      return fail(404, ErrorMessages[ErrorCodes.NOT_FOUND], ErrorCodes.NOT_FOUND);
    }

    const existing = await findActiveLink(invoiceId);
    if (existing && !opts.renew) {
      // Hash-only storage: plaintext was returned on first create only.
      return {
        statusCode: 200,
        message: "Share link already active",
        data: {
          reused: true,
          url: null as string | null,
          expiresAt: existing.expiresAt,
          hasActiveLink: true,
        },
      };
    }

    if (existing && opts.renew) {
      existing.revoked = true;
      await existing.save();
    }

    const settings = await getSettings();
    const days =
      (settings.data as { invoice?: { shareLinkDays?: number } } | null)
        ?.invoice?.shareLinkDays ?? 30;
    const token = mintToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, Math.floor(days)));

    await InvoiceShareLink.create({
      invoice: invoiceId,
      tokenHash: hashToken(token),
      expiresAt,
      revoked: false,
    });

    return {
      statusCode: 200,
      message: "Share link created",
      data: {
        reused: false,
        url: buildPublicUrl(token),
        expiresAt,
        hasActiveLink: true,
      },
    };
  } catch (error) {
    return fail(
      500,
      ErrorMessages[ErrorCodes.INTERNAL],
      ErrorCodes.INTERNAL,
      error,
    );
  }
};

export const revokeShareLink = async (invoiceId: string) => {
  try {
    const invoice = await Invoice.findById(invoiceId).select("_id");
    if (!invoice) {
      return fail(404, ErrorMessages[ErrorCodes.NOT_FOUND], ErrorCodes.NOT_FOUND);
    }

    await InvoiceShareLink.updateMany(
      { invoice: invoiceId, revoked: false },
      { $set: { revoked: true } },
    );

    return {
      statusCode: 200,
      message: "Share link revoked",
      data: { revoked: true },
    };
  } catch (error) {
    return fail(
      500,
      ErrorMessages[ErrorCodes.INTERNAL],
      ErrorCodes.INTERNAL,
      error,
    );
  }
};

/**
 * Customer-safe public payload. Identical 404 for invalid / revoked / expired.
 */
export const getPublicInvoiceByToken = async (token: string) => {
  try {
    if (!token || token.length < 32) {
      return fail(404, ErrorMessages[ErrorCodes.NOT_FOUND], ErrorCodes.NOT_FOUND);
    }

    const link = await InvoiceShareLink.findOne({
      tokenHash: hashToken(token),
    });

    if (!link || link.revoked || link.expiresAt.getTime() <= Date.now()) {
      return fail(404, ErrorMessages[ErrorCodes.NOT_FOUND], ErrorCodes.NOT_FOUND);
    }

    const invoice = await Invoice.findById(link.invoice)
      .populate("customer", "name lastName phone")
      .populate("serviceItems.staff", "name")
      .populate("productItems.staff", "name");

    if (!invoice) {
      return fail(404, ErrorMessages[ErrorCodes.NOT_FOUND], ErrorCodes.NOT_FOUND);
    }

    const customer = invoice.customer as {
      name?: string;
      lastName?: string;
      phone?: number;
    } | null;

    const staffName = (staff: unknown): string => {
      if (staff && typeof staff === "object" && "name" in staff) {
        return String((staff as { name?: string }).name ?? "");
      }
      return "";
    };

    return {
      statusCode: 200,
      message: "OK",
      data: {
        invoiceNumber: invoice.invoiceNumber,
        createdAt: (invoice as { createdAt?: Date }).createdAt,
        customerName: invoice.walkIn
          ? invoice.walkInName || "Walk-in"
          : [customer?.name, customer?.lastName].filter(Boolean).join(" ") ||
            "Customer",
        customerPhone: invoice.walkIn
          ? invoice.walkInPhone
          : customer?.phone != null
            ? String(customer.phone)
            : undefined,
        serviceItems: invoice.serviceItems.map((line) => ({
          name: line.name,
          qty: line.qty,
          price: line.price,
          lineTotal: line.lineTotal,
          staffName: staffName(line.staff),
        })),
        productItems: invoice.productItems.map((line) => ({
          name: line.name,
          qty: line.qty,
          price: line.price,
          lineTotal: line.lineTotal,
          staffName: staffName(line.staff),
        })),
        serviceSubtotal: invoice.serviceSubtotal,
        productSubtotal: invoice.productSubtotal,
        serviceDiscountTotal: invoice.serviceDiscountTotal,
        productDiscountTotal: invoice.productDiscountTotal,
        tax: {
          gstEnabled: invoice.tax?.gstEnabled ?? false,
          servicesTaxable: invoice.tax?.servicesTaxable ?? 0,
          productsTaxable: invoice.tax?.productsTaxable ?? 0,
          cgstTotal: invoice.tax?.cgstTotal ?? 0,
          sgstTotal: invoice.tax?.sgstTotal ?? 0,
          taxTotal: invoice.tax?.taxTotal ?? 0,
        },
        loyaltyRedeemValue: invoice.loyaltyRedeemValue,
        roundOff: invoice.roundOff,
        tip: invoice.tip,
        amountPayable: invoice.amountPayable,
        grandTotal: invoice.grandTotal,
        paymentMode: invoice.paymentMode,
        templateId: invoice.templateId,
        templateSnapshot: invoice.templateSnapshot,
        businessSnapshot: {
          salonName: invoice.businessSnapshot?.salonName,
          gstin: invoice.businessSnapshot?.gstin,
          address: invoice.businessSnapshot?.address,
          phone: invoice.businessSnapshot?.phone,
          email: invoice.businessSnapshot?.email,
          invoiceFooterNote: invoice.businessSnapshot?.invoiceFooterNote,
          logoBase64: invoice.businessSnapshot?.logoBase64,
          logoMimeType: invoice.businessSnapshot?.logoMimeType,
        },
      },
    };
  } catch (error) {
    return fail(
      500,
      ErrorMessages[ErrorCodes.INTERNAL],
      ErrorCodes.INTERNAL,
      error,
    );
  }
};
