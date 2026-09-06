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
 * gilt badge for it. This module governs two features, both WITHDRAWN, and neither is promised.
 */
export type FeatureState = "ACTIVE" | "WITHDRAWN";

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
  if (raw === "ACTIVE" || raw === "WITHDRAWN") return raw;
  // ⭐ ANYTHING ELSE FALLS BACK TO THE SHIPPED CONSTANT — including the retired `COMING_SOON`.
  // That is the safe direction and it is deliberate: an operator who sets a value this module no
  // longer understands gets the product as shipped, never an accidental ACTIVE. A typo cannot
  // switch a withdrawn feature on.
  return PRODUCT_STATE[name];
}

/**
 * Invite's state for a given role. Approved agents get the live programme; everyone
 * else gets whatever the product state says — today, nothing at all.
 *
 * ⚠️ `role === "AGENT"` is assigned in exactly ONE place: agent-application approval.
 * It is not self-service and it is not assignable from the staff-roles screen.
 */
export function inviteStateFor(role: Role | null | undefined): FeatureState {
  const state = resolvedState("invite");
  if (state === "ACTIVE") return "ACTIVE";
  return role === "AGENT" ? "ACTIVE" : state;
}

/** True only when this role may actually refer and earn. */
export function inviteIsLiveFor(role: Role | null | undefined): boolean {
  return inviteStateFor(role) === "ACTIVE";
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
