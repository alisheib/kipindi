/**
 * AGENT REGISTRATION FEE, PAID FROM THE WALLET — the money guard.
 *
 * Ali ruled on 2026-09-10 that the TZS 100,000 registration fee is paid from the applicant's
 * WALLET BALANCE rather than out of band into a bank account. That turns the fee from a
 * business receipt an officer attests into a PLAYER-LEDGER MOVEMENT, and this suite is the
 * guard over the two ways that can lose real money.
 * `docs/COMPLIANCE-DECISIONS.md` § 2026-09-10 · `docs/PAYMENTS-SEAL-CAMPAIGN.md` Units 1-2.
 *
 * ── WHAT MAKES THIS GUARD NON-VACUOUS ───────────────────────────────────────────────────────
 * The question worth asking of any check is *"would it still pass if the feature were absent
 * or broken?"* — so this suite does NOT merely assert that today's code does what today's code
 * does. For each of the two hazards it asserts the CORRECT shape **and separately simulates the
 * BROKEN one and asserts the guard's own arithmetic catches it**:
 *
 *   §2.4 feeds `computeTrialBalance` the exact numbers a DOUBLE-COUNTING implementation would
 *        produce (wallet debited, money-in leg still `EXTERNAL:SELCOM`) and asserts the drift
 *        is exactly −FEE and `ok === false`. If that assertion ever passes with drift 0, the
 *        trial balance has stopped being able to see this class of bug and §2.1 is decoration.
 *
 *   §3.3 asserts `debitInternal` REALLY DOES debit partially, because that is the entire
 *        reason a separate primitive has to exist. If someone "fixes" `debitInternal` to be
 *        all-or-nothing, §3.3 goes red and tells us the justification has moved — rather than
 *        leaving a second primitive nobody can explain.
 *
 * ── THE TWO HAZARDS ─────────────────────────────────────────────────────────────────────────
 * ⛔ DOUBLE-COUNTING. The shillings enter the platform ONCE, as an ordinary DEPOSIT booked
 *    against `EXTERNAL:SELCOM`. If the fee group ALSO books `EXTERNAL:SELCOM`, the same money
 *    is counted twice: `computeTrialBalance` compares `wallet.balance + hold` against the sum
 *    of that user's `PLAYER:<id>` ledger entries, so a wallet debit with no matching PLAYER
 *    leg drifts by the full fee, per applicant, forever.
 *
 * ⛔ A PARTIAL DEBIT IS NOT A PAYMENT. The only generic debit primitive, `debitInternal`,
 *    deliberately takes `Math.min(want, balance)` and reports a `shortfall` instead of
 *    refusing — correct for clawing back commission from a partner who already withdrew, and
 *    catastrophic here: an applicant with TZS 40,000 would "pay" a TZS 100,000 fee and receive
 *    a success. This movement must be ALL-OR-NOTHING.
 *
 * ── AND THE LEGACY SHAPE MUST SURVIVE ───────────────────────────────────────────────────────
 * ⭐ `agentRegistrationFeeEntries` has TWO callers and only one moves a wallet. `reconcileFee`
 *    is the officer-attested out-of-band path, where the money really did arrive in a bank
 *    account and NO wallet moved. Measured on production 2026-09-10, exactly one such row
 *    exists (an APPROVED agent who paid at 18% VAT, explicitly NOT retroactive). Flipping the
 *    money-in leg unconditionally would post a `PLAYER:` entry with no wallet movement behind
 *    it and drift that row by the full fee — so the source is an EXPLICIT PARAMETER, and §1.3
 *    and §2.3 hold the legacy shape.
 *
 * Run: npm run test:agent-fee-wallet
 * ⛔ Proven RED by observation before the fix, not by a mutating harness: `red-agent.mjs`
 *    applies its defect IN PLACE, and this repo has already had two concurrent runs leave a
 *    live payout gate disabled in the working tree.
 */
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser } from "./lib/agent-fixtures.mts";
import { agentRegistrationFeeEntries, computeTrialBalance, type WalletSnapshot } from "../src/lib/server/ledger.ts";
import { feeBreakdown } from "../src/lib/server/agent-application-service.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";
import { debitInternal } from "../src/lib/server/wallet-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const FEE = feeBreakdown(getAgentConfig()).totalTzs;
const M = (o: Record<string, number>) => new Map(Object.entries(o));
const sumOf = (lines: Array<{ amount: number }>) => lines.reduce((s, l) => s + l.amount, 0);
const legFor = (lines: Array<{ account: string }>, account: string) => lines.find((l) => l.account === account) ?? null;

/**
 * ⭐ The new all-or-nothing primitive, probed DYNAMICALLY.
 *
 * Imported by name it would be a module-level crash before the fix lands, and a suite that
 * cannot start proves nothing about behaviour — "red" has to mean "the assertion about money
 * failed", not "the file did not parse". So §3 reports the feature's ABSENCE as a named
 * failure on each money rule it is supposed to enforce.
 */
type FeeResult = { ok: boolean; code?: string; debited?: number; balanceAfter?: number | null };
let payAgentRegistrationFee:
  | ((userId: string, opts: { applicationId: string; amountTzs: number; vatTzs: number; description?: string }) => Promise<FeeResult>)
  | null = null;
{
  const mod: Record<string, unknown> = await import("../src/lib/server/wallet-service.ts");
  const fn = mod.payAgentRegistrationFee;
  if (typeof fn === "function") payAgentRegistrationFee = fn as typeof payAgentRegistrationFee;
}
const ABSENT = "payAgentRegistrationFee does not exist in wallet-service.ts";

const setBalance = async (userId: string, to: number) => {
  const w = await db.wallet.findByUserId(userId);
  if (!w) throw new Error(`no wallet for ${userId}`);
  await db.wallet.adjust(w.id, { balance: to - w.balance });
};
const balanceOf = async (userId: string) => (await db.wallet.findByUserId(userId))?.balance ?? null;

console.log(`\nAGENT FEE · WALLET RAIL — fee = ${FEE} TZS (from feeBreakdown, never a literal)\n`);

// ═══ §1 · THE LEDGER GROUP NAMES ITS SOURCE ══════════════════════════════════════════════
console.log("§1 the ledger group's money-in leg follows the SOURCE of the money");
{
  const uid = "fee_led_1";
  const wallet = agentRegistrationFeeEntries({
    groupRef: "g1", userId: uid, amount: FEE, vatAmount: 0,
    description: "wallet-funded fee", source: "WALLET",
  } as never);

  ok("1.1 ⭐ a WALLET-funded fee debits the PLAYER account",
    legFor(wallet, `PLAYER:${uid}`)?.amount === -FEE,
    `legs: ${wallet.map((l) => `${l.account}=${l.amount}`).join(" ")}`);

  ok("1.2 ⛔ …and books NOTHING to EXTERNAL:SELCOM — those shillings already entered as a deposit",
    legFor(wallet, "EXTERNAL:SELCOM") === null);

  ok("1.3 ⭐ the fee still reaches HOUSE:AGENT_FEE", legFor(wallet, "HOUSE:AGENT_FEE")?.amount === FEE);
  ok("1.4 the wallet-funded group sums to zero", Math.abs(sumOf(wallet)) < 0.005, `sum=${sumOf(wallet)}`);

  // ── The LEGACY shape must remain expressible, or the one real production row breaks. ──
  const legacy = agentRegistrationFeeEntries({
    groupRef: "g2", userId: uid, amount: FEE, vatAmount: 0,
    description: "officer-attested bank receipt", source: "EXTERNAL",
  } as never);

  ok("1.5 ⭐ an EXTERNAL (legacy, officer-attested) fee still debits EXTERNAL:SELCOM",
    legFor(legacy, "EXTERNAL:SELCOM")?.amount === -FEE);
  ok("1.6 ⛔ …and touches NO player account — no wallet moved on that path",
    legFor(legacy, `PLAYER:${uid}`) === null);
  ok("1.7 the legacy group sums to zero", Math.abs(sumOf(legacy)) < 0.005);

  // ── VAT: only when there is a rate. Ali ruled the fee bears none (2026-09-09). ──
  const vatted = agentRegistrationFeeEntries({
    groupRef: "g3", userId: uid, amount: 118_000, vatAmount: 18_000,
    description: "a historical 18% collection", source: "WALLET",
  } as never);
  ok("1.8 a non-zero VAT component posts a HOUSE:TAX leg", legFor(vatted, "HOUSE:TAX")?.amount === 18_000);
  ok("1.9 …and the net, not the gross, reaches HOUSE:AGENT_FEE", legFor(vatted, "HOUSE:AGENT_FEE")?.amount === 100_000);
  ok("1.10 …and it still sums to zero", Math.abs(sumOf(vatted)) < 0.005);
  ok("1.11 ⛔ a ZERO VAT component posts NO HOUSE:TAX leg", legFor(wallet, "HOUSE:TAX") === null);

  // ── The refund is the exact mirror OF WHICHEVER SOURCE COLLECTED. ──
  const refund = agentRegistrationFeeEntries({
    groupRef: "g4", userId: uid, amount: -FEE, vatAmount: 0,
    description: "refund on rejection", source: "WALLET",
  } as never);
  ok("1.12 ⭐ a wallet-funded refund returns the money to the PLAYER account",
    legFor(refund, `PLAYER:${uid}`)?.amount === FEE);
  ok("1.13 …and takes it back out of HOUSE:AGENT_FEE", legFor(refund, "HOUSE:AGENT_FEE")?.amount === -FEE);
  ok("1.14 the refund mirror sums to zero", Math.abs(sumOf(refund)) < 0.005);

  const legacyRefund = agentRegistrationFeeEntries({
    groupRef: "g5", userId: uid, amount: -FEE, vatAmount: 0,
    description: "refund of an out-of-band collection", source: "EXTERNAL",
  } as never);
  ok("1.15 ⛔ a LEGACY refund goes back out of band, not into a wallet the payer never used",
    legFor(legacyRefund, "EXTERNAL:SELCOM")?.amount === FEE && legFor(legacyRefund, `PLAYER:${uid}`) === null);
}

// ═══ §2 · THE TRIAL BALANCE — AND PROOF IT CAN SEE THE BUG ═══════════════════════════════
console.log("\n§2 the wallet↔ledger trial balance, and whether it can actually catch a double-count");
{
  // A player deposited 150,000 and paid a 100,000 fee from it. Wallet: 50,000.
  // The ledger's PLAYER account: +150,000 deposit −100,000 fee = 50,000. No drift.
  const DEPOSIT = 150_000;
  const after = DEPOSIT - FEE;

  const walletsAfterFee: WalletSnapshot[] = [{ userId: "tb_ok", balance: after, hold: 0, bonusBalance: 0 }];
  const right = computeTrialBalance({
    wallets: walletsAfterFee,
    ledgerRealByUser: M({ tb_ok: after }),
    ledgerBonusByUser: M({}), activeGrantsByUser: M({}),
    globalSum: 0, imbalancedGroups: [],
  });
  ok("2.1 ⭐ wallet debited AND a PLAYER ledger leg posted → zero drift", right.ok && right.driftingWallets === 0,
    `drift=${right.totalAbsDrift}`);

  // ── §2.2/§2.3 THE LEGACY PATH: no wallet moved, no PLAYER leg. Also zero drift. ──
  const legacy = computeTrialBalance({
    wallets: [{ userId: "tb_legacy", balance: DEPOSIT, hold: 0, bonusBalance: 0 }],
    ledgerRealByUser: M({ tb_legacy: DEPOSIT }),
    ledgerBonusByUser: M({}), activeGrantsByUser: M({}),
    globalSum: 0, imbalancedGroups: [],
  });
  ok("2.2 ⭐ the LEGACY out-of-band collection moves neither side → zero drift", legacy.ok);
  ok("2.3 …and reports the wallet as checked, not skipped", legacy.checkedWallets === 1);

  /**
   * ⭐⭐ §2.4 — THE ASSERTION THAT MAKES §2.1 MEAN SOMETHING.
   *
   * These are the exact numbers a DOUBLE-COUNTING implementation produces: the wallet was
   * debited by the fee, but the money-in leg was left on `EXTERNAL:SELCOM`, so the user's
   * PLAYER ledger account never saw the fee leave. If the trial balance cannot see THAT, then
   * §2.1 passing tells us nothing at all.
   */
  const doubleCounted = computeTrialBalance({
    wallets: [{ userId: "tb_bug", balance: after, hold: 0, bonusBalance: 0 }],
    ledgerRealByUser: M({ tb_bug: DEPOSIT }), // ← the fee never left the PLAYER account
    ledgerBonusByUser: M({}), activeGrantsByUser: M({}),
    globalSum: 0, imbalancedGroups: [],
  });
  ok("2.4 ⛔ THE DOUBLE-COUNT IS CAUGHT — a wallet debit with no PLAYER leg is NOT ok",
    doubleCounted.ok === false, `ok=${doubleCounted.ok}`);
  ok("2.5 ⛔ …and the drift is EXACTLY the fee, so the report names the size of the hole",
    doubleCounted.worst?.realDrift === -FEE, `realDrift=${doubleCounted.worst?.realDrift} expected=${-FEE}`);
  ok("2.6 …and it counts exactly one drifting wallet", doubleCounted.driftingWallets === 1);

  // ── An imbalanced group must fail the report outright, whatever the per-user drift. ──
  const imbalanced = computeTrialBalance({
    wallets: walletsAfterFee,
    ledgerRealByUser: M({ tb_ok: after }),
    ledgerBonusByUser: M({}), activeGrantsByUser: M({}),
    globalSum: 0, imbalancedGroups: [{ groupId: "agentfee_x", sum: -FEE }],
  });
  ok("2.7 ⛔ an imbalanced agentfee group fails the trial balance on its own", imbalanced.ok === false);
}

// ═══ §3 · THE DEBIT IS ALL-OR-NOTHING ════════════════════════════════════════════════════
console.log("\n§3 the debit primitive — all-or-nothing, idempotent, and its own type");
{
  /**
   * ⭐ §3.1 — WHY A NEW PRIMITIVE HAS TO EXIST, asserted rather than asserted-in-a-comment.
   * `debitInternal` takes what is there and reports a shortfall. That is right for a clawback
   * and fatal for a fee. If this ever goes red, someone has changed `debitInternal`'s contract
   * and the justification for a second primitive has moved — read this before deleting it.
   */
  await mkFixtureUser("fee_partial");
  await setBalance("fee_partial", 40_000);
  const partial = await debitInternal("fee_partial", FEE, { description: "probe", type: "ADJUSTMENT_DEBIT" });
  ok("3.1 ⛔ debitInternal DEBITS PARTIALLY — 40,000 taken against a 100,000 demand",
    partial.debited === 40_000 && partial.shortfall === FEE - 40_000,
    `debited=${partial.debited} shortfall=${partial.shortfall}`);
  ok("3.2 ⛔ …and it reports success-shaped output, not a refusal", partial.balance === 0);

  // ── The real thing: too little money must be a REFUSAL that moves nothing. ──
  await mkFixtureUser("fee_short");
  await setBalance("fee_short", FEE - 1);
  if (!payAgentRegistrationFee) {
    ok("3.3 ⛔ an applicant one shilling short is REFUSED", false, ABSENT);
    ok("3.4 ⛔ …and their balance is untouched", false, ABSENT);
    ok("3.5 ⛔ …and no Transaction is written", false, ABSENT);
  } else {
    const r = await payAgentRegistrationFee("fee_short", { applicationId: "app_short", amountTzs: FEE, vatTzs: 0 });
    ok("3.3 ⛔ an applicant one shilling short is REFUSED", r.ok === false, `got ${JSON.stringify(r)}`);
    ok("3.4 ⛔ …and their balance is untouched — NOT partially debited",
      (await balanceOf("fee_short")) === FEE - 1, `balance=${await balanceOf("fee_short")}`);
    ok("3.5 ⛔ …and no Transaction is written",
      (await db.txn.findByUser("fee_short", 50)).length === 0);
  }

  // ── Exactly enough must succeed and land on zero. ──
  await mkFixtureUser("fee_exact");
  await setBalance("fee_exact", FEE);
  if (!payAgentRegistrationFee) {
    ok("3.6 ⭐ exactly the fee succeeds and lands on zero", false, ABSENT);
    ok("3.7 ⭐ the movement carries its OWN TxnType", false, ABSENT);
  } else {
    const r = await payAgentRegistrationFee("fee_exact", { applicationId: "app_exact", amountTzs: FEE, vatTzs: 0 });
    ok("3.6 ⭐ exactly the fee succeeds and lands on zero",
      r.ok === true && (await balanceOf("fee_exact")) === 0, `ok=${r.ok} balance=${await balanceOf("fee_exact")}`);
    const txns = await db.txn.findByUser("fee_exact", 50);
    ok("3.7 ⭐ the movement carries its OWN TxnType, not ADJUSTMENT_DEBIT",
      txns.length === 1 && txns[0]!.type === "AGENT_REGISTRATION_FEE",
      `types=${txns.map((t) => t.type).join(",")}`);
    ok("3.8 …and its balanceAfter matches the wallet it left", txns[0]?.balanceAfter === 0);
    ok("3.9 …and the debit is recorded NEGATIVE", txns[0]?.amount === -FEE);
  }

  // ── Double-submit must pay ONCE. ──
  await mkFixtureUser("fee_twice");
  await setBalance("fee_twice", FEE * 3);
  if (!payAgentRegistrationFee) {
    ok("3.10 ⛔ a double-submit pays ONCE", false, ABSENT);
  } else {
    const a = await payAgentRegistrationFee("fee_twice", { applicationId: "app_twice", amountTzs: FEE, vatTzs: 0 });
    const b = await payAgentRegistrationFee("fee_twice", { applicationId: "app_twice", amountTzs: FEE, vatTzs: 0 });
    const spent = FEE * 3 - (await balanceOf("fee_twice"))!;
    ok("3.10 ⛔ a double-submit on the SAME application pays ONCE",
      a.ok === true && spent === FEE, `first=${a.ok} second=${b.ok} spent=${spent}`);
  }

  // ── A concurrent second payment must not race the balance below zero. ──
  await mkFixtureUser("fee_race");
  await setBalance("fee_race", FEE); // enough for exactly ONE fee
  if (!payAgentRegistrationFee) {
    ok("3.11 ⛔ two concurrent fee payments cannot both succeed off one balance", false, ABSENT);
    ok("3.12 ⛔ …and the balance never goes negative", false, ABSENT);
  } else {
    const [x, y] = await Promise.all([
      payAgentRegistrationFee("fee_race", { applicationId: "app_race_a", amountTzs: FEE, vatTzs: 0 }),
      payAgentRegistrationFee("fee_race", { applicationId: "app_race_b", amountTzs: FEE, vatTzs: 0 }),
    ]);
    const succeeded = [x, y].filter((r) => r.ok).length;
    const bal = await balanceOf("fee_race");
    ok("3.11 ⛔ two concurrent fee payments off ONE balance: exactly one succeeds",
      succeeded === 1, `succeeded=${succeeded}`);
    ok("3.12 ⛔ …and the balance never goes negative", bal !== null && bal >= 0, `balance=${bal}`);
  }
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
