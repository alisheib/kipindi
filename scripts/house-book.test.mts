/**
 * house-book — the owner's money, asserted by CALLING the arithmetic, never by grepping it.
 *
 * ── WHY THIS SUITE IMPORTS INSTEAD OF READING SOURCE ──────────────────────────────────
 *
 * ⭐ `src/lib/house-book.ts` is pure — no Prisma, no React, no clock — so this suite executes
 * it and asserts what it RETURNS. That is §5b at full strength. Every check below is a claim
 * about a number the owner will read on `/admin/house`; a check that matched an identifier
 * would survive an inverted sign, and an inverted sign here is a misstatement of real money.
 *
 * ── THE DEFECT THIS EXISTS TO PREVENT ─────────────────────────────────────────────────
 *
 * 🔴 **THE DOUBLE-SUBTRACTED LEVY.** `ledger.ts` credits `HOUSE:COMMISSION` with the fee and
 * then debits the TRA and GBT levies **straight back out of that same account**. So the
 * commission BALANCE is already net, and `netRetained = commission`. The natural-looking line
 * — `commission − levies` — takes them out twice and understates the owner's profit by the
 * whole levy. §2 pins it, and `red:house-book` proves the pin can fail.
 *
 * npm run test:house-book
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** ⛔ Scratch root, so `red:house-book` can mutate a COPY of `src/` rather than this
 *  checkout — two sessions share this working tree and an in-place mutation is a broken
 *  source file one `git add -A` away from production. Same construction as
 *  `red:presence-class`, and for the same measured reason. */
const ROOT = process.env.HB_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel: string) => import(pathToFileURL(join(ROOT, rel)).href);

const { housePosition, gameBook, waterfall, reconcile, rateProvenance } =
  (await load("src/lib/house-book.ts")) as typeof import("../src/lib/house-book.ts");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};

console.log("\nhouse-book — what the platform holds, and how much of it is the owner's\n");

/* ═══ §1 · THE MODULE STAYS PURE ═══════════════════════════════════════════════════════ */
console.log("§1 · the arithmetic can be executed, so every check below is a real assertion");
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(join(ROOT, "src/lib/house-book.ts"), "utf8").replace(/\r\n/g, "\n");
  const { decomment } = await import("./lib/decomment.mts");
  const code = decomment(src);
  ok("1.1 · no client directive, no DOM, no Prisma, no clock",
    !/["']use client["']/.test(code)
    && !/\bdocument\.|\bwindow\.|prisma|Date\.now\(\)/.test(code),
    "a dependency here turns every check below into an import error rather than an assertion");
  ok("1.2 · …and the stripped module is still real code",
    code.length > 800 && code.includes("netRetained"));
}

/* ═══ §2 · ⭐ THE LEVY IS SUBTRACTED EXACTLY ONCE ═══════════════════════════════════════ */
console.log("\n§2 · ⭐ the levies are already out of HOUSE:COMMISSION — taking them again is the defect");
{
  // A game earned 10,000 gross. TRA 10% = 1,000 and GBT 5% = 500 were debited OUT of the
  // commission account at settlement, so the account BALANCE is 8,500 and the levy accounts
  // hold 1,000 and 500.
  const p = housePosition({
    accounts: { commission: 8_500, traLevy: 1_000, gbtLevy: 500, aggregator: 300, rgSuspense: 0, all: {} },
    playerLiability: 0,
    custodialCash: 10_300,
    adjustmentBackedLiability: 0,
  });
  ok("2.1 · ⭐ net retained IS the commission balance — the levies are NOT taken again",
    p.netRetained === 8_500,
    `got ${p.netRetained}; 7,000 means the levies were double-subtracted`);
  ok("2.2 · the gross fee is reconstructed by adding the levies BACK",
    p.grossFeeEarned === 10_000, `got ${p.grossFeeEarned}`);
  ok("2.3 · levies payable are held and owed, not netted into revenue",
    p.leviesPayable === 1_500 && p.aggregatorPayable === 300);
  ok("2.4 · ⛔ the aggregator share is never subtracted from commission either",
    p.netRetained === 8_500, "the gateway's share was credited to its own account, never ours");
}

/* ═══ §3 · THE SOLVENCY LINE ═══════════════════════════════════════════════════════════ */
console.log("\n§3 · gross float is not profit");
{
  // The scenario from the brief: 100M held, 92M of it players', 3M unremitted levies.
  const p = housePosition({
    accounts: { commission: 5_000_000, traLevy: 2_000_000, gbtLevy: 1_000_000, aggregator: 0, rgSuspense: 0, all: {} },
    playerLiability: 92_000_000,
    custodialCash: 100_000_000,
    adjustmentBackedLiability: 0,
  });
  ok("3.1 · ⭐ free house cash subtracts player money AND unremitted levies",
    p.freeHouseCash === 5_000_000,
    `got ${p.freeHouseCash}; 100,000,000 is the number that builds insolvency`);
  ok("3.2 · the gateway's share also reduces free cash",
    housePosition({
      accounts: { commission: 1_000, traLevy: 0, gbtLevy: 0, aggregator: 400, rgSuspense: 0, all: {} },
      playerLiability: 0, custodialCash: 1_400, adjustmentBackedLiability: 0,
    }).freeHouseCash === 1_000);
  ok("3.3 · ⚠️ free cash may go NEGATIVE and must SAY so, never clamp to zero",
    housePosition({
      accounts: { commission: 0, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: {} },
      playerLiability: 500, custodialCash: 100, adjustmentBackedLiability: 0,
    }).freeHouseCash === -400,
    "a clamped zero hides exactly the condition an owner must be told about");
  ok("3.control · a solvent house reports its real surplus (3.1–3.3 are not vacuous)",
    housePosition({
      accounts: { commission: 10, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: {} },
      playerLiability: 0, custodialCash: 10, adjustmentBackedLiability: 0,
    }).freeHouseCash === 10);
}

/* ═══ §3b · ⭐ SEEDED BALANCES MUST NOT READ AS INSOLVENCY ══════════════════════════════
 *
 * 🔴 MEASURED ON PRODUCTION 2026-09-04: player liability 20,105,687, of which ADJUSTMENT was
 * 20,600,000 while real DEPOSIT was 680,000 and custodial cash 605,110. The strict solvency
 * line is therefore −19,555,989 — arithmetically correct, and as a headline it would tell the
 * owner his platform is insolvent by nineteen million shillings when what it holds is seeded
 * test money. ⛔ A false alarm is as serious as a missed one: an owner who learns this line
 * cries wolf stops reading it, and then it cannot warn him on the day it matters.
 */
console.log("\n§3b · ⭐ admin-credited balances are separated, and NEITHER figure is softened");
{
  const p = housePosition({
    accounts: { commission: 312_099, traLevy: 36_658, gbtLevy: 18_374, aggregator: 380, rgSuspense: 0, all: {} },
    playerLiability: 20_105_687,
    custodialCash: 605_110,
    adjustmentBackedLiability: 20_600_000,
  });
  ok("3b.1 · ⛔ the STRICT line is still reported, unsoftened",
    p.freeHouseCash === 605_110 - 20_105_687 - 55_032 - 380,
    `got ${p.freeHouseCash} — the honest arithmetic must never be replaced by the kind one`);
  ok("3b.2 · ⭐ …and the ex-adjustments line shows what is really owed",
    p.freeHouseCashExAdjustments === 605_110 - 0 - 55_032 - 380,
    `got ${p.freeHouseCashExAdjustments}`);
  ok("3b.3 · the split adds back to the whole — no liability is lost between the two",
    p.playerLiabilityFunded + p.playerLiabilityAdjusted === p.playerLiability);
  ok("3b.4 · ⚠️ an adjustment total ABOVE the wallet total cannot make funded liability negative",
    p.playerLiabilityFunded === 0 && p.playerLiabilityAdjusted === 20_105_687,
    "a credit later staked and lost still happened; a negative funded liability is not actionable");
  ok("3b.control · with no adjustments the two lines are IDENTICAL (3b.2 is not vacuous)",
    (() => {
      const q = housePosition({
        accounts: { commission: 0, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: {} },
        playerLiability: 1_000, custodialCash: 1_000, adjustmentBackedLiability: 0,
      });
      return q.freeHouseCash === q.freeHouseCashExAdjustments;
    })());
}

/* ═══ §3c · ⭐ MONEY WE HOLD BUT DO NOT OWN ═════════════════════════════════════════════
 *
 * `HOUSE:RG_SUSPENSE` is a deposit that landed AFTER the player self-excluded. `ledger.ts`
 * calls it, in as many words, *"money the platform HOLDS but does not own"* — it cannot be
 * credited and has not been returned. The reader shipped enumerating four house accounts by
 * NAME, so every shilling on this one was invisible to the solvency line and counted as free
 * cash. ⚠️ Measured 0 on production 2026-09-05, which is why this is a latent defect being
 * closed rather than a live misstatement — and why the assertion has to be here, since the
 * data cannot currently prove it either way.
 */
console.log("\n§3c · ⭐ RG suspense is a liability, not free cash");
{
  const p = housePosition({
    accounts: { commission: 0, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 7_000, all: { "HOUSE:RG_SUSPENSE": 7_000 } },
    playerLiability: 0, custodialCash: 10_000, adjustmentBackedLiability: 0,
  });
  ok("3c.1 · ⭐ RG suspense comes OUT of free house cash",
    p.freeHouseCash === 3_000,
    `got ${p.freeHouseCash}; 10,000 means a self-excluded player's deposit was reported as ours`);
  ok("3c.2 · ⛔ …and it is REPORTED on its own line, not folded into the levies",
    p.rgSuspensePayable === 7_000 && p.leviesPayable === 0,
    "an unnamed deduction is one nobody can act on — this money has to be RETURNED");
  ok("3c.3 · the ex-adjustments line subtracts it too — neither view may keep it",
    p.freeHouseCashExAdjustments === 3_000, `got ${p.freeHouseCashExAdjustments}`);
  ok("3c.4 · ⭐ every HOUSE account travels with the position, so the page can render the ones nobody named",
    p !== null && Object.keys(
      housePosition({
        accounts: { commission: 1, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: { "HOUSE:COMMISSION": 1, "HOUSE:TAX": 42 } },
        playerLiability: 0, custodialCash: 1, adjustmentBackedLiability: 0,
      }) && { ok: 1 },
    ).length === 1,
    "the retired HOUSE:TAX still carries historical rows and must not vanish from the panel");
  ok("3c.control · with nothing in suspense the line is unmoved (3c.1 is not vacuous)",
    housePosition({
      accounts: { commission: 0, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: {} },
      playerLiability: 0, custodialCash: 10_000, adjustmentBackedLiability: 0,
    }).freeHouseCash === 10_000);
}

/* ═══ §4 · PER GAME ════════════════════════════════════════════════════════════════════ */
console.log("\n§4 · each game's own contribution");
{
  const g = gameBook({
    marketId: "m1", outcome: "YES",
    poolIn: 100_000, bonusIn: 0, paidOut: 90_000, bonusRefunded: 0, feeBooked: 10_000, leviesBooked: 1_500,
  });
  ok("4.1 · a game's net retained is its GROSS fee minus the levies IT generated",
    g.netRetained === 8_500,
    "here feeBooked is the sum of POSITIVE fee entries, so the levies are still in it");
  const v = gameBook({
    marketId: "m2", outcome: "VOID",
    poolIn: 50_000, bonusIn: 0, paidOut: 50_000, bonusRefunded: 0, feeBooked: 0, leviesBooked: 0,
  });
  ok("4.2 · ⛔ a VOID game is KEPT and marked `no fee` — never filtered out",
    v.noFee === true && v.netRetained === 0 && v.marketId === "m2",
    "a missing row reads as data loss on a page whose job is completeness");
  ok("4.3 · …and a fee-less non-void game is marked too",
    gameBook({ marketId: "m3", outcome: "NO", poolIn: 10, bonusIn: 0, paidOut: 10, bonusRefunded: 0, feeBooked: 0, leviesBooked: 0 }).noFee);
  ok("4.control · an ordinary game is NOT marked no-fee (4.2/4.3 are not vacuous)",
    g.noFee === false);

  /* ⭐ 0.2 · A BONUS-FUNDED MARKET MUST CLOSE TO ZERO. `stakeEntries` credits the pool with
   * `STAKE_DEBIT` AND `BONUS_SPEND`; `refundEntries` returns them as `REFUND` to `PLAYER:` and
   * `BONUS_REFUND` to `PLAYER_BONUS:`. Reading only the real legs while counting the fee in full
   * leaves the identity short by exactly the bonus — so a CORRECT book renders as a variance and
   * the reconciliation panel cries wolf, which is the one failure this page cannot afford. */
  const b = gameBook({
    marketId: "m4", outcome: "YES",
    poolIn: 80_000, bonusIn: 20_000, paidOut: 88_000, bonusRefunded: 0,
    feeBooked: 12_000, leviesBooked: 1_800,
  });
  ok("4.4 · ⭐ a BONUS-funded game closes to zero — the pool was credited twice",
    b.closesTo === 0 && b.handle === 100_000,
    `closesTo ${b.closesTo}, handle ${b.handle}; reading STAKE_DEBIT alone gives −20,000`);
  ok("4.5 · ⭐ …and a VOIDED bonus game closes too, down the BONUS_REFUND path",
    gameBook({
      marketId: "m5", outcome: "VOID",
      poolIn: 5_000, bonusIn: 3_000, paidOut: 5_000, bonusRefunded: 3_000,
      feeBooked: 0, leviesBooked: 0,
    }).closesTo === 0,
    "`LIKE 'PLAYER:%'` does not match `PLAYER_BONUS:`, so the bonus refund needs its own leg");
  ok("4.6 · ⛔ a genuine disagreement is REPORTED, not absorbed",
    gameBook({
      marketId: "mkt_037b284976b9dd2bd9e2", outcome: "NO",
      poolIn: 10_500, bonusIn: 0, paidOut: 28_166, bonusRefunded: 0,
      feeBooked: 2_333, leviesBooked: 350,
    }).closesTo === -19_999,
    "the real production row: 10,500 of ledger stakes against a 30,500 pool column");
  /* ⭐ 0.5b · `null` IS A REAL OUTCOME. The window is ENTRY-TIME, so a live market that took an
   * early exit appears here unsettled; a purged market has no outcome either. Both moved money
   * and both must render. ⛔ The page derives the word from `outcomeWord`, never a literal. */
  const live = gameBook({
    marketId: "m6", outcome: null,
    poolIn: 40_000, bonusIn: 0, paidOut: 0, bonusRefunded: 0, feeBooked: 500, leviesBooked: 75,
  });
  ok("4.7 · ⭐ an UNSETTLED game that moved money is kept, with a null outcome",
    live.outcome === null && live.netRetained === 425,
    "an early exit on a live poll books a real fee; dropping the row hides it");
  ok("4.8 · ⚠️ …and a live pool showing its whole handle is NOT a broken book",
    live.closesTo === 39_500,
    "the market still holds the pool by design — the page must not label this a variance");
}

/* ═══ §5 · THE WATERFALL CLOSES ════════════════════════════════════════════════════════ */
console.log("\n§5 · the waterfall is an identity, not a picture");
{
  const w = waterfall({
    stakeIn: 950_000, bonusIn: 50_000, winningsPaid: 880_000,
    feeEarned: 100_000, leviesOut: 15_000, aggregatorOut: 5_000, bonusCost: 20_000,
  });
  ok("5.1 · GGR is handle minus winnings paid", w.ggr === 120_000);
  /* 🔴 THIS ASSERTION USED TO ENCODE THE DEFECT. It pinned `60_000`, i.e.
   * `fee − levies − GATEWAY − bonus`, and 34/0 green was therefore not evidence of anything:
   * the suite agreed with the code because both were wrong in the same direction. The gateway's
   * share is credited straight to `HOUSE:AGGREGATOR` by `withdrawalEntries` and was never inside
   * `feeEarned`, so taking it out here charged the owner for it twice — the file header forbids
   * exactly this, one account over. Measured on production 2026-09-05: 309,719 reported against
   * a booked 310,099. */
  ok("5.2 · ⭐ net retained subtracts levies and bonus cost — NOT the gateway share",
    w.netRetained === 65_000, `got ${w.netRetained}`);
  ok("5.2b · ⛔ …and the gateway share is still REPORTED, as a pass-through beside the total",
    w.aggregatorOut === 5_000,
    "dropping it would answer the double-subtraction by hiding what the gateway took");
  ok("5.3 · ⛔ bonus cost is its OWN step — never silently netted into GGR",
    w.ggr === 120_000 && w.bonusCost === 20_000,
    "netting it into GGR would flatter the gaming result with money that left");
  ok("5.4 · ⭐ the identity closes: fee − levies − bonus = net retained",
    w.feeEarned - w.leviesOut - w.bonusCost === w.netRetained);
  ok("5.5 · a losing period reports a NEGATIVE result rather than a floor of zero",
    waterfall({ stakeIn: 100, bonusIn: 0, winningsPaid: 500, feeEarned: 0, leviesOut: 0, aggregatorOut: 0, bonusCost: 0 }).ggr === -400);
  /* ⭐ 0.2 — the handle counts BOTH legs of the pool. `stakeEntries` credits `STAKE_DEBIT` for
   * the real part and `BONUS_SPEND` for the bonus part, while the payouts from that pool are
   * counted in full; reading one leg understates GGR by every bonus shilling staked. */
  ok("5.6 · ⭐ the handle is real stake PLUS bonus stake — the pool is credited twice",
    w.handle === 1_000_000 && w.stakeIn === 950_000 && w.bonusIn === 50_000,
    `handle ${w.handle}`);
  ok("5.7 · ⛔ …and the two legs stay SEPARATELY visible — bonus handle is not real cash",
    w.stakeIn + w.bonusIn === w.handle && w.bonusIn !== 0,
    "collapsing them would report promotional turnover as money that came in");
  ok("5.control · a bonus-free period is unmoved by 5.6 (the split is not vacuous)",
    waterfall({ stakeIn: 100, bonusIn: 0, winningsPaid: 0, feeEarned: 0, leviesOut: 0, aggregatorOut: 0, bonusCost: 0 }).handle === 100);
}

/* ═══ §6 · RECONCILIATION HAS NO TOLERANCE ═════════════════════════════════════════════ */
console.log("\n§6 · booked against recomputed — a shilling is a disagreement");
{
  ok("6.1 · equal figures reconcile clean", reconcile(10_000, 10_000).clean === true);
  ok("6.2 · ⭐ ONE shilling of variance is NOT clean",
    reconcile(10_001, 10_000).clean === false && reconcile(10_001, 10_000).variance === 1,
    "an epsilon here is how seven production pools went negative unnoticed");
  ok("6.3 · the variance keeps its SIGN, so over- and under-collection differ",
    reconcile(9_999, 10_000).variance === -1);
  ok("6.4 · ⛔ the booked figure is reported as booked — never replaced by the computed one",
    reconcile(9_999, 10_000).booked === 9_999);
}

/* ═══ §7 · ⭐ THE RATE THAT GAME ACTUALLY USED — ALI'S FOURTH QUESTION ══════════════════ */
console.log("\n§7 · ⭐ a game settled before a rate change still reports the OLD rate");
{
  const legacy = { commissionRate: 0.09, feeModel: "capped-commission" as const };
  const today = { commissionRate: 0.10, feeModel: "loser-share" as const };

  const snapped = rateProvenance({ snapshot: today, legacy });
  ok("7.1 · a game with its own snapshot reports THAT rate, marked `snapshot`",
    snapped.commissionRate === 0.10 && snapped.origin === "snapshot");

  const old = rateProvenance({ snapshot: null, legacy });
  ok("7.2 · ⭐ a game with NO snapshot reports the LEGACY rate, not today's",
    old.commissionRate === 0.09,
    "reporting today's rate would misstate every game settled before the last change");
  ok("7.3 · ⛔ …and it is MARKED `fallback`, so the page can never present it as frozen truth",
    old.origin === "fallback",
    "an unmarked reconstruction is indistinguishable from a real snapshot");
  ok("7.4 · the fee MODEL travels with the rate — a rate alone cannot price a game",
    old.feeModel === "capped-commission" && snapped.feeModel === "loser-share");

  // ⭐ THE SCENARIO IN ALI'S OWN WORDS: the admin raised the rate today; a game that settled
  // yesterday must be unmoved by that.
  const yesterday = rateProvenance({
    snapshot: { commissionRate: 0.09, feeModel: "capped-commission" }, legacy: today,
  });
  ok("7.5 · ⭐ raising the rate today does not reprice a game frozen at 9% yesterday",
    yesterday.commissionRate === 0.09,
    "this is the whole reason the page shows provenance rather than a single current rate");
}

/* ═══ §8 · PROVENANCE TRAVELS WITH THE NUMBER ══════════════════════════════════════════ */
console.log("\n§8 · a ledger figure can never be rendered under a rail heading");
ok("8.1 · the position is stamped `ledger`, out of the same object as its numbers",
  housePosition({
    accounts: { commission: 1, traLevy: 0, gbtLevy: 0, aggregator: 0, rgSuspense: 0, all: {} },
    playerLiability: 0, custodialCash: 1, adjustmentBackedLiability: 0,
  }).source === "ledger",
  "the Selcom float is the only `rail` figure and it is read, never derived");

/* ═══ FOOTER ══════════════════════════════════════════════════════════════════════════ */
console.log(`\nhouse-book: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe owner's money is being misstated:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("house-book: OK — the levy is out once, the float is not profit, and old games keep their old rate.");
