/**
 * WITHDRAWN FEATURES — the guard that makes the withdrawal REAL rather than merely invisible.
 *
 * Invite and the bonus wallet are withdrawn from the player product (`src/lib/feature-state.ts`).
 * Hiding surfaces is the easy half. This suite measures the two halves that actually matter:
 *
 *   LAW 1 — GATE THE OFFER, NEVER THE REFUSAL.  A feature flag may hide something we GIVE.
 *   It may never hide something we FORBID. The bonus-funded cash-out block is the sharpest
 *   case: gating it would convert a laundering block into a laundering ROUTE (bonus stake →
 *   cash out → withdrawable cash). §2 proves it still fires with the programme withdrawn.
 *
 *   LAW 2 — A DORMANT PATH ROTS UNLESS SOMETHING STILL RUNS IT.  §4 drives the ON state, so
 *   the re-enablement path is executed on every deploy for as long as the feature sleeps.
 *
 * ⛔ WHAT §3 DOES AND DOES NOT MEASURE. It is a SOURCE-level check over the player app — it
 * proves no player route still READS the withdrawn copy keys. It is NOT a rendered-page
 * sweep, and it must never be described as one: a true "player-reachable render" measurement
 * needs a signed-in browser and belongs in the live drive. Naming the population honestly is
 * the whole point — a true measurement over the wrong population is the most convincing way
 * to be wrong.
 */
// ⚠️ Fixtures must be VERIFIED players: since 2026-09-05 an unverified account cannot deposit,
// bet or hold an ACTIVE bonus grant, so §5e's control would read bonus=0 for the identity gate
// rather than for anything this suite measures.
import "./lib/verified-fixtures.mts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
// ⛔ ONE HOME FOR COMMENT-STRIPPING — `test:decomment` §2.1 exists because two suites shipped
// private four-line strippers. A note ABOUT a link must never be read as a link.
import { decomment } from "./lib/decomment.mts";
import { inviteIsLiveFor, bonusIsLiveFor, inviteStateFor } from "../src/lib/feature-state.ts";
import { cashOutValue } from "../src/lib/server/market-service.ts";
import { db } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount, resolveReferralPreview, onRecruitBet, onRecruitSettlement } from "../src/lib/server/affiliate-service.ts";
import { setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
// ⭐ ONE way to mint an approved agent across every agent guard — see the file's header for
// why three suites fixturing `role: "AGENT"` and nothing else was the defect.
import { approveFixtureAgent, netAfterWht } from "./lib/agent-fixtures.mts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// ── §1 · THE SEAM ANSWERS PER VIEWER — STANDING, NOT ROLE ──────────────────
// 🔴 THIS SECTION USED TO PASS ROLE STRINGS, and `inviteIsLiveFor("AGENT")` was the control.
// A role is the wrong fact: a DEACTIVATED agent keeps role AGENT, and a fixture with
// `role: "AGENT"` and no approval read as an agent — which is how three predeploy guards
// asserted an unapproved "agent" earning the PLAYER prize and stayed green. The seam now takes
// an `InviteViewer` whose `agentInGoodStanding` is derived from `approvedAt` + `active` +
// account status by `agentStandingFor`, and role alone opens nothing.
{
  const player = { role: "PLAYER" as const, agentInGoodStanding: false };
  const roleOnlyAgent = { role: "AGENT" as const, agentInGoodStanding: false };
  const approvedAgent = { role: "AGENT" as const, agentInGoodStanding: true };
  ok("§1 invite is WITHDRAWN for a player", inviteStateFor(player) === "WITHDRAWN", inviteStateFor(player));
  ok("§1 invite is not live for a player", !inviteIsLiveFor(player));
  ok("§1 invite is not live for a signed-out viewer", !inviteIsLiveFor(null));
  // ⛔ THE ROLE-ONLY TRAP, PINNED. An AGENT role with no standing is a deactivated agent, or a
  // fixture nobody approved — and both must read as WITHDRAWN.
  ok("§1 ⛔ role AGENT with NO standing is NOT live — a role opens nothing on its own", !inviteIsLiveFor(roleOnlyAgent));
  // ⭐ THE CONTROL. Without this the suite would pass by refusing everyone, and a seam that
  // refuses everyone is indistinguishable from a seam that is simply broken.
  ok("§1 CONTROL · invite IS live for an agent IN GOOD STANDING", inviteIsLiveFor(approvedAgent));
  ok("§1 bonus is not live for anyone", !bonusIsLiveFor("PLAYER") && !bonusIsLiveFor("AGENT") && !bonusIsLiveFor(null));
  // ⛔ WITHDRAWN, NOT COMING_SOON. A gilt "coming soon" badge is a PROMISE, and we are not
  // promising players this programme. If someone softens the constant back to COMING_SOON,
  // every entry point starts advertising again and this is the line that says so.
  ok("§1 the state is WITHDRAWN, never COMING_SOON", inviteStateFor(player) !== "COMING_SOON");
}

// ── §2 · LAW 1 — THE REFUSAL IS NOT GATED ──────────────────────────────────
// A bonus-funded position must STILL be unsellable while the programme is withdrawn.
{
  const now = Date.now();
  const market = {
    id: "m_law1", yesPool: 100_000, noPool: 100_000,
    resolutionAt: new Date(now + 6 * 3_600_000).toISOString(),
    selectionClosedAt: new Date(now + 3 * 3_600_000).toISOString(),
    feeSnapshot: null,
  };
  const placedAt = new Date(now - 30_000).toISOString(); // well inside the free window

  const bonusFunded = await cashOutValue(
    { side: "YES", stake: 20_000, placedAt, bonusStakeTzs: 5_000 },
    market as never,
  );
  ok("§2 bonus-funded position is NOT sellable", bonusFunded.sellable === false, `sellable=${bonusFunded.sellable}`);
  ok("§2 and it says BONUS_FUNDED", bonusFunded.reason === "BONUS_FUNDED", `reason=${bonusFunded.reason}`);

  // ⭐ THE CONTROL, and it is the one that makes §2 mean anything: the SAME market, the SAME
  // timing, cash-funded. If this were also unsellable the refusal above would be proving the
  // window, not the bonus rule.
  const cashFunded = await cashOutValue(
    { side: "YES", stake: 20_000, placedAt, bonusStakeTzs: 0 },
    market as never,
  );
  ok("§2 CONTROL · the same position cash-funded IS sellable", cashFunded.sellable === true, `sellable=${cashFunded.sellable} reason=${cashFunded.reason}`);
}

// ── §3 · NO PLAYER ROUTE STILL READS THE WITHDRAWN COPY ────────────────────
// Population: `src/app` minus `admin` and `api`, plus `src/components/layout`.
// The admin console is EXCLUDED on purpose — an operator must still be able to read and
// audit the grants that exist. Withdrawal is a player-product decision, not a data deletion.
{
  const ROOTS = ["src/app", "src/components/layout"];
  const SKIP = ["src/app/admin", "src/app/api"];
  const WITHDRAWN_KEYS = ["inviteComingSoonTag", "inviteComingSoonTitle", "inviteComingSoonBody"];

  const files: string[] = [];
  const walk = (dir: string) => {
    let entries: string[] = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e).replace(/\\/g, "/");
      if (SKIP.some((s) => p.startsWith(s))) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx") || p.endsWith(".ts")) files.push(p);
    }
  };
  for (const r of ROOTS) walk(r);

  // ⛔ A gate over zero files proves nothing — the population must be non-empty and plausible.
  ok("§3 population is real (>80 player files scanned)", files.length > 80, `scanned=${files.length}`);

  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const key of WITHDRAWN_KEYS) {
      if (src.includes(key)) offenders.push(`${f} → ${key}`);
    }
  }
  ok("§3 no player route reads the invite coming-soon copy", offenders.length === 0, offenders.join(" · "));

  // The old single-switch module must stay gone: a shim would let a role-blind
  // `inviteIsLive()` keep compiling at call sites that must now ask about a role.
  const shimUsers = files.filter((f) => readFileSync(f, "utf8").includes("invite-feature"));
  ok("§3 nothing imports the deleted invite-feature module", shimUsers.length === 0, shimUsers.join(" · "));
}

// ── §4 · LAW 2 — THE ON PATH IS STILL EXECUTABLE ───────────────────────────
// ⭐ This is what stops re-enablement shipping broken. The state is read through an env
// override precisely so the ACTIVE branch can be driven while the feature sleeps; without
// it the ON path would go unexecuted for months and rot silently.
{
  process.env.FEATURE_INVITE = "ACTIVE";
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    ok("§4 invite re-enables for an ordinary player", inviteIsLiveFor({ role: "PLAYER", agentInGoodStanding: false }));
    ok("§4 invite stays live for an agent", inviteIsLiveFor({ role: "AGENT", agentInGoodStanding: true }));
    ok("§4 bonus re-enables", bonusIsLiveFor("PLAYER"));
  } finally {
    delete process.env.FEATURE_INVITE;
    delete process.env.FEATURE_BONUS;
  }
  // ⛔ And the override must not leak past this block, or every later assertion in any suite
  // that imports this module would be measuring the wrong state.
  ok("§4 the override is restored, not leaked", !inviteIsLiveFor({ role: "PLAYER", agentInGoodStanding: false }) && !bonusIsLiveFor("PLAYER"));
}

// ── §5 · ATTRIBUTION — A CODE ONLY RECRUITS IF ITS OWNER MAY REFER ─────────
// 🔴 THE LIABILITY THIS CLOSES. Every player was auto-minted a code, and until this
// programme every shared market/position link carried one. Those links are already out there
// and they never expire. `bindRecruit` writes `recruitedBy` ONCE and `already_bound` means it
// is never re-attributed — so a bind made today is permanent.
// ⛔ "It pays nothing right now" is not a defence: nothing pays today because the reward modes
// are gated, but the ROW is still written, and it becomes a live attribution nobody chose the
// moment the programme returns.
//
// ⛔ §5c IS THE CONTROL AND IT CARRIES THIS WHOLE SECTION. A gate that refused EVERYONE would
// pass §5a and §5b while having silently broken the agent programme. The control is what makes
// the two refusals mean something.
{
  const stamp = () => new Date().toISOString();
  let n = 0;
  const mk = async (id: string, role: "PLAYER" | "AGENT") => {
    await db.user.create({
      id, phoneE164: `+25579${String(++n).padStart(7, "0")}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
      createdAt: stamp(), updatedAt: stamp(), lastLoginAt: null, closedAt: null,
    } as never);
  };

  await mk("w5_player_ref", "PLAYER");
  await mk("w5_agent_ref", "AGENT");
  await mk("w5_roleonly_ref", "AGENT");
  await mk("w5_recruit_a", "PLAYER");
  await mk("w5_recruit_b", "PLAYER");
  await mk("w5_recruit_c", "PLAYER");

  const playerCode = (await ensureAffiliateAccount("w5_player_ref")).code;
  // ⭐ APPROVED — `approvedAt` set, a rate, `active`. A role alone is not an agent.
  const agentCode = await approveFixtureAgent("w5_agent_ref");
  // ⛔ THE TRAP, PINNED: role AGENT and NOTHING else. This is what all three guards used to
  // call an agent, and it must recruit nothing.
  const roleOnlyCode = (await ensureAffiliateAccount("w5_roleonly_ref")).code;

  // §5a · an ordinary player's code must not recruit
  const viaPlayer = await bindRecruit({ recruitUserId: "w5_recruit_a", code: playerCode });
  ok("§5a a PLAYER's code does not recruit", viaPlayer.bound === false, JSON.stringify(viaPlayer));
  ok("§5a the refusal names its reason", viaPlayer.bound === false && viaPlayer.reason === "referrer_not_eligible", JSON.stringify(viaPlayer));
  const recA = await db.user.findById("w5_recruit_a");
  ok("§5a recruitedBy is NOT written — nothing to un-attribute later", !recA?.recruitedBy, `recruitedBy=${recA?.recruitedBy}`);

  // §5b · the register ribbon must not promise what the bind will refuse
  const previewPlayer = await resolveReferralPreview(playerCode);
  ok("§5b no ribbon for a withdrawn referrer", previewPlayer === null, JSON.stringify(previewPlayer));

  // §5c · CONTROL — an AGENT's code still recruits, and still shows its ribbon
  const viaAgent = await bindRecruit({ recruitUserId: "w5_recruit_b", code: agentCode });
  ok("§5c CONTROL · an AGENT's code DOES recruit", viaAgent.bound === true, JSON.stringify(viaAgent));
  const recB = await db.user.findById("w5_recruit_b");
  ok("§5c CONTROL · recruitedBy is written for the agent", recB?.recruitedBy === "w5_agent_ref", `recruitedBy=${recB?.recruitedBy}`);
  const previewAgent = await resolveReferralPreview(agentCode);
  ok("§5c CONTROL · the ribbon renders for an agent", previewAgent !== null && typeof previewAgent?.referrerName === "string", JSON.stringify(previewAgent));
  ok("§5c CONTROL · …and it is the VERIFIED badge, not the player promo's welcome bonus",
     previewAgent?.verifiedAgent === true && previewAgent?.programme === "AGENT" && previewAgent?.newPlayerBonusTzs === 0, JSON.stringify(previewAgent));
  // ⭐ THE STAMP. The attribution records WHICH programme it was created under, in the same
  // write as `recruitedBy`, and that stamp — never the referrer's current role — is what
  // every accrual reads from now on.
  ok("§5c ⭐ the attribution is STAMPED programme=AGENT at bind", recB?.recruitedProgramme === "AGENT" && typeof recB?.recruitedAt === "string" && recB?.recruitedByCode === agentCode,
     JSON.stringify({ programme: recB?.recruitedProgramme, at: recB?.recruitedAt, code: recB?.recruitedByCode }));

  // §5c2 · ⛔ ROLE ALONE RECRUITS NOTHING. An AGENT role with no `approvedAt` is a deactivated
  // agent, a stripped agent, or a fixture nobody approved — and its code must be refused
  // exactly as a withdrawn player's is. This is the case whose absence let three predeploy
  // guards stay green while asserting the wrong answer.
  const viaRoleOnly = await bindRecruit({ recruitUserId: "w5_recruit_c", code: roleOnlyCode });
  ok("§5c2 ⛔ role AGENT with no approval does NOT recruit", viaRoleOnly.bound === false && viaRoleOnly.reason === "referrer_not_eligible", JSON.stringify(viaRoleOnly));
  ok("§5c2 …and no ribbon vouches for it", (await resolveReferralPreview(roleOnlyCode)) === null);
  ok("§5c2 …and nothing was attributed", !(await db.user.findById("w5_recruit_c"))?.recruitedBy);
}

// ── §5d · THE LEGACY ATTRIBUTION — bound BEFORE the gate existed ───────────
// 🔴 THE HARDER HALF TO NOTICE. §5a stops NEW attributions, but `User.recruitedBy` rows
// written before that gate are still on the table and are PERMANENT (`already_bound` means
// they are never re-attributed). Every one of those pairs would keep accruing on the
// recruit's next bet/deposit/settlement — the prize mode is enabled by default, and with the
// bonus wallet withdrawn the reward now lands as REAL, WITHDRAWABLE CASH rather than a
// played-through grant, plus an AFFILIATE notification and an email pointing at
// /profile/invite, a page that no longer exists for that player.
// ⛔ So attribution and PAYMENT must read the same seam. This writes the legacy row directly,
// exactly as the old code would have left it, and proves nothing accrues on it.
//
// 🔴 THE FIRST VERSION OF THIS SECTION WAS VACUOUS, AND ONLY THE RED HARNESS SAID SO. It used
// the shipped defaults — `requireDeposit: true`, `minBetAmountTzs: 20_000` — and never gave the
// recruit a deposit, so the prize could not fire whatever the gate did. Neutralising
// `referrerMayEarn` left the section GREEN: it was measuring the config, not the gate. The
// config is now set so the path WOULD pay, and §5e is the control that proves it does.
{
  const stamp = () => new Date().toISOString();
  const cfgSnap = setAffiliateConfig(
    { enabled: true, prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000 } },
    "test-officer",
  );
  ok("§5d SETUP · a prize really would be payable on this path", cfgSnap.ok === true, JSON.stringify(cfgSnap));

  const mkPair = async (n: string, referrerRole: "PLAYER" | "AGENT") => {
    for (const [id, role, ref] of [
      [`${n}_ref`, referrerRole, null],
      [`${n}_rec`, "PLAYER", `${n}_ref`],
    ] as const) {
      await db.user.create({
        id, phoneE164: `+2557900${String(id.length * 7 + n.length).padStart(5, "0")}${n.slice(-1)}`, email: `${id}@t.tz`,
        passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
        role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
        acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
        twoFactorEnabled: false, avatarDataUrl: null,
        recruitedBy: ref,                     // ⬅ written directly: the legacy row shape
        createdAt: stamp(), updatedAt: stamp(), lastLoginAt: null, closedAt: null,
      } as never);
      await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: stamp(), updatedAt: stamp() } as never);
    }
    await ensureAffiliateAccount(`${n}_ref`);
  };

  // §5d · the withdrawn referrer — a legacy attribution that must now pay nothing
  await mkPair("w5d", "PLAYER");
  ok("§5d PRECONDITION · the legacy attribution really is on the row",
     (await db.user.findById("w5d_rec"))?.recruitedBy === "w5d_ref");
  await onRecruitBet("w5d_rec", { stake: 25_000 });
  const wLegacy = await db.wallet.findByUserId("w5d_ref");
  ok("§5d a legacy attribution accrues NOTHING in cash", (wLegacy?.balance ?? -1) === 0, `cash=${wLegacy?.balance}`);
  ok("§5d …and nothing in bonus either", (wLegacy?.bonusBalance ?? -1) === 0, `bonus=${wLegacy?.bonusBalance}`);
  ok("§5d …and writes no reward row at all", (await db.referralReward.listByReferrer("w5d_ref")).length === 0);

  // §5e · CONTROL — an APPROVED AGENT, recruited through their OWN code, IS paid.
  //
  // 🔴 THIS SECTION USED TO ASSERT A DEFECT AS ITS CONTROL. It wrote `recruitedBy` directly
  // (a PLAYER-era attribution), fired `onRecruitBet`, and asserted `cash + bonus > 0` — so it
  // was proving that an AGENT referrer earned the PLAYER FLAT PRIZE on a legacy attribution,
  // into whichever wallet, which is three things the programme forbids at once: (1) an agent
  // earns commission only, never a flat prize; (2) agent money is CASH, never the bonus
  // wallet; (3) a pre-approval attribution pays an agent NOTHING (that is §5g below). And a
  // SUM cannot see a split: `cash + bonus > 0` is satisfied by money in the wrong wallet.
  //
  // ⭐ The control now binds THROUGH the approved agent's own code (so the attribution is
  // stamped AGENT), settles a position with a NET fee, and asserts the exact wallet, the
  // exact type and the exact amount — never a sum.
  await mkPair("w5e", "PLAYER");                       // creates w5e_ref + w5e_rec with wallets
  // ⚠️ mkPair wrote a legacy `recruitedBy`; clear it so this pair binds through the code.
  await db.user.update("w5e_rec", { recruitedBy: null });
  const w5eCode = await approveFixtureAgent("w5e_ref", { commissionPct: 20 });
  const w5eBind = await bindRecruit({ recruitUserId: "w5e_rec", code: w5eCode });
  ok("§5e SETUP · the recruit binds through the approved agent's own code", w5eBind.bound === true, JSON.stringify(w5eBind));
  ok("§5e SETUP · …and is stamped AGENT", (await db.user.findById("w5e_rec"))?.recruitedProgramme === "AGENT");

  // The player prize is ON (from §5d's config) and the recruit places a qualifying bet —
  // an agent must earn NOTHING from it. The flat prize is the player promo's instrument.
  await onRecruitBet("w5e_rec", { stake: 25_000 });
  const w5eAfterBet = await db.wallet.findByUserId("w5e_ref");
  ok("§5e ⛔ an agent earns NO flat prize on a recruit's first bet (commission-only, by construction)",
     w5eAfterBet?.balance === 0 && w5eAfterBet?.bonusBalance === 0, `cash=${w5eAfterBet?.balance} bonus=${w5eAfterBet?.bonusBalance}`);
  ok("§5e ⛔ …and no PRIZE row was written", (await db.referralReward.listByReferrer("w5e_ref")).filter((r) => r.type === "PRIZE").length === 0);

  // Now a settlement with a NET fee of 10,000 on this recruit's position.
  await onRecruitSettlement("w5e_rec", { operatorNetFee: 10_000, marketId: "mkt_w5e", positionId: "pos_w5e_1" });
  const wAgent = await db.wallet.findByUserId("w5e_ref");
  ok("§5e CONTROL · an APPROVED agent IS paid — into CASH, floor(10,000 × 20%) = 2,000 gross less withholding",
     wAgent?.balance === netAfterWht(2_000), `cash=${wAgent?.balance}`);
  ok("§5e CONTROL · …and NOT into the bonus wallet (exact wallet, never a sum)",
     wAgent?.bonusBalance === 0, `bonus=${wAgent?.bonusBalance}`);
  const w5eRows = await db.referralReward.listByReferrer("w5e_ref");
  const w5eCommission = w5eRows.filter((r) => r.type === "COMMISSION");
  ok("§5e CONTROL · exactly one COMMISSION row, stamped programme=AGENT with the rate applied",
     w5eCommission.length === 1 && w5eCommission[0].programme === "AGENT" && w5eCommission[0].rateApplied === 20 && w5eCommission[0].status === "PAID" && w5eCommission[0].amountTzs === netAfterWht(2_000) && w5eCommission[0].grossAmountTzs === 2_000,
     JSON.stringify(w5eCommission));
  const w5eTxns = await db.txn.findByUser("w5e_ref", 50);
  ok("§5e CONTROL · the credit is booked as AGENT_COMMISSION, never BONUS_CREDIT",
     w5eTxns.some((t) => t.type === "AGENT_COMMISSION" && t.amount === netAfterWht(2_000)) && !w5eTxns.some((t) => t.type === "BONUS_CREDIT"),
     JSON.stringify(w5eTxns.map((t) => [t.type, t.amount])));
  // ⭐ ONE PAYMENT PER EVENT. Replaying the same settlement must not pay twice.
  await onRecruitSettlement("w5e_rec", { operatorNetFee: 10_000, marketId: "mkt_w5e", positionId: "pos_w5e_1" });
  ok("§5e ⭐ replaying the same position pays NOTHING more (idempotency key)",
     (await db.wallet.findByUserId("w5e_ref"))?.balance === netAfterWht(2_000) && (await db.referralReward.listByReferrer("w5e_ref")).filter((r) => r.type === "COMMISSION").length === 1);
}

// ── §5g · THE EXPLOIT — a PLAYER-stamped attribution pays an AGENT NOTHING ──────────────
// 🔴 THE PURCHASABLE ARBITRAGE THIS CLOSES. Farm attributions for free as an ordinary player
// (every shared market link carried your code), pay TZS 100,000 for AGENT status, and every
// one of those old binds flips to paying agent commission at the negotiated rate. The programme
// is stamped on the attribution at BIND and is immutable; a role is mutable and purchasable.
// ⛔ And the obvious second discriminator — `boundAt >= approvedAt` — is a trap: deactivate →
// reactivate restamps `approvedAt` and silently deletes the agent's real book. The stamp alone.
{
  const stamp = () => new Date().toISOString();
  // A legacy attribution: recruitedBy written directly, NO programme stamp (NULL = PLAYER).
  for (const [id, ref] of [["w5g_ref", null], ["w5g_rec", "w5g_ref"]] as const) {
    await db.user.create({
      id, phoneE164: `+25579500${id.length}${id.endsWith("ref") ? "1" : "2"}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: ref,
      createdAt: stamp(), updatedAt: stamp(), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: stamp(), updatedAt: stamp() } as never);
  }
  // THEN the referrer buys AGENT status.
  await approveFixtureAgent("w5g_ref", { commissionPct: 40 });
  ok("§5g PRECONDITION · the legacy attribution is on the row with NO programme stamp",
     (await db.user.findById("w5g_rec"))?.recruitedBy === "w5g_ref" && !(await db.user.findById("w5g_rec"))?.recruitedProgramme);
  ok("§5g PRECONDITION · …and the referrer IS now an approved agent", !!(await db.affiliate.findByUserId("w5g_ref"))?.approvedAt);

  await onRecruitBet("w5g_rec", { stake: 25_000 });
  await onRecruitSettlement("w5g_rec", { operatorNetFee: 10_000, marketId: "mkt_w5g", positionId: "pos_w5g_1" });
  const w5g = await db.wallet.findByUserId("w5g_ref");
  ok("§5g 🔴 a PLAYER/NULL-stamped attribution pays a newly-approved AGENT NOTHING in cash", w5g?.balance === 0, `cash=${w5g?.balance}`);
  ok("§5g …and nothing in bonus", w5g?.bonusBalance === 0, `bonus=${w5g?.bonusBalance}`);
  ok("§5g …and writes no reward row of any type", (await db.referralReward.listByReferrer("w5g_ref")).length === 0,
     JSON.stringify((await db.referralReward.listByReferrer("w5g_ref")).map((r) => [r.type, r.programme, r.amountTzs])));
  // The CONTROL for this section is §5e above — the identical hooks DO pay on an AGENT-stamped
  // attribution — so this refusal cannot be a broken reward path wearing a green tick.
}

// ── §5f · THE SKELETON MUST DESCRIBE THE PAGE THAT IS COMING ───────────────
// 🔴 A LOADING STATE IS A PROMISE ABOUT THE NEXT FRAME. `wallet/loading.tsx` ghosted TWO
// cards side by side — main + bonus — because that is what the page used to render. With the
// bonus card gone, a player watched two ghosts resolve into one card and their real balance
// snap from half width to full. That is the same defect B-29 fixed on this very file, running
// in the opposite direction, and this repo has shipped it before: "the loading skeletons still
// described the tables as they used to be".
// ⛔ Source-level on purpose: a skeleton is visible for a few hundred milliseconds, which is
// exactly the window a render drive is least able to catch reliably.
{
  const skeleton = readFileSync("src/app/wallet/loading.tsx", "utf8");
  const page = readFileSync("src/app/wallet/wallet-client.tsx", "utf8");
  const stripped = decomment(skeleton);

  ok("§5f the wallet skeleton reads the same feature seam as the page",
     stripped.includes("bonusIsLiveFor"), "loading.tsx never consults feature-state");
  // ⛔ Not a bare `lg:grid-cols-2` — it must be CONDITIONAL, exactly as the page's is.
  ok("§5f …and its column count is conditional, not hard-coded",
     !/className="grid grid-cols-1 lg:grid-cols-2/.test(stripped),
     "the skeleton pins two columns regardless of state");
  ok("§5f CONTROL · the page itself is conditional too (the thing being mirrored)",
     /bonusCardVisible && "lg:grid-cols-2"/.test(decomment(page)),
     "wallet-client no longer gates its grid — this mirror has nothing to mirror");
  // ⛔ The bonus ghost is KEPT, not deleted: re-enablement needs it back, and a skeleton that
  // lost its second card would ship bare the day the programme returns.
  ok("§5f the bonus ghost is retained for the ON path", stripped.includes("mat-raised"),
     "the bonus skeleton was deleted rather than gated");
}

// ── §6–§8 · PORTED FROM THE RETIRED `test:invite-coming-soon` ──────────────
// ⭐ WHY THESE ARE HERE AND THAT SUITE IS GONE. It guarded the rule "Invite is COMING_SOON and
// every surface says so from ONE switch". That rule is superseded — invite is WITHDRAWN, and its
// switch moved from `invite-feature.ts` to `feature-state.ts` — so the suite went red on its own
// premise. But its INTENT outlived its subject, and it is the intent worth keeping:
//   · one fact, one home;
//   · ⭐ no entry point decides on its own — a POSITIONAL rule, not a file-level mention;
//   · ⭐ the page guards BEFORE it mints a code.
// ⛔ Ported rather than deleted, and ported HERE rather than left as a second suite: two guards
// over one withdrawal is exactly the drift that produces a stale one. The old §4 (coming-soon
// copy in three locales) is deliberately NOT ported — there is no coming-soon copy any more.
{
  const SRC = (process.env.KP_SRC ?? "src").replace(/\\/g, "/").replace(/\/$/, "");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx|ts)$/.test(e)) out.push(p.replace(/\\/g, "/"));
    }
    return out;
  };
  const files = walk(SRC).map((p) => `src/${p.slice(SRC.length + 1)}`);
  const read = (rel: string) => readFileSync(`${SRC}/${rel.slice(4)}`, "utf8");

  // §6.0 · CONTROL — a walk that reached nothing reports "0 offenders" in the same words as a
  // clean sweep, so every assertion below is meaningless without this line.
  ok("§6.0 CONTROL · the walk read a plausible source tree", files.length > 300, `${files.length} files`);

  // §6 · ONE HOME for the product state.
  const declarers = files.filter((f) => /^\s*const PRODUCT_STATE\b/m.test(decomment(read(f))));
  ok("§6 exactly ONE file declares PRODUCT_STATE", declarers.length === 1, declarers.join(", ") || "NONE — the switch is gone");
  ok("§6 …and it is src/lib/feature-state.ts", declarers[0] === "src/lib/feature-state.ts", declarers[0] ?? "none");

  // §7 · COVERAGE — every player-facing link to the page sits beside the gate.
  //
  // ⛔ POSITION, NOT MENTION, and the retired suite's own header explains why: its first version
  // asked "does this file reference the switch?" and passed over both realistic mutations,
  // because severing a surface's condition leaves the file's IMPORT untouched. A guard that
  // reads the source's vocabulary cannot see a defect that leaves the vocabulary in place.
  //
  // ⚠️ THE MARKERS CHANGED WITH THE MECHANISM. The client surfaces no longer call the switch at
  // all — they receive `inviteVisible` as a prop, because the role lives on the server. So the
  // marker set is the gate function, the product state, the prop that carries its answer, and
  // the menu-row flag that routes to it.
  const NOT_ENTRY_POINTS = new Set([
    // ⛔ `src/lib/chat/send-message.ts` WAS listed here as "an AI citation href". It no longer
    // links to the page at all — the fallback stopped citing a door most askers cannot open —
    // so the exemption went stale and §7's staleness check caught it. That is the assertion
    // earning its place: a stale exemption is how a coverage rule quietly stops covering, and
    // the next uncovered surface would have hidden behind this entry.
    "src/lib/server/email.ts",             // email templates, not a rendered page
    "src/lib/server/notification-service.ts",
    "src/app/admin/affiliate/actions.ts",  // admin console, not the player product
  ]);
  const linkers = files.filter((f) => decomment(read(f)).includes('"/profile/invite"'));
  ok("§7.0 the population is non-empty (a rule over zero surfaces proves nothing)", linkers.length >= 3, `${linkers.length} linkers`);

  const MARKER = /inviteIsLiveFor|inviteStateFor|PRODUCT_STATE|inviteVisible|(^|[^a-zA-Z])invite\s*:/;
  const WINDOW = 8;
  const uncovered: string[] = [];
  for (const f of linkers) {
    if (NOT_ENTRY_POINTS.has(f)) continue;
    const lines = decomment(read(f)).split("\n");
    lines.forEach((line, i) => {
      if (!line.includes('"/profile/invite"')) return;
      const near = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
      if (!MARKER.test(near)) uncovered.push(`${f}:${i + 1}`);
    });
  }
  ok("§7 ⭐ every /profile/invite link sits WITHIN 8 lines of the gate", uncovered.length === 0, uncovered.join(" · "));
  // ⛔ A stale exemption is how a coverage rule quietly stops covering.
  const staleExempt = [...NOT_ENTRY_POINTS].filter((f) => !linkers.includes(f));
  ok("§7 the exemption list holds nothing stale", staleExempt.length === 0, staleExempt.join(", "));

  // §8 · THE PAGE GUARDS BEFORE IT MINTS.
  // ⭐ The highest-value assertion the retired suite had, and it is a POSITION. The page's live
  // body hands out a real referral CODE, a LINK and a QR encoding it. A gate consulted AFTER the
  // summary is fetched still mints. Only ordering catches that.
  {
    const PAGE = "src/app/profile/invite/page.tsx";
    const body = decomment(read(PAGE));
    const guardAt = body.search(/\binviteIsLiveFor\s*\(/);
    const readAt = body.search(/\bgetPlayerReferralSummary\s*\(/);
    ok("§8 the page consults the gate at all", guardAt >= 0, "no inviteIsLiveFor() in the page");
    ok("§8 the page still has a live body to guard", readAt >= 0, "no getPlayerReferralSummary — §8 would pass vacuously");
    ok("§8 ⭐ the gate is consulted BEFORE the referral summary is fetched", guardAt >= 0 && readAt >= 0 && guardAt < readAt, `gate at ${guardAt}, read at ${readAt}`);
  }
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
