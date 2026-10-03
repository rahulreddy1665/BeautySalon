import {
  DEFAULT_SETTINGS,
  Settings,
  type IAppointmentSettings,
  type IBusinessSettings,
  type IInvoiceSettings,
  type ILoyaltySettings,
  type ITaxSettings,
  type RoundingRule,
  type InvoiceAccentPreset,
  type InvoiceTemplateId,
  type Weekday,
} from "../models/settings.model";
import { InvoiceSequence } from "../models/invoice-sequence.model";
import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function parseHm(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clampRate(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0 || v > 50) return null;
  return round2(v);
}

function isUnsafeSvg(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("<script") ||
    lower.includes("javascript:") ||
    /on[a-z]+\s*=/.test(lower) ||
    lower.includes("<foreignobject") ||
    lower.includes("data:text/html")
  );
}

export async function getOrCreateSettings() {
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create(DEFAULT_SETTINGS);
  } else {
    // Fill new invoice presentation fields on older settings docs
    const inv = doc.invoice as IInvoiceSettings;
    let dirty = false;
    if (!inv.accentPreset) {
      inv.accentPreset = DEFAULT_SETTINGS.invoice.accentPreset;
      dirty = true;
    }
    if (!inv.accentColor) {
      inv.accentColor = DEFAULT_SETTINGS.invoice.accentColor;
      dirty = true;
    }
    if (inv.showStaffNames === undefined) {
      inv.showStaffNames = true;
      dirty = true;
    }
    if (inv.showLogo === undefined) {
      inv.showLogo = true;
      dirty = true;
    }
    if (inv.termsText === undefined) {
      inv.termsText = DEFAULT_SETTINGS.invoice.termsText;
      dirty = true;
    }
    if (inv.thankYouText === undefined) {
      inv.thankYouText = DEFAULT_SETTINGS.invoice.thankYouText;
      dirty = true;
    }
    if (inv.whatsappMessage === undefined) {
      inv.whatsappMessage = DEFAULT_SETTINGS.invoice.whatsappMessage;
      dirty = true;
    }
    if (!inv.shareLinkDays) {
      inv.shareLinkDays = 30;
      dirty = true;
    }
    if (inv.templateId === "classic") {
      inv.templateId = "creamGold";
      dirty = true;
    }
    if (dirty) {
      doc.markModified("invoice");
      await doc.save();
    }
  }
  return doc;
}

export function publicSettings(doc: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return {
    business: doc.business,
    tax: doc.tax,
    invoice: doc.invoice,
    appointments: doc.appointments,
    loyalty: doc.loyalty,
    updatedAt: doc.updatedAt,
  };
}

export const getSettings = async () => {
  try {
    const doc = await getOrCreateSettings();
    const seq = await InvoiceSequence.findOne({ key: "main" });
    const nextSeq = (seq?.seq ?? 0) + 1;
    const preview = formatInvoiceNumber(doc.invoice, nextSeq);
    return {
      statusCode: 200,
      data: {
        ...publicSettings(doc),
        invoicePreview: {
          nextNumber: nextSeq,
          preview,
        },
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export function formatInvoiceNumber(
  invoice: IInvoiceSettings,
  seq: number,
): string {
  const pad = Math.min(10, Math.max(1, Number(invoice.numberPadding) || 5));
  const padded = String(seq).padStart(pad, "0");
  const prefix = String(invoice.prefix || "INV").trim().toUpperCase();
  if (invoice.includeYear) {
    return `${prefix}-${new Date().getFullYear()}-${padded}`;
  }
  return `${prefix}-${padded}`;
}

export const updateBusinessSettings = async (
  data: Partial<IBusinessSettings>,
) => {
  try {
    const doc = await getOrCreateSettings();
    if (data.salonName !== undefined) {
      const name = String(data.salonName).trim();
      if (!name) {
        return { statusCode: 400, data: null, message: "Salon name is required" };
      }
      doc.business.salonName = name;
    }
    const stringFields = [
      "address",
      "city",
      "state",
      "pincode",
      "phone",
      "email",
      "invoiceFooterNote",
    ] as const;
    for (const key of stringFields) {
      if (data[key] !== undefined) {
        doc.business[key] = String(data[key] ?? "").trim();
      }
    }
    if (data.gstin !== undefined) {
      const gstin = String(data.gstin ?? "").trim().toUpperCase();
      if (gstin && !GSTIN_RE.test(gstin)) {
        return {
          statusCode: 400,
          data: null,
          message: "Invalid GSTIN format",
        };
      }
      doc.business.gstin = gstin;
    }
    if (data.email !== undefined && data.email) {
      const email = String(data.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail(400, ErrorMessages.INVALID_EMAIL);
      }
      doc.business.email = email;
    }
    if (data.openingTime !== undefined || data.closingTime !== undefined) {
      const open = data.openingTime ?? doc.business.openingTime ?? "09:00";
      const close = data.closingTime ?? doc.business.closingTime ?? "21:00";
      const openM = parseHm(open);
      const closeM = parseHm(close);
      if (openM == null || closeM == null) {
        return fail(400, "Opening/closing time must be HH:mm", ErrorCodes.VALIDATION_ERROR);
      }
      if (closeM <= openM) {
        return fail(400, ErrorMessages.END_AFTER_START);
      }
      doc.business.openingTime = open;
      doc.business.closingTime = close;
      // Keep legacy appointment hours in sync for older clients
      doc.appointments.startHour = Math.floor(openM / 60);
      doc.appointments.endHour = Math.ceil(closeM / 60);
    }
    if (data.workingDays !== undefined) {
      const days = (Array.isArray(data.workingDays) ? data.workingDays : [])
        .map((d) => String(d).toLowerCase() as Weekday)
        .filter((d) => WEEKDAYS.includes(d));
      if (days.length === 0) {
        return fail(400, "Select at least one working day");
      }
      doc.business.workingDays = days;
    }
    await doc.save();
    return { statusCode: 200, data: publicSettings(doc).business };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateTaxSettings = async (data: Partial<ITaxSettings>) => {
  try {
    const doc = await getOrCreateSettings();
    if (data.gstEnabled !== undefined) {
      doc.tax.gstEnabled = Boolean(data.gstEnabled);
    }
    if (data.pricesIncludeGst !== undefined) {
      doc.tax.pricesIncludeGst = Boolean(data.pricesIncludeGst);
    }
    for (const section of ["services", "products"] as const) {
      const rates = data[section];
      if (!rates) continue;
      if (rates.cgstPercent !== undefined) {
        const v = clampRate(rates.cgstPercent);
        if (v === null) {
          return {
            statusCode: 400,
            data: null,
            message: `${section} CGST must be 0–50`,
          };
        }
        doc.tax[section].cgstPercent = v;
      }
      if (rates.sgstPercent !== undefined) {
        const v = clampRate(rates.sgstPercent);
        if (v === null) {
          return {
            statusCode: 400,
            data: null,
            message: `${section} SGST must be 0–50`,
          };
        }
        doc.tax[section].sgstPercent = v;
      }
    }
    await doc.save();
    return { statusCode: 200, data: publicSettings(doc).tax };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateInvoiceSettings = async (
  data: Partial<IInvoiceSettings> & { nextNumber?: number },
) => {
  try {
    const doc = await getOrCreateSettings();
    if (data.prefix !== undefined) {
      const prefix = String(data.prefix).trim().toUpperCase();
      if (!/^[A-Z0-9-]{1,10}$/.test(prefix)) {
        return {
          statusCode: 400,
          data: null,
          message: "Prefix: letters, numbers, hyphen; max 10 chars",
        };
      }
      doc.invoice.prefix = prefix;
    }
    if (data.includeYear !== undefined) {
      doc.invoice.includeYear = Boolean(data.includeYear);
    }
    if (data.numberPadding !== undefined) {
      const pad = Math.floor(Number(data.numberPadding));
      if (!Number.isFinite(pad) || pad < 1 || pad > 10) {
        return {
          statusCode: 400,
          data: null,
          message: "Number padding must be 1–10",
        };
      }
      doc.invoice.numberPadding = pad;
    }
    if (data.rounding !== undefined) {
      const allowed: RoundingRule[] = ["none", "nearest", "up", "down"];
      if (!allowed.includes(data.rounding)) {
        return { statusCode: 400, data: null, message: "Invalid rounding rule" };
      }
      doc.invoice.rounding = data.rounding;
    }
    if (data.templateId !== undefined) {
      const allowed: InvoiceTemplateId[] = [
        "creamGold",
        "blush",
        "compact",
        "thermal",
        "classic",
      ];
      if (!allowed.includes(data.templateId)) {
        return { statusCode: 400, data: null, message: "Invalid template" };
      }
      doc.invoice.templateId =
        data.templateId === "classic" ? "creamGold" : data.templateId;
    }
    if (data.accentPreset !== undefined) {
      const allowed: InvoiceAccentPreset[] = [
        "gold",
        "blush",
        "teal",
        "charcoal",
        "sage",
        "plum",
        "custom",
      ];
      if (!allowed.includes(data.accentPreset)) {
        return { statusCode: 400, data: null, message: "Invalid accent preset" };
      }
      doc.invoice.accentPreset = data.accentPreset;
    }
    if (data.accentColor !== undefined) {
      const hex = String(data.accentColor).trim().toUpperCase();
      if (!/^#[0-9A-F]{6}$/.test(hex)) {
        return {
          statusCode: 400,
          data: null,
          message: "Accent color must be a #RRGGBB hex value",
        };
      }
      doc.invoice.accentColor = hex;
    }
    if (data.showStaffNames !== undefined) {
      doc.invoice.showStaffNames = Boolean(data.showStaffNames);
    }
    if (data.showLogo !== undefined) {
      doc.invoice.showLogo = Boolean(data.showLogo);
    }
    if (data.termsText !== undefined) {
      const t = String(data.termsText).trim();
      if (t.length > 500) {
        return {
          statusCode: 400,
          data: null,
          message: "Terms text max 500 characters",
        };
      }
      doc.invoice.termsText = t;
    }
    if (data.thankYouText !== undefined) {
      const t = String(data.thankYouText).trim();
      if (t.length > 200) {
        return {
          statusCode: 400,
          data: null,
          message: "Thank-you text max 200 characters",
        };
      }
      doc.invoice.thankYouText = t;
    }
    if (data.whatsappMessage !== undefined) {
      const t = String(data.whatsappMessage).trim();
      if (t.length > 500) {
        return {
          statusCode: 400,
          data: null,
          message: "WhatsApp message max 500 characters",
        };
      }
      doc.invoice.whatsappMessage = t;
    }
    if (data.shareLinkDays !== undefined) {
      const d = Math.floor(Number(data.shareLinkDays));
      if (!Number.isFinite(d) || d < 1 || d > 365) {
        return {
          statusCode: 400,
          data: null,
          message: "Share link days must be 1–365",
        };
      }
      doc.invoice.shareLinkDays = d;
    }

    if (data.nextNumber !== undefined) {
      const next = Math.floor(Number(data.nextNumber));
      if (!Number.isFinite(next) || next < 1) {
        return {
          statusCode: 400,
          data: null,
          message: "Next number must be a positive integer",
        };
      }
      const seqDoc = await InvoiceSequence.findOneAndUpdate(
        { key: "main" },
        { $setOnInsert: { seq: 0 } },
        { upsert: true, new: true },
      );
      if (next <= seqDoc.seq) {
        return {
          statusCode: 400,
          data: null,
          message: `Next number must be greater than ${seqDoc.seq} (highest used)`,
        };
      }
      // Store so the next $inc yields `next`
      seqDoc.seq = next - 1;
      await seqDoc.save();
    }

    await doc.save();
    const seq = await InvoiceSequence.findOne({ key: "main" });
    const nextSeq = (seq?.seq ?? 0) + 1;
    return {
      statusCode: 200,
      data: {
        ...publicSettings(doc).invoice,
        preview: formatInvoiceNumber(doc.invoice, nextSeq),
        nextNumber: nextSeq,
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateAppointmentSettings = async (
  data: Partial<IAppointmentSettings>,
) => {
  try {
    const doc = await getOrCreateSettings();
    if (data.startHour !== undefined) {
      const h = Math.floor(Number(data.startHour));
      if (!Number.isFinite(h) || h < 0 || h > 23) {
        return { statusCode: 400, data: null, message: "startHour must be 0–23" };
      }
      doc.appointments.startHour = h;
    }
    if (data.endHour !== undefined) {
      const h = Math.floor(Number(data.endHour));
      if (!Number.isFinite(h) || h < 1 || h > 24) {
        return { statusCode: 400, data: null, message: "endHour must be 1–24" };
      }
      doc.appointments.endHour = h;
    }
    if (data.slotMinutes !== undefined) {
      const m = Math.floor(Number(data.slotMinutes));
      if (![5, 10, 15, 20, 30, 45, 60].includes(m)) {
        return {
          statusCode: 400,
          data: null,
          message: "slotMinutes must be 5, 10, 15, 20, 30, 45, or 60",
        };
      }
      doc.appointments.slotMinutes = m;
    }
    if (doc.appointments.endHour <= doc.appointments.startHour) {
      return {
        statusCode: 400,
        data: null,
        message: "endHour must be after startHour",
      };
    }
    await doc.save();
    return { statusCode: 200, data: publicSettings(doc).appointments };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateLoyaltySettings = async (
  data: Partial<ILoyaltySettings>,
) => {
  try {
    const doc = await getOrCreateSettings();
    if (data.enabled !== undefined) doc.loyalty.enabled = Boolean(data.enabled);
    if (data.earnPointsPer100Inr !== undefined) {
      const v = Math.floor(Number(data.earnPointsPer100Inr));
      if (!Number.isFinite(v) || v < 0 || v > 1000) {
        return { statusCode: 400, data: null, message: "Invalid earn rate" };
      }
      doc.loyalty.earnPointsPer100Inr = v;
    }
    if (data.redeemValuePerPoint !== undefined) {
      const v = Number(data.redeemValuePerPoint);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return { statusCode: 400, data: null, message: "Invalid redeem value" };
      }
      doc.loyalty.redeemValuePerPoint = round2(v);
    }
    if (data.minRedeemPoints !== undefined) {
      const v = Math.floor(Number(data.minRedeemPoints));
      if (!Number.isFinite(v) || v < 0) {
        return { statusCode: 400, data: null, message: "Invalid min redeem" };
      }
      doc.loyalty.minRedeemPoints = v;
    }
    if (data.maxRedeemPercent !== undefined) {
      const v = Number(data.maxRedeemPercent);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return {
          statusCode: 400,
          data: null,
          message: "maxRedeemPercent must be 0–100",
        };
      }
      doc.loyalty.maxRedeemPercent = round2(v);
    }
    if (data.pointsExpiryDays !== undefined) {
      const v = Math.floor(Number(data.pointsExpiryDays));
      if (!Number.isFinite(v) || v < 0 || v > 3650) {
        return { statusCode: 400, data: null, message: "Invalid expiry days" };
      }
      doc.loyalty.pointsExpiryDays = v;
    }
    await doc.save();
    return { statusCode: 200, data: publicSettings(doc).loyalty };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const uploadLogo = async (file?: {
  buffer: Buffer;
  mimetype: string;
  size: number;
}) => {
  try {
    if (!file) {
      return { statusCode: 400, data: null, message: "Logo file is required" };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { statusCode: 400, data: null, message: "Logo must be 2 MB or less" };
    }
    const mime = file.mimetype === "image/jpg" ? "image/jpeg" : file.mimetype;
    if (!ALLOWED_LOGO_MIME.has(mime)) {
      return {
        statusCode: 400,
        data: null,
        message: "Logo must be PNG, JPG, SVG, or WebP",
      };
    }
    if (mime === "image/svg+xml") {
      const text = file.buffer.toString("utf8");
      if (isUnsafeSvg(text)) {
        return {
          statusCode: 400,
          data: null,
          message: "SVG contains unsafe content",
        };
      }
    }
    const doc = await getOrCreateSettings();
    doc.business.logoBase64 = file.buffer.toString("base64");
    doc.business.logoMimeType = mime;
    await doc.save();
    return {
      statusCode: 200,
      data: {
        logoBase64: doc.business.logoBase64,
        logoMimeType: doc.business.logoMimeType,
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const removeLogo = async () => {
  try {
    const doc = await getOrCreateSettings();
    doc.business.logoBase64 = null;
    doc.business.logoMimeType = null;
    await doc.save();
    return { statusCode: 200, data: { logoBase64: null, logoMimeType: null } };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export function applyRounding(
  amount: number,
  rule: RoundingRule,
): { rounded: number; roundOff: number } {
  const base = round2(amount);
  if (rule === "none") return { rounded: base, roundOff: 0 };
  if (rule === "nearest") {
    const rounded = Math.round(base);
    return { rounded, roundOff: round2(rounded - base) };
  }
  if (rule === "up") {
    const rounded = Math.ceil(base);
    return { rounded, roundOff: round2(rounded - base) };
  }
  const rounded = Math.floor(base);
  return { rounded, roundOff: round2(rounded - base) };
}

export function computeSectionTax(opts: {
  netAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  inclusive: boolean;
  enabled: boolean;
}): {
  taxable: number;
  cgstAmount: number;
  sgstAmount: number;
  taxTotal: number;
  gross: number;
} {
  if (!opts.enabled || opts.netAmount <= 0) {
    return {
      taxable: round2(opts.netAmount),
      cgstAmount: 0,
      sgstAmount: 0,
      taxTotal: 0,
      gross: round2(opts.netAmount),
    };
  }
  const cgst = opts.cgstPercent;
  const sgst = opts.sgstPercent;
  const combined = cgst + sgst;
  if (opts.inclusive) {
    const taxable =
      combined > 0 ? round2(opts.netAmount / (1 + combined / 100)) : round2(opts.netAmount);
    const cgstAmount = round2((taxable * cgst) / 100);
    const sgstAmount = round2((taxable * sgst) / 100);
    return {
      taxable,
      cgstAmount,
      sgstAmount,
      taxTotal: round2(cgstAmount + sgstAmount),
      gross: round2(opts.netAmount),
    };
  }
  const taxable = round2(opts.netAmount);
  const cgstAmount = round2((taxable * cgst) / 100);
  const sgstAmount = round2((taxable * sgst) / 100);
  return {
    taxable,
    cgstAmount,
    sgstAmount,
    taxTotal: round2(cgstAmount + sgstAmount),
    gross: round2(taxable + cgstAmount + sgstAmount),
  };
}
