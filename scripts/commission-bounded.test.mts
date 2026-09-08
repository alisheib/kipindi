/**
 * COMMISSION BOUNDED — priced on the NET fee, floored to the shilling, taxed, capped by a RULE.
 *
 * ⭐ THE CONTROL IS AN EQUALITY, NOT `≤ operatorNet` (AGENT-STRESS-TEST-FINDINGS 3.8).
 * Fixture: pool 400,000 · gross fee 30,000 · this position's stake 100,000 · rate 30% ·
 * levies TRA 10% + GBT 5%. The position's share of the NET fee is
 *   (100,000 / 400,000) × (30,000 − 3,000 − 1,500) = 6,375
 * and 30% of that, FLOORED, is **1,912** — `Math.floor(1,912.5)`, because the platform never
 * invents a fraction of a shilling (RULES.md §2.10). ⛔ Not 2,250: that is 30% of the GROSS
 * 7,500 — money that already belongs to TRA and GBT. ⛔ And not 1,913: `Math.round` breaks the
 * tie upward and the parts sum to more than the whole.
 *
 * The zero-levy control at 2,250 proves the assertion is reading the levies, not a coincidence.
 *
 * ⭐ AND SINCE 2026-09-08 THERE IS A FOURTH DEDUCTION: the local withholding tax management
 * added to the waterfall. 1,912 is the GROSS commission; 5% of it — `Math.round(95.6)` = 96 —
 * is withheld and remitted, and **1,816** is the cash. So this suite now asserts THREE figures
 * per fixture, not one: the gross (the floor), the tax (the rounding), and the net (the
 * subtraction). ⛔ Asserting only the net would let the gross and the tax both drift in
 * opposite directions and stay green, which is the failure mode `docs/AGENT-STRESS-TEST-
 * FINDINGS.md` §3.8 was written about.
 *
 * ⚠️ EVERY EXPECTATION BELOW IS RE-DERIVED FROM `splitWithholding` AND THE LIVE RATE, and then
 * ALSO pinned to a literal. The re-derivation is what keeps the suite true when an officer
 * changes the rate; the literal is what stops the suite agreeing with a broken engine because
 * both call the same function. Neither alone is a guard.
 *
 * Red harness: `npm run red:commission-bounded`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement, policyFor } from "../src/lib/server/affiliate-service.ts";
import { levySplit, DEFAULT_TRA_TAX_ON_COMMISSION_RATE, DEFAULT_GBT_LEVY_ON_COMMISSION_RATE, DEFAULT_PLATFORM_FEE_RATE, DEFAULT_OPERATOR_FEE_RATE } from "../src/lib/payout.ts";
import { splitWithholding, commissionWaterfall } from "../src/lib/agent-commission.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getAgentConfig, setAgentConfig, PLATFORM_MAX_COMMISSION_PCT } from "../src/lib/server/agent-config.ts";
import { setAgentRate } from "../src/lib/server/agent-application-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
let n = 0;
const pos = () => `pos_cb_${++n}`;

const POOL = 400_000, GROSS_FEE = 30_000, STAKE = 100_000;
const rates = { traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE, gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE };
ok("0.rates · the levy rates are 10% + 5% (re-derived from payout.ts, not typed here)", rates.traTaxOnCommissionRate === 0.10 && rates.gbtLevyOnCommissionRate === 0.05, JSON.stringify(rates));

// The market service's own arithmetic, reproduced from `settleLevies` + `attributableNetFee`.
const split = levySplit(GROSS_FEE, rates);
ok("0.net · levySplit keeps TZS 25,500 of a TZS 30,000 fee", split.operatorNet === 25_500, JSON.stringify(split));
const attributableNet = (STAKE / POOL) * split.operatorNet;
ok("0.share · this position's share of the NET fee is TZS 6,375", attributableNet === 6_375, String(attributableNet));
const attributableGross = (STAKE / POOL) * GROSS_FEE;
ok("0.gross · …and of the GROSS fee, TZS 7,500 (the number that must NOT be paid on)", attributableGross === 7_500);

async function settleFor(agent: string, pct: number, netFee: number, market: string): Promise<number> {
  await mkFixtureUser(agent);
  const code = await approveFixtureAgent(agent, { commissionPct: pct });
  const rec = `${agent}_rec`;
  await mkFixtureUser(rec);
  await bindRecruit({ recruitUserId: rec, code });
  await onRecruitSettlement(rec, { operatorNetFee: netFee, marketId: market, positionId: pos() });
  return cashOf(agent);
}

// ⭐ THE WITHHOLDING RATE IN FORCE, read once and never typed. Every "net" expectation below
// is derived through `splitWithholding`, so this suite states the arithmetic rather than a
// snapshot of today's config.
const WHT_PCT = getAgentConfig().agentWithholdingTaxPct;
ok("0.wht · the withholding rate is a live config value, not a literal in this suite", Number.isFinite(WHT_PCT) && WHT_PCT >= 0 && WHT_PCT <= 100, String(WHT_PCT));
ok("0.whtshipped · …and management's shipped rate is 5%", WHT_PCT === 5, String(WHT_PCT));

// ── §1 · THE EQUALITY ────────────────────────────────────────────────────────────────────
const paid30 = await settleFor("cb30", 30, attributableNet, "mkt_cb_1");
const exp30 = splitWithholding(Math.floor(attributableNet * 0.30), WHT_PCT);
ok("1.gross · 30% of the net share, FLOORED, is EXACTLY TZS 1,912", exp30.grossTzs === 1_912, JSON.stringify(exp30));
ok("1.tax · …5% of that, ROUNDED, is TZS 96 withheld", exp30.taxWithheldTzs === 96, JSON.stringify(exp30));
ok("1.equality · …so the cash credited is EXACTLY TZS 1,816", paid30 === 1_816 && paid30 === exp30.netTzs, `paid=${paid30} expected=${exp30.netTzs}`);
ok("1.notgross · …and not TZS 2,250 (30% of the GROSS share — money that is TRA's and GBT's)", paid30 !== 2_250);
ok("1.notpretax · …and not TZS 1,912 (the gross, i.e. the withholding line skipped)", paid30 !== 1_912);
ok("1.notround · …and not TZS 1,913 (Math.round on the share would over-collect the half shilling)", paid30 !== 1_913);
ok("1.bound · commission never exceeds rate × net", paid30 <= Math.floor(attributableNet * 0.30));
{
  // ⭐ THE ROW CARRIES ALL THREE FIGURES. Without the gross on the row the per-recruit cap
  // silently widens by the tax, and a statement cannot show the partner what was withheld.
  const r = (await db.referralReward.listByReferrer("cb30"))[0];
  ok("1.row · the row records gross 1,912, tax 96 and net 1,816", r?.grossAmountTzs === 1_912 && r?.taxWithheldTzs === 96 && r?.amountTzs === 1_816,
    JSON.stringify(r && { gross: r.grossAmountTzs, tax: r.taxWithheldTzs, net: r.amountTzs }));
  ok("1.rowsum · …and gross = net + tax, with nothing lost to rounding", (r?.amountTzs ?? 0) + (r?.taxWithheldTzs ?? 0) === (r?.grossAmountTzs ?? -1),
    JSON.stringify(r && { gross: r.grossAmountTzs, tax: r.taxWithheldTzs, net: r.amountTzs }));
}

// ── §2 · CONTROL — zero levies make gross and net the same, and the figure moves ────────
const zero = levySplit(GROSS_FEE, { traTaxOnCommissionRate: 0, gbtLevyOnCommissionRate: 0 });
const zeroShare = (STAKE / POOL) * zero.operatorNet;
ok("2.setup · with no levies the net share IS TZS 7,500", zeroShare === 7_500, String(zeroShare));
const paidZero = await settleFor("cb30z", 30, zeroShare, "mkt_cb_2");
const expZero = splitWithholding(Math.floor(zeroShare * 0.30), WHT_PCT);
ok("2.control · with no levies the same rate grosses TZS 2,250 — the assertion above reads the levies", expZero.grossTzs === 2_250, JSON.stringify(expZero));
ok("2.controlnet · …and pays TZS 2,137 after withholding TZS 113", paidZero === 2_137 && expZero.taxWithheldTzs === 113, `paid=${paidZero} ${JSON.stringify(expZero)}`);

// ── §3 · a high rate, still floored, still on the net ──────────────────────────────────
const paid90 = await settleFor("cb90", 40, attributableNet, "mkt_cb_3");
const exp90 = splitWithholding(Math.floor(attributableNet * 0.40), WHT_PCT);
ok("3.ceiling · at the 40% ceiling: floor(6,375 × 0.40) = TZS 2,550 gross", exp90.grossTzs === 2_550, JSON.stringify(exp90));
ok("3.ceilingnet · …less TZS 128 withheld = TZS 2,422 cash", paid90 === 2_422 && paid90 === exp90.netTzs, `paid=${paid90} ${JSON.stringify(exp90)}`);
const row = (await db.referralReward.listByReferrer("cb90"))[0];
ok("3.stamp · the row records the rate that priced it (40) so a later change never rewrites history", row?.rateApplied === 40, JSON.stringify(row && row.rateApplied));

// ── §4 · zero net accrues nothing — no row, no audit noise about money that does not exist ──
const paid0 = await settleFor("cb0", 30, 0, "mkt_cb_4");
ok("4.zero · a zero net fee accrues nothing", paid0 === 0 && (await db.referralReward.listByReferrer("cb0")).length === 0);

// ── §5 · THE CEILING IS A RULE — nothing can price above PLATFORM_MAX_COMMISSION_PCT ────
{
  const snap = getAgentConfig();
  ok("5.rule · the rule is 40 and the operator ceiling sits at or under it", PLATFORM_MAX_COMMISSION_PCT === 40 && snap.maxCommissionPct <= 40, JSON.stringify({ rule: PLATFORM_MAX_COMMISSION_PCT, ceiling: snap.maxCommissionPct }));
  const widen = setAgentConfig({ maxCommissionPct: PLATFORM_MAX_COMMISSION_PCT + 5 }, "test-officer");
  ok("5.widen · the operator cannot set a ceiling above the rule", widen.ok === false, JSON.stringify(widen));
  await mkFixtureUser("cb_rate_officer", { role: "COMPLIANCE" });
  const over = await setAgentRate("cb_rate_officer", "cb30", PLATFORM_MAX_COMMISSION_PCT + 1, "testing the ceiling");
  ok("5.rate · an officer cannot set an agent's rate above the ceiling", over.ok === false, JSON.stringify(over));
  const at = await setAgentRate("cb_rate_officer", "cb30", PLATFORM_MAX_COMMISSION_PCT, "testing the ceiling");
  ok("5.at · …but exactly AT the ceiling is allowed", at.ok === true, JSON.stringify(at));
  const narrow = setAgentConfig({ maxCommissionPct: 35 }, "test-officer");
  ok("5.narrow · the operator may narrow the ceiling inside the rule", narrow.ok === true, JSON.stringify(narrow));
  const now36 = await setAgentRate("cb_rate_officer", "cb30", 36, "testing the narrowed ceiling");
  ok("5.narrowed · a rate above the narrowed ceiling is refused", now36.ok === false, JSON.stringify(now36));
  // A rate STORED above a later-narrowed ceiling is capped at accrual by the resolver.
  const capped = policyFor("AGENT", { commissionPct: 40 }, getAffiliateConfig(), getAgentConfig());
  ok("5.capped · a stored 40 under a 35 ceiling prices at 35", capped.ok && capped.policy.rate === 0.35, JSON.stringify(capped));
  setAgentConfig({ maxCommissionPct: snap.maxCommissionPct }, "test-officer");
  ok("5.restore · ceiling restored", getAgentConfig().maxCommissionPct === snap.maxCommissionPct);
}

// ── §6 · THE WITHHOLDING LINE ITSELF — the deduction management added, and its edges ─────
{
  // ⭐ 0% IS A REAL SETTING, NOT "UNSET". An operator whose withholding is repealed must be
  // able to pay the gross, and the accrual must not read 0 as a missing value and fall back.
  const snap = getAgentConfig().agentWithholdingTaxPct;
  const off = setAgentConfig({ agentWithholdingTaxPct: 0 }, "test-officer");
  ok("6.zeroset · a 0% withholding rate is accepted", off.ok === true, JSON.stringify(off));
  const paidUntaxed = await settleFor("cb_wht0", 30, attributableNet, "mkt_cb_6");
  ok("6.zero · with the tax at 0 the agent is paid the full gross TZS 1,912", paidUntaxed === 1_912, `paid=${paidUntaxed}`);
  {
    const r = (await db.referralReward.listByReferrer("cb_wht0"))[0];
    ok("6.zerorow · …and the row records no tax rather than a phantom zero-tax deduction", r?.taxWithheldTzs === 0 && r?.grossAmountTzs === 1_912, JSON.stringify(r && { gross: r.grossAmountTzs, tax: r.taxWithheldTzs }));
  }

  // ⛔ ABOVE 100% WOULD MAKE THE NET NEGATIVE, and a negative credit is refused silently —
  // so the partner would see "no commission" and nobody would see a misconfiguration.
  const absurd = setAgentConfig({ agentWithholdingTaxPct: 101 }, "test-officer");
  ok("6.bound · a withholding rate above 100% is refused by validate()", absurd.ok === false, JSON.stringify(absurd));

  // 100% withholds everything: the accrual must record the gross and pay nothing, NOT
  // silently vanish as though no commission had been earned.
  const all = setAgentConfig({ agentWithholdingTaxPct: 100 }, "test-officer");
  ok("6.allset · exactly 100% is accepted", all.ok === true, JSON.stringify(all));
  const paidNone = await settleFor("cb_wht100", 30, attributableNet, "mkt_cb_7");
  ok("6.all · at 100% the agent is credited nothing", paidNone === 0, `paid=${paidNone}`);

  setAgentConfig({ agentWithholdingTaxPct: snap }, "test-officer");
  ok("6.restore · withholding rate restored", getAgentConfig().agentWithholdingTaxPct === snap);
}

// ── §7 · THE PAGE AND THE ENGINE CANNOT DISAGREE ────────────────────────────────────────
// ⭐ MANAGEMENT'S WATERFALL IS RENDERED, NOT TYPED. `/agent` draws its worked example from
// `commissionWaterfall`, and the accrual pays through `splitWithholding` — the same function.
// This section proves the shared arithmetic reproduces management's own table (2026-09-08),
// row for row, from a TZS 1,000,000 winnings pool.
{
  const cfg = getAgentConfig();
  const w = commissionWaterfall(1_000_000, {
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    operatorFeeRate: DEFAULT_OPERATOR_FEE_RATE,
    traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,
    gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,
    agentPct: cfg.defaultCommissionPct,
    withholdingPct: cfg.agentWithholdingTaxPct,
  });
  const amt = (id: string) => w.steps.find((s) => s.id === id)?.amountTzs;
  ok("7.rate · the shipped agent rate is management's 10%", cfg.defaultCommissionPct === 10, String(cfg.defaultCommissionPct));
  ok("7.fee · 13% of a TZS 1,000,000 winnings pool is TZS 130,000", amt("grossFee") === 130_000, String(amt("grossFee")));
  ok("7.tra · TRA takes 10% of the fee: TZS 13,000", amt("tra") === 13_000, String(amt("tra")));
  ok("7.gbt · GBT takes 5% of the fee: TZS 6,500", amt("gbt") === 6_500, String(amt("gbt")));
  ok("7.netfee · the net platform commission is TZS 110,500", amt("netFee") === 110_500, String(amt("netFee")));
  ok("7.share · the agent's 10% of the net fee is TZS 11,050", amt("agentShare") === 11_050, String(amt("agentShare")));
  ok("7.wht · 5% withheld on that is TZS 553 (management's 552.50, in whole shillings)", amt("withholding") === 553, String(amt("withholding")));
  ok("7.payout · the net agent payout is TZS 10,497 (management's 10,497.50)", amt("netPayout") === 10_497, String(amt("netPayout")));
  ok("7.sums · every deduction reconciles: fee − TRA − GBT = net fee, share − tax = payout",
    amt("grossFee")! - amt("tra")! - amt("gbt")! === amt("netFee")! && amt("agentShare")! - amt("withholding")! === amt("netPayout")!);

  // ⭐ THE JOIN — the SAME base through the engine's own function pays the same shillings the
  // table shows. This is the assertion that makes the page a promise rather than a picture.
  const engine = splitWithholding(Math.floor(amt("netFee")! * (cfg.defaultCommissionPct / 100)), cfg.agentWithholdingTaxPct);
  ok("7.join · the engine's split equals the waterfall's last three rows, exactly",
    engine.grossTzs === amt("agentShare") && engine.taxWithheldTzs === amt("withholding") && engine.netTzs === amt("netPayout"),
    JSON.stringify({ engine, table: { gross: amt("agentShare"), tax: amt("withholding"), net: amt("netPayout") } }));
  ok("7.effective · and the partner's effective share of the winnings pool is ~1.05%",
    Math.abs(w.effectivePctOfWinnings - 1.0497) < 0.0001, String(w.effectivePctOfWinnings));
}

console.log(`\ncommission-bounded: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
