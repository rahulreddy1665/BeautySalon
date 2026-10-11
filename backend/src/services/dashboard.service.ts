import { Appointment } from "../models/appointment.model";
import { Invoice, INVOICE_LIST_PROJECTION } from "../models/invoice.model";
import { LoyaltyBalance } from "../models/loyalty.model";
import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { getStaffSalesSummary } from "./invoice.service";
import { getSettings } from "./settings.service";

export type DashboardRange = "today" | "week" | "month";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function rangeBounds(range: DashboardRange, now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (range === "today") {
    const prevStart = startOfDay(addDays(now, -1));
    const prevEnd = endOfDay(addDays(now, -1));
    return {
      current: { from: todayStart, to: todayEnd, fromKey: ymd(now), toKey: ymd(now) },
      previous: {
        from: prevStart,
        to: prevEnd,
        fromKey: ymd(addDays(now, -1)),
        toKey: ymd(addDays(now, -1)),
      },
    };
  }
  if (range === "week") {
    const from = startOfDay(addDays(now, -6));
    const prevTo = endOfDay(addDays(from, -1));
    const prevFrom = startOfDay(addDays(prevTo, -6));
    return {
      current: { from, to: todayEnd, fromKey: ymd(from), toKey: ymd(now) },
      previous: {
        from: prevFrom,
        to: prevTo,
        fromKey: ymd(prevFrom),
        toKey: ymd(prevTo),
      },
    };
  }
  // month — calendar month to date vs previous calendar month same length
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const dayOfMonth = now.getDate();
  const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevDay = Math.min(dayOfMonth, prevMonthLast.getDate());
  const prevFrom = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const prevTo = endOfDay(
    new Date(now.getFullYear(), now.getMonth() - 1, prevDay),
  );
  return {
    current: { from, to: todayEnd, fromKey: ymd(from), toKey: ymd(now) },
    previous: {
      from: prevFrom,
      to: prevTo,
      fromKey: ymd(prevFrom),
      toKey: ymd(prevTo),
    },
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous > 0) return round2(((current - previous) / previous) * 100);
  return null;
}

function invoiceRevenue(inv: {
  amountPayable?: number;
  grandTotal?: number;
  tip?: number;
}): number {
  const total = Number(inv.amountPayable ?? inv.grandTotal ?? 0);
  const tip = Number(inv.tip ?? 0);
  return round2(Math.max(0, total - tip));
}

export const getDashboard = async (
  range: DashboardRange,
  opts: { canViewRevenue: boolean },
) => {
  try {
    const now = new Date();
    const todayKey = ymd(now);
    const bounds = rangeBounds(range, now);
    const settings = await getSettings();
    const loyaltyEnabled = Boolean(
      (settings.data as { loyalty?: { enabled?: boolean } } | null)?.loyalty
        ?.enabled,
    );

    const [
      rangeInvoices,
      prevInvoices,
      todayInvoices,
      todayAppointments,
      prevAppointments,
      activeWindowInvoices,
      prevActiveWindowInvoices,
      yearInvoices,
      staffSalesResult,
    ] = await Promise.all([
      Invoice.find({
        createdAt: { $gte: bounds.current.from, $lte: bounds.current.to },
      })
        .select(INVOICE_LIST_PROJECTION)
        .lean(),
      Invoice.find({
        createdAt: { $gte: bounds.previous.from, $lte: bounds.previous.to },
      })
        .select(INVOICE_LIST_PROJECTION)
        .lean(),
      Invoice.find({
        createdAt: {
          $gte: startOfDay(now),
          $lte: endOfDay(now),
        },
      })
        .select(INVOICE_LIST_PROJECTION)
        .lean(),
      Appointment.find({ date: todayKey })
        .populate("customer", "name lastName phone")
        .populate("services.staff", "name")
        .sort({ startTime: 1 })
        .lean(),
      Appointment.countDocuments({
        date: bounds.previous.fromKey,
      }).then(async (n) => {
        if (range === "today") return n;
        return Appointment.countDocuments({
          date: {
            $gte: bounds.previous.fromKey,
            $lte: bounds.previous.toKey,
          },
        });
      }),
      Invoice.find({
        createdAt: {
          $gte: startOfDay(addDays(now, -29)),
          $lte: endOfDay(now),
        },
        walkIn: { $ne: true },
        customer: { $ne: null },
      })
        .select("customer")
        .lean(),
      Invoice.find({
        createdAt: {
          $gte: startOfDay(addDays(now, -59)),
          $lte: endOfDay(addDays(now, -30)),
        },
        walkIn: { $ne: true },
        customer: { $ne: null },
      })
        .select("customer")
        .lean(),
      Invoice.find({
        createdAt: {
          $gte: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
          $lte: endOfDay(now),
        },
      })
        .select(INVOICE_LIST_PROJECTION)
        .lean(),
      getStaffSalesSummary(bounds.current.fromKey, bounds.current.toKey),
    ]);

    const activeClients = new Set(
      activeWindowInvoices.map((i) => String(i.customer)).filter(Boolean),
    ).size;
    const prevActiveClients = new Set(
      prevActiveWindowInvoices.map((i) => String(i.customer)).filter(Boolean),
    ).size;

    const apptCountToday = todayAppointments.length;
    const walkInsToday = todayAppointments.filter(
      (a) => !a.customer || a.guestName,
    ).length;
    // For range comparison of appointments
    let apptCountRange = apptCountToday;
    if (range !== "today") {
      apptCountRange = await Appointment.countDocuments({
        date: { $gte: bounds.current.fromKey, $lte: bounds.current.toKey },
      });
    }
    const apptPrev =
      typeof prevAppointments === "number" ? prevAppointments : 0;

    const revenueRange = round2(
      rangeInvoices.reduce((s, inv) => s + invoiceRevenue(inv), 0),
    );
    const revenuePrev = round2(
      prevInvoices.reduce((s, inv) => s + invoiceRevenue(inv), 0),
    );

    const collectionToday = round2(
      todayInvoices.reduce(
        (s, inv) => s + Number(inv.amountPayable ?? inv.grandTotal ?? 0),
        0,
      ),
    );
    const tipsToday = round2(
      todayInvoices.reduce((s, inv) => s + Number(inv.tip ?? 0), 0),
    );

    const paymentSplit = {
      cash: 0,
      upi: 0,
      card: 0,
    };
    for (const inv of todayInvoices) {
      const amt = Number(inv.amountPayable ?? inv.grandTotal ?? 0);
      if (inv.paymentMode === "cash") paymentSplit.cash = round2(paymentSplit.cash + amt);
      else if (inv.paymentMode === "upi")
        paymentSplit.upi = round2(paymentSplit.upi + amt);
      else if (inv.paymentMode === "card")
        paymentSplit.card = round2(paymentSplit.card + amt);
    }

    const completedToday = todayAppointments.filter(
      (a) => a.status === "completed",
    ).length;
    const totalProgress = todayAppointments.filter(
      (a) => a.status !== "cancelled",
    ).length;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const parseHm = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };
    let nextUpcomingId: string | null = null;
    for (const a of todayAppointments) {
      if (a.status === "cancelled" || a.status === "completed") continue;
      if (parseHm(a.startTime) >= nowMinutes) {
        nextUpcomingId = String(a._id);
        break;
      }
    }

    const todaysAppointmentList = todayAppointments.map((a) => {
      const cust = a.customer as {
        _id?: unknown;
        name?: string;
        lastName?: string;
        phone?: number;
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
        startTime: a.startTime,
        status: a.status,
        customerName,
        services: (a.services ?? []).map((s) => s.name),
        staffNames,
        isUpcoming: String(a._id) === nextUpcomingId,
      };
    });

    const monthKeys = Array.from({ length: 12 }, (_, i) => i);
    const monthlyMap = new Map<
      number,
      { revenue: number; services: number; products: number }
    >();
    for (const i of monthKeys) {
      monthlyMap.set(i, { revenue: 0, services: 0, products: 0 });
    }
    for (const inv of yearInvoices) {
      const createdAt = (inv as { createdAt?: Date }).createdAt;
      const created = createdAt ? new Date(createdAt) : null;
      if (!created) continue;
      const m = created.getMonth();
      const row = monthlyMap.get(m)!;
      const services = Number(inv.serviceSubtotal ?? 0);
      const products = Number(inv.productSubtotal ?? 0);
      row.services = round2(row.services + services);
      row.products = round2(row.products + products);
      row.revenue = round2(row.revenue + invoiceRevenue(inv));
    }
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyRevenue = monthKeys.map((i) => ({
      month: monthLabels[i],
      monthIndex: i,
      revenue: monthlyMap.get(i)!.revenue,
      services: monthlyMap.get(i)!.services,
      products: monthlyMap.get(i)!.products,
    }));

    const staffRows =
      staffSalesResult.statusCode === 200 && Array.isArray(staffSalesResult.data)
        ? staffSalesResult.data
        : [];
    const topPerformers = staffRows.slice(0, 5).map((r) => ({
      staffId: r.staffId,
      name: r.staffName,
      sales: r.totalSales,
    }));

    // Recent customers from latest invoices
    const recentInvoices = await Invoice.find({
      walkIn: { $ne: true },
      customer: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .select(INVOICE_LIST_PROJECTION)
      .populate("customer", "name lastName phone")
      .lean();

    const seen = new Set<string>();
    const recentCustomers: Array<{
      id: string;
      name: string;
      lastService: string;
      lastVisit: string;
      visitCount: number;
      points: number | null;
    }> = [];

    for (const inv of recentInvoices) {
      const cid = String(inv.customer && typeof inv.customer === "object" && "_id" in inv.customer
        ? (inv.customer as { _id: unknown })._id
        : inv.customer);
      if (!cid || seen.has(cid)) continue;
      seen.add(cid);
      const cust = inv.customer as {
        name?: string;
        lastName?: string;
      } | null;
      const name = [cust?.name, cust?.lastName].filter(Boolean).join(" ") || "Customer";
      const lastService =
        inv.serviceItems?.[0]?.name ||
        inv.productItems?.[0]?.name ||
        "";
      const visitCount = await Invoice.countDocuments({ customer: cid });
      const visitAt = (inv as { createdAt?: Date }).createdAt;
      recentCustomers.push({
        id: cid,
        name,
        lastService,
        lastVisit: visitAt ? new Date(visitAt).toISOString() : "",
        visitCount,
        points: null,
      });
      if (recentCustomers.length >= 5) break;
    }

    if (loyaltyEnabled && recentCustomers.length > 0) {
      const bals = await LoyaltyBalance.find({
        customer: { $in: recentCustomers.map((c) => c.id) },
      }).lean();
      const byId = new Map(bals.map((b) => [String(b.customer), b.points]));
      for (const c of recentCustomers) {
        c.points = byId.get(c.id) ?? 0;
      }
    }

    const progressBase = {
      completed: completedToday,
      total: totalProgress,
      percent:
        totalProgress > 0
          ? Math.round((completedToday / totalProgress) * 100)
          : 0,
    };

    const statsBase = {
      activeClients: {
        value: activeClients,
        deltaPercent: pctChange(activeClients, prevActiveClients),
        subtitle: "Visited in the last 30 days",
      },
      appointments: {
        value: range === "today" ? apptCountToday : apptCountRange,
        deltaPercent: pctChange(
          range === "today" ? apptCountToday : apptCountRange,
          apptPrev,
        ),
        walkIns: walkInsToday,
      },
    };

    if (!opts.canViewRevenue) {
      return {
        statusCode: 200,
        message: "Dashboard",
        data: {
          range,
          loyaltyEnabled,
          canViewRevenue: false,
          stats: statsBase,
          todaysAppointments: todaysAppointmentList,
          todaysProgress: progressBase,
          recentCustomers,
        },
      };
    }

    return {
      statusCode: 200,
      message: "Dashboard",
      data: {
        range,
        loyaltyEnabled,
        canViewRevenue: true,
        stats: {
          ...statsBase,
          revenue: {
            value: revenueRange,
            deltaPercent: pctChange(revenueRange, revenuePrev),
          },
          collectionToday: {
            value: collectionToday,
            tips: tipsToday,
          },
        },
        todaysAppointments: todaysAppointmentList,
        todaysProgress: {
          ...progressBase,
          paymentSplit,
        },
        recentCustomers,
        monthlyRevenue,
        topPerformers,
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
