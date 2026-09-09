/**
 * THE WATERFALL ON THE PAGE AND THE CREDIT IN THE WALLET CANNOT DISAGREE.
 *
 *   npx tsx scripts/agent-waterfall.test.mts     (npm run test:agent-waterfall)
 *
 * ⛔ THIS GUARD DID NOT EXIST UNTIL 2026-09-09, AND TWO SOURCE FILES CITED IT AS IF IT DID.
 *   · `src/lib/agent-commission.ts`   — *"`test:agent-waterfall` asserts the two cannot disagree"*
 *   · `src/lib/server/affiliate-service.ts` — *"`test:agent-waterfall` is that assertion"*
 * It was not. `npm run test:guards-exist` now refuses that class of claim; this file is the
 * assertion those comments were promising. (`MONEY-GATE-REMEDIATION.md` §7.11/§7.12.)
 *
 * 🔴 WHAT ACTUALLY DIVERGES, AND IT IS NOT THE SPLIT. `/agent` prices its worked example with
 * `agentCommissionSplit(netFee, agentPct, withholdingPct)` — `agentPct` a **PERCENT**. The
 * engine prices the real credit with `Math.floor(operatorNetFee * policy.rate)` —
 * `policy.rate` a **FRACTION**. Two scales for one rate, thirty lines apart, on the money
 * path. `agent-config.ts` warns in its own header that feeding one into the other is a 40×
 * error, and `policyFor` carries the sole conversion (`capped / 100`) marked "here and
 * nowhere else". A guard that does not exercise BOTH SCALES is not testing the thing that
 * can break.
 *
 *   §1 the two paths agree, shilling for shilling, across the live stake range
 *   §2 the conversion is the ONE conversion — `policyFor` maps percent → fraction
 *   §3 the ceiling and the refusals hold
 *   §4 ⚠️ POSITIVE CONTROL — the comparison CATCHES a scale error and a rate error
 *   §5 ⛔ the waterfall a player reads is the split the wallet receives
 *
 * In-memory: no DATABASE_URL, so config is the shipped default.
 */
import {
  agentCommissionSplit, splitWithholding, commissionWaterfall, totalFeeRate,
} from "../src/lib/agent-commission.ts";
import { policyFor } from "../src/lib/server/affiliate-service.ts";
import { getAgentConfig, PLATFORM_MAX_COMMISSION_PCT } from "../src/lib/server/agent-config.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { levySplit } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const cfg = getAgentConfig();

/**
 * The ENGINE's arithmetic, quoted from `onRecruitSettlement`:
 *   const grossCut = Math.floor(opts.operatorNetFee * policy.rate);
 *   … cap runs here …
 *   const split = splitWithholding(cut, policy.withholdingPct);
 * ⛔ It takes a FRACTION. That is the whole point of the comparison below.
 */
const enginePath = (operatorNetFee: number, rateFraction: number, withholdingPct: number) =>
  splitWithholding(Math.floor(operatorNetFee * rateFraction), withholdingPct);

// ── §1 · the two paths agree ─────────────────────────────────────────────────
console.log("\n§1 · the page's waterfall and the wallet's credit are the same arithmetic");
{
  const rateFraction = cfg.defaultCommissionPct / 100;
  let worst = 0, worstAt = 0, checked = 0;

  // Every net fee a real settlement can produce inside the live stake bounds: a 13% fee on a
  // losing side from 1,000 to 1,000,000, less the two levies.
  for (let losing = 1_000; losing <= 1_000_000; losing += 997) {
    const fee = Math.round(0.13 * losing);
    const net = levySplit(fee, { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 }).operatorNet;
    const page = agentCommissionSplit(net, cfg.defaultCommissionPct, cfg.agentWithholdingTaxPct);
    const engine = enginePath(net, rateFraction, cfg.agentWithholdingTaxPct);
    checked++;
    const d = Math.abs(page.netTzs - engine.netTzs)
      + Math.abs(page.grossTzs - engine.grossTzs)
      + Math.abs(page.taxWithheldTzs - engine.taxWithheldTzs);
    if (d > worst) { worst = d; worstAt = net; }
  }
  ok(`${checked} settlements across the live stake range agree exactly`, worst === 0,
    `worst divergence ${worst} TZS at operatorNet ${worstAt}`);

  // And the boundary cases the sweep steps over.
  for (const net of [0, 1, 9, 10, 11, 99, 100, 101, 12_345, 1_000_000]) {
    const page = agentCommissionSplit(net, cfg.defaultCommissionPct, cfg.agentWithholdingTaxPct);
    const engine = enginePath(net, cfg.defaultCommissionPct / 100, cfg.agentWithholdingTaxPct);
    ok(`operatorNet ${net}: page ${page.netTzs} == engine ${engine.netTzs}`,
      page.netTzs === engine.netTzs && page.grossTzs === engine.grossTzs);
  }
}

// ── §2 · the ONE conversion ──────────────────────────────────────────────────
console.log("\n§2 · policyFor is the only place percent becomes fraction");
{
  // ⛔ THE RATE IS THE AGENT'S OWN, NOT THE CONFIG DEFAULT. `policyFor` reads
  // `account.commissionPct` — the figure `approveAgent` stamped on that partner — and an
  // approved agent with no rate is an INVARIANT VIOLATION it refuses rather than defaults.
  // ⚠️ So the public waterfall prices the DEFAULT while a credit prices THAT AGENT. Today
  // both are 10 (`defaultCommissionPct` 10, `maxCommissionPct` 10, and production's one agent
  // is approved at 10.00), so they coincide — but they are not the same number by
  // construction, and §1 above is what keeps the arithmetic identical once the rate is fixed.
  const account = { commissionPct: cfg.defaultCommissionPct };
  const r = policyFor("AGENT", account, getAffiliateConfig(), cfg);
  ok("policyFor returns an AGENT policy for an agent carrying a rate", r.ok === true,
    r.ok ? "" : `refused: ${(r as { refusal: string }).refusal}`);
  ok("⛔ …and REFUSES an approved agent with no rate rather than defaulting",
    policyFor("AGENT", null, getAffiliateConfig(), cfg).ok === false);
  if (r.ok) {
    const p = r.policy;
    ok(`rate is the FRACTION ${cfg.defaultCommissionPct / 100}, not the percent ${cfg.defaultCommissionPct}`,
      p.rate === cfg.defaultCommissionPct / 100, `rate=${p.rate}`);
    ok("⛔ the rate is a fraction ≤ 1 — a percent leaking through would be ≥ 1", p.rate <= 1);
    ok("the withholding travels on the policy as a PERCENT", p.withholdingPct === cfg.agentWithholdingTaxPct);
    ok("destination is CASH and the txn type is AGENT_COMMISSION",
      p.destination === "CASH" && p.txnType === "AGENT_COMMISSION");
  }
}

// ── §3 · the ceiling ─────────────────────────────────────────────────────────
console.log("\n§3 · the platform ceiling cannot be configured away");
{
  const over = policyFor("AGENT", { commissionPct: 90 }, getAffiliateConfig(), { ...cfg, defaultCommissionPct: 90, maxCommissionPct: 90 });
  if (over.ok) {
    ok(`⛔ a 90% rate is clamped to the ${PLATFORM_MAX_COMMISSION_PCT}% ceiling or below`,
      over.policy.rate <= PLATFORM_MAX_COMMISSION_PCT / 100, `rate=${over.policy.rate}`);
  } else {
    ok("⛔ a 90% rate is refused outright", true);
  }
  const zero = policyFor("AGENT", { commissionPct: 0 }, getAffiliateConfig(), cfg);
  ok("an agent rate of 0 REFUSES rather than paying zero silently", zero.ok === false);

  ok("a zero net fee earns nothing", agentCommissionSplit(0, 10, 5).netTzs === 0);
  ok("a negative net fee earns nothing", agentCommissionSplit(-5_000, 10, 5).netTzs === 0);
  ok("⭐ a 0% withholding returns the gross untouched, it is not a zero payout",
    agentCommissionSplit(10_000, 10, 0).netTzs === 1_000);
}

// ── §4 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§4 · ⚠️ POSITIVE CONTROL — the comparison must CATCH a divergence");
{
  const net = 22_100;
  const right = agentCommissionSplit(net, cfg.defaultCommissionPct, cfg.agentWithholdingTaxPct);

  // ⛔ THE 100× ERROR the config header warns about: the percent fed where the fraction goes.
  const scaleError = enginePath(net, cfg.defaultCommissionPct, cfg.agentWithholdingTaxPct);
  ok("⚠️ feeding the PERCENT as the fraction is caught", scaleError.netTzs !== right.netTzs,
    "the two scales produced the same number — the comparison is vacuous");
  ok(`⚠️ …and it is a 100× overpayment (${right.netTzs} → ${scaleError.netTzs})`,
    scaleError.netTzs > right.netTzs * 50);

  // A plain wrong rate must also be caught.
  const rateError = enginePath(net, 0.20, cfg.agentWithholdingTaxPct);
  ok("⚠️ a doubled rate is caught", rateError.netTzs !== right.netTzs);

  // A wrong withholding must be caught.
  const whtError = enginePath(net, cfg.defaultCommissionPct / 100, 15);
  ok("⚠️ a wrong withholding rate is caught", whtError.netTzs !== right.netTzs);

  // …and the correct one must MATCH, or every failure above is meaningless.
  const correct = enginePath(net, cfg.defaultCommissionPct / 100, cfg.agentWithholdingTaxPct);
  ok("⚠️ …while the correct arithmetic MATCHES", correct.netTzs === right.netTzs);
}

// ── §5 · what the page shows is what the wallet gets ─────────────────────────
console.log("\n§5 · ⛔ the waterfall a partner reads is the credit they receive");
{
  const rates = {
    platformFeeRate: 0.03, operatorFeeRate: 0.10,
    traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05,
    agentPct: cfg.defaultCommissionPct, withholdingPct: cfg.agentWithholdingTaxPct,
  };
  ok("the fee rate the waterfall uses is 13%", totalFeeRate(rates) === 0.13);

  for (const winnings of [100_000, 500_000, 1_000_000, 7_777_777]) {
    const w = commissionWaterfall(winnings, rates);
    const step = (id: string) => w.steps.find((s) => s.id === id)!.amountTzs;

    // The engine, given the SAME net fee the waterfall arrived at, must credit the same.
    const engine = enginePath(step("netFee"), cfg.defaultCommissionPct / 100, cfg.agentWithholdingTaxPct);
    ok(`winnings ${winnings.toLocaleString()}: page shows ${w.netPayoutTzs}, engine credits ${engine.netTzs}`,
      w.netPayoutTzs === engine.netTzs);

    // The table must also add up, or the page is internally inconsistent.
    ok(`   …and the steps reconcile (${step("grossFee")} − ${step("tra")} − ${step("gbt")} = ${step("netFee")})`,
      step("grossFee") - step("tra") - step("gbt") === step("netFee"));
    ok(`   …and agentShare − withholding = netPayout`,
      step("agentShare") - step("withholding") === step("netPayout"));
  }

  // ⭐ The headline a partner actually judges the offer by.
  const w = commissionWaterfall(1_000_000, rates);
  ok(`⭐ effective take is ${w.effectivePctOfWinnings.toFixed(3)}% of winnings, well under the headline 10%`,
    w.effectivePctOfWinnings > 0 && w.effectivePctOfWinnings < cfg.defaultCommissionPct);
}

console.log(`\n${"═".repeat(70)}\n  AGENT WATERFALL: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
