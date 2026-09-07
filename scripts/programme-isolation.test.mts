/**
 * PROGRAMME ISOLATION — the AGENT programme is commission-only BY CONSTRUCTION, and the two
 * programmes' switches do not reach each other.
 *
 * 🔴 THE DEFECT THIS GUARDS (AGENT-STRESS-TEST-FINDINGS): under the shipped player-promo
 * config an "agent" earned the TZS 10,000 FIRST_BET prize as real cash and TZS 0 of
 * commission — the exact inverse of the decision. The fix is not an early return in `payPrize`;
 * it is that `policyFor("AGENT")` returns `flatRewards: false` and the hooks branch on that.
 *
 * Every refusal here has a CONTROL on the identical hook with a PLAYER referrer, so a hook that
 * quietly stopped paying everyone would go red too.
 *
 * Red harness: `npm run red:programme-isolation`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf, bonusOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitBet, onRecruitDeposit, onRecruitSettlement, ensureAffiliateAccount } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig, setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getAgentConfig, setAgentConfig } from "../src/lib/server/agent-config.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
let n = 0;
const pos = () => `pos_iso_${++n}`;

const playerSnap = getAffiliateConfig();
const agentSnap = getAgentConfig();

// Every flat reward the player promo can pay is switched ON. If the agent branch leaks, it
// leaks LOUDLY.
setBonusConfig({ enabled: true }, "test-officer");
const armed = setAffiliateConfig({
  enabled: true,
  commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
}, "test-officer");
ok("0.setup · every player-promo reward is armed", armed.ok === true, JSON.stringify(armed));

try {
  // ── §1 · AN AGENT REFERRER on every hook ─────────────────────────────────────────────────
  {
    await mkFixtureUser("iso_agent");
    const code = await approveFixtureAgent("iso_agent", { commissionPct: 20 });
    await mkFixtureUser("iso_rec");
    const bound = await bindRecruit({ recruitUserId: "iso_rec", code });
    ok("1.bound · the agent recruits", bound.bound === true, JSON.stringify(bound));
    ok("1.nosignup · SIGNUP bonus did NOT pay the agent on bind", (await cashOf("iso_agent")) === 0 && (await bonusOf("iso_agent")) === 0, `cash=${await cashOf("iso_agent")} bonus=${await bonusOf("iso_agent")}`);
    ok("1.nosignup.recruit · …nor the recruit", (await bonusOf("iso_rec")) === 0, `bonus=${await bonusOf("iso_rec")}`);

    await onRecruitBet("iso_rec", { stake: 25_000 });
    ok("1.noprize · FIRST_BET prize did NOT pay the agent", (await cashOf("iso_agent")) === 0 && (await bonusOf("iso_agent")) === 0, `cash=${await cashOf("iso_agent")} bonus=${await bonusOf("iso_agent")}`);

    await onRecruitDeposit("iso_rec", { cumulativeDepositsTzs: 50_000 });
    ok("1.nodeposit · a deposit milestone paid the agent nothing", (await cashOf("iso_agent")) === 0 && (await bonusOf("iso_agent")) === 0);

    await onRecruitSettlement("iso_rec", { operatorNetFee: 10_000, marketId: "mkt_iso_1", positionId: pos() });
    ok("1.commission · the settlement pays commission — and ONLY commission — as cash", (await cashOf("iso_agent")) === 2_000 && (await bonusOf("iso_agent")) === 0, `cash=${await cashOf("iso_agent")} bonus=${await bonusOf("iso_agent")}`);
    const rows = await db.referralReward.listByReferrer("iso_agent");
    ok("1.rows · exactly one row, type COMMISSION, programme AGENT", rows.length === 1 && rows[0].type === "COMMISSION" && rows[0].programme === "AGENT", JSON.stringify(rows.map((r) => [r.type, r.programme, r.status])));
  }

  // ── §2 · CONTROL — a PLAYER referrer on the SAME hooks is paid the flat rewards ──────────
  process.env.FEATURE_INVITE = "ACTIVE";
  try {
    await mkFixtureUser("iso_player");
    const acct = await ensureAffiliateAccount("iso_player");
    await mkFixtureUser("iso_player_rec");
    const bound = await bindRecruit({ recruitUserId: "iso_player_rec", code: acct.code });
    ok("2.bound · the player referrer binds under the promo", bound.bound === true, JSON.stringify(bound));
    await onRecruitBet("iso_player_rec", { stake: 25_000 });
    const rows = await db.referralReward.listByReferrer("iso_player");
    ok("2.prize · CONTROL — the FIRST_BET prize IS paid to a player referrer", rows.some((r) => r.type === "PRIZE" && r.status === "PAID"), JSON.stringify(rows.map((r) => [r.type, r.status])));
    await onRecruitSettlement("iso_player_rec", { operatorNetFee: 10_000, marketId: "mkt_iso_2", positionId: pos() });
    const after = await db.referralReward.listByReferrer("iso_player");
    ok("2.commission · CONTROL — the player commission row is stamped PLAYER and lands in BONUS", after.some((r) => r.type === "COMMISSION" && r.programme === "PLAYER") && (await bonusOf("iso_player")) >= 5_000, `bonus=${await bonusOf("iso_player")}`);
  } finally {
    delete process.env.FEATURE_INVITE;
  }

  // ── §3 · THE SWITCHES ARE SEPARATE ───────────────────────────────────────────────────────
  {
    setAffiliateConfig({ enabled: false }, "test-officer");
    await mkFixtureUser("iso_agent2");
    const code = await approveFixtureAgent("iso_agent2", { commissionPct: 20 });
    await mkFixtureUser("iso_rec2");
    const bound = await bindRecruit({ recruitUserId: "iso_rec2", code });
    ok("3.bind · the growth officer pausing the player promo does not stop an agent recruiting", bound.bound === true, JSON.stringify(bound));
    await onRecruitSettlement("iso_rec2", { operatorNetFee: 10_000, marketId: "mkt_iso_3", positionId: pos() });
    ok("3.accrue · …or accruing", (await cashOf("iso_agent2")) === 2_000, `cash=${await cashOf("iso_agent2")}`);

    // Attribution is SHARED (one system, always) — a pause is an ECONOMIC switch, so the bind
    // still records who recruited whom; what stops is the money.
    process.env.FEATURE_INVITE = "ACTIVE";
    try {
      await mkFixtureUser("iso_player2");
      const acct = await ensureAffiliateAccount("iso_player2");
      await mkFixtureUser("iso_player2_rec");
      const pb = await bindRecruit({ recruitUserId: "iso_player2_rec", code: acct.code });
      ok("3.control.bind · attribution is still recorded under a paused promo", pb.bound === true, JSON.stringify(pb));
      await onRecruitSettlement("iso_player2_rec", { operatorNetFee: 10_000, marketId: "mkt_iso_3b", positionId: pos() });
      ok("3.control · CONTROL — the paused promo DOES stop a player referrer's money", (await bonusOf("iso_player2")) === 0 && (await cashOf("iso_player2")) === 0 && (await db.referralReward.listByReferrer("iso_player2")).length === 0, `bonus=${await bonusOf("iso_player2")} cash=${await cashOf("iso_player2")}`);
    } finally {
      delete process.env.FEATURE_INVITE;
    }
    setAffiliateConfig({ enabled: true }, "test-officer");
  }

  // ── §4 · A DEFAULT IS NOT A RATE — changing the default re-prices nobody ────────────────
  {
    await mkFixtureUser("iso_agent3");
    const code = await approveFixtureAgent("iso_agent3", { commissionPct: 20 });
    await mkFixtureUser("iso_rec3");
    await bindRecruit({ recruitUserId: "iso_rec3", code });
    const r = setAgentConfig({ defaultCommissionPct: 30 }, "test-officer");
    ok("4.setup · the default for NEW agents moves to 30%", r.ok === true, JSON.stringify(r));
    await onRecruitSettlement("iso_rec3", { operatorNetFee: 10_000, marketId: "mkt_iso_4", positionId: pos() });
    ok("4.own · an existing agent still earns at THEIR rate (20%), not the new default", (await cashOf("iso_agent3")) === 2_000, `cash=${await cashOf("iso_agent3")}`);
    setAgentConfig({ defaultCommissionPct: agentSnap.defaultCommissionPct }, "test-officer");
  }
} finally {
  setAffiliateConfig({ enabled: playerSnap.enabled, commission: playerSnap.commission, bonus: playerSnap.bonus, prize: playerSnap.prize }, "test-officer");
  setAgentConfig({ defaultCommissionPct: agentSnap.defaultCommissionPct }, "test-officer");
  setBonusConfig({ enabled: false }, "test-officer");
}

console.log(`\nprogramme-isolation: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
