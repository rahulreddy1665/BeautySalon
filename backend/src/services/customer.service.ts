import { CreateCustomerDto, UpdateCustomerDto } from "../dto/main.dto";
import mongoose from "mongoose";

import { Customer } from "../models/customer.model";
import { Invoice } from "../models/invoice.model";

export const createCustomer = async (data: CreateCustomerDto) => {
  try {
    return { statusCode: 200, data: await Customer.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export interface CustomerListQuery {
  page?: unknown;
  limit?: unknown;
  /** Matches name / last name (contains) or phone digits (contains). */
  q?: unknown;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Paginated + searchable list. Newest customers first. */
export const getCustomers = async (query: CustomerListQuery = {}) => {
  try {
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit)) || 20));
    const q = String(query.q ?? "").trim();

    const filter: Record<string, unknown> = {};
    if (q) {
      const or: Record<string, unknown>[] = [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { lastName: { $regex: escapeRegex(q), $options: "i" } },
        { email: { $regex: escapeRegex(q), $options: "i" } },
      ];
      const digits = q.replace(/\D/g, "");
      if (digits) {
        // phone is stored as a Number; a full 10-digit query hits the unique index,
        // partial digits fall back to a string match.
        or.push(
          digits.length === 10
            ? { phone: Number(digits) }
            : {
                $expr: {
                  $regexMatch: { input: { $toString: "$phone" }, regex: digits },
                },
              },
        );
      }
      filter.$or = or;
    }

    const [items, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
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

export const getCustomerById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Customer.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateCustomer = async (id: string, data: UpdateCustomerDto) => {
  try {
    const customer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: customer };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    return { statusCode: 200, data: await Customer.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

/** Indian mobile: optional +91 / 91 / 0, then 10 digits starting 6–9. */
const INDIAN_PHONE = /^(?:\+?91[\s-]?|0)?([6-9]\d{9})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(value: unknown): number | null {
  const raw = String(value ?? "").replace(/[\s-]/g, "");
  const match = INDIAN_PHONE.exec(raw);
  return match ? Number(match[1]) : null;
}

export type CustomerImportRowResult = {
  row: number;
  status: "created" | "updated" | "skipped" | "error";
  reason?: string;
  name?: string;
  phone?: string;
};

const IMPORT_CHUNK = 1000;

/** Where a phone stands while the import runs (DB state + earlier rows in the file). */
type ImportState = {
  name: string;
  email?: string;
  lastName?: string;
  /** Exists in the DB (before this import, or written by an earlier chunk). */
  stored: boolean;
  /** Has changes not yet written. */
  dirty: boolean;
  /** Result rows that produced the pending change (marked failed if the write fails). */
  pendingRows: number[];
};

/**
 * Upsert by phone. Phone is required; name and email are optional.
 *
 * Gives the same per-row results as processing rows one by one (a phone that
 * appears twice is created by the first row and updated/skipped by later ones),
 * but talks to the DB in chunks: one `$in` lookup + one `bulkWrite` per 1,000
 * rows, instead of two round trips per row.
 */
export const importCustomers = async (
  rows: Array<{ name?: unknown; phone?: unknown; email?: unknown }>,
) => {
  const results: CustomerImportRowResult[] = [];
  const states = new Map<number, ImportState>();

  for (let start = 0; start < rows.length; start += IMPORT_CHUNK) {
    const chunk = rows.slice(start, start + IMPORT_CHUNK);

    // 1. Validate + normalise (no DB).
    const parsed = chunk.map((raw, k) => {
      const rowNum = start + k + 2;
      const name = String(raw?.name ?? "").trim();
      const email = String(raw?.email ?? "").trim().toLowerCase();
      const phoneRaw = String(raw?.phone ?? "").trim();
      return { rowNum, name, email, phoneRaw, phone: normalizePhone(phoneRaw) };
    });

    // 2. One lookup for every phone in this chunk we haven't seen yet.
    const unseen = [
      ...new Set(
        parsed
          .map((r) => r.phone)
          .filter((p): p is number => p !== null && !states.has(p)),
      ),
    ];
    if (unseen.length) {
      const found = await Customer.find({ phone: { $in: unseen } })
        .select("phone name email lastName")
        .lean();
      for (const c of found) {
        states.set(Number(c.phone), {
          // Same default the schema applies to a loaded document.
          name: c.name ?? "",
          email: c.email ?? undefined,
          lastName: c.lastName ?? undefined,
          stored: true,
          dirty: false,
          pendingRows: [],
        });
      }
    }

    // 3. Decide each row in file order, exactly as the row-by-row version did.
    for (const { rowNum, name, email, phoneRaw, phone } of parsed) {
      if (!name && !phoneRaw && !email) continue; // blank spreadsheet row

      if (phone === null) {
        results.push({
          row: rowNum,
          status: "error",
          reason: phoneRaw
            ? "Phone must be a valid 10-digit Indian mobile number"
            : "Phone is required",
          name,
          phone: phoneRaw,
        });
        continue;
      }
      if (email && !EMAIL.test(email)) {
        results.push({
          row: rowNum,
          status: "error",
          reason: "Invalid email",
          name,
          phone: String(phone),
        });
        continue;
      }

      const state = states.get(phone);
      if (state) {
        // Blank cells never wipe existing values.
        const nextName = name || state.name;
        const nextEmail = email || state.email;
        if (nextName === state.name && nextEmail === state.email) {
          results.push({
            row: rowNum,
            status: "skipped",
            reason: "No changes",
            name: nextName,
            phone: String(phone),
          });
          continue;
        }
        state.name = nextName;
        if (name) state.lastName = "";
        state.email = nextEmail;
        state.dirty = true;
        state.pendingRows.push(results.length);
        results.push({ row: rowNum, status: "updated", name: nextName, phone: String(phone) });
      } else {
        states.set(phone, {
          name,
          email: email || undefined,
          stored: false,
          dirty: true,
          pendingRows: [results.length],
        });
        results.push({ row: rowNum, status: "created", name, phone: String(phone) });
      }
    }

    // 4. One write per phone (its final state), all in one bulkWrite.
    const pending = [...states.entries()].filter(([, st]) => st.dirty);
    if (pending.length === 0) continue;
    const ops = pending.map(([phone, st]) => {
      const fields: Record<string, unknown> = { name: st.name };
      if (st.email !== undefined) fields.email = st.email;
      if (st.lastName !== undefined) fields.lastName = st.lastName;
      return st.stored
        ? { updateOne: { filter: { phone }, update: { $set: fields } } }
        : { insertOne: { document: { ...fields, phone } } };
    });

    const failedOps = new Map<number, string>();
    try {
      await Customer.bulkWrite(ops as Parameters<typeof Customer.bulkWrite>[0], {
        ordered: false,
      });
    } catch (error) {
      const writeErrors =
        (error as { writeErrors?: Array<{ index: number; errmsg?: string }> }).writeErrors ?? [];
      if (writeErrors.length === 0) {
        // Whole batch failed (e.g. connection): every pending row failed.
        pending.forEach((_, i) =>
          failedOps.set(i, error instanceof Error ? error.message : "Could not save"),
        );
      }
      for (const w of writeErrors) failedOps.set(w.index, w.errmsg ?? "Could not save");
    }

    pending.forEach(([phone, st], i) => {
      const failure = failedOps.get(i);
      if (failure) {
        for (const idx of st.pendingRows) {
          const r = results[idx]!;
          results[idx] = { row: r.row, status: "error", reason: failure, name: r.name, phone: r.phone };
        }
        // Not written: forget it so later rows re-read the DB as it really is.
        states.delete(phone);
      } else {
        st.stored = true;
        st.dirty = false;
      }
      st.pendingRows = [];
    });
  }

  const summary = {
    created: results.filter((r) => r.status === "created").length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error: results.filter((r) => r.status === "error").length,
    total: results.length,
  };
  return { statusCode: 200, data: { results, summary } };
};

/**
 * Visit count, lifetime spend and last visit over ALL of the customer's
 * invoices, in one aggregation (uses the {customer, createdAt} index).
 * Spend matches the visit table: amountPayable, falling back to grandTotal.
 */
export const getCustomerSummary = async (id: string) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return { statusCode: 404, data: null, message: "Customer not found" };
    }
    const [row] = await Invoice.aggregate<{
      visits: number;
      lifetimeSpend: number;
      lastVisitAt: Date | null;
    }>([
      { $match: { customer: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          visits: { $sum: 1 },
          lifetimeSpend: {
            $sum: { $ifNull: ["$amountPayable", { $ifNull: ["$grandTotal", 0] }] },
          },
          lastVisitAt: { $max: "$createdAt" },
        },
      },
    ]);
    return {
      statusCode: 200,
      data: {
        visits: row?.visits ?? 0,
        lifetimeSpend: Math.round((row?.lifetimeSpend ?? 0) * 100) / 100,
        lastVisitAt: row?.lastVisitAt ?? null,
      },
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
