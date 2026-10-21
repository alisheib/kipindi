/**
 * MASWALI MILLIONEA — WHAT THE PLAYER SURFACES READ (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1, 4–10).
 *
 * The read models behind `/millionea` (the hub), `/millionea/slip`, `/millionea/how`, `/millionea/tickets` and
 * `/[serial]`, `/millionea/register` and `/[week]`, the journey home card, Tiketi zangu's third kind, `/results`'
 * Millionea section and the account-closure screen. Kept out of the pages so every surface reads the same shapes and
 * "what may a player see" has one answer (`updown-board.ts`'s rule). Visibility is the gate's (`millionea-gate.ts`): a
 * route asks it first and passes the rollout's state in. The acts are `maswali-player-acts.ts`.
 *
 * ⭐ EVERY FIGURE IS DERIVED, NEVER STORED (MR-28, MB-56): the price, cap and floor from the week's frozen
 *    `rulesSnapshot`, the fee from its market's `feeSnapshot`; the sales from the week's `POOL:` account while it sells
 *    and is graded; the carry from the jackpot account (or the stamped claim); whether the floor may be shown from the
 *    guarantee against every unsettled week (OD-02); and, once a week has settled, the settlement's mirrored columns,
 *    written in the same transaction as its ledger group (MB-07).
 * ⛔ NOTHING THE LAW FORBIDS BEFORE SETTLEMENT (DESIGN_AUTHORITY §M8a item 9, MB-38, OD-24): no pick aggregate and no
 *    count of the tickets still "alive" on any surface; no potential payout and no jackpot figure on the slip, a ticket
 *    or the list (the handover's WP6); a score only on a won ticket (10, or the sunset's top score). The register's
 *    standing history and its graded table exist only for a SETTLED week.
 * ⛔ A TICKET IS ITS OWNER'S (MB-32, MB-95): its picks and salt reach only the account that bought it, and a serial
 *    that is not the viewer's answers exactly as a serial that does not exist — so walking serials learns nothing.
 * ⛔ A DRIVE WEEK (OD-21) IS PRIVATE: never on the register, the results or a public figure; it leads a hub only at
 *    STAFF_PREVIEW, for the viewers the preview admits, and only while it sells.
 * ⛔ READS ONLY. Nothing here writes, locks or moves money.
 */
import {
  questionStore, ticketStore, weekStore, noticeStore,
  type MaswaliNotice, type StoredQuestion, type StoredTicket, type StoredWeek, type WeekVisibility,
} from "./maswali-dal";
import { calendarStartMs, carryBlocker, frozenRules, gradable, objectionWindowEnd, rolloutSells, sunsetState } from "./maswali-service";
import { maswaliAccountBalance } from "./maswali-money-service";
import { getMaswaliConfig, type MaswaliRulesSnapshot } from "./maswali-config";
import { getSalesPause } from "./maswali-pause";
import { acct, maswaliJackpotOf } from "./ledger";
import { marketStore, positionStore } from "./market-dal";
import { getGlobalConfig, snapshotOrLegacy } from "./market-config";
import { isStaffRole } from "./roles";
import { db } from "./store";
import type { RolloutState } from "@/lib/millionea-rollout";
import type { FailureReason } from "@/lib/failure-reasons";
import {
  MAIN_COUNT, displayMap, gradedSet, slotLabel,
  type DisplayRow, type GradableQuestion, type GradedSet, type MaswaliOutcome, type MaswaliPick, type MaswaliRole,
} from "@/lib/maswali-score";
import { guaranteeRequirement, settleArithmetic, type WeekArithmetic } from "@/lib/maswali-money";
import { FORFEITED_SHARE_MARK, ticketShown, type TicketShown, type WeekState } from "@/lib/maswali-week-label";
import { millioneaFreeCancelEnd } from "@/lib/millionea-free-cancel";
import { eatNextWeekAt, eatWeekAt, eatWeekStartMs } from "@/lib/eat-day";
import { normalizeMillioneaSerial } from "@/lib/millionea-serial";
import { unstable_cache } from "next/cache";
import { readCachedMillioneaRegisterWeek } from "./maswali-register-cache";

const UNSETTLED: WeekState[] = ["OPEN", "CLOSED", "RESOLVING"];
const GRADING: WeekState[] = ["CLOSED", "RESOLVING"];
const TERMINAL: WeekState[] = ["SETTLED", "VOIDED"];

/** An officer's successful week action expires the shared PUBLIC question projection immediately. */
export const MASWALI_PUBLIC_WEEK_QUESTIONS_TAG = "millionea-public-week-questions";

/**
 * ⭐ R3 · WEEKS NEWEST FIRST IN THE CALENDAR — the chain's own order (`calendarStartMs`, MR-3; S5 re-review 1). ⛔ Never the
 * DAL's list order, which is `seq`, the order the weeks were DRAFTED: a week drafted after a later one still comes before
 * it. One line never holds two weeks of one ISO week; two lines may, and the drafting order breaks that tie, so the order
 * is total. Every surface here that says "newest", "latest", "last" or "next" reads it.
 */
function newestFirst(weeks: readonly StoredWeek[]): StoredWeek[] {
  return [...weeks].sort((a, b) => calendarStartMs(b) - calendarStartMs(a) || b.seq - a.seq);
}

/**
 * The week a week's carry flows into: the earliest week of the same line after it IN THE CALENDAR that has opened and not
 * voided — a DRAFT is never in the chain (R3), and a voided week's carry is untouched and waits for the week after it
 * (MR-18), so the pool never went to one. Null while no such week has opened.
 */
async function nextWeekOf(week: StoredWeek): Promise<StoredWeek | null> {
  const at = calendarStartMs(week);
  const later = (await weekStore.list({ visibility: week.visibility }))
    .filter((w) => w.state !== "DRAFT" && w.state !== "VOIDED" && calendarStartMs(w) > at);
  return later.sort((a, b) => calendarStartMs(a) - calendarStartMs(b))[0] ?? null;
}

/**
 * ⭐ S5-FIX-PLAYER P9 · THE WEEK A WEEK'S CARRY CAME FROM — `nextWeekOf`'s mirror: the newest week of the same line before it
 * IN THE CALENDAR that opened and did not void — the one whose settlement handed the jackpot on (a voided week hands nothing:
 * its carry waited untouched for the week after it, MR-18; a DRAFT never sold, R3). Null when no such week exists. ⛔ Never a
 * week's open minus seven days: across a voided week, a skipped holiday week (OD-27) or an early open that names the wrong
 * week ("Carried in from Week 47" over Week 46's pool).
 */
async function prevWeekOf(week: StoredWeek): Promise<StoredWeek | null> {
  const at = calendarStartMs(week);
  const earlier = (await weekStore.list({ visibility: week.visibility }))
    .filter((w) => w.state !== "DRAFT" && w.state !== "VOIDED" && calendarStartMs(w) < at);
  return earlier.sort((a, b) => calendarStartMs(b) - calendarStartMs(a))[0] ?? null;
}

/**
 * ⭐ ONE PAGE OF A LIST A PLAYER PAGES THROUGH (`components/ui/pagination.tsx` draws it): the rows of `page`, and the TOTAL
 * — every row is counted, so none falls off the end unseen (never a silent cap, S5 re-review 4). `page` is the one asked,
 * clamped into range as the pager clamps it (the console's week list does the same, `pageConsoleWeeks`); `perPage` is the
 * caller's page size, at least one.
 */
export type MillioneaPage<T> = { rows: T[]; total: number; page: number; perPage: number };

function pageOf(asked: number | undefined, total: number, perPage: number): { page: number; perPage: number } {
  const size = Number.isFinite(perPage) ? Math.max(1, Math.floor(perPage)) : 1;
  const last = Math.max(1, Math.ceil(total / size));
  const page = typeof asked === "number" && Number.isFinite(asked) ? Math.floor(asked) : 1;
  return { page: Math.min(Math.max(1, page), last), perPage: size };
}

/**
 * §10 2 "A backlog rests": when more facts than this are unseen on a ticket, none of them animates — the reckoning
 * carries the beat instead. A motion law (DESIGN_AUTHORITY §M8a item 5), not a rule a player reads or an admin sets.
 */
export const MILLIONEA_BACKLOG_REST_AFTER = 4;

/** Who is looking, as the gate resolved them: the signed-in account (or none) and the rollout's state. */
export type MillioneaViewer = { userId: string | null; state: RolloutState };

/** One text in the three languages a week froze at its open (MR-6); the page picks the reader's. */
export type MillioneaText = { en: string; sw: string; zh: string };

// ── THE WEEK'S TERMS — what it froze ─────────────────────────────────────────────────────────────────

type WeekTerms = {
  rules: MaswaliRulesSnapshot;
  /** {pct}: the share of the jackpot taken at a payout, from the market's own `feeSnapshot` (one home per week). */
  feeRate: number;
  /** RULES §2.6's free-cancel grace, frozen with the week's market. */
  freeCancelMinutes: number;
  traRate: number;
  gbtRate: number;
};

/** A week's frozen terms, or null when it froze none this build can read (a DRAFT, or a damaged row). */
async function termsOf(week: StoredWeek): Promise<WeekTerms | null> {
  const rules = frozenRules(week);
  if (!rules || !week.marketId) return null;
  const market = await marketStore.get(week.marketId);
  if (!market) return null;
  const fees = snapshotOrLegacy(market.feeSnapshot);
  const feeRate = fees.jackpotFeeRate;
  if (fees.feeModel !== "jackpot-payout" || typeof feeRate !== "number" || !Number.isFinite(feeRate)) return null;
  return {
    rules, feeRate, freeCancelMinutes: fees.freeExitGraceMinutes,
    traRate: fees.traTaxOnCommissionRate, gbtRate: fees.gbtLevyOnCommissionRate,
  };
}

/**
 * ⭐ S5-FIX-PLAYER P7 · WHEN A WEEK'S "RESULTS AND PAYOUT" END — ONE RULE for the hub's strip and How to play's timeline
 * (they said "Sunday – Monday" and "Monday – Tuesday" for one shape of week): the objection window's own end once the
 * graded set is final (`objectionsCloseAt`, stamped); before that, the latest void deadline plus the week's frozen window,
 * never closing before its EAT floor — the service's own `objectionWindowEnd` (MR-16), so the strip promises no end the
 * window could pass. Null when neither instant can be read.
 */
export function millioneaResultsBy(
  objectionsCloseAt: string | null, lastVoidDeadlineMs: number | null,
  rules: Pick<MaswaliRulesSnapshot, "objectionWindowHours" | "objectionNotBeforeAt">,
): number | null {
  const stamped = objectionsCloseAt ? Date.parse(objectionsCloseAt) : Number.NaN;
  if (Number.isFinite(stamped)) return stamped;
  if (lastVoidDeadlineMs === null || !Number.isFinite(lastVoidDeadlineMs)) return null;
  try {
    return objectionWindowEnd(lastVoidDeadlineMs, rules.objectionWindowHours, rules.objectionNotBeforeAt);
  } catch {
    return null;
  }
}

/** The earliest of the fifteen events — "Tukio la kwanza" printed under the close (MR-4). */
function firstEventOf(qs: readonly Pick<MillioneaQuestion, "eventStartsAt">[]): string | null {
  return qs.map((q) => q.eventStartsAt).sort()[0] ?? null;
}

// ── THE POOL FIGURE (§M8a item 9, MR-20, MB-56) ──────────────────────────────────────────────────────

/** ⭐ The headline a week prints, "Jackpot TZS X · shared by every 10/10 ticket · {pct} fee at payout" (R-HEADLINE). */
export type MaswaliPoolFigure = {
  weekId: string;
  code: string;
  /** The week's line. ⛔ A DRIVE week's frame reaches only a viewer who may see the drive week (`/api/events`, through
   *  `millionea-preview.ts → millioneaPoolAudience`) — never the public (S5 review M1). */
  visibility: WeekVisibility;
  state: WeekState;
  /** R as far as it is known: the claimed carry, or what an unblocked claim reads now. Null while it waits on a week. */
  carryIn: number | null;
  /** The earlier week whose result R waits on — "plus week N's carry-over once final" — or null. */
  carryPendingCode: string | null;
  /** P9 · once R is known and above zero, the week it came from by the calendar chain (`prevWeekOf`) — "Carried in from
   *  Week 46" — or null (then the row names no week). */
  carryFromCode: string | null;
  /** S: the week's live sales, from its `POOL:` account (a free cancel moves it down a ticket, MR-28). */
  sales: number;
  /** The floor, shown only while the guarantee covers every unsettled week at its own frozen floor; null otherwise. */
  floor: number | null;
  /** X = max(floor, R + S): the floor only while it is shown, R only once it is known. */
  jackpot: number;
  /** True while R is unknown: X is a true lower bound ("angalau", §10 3.3), never a guess. */
  atLeast: boolean;
  /** {pct} of the headline: the week's frozen fee share of the jackpot, taken only at a payout. */
  feeRate: number;
};

/** The carry a week counts: its stamped claim; else, once no earlier week of its line blocks the claim (`carryBlocker`,
 *  the claim's own rule, MR-3), what a claim would read; else pending on the week that blocks it. */
async function carryOf(week: StoredWeek): Promise<{ carryIn: number | null; pendingCode: string | null }> {
  if (week.rolloverIn != null) return { carryIn: week.rolloverIn, pendingCode: null };
  const blocking = await carryBlocker(week);
  if (blocking) return { carryIn: null, pendingCode: blocking.code };
  const j = await maswaliAccountBalance(maswaliJackpotOf(week.visibility));
  return { carryIn: j !== null && Number.isSafeInteger(j) && j >= 0 ? j : null, pendingCode: null };
}

/** MB-56, MR-22 · the floor may be printed only while the guarantee holds OD-02's requirement over every unsettled week,
 *  both lines, each at its own frozen floor. ⛔ FAIL CLOSED: a guarantee that cannot be read, or an unsettled week whose
 *  frozen rules cannot be read (its floor unknown, so the requirement is), shows no floor (S5 review L3). */
async function floorShown(): Promise<boolean> {
  try {
    const held = await maswaliAccountBalance(acct.maswaliGuarantee);
    if (held === null) return false;
    const weeks = await weekStore.list({ states: UNSETTLED });
    const floors = weeks.map((w) => frozenRules(w)?.floorTzs);
    if (floors.some((f) => typeof f !== "number")) return false;
    const need = guaranteeRequirement(weeks.map((w, i) => ({ floor: floors[i] as number, confirmedCarryIn: w.rolloverIn })));
    return held >= need;
  } catch {
    return false;
  }
}

/**
 * ⭐ ONE WEEK'S POOL FIGURE, DERIVED NOW — the hub's block, the home card's line and every `maswali:pool` frame
 * (`maswali-pool-feed.ts`). Null for a week that is not selling or being graded, or whose figures cannot all be read.
 */
export async function maswaliPoolFigure(weekId: string): Promise<MaswaliPoolFigure | null> {
  const week = await weekStore.get(weekId);
  if (!week || !week.marketId || !UNSETTLED.includes(week.state)) return null;
  const terms = await termsOf(week);
  if (!terms) return null;
  const sales = await maswaliAccountBalance(acct.pool(week.marketId));
  if (sales === null || !Number.isSafeInteger(sales) || sales < 0) return null;
  const { carryIn, pendingCode } = await carryOf(week);
  const floor = (await floorShown()) ? terms.rules.floorTzs : null;
  const carryFromCode = carryIn !== null && carryIn > 0 ? (await prevWeekOf(week))?.code ?? null : null;
  return {
    weekId: week.id, code: week.code, visibility: week.visibility, state: week.state, carryIn, carryPendingCode: pendingCode, carryFromCode, sales, floor,
    jackpot: Math.max(floor ?? 0, (carryIn ?? 0) + sales), atLeast: carryIn === null, feeRate: terms.feeRate,
  };
}

/** Every week whose pool figure can still move (the feed's "every week" note). */
export async function unsettledMaswaliWeekIds(): Promise<string[]> {
  return (await weekStore.list({ states: UNSETTLED })).map((w) => w.id);
}

// ── THE QUESTIONS AND THE SOCKETS ────────────────────────────────────────────────────────────────────

/** One of the fifteen as every player surface prints it. Its outcome is public once final; a pick is never here. */
export type MillioneaQuestion = {
  slot: number;
  /** M1…M10, and A1…A5 for the reserves (O-8). */
  label: string;
  role: MaswaliRole;
  category: string;
  text: MillioneaText;
  criterion: MillioneaText;
  sourceUrl: string;
  sourceDomain: string;
  eventStartsAt: string;
  eventZone: string;
  voidDeadlineAt: string;
  /** The final result (sealed, and confirmed when the two-officer flag was on); null until then. A VOID before the close
   *  disables that row on the slip (MB-15). */
  outcome: MaswaliOutcome | null;
};

function questionsOf(qs: StoredQuestion[], gq: GradableQuestion[]): MillioneaQuestion[] {
  return qs.map((q, i) => ({
    slot: q.slot, label: slotLabel(q.slot), role: q.role, category: q.category,
    text: { en: q.textEn, sw: q.textSw, zh: q.textZh }, criterion: { en: q.criterionEn, sw: q.criterionSw, zh: q.criterionZh },
    sourceUrl: q.sourceUrl, sourceDomain: q.sourceDomain, eventStartsAt: q.eventStartsAt, eventZone: q.eventZone,
    voidDeadlineAt: q.voidDeadlineAt, outcome: gq[i]?.outcome ?? null,
  }));
}

/**
 * The only shape the shared cache may hold: published question copy and confirmed outcomes. `StoredQuestion` also has
 * officer ids, evidence, source fallbacks, probability estimates and AI suggestions; none of those enter this result.
 * The three translations are kept together so the cache key never depends on a reader's locale cookie.
 */
export function publicHubQuestionsOf(qs: StoredQuestion[]): { questions: MillioneaQuestion[]; graded: GradableQuestion[] } {
  const graded = gradable(qs);
  return { questions: questionsOf(qs, graded), graded };
}

async function readHubQuestions(weekId: string) {
  return publicHubQuestionsOf(await questionStore.listForWeek(weekId));
}

/**
 * Next 16.4's legacy data cache (`cacheComponents` is off in this app). Keep the route dynamic: the gate, week state,
 * owner's tickets/notices, pause, buying decision and ledger-derived pool are all read for each request. The open's
 * question-set hash is an immutable version of the published copy. Time-based revalidation is a second freshness path;
 * officer actions expire the tag with a blocking miss so confirmed seals are not served stale. DRIVE and DRAFT rows
 * never enter a shared cache.
 */
const cachedPublicHubQuestions = unstable_cache(
  async (weekId: string, _questionSetHash: string) => readHubQuestions(weekId),
  ["millionea-public-hub-questions-v1"],
  { tags: [MASWALI_PUBLIC_WEEK_QUESTIONS_TAG], revalidate: 2 },
);

async function hubQuestionsOf(week: StoredWeek) {
  // The two-store CLI harness has no Next request or Incremental Cache; it exercises the same pure projection directly.
  // A deployed request never sets this harness-only marker and uses Next's cache for a published PUBLIC week.
  if (process.env.HB_MONEY_STORE === "memory" || process.env.HB_MONEY_STORE === "postgres") return readHubQuestions(week.id);
  return week.visibility === "PUBLIC" && week.state !== "DRAFT" && !!week.questionSetHash
    ? cachedPublicHubQuestions(week.id, week.questionSetHash)
    : readHubQuestions(week.id);
}

/** How far the week's results have come: "Matokeo 6 kati ya 15 yametolewa · linalofuata Jumamosi 16:00" (§10 3.10). Pure;
 *  exported for its guard (`test:maswali-design` §5 P5). */
export function resultsOf(qs: readonly Pick<MillioneaQuestion, "eventStartsAt">[], gq: GradableQuestion[], nowMs: number) {
  const waiting = qs.filter((_, i) => gq[i]?.outcome == null).map((q) => q.eventStartsAt).sort();
  return {
    resultsOut: gq.filter((g) => g.outcome !== null).length,
    voidedMains: gq.filter((g) => g.role === "MAIN" && g.outcome === "VOID").length,
    voidedReserves: gq.filter((g) => g.role === "RESERVE" && g.outcome === "VOID").length,
    /** The next event the week's results wait on: the first unsealed event still AHEAD — and null once every unsealed event
     *  has begun (S5-FIX-PLAYER P5): "next event" is never an instant already past (it fell back to the earliest unsealed
     *  one, so a ticket said "next event Saturday 09:00" on the Sunday). */
    nextResultAt: waiting.find((at) => Date.parse(at) >= nowMs) ?? null,
  };
}

/** The week's record as the grader reads it — the graded set and its display map, or nothing while either is pending. */
type WeekRecord = { set: GradedSet | null; map: DisplayRow[] | null };
function recordOf(gq: GradableQuestion[]): WeekRecord {
  try {
    const set = gradedSet(gq);
    return { set, map: set.kind === "SET" ? displayMap(gq) : null };
  } catch {
    return { set: null, map: null };
  }
}

/**
 * A socket of the Seal Line (§10 1, the delivery's grammar; MR-17 decides every one of them):
 *   awaiting — the result is not out · matched / missed — a counted question against the pick · void — sealed VOID ·
 *   standby — a reserve before the graded set is final ("Akiba") · carried — a reserve that counts (it stands in for a
 *   voided main) · unused — a reserve the final record did not need.
 */
export type MillioneaMark = "awaiting" | "matched" | "missed" | "void" | "standby" | "carried" | "unused";

export type MillioneaSlot = {
  slot: number;
  label: string;
  role: MaswaliRole;
  /** The owner's own pick — this shape is built only for the account that bought the ticket. */
  pick: MaswaliPick;
  outcome: MaswaliOutcome | null;
  mark: MillioneaMark;
  /** A voided main, once the record is final: the reserve counted in its place, and how the pick on it fared (N1 carries
   *  it into this socket; the pairing is display only, MR-17). Null until the record is final. */
  carried: { reserve: number; mark: "matched" | "missed" } | null;
  /** A reserve that counts: the main it stands in for ("→ 4"). */
  standsInFor: number | null;
};

/**
 * The fifteen sockets of one ticket. ⛔ Built only from the final record for any carry (MB-14): until the graded set is
 * final a voided main is "void" with no reserve named, and a reserve stands by whatever its own event did — never an
 * "un-carry" (§M8a item 1).
 */
function slotsFor(selections: readonly string[], qs: readonly Pick<MillioneaQuestion, "slot" | "role">[], gq: GradableQuestion[], rec: WeekRecord): MillioneaSlot[] {
  const replaced = new Map<number, number>();
  for (const r of rec.map ?? []) if (r.state === "REPLACED_BY") replaced.set(r.slot, r.reserve);
  const standsIn = new Map([...replaced].map(([main, reserve]) => [reserve, main] as const));
  const counted = new Set((rec.map ?? []).filter((r) => r.state === "GRADED").map((r) => r.slot));
  const final = rec.map !== null || rec.set?.kind === "WEEK_VOID";
  const outcomeAt = new Map(qs.map((q, i) => [q.slot, gq[i]?.outcome ?? null] as const));
  const pickAt = (slot: number) => selections[slot - 1] as MaswaliPick;
  const against = (slot: number): "matched" | "missed" | null => {
    const o = outcomeAt.get(slot) ?? null;
    return o === "YES" || o === "NO" ? (pickAt(slot) === o ? "matched" : "missed") : null;
  };
  return qs.map((q, i): MillioneaSlot => {
    const outcome = gq[i]?.outcome ?? null;
    const base = { slot: q.slot, label: slotLabel(q.slot), role: q.role, pick: pickAt(q.slot), outcome };
    if (q.role === "MAIN") {
      const reserve = replaced.get(q.slot) ?? null;
      const carriedMark = reserve !== null ? against(reserve) : null;
      return {
        ...base,
        mark: outcome === null ? "awaiting" : outcome === "VOID" ? "void" : (against(q.slot) ?? "awaiting"),
        carried: reserve !== null && carriedMark ? { reserve, mark: carriedMark } : null,
        standsInFor: null,
      };
    }
    const mark: MillioneaMark = outcome === "VOID" ? "void" : !final ? "standby" : counted.has(q.slot) ? "carried" : "unused";
    return { ...base, mark, carried: null, standsInFor: standsIn.get(q.slot) ?? null };
  });
}

// ── A TICKET AS A ROW (the hub's own tickets, Tiketi zangu, a ticket's head) ─────────────────────────

/**
 * A won ticket's share as the settlement and Compliance left it (MB-43, OD-07), read from its `frozenReason` exactly as
 * the settlement and the console read it (S5 review M2):
 *   paid      — the player's: the ONE share state that is gold (§M8a item 7) and counts in every total;
 *   held      — credited and held for Compliance's review (the wallet hold stands): its hold mark — never gold, never a
 *               `paid` figure, never in a total; a release makes it paid;
 *   forfeited — returned to the jackpot by Compliance: no gold, no `paid`, never in a total.
 */
export type MillioneaShare = "paid" | "held" | "forfeited";

/** The share of a ticket that won, or null for every other ticket. ⛔ The officer's reason never leaves the server. */
function shareOf(t: StoredTicket): MillioneaShare | null {
  if (t.status !== "SETTLED" || t.won !== true) return null;
  if (t.frozenReason == null) return "paid";
  return t.frozenReason.startsWith(FORFEITED_SHARE_MARK) ? "forfeited" : "held";
}

/** What a ticket put in the player's hands: its share when it is PAID, 0 otherwise (held and forfeited count nothing). */
const paidOf = (t: StoredTicket): number => (shareOf(t) === "paid" ? Math.round(t.payout ?? 0) : 0);

/**
 * A voided week's ticket, refunded (MR-18) — decided per ticket from ITS OWN position, never from the week's VOIDED stamp
 * (S5 review M3): LANDED once the position is VOID with a settlement stamp (what came back, and when); PENDING until then.
 * The void lane retries a refund that did not run, and a position that cannot be read is pending too — a refund is never
 * claimed before it happened.
 */
export type MillioneaRefund = { state: "pending" } | { state: "landed"; at: string; amount: number };

/** The refund of every non-cancelled ticket of a VOIDED week, by ticket id; empty for any other week. */
async function refundsOf(tickets: readonly StoredTicket[], week: StoredWeek): Promise<Map<string, MillioneaRefund>> {
  const out = new Map<string, MillioneaRefund>();
  if (week.state !== "VOIDED") return out;
  const due = tickets.filter((t) => t.status !== "CANCELLED");
  if (due.length === 0) return out;
  const positions = await positionStore.getMany(due.map((t) => t.positionId)).catch(() => []);
  const byId = new Map(positions.map((p) => [p.id, p] as const));
  for (const t of due) {
    const p = byId.get(t.positionId);
    out.set(t.id, p && p.userId === t.userId && p.status === "VOID" && p.settledAt
      ? { state: "landed", at: p.settledAt, amount: Math.round(p.finalPayout ?? p.stake) }
      : { state: "pending" });
  }
  return out;
}

export type MillioneaTicketRow = {
  serial: string;
  weekId: string;
  weekCode: string;
  /** running · won · lost · forfeited · refunded · cancelled (`maswali-week-label.ts`): "lost" only once the week has
   *  settled, "forfeited" for a won share Compliance returned to the jackpot (never "won"), and "refunded" only once THIS
   *  ticket's refund landed — until then a voided week's ticket is still running ("Pending"). */
  shown: TicketShown;
  boughtAt: string;
  cancelledAt: string | null;
  /** What this ticket was paid — ONLY a won share that is the player's (`share` "paid"): gold is earned money (§M8a
   *  item 7). ⛔ Null for a held or a forfeited share. */
  paid: number | null;
  /** A won ticket's share — paid, held (its hold mark) or forfeited; null on every other ticket. */
  share: MillioneaShare | null;
  /** A voided week's ticket: its refund, pending or landed; null on every other ticket (a cancelled one included). */
  refund: MillioneaRefund | null;
  slots: MillioneaSlot[];
  /** OD-24 · an earlier ticket of the viewer's own in the same week with the very same fifteen answers. */
  samePicksAs: string | null;
};

function rowsFor(
  tickets: StoredTicket[], week: StoredWeek, qs: readonly Pick<MillioneaQuestion, "slot" | "role">[], gq: GradableQuestion[], rec: WeekRecord,
  refunds: ReadonlyMap<string, MillioneaRefund>,
): MillioneaTicketRow[] {
  const first = new Map<string, string>();
  return [...tickets].sort((a, b) => a.serial.localeCompare(b.serial)).map((t) => {
    const picks = t.selections.join(",");
    const same = t.status === "CANCELLED" ? null : first.get(picks) ?? null;
    if (t.status !== "CANCELLED" && !first.has(picks)) first.set(picks, t.serial);
    const refund = week.state === "VOIDED" && t.status !== "CANCELLED" ? refunds.get(t.id) ?? { state: "pending" as const } : null;
    const shown = ticketShown(t, week.state, refund?.state === "landed");
    const share = shown === "won" || shown === "forfeited" ? shareOf(t) : null;
    return {
      serial: t.serial, weekId: week.id, weekCode: week.code, shown, boughtAt: t.createdAt, cancelledAt: t.cancelledAt,
      paid: share === "paid" ? Math.round(t.payout ?? 0) : null, share, refund,
      slots: slotsFor(t.selections, qs, gq, rec), samePicksAs: same,
    };
  });
}

// ── THE HUB (§10 3.3) ────────────────────────────────────────────────────────────────────────────────

/**
 * Which line of weeks this viewer's surfaces show: PUBLIC — except at STAFF_PREVIEW while a private DRIVE week sells
 * (S8's live drive, OD-21), which is what the preview exists for; only a viewer the preview admits reaches here.
 */
export async function millioneaLineFor(state: RolloutState): Promise<WeekVisibility> {
  if (state === "STAFF_PREVIEW" && (await weekStore.openFor("DRIVE"))) return "DRIVE";
  return "PUBLIC";
}

export type MillioneaHubWeek = {
  id: string;
  code: string;
  visibility: WeekVisibility;
  state: WeekState;
  /** The sunset week (MR-30): the unwon pool goes to its highest scores. */
  isFinal: boolean;
  opensAt: string;
  closesAt: string;
  closedAt: string | null;
  /** When the week's graded set became final (MR-16: its objection window opens then), or null while it is not. ⭐
   *  S5-FIX-PLAYER P6: with `objectionsCloseAt`, what `millioneaWeekPhase` says the week's phase from. */
  gradedSetFinalAt: string | null;
  /** When the week's objection window closes — stamped with the graded set, never before its EAT floor (MR-16) — or null. */
  objectionsCloseAt: string | null;
  /** P7 · when its "results and payout" end (`millioneaResultsBy`): the window's end once known, else the latest void
   *  deadline plus the frozen window — the strip's end, How to play's own rule. Null when it cannot be read. */
  resultsBy: string | null;
  firstEventAt: string | null;
  ticketPrice: number;
  ticketCap: number;
  /** On sale right now: OPEN, before its close, not paused, and the rollout sells this line. */
  selling: boolean;
  pool: MaswaliPoolFigure | null;
  questions: MillioneaQuestion[];
  resultsOut: number;
  voidedMains: number;
  voidedReserves: number;
  nextResultAt: string | null;
  /** The viewer's own tickets in this week — "Tiketi zako wiki hii: 2 kati ya 10" — or null when signed out. */
  mine: { held: number; cap: number; tickets: MillioneaTicketRow[] } | null;
};

/** A settled or voided week as the register's list, the hub's "last week" row and `/results`' section print it. */
export type MillioneaWeekSummary = {
  id: string;
  code: string;
  state: "SETTLED" | "VOIDED";
  isFinal: boolean;
  closedAt: string | null;
  settledAt: string | null;
  /** Live tickets at the close (cancelled ones are out of the count, MR-12). */
  tickets: number;
  sales: number | null;
  carryIn: number | null;
  /** J — null in a week nobody won (nothing was paid, so no jackpot was struck) and in a voided week. */
  jackpot: number | null;
  winners: number | null;
  share: number | null;
  fee: number | null;
  topUp: number | null;
  paid: number | null;
  /** What the week handed the next: R + S when no ticket won (MR-21), the rounding remainder otherwise (MR-25). Null for
   *  a voided week, whose carry is untouched and waits for the next week (MR-18). */
  carriedForward: number | null;
  /** A voided week only: true while its refunds have not all landed — its market carries no settled stamp yet, the one
   *  truth that they did (R1: `refundVoidedWeek` writes it in the same transaction as every refund; `voidRefundsLanded`)
   *  — so "every ticket refunded" is not yet a fact; false once they have, and on every settled week. A market that
   *  cannot be read is pending (S5 review M3). */
  refundsPending: boolean;
};

/** What a settled week handed the next (null for a voided one): see `MillioneaWeekSummary.carriedForward`. */
function carriedForwardOf(w: StoredWeek): number | null {
  if (w.state !== "SETTLED") return null;
  return (w.winningTickets ?? 0) === 0 ? (w.rolloverIn ?? 0) + (w.carryOut ?? 0) : (w.carryOut ?? 0);
}

async function summaryOf(w: StoredWeek): Promise<MillioneaWeekSummary> {
  const settled = w.state === "SETTLED";
  const k = settled ? (w.winningTickets ?? 0) : null;
  let refundsPending = false;
  if (!settled) {
    const market = w.marketId ? await marketStore.get(w.marketId).catch(() => null) : null;
    refundsPending = !market?.settledAt;
  }
  return {
    id: w.id, code: w.code, state: settled ? "SETTLED" : "VOIDED", isFinal: w.isFinal, closedAt: w.closedAt, settledAt: w.settledAt,
    tickets: w.ticketCount, sales: w.salesAtClose, carryIn: w.rolloverIn,
    jackpot: settled ? w.jackpot : null, winners: k, share: settled && k ? w.sharePerTicket : null,
    fee: settled ? w.fee : null, topUp: settled ? w.topUp : null, paid: settled ? w.paidTotal : null,
    carriedForward: carriedForwardOf(w), refundsPending,
  };
}

export type MillioneaHub = {
  line: WeekVisibility;
  /** The week on sale, else the newest one being graded in the calendar (R3); null before any week of the line opened. */
  week: MillioneaHubWeek | null;
  /** Another week still being graded while `week` sells (MR-3: week N+1 opens while N resolves). */
  grading: MillioneaHubWeek | null;
  /** The newest final week of the line in the calendar (R3) — never the last one drafted. */
  lastWeek: MillioneaWeekSummary | null;
  /**
   * ⭐ S5-FIX-PLAYER P8 · `lastWeek` IS "LAST WEEK" only when it is the week right before the hub's own in the line's calendar
   * chain (the newest earlier week that opened — DRAFTs aside, a voided week counted): while a later week is still being
   * graded between them, the newest final week is two weeks back, and the hub said "Last week: Week 46" under Week 47's
   * grading. With no week on the hub, it is last week when its calendar week is the one before now's.
   */
  lastWeekIsPrevious: boolean;
  /** The sales pause (MB-62). ⛔ A boolean only: the officer's reason is an internal note, never a player's line. */
  paused: boolean;
  /** MR-30 · LIVE; ENDING (a final week runs); RETIRED (Millionea has ended); PASSES_ON (the next week becomes final). */
  life: "LIVE" | "ENDING" | "RETIRED" | "PASSES_ON";
  /** No week on sale: when the template opens the next one (MB-84 — no pre-sale). A fact of the published schedule, never
   *  a promise a week will open (a week may be skipped, OD-27). Null while a week sells, and while Millionea is ending
   *  (a final week runs, so nothing after it opens) or has ended (S5 review L2). */
  nextOpensAt: string | null;
  /** The once-per-player-week notices still unseen (§10 3.15, 3.16; DESIGN_AUTHORITY §M8a item 10). */
  notices: MillioneaNotice[];
  /** The instant this view was derived — what the page passes back when it marks a notice seen (S5 review L7). */
  asOf: string;
};

async function hubWeekOf(week: StoredWeek, viewer: MillioneaViewer, nowMs: number, paused: boolean): Promise<MillioneaHubWeek | null> {
  const terms = await termsOf(week);
  if (!terms) return null;
  const { questions, graded: gq } = await hubQuestionsOf(week);
  let mine: MillioneaHubWeek["mine"] = null;
  if (viewer.userId) {
    const tickets = await ticketStore.listForUser(viewer.userId, { cycleId: week.id });
    mine = {
      held: tickets.filter((t) => t.status !== "CANCELLED").length, cap: terms.rules.ticketCapPerWeek,
      tickets: rowsFor(tickets, week, questions, gq, recordOf(gq), await refundsOf(tickets, week)),
    };
  }
  const deadlines = questions.map((q) => Date.parse(q.voidDeadlineAt)).filter(Number.isFinite);
  const resultsBy = millioneaResultsBy(week.objectionsCloseAt, deadlines.length > 0 ? Math.max(...deadlines) : null, terms.rules);
  return {
    id: week.id, code: week.code, visibility: week.visibility, state: week.state, isFinal: week.isFinal,
    opensAt: week.opensAt, closesAt: week.closesAt, closedAt: week.closedAt,
    gradedSetFinalAt: week.gradedSetFinalAt, objectionsCloseAt: week.objectionsCloseAt,
    resultsBy: resultsBy === null ? null : new Date(resultsBy).toISOString(), firstEventAt: firstEventOf(questions),
    ticketPrice: terms.rules.ticketPriceTzs, ticketCap: terms.rules.ticketCapPerWeek,
    selling: week.state === "OPEN" && Date.parse(week.closesAt) > nowMs && !paused && rolloutSells(viewer.state, week.visibility),
    pool: await maswaliPoolFigure(week.id).catch(() => null),
    questions, ...resultsOf(questions, gq, nowMs), mine,
  };
}

/** The template's next open after `nowMs` — this week's if it is still ahead, else next week's (R-WEEK). */
function templateNextOpen(nowMs: number): string | null {
  try {
    const cfg = getMaswaliConfig();
    return new Date(eatNextWeekAt(nowMs, cfg.openWeekday, cfg.openAt)).toISOString();
  } catch {
    return null;
  }
}

/**
 * ⭐ THE HUB'S VIEW: the week, its headline, its fifteen public questions, the viewer's own tickets, the last week.
 * ⛔ EVERY WEEK IS FOUND BY ITS STATE, NEVER AS ONE OF THE NEWEST N (S5 review L1): drafts take the newest `seq`, so a
 *    newest-N page of the line can hold drafts only and hide the week on sale (the console's class, maswali-s4 86eacd88).
 * ⛔ AND "NEWEST" IS THE CALENDAR'S (R3; S5 re-review 1): the week being graded and the last week are the newest in the
 *    calendar (`newestFirst`), never the last ones drafted.
 */
export async function millioneaHub(viewer: MillioneaViewer, now: Date = new Date()): Promise<MillioneaHub> {
  const nowMs = now.getTime();
  const line = await millioneaLineFor(viewer.state);
  const open = await weekStore.openFor(line);
  const grading = newestFirst(await weekStore.list({ visibility: line, states: GRADING }));
  const lead = open ?? grading[0] ?? null;
  const other = open ? (grading[0] ?? null) : null;
  const last = newestFirst(await weekStore.list({ visibility: line, states: TERMINAL }))[0] ?? null;
  let lastWeekIsPrevious = false;
  if (last && lead) {
    const at = calendarStartMs(lead);
    const before = newestFirst((await weekStore.list({ visibility: line })).filter((w) => w.state !== "DRAFT" && calendarStartMs(w) < at))[0] ?? null;
    lastWeekIsPrevious = before?.id === last.id;
  } else if (last) {
    lastWeekIsPrevious = calendarStartMs(last) === eatWeekStartMs(nowMs) - 7 * 86_400_000;
  }
  const paused = getSalesPause().paused;
  let life: MillioneaHub["life"] = "LIVE";
  try { life = (await sunsetState()).kind; } catch { life = "LIVE"; }
  return {
    line,
    week: lead ? await hubWeekOf(lead, viewer, nowMs, paused) : null,
    grading: other ? await hubWeekOf(other, viewer, nowMs, paused) : null,
    lastWeek: last ? await summaryOf(last) : null,
    lastWeekIsPrevious,
    paused, life,
    nextOpensAt: open || life === "ENDING" || life === "RETIRED" ? null : templateNextOpen(nowMs),
    notices: viewer.userId ? await millioneaNotices(viewer.userId, line).catch(() => []) : [],
    asOf: now.toISOString(),
  };
}

// ── THE SLIP (§10 3.5, 3.6) ──────────────────────────────────────────────────────────────────────────

export type MillioneaSlip = {
  week: { id: string; code: string; visibility: WeekVisibility; isFinal: boolean; closesAt: string };
  firstEventAt: string | null;
  /** All fifteen, to be answered before paying (MR-9). ⛔ No pool figure and no payout here (the handover's WP6). */
  questions: MillioneaQuestion[];
  ticketPrice: number;
  ticketCap: number;
  /** {pct} of the slip's fee rule line. */
  feeRate: number;
  /** The viewer's live tickets this week — "this is your 3rd" — or null when signed out. */
  held: number | null;
  /** The viewer's MAIN balance ("salio kuu"): bonus never buys a ticket (MR-10). Null when signed out or unread. */
  balance: number | null;
  /** RULES §2.6's free-cancel grace, frozen with the week's market. ⭐ S5-FIX-PLAYER P1: the confirm sheet asks the one rule
   *  (`millioneaFreeCancelEnd`) with it when it opens and on every tick while it is open, for a ticket cut NOW on the
   *  server-aligned clock — never a time this read fixed at the page's render, which went stale while the player answered
   *  and, near the close, promised a cancel the purchase would not carry. */
  freeCancelMinutes: number;
  /** Why a purchase would be refused before any pick matters — or null. The money path decides again at the buy. */
  refusal: FailureReason | null;
};

/** ⭐ THE SLIP'S QUESTION SET — the week on sale in the viewer's line, or null when none is. */
export async function millioneaSlip(viewer: MillioneaViewer, now: Date = new Date()): Promise<MillioneaSlip | null> {
  const nowMs = now.getTime();
  const week = await weekStore.openFor(await millioneaLineFor(viewer.state));
  if (!week) return null;
  const terms = await termsOf(week);
  if (!terms) return null;
  const qs = await questionStore.listForWeek(week.id);
  let held: number | null = null, balance: number | null = null, staff = false;
  if (viewer.userId) {
    held = await ticketStore.countLiveForUser(week.id, viewer.userId);
    try { balance = (await db.wallet.findByUserId(viewer.userId))?.balance ?? null; } catch { balance = null; }
    try { staff = isStaffRole((await db.user.findById(viewer.userId))?.role); } catch { staff = false; }
  }
  const closesMs = Date.parse(week.closesAt);
  const refusal: FailureReason | null =
    !rolloutSells(viewer.state, week.visibility) ? "millionea_not_available"
      : closesMs <= nowMs ? "millionea_sales_closed"
        : getSalesPause().paused ? "millionea_paused"
          : staff ? "millionea_staff_barred"
            : held !== null && held >= terms.rules.ticketCapPerWeek ? "millionea_cap_reached"
              : null;
  return {
    week: { id: week.id, code: week.code, visibility: week.visibility, isFinal: week.isFinal, closesAt: week.closesAt },
    firstEventAt: firstEventOf(qs), questions: questionsOf(qs, gradable(qs)),
    ticketPrice: terms.rules.ticketPriceTzs, ticketCap: terms.rules.ticketCapPerWeek, feeRate: terms.feeRate,
    held, balance, freeCancelMinutes: terms.freeCancelMinutes, refusal,
  };
}

/**
 * RULES §2.6's free cancel for a ticket placed at `placedMs` — `cancelMaswaliTicket`'s own test, through the one rule the
 * confirm sheet asks too (`millioneaFreeCancelEnd`): it exists only with the runway (the grace fitted before the close the
 * ticket was bought under), and it is open while now is before both the grace's end and the week's close as it stands now.
 * Null when it has no window, or the window has passed.
 */
function freeCancelEnd(placedMs: number, closeAtPurchaseMs: number, closeNowMs: number, graceMinutes: number, nowMs: number): string | null {
  const end = millioneaFreeCancelEnd(placedMs, closeAtPurchaseMs, closeNowMs, graceMinutes);
  return end !== null && end > nowMs ? new Date(end).toISOString() : null;
}

/** The free-cancel end of a purchase that has just landed, as its receipt prints it ("Ghairi hadi 14:07"). */
export async function millioneaCancelUntil(weekId: string, placedAt: string, now: Date = new Date()): Promise<string | null> {
  const week = await weekStore.get(weekId);
  if (!week || week.state !== "OPEN") return null;
  const terms = await termsOf(week);
  if (!terms) return null;
  const closeMs = Date.parse(week.closesAt);
  return freeCancelEnd(Date.parse(placedAt), closeMs, closeMs, terms.freeCancelMinutes, now.getTime());
}

// ── THE VIEWER'S TICKETS (§10 3.8, 3.9) ──────────────────────────────────────────────────────────────

/** A serial as minted (`MLN-2026-W44-000123`, or `MLD-…` for a drive week), or null: nothing else is ever looked up. */
export { normalizeMillioneaSerial } from "@/lib/millionea-serial";

export type MillioneaTicketsWeek = {
  week: { id: string; code: string; visibility: WeekVisibility; state: WeekState; closesAt: string; settledAt: string | null };
  tickets: MillioneaTicketRow[];
};

/**
 * ⭐ TIKETI ZANGU, MILLIONEA (§10 3.9): the viewer's tickets grouped by week, the current week first — newest first in the
 * calendar (R3) — each week's in sale order.
 * ⛔ PAGED BY WEEK, NEVER A PAGE OF THE NEWEST TICKETS (S5 re-review 4): a weekly cap may be set up to 100, so a page of
 *    newest tickets cuts a week in half. Every week the account holds a ticket in is counted (`total`), and every ticket of
 *    each week on the page is read, by its week.
 */
export async function millioneaMyTickets(userId: string, opts: { page?: number; perPage: number }): Promise<MillioneaPage<MillioneaTicketsWeek>> {
  const held = new Set(await ticketStore.weekIdsForUser(userId));
  const weeks = held.size === 0 ? [] : newestFirst((await weekStore.list({})).filter((w) => held.has(w.id)));
  const { page, perPage } = pageOf(opts.page, weeks.length, opts.perPage);
  const rows: MillioneaTicketsWeek[] = [];
  for (const week of weeks.slice((page - 1) * perPage, page * perPage)) rows.push(await ticketsWeekOf(userId, week));
  return { rows, total: weeks.length, page, perPage };
}

/**
 * The viewer's tickets in ONE week — every one of them, grouped as Tiketi zangu groups them — or null when the week does
 * not exist or holds none of theirs. What a page that names its week reads (a ticket's own week, a notice's week), so it
 * never looks for that week on a page of the list.
 */
export async function millioneaMyTicketsWeek(userId: string, weekId: string): Promise<MillioneaTicketsWeek | null> {
  const week = await weekStore.get(weekId);
  if (!week) return null;
  const g = await ticketsWeekOf(userId, week);
  return g.tickets.length > 0 ? g : null;
}

async function ticketsWeekOf(userId: string, week: StoredWeek): Promise<MillioneaTicketsWeek> {
  const mine = await ticketStore.listForUser(userId, { cycleId: week.id });
  const qs = await questionStore.listForWeek(week.id);
  const gq = gradable(qs);
  return {
    week: { id: week.id, code: week.code, visibility: week.visibility, state: week.state, closesAt: week.closesAt, settledAt: week.settledAt },
    tickets: rowsFor(mine, week, qs, gq, recordOf(gq), await refundsOf(mine, week)),
  };
}

/** A fact that may perform once on the ticket page (§10 2.1): the cut, a result's press, a carry, the cancel, the
 *  refund, the week's result. */
export type MillioneaFact = { kind: "cut" | "press" | "carry" | "cancel" | "refund" | "result"; at: string; slot?: number };

export type MillioneaTicketView = MillioneaTicketRow & {
  /** The anchor the permalink's fragment names (E-101): the ticket's root carries this id. */
  positionId: string;
  week: {
    id: string; code: string; visibility: WeekVisibility; state: WeekState; isFinal: boolean;
    opensAt: string; closesAt: string; closedAt: string | null; settledAt: string | null; questionSetHash: string | null;
    /** P6 · the graded set's finality and the objection window's end, as the hub week carries them (`millioneaWeekPhase`). */
    gradedSetFinalAt: string | null; objectionsCloseAt: string | null;
  };
  questions: MillioneaQuestion[];
  /** ⭐ S5-FIX-PLAYER P10 · the slots the slip filled ITSELF (MB-15): questions already sealed VOID — the final record's —
   *  when this ticket was cut, so asked of nobody. The ticket shows no pick there ("—"), never the slip's fill as the player's
   *  answer. Empty for a ticket bought before any void. */
  slipFilled: number[];
  /** The stub (§10 3.8): what was bought, and the commitment to it. The salt is shown to its owner only (MB-32). */
  stub: { price: number; selectionsHash: string; salt: string; rulesVersion: string };
  /** The free cancel's end while it is open; null otherwise (and then no Ghairi control). */
  cancelUntil: string | null;
  /** On the results published so far, this ticket cannot be 10 of 10 — provisional, and worded as such (§10 3.10). */
  cannotWinSoFar: boolean;
  resultsOut: number;
  nextResultAt: string | null;
  /** The legal line (L3): "two" only when every result was confirmed by a second officer; "single" otherwise. */
  resolution: "single" | "two";
  /** A ticket that won its settled week — its share paid, held or forfeited: the week's win ledger (§10 3.13) and the
   *  owner's own counts. ⛔ Null on every other ticket. */
  win: {
    jackpot: number; fee: number; traLevy: number; gbtLevy: number;
    /** J − F, before the equal split. */
    toWinners: number;
    winners: number; share: number;
    /** k × share; with `remainder` — the rounding of the equal split, (J − F) − k × share (MR-25) — it is `toWinners`.
     *  The remainder joins the next jackpot only in a week the house did not top up (U already excludes it). */
    paid: number; remainder: number;
    /** The house's floor top-up — printed, and it never rolls (MR-22). */
    topUp: number;
    /** The viewer's winning tickets this week whose share is THEIRS (paid), and those shares' sum. ⛔ A held or a
     *  forfeited share is in neither (S5 review M2): it is counted on its own line, with no amount. */
    yourWinningTickets: number; yourTotal: number;
    /** The viewer's winning tickets whose share is held for review, and those forfeited (OD-07). No amounts. */
    yourHeldTickets: number; yourForfeitedTickets: number;
    /** TOP_SCORE only in the sunset week with no 10 of 10 (MR-30): `winningScore` is then that week's top score. */
    basis: "TEN_OF_TEN" | "TOP_SCORE";
    winningScore: number;
  } | null;
  /** A settled ticket that did not win: the week's line — ⛔ no score, no amount, no carried figure (§10 3.14, OD-24). */
  loss: { winners: number; carriedForward: boolean; nextWeekCode: string | null } | null;
  /** A voided week (MR-18): why, and what each ticket comes back with — its price, in full. Whether THIS ticket's refund
   *  has landed is the row's `refund` (pending until its position settles): never a refund claimed before it happened. */
  weekVoid: { voidedMains: number; usableReserves: number; price: number } | null;
  /**
   * The facts this owner has not seen (§10 2.1) and the backlog rule. `through` is the instant of the newest fact THIS
   * view holds: the page passes it back when the facts have performed (`markMillioneaTicketSeenAction`), so a fact that
   * lands after the render still performs next time — never the server's clock at the mark (S5 review L7).
   */
  seen: { lastViewedAt: string | null; unseen: MillioneaFact[]; backlogRests: boolean; through: string };
};

/** One ticket's facts in time order (§10 2.1). ⛔ A refund is a fact only once it landed (M3). */
function factsOf(
  t: StoredTicket, week: StoredWeek, qs: StoredQuestion[], gq: GradableQuestion[], rec: WeekRecord, refund: MillioneaRefund | null,
): MillioneaFact[] {
  const facts: MillioneaFact[] = [{ kind: "cut", at: t.createdAt }];
  qs.forEach((q, i) => {
    if (gq[i]?.outcome == null) return;
    const at = q.twoOfficerAtStage1 ? q.stage2At : q.sealedAt;
    if (at) facts.push({ kind: "press", at, slot: q.slot });
  });
  if (rec.map && week.gradedSetFinalAt) {
    for (const r of rec.map) if (r.state === "REPLACED_BY") facts.push({ kind: "carry", at: week.gradedSetFinalAt, slot: r.slot });
  }
  if (t.cancelledAt) facts.push({ kind: "cancel", at: t.cancelledAt });
  if (refund?.state === "landed") facts.push({ kind: "refund", at: refund.at });
  if (week.state === "SETTLED" && week.settledAt) facts.push({ kind: "result", at: week.settledAt });
  return facts.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * One ticket's facts, for its owner only — what the seen mark checks a rendered instant against
 * (`maswali-player-acts.ts → markMillioneaTicketSeenFor`). Null exactly where `millioneaTicket` is null (MB-95).
 */
export async function millioneaTicketFacts(userId: string, serial: unknown): Promise<{ ticketId: string; lastViewedAt: string | null; facts: MillioneaFact[] } | null> {
  const s = normalizeMillioneaSerial(serial);
  if (!s || !userId) return null;
  const t = await ticketStore.getBySerial(s);
  if (!t || t.userId !== userId) return null;
  const week = await weekStore.get(t.cycleId);
  if (!week) return null;
  const qs = await questionStore.listForWeek(week.id);
  const gq = gradable(qs);
  const refund = (await refundsOf([t], week)).get(t.id) ?? null;
  return { ticketId: t.id, lastViewedAt: t.lastViewedAt, facts: factsOf(t, week, qs, gq, recordOf(gq), refund) };
}

/**
 * ⭐ ONE TICKET, FOR ITS OWNER — or null. ⛔ Null for a malformed serial, a serial nobody holds and a serial someone else
 * holds alike (MB-95): the route renders the same 404 for all three.
 */
export async function millioneaTicket(userId: string, serial: string, now: Date = new Date()): Promise<MillioneaTicketView | null> {
  const s = normalizeMillioneaSerial(serial);
  if (!s || !userId) return null;
  const t = await ticketStore.getBySerial(s);
  if (!t || t.userId !== userId) return null;
  const week = await weekStore.get(t.cycleId);
  if (!week) return null;
  const terms = await termsOf(week);
  if (!terms) return null;
  const nowMs = now.getTime();
  const qs = await questionStore.listForWeek(week.id);
  const gq = gradable(qs);
  const rec = recordOf(gq);
  // The owner's tickets in the week: the row's "same picks as" names an earlier one of them (OD-24); the win ledger
  // counts the owner's shares; a voided week's refunds are read per ticket (M3).
  const mineInWeek = await ticketStore.listForUser(userId, { cycleId: week.id });
  const refunds = await refundsOf(mineInWeek, week);
  const row = rowsFor(mineInWeek, week, qs, gq, rec, refunds).find((r) => r.serial === t.serial) ?? rowsFor([t], week, qs, gq, rec, refunds)[0];
  const position = await positionStore.get(t.positionId);

  // The cancel path's own test (`cancelMaswaliTicket`): the runway against the close the ticket was bought under, and
  // the end at the earlier of its grace and the week's close as it stands now.
  const cancelUntil = t.status === "LIVE" && week.state === "OPEN" && position
    ? freeCancelEnd(Date.parse(position.placedAt), Date.parse(t.closeAtPurchase), Date.parse(week.closesAt), terms.freeCancelMinutes, nowMs)
    : null;
  const sealed = qs.filter((_, i) => gq[i]?.outcome != null);
  const resolution = sealed.length > 0 && sealed.every((q) => q.twoOfficerAtStage1 === true && !!q.stage2By) ? "two" : "single";

  let win: MillioneaTicketView["win"] = null;
  let loss: MillioneaTicketView["loss"] = null;
  if (row.shown === "won" || row.shown === "forfeited") {
    const sharesOf = (state: MillioneaShare) => mineInWeek.filter((x) => shareOf(x) === state);
    const paidMine = sharesOf("paid");
    const J = week.jackpot ?? 0, F = week.fee ?? 0, paid = week.paidTotal ?? 0;
    win = {
      jackpot: J, fee: F, traLevy: week.traLevy ?? 0, gbtLevy: week.gbtLevy ?? 0, toWinners: J - F,
      winners: week.winningTickets ?? 0, share: week.sharePerTicket ?? 0, paid, remainder: J - F - paid,
      topUp: week.topUp ?? 0, yourWinningTickets: paidMine.length, yourTotal: paidMine.reduce((s, x) => s + paidOf(x), 0),
      yourHeldTickets: sharesOf("held").length, yourForfeitedTickets: sharesOf("forfeited").length,
      basis: t.score != null && t.score < MAIN_COUNT ? "TOP_SCORE" : "TEN_OF_TEN", winningScore: t.score ?? MAIN_COUNT,
    };
  } else if (row.shown === "lost") {
    // The week the pool went to is the next in the CALENDAR (R3; S5 re-review 1), never the next one drafted.
    const next = await nextWeekOf(week);
    loss = { winners: week.winningTickets ?? 0, carriedForward: (week.winningTickets ?? 0) === 0, nextWeekCode: next?.code ?? null };
  }
  const weekVoid = week.state === "VOIDED"
    ? {
      voidedMains: gq.filter((g) => g.role === "MAIN" && g.outcome === "VOID").length,
      usableReserves: gq.filter((g) => g.role === "RESERVE" && (g.outcome === "YES" || g.outcome === "NO")).length,
      price: terms.rules.ticketPriceTzs,
    }
    : null;

  // ── The facts, and which of them this owner has not seen (§10 2.1): each performs once, then rests.
  const facts = factsOf(t, week, qs, gq, rec, row.refund);
  const seenMs = t.lastViewedAt ? Date.parse(t.lastViewedAt) : Number.NEGATIVE_INFINITY;
  const unseen = facts.filter((f) => Date.parse(f.at) > seenMs);
  const results = resultsOf(qs, gq, nowMs);
  // P10 · the slots the slip filled itself: a question whose VOID was final (its seal, or its second officer's confirmation)
  // at or before the moment this ticket was cut — the slip asked nobody about it (MB-15).
  const cutMs = Date.parse(t.createdAt);
  const slipFilled = qs.flatMap((q, i) => {
    if (gq[i]?.outcome !== "VOID") return [];
    const finalAt = q.twoOfficerAtStage1 ? q.stage2At : q.sealedAt;
    return finalAt && Date.parse(finalAt) <= cutMs ? [q.slot] : [];
  });

  return {
    ...row,
    positionId: t.positionId,
    week: {
      id: week.id, code: week.code, visibility: week.visibility, state: week.state, isFinal: week.isFinal,
      opensAt: week.opensAt, closesAt: week.closesAt, closedAt: week.closedAt, settledAt: week.settledAt, questionSetHash: week.questionSetHash,
      gradedSetFinalAt: week.gradedSetFinalAt, objectionsCloseAt: week.objectionsCloseAt,
    },
    questions: questionsOf(qs, gq),
    slipFilled,
    stub: { price: terms.rules.ticketPriceTzs, selectionsHash: t.selectionsHash, salt: t.salt, rulesVersion: t.rulesVersion },
    cancelUntil,
    // Provisional, and only while the week is still being decided: a voided week's ticket waiting on its refund is
    // "running" too (M3), and nothing about it can still be won or lost. ⛔ Never in the final week (S5 re-review 2): with
    // no 10 of 10 there, the top score shares the jackpot (MR-30, `computeSettlement`), so a miss does not end a ticket.
    cannotWinSoFar: row.shown === "running" && week.state !== "VOIDED" && !week.isFinal
      && row.slots.some((x) => x.role === "MAIN" && (x.mark === "missed" || x.carried?.mark === "missed")),
    resultsOut: results.resultsOut, nextResultAt: results.nextResultAt,
    resolution, win, loss, weekVoid,
    seen: {
      lastViewedAt: t.lastViewedAt, unseen, backlogRests: unseen.length > MILLIONEA_BACKLOG_REST_AFTER,
      through: facts[facts.length - 1]?.at ?? t.createdAt,
    },
  };
}

// ── THE PUBLIC REGISTER (§10 3.17; MR-13, MR-28, MB-33) ──────────────────────────────────────────────

/** ⭐ DAFTARI LA WIKI: every final PUBLIC week, newest first in the calendar (R3) — the strata history, one page of it
 *  with the total, so no week falls off the end unseen (S5 re-review 4). ⛔ Never a drive week, never a week whose results
 *  can still change. Summaries are built only for the page asked. */
export async function millioneaRegister(opts: { page?: number; perPage: number }): Promise<MillioneaPage<MillioneaWeekSummary>> {
  const weeks = newestFirst(await weekStore.list({ visibility: "PUBLIC", states: TERMINAL }));
  const { page, perPage } = pageOf(opts.page, weeks.length, opts.perPage);
  return { rows: await Promise.all(weeks.slice((page - 1) * perPage, page * perPage).map(summaryOf)), total: weeks.length, page, perPage };
}

/** MB-90 · `/results`' own Millionea section: the latest final public weeks, as the register prints them. */
export async function millioneaResultsSection(limit = 6): Promise<MillioneaWeekSummary[]> {
  return (await millioneaRegister({ perPage: limit })).rows;
}

export type MillioneaRegisterQuestion = MillioneaQuestion & {
  voidReason: string | null;
  sealedAt: string | null;
  /** The attesting officer's ROLE — never a name (§10 3.17, the handover's WP5). */
  sealerRole: string | null;
};

export type MillioneaRegisterWeek = MillioneaWeekSummary & {
  opensAt: string;
  closesAt: string;
  /** P9 · the week its carry came from (when it carried one in) and the week what it handed on went to, by the calendar
   *  chain (`prevWeekOf`, `nextWeekOf`: DRAFTs and voided weeks skipped) — never its open ± 7 days. Null when there is no
   *  such week (yet): the ledger then names none. */
  carryFromCode: string | null;
  carryToCode: string | null;
  /** Published at the open: the fifteen questions committed (MR-13). */
  questionSetHash: string | null;
  /** Published at the close: the Merkle root over every live ticket's salted hash (MB-32). */
  ticketMerkleRoot: string | null;
  ticketPrice: number;
  floor: number;
  feeRate: number | null;
  traLevy: number | null;
  gbtLevy: number | null;
  /** J − F, what the equal split divides — "To winners", the win ledger's and How to play's one figure (S5-FIX-PLAYER P3);
   *  null in a week nobody won and in a voided week. The share and the remainder below reconcile it. */
  toWinners: number | null;
  /** The rounding line, (J − F) − k × share; null in a week nobody won. What actually went on is `carriedForward` — and in a
   *  week the house topped up it carried nothing (MR-25: the top-up already leaves it out), so the page prints it only in a
   *  week with no top-up. */
  remainder: number | null;
  questions: MillioneaRegisterQuestion[];
  /** The substitution map, from the final record only: each voided main, when it voided, and the reserve that counted. */
  substitutions: Array<{ main: number; reserve: number; voidedAt: string | null }>;
  /** How a settled week's winners were found (MR-30): TOP_SCORE only in a final week with no 10 of 10. Null when no
   *  ticket won, and for a voided week. */
  basis: "TEN_OF_TEN" | "TOP_SCORE" | null;
  winningScore: number | null;
  resolution: "single" | "two";
  /** SETTLED only (§10 3.17): the tickets still without a miss after each counted result, in the order they were sealed. */
  standing: Array<{ slot: number; sealedAt: string | null; ticketsWithoutAMiss: number }> | null;
  /** SETTLED only — the anonymised graded table (MR-13), as counts: how many tickets scored 0, 1, … 10. */
  scores: number[] | null;
};

/** A week code as stamped (`MLN-2026-W44`), or null. The register answers PUBLIC codes only. */
export function normalizeMillioneaWeekCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  return /^MLN-\d{4}-W\d{2}$/.test(s) ? s : null;
}

/** ⭐ ONE WEEK OF THE REGISTER — public, final, with every figure to the shilling; or null. ⛔ PUBLIC only: a DRIVE week's
 *  money is read by its own ticket's holder through the core (`millioneaWeekMoneyRecord`), never here. */
export async function millioneaRegisterWeek(code: string): Promise<MillioneaRegisterWeek | null> {
  const want = normalizeMillioneaWeekCode(code);
  if (!want) return null;
  const week = await weekStore.getByCode(want);
  if (!week || week.visibility !== "PUBLIC" || !TERMINAL.includes(week.state)) return null;
  const rules = frozenRules(week);
  if (!rules) return null;
  const qs = await questionStore.listForWeek(week.id);
  const gq = gradable(qs);
  const rec = recordOf(gq);
  const settled = week.state === "SETTLED";

  const roles = new Map<string, string | null>();
  for (const id of new Set(qs.map((q) => q.sealedBy).filter((x): x is string => !!x))) {
    try { roles.set(id, (await db.user.findById(id))?.role ?? null); } catch { roles.set(id, null); }
  }
  const sealedAtOf = new Map(qs.map((q) => [q.slot, q.sealedAt] as const));
  const questions = questionsOf(qs, gq).map((q, i): MillioneaRegisterQuestion => ({
    ...q, voidReason: qs[i].voidReason, sealedAt: qs[i].sealedAt, sealerRole: qs[i].sealedBy ? roles.get(qs[i].sealedBy!) ?? null : null,
  }));
  const substitutions = (rec.map ?? []).flatMap((r) => (r.state === "REPLACED_BY" ? [{ main: r.slot, reserve: r.reserve, voidedAt: sealedAtOf.get(r.slot) ?? null }] : []));
  const sealed = qs.filter((q) => q.outcome !== null);
  const resolution = sealed.length > 0 && sealed.every((q) => q.twoOfficerAtStage1 === true && !!q.stage2By) ? "two" : "single";

  let standing: MillioneaRegisterWeek["standing"] = null, scores: number[] | null = null;
  const graded = settled ? await ticketStore.listForWeek(week.id, { status: "SETTLED" }) : null;
  if (graded) {
    scores = Array.from({ length: MAIN_COUNT + 1 }, () => 0);
    for (const t of graded) if (t.score != null && t.score >= 0 && t.score <= MAIN_COUNT) scores[t.score]++;
    const set = rec.set;
    if (set?.kind === "SET") {
      const outcomeAt = new Map(qs.map((q, i) => [q.slot, gq[i]?.outcome ?? null] as const));
      const order = [...set.slots].sort((a, b) => (sealedAtOf.get(a) ?? "").localeCompare(sealedAtOf.get(b) ?? "") || a - b);
      let alive = graded.map((t) => t.selections);
      standing = order.map((slot) => {
        alive = alive.filter((sel) => sel[slot - 1] === outcomeAt.get(slot));
        return { slot, sealedAt: sealedAtOf.get(slot) ?? null, ticketsWithoutAMiss: alive.length };
      });
    }
  }
  // The money is the ONE core's (`weekMoneyOf`, S5-DESIGN-REGISTER — the lead's ruling of 2026-10-21), laid back in the
  // record's own key order, so a public week's projection is the same, byte for byte.
  const { carryFromCode, carryToCode, ticketPrice, floor, feeRate, traLevy, gbtLevy, toWinners, remainder, basis, winningScore, ...summary } =
    await weekMoneyOf(week, rules, graded);
  return {
    ...summary,
    opensAt: week.opensAt, closesAt: week.closesAt, questionSetHash: week.questionSetHash, ticketMerkleRoot: week.ticketMerkleRoot,
    carryFromCode, carryToCode, ticketPrice, floor, feeRate, traLevy, gbtLevy, toWinners, remainder,
    questions, substitutions, basis, winningScore, resolution, standing, scores,
  };
}

/** The week page keeps its route gate per request; only its terminal PUBLIC projection is memoised briefly. */
export async function cachedMillioneaRegisterWeek(code: string): Promise<MillioneaRegisterWeek | null> {
  const want = normalizeMillioneaWeekCode(code);
  if (!want) return null;
  return readCachedMillioneaRegisterWeek(
    want,
    () => weekStore.getByCode(want),
    () => millioneaRegisterWeek(want),
  );
}

// ── HOW TO PLAY: THE FROZEN RULES (§10 3.4) ──────────────────────────────────────────────────────────

export type MillioneaHowTo = {
  /** WEEK: the rules the viewer's current week froze. CONFIG: no week is current, so the rules the next one will freeze. */
  source: "WEEK" | "CONFIG";
  weekCode: string | null;
  ticketPrice: number;
  floor: number;
  feeRate: number;
  /** TRA and GBT levies, as shares OF THE FEE (MR-24). */
  traRate: number;
  gbtRate: number;
  ticketCap: number;
  openWeekday: number;
  openAt: string;
  closeWeekday: number;
  closeAt: string;
  minLockBufferMinutes: number;
  voidDeadlineHours: number;
  /** The results week's final deadline, which caps every question's void deadline (MR-15) — the timeline's last void. */
  finalDeadlineWeekday: number;
  finalDeadlineAt: string;
  objectionWindowHours: number;
  objectionNotBeforeAt: string;
  freeCancelMinutes: number;
  /** The worked examples ("Mfano"), computed by the settlement's own arithmetic from these rules: a shared jackpot at or
   *  above the floor, and a floor week with one winner. ⛔ Each is null where these rules cannot show it truthfully. */
  examples: MillioneaExamples;
};

/** One worked example: the sales, the tickets they are, the winners among them, and the settlement's figures. */
export type MillioneaExample = { sales: number; tickets: number; winners: number; figures: Extract<WeekArithmetic, { kind: "PAYOUT" }> };
export type MillioneaExamples = { shared: MillioneaExample | null; floorWeek: MillioneaExample | null };

/** ⭐ THE HOW-TO'S RULES — every figure a placeholder the page fills (L2: admins can change everything). */
export async function millioneaHowTo(viewer: MillioneaViewer): Promise<MillioneaHowTo> {
  const line = await millioneaLineFor(viewer.state);
  // By state, never the newest N of the line (L1): the week on sale, else the newest one being graded in the calendar
  // (R3) — the hub's own week.
  const current = (await weekStore.openFor(line)) ?? newestFirst(await weekStore.list({ visibility: line, states: GRADING }))[0] ?? null;
  const terms = current ? await termsOf(current) : null;
  let base: Omit<MillioneaHowTo, "examples">;
  if (current && terms) {
    const r = terms.rules;
    base = {
      source: "WEEK", weekCode: current.code, ticketPrice: r.ticketPriceTzs, floor: r.floorTzs, feeRate: terms.feeRate,
      traRate: terms.traRate, gbtRate: terms.gbtRate, ticketCap: r.ticketCapPerWeek, openWeekday: r.openWeekday, openAt: r.openAt,
      closeWeekday: r.closeWeekday, closeAt: r.closeAt, minLockBufferMinutes: r.minLockBufferMinutes, voidDeadlineHours: r.voidDeadlineHours,
      finalDeadlineWeekday: r.finalDeadlineWeekday, finalDeadlineAt: r.finalDeadlineAt,
      objectionWindowHours: r.objectionWindowHours, objectionNotBeforeAt: r.objectionNotBeforeAt, freeCancelMinutes: terms.freeCancelMinutes,
    };
  } else {
    const c = getMaswaliConfig();
    const g = await getGlobalConfig();
    base = {
      source: "CONFIG", weekCode: null, ticketPrice: c.ticketPriceTzs, floor: c.floorTzs, feeRate: c.jackpotFeeRate,
      traRate: g.traTaxOnCommissionRate, gbtRate: g.gbtLevyOnCommissionRate, ticketCap: c.ticketCapPerWeek, openWeekday: c.openWeekday,
      openAt: c.openAt, closeWeekday: c.closeWeekday, closeAt: c.closeAt, minLockBufferMinutes: c.minLockBufferMinutes,
      voidDeadlineHours: c.voidDeadlineHours, finalDeadlineWeekday: c.finalDeadlineWeekday, finalDeadlineAt: c.finalDeadlineAt,
      objectionWindowHours: c.objectionWindowHours, objectionNotBeforeAt: c.objectionNotBeforeAt,
      freeCancelMinutes: g.freeExitGraceMinutes,
    };
  }
  return { ...base, examples: millioneaExamplesFor(base) };
}

/**
 * ⭐ HOW TO PLAY'S WEEK TIMELINE — this week's shape on the template, every phase by the hub's own rules (S5-FIX-PLAYER P7):
 * sales from the open to the close; events from the close and its buffer to the weekend's last day (Sunday); results and
 * payout from that day to `millioneaResultsBy` — the latest void deadline the template allows (an event as late as the end
 * of Sunday, plus the void hours, capped at the results week's final deadline, MR-15) plus the frozen objection window,
 * never closing before its EAT floor. The hub's strip says the same of a real week. Instants in ms; null on unreadable rules.
 */
export type MillioneaTimeline = { salesFrom: number; salesTo: number; eventsFrom: number; eventsTo: number; resultsFrom: number; resultsTo: number };
export function millioneaHowTimeline(h: Pick<MillioneaHowTo, "openWeekday" | "openAt" | "closeWeekday" | "closeAt" | "minLockBufferMinutes"
  | "voidDeadlineHours" | "finalDeadlineWeekday" | "finalDeadlineAt" | "objectionWindowHours" | "objectionNotBeforeAt">, nowMs: number): MillioneaTimeline | null {
  try {
    const DAY = 86_400_000;
    const start = eatWeekStartMs(nowMs);
    const salesFrom = eatWeekAt(start, h.openWeekday, h.openAt);
    const salesTo = eatWeekAt(start, h.closeWeekday, h.closeAt);
    const eventsTo = start + 6 * DAY;
    const finalDeadline = eatWeekAt(start + 7 * DAY, h.finalDeadlineWeekday, h.finalDeadlineAt);
    const lastVoid = Math.min(start + 7 * DAY + h.voidDeadlineHours * 3_600_000, finalDeadline);
    const resultsTo = millioneaResultsBy(null, lastVoid, h);
    if (resultsTo === null) return null;
    return { salesFrom, salesTo, eventsFrom: salesTo + h.minLockBufferMinutes * 60_000, eventsTo, resultsFrom: eventsTo, resultsTo };
  } catch {
    return null;
  }
}

/** The rules a worked example is priced from (the how-to's own figures). */
export type MillioneaExampleRules = { ticketPrice: number; floor: number; feeRate: number; traRate: number; gbtRate: number };

/**
 * ⭐ THE HOW-TO'S TWO WORKED EXAMPLES, priced by `settleArithmetic` — the one formula settlement pays by — from the rules
 * on the page: the PDF's shared week (sales a twentieth above the floor, three winners) and a floor week (three hundred
 * tickets, or fewer when that would reach the floor; one winner).
 * ⛔ AN EXAMPLE THAT WOULD MISLEAD IS LEFT OUT, NEVER BENT (S5 review L4). Each must hold for every floor an admin may set
 *    (0, or at least one ticket's price): it is shown only when its figures say what its words say —
 *      shared    · a floor exists, at least three tickets were sold, the sales reach the floor, and nothing was topped
 *                  up (J = R + S);
 *      floorWeek · a floor exists, at least one ticket was sold, the sales stay below the floor, and the house topped the
 *                  jackpot up to it (J = the floor, U > 0).
 *    A floor of 0 shows neither; a floor of one ticket's price shows neither (one ticket cannot be three winners, and no
 *    sales stay below it).
 */
export function millioneaExamplesFor(r: MillioneaExampleRules): MillioneaExamples {
  const none: MillioneaExamples = { shared: null, floorWeek: null };
  try {
    const price = r.ticketPrice;
    if (!Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(r.floor) || r.floor <= 0) return none;
    const rates = { traTaxOnCommissionRate: r.traRate, gbtLevyOnCommissionRate: r.gbtRate };
    const priced = (tickets: number, winners: number): MillioneaExample | null => {
      const sales = tickets * price;
      const figures = settleArithmetic({ rolloverIn: 0, sales, winners, floor: r.floor, feeRate: r.feeRate, rates });
      return figures.kind === "PAYOUT" ? { sales, tickets, winners, figures } : null;
    };
    const sharedTickets = Math.floor((r.floor * 21) / 20 / price);
    const shared = sharedTickets >= 3 ? priced(sharedTickets, 3) : null;
    const floorTickets = Math.min(300, Math.floor((r.floor - 1) / price));
    const floorWeek = floorTickets >= 1 ? priced(floorTickets, 1) : null;
    return {
      shared: shared && shared.sales >= r.floor && shared.figures.U === 0 && shared.figures.J === shared.sales ? shared : null,
      floorWeek: floorWeek && floorWeek.sales < r.floor && floorWeek.figures.J === r.floor && floorWeek.figures.U > 0 ? floorWeek : null,
    };
  } catch {
    return none;
  }
}

// ── THE ACCOUNT-CLOSURE SCREEN (§7b S5 item 10, MB-44) ───────────────────────────────────────────────

export type MillioneaClosureTicket = {
  serial: string;
  weekCode: string;
  weekState: WeekState;
  shown: TicketShown;
  /** A winning share credited and held for Compliance (MB-43): money the player cannot yet withdraw. */
  heldForReview: boolean;
  /** A voided week's ticket whose refund has not landed yet (M3): its money is still out, and the void lane retries. */
  refundPending: boolean;
};

/**
 * The account's open Millionea tickets, for the closure screen: every ticket whose week has not run its course, every
 * voided week's ticket whose refund has not landed, and every winning share still held for review. ⛔ Read for the
 * account itself, whatever the rollout shows — a closing player must see the money they still have riding (a hidden
 * product's tickets still settle, MR-10). ⛔ Every ticket the account holds, never a page of the newest: an old held
 * share is still money riding.
 */
export async function millioneaClosureTickets(userId: string): Promise<MillioneaClosureTicket[]> {
  const tickets = await ticketStore.listForUser(userId);
  const open = tickets.filter((t) => t.status === "LIVE" || shareOf(t) === "held");
  const weeks = new Map<string, StoredWeek | null>();
  for (const t of open) if (!weeks.has(t.cycleId)) weeks.set(t.cycleId, await weekStore.get(t.cycleId));
  const out: MillioneaClosureTicket[] = [];
  for (const [cycleId, week] of weeks) {
    if (!week) continue;
    const mine = open.filter((t) => t.cycleId === cycleId);
    // R1 · a week void's one bulk transaction refunds the positions and marks the tickets REFUNDED together
    // (`refundVoidedWeek`), so a refunded ticket is not LIVE and never reaches here; a LIVE ticket of a VOIDED week is one
    // whose refund has not run yet. Each is read from its own position (M3): pending until its refund lands.
    const refunds = await refundsOf(mine, week);
    for (const t of mine) {
      const refund = week.state === "VOIDED" && t.status === "LIVE" ? refunds.get(t.id) ?? { state: "pending" as const } : null;
      if (refund?.state === "landed") continue;
      out.push({
        serial: t.serial, weekCode: week.code, weekState: week.state, shown: ticketShown(t, week.state, false),
        heldForReview: t.status === "SETTLED", refundPending: refund?.state === "pending",
      });
    }
  }
  return out.sort((a, b) => b.serial.localeCompare(a.serial));
}

// ── THE ONCE-PER-PLAYER-WEEK NOTICES (§10 3.15, 3.16; §M8a item 10) ──────────────────────────────────

export type MillioneaNotice =
  /** The latest settled week had no 10 of 10: its whole pool went to the next jackpot (M7, past tense, no call to act). */
  | { notice: "ROLLOVER"; weekId: string; code: string; carriedForward: number; nextWeekCode: string | null }
  /** A week the viewer held tickets in voided whole: every one of those tickets came back in full (M8) — due only once
   *  every one of their refunds has LANDED (M3), and `refunded` is what landed. While any is pending there is no notice:
   *  the tickets themselves say "Pending" (their `refund`), and the notice comes when it is true. */
  | { notice: "WEEK_VOID"; weekId: string; code: string; tickets: number; refunded: number }
  /** A week the viewer held tickets in settled: one seal for the week (§F9), or the calm loss line. No amount on a loss.
   *  `won` — a share of theirs is PAID (the seal is earned money, §M8a item 7); `winningTickets` and `total` — those paid
   *  tickets, and their sum (null when none is paid). ⛔ A held or a forfeited share is in none of the three (M2; S5
   *  re-review 3), and `held` and `forfeited` count them: a week whose only win is forfeited is not `won`, and one whose
   *  every win is still HELD is not due at all until Compliance decides (M3's rule: the notice comes when it is true, so
   *  the seal a release earns is never spent early). */
  | { notice: "RESULT"; weekId: string; code: string; won: boolean; winningTickets: number; total: number | null; held: number; forfeited: number };

/** The notices due to this viewer — unseen, newest week first in the calendar (R3) — for the line the hub shows: the
 *  line's four newest final weeks, the latest of them the one a rollover notice speaks of. */
export async function millioneaNotices(userId: string, line: WeekVisibility = "PUBLIC"): Promise<MillioneaNotice[]> {
  const weeks = newestFirst(await weekStore.list({ visibility: line, states: TERMINAL })).slice(0, 4);
  if (weeks.length === 0) return [];
  const ids = new Set(weeks.map((w) => w.id));
  const seen = new Set((await noticeStore.seenFor(userId, [...ids])).map((n) => `${n.cycleId}|${n.notice}`));
  const isSeen = (weekId: string, notice: MaswaliNotice) => seen.has(`${weekId}|${notice}`);
  const out: MillioneaNotice[] = [];
  const latest = weeks[0];
  if (latest.state === "SETTLED" && (latest.winningTickets ?? 0) === 0 && !isSeen(latest.id, "ROLLOVER")) {
    const next = await nextWeekOf(latest);
    out.push({ notice: "ROLLOVER", weekId: latest.id, code: latest.code, carriedForward: carriedForwardOf(latest) ?? 0, nextWeekCode: next?.code ?? null });
  }
  for (const w of weeks) {
    // Each week's own tickets, read by the week — never a page of the newest across weeks (L1's class).
    const held = (await ticketStore.listForUser(userId, { cycleId: w.id })).filter((t) => t.status !== "CANCELLED");
    if (held.length === 0) continue;
    if (w.state === "VOIDED" && !isSeen(w.id, "WEEK_VOID")) {
      const refunds = await refundsOf(held, w);
      const landed = held.map((t) => refunds.get(t.id)).filter((r): r is Extract<MillioneaRefund, { state: "landed" }> => r?.state === "landed");
      if (landed.length === held.length) {
        out.push({ notice: "WEEK_VOID", weekId: w.id, code: w.code, tickets: held.length, refunded: landed.reduce((s, r) => s + r.amount, 0) });
      }
    }
    if (w.state === "SETTLED" && !isSeen(w.id, "RESULT")) {
      const shares = held.map(shareOf);
      const paid = held.filter((t) => shareOf(t) === "paid");
      const onHold = shares.filter((s) => s === "held").length;
      // ⛔ Not while every win of theirs is still HELD (S5 re-review 3): its `won` waits on Compliance's decision, and a
      //    once-only notice seen before it would never bring the seal a release earns. As a week void's notice waits for
      //    its refunds (M3), it comes when it is true; meanwhile the ticket itself reads its hold mark.
      if (onHold === 0 || paid.length > 0) {
        out.push({
          notice: "RESULT", weekId: w.id, code: w.code, won: paid.length > 0, winningTickets: paid.length,
          total: paid.length > 0 ? paid.reduce((s, t) => s + paidOf(t), 0) : null,
          held: onHold, forfeited: shares.filter((s) => s === "forfeited").length,
        });
      }
    }
  }
  return out;
}

// ── S5-DESIGN-HUB · THE HUB'S OWN READS (MASWALI-BUILD S5-DESIGN-HUB; the lead's rulings of 2026-10-21) ─────────────────
// Added at the end, in the hub lane's own block (the design lanes' rule for this shared file): nothing above is changed.

/** M7 · a sales close the officer moved (MB-28, `moveClose`): the close the week had before its latest move, and the one
 *  it has now — what the hub's notice says, "it is now Friday 16:00 (was 18:00)". */
export type MillioneaCloseMove = { from: string; to: string };

/**
 * ⭐ M7 · THE MOVED CLOSE, FROM ITS ONE RECORD. The week stores only its close; the close it had before a move is written
 * nowhere but the audit entry `moveClose` writes in the same act (`maswali.week.close_moved`, payload `{ code, from, to }`),
 * so it is read from there — one indexed read of the week's own entries (`@@index([targetType, targetId])`), and only while
 * the week sells with its close ahead (a moved close is news only until it passes). ⛔ The entry must say the close the
 * week HAS: an entry whose `to` is not the stored close (a later move, a store that disagrees) says nothing, so the hub
 * never prints a "was" it cannot stand behind (AGENTS §6). A failed read is no notice, never an error page.
 */
export async function millioneaCloseMove(week: Pick<MillioneaHubWeek, "id" | "state" | "opensAt" | "closesAt">, nowMs: number): Promise<MillioneaCloseMove | null> {
  const closeMs = Date.parse(week.closesAt);
  if (week.state !== "OPEN" || !Number.isFinite(closeMs) || closeMs <= nowMs) return null;
  try {
    const { getAuditForTargetsDurable } = await import("./audit");
    // Every move of THIS week counts, whenever it was written: an entry carries the wall clock of its write, which says
    // nothing about the week's own schedule (a week drafted ahead is moved before its scheduled open on a test clock).
    const since = new Date(0).toISOString();
    const { entries } = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [week.id], actions: ["maswali.week.close_moved"], sinceIso: since, limit: 5 });
    const latest = entries[0];
    const from = typeof latest?.payload?.from === "string" ? latest.payload.from : null;
    const to = typeof latest?.payload?.to === "string" ? latest.payload.to : null;
    if (!from || !to || Date.parse(to) !== closeMs || !Number.isFinite(Date.parse(from)) || Date.parse(from) === closeMs) return null;
    return { from, to };
  } catch {
    return null;
  }
}

/** L22 · the final week announced ahead (OD-03): its stamped code and its scheduled open. */
export type MillioneaFinalAhead = { code: string; opensAt: string };

/**
 * ⭐ L22 · OD-03'S ANNOUNCEMENT — the final week is made final at least a full week before its sales open (`sunsetMaswali`
 * refuses a drafted week any later), and from that act until it opens the hub says so (the lead's ruling of 2026-10-21: a
 * calm bar on the hub, while Millionea is ENDING and the week on sale is not the final one). The final week is the
 * service's own answer (`sunsetState`), read only for the public line (a drive week is never final); null while no final
 * week waits to open, and on any failed read (an announcement is never a guess).
 */
export async function millioneaFinalWeekAhead(line: WeekVisibility): Promise<MillioneaFinalAhead | null> {
  if (line !== "PUBLIC") return null;
  try {
    const life = await sunsetState();
    if (life.kind !== "ENDING" || life.week.state !== "DRAFT") return null;
    return { code: life.week.code, opensAt: life.week.opensAt };
  } catch {
    return null;
  }
}

/** The week's two public commitments (MR-13), as the hub's week section prints them (the lead's ruling on R1-register H2:
 *  the hash from the open, the root once closed). Each null until it is stamped. */
export type MillioneaHubCommitments = {
  /** The question set's hash, published at the open (MR-13), and when — the week's open, the register's own instant. */
  questionSetHash: string | null;
  publishedAt: string | null;
  /** The tickets' commitment, fixed at the close with its count (MR-13). */
  ticketRoot: string | null;
  closedAt: string | null;
  ticketCount: number | null;
};

/**
 * ⭐ THE HUB WEEK'S COMMITMENTS (the lead's ruling, 2026-10-21: the data now, the lines drawn in round 2 with the register
 * lane's words). Read from the week's own stamped columns — nothing derived, nothing before it is stamped: the hash from
 * the open, the root, its close and its count once the week has closed. A DRAFT has none (it was never published).
 */
export async function millioneaHubCommitments(weekId: string): Promise<MillioneaHubCommitments | null> {
  const w = await weekStore.get(weekId);
  if (!w || w.state === "DRAFT") return null;
  const rooted = !!w.ticketMerkleRoot && !!w.closedAt;
  return {
    questionSetHash: w.questionSetHash,
    publishedAt: w.questionSetHash ? w.opensAt : null,
    ticketRoot: rooted ? w.ticketMerkleRoot : null,
    closedAt: rooted ? w.closedAt : null,
    ticketCount: rooted ? w.ticketCount : null,
  };
}

/**
 * L20 · EACH HELD TICKET'S FREE-CANCEL END on the hub (RULES §2.6), by serial — the ticket page's own test (`freeCancelEnd`,
 * as `millioneaTicket` asks it: the runway against the close the ticket was bought under, the end at the earlier of its
 * grace and the week's close as it stands now). Only a LIVE ticket of the OPEN week has one; the map names no other. The
 * data now; the held row draws it once the TICKETS lane's `cancelUntil` lands (the lead's ruling, 2026-10-21).
 */
export async function millioneaHubCancelEnds(weekId: string, userId: string, now: Date = new Date()): Promise<Record<string, string>> {
  const week = await weekStore.get(weekId);
  if (!week || week.state !== "OPEN") return {};
  const terms = await termsOf(week);
  if (!terms) return {};
  const out: Record<string, string> = {};
  for (const t of await ticketStore.listForUser(userId, { cycleId: week.id })) {
    if (t.status !== "LIVE") continue;
    const position = await positionStore.get(t.positionId);
    const end = position
      ? freeCancelEnd(Date.parse(position.placedAt), Date.parse(t.closeAtPurchase), Date.parse(week.closesAt), terms.freeCancelMinutes, now.getTime())
      : null;
    if (end) out[t.serial] = end;
  }
  return out;
}

// ── S5-DESIGN-REGISTER (2026-10-21, Ali's 10/10 pass) — THE REGISTER'S OWN READS ──────────────────────────────────────
// Added at the end of the shared file, as the design lanes' brief asks: no existing helper or field changes. The register
// critic's H1 (why a week voided: its counts), H2 (the lead's ruling: a public week's page from the moment it opens — its
// commitments, its questions and its confirmed outcomes, its money only once final), H4 (how each result was attested).

/** How one result was attested, as the public record states it (H4): when it became final — its seal, or with the
 *  platform's two-officer flag the second officer's confirmation — and by how many officers; both null while it is not.
 *  ⛔ Never "automatic": no AI ever seals a Millionea question (MR-14). ⛔ No officer's name or id: a count of officers. */
export type MillioneaAttestation = { attestedAt: string | null; signoff: "one" | "two" | null };

/** The attestation of each of a week's questions, by slot — from the confirmed record only (`gradable`): a result sealed
 *  at stage 1 and still waiting for its second officer is not final, and says nothing yet. */
function attestationsOf(qs: readonly StoredQuestion[], gq: readonly GradableQuestion[]): Record<number, MillioneaAttestation> {
  const out: Record<number, MillioneaAttestation> = {};
  qs.forEach((q, i) => {
    if (gq[i]?.outcome == null) { out[q.slot] = { attestedAt: null, signoff: null }; return; }
    const two = q.twoOfficerAtStage1 === true && !!q.stage2By && q.stage2By !== q.sealedBy;
    out[q.slot] = { attestedAt: (q.twoOfficerAtStage1 ? q.stage2At : q.sealedAt) ?? null, signoff: two ? "two" : "one" };
  });
  return out;
}

/** The confirmed record's counts (MR-18): voided mains, and the reserves sealed YES or NO — the ones a void can use. */
function voidCountsOf(gq: readonly GradableQuestion[]): { voidedMains: number; voidedReserves: number; usableReserves: number } {
  return {
    voidedMains: gq.filter((g) => g.role === "MAIN" && g.outcome === "VOID").length,
    voidedReserves: gq.filter((g) => g.role === "RESERVE" && g.outcome === "VOID").length,
    usableReserves: gq.filter((g) => g.role === "RESERVE" && (g.outcome === "YES" || g.outcome === "NO")).length,
  };
}

/**
 * ⭐ A PUBLIC WEEK STILL RUNNING, AS THE REGISTER SHOWS IT (H2, the lead's ruling of 2026-10-21): its two commitments the
 * moment each is stamped — the question set's hash at the open, the tickets' root with its close time and count at the
 * close (MR-13) — its fifteen questions, and each result once it is confirmed, with how it was attested.
 * ⛔ NO MONEY until the week is final: no sales, pool, jackpot or fee here (the hub prints the live pool; the register's
 *    ledger is the settlement's). ⛔ No pick aggregate and no "still without a miss" count before settlement (MB-38, OD-24).
 *    ⛔ No carry between questions: the reserves' map is drawn from the FINAL record only (`MillioneaRegisterWeek`) — an
 *    objection can still reinstate a question while the window is open.
 */
export type MillioneaRegisterLiveWeek = {
  id: string;
  code: string;
  state: "OPEN" | "CLOSED" | "RESOLVING";
  isFinal: boolean;
  opensAt: string;
  closesAt: string;
  closedAt: string | null;
  /** With `objectionsCloseAt`, what `millioneaWeekPhase` reads (S5-FIX-PLAYER P6). */
  gradedSetFinalAt: string | null;
  objectionsCloseAt: string | null;
  questionSetHash: string | null;
  /** Stamped once at the close (MR-13); null while the week sells. */
  ticketMerkleRoot: string | null;
  /** The live tickets at the close, published with the root (MR-13); null while the week sells. */
  tickets: number | null;
  /** The sales pause (MB-62) — a boolean only: the officer's reason is an internal note. */
  paused: boolean;
  /** The fifteen, each outcome the confirmed one (or null), a void's reason only on a confirmed VOID. */
  questions: MillioneaRegisterQuestion[];
  attested: Record<number, MillioneaAttestation>;
  resultsOut: number;
  voidedMains: number;
  voidedReserves: number;
  usableReserves: number;
};

async function liveRegisterWeekOf(week: StoredWeek, paused: boolean): Promise<MillioneaRegisterLiveWeek | null> {
  if (week.visibility !== "PUBLIC" || (week.state !== "OPEN" && week.state !== "CLOSED" && week.state !== "RESOLVING")) return null;
  const qs = await questionStore.listForWeek(week.id);
  const gq = gradable(qs);
  const attested = attestationsOf(qs, gq);
  const questions = questionsOf(qs, gq).map((q, i): MillioneaRegisterQuestion => ({
    ...q, voidReason: q.outcome === "VOID" ? qs[i].voidReason : null, sealedAt: attested[q.slot]?.attestedAt ?? null, sealerRole: null,
  }));
  const closed = week.state !== "OPEN" && week.closedAt !== null;
  return {
    id: week.id, code: week.code, state: week.state, isFinal: week.isFinal,
    opensAt: week.opensAt, closesAt: week.closesAt, closedAt: week.closedAt,
    gradedSetFinalAt: week.gradedSetFinalAt, objectionsCloseAt: week.objectionsCloseAt,
    questionSetHash: week.questionSetHash,
    ticketMerkleRoot: closed ? week.ticketMerkleRoot : null,
    tickets: closed ? week.ticketCount : null,
    paused,
    questions, attested,
    resultsOut: gq.filter((g) => g.outcome !== null).length,
    ...voidCountsOf(gq),
  };
}

/**
 * ⭐ ONE PAGE OF THE REGISTER, BY ITS WEEK CODE — what `/millionea/register/[week]` reads: a FINAL public week with every
 * figure to the shilling (the cached `MillioneaRegisterWeek`) and, beside it, how each result was attested and the counts
 * that voided it (H1, H4); or a public week still running, as the lead's H2 ruling allows it; or null — a code that is not
 * a public week that has opened (a DRAFT, a DRIVE week, nothing), which the page answers as not found.
 */
export type MillioneaRegisterRecord =
  | { kind: "final"; week: MillioneaRegisterWeek; attested: Record<number, MillioneaAttestation>; voidedMains: number; usableReserves: number }
  | { kind: "live"; week: MillioneaRegisterLiveWeek };

export async function millioneaRegisterRecord(code: string): Promise<MillioneaRegisterRecord | null> {
  const want = normalizeMillioneaWeekCode(code);
  if (!want) return null;
  const head = await weekStore.getByCode(want);
  if (!head || head.visibility !== "PUBLIC") return null;
  if (TERMINAL.includes(head.state)) {
    const week = await cachedMillioneaRegisterWeek(want);
    if (!week) return null;
    const qs = await questionStore.listForWeek(week.id);
    const gq = gradable(qs);
    const { voidedMains, usableReserves } = voidCountsOf(gq);
    return { kind: "final", week, attested: attestationsOf(qs, gq), voidedMains, usableReserves };
  }
  const live = await liveRegisterWeekOf(head, getSalesPause().paused);
  return live ? { kind: "live", week: live } : null;
}

/** ⭐ THE WEEKS STILL RUNNING, for the register's index (H2: "the index lists the current week with its chip"): every
 *  public week that has opened and is not final, newest first in the calendar (R3). At most the week on sale and the
 *  weeks being graded (MR-3). */
export async function millioneaRegisterCurrent(): Promise<MillioneaRegisterLiveWeek[]> {
  const weeks = newestFirst(await weekStore.list({ visibility: "PUBLIC", states: UNSETTLED }));
  const paused = getSalesPause().paused;
  const out: MillioneaRegisterLiveWeek[] = [];
  for (const w of weeks) {
    const live = await liveRegisterWeekOf(w, paused);
    if (live) out.push(live);
  }
  return out;
}

/**
 * ⭐ A FINAL WEEK'S MONEY, ON EITHER LINE — THE ONE CORE (the lead's ruling of 2026-10-21; the TICKETS lane's win ledger
 * reads it). Every figure the week's ledger prints (`registerLedgerRows`): the summary's — the tickets and the sales at the
 * close, the carry in, J, F, the top-up, the share, what was paid and what went on — the frozen price and floor, the fee's
 * rate and its two levies, J − F and the remainder, the carry's two weeks by the line's OWN calendar chain (`prevWeekOf`,
 * `nextWeekOf`), and how the winners were found (the sunset's top score, MR-30); from a SETTLED or VOIDED week of ANY
 * visibility. The public register reads it inside its own PUBLIC refusal and its cache (`millioneaRegisterWeek`); a DRIVE
 * week's (OD-21) is read by its own ticket's holder, on the ticket's page, which has checked the holder first.
 * ⛔ No visibility filter and no cache HERE, by design — the caller is the gate: never a public route.
 * ⛔ Money only: no question, no attestation, no standing, no graded table — the register's public facts stay its own.
 */
export type MillioneaWeekMoney = Pick<MillioneaRegisterWeek,
  | keyof MillioneaWeekSummary | "carryFromCode" | "carryToCode" | "ticketPrice" | "floor" | "feeRate" | "traLevy" | "gbtLevy"
  | "toWinners" | "remainder" | "basis" | "winningScore">;

/** The core itself, on a week already read: `graded` is the week's SETTLED tickets (null for a voided week). */
async function weekMoneyOf(week: StoredWeek, rules: MaswaliRulesSnapshot, graded: readonly StoredTicket[] | null): Promise<MillioneaWeekMoney> {
  const settled = week.state === "SETTLED";
  const terms = await termsOf(week);
  const winning = settled ? (graded ?? []).filter((t) => t.won === true) : [];
  const winningScore = winning.length ? Math.max(...winning.map((t) => t.score ?? 0)) : null;
  return {
    ...(await summaryOf(week)),
    carryFromCode: (week.rolloverIn ?? 0) > 0 ? (await prevWeekOf(week))?.code ?? null : null,
    carryToCode: (await nextWeekOf(week))?.code ?? null,
    ticketPrice: rules.ticketPriceTzs, floor: rules.floorTzs, feeRate: terms?.feeRate ?? null,
    traLevy: settled ? week.traLevy : null, gbtLevy: settled ? week.gbtLevy : null,
    toWinners: settled && week.jackpot != null && (week.winningTickets ?? 0) > 0 ? week.jackpot - (week.fee ?? 0) : null,
    remainder: settled && week.jackpot != null ? week.jackpot - (week.fee ?? 0) - (week.paidTotal ?? 0) : null,
    basis: winningScore === null ? null : winningScore < MAIN_COUNT ? "TOP_SCORE" : "TEN_OF_TEN",
    winningScore,
  };
}

/** ⭐ THE CORE, BY THE WEEK'S ID: a final week's money on either line, or null — a week not final yet (money only once
 *  final), one that does not exist, or one whose frozen rules cannot be read (fail closed, as the register does). */
export async function millioneaWeekMoneyRecord(weekId: string): Promise<MillioneaWeekMoney | null> {
  const week = await weekStore.get(weekId);
  if (!week || !TERMINAL.includes(week.state)) return null;
  const rules = frozenRules(week);
  if (!rules) return null;
  return weekMoneyOf(week, rules, week.state === "SETTLED" ? await ticketStore.listForWeek(week.id, { status: "SETTLED" }) : null);
}
