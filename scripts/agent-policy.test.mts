/**
 * AGENT POLICY — the ONE resolver, and what it decides (RULES.md §2.10).
 *
 * `policyFor(programme, account, playerCfg, agentCfg)` is the only place role, agent row and
 * config meet. Everything the agent programme promises about MONEY is a property of the policy
 * it returns — cash, its own transaction type, no flat rewards, the agent's OWN rate, a null
 * rate REFUSED — and this suite pins each one, first on the pure function and then on a live
 * settlement through the memory DAL.
 *
 * ⛔ §4 is the one most likely to be "fixed" wrong: the programme's `enabled` switch closes the
 * DOOR (applications, invitations). It does not stop a partner already inside from earning.
 *
 * Red harness: `npm run red:agent-policy` (anchors in scripts/anchors/agent.anchors.mjs).
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf, bonusOf, netAfterWht } from "./lib/agent-fixtures.mts";
import { policyFor, bindRecruit, onRecruitSettlement, getAgentDashboard, ensureAffiliateAccount } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig, setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getAgentConfig, setAgentConfig } from "../src/lib/server/agent-config.ts";
import { applicantEligibility } from "../src/lib/server/agent-application-service.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
const posId = (() => { let n = 0; return () => `pos_pol_${++n}`; })();

// ── §1 · THE PURE RESOLVER ──────────────────────────────────────────────────────────────────
{
  const playerCfg = getAffiliateConfig();
  const agentCfg = getAgentConfig();

  const nullRate = policyFor("AGENT", { commissionPct: null }, playerCfg, agentCfg);
  ok("1.nullrate · an AGENT with no rate is REFUSED, never defaulted", !nullRate.ok && nullRate.refusal === "agent_rate_unset", JSON.stringify(nullRate));

  const zeroRate = policyFor("AGENT", { commissionPct: 0 }, playerCfg, agentCfg);
  ok("1.zerorate · a 0% rate is a refusal too (a rate is set by an officer, never implied)", !zeroRate.ok, JSON.stringify(zeroRate));

  const agent = policyFor("AGENT", { commissionPct: 20 }, playerCfg, agentCfg);
  ok("1.agent · an approved rate resolves", agent.ok, JSON.stringify(agent));
  if (agent.ok) {
    ok("1.cash · destination is CASH", agent.policy.destination === "CASH", agent.policy.destination);
    ok("1.txn · transaction type is AGENT_COMMISSION", agent.policy.txnType === "AGENT_COMMISSION", agent.policy.txnType);
    ok("1.rate · the rate is the agent's OWN percent, as a fraction", agent.policy.rate === 0.2, String(agent.policy.rate));
    ok("1.flat · no flat rewards (commission only, by construction)", agent.policy.flatRewards === false);
    ok("1.window · window and cap come from the AGENT config, not the player promo",
      agent.policy.windowMonths === agentCfg.commissionWindowMonths && agent.policy.capPerRecruitTzs === agentCfg.capPerRecruitTzs);
  }

  const over = policyFor("AGENT", { commissionPct: 95 }, playerCfg, agentCfg);
  ok("1.cap · a stored rate above the operator ceiling is capped AT the ceiling", over.ok && over.policy.rate === agentCfg.maxCommissionPct / 100, JSON.stringify(over));

  const promoOff = policyFor("AGENT", { commissionPct: 20 }, { ...playerCfg, enabled: false }, agentCfg);
  ok("1.promo · the GROWTH officer's player-promo switch does not touch an agent", promoOff.ok, JSON.stringify(promoOff));

  const doorShut = policyFor("AGENT", { commissionPct: 20 }, playerCfg, { ...agentCfg, enabled: false });
  ok("1.door · closing the programme door does not stop an approved agent's policy", doorShut.ok, JSON.stringify(doorShut));

  const player = policyFor("PLAYER", { commissionPct: 20 }, playerCfg, agentCfg);
  ok("1.player · CONTROL — the PLAYER programme resolves to BONUS + BONUS_CREDIT + flat rewards",
    player.ok && player.policy.destination === "BONUS" && player.policy.txnType === "BONUS_CREDIT" && player.policy.flatRewards === true, JSON.stringify(player));
  const playerOff = policyFor("PLAYER", null, { ...playerCfg, enabled: false }, agentCfg);
  ok("1.playeroff · CONTROL — the promo switch DOES gate the player programme", !playerOff.ok && playerOff.refusal === "programme_disabled", JSON.stringify(playerOff));
  const playerIgnoresAgentRate = policyFor("PLAYER", { commissionPct: 35 }, playerCfg, agentCfg);
  ok("1.playerrate · a PLAYER policy never reads the agent rate column", playerIgnoresAgentRate.ok && playerIgnoresAgentRate.policy.rate !== 0.35);
}

// ── §2 · A LIVE SETTLEMENT — the policy becomes money ──────────────────────────────────────
{
  await mkFixtureUser("pol_agent");
  const code = await approveFixtureAgent("pol_agent", { commissionPct: 20 });
  await mkFixtureUser("pol_rec");
  const bound = await bindRecruit({ recruitUserId: "pol_rec", code });
  ok("2.bound · the agent's code binds a recruit", bound.bound === true, JSON.stringify(bound));

  await onRecruitSettlement("pol_rec", { operatorNetFee: 10_000, marketId: "mkt_pol_1", positionId: posId() });
  ok("2.cash · 20% of a TZS 10,000 net fee grosses TZS 2,000 and lands as CASH, less withholding", (await cashOf("pol_agent")) === netAfterWht(2_000), `cash=${await cashOf("pol_agent")}`);
  ok("2.bonus · …and NOTHING in the bonus balance", (await bonusOf("pol_agent")) === 0, `bonus=${await bonusOf("pol_agent")}`);

  const txns = await db.txn.findByUser("pol_agent");
  const commissionTxn = txns.find((t) => t.type === "AGENT_COMMISSION");
  ok("2.txn · the credit is its own transaction type, AGENT_COMMISSION, for the exact amount", !!commissionTxn && commissionTxn.amount === netAfterWht(2_000), JSON.stringify(txns.map((t) => [t.type, t.amount])));
  ok("2.notbonus · no BONUS_CREDIT transaction was written for an agent accrual", !txns.some((t) => t.type === "BONUS_CREDIT"));

  const rows = await db.referralReward.listByReferrer("pol_agent");
  ok("2.row · exactly one reward row", rows.length === 1, String(rows.length));
  const r = rows[0];
  ok("2.stamp · the row is stamped programme=AGENT, rateApplied=20, PAID, with market + sourceRef",
    !!r && r.programme === "AGENT" && r.rateApplied === 20 && r.status === "PAID" && r.marketId === "mkt_pol_1" && !!r.sourceRef,
    JSON.stringify(r));

  const dash = await getAgentDashboard("pol_agent");
  ok("2.dash · the dashboard reads the SAME rate and destination the accrual used",
    !!dash && dash.commissionPct === 20 && dash.destination === "CASH" && dash.active === true, JSON.stringify(dash && { pct: dash.commissionPct, dest: dash.destination }));
  const nobody = await getAgentDashboard("pol_rec");
  ok("2.dashnull · a recruit is not an agent — no dashboard", nobody === null);
}

// ── §3 · A NULL RATE REFUSES — with an audit row, never a fallback to the promo rate ───────
{
  await mkFixtureUser("pol_norate");
  const code = await approveFixtureAgent("pol_norate", { commissionPct: 20 });
  await mkFixtureUser("pol_norate_rec");
  await bindRecruit({ recruitUserId: "pol_norate_rec", code });
  await db.affiliate.update("pol_norate", { commissionPct: null });
  await onRecruitSettlement("pol_norate_rec", { operatorNetFee: 10_000, marketId: "mkt_pol_2", positionId: posId() });
  ok("3.cash · nothing is credited", (await cashOf("pol_norate")) === 0, `cash=${await cashOf("pol_norate")}`);
  ok("3.row · no reward row of any status", (await db.referralReward.listByReferrer("pol_norate")).length === 0);
  // A missing rate is an OFFICER's omission, so it is filed under ADMIN — the category an
  // officer reads — not under SYSTEM with the routine refusals.
  const refused = getAuditPage({ category: "ADMIN", limit: 300 }).some((e) => e.action === "affiliate.accrual_refused" && e.targetId === "pol_norate_rec");
  ok("3.audit · the refusal is AUDITED under ADMIN (a silent zero is the defect)", refused);
}

// ── §4 · THE DOOR vs THE ROOM — applications closed, partners still paid ───────────────────
{
  const snap = getAgentConfig();
  const shut = setAgentConfig({ enabled: false }, "test-officer");
  ok("4.setup · the programme door can be closed", shut.ok === true, JSON.stringify(shut));
  try {
    await mkFixtureUser("pol_door_agent");
    const code = await approveFixtureAgent("pol_door_agent", { commissionPct: 25 });
    await mkFixtureUser("pol_door_rec");
    const bound = await bindRecruit({ recruitUserId: "pol_door_rec", code });
    ok("4.recruit · an approved agent still recruits with the door shut", bound.bound === true, JSON.stringify(bound));
    await onRecruitSettlement("pol_door_rec", { operatorNetFee: 10_000, marketId: "mkt_pol_3", positionId: posId() });
    ok("4.accrue · …and still accrues (TZS 2,500 gross at 25%)", (await cashOf("pol_door_agent")) === netAfterWht(2_500), `cash=${await cashOf("pol_door_agent")}`);

    await mkFixtureUser("pol_door_applicant");
    const elig = await applicantEligibility("pol_door_applicant");
    ok("4.door · CONTROL — a NEW applicant IS refused while the door is shut", !elig.ok && elig.refusal === "programme_disabled", JSON.stringify(elig));
  } finally {
    setAgentConfig({ enabled: snap.enabled }, "test-officer");
  }
  ok("4.restore · the door is open again", getAgentConfig().enabled === snap.enabled);
}

// ── §5 · CONTROL — the player promo on the identical hook pays BONUS, so the split is real ──
{
  const playerSnap = getAffiliateConfig();
  setAffiliateConfig({ enabled: true, commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 } }, "test-officer");
  process.env.FEATURE_INVITE = "ACTIVE";
  /**
   * ⭐ THE BONUS WALLET IS WITHDRAWN FROM THE PRODUCT, AND THIS SECTION DRIVES ITS ON PATH
   * DELIBERATELY — scoped, beside the FEATURE_INVITE line that has always been here.
   *
   * ⛔ THE ASSERTION BELOW MUST NOT BE RELAXED TO "…lands in CASH". This section is a CONTROL:
   * its whole job is to prove the agent/player split is REAL by showing the identical hook pays
   * an AGENT in cash and a PLAYER somewhere else. If the player also paid cash, the two arms
   * would agree and the control would pass while proving nothing — a gate that cannot fail.
   * So the feature state is declared, per `scripts/lib/bonus-feature-on.mts`'s doctrine, rather
   * than the expectation being softened to match whatever the product currently does.
   */
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    await mkFixtureUser("pol_player_ref");
    const acct = await ensureAffiliateAccount("pol_player_ref");
    await mkFixtureUser("pol_player_rec");
    const bound = await bindRecruit({ recruitUserId: "pol_player_rec", code: acct.code });
    ok("5.bound · a PLAYER referrer binds under the promo", bound.bound === true, JSON.stringify(bound));
    await onRecruitSettlement("pol_player_rec", { operatorNetFee: 10_000, marketId: "mkt_pol_4", positionId: posId() });
    const rows = await db.referralReward.listByReferrer("pol_player_ref");
    ok("5.programme · the player row is stamped PLAYER, not AGENT", rows.length === 1 && rows[0].programme === "PLAYER", JSON.stringify(rows.map((r) => r.programme)));
    ok("5.bonus · the player commission lands in the BONUS balance", (await bonusOf("pol_player_ref")) === 5_000, `bonus=${await bonusOf("pol_player_ref")}`);
    ok("5.cash · …and not in cash", (await cashOf("pol_player_ref")) === 0, `cash=${await cashOf("pol_player_ref")}`);
    const txns = await db.txn.findByUser("pol_player_ref");
    ok("5.txn · CONTROL — no AGENT_COMMISSION transaction exists for a player referrer", !txns.some((t) => t.type === "AGENT_COMMISSION" || t.type === "AGENT_COMMISSION_REVERSAL"), JSON.stringify(txns.map((t) => t.type)));
  } finally {
    delete process.env.FEATURE_INVITE;
    delete process.env.FEATURE_BONUS;
    setAffiliateConfig({ enabled: playerSnap.enabled, commission: playerSnap.commission }, "test-officer");
  }
}

console.log(`\nagent-policy: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
