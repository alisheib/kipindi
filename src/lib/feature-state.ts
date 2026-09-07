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

/** ACTIVE = live. COMING_SOON = promised, not open. WITHDRAWN = not part of the product. */
export type FeatureState = "ACTIVE" | "COMING_SOON" | "WITHDRAWN";

/** The features this table governs. */
export type FeatureName = "invite" | "bonus";

/**
 * ⛔ THE SWITCHES. Changing one word here changes the whole product surface.
 *
 * `invite` — WITHDRAWN for ordinary players. Approved AGENTs are the exception and are
 * handled in `inviteStateFor` below, because for them it is not a promo: it is the
 * commercial relationship they were vetted, charged and approved for.
 *
 * `bonus` — WITHDRAWN for everyone. No role opens it.
 */
const PRODUCT_STATE: Record<FeatureName, FeatureState> = {
  invite: "WITHDRAWN",
  bonus: "WITHDRAWN",
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
  if (raw === "ACTIVE" || raw === "COMING_SOON" || raw === "WITHDRAWN") return raw;
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
};

/** A signed-out viewer, or a failed user read: the safe, closed default. */
export const NO_VIEWER: InviteViewer = { role: null, agentInGoodStanding: false };

/**
 * Invite's state for a given viewer. An agent in good standing gets the live programme;
 * everyone else gets whatever the product state says — today, nothing at all.
 *
 * ⚠️ `role === "AGENT"` is assigned in exactly ONE place: agent-application approval. But it
 * is NOT what opens the programme — standing is. A deactivated agent keeps the role and loses
 * the programme, which is exactly the point.
 */
export function inviteStateFor(viewer: InviteViewer | null | undefined): FeatureState {
  const state = resolvedState("invite");
  if (state === "ACTIVE") return "ACTIVE";
  return viewer?.agentInGoodStanding ? "ACTIVE" : state;
}

/** True only when this viewer may actually refer and earn. */
export function inviteIsLiveFor(viewer: InviteViewer | null | undefined): boolean {
  return inviteStateFor(viewer) === "ACTIVE";
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
