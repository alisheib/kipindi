/**
 * PRODUCT FEATURE STATE — the ONE home for whether a whole feature is part of
 * the product right now.
 *
 * ⭐ THIS IS THE FILE `invite-feature.ts` ASKED FOR. Its own comment said: *"If Invite ever
 * needs operator control, the move is to widen this into a feature-state table — NOT to grow
 * a second config beside it."* Two features now sit in this state, so here is the table, and
 * `invite-feature.ts` is DELETED rather than left as a shim. Deleting it is what forced the
 * compiler to surface all six call sites: a shim would have kept the old role-blind
 * `inviteIsLive()` compiling at every one of them, and a surface that silently kept the old
 * answer is exactly how one entry point survives a flag flip.
 *
 * ── TWO LEVELS, AND THEY CANNOT DISAGREE ──────────────────────────────────────
 *   1. PRODUCT STATE (this file, a constant) — is the feature part of the product at all?
 *   2. OPERATOR CONFIG (`bonus-config.ts`, DB-backed) — is the programme running today?
 * Product off ⇒ off, whatever the config says. An operator cannot switch a withdrawn
 * feature back on by editing a row, which is the entire point of keeping it up here:
 * `bonus-config.ts` records Jay's (Gaming Board) item #5 as a FEATURE-STATE, NOT A DELETION,
 * and a feature-state that a misclick can reverse is not a state, it is a default.
 *
 * ── WHY `WITHDRAWN` IS NOT `COMING_SOON` ─────────────────────────────────────
 * A gilt "coming soon" badge is a PROMISE. Invite wore one while it waited for sign-off.
 * Ali's call (this programme): normal players do not get Invite & Earn or the bonus wallet
 * at all, so the badge would advertise a programme we are withdrawing. `WITHDRAWN` renders
 * NOTHING — no entry point, no badge, no tooltip, no mention.
 * ⭐ **AND SINCE 2026-09-06 THE STATE IS GONE, NOT MERELY UNUSED.** This section argued the
 * case and then left `COMING_SOON` in the type, where an operator could still set it — and
 * setting it would have changed nothing, because no consumer ever distinguished it. The
 * argument is kept; the state it argued against is deleted. See `FeatureState` below.
 *
 * ── ⛔ GATE THE OFFER, NEVER THE REFUSAL ─────────────────────────────────────
 * These predicates decide what we OFFER. They must never be consulted to decide what we
 * FORBID. Two live examples, both money:
 *   • `market-service.ts` → `sellable = … && !bonusFunded` and its `BONUS_FUNDED` refusal.
 *     Gating that converts a laundering block into a laundering route.
 *   • Wagering accrual, grant fulfilment and expiry. Gating those freezes a live grant's
 *     money forever — the player could never play it through.
 * Accounting (`house-ledger.ts`) is not gated either: the owner's book counts money that
 * exists, not money we are currently advertising.
 *
 * ── ⛔ SERVER COMPUTES, CLIENTS RECEIVE ──────────────────────────────────────
 * Feature visibility is role-dependent, and a client component does not know the role.
 * So the SHELL resolves these once and threads booleans down as props — exactly how
 * `proposalsState` already reaches `TopAppBar` / `BottomNav` / `PublicFooter`
 * (`app-shell.tsx`). ⚠️ Do not import this module into a `"use client"` file: a client
 * helper called from server components has taken every page down in this repo before.
 */
import type { Role } from "@/lib/server/roles";

/**
 * ACTIVE = live. WITHDRAWN = not part of the product.
 *
 * 🔴 `COMING_SOON` WAS REMOVED 2026-09-06, and it is worth knowing why rather than just that.
 * It was a third state **no consumer of this module ever distinguished**: every call site asks
 * `=== "ACTIVE"` (`inviteIsLiveFor`, `bonusIsLiveFor`), so COMING_SOON behaved identically to
 * WITHDRAWN everywhere — while its NAME promised a badge, a page and a waiting list. The three
 * copy keys that would have rendered it were read by nothing and are now deleted.
 *
 * ⛔ That is exactly the defect §4 of `docs/BONUS-WITHDRAWAL.md` already records this programme
 * deleting once: *"A flag worse than dead code. A generic `comingSoon` on four nav components
 * whose only producer was Invite — the next feature to set it would silently have worn Invite's
 * words."* This was the same shape one level up, in the switch itself. A state an operator can
 * set, that changes nothing, is worse than no state: it reads as a decision taken.
 *
 * ⚠️ The CONCEPT still exists where it is genuinely implemented — the Proposals feature-state
 * machine (`proposals-config.ts`, `propose-promo.tsx`, `coming-soon-banner.tsx`) renders a real
 * gilt badge for it. This module governs FIVE features: `invite` (ACTIVE — the unpaid player
 * share) and its money half `inviteRewards` (WITHDRAWN), `bonus` and `install` (WITHDRAWN, and
 * neither promised), and `desk` — which is ACTIVE and is not a player surface at all (owner
 * ruling D19: nothing about it reaches a player or the holder). Its WITHDRAWN state is a SUNSET,
 * written by `ops:house-bots-sunset` in the database and by this constant in the code.
 *
 * ⭐ AND `invite` / `inviteRewards` ARE WHY THE TWO-STATE TYPE SURVIVED THE 2026-09-25 CHANGE
 * RATHER THAN GROWING A THIRD MEMBER. An "UNPAID" state would have been settable on `bonus`,
 * `install` and `desk`, where it means nothing and no consumer would distinguish it — the exact
 * defect the paragraphs above record deleting twice. A feature whose surface and whose money
 * switch independently has TWO facts, so it gets TWO entries in the table.
 */
export type FeatureState = "ACTIVE" | "WITHDRAWN";

/**
 * The features this table governs.
 *
 * ⛔ `desk` IS THE FEATURE'S KEY HERE AND THE NEUTRAL WORD IS DELIBERATE — DO NOT "CORRECT" IT BACK.
 * It was `houseBots` until 2026-09-21, and `test:house-bot-surfaces` 3.hop.2 and 6.hop.2 went red on it:
 * every member of this union is a STRING LITERAL, and this module is imported directly by `/admin/bonuses`
 * and by seven player routes, so it sits in BOTH one-hop painter populations — the exact population that
 * exists because L52's house word lived in `rate-limit.ts` and was painted on `/admin/system` by a page in
 * another section. ⭐ AND THE PRECEDENT IS L52's OWN REMEDY, taken again rather than reasoned around: that
 * rate-limit key was RENAMED to the neutral `desk.picker` rather than added to an exemption list, and
 * `/admin/desk` is already the platform's own neutral name for the section. Registering the word here would
 * have widened an exemption to make a guard green, which this programme refuses by name.
 * ⚠️ THE IDENTIFIERS ARE NOT RENAMED AND THAT IS THE SAME RULING, NOT AN INCONSISTENCY: `houseBotsLive` is
 * a NAME IN CODE, which no surface can print; the guards that read this module read the strings a file can
 * PRINT. What the feature is called in code stays honest; what it is called in a string stays neutral.
 * ⛔ The operator override moves with the key: it is `FEATURE_DESK`, not `FEATURE_HOUSEBOTS`.
 */
export type FeatureName = "invite" | "inviteRewards" | "bonus" | "install" | "desk";

/**
 * ⛔ THE SWITCHES. Changing one word here changes the whole product surface.
 *
 * `invite` — the SURFACE: may a player hold a referral link, share it, and have the people who
 * arrive on it attributed to them? ACTIVE since 2026-09-25. Approved AGENTs were the only
 * exception while it was WITHDRAWN, and `inviteStateFor` below still carries that branch,
 * because for them it is not a promo: it is the commercial relationship they were vetted,
 * charged and approved for.
 *
 * ⭐ `inviteRewards` — THE MONEY, AND IT IS A SECOND SWITCH ON PURPOSE (Ali, 2026-09-25:
 * *"we don't want to pay anything on affiliate … i want to track how many people he got with
 * this link, i'll pay him cash not through 50pick, and we can keep that option if needed"*).
 * The player invite is a SHARE, not an inducement: the link works, the recruits are counted, and
 * the platform credits nothing. WITHDRAWN here refuses every PLAYER-programme accrual in
 * `policyFor`, so the zero is a product state and not a config value.
 *
 * 🔴 AND THAT DISTINCTION IS THE WHOLE POINT — "set the commission to 0%" WOULD NOT HAVE HELD.
 * `affiliate.config` is a DB row with `prize.enabled: true` and `amountTzs: 10_000` in its
 * shipped defaults, `defineConfig` hydrates a persisted row as `{ ...defaults, ...restored }`
 * with no validation, and `/admin/affiliate` is one click from switching a mode back on. A rate
 * of zero beside a live prize mode still pays TZS 10,000 a head — the same route by which
 * `feeVatRatePct` reached production as 0. The operator's levers stay exactly where they are and
 * keep meaning what they say; this switch decides whether they are consulted at all.
 *
 * ⛔ IT GOVERNS THE PLAYER PROGRAMME ONLY. An approved agent's commission is contracted income
 * bought with a TZS 100,000 fee; it is ended by their STANDING and their officer's rate, never by
 * a promo switch. `policyFor`'s AGENT branch does not read this, exactly as it does not read
 * `cfg.enabled` — see `test:player-invite-unpaid` §2 and `test:agent-policy` §4.
 *
 * ⚠️ TURNING IT ON IS ONE WORD HERE (or `FEATURE_INVITEREWARDS=ACTIVE`), and the paid path is
 * NOT dead code while it sleeps: `test:referral`, `test:rg-cash-incentive` §5 and
 * `test:withdrawn-features` §4 all drive the ON branch on every deploy, which is the reason the
 * override exists at all.
 *
 * `bonus` — WITHDRAWN for everyone. No role opens it.
 *
 * `install` — the home-screen install invitation, WITHDRAWN 2026-09-13 (Ali: *"keep only the
 * socials popup … the install, hide it for now, later we activate — it's disturbing users"*).
 * Nothing about it is deleted: the component, its copy, its eligibility rules and its guards all
 * stay, and the shell mounts it behind `installInviteIsLive()`. ACTIVE here brings it back.
 *
 * ⭐ `desk` — ACTIVE, and the ONE entry here that is not a player surface (04 F2). The key is neutral by
 * ruling; see `FeatureName` above for why, and `houseBotsLive()` below for what it gates. ⛔ WITHDRAWN
 * here is a SUNSET, and it is the CODE half of a two-part terminal state: `ops:house-bots-sunset`
 * writes `offCause = 'SUNSET'` on the control row, and this constant is committed and deployed after
 * it. ⛔ THE TWO HALVES MUST NOT DISAGREE, and neither may be the only one anyone maintains: the DB
 * marker survives a redeploy of old code, and this constant survives a database somebody edits by
 * hand. Each ALONE refuses the switch, the roster and the engine; `test:withdrawn-features` §9d drives
 * both and asserts they refuse identically.
 */
const PRODUCT_STATE: Record<FeatureName, FeatureState> = {
  invite: "ACTIVE",
  inviteRewards: "WITHDRAWN",
  bonus: "WITHDRAWN",
  install: "WITHDRAWN",
  desk: "ACTIVE",
};

/**
 * ⭐ THE TEST OVERRIDE, AND WHY A SWITCHED-OFF FEATURE NEEDS ONE.
 *
 * A dormant path rots because nothing runs it — that is the whole reason re-enabling a
 * feature months later ships broken. `invite-feature.ts` was a hardcoded `const`, so the
 * ACTIVE path was UNTESTABLE and had not been executed by anything since the day it was
 * switched off. Here the state is readable, so `scripts/withdrawn-features.test.mts` §4 drives
 * the ON branch on every deploy for as long as the feature sleeps.
 * ⚠️ This comment named `scripts/reenablement.test.mts` until an audit checked and found no
 * such file had ever existed on any branch. A comment that cites a guard by name is read as
 * evidence the guard exists — so it must name one that does.
 *
 * ⛔ Server-side only, and deliberately not `NEXT_PUBLIC_`: this must never be flippable
 * from a browser, and clients receive resolved booleans rather than reading state at all.
 * Defaults to the shipped constant, so a missing env var is always the live product.
 */
function resolvedState(name: FeatureName): FeatureState {
  const raw = process.env[`FEATURE_${name.toUpperCase()}`];
  if (raw === "ACTIVE" || raw === "WITHDRAWN") return raw;
  // ⭐ ANYTHING ELSE FALLS BACK TO THE SHIPPED CONSTANT — including the retired `COMING_SOON`.
  // That is the safe direction and it is deliberate: an operator who sets a value this module no
  // longer understands gets the product as shipped, never an accidental ACTIVE. A typo cannot
  // switch a withdrawn feature on.
  return PRODUCT_STATE[name];
}

/**
 * Who is asking. ⛔ NOT A ROLE STRING ANY MORE, AND THE CHANGE OF SHAPE IS DELIBERATE.
 *
 * 🔴 `inviteStateFor(role)` keyed the agent exception on `role === "AGENT"` alone, and a role is
 * the wrong fact three ways at once: (1) a DEACTIVATED agent keeps role AGENT and so kept every
 * entry point, share surface and badge; (2) a test fixture with `role: "AGENT"` and no approval
 * sailed through as an agent, which is how three predeploy guards asserted an unapproved
 * "agent" earning the player prize and stayed green; (3) the sealed decision is that
 * `AffiliateAgent.approvedAt` ALONE identifies an agent — a row's existence proves nothing, and
 * a role string proves less.
 *
 * `agentInGoodStanding` is `agentStandingFor(user, account).ok` — approved, active, and not
 * closed/suspended/self-excluded — computed by `inviteViewerFor` in `affiliate-service.ts`,
 * the ONE server helper that loads the two rows. Making it a required field of an object,
 * rather than an optional second argument, is what forced the compiler to surface every call
 * site: an optional flag would have let the old role-only answer keep compiling everywhere.
 */
export type InviteViewer = {
  role: Role | null | undefined;
  /** ⭐ THE discriminator — never derived from `role`. */
  agentInGoodStanding: boolean;
  /**
   * ⭐ MAY THIS VIEWER HOLD THE **PLAYER** (UNPAID) INVITE LINK? Added 2026-09-25, and it is not
   * decoration. `playerInviteEligibleFor` in `affiliate-service.ts` composes it from TWO facts,
   * and each one is a defect that would otherwise ship:
   *
   * 🔴 (1) ACCOUNT STATUS. While `invite` was WITHDRAWN the player branch was shut for everyone,
   * so a player's own status never reached this decision. Opening it makes CLOSED, SUSPENDED and
   * SELF_EXCLUDED load-bearing — a self-excluded player recruiting gamblers is exactly the
   * failure this field exists to stop, and it is not hypothetical: a referral link is a public
   * artefact on WhatsApp that never expires, and `bindRecruit` runs server-side against the
   * REFERRER's stored row long after they have gone. The agent programme already refuses on
   * these three (`agentStandingFor`); the unvetted branch may not be looser than the vetted one.
   *
   * 🔴 (2) NOT AN AGENT — IN OR OUT OF STANDING, AND THE SECOND HALF IS THE ONE THAT BITES. A
   * DEACTIVATED agent keeps `approvedAt`, so `mayRecruit` still routes them down the AGENT branch
   * and refuses the bind with `agent_deactivated`. Without this clause they would pass the player
   * gate instead, and every surface would hand them a fresh referral code — on `/markets/[id]`,
   * on `/positions`, on the share sheet — that `bindRecruit` then refuses for every single person
   * who uses it. A link that cannot bind is worse than no link: the sharer believes they are
   * being counted. Found by `test:agent-eligibility` 3.deactivated going red, not by reasoning.
   *
   * ⚠️ COOLED_OFF IS DELIBERATELY ABSENT, the same ruling `agentStandingFor` records: a
   * cooling-off break is about the player's OWN betting, and sharing a link is not betting.
   *
   * ⛔ REQUIRED, not optional — an optional flag would have let every existing call site keep
   * compiling with the old, status-blind answer. That is the same reason `agentInGoodStanding`
   * is required, and the compiler is the only thing that finds all of them.
   */
  playerInviteEligible: boolean;
};

/** A signed-out viewer, or a failed user read: the safe, closed default. */
export const NO_VIEWER: InviteViewer = { role: null, agentInGoodStanding: false, playerInviteEligible: false };

/**
 * Invite's state for a given viewer — may they hold a link and be credited with the people who
 * arrive on it? ⛔ It says NOTHING about money; `playerInviteRewardsLive()` below is that
 * question, and the two are separate switches.
 *
 * An agent in good standing gets the live programme whatever the product state says. Everyone
 * else needs the product state ACTIVE *and* `playerInviteEligible` — which is closed both to an
 * account out of standing and to an agent who has LOST standing (see the field's own note: their
 * code is refused by the agent branch of the bind, so a player link would never work for them).
 *
 * ⚠️ `role === "AGENT"` is assigned in exactly ONE place: agent-application approval. But it
 * is NOT what opens the programme — standing is. A deactivated agent keeps the role and loses
 * the programme, which is exactly the point.
 *
 * ⛔ THE AGENT BRANCH IS FIRST AND THAT ORDERING IS THE RULING, NOT A STYLE. It used to sit
 * second because the product state ACTIVE opened the gate for everybody, so the two orders
 * agreed; now that an ordinary player must also clear `accountInGoodStanding`, reading the
 * product state first would put an approved partner's contracted relationship behind the player
 * promo's gate — the door-vs-room error, one level up. `test:agent-policy` §4 holds it open.
 */
export function inviteStateFor(viewer: InviteViewer | null | undefined): FeatureState {
  if (viewer?.agentInGoodStanding) return "ACTIVE";
  const state = resolvedState("invite");
  if (state !== "ACTIVE") return state;
  return viewer?.playerInviteEligible ? "ACTIVE" : "WITHDRAWN";
}

/** True only when this viewer may actually hold a referral link and recruit on it. */
export function inviteIsLiveFor(viewer: InviteViewer | null | undefined): boolean {
  return inviteStateFor(viewer) === "ACTIVE";
}

/**
 * ⭐ MAY A **PLAYER**-PROGRAMME REFERRAL PAY ANYTHING AT ALL? Today: no.
 *
 * This is the second half of the pair. `inviteIsLiveFor` opens the SURFACE — the link, the QR,
 * the share sheet, the attribution. This opens the MONEY, and it is WITHDRAWN: the platform
 * credits a player nothing for the friends they bring, by product state rather than by a config
 * row anyone can click (see `inviteRewards` in the table above for why 0% would not have held).
 *
 * ⛔ NO VIEWER ARGUMENT, ON PURPOSE. It is a property of the PROGRAMME, not of a person: there
 * is no player for whom the answer differs, and a viewer parameter would invite exactly the
 * "this one account still earns" exception the state exists to forbid. An AGENT's income is not
 * governed here at all — see the table above.
 *
 * ⛔ GATE THE OFFER, NEVER THE REFUSAL (this module's own header). This decides whether an
 * accrual is CREATED. It must never be consulted to decide whether an already-accrued reward may
 * be paid, reversed or clawed back: rewards written while the programme paid are real debts, and
 * switching the product state must not strand them.
 */
export function playerInviteRewardsLive(): boolean {
  return resolvedState("inviteRewards") === "ACTIVE";
}

/** Bonus wallet state. No role exception — withdrawn is withdrawn. */
export function bonusStateFor(_role?: Role | null | undefined): FeatureState {
  return resolvedState("bonus");
}

/**
 * True when the bonus wallet is part of the product and may be SHOWN or GRANTED.
 * ⛔ Never consult this to decide a refusal — see the header.
 */
export function bonusIsLiveFor(role?: Role | null | undefined): boolean {
  return bonusStateFor(role) === "ACTIVE";
}

/**
 * True when the home-screen install invitation (`src/components/pwa/install-invite.tsx`) may be
 * mounted. WITHDRAWN since 2026-09-13 — see `install` in the table above. No role exception: when
 * live it is offered to visitors and players alike, and its own rules still decide the moment.
 * ⭐ Re-enable with `install: "ACTIVE"` above, or `FEATURE_INSTALL=ACTIVE` on the server.
 * ⛔ Resolved in the SHELL (a server component) and never read by the client component itself.
 */
export function installInviteIsLive(): boolean {
  return resolvedState("install") === "ACTIVE";
}

/**
 * True while house bots are part of the product at all (04 F2).
 *
 * ⛔ NOT THE MASTER SWITCH, AND THE TWO ARE DIFFERENT QUESTIONS. The switch is an OPERATOR control —
 * off today, on tomorrow, flipped from the console by the owner. This is the PRODUCT state: WITHDRAWN
 * means the programme is over, and no console press, no database edit and no redeploy of old code
 * brings it back without changing the constant above. A withdrawn feature cannot be switched on by
 * editing a row, which is the entire point of keeping it up here.
 *
 * ⛔ AND IT GATES THE OFFER, NEVER THE REFUSAL (this module's standing rule). It decides whether the
 * engine may start and whether an account may be designated, started or re-checked. It must NEVER be
 * consulted to decide whether a house bet SETTLES, whether a marked position may be cashed out, or
 * what the owner's book counts: withdrawing a programme must not strand money that is already on the
 * table. Open house positions settle normally — a pari-mutuel pool cannot void one position.
 * ⛔ Server-side only. It is never read by a client module and never reaches a player or a holder (D19).
 * ⚠️ ITS KEY IS THE NEUTRAL `desk` AND ITS OPERATOR OVERRIDE IS `FEATURE_DESK` (renamed from `houseBots` /
 * `FEATURE_HOUSEBOTS`, 2026-09-21, ruling recorded on `FeatureName` above). The FUNCTION keeps the feature's
 * real name because a function name is not a string this module can print; the KEY is a string literal and a
 * string literal is what the one-hop painter guards read.
 */
export function houseBotsLive(): boolean {
  return resolvedState("desk") === "ACTIVE";
}
