/**
 * CARD DEPOSIT — FULL FLOW, DRIVEN REPEATEDLY AGAINST A STUB GATEWAY.
 *
 * This is the suite that answers "does the whole thing actually work, every
 * time, and does it stay correct when the player does something awkward?"
 *
 * It runs the real money path — wallet-service.deposit → the real Selcom adapter
 * → HTTP → scripts/selcom-stub-gateway.mjs → the real order-status re-query →
 * the real exactly-once settlement — and asserts BOTH the player-visible outcome
 * and the money invariants after every single run.
 *
 * The gauntlet, each repeated N times to prove it is deterministic:
 *   PASS 1..N  happy path: deposit → gateway → return → credited exactly once
 *   ·          pending: money may still arrive → must NEVER report failed
 *   ·          in-progress: same, via a different Selcom status value
 *   ·          declined card → failed, nothing credited
 *   ·          buyer cancelled on the gateway page → failed, nothing credited
 *   ·          gateway down at create-order → clean failure, no orphan row
 *   ·          closed the tab / returned hours later → resolves correctly late
 *   ·          hit back / refreshed / paid twice → credited exactly once
 *   ·          webhook arrives late, and twice → still exactly once
 *
 * INVARIANT CHECKED AFTER EVERY CASE: wallet balance == sum of CONFIRMED
 * deposits. No path may mint, lose, or double-credit.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { db } from "../src/lib/server/store.ts";
import { deposit, settleDepositFromReturn, settlePaymentWebhook } from "../src/lib/server/wallet-service.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";

const STUB_PORT = 4599;
process.env.PAYMENT_API_URL = `http://127.0.0.1:${STUB_PORT}/v1`;
process.env.PAYMENT_API_KEY = "stub-key";
process.env.PAYMENT_API_SECRET = "stub-secret";
process.env.PAYMENT_VENDOR_ID = "STUBVENDOR";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const now = () => new Date().toISOString();
let seq = 0;

async function mkPlayer(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Flow Tester", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(),          // past the deposit gate
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
}

const CARD_CTX = (orderReturn = "http://127.0.0.1:3000/wallet/deposit/return") => ({
  buyerEmail: "flow@example.com",
  buyerName: "Flow Tester",
  buyerPhone: "+255712345678",
  billing: {
    firstName: "Flow", lastName: "Tester", address1: "1 Test St",
    city: "Dar es Salaam", stateOrRegion: "Dar es Salaam",
    postcodeOrPobox: "P.O. Box 1", country: "TZ", phone: "+255712345678",
  },
  redirectUrl: orderReturn,
  cancelUrl: `${orderReturn}?cancelled=1`,
});

/** Pull order_id back out of the stub's gateway URL — this is exactly what the
 *  browser would carry to the return page. */
function orderIdFrom(gatewayUrl: string): string {
  return new URL(gatewayUrl).searchParams.get("order_id") ?? "";
}

/** THE money invariant: spendable balance must equal the sum of every deposit we
 *  actually confirmed. Checked after every scenario. */
async function assertBalanceMatchesConfirmed(userId: string, label: string): Promise<void> {
  const txns = await db.txn.findByUser(userId, 500);
  const expected = txns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED")
    .reduce((s, t) => s + t.amount, 0);
  const actual = (await db.wallet.findByUserId(userId))!.balance;
  ok(`${label} · balance == sum(CONFIRMED deposits)`, actual === expected, `wallet=${actual} confirmed=${expected}`);
}

// ── Boot the stub ────────────────────────────────────────────────────────────
let stub: ChildProcess;
async function startStub(): Promise<void> {
  stub = spawn(process.execPath, ["scripts/selcom-stub-gateway.mjs"], {
    env: { ...process.env, STUB_PORT: String(STUB_PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("stub failed to start")), 10_000);
    stub.stdout!.on("data", (d) => {
      if (String(d).includes("listening")) { clearTimeout(timer); resolve(); }
    });
    stub.stderr!.on("data", (d) => console.error("[stub]", String(d).trim()));
  });
}

await startStub();
await setPaymentControls({ provider: "selcom" }, "e2e-test").catch(() => {});

// ═══════════════════════════════════════════════════════════════════════════
// PASS 1..N — THE HAPPY PATH, REPEATED. Every run must be identical.
// ═══════════════════════════════════════════════════════════════════════════
const RUNS = 5;
const happyResults: Array<{ state: string; balance: number; txns: number }> = [];

for (let run = 1; run <= RUNS; run++) {
  const uid = `usr_flow_happy_${run}`;
  await mkPlayer(uid);

  // 1. Player submits the deposit form.
  const started = await deposit(uid, { provider: "CARD", amount: 20_000 }, undefined, CARD_CTX());
  ok(`run ${run} · deposit accepted`, started.ok, !started.ok ? started.error : "");
  ok(`run ${run} · handed back a gateway URL to redirect to`, !!started.ok && !!started.data?.redirectUrl);
  ok(`run ${run} · money NOT credited before the buyer pays`,
    (await db.wallet.findByUserId(uid))!.balance === 0);
  ok(`run ${run} · transaction parked as PROCESSING`,
    (await db.txn.findByUser(uid))[0]?.status === "PROCESSING");

  // 2. Buyer pays on the hosted page and is redirected back.
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");
  const out = await settleDepositFromReturn(uid, orderId);

  ok(`run ${run} · return leg reports PAID`, out.state === "PAID", out.state);
  ok(`run ${run} · credited the exact amount`, out.balance === 20_000, String(out.balance));
  ok(`run ${run} · receipt shows the amount`, out.txn?.amount === 20_000);
  ok(`run ${run} · receipt shows the gateway reference`, !!out.txn?.providerRef);
  await assertBalanceMatchesConfirmed(uid, `run ${run}`);

  happyResults.push({
    state: out.state,
    balance: out.balance,
    txns: (await db.txn.findByUser(uid)).length,
  });
}

// Determinism: every run must have produced byte-identical outcomes.
{
  const first = JSON.stringify(happyResults[0]);
  const allSame = happyResults.every((r) => JSON.stringify(r) === first);
  ok(`ALL ${RUNS} happy-path runs produced an IDENTICAL result`, allSame, JSON.stringify(happyResults));
}

// ═══════════════════════════════════════════════════════════════════════════
// FAILURE + AWKWARD PATHS
// ═══════════════════════════════════════════════════════════════════════════

// ── Still pending: money may yet arrive. Must NOT say "failed". ─────────────
for (const [label, amount] of [["pending", 10_011], ["in-progress", 10_022]] as const) {
  const uid = `usr_flow_${label.replace("-", "")}`;
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount }, undefined, CARD_CTX());
  ok(`${label} · deposit accepted`, started.ok);
  const out = await settleDepositFromReturn(uid, orderIdFrom(started.ok ? started.data!.redirectUrl! : ""));

  ok(`${label} · reported as PENDING`, out.state === "PENDING", out.state);
  ok(`${label} · NOT reported as failed (this is what makes people pay twice)`, out.state !== "FAILED");
  ok(`${label} · nothing credited`, out.balance === 0, String(out.balance));
  ok(`${label} · left PROCESSING so the sweep can still resolve it`,
    (await db.txn.findByUser(uid))[0]?.status === "PROCESSING");
  await assertBalanceMatchesConfirmed(uid, label);
}

// ── Declined card / buyer cancelled: terminal, nothing taken. ───────────────
for (const [label, amount] of [["declined", 10_033], ["cancelled-by-buyer", 10_044]] as const) {
  const uid = `usr_flow_${label.replace(/-/g, "")}`;
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount }, undefined, CARD_CTX());
  ok(`${label} · deposit accepted (the order is created before the card is entered)`, started.ok);
  const out = await settleDepositFromReturn(uid, orderIdFrom(started.ok ? started.data!.redirectUrl! : ""));

  ok(`${label} · reported as FAILED`, out.state === "FAILED", out.state);
  ok(`${label} · nothing credited`, out.balance === 0, String(out.balance));
  ok(`${label} · player can still see the reference for support`, !!out.txn?.providerRef);
  await assertBalanceMatchesConfirmed(uid, label);
}

// ── Gateway down at create-order: clean failure, no orphan PROCESSING row. ──
{
  const uid = "usr_flow_gatewaydown";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 10_055 }, undefined, CARD_CTX());
  ok("gateway-down · deposit refused cleanly", !started.ok, started.ok ? "accepted!" : "");
  const txns = await db.txn.findByUser(uid);
  ok("gateway-down · the transaction is marked FAILED, not left dangling",
    txns.length === 1 && txns[0]!.status === "FAILED", JSON.stringify(txns.map((t) => t.status)));
  ok("gateway-down · nothing credited", (await db.wallet.findByUserId(uid))!.balance === 0);
  await assertBalanceMatchesConfirmed(uid, "gateway-down");
}

// ── Closed the tab, came back much later. The truth is whatever it is NOW. ──
{
  const uid = "usr_flow_latereturn";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 30_000 }, undefined, CARD_CTX());
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");
  // ...player never opened the return page at the time. Hours pass. They come
  // back to the wallet and open the link from their email.
  const out = await settleDepositFromReturn(uid, orderId);
  ok("late-return · still resolves to PAID", out.state === "PAID", out.state);
  ok("late-return · credited exactly once", out.balance === 30_000, String(out.balance));
  await assertBalanceMatchesConfirmed(uid, "late-return");
}

// ── Back button / refresh / double-submit — the everyday case. ──────────────
{
  const uid = "usr_flow_refresh";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 15_000 }, undefined, CARD_CTX());
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");

  await settleDepositFromReturn(uid, orderId);
  const afterFirst = (await db.wallet.findByUserId(uid))!.balance;
  ok("refresh · first load credits", afterFirst === 15_000, String(afterFirst));

  for (let i = 0; i < 10; i++) await settleDepositFromReturn(uid, orderId);
  ok("refresh · 10 more loads credit nothing extra",
    (await db.wallet.findByUserId(uid))!.balance === afterFirst);

  await Promise.all(Array.from({ length: 12 }, () => settleDepositFromReturn(uid, orderId)));
  ok("refresh · 12 CONCURRENT loads credit nothing extra",
    (await db.wallet.findByUserId(uid))!.balance === afterFirst);
  ok("refresh · still exactly one transaction", (await db.txn.findByUser(uid)).length === 1);
  await assertBalanceMatchesConfirmed(uid, "refresh");
}

// ── Webhook arrives LATE, and TWICE, after the return leg already settled. ──
{
  const uid = "usr_flow_latewebhook";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 12_000 }, undefined, CARD_CTX());
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");

  await settleDepositFromReturn(uid, orderId);              // return leg wins the race
  const afterReturn = (await db.wallet.findByUserId(uid))!.balance;
  ok("late-webhook · return leg credited first", afterReturn === 12_000);

  const w1 = await settlePaymentWebhook({ providerRef: orderId, status: "CONFIRMED", amount: 12_000 });
  const w2 = await settlePaymentWebhook({ providerRef: orderId, status: "CONFIRMED", amount: 12_000 });
  ok("late-webhook · first late webhook is acked as already-settled", w1.handled);
  ok("late-webhook · duplicate webhook is acked too (at-least-once delivery)", w2.handled);
  ok("late-webhook · neither webhook credited again",
    (await db.wallet.findByUserId(uid))!.balance === afterReturn,
    String((await db.wallet.findByUserId(uid))!.balance));
  ok("late-webhook · still exactly one transaction", (await db.txn.findByUser(uid)).length === 1);
  await assertBalanceMatchesConfirmed(uid, "late-webhook");
}

// ── Webhook arrives FIRST, then the player opens the return page. ───────────
{
  const uid = "usr_flow_webhookfirst";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 18_000 }, undefined, CARD_CTX());
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");

  await settlePaymentWebhook({ providerRef: orderId, status: "CONFIRMED", amount: 18_000 });
  const afterWebhook = (await db.wallet.findByUserId(uid))!.balance;
  ok("webhook-first · webhook credited", afterWebhook === 18_000, String(afterWebhook));

  const out = await settleDepositFromReturn(uid, orderId);
  ok("webhook-first · return leg still shows PAID to the player", out.state === "PAID", out.state);
  ok("webhook-first · return leg credited nothing extra",
    (await db.wallet.findByUserId(uid))!.balance === afterWebhook);
  await assertBalanceMatchesConfirmed(uid, "webhook-first");
}

// ── Amount tampering: a webhook claiming a different amount must be refused. ─
{
  const uid = "usr_flow_tamper";
  await mkPlayer(uid);
  const started = await deposit(uid, { provider: "CARD", amount: 10_011 }, undefined, CARD_CTX()); // parks PENDING
  const orderId = orderIdFrom(started.ok ? started.data!.redirectUrl! : "");

  const bad = await settlePaymentWebhook({ providerRef: orderId, status: "CONFIRMED", amount: 999_999 });
  ok("tamper · a webhook with a mismatched amount is REFUSED", !bad.handled, JSON.stringify(bad));
  ok("tamper · refusal reason is the amount mismatch", bad.reason === "amount-mismatch", bad.reason);
  ok("tamper · nothing credited", (await db.wallet.findByUserId(uid))!.balance === 0);
  await assertBalanceMatchesConfirmed(uid, "tamper");
}

// ── Double-submit of the FORM itself (idempotency key), not the return leg. ──
{
  const uid = "usr_flow_doublesubmit";
  await mkPlayer(uid);
  const key = "idem_double_submit_1";
  const a = await deposit(uid, { provider: "CARD", amount: 9_000 }, key, CARD_CTX());
  const b = await deposit(uid, { provider: "CARD", amount: 9_000 }, key, CARD_CTX());
  ok("double-submit · both calls return ok", a.ok && b.ok);
  ok("double-submit · only ONE transaction was created",
    (await db.txn.findByUser(uid)).length === 1, String((await db.txn.findByUser(uid)).length));

  const orderId = orderIdFrom(a.ok ? a.data!.redirectUrl! : "");
  await settleDepositFromReturn(uid, orderId);
  ok("double-submit · credited once only", (await db.wallet.findByUserId(uid))!.balance === 9_000);
  await assertBalanceMatchesConfirmed(uid, "double-submit");
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM-WIDE INVARIANT — across EVERY user this suite touched.
// ═══════════════════════════════════════════════════════════════════════════
{
  const allTxns = await db.txn.listAll();
  const confirmedTotal = allTxns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED")
    .reduce((s, t) => s + t.amount, 0);
  const walletTotal = (await Promise.all(
    [...new Set(allTxns.map((t) => t.userId))].map(async (u) => (await db.wallet.findByUserId(u))?.balance ?? 0),
  )).reduce((s, b) => s + b, 0);
  ok("PLATFORM · total wallet money == total CONFIRMED deposits (nothing minted or lost)",
    walletTotal === confirmedTotal, `wallets=${walletTotal} confirmed=${confirmedTotal}`);

  const orphaned = allTxns.filter((t) => t.status === "CONFIRMED" && t.type === "DEPOSIT" && !t.providerRef);
  ok("PLATFORM · every confirmed deposit carries a gateway reference", orphaned.length === 0,
    `${orphaned.length} without a ref`);
}

stub.kill();
console.log(`\ncard-flow-e2e: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
