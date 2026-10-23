/**
 * THE HUB PAGE'S WORDS, ONCE — what the page and its loading drawing both set (MASWALI-BUILD S5-R2-HUB, HUB-2B; the lead's
 * ruling of 2026-10-23 on the drawings' texts, DESIGN_AUTHORITY §M8a items 22 and 25). The drawing (`hub-ghost.tsx`) sets
 * these words unseen through the kit's one part, `GhostWords` (`maswali-ghost-words.tsx`, R3-2B's): each one lands where
 * the page's own words land, BY CONSTRUCTION, in any engine at any pixel ratio — the per-language line and width tables
 * the drawing kept (WRAPS, QUESTIONS_HEADING, EYEBROW, RANGES) are gone.
 *   · STATIC words, the dictionary's whole: the jackpot head's rule, the ledger's floor label, the questions' heading, the
 *     strip's three labels.
 *   · DATA the drawing cannot know, set as a SAME-WIDTH TEMPLATE (the lead's ruling (b)): each the width of every value of
 *     its class, so the drawing lands for every week of that class (`TEMPLATE` below).
 * The page builds the same words with the same functions (`hubIntroText`, `hubRuleText`, `weekStripWords`, the
 * dictionary's own keys), so a word changed in the dictionary moves the page and its drawing together.
 * ⛔ PURE (`test:maswali-ui` 1.3b): no directive, no dictionary and no language of its own — a recipe reads only the `t` and
 * `locale` the part hands it. The drawing names a recipe only as `words={…}` (1.3): every recipe below is named there once.
 */
import { fill, formatTzs } from "@/lib/utils";
import { factsOf } from "@/components/maswali/maswali-facts";
import { weekStripWords, type WeekPhases } from "@/components/maswali/maswali-week-strip";
import { weekPhaseWord } from "./millionea-phase";
import type { Dict } from "@/lib/i18n-dict";
import type { GhostWordsIn, GhostWordsOut } from "@/components/maswali/maswali-ghost-words";

/**
 * THE TEMPLATES — data the drawing cannot know, at the width of its whole class (the lead's ruling (b), 2026-10-23):
 *   · a week's number: two digits in the numerals' face — weeks 10–53 are one width ("Wiki 00"). A week of one digit
 *     (1–9, January to early March) is one numeral narrower: its line keeps its count (the eyebrow and the carry's label
 *     are one line at every width), and its chip and its door stand that numeral further left (`qa:maswali-hub-states`
 *     prints it);
 *   · the ticket's price, the fee's rate and the floor: Millionea's ruled values (MR-8 TZS 1,000; MR-24 13%; MR-20
 *     TZS 1,000,000) — any four-digit price and seven-digit floor in the money face, any two-digit rate in the numerals'
 *     face, is one width. The floor's figure decides where the ledger's floor label wraps beside it: drawn as a bar of
 *     another width, the label took one line in the drawing and two on the page at sw 1024+ (the floor row 16px short);
 *   · the strip: the template week's own weekdays and clocks — the config's open (Monday 00:00) and close (Friday 18:00
 *     EAT), its events from Saturday to Sunday, its results from Sunday to its final deadline (Monday) — a clock in the
 *     numerals' face is one width whatever its time. A week drafted on other days draws the template's days.
 */
export const TEMPLATE = { week: "00", price: 1_000, pct: 13, floor: 1_000_000 } as const;
const HOUR = 3_600_000, DAY = 24 * HOUR;
/** A Monday 00:00 in East Africa Time (2026-11-30), the template week's open. */
const MONDAY = Date.UTC(2026, 10, 29, 21, 0);
export const TEMPLATE_PHASES: WeekPhases = {
  salesFrom: MONDAY, salesTo: MONDAY + 4 * DAY + 18 * HOUR,
  eventsFrom: MONDAY + 5 * DAY + 9 * HOUR, eventsTo: MONDAY + 6 * DAY + 4 * HOUR,
  resultsFrom: MONDAY + 6 * DAY + 4 * HOUR, resultsTo: MONDAY + 7 * DAY + 23 * HOUR + 59 * 60_000,
};

// ── the page's builders, each the drawing's too ───────────────────────────────────────────────────────────────────────
/** The page's one line under its name: what a ticket is and costs (`howOne`, its price the week's). */
export function hubIntroText(t: Dict, price: string): string {
  return fill(t.millionea.howOne, { price });
}
/** The jackpot head's rule for a week that shares its pool (`ruleShared`, its fee rate the week's): its facts. */
export function hubRuleText(t: Dict, pct: number): string {
  return fill(t.millionea.ruleShared, { pct });
}
const week00 = (t: Dict) => fill(t.millionea.week, { week: TEMPLATE.week });
const strip = (t: Dict, i: 0 | 1 | 2) => weekStripWords(t, TEMPLATE_PHASES)[i];

// ── the drawing's recipes (each named once, as words={…}) ─────────────────────────────────────────────────────────────
/** The head's line: the template price, kept as the page keeps it (a fact). */
export const hubIntro = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: hubIntroText(t, formatTzs(TEMPLATE.price)) });
/** The eyebrow's week ("WIKI 00"): the page sets `weekWord` bare in the eyebrow's mono face. */
export const hubWeek = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: week00(t), keep: "bare" });
/** The chip's word for a week on sale ("Wazi" / "Open" / "开放"), the page's `weekChipWord` of an open week. */
export const hubOpenChip = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: weekPhaseWord(t, "OPEN", { kind: "state", objectionsUntil: null }), keep: "bare" });
/** The jackpot head's rule at the template rate, as the page's fact list. */
export const hubRule = ({ t }: GhostWordsIn): GhostWordsOut => ({ facts: factsOf(hubRuleText(t, TEMPLATE.pct)) });
/** The ledger's carried-in row ("Imehamishwa kutoka Wiki 00"), kept as the ledger keeps it (its week one run). */
export const hubCarry = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: fill(t.millionea.carriedIn, { week: TEMPLATE.week }), runs: [week00(t)] });
/** The ledger's floor figure (the template floor, in the money face as the ledger's `money` sets it). */
export const hubFloorValue = (_: GhostWordsIn): GhostWordsOut => ({ text: formatTzs(TEMPLATE.floor) });
/** The ledger's floor label, as the kit row sets a string label (`keepConnectives`). */
export const hubFloor = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: t.millionea.floor, keep: "label" });
/** The questions' heading of a week on sale, bare as the page's heading. */
export const hubQuestionsHeading = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: t.millionea.weekQuestions, keep: "bare" });
/** The strip: each phase's label (bare, as the strip sets it) and its range's runs (each kept, its clock a numeral). */
export const hubSalesLabel = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 0).label, keep: "bare" });
export const hubSalesFrom = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 0).runs[0] ?? "" });
export const hubSalesTo = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 0).runs[1] ?? "" });
export const hubEventsLabel = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 1).label, keep: "bare" });
export const hubEventsFrom = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 1).runs[0] ?? "" });
export const hubEventsTo = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 1).runs[1] ?? "" });
export const hubResultsLabel = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 2).label, keep: "bare" });
export const hubResultsFrom = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 2).runs[0] ?? "" });
export const hubResultsTo = ({ t }: GhostWordsIn): GhostWordsOut => ({ text: strip(t, 2).runs[1] ?? "" });
