import type { ReactNode } from "react";
import { MaswaliFacts, factRuns, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, eatClock, eatWeekday, eatWeekdayClock, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { MaswaliLastWeek } from "@/components/maswali/maswali-pool-figure";
import { numeralFace, weekdayClock } from "@/components/maswali/maswali-numerals";
import { formatEatDate } from "@/lib/eat-day";
import { fillNodes } from "@/lib/fill-nodes";
import { fill, formatNumber } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { MillioneaHub } from "@/lib/server/maswali-player";
import type { KeptBody } from "@/components/ui/empty-state-text";

/**
 * THE HUB'S TIMED SENTENCES (MASWALI-BUILD S5-DESIGN-HUB; Ali 2026-10-21 10/10 pass) — each one a dictionary line filled
 * with its EAT instants exactly as the hub prints it, pure, so a suite renders what the page renders (`test:maswali-hub`
 * §10). Every instant is one unbreakable run: its weekday or month in the sentence's face, its numerals `.mono` (the
 * lead's L7 ruling, §T5).
 * ⭐ zh (the lead's ruling, 2026-10-21): Millionea's Chinese takes a space only where a Latin letter or a digit meets a Han
 * character, never between two Han characters. A line filled by a weekday clock ("周五 18:00", a Han weekday first) has
 * no space before it; one filled by a date or a clock alone (a digit first) keeps its space.
 */
const run = (s: string) => <span className="whitespace-nowrap">{numeralFace(s)}</span>;

const HAN = "[㐀-䶿一-鿿豈-﫿]";
/**
 * A run where it meets its template, by Millionea's zh rule (the lead's ruling, 2026-10-21): a space where a Han character
 * meets a Latin letter or a digit, none between two Han characters — decided by the two characters that meet, never by
 * the caller, so a template whose fill starts with a digit one time and a Han weekday the next sets no space of its own.
 * The space stands outside the run, in the sentence's own face. A template with no Han beside the placeholder (en, sw)
 * comes back as it was.
 */
function meet(template: string, key: string, value: string): ReactNode {
  const before = new RegExp(`${HAN}\\{${key}\\}`).test(template) && /^[A-Za-z0-9]/.test(value);
  const after = new RegExp(`\\{${key}\\}${HAN}`).test(template) && /[A-Za-z0-9]$/.test(value);
  return <>{before && " "}{run(value)}{after && " "}</>;
}

/** M7 · "The sales close has moved: it is now Friday 16:00 (was 18:00)" — the old close by its clock alone when it was the
 *  same day, else with its day. zh: "现为周五 16:00（原为 18:00）" the same day, "（原为周四 18:00）" across days (`meet`). */
export function closeMovedWords(t: Dict, toMs: number, fromMs: number): ReactNode {
  const sameDay = eatWeekday(t, toMs) === eatWeekday(t, fromMs) && Math.abs(toMs - fromMs) < 86_400_000;
  const line = t.millionea.closeMoved;
  return fillNodes(line, { when: meet(line, "when", eatWeekdayClock(t, toMs)), from: meet(line, "from", sameDay ? eatClock(fromMs) : eatWeekdayClock(t, fromMs)) });
}

/**
 * THE CLOSE LINE, IN THE ONE WORDING (the lead's ruling, 2026-10-22: `salesCloseColon`, the slip's and the ticket's words —
 * "Sales close: Friday 18:00 EAT", "Mauzo yanafungwa: Ijumaa 18:00 EAT", "销售截止：周五 18:00 EAT"; the hub said "Sales close
 * Friday 18:00", with no zone). The weekday in the sentence's face and its own span, which steps aside in the last hour
 * beside the closing pill (`.kp-mln-close-day`, R1-motion M8); the clock a `.mono` numeral (§T5); and the zone held to the
 * clock — one unbreakable run (A1: a clock with its zone) — in its own span, which below 360 steps aside in that hour too.
 */
export function closeWords(t: Dict, closesMs: number): ReactNode {
  const [before = "", after = ""] = t.millionea.salesCloseColon.split("{when}");
  return (
    <>
      {before}
      <span className="whitespace-nowrap">
        {weekdayClock(t, closesMs, { className: "text-text", dayClass: "kp-mln-close-day" })}
        <span className="kp-mln-close-zone">{after}</span>
      </span>
    </>
  );
}

/** L9/P17 · the paused notice's words: Millionea's own sentence, kept as every Millionea line is (`keepFact`) — its last two
 *  words one run ("salama." stood alone at sw 320), any numeral a wording holds in the numerals' face. */
export function pausedWords(t: Dict, locale: Locale): ReactNode {
  return keepFact(locale, t.millionea.paused);
}

/** M6 · a week being voided, named: how many mains voided against how few valid reserves, and by when it is final if no
 *  objection changes it (`byMs`, the week's "results and payout" end). Kept as every Millionea line is (`keepFact`): its
 *  counts and its clock numerals (§T5), a count with its noun ("5 道"), its day with its clock, its last two words — sw 1024
 *  left "itarejeshwa." alone on the notice's last line, zh 320 parted "5" from "道" (the S5-R2-HUB tile readers). */
export function voidingWords(t: Dict, locale: Locale, voidedMains: number, validReserves: number, byMs: number): ReactNode {
  return keepFact(locale, fill(t.millionea.weekVoidingBody, { voided: formatNumber(voidedMains), valid: formatNumber(validReserves), when: eatWeekdayClock(t, byMs) }));
}

/**
 * L14 · LAST WEEK'S WORDS on the hub's row, one wording with the register's row: a week nobody won ("Week 49 · no 10/10
 * · TZS 389,000 carried forward · fee 0", `MaswaliLastWeek`), a voided week in the register's own words — "Week 48 ·
 * Voided · Every ticket refunded", or "Refunds on their way" until every refund has landed (MR-18) — and a won week's
 * winners. Never the card's "this week is voided" over a week that is past (its zh says 本周, THIS week).
 */
export function lastWeekWords(t: Dict, locale: Locale, last: NonNullable<MillioneaHub["lastWeek"]>): ReactNode {
  const week = weekNumberOf(last.code);
  if (last.state === "SETTLED" && (last.winners ?? 0) === 0) return <MaswaliLastWeek t={t} locale={locale} week={week} carried={last.carriedForward ?? 0} />;
  if (last.state === "VOIDED") {
    return <MaswaliFacts facts={[keepFact(locale, weekWord(t, week)), t.millionea.weekStatusVoided, last.refundsPending ? t.millionea.regRefundsPending : t.millionea.regRefunded]} />;
  }
  return keepFact(locale, counted(last.winners ?? 0, t.millionea.settledWonOne, t.millionea.settledWon, { week }));
}

/** L6/L21 · "The next week opens Monday 00:01." — the empty state's first sentence (a string: the kit's body). */
export function nextOpenWords(t: Dict, atMs: number): string {
  return fill(t.millionea.nextOpensAt, { when: eatWeekdayClock(t, atMs) });
}

/**
 * L6/L21 · THE NO-WEEK EMPTY STATE'S BODY, as the kit takes it (`EmptyStateBody`): the next open while one is due — none
 * while sales are paused (`atMs` null) — then "The 15 questions are published when sales open, …". The next open's day and
 * its clock are one kept run (A1: a day never parts from its time — the kit's own `keep`, a nowrap span), and so is every
 * other phrase Millionea keeps whole (`factRuns`: a number and its noun — "Maswali 15", which broke "Maswali" / "15" at sw
 * 360); Chinese joins its two sentences with no space between them. §T5's numeral face for its clock and its count is
 * joined by Millionea's own empty state, which the hub draws it in (`MaswaliEmptyState`: the kit's opt-in `bodyPart`).
 */
export function noWeekBody(t: Dict, locale: Locale, atMs: number | null): KeptBody {
  const first = atMs === null ? null : nextOpenWords(t, atMs);
  const text = [first, t.millionea.questionsAtOpen].filter((x): x is string => !!x).join(locale === "zh" ? "" : " ");
  return { text, keep: [...(atMs === null ? [] : [eatWeekdayClock(t, atMs)]), ...factRuns(locale, text)] };
}

/**
 * L13 · what a voided MAIN question leaves the week, after its stamp. The row's stamp already says "Void", so the words are
 * the sentence's second fact — "Too few reserves: the week is due to be voided", "A reserve will take its place" — opening
 * with a capital, as the register's week page draws the same row (REGISTER's `MarkWords`): one drawing for one truth. Kept
 * as every Millionea line is (`keepFact`: its last two words one run, so "voided" never stands alone at en 1280/1920) and
 * pretty-wrapped by its row. As a fact line (S5-R2-HUB 2) the long second fact moved whole to the next line and left
 * "Void" / "Batili" alone on a first line at every width but 768, in all three languages (the tile readers).
 * ⭐ ONE WRAP UNIT (S5-R2-HUB 6): the row's words box is an inline flex row (the stand-in's "Void ↪ A1" is three items
 * centred on one line), so each piece the keeper hands back — a run of words, a kept run — stood as a flex item of its own,
 * and a sentence wider than its line broke into a block of its own above its kept run instead of wrapping as one sentence
 * (latent: at en 320 "…the week is due to" filled its line exactly). The words are one element, the keeper's runs inside it.
 */
export function voidWords(locale: Locale, line: string): ReactNode {
  const rest = factsOf(line).slice(1).join(" ");
  return <span>{keepFact(locale, rest.charAt(0).toLocaleUpperCase() + rest.slice(1))}</span>;
}

/**
 * M10 · the rollover notice that IS this week's carry in — the one whose week the figure names as its source
 * (`carryFromCode`) — or none: the carry never travels from a week the ledger does not name, nor while that carry waits on
 * its week; and of two unseen rollovers (a reader away for two weeks) only that one is the origin, so one id is drawn.
 */
export function carryingRollover<N extends { notice: string; code: string }>(
  notices: readonly N[], pool: { carryFromCode: string | null; carryIn: number | null } | null,
): N | null {
  if (!pool || !pool.carryFromCode || (pool.carryIn ?? 0) <= 0) return null;
  return notices.find((n) => n.notice === "ROLLOVER" && n.code === pool.carryFromCode) ?? null;
}

/** L22 · "Week 52 will be Millionea's final week. It opens 30 Nov." — the lead's words, the day as every "on {date}" line
 *  reads it (`formatEatDate`: zh "2026年11月30日", a digit first); the week's number a numeral too (§T5, round 2). */
export function finalAheadWords(t: Dict, locale: Locale, week: number, opensMs: number, nowMs: number): ReactNode {
  return fillNodes(t.millionea.finalWeekAhead, { week: numeralFace(String(week)), date: run(formatEatDate(opensMs, nowMs, t.common.monthsShort, locale)) });
}
