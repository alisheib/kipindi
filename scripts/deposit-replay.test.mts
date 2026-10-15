/**
 * S9 prerequisites: execute the shipped deposit/return function bodies against the REAL memory or Prisma DAL,
 * wallet locks, schemas and funding comparison. Provider dispatch/verification and notifications are controlled
 * counters: no external request is possible, and this is not proof of payment settlement (S9 WP3 owns that).
 * Red plants stay in memory. The catch fixture hides the two pre-create reads, then exercises the real PG unique
 * constraint; the memory fixture supplies that same constraint because its txn.create does not enforce one.
 */
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { DepositSchema, AdminDepositSchema } from "../src/lib/server/validators.ts";
import { parseSavedDepositBet, sameDepositFunding } from "../src/lib/journey/deposit-state.ts";
import * as DepositState from "../src/lib/journey/deposit-state.ts";
import * as DepositBinding from "../src/lib/journey/deposit-recheck-binding.ts";
import { depositResultStatus } from "../src/lib/wallet/receipts.ts";
import { paymentMethodName } from "../src/lib/payment-providers.ts";
import { presentedStatus } from "../src/lib/wallet/receipts.ts";
import { formatDateTime, formatTzs } from "../src/lib/utils.ts";
import { resolveAnchor, injectDefect } from "./red-anchor.mjs";
import { activeCardCheckoutUrl, trustedCardCheckoutUrl } from "../src/lib/card-checkout-url.ts";
import { MUTATIONS } from "./anchors/deposit-replay.anchors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = readFileSync(join(ROOT, "src/lib/server/wallet-service.ts"), "utf8");
const MAPPER = readFileSync(join(ROOT, "src/lib/server/prisma-dal.ts"), "utf8");
const STATUS = readFileSync(join(ROOT, "src/lib/server/deposit-status.ts"), "utf8");
const CHECKOUT_ROUTE = readFileSync(join(ROOT, "src/app/wallet/deposit/checkout/[id]/route.ts"), "utf8");
const PG = process.argv.includes("--pg");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== PG)) {
  throw new Error("deposit-replay requires memory with DATABASE_URL unset, or explicit --pg on its own scratch cluster");
}
if (PG) {
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname) || target.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) {
    throw new Error("deposit-replay refuses a non-loopback or unrelated scratch port");
  }
}
const { db } = await import("../src/lib/server/store.ts");
const { withLock } = await import("../src/lib/server/locks.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
if (PG) {
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const normal = (p: string) => realpathSync(p).replace(/\\/g, "/").toLowerCase();
  if (normal(rows[0]?.data_directory ?? "") !== normal(join(ROOT, ".pgscratch"))) throw new Error("deposit-replay refuses another checkout's cluster");
}

let sequence = 0;
type Check = { name: string; pass: boolean };
function body(source: string, name: string): string {
  const file = ts.createSourceFile("wallet-service.ts", source, ts.ScriptTarget.Latest, true);
  const fn = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  if (!fn) throw new Error(`Missing real service function ${name}`);
  return fn.getText(file).replace(/^export /, "");
}
function threshold(name: string): number {
  const file = ts.createSourceFile("wallet-service.ts", SOURCE, ts.ScriptTarget.Latest, true);
  let text: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) text = node.initializer?.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!text || !/^[0-9_]+$/.test(text)) throw new Error(`Nonliteral fixture threshold ${name}`);
  return Number(text.replaceAll("_", ""));
}
function serviceFor(source: string, data = db, statusSource = STATUS) {
  const counters = { dispatches: 0, dispatchIntents: [] as unknown[], verifies: 0, settles: 0, capReads: 0, audit: [] as unknown[], maintenance: false };
  const dependencies = {
    db: data, withLock, parseSavedDepositBet, sameDepositFunding, depositResultStatus, DepositSchema, AdminDepositSchema, paymentMethodName, presentedStatus, formatDateTime, formatTzs,
    isStoredFundingKey: DepositBinding.isStoredFundingKey, activeCardCheckoutUrl, trustedCardCheckoutUrl,
    rateCheckAsync: async () => ({ allowed: true }), randomId: () => String(++sequence).padStart(24, "0"),
    audit: (entry: unknown) => counters.audit.push(entry), auditNeedsReviewOnce: () => {}, isMaintenanceMode: async () => counters.maintenance,
    maintenanceMessage: async () => "Maintenance", isPaymentPaused: async () => false,
    isLockedOut: async () => ({ locked: false }), checkDepositLimit: async () => { counters.capReads++; return { allowed: true }; },
    SOF_SINGLE_TXN_TZS: threshold("SOF_SINGLE_TXN_TZS"), SOF_ROLLING_30D_TZS: threshold("SOF_ROLLING_30D_TZS"),
    readIdentityStanding: async () => ({ kycStatus: "NOT_STARTED", everApproved: false }),
    dispatchDeposit: async ({ correlationId }: { correlationId: string }) => {
      counters.dispatches++; counters.dispatchIntents.push((await data.txn.findByProviderRef(correlationId))?.pendingBet ?? null);
      return { ok: true, providerRef: correlationId, correlationId, status: "PENDING", redirectUrl: "https://checkout.selcommobile.com/pg/original" };
    },
    verifyDepositStatus: async () => { counters.verifies++; return { status: "PENDING" }; },
    settlePaymentWebhook: async () => { counters.settles++; throw new Error("Unexpected settlement in replay/scope proof"); },
    settleDepositConfirmed: async () => { throw new Error("Unexpected synchronous credit in replay proof"); }, notifyDeposit: () => {},
  };
  const statusImports: Record<string, unknown> = { "./store": { db: data }, "./audit": { audit: dependencies.audit },
    "./rate-limit": { rateCheckAsync: dependencies.rateCheckAsync }, "./payments": { verifyDepositStatus: dependencies.verifyDepositStatus },
    "@/lib/card-checkout-url": { activeCardCheckoutUrl },
    "./wallet-service": { settlePaymentWebhook: dependencies.settlePaymentWebhook }, "@/lib/journey/deposit-state": DepositState,
    "@/lib/journey/deposit-recheck-binding": DepositBinding };
  const statusModule = { exports: {} as any };
  const statusJs = ts.transpileModule(statusSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "module", "exports", statusJs)((id: string) => {
    if (!Object.hasOwn(statusImports, id)) throw new Error(`Unexpected core import ${id}`);
    return statusImports[id];
  }, statusModule, statusModule.exports);
  const adapterImport = 'const { readDepositStatus } = await import("./deposit-status");';
  if (source.split(adapterImport).length !== 2) throw new Error("The real return adapter no longer has its one shared-core import");
  const text = ["deposit", "settleDepositFromReturn", "friendlyProvider", "friendlyDepositReason"].map(n => body(source, n)).join("\n")
    .replace(adapterImport, "const { readDepositStatus } = statusCore;");
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = new Function(...Object.keys(dependencies), "statusCore", `${js}\nreturn { deposit, settleDepositFromReturn };`)(...Object.values(dependencies), statusModule.exports) as {
    deposit: (userId: string, input: any, key?: string, card?: any, savedBet?: any) => Promise<any>;
    settleDepositFromReturn: (userId: string, reference: string) => Promise<any>;
  };
  return { ...exports, counters, read: statusModule.exports.readDepositStatus as (id: string, lookup: unknown) => Promise<any> };
}
/**
 * The withdrawal KEY DOOR (S9 release candidate, Ali 2026-10-14): the shipped `withdraw` body, executed with its rate check
 * and the real `isStoredFundingKey`, and a DAL that is a TRAP — any read means the request got past the door. A refused
 * key must answer INVALID with nothing read; a minted UUID, the internal refund shape and the 256-character bound must pass.
 */
function withdrawDoorFor(source: string) {
  const reached: string[] = [];
  const trap = new Proxy({}, { get(_target, prop) { reached.push(String(prop)); throw new Error("PASSED_DOOR"); } });
  const dependencies = { rateCheckAsync: async () => ({ allowed: true }), isStoredFundingKey: DepositBinding.isStoredFundingKey, db: trap };
  const js = ts.transpileModule(body(source, "withdraw"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const withdraw = new Function(...Object.keys(dependencies), `${js}\nreturn withdraw;`)(...Object.values(dependencies)) as
    (userId: string, input: unknown, key?: string) => Promise<{ ok: boolean; code?: string }>;
  return { withdraw, reached };
}
const now = () => new Date().toISOString();
async function account() {
  const suffix = String(++sequence).padStart(7, "0"), id = `s9_replay_${suffix}`;
  await db.user.create({ id, phoneE164: `+25578${suffix}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Synthetic replay fixture", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 77_000, pending: 0, hold: 3_000, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
  return id;
}
async function transaction(userId: string, patch: Record<string, unknown> = {}) {
  const n = ++sequence, id = `txn_s9_replay_${n}`, key = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return db.txn.create({ id, walletId: `wal_${userId}`, userId, type: "DEPOSIT", status: "PROCESSING", amount: 5000, fee: 0, taxWithheld: 0,
    balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: `dep_s9_replay_${n}`, msisdn: "+255712345678", description: "Synthetic replay fixture",
    positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: null, idempotencyKey: key, origin: "low_balance", ...patch } as never);
}
const request = { provider: "MPESA", amount: 5000, msisdn: "0712 345 678" };
function hiddenBeforeCreate() {
  let createAttempted = false;
  return { ...db, txn: { ...db.txn,
    findByIdempotencyKey: async (key: string) => createAttempted ? db.txn.findByIdempotencyKey(key) : null,
    create: async (...args: Parameters<typeof db.txn.create>) => {
      createAttempted = true;
      if (!PG && args[0].idempotencyKey && await db.txn.findByIdempotencyKey(args[0].idempotencyKey)) throw Object.assign(new Error("Synthetic memory unique key"), { code: "P2002" });
      return db.txn.create(...args);
    },
  } };
}
async function run(source: string, mapper = MAPPER, statusSource = STATUS, checkoutRoute = CHECKOUT_ROUTE): Promise<Check[]> {
  const service = (text: string, data = db) => serviceFor(text, data, statusSource);
  const checks: Check[] = [], ok = (name: string, pass: boolean) => checks.push({ name, pass });
  const mapperJs = ts.transpileModule(body(mapper, "toStoredTxn"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const map = new Function("num", "numOrNull", "iso", `${mapperJs}\nreturn toStoredTxn;`)(Number, (n: unknown) => n == null ? null : Number(n), (d: Date | null) => d?.toISOString() ?? null);
  const badCurrency = map({ userId: "fixture", type: "DEPOSIT", amount: 5000, currency: "USD", provider: "MPESA", msisdn: "+255712345678", createdAt: new Date(), updatedAt: new Date(), completedAt: null });
  ok("dal.currency", badCurrency.currency === "USD" && !sameDepositFunding({ userId: "fixture", type: "DEPOSIT", currency: "TZS", ...request }, badCurrency));
  const me = await account(), other = await account(), base = await transaction(me), entry = service(source);
  const accepted = await entry.deposit(me, request, base.idempotencyKey!);
  ok("early.match", accepted.ok && accepted.data.txnId === base.id && accepted.data.status === "PROCESSING" && entry.counters.dispatches === 0);
  for (const phone of ["712345678", "+255712345678", "255712345678", "0712345678"]) {
    const normalized = await entry.deposit(me, { ...request, msisdn: phone }, base.idempotencyKey!);
    ok(`early.phone-${phone.length}`, normalized.ok && normalized.data.txnId === base.id);
  }
  for (const [name, caller, input, patch] of [
    ["owner", other, request, {}], ["amount", me, { ...request, amount: 6000 }, {}],
    ["provider", me, { ...request, provider: "MIXX" }, {}], ["phone", me, { ...request, msisdn: "0712345679" }, {}],
    ["type", me, request, { type: "WITHDRAWAL" }], ["currency", me, request, { currency: "USD" }],
    ["house", me, request, { houseBotId: "s9_synthetic_house" }], ["invalid-amount", me, { ...request, amount: NaN }, {}],
    ["missing-phone", me, { ...request, msisdn: undefined }, {}],
    ["unsupported-rail", me, { ...request, provider: "INTERNAL" }, { provider: "INTERNAL" }],
  ] as const) {
    const row = Object.keys(patch).length ? await transaction(me, patch) : base;
    const declined = await entry.deposit(caller, input, row.idempotencyKey!);
    ok(`early.${name}`, !declined.ok && declined.code === "INVALID" && declined.data === undefined && entry.counters.dispatches === 0);
  }
  entry.counters.maintenance = true;
  const maintenance = await entry.deposit(me, request, base.idempotencyKey!);
  ok("early.maintenance-recovery", maintenance.ok && maintenance.data.txnId === base.id && entry.counters.dispatches === 0);
  const card = await transaction(me, { provider: "CARD", msisdn: null }), cardService = service(source);
  for (const [i, billing] of [{ city: "Original" }, { city: "Edited after lost redirect" }].entries()) {
    const recovered = await cardService.deposit(me, { provider: "CARD", amount: 5000 }, card.idempotencyKey!, { billing });
    ok(`early.card-original-order-${i}`, recovered.ok && recovered.data.txnId === card.id && recovered.data.redirectUrl === undefined && cardService.counters.dispatches === 0);
  }
  const cardKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const cardFirst = await cardService.deposit(me, { provider: "CARD", amount: 5000 }, cardKey, { billing: { city: "Original" } });
  const cardRow = cardFirst.ok ? await db.txn.findById(cardFirst.data.txnId) : null;
  const cardAgain = await cardService.deposit(me, { provider: "CARD", amount: 5000 }, cardKey, { billing: { city: "Edited" } });
  ok("card.replay-url", cardFirst.ok && cardAgain.ok && cardFirst.data.redirectUrl === "https://checkout.selcommobile.com/pg/original"
    && cardAgain.data.redirectUrl === cardFirst.data.redirectUrl && cardRow?.cardCheckoutUrl === cardFirst.data.redirectUrl
    && cardService.counters.dispatches === 1);
  const cardStatus = await cardService.read(me, { kind: "funding-key", value: cardKey });
  ok("card.wait-offers-checkout", cardStatus.view.state === "PENDING" && cardStatus.view.checkoutAvailable === true);
  const cardForeign = await cardService.deposit(other, { provider: "CARD", amount: 5000 }, cardKey, { billing: { city: "Edited" } });
  ok("card.foreign-no-url", !cardForeign.ok && !cardForeign.data && cardService.counters.dispatches === 1);
  ok("card.url-owner-and-status", !!cardRow && activeCardCheckoutUrl(me, cardRow) === cardFirst.data?.redirectUrl
    && activeCardCheckoutUrl(other, cardRow) === null
    && activeCardCheckoutUrl(me, { ...cardRow, status: "FAILED" }) === null
    && activeCardCheckoutUrl(me, { ...cardRow, providerRef: null }) === null
    && activeCardCheckoutUrl(me, { ...cardRow, providerStatus: "deposit-terminal-review:v1" }) === null);
  let routeOwner: string | null = me;
  const routeModule = { exports: {} as any };
  const routeJs = ts.transpileModule(checkoutRoute, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "module", "exports", routeJs)((id: string) => {
    if (id === "next/server") return { NextResponse: { redirect: (url: string | URL, init?: ResponseInit) =>
      new Response(null, { status: init?.status ?? 307, headers: { location: String(url), ...Object.fromEntries(new Headers(init?.headers).entries()) } }) } };
    if (id === "@/lib/server/auth-service") return { currentSession: async () => routeOwner ? { userId: routeOwner } : null };
    if (id === "@/lib/server/store") return { db };
    if (id === "@/lib/card-checkout-url") return { activeCardCheckoutUrl };
    throw new Error(`Unexpected checkout-route import ${id}`);
  }, routeModule, routeModule.exports);
  const checkout = (id: string) => routeModule.exports.GET(new Request(`https://www.50pick.tz/wallet/deposit/checkout/${id}`), { params: Promise.resolve({ id }) }) as Promise<Response>;
  const ownedCheckout = await checkout(cardRow!.id);
  ok("card.route-owned", ownedCheckout.status === 303 && ownedCheckout.headers.get("location") === cardFirst.data?.redirectUrl
    && ownedCheckout.headers.get("cache-control") === "no-store" && ownedCheckout.headers.get("referrer-policy") === "no-referrer");
  routeOwner = other;
  const foreignCheckout = await checkout(cardRow!.id);
  ok("card.route-foreign", foreignCheckout.status === 404 && !foreignCheckout.headers.get("location"));
  routeOwner = me;
  if (cardRow) await db.txn.update(cardRow.id, { status: "CONFIRMED" });
  const paidCheckout = await checkout(cardRow!.id);
  ok("card.route-terminal", paidCheckout.headers.get("location")?.endsWith(`/wallet/deposit/wait/${cardRow!.id}`) === true);
  const cardPaid = await cardService.deposit(me, { provider: "CARD", amount: 5000 }, cardKey, { billing: { city: "Edited" } });
  ok("card.paid-no-checkout", cardPaid.ok && !cardPaid.data.redirectUrl && cardService.counters.dispatches === 1);
  ok("card.url-host-guard", trustedCardCheckoutUrl("https://checkout.selcommobile.com/pg/x") !== null
    && trustedCardCheckoutUrl("http://checkout.selcommobile.com/pg/x") === null
    && trustedCardCheckoutUrl("https://checkout.selcommobile.com.evil.test/pg/x") === null
    && trustedCardCheckoutUrl("https://unexpected.selcommobile.com/pg/x") === null
    && trustedCardCheckoutUrl("https://u:p@checkout.selcommobile.com/pg/x") === null
    && trustedCardCheckoutUrl("https://checkout.selcommobile.com:444/pg/x") === null);
  ok("early.create-only-origin", (await db.txn.findById(base.id))?.origin === "low_balance" && (await db.wallet.findByUserId(me))?.balance === 77_000);

  for (const [name, caller, input] of [["match", me, request], ["owner", other, request], ["amount", me, { ...request, amount: 6000 }]] as const) {
    let first = true;
    const data = { ...db, txn: { ...db.txn, findByIdempotencyKey: async (key: string) => {
      if (first) { first = false; return null; } return db.txn.findByIdempotencyKey(key);
    } } };
    const recovery = service(source, data), recovered = await recovery.deposit(caller, input, base.idempotencyKey!);
    ok(`locked.${name}`, name === "match" ? recovered.ok && recovered.data.txnId === base.id && recovery.counters.capReads === 0 && recovery.counters.dispatches === 0
      : !recovered.ok && recovered.code === "INVALID" && recovered.data === undefined && recovery.counters.capReads === 0 && recovery.counters.dispatches === 0);
  }

  for (const [name, caller, input] of [["match", me, request], ["owner", other, request], ["amount", me, { ...request, amount: 6000 }]] as const) {
    const recovery = service(source, hiddenBeforeCreate()), recovered = await recovery.deposit(caller, input, base.idempotencyKey!);
    ok(`catch.${name}`, name === "match" ? recovered.ok && recovered.data.txnId === base.id && recovery.counters.dispatches === 0
      : !recovered.ok && recovered.code === "INVALID" && recovered.data === undefined && recovery.counters.dispatches === 0);
  }
  const raceOwner = await account(), raceKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  let earlyReads = 0, release!: () => void;
  const barrier = new Promise<void>(r => { release = r; });
  const racedDb = { ...db, txn: { ...db.txn, findByIdempotencyKey: async (key: string) => {
    if (key === raceKey && earlyReads < 2) { if (++earlyReads === 2) release(); await barrier; return null; }
    return db.txn.findByIdempotencyKey(key);
  } } };
  const race = service(source, racedDb);
  const replies = await Promise.all([race.deposit(raceOwner, request, raceKey), race.deposit(raceOwner, request, raceKey)]);
  const rows = await db.txn.findByUser(raceOwner);
  ok("locked.same-intent-race", replies.every(r => r.ok) && replies[0].data.txnId === replies[1].data.txnId && rows.length === 1 && race.counters.dispatches === 1 && race.counters.capReads === 1);
  ok("locked.race-no-credit", (await db.wallet.findByUserId(raceOwner))?.balance === 77_000 && rows.every(t => t.status === "PROCESSING"));

  const returns = service(source), unknown = await returns.settleDepositFromReturn(me, "dep_s9_absent");
  ok("return.missing", unknown.state === "UNKNOWN" && unknown.txn === undefined && returns.counters.verifies === 0);
  const auditBeforeForeign = returns.counters.audit.length, foreign = await returns.settleDepositFromReturn(other, base.providerRef!);
  ok("return.foreign", foreign.state === "UNKNOWN" && foreign.txn === undefined && returns.counters.verifies === 0 && returns.counters.audit.length === auditBeforeForeign + 1);
  for (const [name, patch] of [["wrong-type", { type: "WITHDRAWAL" }], ["currency", { currency: "USD" }], ["house", { houseBotId: "s9_synthetic_house" }]] as const) {
    const row = await transaction(me, patch), before = returns.counters.verifies, auditBefore = returns.counters.audit.length;
    const answer = await returns.settleDepositFromReturn(me, row.providerRef!);
    ok(`return.${name}`, answer.state === "UNKNOWN" && answer.txn === undefined && returns.counters.verifies === before && returns.counters.settles === 0
      && returns.counters.audit.length === auditBefore + 1 && (await db.txn.findById(row.id))?.status === "PROCESSING");
  }
  const paid = await transaction(me, { provider: "CARD", msisdn: null }), result = await returns.settleDepositFromReturn(me, paid.providerRef!);
  ok("return.owned-control", result.state === "PENDING" && result.txn.id === paid.id && returns.counters.verifies === 1 && returns.counters.settles === 0);
  const saved = { v: 1, bet: "mkt_saved01.YES.5000", returnPath: "/live" }, savedService = service(source);
  const savedKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const created = await savedService.deposit(me, request, savedKey, undefined, saved);
  const createdRow = created.ok ? await db.txn.findById(created.data.txnId) : null;
  ok("metadata.saved-before-dispatch", created.ok && JSON.stringify(createdRow?.pendingBet) === JSON.stringify(saved) && savedService.counters.dispatches === 1
    && JSON.stringify(savedService.counters.dispatchIntents) === JSON.stringify([saved]));
  const same = await savedService.deposit(me, request, savedKey, undefined, { returnPath: "/live", bet: saved.bet, v: 1 });
  ok("metadata.same-intent", same.ok && same.data.txnId === created.data?.txnId && savedService.counters.dispatches === 1);
  const changed = await savedService.deposit(me, request, savedKey, undefined, { ...saved, bet: "mkt_saved01.NO.6000" });
  ok("metadata.changed-intent", !changed.ok && changed.code === "INVALID" && changed.data === undefined && savedService.counters.dispatches === 1);
  const badKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`, beforeBad = (await db.txn.findByUser(me)).length;
  const badSaved = await savedService.deposit(me, request, badKey, undefined, { ...saved, phone: "not permitted" });
  ok("metadata.malformed-before-send", !badSaved.ok && badSaved.code === "INVALID" && savedService.counters.dispatches === 1 && (await db.txn.findByUser(me)).length === beforeBad);
  ok("metadata.replay-never-mutates", JSON.stringify((await db.txn.findById(created.data?.txnId))?.pendingBet) === JSON.stringify(saved));

  // The withdrawal key door — refused keys stop before ANY read; carried keys reach the DAL (the trap).
  const payout = { provider: "MPESA", amount: 5000, msisdn: "0712345678" };
  for (const [name, key] of [["empty", ""], ["long", "k".repeat(257)], ["control", "abc\u0007def"], ["newline", "abc\ndef"], ["delete", "abc\u007fdef"]] as const) {
    const door = withdrawDoorFor(source);
    const answer = await door.withdraw("s9_withdraw_door", payout, key).catch((e: unknown) => ({ ok: false, code: `THROWN:${(e as Error).message}` }));
    ok(`withdraw.key-door.${name}`, answer.ok === false && answer.code === "INVALID" && door.reached.length === 0);
  }
  for (const [name, key] of [["uuid", "00000000-0000-4000-8000-000000000123"], ["refund", "rfd:rfd_s9door01"], ["boundary-256", "k".repeat(256)], ["absent", undefined]] as const) {
    const door = withdrawDoorFor(source);
    const outcome = await door.withdraw("s9_withdraw_door", payout, key).then(() => "returned", (e: unknown) => (e as Error).message);
    // A carried key reaches the DAL (the trap). An absent key skips the replay lookup and meets the next un-injected step.
    ok(`withdraw.key-door-passes.${name}`, name === "absent" ? outcome !== "returned" : outcome === "PASSED_DOOR" && door.reached.length > 0);
  }
  return checks;
}

try {
  for (const mutation of MUTATIONS) {
    const anchor = resolveAnchor(mutation.file.endsWith("prisma-dal.ts") ? MAPPER : mutation.file.endsWith("deposit-status.ts") ? STATUS
      : mutation.file.endsWith("/checkout/[id]/route.ts") ? CHECKOUT_ROUTE : SOURCE, mutation.from);
    if (!anchor.ok) throw new Error(`${mutation.name}: ${anchor.reason}`);
  }
  const green = await run(SOURCE), failed = green.filter(c => !c.pass);
  for (const c of green) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
  if (failed.length) throw new Error(`${failed.length} prerequisite controls failed`);
  if (process.argv.includes("--prove-red")) {
    if (PG) throw new Error("Red controls run only in isolated memory; PG is the independent DAL proof");
    for (const mutation of MUTATIONS) {
      const planted = mutation.file.endsWith("prisma-dal.ts") ? await run(SOURCE, injectDefect(MAPPER, mutation.from, mutation.to))
        : mutation.file.endsWith("deposit-status.ts") ? await run(SOURCE, MAPPER, injectDefect(STATUS, mutation.from, mutation.to))
        : mutation.file.endsWith("/checkout/[id]/route.ts") ? await run(SOURCE, MAPPER, STATUS, injectDefect(CHECKOUT_ROUTE, mutation.from, mutation.to))
        : await run(injectDefect(SOURCE, mutation.from, mutation.to));
      if (!planted.some(c => c.name === mutation.expect && !c.pass)) throw new Error(`SURVIVED ${mutation.name}: expected ${mutation.expect}`);
      console.log(`PASS PLANT ${mutation.name}`);
    }
    console.log(`${MUTATIONS.length} in-process plants caught; no disk changes`);
  }
  console.log(`deposit-replay ${PG ? "Postgres" : "memory"}: ${green.length}/${green.length}; actual service bodies/DAL/locks, controlled provider boundary`);
} finally { if (PG) await prisma()?.$disconnect(); }
