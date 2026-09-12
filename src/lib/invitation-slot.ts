/**
 * ONE floating invitation at a time, and the highest-priority claimant wins.
 *
 * 🔴 WHY THIS EXISTS. `install-invite.tsx` and `channels-panel.tsx` are both eligible on the
 * same visit, and on a phone they occupy the SAME full-bleed strip above the tab bar. Nothing
 * prevented both rendering: they would simply stack. This repo has already shipped a WhatsApp
 * FAB sitting on top of a CTA and only LOOKING found it — twice now that failure has been a
 * fixed element landing on another, and neither time did a guard or a screenshot catch it.
 *
 * ⭐ PRIORITY IS A JUDGEMENT, NOT A REGISTRATION ORDER. Install is 1 and wins: it is a utility
 * that makes the product better for the player. The channels panel is 2: it is a thing we want.
 * When we want something and they might want something, they go first.
 *
 * ⛔ THE SLOT DOES NOT DECIDE WHETHER A CARD IS ELIGIBLE — each card still owns its own visit
 * counts, dwell timer, dismissal memory and route suppression. The slot only breaks a TIE. A
 * card that is not eligible must never claim, or it would silence the other one for nothing.
 *
 * The invariant this buys is measurable rather than argued: at most one `[data-invitation]`
 * element in the DOM, ever. `qa:social-panel` asserts it.
 */
import { useEffect, useSyncExternalStore } from "react";

type Claim = { id: string; priority: number };

let claims: readonly Claim[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * The current holder, or null. ⚠️ Must be referentially stable for the same state —
 * `useSyncExternalStore` re-renders in a loop otherwise. It returns a string (or null) rather
 * than an object precisely so identity is value identity.
 */
function holder(): string | null {
  let best: Claim | null = null;
  for (const c of claims) if (!best || c.priority < best.priority) best = c;
  return best ? best.id : null;
}

/** Nothing holds the slot during SSR, so no invitation is ever in the first HTML. */
function serverHolder(): string | null {
  return null;
}

/**
 * @param id        stable identifier, also the `data-invitation` value
 * @param priority  lower wins
 * @param eligible  whether this card WOULD show if it were alone — pass its full gate result
 * @returns         true only when this card is both eligible and holds the slot
 */
export function useInvitationSlot(id: string, priority: number, eligible: boolean): boolean {
  useEffect(() => {
    if (!eligible) return;
    claims = [...claims.filter((c) => c.id !== id), { id, priority }];
    emit();
    return () => {
      claims = claims.filter((c) => c.id !== id);
      emit();
    };
  }, [id, priority, eligible]);

  const current = useSyncExternalStore(subscribe, holder, serverHolder);
  return eligible && current === id;
}

/** Test seam. ⛔ Product code must never call this. */
export function __resetInvitationSlot(): void {
  claims = [];
  emit();
}
