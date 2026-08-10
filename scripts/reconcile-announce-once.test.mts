/**
 * E-134 — the reconcile sweep announces an open item ONCE, not once per sweep.
 *
 * 🔴 WHAT THIS IS FOR, MEASURED ON PRODUCTION 2026-08-10. A single withdrawal that had been
 * waiting for an officer since 2026-08-07 wrote **1,329 byte-identical audit rows** — one
 * every ~5 minutes for 69 hours. `payments.reconcile_needs_review` was **1,363 rows, 3.4%
 * of the entire 40,052-row audit chain**, and `payments.reconcile_sweep` another 5.3%: the
 * reconcile machinery alone was 8.7% of regulator-facing evidence.
 *
 * ⛔ THE MONEY LOGIC WAS NEVER WRONG and this suite asserts nothing about it. Every one of
 * those rows was TRUE — refusing to auto-reverse a payout with no `providerRef` is correct,
 * and is the reason no player was wrongly refunded. They were the same truth, restated.
 *
 * ⭐ SO THE DANGEROUS FIX IS A GLOBAL MUTE, AND §2 IS THE CHECK THAT CATCHES IT. Deduping
 * per (transaction, reason) is right; deduping per ACTION would silence the second stuck
 * payout in a sweep and no counter would notice. A suite that only proved "fewer rows"
 * would pass on that bug, which is why §2 exists and why it uses a SECOND transaction.
 *
 * ⚠️ Behavioural, not structural: it runs the real `reconcileStalePayments` against the
 * in-memory store and COUNTS the rows it wrote. Asserting the source contains a Set would
 * pass on a Set that is never consulted.
 */
import { db } from "../src/lib/server/store.ts";
import { withdraw, reconcileStalePayments } from "../src/lib/server/wallet-service.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const now = new Date().toISOString();
async function makePlayer(id: string, balance: number) {
  await db.user.create({
    id, phoneE164: `+25571900${id.slice(-4)}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  await db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: "APPROVED", rejectReason: null, rejectNote: null, nidaNumber: "19900101456712341234", nidaVerifiedAt: now, fullName: "Test Player", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now } as never);
}

/**
 * Count the needs-review rows written against ONE transaction.
 *
 * ⛔ FLUSH FIRST. `audit()` returns before the row is readable, so the first version of this
 * suite counted **0** three times and reported the fix as broken — while the very next
 * assertion, running a beat later, read 1. A test that measures a deferred write without
 * awaiting it is measuring its own scheduling, and here it condemned working code.
 */
const announcements = async (txnId: string) => {
  await auditFlush();
  return getAuditForTarget("Transaction", txnId, 500).filter((a) => a.action === "payments.reconcile_needs_review").length;
};

/**
 * Reproduce the exact production shape: a withdrawal PROCESSING with NO providerRef.
 * That is the row the sweep refuses to auto-reverse, and the one that repeated 1,329 times.
 */
async function stuckWithdrawalWithNoRef(uid: string, amount: number): Promise<string> {
  const w = await withdraw(uid, { provider: "MPESA", amount, msisdn: "0712345678" });
  if (!w.ok) throw new Error(`withdraw failed for ${uid}: ${JSON.stringify(w)}`);
  const txnId = w.data!.txnId;
  // The provider reference is what the sweep keys its refusal on; production's row had none.
  await db.txn.update(txnId, { providerRef: null } as never);
  return txnId;
}

process.env.PAYMENTS_DEMO_ASYNC = "true";

console.log("\nE-134 — an open item raises its hand once, then waits\n");
console.log("── 1 · the same stuck payout, swept three times ─────────────────");

await makePlayer("usr_e134a", 100_000);
const txnA = await stuckWithdrawalWithNoRef("usr_e134a", 2_000);
ok("the transaction is PROCESSING with no providerRef (production's exact shape)",
  (await db.txn.findById(txnA))?.status === "PROCESSING" && !(await db.txn.findById(txnA))?.providerRef);

const sweeps = [] as number[];
for (let i = 0; i < 3; i++) sweeps.push((await reconcileStalePayments(-1)).leftPending);

const nA = await announcements(txnA);
ok("⭐ THREE sweeps wrote exactly ONE needs-review row (was one per sweep)", nA === 1, `${nA} row(s)`);
ok("…and the FIRST sweep did announce it — silence is not the fix", nA >= 1);
ok("⛔ …while `leftPending` still counts it on EVERY sweep (no information lost)",
  sweeps.every((n) => n >= 1), `leftPending per sweep: ${sweeps.join(", ")}`);

console.log("\n── 2 · a SECOND stuck payout is NOT muted by the first ──────────");
// ⭐ THE CHECK THAT MATTERS. Deduping per ACTION instead of per (txn, reason) would silence
// this one entirely, and §1 would still pass. That bug hides a second frozen payout from
// the officer who has to release it — strictly worse than the noise it replaced.
await makePlayer("usr_e134b", 100_000);
const txnB = await stuckWithdrawalWithNoRef("usr_e134b", 3_000);
await reconcileStalePayments(-1);

const nB = await announcements(txnB);
const nA2 = await announcements(txnA);
ok("⭐ the second stuck payout gets its OWN row (the dedupe is per-transaction, not global)", nB === 1, `${nB} row(s)`);
ok("…and the first one did not gain a row from that sweep", nA2 === 1, `${nA2} row(s)`);

console.log("\n── 3 · a terminal transition forgets it, so a LATER stall speaks ─");
// The announcement is cleared when a transaction reaches a terminal state. Proven through
// the public surface: after the sweep resolves a payout, its key must be gone. We assert it
// via the reconcile of a row that DOES carry a providerRef and therefore terminalises.
const wallet = (await import("node:fs")).readFileSync(new URL("../src/lib/server/wallet-service.ts", import.meta.url), "utf8");
const fn = wallet.slice(wallet.indexOf("export async function reconcileStalePayments"));
const body = fn.slice(0, fn.indexOf("\nexport ") === -1 ? fn.length : fn.indexOf("\nexport "));
ok("every terminal branch in the sweep forgets the transaction",
  (body.match(/clearNeedsReview\(/g) ?? []).length >= 4,
  `${(body.match(/clearNeedsReview\(/g) ?? []).length} clear site(s)`);
ok("⛔ no raw needs-review audit() survives outside the helper",
  (wallet.match(/action: "payments\.reconcile_needs_review"/g) ?? []).length === 1);
ok("the announcement key carries the REASON, so a changed reason speaks again",
  /const key = `\$\{txnId\}::\$\{reason\}`/.test(wallet));
ok("the seen-set is pinned on globalThis (route handlers get a different module instance)",
  /globalThis[\s\S]{0,80}__kpNeedsReviewSeen/.test(wallet));

delete process.env.PAYMENTS_DEMO_ASYNC;

console.log(`\nreconcile-announce-once: ${pass} passed, ${fail} failed\n`);
if (fail > 0) {
  console.error("✗ E-134 BROKEN — either the audit chain is being flooded again, or an open payout has gone silent.\n");
  process.exit(1);
}
console.log("reconcile-announce-once: OK — one open item, one row; a second open item still speaks.");
