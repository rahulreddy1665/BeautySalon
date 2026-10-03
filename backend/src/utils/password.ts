import bcrypt from "bcrypt";
import crypto from "crypto";

const USERNAME_RE = /^[a-z0-9._]{4,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function normalizeUsername(username: string): string {
  return String(username || "").trim().toLowerCase();
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Random temp password: 10 chars, letters+digits */
export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function publicUser(user: {
  _id: unknown;
  name: string;
  email?: string | null;
  username?: string | null;
  role?: { name?: string } | string;
  mustChangePassword?: boolean;
  staff?: unknown;
  permissions?: string[];
  canViewRevenue?: boolean;
  canExport?: boolean;
  maxDiscountPercent?: number;
}) {
  const roleName =
    typeof user.role === "object" && user.role
      ? user.role.name
      : typeof user.role === "string"
        ? user.role
        : undefined;
  return {
    id: user._id,
    name: user.name,
    email: user.email ?? null,
    username: user.username ?? null,
    role: roleName,
    mustChangePassword: Boolean(user.mustChangePassword),
    staffId: user.staff ? String(user.staff) : null,
    permissions: user.permissions ?? [],
    canViewRevenue: user.canViewRevenue ?? roleName === "admin",
    canExport: user.canExport ?? roleName === "admin",
    maxDiscountPercent:
      user.maxDiscountPercent ?? (roleName === "admin" ? 100 : 0),
  };
}
