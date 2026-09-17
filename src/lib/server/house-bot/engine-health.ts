/**
 * THE ENGINE'S HEALTH, FOR THE OWNER ONLY — the admin-gated server reader (owner ruling D19; C5-SPEC ruling 172).
 *
 * ⛔ WHY IT MOVED. `/api/health` is public and the proxy does not gate it; it used to print a `houseBots` block (schema
 * state, engine started/refused, tick times, the late-reaction drop count) to any visitor. Under D19 nothing about house
 * bots is public, so the same facts live here, behind the house-alert audience, and render on `/admin/system` from its
 * SERVER page. `/api/health` keeps only the readiness gate: a missing house schema still answers 503 with `ok:false`,
 * and the reason is in the server log and on this reader. Commit 7's strip and Commit 8's `ops:house-bots-status` read
 * this reader too.
 *
 * ⛔ THE GATE DECIDES ON THE STORED ROLE, never the session cookie's photograph of it (`session.ts`): the viewer's account
 * is read, and only the house-alert audience (`inHouseAlertAudience`, the rule `houseBotAlertRecipients` follows — every
 * ADMIN) gets anything back. Every other viewer gets `null` before any engine or schema read: no card, no placeholder.
 */
import { db } from "../store";
import { inHouseAlertAudience } from "./alerts";
import { houseBotEngineHealth } from "./engine";
import { houseBotSchemaReady, type HouseSchemaState } from "./schema-ready";

export type HouseEngineHealthView =
  | { readable: true; schema: HouseSchemaState; engine: ReturnType<typeof houseBotEngineHealth> }
  | { readable: false };

/** The engine and schema state for `viewerUserId`, or `null` when that account is not in the house-alert audience. */
export async function houseEngineHealthFor(viewerUserId: string | null | undefined): Promise<HouseEngineHealthView | null> {
  if (!viewerUserId) return null;
  const viewer = await db.user.findById(viewerUserId);
  if (!viewer || !inHouseAlertAudience(viewer.role)) return null;
  try {
    return { readable: true, schema: await houseBotSchemaReady(), engine: houseBotEngineHealth() };
  } catch {
    // An ADMIN whose read failed is told so; the page never turns a failed read into a healthy-looking card.
    return { readable: false };
  }
}
