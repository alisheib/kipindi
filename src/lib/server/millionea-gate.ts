/**
 * MASWALI MILLIONEA — THE ONE GATE EVERY PLAYER ROUTE CALLS FIRST (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, MR-2).
 *
 *     WITHDRAWN      → nobody: every `/millionea` route is a 404
 *     STAFF_PREVIEW  → a staff session (its STORED role, re-read per request) or a Millionea preview-pass holder
 *     ACTIVE         → everyone
 *
 * The decision is the rollout's own (`millionea-rollout.ts → millioneaVisibleFor`, resolved per request by
 * `millionea-preview.ts → resolveMillionea`, React-cached so the page, its metadata, the home card and the More row can
 * never disagree inside one render). This file only turns "not visible" into the 404 a route returns.
 *
 * ⛔ A HIDDEN PRODUCT IS A MISSING PAGE, NOT A REFUSAL: `notFound()`, the same answer as a route that does not exist —
 *    never "coming soon", never a redirect that names the product. Call it from the page AND from `generateMetadata`, so
 *    a hidden route's tab title cannot announce it either.
 * ⛔ THE ACTIONS ASK THE SAME QUESTION (`maswali-player-acts.ts`): an act on a page the viewer cannot see is refused with
 *    `millionea_not_available` before anything is read.
 * ⏳ The preview pass (non-staff QA players, S8's drive) has no reader yet — S1 deferred it to the route that writes it,
 *    with its privacy-notice sentence — so STAFF_PREVIEW admits staff sessions only until it lands. `resolveMillioneaFor`
 *    already takes the pass, so no caller of this gate changes when it does.
 * ⭐ THE TICKETS HAVE A GATE OF THEIR OWN (`millioneaTicketGate`; the lead's decision L5, 2026-10-17): a kill hides the
 *    PRODUCT, never a player's own tickets.
 */
import { notFound } from "next/navigation";
import { getSession } from "./session";
import { ticketStore } from "./maswali-dal";
import { resolveMillionea, type MillioneaResolution } from "./millionea-preview";

/** The viewer as the gate admitted them: the rollout's answer and the signed-in account, if any. */
export type MillioneaAdmitted = MillioneaResolution & { visible: true; userId: string | null };

/** ⭐ THE GATE. A route's first line: it returns the admitted viewer, or ends the request as a 404. */
export async function millioneaGate(): Promise<MillioneaAdmitted> {
  const r = await resolveMillionea();
  if (!r.visible) notFound();
  let userId: string | null = null;
  try { userId = (await getSession())?.userId ?? null; } catch { userId = null; }
  return { ...r, visible: true, userId };
}

/** The viewer as the tickets' gate admitted them: the rollout's answer, the signed-in account, and whether they were let
 *  in as a HOLDER of their own tickets while the product is hidden from them (`visible` false, `holder` true). */
export type MillioneaTicketAdmitted = MillioneaResolution & { userId: string | null; holder: boolean };

/**
 * ⭐ THE TICKETS' GATE (the lead's decision L5, 2026-10-17: a kill — WITHDRAWN — hides the PRODUCT, never a player's own
 * tickets). `/millionea/tickets` and `/millionea/tickets/[serial]` ask THIS instead of `millioneaGate`:
 *   · the product visible to this request → admitted, exactly as `millioneaGate` admits;
 *   · hidden → admitted only for a signed-in account that HOLDS a Millionea ticket (any week, any state): their tickets,
 *     each one's result, any refund and the free cancel inside its window stay theirs at every rollout state (the cancel
 *     action answers at every state too, `maswali-player-acts.ts`);
 *   · everyone else — signed out, holding none, or a read that fails → the identical 404 of a missing page, so the dark
 *     section of `qa:live` (signed out) and the no-existence-oracle rule (MB-95) both hold. A serial that is not the
 *     viewer's is the page's own 404, the same one.
 * The hub, the slip, How to play, the register and every door on another page follow the rollout alone.
 */
export async function millioneaTicketGate(): Promise<MillioneaTicketAdmitted> {
  const r = await resolveMillionea();
  let userId: string | null = null;
  try { userId = (await getSession())?.userId ?? null; } catch { userId = null; }
  if (r.visible) return { ...r, userId, holder: false };
  if (!userId) notFound();
  let holds = false;
  try { holds = (await ticketStore.listForUser(userId, { limit: 1 })).length > 0; } catch { holds = false; }
  if (!holds) notFound();
  return { ...r, userId, holder: true };
}
