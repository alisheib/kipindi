/**
 * Toast coalescing — whether a toast may join a group, and what the group then says.
 *
 * ── WHY THIS IS A MODULE AND NOT FIFTEEN LINES INSIDE `toast()` ───────────────────────
 *
 * ⭐ SAME REASON `outcome-announcement.ts` IS PURE, AND IT IS THE CODEBASE'S OWN LAW (§5b —
 * assert the VALUE, not the symbol). The decision below is a money decision: it chooses which
 * results are added to one another and which refusals may never be collapsed out of sight. A
 * guard that greps `toast.tsx` for the word `danger` proves nothing about what the provider
 * actually does with it; a guard that CALLS `groupKeyFor` over the cross-product cannot be
 * fooled by a rename, an inverted condition, or a `||` that should have been `&&`.
 *
 * ⛔ NO REACT, NO DOM, NO CLOCK. Every input arrives as an argument, which is what lets
 * `test:presence-class` §9 execute it.
 *
 * @see docs/DESIGN_AUTHORITY.md §F6 · §F9 rule 8
 */

/** What a live group currently stands for. */
export type ToastGroup = {
  /** The toast on screen that holds this group. */
  id: string;
  /** How many results it now covers — 1 the moment it is created. */
  count: number;
  /** Their summed figure. ⛔ One outcome's column only; see `groupKeyFor`. */
  total: number;
};

/**
 * The key this toast may coalesce under, or `undefined` if it must stand alone.
 *
 * ⛔ TWO SHAPES ARE NEVER GROUPED, AND BOTH EXCLUSIONS ARE MONEY RULES RATHER THAN TASTE:
 *
 *  · **`danger`** — a refusal. "Deposit declined" collapsed into "2 results" is precisely the
 *    swallowed money-path failure that §F1 and UD-3 exist to prevent.
 *  · **`durationMs: 0`** — STICKY, which is the shape a refusal takes so that it stays until
 *    it has been read. A sticky toast that merges has had its stickiness quietly revoked.
 *
 * ⭐ ENFORCED HERE, NOT AT THE CALL SITES. A caller that sets `groupKey` on a refusal gets the
 * ungrouped toast it should have asked for, silently and safely — one place to be right about,
 * instead of every announcement site in the product being trusted to remember.
 *
 * ⚠️ The caller's `groupKey` must name the OUTCOME, not merely "a settled result": merging a
 * loss with a refund would state that a returned stake was lost. `routeOutcome` issues
 * `outcome:LOSS` and `outcome:VOID` as separate keys for exactly this reason, so the
 * one-column rule below holds by construction rather than by hope.
 */
export function groupKeyFor(input: {
  groupKey?: string;
  variant?: string;
  /** Already resolved against the provider's default before it reaches here. */
  durationMs: number;
}): string | undefined {
  if (!input.groupKey) return undefined;
  if (input.variant === "danger") return undefined;
  if (input.durationMs <= 0) return undefined;
  return input.groupKey;
}

/**
 * Fold one more member into a group.
 *
 * ⚠️ A MISSING `groupAmount` CONTRIBUTES ZERO, IT DOES NOT POISON THE TOTAL. `total + undefined`
 * is NaN, and a group whose figure is NaN would render "TZS NaN" to a player over real money —
 * the same class of defect as a netted mixed figure, arrived at by arithmetic instead of by
 * policy. A member that states no figure simply raises the count.
 */
export function mergeGroup(prev: ToastGroup, amount: number | undefined): ToastGroup {
  const add = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return { id: prev.id, count: prev.count + 1, total: prev.total + add };
}
