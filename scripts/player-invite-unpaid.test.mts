/**
 * THE UNPAID PLAYER INVITE — the surface is live, the platform pays nothing (2026-09-25).
 *
 * Ali: *"we don't want to pay anything on affiliate … i want to track how many people he got with
 * this link, i'll pay him cash not through 50pick, and we can keep that option if needed."*
 *
 * Two switches, and this suite exists because the interesting one is the SECOND: `invite` ACTIVE
 * opens the link, the QR, the share sheet and the attribution; the invite's MONEY refuses every
 * PLAYER-programme accrual in `policyFor` while invites are Not payable. Until 2026-09-26 that was
 * the product state `inviteRewards` WITHDRAWN; since then it is the Owner's Payable / Not payable
 * switch on `/admin/affiliate` (`invite-rewards-switch.ts`), Not payable by default and on every
 * failure, under the `inviteRewards` ceiling — and §8 drives it. A feature whose
 * headline promise is a NEGATIVE ("nothing is paid") is the easiest kind to ship broken and the
 * hardest to notice, because the symptom of failure is money quietly moving.
 *
 * ⛔ WHY THE ZERO IS NOT A CONFIG VALUE — §3 is the section that says it (and since 2026-09-26 the
 * zero is the Owner's HMAC-sealed switch, which a hand-edited row cannot turn on — §8). The shipped
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
 * The switch's DATABASE-mode proofs (a container acting on config it booted with) are their own
 * process: `test:invite-payable-db` / `red:invite-payable-db`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf, bonusOf, netAfterWht } from "./lib/agent-fixtures.mts";
import {
  bindRecruit, ensureAffiliateAccount, onRecruitBet, onRecruitSettlement, onRecruitDeposit,
  getPlayerReferralSummary, resolveReferralPreview, getAdminAffiliateStats, inviteViewerFor,
  playerInviteEligibleFor, policyFor, accrualContextFor,
} from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig, setAffiliateConfig, reloadAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";
import { inviteIsLiveFor, inviteRewardsCeiling } from "../src/lib/feature-state.ts";
import {
  playerInvitePayable, playerInvitePayableNow, refreshInvitePayable, composeInvitePayable,
  parseStoredSwitch, sealInviteSwitch, readStoredSwitchFresh, __setInviteSwitchStoreForTests,
  invitePayableView, invitePaysPlayersNow,
  type StoredSwitch,
} from "../src/lib/server/invite-rewards-switch.ts";
import { switchInvitePayable, saveInviteRewardSettings, invitePayableDialogs, INVITE_PAYABLE_WORD } from "../src/lib/server/invite-rewards-ceremony.ts";
import {
  DEFAULT_AFFILIATE_CONFIG, validateAffiliateConfig, sanitizePersistedAffiliateConfig, affiliateConfigFingerprint,
  priceInviteRewards, retiredDepositModes, DEPOSIT_TRIGGER_RETIRED_REASON, DEPOSIT_MILESTONE_RETIRED_REASON,
  changedRewardFields, invitePaysPlayers, cleanReason,
} from "../src/lib/affiliate-rules.ts";
import { settlePaymentWebhook } from "../src/lib/server/wallet-service.ts";
import { signSession } from "../src/lib/server/crypto.ts";
import { getAuditPage, auditFlush, audit } from "../src/lib/server/audit.ts";
import { withLock, inLock } from "../src/lib/server/locks.ts";
import { registerWithPassword } from "../src/lib/server/auth-service.ts";
import { readFileSync } from "node:fs";

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
  prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000, capPerReferrer: 20 },
}, "test-officer");

// ── §1 · THE SURFACE IS LIVE, AND IT IS NOT LIVE FOR EVERYONE ───────────────────────────────
{
  ok("1.state · the shipped product pays a player NOTHING for an invite — the Owner's switch holds no record",
    !playerInvitePayable() && inviteRewardsCeiling().ceiling === "OWNER", JSON.stringify(inviteRewardsCeiling()));

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
    ok("5.state · SETUP — the override really forced payment on (the FORCED ceiling, no stored record needed)",
      playerInvitePayable() && inviteRewardsCeiling().ceiling === "FORCED");
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
  ok("5.restore · the override is restored, not leaked", !playerInvitePayable() && process.env.FEATURE_INVITEREWARDS === undefined);
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

// ── §7 · THE REAL SIGN-UP PATH — the register form's own function, not `bindRecruit` alone ────
// ⭐ ADDED 2026-09-26, the production verification. §2 calls `bindRecruit` directly, and nothing
// anywhere called `registerWithPassword({ referralCode })` — the ONE call the register form makes
// with the hidden `ref` field. So a regression in that hand-off (the bind moved below the session,
// the argument dropped, the try/catch swallowing a throw) would have left every suite green while
// no friend was ever counted. The link and the form's hidden `ref` were measured LIVE on 50pick.tz;
// this closes the last step without creating an account on production.
// ⚠️ The call throws at session creation (no request cookies in a script) — AFTER the bind, which
// runs first (`auth-service.ts`); the account is recovered by phone, the pattern of auth-email-integrity.
{
  const PW = "Str0ng!Passw0rd#2026";
  const signUp = async (phone: string, email: string, referralCode?: string) => {
    try {
      await registerWithPassword({
        phone, email, password: PW, passwordConfirm: PW, dob: "1990-01-01",
        acceptTerms: true, acceptAge: true, marketingOptIn: false, referralCode,
      } as never);
    } catch { /* cookie scope — the bind has already run */ }
    return db.user.findByPhone(phone);
  };

  await mkFixtureUser("piu_signup_ref");
  const code = (await ensureAffiliateAccount("piu_signup_ref")).code;
  const before = (await getPlayerReferralSummary("piu_signup_ref")).recruitCount;

  const friend = await signUp("+255788000701", "piu.signup.friend@example.test", code);
  ok("7.created · the friend's account exists", !!friend);
  ok("7.stamp · ⭐ signing up through the link attributes the friend to the inviter, as PLAYER",
    friend?.recruitedBy === "piu_signup_ref" && friend?.recruitedProgramme === "PLAYER" && friend?.recruitedByCode === code,
    JSON.stringify({ by: friend?.recruitedBy, prog: friend?.recruitedProgramme, code: friend?.recruitedByCode }));
  const after = await getPlayerReferralSummary("piu_signup_ref");
  ok("7.count · ⭐ the inviter's page counts them — the number Ali pays cash from",
    after.recruitCount === before + 1 && after.recruits.length === before + 1, `count ${before} → ${after.recruitCount}`);
  ok("7.unpaid · ⛔ and the inviter is paid nothing for it — no cash, no bonus, no reward row",
    (await cashOf("piu_signup_ref")) === 0 && (await bonusOf("piu_signup_ref")) === 0
      && (await db.referralReward.listByReferrer("piu_signup_ref")).length === 0);

  // CONTROL — the stamp above is caused by the code, not by something every sign-up gets.
  const stranger = await signUp("+255788000702", "piu.signup.stranger@example.test", "NOSUCHCODE");
  ok("7.control · an unknown code attributes nobody, and the sign-up still succeeds",
    !!stranger && !stranger.recruitedBy, JSON.stringify({ by: stranger?.recruitedBy }));
  ok("7.control · …and it does not move the inviter's count",
    (await getPlayerReferralSummary("piu_signup_ref")).recruitCount === before + 1);
}

// ── §8 · THE OWNER SWITCH — "Payable / Not payable", driven rather than read (2026-09-26) ────────
// Ali, on /admin/affiliate: *"let's have 2 options, payable and not payable; if not payable keep
// everything locked."* The zero §2–§7 measure is now the Owner's switch, so this section proves the
// switch the way §4/§5 prove the zero: every refusal sits beside a CONTROL on the same fixtures that
// DOES pay, so a zero here is caused by the switch under test and by nothing else.
//
// ⛔ IN-MEMORY, LIKE THE REST OF THIS SUITE. With no DATABASE_URL the switch's row lives in process
// memory and every read is synchronous and fresh — so the case a deploy creates (another container
// stopping payment behind this one's cache) cannot happen here by itself. The store seam
// `__setInviteSwitchStoreForTests` supplies it: a store this suite controls, written by "another
// container" behind this process's back. The DATABASE-mode proofs (reward settings re-read from their
// row; a stale container's ceremony and Save) are `test:invite-payable-db`, in their own process.
// ⛔ The ceremony asks for no authenticator code (Ali's decision, 2026-09-26), so none is tested here.
{
  const OWNER = "piu8_owner";
  const GROWTH = "piu8_growth";
  const OK_TOTP = { totp: "ok" as const };
  const REASON = "Gaming Board cleared the structure";
  await mkFixtureUser(OWNER, { role: "ADMIN" });
  await mkFixtureUser(GROWTH);
  await db.user.update(GROWTH, { role: "GROWTH" } as never);

  const iso = () => new Date().toISOString();
  const record = (payable: boolean, seq: number) => ({ payable, seq, changedAt: iso(), changedBy: OWNER, reason: REASON });
  /** A record sealed with the REAL secret, fields overridden — a shape the ceremony never writes. */
  const sealedWith = (fields: Record<string, unknown>) => ({
    token: signSession({ purpose: "invite.rewards.switch", v: 1, payable: true, seq: 1, changedAt: iso(), changedBy: OWNER, reason: REASON, ...fields }),
  });
  type Ctx = Awaited<ReturnType<typeof accrualContextFor>>;
  const refusedWithdrawn = (r: Ctx) => !r.ok && r.refusal === "player_rewards_withdrawn";
  const said = (r: Ctx) => (r.ok ? "RESOLVED — it would pay" : r.refusal);
  const rowsOf = async (ref: string, type: string) => (await db.referralReward.listByReferrer(ref)).filter((r) => r.type === type);
  const auditsNamed = async (action: string) => { await auditFlush(); return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action); };
  const on = (over: Record<string, unknown> = {}) =>
    ({ to: "PAYABLE" as const, reason: REASON, typed: INVITE_PAYABLE_WORD, start: "NOTHING" as const, expectSeq: 0, ...over }) as never;
  const cfgNow = () => JSON.stringify(getAffiliateConfig());
  /**
   * ⭐ THE REWARD SAVE, POSTED THE WAY THE PAGE POSTS IT (review P3, 2026-09-26): the FINGERPRINT of the
   * settings the page loaded — re-read from their row first, as `page.tsx` does before it fingerprints —
   * and only the fields being changed. A post without a matching base is refused (8.twotab).
   */
  const saveAs = async (changes: unknown, who: string) => {
    const base = await reloadAffiliateConfig();
    const baseFingerprint = affiliateConfigFingerprint(base.ok ? base.config : getAffiliateConfig());
    return saveInviteRewardSettings({ baseFingerprint, changes } as never, who);
  };
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const SESSION_ENDED = "Your session ended — sign in again. Nothing changed.";
  const OUTCOME_UNKNOWN = "Outcome unknown — reload to see the current state.";
  const SETTINGS_MOVED = "These settings changed since this page loaded — reload to see them.";
  /** The audit ring, OLDEST first — the order the rows were written in. */
  const trail = async () => { await auditFlush(); return getAuditPage({ limit: 10_000 }).reverse(); };

  // ⭐ THE CONFIG WOULD PAY on every hook this section drives — a settlement's commission, a first
  // bet's prize, and (8.fresh.bonus, switched on there) the sign-up bonus — so every refusal below is
  // a DELTA, never the shipped defaults. The sign-up bonus starts OFF, so binding a fixture reads nothing.
  // ⛔ No deposit-triggered mode is armed anywhere in §8 (they are being removed from the product).
  setAffiliateConfig({
    enabled: true,
    commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
    bonus: { enabled: false, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "SIGNUP" },
    prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000, capPerReferrer: 20 },
  }, "test-officer");

  // Every pair is bound up front, while Not payable, so no bind reads the switch in the middle of a case.
  __setInviteSwitchStoreForTests(null);
  const pairs: Record<string, { ref: string; rec: string }> = {};
  for (const tag of ["def", "mal", "unread", "comm", "prize", "paid", "cash", "kill", "forced", "dep", "depaudit", "payerp", "funda", "fundb", "ilpc", "ilp", "ilcc", "ilc"]) {
    const ref = `piu8_${tag}_ref`, rec = `piu8_${tag}_rec`;
    await mkFixtureUser(ref);
    await mkFixtureUser(rec);
    const b = await bindRecruit({ recruitUserId: rec, code: (await ensureAffiliateAccount(ref)).code });
    ok(`8.fixture.${tag} · SETUP — the pair binds, stamped PLAYER`, b.bound === true && (await db.user.findById(rec))?.recruitedProgramme === "PLAYER", JSON.stringify(b));
    pairs[tag] = { ref, rec };
  }
  // …except the SIGN-UP pairs: the bind itself is the event those cases drive, so they bind later.
  const signups: Record<string, { ref: string; rec: string; code: string }> = {};
  for (const tag of ["signup", "signupstop", "depsu", "payerb", "ilbc", "ilb"]) {
    const ref = `piu8_${tag}_ref`, rec = `piu8_${tag}_rec`;
    await mkFixtureUser(ref);
    await mkFixtureUser(rec);
    signups[tag] = { ref, rec, code: (await ensureAffiliateAccount(ref)).code };
  }

  // ⭐ "ANOTHER CONTAINER" — a store behind this process's cache. `row` is what the database holds.
  let row: unknown = null;
  let loads = 0;
  let failReads = false;
  /** Reads past this count see a Stop paying written elsewhere — a stop landing between two reads. */
  let stopAfter = Number.POSITIVE_INFINITY;
  /** Run `onRead` DURING read number `onReadAt` — a config changing between a hook's check and its payer's read. */
  let onReadAt = Number.POSITIVE_INFINITY;
  let onRead: (() => void) | null = null;
  /**
   * ⚠️ When set, a read made INSIDE a payer's lock sees THIS row instead. Since 2026-09-26 every payer
   * re-reads the switch inside its lock before the credit (review P6), and that last read would also catch
   * a stop the case plants for an EARLIER read — so a case proving an earlier read holds the in-lock read
   * at ON, and the earlier read is then the only one that can refuse. 8.inlock proves the in-lock read itself.
   */
  let inLockRow: unknown = undefined;
  /** The next read is slow: it sees the row as it was when it STARTED, and answers `ms` later. */
  let slowNext = 0;
  /** Writes are acknowledged and DROPPED — the row keeps its old value. */
  let dropSaves = false;
  /** Once the next write lands, every read fails: an outcome that cannot be read back. */
  let failReadsAfterSave = false;
  const otherContainer = {
    hasDatabase: () => true,
    loadConfigResult: async (_key: string) => {
      loads++;
      if (loads === onReadAt && onRead) { const f = onRead; onRead = null; onReadAt = Number.POSITIVE_INFINITY; f(); }
      if (failReads) return { ok: false as const, error: "simulated: pool timeout" };
      const value = inLockRow !== undefined && inLock() ? inLockRow : loads > stopAfter ? sealInviteSwitch(record(false, 99)) : row;
      const seen = value == null ? null : JSON.parse(JSON.stringify(value));
      if (slowNext > 0) { const ms = slowNext; slowNext = 0; await sleep(ms); }
      return { ok: true as const, value: seen };
    },
    saveConfig: async (_key: string, value: unknown) => {
      if (!dropSaves) row = JSON.parse(JSON.stringify(value));
      if (failReadsAfterSave) failReads = true;
    },
  };

  // ── 8.default · no row at all: Not payable, and the accrual writes nothing ──
  {
    const p = pairs.def;
    const stored = await readStoredSwitchFresh();
    const ctx = await accrualContextFor(p.rec);
    ok("8.default.refused · no stored switch row: ABSENT, and the accrual is refused player_rewards_withdrawn",
      stored.kind === "ABSENT" && refusedWithdrawn(ctx), JSON.stringify({ stored, ctx: said(ctx) }));
    await onRecruitBet(p.rec, { stake: 25_000, houseBotId: null });
    await onRecruitSettlement(p.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_def", positionId: posId(), houseBotId: null });
    const rows = await db.referralReward.listByReferrer(p.ref);
    ok("8.default.rows · …and a qualifying first bet and a settlement write ZERO reward rows — cash 0, bonus 0",
      rows.length === 0 && (await cashOf(p.ref)) === 0 && (await bonusOf(p.ref)) === 0,
      JSON.stringify({ rows: rows.map((r) => [r.type, r.status, r.amountTzs]), cash: await cashOf(p.ref) }));
  }

  // ── 8.truth · the whole table, env × stored, through the money path's own reader ──
  {
    __setInviteSwitchStoreForTests(otherContainer);
    const STORED: Record<string, () => void> = {
      "SET true": () => { failReads = false; row = sealInviteSwitch(record(true, 1)); },
      "SET false": () => { failReads = false; row = sealInviteSwitch(record(false, 1)); },
      ABSENT: () => { failReads = false; row = null; },
      MALFORMED: () => { failReads = false; row = sealedWith({ payable: "true" }); },
      UNREAD: () => { failReads = true; },
    };
    const names = Object.keys(STORED);
    const rowFor = async (env: string | undefined) => {
      if (env === undefined) delete process.env.FEATURE_INVITEREWARDS; else process.env.FEATURE_INVITEREWARDS = env;
      const out: Record<string, boolean> = {};
      for (const [name, set] of Object.entries(STORED)) { set(); out[name] = await refreshInvitePayable(); }
      return out;
    };
    try {
      const forced = await rowFor("ACTIVE");
      ok("8.truth.forced · FEATURE_INVITEREWARDS=ACTIVE → FORCED: pays on SET true, SET false, ABSENT, MALFORMED and UNREAD",
        names.every((n) => forced[n] === true), JSON.stringify(forced));
      const closed = await rowFor("WITHDRAWN");
      ok("8.truth.closed · FEATURE_INVITEREWARDS=WITHDRAWN → CLOSED: pays on none of them",
        names.every((n) => closed[n] === false), JSON.stringify(closed));
      const owner = await rowFor(undefined);
      ok("8.truth.owner · unset → the Owner decides: pays ONLY on a sealed SET true",
        owner["SET true"] === true && names.filter((n) => n !== "SET true").every((n) => owner[n] === false), JSON.stringify(owner));
      const typo = await rowFor("active");
      ok("8.truth.typo · an unrecognised value (\"active\") behaves exactly like unset — a typo can neither force payment nor lift the kill",
        names.every((n) => typo[n] === owner[n]), JSON.stringify(typo));
    } finally {
      delete process.env.FEATURE_INVITEREWARDS;
      failReads = false;
    }
    // The code-constant row (`PRODUCT_STATE.inviteRewards` WITHDRAWN → CLOSED) cannot be driven from a
    // suite, so the composition is asserted directly for every ceiling — an unknown one included.
    const KINDS: Record<string, StoredSwitch> = {
      "SET true": { kind: "SET", ...record(true, 1) }, "SET false": { kind: "SET", ...record(false, 1) },
      ABSENT: { kind: "ABSENT" }, MALFORMED: { kind: "MALFORMED", why: "x" }, UNREAD: { kind: "UNREAD" },
    };
    const grid = Object.fromEntries(["FORCED", "OWNER", "CLOSED", "BOGUS"].map((c) =>
      [c, Object.entries(KINDS).filter(([, s]) => composeInvitePayable(c as never, s)).map(([n]) => n)]));
    ok("8.truth.compose · composeInvitePayable: FORCED always, OWNER only on SET true, CLOSED never (the code constant's row), an unknown ceiling never",
      grid.FORCED.length === 5 && JSON.stringify(grid.OWNER) === JSON.stringify(["SET true"]) && grid.CLOSED.length === 0 && grid.BOGUS.length === 0,
      JSON.stringify(grid));
  }

  // ── 8.malformed · a row short of a correctly sealed record is MALFORMED, and pays nothing ──
  // ⭐ ASSERTED AT THE PARSE, NOT ONLY AT THE PAYOUT. `composeInvitePayable` pays only on `payable ===
  // true`, so a parser that let the string "true" through as a SET record would still pay nothing today
  // — and would pay the day anyone "helpfully" coerced it. The parse is the line under test.
  {
    __setInviteSwitchStoreForTests(otherContainer);
    const p = pairs.mal;
    row = sealInviteSwitch(record(true, 1));
    const control = await accrualContextFor(p.rec);
    ok("8.malformed.control · CONTROL — a correctly sealed ON record resolves the SAME accrual, so each refusal below is the row's",
      control.ok === true, JSON.stringify(said(control)));
    const onToken = sealInviteSwitch(record(true, 1)).token;
    const offToken = sealInviteSwitch(record(false, 1)).token;
    const CASES: Array<[string, string, unknown]> = [
      ["string", "a SEALED record whose payable is the string \"true\"", sealedWith({ payable: "true" })],
      ["number", "a SEALED record whose payable is the number 1", sealedWith({ payable: 1 })],
      ["unsigned", "the record's fields stored without a seal", record(true, 1)],
      ["purpose", "a record sealed for another purpose", sealedWith({ purpose: "login-2fa" })],
      ["token", "a hand-edited token — an ON payload under an OFF record's signature", { token: `${onToken.split(".")[0]}.${offToken.split(".")[1]}` }],
    ];
    for (const [key, what, raw] of CASES) {
      row = raw;
      const parsed = parseStoredSwitch(raw);
      const ctx = await accrualContextFor(p.rec);
      ok(`8.malformed.${key} · ${what} parses MALFORMED, and the accrual is refused`,
        parsed.kind === "MALFORMED" && refusedWithdrawn(ctx) && !playerInvitePayable(),
        JSON.stringify({ parsed, ctx: said(ctx) }));
    }
  }

  // ── 8.unread · a store that fails after ON is Not payable — never the last good answer ──
  {
    __setInviteSwitchStoreForTests(otherContainer);
    const p = pairs.unread;
    row = sealInviteSwitch(record(true, 1));
    const before = await accrualContextFor(p.rec);
    ok("8.unread.on · CONTROL — the store answers ON: the accrual resolves", before.ok === true, JSON.stringify(said(before)));
    failReads = true;
    const after = await accrualContextFor(p.rec);
    ok("8.unread.fail · the store then FAILS: the accrual is refused and the snapshot is Not payable, never the last ON it read",
      refusedWithdrawn(after) && !playerInvitePayable(), JSON.stringify(said(after)));
    failReads = false;
  }

  // ── 8.fresh · Stop paying pressed in ANOTHER container is obeyed by the next accrual HERE ──
  // ⭐ THE COMMISSION HOOK CARRIES 8.fresh.commission, ON PURPOSE: a settlement's ONLY fresh read BEFORE its
  // lock is `accrualContextFor`'s. A prize is also refused by its payer's own fresh read, which would hide a
  // first read that had gone — so the prize gets its own case (a stop landing BETWEEN the two reads), and so
  // does the sign-up bonus, whose payer's read is the only one before its lock.
  // ⚠️ Every payer also re-reads INSIDE its lock (8.inlock), which would catch each stop below on its own —
  // so while each refusal is measured, `inLockRow` holds that last read at ON: the read under test is then
  // the only one that can refuse, and a case still goes red if it is removed.
  {
    __setInviteSwitchStoreForTests(otherContainer);
    const p = pairs.comm;
    row = sealInviteSwitch(record(true, 1));
    await onRecruitSettlement(p.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_fresh_1", positionId: posId(), houseBotId: null });
    const paid = await rowsOf(p.ref, "COMMISSION");
    ok("8.fresh.control · CONTROL — with the row ON a settlement pays the inviter 50% of a TZS 10,000 net fee, in CASH",
      paid.length === 1 && paid[0].status === "PAID" && paid[0].amountTzs === 5_000 && (await cashOf(p.ref)) === 5_000 && (await bonusOf(p.ref)) === 0,
      JSON.stringify({ rows: paid.map((r) => [r.status, r.amountTzs]), cash: await cashOf(p.ref), bonus: await bonusOf(p.ref) }));
    await refreshInvitePayable();              // this container's snapshot: payable, and fresh…
    row = sealInviteSwitch(record(false, 2));  // …and another container stops payment behind it
    ok("8.fresh.setup · SETUP — this container's snapshot still says payable while the row says Not payable",
      playerInvitePayable() === true);
    const rowsBefore = (await rowsOf(p.ref, "COMMISSION")).length;
    const cashBefore = await cashOf(p.ref);
    inLockRow = sealInviteSwitch(record(true, 1));
    try {
      await onRecruitSettlement(p.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_fresh_2", positionId: posId(), houseBotId: null });
    } finally {
      inLockRow = undefined;
    }
    ok("8.fresh.commission · ⛔ the next settlement re-reads the row and is REFUSED: no new commission row, no new cash",
      (await rowsOf(p.ref, "COMMISSION")).length === rowsBefore && (await cashOf(p.ref)) === cashBefore,
      JSON.stringify({ rows: `${rowsBefore} → ${(await rowsOf(p.ref, "COMMISSION")).length}`, cash: `${cashBefore} → ${await cashOf(p.ref)}` }));

    // payPrize's own read: the stop lands AFTER the accrual's read and BEFORE the payer's.
    row = sealInviteSwitch(record(true, 3));
    await onRecruitBet(pairs.paid.rec, { stake: 25_000, houseBotId: null });
    const prize = await rowsOf(pairs.paid.ref, "PRIZE");
    ok("8.fresh.paid · CONTROL — with the row ON a first bet pays ONE prize of TZS 10,000, in CASH",
      prize.length === 1 && prize[0].status === "PAID" && prize[0].amountTzs === 10_000 && (await cashOf(pairs.paid.ref)) === 10_000,
      JSON.stringify({ prize: prize.map((r) => [r.status, r.amountTzs]), cash: await cashOf(pairs.paid.ref) }));
    stopAfter = loads + 1;
    inLockRow = sealInviteSwitch(record(true, 3));
    try {
      await onRecruitBet(pairs.prize.rec, { stake: 25_000, houseBotId: null });
    } finally {
      stopAfter = Number.POSITIVE_INFINITY;
      inLockRow = undefined;
    }
    ok("8.fresh.prize · ⛔ a stop landing between the accrual's read and the prize's own read pays NO prize",
      (await rowsOf(pairs.prize.ref, "PRIZE")).length === 0 && (await cashOf(pairs.prize.ref)) === 0,
      JSON.stringify({ prize: (await rowsOf(pairs.prize.ref, "PRIZE")).length, cash: await cashOf(pairs.prize.ref) }));

    // payBonus's own read. ⭐ The SIGN-UP bonus reaches `payBonus` straight from `bindRecruit`, with no
    // accrual read before it, so the payer's read is the ONLY one on this path: a stop written behind
    // this container's cache must be caught there or nowhere.
    setAffiliateConfig({ bonus: { enabled: true, recipient: "REFERRER", referrerAmountTzs: 5_000, trigger: "SIGNUP" } }, "test-officer");
    row = sealInviteSwitch(record(true, 4));
    const su = signups.signup;
    const b1 = await bindRecruit({ recruitUserId: su.rec, code: su.code });
    const bonus = await rowsOf(su.ref, "BONUS");
    ok("8.fresh.signup · CONTROL — with the row ON a friend signing up with the link pays the inviter's TZS 5,000 bonus, in CASH",
      b1.bound === true && bonus.length === 1 && bonus[0].status === "PAID" && bonus[0].amountTzs === 5_000 && (await cashOf(su.ref)) === 5_000,
      JSON.stringify({ b1, bonus: bonus.map((r) => [r.status, r.amountTzs]), cash: await cashOf(su.ref) }));
    await refreshInvitePayable();              // this container's snapshot: payable, and fresh…
    row = sealInviteSwitch(record(false, 5));  // …and another container stops payment behind it
    const ss = signups.signupstop;
    inLockRow = sealInviteSwitch(record(true, 4));
    let b2: Awaited<ReturnType<typeof bindRecruit>>;
    try {
      b2 = await bindRecruit({ recruitUserId: ss.rec, code: ss.code });
    } finally {
      inLockRow = undefined;
    }
    ok("8.fresh.bonus · ⛔ a friend who signs up after a stop written elsewhere is still counted — and pays NO bonus: payBonus re-reads the row",
      b2.bound === true && (await rowsOf(ss.ref, "BONUS")).length === 0 && (await cashOf(ss.ref)) === 0,
      JSON.stringify({ b2, bonus: (await rowsOf(ss.ref, "BONUS")).length, cash: await cashOf(ss.ref) }));
    setAffiliateConfig({ bonus: { enabled: false } }, "test-officer");
  }

  // ── 8.inlock · a Stop paying that lands while a payer WAITS ON ITS LOCK is obeyed at the credit ──
  // Review P6 (2026-09-26): a payer that passed its fresh read and then queued on its per-referrer lock
  // credited the reward after the Owner's Stop had landed. Every payer now re-reads the switch INSIDE its
  // lock, just before the credit (`confirmInvitePayableNow`). Proven with the REAL lock: this suite holds the
  // payer's own lock key, starts the payer (its every read before the lock sees ON), lands a real Stop
  // paying through the ceremony while it waits, then lets go. ⭐ Each hook has its CONTROL — the same hold
  // and release with no stop pays — so each zero is the Stop's, never the harness's.
  {
    __setInviteSwitchStoreForTests(otherContainer);
    setAffiliateConfig({ bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "SIGNUP" } }, "test-officer");
    const creditRefusals = async (hook: string) => (await auditsNamed("affiliate.accrual_refused")).filter((e) => {
      const q = (e.payload ?? {}) as { refusal?: string; hook?: string; stage?: string };
      return q.refusal === "player_rewards_withdrawn" && q.hook === hook && q.stage === "credit";
    });
    /** Hold `key`, start the payer behind it, run `during` while it waits, let go, and wait for both. */
    const whileLockHeld = async (key: string, payer: () => Promise<unknown>, during: (() => Promise<unknown>) | null) => {
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      let entered!: () => void;
      const holding = new Promise<void>((r) => { entered = r; });
      const holder = withLock(key, async () => { entered(); await gate; });
      await holding;
      const readsBefore = loads;
      const running = payer();
      await sleep(40);                         // every read before the lock has run; the payer now waits on it
      const readBeforeLock = loads > readsBefore;
      const stopped = during ? await during() : null;
      release();
      await holder;
      await running;
      return { stopped, readBeforeLock };
    };
    let seqAt = 10;
    const armed = () => { seqAt += 2; row = sealInviteSwitch(record(true, seqAt)); return seqAt; };
    const stopNow = (expectSeq: number) => () => switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Stop while a payer waits", expectSeq }, OK_TOTP);
    const landed = (s: unknown) => (s as { ok?: boolean; changed?: boolean } | null)?.ok === true && (s as { changed?: boolean }).changed === true;

    // prize — CONTROL, then the Stop
    armed();
    const pc = await whileLockHeld(`referral:prize:${pairs.ilpc.ref}`, () => onRecruitBet(pairs.ilpc.rec, { stake: 25_000, houseBotId: null }), null);
    ok("8.inlock.control.prize · CONTROL — the payer held on its lock and released, no stop: the prize is paid (TZS 10,000, CASH)",
      pc.readBeforeLock && (await rowsOf(pairs.ilpc.ref, "PRIZE")).length === 1 && (await cashOf(pairs.ilpc.ref)) === 10_000, JSON.stringify({ pc, cash: await cashOf(pairs.ilpc.ref) }));
    let refused0 = (await creditRefusals("prize")).length;
    const ps = await whileLockHeld(`referral:prize:${pairs.ilp.ref}`, () => onRecruitBet(pairs.ilp.rec, { stake: 25_000, houseBotId: null }), stopNow(armed()));
    ok("8.inlock.prize · ⛔ the Stop landed while the prize payer waited on its lock → NO prize row, NO cash; audited player_rewards_withdrawn, hook prize, stage credit",
      ps.readBeforeLock && landed(ps.stopped) && (await rowsOf(pairs.ilp.ref, "PRIZE")).length === 0 && (await cashOf(pairs.ilp.ref)) === 0
        && (await creditRefusals("prize")).length === refused0 + 1,
      JSON.stringify({ ps, prize: (await rowsOf(pairs.ilp.ref, "PRIZE")).length, cash: await cashOf(pairs.ilp.ref) }));

    // commission — CONTROL, then the Stop
    armed();
    const cc = await whileLockHeld(`referral:commission:${pairs.ilcc.ref}:${pairs.ilcc.rec}`, () => onRecruitSettlement(pairs.ilcc.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_il_1", positionId: posId(), houseBotId: null }), null);
    ok("8.inlock.control.commission · CONTROL — held and released, no stop: 50% of a TZS 10,000 net fee is paid",
      cc.readBeforeLock && (await rowsOf(pairs.ilcc.ref, "COMMISSION")).length === 1 && (await cashOf(pairs.ilcc.ref)) === 5_000, JSON.stringify({ cc, cash: await cashOf(pairs.ilcc.ref) }));
    refused0 = (await creditRefusals("settlement")).length;
    const cs = await whileLockHeld(`referral:commission:${pairs.ilc.ref}:${pairs.ilc.rec}`, () => onRecruitSettlement(pairs.ilc.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_il_2", positionId: posId(), houseBotId: null }), stopNow(armed()));
    ok("8.inlock.commission · ⛔ the Stop landed while the commission payer waited → NO commission row, NO cash; audited, hook settlement, stage credit",
      cs.readBeforeLock && landed(cs.stopped) && (await rowsOf(pairs.ilc.ref, "COMMISSION")).length === 0 && (await cashOf(pairs.ilc.ref)) === 0
        && (await creditRefusals("settlement")).length === refused0 + 1,
      JSON.stringify({ cs, rows: (await rowsOf(pairs.ilc.ref, "COMMISSION")).length, cash: await cashOf(pairs.ilc.ref) }));

    // the sign-up bonus, to BOTH — CONTROL, then the Stop (one refusal per recipient)
    armed();
    const bcSig = signups.ilbc;
    const bc = await whileLockHeld(`referral:reward:${bcSig.rec}`, () => bindRecruit({ recruitUserId: bcSig.rec, code: bcSig.code }), null);
    ok("8.inlock.control.bonus · CONTROL — held and released, no stop: the sign-up pays BOTH bonuses (inviter TZS 5,000, friend TZS 2,000)",
      bc.readBeforeLock && (await db.referralReward.listByRecruit(bcSig.rec)).filter((r) => r.type === "BONUS" && r.status === "PAID").length === 2
        && (await cashOf(bcSig.ref)) === 5_000 && (await cashOf(bcSig.rec)) === 2_000, JSON.stringify({ bc, ref: await cashOf(bcSig.ref), rec: await cashOf(bcSig.rec) }));
    refused0 = (await creditRefusals("bonus")).length;
    const bsSig = signups.ilb;
    const bs = await whileLockHeld(`referral:reward:${bsSig.rec}`, () => bindRecruit({ recruitUserId: bsSig.rec, code: bsSig.code }), stopNow(armed()));
    const bonusRefusals = (await creditRefusals("bonus")).slice(0, (await creditRefusals("bonus")).length - refused0);
    ok("8.inlock.bonus · ⛔ the Stop landed while the bonus payer waited → the friend is counted, NO bonus to either, and one refusal per recipient (new, referrer), stage credit",
      bs.readBeforeLock && landed(bs.stopped) && (await db.user.findById(bsSig.rec))?.recruitedBy === bsSig.ref
        && (await db.referralReward.listByRecruit(bsSig.rec)).length === 0 && (await cashOf(bsSig.ref)) === 0 && (await cashOf(bsSig.rec)) === 0
        && bonusRefusals.length === 2 && JSON.stringify(bonusRefusals.map((e) => (e.payload as { recipient?: string }).recipient).sort()) === JSON.stringify(["new", "referrer"]),
      JSON.stringify({ bs, refusals: bonusRefusals.map((e) => e.payload) }));
    setAffiliateConfig({ bonus: { enabled: false } }, "test-officer");
  }

  // ── 8.retired · deposit-tied rewards are RETIRED (Ali, 2026-09-26) ──────────────────────────────────
  // The published Responsible Gambling policy promises "No bonus offers tied to deposit increases", and the
  // FIRST_DEPOSIT bonus and the DEPOSIT_THRESHOLD prize were exactly that. So each is refused on save (in the
  // policy's words), switched OFF on load, never priced and never paid — and the two modes that stay (the
  // SIGN-UP bonus, the FIRST_BET prize) are the CONTROLS, on the same payable path, so every zero here is the
  // retirement's and not a payer that cannot pay. Still behind the store seam: payable, and changeable mid-read.
  {
    __setInviteSwitchStoreForTests(otherContainer);
    row = sealInviteSwitch(record(true, 6));
    const RG = "No bonus offers tied to deposit increases";
    const D = DEFAULT_AFFILIATE_CONFIG;
    const reg = (globalThis as { __50PICK_CONFIGS?: Map<string, unknown> }).__50PICK_CONFIGS!;
    const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
    let depositN = 0;
    /** A REAL deposit: a PROCESSING DEPOSIT row confirmed through the payment webhook, which then calls the hook. */
    const realDeposit = async (userId: string, amount: number) => {
      const wallet = await db.wallet.findByUserId(userId);
      const at = iso();
      const ref = `piu8_dep_${++depositN}`;
      await db.txn.create({
        id: `txn_${ref}`, walletId: wallet!.id, userId, type: "DEPOSIT", status: "PROCESSING", amount, fee: 0, taxWithheld: 0,
        balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: ref, msisdn: null, description: "deposit",
        positionId: null, amlReason: null, createdAt: at, updatedAt: at, completedAt: null,
      } as never);
      return settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED" });
    };
    const retiredRefusals = async () => auditsNamed("affiliate.accrual_refused").then((rows) =>
      rows.filter((e) => (e.payload as { refusal?: string } | undefined)?.refusal === "player_deposit_trigger_retired"));
    const rewardsTo = async (ref: string) => db.referralReward.listByReferrer(ref);

    // Refused on save — in the policy's own words — by the officer's Save and by the rule itself.
    const beforeSave = cfgNow();
    const sb = await saveAs({ bonus: { enabled: true, trigger: "FIRST_DEPOSIT" } }, GROWTH);
    const vb = validateAffiliateConfig({ ...D, bonus: { ...D.bonus, trigger: "FIRST_DEPOSIT" } });
    ok("8.retired.trigger · a bonus on FIRST_DEPOSIT is refused by the Save and by the rule, quoting the RG policy — and nothing is saved",
      !sb.ok && sb.error === DEPOSIT_TRIGGER_RETIRED_REASON && sb.error.includes(RG) && !vb.ok && vb.field === "bonus.trigger"
        && vb.reason === DEPOSIT_TRIGGER_RETIRED_REASON && cfgNow() === beforeSave, JSON.stringify({ sb, vb }));
    const sp = await saveAs({ prize: { milestone: "DEPOSIT_THRESHOLD" } }, GROWTH);
    const vp = validateAffiliateConfig({ ...D, prize: { ...D.prize, milestone: "DEPOSIT_THRESHOLD" } });
    ok("8.retired.milestone · a prize on DEPOSIT_THRESHOLD is refused by the Save and by the rule, quoting the RG policy — and nothing is saved",
      !sp.ok && sp.error === DEPOSIT_MILESTONE_RETIRED_REASON && sp.error.includes(RG) && !vp.ok && vp.field === "prize.milestone"
        && vp.reason === DEPOSIT_MILESTONE_RETIRED_REASON && cfgNow() === beforeSave, JSON.stringify({ sp, vp }));

    // Switched OFF on load: a stale row that still arms both loads with both modes OFF — never re-pointed at the
    // modes that stay — and the rest of the officer's row stands.
    const staleRow = {
      enabled: true,
      commission: { enabled: true, rate: 0.2, windowMonths: 12, capPerRecruitTzs: 100_000 },
      bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "FIRST_DEPOSIT" },
      prize: { enabled: true, milestone: "DEPOSIT_THRESHOLD", depositThresholdTzs: 10_000, amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
    };
    const loaded = sanitizePersistedAffiliateConfig(staleRow);
    const rowSays = retiredDepositModes(staleRow), loadedSays = retiredDepositModes(loaded);
    ok("8.retired.load · a stored row arming FIRST_DEPOSIT and DEPOSIT_THRESHOLD loads with BOTH modes OFF (not a sign-up bonus, not a first-bet prize), the rest of the row kept, the dead threshold dropped",
      loaded.bonus.enabled === false && loaded.prize.enabled === false && loaded.bonus.referrerAmountTzs === 5_000 && loaded.prize.amountTzs === 10_000
        && loaded.commission.enabled === true && loaded.commission.rate === 0.2 && !has(loaded.prize, "depositThresholdTzs")
        && validateAffiliateConfig(loaded).ok === true && rowSays.bonus && rowSays.prize && !loadedSays.bonus && !loadedSays.prize,
      JSON.stringify({ loaded, rowSays, loadedSays }));

    // Never priced: a retired mode gets no line; the same mode on the choice that stays does.
    const off = { ...D, enabled: true, commission: { ...D.commission, enabled: false }, bonus: { ...D.bonus, enabled: false }, prize: { ...D.prize, enabled: false } };
    const priced = (cfg: unknown) => priceInviteRewards(cfg as never, { destination: "CASH", rosterRecruitsPerInviter: [3] });
    const pRetiredBonus = priced({ ...off, bonus: { ...D.bonus, enabled: true, referrerAmountTzs: 5_000, trigger: "FIRST_DEPOSIT" } });
    const pSignupBonus = priced({ ...off, bonus: { ...D.bonus, enabled: true, referrerAmountTzs: 5_000, trigger: "SIGNUP" } });
    ok("8.retired.price.bonus · a bonus armed on FIRST_DEPOSIT is priced as NOTHING; the same bonus on SIGNUP gets its line",
      pRetiredBonus.nothingPays && pRetiredBonus.lines.length === 0 && pSignupBonus.lines.length === 1, JSON.stringify({ retired: pRetiredBonus.lines, signup: pSignupBonus.lines }));
    const pRetiredPrize = priced({ ...off, prize: { ...D.prize, enabled: true, milestone: "DEPOSIT_THRESHOLD", amountTzs: 10_000 } });
    const pFirstBetPrize = priced({ ...off, prize: { ...D.prize, enabled: true, milestone: "FIRST_BET", amountTzs: 10_000 } });
    ok("8.retired.price.prize · a prize armed on DEPOSIT_THRESHOLD is priced as NOTHING; the same prize on FIRST_BET gets its line",
      pRetiredPrize.nothingPays && pRetiredPrize.lines.length === 0 && pFirstBetPrize.lines.length === 1, JSON.stringify({ retired: pRetiredPrize.lines, firstBet: pFirstBetPrize.lines }));

    // Never paid: with the SIGN-UP bonus and the FIRST_BET prize ARMED and paying, a real deposit pays nothing.
    setAffiliateConfig({
      bonus: { enabled: true, recipient: "REFERRER", referrerAmountTzs: 5_000, trigger: "SIGNUP" },
      prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000 },
    }, "test-officer");
    const su = signups.depsu;
    const joined = await bindRecruit({ recruitUserId: su.rec, code: su.code });
    ok("8.retired.signup · CONTROL — the SIGN-UP bonus stays: a friend joining with the link pays the inviter TZS 5,000, in CASH",
      joined.bound === true && (await rowsOf(su.ref, "BONUS")).length === 1 && (await cashOf(su.ref)) === 5_000, JSON.stringify({ joined, cash: await cashOf(su.ref) }));
    const dp = pairs.dep;
    const settled = await realDeposit(dp.rec, 7_000);
    ok("8.retired.deposit.zero · ⛔ a REAL deposit (confirmed through the payment webhook) pays the inviter NOTHING — no reward row, no cash — with both paying modes armed",
      settled.handled === true && (await rewardsTo(dp.ref)).length === 0 && (await cashOf(dp.ref)) === 0,
      JSON.stringify({ settled, rewards: (await rewardsTo(dp.ref)).map((r) => [r.type, r.amountTzs]), cash: await cashOf(dp.ref) }));
    await onRecruitBet(dp.rec, { stake: 25_000, houseBotId: null });
    ok("8.retired.firstbet · CONTROL — the FIRST_BET prize stays: the same friend's first bet pays the inviter TZS 10,000, in CASH",
      (await rowsOf(dp.ref, "PRIZE")).length === 1 && (await cashOf(dp.ref)) === 10_000, JSON.stringify({ cash: await cashOf(dp.ref) }));

    // Refused out loud: a retired mode still ARMED in the config in hand (it bypassed the load's repair) makes the
    // deposit write player_deposit_trigger_retired — and still pay nothing.
    const valid = reg.get("affiliate.config");
    const inHand = getAffiliateConfig();
    const withRetired = { ...inHand, bonus: { ...inHand.bonus, enabled: true, trigger: "FIRST_DEPOSIT" }, prize: { ...inHand.prize, enabled: true, milestone: "DEPOSIT_THRESHOLD" } };
    const da = pairs.depaudit;
    const refused0 = (await retiredRefusals()).length;
    reg.set("affiliate.config", withRetired);
    try {
      await realDeposit(da.rec, 8_000);
    } finally {
      reg.set("affiliate.config", valid);
    }
    const refusedRows = await retiredRefusals();
    const latest = refusedRows[0]?.payload as { hook?: string; bonusOnDeposit?: boolean; prizeOnDeposit?: boolean; cumulativeDepositsTzs?: number } | undefined;
    ok("8.retired.deposit.audit · a retired mode left ARMED in hand: the deposit is refused out loud — player_deposit_trigger_retired {hook deposit, bonusOnDeposit, prizeOnDeposit, cumulativeDepositsTzs} — and pays nothing",
      refusedRows.length === refused0 + 1 && latest?.hook === "deposit" && latest?.bonusOnDeposit === true && latest?.prizeOnDeposit === true
        && latest?.cumulativeDepositsTzs === 8_000 && (await rewardsTo(da.ref)).length === 0 && (await cashOf(da.ref)) === 0,
      JSON.stringify({ rows: refusedRows.length - refused0, latest }));

    // Each PAYER refuses a retired mode that reaches it: the config changes to one between the hook's own check
    // (which passed) and the payer's read — the belt under the check.
    const pb = signups.payerb;
    const bonusRefused0 = (await retiredRefusals()).length;
    onReadAt = loads + 1; // the sign-up bonus's only read: payBonus's own
    onRead = () => { reg.set("affiliate.config", { ...inHand, bonus: { ...inHand.bonus, enabled: true, trigger: "FIRST_DEPOSIT" } }); };
    let joinedB: Awaited<ReturnType<typeof bindRecruit>>;
    try {
      joinedB = await bindRecruit({ recruitUserId: pb.rec, code: pb.code });
    } finally {
      reg.set("affiliate.config", valid);
      onRead = null; onReadAt = Number.POSITIVE_INFINITY;
    }
    const bonusRefusals = await retiredRefusals();
    ok("8.retired.payer.bonus · payBonus refuses a FIRST_DEPOSIT bonus that reached it after the bind's check — audited (hook bonus), nothing paid, the friend still counted",
      joinedB.bound === true && (await rowsOf(pb.ref, "BONUS")).length === 0 && (await cashOf(pb.ref)) === 0
        && bonusRefusals.length === bonusRefused0 + 1 && (bonusRefusals[0]?.payload as { hook?: string } | undefined)?.hook === "bonus",
      JSON.stringify({ joinedB, bonus: (await rowsOf(pb.ref, "BONUS")).length, audit: bonusRefusals[0]?.payload }));
    const pp = pairs.payerp;
    const prizeRefused0 = (await retiredRefusals()).length;
    onReadAt = loads + 2; // the accrual's read, then payPrize's own
    onRead = () => { reg.set("affiliate.config", { ...inHand, prize: { ...inHand.prize, enabled: true, milestone: "DEPOSIT_THRESHOLD" } }); };
    try {
      await onRecruitBet(pp.rec, { stake: 25_000, houseBotId: null });
    } finally {
      reg.set("affiliate.config", valid);
      onRead = null; onReadAt = Number.POSITIVE_INFINITY;
    }
    const prizeRefusals = await retiredRefusals();
    ok("8.retired.payer.prize · payPrize refuses a DEPOSIT_THRESHOLD prize that reached it after the bet's check — audited (hook prize), nothing paid",
      (await rowsOf(pp.ref, "PRIZE")).length === 0 && (await cashOf(pp.ref)) === 0
        && prizeRefusals.length === prizeRefused0 + 1 && (prizeRefusals[0]?.payload as { hook?: string } | undefined)?.hook === "prize",
      JSON.stringify({ prize: (await rowsOf(pp.ref, "PRIZE")).length, audit: prizeRefusals[0]?.payload }));

    // requireDeposit STAYS (anti-fraud, not a deposit reward) — and its read FAILS CLOSED.
    setAffiliateConfig({ prize: { requireDeposit: true } }, "test-officer");
    const fa = pairs.funda, fb = pairs.fundb;
    await realDeposit(fa.rec, 5_000);
    await realDeposit(fb.rec, 5_000);
    await onRecruitBet(fa.rec, { stake: 25_000, houseBotId: null });
    ok("8.retired.funded · CONTROL — requireDeposit stays: a friend who has deposited earns the inviter the first-bet prize",
      (await rowsOf(fa.ref, "PRIZE")).length === 1, JSON.stringify((await rowsOf(fa.ref, "PRIZE")).map((r) => [r.status, r.amountTzs])));
    const txns = db.txn as unknown as { findByUser: (...args: unknown[]) => unknown };
    const readTxns = txns.findByUser;
    txns.findByUser = (...args: unknown[]) => {
      if (args[0] === fb.rec) throw new Error("simulated: the deposit read failed");
      return readTxns.apply(db.txn, args);
    };
    try {
      await onRecruitBet(fb.rec, { stake: 25_000, houseBotId: null });
    } finally {
      txns.findByUser = readTxns;
    }
    ok("8.retired.failclosed · ⛔ the same friend-who-deposited, but the deposit read FAILS: the prize is NOT paid on that bet — the read fails closed",
      (await rowsOf(fb.ref, "PRIZE")).length === 0 && (await cashOf(fb.ref)) === 0, JSON.stringify({ prize: (await rowsOf(fb.ref, "PRIZE")).length }));
    setAffiliateConfig({ bonus: { enabled: false }, prize: { requireDeposit: false } }, "test-officer");
  }

  // ── 8.refused · the Make-payable ceremony refuses, in words, and changes nothing ──
  // From here on: the in-memory row (no database), emptied — never switched on.
  __setInviteSwitchStoreForTests(null);
  {
    const cfgBefore = cfgNow();
    // ⭐ No session at all is a session that ENDED — an Owner whose cookie expired while the dialog was open —
    // not an escalation: said in those words, and NO SECURITY row (review, 2026-09-26).
    const secNone = (await auditsNamed("privilege_escalation_blocked")).length;
    let r = await switchInvitePayable(null, on(), OK_TOTP);
    const r2 = await switchInvitePayable("", on(), OK_TOTP);
    ok("8.refused.noviewer · no session is refused as an ENDED session — \"Your session ended — sign in again. Nothing changed.\" — with NO SECURITY row",
      !r.ok && r.error === SESSION_ENDED && !r2.ok && r2.error === SESSION_ENDED
        && (await auditsNamed("privilege_escalation_blocked")).length === secNone, JSON.stringify({ r, r2 }));
    const ZW = String.fromCodePoint(0x200b);
    r = await switchInvitePayable(OWNER, on({ reason: ZW.repeat(5) }), OK_TOTP);
    ok("8.refused.invisible · a reason of five zero-width spaces is refused at the reason field — invisible characters are not a reason",
      !r.ok && r.field === "reason", JSON.stringify(r));
    const sec0 = (await auditsNamed("privilege_escalation_blocked")).length;
    r = await switchInvitePayable(GROWTH, on(), OK_TOTP);
    const sec = await auditsNamed("privilege_escalation_blocked");
    ok("8.refused.growth · a GROWTH officer is refused, and a SECURITY privilege_escalation_blocked row names them",
      !r.ok && r.error === "Only the Owner can make invites payable." && sec.length === sec0 + 1 && sec[0]?.category === "SECURITY" && sec[0]?.actorId === GROWTH,
      JSON.stringify({ r, newRows: sec.length - sec0 }));
    r = await switchInvitePayable(OWNER, on({ reason: "   abcd   " }), OK_TOTP);
    ok("8.refused.reason · a reason of 4 characters after trimming is refused, field reason", !r.ok && r.field === "reason", JSON.stringify(r));
    const words: unknown[] = ["make payable", "Make Payable", "MAKE  PAYABLE", "MAKEPAYABLE", "", undefined];
    const answers: unknown[] = [];
    for (const typed of words) answers.push(await switchInvitePayable(OWNER, on({ typed }), OK_TOTP));
    ok("8.refused.word · anything but MAKE PAYABLE exactly — trimmed, never case-folded — is refused, field typed",
      answers.every((a) => !(a as { ok: boolean }).ok && (a as { field?: string }).field === "typed"), JSON.stringify(answers));
    r = await switchInvitePayable(OWNER, on({ expectSeq: 3 }), OK_TOTP);
    ok("8.refused.seq · a page rendered on another seq is refused, field seq (\"changed a moment ago\")", !r.ok && r.field === "seq", JSON.stringify(r));
    r = await switchInvitePayable(OWNER, on({ start: "AS_SHOWN", pricedFingerprint: "afp1-stale" }), OK_TOTP);
    ok("8.refused.fingerprint · \"the settings on this page\" at a price that is not the current one is refused, field start",
      !r.ok && r.field === "start" && /changed since this page priced/.test(r.error), JSON.stringify(r));
    ok("8.refused.none · after every refusal: still Not payable, nothing stored, the reward settings untouched",
      !playerInvitePayable() && (await readStoredSwitchFresh()).kind === "ABSENT" && cfgNow() === cfgBefore);
  }

  // ── 8.locked.save · while Not payable the settings are locked ON THE SERVER, not only on the page ──
  {
    const before = cfgNow();
    const sv = await saveAs({ prize: { amountTzs: 50_000 } }, GROWTH);
    ok("8.locked.save · a Save while Not payable is refused (Locked while Not payable) and nothing is saved",
      !sv.ok && /Locked while Not payable/.test(sv.error) && cfgNow() === before, JSON.stringify(sv));
  }

  // ── 8.on · Make payable — "Nothing yet" — then ONE Save arms a prize, which pays as CASH ──
  {
    const r = await switchInvitePayable(OWNER, on({ typed: `  ${INVITE_PAYABLE_WORD}  ` }), OK_TOTP);
    ok("8.on.lands · the Owner's Make payable (Nothing yet; the words typed with stray spaces) lands: changed, Payable",
      r.ok && r.changed && r.payable, JSON.stringify(r));
    const cfg = getAffiliateConfig();
    ok("8.on.modes · …and EVERY reward mode is switched off, the service-level pause lifted",
      cfg.enabled === true && !cfg.prize.enabled && !cfg.bonus.enabled && !cfg.commission.enabled, JSON.stringify(cfg));
    const stored = await readStoredSwitchFresh();
    ok("8.on.record · the sealed record: seq 1, payable, the Owner, the reason (trimmed)",
      stored.kind === "SET" && stored.seq === 1 && stored.payable === true && stored.changedBy === OWNER && stored.reason === REASON, JSON.stringify(stored));
    const comp = await auditsNamed("affiliate.payable.on");
    ok("8.audit.row · ONE COMPLIANCE affiliate.payable.on row carries the reason — and from, to, the seq, the ceiling, what pays from now",
      comp.length === 1 && comp[0].category === "COMPLIANCE" && comp[0].actorId === OWNER && comp[0].payload?.reason === REASON
        && comp[0].payload?.from === "NOT_PAYABLE" && comp[0].payload?.to === "PAYABLE" && comp[0].payload?.seq === 1
        && comp[0].payload?.ceiling === "OWNER" && comp[0].payload?.start === "NOTHING",
      JSON.stringify(comp.map((e) => [e.category, e.payload])));
    // ⛔ NO WRITE BEGINS UNRECORDED (review P5): the attempt — who, which way, why, the record number — is on
    // file BEFORE the first write, so an act whose outcome row is lost still has its intent on record.
    {
      const t = await trail();
      const at = t.findIndex((e) => e.action === "affiliate.payable.attempt" && (e.payload as { seq?: number } | undefined)?.seq === 1);
      const onAt = t.findIndex((e) => e.action === "affiliate.payable.on" && (e.payload as { seq?: number } | undefined)?.seq === 1);
      const p = (t[at]?.payload ?? {}) as Record<string, unknown>;
      ok("8.attempt.first · a COMPLIANCE affiliate.payable.attempt row {to, reason, seq, ceiling, start, rearm} is written BEFORE the outcome row",
        at >= 0 && onAt > at && t[at].category === "COMPLIANCE" && t[at].actorId === OWNER && p.to === "PAYABLE" && p.reason === REASON
          && p.seq === 1 && p.ceiling === "OWNER" && p.start === "NOTHING" && p.rearm === false,
        JSON.stringify({ at, onAt, attempt: t[at]?.payload }));
    }
    const c = pairs.cash;
    await onRecruitSettlement(c.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_zero", positionId: posId(), houseBotId: null });
    await onRecruitBet(c.rec, { stake: 25_000, houseBotId: null });
    ok("8.on.zero · Payable with every reward off pays NOTHING — a settlement and a bet write no reward row",
      (await db.referralReward.listByReferrer(c.ref)).length === 0 && (await cashOf(c.ref)) === 0);

    // ── 8.nothing · "Nothing yet" is Payable on the SWITCH and paid on NO player surface (review P8) ──
    // Every player surface asks ONE question — the switch, the service-level pause, AND a reward armed
    // (`invitePaysPlayers`) — and /api/health reports `paying` beside `payable` for the live checks.
    const { GET: healthGET } = await import("../src/app/api/health/route.ts");
    const health = async () => ((await (await healthGET()).json()) as { inviteRewards?: { payable?: unknown; paying?: unknown; ceiling?: unknown } }).inviteRewards;
    const code = (await ensureAffiliateAccount(c.ref)).code;
    const surfaces = async () => {
      const sum = await getPlayerReferralSummary(c.ref);
      const prev = await resolveReferralPreview(code);
      return { paysNow: await invitePaysPlayersNow(0), sum, ribbon: prev?.newPlayerBonusTzs ?? null, health: await health() };
    };
    {
      const s = await surfaces();
      ok("8.nothing.helper · with every reward off the switch says payable, but invitePaysPlayers(payable, cfg) and invitePaysPlayersNow() are FALSE",
        playerInvitePayable() && !invitePaysPlayers(true, getAffiliateConfig()) && s.paysNow === false, JSON.stringify({ paysNow: s.paysNow }));
      ok("8.nothing.page · the invite page is not paid: rewardsLive false, no promise, no prize terms (and no programEnabled)",
        s.sum.rewardsLive === false && s.sum.promises.length === 0 && s.sum.prizeTerms === null && !("programEnabled" in s.sum),
        JSON.stringify({ rewardsLive: s.sum.rewardsLive, promises: s.sum.promises, prizeTerms: s.sum.prizeTerms }));
      ok("8.nothing.ribbon · the register ribbon offers no welcome bonus", s.ribbon === 0, JSON.stringify(s.ribbon));
      ok("8.nothing.health · /api/health: payable TRUE, paying FALSE, ceiling OWNER",
        s.health?.payable === true && s.health?.paying === false && s.health?.ceiling === "OWNER", JSON.stringify(s.health));
    }

    const again = await switchInvitePayable(OWNER, on({ expectSeq: 1 }), OK_TOTP);
    ok("8.already.on · Make payable again: ok, changed:false, and no second COMPLIANCE row",
      again.ok && !again.changed && (await auditsNamed("affiliate.payable.on")).length === 1, JSON.stringify(again));
    const sv = await saveAs({ prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000, capPerReferrer: 20 } }, GROWTH);
    ok("8.on.save · while Payable ONE Save arms the prize — TZS 10,000 on a friend's first bet",
      sv.ok && getAffiliateConfig().prize.enabled === true && getAffiliateConfig().prize.amountTzs === 10_000, JSON.stringify(sv));
    await onRecruitBet(c.rec, { stake: 25_000, houseBotId: null });
    const prize = await rowsOf(c.ref, "PRIZE");
    ok("8.on.cash · …and the friend's next bet pays the inviter ONE prize AS CASH: cash 10,000, bonus 0",
      prize.length === 1 && prize[0].status === "PAID" && prize[0].amountTzs === 10_000 && (await cashOf(c.ref)) === 10_000 && (await bonusOf(c.ref)) === 0,
      JSON.stringify({ prize: prize.map((x) => [x.status, x.amountTzs]), cash: await cashOf(c.ref), bonus: await bonusOf(c.ref) }));

    // ── 8.paying · a reward armed: EVERY surface is paid — and the pause takes it away from every one again ──
    {
      const armedNew = await saveAs({ bonus: { enabled: true, recipient: "NEW", newAmountTzs: 3_000, trigger: "SIGNUP" } }, GROWTH);
      const s = await surfaces();
      ok("8.paying.page · the prize and a new-player bonus armed: paid everywhere — invitePaysPlayersNow TRUE, the invite page promises the prize, its terms read from the SETTINGS (no deposit, min TZS 1,000)",
        armedNew.ok && s.paysNow === true && s.sum.rewardsLive === true && s.sum.promises.some((x) => x.icon === "ticket")
          && JSON.stringify(s.sum.prizeTerms) === JSON.stringify({ requireDeposit: false, minBetTzs: 1_000 }),
        JSON.stringify({ armedNew, paysNow: s.paysNow, rewardsLive: s.sum.rewardsLive, prizeTerms: s.sum.prizeTerms }));
      ok("8.paying.ribbon · …the register ribbon offers the TZS 3,000 sign-up bonus", s.ribbon === 3_000, JSON.stringify(s.ribbon));
      ok("8.paying.health · …and /api/health says payable TRUE, paying TRUE", s.health?.payable === true && s.health?.paying === true, JSON.stringify(s.health));
      setAffiliateConfig({ enabled: false }, "test-officer");
      let paused: Awaited<ReturnType<typeof surfaces>>;
      try {
        paused = await surfaces();
      } finally {
        setAffiliateConfig({ enabled: true }, "test-officer");
      }
      ok("8.paying.paused · ⛔ paused at service level, rewards still armed: NOT paid on any surface — page, ribbon, health's paying",
        paused.paysNow === false && paused.sum.rewardsLive === false && paused.ribbon === 0 && paused.health?.paying === false,
        JSON.stringify({ paysNow: paused.paysNow, rewardsLive: paused.sum.rewardsLive, ribbon: paused.ribbon, health: paused.health }));
      const off = await saveAs({ bonus: { enabled: false } }, GROWTH);
      ok("8.paying.reset · SETUP — the bonus switched off again", off.ok && getAffiliateConfig().bonus.enabled === false, JSON.stringify(off));
    }
  }

  // ── 8.locked.enabled · a Save never carries the service-level pause ──
  {
    const sv = await saveAs({ enabled: false, prize: { amountTzs: 9_000 } }, GROWTH);
    ok("8.locked.enabled · a Save DROPS `enabled`: a crafted pause does not land, the rest of the Save does",
      sv.ok && getAffiliateConfig().enabled === true && getAffiliateConfig().prize.amountTzs === 9_000, JSON.stringify({ sv: sv.ok, cfg: getAffiliateConfig() }));
  }

  // ── 8.twotab · an OLDER tab's Save is refused — never written over a change it never saw (review P3) ──
  // The page used to post every mode from its page-load draft, so an older tab re-armed a prize the Owner had
  // switched off minutes earlier. The post is now { baseFingerprint, changes }: the fingerprint of what the
  // page LOADED and only the officer's own edits; under the lock a base that moved is refused.
  const termsBeforeTwoTab = (await auditsNamed("affiliate.reward.terms")).length;
  {
    setAffiliateConfig({ commission: { enabled: false, rate: 0.5 }, prize: { enabled: true } }, "test-officer");
    const load = () => ({ config: getAffiliateConfig(), fp: affiliateConfigFingerprint(getAffiliateConfig()) });
    const tabA = load(), tabB = load();
    const svB = await saveInviteRewardSettings({ baseFingerprint: tabB.fp, changes: changedRewardFields(tabB.config, { ...tabB.config, prize: { ...tabB.config.prize, enabled: false } }) }, OWNER);
    ok("8.twotab.newer · SETUP — the Owner's newer tab switches the prize OFF", svB.ok && getAffiliateConfig().prize.enabled === false, JSON.stringify(svB));
    const changesA = changedRewardFields(tabA.config, { ...tabA.config, commission: { ...tabA.config.commission, enabled: true, rate: 0.1 } });
    ok("8.twotab.changes · the older tab's post carries ONLY its own edits (commission.enabled, commission.rate)",
      JSON.stringify(changesA) === JSON.stringify({ commission: { enabled: true, rate: 0.1 } }), JSON.stringify(changesA));
    const beforeA = cfgNow();
    const svA = await saveInviteRewardSettings({ baseFingerprint: tabA.fp, changes: changesA }, GROWTH);
    ok("8.twotab.refused · ⛔ the OLDER tab's Save is REFUSED — \"These settings changed since this page loaded — reload to see them.\" — the prize stays OFF and not one field of it is written",
      !svA.ok && svA.error === SETTINGS_MOVED && cfgNow() === beforeA && getAffiliateConfig().prize.enabled === false, JSON.stringify(svA));
    const tabA2 = load();
    const svA2 = await saveInviteRewardSettings({ baseFingerprint: tabA2.fp, changes: changedRewardFields(tabA2.config, { ...tabA2.config, commission: { ...tabA2.config.commission, enabled: true, rate: 0.1 } }) }, GROWTH);
    const now = getAffiliateConfig();
    ok("8.twotab.reload · after a reload the same edit lands — and the prize the Owner switched off stays OFF",
      svA2.ok && now.commission.enabled === true && now.commission.rate === 0.1 && now.prize.enabled === false, JSON.stringify({ svA2: svA2.ok, now }));
    const before = cfgNow();
    const shapes = [
      await saveInviteRewardSettings({ changes: { prize: { amountTzs: 1 } } } as never, GROWTH),
      await saveInviteRewardSettings({ commission: { rate: 0.2 }, bonus: {}, prize: {} } as never, GROWTH),
      await saveInviteRewardSettings({ baseFingerprint: affiliateConfigFingerprint(getAffiliateConfig()), changes: ["x"] } as never, GROWTH),
    ];
    ok("8.twotab.shape · a post with no base fingerprint, the OLD whole-config shape, or changes that are not an object are not understood — nothing saved",
      shapes.every((x) => !x.ok && /not understood/.test(x.error)) && cfgNow() === before, JSON.stringify(shapes));
  }

  // ── 8.terms · a Save that RAISES what the invite pays is a COMPLIANCE event (addendum B) ──
  // Every Save lands while invites are payable, so arming a mode, raising an amount, a rate or the window,
  // loosening a cap, widening the bonus or dropping the deposit precondition changes what 50pick pays from
  // the next event on: beside the ADMIN config row it writes COMPLIANCE `affiliate.reward.terms`
  // {changes: {field: {before, after}}, raised, by}. A Save that only lowers terms writes none.
  {
    const termsRows = async () => auditsNamed("affiliate.reward.terms");
    // 8.twotab's landed Save armed the commission (and LOWERED its rate 50% → 10%): exactly one row.
    const first = await termsRows();
    const p0 = (first[0]?.payload ?? {}) as { raised?: string[]; by?: string; changes?: Record<string, { before: unknown; after: unknown }> };
    ok("8.terms.arm · the Save that armed the commission wrote ONE COMPLIANCE terms row: raised [commission.enabled]; the LOWERED rate is in changes, not in raised; by the officer",
      first.length === termsBeforeTwoTab + 1 && first[0].category === "COMPLIANCE" && first[0].actorId === GROWTH && p0.by === GROWTH
        && JSON.stringify(p0.raised) === JSON.stringify(["commission.enabled"])
        && p0.changes?.["commission.enabled"]?.before === false && p0.changes?.["commission.enabled"]?.after === true
        && p0.changes?.["commission.rate"]?.before === 0.5 && p0.changes?.["commission.rate"]?.after === 0.1
        && (await auditsNamed("affiliate.config.updated")).length > 0,
      JSON.stringify(first.map((e) => [e.category, e.payload])));
    // A known baseline, written directly (no Save, no row), then one Save per case, each against the last.
    setAffiliateConfig({
      commission: { enabled: true, rate: 0.1, windowMonths: 24, capPerRecruitTzs: 250_000 },
      bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "SIGNUP" },
      prize: { enabled: false, milestone: "FIRST_BET", amountTzs: 9_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
    }, "test-officer");
    const CASES: Array<[string, Record<string, unknown>, string | null]> = [
      ["the prize amount raised", { prize: { amountTzs: 12_000 } }, "prize.amountTzs"],
      ["the prize amount LOWERED", { prize: { amountTzs: 11_000 } }, null],
      ["the prize armed", { prize: { enabled: true } }, "prize.enabled"],
      ["the prize cap loosened to 0 (uncapped)", { prize: { capPerReferrer: 0 } }, "prize.capPerReferrer"],
      ["the prize cap set again (0 → 10, tightened)", { prize: { capPerReferrer: 10 } }, null],
      ["the prize cap raised (10 → 15)", { prize: { capPerReferrer: 15 } }, "prize.capPerReferrer"],
      ["the minimum bet lowered", { prize: { minBetAmountTzs: 500 } }, "prize.minBetAmountTzs"],
      ["the deposit precondition set (false → true)", { prize: { requireDeposit: true } }, null],
      ["the deposit precondition dropped (true → false)", { prize: { requireDeposit: false } }, "prize.requireDeposit"],
      ["the commission window raised", { commission: { windowMonths: 36 } }, "commission.windowMonths"],
      ["the commission rate raised", { commission: { rate: 0.2 } }, "commission.rate"],
      ["the commission cap raised", { commission: { capPerRecruitTzs: 300_000 } }, "commission.capPerRecruitTzs"],
      ["the bonus recipient widened (REFERRER → BOTH)", { bonus: { recipient: "BOTH" } }, "bonus.recipient"],
      ["the bonus recipient narrowed (BOTH → NEW)", { bonus: { recipient: "NEW" } }, null],
      ["the new-player bonus raised", { bonus: { newAmountTzs: 2_500 } }, "bonus.newAmountTzs"],
      ["a mode switched OFF", { bonus: { enabled: false } }, null],
    ];
    for (const [name, changes, field] of CASES) {
      const before = (await termsRows()).length;
      const res = await saveAs(changes, GROWTH);
      const after = await termsRows();
      const added = after.length - before;
      const raised = (after[0]?.payload as { raised?: string[] } | undefined)?.raised ?? [];
      ok(`8.terms.${field ? "row" : "none"} · ${name} → ${field ? `a terms row naming ${field}` : "no terms row"}`,
        res.ok === true && (field ? added === 1 && raised.includes(field) : added === 0),
        JSON.stringify({ res: res.ok ? "saved" : res, added, raised }));
    }
  }

  // ── 8.validate · the Save refuses what a rule forbids, and changes nothing ──
  {
    const D = DEFAULT_AFFILIATE_CONFIG;
    const refusedUnchanged = async (upd: unknown) => {
      const before = cfgNow();
      const res = await saveAs(upd, GROWTH);
      return !res.ok && cfgNow() === before;
    };
    // ⭐ WHOLE PERCENTS ONLY (addendum F): the page shows a whole percent, so a fraction of one would be a rate
    // nobody saw. Refused on the SERVER — the page's own truncation of a pasted "7.5" is 8.client.whole.
    ok("8.validate.whole · a 7.5% rate (0.075) is refused by the Save and by the rule — whole percents only — and 7% is accepted",
      (await refusedUnchanged({ commission: { rate: 0.075 } }))
        && validateAffiliateConfig({ ...D, commission: { ...D.commission, rate: 0.075 } }).ok === false
        && (await saveAs({ commission: { rate: 0.07 } }, GROWTH)).ok && getAffiliateConfig().commission.rate === 0.07);
    ok("8.validate.rate · a 60% rate is refused by the Save and 51% by the validator — 50% of margin is the ceiling, and 50% is accepted",
      (await refusedUnchanged({ commission: { rate: 0.6 } }))
        && validateAffiliateConfig({ ...D, commission: { ...D.commission, rate: 0.51 } }).ok === false
        && (await saveAs({ commission: { enabled: true, rate: 0.5, windowMonths: 24 } }, GROWTH)).ok);
    ok("8.validate.window · a commission window of 0 (\"lifetime\"), 61 or 1.5 months is refused — whole months, 1–60",
      (await refusedUnchanged({ commission: { windowMonths: 0 } })) && (await refusedUnchanged({ commission: { windowMonths: 61 } }))
        && (await refusedUnchanged({ commission: { windowMonths: 1.5 } })));
    ok("8.validate.type · a switch sent as the STRING \"false\" is refused — it is truthy",
      (await refusedUnchanged({ prize: { enabled: "false" } })) && validateAffiliateConfig({ ...D, enabled: "false" }).ok === false);
    ok("8.validate.enum · a bonus recipient that is not NEW, REFERRER or BOTH is refused", await refusedUnchanged({ bonus: { recipient: "ALL" } }));
    ok("8.validate.nan · a prize amount of NaN or Infinity is refused",
      (await refusedUnchanged({ prize: { amountTzs: Number.NaN } })) && (await refusedUnchanged({ prize: { amountTzs: Number.POSITIVE_INFINITY } })));
  }

  // ── 8.sanitize · a hand-edited row LOADS repaired — the value that pays least, never the shipped prize ──
  {
    const dirty = {
      enabled: "true", junk: 1,
      commission: { enabled: "yes", rate: 0.9, windowMonths: 0, capPerRecruitTzs: Number.NaN, extra: 1 },
      bonus: { enabled: true, recipient: "ALL", newAmountTzs: 2_000.5, referrerAmountTzs: "10000", trigger: "SIGNUP" },
      prize: { enabled: "false", milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 20_000, requireDeposit: "no" },
    };
    const clean = sanitizePersistedAffiliateConfig(dirty);
    const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
    // ⚠️ The bonus's recipient "ALL" is unreadable, so the bonus loads OFF with it (never re-pointed at a
    // recipient nobody chose) — the rule 8.retired.load leans on for the retired deposit choices.
    ok("8.sanitize · every bad switch loads OFF (the pause too), a mode with ANY unreadable field loads OFF, a bad rate or amount loads 0, good fields stand, stray keys drop — and the result is valid",
      clean.enabled === false && clean.commission.enabled === false && clean.prize.enabled === false && clean.bonus.enabled === false
        && clean.commission.rate === 0 && clean.bonus.newAmountTzs === 0 && clean.bonus.referrerAmountTzs === 0
        && clean.prize.amountTzs === 10_000 && clean.prize.capPerReferrer === 20 && clean.prize.minBetAmountTzs === 20_000
        && !has(clean, "junk") && !has(clean.commission, "extra") && validateAffiliateConfig(clean).ok === true,
      JSON.stringify(clean));
  }

  // ── 8.corrupt · ONE unreadable field switches ITS OWN mode off — and only that mode (review, 2026-09-26) ──
  // A hand-edited row with a fractional cap used to load the mode ON with the cap replaced by 0 — UNCAPPED,
  // the unsafe direction. Now any field a rule cannot read switches that mode off; its readable fields and
  // the other two modes load as stored.
  {
    const good = {
      enabled: true,
      commission: { enabled: true, rate: 0.2, windowMonths: 24, capPerRecruitTzs: 250_000 },
      bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 5_000, trigger: "SIGNUP" },
      prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
    } as const;
    ok("8.corrupt.control · CONTROL — a valid armed row loads unchanged, every mode ON",
      JSON.stringify(sanitizePersistedAffiliateConfig(good)) === JSON.stringify(good), JSON.stringify(sanitizePersistedAffiliateConfig(good)));
    const CASES: Array<["commission" | "bonus" | "prize", string, unknown, string]> = [
      ["commission", "capPerRecruitTzs", 1_500.5, "rate"],
      ["commission", "windowMonths", 0, "rate"],
      ["commission", "rate", 0.9, "windowMonths"],
      ["bonus", "recipient", "ALL", "referrerAmountTzs"],
      ["bonus", "newAmountTzs", "2000", "referrerAmountTzs"],
      ["prize", "capPerReferrer", 1.5, "amountTzs"],
      ["prize", "minBetAmountTzs", -1, "amountTzs"],
      ["prize", "requireDeposit", "yes", "amountTzs"],
    ];
    for (const [section, key, value, keepKey] of CASES) {
      const row5 = JSON.parse(JSON.stringify(good)) as Record<string, Record<string, unknown>>;
      row5[section][key] = value;
      const out = sanitizePersistedAffiliateConfig(row5) as unknown as Record<string, Record<string, unknown>> & { enabled: boolean };
      const others = (["commission", "bonus", "prize"] as const).filter((s) => s !== section);
      ok(`8.corrupt.${section}.${key} · ${key} = ${JSON.stringify(value)} switches ${section} OFF, keeps its readable ${keepKey}, and leaves the other modes ON`,
        out[section].enabled === false && out[section][keepKey] === (good[section] as Record<string, unknown>)[keepKey]
          && others.every((s) => out[s].enabled === true) && out.enabled === true,
        JSON.stringify(out));
    }
  }

  // ── 8.clamp · the payer clamps a rate that bypassed validation ──
  {
    const raw = { ...getAffiliateConfig(), enabled: true, commission: { enabled: true, rate: 0.9, windowMonths: 0, capPerRecruitTzs: 250_000 } };
    const resolved = policyFor("PLAYER", null, raw, getAgentConfig());
    ok("8.clamp · policyFor prices a 90% rate that reached the registry at the 50% ceiling, and a 0-month window as 1 month (never lifetime)",
      resolved.ok && resolved.policy.rate === 0.5 && resolved.policy.windowMonths === 1, JSON.stringify(resolved));
  }

  // ── 8.off · Stop paying — the Owner's alone, a reason and nothing else ──
  {
    let r = await switchInvitePayable(GROWTH, { to: "NOT_PAYABLE", reason: "pause it for now", expectSeq: 1 }, OK_TOTP);
    ok("8.off.growth · a GROWTH officer cannot stop payment either: Only the Owner can stop payment.",
      !r.ok && r.error === "Only the Owner can stop payment." && playerInvitePayable(), JSON.stringify(r));
    const kept = cfgNow();
    const off0 = (await auditsNamed("affiliate.payable.off")).length;
    r = await switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Regulator asked us to pause", expectSeq: 1 }, OK_TOTP);
    ok("8.off.stop · the Owner stops payment with a reason ONLY — no typed words — and invites are Not payable at once",
      r.ok && r.changed && !r.payable && !playerInvitePayable(), JSON.stringify(r));
    const stored = await readStoredSwitchFresh();
    const offRows = await auditsNamed("affiliate.payable.off");
    ok("8.off.record · the record is seq 2, payable false; the settings are KEPT as they were; one COMPLIANCE affiliate.payable.off row carries the reason",
      stored.kind === "SET" && stored.seq === 2 && stored.payable === false && cfgNow() === kept
        && offRows.length === off0 + 1 && offRows[0].category === "COMPLIANCE" && offRows[0].payload?.reason === "Regulator asked us to pause",
      JSON.stringify({ stored, off: offRows.map((e) => e.payload) }));
    {
      const t = await trail();
      const at = t.findIndex((e) => e.action === "affiliate.payable.attempt" && (e.payload as { to?: string; seq?: number } | undefined)?.to === "NOT_PAYABLE" && (e.payload as { seq?: number }).seq === 2);
      const offAt = t.findIndex((e) => e.action === "affiliate.payable.off" && (e.payload as { seq?: number } | undefined)?.seq === 2);
      ok("8.attempt.off · Stop paying too: its attempt row {to NOT_PAYABLE, reason, seq 2, start null, rearm false} is written BEFORE its outcome row",
        at >= 0 && offAt > at && (t[at].payload as { reason?: string; start?: unknown; rearm?: unknown }).reason === "Regulator asked us to pause"
          && (t[at].payload as { start?: unknown }).start === null && (t[at].payload as { rearm?: unknown }).rearm === false,
        JSON.stringify({ at, offAt, attempt: t[at]?.payload }));
    }
    const again = await switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Regulator asked us to pause", expectSeq: 2 }, OK_TOTP);
    ok("8.already.off · Stop paying again: ok, changed:false", again.ok && !again.changed, JSON.stringify(again));
    const sv = await saveAs({ prize: { amountTzs: 99_000 } }, GROWTH);
    ok("8.off.relocked · …and the reward settings are locked again", !sv.ok && /Locked while Not payable/.test(sv.error), JSON.stringify(sv));
  }

  // ── 8.kill · FEATURE_INVITEREWARDS=WITHDRAWN over a stored ON record ──
  {
    const kept = cfgNow();
    const made = await switchInvitePayable(OWNER, on({ start: "AS_SHOWN", pricedFingerprint: affiliateConfigFingerprint(getAffiliateConfig()), expectSeq: 2 }), OK_TOTP);
    ok("8.on.asshown · Make payable with \"the settings on this page\", at the price the Owner saw, lands and arms exactly those settings",
      made.ok && made.changed && made.payable && cfgNow() === kept, JSON.stringify(made));
    const p = pairs.kill;
    const control = await accrualContextFor(p.rec);
    ok("8.kill.control · CONTROL — Payable again (seq 3): with the env unset the accrual resolves", control.ok === true, JSON.stringify(said(control)));
    process.env.FEATURE_INVITEREWARDS = "WITHDRAWN";
    try {
      const killed = await accrualContextFor(p.rec);
      ok("8.kill.accrual · ⛔ FEATURE_INVITEREWARDS=WITHDRAWN over the stored ON record: the accrual is refused, and every reader says Not payable",
        refusedWithdrawn(killed) && !playerInvitePayable() && !(await playerInvitePayableNow(0)) && !(await refreshInvitePayable()),
        JSON.stringify(said(killed)));
      const refused = await switchInvitePayable(OWNER, on({ expectSeq: 3 }), OK_TOTP);
      ok("8.kill.ceremony · …and the ceremony refuses Make payable under the kill, with the environment's own sentence",
        !refused.ok && /Withdrawn in the server's environment/.test(refused.error), JSON.stringify(refused));
    } finally {
      delete process.env.FEATURE_INVITEREWARDS;
    }
  }

  // ── 8.forced · FEATURE_INVITEREWARDS=ACTIVE over a stored OFF record ──
  {
    const stop = await switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Stopped before the forced check", expectSeq: 3 }, OK_TOTP);
    process.env.FEATURE_INVITEREWARDS = "ACTIVE";
    try {
      const p = pairs.forced;
      const stored = await readStoredSwitchFresh();
      const ctx = await accrualContextFor(p.rec);
      await onRecruitSettlement(p.rec, { operatorNetFee: 10_000, marketId: "mkt_piu8_forced", positionId: posId(), houseBotId: null });
      ok("8.forced.pays · FEATURE_INVITEREWARDS=ACTIVE over a stored OFF record forces payment on: the accrual resolves and a settlement pays 5,000 in CASH",
        stop.ok && stop.changed && stored.kind === "SET" && stored.payable === false && ctx.ok === true && playerInvitePayable()
          && (await rowsOf(p.ref, "COMMISSION")).length === 1 && (await cashOf(p.ref)) === 5_000,
        JSON.stringify({ stop, stored, ctx: said(ctx), cash: await cashOf(p.ref) }));
    } finally {
      delete process.env.FEATURE_INVITEREWARDS;
    }
  }

  // ══ 8.review · THE REVIEW ROUND'S FIXES (2026-09-26), each driven through the real ceremony, view and copy ══
  // Behind the store seam again ("another container"), so a case can plant what only a database can do:
  // a dropped write, an outcome that cannot be read back, a read overtaken by a newer one.
  {
    __setInviteSwitchStoreForTests(otherContainer);
    failReads = false; dropSaves = false; failReadsAfterSave = false; stopAfter = Number.POSITIVE_INFINITY; inLockRow = undefined;
    const reg = (globalThis as { __50PICK_CONFIGS?: Map<string, unknown> }).__50PICK_CONFIGS!;
    const fpNow = () => affiliateConfigFingerprint(getAffiliateConfig());
    const viewCopy = async (who: string | null, opts: { settingsUnread?: boolean } = {}) => {
      const view = await invitePayableView(who);
      const cfg = getAffiliateConfig();
      const price = priceInviteRewards(cfg, { destination: "CASH", rosterRecruitsPerInviter: [], armed: true });
      return { view, copy: invitePayableDialogs(view, price, affiliateConfigFingerprint(cfg), opts) };
    };
    type Copy = Awaited<ReturnType<typeof viewCopy>>["copy"];
    const newest = async (action: string) => ((await auditsNamed(action))[0]?.payload ?? {}) as Record<string, unknown>;
    const REARMED = "Invites are payable again — the service-level pause is lifted.";
    const REARMED_NO_RECORD = "Invites are payable again — the service-level pause is lifted. The switch's own record could not be updated, so the earlier record still shows on this page.";
    const STOP_STARTS = "No new referral reward starts from the moment you confirm; a reward already being paid at that instant can still land.";
    const STOP_KEPT = "Paid rewards stay paid; the settings are kept, and locked.";
    const STOP_PAUSED = "Nothing is paid now — the programme is paused at service level. Stopping here records Not payable, so nothing pays again until invites are made payable once more.";
    const STOP_CLOSED = "Nothing is paid now — the server has suspended payment. Stopping here records Not payable, so lifting that suspension does not resume payment.";
    const STOP_FORCED = "The server forces payment on (FEATURE_INVITEREWARDS=ACTIVE), so payment continues until that setting is removed. Stopping here records Not payable for when it is.";
    const KILL_STORED = (who: string) => `Stored: Payable — suspended by the server (FEATURE_INVITEREWARDS=WITHDRAWN). Removing that setting resumes payment unless ${who} it here.`;
    /** ⛔ The header chip is one of TWO words, never a third — and it agrees with the card's state. */
    const CHIPS = new Set([JSON.stringify({ label: "Payable", variant: "active" }), JSON.stringify({ label: "Not payable", variant: "paused" })]);
    const chipOk = (copy: Copy) => CHIPS.has(JSON.stringify(copy.chip)) && (copy.chip.label === "Payable") === (copy.state === "PAYABLE");
    const envBefore = { invite: process.env.FEATURE_INVITEREWARDS, bonus: process.env.FEATURE_BONUS };
    const restoreEnv = () => {
      if (envBefore.invite === undefined) delete process.env.FEATURE_INVITEREWARDS; else process.env.FEATURE_INVITEREWARDS = envBefore.invite;
      if (envBefore.bonus === undefined) delete process.env.FEATURE_BONUS; else process.env.FEATURE_BONUS = envBefore.bonus;
    };
    let r: Awaited<ReturnType<typeof switchInvitePayable>>;

    // ── 8.rearm · stored ON + paused at service level: Make payable RE-ARMS it, and says so (review P4) ──
    setAffiliateConfig({ enabled: false }, "test-officer");
    row = sealInviteSwitch(record(true, 20));
    {
      const { view, copy } = await viewCopy(OWNER);
      ok("8.dialogs.paused · stored Payable + paused at service level: Not payable, BOTH Make payable… and Stop paying… offered, Stop saying what it does while paused, and the note that Make payable re-arms",
        view.storedPayable && !view.paying && copy.state === "NOT_PAYABLE" && chipOk(copy) && copy.makePayable !== null && copy.stopPaying?.body[0] === STOP_PAUSED
          && copy.notes.includes("Paused at service level — the switch says Payable but the programme is paused, so nothing is paid. Make payable re-arms it."),
        JSON.stringify({ notes: copy.notes, mp: copy.makePayable !== null, sp: copy.stopPaying?.body, chip: copy.chip }));
    }
    r = await switchInvitePayable(OWNER, on({ start: "AS_SHOWN", pricedFingerprint: fpNow(), expectSeq: 20, reason: "Board cleared the re-arm" }), OK_TOTP);
    ok("8.rearm · Make payable over a stored ON record and the pause lands: Payable, 'Invites are payable again — the service-level pause is lifted.'",
      r.ok && r.changed && r.payable && r.note === REARMED && !r.warn && getAffiliateConfig().enabled === true, JSON.stringify(r));
    {
      const q = await newest("affiliate.payable.on");
      const att = await newest("affiliate.payable.attempt");
      ok("8.rearm.row · its COMPLIANCE row: rearmed, 're-armed from service-level pause', confirmed, storedFrom PAYABLE, from NOT_PAYABLE, seq 21, recordUpdated — and the attempt row said rearm",
        q.rearmed === true && q.note === "re-armed from service-level pause" && q.confirmed === true && q.storedFrom === "PAYABLE" && q.from === "NOT_PAYABLE"
          && q.seq === 21 && q.recordUpdated === true && att.rearm === true && att.seq === 21, JSON.stringify({ on: q, attempt: att }));
    }
    setAffiliateConfig({ enabled: false }, "test-officer");
    dropSaves = true;
    try {
      r = await switchInvitePayable(OWNER, on({ start: "AS_SHOWN", pricedFingerprint: fpNow(), expectSeq: 21, reason: "Board cleared it again" }), OK_TOTP);
    } finally {
      dropSaves = false;
    }
    ok("8.rearm.norecord · ⛔ the switch's own record did not land but the settings write did — invites ARE payable: reported as the act, with a warning and the no-record note (never 'nothing changed')",
      r.ok && r.changed && r.payable && r.warn && r.note === REARMED_NO_RECORD && (await playerInvitePayableNow(0)) && getAffiliateConfig().enabled === true, JSON.stringify(r));
    {
      const q = await newest("affiliate.payable.on");
      ok("8.rearm.norecord.row · …its COMPLIANCE row: rearmed, confirmed, recordUpdated FALSE, seq = the stored record's (21)",
        q.rearmed === true && q.confirmed === true && q.recordUpdated === false && q.seq === 21, JSON.stringify(q));
    }

    // ── 8.unknown · an outcome that cannot be read back is said to be unknown, never "nothing changed" (review P5) ──
    row = sealInviteSwitch(record(false, 90));
    failReadsAfterSave = true;
    try {
      r = await switchInvitePayable(OWNER, on({ expectSeq: 90 }), OK_TOTP);
    } finally {
      failReadsAfterSave = false; failReads = false;
    }
    {
      const q = await newest("affiliate.payable.on");
      ok("8.unknown.on · ⛔ Make payable whose outcome cannot be read back: 'Outcome unknown — reload to see the current state.' and a COMPLIANCE row confirmed:false, outcome unknown, the attempt's seq (91)",
        !r.ok && r.error === OUTCOME_UNKNOWN && q.confirmed === false && q.outcome === "unknown" && q.seq === 91, JSON.stringify({ r, q }));
    }
    row = sealInviteSwitch(record(true, 92));
    failReadsAfterSave = true;
    try {
      r = await switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: "Stop with the outcome unread", expectSeq: 92 }, OK_TOTP);
    } finally {
      failReadsAfterSave = false; failReads = false;
    }
    {
      const q = await newest("affiliate.payable.off");
      ok("8.unknown.off · ⛔ Stop paying whose outcome cannot be read back: 'Outcome unknown…' and a confirmed:false row (seq 93)",
        !r.ok && r.error === OUTCOME_UNKNOWN && q.confirmed === false && q.outcome === "unknown" && q.seq === 93, JSON.stringify({ r, q }));
    }
    // A throw once the writes had begun — as a lock that fails on its way out. Planted after the read-back:
    // pricing the landed settings asks where rewards land, and the bonus settings answer with a throw.
    row = sealInviteSwitch(record(false, 94));
    {
      const bonusValid = reg.get("bonus.config");
      let thrown: unknown = null;
      process.env.FEATURE_BONUS = "ACTIVE";
      reg.set("bonus.config", Object.defineProperty({}, "enabled", { enumerable: true, get() { throw new Error("simulated: a fault after the writes began"); } }));
      try {
        r = await switchInvitePayable(OWNER, on({ expectSeq: 94 }), OK_TOTP);
      } catch (e) {
        thrown = e;
      } finally {
        if (bonusValid === undefined) reg.delete("bonus.config"); else reg.set("bonus.config", bonusValid);
        restoreEnv();
      }
      const q = await newest("affiliate.payable.on");
      ok("8.unknown.throw · ⛔ a throw once the writes had begun is 'Outcome unknown…' with a confirmed:false row (seq 95) — never a throw the action reports as 'nothing changed'",
        thrown === null && !r.ok && r.error === OUTCOME_UNKNOWN && q.confirmed === false && q.seq === 95, JSON.stringify({ r, thrown: String(thrown), q }));
    }

    // ── 8.save.unknown · the reward Save: a throw AFTER its write began is unknown; BEFORE it, a clean refusal ──
    {
      const before = cfgNow();
      const base = fpNow();
      const bomb = { prize: Object.defineProperty({}, "amountTzs", { enumerable: true, get() { throw new Error("simulated: the write failed after it began"); } }) };
      let sv: unknown = null;
      let threw: unknown = null;
      try { sv = await saveInviteRewardSettings({ baseFingerprint: base, changes: bomb } as never, GROWTH); } catch (e) { threw = e; }
      ok("8.save.unknown · ⛔ a Save that throws AFTER its write began answers 'Outcome unknown — reload to see the current state.' — never the action's 'nothing was saved'",
        threw === null && (sv as { ok?: unknown })?.ok === false && (sv as { error?: unknown }).error === OUTCOME_UNKNOWN, JSON.stringify({ sv, threw: String(threw) }));
      const valid = reg.get("affiliate.config");
      threw = null;
      reg.set("affiliate.config", Object.defineProperty({}, "enabled", { enumerable: true, get() { throw new Error("simulated: the settings read failed before any write"); } }));
      try {
        await saveInviteRewardSettings({ baseFingerprint: base, changes: { prize: { amountTzs: 1_000 } } }, GROWTH);
      } catch (e) {
        threw = e;
      } finally {
        reg.set("affiliate.config", valid);
      }
      ok("8.save.prewrite · a Save that throws BEFORE its write began is RETHROWN — the action's own 'nothing was saved' is then true — and nothing is saved",
        threw !== null && cfgNow() === before, String(threw));
    }

    // ── 8.overtaken · a switch read overtaken by a newer one answers PAYABLE only when BOTH say so (review P2) ──
    {
      row = sealInviteSwitch(record(false, 96));
      slowNext = 30;
      const inflight = refreshInvitePayable();   // a slow read that sees the row OFF…
      await sleep(5);
      row = sealInviteSwitch(record(true, 97));   // …the row turns ON, and this container reads it fresh behind it
      const local = await readStoredSwitchFresh();
      const answered = await inflight;
      ok("8.overtaken · ⛔ a read that saw OFF, overtaken by a newer read that saw ON, answers Not payable — the two cannot be ordered",
        local.kind === "SET" && local.payable === true && answered === false, JSON.stringify({ local: local.kind, answered }));
      slowNext = 30;
      const inflight2 = refreshInvitePayable();
      await sleep(5);
      await readStoredSwitchFresh();
      ok("8.overtaken.control · CONTROL — overtaken, but BOTH reads say ON: payable", (await inflight2) === true);
    }

    // ── 8.dialogs · the card and both dialogs in every state — the STORED position whenever the server overrides it ──
    {
      row = null;
      let { copy } = await viewCopy(OWNER);
      const growthAbsent = (await viewCopy(GROWTH)).copy;
      ok("8.dialogs.absent · never switched on: Not payable, 'Never switched on.', the Owner offered Make payable only; a growth officer no dialog and the sentence saying who can",
        copy.state === "NOT_PAYABLE" && chipOk(copy) && copy.provenance === "Never switched on." && copy.makePayable !== null && copy.stopPaying === null
          && growthAbsent.makePayable === null && growthAbsent.stopPaying === null
          && growthAbsent.notes.includes("Only the Owner can make invites payable, after Gaming Board clearance."),
        JSON.stringify({ prov: copy.provenance, mp: copy.makePayable !== null, sp: copy.stopPaying !== null, growth: growthAbsent.notes }));
      const effects = copy.makePayable?.effects ?? [];
      ok("8.dialogs.cash · the CASH effect says withdrawable CASH and that a first withdrawal still needs the identity check (KYC at withdrawal) — never 'withdrawable at once'",
        effects.some((x) => /withdrawable CASH/.test(x) && /KYC at withdrawal/.test(x)) && !effects.some((x) => /at once/.test(x)), JSON.stringify(effects));
      row = sealInviteSwitch(record(false, 30));
      ({ copy } = await viewCopy(OWNER));
      ok("8.dialogs.off · stored Not payable: Make payable only, and the provenance 'Since … · who · “reason” · record #30'",
        copy.state === "NOT_PAYABLE" && chipOk(copy) && copy.makePayable !== null && copy.stopPaying === null
          && /^Since .+ · .+ · “Gaming Board cleared the structure” · record #30$/.test(copy.provenance ?? ""), JSON.stringify(copy.provenance));
      row = sealInviteSwitch(record(true, 30));
      ({ copy } = await viewCopy(OWNER));
      const growthPaying = (await viewCopy(GROWTH)).copy;
      ok("8.dialogs.payable · Payable: Stop paying only — 'a reward already being paid at that instant can still land', the settings kept and locked; a growth officer: no dialog, 'only the Owner can stop payment'",
        copy.state === "PAYABLE" && chipOk(copy) && copy.makePayable === null && JSON.stringify(copy.stopPaying?.body) === JSON.stringify([STOP_STARTS, STOP_KEPT])
          && growthPaying.makePayable === null && growthPaying.stopPaying === null && growthPaying.notes.includes("You can change the amounts; only the Owner can stop payment."),
        JSON.stringify({ body: copy.stopPaying?.body, growth: growthPaying.notes }));
      process.env.FEATURE_INVITEREWARDS = "WITHDRAWN";
      try {
        ({ copy } = await viewCopy(OWNER));
        const growthKilled = (await viewCopy(GROWTH)).copy;
        ok("8.dialogs.closed.on · ⛔ WITHDRAWN over a stored Payable: Not payable, the STORED position stated — removing the setting resumes payment unless you stop it here — and Stop paying… OFFERED, saying what stopping does under the kill; no Make payable",
          copy.state === "NOT_PAYABLE" && chipOk(copy) && copy.makePayable === null && copy.stopPaying?.body[0] === STOP_CLOSED
            && copy.notes.includes("Withdrawn in the server's environment (FEATURE_INVITEREWARDS=WITHDRAWN); this page cannot turn it on.")
            && copy.notes.includes(KILL_STORED("you stop")) && growthKilled.stopPaying === null && growthKilled.notes.includes(KILL_STORED("the Owner stops")),
          JSON.stringify({ notes: copy.notes, sp: copy.stopPaying?.body, growth: growthKilled.notes }));
        row = sealInviteSwitch(record(false, 31));
        ({ copy } = await viewCopy(OWNER));
        ok("8.dialogs.closed.off · WITHDRAWN over a stored Not payable: no dialog at all and no stored-position note — only the kill's sentence",
          copy.state === "NOT_PAYABLE" && chipOk(copy) && copy.makePayable === null && copy.stopPaying === null && !copy.notes.some((n) => n.startsWith("Stored:"))
            && copy.notes.includes("Withdrawn in the server's environment (FEATURE_INVITEREWARDS=WITHDRAWN); this page cannot turn it on."), JSON.stringify(copy.notes));
      } finally {
        restoreEnv();
      }
      process.env.FEATURE_INVITEREWARDS = "ACTIVE";
      try {
        row = sealInviteSwitch(record(true, 32));
        ({ copy } = await viewCopy(OWNER));
        ok("8.dialogs.forced.on · ACTIVE over a stored Payable: Payable, 'Stored: Payable — removing the server's setting keeps invites payable.', and Stop paying… offered, saying payment continues until the setting is removed",
          copy.state === "PAYABLE" && chipOk(copy) && copy.makePayable === null && copy.stopPaying?.body[0] === STOP_FORCED
            && copy.notes.includes("Stored: Payable — removing the server's setting keeps invites payable."), JSON.stringify({ notes: copy.notes, sp: copy.stopPaying?.body }));
        row = sealInviteSwitch(record(false, 33));
        ({ copy } = await viewCopy(OWNER));
        ok("8.dialogs.forced.off · ACTIVE over a stored Not payable: Payable, 'Stored: Not payable — removing the server's setting stops payment.', and no dialog",
          copy.state === "PAYABLE" && chipOk(copy) && copy.makePayable === null && copy.stopPaying === null
            && copy.notes.includes("Stored: Not payable — removing the server's setting stops payment."), JSON.stringify(copy.notes));
      } finally {
        restoreEnv();
      }
      row = sealedWith({ payable: "true" });
      ({ copy } = await viewCopy(OWNER));
      const malformed = copy.provenance;
      failReads = true;
      try {
        ({ copy } = await viewCopy(OWNER, { settingsUnread: true }));
      } finally {
        failReads = false;
      }
      ok("8.dialogs.unreadable · a malformed row: 'Stored switch unreadable — treated as Not payable.'; an unread one says so and to reload; settings that could not be re-read get their own note",
        malformed === "Stored switch unreadable — treated as Not payable." && chipOk(copy)
          && copy.provenance === "The stored switch could not be read just now — treated as Not payable. Reload to try again."
          && copy.notes.includes("The reward settings could not be re-read just now — this page shows this server's last copy. Reload to try again."),
        JSON.stringify({ malformed, unread: copy.provenance, notes: copy.notes }));
    }

    // ── 8.log · a genuine OLDER record restored into the row is flagged against the COMPLIANCE trail (review P1) ──
    // A known top: a CONFIRMED record #500, and an UNCONFIRMED #900 above it that must not count.
    {
      await audit({ category: "COMPLIANCE", action: "affiliate.payable.on", actorId: OWNER, targetType: "InviteRewardsSwitch", targetId: "invite.rewards.switch", payload: { seq: 500, confirmed: true, note: "piu8 fixture: the last recorded change" } });
      await audit({ category: "COMPLIANCE", action: "affiliate.payable.off", actorId: OWNER, targetType: "InviteRewardsSwitch", targetId: "invite.rewards.switch", payload: { seq: 900, confirmed: false, outcome: "unknown", note: "piu8 fixture: an unconfirmed act" } });
      row = sealInviteSwitch(record(true, 500));
      let { view, copy } = await viewCopy(GROWTH);
      ok("8.log.unconfirmed · the last RECORDED change is #500 — an unconfirmed row's #900 above it is not counted", view.lastRecordedSeq === 500, JSON.stringify(view.lastRecordedSeq));
      ok("8.log.current · the stored record IS the last recorded change: no flag, and the provenance ends '· record #500'",
        view.recordOlderThanLog === false && (copy.provenance ?? "").endsWith("· record #500"), JSON.stringify({ flag: view.recordOlderThanLog, prov: copy.provenance }));
      row = sealInviteSwitch(record(true, 499));
      ({ view, copy } = await viewCopy(GROWTH));
      ok("8.log.older · ⛔ a genuine but OLDER record (#499 < #500) is flagged: 'The stored switch is older than its last recorded change (record #499 is stored; #500 was recorded).'",
        view.recordOlderThanLog === true && copy.notes.some((n) => n.startsWith("The stored switch is older than its last recorded change (record #499 is stored; #500 was recorded).")),
        JSON.stringify(copy.notes));
    }

    // ── 8.label · who made the change: their CHOSEN name, else "the Owner" — never "Player #…" (addendum I) ──
    {
      await db.user.update(OWNER, { displayName: "Ali" } as never);
      await mkFixtureUser("piu8_owner2", { role: "ADMIN" });
      row = sealInviteSwitch(record(true, 500));
      const named = (await viewCopy(GROWTH)).copy.provenance ?? "";
      row = sealInviteSwitch({ ...record(true, 500), changedBy: "piu8_owner2" });
      const unnamed = (await viewCopy(GROWTH)).copy.provenance ?? "";
      ok("8.label · the provenance names the author by their chosen name ('· Ali ·'), and one with no name as '· the Owner ·' — never the generated 'Player #…'",
        /· Ali ·/.test(named) && /· the Owner ·/.test(unnamed) && !/Player #/.test(named + unnamed), JSON.stringify({ named, unnamed }));
      await db.user.update(OWNER, { displayName: null } as never);
    }

    // ── 8.reason · the reason is CLEANED — invisibles out, then trimmed — before it is measured and stored (item 13) ──
    {
      const ZW = String.fromCodePoint(0x200b), WJ = String.fromCodePoint(0x2060), BOM = String.fromCodePoint(0xfeff);
      const RLO = String.fromCodePoint(0x202e), TAG = String.fromCodePoint(0xe0041), NBSP = String.fromCodePoint(0x00a0);
      ok("8.reason.clean · cleanReason strips the invisibles (zero-width, word joiner, BOM, bidi override, tag characters), trims no-break spaces, keeps a real reason and its newline, and answers '' for a non-string",
        cleanReason(ZW.repeat(5)) === "" && cleanReason(`Bo${ZW}ard${WJ} ok${BOM}`) === "Board ok" && cleanReason(`${NBSP}${RLO}abcde${TAG}${NBSP}`) === "abcde"
          && cleanReason("Board cleared\nthe structure") === "Board cleared\nthe structure" && cleanReason(42) === "" && cleanReason(null) === "");
      row = sealInviteSwitch(record(true, 40));
      const stop = await switchInvitePayable(OWNER, { to: "NOT_PAYABLE", reason: `  Pau${ZW}se${WJ} it ${BOM} `, expectSeq: 40 }, OK_TOTP);
      const st = await readStoredSwitchFresh();
      const q = await newest("affiliate.payable.off");
      ok("8.reason.ceremony · a reason padded with invisible characters lands CLEANED: the record and the COMPLIANCE row both say 'Pause it'",
        stop.ok && st.kind === "SET" && st.reason === "Pause it" && q.reason === "Pause it", JSON.stringify({ stop, reason: st.kind === "SET" ? st.reason : st.kind, q: q.reason }));

      // ── 8.armed · the dialog arms by DIRECTION and fails closed (addendum D) — the client's own predicate ──
      const { payableCeremonyArmed: armedFn } = (await import("../src/app/admin/affiliate/payable-switch.tsx")) as unknown as { payableCeremonyArmed: (copy: unknown, entry: unknown) => boolean };
      const onCopy = { to: "PAYABLE", reasonMin: 5, reasonMax: 300, word: INVITE_PAYABLE_WORD, start: { defaultChoice: "NOTHING" }, pricedFingerprint: "afp1-x" };
      const offCopy = { to: "NOT_PAYABLE", reasonMin: 5, reasonMax: 300, word: null, start: null, pricedFingerprint: null };
      const e = (o: Record<string, unknown> = {}) => ({ reason: "Board cleared it", typed: INVITE_PAYABLE_WORD, start: "NOTHING", ...o });
      ok("8.armed.on · Make payable arms on a reason, the exact words and a choice — not on the words in the wrong case, without a choice, or on 'the settings on this page' with no price",
        armedFn(onCopy, e()) && !armedFn(onCopy, e({ typed: "make payable" })) && !armedFn(onCopy, e({ start: null })) && !armedFn({ ...onCopy, pricedFingerprint: null }, e({ start: "AS_SHOWN" })));
      ok("8.armed.off · Stop paying arms on a reason alone — not on a short one, nor on five zero-width spaces (counted as the server counts)",
        armedFn(offCopy, e({ typed: "", start: null })) && !armedFn(offCopy, e({ reason: "abcd" })) && !armedFn(offCopy, e({ reason: ZW.repeat(5) })));
      ok("8.armed.failclosed · ⛔ it FAILS CLOSED: a PAYABLE copy that lost its words or its choice, an unknown direction, or bounds that are not numbers never arm",
        !armedFn({ ...onCopy, word: null }, e({ typed: "" })) && !armedFn({ ...onCopy, start: null }, e()) && !armedFn({ ...onCopy, to: "MAYBE" }, e())
          && !armedFn({ ...offCopy, to: undefined }, e()) && !armedFn({ ...offCopy, reasonMin: undefined }, e()));
    }

    // ── 8.client · the editor itself: a refused draft cannot be saved, whole numbers only, the post's shape ──
    {
      const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
      const client = src("app/admin/affiliate/affiliate-admin-client.tsx");
      const sw = src("app/admin/affiliate/payable-switch.tsx");
      ok("8.client.save · ⛔ a draft the server would refuse cannot be saved: the form's Save is disabled, the pending-changes bar offers no Save, and save() itself returns",
        /disabled=\{!unsaved \|\| !check\.ok\} onClick=\{save\}/.test(client) && /onSave=\{check\.ok \? save : undefined\}/.test(client)
          && /if \(locked \|\| !unsaved \|\| !check\.ok\) return;/.test(client));
      const numeric = ["commission.rate", "commission.windowMonths", "commission.capPerRecruitTzs", "bonus.newAmountTzs", "bonus.referrerAmountTzs", "prize.amountTzs", "prize.minBetAmountTzs", "prize.capPerReferrer"];
      const missing = numeric.filter((f) => !client.includes(`error={fieldError("${f}")}`));
      ok("8.client.field · every numeric field shows its own refusal AT the field (fieldError) — all 8", missing.length === 0, JSON.stringify(missing));
      ok("8.client.post · the Save posts { baseFingerprint: base.fingerprint, changes: changedRewardFields(base.config, c) } — only what changed",
        /const post = \{ baseFingerprint: base\.fingerprint, changes: changedRewardFields\(base\.config, c\) \};/.test(client));
      const wholeExpr = /const whole = ([^;]+);/.exec(client)?.[1] ?? "";
      const { sanitizeNumericInput } = (await import("../src/components/ui/input.tsx")) as unknown as { sanitizeNumericInput: (raw: string, o: { decimal: boolean; negative: boolean }) => string };
      const allowDecimal = /inputMode="numeric"\s+allowDecimal/.test(client);
      const parse = new Function("e", `const whole = ${wholeExpr}; const n = whole === "" ? 0 : Number(whole); return Number.isFinite(n) ? n : 0;`) as (ev: unknown) => number;
      const typed = (raw: string) => parse({ target: { value: sanitizeNumericInput(raw, { decimal: allowDecimal, negative: false }) } });
      ok("8.client.whole · the field's own parse, run as written: a pasted '7.5' holds 7 (never '75', clamped to 50%), '1500.75' is 1500, '1,500' is 1500, '' is 0",
        wholeExpr !== "" && typed("7.5") === 7 && typed("1500.75") === 1_500 && typed("1,500") === 1_500 && typed("") === 0,
        JSON.stringify({ wholeExpr, t75: wholeExpr ? typed("7.5") : null }));
      ok("8.client.words · the typed-words field opens the keyboard in capitals and is never pre-filled; the live count is the CLEANED length; every dialog the server offers is rendered",
        /autoCapitalize="characters"/.test(sw) && /const \[typed, setTyped\] = useState\(""\);/.test(sw)
          && /const left = dialog\.reasonMax - cleanReason\(reason\)\.length;/.test(sw) && /\[copy\.makePayable, copy\.stopPaying\]\.filter/.test(sw));
    }
    failReads = false; dropSaves = false; failReadsAfterSave = false; slowNext = 0; row = null;
    restoreEnv();
  }

  // ── 8.restore · the seam released, the row emptied, no override left behind ──
  __setInviteSwitchStoreForTests(null);
  ok("8.restore · Not payable again, never switched on, and no env override leaked",
    !playerInvitePayable() && !(await playerInvitePayableNow(0)) && (await readStoredSwitchFresh()).kind === "ABSENT"
      && process.env.FEATURE_INVITEREWARDS === undefined);
}

console.log(`\nplayer-invite-unpaid: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
