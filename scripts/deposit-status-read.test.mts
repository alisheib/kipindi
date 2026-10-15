/** Execute the shipped core/settlement bodies on the actual DAL, locks and ledger. Signed adapter I/O is controlled. */
import { readFileSync, realpathSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import * as ReactRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as D from "../src/lib/journey/deposit-state.ts";
import * as B from "../src/lib/journey/deposit-recheck-binding.ts";
import { DepositSchema, AdminDepositSchema } from "../src/lib/server/validators.ts";
import { paymentMethodName, isMobileMoneyMethodId, MOBILE_MONEY_METHODS } from "../src/lib/payment-providers.ts";
import { isPayoutRail } from "../src/lib/server/selcom.ts";
import { RG_RETURN_MARK } from "../src/lib/wallet/receipts.ts";
import { depositResultStatus, isRgHeldDeposit, presentedStatus } from "../src/lib/wallet/receipts.ts";
import * as Review from "../src/lib/wallet/deposit-review.ts";
import * as WalletLedger from "../src/lib/wallet/ledger.ts";
import * as QueryWindows from "../src/lib/query/windows.ts";
import * as ResultPhase from "../src/lib/wallet/result-phase.ts";
import { formatDateTime, formatTzs } from "../src/lib/utils.ts";
import { resolveAnchor, injectDefect } from "./red-anchor.mjs";
import { activeCardCheckoutUrl, trustedCardCheckoutUrl } from "../src/lib/card-checkout-url.ts";
import { MUTATIONS } from "./anchors/deposit-status-read.anchors.mjs";
import { MUTATIONS as RECHECK_MUTATIONS, PG_MUTATIONS as RECHECK_PG_MUTATIONS } from "./anchors/deposit-recheck.anchors.mjs";
import { MUTATIONS as BACKGROUND_MUTATIONS, PG_MUTATIONS as BACKGROUND_PG_MUTATIONS } from "./anchors/payment-background.anchors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const files = ["src/lib/server/deposit-status.ts", "src/lib/server/wallet-service.ts", "src/lib/server/rate-limit.ts",
  "src/app/api/wallet/deposits/[id]/status/route.ts", "src/app/api/wallet/deposits/recover/route.ts",
  "src/lib/wallet/deposit-review.ts", "src/lib/wallet/receipts.ts", "src/lib/server/notification-service.ts", "src/app/api/webhooks/payments/route.ts",
  "src/app/wallet/receipt/[id]/page.tsx", "src/lib/server/email.ts", "src/lib/i18n-dict.ts", "src/lib/server/prisma-dal.ts"];
const sources = Object.fromEntries(files.map(file => [file, readFileSync(join(ROOT, file), "utf8")]));
const RECHECK_FILE = "src/lib/server/deposit-recheck.ts";
const RECHECK_ROUTE = "src/app/api/wallet/deposits/[id]/recheck/route.ts";
const BINDING_FILE = "src/lib/journey/deposit-recheck-binding.ts";
const MEMORY_FILE = "src/lib/server/store.ts";
const PROBE_FILE = "src/lib/server/payment-probe-binding.ts";
const LIFECYCLE_FILE = "src/lib/server/lifecycle.ts";
/** The /wallet result's words (S9 RC, Ali 2026-10-14: L6 under review, and a held deposit named held for return). */
const RESULT_COPY_FILE = "src/lib/wallet/result-copy.ts";
for (const file of [RECHECK_FILE, RECHECK_ROUTE, BINDING_FILE, MEMORY_FILE, PROBE_FILE, LIFECYCLE_FILE, RESULT_COPY_FILE]) sources[file] = readFileSync(join(ROOT, file), "utf8");
const RECHECK = process.argv.includes("--recheck-only");
const BACKGROUND = process.argv.includes("--background-only");
const REFERENCE_ONLY = process.argv.includes("--reference-only");
const PG = process.argv.includes("--pg");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== PG)) throw new Error("Use memory with DATABASE_URL unset, or explicit own scratch --pg");
if (PG) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) || url.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) throw new Error("Unrelated database refused");
}
const { db } = await import("../src/lib/server/store.ts");
const { withLock, runOutsideLock, inLock, currentLockTx, afterCommit } = await import("../src/lib/server/locks.ts");
const L = await import("../src/lib/server/ledger.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
if (PG) {
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const real = (p: string) => realpathSync(p).replace(/\\/g, "/").toLowerCase();
  if (real(rows[0]?.data_directory ?? "") !== real(join(ROOT, ".pgscratch"))) throw new Error("Another checkout's cluster refused");
}
let sequence = 200_000;
type Check = { name: string; pass: boolean };
function fn(source: string, name: string): string {
  const ast = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  if (!node) throw new Error(`Missing actual function ${name}`);
  return node.getText(ast).replace(/^export /, "");
}
function compile(source: string, imports: Record<string, unknown>) {
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", code)((id: string) => {
    if (!Object.hasOwn(imports, id)) throw new Error(`Unexpected import ${id}`);
    return imports[id];
  }, module, module.exports);
  return module.exports;
}
/** Invoke the actual selector AST with the real fixture rows (and actual SQL in --pg). This lets a memory source
 * plant reproduce arbitrary selection in the money core rather than merely checking for a guard's spelling. */
function referenceData(src: Record<string, string>) {
  const file = PG ? files[12] : MEMORY_FILE;
  const ast = ts.createSourceFile(file, src[file], ts.ScriptTarget.Latest, true);
  const candidates: ts.PropertyAssignment[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "findByProviderRef") candidates.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (candidates.length !== 1) throw new Error("Expected one actual provider-reference selector");
  const initializer = candidates[0].initializer.getText(ast);
  const mapper = new Function("num", "numOrNull", "iso", ts.transpileModule(fn(src[files[12]], "toStoredTxn"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\nreturn toStoredTxn;")(
      (n: unknown) => Number(n ?? 0), (n: unknown) => n == null ? null : Number(n), (at: unknown) => at == null ? null : new Date(String(at)).toISOString());
  const selector = new Function("store", "pc", "toStoredTxn", ts.transpileModule(`const reader = ${initializer}; return reader;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
  return { ...db, txn: { ...db.txn, findByProviderRef: async (ref: string, tx: any) => {
    const rows = PG ? [] : await db.txn.listAll();
    return selector({ txns: new Map(rows.map(row => [row.id, row])) }, () => prisma(), mapper)(ref, tx);
  } } } as typeof db;
}
const providerWriterCache = new Map<string, Array<{ file: string; fn: string; text: string; body: string }>>();
function providerWriters(src: Record<string, string>) {
  const key = Object.entries(src).filter(([, source]) => source.includes("providerStatus")).map(([file, source]) => file + "\n" + source).join("\n");
  const cached = providerWriterCache.get(key);
  if (cached) return cached;
  const writers: Array<{ file: string; fn: string; text: string; body: string }> = [];
  for (const rel of readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" }).filter(p => /\.tsx?$/.test(p))) {
    const file = "src/" + rel.replaceAll("\\", "/"), source = src[file] ?? readFileSync(join(ROOT, file), "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node) && node.name.getText(ast).replaceAll(/['"]/g, "") === "providerStatus") {
        let parent: ts.Node | undefined = node.parent, mutation = false;
        while (parent && !ts.isFunctionDeclaration(parent)) {
          if (ts.isCallExpression(parent) && /(?:db|data)\.txn\.(?:update|create)$/.test(parent.expression.getText(ast))) mutation = true;
          parent = parent.parent;
        }
        if (mutation) writers.push({ file, fn: parent && ts.isFunctionDeclaration(parent) ? parent.name?.text ?? "opaque" : "opaque",
          text: node.getText(ast), body: parent?.getText(ast) ?? "" });
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  providerWriterCache.set(key, writers);
  return writers;
}
function system(src = sources, data = db) {
  const bindingModule = compile(src[BINDING_FILE], { "./deposit-state": D });
  const probeModule = compile(src[PROBE_FILE], { "@/lib/journey/deposit-recheck-binding": bindingModule, "./selcom": { isPayoutRail } });
  const reviewModule = compile(src[files[5]], {});
  const receiptsModule = compile(src[files[6]], { "@/lib/query/windows": QueryWindows, "@/lib/query/parse": {}, "@/lib/query/href": {},
    "@/lib/query/counts": {}, "@/lib/query/empty": {}, "@/lib/payment-providers": { paymentMethodName }, "./ledger": WalletLedger, "./deposit-review": reviewModule });
  const seen = { verifies: [] as string[], settles: 0, reviewAttempts: 0, audits: [] as any[], notices: [] as any[], groups: [] as string[], funnels: 0,
    locked: false, statusAllowed: true, probeAllowed: true, lockAtDispatch: false, rateCalls: [] as Array<{ key: string; action: string }>,
    /** M3: the reader's own settle COMMITS and then its answer is lost (a dropped reply after commit, on either store). */
    loseSettleAnswer: false, dispatches: 0 };
  let verify: (ref: string) => Promise<any> = async () => ({ status: "PENDING" });
  let dispatch: (opts: any) => Promise<any> = async ({ correlationId }: any) => ({ ok: true, status: "CONFIRMED", providerRef: correlationId });
  let core: any;
  const audit = (entry: any) => { seen.audits.push(entry); return Promise.resolve({ recorded: true }); };
  const requireFixture = (id: string) => {
    if (id === "./deposit-status") return core;
    if (id === "./bonus-config") return { getBonusConfig: () => ({ enabled: false }) };
    if (id === "./journey-funnel") return { countDepositFunnel: () => { seen.funnels++; } };
    if (id === "./house-bot/money-hook") return { onHolderMoneyEvent: () => {} };
    if (id === "./affiliate-service") return { onRecruitDeposit: async () => {} };
    throw new Error(`Unexpected dynamic side-effect module ${id}`);
  };
  const deps = { db: data, withLock, runOutsideLock, currentLockTx, afterCommit, withMoneyTx: L.withMoneyTx,
    onReviewAttempt: () => { seen.reviewAttempts++; },
    postLedgerEntries: async (id: string, lines: any, tx: any) => { seen.groups.push(id); return L.postLedgerEntries(id, lines, tx); },
    depositEntries: L.depositEntries, rgSuspenseEntries: L.rgSuspenseEntries,
    withdrawalEntries: L.withdrawalEntries, getEffectiveConfig: async () => ({ withdrawalGatewayShareRate: 0 }),
    notifyWithdrawalSent: (row: any) => seen.notices.push({ ownerId: row.userId, txnId: row.id, status: "CONFIRMED" }),
    notifyWithdraw: (ownerId: string, notice: any) => seen.notices.push({ ownerId, ...notice }),
    notifyRefusedFundsReturnFailed: () => {}, amlRejectRefundHtml: () => "", refusedFundsReturnFailedHtml: () => "", payoutRailLabel: () => "",
    audit, isLockedOut: async () => ({ locked: seen.locked, reason: "cooling-off" }), RG_RETURN_MARK, paymentMethodName, formatTzs, formatDateTime,
    DEPOSIT_STATUS_REVIEW_MARK: reviewModule.DEPOSIT_STATUS_REVIEW_MARK, depositResultStatus: receiptsModule.depositResultStatus,
    hasDepositStatusReview: reviewModule.hasDepositStatusReview, isRgHeldDeposit: receiptsModule.isRgHeldDeposit,
    DepositSchema, AdminDepositSchema, parseSavedDepositBet: D.parseSavedDepositBet, sameDepositFunding: D.sameDepositFunding,
    parseDepositRecheckBinding: bindingModule.parseDepositRecheckBinding, matchesDepositRecheckBinding: bindingModule.matchesDepositRecheckBinding,
    depositRecheckBinding: bindingModule.depositRecheckBinding, withdrawalProbeBinding: probeModule.withdrawalProbeBinding,
    isStoredFundingKey: bindingModule.isStoredFundingKey,
    activeCardCheckoutUrl, trustedCardCheckoutUrl,
    parseProcessingProbeBinding: probeModule.parseProcessingProbeBinding, matchesProcessingProbeBinding: probeModule.matchesProcessingProbeBinding,
    verifyDepositStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); },
    verifyWithdrawalStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); }, isLiveMoneyMode: () => true,
    rateCheckAsync: async () => ({ allowed: true }), randomId: () => String(++sequence).padStart(24, "0"),
    isMaintenanceMode: async () => false, maintenanceMessage: async () => "Maintenance", isPaymentPaused: async () => false,
    checkDepositLimit: async () => ({ allowed: true }), SOF_SINGLE_TXN_TZS: 1_000_000, SOF_ROLLING_30D_TZS: 5_000_000,
    readIdentityStanding: async () => ({ kycStatus: "NOT_STARTED", everApproved: false }),
    dispatchDeposit: async (opts: any) => { seen.dispatches++; if (seen.lockAtDispatch) seen.locked = true; return dispatch(opts); },
    emit: () => {}, notifyDeposit: (ownerId: string, notice: any) => seen.notices.push({ ownerId, ...notice }),
    sendEmailToUser: async () => {}, depositConfirmedHtml: () => "", depositReversedHtml: () => "", depositFailedHtml: () => "",
    require: requireFixture,
  };
  const names = ["deposit", "creditConfirmedDeposits", "settleConfirmedWithdrawals", "isFastPayoutCandidate", "reconcileStalePayments", "clearNeedsReview", "settleDepositFromReturn", "settleDepositConfirmed", "settleDepositFailed", "settleWithdrawalConfirmed", "settleWithdrawalFailed", "settlePaymentWebhook", "markDepositStatusReview", "assertUniquePaymentReference", "refundAmlRejection", "friendlyProvider", "friendlyDepositReason", "friendlyFailureReason", "auditNeedsReviewOnce"];
  const walletText = "const NEEDS_REVIEW_SEEN = new Set(); const NEEDS_REVIEW_CAP = 5000;\n" + names.map(name => fn(src[files[1]], name)).join("\n");
  const code = ts.transpileModule(walletText, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  // Wrap only the entry counter; the compiled marker's actual source body and all real DAL/lock work stay intact.
  const trackedMarker = "const actualMarkerClaim = markDepositStatusReview; markDepositStatusReview = (...args) => { onReviewAttempt(); return actualMarkerClaim(...args); };";
  const money = new Function(...Object.keys(deps), `${code}\n${trackedMarker}\nreturn { deposit, creditConfirmedDeposits, settleConfirmedWithdrawals, reconcileStalePayments, settleDepositFromReturn, settlePaymentWebhook, settleDepositConfirmed, settleDepositFailed, markDepositStatusReview, refundAmlRejection };`)(...Object.values(deps));
  const rate = async (key: string, action: string) => {
    seen.rateCalls.push({ key, action });
    return { allowed: action === "deposit.status" ? seen.statusAllowed : seen.probeAllowed, retryAfterSec: 10 };
  };
  core = compile(src[files[0]], { "./store": { db: data }, "./audit": { audit }, "./rate-limit": { rateCheckAsync: rate },
    "./payments": { verifyDepositStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); } },
    "@/lib/card-checkout-url": { activeCardCheckoutUrl },
    "./wallet-service": { settlePaymentWebhook: async (input: any, restriction: any, original: any) => {
      seen.settles++;
      const answer = await money.settlePaymentWebhook(input, restriction, original);
      if (seen.loseSettleAnswer) throw new Error("controlled answer lost after the settle committed");
      return answer;
    } },
    "@/lib/journey/deposit-state": D,
    "@/lib/journey/deposit-recheck-binding": bindingModule,
  });
  const recheck = compile(src[RECHECK_FILE], { "./store": { db: data }, "./audit": { audit }, "./rate-limit": { rateCheckAsync: rate },
    "./payments": { verifyDepositStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); } },
    "./wallet-service": { settlePaymentWebhook: async (input: any, restriction: any) => { seen.settles++; return money.settlePaymentWebhook(input, restriction); } },
    "./locks": { withLock }, "@/lib/journey/deposit-state": D, "@/lib/payment-providers": { isMobileMoneyMethodId },
    "@/lib/journey/deposit-recheck-binding": bindingModule,
  });
  const recheckRaw = recheck.recheckDepositStatus as (id: string, txnId: string, expected: unknown) => Promise<any>;
  // These independent core controls simulate the earlier owned SSR tuple. Deliberately forged valid restrictions
  // target invalid/foreign stored rows, so the shipped service (not this fixture) must refuse them before probing.
  const recheckFixture = async (id: string, txnId: string, ...expected: unknown[]) => {
    const stored = expected.length ? null : await db.txn.findById(txnId);
    const funding = D.canonicalDepositFunding({ ...stored, userId: id, type: "DEPOSIT", currency: "TZS", houseBotId: null, pendingBet: null })
      ?? D.canonicalDepositFunding({ userId: id, type: "DEPOSIT", amount: 5000, currency: "TZS", provider: "MPESA", msisdn: "+255712345678", pendingBet: null });
    const binding = { v: 1, owner: id, txnId, fundingKey: stored?.idempotencyKey ?? null,
      providerRef: stored?.providerRef ?? "own_missing_ref", funding };
    return recheckRaw(id, txnId, expected.length ? expected[0] : binding);
  };
  return { read: core.readDepositStatus as (id: string, lookup: DLookup) => Promise<any>, recheck: recheckFixture, recheckRaw, bindingModule, probeModule, money, seen, reviewModule, receiptsModule,
    verify: (next: typeof verify) => { verify = next; }, dispatch: (next: typeof dispatch) => { dispatch = next; } };
}
type DLookup = { kind: "txn-id" | "funding-key" | "card-order"; value: string };
async function player() {
  const n = String(++sequence), id = `s9_status_${n}`, at = new Date().toISOString();
  await db.user.create({ id, phoneE164: `+2557${n.padStart(8, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at });
  return id;
}
async function txn(userId: string, patch: Record<string, unknown> = {}) {
  const n = String(++sequence), id = `txn_s9_status_${n}`;
  return db.txn.create({ id, walletId: `wlt_${userId}`, userId, type: "DEPOSIT", status: "PROCESSING", amount: 5000, fee: 0,
    taxWithheld: 0, balanceAfter: 0, currency: "TZS", provider: "MPESA", providerRef: `dep_s9_status_${n}`, msisdn: "+255712345678",
    description: "S9 local controlled signed-status fixture", idempotencyKey: `00000000-0000-4000-8000-${n.padStart(12, "0")}`,
    createdAt: new Date(Date.now() - 25_000).toISOString(), completedAt: null, origin: "low_balance", pendingBet: null, ...patch } as never);
}
const byId = (row: any): DLookup => ({ kind: "txn-id", value: row.id });
async function runBackground(src = sources): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: unknown) => checks.push({ name, pass: !!pass });
  const lanes = ["fast-deposit", "stale-deposit-confirm", "stale-deposit-fail", "fast-withdraw", "stale-withdraw-confirm", "stale-withdraw-fail"];
  for (const lane of lanes) for (const mode of ["stable", "ref-move", "raw-mutable", "duplicate"] as const) {
    if (PG && mode === "duplicate") continue; // the new SQL invariant rejects this legacy malformed row
    const withdrawal = lane.includes("withdraw"), stale = lane.startsWith("stale"), reported = lane.endsWith("fail") ? "FAILED" : "CONFIRMED";
    const a = await player(), b = await player(), patch = { type: withdrawal ? "WITHDRAWAL" : "DEPOSIT", amount: withdrawal ? -5000 : 5000,
      createdAt: new Date(Date.now() - (stale ? 31 * 60_000 : 25_000)).toISOString() };
    const own = await txn(a, patch), foreign = await txn(b, patch), oldRef = own.providerRef!, newRef = oldRef + "_new";
    if (withdrawal) { await db.wallet.adjust(`wlt_${a}`, { hold: 5000 }); await db.wallet.adjust(`wlt_${b}`, { hold: 5000 }); }
    if (mode === "duplicate") await db.txn.update(foreign.id, { providerRef: oldRef });
    const data = { ...db, txn: { ...db.txn, listByStatus: async (status: string) => {
      const row = await db.txn.findById(own.id); return row?.status === status ? [row] : [];
    } } } as typeof db;
    const s = system(src, data); let providerOutside = true;
    s.verify(async (ref) => {
      providerOutside &&= !inLock();
      if (ref !== oldRef) throw new Error("Background probe changed its original reference");
      if (mode === "ref-move") { await db.txn.update(own.id, { providerRef: newRef }); await db.txn.update(foreign.id, { providerRef: oldRef }); }
      if (mode === "raw-mutable") {
        if (PG) await prisma()!.transaction.update({ where: { id: own.id }, data: { providerRef: newRef } });
        else Object.assign((await db.txn.findById(own.id))!, { providerRef: newRef });
      }
      return { status: reported, amount: 5000, detail: "controlled original payment verdict" };
    });
    const drive = () => stale ? s.money.reconcileStalePayments() : withdrawal ? s.money.settleConfirmedWithdrawals() : s.money.creditConfirmedDeposits();
    let refused = false, result: any = null;
    try { result = await drive(); } catch { refused = true; }
    const wa = await db.wallet.findByUserId(a), wb = await db.wallet.findByUserId(b), row = await db.txn.findById(own.id), other = await db.txn.findById(foreign.id);
    const cash = mode === "stable" ? (withdrawal ? reported === "FAILED" ? 5000 : 0 : reported === "CONFIRMED" ? 5000 : 0) : 0;
    const hold = withdrawal && mode !== "stable" ? 5000 : 0;
    ok(`background.${lane}.${mode}`, providerOutside && wa?.balance === cash && wa?.hold === hold && wb?.balance === 0
      && wb?.hold === (withdrawal ? 5000 : 0) && row?.status === (mode === "stable" ? reported : "PROCESSING") && other?.status === "PROCESSING"
      && s.seen.notices.length === (mode === "stable" ? 1 : 0)
      && s.seen.groups.length === (mode === "stable" && reported === "CONFIRMED" ? 1 : 0)
      // ⛔ A THROWN LANE IS A FAILURE (S9 root review H1). This used to read `refused || …` and so scored a sweep that threw
      // on the row as a pass — while a throw aborts the whole sweep and strands every later row. Every lane must now refuse
      // the row and carry on: no throw, and nothing settled in the refused modes.
      && !refused && (mode === "stable" || ["confirmed", "depositsFailed", "withdrawalsReversed", "depositsConfirmed", "withdrawalsConfirmed"].every(key => (result?.[key] ?? 0) === 0)));
    if (mode !== "stable") {
      ok(`background.detail.${lane}.${mode}`, row?.providerStatus == null && other?.providerStatus == null);
    }
    // L3 (S9 root review): the sweep's re-queried FAILED keeps ITS reason through the bound path — the player's notice says
    // the provider "confirmed the payment did not complete", and audit queries keyed on the token keep working.
    if (mode === "stable" && stale && reported === "FAILED") {
      const notice = s.seen.notices[0];
      ok(`background.reason.${lane}`, withdrawal
        ? notice?.reason === "reconcile-verified-failed" && row?.description === "Withdrawal failed: reconcile-verified-failed"
        : notice?.reason === "Your payment provider confirmed the payment did not complete."
          && / deposit failed: reconcile-verified-failed$/.test(row?.description ?? "")
          && s.seen.audits.some(a => a.action === "deposit.failed" && a.payload?.reason === "reconcile-verified-failed"));
    }
    if (mode === "stable") {
      const before = JSON.stringify({ wa, wb, notices: s.seen.notices.length, groups: s.seen.groups.length });
      await drive();
      ok(`background.once.${lane}`, before === JSON.stringify({ wa: await db.wallet.findByUserId(a), wb: await db.wallet.findByUserId(b), notices: s.seen.notices.length, groups: s.seen.groups.length }));
    }
    if (PG) {
      const ledger = await prisma()!.ledgerEntry.findMany({ where: { txnId: { in: [own.id, foreign.id] } } });
      ok(`background.pg-ledger.${lane}.${mode}`, ledger.length === (mode === "stable" && reported === "CONFIRMED" ? 2 : 0)
        && ledger.every(line => line.txnId === own.id) && ledger.reduce((sum, line) => sum + Number(line.amount), 0) === 0);
    }
  }
  const historicalKey = `rfd:historic-owned-return:${++sequence}`;
  const owner = await player(), row = await txn(owner, { type: "WITHDRAWAL", amount: 5000, fee: 150, idempotencyKey: historicalKey });
  const p = system(src).probeModule, binding = p.withdrawalProbeBinding(row);
  ok("background.binding.historical-positive-key", binding?.amount === 5000 && binding.fundingKey === historicalKey && p.matchesProcessingProbeBinding(binding, row));
  for (const [name, patch] of [["owner", { userId: "different" }], ["type", { type: "DEPOSIT" }], ["house", { houseBotId: "marked" }],
    ["ref", { providerRef: "different" }], ["key", { idempotencyKey: "different" }], ["amount", { amount: 6000 }], ["fee", { fee: 151 }],
    ["currency", { currency: "USD" }], ["phone", { msisdn: "+255712345679" }], ["provider", { provider: "MIXX" }], ["rail", { payoutRail: "SELCOM_PESA" }]] as const) {
    ok(`background.binding.drift.${name}`, !p.matchesProcessingProbeBinding(binding, { ...row, ...patch }));
  }
  for (const [name, patch] of [["zero", { amount: 0 }], ["fraction", { amount: 5000.5 }], ["bad-fee", { fee: -1 }], ["fee-over-gross", { fee: 5001 }],
    ["bad-rail", { payoutRail: "invented" }], ["bad-key", { idempotencyKey: "x\u0000y" }], ["saved-bet", { pendingBet: { v: 1 } }]] as const) {
    ok(`background.binding.invalid.${name}`, p.withdrawalProbeBinding({ ...row, ...patch }) === null);
  }
  // A valid signed snapshot can drift AFTER provider I/O and global selection, while the actual helper waits for
  // its wallet lock. Keep the original tuple restriction through that fresh transactional claim as well.
  for (const type of ["DEPOSIT", "WITHDRAWAL"] as const) for (const reported of ["CONFIRMED", "FAILED"] as const) {
    for (const [field, patch] of [["amount", { amount: type === "DEPOSIT" ? 6000 : -6000 }], ["key", { idempotencyKey: "00000000-0000-4000-8000-999999999999" }],
      ["ref", { providerRef: "changed_owned_ref" }], ...(type === "WITHDRAWAL" ? [["fee", { fee: 100 }], ["rail", { payoutRail: "SELCOM_PESA" }]] : [])] as Array<[string, any]>) {
      const owner = await player(), row = await txn(owner, { type, amount: type === "WITHDRAWAL" ? -5000 : 5000 });
      if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${owner}`, { hold: 5000 });
      const original = type === "DEPOSIT" ? system(src).bindingModule.depositRecheckBinding(owner, row) : p.withdrawalProbeBinding(row);
      let changed = false, referenceTx = false;
      const data = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => {
        const fresh = await db.txn.findById(id, tx), snapshot = fresh && { ...fresh };
        if (id === row.id && !inLock() && !changed) {
          changed = true;
          const change = field === "key" ? { ...patch, idempotencyKey: `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}` }
            : field === "ref" ? { providerRef: `changed_owned_ref_${row.id}` } : patch;
          await withLock(`wallet:${owner}`, async actualTx => { await db.txn.update(row.id, change, actualTx); });
        }
        return snapshot;
      }, findByProviderRef: async (ref: string, tx: any) => {
        if (inLock()) referenceTx = tx === currentLockTx() && (!PG || !!tx);
        return db.txn.findByProviderRef(ref, tx);
      } } } as typeof db;
      const s = system(src, data); let refused = false;
      try { refused = !(await s.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: reported, amount: 5000 }, undefined, original)).handled; }
      catch { refused = true; }
      const wallet = await db.wallet.findByUserId(owner), fresh = await db.txn.findById(row.id);
      ok(`background.claim.${type}.${reported}.${field}`, changed && referenceTx && refused && fresh?.status === "PROCESSING"
        && wallet?.balance === 0 && wallet.hold === (type === "WITHDRAWAL" ? 5000 : 0) && s.seen.groups.length === 0 && s.seen.notices.length === 0);
    }
  }
  // The opposing callback may win after the background lane read PROCESSING. Deposits durably require review;
  // withdrawals keep the winning money decision and alarm, with no invented second payout/refund.
  for (const type of ["DEPOSIT", "WITHDRAWAL"] as const) for (const reported of ["CONFIRMED", "FAILED"] as const) {
    const owner = await player(), row = await txn(owner, { type, amount: type === "WITHDRAWAL" ? -5000 : 5000,
      createdAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${owner}`, { hold: 5000 });
    let enter!: () => void, release!: () => void, delayed = false;
    const entered = new Promise<void>(resolve => { enter = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const data = { ...db, txn: { ...db.txn, listByStatus: async () => [await db.txn.findById(row.id)],
      findById: async (id: string, tx: any) => {
        const fresh = await db.txn.findById(id, tx), snapshot = fresh && { ...fresh };
        if (id === row.id && !inLock() && !delayed) { delayed = true; enter(); await released; }
        return snapshot;
      } } } as typeof db;
    const s = system(src, data), other = system(src);
    s.verify(async () => ({ status: reported, amount: 5000 }));
    let failed = false;
    const later = s.money.reconcileStalePayments().then(() => {}, () => { failed = true; });
    const reached = await Promise.race([entered.then(() => true), later.then(() => false)]);
    const winner = reported === "CONFIRMED" ? "FAILED" : "CONFIRMED";
    try { if (reached) await other.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: winner, amount: 5000 }); }
    finally { release(); }
    await later;
    const fresh = await db.txn.findById(row.id), wallet = await db.wallet.findByUserId(owner);
    const expectedCash = type === "DEPOSIT" ? winner === "CONFIRMED" ? 5000 : 0 : winner === "FAILED" ? 5000 : 0;
    ok(`background.race.${type}.${reported}`, reached && !failed && fresh?.status === winner && wallet?.balance === expectedCash && wallet.hold === 0
      && s.seen.groups.length === 0 && other.seen.groups.length === (winner === "CONFIRMED" ? 1 : 0)
      && s.seen.notices.length === (type === "DEPOSIT" ? 1 : 0) && other.seen.notices.length === 1
      && (type === "DEPOSIT" ? fresh.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK : fresh.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK)
      && s.seen.audits.some(a => a.action === "webhook.terminal_contradicted"));
  }
  for (const [type, reported] of [["DEPOSIT", "CONFIRMED"], ["WITHDRAWAL", "CONFIRMED"], ["WITHDRAWAL", "FAILED"]] as const) {
    // H2 (S9 root review): the balance refusals that remain are the impossible ones — negative, NaN, infinite. A fractional
    // balance is NOT a fault (`Wallet.balance` is Decimal(18,2)); it is a positive control below.
    for (const fault of ["missing", "currency", "throw", "owner", "wallet-id", "negative-balance", "nan-balance", "infinite-balance",
      ...(type === "WITHDRAWAL" ? ["hold", "nan-hold", "null-adjust"] : [])]) {
      const owner = await player(), row = await txn(owner, { type, amount: type === "WITHDRAWAL" ? -5000 : 5000 });
      if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${owner}`, { hold: 5000 });
      if (fault === "currency") {
        if (PG) await prisma()!.wallet.update({ where: { userId: owner }, data: { currency: "USD" } });
        else Object.assign((await db.wallet.findByUserId(owner))!, { currency: "USD" });
      }
      const data = { ...db, wallet: { ...db.wallet, findByUserId: async (id: string, tx: any) => {
        const wallet = await db.wallet.findByUserId(id, tx);
        if (id !== owner || !inLock()) return wallet;
        if (fault === "missing") return null;
        if (fault === "throw") throw new Error("controlled private wallet-read fault");
        return wallet && { ...wallet, ...(fault === "owner" ? { userId: "foreign" } : fault === "wallet-id" ? { id: "foreign" }
          : fault === "negative-balance" ? { balance: -1 } : fault === "nan-balance" ? { balance: Number.NaN }
          : fault === "infinite-balance" ? { balance: Number.POSITIVE_INFINITY } : fault === "hold" ? { hold: 4999 }
          : fault === "nan-hold" ? { hold: Number.NaN } : {}) };
      }, adjust: async (id: string, deltas: any, opts: any, tx: any) => {
        if (fault === "null-adjust" && id === `wlt_${owner}` && inLock()) return null;
        return db.wallet.adjust(id, deltas, opts, tx);
      } } } as typeof db;
      const s = system(src, data); let refused = false;
      try { const result = await s.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: reported, amount: 5000 }); refused = !result.handled; }
      catch { refused = true; }
      const wallet = await db.wallet.findByUserId(owner);
      ok(`background.wallet.${type}.${reported}.${fault}`, refused && wallet?.balance === 0 && wallet.hold === (type === "WITHDRAWAL" ? 5000 : 0)
        && (await db.txn.findById(row.id))?.status === "PROCESSING" && s.seen.groups.length === 0 && s.seen.notices.length === 0);
    }
    // ⭐ POSITIVE (H2): a REAL stored fractional balance settles exactly — through the actual wallet row on both stores, not a
    // faked read. The whole-shilling guard this replaces refused it on every lane and stranded the money.
    const owner = await player(), row = await txn(owner, { type, amount: type === "WITHDRAWAL" ? -5000 : 5000 });
    await db.wallet.update(`wlt_${owner}`, { balance: 1000.5, ...(type === "WITHDRAWAL" ? { hold: 5000 } : {}) } as never);
    const s = system(src);
    let settled = false;
    try { settled = (await s.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: reported, amount: 5000 })).handled; } catch { settled = false; }
    const after = await db.wallet.findByUserId(owner), fresh = await db.txn.findById(row.id);
    const expected = type === "DEPOSIT" ? 6000.5 : reported === "FAILED" ? 6000.5 : 1000.5;
    ok(`background.wallet.${type}.${reported}.fractional`, settled && fresh?.status === reported && after?.balance === expected && after?.hold === 0
      && s.seen.notices.length === 1 && s.seen.groups.length === (reported === "CONFIRMED" ? 1 : 0));
    if (PG) {
      const ledger = await prisma()!.ledgerEntry.findMany({ where: { txnId: row.id } });
      ok(`background.wallet.${type}.${reported}.fractional-pg-ledger`, (reported === "CONFIRMED" ? ledger.length >= 2 : ledger.length === 0)
        && ledger.reduce((sum, line) => sum + Number(line.amount), 0) === 0);
    }
  }
  // ── H1 (S9 root review): ONE THROWING ROW NEVER STALLS THE SWEEP. The REAL listByStatus (no one-row stub): poisoned rows are
  // created immediately AHEAD of valid rows of the same arm, among every other PROCESSING row this suite left behind. The
  // provider answers only for these rows; any other reference reads PENDING, so nothing else is settled.
  if (!PG) {
    const staleAt = new Date(Date.now() - 31 * 60_000).toISOString();
    const verdicts = new Map<string, "CONFIRMED" | "FAILED">(), visited: string[] = [];
    const stalePair = async (type: "DEPOSIT" | "WITHDRAWAL", verdict: "CONFIRMED" | "FAILED", poison: "ambiguous" | "short-hold") => {
      const amount = type === "WITHDRAWAL" ? -5000 : 5000;
      const pOwner = await player(), p = await txn(pOwner, { type, amount, createdAt: staleAt });
      // An ambiguous reference: a second, already-terminal row carries the same one, so the lookup refuses it.
      if (poison === "ambiguous") await txn(await player(), { type, amount, status: "CONFIRMED", providerRef: p.providerRef, createdAt: staleAt });
      if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${pOwner}`, { hold: poison === "short-hold" ? 3000 : 5000 });
      const vOwner = await player(), v = await txn(vOwner, { type, amount, createdAt: staleAt });
      if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${vOwner}`, { hold: 5000 });
      verdicts.set(p.providerRef!, verdict); verdicts.set(v.providerRef!, verdict);
      return { p, pOwner, v, vOwner };
    };
    const dc = await stalePair("DEPOSIT", "CONFIRMED", "ambiguous"), df = await stalePair("DEPOSIT", "FAILED", "ambiguous");
    const wf = await stalePair("WITHDRAWAL", "FAILED", "short-hold"), wc = await stalePair("WITHDRAWAL", "CONFIRMED", "ambiguous");
    // M4 rides the same pass: a valid stale deposit stored under a NON-UUID key is credited like any other.
    const opaqueOwner = await player(), opaque = await txn(opaqueOwner, { createdAt: staleAt, idempotencyKey: `idem_double_submit_${++sequence}` });
    verdicts.set(opaque.providerRef!, "CONFIRMED");
    const s = system(src);
    s.verify(async (ref) => { visited.push(ref); const status = verdicts.get(ref); return status ? { status, amount: 5000 } : { status: "PENDING" }; });
    let thrown = false, result: any = null;
    try { result = await s.money.reconcileStalePayments(); } catch { thrown = true; }
    const w = async (owner: string) => db.wallet.findByUserId(owner), st = async (row: { id: string }) => (await db.txn.findById(row.id))?.status;
    const ahead = (pair: { p: { providerRef: string | null }; v: { providerRef: string | null } }) =>
      visited.includes(pair.p.providerRef!) && visited.indexOf(pair.p.providerRef!) < visited.indexOf(pair.v.providerRef!);
    // ⛔ Refuse the premise silently missing: each poisoned row must really have been visited BEFORE its valid row.
    ok("background.isolation.premise-poison-ahead", [dc, df, wf, wc].every(ahead));
    ok("background.isolation.sweep.returned", !thrown && result?.depositsConfirmed === 2 && result?.depositsFailed === 1
      && result?.withdrawalsReversed === 1 && result?.withdrawalsConfirmed === 1 && result?.leftPending >= 4);
    ok("background.isolation.sweep.deposit-confirm", await st(dc.v) === "CONFIRMED" && (await w(dc.vOwner))?.balance === 5000);
    ok("background.isolation.sweep.deposit-fail", await st(df.v) === "FAILED" && (await w(df.vOwner))?.balance === 0);
    ok("background.isolation.sweep.payout-fail-refunded", await st(wf.v) === "FAILED" && (await w(wf.vOwner))?.balance === 5000 && (await w(wf.vOwner))?.hold === 0);
    ok("background.isolation.sweep.payout-confirm", await st(wc.v) === "CONFIRMED" && (await w(wc.vOwner))?.hold === 0 && (await w(wc.vOwner))?.balance === 0);
    const poisoned = [dc, df, wf, wc].map(pair => pair.p.id);
    ok("background.isolation.sweep.poison-left-for-review", (await Promise.all([dc, df, wf, wc].map(pair => st(pair.p)))).every(x => x === "PROCESSING")
      && (await w(dc.pOwner))?.balance === 0 && (await w(wf.pOwner))?.hold === 3000 && (await w(wf.pOwner))?.balance === 0
      && (await w(wc.pOwner))?.hold === 5000 && poisoned.every(id => s.seen.audits.some(a => a.action === "payments.reconcile_needs_review"
        && a.targetId === id && a.payload?.reason === "reconcile settle error — left PROCESSING, not auto-settled" && typeof a.payload?.error === "string")));
    ok("background.opaque-key.sweep", await st(opaque) === "CONFIRMED" && (await w(opaqueOwner))?.balance === 5000);
  }
  // The two fast lanes already isolate per row — a control that they still do, with the same poison ahead of a valid row.
  if (!PG) for (const lane of ["fast-deposit", "fast-payout"] as const) {
    const type = lane === "fast-deposit" ? "DEPOSIT" : "WITHDRAWAL", amount = type === "WITHDRAWAL" ? -5000 : 5000;
    const at = new Date(Date.now() - 25_000).toISOString(), verdicts = new Set<string>(), visited: string[] = [];
    const pOwner = await player(), p = await txn(pOwner, { type, amount, createdAt: at });
    await txn(await player(), { type, amount, status: "CONFIRMED", providerRef: p.providerRef, createdAt: at });
    const vOwner = await player(), v = await txn(vOwner, { type, amount, createdAt: at });
    if (type === "WITHDRAWAL") { await db.wallet.adjust(`wlt_${pOwner}`, { hold: 5000 }); await db.wallet.adjust(`wlt_${vOwner}`, { hold: 5000 }); }
    verdicts.add(p.providerRef!); verdicts.add(v.providerRef!);
    const s = system(src);
    s.verify(async (ref) => { visited.push(ref); return verdicts.has(ref) ? { status: "CONFIRMED", amount: 5000 } : { status: "PENDING" }; });
    let thrown = false;
    try { lane === "fast-deposit" ? await s.money.creditConfirmedDeposits() : await s.money.settleConfirmedWithdrawals(); } catch { thrown = true; }
    const vw = await db.wallet.findByUserId(vOwner);
    ok(`background.isolation.${lane}`, !thrown && visited.indexOf(p.providerRef!) >= 0 && visited.indexOf(p.providerRef!) < visited.indexOf(v.providerRef!)
      && (await db.txn.findById(v.id))?.status === "CONFIRMED" && (await db.txn.findById(p.id))?.status === "PROCESSING"
      && (type === "DEPOSIT" ? vw?.balance === 5000 : vw?.hold === 0));
  }
  // M4: the 15 s lane credits a deposit stored under a non-UUID key; the binding carries opaque bounded keys only.
  {
    const owner = await player(), row = await txn(owner, { idempotencyKey: `rfd:legacy-tooling-key:${++sequence}` });
    const s = system(src);
    s.verify(async (ref) => ref === row.providerRef ? { status: "CONFIRMED", amount: 5000 } : { status: "PENDING" });
    await s.money.creditConfirmedDeposits();
    ok("background.opaque-key.fast-deposit", (await db.txn.findById(row.id))?.status === "CONFIRMED" && (await db.wallet.findByUserId(owner))?.balance === 5000);
    const bind = s.bindingModule;
    const keyed = (key: string | null) => bind.depositRecheckBinding(owner, { ...row, idempotencyKey: key });
    ok("background.opaque-key.binding", ["idem_double_submit_1", "rfd:legacy", "k".repeat(256), "00000000-0000-4000-8000-000000000001", null]
      .every(key => keyed(key)?.fundingKey === key)
      && ["", "k".repeat(257), "x\u0000y", "tab\tkey"].every(key => keyed(key) === null)
      // The browser-POSTED capsule keeps the UUID-or-null shape; a stored opaque key does not make a posted one acceptable.
      && bind.parsePostedDepositRecheckBinding(keyed("idem_double_submit_1")) === null
      && bind.parsePostedDepositRecheckBinding(keyed("00000000-0000-4000-8000-000000000001")) !== null
      && bind.parsePostedDepositRecheckBinding(keyed(null)) !== null);
    // deposit() refuses, before anything is reserved, a key the binding could not carry — and accepts an opaque one.
    const entry = system(src), dispatchesBefore = entry.seen.dispatches;
    const refused = await entry.money.deposit(owner, { amount: 5000, provider: "MPESA", msisdn: "712345678" }, "k".repeat(257));
    const opaqueKey = `idem_opaque_entry_${++sequence}`;
    const accepted = await entry.money.deposit(owner, { amount: 5000, provider: "MPESA", msisdn: "712345678" }, opaqueKey);
    const replay = await entry.money.deposit(owner, { amount: 5000, provider: "MPESA", msisdn: "712345678" }, opaqueKey);
    ok("background.opaque-key.entry-refused", !refused.ok && refused.code === "INVALID" && await db.txn.findByIdempotencyKey("k".repeat(257)) == null
      && entry.seen.dispatches === dispatchesBefore + 1);
    ok("background.opaque-key.entry-accepted", accepted.ok && replay.ok && replay.data.txnId === accepted.data.txnId
      && (await db.txn.findById(accepted.data.txnId))?.idempotencyKey === opaqueKey);
  }
  // H1: in the lifecycle pass each money chore has its own catch, so a reconcile or notice fault never skips the rest.
  for (const fault of ["reconcile-throw", "notify-throw"] as const) {
    const calls: string[] = [];
    const stubs: Record<string, unknown> = {
      "./wallet-service": {
        reconcileStalePayments: async () => { calls.push("reconcile"); if (fault === "reconcile-throw") throw new Error("controlled sweep fault");
          return { depositsFailed: 0, withdrawalsReversed: 0, depositsConfirmed: 0, withdrawalsConfirmed: 0, leftPending: 0 }; },
        notifyStillPendingDeposits: async () => { calls.push("notify"); if (fault === "notify-throw") throw new Error("controlled notice fault"); return { notified: 0 }; },
      },
      "./payout-status": { escalatePayoutOutage: async () => { calls.push("escalate"); return { raised: false }; } },
    };
    const text = `let lastPaymentSweepAt = 0; const PAYMENT_SWEEP_EVERY_MS = 0;\n${fn(src[LIFECYCLE_FILE], "maybePaymentSweeps")}`;
    const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const sweeps = new Function("require", `${js}\nreturn maybePaymentSweeps;`)((id: string) => {
      if (!Object.hasOwn(stubs, id)) throw new Error(`Unexpected lifecycle import ${id}`);
      return stubs[id];
    }) as () => Promise<void>;
    let rejected = false;
    try { await sweeps(); } catch { rejected = true; }
    ok(`background.lifecycle.${fault}`, !rejected && calls.join(">") === "reconcile>notify>escalate");
  }
  // L2: an unchanged provider answer is written once, not restated (under a wallet lock) on every pass.
  for (const lane of ["fast-withdraw", "stale-withdraw"] as const) {
    const owner = await player(), row = await txn(owner, { type: "WITHDRAWAL", amount: -5000,
      createdAt: new Date(Date.now() - (lane === "fast-withdraw" ? 25_000 : 31 * 60_000)).toISOString() });
    await db.wallet.adjust(`wlt_${owner}`, { hold: 5000 });
    let trailWrites = 0;
    const data = { ...db, txn: { ...db.txn,
      listByStatus: async (status: string) => { const fresh = await db.txn.findById(row.id); return fresh?.status === status ? [fresh] : []; },
      update: async (id: string, patch: any, tx?: any) => { if (id === row.id && "providerStatus" in patch) trailWrites++; return db.txn.update(id, patch, tx); },
    } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "PENDING", detail: "still moving at the gateway" }));
    for (let pass = 0; pass < 3; pass++) lane === "fast-withdraw" ? await s.money.settleConfirmedWithdrawals() : await s.money.reconcileStalePayments();
    const fresh = await db.txn.findById(row.id);
    ok(`background.trail.${lane}`, trailWrites === 1 && fresh?.providerStatus === "PENDING: still moving at the gateway" && fresh.status === "PROCESSING"
      && (await db.wallet.findByUserId(owner))?.hold === 5000);
  }
  // L3: the WEBHOOK path keeps its own reason; only the sweep's verified FAILED says "confirmed … did not complete".
  {
    const owner = await player(), row = await txn(owner), s = system(src);
    await s.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: "FAILED" });
    ok("background.reason.webhook-unchanged", s.seen.notices[0]?.reason === "Your payment provider declined the payment."
      && /deposit failed: provider-reported-failure$/.test((await db.txn.findById(row.id))?.description ?? ""));
  }
  // Notice/publication timing and money rollback are SQL facts. Memory Maps intentionally provide neither.
  if (PG) for (const [type, reported] of [["DEPOSIT", "CONFIRMED"], ["DEPOSIT", "FAILED"], ["WITHDRAWAL", "CONFIRMED"], ["WITHDRAWAL", "FAILED"]] as const) {
    for (const rollback of [false, true]) {
      const owner = await player(), row = await txn(owner, { type, amount: type === "WITHDRAWAL" ? -5000 : 5000 });
      if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${owner}`, { hold: 5000 });
      const s = system(src); let noticesBefore = -1, changedInside = false, thrown = false;
      try {
        await withLock(`wallet:${owner}`, async (tx) => {
          await s.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: reported, amount: 5000 });
          const fresh = await db.txn.findById(row.id, tx); changedInside = fresh?.status === reported;
          noticesBefore = s.seen.notices.length;
          if (rollback) throw new Error("controlled outer payment rollback");
        });
      } catch { thrown = true; }
      await new Promise(resolve => setTimeout(resolve, 30));
      const wallet = await db.wallet.findByUserId(owner), fresh = await db.txn.findById(row.id);
      const ledger = await prisma()!.ledgerEntry.findMany({ where: { txnId: row.id } });
      const cash = rollback ? 0 : type === "DEPOSIT" ? reported === "CONFIRMED" ? 5000 : 0 : reported === "FAILED" ? 5000 : 0;
      const hold = type === "WITHDRAWAL" && rollback ? 5000 : 0;
      ok(`background.pg-outer.${type}.${reported}.${rollback ? "rollback" : "commit"}`, changedInside && noticesBefore === 0 && thrown === rollback
        && fresh?.status === (rollback ? "PROCESSING" : reported) && wallet?.balance === cash && wallet.hold === hold
        && ledger.length === (!rollback && reported === "CONFIRMED" ? 2 : 0) && s.seen.notices.length === (rollback ? 0 : 1));
    }
  }
  return checks;
}
async function referenceControls(src: Record<string, string> = sources): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: unknown) => checks.push({ name, pass: !!pass });
  const reservedOwner = await player();
  const blocked = system(src, { ...db, txn: { ...db.txn,
    update: async (id: string, patch: any, tx: any) => patch.providerRef?.startsWith("dep_") ? null : db.txn.update(id, patch, tx),
  } } as typeof db);
  const blockedDeposit = await blocked.money.deposit(reservedOwner, { provider: "MPESA", amount: 5000, msisdn: "+255712345678" },
    `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`);
  ok("reference.pre-dispatch-failure-never-calls-provider", !blockedDeposit.ok && blocked.seen.dispatches === 0);
  const returnedOwner = await player();
  let referenceWrites = 0;
  const returned = system(src, { ...db, txn: { ...db.txn,
    update: async (id: string, patch: any, tx: any) => patch.providerRef?.startsWith("dep_") && ++referenceWrites === 2
      ? null : db.txn.update(id, patch, tx),
  } } as typeof db);
  const returnedKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const returnedDeposit = await returned.money.deposit(returnedOwner, { provider: "MPESA", amount: 5000, msisdn: "+255712345678" }, returnedKey);
  const returnedRow = await db.txn.findByIdempotencyKey(returnedKey);
  ok("reference.post-dispatch-failure-remains-pending", returnedDeposit.ok && returnedDeposit.data.recoveryRequired === true
    && returnedDeposit.data.txnId === returnedRow?.id && returned.seen.dispatches === 1
    && referenceWrites === 2 && returnedRow?.status === "PROCESSING" && (await db.wallet.findByUserId(returnedOwner))?.balance === 0);
  const raceOwner = await player(), dispatchRace = system(src);
  let callbackHandled = false;
  dispatchRace.dispatch(async ({ correlationId }: { correlationId: string }) => {
    callbackHandled = (await dispatchRace.money.settlePaymentWebhook({ providerRef: correlationId, status: "CONFIRMED", amount: 5000 })).handled;
    return { ok: false, reason: "PROVIDER_DOWN", correlationId };
  });
  const raceKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const racedReply = await dispatchRace.money.deposit(raceOwner, { provider: "MPESA", amount: 5000, msisdn: "+255712345678" }, raceKey);
  const racedRow = await db.txn.findByIdempotencyKey(raceKey), racedWallet = await db.wallet.findByUserId(raceOwner);
  ok("dispatch.race.confirmed-not-failed", callbackHandled && racedReply.ok && racedReply.data.recoveryRequired
    && racedReply.data.status === "CONFIRMED" && racedRow?.status === "CONFIRMED" && racedWallet?.balance === 5000
    && dispatchRace.seen.groups.length === 1 && !dispatchRace.seen.audits.some(a => a.action === "deposit.failed"));
  const failedOwner = await player(), failed = system(src);
  failed.dispatch(async ({ correlationId }: { correlationId: string }) => ({ ok: false, reason: "PROVIDER_DOWN", correlationId }));
  const failedKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const failedReply = await failed.money.deposit(failedOwner, { provider: "MPESA", amount: 5000, msisdn: "+255712345678" }, failedKey);
  const failedRow = await db.txn.findByIdempotencyKey(failedKey);
  ok("dispatch.sync-failure-claims-processing", !failedReply.ok && failedRow?.status === "FAILED"
    && (await db.wallet.findByUserId(failedOwner))?.balance === 0 && failed.seen.audits.some(a => a.action === "deposit.failed"));
  const uncertainOwner = await player();
  let walletReads = 0;
  const uncertainData = { ...db, txn: { ...db.txn, update: async (id: string, patch: any, tx: any) =>
    patch.status === "FAILED" ? null : db.txn.update(id, patch, tx) },
    wallet: { ...db.wallet, findByUserId: async (id: string, tx: any) => {
      if (id === uncertainOwner && ++walletReads > 1) throw new Error("controlled balance read fault after dispatch");
      return db.wallet.findByUserId(id, tx);
    } } } as typeof db;
  const uncertain = system(src, uncertainData);
  uncertain.dispatch(async ({ correlationId }: { correlationId: string }) => ({ ok: false, reason: "PROVIDER_DOWN", correlationId }));
  const uncertainKey = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const uncertainReply = await uncertain.money.deposit(uncertainOwner, { provider: "MPESA", amount: 5000, msisdn: "+255712345678" }, uncertainKey);
  ok("dispatch.failed-write-keeps-recovery", uncertainReply.ok && uncertainReply.data.recoveryRequired && uncertainReply.data.balance === 0
    && uncertain.seen.dispatches === 1 && (await db.txn.findByIdempotencyKey(uncertainKey))?.status === "PROCESSING");
  const selector = referenceData(src);
  const unique = await txn(await player());
  ok("reference.unique-and-missing", (await selector.txn.findByProviderRef(unique.providerRef!))?.id === unique.id
    && await selector.txn.findByProviderRef("s9_ref_absent") === null);
  if (PG) {
    const other = await txn(await player());
    let selectedInTx = false, collisionRejected = false;
    try {
      await withLock(`wallet:${unique.userId}`, async (tx) => {
        selectedInTx = (await selector.txn.findByProviderRef(unique.providerRef!, tx))?.id === unique.id;
        await db.txn.update(other.id, { providerRef: unique.providerRef }, tx);
      });
    } catch { collisionRejected = true; }
    const rows = await prisma()!.transaction.findMany({ where: { providerRef: unique.providerRef } });
    ok("reference.pg-unique-current-tx", selectedInTx && collisionRejected && rows.length === 1 && rows[0].id === unique.id
      && (await db.txn.findById(other.id))?.providerRef === other.providerRef);
    // The remaining ambiguity controls deliberately plant duplicate legacy rows.
    // The SQL index makes those fixtures impossible; the memory run retains them
    // to prove settlement still refuses malformed pre-migration data.
    return checks;
  }
  for (const [firstType, secondType] of [["DEPOSIT", "DEPOSIT"], ["DEPOSIT", "WITHDRAWAL"], ["WITHDRAWAL", "DEPOSIT"], ["WITHDRAWAL", "WITHDRAWAL"]] as const) {
    const a = await player(), b = await player();
    const first = await txn(a, { type: firstType, amount: firstType === "WITHDRAWAL" ? -5000 : 5000 });
    const second = await txn(b, { type: secondType, amount: secondType === "WITHDRAWAL" ? -5000 : 5000, providerRef: first.providerRef });
    if (firstType === "WITHDRAWAL") await db.wallet.adjust(`wlt_${a}`, { hold: 5000 });
    if (secondType === "WITHDRAWAL") await db.wallet.adjust(`wlt_${b}`, { hold: 5000 });
    const s = system(src, selector); s.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
    for (const reported of ["CONFIRMED", "FAILED"] as const) {
      let refused = false;
      try { const r = await s.money.settlePaymentWebhook({ providerRef: first.providerRef!, status: reported, amount: 5000 }); refused = !r.handled; }
      catch { refused = true; }
      const wA = await db.wallet.findByUserId(a), wB = await db.wallet.findByUserId(b);
      ok(`reference.ambiguous.${firstType}-${secondType}.${reported}`, refused
        && (await db.txn.findById(first.id))?.status === "PROCESSING" && (await db.txn.findById(second.id))?.status === "PROCESSING"
        && wA?.balance === 0 && wB?.balance === 0 && wA.hold === (firstType === "WITHDRAWAL" ? 5000 : 0)
        && wB.hold === (secondType === "WITHDRAWAL" ? 5000 : 0) && s.seen.groups.length === 0 && s.seen.notices.length === 0);
    }
    const deposit = secondType === "DEPOSIT" ? second : firstType === "DEPOSIT" ? first : null;
    if (deposit) {
      const result = await s.read(deposit.userId, byId(deposit));
      ok(`reference.owned-probe.${firstType}-${secondType}`, result.view.state === "UNKNOWN" && !result.txn
        && s.seen.verifies.length === 0 && s.seen.groups.length === 0 && s.seen.notices.length === 0);
    }
    if (PG) {
      const ledger = await prisma()!.ledgerEntry.findMany({ where: { txnId: { in: [first.id, second.id] } } });
      ok(`reference.pg-no-ledger.${firstType}-${secondType}`, ledger.length === 0);
    }
  }
  // The first global read really is unique. Insert the second persisted row while the actual settlement is waiting
  // at its pre-lock boundary; every mutation door must check the reference again inside its wallet transaction.
  for (const [name, type, stored, reported] of [["deposit-confirm", "DEPOSIT", "PROCESSING", "CONFIRMED"],
    ["deposit-fail", "DEPOSIT", "PROCESSING", "FAILED"], ["withdraw-confirm", "WITHDRAWAL", "PROCESSING", "CONFIRMED"],
    ["withdraw-fail", "WITHDRAWAL", "PROCESSING", "FAILED"], ["deposit-review", "DEPOSIT", "FAILED", "CONFIRMED"]] as const) {
    const a = await player(), b = await player(), own = await txn(a, { type, status: stored, amount: type === "WITHDRAWAL" ? -5000 : 5000 });
    if (type === "WITHDRAWAL") await db.wallet.adjust(`wlt_${a}`, { hold: 5000 });
    let entered!: () => void, release!: () => void, delayed = false, referenceInside = false, sameTx = false;
    const enteredRead = new Promise<void>(r => { entered = r; }), releasedRead = new Promise<void>(r => { release = r; });
    const data = { ...selector, txn: { ...selector.txn,
      findById: async (id: string, tx: any) => {
        const row = await db.txn.findById(id, tx);
        if (id === own.id && !inLock() && !delayed) { delayed = true; entered(); await releasedRead; }
        return row;
      },
      findByProviderRef: async (ref: string, tx: any) => {
        if (inLock()) { referenceInside = true; sameTx = tx === currentLockTx() && (!PG || !!tx); }
        return selector.txn.findByProviderRef(ref, tx);
      },
    } } as typeof db;
    const s = system(src, data);
    const settling = s.money.settlePaymentWebhook({ providerRef: own.providerRef!, status: reported, amount: 5000 })
      .then((r: any) => !r.handled, () => true);
    const reached = await Promise.race([enteredRead.then(() => true), settling.then(() => false)]);
    let foreign: any = null;
    try { if (reached) foreign = await txn(b, { providerRef: own.providerRef }); } finally { release(); }
    const refused = await settling, after = await db.txn.findById(own.id), wallet = await db.wallet.findByUserId(a);
    ok(`reference.late.${name}`, reached && refused && referenceInside && sameTx && after?.status === stored
      && after?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK && wallet?.balance === 0
      && wallet.hold === (type === "WITHDRAWAL" ? 5000 : 0) && (await db.wallet.findByUserId(b))?.balance === 0
      && (await db.txn.findById(foreign?.id ?? "absent"))?.status === "PROCESSING" && s.seen.groups.length === 0 && s.seen.notices.length === 0);
  }
  // A collision arising while provider I/O is outstanding must not escape the reader as PENDING or safe FAILED.
  const a = await player(), b = await player(), own = await txn(a), raced = system(src, selector);
  raced.verify(async () => { await txn(b, { providerRef: own.providerRef }); return { status: "CONFIRMED", amount: own.amount }; });
  const result = await raced.read(a, byId(own));
  ok("reference.probe-race-unknown", result.view.state === "UNKNOWN" && !result.txn && raced.seen.groups.length === 0
    && raced.seen.notices.length === 0 && (await db.txn.findById(own.id))?.status === "PROCESSING"
    && (await db.wallet.findByUserId(a))?.balance === 0 && (await db.wallet.findByUserId(b))?.balance === 0);
  for (const kind of ["move-to-foreign", "move-to-foreign-terminal", "raw-mutable"] as const) {
    const a = await player(), b = await player(), own = await txn(a), foreign = await txn(b, { status: kind === "move-to-foreign-terminal" ? "FAILED" : "PROCESSING" }), oldRef = own.providerRef!, newRef = oldRef + "_new";
    const s = system(src, selector);
    s.verify(async () => {
      if (kind === "raw-mutable") {
        if (PG) await prisma()!.transaction.update({ where: { id: own.id }, data: { providerRef: newRef } });
        else Object.assign((await db.txn.findById(own.id))!, { providerRef: newRef });
      } else {
        await db.txn.update(own.id, { providerRef: newRef });
        await db.txn.update(foreign.id, { providerRef: oldRef });
      }
      return { status: "CONFIRMED", amount: 5000 };
    });
    const r = await s.read(a, byId(own));
    ok(`reference.original.${kind}`, r.view.state === "UNKNOWN" && !r.txn && s.seen.verifies.join() === oldRef
      && (await db.wallet.findByUserId(a))?.balance === 0 && (await db.wallet.findByUserId(b))?.balance === 0
      && (await db.txn.findById(own.id))?.status === "PROCESSING" && (await db.txn.findById(foreign.id))?.status === (kind === "move-to-foreign-terminal" ? "FAILED" : "PROCESSING")
      && s.seen.groups.length === 0 && s.seen.notices.length === 0 && s.seen.reviewAttempts === 0
      && s.seen.audits.every(audit => audit.actorId !== b && audit.targetId !== foreign.id));
  }
  // The binding also reaches the actual wallet claim, rather than ending at the post-provider global selection.
  for (const [field, patch] of [["amount", { amount: 6000 }], ["phone", { msisdn: "+255712345679" }],
    ["key", { idempotencyKey: "changed" }], ["provider", { provider: "CARD" }]] as const) {
    const owner = await player(), row = await txn(owner);
    let changed = false, inWallet = false;
    const data = { ...selector, txn: { ...selector.txn, findById: async (id: string, tx: any) => {
      if (id === row.id && inLock() && !changed) {
        changed = true; inWallet = tx === currentLockTx() && (!PG || !!tx);
        await db.txn.update(id, (field === "key" ? { idempotencyKey: `${patch.idempotencyKey}_${row.id}` } : patch) as never, tx);
      }
      return db.txn.findById(id, tx);
    } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
    const r = await s.read(owner, byId(row));
    ok(`reference.original.claim.${field}`, changed && inWallet && r.view.state !== "PAID"
      && (await db.wallet.findByUserId(owner))?.balance === 0 && (await db.txn.findById(row.id))?.status === "PROCESSING"
      && s.seen.groups.length === 0 && s.seen.notices.length === 0);
  }
  return checks;
}
async function run(src = sources): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: unknown) => checks.push({ name, pass: !!pass });
  checks.push(...await referenceControls(src));
  const me = await player(), other = await player(), own = await txn(me), s = system(src);
  const mapper = new Function("num", "iso", ts.transpileModule(fn(src[files[12]], "toStoredWallet"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\nreturn toStoredWallet;")(
      (n: unknown) => Number(n ?? 0), (at: unknown) => new Date(String(at)).toISOString());
  const mapperAt = new Date().toISOString();
  ok("truth.wallet-mapper-retains-unit", ["TZS", "USD"].every(currency => mapper({ currency, createdAt: mapperAt, updatedAt: mapperAt }).currency === currency));
  const writers = providerWriters(src);
  const ordinaryWriters = writers.filter(w => w.fn !== "markDepositStatusReview");
  ok("review.provider-writers-scoped", writers.every(w => w.file === files[1]) && ordinaryWriters.length === 5
    && ordinaryWriters.every(w => ["dispatchApprovedWithdrawal", "settleConfirmedWithdrawals", "reconcileStalePayments", "withdraw"].includes(w.fn))
    && ordinaryWriters.every(w => w.fn === "dispatchApprovedWithdrawal" ? w.body.includes('pre.type !== "WITHDRAWAL"')
      : w.fn === "settleConfirmedWithdrawals" ? w.body.includes('listByStatus("PROCESSING")') && w.body.includes("isFastPayoutCandidate")
        && fn(src[files[1]], "isFastPayoutCandidate").includes('t.type !== "WITHDRAWAL"')
      : w.fn === "reconcileStalePayments" ? w.body.includes('else if (t.type === "WITHDRAWAL")')
      : w.body.includes('type: "WITHDRAWAL"') && /if \(hold\.duplicate\)/.test(w.body)));
  for (const tag of [Review.DEPOSIT_STATUS_REVIEW_MARK + " extra", "prefix " + Review.DEPOSIT_STATUS_REVIEW_MARK,
    Review.DEPOSIT_STATUS_REVIEW_MARK.toUpperCase(), null]) {
    const row = { type: "DEPOSIT", status: "FAILED", providerStatus: tag };
    ok("review.exact-marker", !s.reviewModule.hasDepositStatusReview(row) && s.receiptsModule.presentedStatus(row) === "FAILED"
      && s.receiptsModule.depositResultStatus(row) === "FAILED");
  }
  const wrongTypeMarker = { type: "WITHDRAWAL", status: "FAILED", providerStatus: Review.DEPOSIT_STATUS_REVIEW_MARK };
  ok("review.deposit-only", !s.reviewModule.hasDepositStatusReview(wrongTypeMarker) && s.receiptsModule.presentedStatus(wrongTypeMarker) === "FAILED");
  const notifierJs = ts.transpileModule(fn(src[files[7]], "notifyDeposit"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const notify = new Function("formatTzs", "notify", `${notifierJs}\nreturn notifyDeposit;`)(formatTzs, (row: any) => row);
  const reviewNotice = notify(me, { status: "AML_REVIEW", amount: 5000, provider: "M-Pesa", txnId: own.id });
  ok("review.bell-copy", reviewNotice.kind === "DEPOSIT" && reviewNotice.href === `/wallet/receipt/${own.id}`
    && reviewNotice.bodyEn.includes("Don't pay again") && reviewNotice.bodySw.includes("Usilipe tena") && reviewNotice.bodyZh.includes("请勿重复支付")
    && !JSON.stringify(reviewNotice).includes(Review.DEPOSIT_STATUS_REVIEW_MARK));
  // The LABEL of a held deposit MATCHES ITS BODY — held for return, in all three languages, never "Reversed" (Ali,
  // 2026-10-14, superseding the 2026-10-07 "Reversed" label for held deposits). The BODIES (approved as written) say what is
  // true while the money waits and claim no delivered return (the 2026-10-07 entry records that claim as untrue).
  const heldNotice = notify(me, { status: "REVERSED", amount: 5000, provider: "M-Pesa", txnId: own.id });
  ok("rg.bell-does-not-claim-refund", heldNotice.bodyEn.includes("held for return") && heldNotice.bodySw.includes("zinashikiliwa")
    && heldNotice.bodyZh.includes("待退还") && !/has been returned|imerudishwa|已(?:原路)?退回/.test(heldNotice.bodyEn + heldNotice.bodySw + heldNotice.bodyZh));
  ok("rg.bell-title-matches-body", heldNotice.titleEn.startsWith("Deposit held for return · ") && heldNotice.titleSw.startsWith("Amana imeshikiliwa ili irudishwe · ")
    && heldNotice.titleZh.startsWith("充值暂扣待退还 · ") && !/reversed|imerudishwa|已退回/i.test(heldNotice.titleEn + heldNotice.titleSw + heldNotice.titleZh));
  const dictionary = compile(src[files[11]], {}).dict;
  const HELD_CARD_TITLE: Record<string, string> = { en: "Payment held for return", sw: "Malipo yanashikiliwa ili yarudishwe", zh: "付款暂扣待退还" };
  const HELD_STATUS_WORD: Record<string, string> = { en: "Held for return", sw: "Imeshikiliwa ili irudishwe", zh: "暂扣待退还" };
  const HELD_PHRASE: Record<string, string> = { en: "held for return", sw: "zinashikiliwa ili zirudishwe", zh: "待退还" };
  for (const locale of ["en", "sw", "zh"]) {
    const words = dictionary[locale].wallet;
    ok(`rg.card-copy.${locale}`, words.returnReversedBody.includes(HELD_PHRASE[locale])
      && !/has been returned|goes back to the card|yamerudishwa|Yanarudishwa|已退回|将退回/.test(words.returnReversedBody));
    ok(`rg.card-title.${locale}`, words.returnReversedTitle === HELD_CARD_TITLE[locale]);
    ok(`rg.status-word.${locale}`, words.txnStatusHeld === HELD_STATUS_WORD[locale] && words.txnStatusHeld !== words.txnStatusReversed);
  }
  // Execute the actual template body with controlled chrome helpers; the notification suite separately renders its full HTML.
  const heldMail = new Function("wrap", "eyebrow", "heading", "subtitle", "subtitleSw", "detailRows", "depositRefRows", "refNote", "formatTzs",
    ts.transpileModule(fn(src[files[10]], "depositReversedHtml"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\nreturn depositReversedHtml;")(
      (body: string) => body, (en: string, sw: string) => en + " " + sw, (text: string) => text, (text: string) => text, (text: string) => text,
      (rows: any[]) => JSON.stringify(rows), (reference: string, gatewayRef: string) => [{ reference, gatewayRef }], () => "", formatTzs)({ amount: 5000, method: "M-Pesa", reference: own.id, gatewayRef: own.providerRef });
  ok("rg.mail-no-delivery-promise", heldMail.includes("held for return") && heldMail.includes("zinashikiliwa ili zirudishwe")
    && heldMail.includes("has not been confirmed") && !/returned to the account it came from|Amana imerudishwa kwenye|5 working days|siku 5 za kazi/.test(heldMail));
  ok("rg.mail-label-matches-body", heldMail.includes("Deposit held for return Amana imeshikiliwa ili irudishwe") && heldMail.includes("This deposit is held for return")
    && heldMail.includes('"label":"Status","value":"Held for return"') && !/Deposit reversed|This deposit was reversed|"value":"Reversed"|Amana imerudishwa/.test(heldMail));
  const missing = await s.read(me, { kind: "txn-id", value: "absent" });
  ok("scope.missing", missing.view.state === "UNKNOWN" && !missing.txn && s.seen.verifies.length === 0);
  for (const [name, caller, patch] of [["owner", other, {}], ["type", me, { type: "WITHDRAWAL", amount: -5000 }],
    ["currency", me, { currency: "USD" }], ["house", me, { houseBotId: "s9_fixture_house" }]] as const) {
    const row = await txn(me, patch), before = s.seen.verifies.length, audits = s.seen.audits.length, result = await s.read(caller, byId(row));
    ok(`scope.${name}`, result.view.state === "UNKNOWN" && !result.txn && s.seen.verifies.length === before && s.seen.settles === 0
      && s.seen.audits.length === audits + 1 && s.seen.audits.at(-1).action === "deposit.status.lookup_refused");
  }
  ok("scope.audit-minimal", s.seen.audits.filter(a => a.action === "deposit.status.lookup_refused").length === 5
    && s.seen.audits.every(a => a.targetId === null && JSON.stringify(a.payload).indexOf("dep_s9_") < 0));
  ok("rate.scope-caller-only", s.seen.rateCalls.every(c => c.action === "deposit.status" && [me, other].includes(c.key)));
  const keyRead = await s.read(me, { kind: "funding-key", value: own.idempotencyKey! });
  ok("recovery.owned-read-only", keyRead.view.state === "PENDING" && keyRead.view.txnId === own.id && s.seen.verifies.length === 0 && s.seen.settles === 0);
  ok("recovery.foreign", (await s.read(other, { kind: "funding-key", value: own.idempotencyKey! })).view.state === "UNKNOWN");
  ok("recovery.malformed", (await s.read(me, { kind: "funding-key", value: "not-a-uuid" })).view.state === "UNKNOWN");
  s.seen.statusAllowed = false;
  const capped = await s.read(me, byId(own));
  ok("rate.caller-before-probe", capped.rateLimited && capped.view.state === "UNKNOWN" && capped.view.retryAfterSec === 10 && s.seen.verifies.length === 0);
  s.seen.statusAllowed = true; s.seen.probeAllowed = false;
  const probeCapped = await s.read(me, byId(own));
  ok("rate.probe-keeps-pending", probeCapped.view.state === "PENDING" && probeCapped.view.retryAfterSec === 10 && s.seen.verifies.length === 0
    && s.seen.rateCalls.at(-1)?.key === own.id && s.seen.rateCalls.at(-1)?.action === "deposit.probe");
  let cappedLookups = 0;
  const capBeforeRead = system(src, { ...db, txn: { ...db.txn, findById: async () => { cappedLookups++; throw new Error("lookup must not run"); } } } as typeof db);
  capBeforeRead.seen.statusAllowed = false;
  const noLookup = await capBeforeRead.read(me, byId(own));
  ok("rate.refusal-before-lookup", noLookup.rateLimited && cappedLookups === 0);
  s.seen.probeAllowed = true;
  for (const [name, patch] of [["fresh", { createdAt: new Date(Date.now() - 10_000).toISOString() }], ["card", { provider: "CARD", msisdn: null }],
    ["unknown-rail", { provider: PG ? "INTERNAL" : "RETIRED" }], ["no-ref", { providerRef: null }], ["bad-phone", { msisdn: null }]] as const) {
    const row = await txn(me, patch), before = s.seen.verifies.length;
    await s.read(me, byId(row));
    ok(`probe.${name}`, s.seen.verifies.length === before);
  }
  for (const verdict of ["PENDING", "UNSUPPORTED", "UNRECOGNISED", "THROW"]) {
    const row = await txn(me), x = system(src);
    x.verify(async () => { if (verdict === "THROW") throw new Error("controlled transport fault"); return { status: verdict }; });
    const result = await x.read(me, byId(row));
    ok(`authority.${verdict}`, result.view.state === "PENDING" && (await db.txn.findById(row.id))?.status === "PROCESSING" && x.seen.settles === 0);
  }
  const mismatch = await txn(me), m = system(src); m.verify(async () => ({ status: "CONFIRMED", amount: 6000 }));
  const rejected = await m.read(me, byId(mismatch));
  ok("authority.amount-mismatch", rejected.view.state === "PENDING" && (await db.wallet.findByUserId(me))?.balance === 0
    && m.seen.audits.some(a => a.action === "webhook.amount_mismatch") && m.seen.audits.some(a => a.action === "payments.reconcile_needs_review"));
  const card = await txn(me, { provider: "CARD", msisdn: null, createdAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString() }), c = system(src);
  const cardRead = await c.read(me, { kind: "card-order", value: card.providerRef! });
  ok("card.later-signed-check", cardRead.view.state === "PENDING" && c.seen.verifies.length === 1);
  const invalidCard = await txn(me, { provider: "CARD", msisdn: null, createdAt: new Date(Date.now() + 60_000).toISOString() });
  const beforeCard = c.seen.verifies.length, invalidCardRead = await c.read(me, { kind: "card-order", value: invalidCard.providerRef! });
  ok("card.invalid-chronology-no-probe", invalidCardRead.view.state === "UNKNOWN" && c.seen.verifies.length === beforeCard);
  const held = await txn(me), h = system(src); h.seen.locked = true; h.verify(async () => ({ status: "CONFIRMED", amount: held.amount }));
  const heldRead = await h.read(me, byId(held));
  ok("money.rg-hold", heldRead.view.state === "HELD" && heldRead.view.status === "REVERSED" && heldRead.view.balance === 0
    && h.seen.groups.join() === `rgsusp_${held.id}` && h.seen.notices.filter(n => n.status === "REVERSED").length === 1);
  const generic = await txn(me, { status: "AML_REVIEW", amlReason: "generic-review" });
  ok("truth.review-not-failed", (await s.read(me, byId(generic))).view.state === "REVIEW");
  const paidOwner = await player(), paid = await txn(paidOwner), p = system(src);
  p.verify(async () => ({ status: "CONFIRMED", amount: paid.amount }));
  const raced = await Promise.all([p.read(paidOwner, byId(paid)), p.read(paidOwner, byId(paid)),
    p.money.settlePaymentWebhook({ providerRef: paid.providerRef!, status: "CONFIRMED", amount: paid.amount })]);
  await new Promise(r => setImmediate(r));
  ok("money.exactly-once-credit", (await db.wallet.findByUserId(paidOwner))?.balance === 5000 && (await db.txn.findById(paid.id))?.status === "CONFIRMED");
  ok("money.exactly-once-notice", p.seen.notices.filter(n => n.status === "CONFIRMED").length === 1 && p.seen.funnels === 1);
  ok("money.one-ledger-group", p.seen.groups.join() === `dep_${paid.id}`);
  ok("truth.fresh-row-after-race", raced.slice(0, 2).every(r => r.view.state === "PAID" && r.view.balance === 5000));
  const classicPaid = await p.money.settleDepositFromReturn(paidOwner, paid.providerRef!);
  ok("card.adapter-paid-fresh", classicPaid.state === "PAID" && classicPaid.txn.id === paid.id && classicPaid.balance === 5000);
  const classicHeld = await h.money.settleDepositFromReturn(me, held.providerRef!);
  ok("card.adapter-held-truth", classicHeld.state === "REVERSED" && classicHeld.balance === 0);
  const heldBeforeRejection = await db.txn.findById(held.id);
  const ledgerBeforeRejection = PG ? await prisma()!.ledgerEntry.findMany({ where: { txnId: held.id }, orderBy: { id: "asc" } }) : null;
  await h.money.refundAmlRejection(heldBeforeRejection, "Local officer rejection fixture; no outbound payment occurred");
  const rejectedHeld = await h.read(me, { kind: "funding-key", value: held.idempotencyKey! });
  ok("rg.rejection-not-refund-authority", rejectedHeld.view.state === "HELD" && rejectedHeld.view.status === "REVERSED"
    && (await db.txn.findById(held.id))?.status === "FAILED" && rejectedHeld.view.balance === 0);
  const noticesBeforeCollectionRepeat = h.seen.notices.length;
  const repeatedCollection = await h.money.settlePaymentWebhook({ providerRef: held.providerRef!, status: "CONFIRMED", amount: held.amount });
  await h.money.settlePaymentWebhook({ providerRef: held.providerRef!, status: "CONFIRMED", amount: held.amount });
  ok("rg.collection-duplicate-stays-held", repeatedCollection.handled && repeatedCollection.reason === "already-rg-held"
    && (await h.read(me, { kind: "funding-key", value: held.idempotencyKey! })).view.state === "HELD"
    && (await db.wallet.findByUserId(me))?.balance === 0 && h.seen.groups.join() === `rgsusp_${held.id}`
    && h.seen.notices.length === noticesBeforeCollectionRepeat && !Review.hasDepositStatusReview((await db.txn.findById(held.id))!));
  const wrongCollection = await h.money.settlePaymentWebhook({ providerRef: held.providerRef!, status: "CONFIRMED", amount: 6000 });
  ok("rg.collection-amount-mismatch-not-duplicate", !wrongCollection.handled && wrongCollection.reason === "amount-mismatch"
    && h.seen.audits.some(a => a.action === "webhook.amount_mismatch" && a.targetId === held.id && a.payload.got === 6000)
    && (await db.txn.findById(held.id))?.status === "FAILED" && (await db.wallet.findByUserId(me))?.balance === 0
    && h.seen.groups.join() === `rgsusp_${held.id}` && h.seen.notices.length === noticesBeforeCollectionRepeat);
  if (PG) {
    const afterRejection = await prisma()!.ledgerEntry.findMany({ where: { txnId: held.id }, orderBy: { id: "asc" } });
    ok("pg.rg-rejection-no-outbound-ledger", JSON.stringify(afterRejection) === JSON.stringify(ledgerBeforeRejection)
      && afterRejection.some(row => row.account === "HOUSE:RG_SUSPENSE" && Number(row.amount) === 5000));
  }
  const classicReview = await s.money.settleDepositFromReturn(me, generic.providerRef!);
  ok("card.adapter-review", classicReview.state === "REVIEW" && classicReview.balance === 0 && classicReview.txn.id === generic.id);
  const contradicted = await p.money.settlePaymentWebhook({ providerRef: paid.providerRef!, status: "FAILED" });
  ok("money.contradiction-escalated", !contradicted.handled && p.seen.audits.some(a => a.action === "webhook.terminal_contradicted")
    && (await db.wallet.findByUserId(paidOwner))?.balance === 5000 && (await db.txn.findById(paid.id))?.status === "CONFIRMED");
  // Pause a failure's PRE-lock read with a real old row, let confirmation credit, then release the failure. The final
  // claim must reread under the same wallet lock; the earlier row is not permission to overwrite a paid deposit.
  const failRaceOwner = await player(), failRaceRow = await txn(failRaceOwner);
  let entered!: () => void, release!: () => void, reads = 0;
  const enteredRead = new Promise<void>(r => { entered = r; }), releasedRead = new Promise<void>(r => { release = r; });
  const delayed = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => {
    const row = await db.txn.findById(id, tx);
    if (id === failRaceRow.id && ++reads === 2) { const old = row && { ...row }; entered(); await releasedRead; return old; }
    return row;
  } } } as typeof db;
  const failRace = system(src, delayed);
  failRace.verify(async () => ({ status: "FAILED" }));
  const failure = failRace.read(failRaceOwner, byId(failRaceRow));
  await enteredRead;
  try { await failRace.money.settlePaymentWebhook({ providerRef: failRaceRow.providerRef!, status: "CONFIRMED", amount: 5000 }); }
  finally { release(); }
  const failureRead = await failure;
  ok("money.failed-cannot-overwrite-confirmed", failureRead.view.state === "REVIEW" && (await db.txn.findById(failRaceRow.id))?.status === "CONFIRMED"
    && (await db.wallet.findByUserId(failRaceOwner))?.balance === 5000 && failRace.seen.notices.filter(n => n.status === "FAILED").length === 0);
  ok("money.raced-contradiction-escalated", failRace.seen.audits.some(a => a.action === "webhook.terminal_contradicted")
    && failRace.seen.audits.some(a => a.action === "payments.reconcile_needs_review"));
  const confirmRaceOwner = await player(), confirmRaceRow = await txn(confirmRaceOwner);
  let confirmEntered!: () => void, confirmRelease!: () => void, confirmReads = 0;
  const confirmedReadEntered = new Promise<void>(r => { confirmEntered = r; }), confirmReleased = new Promise<void>(r => { confirmRelease = r; });
  const delayedConfirm = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => {
    const row = await db.txn.findById(id, tx);
    if (id === confirmRaceRow.id && ++confirmReads === 2) { const old = row && { ...row }; confirmEntered(); await confirmReleased; return old; }
    return row;
  } } } as typeof db;
  const confirmRace = system(src, delayedConfirm); confirmRace.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
  const confirmRead = confirmRace.read(confirmRaceOwner, byId(confirmRaceRow));
  await confirmedReadEntered;
  try { await confirmRace.money.settlePaymentWebhook({ providerRef: confirmRaceRow.providerRef!, status: "FAILED" }); }
  finally { confirmRelease(); }
  const opposingResult = await confirmRead;
  ok("money.raced-confirmation-no-auto-credit", opposingResult.view.state !== "PAID" && (await db.wallet.findByUserId(confirmRaceOwner))?.balance === 0
    && (await db.txn.findById(confirmRaceRow.id))?.status === "FAILED" && confirmRace.seen.groups.length === 0);
  ok("money.raced-confirmation-escalated", confirmRace.seen.audits.some(a => a.action === "webhook.terminal_contradicted")
    && confirmRace.seen.audits.some(a => a.action === "payments.reconcile_needs_review"));
  for (const [name, owner, row, entry, stored] of [["confirmed", failRaceOwner, failRaceRow, failRace, "CONFIRMED"],
    ["failed", confirmRaceOwner, confirmRaceRow, confirmRace, "FAILED"]] as const) {
    const saved = await db.txn.findById(row.id);
    ok(`review.${name}.durable`, saved?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK && saved.status === stored
      && entry.receiptsModule.presentedStatus(saved) === "AML_REVIEW" && entry.seen.notices.filter(n => n.status === "AML_REVIEW").length === 1);
    await entry.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: stored });
    await entry.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: stored === "CONFIRMED" ? "FAILED" : "CONFIRMED" });
    const reread = await entry.read(owner, { kind: "funding-key", value: row.idempotencyKey! });
    ok(`review.${name}.duplicate-persists`, (await db.txn.findById(row.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK
      && reread.view.state === "REVIEW" && reread.view.status === "AML_REVIEW" && entry.seen.notices.filter(n => n.status === "AML_REVIEW").length === 1);
    const replay = await entry.money.deposit(owner, { amount: 5000, provider: "MPESA", msisdn: "712345678" }, row.idempotencyKey!);
    ok(`review.${name}.replay-not-safe-retry`, replay.ok && replay.data.status === "AML_REVIEW" && (await db.txn.findById(row.id))?.status === stored);
    for (const [path, hidden] of [["locked", 1], ["create-catch", 2]] as const) {
      let misses = hidden, dispatches = 0;
      const recoveryData = { ...db, txn: { ...db.txn,
        findByIdempotencyKey: async (key: string) => misses-- > 0 ? null : db.txn.findByIdempotencyKey(key),
        create: async (input: any) => {
          if (!PG && await db.txn.findByIdempotencyKey(input.idempotencyKey)) throw Object.assign(new Error("controlled memory unique backstop"), { code: "P2002" });
          return db.txn.create(input);
        },
      } } as typeof db;
      const recovery = system(src, recoveryData);
      recovery.verify(async () => { dispatches++; throw new Error("No provider I/O during replay"); });
      const recovered = await recovery.money.deposit(owner, { amount: 5000, provider: "MPESA", msisdn: "712345678" }, row.idempotencyKey!);
      ok(`review.${name}.${path}-replay`, recovered.ok && recovered.data.txnId === row.id && recovered.data.status === "AML_REVIEW"
        && dispatches === 0 && (await db.txn.findById(row.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK);
    }
  }
  // Render the shipped async receipt with real React. Kit/chrome leaves are controlled, not visual measurements.
  const leaf = ({ children }: any) => ReactRuntime.jsx("div", { children });
  const glyph = () => ReactRuntime.jsx("span", {});
  for (const [name, owner, row] of [["confirmed-review", failRaceOwner, failRaceRow], ["failed-review", confirmRaceOwner, confirmRaceRow], ["rg-rejected-held", me, held]] as const) {
    for (const locale of ["en", "sw", "zh"]) {
      const t = dictionary[locale];
      const receipt = compile(src[files[9]], {
        "react/jsx-runtime": ReactRuntime, "next/link": { default: ({ href, children }: any) => ReactRuntime.jsx("a", { href, children }) },
        "next/navigation": { notFound: () => { throw new Error("not-found"); }, redirect: () => { throw new Error("redirect"); } },
        "@/components/ui/glyphs": { I: new Proxy({}, { get: () => glyph }) }, "@/components/ui/back-link": { BackLink: leaf },
        "@/components/ui/page-header": { PageHeader: ({ title, subtitle }: any) => ReactRuntime.jsxs("header", { children: [
          ReactRuntime.jsx("div", { children: title }, "title"), ReactRuntime.jsx("p", { children: subtitle }, "subtitle") ] }) },
        "@/components/ui/page-hero": { PageHero: leaf }, "@/components/ui/chip": { Chip: leaf },
        "@/lib/server/auth-service": { currentSession: async () => ({ userId: owner }) }, "@/lib/server/store": { db },
        "@/lib/i18n-server": { getServerT: async () => ({ t, locale }) }, "@/lib/utils": { formatTzs },
        "@/lib/eat-day": { formatEatDateTime: () => "controlled-local-date" }, "@/lib/status-tone": { playerStatusChip: () => "neutral" },
        "@/lib/wallet/ledger": WalletLedger, "@/lib/wallet/receipts": s.receiptsModule,
        "@/components/ui/refresh-poller": { RefreshPoller: ({ enabled }: any) => ReactRuntime.jsx("span", { "data-refresh": String(enabled) }) },
        "@/components/ui/cash": { Cash: leaf }, "@/components/ui/keep-words": { keepIdRuns: (id: string) => id },
        "@/components/layout/page-container": { PageContainer: leaf }, "@/components/ui/callout": { Callout: leaf },
        "@/lib/journey/deposit-state": { parseSavedDepositBet: D.parseSavedDepositBet },
      });
      const html = renderToStaticMarkup(await receipt.default({ params: Promise.resolve({ id: row.id }) }));
      const shown = name === "rg-rejected-held" ? "REVERSED" : "AML_REVIEW";
      const expectedBody = name === "rg-rejected-held" ? t.wallet.returnReversedBody : t.wallet.returnReviewBody;
      const containsText = (text: string) => html.includes(renderToStaticMarkup(ReactRuntime.jsx("span", { children: text })).slice(6, -7));
      ok(`receipt.${name}.${locale}`, html.includes(`data-status="${shown}"`) && containsText(expectedBody)
        && html.includes('data-refresh="false"') && !containsText(t.wallet.receiptPendingNote)
        && !containsText(t.wallet.receiptCompletedAt) && !containsText(t.wallet.balanceAfter));
      // Ali, 2026-10-14: the chip NAMES a held deposit "Held for return" (filed as REVERSED above), never "Reversed".
      const chipWord = name === "rg-rejected-held" ? t.wallet.txnStatusHeld : t.wallet.txnStatusReview;
      ok(`receipt.${name}.chip.${locale}`, containsText(chipWord) && !containsText(t.wallet.txnStatusReversed));
    }
  }
  // ── The /wallet RESULT (S9 RC, Ali 2026-10-14). The server decides the kind from the STORED row (`depositResultKind`, the
  // real receipts module of this run); the client's words are `walletResultCopy` (the real result-copy module). L6: a deposit
  // under review reads under-review words, never its raw "Failed" / "Funds added"; a held deposit is named held for return.
  {
    const kindOf = s.receiptsModule.depositResultKind as (row: any) => string | null;
    const copy = compile(src[RESULT_COPY_FILE], { "./result-phase": ResultPhase }).walletResultCopy as
      (t: any, o: { isWithdraw: boolean; status?: string; depositKind?: string | null }) => { eyebrow: string; title: string; subtitle?: string; variant: string };
    const D_ = (patch: Record<string, unknown>) => ({ type: "DEPOSIT", status: "FAILED", amlReason: null, providerStatus: null, ...patch });
    const MARK = Review.DEPOSIT_STATUS_REVIEW_MARK;
    ok("kind.review-marked-failed", kindOf(D_({ status: "FAILED", providerStatus: MARK })) === "review");
    ok("kind.review-marked-confirmed", kindOf(D_({ status: "CONFIRMED", providerStatus: MARK })) === "review");
    ok("kind.held-waiting", kindOf(D_({ status: "AML_REVIEW", amlReason: `${RG_RETURN_MARK}cooling_off` })) === "held");
    ok("kind.held-returned", kindOf(D_({ status: "FAILED", amlReason: `${RG_RETURN_MARK}cooling_off · returned` })) === "held");
    ok("kind.generic-review", kindOf(D_({ status: "AML_REVIEW", amlReason: "officer review" })) === "review");
    ok("kind.plain", ["FAILED", "CONFIRMED", "PROCESSING", "REVERSED", "CANCELLED"].every((status) => kindOf(D_({ status })) === null));
    ok("kind.withdrawal", kindOf({ type: "WITHDRAWAL", status: "AML_REVIEW", amlReason: null, providerStatus: MARK }) === null);
    for (const locale of ["en", "sw", "zh"]) {
      const t = dictionary[locale];
      const never = [t.wallet.txnStatusReversed, t.wallet.depositFailed, t.common.fundsAdded, t.wallet.txnStatusFailed];
      const clean = (c: { eyebrow: string; title: string; subtitle?: string }) => never.every((w) => ![c.eyebrow, c.title, c.subtitle ?? ""].includes(w));
      for (const [label, stored] of [["review", "FAILED"], ["review-confirmed", "CONFIRMED"]] as const) {
        const c = copy(t, { isWithdraw: false, status: stored, depositKind: "review" });
        ok(`copy.${label}.${locale}`, c.eyebrow === t.wallet.txnStatusReview && c.title === t.wallet.returnReviewTitle
          && c.subtitle === t.wallet.reviewResultBody && c.variant === "info" && clean(c));
      }
      for (const [label, kind] of [["held", "held"], ["held-default", undefined]] as const) {
        const c = copy(t, { isWithdraw: false, status: "AML_REVIEW", depositKind: kind });
        ok(`copy.${label}.${locale}`, c.eyebrow === t.wallet.txnStatusHeld && c.title === t.wallet.returnReversedTitle
          && c.subtitle === t.wallet.returnReversedBody && c.variant === "neutral" && clean(c));
      }
      // Every other result keeps its D3a reading, word for word.
      const f = copy(t, { isWithdraw: false, status: "FAILED" }), ok_ = copy(t, { isWithdraw: false, status: "CONFIRMED" });
      const mv = copy(t, { isWithdraw: false, status: "PROCESSING" }), rv = copy(t, { isWithdraw: false, status: "REVERSED" });
      const wr = copy(t, { isWithdraw: true, status: "AML_REVIEW" });
      ok(`copy.unchanged.${locale}`, f.eyebrow === t.wallet.txnStatusFailed && f.title === t.wallet.depositFailed && f.variant === "danger" && f.subtitle === undefined
        && ok_.eyebrow === t.common.depositConfirmed && ok_.title === t.common.fundsAdded && ok_.variant === "success"
        && mv.eyebrow === t.common.depositStarted && mv.title === t.common.awaitingConfirmation && mv.variant === "info"
        && rv.eyebrow === t.wallet.txnStatusReversed && rv.variant === "neutral"
        && wr.eyebrow === t.common.underReviewEyebrow && wr.title === t.common.withdrawalUnderReview && wr.variant === "info");
    }
  }
  for (const [stored, reported] of [["FAILED", "CONFIRMED"], ["CONFIRMED", "FAILED"]] as const) {
    const owner = await player(), row = await txn(owner);
    const faultData = { ...db, txn: { ...db.txn, update: async (id: string, patch: any, tx?: any) => {
      if (patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) throw new Error("controlled review persistence fault");
      return db.txn.update(id, patch, tx);
    } } } as typeof db;
    const fault = system(src, faultData);
    fault.verify(async () => {
      await fault.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: stored, amount: 5000 });
      return { status: reported, amount: 5000 };
    });
    const result = await fault.read(owner, byId(row)), saved = await db.txn.findById(row.id);
    ok(`review.${stored.toLowerCase()}.write-fault-unknown`, result.view.state === "UNKNOWN" && !result.txn
      && saved?.status === stored && !Review.hasDepositStatusReview(saved!)
      && (await db.wallet.findByUserId(owner))?.balance === (stored === "CONFIRMED" ? 5000 : 0)
      && fault.seen.groups.length === (stored === "CONFIRMED" ? 1 : 0) && fault.seen.notices.length === 1);
    let rejectedClaim = false;
    try { await fault.money.settlePaymentWebhook({ providerRef: row.providerRef!, status: reported, amount: 5000 }); }
    catch { rejectedClaim = true; }
    ok(`review.${stored.toLowerCase()}.write-fault-not-acked`, rejectedClaim
      && fault.seen.notices.length === 1 && (await db.txn.findById(row.id))?.status === stored);
    const hook = compile(src[files[8]], { "next/server": { NextResponse: { json: (body: any, init: any = {}) =>
      new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...init.headers } }) } },
      "@/lib/server/crypto": { verifyWebhookSignature: () => ({ valid: true }) },
      "@/lib/server/audit": { audit: () => Promise.resolve({ recorded: true }) },
      "@/lib/server/wallet-service": { settlePaymentWebhook: fault.money.settlePaymentWebhook }, "@/lib/server/store": { db },
      "@/lib/server/selcom": { selcomEnv: () => ({ apiSecret: "controlled-local-fixture" }), verifySelcomCallback: () => true,
        selcomVerifyOrder: async () => ({ status: reported, amount: 5000 }), selcomVerifyPayout: async () => { throw new Error("No payout probe allowed"); }, railOf: () => "WALLET_CASHIN" } });
    for (const lane of ["generic", "selcom"]) {
      const response = await hook.POST(new Request("http://localhost/api/webhooks/payments", { method: "POST",
        headers: lane === "selcom" ? { authorization: "SELCOM local-fixture" } : { "x-provider": "azampay", "x-signature": "local-fixture" },
        body: JSON.stringify(lane === "selcom" ? { order_id: row.providerRef } : { reference: row.providerRef, status: reported, amount: 5000 }) }));
      const body = await response.json();
      ok(`review.${stored.toLowerCase()}.http-${lane}-write-fault`, response.status === 500 && body.ok === false && body.error === "settle-failed"
        && fault.seen.notices.length === 1 && (await db.txn.findById(row.id))?.status === stored);
    }
  }
  const lostOwner = await player(), lostRow = await txn(lostOwner);
  const lostData = { ...db, txn: { ...db.txn, update: async (id: string, patch: any, tx?: any) => {
    const saved = await db.txn.update(id, patch, tx);
    if (patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) throw new Error("controlled review write answer lost");
    return saved;
  } } } as typeof db;
  const lost = system(src, lostData);
  lost.verify(async () => {
    await lost.money.settlePaymentWebhook({ providerRef: lostRow.providerRef!, status: "FAILED" });
    return { status: "CONFIRMED", amount: 5000 };
  });
  const lostResult = await lost.read(lostOwner, byId(lostRow)), lostSaved = await db.txn.findById(lostRow.id);
  // M3 (S9 root review): the fault fires INSIDE the marker's wallet-lock transaction, after its write. A memory Map keeps
  // the write, so the marker persists and the reader shows REVIEW. PostgreSQL rolls the whole claim back, so nothing was
  // recorded and the reader must not invent a review it cannot see: UNKNOWN (the safe answer), the row still FAILED with no
  // marker, no money. Each store is held to ITS truth; the answer-lost-AFTER-commit case below is the same on both.
  ok("review.persisted-write-answer-lost", PG
    ? lostResult.view.state === "UNKNOWN" && !lostResult.txn && lostSaved?.status === "FAILED" && lostSaved.providerStatus == null
      && (await db.wallet.findByUserId(lostOwner))?.balance === 0
    : lostResult.view.state === "REVIEW" && lostResult.txn?.id === lostRow.id && Review.hasDepositStatusReview(lostSaved!)
      && (await db.wallet.findByUserId(lostOwner))?.balance === 0);
  // A marker that DID commit wins after the settle's own answer is lost (the reply dropped after commit): REVIEW on BOTH stores.
  const afterOwner = await player(), afterRow = await txn(afterOwner), after = system(src);
  after.verify(async () => {
    await after.money.settlePaymentWebhook({ providerRef: afterRow.providerRef!, status: "FAILED" });
    after.seen.loseSettleAnswer = true;
    return { status: "CONFIRMED", amount: 5000 };
  });
  const afterResult = await after.read(afterOwner, byId(afterRow)), afterSaved = await db.txn.findById(afterRow.id);
  ok("review.answer-lost-after-commit", afterResult.view.state === "REVIEW" && afterResult.txn?.id === afterRow.id
    && afterSaved?.status === "FAILED" && Review.hasDepositStatusReview(afterSaved) && after.seen.settles === 1
    && after.seen.notices.filter(n => n.status === "AML_REVIEW").length === 1 && (await db.wallet.findByUserId(afterOwner))?.balance === 0);
  const noSave = system(src, { ...db, txn: { ...db.txn, update: async (id: string, patch: any, tx?: any) =>
    patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK ? db.txn.findById(id) : db.txn.update(id, patch, tx) } } as typeof db);
  const noSaveRow = await txn(await player(), { status: "FAILED" });
  let noSaveRejected = false;
  try { await noSave.money.settlePaymentWebhook({ providerRef: noSaveRow.providerRef!, status: "CONFIRMED", amount: 5000 }); }
  catch { noSaveRejected = true; }
  ok("review.missing-save-not-acked", noSaveRejected && noSave.seen.notices.length === 0
    && !Review.hasDepositStatusReview((await db.txn.findById(noSaveRow.id))!));
  const declined = await txn(me), d = system(src); d.verify(async () => ({ status: "FAILED" }));
  const declinedReads = await Promise.all([d.read(me, byId(declined)), d.read(me, byId(declined))]);
  ok("money.failure-once", declinedReads.every(r => r.view.state === "FAILED") && d.seen.notices.filter(n => n.status === "FAILED").length === 1
    && (await db.wallet.findByUserId(me))?.balance === 0 && d.seen.groups.length === 0);
  const syncOwner = await player(), sync = system(src); sync.seen.lockAtDispatch = true;
  const syncResult = await sync.money.deposit(syncOwner, { amount: 5000, provider: "MPESA", msisdn: "712345678" },
    `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`);
  ok("money.sync-held-truth", syncResult.ok && syncResult.data.status === "AML_REVIEW" && (await db.wallet.findByUserId(syncOwner))?.balance === 0
    && (await db.txn.findById(syncResult.data.txnId))?.status === "AML_REVIEW" && sync.seen.notices.every(n => n.status !== "CONFIRMED"));
  if (PG) {
    const rows = await prisma()!.ledgerEntry.findMany({ where: { groupId: `dep_${paid.id}` } });
    ok("pg.real-balanced-ledger", rows.length === 2 && rows.reduce((total, row) => total + Number(row.amount), 0) === 0);
    const suspense = await prisma()!.ledgerEntry.findMany({ where: { groupId: `rgsusp_${held.id}` } });
    ok("pg.real-rg-suspense", suspense.length === 2 && suspense.some(row => row.account === "HOUSE:RG_SUSPENSE"));
  }
  // A competing webhook wins even when the signed probe throws after that credit. No handled/verifier verdict is truth.
  const afterFaultOwner = await player(), afterFault = await txn(afterFaultOwner), f = system(src);
  f.verify(async () => { await f.money.settlePaymentWebhook({ providerRef: afterFault.providerRef!, status: "CONFIRMED", amount: 5000 }); throw new Error("answer lost"); });
  ok("truth.webhook-wins-probe-fault", (await f.read(afterFaultOwner, byId(afterFault))).view.state === "PAID");
  const disappeared = system(src, { ...db, txn: { ...db.txn, findById: async (id: string) => id === own.id ? null : db.txn.findById(id) } } as typeof db);
  ok("truth.no-stale-row-fallback", (await disappeared.read(me, { kind: "funding-key", value: own.idempotencyKey! })).view.state === "UNKNOWN");
  const walletFault = system(src, { ...db, wallet: { ...db.wallet, findByUserId: async () => { throw new Error("wallet fault"); } } } as typeof db);
  const unknownBalance = await walletFault.read(paidOwner, byId(paid));
  ok("truth.balance-fault-unknown", unknownBalance.view.state === "UNKNOWN" && unknownBalance.view.balance === undefined && !unknownBalance.txn);
  const classicBalanceFault = await walletFault.money.settleDepositFromReturn(paidOwner, paid.providerRef!);
  ok("card.adapter-balance-fault", classicBalanceFault.state === "UNKNOWN" && classicBalanceFault.balance === null && !classicBalanceFault.txn);
  const missingWallet = system(src, { ...db, wallet: { ...db.wallet, findByUserId: async () => null } } as typeof db);
  ok("truth.missing-wallet-unknown", (await missingWallet.read(paidOwner, byId(paid))).view.state === "UNKNOWN");
  const foreignUnitOwner = await player();
  // The app type is TZS-only; the stored column is a string and must not be blindly cast into known TZS truth.
  await db.wallet.update(`wlt_${foreignUnitOwner}`, { currency: "USD" as never, balance: 12345 });
  const foreignUnitRow = await txn(foreignUnitOwner, { status: "CONFIRMED" });
  const foreignUnitRead = await s.read(foreignUnitOwner, { kind: "funding-key", value: foreignUnitRow.idempotencyKey! });
  ok("truth.wallet-unit-mismatch-unknown", String((await db.wallet.findByUserId(foreignUnitOwner))?.currency) === "USD"
    && foreignUnitRead.view.state === "UNKNOWN" && foreignUnitRead.view.balance === undefined && !foreignUnitRead.txn);
  // H2 (S9 root review): `Wallet.balance` is Decimal(18,2). A REAL stored fractional balance is a valid wallet: the reader
  // reports it and the signed credit lands on it — the whole-shilling rule answered UNKNOWN and stranded the money.
  const fractionalOwner = await player();
  await db.wallet.update(`wlt_${fractionalOwner}`, { balance: 1000.5 } as never);
  const fractionalPaid = await txn(fractionalOwner, { status: "CONFIRMED" });
  const fractionalRead = await s.read(fractionalOwner, { kind: "funding-key", value: fractionalPaid.idempotencyKey! });
  ok("truth.fractional-wallet-readable", fractionalRead.view.state === "PAID" && fractionalRead.view.balance === 1000.5 && fractionalRead.txn?.id === fractionalPaid.id);
  const fractionalPending = await txn(fractionalOwner), fractional = system(src);
  fractional.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
  const fractionalCredit = await fractional.read(fractionalOwner, byId(fractionalPending));
  ok("truth.fractional-wallet-credited", fractionalCredit.view.state === "PAID" && fractionalCredit.view.balance === 6000.5
    && (await db.txn.findById(fractionalPending.id))?.status === "CONFIRMED" && fractional.seen.groups.join() === `dep_${fractionalPending.id}`);
  // M4 (S9 root review): a deposit stored under a NON-UUID key is still settled by the owned status probe and the card
  // return — the stored key is opaque and compared by equality. (The recover route's `?key=` input stays UUID-only.)
  const opaqueOwner = await player();
  const opaqueMno = await txn(opaqueOwner, { idempotencyKey: `idem_double_submit_${++sequence}` }), om = system(src);
  om.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
  const opaqueRead = await om.read(opaqueOwner, byId(opaqueMno));
  ok("probe.opaque-key-settles", opaqueRead.view.state === "PAID" && (await db.txn.findById(opaqueMno.id))?.status === "CONFIRMED"
    && (await db.wallet.findByUserId(opaqueOwner))?.balance === 5000 && om.seen.verifies.length === 1);
  const opaqueCard = await txn(opaqueOwner, { provider: "CARD", msisdn: null, idempotencyKey: `idem_card_${++sequence}` }), oc = system(src);
  oc.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
  const opaqueReturn = await oc.money.settleDepositFromReturn(opaqueOwner, opaqueCard.providerRef!);
  ok("card.opaque-key-settles", opaqueReturn.state === "PAID" && opaqueReturn.txn?.id === opaqueCard.id && opaqueReturn.balance === 10_000);
  // L1 (S9 root review): an AMBIGUOUS reference on the Selcom callback is an audited 500 (the provider retries), never an
  // unhandled route error, and nothing is settled.
  if (!PG) {
    const ambOwner = await player(), amb = await txn(ambOwner), twin = await txn(await player(), { providerRef: amb.providerRef });
    const hookAudits: any[] = [];
    const hook = compile(src[files[8]], { "next/server": { NextResponse: { json: (body: any, init: any = {}) =>
      new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...init.headers } }) } },
      "@/lib/server/crypto": { verifyWebhookSignature: () => ({ valid: true }) },
      "@/lib/server/audit": { audit: (entry: any) => { hookAudits.push(entry); return Promise.resolve({ recorded: true }); } },
      "@/lib/server/wallet-service": { settlePaymentWebhook: async () => { throw new Error("No settlement may run for an ambiguous reference"); } },
      "@/lib/server/store": { db },
      "@/lib/server/selcom": { selcomEnv: () => ({ apiSecret: "controlled-local-fixture" }), verifySelcomCallback: () => true,
        selcomVerifyOrder: async () => ({ status: "CONFIRMED", amount: 5000 }), selcomVerifyPayout: async () => { throw new Error("No payout probe allowed"); }, railOf: () => "WALLET_CASHIN" } });
    let status = 0, body: any = null;
    try {
      const response = await hook.POST(new Request("http://localhost/api/webhooks/payments", { method: "POST",
        headers: { authorization: "SELCOM local-fixture" }, body: JSON.stringify({ order_id: amb.providerRef }) }));
      status = response.status; body = await response.json();
    } catch { status = -1; }
    ok("webhook.selcom-ambiguous-lookup", status === 500 && body?.ok === false && body?.error === "settle-failed"
      && hookAudits.some(a => a.action === "webhook.payment.settle_error" && a.payload?.stage === "lookup" && /ambiguous/.test(a.payload?.error ?? ""))
      && (await db.txn.findById(amb.id))?.status === "PROCESSING" && (await db.txn.findById(twin.id))?.status === "PROCESSING"
      && (await db.wallet.findByUserId(ambOwner))?.balance === 0);
  }
  for (const routeFile of files.slice(3, 5)) {
    let session: any = { userId: me }, throwCore = false;
    const route = compile(src[routeFile], { "next/server": { NextResponse: { json: (body: any, init: any = {}) =>
      new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...init.headers } }) } },
      "@/lib/server/session": { getSession: async () => session }, "@/lib/server/deposit-status": { readDepositStatus: async (...args: any[]) => {
        if (throwCore) throw new Error("controlled route fault"); return s.read(args[0], args[1]); } } });
    const key = routeFile.includes("recover"), label = key ? "recover" : "status";
    const req = new Request(`http://localhost/api/wallet/deposits/${key ? `recover?key=${own.idempotencyKey}` : `${own.id}/status`}`);
    const invoke = () => route.GET(req, { params: Promise.resolve({ id: own.id }) });
    const response = await invoke();
    ok(`route.${label}.owned-private`, response.status === 200 && response.headers.get("cache-control") === "private, no-store" && (await response.json()).state === "PENDING");
    session = null;
    const anon = await invoke();
    ok(`route.${label}.401-private`, anon.status === 401 && anon.headers.get("cache-control") === "private, no-store");
    session = { userId: me }; s.seen.statusAllowed = false;
    const limited = await invoke();
    ok(`route.${label}.429-private`, limited.status === 429 && limited.headers.get("cache-control") === "private, no-store" && (await limited.json()).state === "UNKNOWN");
    s.seen.statusAllowed = true; throwCore = true;
    const fault = await invoke();
    ok(`route.${label}.fault-private`, fault.status === 503 && fault.headers.get("cache-control") === "private, no-store" && (await fault.json()).state === "UNKNOWN");
    ok(`route.${label}.dynamic-get`, /export const dynamic = "force-dynamic"/.test(src[routeFile]) && !/export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/.test(src[routeFile]));
  }
  const sw = readFileSync(join(ROOT, "public/sw.js"), "utf8");
  ok("route.worker-bypass", /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/.test(sw));
  // Drive the REAL rate evaluator/rules at the promised cadence, including two initial SSR/receipt reads.
  const ast = ts.createSourceFile("rate.ts", src[files[2]], ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.flatMap(n => ts.isVariableStatement(n) ? [...n.declarationList.declarations] : []).find(n => n.name.getText(ast) === "RATE_RULES");
  if (!declaration?.initializer) throw new Error("Missing actual rate registry");
  const rateText = `const RATE_RULES = ${declaration.initializer.getText(ast)}; const buckets = new Map();\n${fn(src[files[2]], "rateCheck")}\nreturn {rateCheck,RATE_RULES};`;
  let clock = 0;
  const rate = new Function("Date", ts.transpileModule(rateText, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ now: () => clock });
  const initial = [rate.rateCheck("owner", "deposit.status"), rate.rateCheck("owner", "deposit.status")];
  const polls = Array.from({ length: 21 }, (_, i) => { clock = i * 3000; return rate.rateCheck("owner", "deposit.status"); });
  ok("rate.real-first-minute-cadence", !!rate.RATE_RULES["deposit.status"] && initial.concat(polls).every(r => r.allowed));
  clock = 0;
  const probe = rate.rateCheck("own-txn", "deposit.probe"), repeat = rate.rateCheck("own-txn", "deposit.probe");
  clock = 10_000;
  ok("rate.real-probe-budget", !!rate.RATE_RULES["deposit.probe"] && probe.allowed && !repeat.allowed && repeat.retryAfterSec === 10 && rate.rateCheck("own-txn", "deposit.probe").allowed);
  return checks;
}
async function runRecheck(src = sources): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: unknown) => checks.push({ name, pass: !!pass });
  checks.push(...await referenceControls(src));
  const me = await player(), other = await player();
  const unknown = (r: any) => r.view.state === "UNKNOWN" && !r.view.failureAuthority && r.view.balance === undefined && r.view.txnId === undefined;
  for (const provider of [...MOBILE_MONEY_METHODS.map(p => p.id), "CARD"]) {
    const row = await txn(me, { status: "FAILED", provider });
    let verifyOutside = false, walletInside = false, walletTx = false;
    const data = { ...db, wallet: { ...db.wallet, findByUserId: async (id: string, tx: any) => {
      walletInside = inLock(); walletTx = !PG || tx === currentLockTx() && tx !== null;
      return db.wallet.findByUserId(id, tx);
    } } } as typeof db;
    const s = system(src, data);
    s.verify(async () => { verifyOutside = !inLock(); return { status: "FAILED", amount: row.amount }; });
    const r = await s.recheck(me, row.id);
    ok(`safe.${provider}`, r.view.state === "FAILED" && r.view.failureAuthority === "signed-recheck" && r.view.txnId === row.id
      && s.seen.verifies.length === 1 && s.seen.settles === 0 && verifyOutside && walletInside && walletTx);
    ok(`safe.${provider}.no-money`, (await db.txn.findById(row.id))?.status === "FAILED" && (await db.wallet.findByUserId(me))?.balance === 0 && s.seen.groups.length === 0);
  }
  for (const [name, patch] of [
    ["owner", { userId: other }], ["type", { type: "WITHDRAWAL" }], ["currency", { currency: "USD" }], ["house", { houseBotId: "marked" }],
    ["canonical", { pendingBet: { v: 99 } }], ["missing-ref", { providerRef: null }], ["legacy-rail", { provider: "TIGO_PESA" }],
    ["bank", { provider: "BANK_TRANSFER" }], ["processing", { status: "PROCESSING" }], ["cancelled", { status: "CANCELLED" }],
  ] as const) {
    const row = await txn(me, { status: "FAILED", ...patch }), s = system(src);
    s.verify(async () => ({ status: "FAILED" }));
    const r = await s.recheck(me, row.id);
    ok(`scope.${name}`, unknown(r) && s.seen.verifies.length === 0 && s.seen.settles === 0);
    if (["owner", "type", "currency", "house"].includes(name)) ok(`scope.${name}.audit-private`, s.seen.audits.every(a => a.targetId === null && !JSON.stringify(a.payload).includes(row.id)));
  }
  const absent = system(src);
  ok("scope.missing", unknown(await absent.recheck(me, "txn_no_such_deposit")) && absent.seen.verifies.length === 0);
  const malformed = system(src);
  ok("scope.invalid-audit", unknown(await malformed.recheck(me, "../private_identifier")) && malformed.seen.verifies.length === 0
    && malformed.seen.audits.length === 1 && malformed.seen.audits[0].targetId === null && !JSON.stringify(malformed.seen.audits[0].payload).includes("private_identifier"));
  const row = await txn(me, { status: "FAILED" });
  const expected = B.depositRecheckBinding(me, row)!;
  const foreignRow = await txn(other, { status: "FAILED" });
  const foreignBinding = B.depositRecheckBinding(other, foreignRow)!;
  const { fundingKey: _omittedKey, ...missingKey } = expected;
  for (const [name, capsule, beforeLookup] of [
    ["missing", undefined, true], ["null", null, true], ["array", [], true], ["version", { ...expected, v: 2 }, true],
    ["extra-status", { ...expected, status: "FAILED" }, true], ["extra-funding", { ...expected, funding: { ...expected.funding, balance: 0 } }, true],
    ["foreign-owner", foreignBinding, true], ["other-txn", { ...expected, txnId: foreignRow.id }, true],
    ["missing-key", missingKey, true], ["invalid-key", { ...expected, fundingKey: "not-a-uuid" }, true],
    ["null-key-mismatch", { ...expected, fundingKey: null }, false],
    ["key-mismatch", { ...expected, fundingKey: foreignBinding.fundingKey }, false],
    ["reference-mismatch", { ...expected, providerRef: foreignBinding.providerRef }, false],
    ["long-reference", { ...expected, providerRef: "x".repeat(129) }, true],
    ["control-reference", { ...expected, providerRef: "own\u0000ref" }, true],
    ["amount-mismatch", { ...expected, funding: { ...expected.funding, amount: 6000 } }, false],
    ["phone-mismatch", { ...expected, funding: { ...expected.funding, msisdn: "255712345679" } }, false],
    ["provider-mismatch", { ...expected, funding: { ...expected.funding, provider: "CARD" } }, false],
    ["pending-mismatch", { ...expected, funding: { ...expected.funding, pendingBet: { v: 1, bet: "mkt_own.YES.1000", returnPath: "/" } } }, false],
    ["funding-owner", { ...expected, funding: { ...expected.funding, userId: other } }, true],
    ["noncanonical-phone", { ...expected, funding: { ...expected.funding, msisdn: "+255712345678" } }, true],
    ["malformed-pending", { ...expected, funding: { ...expected.funding, pendingBet: { v: 99 } } }, true],
    ["undefined-pending", { ...expected, funding: { ...expected.funding, pendingBet: undefined } }, true],
  ] as const) {
    let lookups = 0, refLookups = 0;
    const data = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => { lookups++; return db.txn.findById(id, tx); },
      findByProviderRef: async (ref: string) => { refLookups++; return db.txn.findByProviderRef(ref); } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "FAILED", amount: 5000 }));
    const r = await s.recheckRaw(me, name === "foreign-owner" ? foreignRow.id : row.id, capsule);
    ok(`capsule.${name}`, unknown(r) && s.seen.verifies.length === 0 && s.seen.settles === 0 && refLookups === 0
      && (!beforeLookup || lookups === 0) && s.seen.groups.length === 0);
  }
  const historical = await txn(me, { status: "FAILED", idempotencyKey: null });
  const historic = system(src); historic.verify(async () => ({ status: "FAILED", amount: historical.amount }));
  const historicBinding = B.depositRecheckBinding(me, historical)!;
  const historicRead = await historic.recheckRaw(me, historical.id, historicBinding);
  ok("capsule.historical-null-key", historicBinding.fundingKey === null && historicRead.view.state === "FAILED"
    && historicRead.view.failureAuthority === "signed-recheck" && (await db.txn.findById(historical.id))?.idempotencyKey == null);
  ok("capsule.server-builder-scope", B.depositRecheckBinding(me, foreignRow) === null
    && B.depositRecheckBinding(me, { ...row, houseBotId: "marked" }) === null && B.depositRecheckBinding(me, { ...row, type: "WITHDRAWAL" }) === null);
  const reordered = system(src).bindingModule.parseDepositRecheckBinding({ ...expected,
    funding: { ...expected.funding, pendingBet: { returnPath: "/", bet: "mkt_own.YES.1000", v: 1 } } });
  ok("capsule.pending-key-order-is-not-billing-byte-equality", reordered?.funding.pendingBet?.bet === "mkt_own.YES.1000");
  let callerLookups = 0;
  const callerData = { ...db, txn: { ...db.txn, findById: async (id: string) => { callerLookups++; return db.txn.findById(id); } } } as typeof db;
  const limited = system(src, callerData); limited.seen.statusAllowed = false;
  ok("rate.caller", unknown(await limited.recheck(me, row.id)) && callerLookups === 0 && limited.seen.verifies.length === 0 && limited.seen.audits.length === 0);
  ok("rate.caller-key", limited.seen.rateCalls.length === 1 && limited.seen.rateCalls[0].key === me && limited.seen.rateCalls[0].action === "deposit.status");
  const probe = system(src); probe.seen.probeAllowed = false;
  ok("rate.probe", unknown(await probe.recheck(me, row.id)) && probe.seen.verifies.length === 0 && probe.seen.rateCalls[1]?.key === row.id);
  for (const status of ["PENDING", "UNSUPPORTED", "UNRECOGNIZED"]) {
    const s = system(src); s.verify(async () => ({ status }));
    ok(`authority.${status}`, unknown(await s.recheck(me, row.id)) && s.seen.settles === 0);
  }
  for (const amount of [5001, 0, -5000, NaN, Infinity, 5000.5]) {
    const s = system(src); s.verify(async () => ({ status: "FAILED", amount }));
    ok(`authority.amount.${String(amount)}`, unknown(await s.recheck(me, row.id)) && s.seen.settles === 0);
  }
  const transport = system(src); transport.verify(async () => { throw new Error("private provider credentials"); });
  const lost = await transport.recheck(me, row.id);
  ok("authority.transport", unknown(lost) && lost.unavailable && !JSON.stringify(lost).includes("private"));
  for (const [name, patch] of [
    ["amount", { amount: 6000 }], ["phone", { msisdn: "+255712345679" }], ["owner", { userId: other }], ["type", { type: "WITHDRAWAL" }],
    ["currency", { currency: "USD" }], ["provider", { provider: "CARD" }], ["providerRef", { providerRef: "different_order" }], ["key", { idempotencyKey: "different_key" }],
  ] as const) {
    const changed = await txn(me, { status: "FAILED" }), s = system(src);
    s.verify(async () => {
      await db.txn.update(changed.id, (name === "key" ? { idempotencyKey: `${patch.idempotencyKey}_${changed.id}` }
        : name === "providerRef" ? { providerRef: `${patch.providerRef}_${changed.id}` } : patch) as never);
      return { status: "FAILED" };
    });
    ok(`fresh.${name}`, unknown(await s.recheck(me, changed.id)));
  }
  for (const [name, patch] of [
    ["amount", { amount: 6000 }], ["phone", { msisdn: "+255712345679" }], ["owner", { userId: other }], ["type", { type: "WITHDRAWAL" }],
    ["currency", { currency: "USD" }], ["provider", { provider: "CARD" }], ["providerRef", { providerRef: "different_confirmed_order" }],
    ["key", { idempotencyKey: "different_confirmed_key" }], ["pendingBet", { pendingBet: { v: 99 } }],
  ] as const) {
    const changed = await txn(me, { status: "FAILED" }), s = system(src);
    s.verify(async () => {
      // Saved intent is create-only through the DAL. This one corruption control deliberately writes the stored JSON
      // below that membrane; an ordinary update cannot exercise a changed pendingBet and is not a defect fixture.
      if (name === "pendingBet") {
        if (PG) await prisma()!.transaction.update({ where: { id: changed.id }, data: { pendingBet: { v: 99 } } });
        else {
          const raw = await db.txn.findById(changed.id);
          if (!raw) throw new Error("Missing own pending-intent corruption fixture");
          Object.assign(raw, patch);
        }
      } else await db.txn.update(changed.id, (name === "key" ? { idempotencyKey: `${patch.idempotencyKey}_${changed.id}` }
        : name === "providerRef" ? { providerRef: `${patch.providerRef}_${changed.id}` } : patch) as never);
      return { status: "CONFIRMED", amount: 5000 };
    });
    ok(`binding.confirmed.${name}`, unknown(await s.recheck(me, changed.id)) && s.seen.settles === 0
      && (await db.txn.findById(changed.id))?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK && s.seen.groups.length === 0);
  }
  const marked = await txn(me, { status: "FAILED" }), markDuring = system(src);
  const mutable = await txn(me, { status: "FAILED" }), memorySnapshot = system(src);
  memorySnapshot.verify(async () => {
    // Raw corruption bypasses ordinary immutable DAL updates. Memory reads can share the actual row object, unlike
    // the Prisma mapper: the explicit recheck must retain the original canonical snapshot in both stores.
    if (PG) await prisma()!.transaction.update({ where: { id: mutable.id }, data: { amount: 6000 } });
    else {
      const raw = await db.txn.findById(mutable.id);
      if (!raw) throw new Error("Missing own funding snapshot fixture");
      Object.assign(raw, { amount: 6000 });
    }
    return { status: "FAILED" };
  });
  ok("binding.raw-row-snapshot", unknown(await memorySnapshot.recheck(me, mutable.id)) && memorySnapshot.seen.settles === 0);
  markDuring.verify(async () => { await db.txn.update(marked.id, { providerStatus: Review.DEPOSIT_STATUS_REVIEW_MARK }); return { status: "FAILED" }; });
  const reviewFresh = await markDuring.recheck(me, marked.id);
  ok("fresh.review", reviewFresh.view.state === "REVIEW" && !reviewFresh.view.failureAuthority && (await db.txn.findById(marked.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK);
  const conflict = await txn(me, { status: "FAILED" }), confirmed = system(src);
  confirmed.verify(async () => ({ status: "CONFIRMED", amount: conflict.amount }));
  const contradicted = await confirmed.recheck(me, conflict.id);
  ok("review.confirmed", contradicted.view.state === "REVIEW" && !contradicted.view.failureAuthority
    && (await db.txn.findById(conflict.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK && (await db.txn.findById(conflict.id))?.status === "FAILED"
    && confirmed.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0);
  const verifyCount = confirmed.seen.verifies.length;
  ok("review.duplicate-keeps-marker", (await confirmed.recheck(me, conflict.id)).view.state === "REVIEW" && confirmed.seen.verifies.length === verifyCount);
  const atomic = await txn(me, { status: "FAILED" });
  let outerTx: unknown, updateTx: unknown, updateInside = false, markerReadThroughTx = false, probeOutside = false;
  let noticesAtRead = -1, atomicNotices: any[] = [];
  const atomicData = { ...db, wallet: { ...db.wallet, findByUserId: async (id: string, tx: any) => {
    outerTx = tx; return db.wallet.findByUserId(id, tx);
  } }, txn: { ...db.txn, findById: async (id: string, tx: any) => {
    const found = await db.txn.findById(id, tx);
    if (id === atomic.id && found?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) {
      markerReadThroughTx = inLock() && tx === outerTx && tx === currentLockTx() && (!PG || tx !== null);
      noticesAtRead = atomicNotices.length;
    }
    return found;
  }, update: async (id: string, patch: any, tx: any) => {
    if (id === atomic.id && patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) {
      updateTx = tx; updateInside = inLock() && tx === currentLockTx() && (!PG || tx !== null);
    }
    return db.txn.update(id, patch, tx);
  } } } as typeof db;
  const sameTx = system(src, atomicData);
  atomicNotices = sameTx.seen.notices;
  sameTx.verify(async () => { probeOutside = !inLock(); return { status: "CONFIRMED", amount: atomic.amount }; });
  const atomicRead = await sameTx.recheck(me, atomic.id);
  ok("review.reentrant-same-tx", atomicRead.view.state === "REVIEW" && sameTx.seen.settles === 1 && probeOutside
    && outerTx !== undefined && updateTx === outerTx && updateInside && markerReadThroughTx
    && (await db.txn.findById(atomic.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK
    && sameTx.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0);
  ok("review.commit-emits-once", sameTx.seen.notices.length === 1 && (!PG || noticesAtRead === 0));
  const topLevel = await txn(me, { status: "FAILED" }), topLevelClaim = system(src);
  await topLevelClaim.money.settlePaymentWebhook({ providerRef: topLevel.providerRef!, status: "CONFIRMED", amount: topLevel.amount });
  ok("review.top-level-claim-commits", (await db.txn.findById(topLevel.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK
    && (await db.txn.findById(topLevel.id))?.status === "FAILED" && topLevelClaim.seen.notices.length === 1
    && topLevelClaim.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0);
  if (PG) {
    const rollback = await txn(me, { status: "FAILED" });
    let markerWritten = false;
    const rollbackData = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => {
      if (id === rollback.id && markerWritten && tx && inLock()) throw new Error("controlled post-claim read fault");
      return db.txn.findById(id, tx);
    }, update: async (id: string, patch: any, tx: any) => {
      const saved = await db.txn.update(id, patch, tx);
      if (id === rollback.id && patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) markerWritten = true;
      return saved;
    } } } as typeof db;
    const rolled = system(src, rollbackData); rolled.verify(async () => ({ status: "CONFIRMED", amount: rollback.amount }));
    const r = await rolled.recheck(me, rollback.id), after = await db.txn.findById(rollback.id);
    // Memory locks do not pretend to roll back Maps. This control requires real PG rollback of the actual marker.
    ok("review.pg-rollback-no-partial-marker", unknown(r) && r.unavailable && markerWritten && rolled.seen.settles === 1
      && after?.status === "FAILED" && after?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK
      && rolled.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0);
    ok("review.pg-rollback-no-review-notice", rolled.seen.notices.length === 0);
  }
  if (!PG) for (const [name, type, status, owner] of [
    ["foreign-failed", "DEPOSIT", "FAILED", other], ["foreign-confirmed", "DEPOSIT", "CONFIRMED", other],
    ["withdrawal-failed", "WITHDRAWAL", "FAILED", other], ["withdrawal-confirmed", "WITHDRAWAL", "CONFIRMED", other],
    ["same-owner", "DEPOSIT", "FAILED", me],
  ] as const) {
    const prior = await txn(owner, { type, status }), own = await txn(me, { status: "FAILED", providerRef: prior.providerRef });
    let refLookups = 0;
    const data = { ...db, txn: { ...db.txn, findByProviderRef: async (ref: string) => { refLookups++; return db.txn.findByProviderRef(ref); } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "CONFIRMED", amount: own.amount }));
    const r = await s.recheckRaw(me, own.id, B.depositRecheckBinding(me, own));
    const priorAfter = await db.txn.findById(prior.id), ownAfter = await db.txn.findById(own.id);
    ok(`claim.duplicate.${name}`, r.view.state === "REVIEW" && !r.view.failureAuthority && refLookups === 0
      && ownAfter?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK && ownAfter?.status === "FAILED"
      && priorAfter?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK && priorAfter?.status === status
      && s.seen.notices.length === 1 && s.seen.notices[0].ownerId === me && s.seen.notices[0].txnId === own.id
      && s.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0 && (await db.wallet.findByUserId(other))?.balance === 0);
  }
  if (!PG) {
  const unrestrictedFirst = await txn(other, { status: "FAILED" });
  const unrestrictedSecond = await txn(me, { status: "FAILED", providerRef: unrestrictedFirst.providerRef });
  let selectorRefused = false;
  try { await db.txn.findByProviderRef(unrestrictedFirst.providerRef!); } catch { selectorRefused = true; }
  const unrestricted = system(src);
  let refused = false;
  try { const r = await unrestricted.money.settlePaymentWebhook({ providerRef: unrestrictedFirst.providerRef!, status: "CONFIRMED", amount: 5000 }); refused = !r.handled; }
  catch { refused = true; }
  ok("claim.unrestricted-ambiguity-refused", selectorRefused && refused
    && (await db.txn.findById(unrestrictedFirst.id))?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK
    && (await db.txn.findById(unrestrictedSecond.id))?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK
    && unrestricted.seen.notices.length === 0 && unrestricted.seen.groups.length === 0);
  }
  const processingOwner = await player(), processing = await txn(processingOwner), restrictedProcessing = system(src);
  const processingResult = await restrictedProcessing.money.settlePaymentWebhook({ providerRef: processing.providerRef!, status: "CONFIRMED", amount: 5000 }, B.depositRecheckBinding(processingOwner, processing));
  ok("claim.processing-restriction-refused", !processingResult.handled && (await db.txn.findById(processing.id))?.status === "PROCESSING"
    && (await db.wallet.findByUserId(processingOwner))?.balance === 0 && restrictedProcessing.seen.groups.length === 0 && restrictedProcessing.seen.notices.length === 0);
  for (const kind of ["duplicate", "missing", "other-row"] as const) {
    if (PG && kind === "duplicate") continue;
    const owner = await player(), otherOwner = await player(), row = await txn(owner, { status: "FAILED" });
    const other = await txn(otherOwner, { status: "FAILED", ...(kind === "duplicate" ? { providerRef: row.providerRef } : {}) });
    let underLock = false, sameTx = false;
    const data = { ...db, txn: { ...db.txn, findByProviderRef: async (ref: string, tx: any) => {
      underLock = inLock(); sameTx = tx === currentLockTx() && (!PG || !!tx);
      return kind === "missing" ? null : kind === "other-row" ? other : db.txn.findByProviderRef(ref, tx);
    } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "FAILED", amount: row.amount }));
    const r = await s.recheckRaw(owner, row.id, B.depositRecheckBinding(owner, row));
    ok(`safe.reference.${kind}`, unknown(r) && underLock && sameTx && s.seen.groups.length === 0 && s.seen.notices.length === 0
      && (await db.txn.findById(row.id))?.status === "FAILED" && (await db.txn.findById(row.id))?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK
      && (await db.wallet.findByUserId(owner))?.balance === 0 && (await db.wallet.findByUserId(otherOwner))?.balance === 0);
  }
  let invalidReads = 0;
  const invalidData = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => { invalidReads++; return db.txn.findById(id, tx); },
    findByProviderRef: async (ref: string) => { invalidReads++; return db.txn.findByProviderRef(ref); } } } as typeof db;
  const invalidClaim = await txn(me, { status: "FAILED" }), invalid = system(src, invalidData);
  const invalidRestriction = await invalid.money.settlePaymentWebhook({ providerRef: invalidClaim.providerRef!, status: "CONFIRMED", amount: invalidClaim.amount }, null);
  ok("claim.malformed-restriction", !invalidRestriction.handled && invalidReads === 0 && invalid.seen.notices.length === 0
    && (await db.txn.findById(invalidClaim.id))?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK);
  const badReference = await invalid.money.settlePaymentWebhook({ providerRef: foreignRow.providerRef!, status: "CONFIRMED", amount: invalidClaim.amount }, B.depositRecheckBinding(me, invalidClaim));
  ok("claim.input-reference-mismatch", !badReference.handled && invalidReads === 0 && invalid.seen.notices.length === 0);
  for (const stage of ["selection", "marker"] as const) for (const [name, patch] of [
    ["owner", { userId: other }], ["type", { type: "WITHDRAWAL" }], ["key", { idempotencyKey: "changed" }],
    ["reference", { providerRef: "changed" }], ["amount", { amount: 6000 }], ["phone", { msisdn: "+255712345679" }], ["provider", { provider: "CARD" }],
  ] as const) {
    const changed = await txn(me, { status: "FAILED" });
    let reads = 0, changedInClaim = false, refLookups = 0;
    const data = { ...db, txn: { ...db.txn, findById: async (id: string, tx: any) => {
      if (id === changed.id && ++reads === (stage === "selection" ? 3 : 5)) {
        if (!inLock() || tx !== currentLockTx()) throw new Error("Scoped claim drift fixture missed the wallet transaction");
        const actual = name === "key" ? { idempotencyKey: `11111111-1111-4111-8111-${String(++sequence).padStart(12, "0")}` }
          : name === "reference" ? { providerRef: `changed_${changed.id}` } : patch;
        await db.txn.update(id, actual as never, tx); changedInClaim = true;
      }
      return db.txn.findById(id, tx);
    }, findByProviderRef: async (ref: string) => { refLookups++; return db.txn.findByProviderRef(ref); } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "CONFIRMED", amount: 5000 }));
    const r = await s.recheckRaw(me, changed.id, B.depositRecheckBinding(me, changed)), after = await db.txn.findById(changed.id);
    ok(`claim.drift.${stage}.${name}`, changedInClaim && s.seen.reviewAttempts === (stage === "selection" ? 0 : 1) && refLookups === 0 && unknown(r)
      && after?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK && after?.status === "FAILED" && s.seen.notices.length === 0
      && s.seen.groups.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0 && (await db.wallet.findByUserId(other))?.balance === 0);
  }
  const opposite = await txn(me, { status: "FAILED" }), failedAfterChange = system(src);
  failedAfterChange.verify(async () => { await db.txn.update(opposite.id, { status: "CONFIRMED" }); return { status: "FAILED" }; });
  const oppositeRead = await failedAfterChange.recheck(me, opposite.id);
  ok("review.fresh-confirmed-opposes-failed", oppositeRead.view.state === "REVIEW" && !oppositeRead.view.failureAuthority
    && (await db.txn.findById(opposite.id))?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK
    && (await db.txn.findById(opposite.id))?.status === "CONFIRMED" && failedAfterChange.seen.groups.length === 0
    && (await db.wallet.findByUserId(me))?.balance === 0);
  const held = await txn(me, { status: "FAILED", amlReason: `${RG_RETURN_MARK}awaiting actual return` }), hold = system(src);
  const heldRead = await hold.recheck(me, held.id);
  ok("review.rg-held", heldRead.view.state === "HELD" && !heldRead.view.failureAuthority && hold.seen.verifies.length === 0);
  const persist = await txn(me, { status: "FAILED" });
  const faulty = { ...db, txn: { ...db.txn, update: (id: string, patch: any, tx: any) => {
    if (patch.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK) throw new Error("private persistence failure");
    return db.txn.update(id, patch, tx);
  } } } as typeof db;
  const writeFault = system(src, faulty); writeFault.verify(async () => ({ status: "CONFIRMED", amount: persist.amount }));
  const unrecorded = await writeFault.recheck(me, persist.id);
  ok("review.write-fault", unknown(unrecorded) && unrecorded.unavailable && (await db.txn.findById(persist.id))?.status === "FAILED");
  const oppositeFault = await txn(me, { status: "FAILED" }), failedWriteFault = system(src, faulty);
  failedWriteFault.verify(async () => { await db.txn.update(oppositeFault.id, { status: "CONFIRMED" }); return { status: "FAILED" }; });
  const oppositeUnknown = await failedWriteFault.recheck(me, oppositeFault.id);
  ok("review.fresh-confirmed-write-fault", unknown(oppositeUnknown) && oppositeUnknown.unavailable
    && (await db.txn.findById(oppositeFault.id))?.status === "CONFIRMED" && (await db.wallet.findByUserId(me))?.balance === 0);
  for (const failure of ["missing", "fault", "wrong-currency"]) {
    const data = { ...db, wallet: { ...db.wallet, findByUserId: async () => {
      if (failure === "fault") throw new Error("private wallet fault");
      if (failure === "missing") return null;
      return { balance: 0, currency: "USD" };
    } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "FAILED" }));
    ok(`wallet.${failure}`, unknown(await s.recheck(me, row.id)));
  }
  // H2 (S9 root review): the refusals that remain are the impossible wallets — negative, NaN, infinite. A fractional
  // balance is a valid Decimal(18,2) wallet, so it is a positive control below, not a refusal.
  for (const [failure, balance] of [["missing", 0], ["fault", 0], ["wrong-currency", 0], ["negative", -1],
    ["non-finite", Infinity], ["nan", Number.NaN]] as const) {
    const opposed = await txn(me, { status: "FAILED" });
    const data = { ...db, wallet: { ...db.wallet, findByUserId: async () => {
      if (failure === "fault") throw new Error("private wallet fault");
      if (failure === "missing") return null;
      return { balance, currency: failure === "wrong-currency" ? "USD" : "TZS" };
    } } } as typeof db;
    const s = system(src, data); s.verify(async () => ({ status: "CONFIRMED", amount: opposed.amount }));
    const r = await s.recheck(me, opposed.id), fresh = await db.txn.findById(opposed.id);
    ok(`wallet.opposed.${failure}`, unknown(r) && s.seen.verifies.length === 1 && s.seen.settles === 0
      && fresh?.providerStatus !== Review.DEPOSIT_STATUS_REVIEW_MARK && fresh?.status === "FAILED"
      && s.seen.groups.length === 0 && s.seen.notices.length === 0 && (await db.wallet.findByUserId(me))?.balance === 0
      && r.unavailable === (failure === "fault"));
  }
  {
    // ⭐ POSITIVE (H2): a REAL stored fractional balance — the signed contradiction is recorded (review marker, one notice),
    // and still no money moves. The whole-shilling rule answered UNKNOWN and left the contradiction unrecorded.
    const fractionalOwner = await player();
    await db.wallet.update(`wlt_${fractionalOwner}`, { balance: 1000.5 } as never);
    const opposed = await txn(fractionalOwner, { status: "FAILED" }), s = system(src);
    s.verify(async () => ({ status: "CONFIRMED", amount: opposed.amount }));
    const r = await s.recheck(fractionalOwner, opposed.id), fresh = await db.txn.findById(opposed.id);
    ok("wallet.opposed.fractional-records-review", r.view.state === "REVIEW" && r.view.balance === 1000.5 && !r.view.failureAuthority
      && fresh?.providerStatus === Review.DEPOSIT_STATUS_REVIEW_MARK && fresh?.status === "FAILED" && s.seen.settles === 1
      && s.seen.groups.length === 0 && s.seen.notices.length === 1 && (await db.wallet.findByUserId(fractionalOwner))?.balance === 1000.5);
  }
  const normal = system(src);
  const ordinary = await normal.read(me, byId(row)), recovered = await normal.read(me, { kind: "funding-key", value: row.idempotencyKey! });
  ok("policy.ordinary-and-recovery-no-terminal-probe", ordinary.view.state === "FAILED" && recovered.view.state === "FAILED"
    && !ordinary.view.failureAuthority && !recovered.view.failureAuthority && normal.seen.verifies.length === 0 && normal.seen.settles === 0);
  let session: any = { userId: me }, coreCalls = 0, coreFailure = false, receivedBinding: unknown;
  let result: any = { view: { state: "FAILED", failureAuthority: "signed-recheck" }, rateLimited: false, unavailable: false };
  const route = compile(src[RECHECK_ROUTE], { "next/server": { NextResponse: { json: (body: any, init: ResponseInit) => new Response(JSON.stringify(body), init) } },
    "@/lib/server/session": { getSession: async () => session }, "@/lib/journey/deposit-recheck-binding": B,
    "@/lib/server/deposit-recheck": { recheckDepositStatus: async (owner: string, id: string, binding: unknown) => {
      coreCalls++; receivedBinding = binding;
      if (coreFailure) throw new Error("private route failure"); if (owner !== me || id !== row.id) throw new Error("wrong identity");
      return B.parseDepositRecheckBinding(binding) ? result : { view: { state: "UNKNOWN" }, rateLimited: false, unavailable: false };
    } } });
  const request = (headers: Record<string, string> = {}, method = "POST", body: string | undefined = JSON.stringify(expected)) =>
    new Request("https://local.invalid/api/wallet/deposits/owned/recheck", { method,
      ...(method === "POST" && body !== undefined ? { body } : {}),
      headers: { "sec-fetch-site": "same-origin", "x-kp-deposit-recheck": "1", ...headers } });
  const invoke = (req = request()) => route.POST(req, { params: Promise.resolve({ id: row.id }) });
  for (const site of ["cross-site", "same-site", "none", ""]) {
    const response = await invoke(request({ "sec-fetch-site": site }));
    ok(`route.${site || "no-site"}`, response.status === 403 && response.headers.get("cache-control") === "private, no-store" && coreCalls === 0);
  }
  ok("route.no-header", (await invoke(request({ "x-kp-deposit-recheck": "" }))).status === 403 && coreCalls === 0);
  ok("route.not-post", (await invoke(request({}, "GET"))).status === 403 && coreCalls === 0);
  let response = await invoke();
  ok("route.200-private", response.status === 200 && response.headers.get("cache-control") === "private, no-store"
    && (await response.json()).failureAuthority === "signed-recheck" && JSON.stringify(receivedBinding) === JSON.stringify(expected));
  const exactBody = JSON.stringify(expected).padEnd(B.DEPOSIT_RECHECK_MAX_BYTES, " ");
  const exact = await invoke(request({ "content-length": String(B.DEPOSIT_RECHECK_MAX_BYTES) }, "POST", exactBody));
  ok("route.body.exact-cap-valid", exact.status === 200 && (await exact.json()).failureAuthority === "signed-recheck"
    && exact.headers.get("cache-control") === "private, no-store");
  for (const [name, body, headers] of [["malformed", "{private_secret", {}], ["missing", "", {}],
    ["body-over-cap", " ".repeat(B.DEPOSIT_RECHECK_MAX_BYTES) + JSON.stringify(expected), {}],
    ["declared-over-cap", JSON.stringify(expected), { "content-length": String(B.DEPOSIT_RECHECK_MAX_BYTES + 1) }],
    ["invalid-length", JSON.stringify(expected), { "content-length": "-1" }]] as const) {
    const refused = await invoke(request(headers, "POST", body)), view = await refused.json();
    ok(`route.body.${name}`, refused.status === 200 && refused.headers.get("cache-control") === "private, no-store"
      && receivedBinding === null && view.state === "UNKNOWN" && !view.failureAuthority && !JSON.stringify(view).includes("private_secret"));
  }
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new Uint8Array(B.DEPOSIT_RECHECK_MAX_BYTES + 1)); controller.enqueue(new Uint8Array([32])); controller.close();
  },
    cancel() { cancelled = true; } });
  const streamed = new Request("https://local.invalid/api/wallet/deposits/owned/recheck", { method: "POST", body: stream,
    duplex: "half", headers: { "sec-fetch-site": "same-origin", "x-kp-deposit-recheck": "1", "content-length": "1" } } as RequestInit);
  const streamedResponse = await invoke(streamed);
  ok("route.body.stream-bound-and-cancel", (await streamedResponse.json()).state === "UNKNOWN" && receivedBinding === null && cancelled
    && streamedResponse.headers.get("cache-control") === "private, no-store");
  session = null; response = await invoke();
  ok("route.401-private", response.status === 401 && response.headers.get("cache-control") === "private, no-store");
  session = { userId: me }; result = { view: { state: "UNKNOWN" }, rateLimited: true, unavailable: false }; response = await invoke();
  ok("route.429-private", response.status === 429 && response.headers.get("cache-control") === "private, no-store");
  result = { view: { state: "UNKNOWN" }, rateLimited: false, unavailable: true }; response = await invoke();
  ok("route.core-unavailable-503", response.status === 503 && response.headers.get("cache-control") === "private, no-store");
  coreFailure = true; response = await invoke();
  ok("route.throw-503-private", response.status === 503 && response.headers.get("cache-control") === "private, no-store" && !JSON.stringify(await response.json()).includes("private"));
  return checks;
}
try {
  const mutations = BACKGROUND ? BACKGROUND_MUTATIONS : RECHECK ? RECHECK_MUTATIONS
    : REFERENCE_ONLY ? MUTATIONS.filter(m => m.name.startsWith("deposit-ref-")) : MUTATIONS;
  for (const m of mutations) { const anchor = resolveAnchor(sources[m.file], m.from); if (!anchor.ok) throw new Error(`${m.name}: ${anchor.reason}`); }
  const execute = BACKGROUND ? runBackground : RECHECK ? runRecheck : REFERENCE_ONLY ? referenceControls : run;
  const suite = BACKGROUND ? "payment-background" : RECHECK ? "deposit-recheck" : REFERENCE_ONLY ? "provider-reference" : "deposit-status-read";
  const green = await execute(), failed = green.filter(c => !c.pass);
  for (const c of green) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
  if (failed.length) throw new Error(`${failed.length} status-read controls failed`);
  if (process.argv.includes("--prove-red")) {
    if (PG) throw new Error("Plants remain in memory, PG is independent durable proof");
    for (const m of mutations) {
      const planted = await execute({ ...sources, [m.file]: injectDefect(sources[m.file], m.from, m.to) });
      if (!planted.some(c => !c.pass && c.name.startsWith(m.expect))) throw new Error(`SURVIVED ${m.name}; expected ${m.expect}`);
      console.log(`PASS caught ${m.name}`);
    }
    console.log(`${suite} red: ${mutations.length}/${mutations.length}`);
  }
  if (process.argv.includes("--prove-atomic-red")) {
    if (!PG || (!RECHECK && !BACKGROUND)) throw new Error("Atomic rollback plants require an actual own Postgres fixture");
    const atomicMutations = BACKGROUND ? BACKGROUND_PG_MUTATIONS : RECHECK_PG_MUTATIONS;
    for (const m of atomicMutations) {
      const planted = await execute({ ...sources, [m.file]: injectDefect(sources[m.file], m.from, m.to) });
      if (!planted.some(c => !c.pass && c.name.startsWith(m.expect))) throw new Error(`SURVIVED ${m.name}; expected ${m.expect}`);
      console.log(`PASS caught actual-PG ${m.name}`);
    }
    console.log(`${suite} PG atomic red: ${atomicMutations.length}/${atomicMutations.length}`);
  }
  console.log(`${suite} ${PG ? "Postgres" : "memory"}: ${green.length}/${green.length}; actual core/settle/DAL/locks, controlled signed adapter`);
} finally { await prisma()?.$disconnect(); }
