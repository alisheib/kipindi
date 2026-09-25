/**
 * THE UNPAID PLAYER INVITE — the surface is live, the platform pays nothing (2026-09-25).
 *
 * Ali: *"we don't want to pay anything on affiliate … i want to track how many people he got with
 * this link, i'll pay him cash not through 50pick, and we can keep that option if needed."*
 *
 * Two product states, two switches, and this suite exists because the interesting one is the
 * SECOND: `invite` ACTIVE opens the link, the QR, the share sheet and the attribution;
 * `inviteRewards` WITHDRAWN refuses every PLAYER-programme accrual in `policyFor`. A feature whose
 * headline promise is a NEGATIVE ("nothing is paid") is the easiest kind to ship broken and the
 * hardest to notice, because the symptom of failure is money quietly moving.
 *
 * ⛔ WHY THE ZERO IS IN CODE AND NOT IN THE CONFIG — §3 is the section that says it. The shipped
 * `affiliate.config` has `prize.enabled: true` at TZS 10,000 a head, it is a DB row, `defineConfig`
 * hydrates a persisted row without validation, and `/admin/affiliate` is one click from switching a
 * mode back on. "Set the commission to 0%" would have left all of that live and silenced the one
 * branch that was never the payer.
 *
 * ⭐ THE CONTROLS ARE THE POINT. A suite that only asserts zeros passes just as well when the
 * accrual machine is broken, when the fixtures never bet, or when the hooks are never called. So:
 *   · §4 pays an approved AGENT on the identical hook — the machine works.
 *   · §5 pays the SAME PLAYER on the SAME hook with `FEATURE_INVITEREWARDS=ACTIVE` — the zero in
 *     §2/§3 is caused by the switch under test and by nothing else.
 * Every zero below is a DELTA against one of those two.
 *
 * Red harness: `npm run red:player-invite-unpaid` (anchors in scripts/anchors/agent.anchors.mjs).
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf, bonusOf, netAfterWht } from "./lib/agent-fixtures.mts";
import {
  bindRecruit, ensureAffiliateAccount, onRecruitBet, onRecruitSettlement, onRecruitDeposit,
  getPlayerReferralSummary, resolveReferralPreview, getAdminAffiliateStats, inviteViewerFor,
  playerInviteEligibleFor, policyFor,
} from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig, setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";
import { inviteIsLiveFor, playerInviteRewardsLive } from "../src/lib/feature-state.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const posId = (() => { let n = 0; return () => `pos_piu_${++n}`; })();

/**
 * ⛔ THE CONFIG IS SET SO THE PATH WOULD PAY — every mode on, no deposit required, a TZS 1,000
 * minimum bet. Without this the sections below would be measuring the SHIPPED DEFAULTS
 * (`requireDeposit: true`, `minBetAmountTzs: 20_000`) rather than the gate: a fixture that never
 * deposits cannot earn a prize whatever the product state says, and the suite would report a
 * triumphant zero it did nothing to cause. That exact vacuity shipped once in
 * `withdrawn-features` §5d and only its red harness noticed.
 */
setAffiliateConfig({
  enabled: true,
  commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000, capPerReferrer: 20, depositThresholdTzs: 10_000 },
}, "test-officer");

// ── §1 · THE SURFACE IS LIVE, AND IT IS NOT LIVE FOR EVERYONE ───────────────────────────────
{
  ok("1.state · the shipped product pays a player NOTHING for an invite", !playerInviteRewardsLive());

  await mkFixtureUser("piu_sharer");
  ok("1.live · an ordinary player in good standing holds a link", inviteIsLiveFor(await inviteViewerFor("piu_sharer")));
  ok("1.signedout · a signed-out viewer does not", !inviteIsLiveFor(await inviteViewerFor(null)));
  ok("1.unknown · an unknown id does not", !inviteIsLiveFor(await inviteViewerFor("piu_nobody")));

  // ⛔ THE THREE STATUSES, EACH ITS OWN ASSERTION. A self-excluded player's link is a public
  // artefact that outlives them, and `bindRecruit` reads their STORED row long after they log out.
  for (const status of ["CLOSED", "SUSPENDED", "SELF_EXCLUDED"] as const) {
    const uid = `piu_${status.toLowerCase()}`;
    await mkFixtureUser(uid);
    ok(`1.${status}.control · live while ACTIVE`, inviteIsLiveFor(await inviteViewerFor(uid)));
    await db.user.update(uid, { status });
    ok(`1.${status} · ⛔ not live once ${status}`, !inviteIsLiveFor(await inviteViewerFor(uid)));
    const rec = `piu_rec_${status.toLowerCase()}`;
    await mkFixtureUser(rec);
    const code = (await ensureAffiliateAccount(uid)).code;
    ok(`1.${status}.bind · ⛔ …and their code binds nobody`, (await bindRecruit({ recruitUserId: rec, code })).bound === false);
  }

  // ⚠️ COOLED_OFF IS NOT ONE OF THEM — a break about their own betting, and sharing is not betting.
  await mkFixtureUser("piu_cool");
  await db.user.update("piu_cool", { status: "COOLED_OFF" });
  ok("1.cooled · a cooling-off player keeps their link (the ruling agentStandingFor already records)",
    inviteIsLiveFor(await inviteViewerFor("piu_cool")));

  // 🔴 A DEACTIVATED AGENT GETS NEITHER SURFACE. `mayRecruit` routes anyone with `approvedAt` down
  // the AGENT branch and refuses them there, so a player link minted for them would be refused for
  // every person who used it — a link that cannot bind, handed to someone who thinks it counts.
  await mkFixtureUser("piu_deact");
  const deactCode = await approveFixtureAgent("piu_deact", { commissionPct: 20 });
  await db.affiliate.update("piu_deact", { active: false, deactivatedAt: new Date().toISOString() });
  ok("1.deactagent · ⛔ a deactivated agent does NOT fall back to the player share",
    !inviteIsLiveFor(await inviteViewerFor("piu_deact")));
  ok("1.deactagent.predicate · …and the predicate says why: an agent is never player-eligible",
    playerInviteEligibleFor({ status: "ACTIVE" }, { approvedAt: new Date().toISOString() }) === false);
  await mkFixtureUser("piu_rec_deact");
  ok("1.deactagent.bind · …and their code still binds nobody",
    (await bindRecruit({ recruitUserId: "piu_rec_deact", code: deactCode })).bound === false);
}

// ── §2 · THE BIND LANDS, AND NOT ONE SHILLING MOVES ─────────────────────────────────────────
// Through the REAL hooks — the three that pay: first bet (prize), deposit (bonus), settlement
// (commission). ⛔ The assertion is not only "no balance" but "no reward ROW": a TZS 0 row is a
// payable an officer could later be asked to settle, and it would appear on the player's page.
{
  await mkFixtureUser("piu_ref");
  await mkFixtureUser("piu_rec");
  const code = (await ensureAffiliateAccount("piu_ref")).code;

  const bound = await bindRecruit({ recruitUserId: "piu_rec", code });
  ok("2.bind · the invite binds — this is the tracking the operator asked for", bound.bound === true, JSON.stringify(bound));
  const rec = await db.user.findById("piu_rec");
  ok("2.stamp · ⭐ stamped programme=PLAYER, with the code and the timestamp",
    rec?.recruitedBy === "piu_ref" && rec?.recruitedProgramme === "PLAYER" && rec?.recruitedByCode === code && typeof rec?.recruitedAt === "string",
    JSON.stringify({ by: rec?.recruitedBy, prog: rec?.recruitedProgramme, code: rec?.recruitedByCode }));

  await onRecruitDeposit("piu_rec", { cumulativeDepositsTzs: 50_000 });
  await onRecruitBet("piu_rec", { stake: 25_000 });
  await onRecruitSettlement("piu_rec", { operatorNetFee: 10_000, marketId: "mkt_piu_1", positionId: posId() });

  ok("2.cash · ⛔ no cash", (await cashOf("piu_ref")) === 0, `cash=${await cashOf("piu_ref")}`);
  ok("2.bonus · ⛔ no bonus", (await bonusOf("piu_ref")) === 0, `bonus=${await bonusOf("piu_ref")}`);
  const rows = await db.referralReward.listByReferrer("piu_ref");
  ok("2.rows · ⛔ no reward row at all — not PAID, not PENDING, not HELD, not zero",
    rows.length === 0, JSON.stringify(rows.map((r) => [r.type, r.status, r.amountTzs])));

  // ⭐ AND THE ZERO IS EXPLAINABLE. Every refused accrual writes one audit row naming its reason,
  // so an officer asked "why did this person get nothing" has an answer that is not a shrug.
  const audits = getAuditPage({ limit: 400 })
    .filter((r) => r.action?.startsWith("affiliate.accrual_refused"));
  const mine = audits.filter((r) => JSON.stringify(r.payload ?? {}).includes("player_rewards_withdrawn"));
  ok("2.audit · ⭐ the refusal is audited as player_rewards_withdrawn", mine.length > 0, `refusals=${audits.length}`);

  // ⭐ THE PLAYER'S OWN PAGE READS THE SAME FACT — the read model the page branches on, so a money
  // block cannot render over an accrual that was refused.
  const summary = await getPlayerReferralSummary("piu_ref");
  ok("2.summary · the page is told the programme is unpaid", summary.rewardsLive === false);
  ok("2.promises · ⛔ …and is given NO promise lines to print", summary.promises.length === 0, JSON.stringify(summary.promises));
  ok("2.count · …while the friend IS counted", summary.recruitCount === 1 && summary.recruits.length === 1, JSON.stringify({ n: summary.recruitCount, rows: summary.recruits.length }));
  ok("2.earned · …and nothing is reported as earned", summary.earnedTzs === 0, String(summary.earnedTzs));

  // ⭐ THE RIBBON THE RECRUIT SEES — it renders (so the inviter is named) and offers nothing.
  const preview = await resolveReferralPreview(code);
  ok("2.ribbon · the register ribbon names the inviter", preview !== null && typeof preview.referrerName === "string", JSON.stringify(preview));
  ok("2.ribbon.money · ⛔ …with no welcome bonus and no VERIFIED badge",
    preview?.newPlayerBonusTzs === 0 && preview?.verifiedAgent === false && preview?.programme === "PLAYER", JSON.stringify(preview));
}

// ── §3 · THE OPERATOR'S CONFIG CANNOT TURN THE MONEY BACK ON ────────────────────────────────
// 🔴 THE SECTION THAT ANSWERS "why not just set the commission to 0%". The config above already
// has all three modes ON; here the resolver is asked directly, with a rate set, and must refuse.
{
  const resolved = policyFor("PLAYER", { commissionPct: 50 }, getAffiliateConfig(), getAgentConfig());
  ok("3.resolver · ⛔ every reward mode ON, a rate set — and the PLAYER programme still refuses",
    !resolved.ok && resolved.refusal === "player_rewards_withdrawn", JSON.stringify(resolved));
  ok("3.modes · SETUP CHECK — the modes really are on (or the line above proves nothing)",
    getAffiliateConfig().prize.enabled && getAffiliateConfig().commission.enabled && getAffiliateConfig().enabled);
}

// ── §4 · CONTROL — THE MACHINE WORKS. An approved AGENT is paid on the identical hook ───────
// ⛔ Without this, every zero above is equally consistent with an accrual engine that is simply
// broken, and the suite would be a gate that cannot fail.
{
  await mkFixtureUser("piu_agent");
  const agentCode = await approveFixtureAgent("piu_agent", { commissionPct: 20 });
  await mkFixtureUser("piu_agent_rec");
  ok("4.bind · the agent's code binds", (await bindRecruit({ recruitUserId: "piu_agent_rec", code: agentCode })).bound === true);
  await onRecruitSettlement("piu_agent_rec", { operatorNetFee: 10_000, marketId: "mkt_piu_2", positionId: posId() });
  ok("4.paid · CONTROL — 20% of a TZS 10,000 net fee reaches the agent as cash, less withholding",
    (await cashOf("piu_agent")) === netAfterWht(2_000), `cash=${await cashOf("piu_agent")}`);
  ok("4.unaffected · ⛔ the player rewards switch does not touch contracted agent income",
    (await db.referralReward.listByReferrer("piu_agent")).some((r) => r.programme === "AGENT" && r.type === "COMMISSION"));
}

// ── §5 · CONTROL — THE SWITCH IS THE CAUSE. The same player path pays when it is ON ─────────
// ⭐ THE DELTA THAT MAKES §2 MEAN SOMETHING: same fixtures shape, same hook, same config; the only
// thing that changes is the product state. If this section did not pay, §2's zero would be
// evidence of nothing at all. It also keeps the paid path executable for the day it returns.
{
  process.env.FEATURE_INVITEREWARDS = "ACTIVE";
  try {
    ok("5.state · SETUP — the override really flipped the state", playerInviteRewardsLive());
    await mkFixtureUser("piu_ref_on");
    await mkFixtureUser("piu_rec_on");
    const code = (await ensureAffiliateAccount("piu_ref_on")).code;
    ok("5.bind · the bind still lands", (await bindRecruit({ recruitUserId: "piu_rec_on", code })).bound === true);
    await onRecruitBet("piu_rec_on", { stake: 25_000 });
    const rows = await db.referralReward.listByReferrer("piu_ref_on");
    ok("5.paid · CONTROL — switched ON, the FIRST_BET prize IS recorded for a player referrer",
      rows.some((r) => r.type === "PRIZE"), JSON.stringify(rows.map((r) => [r.type, r.status, r.amountTzs])));
    const summary = await getPlayerReferralSummary("piu_ref_on");
    ok("5.summary · CONTROL — and the page is told it may talk about money again", summary.rewardsLive === true);
    ok("5.promises · CONTROL — …with promise lines to print", summary.promises.length > 0, JSON.stringify(summary.promises.map((p) => p.icon)));
  } finally {
    delete process.env.FEATURE_INVITEREWARDS;
  }
  ok("5.restore · the override is restored, not leaked", !playerInviteRewardsLive());
}

// ── §6 · THE OPERATOR'S ROSTER — every row, ranked by people, not by money ──────────────────
// ⭐ This table is what the cash outside the platform is paid FROM, so the two things that would
// make it useless are asserted: a top-N cut (the eleventh person does not get paid) and a sort on
// a column that is structurally zero (the order would be arbitrary).
{
  for (let i = 0; i < 12; i++) {
    const ref = `piu_board_${i}`;
    await mkFixtureUser(ref);
    const code = (await ensureAffiliateAccount(ref)).code;
    // i + 1 recruits each, so the expected order is strictly decreasing and any stable-sort
    // accident is visible.
    for (let j = 0; j <= i; j++) {
      const rec = `piu_board_rec_${i}_${j}`;
      await mkFixtureUser(rec);
      await bindRecruit({ recruitUserId: rec, code });
    }
  }
  const stats = await getAdminAffiliateStats();
  const board = stats.leaderboard.filter((r) => r.handle.length > 0);
  ok("6.full · ⛔ the roster is not capped at ten — twelve inviters, twelve rows reachable",
    board.length >= 12, `rows=${board.length}`);
  const top = stats.leaderboard.slice(0, 12);
  ok("6.sort · ranked by friends joined, descending",
    top.every((r, i) => i === 0 || top[i - 1].recruits >= r.recruits), JSON.stringify(top.map((r) => r.recruits)));
  ok("6.count · ⭐ the KPI counts players who brought somebody, over every account and not a page",
    stats.referrerCount >= 12, String(stats.referrerCount));
  ok("6.unpaid · the admin read model carries the same one discriminator", stats.rewardsLive === false);
}

console.log(`\nplayer-invite-unpaid: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
