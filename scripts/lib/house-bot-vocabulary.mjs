/**
 * THE ONE HOUSE-BOT ABSENCE VOCABULARY (owner ruling D19; C5-SPEC ruling 175).
 *
 * ⛔ WHY ONE MODULE. The words an absence proof looks for were written three times — in `test:house-bot-disclosure`,
 * `verify:house-bot-bundle` and `qa:house-bot-holder-view` — and the copies drifted (`house[ -]?bots?` against
 * `house[_ -]?bots?`; `HouseBot\w*` against `HouseBot[A-Z]\w*`), so two guards could disagree about the same file.
 * Every absence consumer imports this module and declares no word or identifier pattern of its own; a pin in
 * `test:house-bot-reports` §0 refuses one that does. Suites whose lists are deliberately BROADER (the seam's notice
 * pins, the money suite's notice words) build them with `extendHouseWords`, so the shared words stay a subset.
 *
 * Plain `.mjs` so `node` (the bundle scan) and `tsx` (every suite) import the same file.
 *
 * ⛔ WHAT IT NEVER CONTAINS:
 *   · bare `house` — `/admin/house` is `main`'s own owner book and nav label (`admin-nav-groups.ts`);
 *   · a raw `hb_` or `hbi_` prefix — those match base64url nonces and minified code. Ids are matched only in their
 *     bounded form: a house prefix and exactly 24 hex characters (`newHouseId` = prefix + `randomId(12)`).
 *
 * Words proposed by other areas are added ONLY after they are measured absent from clean `origin/main` (its client graph,
 * its bundle and its signed-out served pages), and they land with the first client slot (ruling 175, 192) — not before. A
 * word that would go red on `origin/main` is recorded, never allowlisted.
 *
 * ⭐ ADDED IN C5 STEP 5 (ruling 192, the R2 words), family `words`: house stake(s), dau la nyumba, 平台投注, staff-chosen /
 * staff chosen. Measured 2026-09-17 against `origin/main` `03c798b6` (its `src/` identical to `b726cb7f`): 0 hits in
 * `git grep -i` over `src/` and `public/` (the whole client graph and every string the served pages are built from is a
 * subset), and 0 in every `.js`/`.mjs`/`.cjs`/`.css` file of `b726cb7f`'s `node_modules` (the bundle's only other
 * source). The step's review found three phrasings the R2 copy ships that none of those matched — "of which chosen by
 * staff", "of which chosen by you" and the held chip's "including house" — so a staff or viewer clause, or the held title,
 * could have reached a player unseen. "chosen by staff" / "chosen by you" and "including house" (word-bounded, so
 * "household" is not one) were measured the same way on 2026-09-17 against `origin/main` `b726cb7f` (0 hits in `git grep -i`
 * over `src/`, `public/`, `scripts/`, `prisma/` and `docs/`; 0 in its `node_modules` JS and CSS) and on this branch's fresh
 * bundle and signed-out served pages, then added. Still proposed, measured with their own step: staff edge, enter now,
 * scorecard, STAFF_EDGE and the staff-edge row's sw/zh words (C5 step 7).
 */

/** The words, in the three locales, matched in any case. `house[_ -]?bots?` also covers `HouseBot` and `house_bots`. */
export const HOUSE_WORD_SOURCE = String.raw`liquidity|ukwasi|流动性|house[_ -]?bots?|boti (?:za|ya) nyumba|平台机器人|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\b`;

/**
 * The feature's identifiers, matched EXACTLY (case-sensitive), so the platform's own `HOUSE_FEE` transaction type is not
 * one. The union of what the disclosure walker and the bundle scan carried (`HouseBot\w*` is the broader of the two).
 */
export const HOUSE_IDENTIFIER_SOURCE = String.raw`\bhouse_[a-z]+|HOUSE_(?!FEE\b)[A-Z_]+|houseStake|houseOnly|houseBotId|HouseBot\w*`;

/** Bounded house ids (`HOUSE_ID_PREFIX` in `src/lib/house-bot/constants.ts`) and the house bet idempotency key `hb:<intent id>`. */
export const HOUSE_ID_SOURCE = String.raw`\bhb[iethp]?_[0-9a-f]{24}\b|\bhb:hbi_[0-9a-f]{24}\b`;

/** The three families, each with the flags it is matched under. A consumer that reports by family uses these names. */
export const HOUSE_FAMILIES = Object.freeze({
  words: Object.freeze({ source: HOUSE_WORD_SOURCE, flags: "gi" }),
  identifiers: Object.freeze({ source: HOUSE_IDENTIFIER_SOURCE, flags: "g" }),
  ids: Object.freeze({ source: HOUSE_ID_SOURCE, flags: "g" }),
});

/** A fresh global RegExp per family (a shared global RegExp keeps `lastIndex` between callers). */
export function houseFamilyRegExps() {
  return Object.fromEntries(Object.entries(HOUSE_FAMILIES).map(([name, f]) => [name, new RegExp(f.source, f.flags)]));
}

/** Every vocabulary hit in `text`, in family order: words, then identifiers, then bounded ids. */
export function houseHits(text) {
  const s = String(text ?? "");
  return Object.values(houseFamilyRegExps()).flatMap((re) => [...s.matchAll(re)].map((m) => m[0]));
}

/** Every hit with its family name, for a consumer that reports where a hit came from. */
export function houseHitsByFamily(text) {
  const s = String(text ?? "");
  return Object.entries(houseFamilyRegExps()).flatMap(([family, re]) => [...s.matchAll(re)].map((m) => ({ family, word: m[0], index: m.index })));
}

/**
 * A BROADER word list that keeps the shared words: `(?:<shared words>)|<extra…>`. For suites that must also refuse words
 * the shared list deliberately leaves out (bare `house`, `50pick`, `nyumba`, `机器人`). `extra` is a list of regex sources.
 * Flags default to `"i"` (no `g`), so `.test()` carries no state between calls.
 */
export function extendHouseWords(extra, flags = "i") {
  const more = (Array.isArray(extra) ? extra : [extra]).filter((x) => typeof x === "string" && x.length > 0);
  return new RegExp([`(?:${HOUSE_WORD_SOURCE})`, ...more].join("|"), flags);
}

/** One sample per shared word family member — what every consumer's planted control and the subset pin plant. */
export const HOUSE_WORD_SAMPLES = Object.freeze([
  "liquidity", "Ukwasi", "流动性", "house bot", "house-bots", "house_bot", "HouseBot", "boti za nyumba", "boti ya nyumba", "平台机器人",
  "house stake", "House stakes", "dau la nyumba", "平台投注", "staff-chosen", "staff chosen",
  "chosen by staff", "chosen by you", "including house",
]);
/** One sample per identifier alternative, and the control the platform's `HOUSE_FEE` must stay. */
export const HOUSE_IDENTIFIER_SAMPLES = Object.freeze(["house_bot_inactive", "HOUSE_BOT", "houseStake", "houseOnly", "houseBotId", "HouseBotStatus"]);
/** Bounded id samples (one per prefix, and the bet key), plus the raw-prefix look-alikes that must NOT match. */
export const HOUSE_ID_SAMPLES = Object.freeze([
  "hb_0123456789abcdef01234567", "hbi_0123456789abcdef01234567", "hbe_0123456789abcdef01234567", "hbt_0123456789abcdef01234567",
  "hbp_0123456789abcdef01234567", "hbh_0123456789abcdef01234567", "hb:hbi_0123456789abcdef01234567",
]);
export const HOUSE_BENIGN_SAMPLES = Object.freeze([
  "HOUSE_FEE", "/admin/house", "House edge", "hb_nonce", "Xhb_0123456789abcdef01234567", "hb_0123456789abcdef0123456789", "hbi_abc",
]);
