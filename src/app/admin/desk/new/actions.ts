"use server";

/**
 * THE DESIGNATE WIZARD'S TWO MUTATION-PATH ENDPOINTS — the account lookup, and the designation itself
 * (C7-SPEC rulings 382, 383, 387; replan rulings 522, 523).
 *
 * ⛔ **NOTHING OUTSIDE THIS FILE CAN GATE THEM** (ruling 523). A Next server action is a POST to whatever URL the
 * browser happens to be on, carrying a `Next-Action` id in a header; it has no path of its own, so no middleware
 * rule, no layout and no `AdminSectionGate` can see it. Ruling 383 measured the consequence: 200 of the 221 server
 * action ids in this build's manifest appear in publicly downloadable chunks, so any visitor can read the id off the
 * bundle and any signed-in account can POST it. The action's own gate is the only protection there is, and it lives
 * inside the one named door every console read and write goes through.
 *
 * ⛔ **THEY GATE ON THE STORED ROW, NOT ON `session.role`** (ruling 522). A session cookie is a PHOTOGRAPH of the
 * role at sign-in: an account demoted five minutes ago still carries ADMIN in its cookie. So this file hands the
 * door a USER ID and nothing else — it never reads `session.role`, names no store, and takes no decision of its own.
 *
 * ⛔ **NEUTRAL EXPORT NAMES** (ruling 382). A server action's exported name survives verbatim into public chunks —
 * measured: `setRoleGrant`, `addStaffByPhone` and `buildDsarBundleAction` are each findable in `.next/static`. So
 * neither name here says what the desk is for, and neither passes a house-named `action` string to a guard, because
 * a refused caller's SECURITY row records that string in `targetId` and the player's own data export reads it back.
 *
 * ⛔ **THE HOLDER'S PASSWORD PASSES STRAIGHT THROUGH** (owner ruling D5; 02 §2.7). It is read once, in memory, by
 * the one service that may check it, and dropped: no session, no cookie, no sign-in record. This file never logs it,
 * never echoes it and never keeps it.
 *
 * @see src/lib/server/house-console-read.ts · src/lib/server/house-bot/designation.ts
 */
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { safeError } from "@/lib/server/safe-error";
import {
  houseAccountsForConsole,
  houseDesignateForConsole,
  CONSOLE_PICKER_EMPTY,
  type ConsolePickerAnswer,
  type ConsoleDesignateInput,
  type ConsoleDesignateResult,
} from "@/lib/server/house-console-read";
import { CONSOLE_ROUTE } from "@/lib/house-bot/console-routes";

/**
 * Look an account up for the picker.
 *
 * ⛔ THE ANSWER IS THE SAME FOR A REFUSED CALLER AND FOR A SEARCH THAT FOUND NOTHING (ruling 387(c)): an empty row
 * list, one neutral sentence, and no count. Nothing distinguishes "you are not the owner" from "nothing matched" —
 * never a count, never a masked row, never a "no match" that would confirm the query ran against real data.
 * ⛔ AND A TRANSPORT FAILURE ANSWERS THE SAME SHAPE, not a throw: a thrown action clears the client's pending state
 * and leaves an officer looking at a spinner that has stopped meaning anything.
 */
export async function findDeskAccountsAction(query: string): Promise<ConsolePickerAnswer> {
  /* ⛔ THE SESSION READ IS INSIDE THE TRY (C7 step 6 review, d19-hunt-10). It sat above it, so the one failure the
     catch exists to turn into a shape — a read that throws — was the one failure that could still throw the
     action. The gated door treats an absent viewer as refused, so nothing else changes. */
  try {
    const session = await currentSession();
    return await houseAccountsForConsole(session?.userId ?? null, "/admin/desk", query);
  } catch {
    return { rows: [], note: CONSOLE_PICKER_EMPTY, count: "" };
  }
}

/**
 * Put one account on the desk, stopped, with no limits of its own.
 *
 * ⛔ THE RESULT IS A UNION THE CALLER MUST HANDLE, NEVER A THROW: a thrown server action clears the client's pending
 * state and shows the officer nothing, which on the control that admits an account to the desk is the worst possible
 * failure. The catch here covers the rest with a sentence that says plainly that nothing was written.
 * ⛔ A REFUSAL IS NOT A REVALIDATION. Only a designation that LANDED invalidates the desk's own render — a refused
 * one changed nothing and must not wipe what the officer has just typed out from under them.
 */
export async function designateDeskAccountAction(input: ConsoleDesignateInput): Promise<ConsoleDesignateResult> {
  /* ⛔ ONLY WHAT CAN FAIL BEFORE THE WRITE IS INSIDE THE TRY THAT SAYS NOTHING WAS WRITTEN (C7 step 6 review,
     d19-hunt-07). `revalidatePath` sat inside it, so a throw from the REVALIDATION — after the designation had
     already landed — reported the exact opposite of the truth on the one action that admits an account to the
     desk, and the officer's natural retry then met a refusal for an account that was already on it. */
  let result: ConsoleDesignateResult;
  try {
    const session = await currentSession();
    result = await houseDesignateForConsole(session?.userId ?? null, "/admin/desk", input);
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing was written. Reload the page and try again.") };
  }
  if (result.ok) {
    try { revalidatePath(CONSOLE_ROUTE); } catch { /* the write landed; a stale roster is the smaller harm */ }
  }
  return result;
}
