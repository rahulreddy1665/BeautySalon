/** Allowed designation permission keys (resource:action). */
export const ALLOWED_PERMISSIONS = [
  "dashboard:read",
  "customer:read",
  "customer:create",
  "customer:update",
  "customer:delete",
  "invoice:read",
  "invoice:create",
  "invoice:update",
  "invoice:delete",
  "appointment:read",
  "appointment:create",
  "appointment:update",
  "appointment:delete",
  "staff:read",
  "staff:create",
  "staff:update",
  "staff:delete",
  "service:read",
  "service:create",
  "service:update",
  "service:delete",
  "product:read",
  "product:create",
  "product:update",
  "product:delete",
  "loyalty:read",
  "loyalty:update",
  "loyalty:adjust",
  "report:read",
  "settings:read",
  "settings:update",
] as const;

export type AllowedPermission = (typeof ALLOWED_PERMISSIONS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_PERMISSIONS);

export function isAllowedPermission(key: string): key is AllowedPermission {
  return ALLOWED_SET.has(key);
}

export function filterValidPermissions(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const out: string[] = [];
  for (const k of keys) {
    if (typeof k === "string" && isAllowedPermission(k) && !out.includes(k)) {
      out.push(k);
    }
  }
  return out;
}

export function validatePermissionsOrError(
  keys: unknown,
): { ok: true; permissions: string[] } | { ok: false; unknown: string[] } {
  if (!Array.isArray(keys)) {
    return { ok: false, unknown: ["(not an array)"] };
  }
  const unknown: string[] = [];
  const permissions: string[] = [];
  for (const k of keys) {
    if (typeof k !== "string" || !isAllowedPermission(k)) {
      unknown.push(String(k));
      continue;
    }
    if (!permissions.includes(k)) permissions.push(k);
  }
  if (unknown.length) return { ok: false, unknown };
  return { ok: true, permissions };
}
