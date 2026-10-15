/**
 * Generic payout status is not proof that money did not leave the provider.
 * Execute the production action and sweep bodies against controlled provider
 * answers. The pre-fix bodies return the held TZS 1,000 for PENDING/FAILED.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replaceAll("\r\n", "\n");
const actions = read("../src/app/admin/payments/payment-actions.ts");
const wallet = read("../src/lib/server/wallet-service.ts");
const controls = read("../src/app/admin/payments/stuck-payout-controls.tsx");

function body(source: string, begin: string, end: string): string {
  const a = source.indexOf(begin);
  const b = source.indexOf(end, a + begin.length);
  assert(a >= 0 && b > a, `could not isolate ${begin}`);
  return source.slice(a, b).replace("export async function", "async function");
}

function compile<T>(source: string, name: string, bindings: Record<string, unknown>): T {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), `${js}\nreturn ${name};`)(...Object.values(bindings)) as T;
}

const reverseBody = body(actions, "export async function reverseStuckPayoutAction", "\n/** PSP reconciliation");
const sweepBody = body(wallet, "export async function reconcileStalePayments", "\n/**\n * Email players");

type Verdict = "PENDING" | "UNSUPPORTED" | "FAILED" | "CONFIRMED";
type Result = { ok: boolean; error?: string };

async function runReverse(verdict: Verdict, providerRef: string | null) {
  const row = { id: "wdr_live_1", userId: "player_1", type: "WITHDRAWAL", status: "PROCESSING", amount: -1000,
    providerRef, payoutRail: "WALLET_CASHIN", createdAt: new Date(0).toISOString() };
  let hold = 1000, balance = 0, refunds = 0, queries = 0, audits = 0;
  // The old action uses dynamic imports. Replace only their bindings in the
  // isolated function so the real branch and decision logic still execute.
  const prepared = reverseBody
    .replace('await import("@/lib/server/payments")', "paymentModule")
    .replace('await import("@/lib/server/wallet-service")', "walletModule");
  const reverseWithProvider = compile<(fd: FormData) => Promise<Result>>(prepared, "reverseStuckPayoutAction", {
    gate: async () => ({ userId: "officer_1", sessionId: "session_1" }),
    fieldError: (_field: string, error: string) => ({ ok: false, error }),
    db: { txn: { findById: async () => row } },
    audit: () => { audits++; },
    revalidatePath: () => {},
    paymentModule: { verifyWithdrawalStatus: async () => { queries++; return { status: verdict, detail: "generic status" }; } },
    walletModule: { settleWithdrawalFailed: async () => { refunds++; hold -= 1000; balance += 1000; row.status = "FAILED"; return true; } },
  });
  const fd = new FormData();
  fd.set("txnId", row.id);
  fd.set("reason", "Provider status does not prove nonpayment");
  const result = await reverseWithProvider(fd);
  return { result, row, hold, balance, refunds, queries, audits };
}

if (process.argv.includes("--prove-red")) {
  const action = await runReverse("PENDING", "selcom_ref_1");
  const sweep = await runSweep("FAILED", "selcom_ref_2");
  assert.equal(action.refunds, 1, "old staff action must demonstrate the unsafe refund");
  assert.equal(sweep.refunds, 1, "old sweep must demonstrate the unsafe refund");
  assert.equal(action.balance, 1000);
  assert.equal(sweep.balance, 1000);
  console.log("pre-fix control reproduced both in-flight payout refunds");
  process.exit(0);
}

async function runSweep(verdict: Verdict, providerRef: string | null, failStatusWrite = false) {
  const row = { id: "wdr_live_2", userId: "player_2", type: "WITHDRAWAL", status: "PROCESSING", amount: -1000,
    providerRef, payoutRail: "WALLET_CASHIN", providerStatus: null as string | null, createdAt: new Date(0).toISOString() };
  let hold = 1000, balance = 0, refunds = 0, settlements = 0, reviews = 0;
  const sweep = compile<(olderThanMs?: number) => Promise<{ withdrawalsReversed: number; withdrawalsConfirmed: number; leftPending: number }>>(
    sweepBody, "reconcileStalePayments", {
      db: { txn: { listByStatus: async () => [row], update: async (_id: string, patch: { providerStatus?: string }) => {
        if (failStatusWrite) throw new Error("status trail unavailable");
        return Object.assign(row, patch);
      } } },
      verifyWithdrawalStatus: async () => ({ status: verdict, detail: "generic provider result" }),
      settleWithdrawalFailed: async () => { refunds++; hold -= 1000; balance += 1000; row.status = "FAILED"; return true; },
      settlePaymentWebhook: async () => { settlements++; hold = 0; row.status = "CONFIRMED"; return { handled: true }; },
      auditNeedsReviewOnce: () => { reviews++; },
      clearNeedsReview: () => {},
      audit: () => {},
      console: { log: () => {} },
    },
  );
  const result = await sweep();
  return { result, row, hold, balance, refunds, settlements, reviews };
}

for (const verdict of ["PENDING", "UNSUPPORTED", "FAILED", "CONFIRMED"] as const) {
  const x = await runReverse(verdict, "selcom_ref_1");
  assert.equal(x.refunds, 0, `staff reversal refunded an in-flight payout after ${verdict}`);
  assert.equal(x.hold, 1000, `staff reversal released held funds after ${verdict}`);
  assert.equal(x.balance, 0, `staff reversal credited spendable money after ${verdict}`);
  assert.equal(x.result.ok, false, `staff reversal accepted ${verdict}`);
  assert.equal(x.audits, 1, `staff refusal after ${verdict} was not audited`);
}
const noRef = await runReverse("PENDING", null);
assert.equal(noRef.refunds, 0, "staff reversal refunded a payout without a provider reference");
assert.equal(noRef.result.ok, false, "staff reversal accepted a payout without a provider reference");

for (const verdict of ["FAILED", "PENDING", "UNSUPPORTED"] as const) {
  const x = await runSweep(verdict, "selcom_ref_2");
  assert.equal(x.refunds, 0, `stale sweep refunded an in-flight payout after ${verdict}`);
  assert.equal(x.settlements, 0, `stale sweep settled an unconfirmed payout after ${verdict}`);
  assert.equal(x.hold, 1000);
  assert.equal(x.balance, 0);
  assert.equal(x.row.status, "PROCESSING");
  assert.equal(x.result.leftPending, 1);
  if (verdict === "FAILED") {
    assert.equal(x.reviews, 1, "ambiguous FAILED verdict needs operator review");
    assert.match(x.row.providerStatus ?? "", /REVIEW REQUIRED/i, "operator review must survive a restart on the transaction row");
  }
}
const confirmed = await runSweep("CONFIRMED", "selcom_ref_2");
assert.equal(confirmed.settlements, 1, "confirmed payout must still settle");
assert.equal(confirmed.refunds, 0);
assert.equal(confirmed.result.withdrawalsConfirmed, 1);

const writeFailure = await runSweep("FAILED", "selcom_ref_2", true);
assert.equal(writeFailure.refunds, 0, "a failed status-trail write must never refund");
assert.equal(writeFailure.result.leftPending, 1, "a failed status-trail write must not abort the sweep");
assert.equal(writeFailure.reviews, 1, "a failed status-trail write must still alert operators");

assert.match(controls, /provider.*review|review.*provider/is, "admin panel must explain provider review");
assert.doesNotMatch(controls, /Return to player|Return the money|provider is asked one more time/i,
  "admin panel must not offer or promise an unsafe return");
console.log("payout uncertain fail-close: all action, sweep, and UI cases passed");
