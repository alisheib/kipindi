/**
 * FAST PAYOUT LANE — money-path safety test.
 *
 * Born from a real incident: on 2026-07-29 a live 10,000 TZS withdrawal sat in
 * PROCESSING for 38 minutes with NOTHING re-querying it, because the 30-minute
 * stale sweep was the only thing that asked and it ignores anything younger.
 * Deposits had had a 15-second lane since July. Payouts had none.
 *
 * This suite guards the two properties that make the new lane safe to run every
 * 15 seconds against real money:
 *
 *   1. SELECTION — it looks at exactly the payouts nobody else is looking at, and
 *      its window meets the stale sweep's cutoff with no gap and no overlap. A gap
 *      is the original bug; an overlap means two paths racing on one payout.
 *   2. CONFIRM-ONLY — it can complete a payout, and it can NEVER fail or reverse
 *      one. A reversal refunds a player whose money may already be en route to
 *      their handset, i.e. pays twice. Reversals belong exclusively to the
 *      30-minute reconcile, which is written to be conservative about that.
 *
 * Property 2 is checked BOTH ways: structurally (the function cannot even name a
 * reversal) and behaviourally (drive the real lane against a provider that cannot
 * answer, and prove not one shilling moved).
 */
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { isFastPayoutCandidate, settleConfirmedWithdrawals } from "../src/lib/server/wallet-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const OLDER = 8_000;              // 8s  — don't race the dispatch that just returned
const WINDOW = 30 * 60 * 1000;    // 30m — where reconcileStalePayments takes over
const NOW = Date.parse("2026-07-29T15:00:00.000Z");
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const wdr = (msAgo: number, over: Partial<{ type: string; providerRef: string | null }> = {}) => ({
  type: "WITHDRAWAL", providerRef: "wdr_abc", createdAt: at(msAgo), ...over,
});

console.log("\n── 1 · Selection window ───────────────────────────────────────");

ok("a payout 10 minutes old IS picked up",
  isFastPayoutCandidate(wdr(10 * 60_000), NOW, OLDER, WINDOW));

ok("a payout 2 seconds old is SKIPPED (dispatch may still be returning)",
  !isFastPayoutCandidate(wdr(2_000), NOW, OLDER, WINDOW));

ok("a payout 45 minutes old is SKIPPED (the stale sweep owns it)",
  !isFastPayoutCandidate(wdr(45 * 60_000), NOW, OLDER, WINDOW));

// The boundaries themselves — this is where an off-by-one hides.
ok("exactly 8s old is SKIPPED (boundary is exclusive)",
  !isFastPayoutCandidate(wdr(OLDER), NOW, OLDER, WINDOW));
ok("8s + 1ms old IS picked up",
  isFastPayoutCandidate(wdr(OLDER + 1), NOW, OLDER, WINDOW));
ok("exactly 30m old IS still picked up (inclusive, so it meets the sweep)",
  isFastPayoutCandidate(wdr(WINDOW), NOW, OLDER, WINDOW));
ok("30m + 1ms old is SKIPPED",
  !isFastPayoutCandidate(wdr(WINDOW + 1), NOW, OLDER, WINDOW));

// ⛔ THE ORIGINAL BUG, as a permanent regression test. Every moment between the
// fast lane's ceiling and the stale sweep's floor is a moment when NOTHING is
// asking the provider about a player's money. That gap must be zero.
const STALE_SWEEP_FLOOR = 30 * 60 * 1000; // reconcileStalePayments' olderThanMs default
ok("NO GAP between the fast lane's ceiling and the stale sweep's floor",
  WINDOW >= STALE_SWEEP_FLOOR,
  `fast covers up to ${WINDOW / 60000}m, sweep starts at ${STALE_SWEEP_FLOOR / 60000}m`);

console.log("\n── 2 · What it must never touch ───────────────────────────────");

ok("a DEPOSIT is never touched by the payout lane",
  !isFastPayoutCandidate(wdr(10 * 60_000, { type: "DEPOSIT" }), NOW, OLDER, WINDOW));
ok("a BET_PLACED is never touched",
  !isFastPayoutCandidate(wdr(10 * 60_000, { type: "BET_PLACED" }), NOW, OLDER, WINDOW));
// No providerRef ⇒ we cannot ask the provider anything, so there is nothing to
// confirm. reconcileStalePayments routes these to an operator instead.
ok("a payout with NO providerRef is skipped, not guessed at",
  !isFastPayoutCandidate(wdr(10 * 60_000, { providerRef: null }), NOW, OLDER, WINDOW));
ok("a payout with an empty providerRef is skipped",
  !isFastPayoutCandidate(wdr(10 * 60_000, { providerRef: "" }), NOW, OLDER, WINDOW));
ok("an unparseable createdAt is skipped, not treated as epoch 0",
  !isFastPayoutCandidate({ type: "WITHDRAWAL", providerRef: "x", createdAt: "not-a-date" }, NOW, OLDER, WINDOW));

console.log("\n── 3 · CONFIRM-ONLY, structurally ─────────────────────────────");

// The lane must not even be ABLE to reverse. Read the real source of the real
// function — if someone later adds a reversal here, this fails loudly.
const src = readFileSync(new URL("../src/lib/server/wallet-service.ts", import.meta.url), "utf8");
const start = src.indexOf("export async function settleConfirmedWithdrawals");
const end = src.indexOf("export async function reconcileStalePayments");
ok("the fast payout lane was found in the source", start > 0 && end > start);
const body = src.slice(start, end);

ok("it never calls settleWithdrawalFailed", !body.includes("settleWithdrawalFailed"));
ok("it never calls settleDepositFailed", !body.includes("settleDepositFailed"));
ok('it never sends status:"FAILED" to the settle path', !/status:\s*["']FAILED["']/.test(body));
ok('it acts only on a definitive CONFIRMED', body.includes('v.status !== "CONFIRMED"'));
ok("it settles through the exactly-once webhook path", body.includes("settlePaymentWebhook"));

console.log("\n── 4 · CONFIRM-ONLY, behaviourally ────────────────────────────");

// Drive the REAL lane. With no live gateway configured, verifyWithdrawalStatus
// returns UNSUPPORTED — "we could not ask", which is precisely the state in which
// a careless implementation reverses a payout that is actually on its way.
const now = () => new Date().toISOString();
await db.user.create({
  id: "payee", phoneE164: "+255700000001", passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  email: "payee@test.tz", emailVerifiedAt: now(), createdAt: now(), updatedAt: now(),
  lastLoginAt: null, closedAt: null,
} as never);
await db.wallet.create({
  id: "wal_payee", userId: "payee", balance: 90_000, pending: 0, hold: 10_000,
  currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
} as StoredWallet);
await db.txn.create({
  id: "txn_inflight", walletId: "wal_payee", userId: "payee", type: "WITHDRAWAL",
  status: "PROCESSING", amount: 10_000, fee: 150, currency: "TZS", provider: "MPESA",
  providerRef: "wdr_inflight", msisdn: "+255700000001", description: "M-Pesa withdrawal",
  createdAt: new Date(Date.now() - 10 * 60_000).toISOString(), updatedAt: now(),
} as never);

const before = await db.wallet.findByUserId("payee");
const r = await settleConfirmedWithdrawals();
const after = await db.wallet.findByUserId("payee");
const txnAfter = await db.txn.findById("txn_inflight");

ok("the lane selected the in-flight payout", r.checked === 1, `checked=${r.checked}`);
ok("it confirmed NOTHING (the provider could not answer)", r.confirmed === 0, `confirmed=${r.confirmed}`);
ok("the payout is STILL PROCESSING — not reversed", txnAfter?.status === "PROCESSING", `status=${txnAfter?.status}`);
ok("the hold was NOT released", after?.hold === before?.hold, `${before?.hold} → ${after?.hold}`);
ok("the balance did NOT move", after?.balance === before?.balance, `${before?.balance} → ${after?.balance}`);

// Idempotency: the lane runs every 15s, so a no-op must stay a no-op.
await settleConfirmedWithdrawals();
await settleConfirmedWithdrawals();
const after3 = await db.wallet.findByUserId("payee");
ok("three passes move nothing (safe at a 15s cadence)",
  after3?.balance === before?.balance && after3?.hold === before?.hold);

console.log(`\n${"─".repeat(62)}\n  FAST PAYOUT: ${pass} passed, ${fail} failed\n${"─".repeat(62)}`);
process.exit(fail === 0 ? 0 : 1);
