/**
 * Moves embedded invoice logos into the shared `logos` collection.
 *
 * Before: every invoice carried businessSnapshot.logoBase64 (~300 KB).
 * After:  invoices carry businessSnapshot.logoId; each distinct logo is stored once.
 *
 * Idempotent: only touches invoices that still embed a logo. Safe to re-run.
 *   npm run migrate:invoice-logos -- --dry-run   # report only
 *   npm run migrate:invoice-logos                # apply
 */
import "dotenv/config";
import mongoose from "mongoose";

import { Invoice } from "../models/invoice.model";
import { ensureLogo } from "../services/logo.service";

const BATCH = 100;
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(uri);

  const filter = { "businessSnapshot.logoBase64": { $type: "string", $ne: "" } };
  const pending = await Invoice.countDocuments(filter);
  console.log(`${pending} invoice(s) embed a logo${dryRun ? " (dry run, nothing will change)" : ""}`);
  if (dryRun || pending === 0) return;

  const cursor = Invoice.find(filter)
    .select("businessSnapshot.logoBase64 businessSnapshot.logoMimeType")
    .lean()
    .cursor({ batchSize: BATCH });

  let ops: Parameters<typeof Invoice.bulkWrite>[0] = [];
  let migrated = 0;
  const logos = new Set<string>();
  const flush = async () => {
    if (ops.length === 0) return;
    await Invoice.bulkWrite(ops, { ordered: false });
    migrated += ops.length;
    ops = [];
    console.log(`  migrated ${migrated}/${pending}`);
  };

  for await (const inv of cursor) {
    const snap = inv.businessSnapshot;
    const logoId = await ensureLogo(snap?.logoBase64, snap?.logoMimeType || "image/png");
    if (logoId) logos.add(logoId);
    ops.push({
      updateOne: {
        // Re-check the condition so a concurrent run can't double-process.
        filter: { _id: inv._id, "businessSnapshot.logoBase64": { $type: "string", $ne: "" } },
        update: {
          $set: { "businessSnapshot.logoId": logoId },
          $unset: { "businessSnapshot.logoBase64": "", "businessSnapshot.logoMimeType": "" },
        },
      },
    });
    if (ops.length >= BATCH) await flush();
  }
  await flush();
  console.log(`done: ${migrated} invoice(s) now reference ${logos.size} stored logo(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
