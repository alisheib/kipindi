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
 */
import { notFound } from "next/navigation";
import { getSession } from "./session";
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
