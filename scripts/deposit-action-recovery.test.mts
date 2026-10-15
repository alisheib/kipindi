/** S9: the real deposit action preserves uncertain money and releases only a proven no-row tab key. */
import "./lib/verified-fixtures.mts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { db } from "../src/lib/server/store.ts";
import { prisma } from "../src/lib/server/prisma.ts";
import { depositRefusalDisposition } from "../src/lib/server/deposit-action-recovery.ts";
import { fundingStorageKey, releaseStoredFunding, writeStoredFunding } from "../src/lib/journey/funding-storage.ts";

const root = resolve(import.meta.dirname, "..");
const pg = process.argv.includes("--pg");
const red = process.argv.includes("--prove-red");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== pg))
  throw new Error("deposit-action-recovery requires memory, or explicit scratch PostgreSQL --pg");
if (pg) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    || url.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) throw new Error("scratch port only");
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const normal = (path: string) => realpathSync(path).replace(/\\/g, "/").toLowerCase();
  if (normal(rows[0]?.data_directory ?? "") !== normal(join(root, ".pgscratch"))) throw new Error("scratch cluster only");
}
const actionSource = readFileSync(join(root, "src/app/wallet/deposit/actions.ts"), "utf8");
const file = ts.createSourceFile("actions.ts", actionSource, ts.ScriptTarget.Latest, true);
const declaration = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "depositAction");
assert.ok(declaration && ts.isFunctionDeclaration(declaration), "actual depositAction body exists");
const js = ts.transpileModule(declaration.getText(file).replace(/^export /, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const owner = `s9_action_${randomUUID().slice(0, 8)}`;
const foreign = `s9_foreign_${randomUUID().slice(0, 8)}`;
const now = new Date().toISOString();
let phoneSeq = 0;
async function account(userId: string) {
  const phone = `+2557${String((Date.now() + ++phoneSeq) % 100_000_000).padStart(8, "0")}`;
  await db.user.create({ id: userId, phoneE164: phone, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "S9 action fixture",
    dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null, emailVerifiedAt: null,
    createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wal_${userId}`, userId, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
}
await account(owner);
await account(foreign);
const key = () => randomUUID();
async function row(userId: string, idempotencyKey: string, status: "PROCESSING" | "FAILED") {
  return db.txn.create({ id: `txn_${randomUUID()}`, walletId: `wal_${userId}`, userId, type: "DEPOSIT", status,
    amount: 5_000, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null,
    msisdn: "+255712345678", description: "S9 action fixture", positionId: null, amlReason: null,
    createdAt: now, updatedAt: now, completedAt: null, idempotencyKey } as never);
}
let passed = 0;
function ok(label: string, fact: boolean) { assert.ok(fact, label); passed++; process.stdout.write(`  ✓ ${label}\n`); }
function action(disposition = depositRefusalDisposition) {
  let calls = 0;
  const t = { error: { somethingDidntWork: "Something went wrong" }, wallet: {
    depositBounds: "Deposit {min} to {max}", billingIncomplete: "Billing incomplete", msisdnRequired: "Phone needed",
  }, common: { monthsShort: [] } };
  const dependencies = {
    currentSession: async () => ({ userId: owner }), signInPathForAction: async () => "/auth/login",
    getServerT: async () => ({ t, locale: "en" }), resolveSimpleJourney: async () => ({ journey: true }),
    redirect: (url: string): never => { throw new Error(`REDIRECT:${url}`); },
    signFlash: (kind: string, message: string) => `${kind}|${message}`, revalidatePath: () => {},
    depositRefusalDisposition: disposition, deposit: async () => { calls++; return { ok: false, code: "SUSPENDED", error: "Break active" }; },
    errorCopy: (_t: unknown, result: { error: string }) => result.error,
    formatBreakEnd: () => "", formatNumber: String, displayLabel: () => "Fixture",
    parseSavedDepositBet: () => null, isMobileMoneyMethodId: (provider: string) => provider === "MPESA",
    DEPOSIT_MIN_TZS: 1_000, DEPOSIT_MAX_TZS: 10_000_000, db,
    BASE_URL: () => "https://www.50pick.tz",
  };
  const fn = new Function(...Object.keys(dependencies), `${js}\nreturn depositAction;`)(...Object.values(dependencies)) as (data: FormData) => Promise<never>;
  return { fn, calls: () => calls };
}
function form(fundingKey: string, flow = "journey", msisdn = "712345678") {
  const data = new FormData();
  data.set("flow", flow); data.set("expectedOwner", owner); data.set("idempotencyKey", fundingKey);
  data.set("provider", flow === "card" ? "CARD" : "MPESA"); data.set("amount", "5000");
  if (msisdn) data.set("msisdn", msisdn);
  return data;
}
async function destination(fn: (data: FormData) => Promise<never>, data: FormData): Promise<URL> {
  try { await fn(data); throw new Error("Action returned without redirect"); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.ok(message.startsWith("REDIRECT:"), message);
    return new URL(message.slice("REDIRECT:".length), "https://www.50pick.tz");
  }
}
const noRowKey = key(), noRow = action();
const refused = await destination(noRow.fn, form(noRowKey));
ok("real action preserves a no-row gate refusal on the deposit form", refused.pathname === "/wallet/deposit"
  && refused.searchParams.get("error") === "deposit-error|Break active" && noRow.calls() === 1);
ok("the refusal carries only an owner/key-bound signed release", refused.searchParams.get("release") === `deposit-release-key|${owner}:${noRowKey}`);

const heldKey = key(); await row(owner, heldKey, "PROCESSING");
const held = await destination(action().fn, form(heldKey));
ok("persisted same-key in-flight money remains in owned recovery", held.pathname === "/wallet/deposit/wait"
  && held.searchParams.get("key") === heldKey && !held.searchParams.has("release"));
const failedKey = key(); await row(owner, failedKey, "FAILED");
const failed = await destination(action().fn, form(failedKey));
ok("a failed reserved payment still needs authoritative recheck before a new key", failed.pathname === "/wallet/deposit/wait"
  && failed.searchParams.get("key") === failedKey);
const foreignKey = key(); await row(foreign, foreignKey, "PROCESSING");
const collided = await destination(action().fn, form(foreignKey));
ok("a foreign key exposes no receipt and cannot release its tab identity", collided.pathname === "/wallet/deposit"
  && !collided.searchParams.has("release") && !collided.searchParams.has("key"));

const missingPhoneKey = key(), preflight = action();
const missingPhone = await destination(preflight.fn, form(missingPhoneKey, "journey", ""));
ok("pre-dispatch form refusal releases only after the same locked no-row proof", missingPhone.pathname === "/wallet/deposit"
  && missingPhone.searchParams.get("error") === "deposit-error|Phone needed"
  && missingPhone.searchParams.get("release") === `deposit-release-key|${owner}:${missingPhoneKey}` && preflight.calls() === 0);
const cardKey = key(), card = action();
const cardRefused = await destination(card.fn, form(cardKey, "card"));
ok("Card billing refusal returns to its form with the exact-key release", cardRefused.pathname === "/wallet/deposit/card"
  && cardRefused.searchParams.get("error") === "deposit-error|Billing incomplete"
  && cardRefused.searchParams.get("release") === `deposit-release-key|${owner}:${cardKey}` && card.calls() === 0);
const outageKey = key();
const uncertain = await destination(action(async () => { throw new Error("DB unavailable"); }).fn, form(outageKey));
ok("a failed proof stays on original-key recovery", uncertain.pathname === "/wallet/deposit/wait"
  && uncertain.searchParams.get("key") === outageKey);
const classic = await destination(action().fn, form(key(), ""));
ok("classic direct deposits retain their existing localized refusal route", classic.pathname === "/wallet/deposit"
  && classic.searchParams.get("error") === "deposit-error|Break active" && !classic.searchParams.has("release"));

const items = new Map<string, string>();
const box = { getItem: (name: string) => items.get(name) ?? null,
  setItem: (name: string, value: string) => { items.set(name, value); },
  removeItem: (name: string) => { items.delete(name); } } as unknown as Storage;
const saved = { v: 1 as const, key: noRowKey, owner, startedAt: Date.now(), attempts: 1 as const };
ok("a signed no-row release removes only the exact owned identity", writeStoredFunding(box, owner, saved)
  && releaseStoredFunding(box, foreign, noRowKey) && !releaseStoredFunding(box, owner, key())
  && box.getItem(fundingStorageKey(owner)) !== null
  && releaseStoredFunding(box, owner, noRowKey) && box.getItem(fundingStorageKey(owner)) === null);
if (red) {
  const mutedNoRow = await destination(action(async () => "recover").fn, form(key()));
  ok("plant: unconditional wait route fails the no-row refusal control", mutedNoRow.pathname !== refused.pathname);
  const mutedHeld = await destination(action(async () => "release").fn, form(heldKey));
  ok("plant: unconditional release fails persisted-money recovery", mutedHeld.pathname !== held.pathname);
}
console.log(`deposit-action-recovery ${pg ? "PostgreSQL" : "memory"}: ${passed}/${passed}`);
await prisma()?.$disconnect();
