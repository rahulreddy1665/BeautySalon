/**
 * Reports service — invoice/appointment analytics.
 *
 * Indexes: Invoice.createdAt (range filters), Invoice.customer+createdAt
 * (customer history), Appointment.date+status and services.staff+date+startTime.
 *
 * Data volume: invoices snapshot the salon logo (~300 KB each). Every list read
 * here uses INVOICE_LIST_PROJECTION (or a narrower field list) so reports move
 * kilobytes, not hundreds of MB. Money totals are still summed in JS with the
 * same round2 semantics as billing, so report figures match invoices exactly.
 */

import mongoose from "mongoose";

import { Appointment } from "../models/appointment.model";
import { Customer } from "../models/customer.model";
import {
  Invoice,
  INVOICE_LIST_PROJECTION,
  INVOICE_TOTALS_PROJECTION,
} from "../models/invoice.model";
import { LoyaltyBalance } from "../models/loyalty.model";
import { Product } from "../models/product.model";
import { Service } from "../models/service.model";
import { Staff } from "../models/staff.model";
import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import {
  invoiceRevenue,
  parseReportRange,
  pctChange,
  round2,
  salonDateKeyFromUtc,
  salonDayStartUtc,
  thisMonthToDateRange,
  type ParsedReportRange,
} from "../utils/reportRange";
import { getOrCreateSettings } from "./settings.service";

type LeanInvoice = {
  _id: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  customer?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name?: string; lastName?: string; phone?: number } | null;
  walkIn?: boolean;
  walkInName?: string;
  source?: string;
  appointment?: mongoose.Types.ObjectId | null;
  serviceItems?: Array<{
    service: mongoose.Types.ObjectId;
    name: string;
    price: number;
    qty: number;
    staff: mongoose.Types.ObjectId;
    lineTotal: number;
  }>;
  productItems?: Array<{
    product: mongoose.Types.ObjectId;
    name: string;
    price: number;
    qty: number;
    staff: mongoose.Types.ObjectId;
    lineTotal: number;
  }>;
  comboItems?: Array<{
    combo: mongoose.Types.ObjectId;
    name: string;
    price: number;
    qty: number;
    lineTotal: number;
    listTotal?: number;
    components?: Array<{
      service: mongoose.Types.ObjectId;
      name: string;
      listPrice: number;
      allocatedAmount: number;
      staff: mongoose.Types.ObjectId;
    }>;
  }>;
  serviceSubtotal?: number;
  productSubtotal?: number;
  serviceDiscountTotal?: number;
  productDiscountTotal?: number;
  tip?: number;
  amountPayable?: number;
  grandTotal?: number;
  paymentMode?: string;
  status?: string;
  createdAt?: Date;
};

type ReportOpts = { canViewRevenue: boolean };

const APPT_STATUSES = new Set(["booked", "completed", "cancelled", "no_show"]);

function addDateKey(dateKey: string, deltaDays: number): string {
  const d = salonDayStartUtc(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return salonDateKeyFromUtc(d);
}

function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = [];
  let cur = from;
  while (cur <= to) {
    keys.push(cur);
    cur = addDateKey(cur, 1);
  }
  return keys;
}

function salonDow(dateKey: string): number {
  // 0=Sunday … 6=Saturday (matches JS Date.getDay)
  const d = new Date(`${dateKey}T12:00:00.000+05:30`);
  return d.getUTCDay();
}

function mondayKey(dateKey: string): string {
  const dow = salonDow(dateKey);
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDateKey(dateKey, delta);
}

function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function chartGranularity(dayCount: number): "day" | "week" | "month" {
  if (dayCount <= 62) return "day";
  if (dayCount <= 180) return "week";
  return "month";
}

function bucketKey(dateKey: string, g: "day" | "week" | "month"): string {
  if (g === "day") return dateKey;
  if (g === "week") return mondayKey(dateKey);
  return monthKey(dateKey);
}

function allBucketKeys(
  from: string,
  to: string,
  g: "day" | "week" | "month",
): string[] {
  if (g === "day") return eachDateKey(from, to);
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const d of eachDateKey(from, to)) {
    const k = bucketKey(d, g);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys;
}

function parsePageLimit(pageRaw: unknown, limitRaw: unknown) {
  let page = Math.floor(Number(pageRaw));
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = Math.floor(Number(limitRaw));
  if (!Number.isFinite(limit) || limit < 1) limit = 25;
  if (limit > 100) limit = 100;
  return { page, limit, skip: (page - 1) * limit };
}

function parseSortOrder(
  sortRaw: unknown,
  orderRaw: unknown,
  allowed: string[],
  defaultSort: string,
): { sort: string; order: 1 | -1 } {
  const sort =
    typeof sortRaw === "string" && allowed.includes(sortRaw)
      ? sortRaw
      : defaultSort;
  const order: 1 | -1 =
    typeof orderRaw === "string" && orderRaw.toLowerCase() === "asc" ? 1 : -1;
  return { sort, order };
}

function requireRange(fromRaw: unknown, toRaw: unknown) {
  return parseReportRange(fromRaw, toRaw);
}

async function loadInvoices(fromDate: Date, toDate: Date): Promise<LeanInvoice[]> {
  return Invoice.find({
    createdAt: { $gte: fromDate, $lte: toDate },
  })
    .select(INVOICE_LIST_PROJECTION)
    .lean() as Promise<LeanInvoice[]>;
}

/** Revenue / tip / count only, for "previous period" comparisons. */
async function loadInvoiceTotals(fromDate: Date, toDate: Date): Promise<LeanInvoice[]> {
  return Invoice.find({
    createdAt: { $gte: fromDate, $lte: toDate },
  })
    .select(INVOICE_TOTALS_PROJECTION)
    .lean() as Promise<LeanInvoice[]>;
}

function serviceNet(inv: LeanInvoice): number {
  return round2(
    Number(inv.serviceSubtotal ?? 0) - Number(inv.serviceDiscountTotal ?? 0),
  );
}

function productNet(inv: LeanInvoice): number {
  return round2(
    Number(inv.productSubtotal ?? 0) - Number(inv.productDiscountTotal ?? 0),
  );
}

/**
 * Allocate section discount proportionally across lines:
 * attributed = lineTotal * (sectionNet / sumLines) when sumLines > 0.
 * Combo components participate via allocatedAmount (already after line discount).
 */
function attributedServiceLines(inv: LeanInvoice) {
  const lines = [
    ...(inv.serviceItems ?? []).map((l) => ({
      service: l.service,
      name: l.name,
      price: l.price,
      qty: l.qty,
      staff: l.staff,
      lineTotal: Number(l.lineTotal ?? 0),
    })),
    ...(inv.comboItems ?? []).flatMap((combo) =>
      (combo.components ?? []).map((c) => ({
        service: c.service,
        name: c.name,
        price: c.listPrice,
        qty: 1,
        staff: c.staff,
        lineTotal: Number(c.allocatedAmount ?? 0),
      })),
    ),
  ];
  const sumLines = round2(lines.reduce((s, l) => s + Number(l.lineTotal ?? 0), 0));
  const net = serviceNet(inv);
  const factor = sumLines > 0 ? net / sumLines : 0;
  return lines.map((l) => ({
    ...l,
    attributed: round2(Number(l.lineTotal ?? 0) * factor),
  }));
}

function combosSoldCount(inv: LeanInvoice): number {
  return (inv.comboItems ?? []).reduce((s, l) => s + Number(l.qty ?? 1), 0);
}

function attributedProductLines(inv: LeanInvoice) {
  const lines = inv.productItems ?? [];
  const sumLines = round2(lines.reduce((s, l) => s + Number(l.lineTotal ?? 0), 0));
  const net = productNet(inv);
  const factor = sumLines > 0 ? net / sumLines : 0;
  return lines.map((l) => ({
    ...l,
    attributed: round2(Number(l.lineTotal ?? 0) * factor),
  }));
}

function customerDisplayName(
  cust:
    | { name?: string; lastName?: string }
    | null
    | undefined,
  walkInName?: string,
): string {
  if (cust) {
    const n = [cust.name, cust.lastName].filter(Boolean).join(" ");
    if (n) return n;
  }
  return walkInName || "Walk-in";
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const slice = items.slice((page - 1) * limit, (page - 1) * limit + limit);
  return { items: slice, total, page, limit };
}

function sortByKey<T extends Record<string, unknown>>(
  items: T[],
  sort: string,
  order: 1 | -1,
): T[] {
  const dir = order;
  return [...items].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dir;
    }
    return (Number(av) - Number(bv)) * dir;
  });
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildHourSlots(openHm: string, closeHm: string, slotMinutes: number): string[] {
  const open = hmToMinutes(openHm || "09:00");
  const close = hmToMinutes(closeHm || "21:00");
  const step = Math.max(5, slotMinutes || 60);
  // Busy grid uses hourly buckets for readability
  const hourStep = 60;
  const hours: string[] = [];
  for (let t = open; t < close; t += hourStep) {
    hours.push(minutesToHm(t));
  }
  if (hours.length === 0) {
    // fallback
    for (let t = 9 * 60; t < 21 * 60; t += 60) hours.push(minutesToHm(t));
  }
  void step;
  return hours;
}

// ─── Overview ───────────────────────────────────────────────────────────────

export const getReportsOverview = async (opts: ReportOpts) => {
  try {
    const range = thisMonthToDateRange();
    const [currInvoices, prevInvoices, currAppts, prevAppts, newCurr, newPrev] =
      await Promise.all([
        loadInvoiceTotals(range.fromDate, range.toDate),
        loadInvoiceTotals(range.previousFromDate, range.previousToDate),
        Appointment.find({
          date: { $gte: range.from, $lte: range.to },
        })
          .select("status")
          .lean(),
        Appointment.find({
          date: { $gte: range.previousFrom, $lte: range.previousTo },
        })
          .select("status")
          .lean(),
        Customer.countDocuments({
          createdAt: { $gte: range.fromDate, $lte: range.toDate },
        }),
        Customer.countDocuments({
          createdAt: {
            $gte: range.previousFromDate,
            $lte: range.previousToDate,
          },
        }),
      ]);

    const revenue = round2(
      currInvoices.reduce((s, inv) => s + invoiceRevenue(inv), 0),
    );
    const prevRevenue = round2(
      prevInvoices.reduce((s, inv) => s + invoiceRevenue(inv), 0),
    );
    const billCount = currInvoices.length;
    const prevBillCount = prevInvoices.length;
    const averageBill = billCount > 0 ? round2(revenue / billCount) : 0;
    const prevAverageBill =
      prevBillCount > 0 ? round2(prevRevenue / prevBillCount) : 0;

    const noShows = currAppts.filter((a) => a.status === "no_show").length;
    const prevNoShows = prevAppts.filter((a) => a.status === "no_show").length;
    const noShowRate =
      currAppts.length > 0
        ? round2((noShows / currAppts.length) * 100)
        : 0;
    const prevNoShowRate =
      prevAppts.length > 0
        ? round2((prevNoShows / prevAppts.length) * 100)
        : 0;

    const data = {
      range: { from: range.from, to: range.to },
      revenue: opts.canViewRevenue ? revenue : null,
      revenueChange: opts.canViewRevenue
        ? pctChange(revenue, prevRevenue)
        : null,
      averageBill: opts.canViewRevenue ? averageBill : null,
      averageBillChange: opts.canViewRevenue
        ? pctChange(averageBill, prevAverageBill)
        : null,
      newCustomers: newCurr,
      newCustomersChange: pctChange(newCurr, newPrev),
      noShowRate,
      noShowRateChange: pctChange(noShowRate, prevNoShowRate),
    };

    return { statusCode: 200, message: "Reports overview", data };
  } catch (error) {
    return fail(
      500,
      ErrorMessages[ErrorCodes.INTERNAL],
      ErrorCodes.INTERNAL,
      error,
    );
  }
};

// ─── Sales ──────────────────────────────────────────────────────────────────

function salesKpis(invoices: LeanInvoice[], prev: LeanInvoice[]) {
  const revenue = round2(invoices.reduce((s, i) => s + invoiceRevenue(i), 0));
  const prevRevenue = round2(prev.reduce((s, i) => s + invoiceRevenue(i), 0));
  const billCount = invoices.length;
  const prevBillCount = prev.length;
  const averageBill = billCount > 0 ? round2(revenue / billCount) : 0;
  const prevAverageBill =
    prevBillCount > 0 ? round2(prevRevenue / prevBillCount) : 0;
  const tips = round2(invoices.reduce((s, i) => s + Number(i.tip ?? 0), 0));
  const prevTips = round2(prev.reduce((s, i) => s + Number(i.tip ?? 0), 0));
  return {
    revenue,
    revenueChange: pctChange(revenue, prevRevenue),
    billCount,
    billCountChange: pctChange(billCount, prevBillCount),
    averageBill,
    averageBillChange: pctChange(averageBill, prevAverageBill),
    tips,
    tipsChange: pctChange(tips, prevTips),
  };
}

function buildSalesChart(
  invoices: LeanInvoice[],
  range: ParsedReportRange,
) {
  const g = chartGranularity(range.dayCount);
  const keys = allBucketKeys(range.from, range.to, g);
  const map = new Map(
    keys.map((k) => [k, { key: k, services: 0, products: 0, total: 0 }]),
  );
  for (const inv of invoices) {
    const created = inv.createdAt ? new Date(inv.createdAt) : null;
    if (!created) continue;
    const dk = salonDateKeyFromUtc(created);
    const k = bucketKey(dk, g);
    const row = map.get(k);
    if (!row) continue;
    const svc = serviceNet(inv);
    const prod = productNet(inv);
    row.services = round2(row.services + svc);
    row.products = round2(row.products + prod);
    row.total = round2(row.total + invoiceRevenue(inv));
  }
  return {
    granularity: g,
    series: keys.map((k) => map.get(k)!),
  };
}

function salesTableRows(invoices: LeanInvoice[]) {
  return invoices.map((inv) => {
    const cust =
      inv.customer && typeof inv.customer === "object" && "name" in inv.customer
        ? (inv.customer as { name?: string; lastName?: string })
        : null;
    const created = inv.createdAt ? new Date(inv.createdAt) : null;
    const serviceQty = (inv.serviceItems ?? []).reduce(
      (s, l) => s + Number(l.qty ?? 1),
      0,
    );
    const comboComponentQty = (inv.comboItems ?? []).reduce(
      (s, combo) => s + (combo.components?.length ?? 0) * Number(combo.qty ?? 1),
      0,
    );
    const productQty = (inv.productItems ?? []).reduce(
      (s, l) => s + Number(l.qty ?? 1),
      0,
    );
    return {
      id: String(inv._id),
      invoiceNumber: inv.invoiceNumber ?? "",
      date: created ? salonDateKeyFromUtc(created) : "",
      createdAt: created ? created.toISOString() : "",
      customerName: customerDisplayName(cust, inv.walkInName),
      walkIn: Boolean(inv.walkIn),
      itemsCount: serviceQty + comboComponentQty + productQty,
      revenue: invoiceRevenue(inv),
      tip: round2(Number(inv.tip ?? 0)),
      amountPayable: round2(Number(inv.amountPayable ?? inv.grandTotal ?? 0)),
      paymentMode: inv.paymentMode ?? "",
      status: inv.status ?? "",
      serviceAmount: serviceNet(inv),
      productAmount: productNet(inv),
    };
  });
}

function filterSalesByQ(
  rows: ReturnType<typeof salesTableRows>,
  q: string | undefined,
) {
  if (!q || !q.trim()) return rows;
  const needle = q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      r.invoiceNumber.toLowerCase().includes(needle) ||
      r.customerName.toLowerCase().includes(needle) ||
      r.paymentMode.toLowerCase().includes(needle),
  );
}

export const getReportsSales = async (
  query: {
    from?: unknown;
    to?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
    q?: unknown;
    chartSeries?: unknown;
    allBills?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      [
        "date",
        "createdAt",
        "invoiceNumber",
        "customerName",
        "itemsCount",
        "revenue",
        "tip",
        "amountPayable",
        "paymentMode",
        "status",
        "serviceAmount",
        "productAmount",
      ],
      "date",
    );
    const q = typeof query.q === "string" ? query.q : undefined;
    const chartSeries =
      typeof query.chartSeries === "string" &&
      ["total", "services", "products"].includes(query.chartSeries)
        ? query.chartSeries
        : "total";

    const [curr, prev] = await Promise.all([
      Invoice.find({
        createdAt: { $gte: range.fromDate, $lte: range.toDate },
      })
        .select(INVOICE_LIST_PROJECTION)
        .populate("customer", "name lastName phone")
        .lean() as Promise<LeanInvoice[]>,
      // Previous period only feeds the KPI deltas (revenue, tips, bill count).
      loadInvoiceTotals(range.previousFromDate, range.previousToDate),
    ]);

    const kpisRaw = salesKpis(curr, prev);
    const chart = buildSalesChart(curr, range);

    const svcAmt = round2(curr.reduce((s, i) => s + serviceNet(i), 0));
    const prodAmt = round2(curr.reduce((s, i) => s + productNet(i), 0));
    const splitBase = svcAmt + prodAmt;
    const paymentMap = new Map<string, number>();
    for (const inv of curr) {
      const mode = inv.paymentMode || "unknown";
      paymentMap.set(
        mode,
        round2((paymentMap.get(mode) ?? 0) + invoiceRevenue(inv)),
      );
    }
    const payTotal = round2(
      [...paymentMap.values()].reduce((s, v) => s + v, 0),
    );
    const paymentModes = [...paymentMap.entries()]
      .map(([mode, amount]) => ({
        mode,
        amount,
        pct: payTotal > 0 ? round2((amount / payTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    let rows = filterSalesByQ(salesTableRows(curr), q);
    rows = sortByKey(rows as unknown as Record<string, unknown>[], sort, order) as typeof rows;
    const allBills =
      query.allBills === true ||
      query.allBills === "true" ||
      query.allBills === "1";
    const table = allBills
      ? {
          items: rows,
          total: rows.length,
          page: 1,
          limit: rows.length || 1,
        }
      : paginate(rows, page, limit);

    const kpis = opts.canViewRevenue
      ? kpisRaw
      : {
          revenue: null,
          revenueChange: null,
          billCount: kpisRaw.billCount,
          billCountChange: kpisRaw.billCountChange,
          averageBill: null,
          averageBillChange: null,
          tips: null,
          tipsChange: null,
        };

    const chartOut = {
      granularity: chart.granularity,
      chartSeries,
      series: chart.series.map((p) =>
        opts.canViewRevenue
          ? p
          : { key: p.key, services: null, products: null, total: null },
      ),
    };

    const splits = opts.canViewRevenue
      ? {
          serviceAmount: svcAmt,
          servicePct: splitBase > 0 ? round2((svcAmt / splitBase) * 100) : 0,
          productAmount: prodAmt,
          productPct: splitBase > 0 ? round2((prodAmt / splitBase) * 100) : 0,
          paymentModes,
        }
      : {
          serviceAmount: null,
          servicePct: null,
          productAmount: null,
          productPct: null,
          paymentModes: paymentModes.map((p) => ({
            mode: p.mode,
            amount: null,
            pct: null,
          })),
        };

    const tableItems = table.items.map((r) =>
      opts.canViewRevenue
        ? r
        : {
            ...r,
            revenue: null,
            tip: null,
            amountPayable: null,
            serviceAmount: null,
            productAmount: null,
          },
    );

    return {
      statusCode: 200,
      message: "Sales report",
      data: {
        range: { from: range.from, to: range.to },
        previousRange: {
          from: range.previousFrom,
          to: range.previousTo,
        },
        kpis,
        chart: chartOut,
        splits,
        table: { ...table, items: tableItems },
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

export const exportReportsSales = async (
  query: { from?: unknown; to?: unknown; q?: unknown },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const q = typeof query.q === "string" ? query.q : undefined;
    const curr = (await Invoice.find({
      createdAt: { $gte: range.fromDate, $lte: range.toDate },
    })
      .select(INVOICE_LIST_PROJECTION)
      .populate("customer", "name lastName phone")
      .lean()) as LeanInvoice[];

    const rows = filterSalesByQ(salesTableRows(curr), q);
    const headers = [
      "Invoice",
      "Date",
      "Customer",
      "Items",
      "Walk-in",
      "Revenue",
      "Tip",
      "Payable",
      "Payment",
      "Status",
      "Services",
      "Products",
    ];
    const dataRows = rows.map((r) => [
      r.invoiceNumber,
      r.date,
      r.customerName,
      r.itemsCount,
      r.walkIn ? "yes" : "no",
      opts.canViewRevenue ? r.revenue : "",
      opts.canViewRevenue ? r.tip : "",
      opts.canViewRevenue ? r.amountPayable : "",
      r.paymentMode,
      r.status,
      opts.canViewRevenue ? r.serviceAmount : "",
      opts.canViewRevenue ? r.productAmount : "",
    ]);

    return {
      statusCode: 200,
      message: "Sales export",
      data: {
        filename: `sales_${range.from}_${range.to}.csv`,
        headers,
        rows: dataRows,
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

// ─── Staff ──────────────────────────────────────────────────────────────────

type StaffAgg = {
  staffId: string;
  staffName: string;
  servicesDone: number;
  serviceSales: number;
  productSales: number;
  totalSales: number;
  averageTicket: number;
  tipsReceived: null;
  rank: number;
  salesChange: number | null;
};

function aggregateStaff(invoices: LeanInvoice[]): Map<string, {
  servicesDone: number;
  serviceSales: number;
  productSales: number;
  invoiceIds: Set<string>;
}> {
  const map = new Map<
    string,
    {
      servicesDone: number;
      serviceSales: number;
      productSales: number;
      invoiceIds: Set<string>;
    }
  >();
  const bump = (staffId: string) => {
    let row = map.get(staffId);
    if (!row) {
      row = {
        servicesDone: 0,
        serviceSales: 0,
        productSales: 0,
        invoiceIds: new Set(),
      };
      map.set(staffId, row);
    }
    return row;
  };
  for (const inv of invoices) {
    const invId = String(inv._id);
    for (const line of attributedServiceLines(inv)) {
      const row = bump(String(line.staff));
      row.servicesDone += Number(line.qty ?? 1);
      row.serviceSales = round2(row.serviceSales + line.attributed);
      row.invoiceIds.add(invId);
    }
    for (const line of attributedProductLines(inv)) {
      const row = bump(String(line.staff));
      row.productSales = round2(row.productSales + line.attributed);
      row.invoiceIds.add(invId);
    }
  }
  return map;
}

async function staffRowsFromInvoices(
  curr: LeanInvoice[],
  prev: LeanInvoice[],
): Promise<StaffAgg[]> {
  const currMap = aggregateStaff(curr);
  const prevMap = aggregateStaff(prev);
  const staffIds = [...new Set([...currMap.keys(), ...prevMap.keys()])];
  const staffDocs = await Staff.find({ _id: { $in: staffIds } })
    .select("name")
    .lean();
  const nameById = new Map(staffDocs.map((s) => [String(s._id), s.name]));

  const rows: StaffAgg[] = staffIds.map((id) => {
    const c = currMap.get(id) ?? {
      servicesDone: 0,
      serviceSales: 0,
      productSales: 0,
      invoiceIds: new Set<string>(),
    };
    const p = prevMap.get(id);
    const totalSales = round2(c.serviceSales + c.productSales);
    const prevTotal = p ? round2(p.serviceSales + p.productSales) : 0;
    const billN = c.invoiceIds.size;
    return {
      staffId: id,
      staffName: nameById.get(id) ?? "Unknown",
      servicesDone: c.servicesDone,
      serviceSales: c.serviceSales,
      productSales: c.productSales,
      totalSales,
      averageTicket: billN > 0 ? round2(totalSales / billN) : 0,
      tipsReceived: null,
      rank: 0,
      salesChange: pctChange(totalSales, prevTotal),
    };
  });

  rows.sort((a, b) => b.totalSales - a.totalSales);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

export const getReportsStaff = async (
  query: {
    from?: unknown;
    to?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      [
        "staffName",
        "servicesDone",
        "serviceSales",
        "productSales",
        "totalSales",
        "averageTicket",
        "rank",
        "salesChange",
      ],
      "totalSales",
    );

    const [curr, prev] = await Promise.all([
      loadInvoices(range.fromDate, range.toDate),
      loadInvoices(range.previousFromDate, range.previousToDate),
    ]);

    const allRows = await staffRowsFromInvoices(curr, prev);
    const totalSales = round2(
      allRows.reduce((s, r) => s + r.totalSales, 0),
    );
    const prevTotalSales = round2(
      [...aggregateStaff(prev).values()].reduce(
        (s, r) => s + r.serviceSales + r.productSales,
        0,
      ),
    );
    const servicesDone = allRows.reduce((s, r) => s + r.servicesDone, 0);
    const prevServicesDone = [...aggregateStaff(prev).values()].reduce(
      (s, r) => s + r.servicesDone,
      0,
    );
    const billCount = curr.length;
    const prevBillCount = prev.length;
    const averageTicket =
      billCount > 0 ? round2(totalSales / billCount) : 0;
    const prevAverageTicket =
      prevBillCount > 0 ? round2(prevTotalSales / prevBillCount) : 0;
    const top = allRows[0];

    const kpis = {
      totalSales: opts.canViewRevenue ? totalSales : null,
      totalSalesChange: opts.canViewRevenue
        ? pctChange(totalSales, prevTotalSales)
        : null,
      topPerformerName: top?.staffName ?? null,
      topPerformerSales: opts.canViewRevenue
        ? (top?.totalSales ?? 0)
        : null,
      servicesDone,
      servicesDoneChange: pctChange(servicesDone, prevServicesDone),
      averageTicket: opts.canViewRevenue ? averageTicket : null,
      averageTicketChange: opts.canViewRevenue
        ? pctChange(averageTicket, prevAverageTicket)
        : null,
    };

    const chart = allRows.slice(0, 12).map((r) => ({
      staffId: r.staffId,
      staffName: r.staffName,
      totalSales: opts.canViewRevenue ? r.totalSales : null,
    }));

    const sorted = sortByKey(
      allRows as unknown as Record<string, unknown>[],
      sort,
      order,
    ) as unknown as StaffAgg[];
    const table = paginate(sorted, page, limit);
    const items = table.items.map((r) =>
      opts.canViewRevenue
        ? r
        : {
            ...r,
            serviceSales: null,
            productSales: null,
            totalSales: null,
            averageTicket: null,
            tipsReceived: null,
            salesChange: null,
          },
    );

    return {
      statusCode: 200,
      message: "Staff report",
      data: {
        range: { from: range.from, to: range.to },
        previousRange: {
          from: range.previousFrom,
          to: range.previousTo,
        },
        kpis,
        chart,
        table: { ...table, items },
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

export const exportReportsStaff = async (
  query: { from?: unknown; to?: unknown },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const [curr, prev] = await Promise.all([
      loadInvoices(range.fromDate, range.toDate),
      loadInvoices(range.previousFromDate, range.previousToDate),
    ]);
    const rows = await staffRowsFromInvoices(curr, prev);
    const headers = [
      "Rank",
      "Staff",
      "Services done",
      "Service sales",
      "Product sales",
      "Total sales",
      "Average ticket",
      "Sales change %",
    ];
    const dataRows = rows.map((r) => [
      r.rank,
      r.staffName,
      r.servicesDone,
      opts.canViewRevenue ? r.serviceSales : "",
      opts.canViewRevenue ? r.productSales : "",
      opts.canViewRevenue ? r.totalSales : "",
      opts.canViewRevenue ? r.averageTicket : "",
      r.salesChange ?? "",
    ]);
    return {
      statusCode: 200,
      message: "Staff export",
      data: {
        filename: `staff_${range.from}_${range.to}.csv`,
        headers,
        rows: dataRows,
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

export const getReportsStaffLines = async (
  staffId: string,
  query: { from?: unknown; to?: unknown },
  opts: ReportOpts,
) => {
  try {
    if (!mongoose.isValidObjectId(staffId)) {
      return fail(400, "Invalid staffId", ErrorCodes.VALIDATION_ERROR);
    }
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const invoices = await loadInvoices(range.fromDate, range.toDate);
    const lines: Array<{
      invoiceId: string;
      invoiceNumber: string;
      date: string;
      type: "service" | "product";
      name: string;
      qty: number;
      listPrice: number | null;
      lineTotal: number | null;
      attributed: number | null;
    }> = [];

    for (const inv of invoices) {
      const created = inv.createdAt ? new Date(inv.createdAt) : null;
      const date = created ? salonDateKeyFromUtc(created) : "";
      for (const line of attributedServiceLines(inv)) {
        if (String(line.staff) !== staffId) continue;
        lines.push({
          invoiceId: String(inv._id),
          invoiceNumber: inv.invoiceNumber ?? "",
          date,
          type: "service",
          name: line.name,
          qty: Number(line.qty ?? 1),
          listPrice: opts.canViewRevenue ? Number(line.price ?? 0) : null,
          lineTotal: opts.canViewRevenue ? Number(line.lineTotal ?? 0) : null,
          attributed: opts.canViewRevenue ? line.attributed : null,
        });
      }
      for (const line of attributedProductLines(inv)) {
        if (String(line.staff) !== staffId) continue;
        lines.push({
          invoiceId: String(inv._id),
          invoiceNumber: inv.invoiceNumber ?? "",
          date,
          type: "product",
          name: line.name,
          qty: Number(line.qty ?? 1),
          listPrice: opts.canViewRevenue ? Number(line.price ?? 0) : null,
          lineTotal: opts.canViewRevenue ? Number(line.lineTotal ?? 0) : null,
          attributed: opts.canViewRevenue ? line.attributed : null,
        });
      }
    }

    lines.sort((a, b) => b.date.localeCompare(a.date));

    return {
      statusCode: 200,
      message: "Staff line items",
      data: {
        range: { from: range.from, to: range.to },
        staffId,
        items: lines,
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

// ─── Customers ──────────────────────────────────────────────────────────────

export const getReportsCustomers = async (
  query: {
    from?: unknown;
    to?: unknown;
    tab?: unknown;
    inactiveDays?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const tab = query.tab === "inactive" ? "inactive" : "top";
    const inactiveDaysRaw = Number(query.inactiveDays);
    const inactiveDays = [30, 60, 90].includes(inactiveDaysRaw)
      ? inactiveDaysRaw
      : 30;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      tab === "inactive"
        ? ["name", "lastVisit", "daysSinceVisit", "spend", "visits"]
        : ["name", "spend", "visits", "averageTicket", "lastVisit"],
      tab === "inactive" ? "lastVisit" : "spend",
    );

    const settings = await getOrCreateSettings();
    const loyaltyEnabled = Boolean(settings.loyalty?.enabled);

    const invoices = (await Invoice.find({
      createdAt: { $gte: range.fromDate, $lte: range.toDate },
    })
      .select(INVOICE_LIST_PROJECTION)
      .populate("customer", "name lastName phone")
      .lean()) as LeanInvoice[];

    const walkInBills = invoices.filter((i) => i.walkIn).length;
    const customerInvoices = invoices.filter(
      (i) => !i.walkIn && i.customer,
    );

    // Prior visits for returning detection
    const customerIdsInRange = [
      ...new Set(
        customerInvoices.map((i) => {
          const c = i.customer;
          if (c && typeof c === "object" && "_id" in c) return String(c._id);
          return String(c);
        }),
      ),
    ].filter((id) => id && id !== "null" && id !== "undefined");

    const priorCustomers = customerIdsInRange.length
      ? await Invoice.distinct("customer", {
          customer: { $in: customerIdsInRange },
          createdAt: { $lt: range.fromDate },
          walkIn: { $ne: true },
        })
      : [];
    const returningSet = new Set(priorCustomers.map(String));

    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: range.fromDate, $lte: range.toDate },
    });
    const returningCustomers = customerIdsInRange.filter((id) =>
      returningSet.has(id),
    ).length;

    const spendByCustomer = new Map<
      string,
      {
        spend: number;
        visits: number;
        lastVisit: string;
        name: string;
        phone: string;
      }
    >();
    for (const inv of customerInvoices) {
      const c = inv.customer;
      const id =
        c && typeof c === "object" && "_id" in c
          ? String(c._id)
          : String(c);
      if (!id || id === "null") continue;
      const custObj =
        c && typeof c === "object" ? (c as { name?: string; lastName?: string; phone?: number }) : null;
      const created = inv.createdAt ? new Date(inv.createdAt) : null;
      const dateKey = created ? salonDateKeyFromUtc(created) : "";
      const row = spendByCustomer.get(id) ?? {
        spend: 0,
        visits: 0,
        lastVisit: "",
        name: customerDisplayName(custObj),
        phone: custObj?.phone != null ? String(custObj.phone) : "",
      };
      row.spend = round2(row.spend + invoiceRevenue(inv));
      row.visits += 1;
      if (dateKey > row.lastVisit) row.lastVisit = dateKey;
      spendByCustomer.set(id, row);
    }

    const distinctCustomers = spendByCustomer.size;
    const totalSpend = round2(
      [...spendByCustomer.values()].reduce((s, r) => s + r.spend, 0),
    );
    const totalVisits = [...spendByCustomer.values()].reduce(
      (s, r) => s + r.visits,
      0,
    );

    const kpis = {
      newCustomers,
      returningCustomers,
      averageSpend:
        opts.canViewRevenue && distinctCustomers > 0
          ? round2(totalSpend / distinctCustomers)
          : opts.canViewRevenue
            ? 0
            : null,
      averageVisits:
        distinctCustomers > 0 ? round2(totalVisits / distinctCustomers) : 0,
      walkInBills,
    };

    // Chart: new vs returning customers by first invoice day in range
    const g = chartGranularity(range.dayCount);
    const keys = allBucketKeys(range.from, range.to, g);
    const chartMap = new Map(
      keys.map((k) => [k, { key: k, newCount: 0, returningCount: 0 }]),
    );
    const firstSeen = new Map<string, string>();
    for (const inv of customerInvoices) {
      const c = inv.customer;
      const id =
        c && typeof c === "object" && "_id" in c
          ? String(c._id)
          : String(c);
      if (!id || id === "null") continue;
      const created = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!created) continue;
      const dk = salonDateKeyFromUtc(created);
      if (!firstSeen.has(id) || dk < firstSeen.get(id)!) {
        firstSeen.set(id, dk);
      }
    }
    for (const [id, dk] of firstSeen) {
      const k = bucketKey(dk, g);
      const row = chartMap.get(k);
      if (!row) continue;
      if (returningSet.has(id)) row.returningCount += 1;
      else row.newCount += 1;
    }
    const chart = keys.map((k) => chartMap.get(k)!);

    let tableItems: Array<Record<string, unknown>> = [];

    if (tab === "top") {
      let pointsMap = new Map<string, number>();
      if (loyaltyEnabled && customerIdsInRange.length) {
        const bals = await LoyaltyBalance.find({
          customer: { $in: customerIdsInRange },
        }).lean();
        pointsMap = new Map(bals.map((b) => [String(b.customer), b.points]));
      }
      tableItems = [...spendByCustomer.entries()].map(([customerId, r]) => ({
        customerId,
        name: r.name,
        phone: r.phone,
        spend: opts.canViewRevenue ? r.spend : null,
        visits: r.visits,
        averageTicket:
          opts.canViewRevenue && r.visits > 0
            ? round2(r.spend / r.visits)
            : opts.canViewRevenue
              ? 0
              : null,
        lastVisit: r.lastVisit,
        loyaltyPoints: loyaltyEnabled ? (pointsMap.get(customerId) ?? 0) : null,
      }));
    } else {
      // Inactive: last invoice before now - N days
      const cutoff = addDateKey(
        salonDateKeyFromUtc(new Date()),
        -inactiveDays,
      );
      const cutoffEnd = new Date(
        `${cutoff}T23:59:59.999+05:30`,
      );

      const lastInvoices = await Invoice.aggregate([
        {
          $match: {
            walkIn: { $ne: true },
            customer: { $ne: null },
          },
        },
        // Keep the sort small: only the fields the $group below reads.
        {
          $project: {
            customer: 1,
            createdAt: 1,
            amountPayable: 1,
            grandTotal: 1,
            tip: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$customer",
            lastVisitAt: { $first: "$createdAt" },
            spend: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$amountPayable", "$grandTotal"] },
                  { $ifNull: ["$tip", 0] },
                ],
              },
            },
            visits: { $sum: 1 },
          },
        },
        {
          $match: {
            lastVisitAt: { $lte: cutoffEnd },
          },
        },
        // $group output order is unspecified; the table sorts by day, so ties
        // need a fixed order or pagination can repeat / skip customers.
        { $sort: { lastVisitAt: -1, _id: 1 } },
      ]);

      const ids = lastInvoices.map((r) => r._id);
      const customers = await Customer.find({ _id: { $in: ids } })
        .select("name lastName phone")
        .lean();
      const custById = new Map(customers.map((c) => [String(c._id), c]));
      const todayKey = salonDateKeyFromUtc(new Date());

      tableItems = lastInvoices
        .map((r) => {
          const c = custById.get(String(r._id));
          if (!c) return null;
          const lastVisit = salonDateKeyFromUtc(new Date(r.lastVisitAt));
          const daysSinceVisit = Math.max(
            0,
            Math.floor(
              (salonDayStartUtc(todayKey).getTime() -
                salonDayStartUtc(lastVisit).getTime()) /
                86_400_000,
            ),
          );
          return {
            customerId: String(r._id),
            name: customerDisplayName(c),
            phone: c.phone != null ? String(c.phone) : "",
            lastVisit,
            daysSinceVisit,
            spend: opts.canViewRevenue ? round2(Math.max(0, Number(r.spend))) : null,
            visits: r.visits,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;
    }

    const sorted = sortByKey(tableItems, sort, order);
    const table = paginate(sorted, page, limit);

    return {
      statusCode: 200,
      message: "Customers report",
      data: {
        range: { from: range.from, to: range.to },
        tab,
        inactiveDays: tab === "inactive" ? inactiveDays : undefined,
        loyaltyEnabled,
        kpis,
        chart,
        table,
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

export const exportReportsCustomers = async (
  query: {
    from?: unknown;
    to?: unknown;
    tab?: unknown;
    inactiveDays?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const result = await getReportsCustomers(
      { ...query, page: 1, limit: 100000 },
      opts,
    );
    if (result.statusCode !== 200 || !result.data) {
      return result;
    }
    const data = result.data as {
      range: { from: string; to: string };
      tab: string;
      table: { items: Array<Record<string, unknown>> };
    };
    const items = data.table.items;
    const headers =
      data.tab === "inactive"
        ? [
            "Customer",
            "Phone",
            "Last visit",
            "Days since visit",
            "Spend",
            "Visits",
          ]
        : [
            "Customer",
            "Phone",
            "Spend",
            "Visits",
            "Average ticket",
            "Last visit",
            "Loyalty points",
          ];
    const rows =
      data.tab === "inactive"
        ? items.map((r) => [
            String(r.name ?? ""),
            String(r.phone ?? ""),
            String(r.lastVisit ?? ""),
            Number(r.daysSinceVisit ?? 0),
            r.spend ?? "",
            Number(r.visits ?? 0),
          ])
        : items.map((r) => [
            String(r.name ?? ""),
            String(r.phone ?? ""),
            r.spend ?? "",
            Number(r.visits ?? 0),
            r.averageTicket ?? "",
            String(r.lastVisit ?? ""),
            r.loyaltyPoints ?? "",
          ]);

    return {
      statusCode: 200,
      message: "Customers export",
      data: {
        filename: `customers_${data.tab}_${data.range.from}_${data.range.to}.csv`,
        headers,
        rows,
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

// ─── Appointments ───────────────────────────────────────────────────────────

export const getReportsAppointments = async (
  query: {
    from?: unknown;
    to?: unknown;
    status?: unknown;
    staffId?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
  },
  _opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      ["date", "startTime", "status", "customerName"],
      "date",
    );
    const statusFilter =
      typeof query.status === "string" && APPT_STATUSES.has(query.status)
        ? query.status
        : undefined;
    const staffId =
      typeof query.staffId === "string" &&
      mongoose.isValidObjectId(query.staffId)
        ? query.staffId
        : undefined;

    const match: Record<string, unknown> = {
      date: { $gte: range.from, $lte: range.to },
    };
    if (statusFilter) match.status = statusFilter;
    if (staffId) match["services.staff"] = new mongoose.Types.ObjectId(staffId);

    const [appointments, invoices, settings] = await Promise.all([
      Appointment.find(match)
        .populate("customer", "name lastName phone")
        .populate("services.staff", "name")
        .lean(),
      Invoice.find({
        createdAt: { $gte: range.fromDate, $lte: range.toDate },
      })
        .select("walkIn source appointment")
        .lean(),
      getOrCreateSettings(),
    ]);

    // KPIs from unfiltered range status counts (re-query without status/staff for KPIs)
    const allInRange = await Appointment.find({
      date: { $gte: range.from, $lte: range.to },
    })
      .select("status invoice date startTime")
      .lean();

    const total = allInRange.length;
    const completed = allInRange.filter((a) => a.status === "completed").length;
    const noShows = allInRange.filter((a) => a.status === "no_show").length;
    const cancelled = allInRange.filter((a) => a.status === "cancelled").length;
    const withInvoice = allInRange.filter((a) => a.invoice).length;
    const nonCancelled = total - cancelled;

    const kpis = {
      total,
      completed,
      noShowRate: total > 0 ? round2((noShows / total) * 100) : 0,
      cancellationRate: total > 0 ? round2((cancelled / total) * 100) : 0,
      bookingToBillRate:
        nonCancelled > 0 ? round2((withInvoice / nonCancelled) * 100) : 0,
    };

    const statusBreakdown = (
      ["booked", "completed", "cancelled", "no_show"] as const
    ).map((status) => ({
      status,
      count: allInRange.filter((a) => a.status === status).length,
    }));

    const openHm =
      settings.business?.openingTime ||
      (settings.appointments?.startHour != null
        ? `${String(settings.appointments.startHour).padStart(2, "0")}:00`
        : "09:00");
    const closeHm =
      settings.business?.closingTime ||
      (settings.appointments?.endHour != null
        ? `${String(settings.appointments.endHour).padStart(2, "0")}:00`
        : "21:00");
    const hours = buildHourSlots(
      openHm,
      closeHm,
      settings.appointments?.slotMinutes ?? 60,
    );
    const days = [0, 1, 2, 3, 4, 5, 6];
    const cells: number[][] = days.map(() => hours.map(() => 0));
    for (const a of allInRange) {
      if (a.status === "cancelled") continue;
      const dow = salonDow(a.date);
      const startMins = hmToMinutes(a.startTime);
      const hourIdx = hours.findIndex((h) => {
        const hm = hmToMinutes(h);
        return startMins >= hm && startMins < hm + 60;
      });
      if (hourIdx >= 0) cells[dow][hourIdx] += 1;
    }

    const walkInBills = invoices.filter(
      (i) => i.walkIn || i.source === "walk-in",
    ).length;
    const appointmentBills = invoices.filter(
      (i) => i.appointment || i.source === "appointment",
    ).length;

    const tableRows = appointments.map((a) => {
      const cust = a.customer as {
        name?: string;
        lastName?: string;
      } | null;
      const customerName = cust
        ? [cust.name, cust.lastName].filter(Boolean).join(" ")
        : a.guestName || "Walk-in";
      const staffNames = [
        ...new Set(
          (a.services ?? []).map((s) => {
            const st = s.staff as unknown as { name?: string } | string;
            return typeof st === "object" && st ? st.name || "" : "";
          }),
        ),
      ].filter(Boolean);
      return {
        id: String(a._id),
        date: a.date,
        startTime: a.startTime,
        status: a.status,
        customerName,
        staffNames,
        services: (a.services ?? []).map((s) => s.name),
        hasInvoice: Boolean(a.invoice),
      };
    });

    const sorted = sortByKey(
      tableRows as unknown as Record<string, unknown>[],
      sort,
      order,
    ) as unknown as typeof tableRows;
    const table = paginate(sorted, page, limit);

    return {
      statusCode: 200,
      message: "Appointments report",
      data: {
        range: { from: range.from, to: range.to },
        kpis,
        charts: {
          statusBreakdown,
          busyGrid: { days, hours, cells },
          walkInVsAppointment: { walkInBills, appointmentBills },
        },
        table,
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

export const exportReportsAppointments = async (
  query: {
    from?: unknown;
    to?: unknown;
    status?: unknown;
    staffId?: unknown;
  },
  _opts: ReportOpts,
) => {
  try {
    const result = await getReportsAppointments(
      { ...query, page: 1, limit: 100000 },
      _opts,
    );
    if (result.statusCode !== 200 || !result.data) return result;
    const data = result.data as {
      range: { from: string; to: string };
      table: {
        items: Array<{
          date: string;
          startTime: string;
          status: string;
          customerName: string;
          staffNames: string[];
          services: string[];
          hasInvoice: boolean;
        }>;
      };
    };
    const headers = [
      "Date",
      "Time",
      "Status",
      "Customer",
      "Staff",
      "Services",
      "Billed",
    ];
    const rows = data.table.items.map((r) => [
      r.date,
      r.startTime,
      r.status,
      r.customerName,
      r.staffNames.join("; "),
      r.services.join("; "),
      r.hasInvoice ? "yes" : "no",
    ]);
    return {
      statusCode: 200,
      message: "Appointments export",
      data: {
        filename: `appointments_${data.range.from}_${data.range.to}.csv`,
        headers,
        rows,
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

// ─── Services ───────────────────────────────────────────────────────────────

export const getReportsServices = async (
  query: {
    from?: unknown;
    to?: unknown;
    category?: unknown;
    notSold?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      [
        "name",
        "category",
        "timesSold",
        "revenue",
        "listPrice",
        "avgPriceCharged",
        "discountPctEffect",
        "revenueShare",
      ],
      "revenue",
    );
    const category =
      typeof query.category === "string" && query.category.trim()
        ? query.category.trim()
        : undefined;
    const notSold =
      query.notSold === true ||
      query.notSold === "true" ||
      query.notSold === "1";

    const invoices = await loadInvoices(range.fromDate, range.toDate);

    type SvcRow = {
      serviceId: string;
      name: string;
      category: string;
      timesSold: number;
      revenue: number;
      listPrice: number;
      avgPriceCharged: number;
      discountPctEffect: number;
      revenueShare: number;
      snapshotName: string;
    };

    const agg = new Map<
      string,
      { qty: number; revenue: number; snapshotName: string; listPriceSum: number }
    >();

    let totalServiceSubtotal = 0;
    let totalServiceDiscount = 0;

    for (const inv of invoices) {
      totalServiceSubtotal += Number(inv.serviceSubtotal ?? 0);
      totalServiceDiscount += Number(inv.serviceDiscountTotal ?? 0);
      for (const line of attributedServiceLines(inv)) {
        const id = String(line.service);
        const row = agg.get(id) ?? {
          qty: 0,
          revenue: 0,
          snapshotName: line.name,
          listPriceSum: 0,
        };
        row.qty += Number(line.qty ?? 1);
        row.revenue = round2(row.revenue + line.attributed);
        row.snapshotName = line.name;
        row.listPriceSum += Number(line.price ?? 0) * Number(line.qty ?? 1);
        agg.set(id, row);
      }
    }

    const serviceIds = [...agg.keys()];
    const catalog = await Service.find(
      category ? { category } : {},
    ).lean();
    const catalogById = new Map(catalog.map((s) => [String(s._id), s]));

    const totalRevenue = round2(
      [...agg.values()].reduce((s, r) => s + r.revenue, 0),
    );

    let rows: SvcRow[] = [];

    if (notSold) {
      const soldIds = new Set(serviceIds);
      rows = catalog
        .filter((s) => !soldIds.has(String(s._id)))
        .filter((s) => !category || s.category === category)
        .map((s) => ({
          serviceId: String(s._id),
          name: s.name,
          category: s.category,
          timesSold: 0,
          revenue: 0,
          listPrice: s.price,
          avgPriceCharged: 0,
          discountPctEffect: 0,
          revenueShare: 0,
          snapshotName: s.name,
        }));
    } else {
      rows = [...agg.entries()]
        .map(([id, r]) => {
          const current = catalogById.get(id);
          if (category && current && current.category !== category) return null;
          if (category && !current) return null;
          const listPrice = current?.price ?? (r.qty > 0 ? round2(r.listPriceSum / r.qty) : 0);
          const avgPriceCharged = r.qty > 0 ? round2(r.revenue / r.qty) : 0;
          const discountPctEffect =
            listPrice > 0
              ? round2(((listPrice - avgPriceCharged) / listPrice) * 100)
              : 0;
          return {
            serviceId: id,
            name: current?.name ?? r.snapshotName,
            category: current?.category ?? "",
            timesSold: r.qty,
            revenue: r.revenue,
            listPrice,
            avgPriceCharged,
            discountPctEffect,
            revenueShare:
              totalRevenue > 0
                ? round2((r.revenue / totalRevenue) * 100)
                : 0,
            snapshotName: r.snapshotName,
          };
        })
        .filter(Boolean) as SvcRow[];
    }

    const soldCount = [...agg.values()].reduce((s, r) => s + r.qty, 0);
    const distinctCount = agg.size;
    const combosSold = invoices.reduce((s, inv) => s + combosSoldCount(inv), 0);
    const avgDiscountPct =
      totalServiceSubtotal > 0
        ? round2((totalServiceDiscount / totalServiceSubtotal) * 100)
        : 0;

    const kpis = {
      soldCount,
      revenue: opts.canViewRevenue ? totalRevenue : null,
      distinctCount,
      avgDiscountPct: opts.canViewRevenue ? avgDiscountPct : null,
      combosSold,
    };

    const byRevenue = [...rows]
      .filter((r) => r.timesSold > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((r) => ({
        serviceId: r.serviceId,
        name: r.name,
        revenue: opts.canViewRevenue ? r.revenue : null,
        timesSold: r.timesSold,
      }));
    const byCount = [...rows]
      .filter((r) => r.timesSold > 0)
      .sort((a, b) => b.timesSold - a.timesSold)
      .slice(0, 10)
      .map((r) => ({
        serviceId: r.serviceId,
        name: r.name,
        timesSold: r.timesSold,
        revenue: opts.canViewRevenue ? r.revenue : null,
      }));

    const sorted = sortByKey(
      rows as unknown as Record<string, unknown>[],
      sort,
      order,
    ) as unknown as SvcRow[];
    const table = paginate(sorted, page, limit);
    const items = table.items.map((r) =>
      opts.canViewRevenue
        ? r
        : {
            ...r,
            revenue: null,
            listPrice: null,
            avgPriceCharged: null,
            discountPctEffect: null,
            revenueShare: null,
          },
    );

    return {
      statusCode: 200,
      message: "Services report",
      data: {
        range: { from: range.from, to: range.to },
        notSold,
        kpis,
        chart: { byRevenue, byCount },
        table: { ...table, items },
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

export const exportReportsServices = async (
  query: {
    from?: unknown;
    to?: unknown;
    category?: unknown;
    notSold?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const result = await getReportsServices(
      { ...query, page: 1, limit: 100000 },
      opts,
    );
    if (result.statusCode !== 200 || !result.data) return result;
    const data = result.data as {
      range: { from: string; to: string };
      table: {
        items: Array<{
          name: string;
          category: string;
          timesSold: number;
          revenue: number | null;
          listPrice: number | null;
          avgPriceCharged: number | null;
          discountPctEffect: number | null;
          revenueShare: number | null;
        }>;
      };
    };
    const headers = [
      "Service",
      "Category",
      "Times sold",
      "Revenue",
      "List price",
      "Avg price charged",
      "Discount % effect",
      "Revenue share %",
    ];
    const rows = data.table.items.map((r) => [
      r.name,
      r.category,
      r.timesSold,
      r.revenue ?? "",
      r.listPrice ?? "",
      r.avgPriceCharged ?? "",
      r.discountPctEffect ?? "",
      r.revenueShare ?? "",
    ]);
    return {
      statusCode: 200,
      message: "Services export",
      data: {
        filename: `services_${data.range.from}_${data.range.to}.csv`,
        headers,
        rows,
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

// ─── Products ───────────────────────────────────────────────────────────────

export const getReportsProducts = async (
  query: {
    from?: unknown;
    to?: unknown;
    page?: unknown;
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
  },
  opts: ReportOpts,
) => {
  try {
    const parsed = requireRange(query.from, query.to);
    if (!parsed.ok) {
      return fail(400, parsed.message, ErrorCodes.VALIDATION_ERROR);
    }
    const range = parsed.range;
    const { page, limit } = parsePageLimit(query.page, query.limit);
    const { sort, order } = parseSortOrder(
      query.sort,
      query.order,
      [
        "name",
        "timesSold",
        "revenue",
        "listPrice",
        "avgPriceCharged",
        "discountPctEffect",
        "revenueShare",
        "stockQty",
      ],
      "revenue",
    );

    const invoices = await loadInvoices(range.fromDate, range.toDate);

    type ProdAgg = {
      qty: number;
      revenue: number;
      snapshotName: string;
      listPriceSum: number;
      byStaff: Map<string, number>;
    };

    const agg = new Map<string, ProdAgg>();
    let totalProductSubtotal = 0;
    let totalProductDiscount = 0;

    for (const inv of invoices) {
      totalProductSubtotal += Number(inv.productSubtotal ?? 0);
      totalProductDiscount += Number(inv.productDiscountTotal ?? 0);
      for (const line of attributedProductLines(inv)) {
        const id = String(line.product);
        const row = agg.get(id) ?? {
          qty: 0,
          revenue: 0,
          snapshotName: line.name,
          listPriceSum: 0,
          byStaff: new Map(),
        };
        row.qty += Number(line.qty ?? 1);
        row.revenue = round2(row.revenue + line.attributed);
        row.snapshotName = line.name;
        row.listPriceSum += Number(line.price ?? 0) * Number(line.qty ?? 1);
        const sid = String(line.staff);
        row.byStaff.set(
          sid,
          round2((row.byStaff.get(sid) ?? 0) + line.attributed),
        );
        agg.set(id, row);
      }
    }

    const productIds = [...agg.keys()];
    const catalog = await Product.find().lean();
    const catalogById = new Map(catalog.map((p) => [String(p._id), p]));

    const allStaffIds = [
      ...new Set(
        [...agg.values()].flatMap((r) => [...r.byStaff.keys()]),
      ),
    ];
    const staffDocs = await Staff.find({ _id: { $in: allStaffIds } })
      .select("name")
      .lean();
    const staffName = new Map(staffDocs.map((s) => [String(s._id), s.name]));

    const totalRevenue = round2(
      [...agg.values()].reduce((s, r) => s + r.revenue, 0),
    );

    const rows = [...agg.entries()].map(([id, r]) => {
      const current = catalogById.get(id);
      const listPrice =
        current?.price ?? (r.qty > 0 ? round2(r.listPriceSum / r.qty) : 0);
      const avgPriceCharged = r.qty > 0 ? round2(r.revenue / r.qty) : 0;
      const discountPctEffect =
        listPrice > 0
          ? round2(((listPrice - avgPriceCharged) / listPrice) * 100)
          : 0;
      let topSellerStaffId: string | null = null;
      let topSellerStaffName: string | null = null;
      let topSellerSales = 0;
      for (const [sid, sales] of r.byStaff) {
        if (sales > topSellerSales) {
          topSellerSales = sales;
          topSellerStaffId = sid;
          topSellerStaffName = staffName.get(sid) ?? "Unknown";
        }
      }
      return {
        productId: id,
        name: current?.name ?? r.snapshotName,
        timesSold: r.qty,
        unitsSold: r.qty,
        revenue: r.revenue,
        listPrice,
        avgPriceCharged,
        discountPctEffect,
        revenueShare:
          totalRevenue > 0 ? round2((r.revenue / totalRevenue) * 100) : 0,
        topSellerStaffId,
        topSellerStaffName,
        topSellerSales,
        stockQty: current?.trackStock ? Number(current.stockQty ?? 0) : null,
        unit: current?.unit ?? "",
        trackStock: Boolean(current?.trackStock),
        type: current?.type ?? "retail",
      };
    });

    const soldCount = [...agg.values()].reduce((s, r) => s + r.qty, 0);
    const kpis = {
      soldCount,
      revenue: opts.canViewRevenue ? totalRevenue : null,
      distinctCount: agg.size,
      avgDiscountPct:
        opts.canViewRevenue && totalProductSubtotal > 0
          ? round2((totalProductDiscount / totalProductSubtotal) * 100)
          : opts.canViewRevenue
            ? 0
            : null,
    };

    const byRevenue = [...rows]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((r) => ({
        productId: r.productId,
        name: r.name,
        revenue: opts.canViewRevenue ? r.revenue : null,
        timesSold: r.timesSold,
      }));
    const byCount = [...rows]
      .sort((a, b) => b.timesSold - a.timesSold)
      .slice(0, 10)
      .map((r) => ({
        productId: r.productId,
        name: r.name,
        timesSold: r.timesSold,
        revenue: opts.canViewRevenue ? r.revenue : null,
      }));

    // productSalesPerStaff — small summary table
    const staffProd = new Map<
      string,
      { staffId: string; staffName: string; revenue: number; units: number }
    >();
    for (const inv of invoices) {
      for (const line of attributedProductLines(inv)) {
        const sid = String(line.staff);
        const row = staffProd.get(sid) ?? {
          staffId: sid,
          staffName: staffName.get(sid) ?? "Unknown",
          revenue: 0,
          units: 0,
        };
        row.revenue = round2(row.revenue + line.attributed);
        row.units += Number(line.qty ?? 1);
        staffProd.set(sid, row);
      }
    }
    const productSalesPerStaff = [...staffProd.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((r) =>
        opts.canViewRevenue
          ? r
          : { ...r, revenue: null },
      );

    const sorted = sortByKey(
      rows as unknown as Record<string, unknown>[],
      sort,
      order,
    ) as unknown as typeof rows;
    const table = paginate(sorted, page, limit);
    const items = table.items.map((r) =>
      opts.canViewRevenue
        ? r
        : {
            ...r,
            revenue: null,
            listPrice: null,
            avgPriceCharged: null,
            discountPctEffect: null,
            revenueShare: null,
            topSellerSales: null,
          },
    );

    return {
      statusCode: 200,
      message: "Products report",
      data: {
        range: { from: range.from, to: range.to },
        kpis,
        chart: { byRevenue, byCount },
        productSalesPerStaff,
        table: { ...table, items },
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

export const exportReportsProducts = async (
  query: { from?: unknown; to?: unknown },
  opts: ReportOpts,
) => {
  try {
    const result = await getReportsProducts(
      { ...query, page: 1, limit: 100000 },
      opts,
    );
    if (result.statusCode !== 200 || !result.data) return result;
    const data = result.data as {
      range: { from: string; to: string };
      table: {
        items: Array<{
          name: string;
          timesSold: number;
          revenue: number | null;
          listPrice: number | null;
          avgPriceCharged: number | null;
          discountPctEffect: number | null;
          revenueShare: number | null;
          topSellerStaffName: string | null;
        }>;
      };
    };
    const headers = [
      "Product",
      "Times sold",
      "Revenue",
      "List price",
      "Avg price charged",
      "Discount % effect",
      "Revenue share %",
      "Top seller staff",
    ];
    const rows = data.table.items.map((r) => [
      r.name,
      r.timesSold,
      r.revenue ?? "",
      r.listPrice ?? "",
      r.avgPriceCharged ?? "",
      r.discountPctEffect ?? "",
      r.revenueShare ?? "",
      r.topSellerStaffName ?? "",
    ]);
    return {
      statusCode: 200,
      message: "Products export",
      data: {
        filename: `products_${data.range.from}_${data.range.to}.csv`,
        headers,
        rows,
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
