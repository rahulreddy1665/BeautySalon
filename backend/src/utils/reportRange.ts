/**
 * Report date bounds in salon timezone (Asia/Kolkata).
 * Never use server local timezone for day grouping.
 */

import { SALON_TIME_ZONE, getSalonNow } from "./salonTime";

const MAX_RANGE_DAYS = 366;

export { MAX_RANGE_DAYS };

/** Instant for YYYY-MM-DD 00:00:00.000 in salon TZ. */
export function salonDayStartUtc(dateKey: string): Date {
  // Asia/Kolkata is UTC+5:30 year-round
  return new Date(`${dateKey}T00:00:00.000+05:30`);
}

/** Instant for YYYY-MM-DD 23:59:59.999 in salon TZ. */
export function salonDayEndUtc(dateKey: string): Date {
  return new Date(`${dateKey}T23:59:59.999+05:30`);
}

export function isValidDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const a = salonDayStartUtc(from).getTime();
  const b = salonDayStartUtc(to).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

export type ParsedReportRange = {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  dayCount: number;
  previousFrom: string;
  previousTo: string;
  previousFromDate: Date;
  previousToDate: Date;
};

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = salonDayStartUtc(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  // Re-format in salon TZ
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Validate from/to (YYYY-MM-DD), max 366 days, start <= end.
 * Previous period = same length immediately before `from`.
 */
export function parseReportRange(
  fromRaw: unknown,
  toRaw: unknown,
):
  | { ok: true; range: ParsedReportRange }
  | { ok: false; message: string } {
  if (!isValidDateKey(fromRaw) || !isValidDateKey(toRaw)) {
    return { ok: false, message: "from and to must be YYYY-MM-DD" };
  }
  if (fromRaw > toRaw) {
    return { ok: false, message: "from must be on or before to" };
  }
  const dayCount = daysBetweenInclusive(fromRaw, toRaw);
  if (dayCount > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
    };
  }
  const previousTo = shiftDateKey(fromRaw, -1);
  const previousFrom = shiftDateKey(previousTo, -(dayCount - 1));
  return {
    ok: true,
    range: {
      from: fromRaw,
      to: toRaw,
      fromDate: salonDayStartUtc(fromRaw),
      toDate: salonDayEndUtc(toRaw),
      dayCount,
      previousFrom,
      previousTo,
      previousFromDate: salonDayStartUtc(previousFrom),
      previousToDate: salonDayEndUtc(previousTo),
    },
  };
}

/** Calendar month-to-date vs previous month same length (for hub key numbers). */
export function thisMonthToDateRange(now = new Date()): ParsedReportRange {
  const salon = getSalonNow(now);
  const [y, m] = salon.dateKey.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = salon.dateKey;
  const parsed = parseReportRange(from, to);
  if (!parsed.ok) {
    // fallback should never happen
    const dayCount = daysBetweenInclusive(from, to);
    return {
      from,
      to,
      fromDate: salonDayStartUtc(from),
      toDate: salonDayEndUtc(to),
      dayCount,
      previousFrom: from,
      previousTo: to,
      previousFromDate: salonDayStartUtc(from),
      previousToDate: salonDayEndUtc(to),
    };
  }
  return parsed.range;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous > 0) return round2(((current - previous) / previous) * 100);
  return null;
}

/** Invoice revenue: payable minus tip (tax treatment follows stored totals). */
export function invoiceRevenue(inv: {
  amountPayable?: number;
  grandTotal?: number;
  tip?: number;
}): number {
  const total = Number(inv.amountPayable ?? inv.grandTotal ?? 0);
  const tip = Number(inv.tip ?? 0);
  return round2(Math.max(0, total - tip));
}

export function salonDateKeyFromUtc(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
