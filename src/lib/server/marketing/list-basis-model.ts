/**
 * U33a-L · THE LIST BASIS'S RULES — the ONE rule set both DAL twins ask before they read or write `ContactListBasis`
 * (`db.contactListBasis` in `store.ts` and `prisma-dal.ts`), as `campaign-model.ts` is for the campaign tables.
 *
 * ⭐ WHY A MODULE OF ITS OWN. Every behavioural suite runs on the MEMORY twin, which keeps whatever it is handed, while
 * Postgres refuses or reshapes it: a NUL in a text (22021), a number beyond INTEGER (22003), a fractional version, an
 * instant it cannot parse. A rule written twice drifts, and a rule only Postgres enforces is one no suite ever sees. So
 * each twin calls these BEFORE its first read or write (`test:dal-parity` §27.model holds the call and its place), and
 * `scripts/live/list-basis-pg-probe.mts` drives every refusal through BOTH twins and requires the same answer.
 *
 * ── THE RULES ──────────────────────────────────────────────────────────────────────────────────────────────────
 *   · an id is `lb_` and EXACTLY twenty lower-case letters — the service's minting (U33b-L): no digit run a log could
 *     read as a phone number, and an alphabet in which code-unit order and every Postgres collation agree, so the
 *     same-instant tie (`recordedAt desc, id desc`) breaks identically in both twins whatever the server's collation;
 *   · every instant is EXACTLY `toISOString()`'s spelling — what Prisma hands back — so both twins hold one string for
 *     one instant (a date it cannot parse, or another spelling of one, is refused in both);
 *   · a version is a whole number from 1 to INTEGER's ceiling (2,147,483,647);
 *   · the list, the key, the words, the 18+ confirmation, the proof note and the officer are never blank;
 *   · no text holds a NUL, and no key a read is asked holds one either.
 * ⛔ The rules say nothing about MEANING: the catalogue key, the saved wording versions, the phone-run screen of the
 * proof note and the reason, and the server's clock (a recording is stamped NOW, never a date a caller chose) are
 * U33b-L's service's.
 * ⛔ PURE: types only from the store (erased), so `store.ts` and `prisma-dal.ts` both import it and there is no cycle.
 * ⛔ No message thrown here ever carries a value — a field is named, never echoed (§5.14).
 *
 * Guards: `npm run test:dal-parity` (§27.model) · `npm run db:probe-list-basis` (2j, on both twins).
 */
import type { ContactListBasisSeed, ContactListBasisRevocation } from "@/lib/server/store";

/** `lb_` and exactly twenty lower-case letters. ⛔ Character classes only, so no escape can be decoded out of it. */
export const LIST_BASIS_ID = /^lb_[a-z]{20}$/;
/** Postgres INTEGER's ceiling: a larger version is kept by the memory twin and refused (22003) by Postgres. */
export const LIST_BASIS_VERSION_MAX = 2147483647;
/** Postgres TEXT cannot hold it; built from its code so no escape is ever typed. */
const NUL = String.fromCharCode(0);
/** `toISOString()`'s spelling, built from pieces: four digits, a dash, two, a dash, two, T, two, a colon … Z. */
const DIGITS = (n: number): string => `[0-9]{${n}}`;
const ISO_INSTANT = new RegExp(`^${DIGITS(4)}-${DIGITS(2)}-${DIGITS(2)}T${DIGITS(2)}:${DIGITS(2)}:${DIGITS(2)}[.]${DIGITS(3)}Z$`);

/** Every refusal goes through here, so each names the member it guards. A refused call reads and writes NOTHING. */
function refuse(where: string, why: string): never {
  throw new Error(`[list-basis-model] ${where}: ${why} — nothing was done.`);
}
const isText = (v: unknown): v is string => typeof v === "string" && !v.includes(NUL);
const isFilled = (v: unknown): v is string => isText(v) && v.trim().length > 0;
const isInstant = (v: unknown): v is string =>
  typeof v === "string" && ISO_INSTANT.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const isVersion = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= LIST_BASIS_VERSION_MAX;

/** ⭐ BEFORE A CREATE, in both twins — every column of the seed checked; a refused seed writes nothing anywhere. */
export function assertListBasisSeed(row: ContactListBasisSeed): void {
  const where = "contactListBasis.create";
  if (typeof row.id !== "string" || !LIST_BASIS_ID.test(row.id)) refuse(where, "the id is not lb_ and twenty lower-case letters");
  if (!isFilled(row.listId)) refuse(where, "the list id is blank or holds a NUL");
  if (!isFilled(row.basisKey)) refuse(where, "the basis key is blank or holds a NUL");
  if (!isFilled(row.wording)) refuse(where, "the wording is blank or holds a NUL");
  if (!isVersion(row.wordingVersion)) refuse(where, "the wording version is not a whole number from 1 to 2,147,483,647");
  if (!isFilled(row.adultWording)) refuse(where, "the 18+ confirmation is blank or holds a NUL");
  if (!isVersion(row.adultVersion)) refuse(where, "the 18+ version is not a whole number from 1 to 2,147,483,647");
  if (!isFilled(row.proofNote)) refuse(where, "the proof note is blank or holds a NUL");
  if (!isFilled(row.recordedBy)) refuse(where, "the recording officer is blank or holds a NUL");
  if (!isInstant(row.recordedAt)) refuse(where, "recordedAt is not an instant in toISOString's spelling");
}

/** ⭐ BEFORE A REVOKE, in both twins. Any id may be ASKED (an unknown one answers null) but never one holding a NUL;
 *  the officer and the reason are never blank, and the instant is `toISOString()`'s spelling. */
export function assertListBasisRevocation(r: ContactListBasisRevocation): void {
  const where = "contactListBasis.revoke";
  if (!isText(r.id)) refuse(where, "the id is not text, or holds a NUL");
  if (!isFilled(r.by)) refuse(where, "the revoking officer is blank or holds a NUL");
  if (!isFilled(r.reason)) refuse(where, "the reason is blank or holds a NUL");
  if (!isInstant(r.at)) refuse(where, "at is not an instant in toISOString's spelling");
}

/** ⭐ BEFORE A READ, in both twins: every key asked — a number, a list id — is text with no NUL. Postgres refuses a NUL
 *  in a parameter, so a read the memory twin would answer "none" is refused in both instead. */
export function assertListBasisKeys(read: string, keys: readonly string[]): void {
  for (const k of keys) if (!isText(k)) refuse(read, "a key is not text, or holds a NUL");
}
