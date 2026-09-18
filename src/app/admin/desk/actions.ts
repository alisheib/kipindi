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
  const session = await currentSession();
  try {
    const result = await houseLimitsSaveForConsole(session?.userId ?? null, "/admin/desk", input);
    /* Only a save that LANDED invalidates the render; a refusal changed nothing and must not make the officer's
       own typing disappear under a fresh server payload. */
    if (result.ok) revalidatePath(CONSOLE_ROUTE);
    return result;
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing was saved. Reload the page and try again.") };
  }
}
