/**
 * COMMISSION BOUNDED — priced on the NET fee, floored to the shilling, capped by a RULE.
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
 * Red harness: `npm run red:commission-bounded`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement, policyFor } from "../src/lib/server/affiliate-service.ts";
import { levySplit, DEFAULT_TRA_TAX_ON_COMMISSION_RATE, DEFAULT_GBT_LEVY_ON_COMMISSION_RATE } from "../src/lib/payout.ts";
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

// ── §1 · THE EQUALITY ────────────────────────────────────────────────────────────────────
const paid30 = await settleFor("cb30", 30, attributableNet, "mkt_cb_1");
ok("1.equality · 30% of the net share is EXACTLY TZS 1,912", paid30 === 1_912, `paid=${paid30}`);
ok("1.notgross · …and not TZS 2,250 (30% of the gross share)", paid30 !== 2_250);
ok("1.notround · …and not TZS 1,913 (Math.round would over-collect the half shilling)", paid30 !== 1_913);
ok("1.bound · commission never exceeds rate × net", paid30 <= Math.floor(attributableNet * 0.30));

// ── §2 · CONTROL — zero levies make gross and net the same, and the figure moves ────────
const zero = levySplit(GROSS_FEE, { traTaxOnCommissionRate: 0, gbtLevyOnCommissionRate: 0 });
const zeroShare = (STAKE / POOL) * zero.operatorNet;
ok("2.setup · with no levies the net share IS TZS 7,500", zeroShare === 7_500, String(zeroShare));
const paidZero = await settleFor("cb30z", 30, zeroShare, "mkt_cb_2");
ok("2.control · with no levies the same rate pays TZS 2,250 — the assertion above reads the levies", paidZero === 2_250, `paid=${paidZero}`);

// ── §3 · a high rate, still floored, still on the net ──────────────────────────────────
const paid90 = await settleFor("cb90", 40, attributableNet, "mkt_cb_3");
ok("3.ceiling · at the 40% ceiling: floor(6,375 × 0.40) = TZS 2,550", paid90 === 2_550, `paid=${paid90}`);
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

console.log(`\ncommission-bounded: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
