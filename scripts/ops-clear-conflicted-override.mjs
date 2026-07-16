/**
 * OPS (audit C7): set the persisted `test.overrides.allowConflictedResolution`
 * flag to FALSE in whatever database DATABASE_URL points at. Run via:
 *
 *   railway run --service 50pick -- node scripts/ops-clear-conflicted-override.mjs
 *
 * Safe: touches ONLY the SystemConfig 'test.overrides' row (a config flag, never
 * money data). Reads-before-writes and prints both. The POCA §16 control is
 * enforced at runtime regardless; this clears the alarm and records the intent.
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL — run under `railway run --service 50pick`.");
    process.exit(1);
  }
  const key = "test.overrides";
  const before = await p.systemConfig.findUnique({ where: { key } });
  console.log("BEFORE:", JSON.stringify(before?.value ?? null));
  const next = { ...(before?.value ?? {}), allowConflictedResolution: false };
  await p.systemConfig.upsert({ where: { key }, create: { key, value: next }, update: { value: next } });
  const after = await p.systemConfig.findUnique({ where: { key } });
  console.log("AFTER: ", JSON.stringify(after?.value ?? null));
  console.log("OK — allowConflictedResolution is now false.");
  await p.$disconnect();
}

main().catch(async (e) => { console.error(e); await p.$disconnect(); process.exit(1); });
