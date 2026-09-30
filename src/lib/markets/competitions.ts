/**
 * THE COMPETITION LIST — one definition, and it is PURE (the Vodacom plan S2, 2026-09-30; ruling SJ-8:
 * "Card meta row: `category · competition` on the left. Competition is a new optional field, e.g. 'Ligi Kuu' / 'EPL'").
 *
 * A market's `competition` is a KEY from this list, stored as a plain nullable string (like `category`, never a
 * Postgres enum — an enum would make every new competition an `ALTER TYPE` in a migration of its own). The app
 * validates it here, as a REFUSER: an unknown key is refused, never coerced to a near neighbour.
 * Labels are the dictionary's (`journey.comp*`, read through `competition-label.ts`); null means "no competition",
 * and the card then shows the category alone.
 *
 * ⛔ NO IMPORTS — it is read from both sides of the client/server boundary, as `categories.ts` is.
 * ⛔ One list. The wizard, the admin edit, the AI tool's enum and the backfill all derive from `COMPETITIONS`.
 */
export type Competition =
  | "ligi-kuu"
  | "asfc"
  | "epl"
  | "ucl"
  | "uel"
  | "laliga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "caf-cl"
  | "caf-cc"
  | "afcon"
  | "world-cup"
  | "nba";

/** The ordered list every surface derives from — Tanzania's own competitions first. */
export const COMPETITIONS: readonly Competition[] = [
  "ligi-kuu", "asfc", "epl", "ucl", "uel", "laliga", "serie-a", "bundesliga", "ligue-1",
  "caf-cl", "caf-cc", "afcon", "world-cup", "nba",
] as const;

const SET: ReadonlySet<string> = new Set(COMPETITIONS);

/** True for exactly the keys above, and for nothing else. */
export function isCompetition(v: unknown): v is Competition {
  return typeof v === "string" && SET.has(v);
}

/** What to STORE: a known key, or null. An empty value is null; an unknown one is null too (the writer that
 *  must refuse — the admin edit — checks `isCompetition` itself and says so). */
export function normaliseCompetition(v: unknown): Competition | null {
  if (typeof v !== "string") return null;
  const k = v.trim();
  return isCompetition(k) ? k : null;
}
