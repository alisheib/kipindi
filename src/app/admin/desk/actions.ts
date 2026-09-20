"use server";

/**
 * THE DESK'S ONE MUTATION AT THIS CHECKPOINT — the global limits save (replan ruling 537).
 *
 * ⛔ **RULING 523 — NOTHING OUTSIDE THIS FILE CAN GATE IT.** A Next server action is a POST to whatever URL the
 * browser happens to be on, carrying a `Next-Action` id in a header; it does not have a path of its own, so no
 * middleware rule, no layout and no `AdminSectionGate` can see it. Ruling 259 measured the same thing one level
 * out: every page and handler under `src/app/admin` streams its payload to ANY signed-in account, a PLAYER
 * included. So the audience decision is IN the action's own path, before any read or write, and it is the same
 * named door every console read goes through.
 *
 * ⛔ **IT GATES ON THE STORED ROW, NOT ON `session.role`** (ruling 522). `houseLimitsSaveForConsole` resolves the
 * viewer with `db.user.findById(...)` and answers on that row's role. A session cookie is a PHOTOGRAPH of the role
 * at sign-in: an account demoted five minutes ago still carries ADMIN in its cookie, and a save is exactly the
 * thing that must not be decided by it. This file therefore hands the door a USER ID and nothing else — it never
 * reads `session.role` and never makes a decision of its own.
 *
 * ⛔ **THE READS AND THE WRITE ARE NOT HERE** (ruling 340). This file names no store, no house module and no
 * column. It resolves the session, calls the one gated writer, and revalidates the section so the strip's
 * "Set N global limits first →" count, the rail's badge and the usage bars all come back from the same next read.
 *
 * @see src/lib/server/house-console-read.ts · src/lib/server/house-bot/limits-save.ts
 */
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { safeError } from "@/lib/server/safe-error";
import {
  houseLimitsSaveForConsole,
  type ConsoleLimitsSaveInput,
  type ConsoleLimitsSaveResult,
  houseSwitchForConsole,
  type ConsoleSwitchInput,
  type ConsoleSwitchResult,
  houseAccountActForConsole,
  type ConsoleAccountActInput,
  type ConsoleAccountActResult,
  houseCancelIntentForConsole,
  type ConsoleCancelInput,
  type ConsoleCancelResult,
} from "@/lib/server/house-console-read";
import { CONSOLE_ROUTE } from "@/lib/house-bot/console-routes";

/**
 * Save every global limit at once, conditional on the version the form was rendered from.
 *
 * ⛔ The result is a UNION the caller must handle, never a throw: a thrown server action clears the client's
 * pending state and shows the officer nothing, which on a control that moves money limits is the worst possible
 * failure. `runAdminAction` on the client covers the residual, and the catch here covers the rest with a sentence
 * that says plainly that nothing may have applied.
 */
export async function saveDeskLimitsAction(input: ConsoleLimitsSaveInput): Promise<ConsoleLimitsSaveResult> {
  /* ⛔ THE SESSION READ IS INSIDE THE TRY (C7 step 6 review d19-hunt-10, applied to the other three at C7 step 7
     review d19-hunt-05). It sat above it, so the one failure the catch exists to turn into a shape — a read that
     throws — was the one failure that could still throw the action. The gated door treats an absent viewer as
     refused, so nothing else changes. */
  try {
    const session = await currentSession();
    const result = await houseLimitsSaveForConsole(session?.userId ?? null, "/admin/desk", input);
    /* Only a save that LANDED invalidates the render; a refusal changed nothing and must not make the officer's
       own typing disappear under a fresh server payload. */
    if (result.ok) revalidatePath(CONSOLE_ROUTE);
    return result;
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing was saved. Reload the page and try again.") };
  }
}

/**
 * ⭐ THE MASTER-SWITCH CEREMONY — the desk's one control that starts money (C7-SPEC rulings 306, 388, 415;
 * owner-delegated 454; replan ruling 549's 4b).
 *
 * ⛔ THE SWITCH SHIPS OFF (owner ruling D1). This action is the CEREMONY, not the act: nothing calls it but the
 * owner's own dialog, and the control row is `enabled = false` on every environment this branch has touched.
 *
 * ⛔ THE GATE IS INSIDE THE DOOR, NOT HERE (rulings 522, 523). This file resolves the session and hands a USER ID
 * to the one named writer; it reads no role, names no store and takes no decision of its own.
 *
 * ⛔ A REFUSAL IS NOT A REVALIDATION. Only a change that LANDED invalidates the render — a refused ceremony must
 * not wipe the reason the officer has just typed out from under them.
 */
export async function setDeskSwitchAction(input: ConsoleSwitchInput): Promise<ConsoleSwitchResult> {
  /* ⛔ THE SESSION READ IS INSIDE THE TRY (C7 step 6 review d19-hunt-10, applied to the other three at C7 step 7
     review d19-hunt-05). It sat above it, so the one failure the catch exists to turn into a shape — a read that
     throws — was the one failure that could still throw the action. The gated door treats an absent viewer as
     refused, so nothing else changes. */
  /* ⛔ ONLY WHAT CAN FAIL BEFORE THE ACT IS INSIDE THE TRY THAT SAYS NOTHING CHANGED (the shape
     `designateDeskAccountAction` already carries, extended here at the C7 step 7 review). `revalidatePath` sat
     inside it, so a throw from the REVALIDATION — after the ceremony had already landed — reported the exact
     opposite of the truth on the one control that starts money. */
  let result: ConsoleSwitchResult;
  try {
    const session = await currentSession();
    result = await houseSwitchForConsole(session?.userId ?? null, "/admin/desk", input);
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing changed. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try { revalidatePath(CONSOLE_ROUTE); } catch { /* the switch landed; a stale strip is the smaller harm */ }
  }
  return result;
}

/**
 * ⭐ THE ACCOUNT'S ACTION ROW — Start, Pause, Confirm permission, Remove (C7-SPEC ruling 415; replan 549's 4b).
 *
 * ⛔ THE GATE IS INSIDE THE DOOR (rulings 522, 523), and the HOLDER's password passes straight through to the one
 * service that checks it: this file never reads it, never logs it and never keeps it.
 *
 * ⛔ IT REVALIDATES THE ACCOUNT'S OWN PAGE AND THE DESK'S. Pausing or removing an account changes the roster, the
 * band and the strip's own "is anything still live?" answer, so a stale desk behind a changed account is a page
 * saying two things at once — the class 432(n) refuses within one screen, here across two.
 */
export async function runDeskAccountAction(input: ConsoleAccountActInput): Promise<ConsoleAccountActResult> {
  /* ⛔ THE SESSION READ IS INSIDE THE TRY (C7 step 6 review d19-hunt-10, applied to the other three at C7 step 7
     review d19-hunt-05). It sat above it, so the one failure the catch exists to turn into a shape — a read that
     throws — was the one failure that could still throw the action. The gated door treats an absent viewer as
     refused, so nothing else changes. */
  /* ⛔ AND THE REVALIDATION IS OUTSIDE THAT TRY, for the same reason as the ceremony above: Pause and Remove have
     already landed by then, and "Nothing changed" would be the opposite of the truth. */
  let result: ConsoleAccountActResult;
  try {
    const session = await currentSession();
    result = await houseAccountActForConsole(session?.userId ?? null, "/admin/desk", input);
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing changed. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try {
      revalidatePath(CONSOLE_ROUTE);
      revalidatePath(`${CONSOLE_ROUTE}/${input.id}`);
    } catch { /* the act landed; a stale roster is the smaller harm */ }
  }
  return result;
}

/**
 * ⭐ STOP ONE QUEUED STAKE — the desk's first write to the press table (C7-SPEC ruling 415; 04 N1 §2 press flow).
 *
 * ⛔ A FOURTH EXPORT, NOT A FOURTH `act` ON `runDeskAccountAction`. That door's `ConsoleAccountActInput` union is
 * START / PAUSE / REVERIFY / REMOVE and every one of them addresses an ACCOUNT; this addresses one intent and
 * carries a press's own idempotency key, which that union has no room for. Folding it in would have meant one
 * door with two subjects and a shape that is half-ignored on every call.
 *
 * ⛔ THE GATE IS INSIDE THE DOOR (rulings 522, 523), and it is the FIRST thing the door does — this file resolves
 * the session, hands a USER ID to the one named writer and takes no decision of its own: it reads no role, names
 * no store and names no column.
 *
 * ⛔ THE EXPORT NAME AND ITS GUARD LABEL CARRY NO HOUSE WORD (ruling 382), while the AUDIT key the service writes
 * is deliberately not renamed: membership in `HOUSE_AUDIT` is what keeps the row out of a player's own audit read.
 *
 * ⛔ A REFUSAL IS NOT A REVALIDATION, and the revalidation is OUTSIDE the try that says nothing changed — the
 * stake has already been stopped by then, and "Nothing was stopped" would be the opposite of the truth.
 */
export async function cancelDeskIntentAction(input: ConsoleCancelInput): Promise<ConsoleCancelResult> {
  /* ⛔ THE SESSION READ IS INSIDE THE TRY (C7 step 6 review d19-hunt-10): it sat above it on the other three, so
     the one failure the catch exists to turn into a shape — a read that throws — was the one that could still
     throw the action. The gated door treats an absent viewer as refused, so nothing else changes. */
  let result: ConsoleCancelResult;
  try {
    const session = await currentSession();
    result = await houseCancelIntentForConsole(session?.userId ?? null, "/admin/desk", input);
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing was stopped. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    /* The desk's own page: the rail's queued-stake badge, the activity table and the band all come back from the
       same next read, so none of them can disagree with the row the officer has just stopped. */
    try { revalidatePath(CONSOLE_ROUTE); } catch { /* the cancel landed; a stale table is the smaller harm */ }
  }
  return result;
}
