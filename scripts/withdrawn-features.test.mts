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
import { bindRecruit, ensureAffiliateAccount, resolveReferralPreview, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// ── §1 · THE SEAM ANSWERS PER ROLE ─────────────────────────────────────────
{
  ok("§1 invite is WITHDRAWN for a player", inviteStateFor("PLAYER") === "WITHDRAWN", inviteStateFor("PLAYER"));
  ok("§1 invite is not live for a player", !inviteIsLiveFor("PLAYER"));
  ok("§1 invite is not live for a signed-out viewer", !inviteIsLiveFor(null));
  // ⭐ THE CONTROL. Without this the suite would pass by refusing everyone, and a seam that
  // refuses everyone is indistinguishable from a seam that is simply broken.
  ok("§1 CONTROL · invite IS live for an approved AGENT", inviteIsLiveFor("AGENT"));
  ok("§1 bonus is not live for anyone", !bonusIsLiveFor("PLAYER") && !bonusIsLiveFor("AGENT") && !bonusIsLiveFor(null));
  // ⛔ WITHDRAWN, NOT COMING_SOON. A gilt "coming soon" badge is a PROMISE, and we are not
  // promising players this programme.
  //
  // 🔴 THIS ASSERTION USED TO READ `inviteStateFor("PLAYER") !== "COMING_SOON"` AND IT WENT
  // VACUOUS ON 2026-09-06, silently. `COMING_SOON` was removed from `FeatureState` that day —
  // it was a third state no consumer ever distinguished — so the comparison became
  // `"WITHDRAWN" !== "COMING_SOON"`, true by construction, for ever. ⛔ And `tsc` could not tell
  // us: `scripts/**.mts` sits OUTSIDE the typechecker (E-317), so the impossible comparison a
  // typed file would have rejected compiles fine here. **A suite is exactly where a dead
  // assertion hides best, because it keeps passing.**
  //
  // ⭐ So it now asserts the property that actually matters and CAN still fail: the retired
  // value, if an operator sets it, must not switch the feature on. That is the real risk —
  // someone reading an old runbook and exporting `FEATURE_INVITE=COMING_SOON`.
  {
    const prev = process.env.FEATURE_INVITE;
    process.env.FEATURE_INVITE = "COMING_SOON";
    try {
      ok("§1 the retired COMING_SOON value does not enable invite", !inviteIsLiveFor("PLAYER"));
      ok("§1 …and it resolves to the shipped constant, not to itself",
         inviteStateFor("PLAYER") === "WITHDRAWN", inviteStateFor("PLAYER"));
    } finally {
      if (prev === undefined) delete process.env.FEATURE_INVITE;
      else process.env.FEATURE_INVITE = prev;
    }
  }
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

  // ⭐ §3b · AND THE COPY ITSELF IS GONE, which is why §3 above did not become vacuous.
  //
  // 🔴 The three keys were RETAINED-BUT-UNRENDERED, under a comment saying they were kept
  // "because the state is reversible". Checked 2026-09-06: **nothing in the repo read them** —
  // the only hit outside the dictionary was this suite asserting nothing reads them. And they
  // could never be reached in ANY state: `WITHDRAWN` renders nothing, `ACTIVE` renders the live
  // page, and no consumer of `feature-state.ts` distinguishes `COMING_SOON` at all. Nine strings
  // across three locales, promising a programme we had decided not to offer, reachable by no
  // code path. That is not a reversible-state affordance, it is misleading copy with no reader.
  //
  // ⛔ WITHOUT THIS LINE §3 WOULD NOW BE A GATE OVER AN EMPTY SET — it scans player files for
  // keys that no longer exist, so it passes by construction. A check whose population went to
  // zero has stopped being a check. This asserts the stronger property that replaced it: the
  // vocabulary is not merely unrendered, it is ABSENT.
  const dictSrc = readFileSync("src/lib/i18n-dict.ts", "utf8");
  const stillThere = WITHDRAWN_KEYS.filter((k) => dictSrc.includes(k));
  ok("§3b the withdrawn coming-soon copy is gone from the dictionary, in all three locales",
     stillThere.length === 0, stillThere.join(" · "));

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
    ok("§4 invite re-enables for an ordinary player", inviteIsLiveFor("PLAYER"));
    ok("§4 invite stays live for an agent", inviteIsLiveFor("AGENT"));
    ok("§4 bonus re-enables", bonusIsLiveFor("PLAYER"));
  } finally {
    delete process.env.FEATURE_INVITE;
    delete process.env.FEATURE_BONUS;
  }
  // ⛔ And the override must not leak past this block, or every later assertion in any suite
  // that imports this module would be measuring the wrong state.
  ok("§4 the override is restored, not leaked", !inviteIsLiveFor("PLAYER") && !bonusIsLiveFor("PLAYER"));
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
  await mk("w5_recruit_a", "PLAYER");
  await mk("w5_recruit_b", "PLAYER");

  const playerCode = (await ensureAffiliateAccount("w5_player_ref")).code;
  const agentCode = (await ensureAffiliateAccount("w5_agent_ref")).code;

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

  // §5e · CONTROL — the SAME shape with an AGENT referrer DOES pay.
  // ⛔ Without this, §5d passes whenever the reward path is broken for any reason at all —
  // which is exactly how its first version passed with the gate removed.
  await mkPair("w5e", "AGENT");
  await onRecruitBet("w5e_rec", { stake: 25_000 });
  const wAgent = await db.wallet.findByUserId("w5e_ref");
  ok("§5e CONTROL · an AGENT referrer on the same path IS paid",
     (wAgent?.balance ?? 0) + (wAgent?.bonusBalance ?? 0) > 0,
     `cash=${wAgent?.balance} bonus=${wAgent?.bonusBalance}`);
  ok("§5e CONTROL · …and a reward row exists", (await db.referralReward.listByReferrer("w5e_ref")).length > 0);

  // ── §5e2 · WHICH WALLET THE AGENT IS PAID INTO — the assertion §5e deliberately would not make
  //
  // 🔴 §5e above sums `balance + bonusBalance`, so it passes whichever wallet the money lands in.
  // It passed while the money was landing in the WRONG one, and printed the proof in its own run
  // log: `bonus.credited … BonusGrant#bg_ef1914…` and an email titled "Bonus added · TZS 10,000".
  // An approved agent's COMMISSION was being paid as a played-through grant — carrying a wagering
  // requirement and an expiry — into a wallet the product declares WITHDRAWN for every role.
  //
  // ⛔ THREE PLACES ASSERTED THE OPPOSITE IN PROSE and none of them was a measurement:
  // `affiliate-service.ts` §referrerMayEarn, §5d's own comment directly above, and
  // `docs/BONUS-WITHDRAWAL.md` §1 — all say the reward "now lands as REAL, WITHDRAWABLE CASH
  // rather than a played-through grant". A sentence is not a guard. This is the guard.
  ok("§5e2 the agent's commission is paid in REAL CASH", (wAgent?.balance ?? 0) > 0, `cash=${wAgent?.balance}`);
  ok("§5e2 …and NOT as a bonus grant in a withdrawn wallet",
     (wAgent?.bonusBalance ?? -1) === 0, `bonus=${wAgent?.bonusBalance}`);
  const agentGrants = await db.bonusGrant.listByUser("w5e_ref");
  ok("§5e2 …and no BonusGrant row was minted at all", agentGrants.length === 0,
     `grants=${agentGrants.length}`);
}

// ── §5g · THE FUNNEL ITSELF — an operator cannot re-enable a withdrawn feature by a row ────
//
// 🔴 THE GUARANTEE THIS SECTION IS THE ONLY ENFORCEMENT OF. `feature-state.ts` says in its own
// header: *"Product off ⇒ off, whatever the config says. An operator cannot switch a withdrawn
// feature back on by editing a row."* GRANTING is the one thing that promise is about, and it
// was the one thing nothing checked — `getBonusConfig()` ships `enabled: true`, so every
// incentive path kept minting grants with the wallet withdrawn from the product.
//
// ⛔ THE CONTROL IS THE POINT. §5g2 re-enables the PRODUCT state (not the config) and proves the
// same call succeeds — without it this section would pass just as well if `creditBonus` were
// simply broken, which is the failure mode §5d shipped with once already.
{
  const { creditBonus } = await import("../src/lib/server/bonus-service.ts");
  const stamp = () => new Date().toISOString();
  await db.user.create({
    id: "w5g_p", phoneE164: "+255790000091", email: "w5g_p@t.tz",
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: stamp(), updatedAt: stamp(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: "wal_w5g_p", userId: "w5g_p", balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: stamp(), updatedAt: stamp() } as never);

  // §5g1 · the operator config is ON (the shipped default) and it must not be enough
  const cfgNow = (await import("../src/lib/server/bonus-config.ts")).getBonusConfig();
  ok("§5g1 PRECONDITION · the operator config really does say enabled", cfgNow.enabled === true,
     `enabled=${cfgNow.enabled}`);
  const refused = await creditBonus("w5g_p", { amountTzs: 5_000, source: "ADMIN", note: "audit probe" });
  ok("§5g1 …and creditBonus still refuses", refused.ok === false, JSON.stringify(refused));
  ok("§5g1 …naming the product state, not the config",
     refused.ok === false && refused.code === "WITHDRAWN",
     refused.ok === false ? refused.code : "ok");
  const wNone = await db.wallet.findByUserId("w5g_p");
  ok("§5g1 …and no bonus money exists", (wNone?.bonusBalance ?? -1) === 0, `bonus=${wNone?.bonusBalance}`);

  // §5g2 · CONTROL — re-enable the PRODUCT state and the identical call must succeed.
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    const allowed = await creditBonus("w5g_p", { amountTzs: 5_000, source: "ADMIN", note: "audit probe control" });
    ok("§5g2 CONTROL · the same call succeeds once the product state is ACTIVE", allowed.ok === true,
       JSON.stringify(allowed));
  } finally {
    delete process.env.FEATURE_BONUS;
  }
}

// ── §5h · THE PAGE MAY NOT PROMISE A WALLET THE PAYER DOES NOT USE ─────────
//
// 🔴 A FALSE MONEY STATEMENT, IN THREE LOCALES, TO THE ONLY AUDIENCE THAT CAN READ THE PAGE.
// `/profile/invite` is agent-only now, and its requirements list stated flatly: *"Bonus credited
// to your Bonus Wallet — {wager}× wagering required before withdrawal"*, *"Bonuses expire 30 days
// after being credited"*, *"Bonuses are used one at a time"*. With the bonus wallet withdrawn the
// reward lands as real, withdrawable cash — so all three were wrong for every approved agent, in
// en, sw AND zh. Nothing was hidden and nothing crashed; the page simply described a different
// product.
//
// ⛔ THE RULE IS "ONE HOME", NOT "SOME CONDITION". The page must consult
// `referralRewardDestination()` — the SAME predicate `creditWallet` routes on — rather than
// re-deriving "is bonus on?" from `bonusIsLiveFor` or `getBonusConfig` locally. A second copy of
// the condition is exactly how the promise and the payment drifted apart the first time.
{
  const { referralRewardDestination } = await import("../src/lib/server/affiliate-service.ts");
  const page = readFileSync("src/app/profile/invite/page.tsx", "utf8");
  const stripped = decomment(page);

  ok("§5h a referral reward lands as CASH while the wallet is withdrawn",
     referralRewardDestination() === "CASH", referralRewardDestination());

  ok("§5h the page reads the payer's own predicate",
     stripped.includes("referralRewardDestination"),
     "the page does not consult referralRewardDestination()");

  // ⛔ POSITIONAL, not a mention: the wagering line must sit INSIDE the BONUS branch. A page that
  // imports the predicate and then renders the bonus copy anyway passes a "does it check?" rule.
  const branchAt = stripped.search(/rewardDestination\s*===\s*"BONUS"/);
  const wagerAt = stripped.search(/inviteReqWager/);
  ok("§5h …and the wagering promise sits BELOW the destination branch",
     branchAt >= 0 && wagerAt > branchAt, `branch=${branchAt} wager=${wagerAt}`);

  ok("§5h …and the cash copy exists for the state we are actually in",
     stripped.includes("inviteReqCash"), "no cash-destination copy on the page");

  // ⭐ THE CONTROL. Without it this section passes just as well if the predicate is hard-wired to
  // "CASH" — which would be a seam that has stopped asking, indistinguishable from one that works.
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    ok("§5h CONTROL · with the product state ACTIVE the reward routes to BONUS again",
       referralRewardDestination() === "BONUS", referralRewardDestination());
  } finally {
    delete process.env.FEATURE_BONUS;
  }

  // ⚠️ All three locales, because a false money statement hides best in the one nobody reads.
  const dict = readFileSync("src/lib/i18n-dict.ts", "utf8");
  const cashKeys = dict.match(/inviteReqCash:/g) ?? [];
  ok("§5h the cash copy is translated in all three locales", cashKeys.length === 3,
     `found=${cashKeys.length}`);
}

// ── §5i · THE FIRST THING WE SAY TO A NEW PLAYER MUST NOT BE A PROMISE WE WON'T KEEP ──
//
// 🔴 `/auth/register?invite=CODE` renders **"Claim bonus TZS 10,000"** from `getInvitePreview`.
// Once `creditBonus` began refusing (the withdrawal is real now), `bindRegistration` grants
// nothing — so that ribbon promised money the platform had already decided not to pay, to a
// person who had not yet signed up. A false money statement at the worst possible moment.
//
// ⭐ The fix follows an EXACT precedent rather than inventing one: `resolveReferralPreview`
// already returns null for a withdrawn referrer, with the comment *"THE RIBBON IS A PROMISE, SO
// IT OBEYS THE SAME GATE AS THE BIND."* Same shape, same seam, same graceful degradation.
{
  const { getInvitePreview } = await import("../src/lib/server/invite-service.ts");
  const stamp = () => new Date().toISOString();
  await db.inviteCampaign.create({
    id: "inv_w5i", code: "W5ICODE", name: "Audit campaign", bonusAmountTzs: 10_000,
    wagerMultiplier: 5, expiresInDays: 30, messageEn: "m", messageSw: "m",
    status: "SENT", totalInvites: 0, totalRegistered: 0, createdById: "sys",
    createdAt: stamp(), updatedAt: stamp(),
  } as never);

  const hidden = await getInvitePreview("W5ICODE");
  ok("§5i no bonus ribbon while the wallet is withdrawn", hidden === null, JSON.stringify(hidden));

  // ⭐ THE CONTROL — without it this passes just as well against a campaign that simply is not
  // there, which would prove the fixture rather than the gate.
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    const shown = await getInvitePreview("W5ICODE");
    ok("§5i CONTROL · the ribbon DOES render once the product state is ACTIVE",
       shown !== null && shown.bonusAmountTzs === 10_000, JSON.stringify(shown));
  } finally {
    delete process.env.FEATURE_BONUS;
  }
}

// ── §5j · THE PROPOSAL PRIZE IS PAID IN CASH, SO IT MUST NOT BE CALLED A BONUS ──
//
// 🔴 A FALSE MONEY STATEMENT IN THREE LANGUAGES, CREATED BY THE WITHDRAWAL ITSELF.
// With the bonus wallet withdrawn, `creditBonus` refuses and `approveProposal` falls through to
// `creditInternal`, so an approved proposal pays REAL, WITHDRAWABLE CASH. The email still said
// *"your reward has landed in your bonus wallet"* / *"zawadi yako ipo kwenye pochi yako ya
// bonasi"*, labelled the destination **"Bonus wallet"**, and offered *"View bonus wallet"* —
// pointing at a card `bonusIsLiveFor()` no longer renders. The notification said the same in
// en, sw and zh.
//
// ⛔ IT ERRS IN THE SAFER DIRECTION AND IS NO LESS FALSE: a player told their reward is locked
// play-through money does not try to withdraw cash that is already theirs.
//
// ⭐ The destination is PASSED, not re-derived — `approveProposal` knows which branch paid
// because `grantId` is set only on the bonus one. Same seam discipline as §5h.
{
  const { proposalApprovedHtml } = await import("../src/lib/server/email.ts");
  const BONUS_WORDS = /bonus wallet|pochi ya bonasi|pochi yako ya bonasi|奖金钱包/i;

  const cash = proposalApprovedHtml({ titleEn: "Will X happen?", amountTzs: 20_000, wagerRequiredTzs: 0, paidAsCash: true });
  ok("§5j the cash email never names a bonus wallet", !BONUS_WORDS.test(cash), "bonus-wallet wording on a cash payment");
  ok("§5j …and it says the money is withdrawable", /withdraw/i.test(cash), "no withdrawable statement");
  ok("§5j …and it does not promise a play-through", !/Play through/i.test(cash), "play-through promised on cash");

  // ⭐ THE CONTROL. Without it this passes just as well against a template that never mentions a
  // bonus wallet in ANY branch — proving the string, not the branch.
  const bonus = proposalApprovedHtml({ titleEn: "Will X happen?", amountTzs: 20_000, wagerRequiredTzs: 100_000, paidAsCash: false });
  ok("§5j CONTROL · the bonus branch still names the bonus wallet", BONUS_WORDS.test(bonus), "the bonus branch lost its wording");

  // ⛔ POSITIONAL: the service must PASS the fact. A template that can tell the truth is useless
  // if its caller never says which branch ran.
  const svc = decomment(readFileSync("src/lib/server/proposals-service.ts", "utf8"));
  // ⭐ ONE HOME for "which wallet did this land in" — the rule itself, not a copy of it.
  // ⚠️ This assertion used to pin the inline expression `grantedTzs > 0 && grantId === null`
  // in `approveProposal`, and it went red the moment that was lifted into a shared exported
  // helper so the DTO could use it too. The guard was RIGHT to fail — the source it reads
  // changed — but it was pinning the wrong thing: the SHAPE of one call site rather than the
  // property that there is exactly one definition. It now pins the property.
  ok("§5j the destination rule has ONE definition, keyed on the grant id",
     /export function rewardPaidAsCash\([^)]*\)[^{]*\{\s*return p\.bonusGrantedTzs > 0 && p\.bonusGrantId === null;/s.test(svc),
     "rewardPaidAsCash is missing or no longer keyed on bonusGrantId");
  ok("§5j …and the payer uses it rather than re-deriving",
     /const paidAsCash = rewardPaidAsCash\(/.test(svc), "approveProposal re-derives the destination");
  ok("§5j …and the read model exposes it to the page",
     /rewardPaidAsCash: rewardPaidAsCash\(p\)/.test(svc), "the proposal DTO does not carry rewardPaidAsCash");
  ok("§5j …and it threads into BOTH the notification and the email",
     /notifyProposalApproved\([^)]*paidAsCash/s.test(svc) && /proposalApprovedHtml\(\{[^}]*paidAsCash/s.test(svc),
     "paidAsCash not passed to one of the two surfaces");

  // ⛔ AND THE PAGE MUST BRANCH ON IT. A DTO field nothing reads is not a fix.
  const page = decomment(readFileSync("src/app/proposals/[id]/page.tsx", "utf8"));
  ok("§5j the approved-proposal card names the wallet the money is really in",
     /p\.rewardPaidAsCash \? t\.common\.creditedToBalance : t\.common\.creditedToBonusWallet/.test(page),
     "the detail page still hard-codes one caption");
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
