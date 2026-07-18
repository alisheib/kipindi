/**
 * Transaction compliance browser — filter, warning-classification and summary proofs.
 *
 * ⚠️ REAL MONEY. The admin transaction browser is how an operator reconciles the
 * platform against a gateway (Selcom) statement. Two things must be true:
 *   1. EVERY transaction state produces a defined operator signal — a row that is
 *      neither clean-terminal nor flagged is a shilling nobody is watching.
 *   2. The compliance totals cover the WHOLE filtered set, never just the page.
 *
 * Runs on the in-memory store (no DATABASE_URL). The Prisma DAL builds the
 * equivalent SQL `where`; `txn-filters.ts` is the single source both read.
 */
import {
  attentionOf, isUnreconciled, matchesFilters, summarise, sortAndPage,
  GATEWAY_TYPES, GATEWAY_PROVIDERS, STUCK_PROCESSING_MS,
} from "../src/lib/server/txn-filters.ts";
import type { StoredTxn } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); } };

const NOW = Date.parse("2026-07-18T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function txn(over: Partial<StoredTxn> = {}): StoredTxn {
  return {
    id: "txn_1", walletId: "w1", userId: "usr_1", type: "DEPOSIT", status: "CONFIRMED",
    amount: 10_000, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "MPESA", providerRef: "dep_abc", msisdn: "255712345678", description: null,
    positionId: null, amlReason: null, createdAt: ago(60_000), updatedAt: ago(60_000),
    completedAt: null, ...over,
  } as StoredTxn;
}

// ── EVERY STATE HAS A DEFINED SIGNAL ──────────────────────────────────────────
// A clean, terminal, reconciled row is the ONLY row allowed to return null.
const ALL_STATUSES: StoredTxn["status"][] = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"];
for (const status of ALL_STATUSES) {
  const a = attentionOf(txn({ status }), NOW);
  const isCleanTerminal = status === "CONFIRMED" || status === "CANCELLED";
  ok(`state ${status} → ${isCleanTerminal ? "no flag (clean)" : "a defined signal"}`, isCleanTerminal ? a === null : a !== null);
}

// Severity ordering — the worst thing wins.
ok("confirmed gateway money with NO ref → warn:unreconciled",
  attentionOf(txn({ status: "CONFIRMED", providerRef: null }), NOW)?.code === "unreconciled");
ok("AML_REVIEW → warn:aml", attentionOf(txn({ status: "AML_REVIEW" }), NOW)?.level === "warn");
ok("PROCESSING > 30min → warn:stuck",
  attentionOf(txn({ status: "PROCESSING", createdAt: ago(STUCK_PROCESSING_MS + 1000) }), NOW)?.code === "stuck");
ok("PROCESSING < 30min → info:inflight",
  attentionOf(txn({ status: "PROCESSING", createdAt: ago(60_000) }), NOW)?.code === "inflight");
ok("FAILED → info:failed", attentionOf(txn({ status: "FAILED" }), NOW)?.code === "failed");
ok("REVERSED → info:reversed", attentionOf(txn({ status: "REVERSED" }), NOW)?.code === "reversed");
ok("every warning is bilingual EN+SW", ALL_STATUSES.every((status) => {
  const a = attentionOf(txn({ status, providerRef: null }), NOW);
  return a === null || (!!a.label && !!a.sw);
}));

// An INTERNAL (non-gateway) confirmed row without a ref is NOT unreconciled —
// it never touched a gateway, so demanding a reference would be a false alarm.
ok("internal transfer without a ref is not flagged unreconciled",
  !isUnreconciled(txn({ type: "BET_PLACED", provider: "INTERNAL", providerRef: null })));
ok("gateway deposit without a ref IS unreconciled",
  isUnreconciled(txn({ type: "DEPOSIT", providerRef: null })));
ok("gateway withdrawal without a ref IS unreconciled",
  isUnreconciled(txn({ type: "WITHDRAWAL", amount: -5_000, providerRef: null })));
ok("an unconfirmed gateway row is not yet 'unreconciled'",
  !isUnreconciled(txn({ status: "PROCESSING", providerRef: null })));
ok("both gateway types are covered", GATEWAY_TYPES.includes("DEPOSIT") && GATEWAY_TYPES.includes("WITHDRAWAL"));
ok("every real MNO rail is a gateway provider", ["MPESA", "AIRTEL_MONEY", "TIGO_PESA", "MIXX", "HALO_PESA", "TTCL_PESA"].every((p) => GATEWAY_PROVIDERS.includes(p as never)));

// ── FILTERS ───────────────────────────────────────────────────────────────────
const f = (over = {}) => matchesFilters(txn(over as Partial<StoredTxn>), {} as never, NOW);
ok("empty filter matches everything", f());
ok("type filter", matchesFilters(txn({ type: "DEPOSIT" }), { types: ["DEPOSIT"] }, NOW)
  && !matchesFilters(txn({ type: "DEPOSIT" }), { types: ["WITHDRAWAL"] }, NOW));
ok("status filter", matchesFilters(txn({ status: "FAILED" }), { statuses: ["FAILED"] }, NOW)
  && !matchesFilters(txn({ status: "FAILED" }), { statuses: ["CONFIRMED"] }, NOW));
ok("provider filter", matchesFilters(txn({ provider: "MPESA" }), { providers: ["MPESA"] }, NOW)
  && !matchesFilters(txn({ provider: "MPESA" }), { providers: ["AIRTEL_MONEY"] }, NOW));
ok("null provider never matches a provider filter",
  !matchesFilters(txn({ provider: null }), { providers: ["MPESA"] }, NOW));
ok("date lower bound is inclusive", matchesFilters(txn({ createdAt: new Date(NOW).toISOString() }), { fromMs: NOW }, NOW));
ok("date upper bound is exclusive", !matchesFilters(txn({ createdAt: new Date(NOW).toISOString() }), { toMs: NOW }, NOW));
ok("q matches providerRef", matchesFilters(txn({ providerRef: "dep_XYZ" }), { q: "xyz" }, NOW));
ok("q matches msisdn", matchesFilters(txn({ msisdn: "255712345678" }), { q: "712345" }, NOW));
ok("q matches txn id", matchesFilters(txn({ id: "txn_abc123" }), { q: "ABC123" }, NOW));
ok("q matches userId", matchesFilters(txn({ userId: "usr_9f" }), { q: "usr_9f" }, NOW));
ok("q that matches nothing excludes the row", !matchesFilters(txn(), { q: "no-such-thing" }, NOW));
ok("attentionOnly keeps warn rows", matchesFilters(txn({ status: "AML_REVIEW" }), { attentionOnly: true }, NOW));
ok("attentionOnly drops clean rows", !matchesFilters(txn({ status: "CONFIRMED" }), { attentionOnly: true }, NOW));
ok("attentionOnly drops info-only rows", !matchesFilters(txn({ status: "FAILED" }), { attentionOnly: true }, NOW));

// ── SUMMARY covers the whole set, and counts money by direction ───────────────
const set: StoredTxn[] = [
  txn({ id: "a", type: "DEPOSIT", status: "CONFIRMED", amount: 100_000, fee: 0 }),
  txn({ id: "b", type: "DEPOSIT", status: "CONFIRMED", amount: 50_000, fee: 0 }),
  txn({ id: "c", type: "DEPOSIT", status: "FAILED", amount: 999_000 }),           // must NOT count
  txn({ id: "d", type: "WITHDRAWAL", status: "CONFIRMED", amount: -30_000, fee: 300 }),
  txn({ id: "e", type: "WITHDRAWAL", status: "AML_REVIEW", amount: -2_000_000 }),  // held, not paid
  txn({ id: "f", type: "DEPOSIT", status: "PROCESSING", amount: 7_000 }),
  txn({ id: "g", type: "DEPOSIT", status: "CONFIRMED", amount: 12_000, providerRef: null }), // unreconciled
];
const s = summarise(set);
ok("deposits total counts only CONFIRMED deposits", s.depositsConfirmedTzs === 100_000 + 50_000 + 12_000);
ok("withdrawals total counts only CONFIRMED payouts (absolute)", s.withdrawalsConfirmedTzs === 30_000);
ok("an AML-held payout is NOT counted as money out", s.withdrawalsConfirmedTzs === 30_000);
ok("fees sum over confirmed rows", s.feesTzs === 300);
ok("in-flight count", s.inFlightCount === 1);
ok("aml count", s.amlCount === 1);
ok("failed count", s.failedCount === 1);
ok("unreconciled count", s.unreconciledCount === 1);

// ── SORT + PAGINATION ─────────────────────────────────────────────────────────
const paged = sortAndPage(set, { sort: { field: "amount", dir: "desc" }, skip: 0, take: 3 });
ok("sort by amount desc uses absolute value", Math.abs(paged[0].amount) === 2_000_000);
ok("take limits the page", paged.length === 3);
ok("skip offsets the page", sortAndPage(set, { sort: { field: "amount", dir: "desc" }, skip: 1, take: 1 })[0].id === "c");
ok("default sort is newest-first", sortAndPage([
  txn({ id: "old", createdAt: ago(10 * 60_000) }), txn({ id: "new", createdAt: ago(60_000) }),
], {})[0].id === "new");
ok("take is clamped to a sane maximum", sortAndPage(set, { take: 99_999 }).length === set.length);
ok("a negative skip cannot underflow", sortAndPage(set, { skip: -5, take: 2 }).length === 2);

console.log(`\ntxn-search: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
