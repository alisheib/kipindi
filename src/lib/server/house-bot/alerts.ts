/**
 * WHO IS TOLD ABOUT A HOUSE BOT — one resolver (04 A22), and the holder's handle in admin copy (04 R6).
 *
 * ⭐ THE SAME RULE AS THE OWNER GUARD. A house-bot alert goes to exactly the people who may act on it: today
 * `requireOwner` (`rbac-guard.ts`) admits every ADMIN, so every ADMIN is told. A second list here would be
 * an alert that reaches someone who cannot open the page, or misses someone who can. When commit 7's
 * `requireHouseOwner` lands, this follows it; `test:house-bot-designation` pins the guard's predicate so a
 * change to one without the other goes red.
 *
 * Callers: the erasure refusal (commit 3); the engine's roster, pause and money alerts (commits 4 and 7).
 */
import { db, type StoredUser } from "../store";
import { displayLabel } from "@/lib/display-label";

/** Every account the owner guard admits, today every ADMIN. */
export async function houseBotAlertRecipients(): Promise<StoredUser[]> {
  const admins = await db.user.listByRoles(["ADMIN"]);
  return admins.filter((u) => u.role === "ADMIN");
}

/**
 * `{holder}` in every admin HOUSE_BOT title, body and email: "Player #TAIL" (04 R6). ⛔ Never `displayLabel`
 * with the display name, a masked name or a phone — a notification row outlives the holder's erasure.
 */
export function playerHandle(userId: string): string {
  return displayLabel({ id: userId, displayName: null });
}
