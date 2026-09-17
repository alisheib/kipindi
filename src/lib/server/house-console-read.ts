/**
 * THE HOUSE DATA ON A CONSOLE PAGE, READ ONLY FOR A VIEWER WHO MAY SEE THAT PAGE (owner ruling D19; C5-SPEC rulings 259, 260).
 *
 * ⛔ WHY THE GATE IS HERE AND NOT ONLY IN THE LAYOUTS. The console's staff check lives in `admin/layout.tsx` and each
 * section's `AdminSectionGate`. A layout's verdict does not stop its page from rendering: measured 2026-09-17 on this
 * branch's production build, a signed-in PLAYER — the holder and a trigger player too — who opened a console page as a
 * plain document received 200 and the page's whole server payload behind the redirect, and a flight request whose router
 * state names the admin layouts skips them altogether. So every read of house data a console page renders asks THIS
 * module, which decides on the viewer's STORED role (never the session cookie's photograph of it) before it reads
 * anything, the way the engine health card does (ruling 172).
 *
 * ⛔ FAIL CLOSED. A viewer that cannot be read is not in the audience.
 * ⛔ OWNER RULING D20 (2026-09-17): a house bot is an ordinary player in every report, and the admin-only house
 * displays are un-built — so what this module gates is the AUDIT ROWS a console page renders, and nothing else. A later
 * console surface that reads house data reads it through here (C5-SPEC ruling 259's audience), never past it.
 *
 * ⛔ THE AUDIT ROWS A CONSOLE PAGE RENDERS (ruling 260). The same measurement, extended to every console page, found
 * `/admin/players/<holder>` streaming the holder's `house_bot.password_verified` row, and `/admin/audit` every house row with
 * its payload, to a signed-in player. So every audit row a console file reads passes `houseAuditForConsole` before the page
 * uses it: whole for the route's audience, and NO row for anyone else. Not a house-free filter: a platform row can carry a
 * house VALUE (a deduped notice's kind, a failed letter's tag, an error's stack), and a refused erasure's reason exists only
 * for a live house bot, so even a rewritten reason names the account. No list of actions, keys or values closes that; a
 * viewer outside the audience is painted the section gate's restricted panel, so none of the page's rows is theirs to read.
 */
import { db } from "./store";
import { isStaffRole, isAdmin, isOwnerOnlyPath, domainForPath } from "./roles";
import { canView } from "./rbac";
import type { AuditEntry } from "./audit";

/**
 * True only for a signed-in STAFF account whose stored role may VIEW the console route `route` (the same question the
 * section gate asks: Owner-only paths for ADMIN, every other path by its domain's view grant). Never throws.
 */
export async function houseConsoleAudience(viewerUserId: string | null | undefined, route: string): Promise<boolean> {
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0 || !route.startsWith("/admin")) return false;
  try {
    const viewer = await db.user.findById(viewerUserId);
    if (!viewer || !isStaffRole(viewer.role)) return false;
    if (isOwnerOnlyPath(route)) return isAdmin(viewer.role);
    return (await canView(viewer.role, domainForPath(route))) === true;
  } catch {
    return false;
  }
}

/** What a console file's audit reader returns: the ring's rows, a durable page of them, or `null` from the page's own catch. */
export type ConsoleAuditRead = AuditEntry[] | { entries: AuditEntry[]; total?: number; truncated?: boolean } | null | undefined;

/**
 * The audit rows a console page renders, for `viewerUserId` on `route`: exactly what was read for the route's audience; for
 * anyone else (fail closed, `houseConsoleAudience`) NO row — an empty array, or the durable page with no entries, a total of
 * 0 and nothing truncated (a kept total beside fewer entries would count what was withheld). Takes the read itself, or its
 * promise, keeps its shape, and lets a rejected read reject into the page's own catch.
 */
export async function houseAuditForConsole<T extends ConsoleAuditRead>(viewerUserId: string | null | undefined, route: string, read: T | PromiseLike<T>): Promise<T> {
  const rows = await read;
  if (rows == null || (await houseConsoleAudience(viewerUserId, route))) return rows;
  if (Array.isArray(rows)) return [] as unknown as T;
  return { ...rows, entries: [], ...("total" in rows ? { total: 0 } : {}), ...("truncated" in rows ? { truncated: false } : {}) } as T;
}
