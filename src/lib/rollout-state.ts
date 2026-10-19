/**
 * ROLLOUT STATE — the three positions a staged product rolls out through, and the two helpers every rollout reads:
 *   · WITHDRAWN     — nobody sees it.
 *   · STAFF_PREVIEW — only staff see it (the journey also admits a valid preview pass), under a "Preview" marker.
 *   · ACTIVE        — everyone sees it.
 * The sponsor's journey (`feature-state.ts`) and Maswali Millionea (`millionea-rollout.ts`) each decide what their own
 * positions admit; this module owns only the three words and their order.
 *
 * ⛔ A SEPARATE TYPE FROM `FeatureState`, ON PURPOSE. That type keeps two members because a third that no
 * consumer distinguished (`COMING_SOON`) was deleted on 2026-09-06 (`feature-state.ts`'s header). These three ARE
 * distinguished — `test:simple-journey-flag` drives all three and asserts three different outcomes — and
 * widening `FeatureState` would let `FEATURE_INVITE=STAFF_PREVIEW` mean something nobody built.
 *
 * ⛔ PURE, AND IT MUST STAY SO: it imports nothing (MASWALI-BUILD S5, 2026-10-18). It was carved out of
 * `feature-state.ts` because Millionea's isomorphic ceiling reaches a client bundle — the privacy page's code version,
 * which `legal/policy-lines.ts` reads, and the console's policy form imports that module — while `feature-state.ts`
 * names every feature, including those no client-reachable module may name (`test:house-bot-disclosure` 1.1).
 * `feature-state.ts` re-exports all three for its existing callers.
 */
export type RolloutState = "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE";

const ROLLOUT_RANK: Record<RolloutState, number> = { WITHDRAWN: 0, STAFF_PREVIEW: 1, ACTIVE: 2 };

/** True for exactly the three words, and for nothing else. */
export function isRolloutState(v: unknown): v is RolloutState {
  return v === "WITHDRAWN" || v === "STAFF_PREVIEW" || v === "ACTIVE";
}

/** The LOWER of two positions. ⛔ Anything that is not one of the three words ranks as WITHDRAWN. */
export function lowerRollout(a: RolloutState, b: RolloutState): RolloutState {
  const ra = isRolloutState(a) ? ROLLOUT_RANK[a] : 0;
  const rb = isRolloutState(b) ? ROLLOUT_RANK[b] : 0;
  return ra <= rb ? (isRolloutState(a) ? a : "WITHDRAWN") : (isRolloutState(b) ? b : "WITHDRAWN");
}
