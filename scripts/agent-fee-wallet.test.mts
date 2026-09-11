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
import { readFileSync } from "node:fs";
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

// ═══ §4 · THE CALL SITES — because §1 tests the CONTRACT, not who honours it ══════════════
/**
 * ⭐ §4 EXISTS BECAUSE §1 AND §3 WERE NOT ENOUGH, AND THE RE-BREAK DISCIPLINE PROVED IT.
 *
 * After the fix went green, each protection was independently re-broken to check the guard
 * could still see it. Three mutations were caught. **TWO WERE NOT**, and both are recorded
 * here rather than quietly patched, because a guard's blind spots are the only part of it a
 * reader cannot infer:
 *
 *   ⛔ MISS 1 — `reconcileFee`'s `source: "EXTERNAL"` was changed to `"WALLET"` and the suite
 *      stayed 34/0. §1 calls `agentRegistrationFeeEntries` DIRECTLY, so it proves the
 *      parameter works and says nothing about whether the caller passes the right value. That
 *      mutation is precisely the defect the parameter was introduced to prevent: it would post
 *      a PLAYER ledger entry for a bank collection where no wallet moved, stranding the one
 *      real production row.
 *
 *   ⛔ MISS 2 — `requireBalanceGte` was removed from the debit and the suite stayed 34/0. The
 *      in-memory store serialises everything through one lock, so a read-then-write race
 *      CANNOT be reproduced there and the application-level balance check alone satisfies
 *      §3.11. That protection only matters against real Postgres, where two transactions
 *      genuinely interleave.
 *
 * ⚠️ WHY THESE ARE SOURCE ASSERTIONS AND NOT BEHAVIOURAL ONES. `postLedgerEntries` returns
 * early with no write when there is no database — "the in-memory store doesn't have a
 * LedgerEntry model" — so the posted legs cannot be read back in a unit suite, and the race
 * cannot be staged. A source assertion is the strongest thing available here, and it fails on
 * exactly the edit that would reintroduce each defect. ⛔ It is NOT a substitute for driving
 * this on Postgres, which is what the live drive is for.
 */
console.log("\n§4 the call sites pass the right source, and the conditional write is still there");
{
  const read = (f: string) => readFileSync(new URL(`../src/lib/server/${f}`, import.meta.url), "utf8");
  const appSvc = read("agent-application-service.ts");
  const walletSvc = read("wallet-service.ts");

  // The two `agentRegistrationFeeEntries` call sites, isolated by their surrounding call.
  const callsOf = (src: string) => [...src.matchAll(/agentRegistrationFeeEntries\(\{([\s\S]{0,400}?)\}\)/g)].map((m) => m[1]!);
  const appCalls = callsOf(appSvc);
  const walletCalls = callsOf(walletSvc);

  ok("4.population · the scan finds BOTH application-service call sites (collection + refund)",
    appCalls.length === 2, `found ${appCalls.length}`);
  // TWO on the wallet rail since the refund primitive landed: the debit and its mirror.
  ok("4.population2 · …and BOTH wallet-rail call sites (the debit and its refund mirror)", walletCalls.length === 2, `found ${walletCalls.length}`);

  // ⛔ reconcileFee is the LEGACY bank collection: no wallet moved, so the leg must be EXTERNAL.
  const collection = appCalls.find((c) => /Agent registration fee ·/.test(c));
  ok("4.1 ⛔ reconcileFee (the legacy bank collection) passes source: \"EXTERNAL\"",
    !!collection && /source:\s*"EXTERNAL"/.test(collection), collection ?? "call site not found");

  // ⭐ The refund must pass a VARIABLE — mirroring what collected — never a hard-coded literal.
  const refund = appCalls.find((c) => /refunded ·/.test(c));
  ok("4.2 ⭐ recordFeeRefund passes a DERIVED source, not a literal — the mirror must follow the collection",
    !!refund && /source:\s*fundingSource/.test(refund), refund ?? "call site not found");
  ok("4.3 ⛔ …and it is derived from the STORED stamp, not inferred from the ledger",
    /feeFundingSource\s*\?\?\s*"EXTERNAL"/.test(appSvc));

  // ⭐ The wallet rail must book to the player.
  ok("4.4 ⭐ EVERY wallet-rail call passes source: \"WALLET\" — the debit and the refund alike",
    walletCalls.length > 0 && walletCalls.every((c) => /source:\s*"WALLET"/.test(c)),
    walletCalls.filter((c) => !/source:\s*"WALLET"/.test(c)).join(" | ").slice(0, 160));

  /**
   * ⛔ 4.5 — THE CONDITIONAL WRITE. This is MISS 2's replacement.
   * `requireBalanceGte` becomes `WHERE balance >= n` on the UPDATE, which is the only thing
   * that defeats a bet settling between the balance read and the debit. Removing it is
   * invisible to every behavioural assertion in this suite, so it is asserted at the source.
   */
  /**
   * ⚠️ SLICE ON THE NEXT TOP-LEVEL DECLARATION, NOT ON A BARE `}` LINE. This file is checked
   * out with CRLF on Windows, so `indexOf("\n}\n")` returns -1 and the slice silently becomes
   * two characters — every assertion below then fails for a reason that has nothing to do with
   * the code. Found exactly that way.
   */
  const feeStart = walletSvc.indexOf("export async function payAgentRegistrationFee");
  const after = walletSvc.slice(feeStart);
  const nextDecl = after.search(/\r?\n\/\*\*\r?\n \* Manual admin balance adjustment/);
  const feeBody = nextDecl > 0 ? after.slice(0, nextDecl) : after;
  ok("4.population3 · the scan isolated the fee function's body (a two-character slice is not a body)",
    feeStart > 0 && feeBody.length > 1500, `start=${feeStart} len=${feeBody.length}`);
  ok("4.5 ⛔ the debit's wallet write is guarded by requireBalanceGte — the race-proof half",
    /requireBalanceGte:\s*want/.test(feeBody), "the conditional write is gone");
  ok("4.6 ⛔ …and it debits the FULL amount, never min(want, balance)",
    /balance:\s*-want\b/.test(feeBody) && !/Math\.min\(\s*want/.test(feeBody));
  ok("4.7 ⛔ …and the movement is row-locked on the wallet", /withLock\(`wallet:\$\{userId\}`/.test(feeBody));
  ok("4.8 ⛔ …and the ledger group is posted INSIDE the money transaction, not after it",
    /postLedgerEntries\([\s\S]{0,300}\}\),\s*tx\)/.test(feeBody));

  /**
   * ⭐ 4.9 — and prove the DAL primitive those assertions depend on actually refuses.
   * A conditional debit below the floor must return null, or `requireBalanceGte` is a no-op
   * and 4.5 is asserting the presence of something that does nothing.
   */
  await mkFixtureUser("fee_dal");
  await setBalance("fee_dal", FEE - 1);
  const w = await db.wallet.findByUserId("fee_dal");
  const refused = await db.wallet.adjust(w!.id, { balance: -FEE }, { requireBalanceGte: FEE });
  ok("4.9 ⭐ the DAL refuses a conditional debit below the floor (so 4.5 guards something real)",
    refused === null, `got ${JSON.stringify(refused)}`);
  ok("4.10 …and the balance is untouched by the refused write",
    (await balanceOf("fee_dal")) === FEE - 1);
}

// ═══ §5 · THE REFUND MUST MOVE THE WALLET, NOT ONLY THE LEDGER ═══════════════════════════
/**
 * 🔴 A GAP THIS CAMPAIGN CREATED, AND THE WORST KIND: silent, and against the applicant.
 *
 * Once the fee can be paid from a wallet, a `COLLECTED` row can have
 * `feeFundingSource: "WALLET"`. Reject that application and it becomes `REFUND_DUE`; an officer
 * then calls `recordFeeRefund`, which posts the exact ledger mirror — and, before this section,
 * touched no wallet at all. That was correct while every collection arrived in a bank account
 * and the officer sent the money back the same way. It is wrong the moment the money came from
 * a balance:
 *
 *   · the applicant's `PLAYER:` ledger account is CREDITED by the fee,
 *   · their wallet balance does not move,
 *   · `computeTrialBalance` compares `balance + hold` against that account, so the row drifts
 *     by the whole fee, permanently,
 *   · and the person we refused is simply out of pocket, with our own books saying we paid them.
 *
 * ⭐ SO A WALLET-FUNDED REFUND IS A MONEY MOVEMENT, not a bookkeeping entry, and it needs the
 * same shape as the debit: wallet + `Transaction` + ONE ledger group, atomically.
 *
 * ⛔ AND IT CANNOT REUSE `creditInternal`. That posts its OWN `internalCreditEntries` group, so
 * calling it beside the existing `agentRegistrationFeeEntries` mirror would credit the player
 * ledger TWICE — the double-count defect of §2, arriving from the opposite direction.
 *
 * ⛔ THE LEGACY PATH MUST NOT CHANGE. An `EXTERNAL` collection is still refunded out of band by
 * an officer: no wallet moved in, so no wallet moves out, and crediting one would MINT the fee.
 * There is exactly one such row on production. §5.4 holds that.
 */
console.log("\n§5 a wallet-funded refund returns the money to the wallet, not just to the books");
{
  const walletSvc = readFileSync(new URL("../src/lib/server/wallet-service.ts", import.meta.url), "utf8");
  const appSvc = readFileSync(new URL("../src/lib/server/agent-application-service.ts", import.meta.url), "utf8");

  ok("5.0 ⭐ a dedicated reverse primitive exists — the mirror of the debit",
    /export async function refundAgentRegistrationFeeToWallet/.test(walletSvc),
    "a wallet-funded refund that only posts a ledger group leaves the applicant out of pocket");

  const fnStart = walletSvc.indexOf("export async function refundAgentRegistrationFeeToWallet");
  const after = fnStart >= 0 ? walletSvc.slice(fnStart) : "";
  const nextDecl = after.search(/\r?\n\/\*\*\r?\n \* Manual admin balance adjustment/);
  const body = nextDecl > 0 ? after.slice(0, nextDecl) : after;
  ok("5.0a CONTROL · its body was isolated (a two-character slice is not a body)",
    fnStart > 0 && body.length > 800, `start=${fnStart} len=${body.length}`);

  ok("5.1 ⛔ it CREDITS the wallet", /db\.wallet\.adjust\([\s\S]{0,120}balance:\s*\+?want/.test(body) || /balance:\s*want\b/.test(body));
  ok("5.2 ⛔ …writes a Transaction of the fee's own type", /type:\s*"AGENT_REGISTRATION_FEE"/.test(body));
  ok("5.3 ⭐ …posts the fee mirror with source WALLET, and NOT internalCreditEntries",
    /agentRegistrationFeeEntries\(/.test(body) && /source:\s*"WALLET"/.test(body) && !/internalCreditEntries\(/.test(body),
    "internalCreditEntries would post a SECOND player-ledger credit — the double count, reversed");
  ok("5.3b ⛔ …and the mirror is NEGATIVE — a refund reverses the collection", /amount:\s*-want/.test(body));
  ok("5.4 ⛔ …row-locked and inside the money transaction, like the debit",
    /withLock\(`wallet:\$\{userId\}`/.test(body) && /withMoneyTx\(/.test(body));
  ok("5.5 ⭐ …idempotent, so a double-clicked refund pays once", /providerRef/.test(body));

  // ── The caller must branch on the STORED funding source, never refund blindly. ──
  const refundStart = appSvc.indexOf("export async function recordFeeRefund");
  // Sliced to the NEXT top-level declaration rather than a byte count: the function grew when
  // the wallet branch landed and a fixed 4,200 stopped short of it, so 5.7/5.8 measured a
  // fragment. A magic length is a proxy for "the function".
  const refundRest = appSvc.slice(refundStart);
  const nextTopLevel = refundRest.indexOf("\nexport async function ", 1);
  const refundBody = nextTopLevel > 0 ? refundRest.slice(0, nextTopLevel) : refundRest;
  ok("5.6 CONTROL · recordFeeRefund's body was isolated", refundStart > 0 && refundBody.length > 1500);
  ok("5.7 ⭐ recordFeeRefund returns a WALLET-funded fee to the wallet",
    /refundAgentRegistrationFeeToWallet\(/.test(refundBody),
    "the ledger mirror alone credits the books and not the person");
  ok("5.8 ⛔ …and does so ONLY when the collection was wallet-funded",
    /fundingSource\s*===\s*"WALLET"/.test(refundBody),
    "crediting a wallet for an out-of-band collection would MINT the fee");
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
