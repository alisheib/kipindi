/**
 * OPS: set the persisted payment provider (SystemConfig `payments.control`).
 *
 * WHY: getPaymentProvider() is `store.provider ?? envProvider()`, so a persisted
 * `mock` OUTRANKS `PAYMENT_AGGREGATOR=selcom`. Until this row says `selcom`, every
 * deposit is refused with PROVIDER_DOWN and the boot log warns on each deploy.
 *
 * The admin UI is the normal path because it carries a named actor. This script
 * therefore REQUIRES an --actor so the change is never anonymous in the trail.
 *
 *   DATABASE_URL=<url> node scripts/ops-set-payment-provider.mjs selcom --actor="Ali Sheib"
 *
 * Scope: touches ONLY SystemConfig 'payments.control' — a config flag. Never a
 * wallet, never a transaction, never money data. Reads before it writes and prints
 * both. Refuses selcom unless all four Selcom credentials are present, mirroring
 * paymentProviderConfigured(): selecting a provider whose creds are missing turns
 * "deposits refused" into "deposits fail mid-flight", which is worse for a player.
 */
import { PrismaClient } from "@prisma/client";

const KEY = "payments.control";
const ALL = ["mock", "selcom", "azampay"];
const want = (process.argv[2] ?? "").trim();
const actorArg = process.argv.find((a) => a.startsWith("--actor="));
const actor = actorArg ? actorArg.slice("--actor=".length) : "";

if (!ALL.includes(want)) { console.error(`Usage: node scripts/ops-set-payment-provider.mjs <${ALL.join("|")}> --actor="Name"`); process.exit(1); }
if (!actor) { console.error("ABORT — --actor is required; this change must never be anonymous."); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("No DATABASE_URL."); process.exit(1); }
if (want === "selcom") {
  const missing = ["PAYMENT_API_KEY","PAYMENT_API_SECRET","PAYMENT_VENDOR_ID","PAYMENT_API_URL"].filter((v) => !process.env[v]);
  if (missing.length) { console.error(`ABORT — selcom selected but unset: ${missing.join(", ")}`); process.exit(2); }
}

const p = new PrismaClient();
const before = await p.systemConfig.findUnique({ where: { key: KEY } });
console.log("BEFORE:", JSON.stringify(before?.value ?? null));
const next = { ...(before?.value ?? {}), provider: want };
await p.systemConfig.upsert({ where: { key: KEY }, create: { key: KEY, value: next }, update: { value: next } });
const after = await p.systemConfig.findUnique({ where: { key: KEY } });
console.log("AFTER: ", JSON.stringify(after?.value ?? null));
console.log(`OK — persisted payment provider is now '${want}' (actor: ${actor}).`);
console.log("NOTE: config is cached in-process — redeploy for it to take effect.");
await p.$disconnect();
