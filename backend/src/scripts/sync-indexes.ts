/**
 * Makes the database's indexes match the schemas: creates missing ones and drops
 * ones no schema declares any more. Run after deploying schema/index changes:
 *   npm run sync-indexes -- --dry-run   # show what would change
 *   npm run sync-indexes                # apply
 *
 * Production boots with autoIndex off, so this is how indexes get built there.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(uri, { autoIndex: false });

  // Register every model.
  const modelsDir = path.join(__dirname, "..", "models");
  for (const file of fs.readdirSync(modelsDir)) {
    if (/\.model\.(ts|js)$/.test(file)) await import(path.join(modelsDir, file));
  }

  for (const name of mongoose.modelNames().sort()) {
    const model = mongoose.model(name);
    const diff = await model.diffIndexes();
    const toCreate = diff.toCreate.map((spec) => JSON.stringify(spec));
    if (!toCreate.length && !diff.toDrop.length) {
      console.log(`${name}: up to date`);
      continue;
    }
    console.log(`${name}: create ${toCreate.join(", ") || "-"} | drop ${diff.toDrop.join(", ") || "-"}`);
    if (!dryRun) {
      await model.syncIndexes();
      console.log(`  ${name}: synced`);
    }
  }
  if (dryRun) console.log("\n(dry run, nothing changed)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
