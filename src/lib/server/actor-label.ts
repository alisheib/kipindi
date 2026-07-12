/**
 * By-id actor name resolution — the ONE async way to turn an actor/officer/player
 * user-id into a human label (DB lookup + fallback). Replaces the duplicated
 * `officerName()` / `nameOf()` helpers and the scattered
 * `u?.displayName?.trim() || id` expressions that had drifted apart.
 *
 * For the object case (you already hold the user), keep using
 * `displayLabel(user)` from `@/lib/display-label` — these are its by-id,
 * DB-fetching counterparts.
 */
import { db } from "./store";
import { displayLabel } from "@/lib/display-label";

/**
 * Resolve an actor/officer user-id → display name.
 *  - null id → null (so callers can render "—").
 *  - system actors ("system", "system_ai", …) → returned verbatim.
 *  - a staff member with a displayName → that name.
 *  - otherwise → the raw id, or `opts.fallback(id)` if supplied
 *    (e.g. `Generator · <id>` for report generators).
 * Faithful to the prior officerName()/nameOf() helpers (same system-id guard,
 * same sync-store-safe Promise.resolve + .catch).
 */
export async function officerLabel(
  id: string | null,
  opts?: { fallback?: (id: string) => string },
): Promise<string | null> {
  if (!id) return null;
  if (id.startsWith("system")) return id;
  const u = await Promise.resolve(db.user.findById(id)).catch(() => null);
  const name = (u?.displayName ?? "").trim();
  if (name) return name;
  return opts?.fallback ? opts.fallback(id) : id;
}

/**
 * Resolve a player user-id → the canonical player handle (displayName, or the
 * stable "Player #TAIL" anonymous handle) via `displayLabel`. Sync-store-safe.
 */
export async function playerLabel(id: string): Promise<string> {
  const u = await Promise.resolve(db.user.findById(id)).catch(() => null);
  return displayLabel(u ?? { id, displayName: null });
}
