/** Execute the shipped core/settlement bodies on the actual DAL, locks and ledger. Signed adapter I/O is controlled. */
import { readFileSync, realpathSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import * as ReactRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as D from "../src/lib/journey/deposit-state.ts";
import { DepositSchema, AdminDepositSchema } from "../src/lib/server/validators.ts";
import { paymentMethodName, isMobileMoneyMethodId, MOBILE_MONEY_METHODS } from "../src/lib/payment-providers.ts";
import { RG_RETURN_MARK } from "../src/lib/wallet/receipts.ts";
import { depositResultStatus, isRgHeldDeposit, presentedStatus } from "../src/lib/wallet/receipts.ts";
import * as Review from "../src/lib/wallet/deposit-review.ts";
import * as WalletLedger from "../src/lib/wallet/ledger.ts";
import * as QueryWindows from "../src/lib/query/windows.ts";
import { formatDateTime, formatTzs } from "../src/lib/utils.ts";
import { resolveAnchor, injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/deposit-status-read.anchors.mjs";
import { MUTATIONS as RECHECK_MUTATIONS, PG_MUTATIONS as RECHECK_PG_MUTATIONS } from "./anchors/deposit-recheck.anchors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const files = ["src/lib/server/deposit-status.ts", "src/lib/server/wallet-service.ts", "src/lib/server/rate-limit.ts",
  "src/app/api/wallet/deposits/[id]/status/route.ts", "src/app/api/wallet/deposits/recover/route.ts",
  "src/lib/wallet/deposit-review.ts", "src/lib/wallet/receipts.ts", "src/lib/server/notification-service.ts", "src/app/api/webhooks/payments/route.ts",
  "src/app/wallet/receipt/[id]/page.tsx", "src/lib/server/email.ts", "src/lib/i18n-dict.ts", "src/lib/server/prisma-dal.ts"];
const sources = Object.fromEntries(files.map(file => [file, readFileSync(join(ROOT, file), "utf8")]));
const RECHECK_FILE = "src/lib/server/deposit-recheck.ts";
const RECHECK_ROUTE = "src/app/api/wallet/deposits/[id]/recheck/route.ts";
for (const file of [RECHECK_FILE, RECHECK_ROUTE]) sources[file] = readFileSync(join(ROOT, file), "utf8");
const RECHECK = process.argv.includes("--recheck-only");
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
  const reviewModule = compile(src[files[5]], {});
  const receiptsModule = compile(src[files[6]], { "@/lib/query/windows": QueryWindows, "@/lib/query/parse": {}, "@/lib/query/href": {},
    "@/lib/query/counts": {}, "@/lib/query/empty": {}, "@/lib/payment-providers": { paymentMethodName }, "./ledger": WalletLedger, "./deposit-review": reviewModule });
  const seen = { verifies: [] as string[], settles: 0, audits: [] as any[], notices: [] as any[], groups: [] as string[], funnels: 0,
    locked: false, statusAllowed: true, probeAllowed: true, lockAtDispatch: false, rateCalls: [] as Array<{ key: string; action: string }> };
  let verify: (ref: string) => Promise<any> = async () => ({ status: "PENDING" });
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
    postLedgerEntries: async (id: string, lines: any, tx: any) => { seen.groups.push(id); return L.postLedgerEntries(id, lines, tx); },
    depositEntries: L.depositEntries, rgSuspenseEntries: L.rgSuspenseEntries,
    audit, isLockedOut: async () => ({ locked: seen.locked, reason: "cooling-off" }), RG_RETURN_MARK, paymentMethodName, formatTzs, formatDateTime,
    DEPOSIT_STATUS_REVIEW_MARK: reviewModule.DEPOSIT_STATUS_REVIEW_MARK, depositResultStatus: receiptsModule.depositResultStatus,
    hasDepositStatusReview: reviewModule.hasDepositStatusReview, isRgHeldDeposit: receiptsModule.isRgHeldDeposit,
    DepositSchema, AdminDepositSchema, parseSavedDepositBet: D.parseSavedDepositBet, sameDepositFunding: D.sameDepositFunding,
    rateCheckAsync: async () => ({ allowed: true }), randomId: () => String(++sequence).padStart(24, "0"),
    isMaintenanceMode: async () => false, maintenanceMessage: async () => "Maintenance", isPaymentPaused: async () => false,
    checkDepositLimit: async () => ({ allowed: true }), SOF_SINGLE_TXN_TZS: 1_000_000, SOF_ROLLING_30D_TZS: 5_000_000,
    readIdentityStanding: async () => ({ kycStatus: "NOT_STARTED", everApproved: false }),
    dispatchDeposit: async ({ correlationId }: any) => { if (seen.lockAtDispatch) seen.locked = true; return { ok: true, status: "CONFIRMED", providerRef: correlationId }; },
    emit: () => {}, notifyDeposit: (_userId: string, notice: any) => seen.notices.push(notice),
    sendEmailToUser: async () => {}, depositConfirmedHtml: () => "", depositReversedHtml: () => "", depositFailedHtml: () => "",
    require: requireFixture,
  };
  const names = ["deposit", "settleDepositFromReturn", "settleDepositConfirmed", "settleDepositFailed", "settlePaymentWebhook", "markDepositStatusReview", "refundAmlRejection", "friendlyProvider", "friendlyDepositReason", "friendlyFailureReason", "auditNeedsReviewOnce"];
  const walletText = "const NEEDS_REVIEW_SEEN = new Set(); const NEEDS_REVIEW_CAP = 5000;\n" + names.map(name => fn(src[files[1]], name)).join("\n");
  const code = ts.transpileModule(walletText, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const money = new Function(...Object.keys(deps), `${code}\nreturn { deposit, settleDepositFromReturn, settlePaymentWebhook, settleDepositConfirmed, settleDepositFailed, markDepositStatusReview, refundAmlRejection };`)(...Object.values(deps));
  const rate = async (key: string, action: string) => {
    seen.rateCalls.push({ key, action });
    return { allowed: action === "deposit.status" ? seen.statusAllowed : seen.probeAllowed, retryAfterSec: 10 };
  };
  core = compile(src[files[0]], { "./store": { db: data }, "./audit": { audit }, "./rate-limit": { rateCheckAsync: rate },
    "./payments": { verifyDepositStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); } },
    "./wallet-service": { settlePaymentWebhook: async (input: any) => { seen.settles++; return money.settlePaymentWebhook(input); } },
    "@/lib/journey/deposit-state": D,
  });
  const recheck = compile(src[RECHECK_FILE], { "./store": { db: data }, "./audit": { audit }, "./rate-limit": { rateCheckAsync: rate },
    "./payments": { verifyDepositStatus: async (ref: string) => { seen.verifies.push(ref); return verify(ref); } },
    "./wallet-service": { settlePaymentWebhook: async (input: any) => { seen.settles++; return money.settlePaymentWebhook(input); } },
    "./locks": { withLock }, "@/lib/journey/deposit-state": D, "@/lib/payment-providers": { isMobileMoneyMethodId },
  });
  return { read: core.readDepositStatus as (id: string, lookup: DLookup) => Promise<any>, recheck: recheck.recheckDepositStatus as (id: string, txnId: string) => Promise<any>, money, seen, reviewModule, receiptsModule,
    verify: (next: typeof verify) => { verify = next; } };
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
async function run(src = sources): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: unknown) => checks.push({ name, pass: !!pass });
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
  const heldNotice = notify(me, { status: "REVERSED", amount: 5000, provider: "M-Pesa", txnId: own.id });
  ok("rg.bell-does-not-claim-refund", heldNotice.bodyEn.includes("held for return") && heldNotice.bodySw.includes("zinashikiliwa")
    && heldNotice.bodyZh.includes("待退还") && !/has been returned|imerudishwa|已(?:原路)?退回/.test(JSON.stringify(heldNotice)));
  const dictionary = compile(src[files[11]], {}).dict;
  for (const locale of ["en", "sw", "zh"]) {
    const words = dictionary[locale].wallet;
    ok(`rg.card-copy.${locale}`, !/has been returned|yamerudishwa|已退回/.test(words.returnReversedTitle + words.returnReversedBody)
      && (locale === "en" ? words.returnReversedTitle.includes("held for return") : locale === "sw" ? words.returnReversedTitle.includes("yanashikiliwa") : words.returnReversedTitle.includes("待退还")));
  }
  // Execute the actual template body with controlled chrome helpers; the notification suite separately renders its full HTML.
  const heldMail = new Function("wrap", "eyebrow", "heading", "subtitle", "subtitleSw", "detailRows", "depositRefRows", "refNote", "formatTzs",
    ts.transpileModule(fn(src[files[10]], "depositReversedHtml"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\nreturn depositReversedHtml;")(
      (body: string) => body, (en: string, sw: string) => en + " " + sw, (text: string) => text, (text: string) => text, (text: string) => text,
      (rows: any[]) => JSON.stringify(rows), (reference: string, gatewayRef: string) => [{ reference, gatewayRef }], () => "", formatTzs)({ amount: 5000, method: "M-Pesa", reference: own.id, gatewayRef: own.providerRef });
  ok("rg.mail-no-delivery-promise", heldMail.includes("held for return") && heldMail.includes("zinashikiliwa ili zirudishwe")
    && heldMail.includes("has not been confirmed") && !/returned to the account it came from|Amana imerudishwa|5 working days|siku 5 za kazi/.test(heldMail));
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
  const delayed = { ...db, txn: { ...db.txn, findById: async (id: string) => {
    const row = await db.txn.findById(id);
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
  const delayedConfirm = { ...db, txn: { ...db.txn, findById: async (id: string) => {
    const row = await db.txn.findById(id);
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
      });
      const html = renderToStaticMarkup(await receipt.default({ params: Promise.resolve({ id: row.id }) }));
      const shown = name === "rg-rejected-held" ? "REVERSED" : "AML_REVIEW";
      const expectedBody = name === "rg-rejected-held" ? t.wallet.returnReversedBody : t.wallet.returnReviewBody;
      const containsText = (text: string) => html.includes(renderToStaticMarkup(ReactRuntime.jsx("span", { children: text })).slice(6, -7));
      ok(`receipt.${name}.${locale}`, html.includes(`data-status="${shown}"`) && containsText(expectedBody)
        && html.includes('data-refresh="false"') && !containsText(t.wallet.receiptPendingNote)
        && !containsText(t.wallet.receiptCompletedAt) && !containsText(t.wallet.balanceAfter));
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
  const lostResult = await lost.read(lostOwner, byId(lostRow));
  ok("review.persisted-write-answer-lost", lostResult.view.state === "REVIEW" && lostResult.txn?.id === lostRow.id
    && Review.hasDepositStatusReview((await db.txn.findById(lostRow.id))!) && (await db.wallet.findByUserId(lostOwner))?.balance === 0);
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
      await db.txn.update(changed.id, (name === "key" ? { idempotencyKey: `${patch.idempotencyKey}_${changed.id}` } : patch) as never);
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
      } else await db.txn.update(changed.id, (name === "key" ? { idempotencyKey: `${patch.idempotencyKey}_${changed.id}` } : patch) as never);
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
  for (const [failure, balance] of [["missing", 0], ["fault", 0], ["wrong-currency", 0], ["negative", -1],
    ["non-finite", Infinity], ["fractional", 0.5]] as const) {
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
  const normal = system(src);
  const ordinary = await normal.read(me, byId(row)), recovered = await normal.read(me, { kind: "funding-key", value: row.idempotencyKey! });
  ok("policy.ordinary-and-recovery-no-terminal-probe", ordinary.view.state === "FAILED" && recovered.view.state === "FAILED"
    && !ordinary.view.failureAuthority && !recovered.view.failureAuthority && normal.seen.verifies.length === 0 && normal.seen.settles === 0);
  let session: any = { userId: me }, coreCalls = 0, coreFailure = false, result: any = { view: { state: "FAILED", failureAuthority: "signed-recheck" }, rateLimited: false, unavailable: false };
  const route = compile(src[RECHECK_ROUTE], { "next/server": { NextResponse: { json: (body: any, init: ResponseInit) => new Response(JSON.stringify(body), init) } },
    "@/lib/server/session": { getSession: async () => session }, "@/lib/server/deposit-recheck": { recheckDepositStatus: async (owner: string, id: string) => {
      coreCalls++; if (coreFailure) throw new Error("private route failure"); if (owner !== me || id !== row.id) throw new Error("wrong identity"); return result;
    } } });
  const request = (headers: Record<string, string> = {}, method = "POST") => new Request("https://local.invalid/api/wallet/deposits/owned/recheck", { method,
    headers: { "sec-fetch-site": "same-origin", "x-kp-deposit-recheck": "1", ...headers } });
  const invoke = (req = request()) => route.POST(req, { params: Promise.resolve({ id: row.id }) });
  for (const site of ["cross-site", "same-site", "none", ""]) {
    const response = await invoke(request({ "sec-fetch-site": site }));
    ok(`route.${site || "no-site"}`, response.status === 403 && response.headers.get("cache-control") === "private, no-store" && coreCalls === 0);
  }
  ok("route.no-header", (await invoke(request({ "x-kp-deposit-recheck": "" }))).status === 403 && coreCalls === 0);
  ok("route.not-post", (await invoke(request({}, "GET"))).status === 403 && coreCalls === 0);
  let response = await invoke();
  ok("route.200-private", response.status === 200 && response.headers.get("cache-control") === "private, no-store" && (await response.json()).failureAuthority === "signed-recheck");
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
  const mutations = RECHECK ? RECHECK_MUTATIONS : MUTATIONS;
  for (const m of mutations) { const anchor = resolveAnchor(sources[m.file], m.from); if (!anchor.ok) throw new Error(`${m.name}: ${anchor.reason}`); }
  const execute = RECHECK ? runRecheck : run;
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
    console.log(`${RECHECK ? "deposit-recheck" : "deposit-status-read"} red: ${mutations.length}/${mutations.length}`);
  }
  if (process.argv.includes("--prove-atomic-red")) {
    if (!PG || !RECHECK) throw new Error("Atomic rollback plants require the actual own Postgres recheck fixture");
    for (const m of RECHECK_PG_MUTATIONS) {
      const planted = await runRecheck({ ...sources, [m.file]: injectDefect(sources[m.file], m.from, m.to) });
      if (!planted.some(c => !c.pass && c.name.startsWith(m.expect))) throw new Error(`SURVIVED ${m.name}; expected ${m.expect}`);
      console.log(`PASS caught actual-PG ${m.name}`);
    }
    console.log(`deposit-recheck PG atomic red: ${RECHECK_PG_MUTATIONS.length}/${RECHECK_PG_MUTATIONS.length}`);
  }
  console.log(`${RECHECK ? "deposit-recheck" : "deposit-status-read"} ${PG ? "Postgres" : "memory"}: ${green.length}/${green.length}; actual core/settle/DAL/locks, controlled signed adapter`);
} finally { await prisma()?.$disconnect(); }
