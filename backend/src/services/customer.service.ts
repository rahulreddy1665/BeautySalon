import { CreateCustomerDto, UpdateCustomerDto } from "../dto/main.dto";
import { Customer } from "../models/customer.model";

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

/**
 * Unpaginated list. Only for pickers not yet moved to server search
 * (appointment form, loyalty, global search). Prefer `getCustomers`.
 */
export const getAllCustomers = async () => {
  try {
    return { statusCode: 200, data: await Customer.find().lean() };
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

/** Upsert by phone. Phone is required; name and email are optional. */
export const importCustomers = async (
  rows: Array<{ name?: unknown; phone?: unknown; email?: unknown }>,
) => {
  const results: CustomerImportRowResult[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const raw = rows[i] ?? {};
    const name = String(raw.name ?? "").trim();
    const email = String(raw.email ?? "").trim().toLowerCase();
    const phoneRaw = String(raw.phone ?? "").trim();

    if (!name && !phoneRaw && !email) continue; // blank spreadsheet row

    const phone = normalizePhone(phoneRaw);
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

    try {
      const existing = await Customer.findOne({ phone });
      if (existing) {
        // Blank cells never wipe existing values.
        const nextName = name || existing.name;
        const nextEmail = email || existing.email;
        if (nextName === existing.name && nextEmail === existing.email) {
          results.push({
            row: rowNum,
            status: "skipped",
            reason: "No changes",
            name: nextName,
            phone: String(phone),
          });
          continue;
        }
        existing.name = nextName;
        if (name) existing.lastName = "";
        existing.email = nextEmail;
        await existing.save();
        results.push({
          row: rowNum,
          status: "updated",
          name: nextName,
          phone: String(phone),
        });
      } else {
        await Customer.create({
          name,
          phone,
          email: email || undefined,
        });
        results.push({
          row: rowNum,
          status: "created",
          name,
          phone: String(phone),
        });
      }
    } catch (error) {
      results.push({
        row: rowNum,
        status: "error",
        reason: error instanceof Error ? error.message : "Could not save",
        name,
        phone: String(phone),
      });
    }
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
