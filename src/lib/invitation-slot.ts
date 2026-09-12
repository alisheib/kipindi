/**
 * ONE floating invitation per SCREEN ZONE. Within a zone the highest-priority claimant wins;
 * different zones never compete.
 *
 * 🔴 WHY THIS EXISTS. Two fixed cards that land on each other is a defect this repo has shipped
 * before — a WhatsApp FAB on top of a CTA, found only by LOOKING. The slot makes "at most one
 * floating invitation in this corner" measurable rather than argued.
 *
 * 🔴 AND WHY IT IS PER-ZONE, WHICH IT WAS NOT AT FIRST. The first version was ONE global slot
 * with install at priority 1 and the channels panel at 2. That is a design that guarantees the
 * loser NEVER SHOWS: both become eligible on the same visit at the same second, install wins
 * every time, and the panel is invisible forever. Measured on production 2026-09-12 —
 * `invitations: ["install"]`, `panelInDom: false`, on every single visit. Ali found it in
 * minutes: *"where is the social banner? i logged in but seeing nothing."*
 *
 * ⭐ A FIXED PRIORITY IS ONLY SAFE BETWEEN THINGS THAT GENUINELY CANNOT COEXIST. The real fix
 * was not a cleverer tie-break — it was noticing they need not tie at all. The install card owns
 * the BOTTOM corner and the channels panel owns the TOP-RIGHT, so both can show without ever
 * touching, and the slot's job shrinks to what it is actually good for: stopping a FUTURE third
 * card from landing on either of them.
 *
 * ⛔ THE SLOT DOES NOT DECIDE WHETHER A CARD IS ELIGIBLE — each card still owns its own visit
 * counts, dwell timer, dismissal memory and route suppression. It only breaks a tie inside one
 * zone. A card that is not eligible must never claim, or it would silence a zone for nothing.
 */
import { useEffect, useSyncExternalStore } from "react";

/** The screen corners an invitation may own. Two cards in different zones never compete. */
export type InvitationZone = "bottom" | "top-right";

type Claim = { id: string; zone: InvitationZone; priority: number };

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
 * The holder of each zone, as a stable string like `bottom=install|top-right=channels`.
 * ⚠️ Must be referentially stable for the same state — `useSyncExternalStore` re-renders in a
 * loop otherwise, which is why this is a derived STRING and not an object.
 */
function holders(): string {
  const best = new Map<InvitationZone, Claim>();
  for (const c of claims) {
    const cur = best.get(c.zone);
    if (!cur || c.priority < cur.priority) best.set(c.zone, c);
  }
  return [...best.entries()].map(([z, c]) => `${z}=${c.id}`).sort().join("|");
}

/** Nothing holds a zone during SSR, so no invitation is ever in the first HTML. */
function serverHolders(): string {
  return "";
}

/**
 * @param id        stable identifier, also the `data-invitation` value
 * @param zone      the corner this card occupies — cards in different zones never compete
 * @param priority  lower wins, WITHIN the zone
 * @param eligible  whether this card WOULD show if it were alone — pass its full gate result
 * @returns         true only when this card is eligible and holds its zone
 */
export function useInvitationSlot(
  id: string,
  zone: InvitationZone,
  priority: number,
  eligible: boolean,
): boolean {
  useEffect(() => {
    if (!eligible) return;
    claims = [...claims.filter((c) => c.id !== id), { id, zone, priority }];
    emit();
    return () => {
      claims = claims.filter((c) => c.id !== id);
      emit();
    };
  }, [id, zone, priority, eligible]);

  const current = useSyncExternalStore(subscribe, holders, serverHolders);
  return eligible && current.split("|").includes(`${zone}=${id}`);
}

/** Test seam. ⛔ Product code must never call this. */
export function __resetInvitationSlot(): void {
  claims = [];
  emit();
}
