/** S9 admin money gate: actual retry helper and action bodies, real DAL/locks, controlled
 * provider boundary. --pg is allowed only on this checkout's disposable loopback cluster. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import * as Funding from "../src/lib/journey/deposit-state.ts";
import * as Methods from "../src/lib/payment-providers.ts";
import * as Review from "../src/lib/wallet/deposit-review.ts";
import * as Policy from "../src/lib/wallet/admin-deposit-retry-policy.ts";
import { retryQueue } from "../src/lib/server/payment-ops.ts";

const ROOT = resolve(import.meta.dirname, "..");
const HELPER = readFileSync(join(ROOT, "src/lib/server/admin-deposit-retry.ts"), "utf8");
const ACTIONS = readFileSync(join(ROOT, "src/app/admin/payments/payment-actions.ts"), "utf8");
const PG = process.argv.includes("--pg");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== PG))
  throw new Error("admin-deposit-retry requires memory or explicit --pg on its own scratch cluster");
if (PG) {
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname)
    || target.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) throw new Error("Not a reserved loopback PostgreSQL port");
}
const { db } = await import("../src/lib/server/store.ts");
const Locks = await import("../src/lib/server/locks.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
if (PG) {
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const normal = (p: string) => realpathSync(p).replace(/\\/g, "/").toLowerCase();
  if (normal(rows[0]?.data_directory ?? "") !== normal(join(ROOT, ".pgscratch")))
    throw new Error("Refusing another checkout's PostgreSQL cluster");
}

let n = 0;
const now = () => new Date().toISOString();
type Check = { name: string; pass: boolean };
const checks: Check[] = [];
const ok = (name: string, pass: boolean) => checks.push({ name, pass });
function fn(source: string, name: string): string {
  const file = ts.createSourceFile(`${name}.ts`, source, ts.ScriptTarget.Latest, true);
  const f = file.statements.find(x => ts.isFunctionDeclaration(x) && x.name?.text === name);
  if (!f) throw new Error(`Missing actual function ${name}`);
  return f.getText(file).replace(/^export /, "");
}
async function player() {
  const serial = String(++n).padStart(7, "0"), id = `s9_admin_retry_${serial}`;
  await db.user.create({ id, phoneE164: `+25577${serial}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Synthetic admin retry", dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
    acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
  return id;
}
async function oldDeposit(userId: string, patch: Record<string, unknown> = {}) {
  const serial = ++n;
  const authority = patch.providerStatus === undefined ? Review.DEPOSIT_FINAL_NEGATIVE_MARK : patch.providerStatus;
  const row = await db.txn.create({ id: `txn_s9_admin_${serial}`, walletId: `wlt_${userId}`, userId,
    type: "DEPOSIT", status: "FAILED", amount: 5000, fee: 0, taxWithheld: 0,
    balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: `dep_s9_admin_${serial}`,
    providerStatus: null, msisdn: "+255712345678",
    description: "M-Pesa deposit failed: provider-reported-failure", positionId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: null, idempotencyKey: `old_s9_admin_${serial}`,
    origin: null, pendingBet: null, ...patch, providerStatus: null } as never);
  // Production writes the verified-negative authority in settlement, after reservation.
  // Prisma's create DAL does not persist providerStatus, so model the real update path.
  return authority == null ? row : (await db.txn.update(row.id, { providerStatus: authority as string }))!;
}

function scenario(source = HELPER) {
  const audits: any[] = [];
  let dispatches = 0, loseAnswer = false, failBeforeReservation = false, stopAfterReservation = false;
  let beforeReservation: (() => Promise<void>) | null = null;
  let duringDispatch: ((child: any) => Promise<void>) | null = null;
  const fakeDeposit = async (userId: string, input: any, key?: string, _card?: any, pendingBet?: any) => {
    if (beforeReservation) await beforeReservation();
    if (failBeforeReservation) throw new Error("Controlled process failure before child reservation");
    const existing = key ? await db.txn.findByIdempotencyKey(key) : null;
    if (existing) return { ok: true, data: { txnId: existing.id, status: existing.status } };
    const reserved = await Locks.withLock(`wallet:${userId}`, async () => {
      const duplicate = key ? await db.txn.findByIdempotencyKey(key) : null;
      if (duplicate) return { row: duplicate, created: false };
      const serial = ++n;
      const row = await db.txn.create({ id: `txn_s9_child_${serial}`, walletId: `wlt_${userId}`, userId,
        type: "DEPOSIT", status: "PROCESSING", amount: input.amount, fee: 0, taxWithheld: 0,
        balanceAfter: null, currency: "TZS", provider: input.provider, providerRef: stopAfterReservation ? null : `dep_s9_child_${serial}`,
        msisdn: input.msisdn ?? null, description: "Synthetic child order", positionId: null, amlReason: null,
        createdAt: now(), updatedAt: now(), completedAt: null, idempotencyKey: key ?? null,
        origin: input.origin ?? null, pendingBet: pendingBet ?? null } as never);
      return { row, created: true };
    });
    if (stopAfterReservation) return { ok: false, error: "Controlled pre-dispatch reference failure" };
    if (reserved.created) {
      dispatches++;
      if (duringDispatch) await duringDispatch(reserved.row);
      if (loseAnswer) throw new Error("Controlled response loss after provider accepted");
    }
    return { ok: true, data: { txnId: reserved.row.id, status: reserved.row.status } };
  };
  const imports: Record<string, unknown> = {
    "node:crypto": { createHash }, "@/lib/journey/deposit-state": Funding,
    "@/lib/payment-providers": Methods, "@/lib/wallet/deposit-review": Review,
    "@/lib/wallet/admin-deposit-retry-policy": Policy,
    "./audit": { audit: async (a: any) => { audits.push(a); return { recorded: true }; } },
    "./locks": Locks, "./store": { db }, "./wallet-service": { deposit: fakeDeposit },
  };
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", js)((id: string) => {
    if (!Object.hasOwn(imports, id)) throw new Error(`Unexpected retry helper import ${id}`);
    return imports[id];
  }, module, module.exports);
  return { retry: module.exports.retryFailedDepositFromAdmin as (id: string, actor: string, source: "single" | "bulk") => Promise<any>,
    key: module.exports.adminDepositRetryKey as (id: string) => string,
    get dispatches() { return dispatches; }, set loseAnswer(v: boolean) { loseAnswer = v; },
    set failBeforeReservation(v: boolean) { failBeforeReservation = v; },
    set stopAfterReservation(v: boolean) { stopAfterReservation = v; },
    set beforeReservation(fn: (() => Promise<void>) | null) { beforeReservation = fn; },
    set duringDispatch(fn: ((child: any) => Promise<void>) | null) { duringDispatch = fn; }, audits };
}
function action(name: string, deps: Record<string, unknown>) {
  let code = fn(ACTIONS, name);
  if (name === "bulkRetryAction") code = code.replace('const { withdraw } = await import("@/lib/server/wallet-service");',
    "const { withdraw } = withdrawalFixture;");
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(deps), `${js}\nreturn ${name};`)(...Object.values(deps)) as (...args: any[]) => Promise<any>;
}
const commonActions = (retry: (id: string, actor: string, source: "single" | "bulk") => Promise<any>) => ({
  gate: async () => ({ userId: "officer_s9", sessionId: "s9" }), db,
  retryFailedDepositFromAdmin: retry, revalidatePath: () => {}, withLock: Locks.withLock,
  hasDepositFinalNegative: Review.hasDepositFinalNegative, hasDepositStatusReview: Review.hasDepositStatusReview,
  audit: async () => ({ recorded: true }), withdrawalFixture: { withdraw: async () => { throw new Error("Unexpected payout dispatch"); } },
});

const legacyOwner = await player(), legacy = await oldDeposit(legacyOwner, { providerStatus: null });
const legacyRun = scenario(), legacyResult = await legacyRun.retry(legacy.id, "officer_s9", "single");
const legacyRow = await db.txn.findById(legacy.id), legacyQueue = (await retryQueue()).find(r => r.id === legacy.id);
ok("legacy.no-provider-dispatch", !legacyResult.ok && legacyResult.reviewRequired && legacyRun.dispatches === 0);
ok("legacy.durable-review-visible", legacyRow?.status === "FAILED" && legacyRow.providerStatus === Review.DEPOSIT_RETRY_REVIEW_MARK
  && legacyRow.description?.includes("review required") === true && legacyQueue?.reviewRequired === true);
const cancel = action("cancelRefundTxnAction", commonActions(legacyRun.retry)), cancelForm = new FormData();
cancelForm.set("txnId", legacy.id);
const closedLegacy = await cancel(cancelForm);
ok("legacy.cannot-close", !closedLegacy.ok && (await db.txn.findById(legacy.id))?.status === "FAILED");

const owner = await player(), original = await oldDeposit(owner), lost = scenario();
lost.loseAnswer = true;
const first = await lost.retry(original.id, "officer_s9", "single");
const child = await db.txn.findByIdempotencyKey(lost.key(original.id));
const again = await lost.retry(original.id, "officer_s9", "single");
ok("lost-response.one-child-one-dispatch", first.ok && again.ok && first.childTxnId === child?.id
  && again.childTxnId === child.id && lost.dispatches === 1 && (await db.txn.findById(original.id))?.status === "CANCELLED");
ok("lost-response.owned-key", child?.idempotencyKey === lost.key(original.id) && child.userId === owner);

const claimOwner = await player(), claimOld = await oldDeposit(claimOwner), claimRace = scenario();
let cancelledDuringGap: any, claimedQueue: any;
claimRace.beforeReservation = async () => {
  const form = new FormData(); form.set("txnId", claimOld.id);
  claimedQueue = (await retryQueue()).find(r => r.id === claimOld.id);
  cancelledDuringGap = await cancel(form);
};
const claimResult = await claimRace.retry(claimOld.id, "officer_s9", "single");
ok("cancel-race.claim-precedes-dispatch", claimResult.ok && cancelledDuringGap?.ok === false
  && claimedQueue?.retryClaimed === true && claimedQueue.reviewRequired === false
  && claimRace.dispatches === 1 && (await db.txn.findById(claimOld.id))?.status === "CANCELLED");
const orphanOwner = await player(), orphan = await oldDeposit(orphanOwner);
await db.txn.update(orphan.id, { providerStatus: Review.DEPOSIT_RETRY_CLAIM_MARK });
const resumed = scenario(), resumedResult = await resumed.retry(orphan.id, "officer_s9", "single");
ok("claimed-without-child.resumes-key", resumedResult.ok && resumed.dispatches === 1
  && (await db.txn.findById(orphan.id))?.status === "CANCELLED"
  && (await db.txn.findByIdempotencyKey(resumed.key(orphan.id)))?.userId === orphanOwner);
const crashOwner = await player(), crashOld = await oldDeposit(crashOwner), crash = scenario();
crash.failBeforeReservation = true;
const crashFirst = await crash.retry(crashOld.id, "officer_s9", "single");
const crashClaim = await db.txn.findById(crashOld.id);
crash.failBeforeReservation = false;
const crashRecovered = await crash.retry(crashOld.id, "officer_s9", "single");
ok("claimed-process-fault.recoverable-key", !crashFirst.ok && crashClaim?.providerStatus === Review.DEPOSIT_RETRY_CLAIM_MARK
  && crashRecovered.ok && crash.dispatches === 1
  && (await db.txn.findByIdempotencyKey(crash.key(crashOld.id)))?.userId === crashOwner);
const noRefOwner = await player(), noRefOld = await oldDeposit(noRefOwner), noRef = scenario();
noRef.stopAfterReservation = true;
const noRefResult = await noRef.retry(noRefOld.id, "officer_s9", "single");
const noRefChild = await db.txn.findByIdempotencyKey(noRef.key(noRefOld.id));
const noRefAgain = await noRef.retry(noRefOld.id, "officer_s9", "single");
ok("reserved-without-reference.durable-review-no-dispatch", !noRefResult.ok && noRefResult.reviewRequired
  && !noRefAgain.ok && noRef.dispatches === 0 && noRefChild?.status === "PROCESSING" && !noRefChild.providerRef
  && (await db.txn.findById(noRefOld.id))?.status === "FAILED"
  && (await db.txn.findById(noRefOld.id))?.providerStatus === Review.DEPOSIT_RETRY_REVIEW_MARK);

const callbackOwner = await player(), callbackOld = await oldDeposit(callbackOwner), callback = scenario();
callback.duringDispatch = async () => {
  await db.txn.update(callbackOld.id, { providerStatus: Review.DEPOSIT_STATUS_REVIEW_MARK });
};
const callbackResult = await callback.retry(callbackOld.id, "officer_s9", "single");
ok("callback-race.original-stays-for-review", !callbackResult.ok && callbackResult.reviewRequired && callback.dispatches === 1
  && (await db.txn.findById(callbackOld.id))?.status === "FAILED"
  && (await db.txn.findById(callbackOld.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK);
const callbackAgain = await callback.retry(callbackOld.id, "officer_s9", "single");
ok("callback-race.no-second-dispatch", !callbackAgain.ok && callback.dispatches === 1);

const raceOwner = await player(), raceOld = await oldDeposit(raceOwner), race = scenario();
race.duringDispatch = async () => { await new Promise(r => setTimeout(r, 25)); };
const single = action("retryDepositAction", commonActions(race.retry));
const bulkData = { ...db, txn: { ...db.txn, listByStatus: async () => [raceOld] } };
const bulk = action("bulkRetryAction", { ...commonActions(race.retry), db: bulkData });
const form = new FormData(); form.set("txnId", raceOld.id);
const [singleResult, bulkResult] = await Promise.all([single(form), bulk()]);
const raceChild = await db.txn.findByIdempotencyKey(race.key(raceOld.id));
ok("single-bulk-race.one-order", singleResult.ok && bulkResult.ok && race.dispatches === 1
  && raceChild?.status === "PROCESSING" && (await db.txn.findById(raceOld.id))?.status === "CANCELLED");
const singleAgain = await single(form), bulkAgain = await bulk();
ok("single-bulk-repeat.no-order", singleAgain.ok && bulkAgain.ok && race.dispatches === 1);

if (!PG) {
  const mutant = HELPER.replace('if (!canAdminRetryDeposit(original, true)) return markReview(original, "definitive provider-negative proof or mobile funding identity is absent", tx);',
    'if (false) return markReview(original, "definitive provider-negative proof or mobile funding identity is absent", tx);');
  if (mutant === HELPER) throw new Error("Legacy gate mutation anchor missing");
  const plantOwner = await player(), plantOld = await oldDeposit(plantOwner, { providerStatus: null }), planted = scenario(mutant);
  await planted.retry(plantOld.id, "officer_s9", "single");
  ok("red.legacy-gate-kills-dispatch", planted.dispatches === 1);
}

const failed = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
console.log(`admin-deposit-retry ${PG ? "PostgreSQL" : "memory"}: ${checks.length - failed.length}/${checks.length}; actual helper/actions/DAL/locks, controlled provider boundary`);
if (PG) await prisma()!.$disconnect();
if (failed.length) process.exitCode = 1;
