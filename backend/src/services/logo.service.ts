import { createHash } from "node:crypto";

import { Logo } from "../models/logo.model";

/** Logos are immutable (id = content hash), so caching them in memory is always safe. */
const cache = new Map<string, { base64: string; mimeType: string }>();
const MAX_CACHED = 20;

function remember(id: string, logo: { base64: string; mimeType: string }) {
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  cache.set(id, logo);
}

export function logoIdFor(base64: string, mimeType: string): string {
  return createHash("sha256").update(mimeType).update("\0").update(base64).digest("hex");
}

/**
 * Stores the logo if it isn't stored yet and returns its id (null when there is
 * no logo). After the first call per logo this is a pure in-memory lookup.
 */
export async function ensureLogo(
  base64: string | null | undefined,
  mimeType: string | null | undefined,
): Promise<string | null> {
  if (!base64 || !mimeType) return null;
  const id = logoIdFor(base64, mimeType);
  if (cache.has(id)) return id;
  await Logo.updateOne(
    { _id: id },
    { $setOnInsert: { base64, mimeType } },
    { upsert: true },
  );
  remember(id, { base64, mimeType });
  return id;
}

export async function getLogo(
  id: string | null | undefined,
): Promise<{ base64: string; mimeType: string } | null> {
  if (!id) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const doc = await Logo.findById(id).lean();
  if (!doc) return null;
  const logo = { base64: doc.base64, mimeType: doc.mimeType };
  remember(id, logo);
  return logo;
}

type WithBusinessSnapshot = {
  businessSnapshot?: {
    logoId?: string | null;
    logoBase64?: string | null;
    logoMimeType?: string | null;
  } | null;
};

/**
 * Fills businessSnapshot.logoBase64 / logoMimeType from the logo store so API
 * responses keep their existing shape. Only for single-invoice responses; the
 * caller must not save the document afterwards (that would re-embed the logo).
 */
export async function withInvoiceLogo<T extends WithBusinessSnapshot | null>(
  invoice: T,
): Promise<T> {
  const snap = invoice?.businessSnapshot;
  if (!snap || snap.logoBase64 || !snap.logoId) return invoice;
  const logo = await getLogo(snap.logoId);
  if (logo) {
    snap.logoBase64 = logo.base64;
    snap.logoMimeType = logo.mimeType;
  }
  return invoice;
}
