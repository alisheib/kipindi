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
 * staff chosen; and, after the step's review found three phrasings the R2 copy ships that none of those matched ("of which
 * chosen by staff", "of which chosen by you", the held chip's "including house"), chosen by staff / chosen by you and
 * including house (word-bounded, so "household" is not one). How all nine were measured is ruling 263, not a clean
 * `origin/main` build: `git grep -i -E` over `origin/main` `b726cb7f`'s `src/`, `public/`, `scripts/`, `prisma/` and `docs/`
 * (re-measured 2026-09-17: 0 lines for every sample except `house[ -]?stakes?`, 2 lines in `docs/F6-LIQUIDITY-DESIGN.md`,
 * a design note that is neither bundled nor served); 0 of the 13,718 `.js`/`.mjs`/`.cjs`/`.css` files of its
 * `node_modules`; and this branch's fresh bundle and signed-out served pages.
 *
 * ⛔ NOTHING IS PROPOSED FOR C5 STEP 7, AND THE LIST THIS HEADER USED TO CARRY IS WITHDRAWN (replan ruling 511).
 * It told the next session to add "staff edge, enter now, scorecard, STAFF_EDGE and the staff-edge row's sw/zh words
 * (C5 step 7)". Three of those families belong to rulings 199-213 and 218-223, which owner ruling D20 STRUCK and C5-5b
 * un-built, and the fourth is a live control — so a header meant to protect the list was instructing a reader to dilute
 * the one list that keeps the feature's name off a player's screen. C5-SPEC ruling 175's own superseded note
 * (`C5-SPEC.md:655`) already ruled this; this is that ruling, written where the next session will actually read it.
 * MEASURED 2026-09-18 on this branch AND on clean `origin/main` `b726cb7f` (`git grep -i -E` over `src/`, `public/`,
 * `scripts/`, `prisma/`, `docs/`):
 *   · `staff[ -]edge` — 0 lines on `origin/main`. On this branch, 4 lines and every one of them inside a COMMENT
 *     (`src/lib/house-bot/clock.ts:54`, `src/lib/house-bot/rules.ts:539`, `:856`, `:872`). A word that can only match a
 *     comment proves nothing and costs every consumer a scan.
 *   · `STAFF_EDGE` — 0 lines on `origin/main`, 0 lines in this branch's `src/`. The row it named was never built.
 *   · `scorecard` — 0 in `src/` on both, but 3 lines on clean `origin/main` OUTSIDE it (`docs/MOBILE-APP-PLAN.md`,
 *     `docs/README.md`, `scripts/stress-regulator-grade.mjs`), so by this module's own rule it is RECORDED, not added.
 *   · `enter now` — ⛔ NOT a vocabulary word, whatever it measures. It is a LIVE console control (replan ruling 508
 *     builds it at C7 step 4) and live server copy today (`src/lib/house-bot/feed-copy.ts:167`, `:205`). Which words
 *     the console may not render is `CONSOLE_EXTRA_WORDS` below (ruling 453), and that list deliberately does not hold
 *     this one: adding it HERE would turn the console's own button red on the guard that exists to keep the FEATURE's
 *     name off the owner's screen.
 * The addition rule itself is unchanged — a word joins only after it is MEASURED absent from clean `origin/main`.
 * What changes is that no addition is scheduled, at C5-7 or anywhere else.
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

/**
 * ⛔ THE CONSOLE'S OWN LEXICON (owner-delegated ruling 453), COMPOSED ONCE AND SHARED — never a new regex (ruling 175).
 * 453 is stricter than the shared vocabulary: nothing the console renders may name the feature AT ALL, so the bare
 * words `bot`/`bots`, the bare word `house` and the whole `counter`/`counterparty` stem are refused too, on top of
 * every shared word.
 * ⛔ IT IS A FUNCTION, NOT A CONSTANT, because a shared `RegExp` object is a mutable thing to hand two consumers
 * (`lastIndex`, and `.test` on a `/g/` instance carries state); each caller gets its own.
 * ⚠️ IT IS NOT FOR A WHOLE PAGE BODY. The admin sidebar legitimately renders the nav label "House" for `/admin/house`,
 * so a consumer scanning a SERVED page passes the console section's own subtree, not `document.body`.
 *
 * ⛔ THE COUNTER STEM IS BARE, AND IT WAS MEASURED WRONG ONCE (replan ruling 539). It read `counter[- ]?stakes?`,
 * which REQUIRES the word "stake" to follow — so it caught `counter-stake` and PASSED all three limit labels
 * `/admin/desk?tab=limits` was actually painting, each of which names the mechanism without that second word. A
 * lexicon that matches a VOCABULARY rather than a MEANING stops covering the moment a label is reworded, which is
 * exactly what happened. The stem now takes the bare word with its inflections, plus the counterpart family.
 * ⚠️ AND IT MUST STILL NOT MATCH AN INNOCENT WORD — both directions are pinned by controls
 * (`CONSOLE_EXTRA_SAMPLES` and `CONSOLE_BENIGN_SAMPLES`): `encounter` has no word boundary BEFORE the stem and
 * `countertop`/`countersign`/`countdown` none AFTER it, so none matches; `Counters`, `Counter TZS`, `Counterparty`
 * and `counter-stake` all do. A widened stem with no accept-side control is one reword away from being switched
 * off for crying wolf.
 */
export const CONSOLE_EXTRA_WORDS = Object.freeze([
  String.raw`\bbots?\b`,
  String.raw`\bhouse\b`,
  String.raw`\bcounter(?:s|ed|ing|stakes?)?\b`,
  String.raw`\bcounterpart(?:y|ies|s)?\b`,
]);

/** The composed console lexicon — the shared words plus 453's four. One definition, two consumers (the suite and the visual gate). */
export function consoleNeutralRegExp(flags = "i") {
  return extendHouseWords([...CONSOLE_EXTRA_WORDS], flags);
}

/** What 453's own planted control plants, beside `HOUSE_WORD_SAMPLES`. */
export const CONSOLE_EXTRA_SAMPLES = Object.freeze([
  "bot", "Bots", "the house", "counter-stake", "Counter stakes",
  "Counters per player per day", "Counter TZS per player per day", "Counterparty share limit", "countered", "counterstake",
]);

/** ⛔ THE ACCEPT SIDE OF 453's LEXICON (ruling 539). None of these may match: a guard that has never been shown to
 *  LET AN INNOCENT WORD THROUGH is a guard the next session switches off. */
export const CONSOLE_BENIGN_SAMPLES = Object.freeze([
  "encounter", "encounters", "encountered", "countertop", "countersign", "countdown", "accountable", "an account", "accounts",
]);

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
/**
 * ⛔ AND "including household costs" IS ON THIS LIST BECAUSE NOTHING ELSE HELD THE WORD BOUND (C5-8, 2026-09-21).
 * `including house\b` is word-bounded so that "household" is not a hit, and until this sample landed that claim was
 * made ONLY in this module's own docblock: dropping the `\b` left `2.v` green (the "including house" sample still
 * matches), `2.v.b` green (no benign sample carried the stem), `0.175.subset.module` green and the console lexicon
 * green. An authority claim with no assertion behind it is the class this campaign keeps finding, so the claim is
 * now a sample, and `2.v.b` and `0.L52.c2` own it on both sides of the bound.
 */
export const HOUSE_BENIGN_SAMPLES = Object.freeze([
  "HOUSE_FEE", "/admin/house", "House edge", "hb_nonce", "Xhb_0123456789abcdef01234567", "hb_0123456789abcdef0123456789", "hbi_abc",
  "including household costs",
]);

/**
 * ⛔ THE SHAPE FAMILY — `house` FOLLOWED BY A CAPITAL (C5-8, 2026-09-21, from the S4-M56 finding).
 *
 * ⛔ WHY IT HAD TO EXIST. `HOUSE_IDENTIFIER_SOURCE` matches camelCase by an explicit list of FOUR names
 * (`houseStake`, `houseOnly`, `houseBotId`, and `HouseBot\w*`, which needs a capital H). Measured on this branch:
 * `src/` carries SEVENTY-ONE distinct `house<Capital>` identifiers and the identifier family matches exactly TWO of
 * them. `houseBetCount` — the name the C5-s4 register plants on the KYC rail — is one of the sixty-nine it cannot
 * see, and `house-bot-reports-cases.mts` says so in its own words at `KYC_STRUCK_197`: a HAND-TYPED needle list,
 * scoped to `src/app/admin/kyc/`, that exists precisely because the vocabulary was blind to the shape. A hand list
 * in one directory is not a guard for the shape; this is.
 *
 * ⛔ AND IT IS DELIBERATELY NOT A MEMBER OF `HOUSE_FAMILIES`. Every existing consumer reaches its verdict through
 * `houseHits` / `houseHitsByFamily`, which fold every family together — so adding this one there would silently
 * redden `/admin/house` (the platform's OWN owner book: `houseFee`, `housePosition`, `houseAccountBalances`), the
 * ledger, the house-pool purge chain and the fourteen admin pages that legitimately call the console's one gated
 * door. Widening a shared instrument to catch one shape, and then allowlisting the fallout in a dozen suites, is how
 * a guard gets switched off. The shape is exported on its own and consumed by the one suite whose population is
 * narrow enough to carry it (`test:house-bot-surfaces`), which decides the accept side from the door module's OWN
 * exports rather than from a list.
 *
 * ⚠️ IT MATCHES A SHAPE, NOT A MEANING, so it needs BOTH controls and both are below: `HOUSE_CAMEL_SAMPLES` is the
 * refuse side and `HOUSE_CAMEL_BENIGN_SAMPLES` the accept side. `\bhouse` is lower-case and word-bounded, so
 * `HouseBot` (capital H — the identifier family's own), `house_bot` (a separator, not a capital), `household`
 * (no capital) and `warehouseBin` (no word boundary before `house`) are none of them.
 */
export const HOUSE_CAMEL_SOURCE = String.raw`\bhouse[A-Z][A-Za-z0-9]*`;

/** A fresh RegExp for the shape family (a shared global RegExp keeps `lastIndex` between callers). */
export function houseCamelRegExp(flags = "g") {
  return new RegExp(HOUSE_CAMEL_SOURCE, flags);
}

/** Every `house<Capital>` identifier in `text`, in source order. */
export function houseCamelHits(text) {
  return [...String(text ?? "").matchAll(houseCamelRegExp())].map((m) => m[0]);
}

/**
 * The refuse side. ⭐ `houseBetCount` and `houseStakedTzs` are FIRST because they are the two names owner ruling D20
 * struck and the C5-s4 register re-plants (S4-M56, S4-M76): the shape family exists to see them outside
 * `src/app/admin/kyc/`, where the hand-typed needle list cannot look.
 */
export const HOUSE_CAMEL_SAMPLES = Object.freeze([
  "houseBetCount", "houseStakedTzs", "houseBotId", "houseOnly", "houseStake", "houseExposure", "houseLiquidityTzs",
]);

/**
 * ⛔ THE ACCEPT SIDE, AND IT IS THE HALF THAT KEEPS THE SHAPE USABLE. A shape pattern with no benign samples is one
 * false positive away from being deleted by the next session. None of these may match.
 */
export const HOUSE_CAMEL_BENIGN_SAMPLES = Object.freeze([
  "household", "households", "housebot", "HouseBot", "HouseBotStatus", "house_bot", "HOUSE_FEE", "warehouseBin",
  "house", "houses", "housing", "inhouseTeam",
]);
