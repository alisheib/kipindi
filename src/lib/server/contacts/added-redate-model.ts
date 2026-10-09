/**
 * C8b (B8) · THE RE-DATING'S SHAPE RULE — the ONE rule both DAL twins ask before `marketingContact.redateAdded` reads or
 * writes a row (`store.ts`, `prisma-dal.ts`), as `referee-key-model.ts` is for the referee keys.
 *
 * ⭐ WHY A MODULE OF ITS OWN. Every behavioural suite runs on the MEMORY twin, which would take a batch Postgres refuses or
 * reads differently — an instant `Date` cannot read, one id twice (two "added" instants for one row, the last one winning
 * in one twin and the first in the other), a batch larger than one transaction should hold. So both twins refuse the same
 * batches, the same way, before the compare (`test:dal-parity` §31 holds the call and its place).
 *
 * ── THE RULES ──────────────────────────────────────────────────────────────────────────────────────────────────
 *   · the rows are a list of at most `ADDED_REDATE_MAX` entries (§25's bound, `BULK_KEYED_READ_MAX`), refused above —
 *     never cut off: a cut batch would put SOME of the back-filled rows right and say nothing of the rest;
 *   · each entry is exactly `{ id, expectedCreatedAt, createdAt }` — nothing else rides into the write;
 *   · each id is a contact id's shape (letters, digits, `_` and `-`, at most 64) and appears ONCE;
 *   · both instants read as instants (`Date.parse`), and the new one is never BEFORE the expected one: a row enters the
 *     book at or after the moment its account was made, so a re-dating that moved "Added" earlier would be a defect.
 * ⛔ The rule says nothing about WHICH rows are back-filled or what instant each takes — that is the door's
 * (`added-redate.ts`), from the code that back-filled them and its audit records.
 * ⛔ PURE: types only from the store (erased), so both twins import it and there is no cycle. No message carries a value.
 *
 * Guard: `npm run test:dal-parity` (§31) · `npm run test:registration-contact` (§7, executed on the memory twin).
 */
import type { ContactAddedRedate } from "@/lib/server/store";

/** The most rows one re-dating takes — §25's `BULK_KEYED_READ_MAX`, the same number (the store's constant is not imported:
 *  the store imports this module). */
export const ADDED_REDATE_MAX = 2000;
/** A contact id as the store mints them (`mc_` and letters; the dev seed's `mc_seed_000`). ⛔ A character class only. */
const CONTACT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const FIELDS = ["createdAt", "expectedCreatedAt", "id"].join(",");

/** Every refusal goes through here, so each names the member it guards. A refused batch reads and writes NOTHING. */
function refuse(why: string): never {
  throw new Error(`[added-redate-model] marketingContact.redateAdded: ${why} — nothing was done.`);
}

/** ⭐ BEFORE THE COMPARE, in both twins — the batch checked WHOLE. */
export function assertAddedRedates(rows: readonly ContactAddedRedate[]): void {
  if (!Array.isArray(rows)) refuse("the rows are not a list");
  if (rows.length > ADDED_REDATE_MAX) refuse(`more than ${ADDED_REDATE_MAX} rows in one call`);
  const seen = new Set<string>();
  for (const r of rows as readonly unknown[]) {
    if (r === null || typeof r !== "object" || Array.isArray(r)) refuse("a row is not an object");
    if (Object.keys(r as object).sort().join(",") !== FIELDS) refuse("a row holds something beside its id and its two instants");
    const row = r as ContactAddedRedate;
    if (typeof row.id !== "string" || !CONTACT_ID.test(row.id)) refuse("an id is not a contact id");
    if (seen.has(row.id)) refuse("one contact is named twice");
    seen.add(row.id);
    const from = typeof row.expectedCreatedAt === "string" ? Date.parse(row.expectedCreatedAt) : Number.NaN;
    const to = typeof row.createdAt === "string" ? Date.parse(row.createdAt) : Number.NaN;
    if (!Number.isFinite(from) || !Number.isFinite(to)) refuse("an instant cannot be read");
    if (to < from) refuse("a new Added instant is earlier than the one it replaces");
  }
}
