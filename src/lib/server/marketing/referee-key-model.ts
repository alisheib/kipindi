/**
 * U33r · THE AGENT-REFEREE KEYS' RULES — the ONE rule set both DAL twins ask before they read or write `AgentRefereeKey`
 * (`db.agentRefereeKey` in `store.ts` and `prisma-dal.ts`), as `list-basis-model.ts` is for the list basis.
 *
 * ⭐ WHY A MODULE OF ITS OWN. Every behavioural suite runs on the MEMORY twin, which keeps whatever it is handed, while
 * Postgres refuses or reshapes it. A key that is not the keyed hash's own spelling — a raw number above all — must be
 * refused by BOTH twins alike, before anything is read or written, or a caller that slipped a phone number into the key
 * column would pass every suite and store the number in production. So each twin calls these first (`test:dal-parity`
 * §28.model holds the call and its place).
 *
 * ── THE RULES ──────────────────────────────────────────────────────────────────────────────────────────────────
 *   · a referee key is EXACTLY thirty-two letters a–p — `refereeKeyOf`'s spelling (`referee-exclusion.ts`): one letter
 *     per hex nibble of an HMAC, so no digit — and so no phone number, in any spelling — can ever be a key;
 *   · ⛔ A ROW IS THE KEY AND NOTHING ELSE (the U33r review's MAJOR-1, 2026-10-07): exactly one field, `refereeKey`. No
 *     instant of any kind — when a referee was named, when the row was written — because an application's
 *     `refereeConsentAt`, joined on an instant, would link a referee's key back to the applicant who named them. A row
 *     carrying any other field is refused whole, in both twins;
 *   · one `record` call takes at most `REFEREE_KEY_RECORD_MAX` rows, refused above — never cut off.
 * ⛔ The rules say nothing about MEANING: which numbers a contact leads to, and whether its referee was given the old
 * promise at all, are the writer's (`referee-exclusion.ts`).
 * ⛔ PURE: types only from the store (erased), so `store.ts` and `prisma-dal.ts` both import it and there is no cycle.
 * ⛔ No message thrown here ever carries a value — a field is named, never echoed (§5.14).
 *
 * Guard: `npm run test:dal-parity` (§28.model).
 */
import type { StoredAgentRefereeKey } from "@/lib/server/store";

/** Thirty-two letters a–p. ⛔ A character class only, so no escape can be decoded out of it. */
export const REFEREE_KEY = /^[a-p]{32}$/;
/** The most rows one `record` call takes — the backfill writes in calls of this size, and a larger call is refused. */
export const REFEREE_KEY_RECORD_MAX = 2000;

/** Every refusal goes through here, so each names the member it guards. A refused call reads and writes NOTHING. */
function refuse(where: string, why: string): never {
  throw new Error(`[referee-key-model] ${where}: ${why} — nothing was done.`);
}
const isKey = (v: unknown): v is string => typeof v === "string" && REFEREE_KEY.test(v);

/** ⭐ BEFORE A RECORD, in both twins — the batch checked WHOLE before the first write: every row exactly `{ refereeKey }`
 *  with a key in the hash's spelling. A refused batch writes nothing anywhere. */
export function assertRefereeKeyRows(rows: readonly StoredAgentRefereeKey[]): void {
  const where = "agentRefereeKey.record";
  if (!Array.isArray(rows)) refuse(where, "the rows are not a list");
  if (rows.length > REFEREE_KEY_RECORD_MAX) refuse(where, `more than ${REFEREE_KEY_RECORD_MAX} rows in one call`);
  for (const r of rows as readonly unknown[]) {
    if (r === null || typeof r !== "object" || Array.isArray(r)) refuse(where, "a row is not an object");
    const fields = Object.keys(r as object);
    if (fields.length !== 1 || fields[0] !== "refereeKey") refuse(where, "a row holds something beside its key");
    if (!isKey((r as StoredAgentRefereeKey).refereeKey)) refuse(where, "a referee key is not thirty-two letters a–p");
  }
}

/** ⭐ BEFORE A READ, in both twins: every key asked is a referee key's spelling. A raw number asked of the table is a
 *  caller that skipped the keyed hash — refused, never answered "not a referee". */
export function assertRefereeKeys(read: string, keys: readonly string[]): void {
  for (const k of keys) if (!isKey(k)) refuse(read, "a key is not thirty-two letters a–p");
}
