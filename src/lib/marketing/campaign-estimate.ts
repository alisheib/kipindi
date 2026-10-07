/**
 * U39 · THE CAMPAIGN ESTIMATE — the ONE arithmetic (`campaignEstimate`) and every string it shows (`estimateView`).
 * Pure and client-safe: no server import, so a composer card, U40's confirmation and U49's Start projection can all
 * reuse the same numbers instead of re-deriving them.
 *
 * ── WHAT IT PRICES (decision X15, DECISIONS-U29-U40) ─────────────────────────────────────────────────────────────
 * ⭐ THE SPEND CEILING, NOT THE FORECAST. Billable segments = the CAMPAIGN POPULATION (U38's campaign-audience count,
 * book ∪ players — the same count U40 fences, X9) × the largest SAVED variant's segments. The estimate an officer
 * approves must be at least what the campaign can spend: U38's "will receive" is a forecast taken before the send-time
 * checks run again, and pricing it would show a figure BELOW the exposure being approved (critic X15).
 * ⭐ The forecast is carried beside it (`forecast`) for two things only: the words on the Segments tile, and the
 * duration floor — a floor must count the requests that will actually be made, and a skipped person makes none.
 * ⛔ THE SEGMENTS ARE THE SAVED ONES (M16): a confirmation freezes `estimateSegments`/`estimateTzs` from the per-variant
 * counts U37's save stored (`savedVariantSizes`), never from the composer's live client counter.
 *
 * ── WHAT IT REFUSES TO SAY ───────────────────────────────────────────────────────────────────────────────────────
 * ⛔ MONEY EXISTS HERE ONLY WHEN `inputs.money` IS NON-NULL. The server loader leaves it null for a role that may not
 * read money figures (`campaignMoneyVisible`), and then this file cannot produce a TZS string at all — the view says
 * in words that cost and credit are shown to other roles, and prints none of the money fixture's digits.
 * ⛔ An unreadable credit has NO `tzs` field (`BalanceFigure`), so no "Was TZS 185" can be rendered from it — the
 * Admin → System tile still prints its kept figure; this card prints neither the figure nor "was".
 * ⛔ A failed audience count is `audience-error`, never a zero; an unknown price is "—", never TZS 0; and (U49a) a credit
 * kept for codes that could not be read gives no coverage figure, never a reserve of TZS 0.
 * ⚠️ Every segment total says "estimated" while `SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` is false.
 *
 * Guard: `npm run test:campaign-estimate` §4/§5. Red: `npm run red:campaign-estimate` (in memory).
 */
import { SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER, type SmsEncoding } from "@/lib/sms-compose";
import type { ChunkPace, SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import { EAT_OFFSET_MS, eatDayKey } from "@/lib/eat-day";

/* ══ THE INPUTS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The account's credit as this render could CONFIRM it. ⛔ The unreadable arm has no `tzs` field: a kept, stale or
 * unconfirmed figure is dropped at the server (`balanceFigureOf`), so it cannot reach a string.
 */
export type BalanceFigure =
  | { kind: "live"; tzs: number; at: number }
  | {
      kind: "unreadable";
      why: "pending" | "failed" | "stale" | "unavailable" | "never";
      error: "refused" | "unreachable" | "unexpected" | "not-configured" | null;
    };

/**
 * The audience, as the caller counted it. `population` is the campaign population (U38's campaign-audience count,
 * X9) — what the estimate PRICES. `forecast` is U38's "will receive" — what the duration floor counts; null when the
 * caller has no split. `{ ok: false }` is a count that failed; `null` is no audience chosen yet.
 */
export type EstimateAudience = { ok: true; population: number; forecast: number | null } | { ok: false } | null;

export type EstimateInputs = {
  audience: EstimateAudience;
  pace: ChunkPace | null;
  /**
   * ⛔ null for a role that may not read money figures — decided on the server, never here.
   * `reserveTzs` is the credit kept for login and withdrawal codes (U49a: the Marketing SMS settings, read fresh); ⛔ null
   * when it could not be read — then nothing is said about coverage, and no default stands in for the owner's figure.
   */
  money: null | { cost: SegmentCostMeasure; balance: BalanceFigure; reserveTzs: number | null };
};

export type VariantSize = { locale: "SW" | "EN"; segments: number; encoding: SmsEncoding };

/**
 * ⭐ THE ONE ASSUMPTION THE DURATION FLOOR RESTS ON, stated as a constant: one slice of a campaign in flight at a time.
 * OD19's page accelerator and the pump could otherwise run two at once and halve the real time, and a floor that can
 * be beaten is not a floor. ⛔ U43 must enforce this per campaign.
 */
export const MAX_SLICES_IN_FLIGHT = 1;

/** The per-variant columns U37's save writes on `SmsCampaign` (X12): SW required, EN optional. */
export type SavedVariantColumns = {
  codingSw: SmsEncoding | null;
  segmentsSw: number | null;
  codingEn: SmsEncoding | null;
  segmentsEn: number | null;
};

const isSegmentCount = (n: number | null | undefined): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1;

/**
 * ⭐ THE SAVED SIZES, as the estimate takes them (M16). Null when the Swahili variant has no stored size, or when the
 * English one is half-stored — ⛔ pricing SW alone while an EN body exists would quote less than the campaign sends.
 */
export function savedVariantSizes(c: SavedVariantColumns): VariantSize[] | null {
  if (!isSegmentCount(c.segmentsSw) || !c.codingSw) return null;
  const out: VariantSize[] = [{ locale: "SW", segments: c.segmentsSw, encoding: c.codingSw }];
  if (c.segmentsEn !== null || c.codingEn !== null) {
    if (!isSegmentCount(c.segmentsEn) || !c.codingEn) return null;
    out.push({ locale: "EN", segments: c.segmentsEn, encoding: c.codingEn });
  }
  return out;
}

/* ══ THE ARITHMETIC ══════════════════════════════════════════════════════════════════════════════════════════════ */

export type EstimateState = "no-message" | "no-audience" | "audience-error" | "ready";

export type EstimateMoney = {
  cost: SegmentCostMeasure;
  /** null when the price is unknown. */
  tzsPerSegment: number | null;
  /** ceil(billable × price) — never rounded down; null when the price is unknown. */
  costTzs: number | null;
  balance: BalanceFigure;
  /** The credit kept for login and withdrawal codes; null when it could not be read (U49a). */
  reserveTzs: number | null;
  /** The live credit above the reserve kept for login codes; null when the credit or the reserve is unreadable. */
  spendableTzs: number | null;
  /** How many people the spendable credit pays for; null when the price or the credit is unknown. */
  covers: number | null;
  /** How far the credit falls short of the cost (0 when it does not); null when either is unknown. */
  shortByTzs: number | null;
};

export type CampaignEstimate = {
  state: EstimateState;
  /** The largest variant's segments — an upper bound per person, exact while `SMS_MAX_SEGMENTS` is 1. */
  segmentsPerRecipient: number | null;
  population: number | null;
  forecast: number | null;
  /** population × segmentsPerRecipient — the billed quantity, never a forecast. */
  billableSegments: number | null;
  estimated: boolean;
  durationFloorMs: number | null;
  pace: ChunkPace | null;
  money: EstimateMoney | null;
};

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/**
 * ⭐ THE ONE ARITHMETIC — U40's confirmation and U49's Start projection reuse it rather than re-deriving a figure.
 *   billable   = population × max(variant segments)
 *   costTzs    = ceil(billable × price)                       (never rounded down)
 *   covers     = floor(max(0, credit − reserve) / (price × segments per person))
 *   shortByTzs = max(0, costTzs − (credit − reserve))
 *   floor      = ceil(forecast / batchMax) × fastest chunk / MAX_SLICES_IN_FLIGHT
 * Each money field is null when its input is unknown.
 */
export function campaignEstimate(i: EstimateInputs, variants: readonly VariantSize[]): CampaignEstimate {
  const estimated = !SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER;
  const sw = variants.find((v) => v.locale === "SW");
  const sized = variants.length > 0 && variants.every((v) => isSegmentCount(v.segments));
  const segmentsPerRecipient = sw && sized ? Math.max(...variants.map((v) => v.segments)) : null;
  const empty = (state: EstimateState): CampaignEstimate => ({
    state, segmentsPerRecipient, population: null, forecast: null, billableSegments: null,
    estimated, durationFloorMs: null, pace: i.pace, money: null,
  });
  if (segmentsPerRecipient === null) return empty("no-message");
  const a = i.audience;
  if (a === null) return empty("no-audience");
  // ⛔ A count that failed, or a "count" that is not one, is an error — never a zero that prices nobody.
  if (a.ok === false || !isCount(a.population)) return empty("audience-error");
  const population = a.population;
  const forecast = isCount(a.forecast) ? a.forecast : null;
  const billableSegments = population * segmentsPerRecipient;

  const p = i.pace;
  const durationFloorMs =
    forecast !== null && p !== null && p.batchMax >= 1 && p.minChunkMs > 0
      ? (Math.ceil(forecast / p.batchMax) * p.minChunkMs) / MAX_SLICES_IN_FLIGHT
      : null;

  let money: EstimateMoney | null = null;
  if (i.money) {
    const m = i.money;
    // ⛔ U49a · a reserve that could not be read (null) stays unknown — never 0, which would offer the codes' credit to
    // the campaign.
    const reserveTzs = m.reserveTzs === null ? null : Number.isFinite(m.reserveTzs) && m.reserveTzs > 0 ? m.reserveTzs : 0;
    const tzsPerSegment = m.cost.kind === "unknown" ? null : m.cost.tzsPerSegment;
    const costTzs = tzsPerSegment === null ? null : Math.ceil(billableSegments * tzsPerSegment);
    const above = m.balance.kind === "live" && reserveTzs !== null ? m.balance.tzs - reserveTzs : null;
    const spendableTzs = above === null ? null : Math.max(0, above);
    const covers =
      tzsPerSegment === null || spendableTzs === null ? null : Math.floor(spendableTzs / (tzsPerSegment * segmentsPerRecipient));
    const shortByTzs = costTzs === null || above === null ? null : Math.max(0, costTzs - above);
    money = { cost: m.cost, tzsPerSegment, costTzs, balance: m.balance, reserveTzs, spendableTzs, covers, shortByTzs };
  }

  return {
    state: "ready", segmentsPerRecipient, population, forecast, billableSegments,
    estimated, durationFloorMs, pace: p, money,
  };
}

/* ══ THE WORDS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

export type EstimateTileKey = "segments" | "duration" | "cost" | "credit" | "covers";
export type EstimateTile = {
  key: EstimateTileKey;
  label: string;
  value: string;
  note?: string;
  provenance?: string;
  tone?: "warning";
};
export type EstimateView = { title: "Estimate"; tiles: EstimateTile[]; sentence?: string; error?: string };

/** The sentence a role that may not read money figures reads instead of the money tiles. ⛔ No "TZS" in it. */
export const ESTIMATE_NO_MONEY_SENTENCE = "Cost and credit are shown to roles that may read money figures.";
export const ESTIMATE_NO_AUDIENCE_SENTENCE = "Choose who receives it to see the totals.";
export const ESTIMATE_NO_MESSAGE_SENTENCE = "Write the Swahili message to see the totals.";
export const ESTIMATE_AUDIENCE_ERROR = "Couldn't load the estimate — the audience count failed. Refresh to retry.";

const NB = String.fromCharCode(0xa0);
/** Breaks may fall BEFORE the dot, never after it (the Admin → System tile's rule). */
const SEP = ` ·${NB}`;
/** One fact that must not break inside: an amount, a count, a clock. */
const keep = (s: string) => s.split(" ").join(NB);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const count = (n: number, one: string, many: string) => keep(`${formatNumber(n)} ${plural(n, one, many)}`);
const amount = (tzs: number) => keep(formatTzs(tzs));
/**
 * From here the full figure ("TZS 1,000,000", 13 characters) would clip in a 2-up tile at 360, and §A5 forbids clipping
 * money: the value takes the platform's one compaction grammar and the provenance keeps the exact figure — the same
 * rule, and the same line, as the Admin → System credit tile (`sms-credit-tile.ts`).
 */
const MONEY_COMPACT_FROM = 1_000_000;
const headline = (tzs: number) => (tzs >= MONEY_COMPACT_FROM ? keep(formatTzsCompact(tzs)) : amount(tzs));
/** A per-segment price may be fractional (a median of halves); it shows up to two decimals, never rounded to a whole. */
const unitAmount = (tzs: number) =>
  Number.isInteger(tzs) ? amount(tzs) : keep(`TZS ${tzs.toFixed(2).replace(/0+$/, "").replace(/[.]$/, "")}`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const pad = (n: number) => String(n).padStart(2, "0");
/**
 * "14:02 EAT", or "29 Sep 14:02 EAT" for a reading from another EAT day. ⭐ The fixed offset from `eat-day.ts` (EAT
 * has had no daylight saving since 1931) and a fixed month list — no Intl, no locale, the same on every box.
 */
function eatClock(at: number, now: number): string {
  const d = new Date(at + EAT_OFFSET_MS);
  const day = eatDayKey(at) === eatDayKey(now) ? "" : `${keep(`${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`)} `;
  return `${day}${keep(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} EAT`)}`;
}

/**
 * ⭐ A FLOOR ROUNDS DOWN. 249 requests at 1.4 s is 5 min 48 s, which is "At least 5 min" — "At least 6 min" would be a
 * floor the campaign can beat. Sub-ten-second floors keep a tenth so a single small send never reads "At least 0 s".
 * ⭐ IT WRAPS BETWEEN ITS FACTS, NEVER INSIDE ONE: "At least", "1 h" and "33 min" are each kept whole and joined by
 * ordinary spaces. One no-break run of 19 characters cannot wrap, so it would clip in a 2-up tile at 360
 * (`test:campaign-estimate` §5.5 pins the break points).
 */
function floorPhrase(ms: number): string {
  const lead = keep("At least");
  if (ms < 10_000) return `${lead} ${keep(`${Math.floor(ms / 100) / 10} s`)}`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${lead} ${keep(`${s} s`)}`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${lead} ${keep(`${min} min`)}`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return `${lead} ${keep(`${h} h`)}${rest > 0 ? ` ${keep(`${rest} min`)}` : ""}`;
}

/** The fastest chunk, in seconds to a tenth, rounded DOWN like the floor it explains. */
const paceSeconds = (ms: number) => `${Math.floor(ms / 100) / 10}${NB}s`;

const COST_UNKNOWN: Record<"no-sends" | "too-few-sends" | "history-unreadable", string> = {
  "no-sends": "not yet measured — no recent delivered single-segment sends",
  "too-few-sends": "not yet measured — no recent delivered single-segment sends",
  "history-unreadable": "not yet measured — the send history couldn't be read",
};

function costTile(m: EstimateMoney): EstimateTile {
  const c = m.cost;
  const note =
    c.kind === "measured"
      ? `${unitAmount(c.tzsPerSegment)} a segment, estimated from the last ${count(c.sends, "send", "sends")}`
      : c.kind === "configured"
        ? `${unitAmount(c.tzsPerSegment)} a segment — configured, not yet measured`
        : COST_UNKNOWN[c.reason];
  if (m.costTzs === null) return { key: "cost", label: "Cost", value: "—", note };
  return {
    key: "cost", label: "Cost", value: headline(m.costTzs), note,
    ...(m.costTzs >= MONEY_COMPACT_FROM ? { provenance: amount(m.costTzs) } : {}),
  };
}

/** Why the credit could not be read, in words. ⛔ Never the kept figure, never "was". */
function unreadableNote(b: Extract<BalanceFigure, { kind: "unreadable" }>): string {
  if (b.why === "pending") return `Still checking${NB}— reload in a few seconds`;
  if (b.why === "unavailable") return "No balance read on this provider";
  if (b.why === "stale") return `Unreadable${NB}— the last reading is out of date`;
  if (b.why === "never") return "No balance read yet";
  if (b.error === "refused") return "Blackball refused our keys";
  if (b.error === "not-configured") return "Blackball keys not set";
  if (b.error === "unexpected") return "Blackball sent a reply we couldn't read";
  return `Unreadable${NB}— no answer from Blackball`;
}

function creditTile(m: EstimateMoney, now: number): EstimateTile {
  const b = m.balance;
  if (b.kind === "unreadable") return { key: "credit", label: "SMS credit", value: "—", tone: "warning", note: unreadableNote(b) };
  const read = `Read ${eatClock(b.at, now)}`;
  return {
    key: "credit", label: "SMS credit", value: headline(b.tzs),
    provenance: b.tzs >= MONEY_COMPACT_FROM ? `${amount(b.tzs)}${SEP}${read}` : read,
  };
}

function coversTile(e: CampaignEstimate, m: EstimateMoney): EstimateTile {
  // ⛔ U49a · no reserve, no coverage: what the credit pays for is only what lies above the credit kept for codes.
  if (m.reserveTzs === null) {
    return { key: "covers", label: "Covers", value: "—", note: "needs the credit kept for login codes, which couldn't be read" };
  }
  if (m.covers === null || m.spendableTzs === null || m.costTzs === null || e.population === null) {
    return { key: "covers", label: "Covers", value: "—", note: "needs a cost and a credit reading" };
  }
  if (m.covers >= e.population) {
    const left = Math.max(0, m.spendableTzs - m.costTzs);
    return { key: "covers", label: "Covers", value: "Everyone", note: `${amount(left)} left, above the ${amount(m.reserveTzs)} kept for login codes` };
  }
  return {
    key: "covers", label: "Covers", value: count(m.covers, "recipient", "recipients"), tone: "warning",
    note: `short by about ${amount(m.shortByTzs ?? 0)} — top up before Start`,
  };
}

/**
 * ⭐ EVERY STRING THE ESTIMATE SHOWS, AS DATA — the `smsCreditTile` pattern, so the suite drives every state without
 * rendering a page. Segments and Duration always (once there is an audience); Cost, SMS credit and Covers ONLY when
 * `e.money` is present. ⛔ A card may not format money itself: it renders these strings.
 */
export function estimateView(e: CampaignEstimate, now: number = Date.now()): EstimateView {
  const title = "Estimate" as const;
  if (e.state === "no-message") return { title, tiles: [], sentence: ESTIMATE_NO_MESSAGE_SENTENCE };
  if (e.state === "audience-error") return { title, tiles: [], error: ESTIMATE_AUDIENCE_ERROR };
  const spr = e.segmentsPerRecipient ?? 1;
  const perMessage = count(spr, "segment", "segments") + " a message";
  if (e.state === "no-audience") {
    return {
      title,
      tiles: [{ key: "segments", label: "Segments", value: perMessage, ...(e.estimated ? { note: "estimated" } : {}) }],
      sentence: ESTIMATE_NO_AUDIENCE_SENTENCE,
    };
  }

  const population = e.population ?? 0;
  const billable = e.billableSegments ?? 0;
  const segNote = [
    `${perMessage} × ${keep(`${formatNumber(population)} in the audience`)}`,
    e.forecast !== null && e.forecast < population
      ? `priced for everyone in it, ${keep(`${formatNumber(e.forecast)} pass`)} the checks now`
      : null,
    e.estimated ? "estimated" : null,
  ].filter((x): x is string => x !== null).join(SEP);
  const tiles: EstimateTile[] = [
    { key: "segments", label: "Segments", value: count(billable, "segment", "segments"), note: segNote },
  ];

  if (e.forecast === 0) {
    tiles.push({ key: "duration", label: "Duration", value: "—", note: "nobody in the audience passes the checks now" });
  } else if (e.durationFloorMs !== null && e.pace !== null && e.forecast !== null) {
    const requests = Math.ceil(e.forecast / e.pace.batchMax);
    tiles.push({
      key: "duration", label: "Duration", value: floorPhrase(e.durationFloorMs),
      note: `${count(requests, "request", "requests")} of up to ${e.pace.batchMax} at the fastest measured ${paceSeconds(e.pace.minChunkMs)}${SEP}a floor, not a promise`,
    });
  } else {
    tiles.push({
      key: "duration", label: "Duration", value: "—",
      note: e.pace === null ? "not yet measured — no recent sends to time" : "needs the count that passes the checks",
    });
  }

  if (!e.money) return { title, tiles, sentence: ESTIMATE_NO_MONEY_SENTENCE };
  tiles.push(costTile(e.money), creditTile(e.money, now), coversTile(e, e.money));
  return { title, tiles };
}
