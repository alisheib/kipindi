/**
 * THE CYCLE READ MODEL — what the operator page actually shows.
 *
 * The meter (`ai-usage.ts`) writes cycles. This file only READS, and it exists because the
 * failure mode here is not a crash: it is a **confident wrong number Ali prices from**.
 * Every function below either returns an honest figure or returns `null`, and the page
 * renders `—` for `null`. Nothing here ever guesses.
 *
 * ── THE FIVE WAYS THIS PAGE COULD LIE, AND WHAT STOPS EACH ─────────────────────────────
 *
 *  1. PROJECTING FROM TOO LITTLE HISTORY. `projectCyclesPerYear` refuses under
 *     `minDaysForProjection` and says how many days it actually has. A year figure from
 *     three hours of data is worse than no figure, because it looks like an answer.
 *  2. AN OPEN CYCLE DRAGGING THE AVERAGE. Rates use CLOSED cycles only, measured across the
 *     span from the first cycle's open to the last CLOSE — so the open partial contributes
 *     neither its spend nor its elapsed time. Including one and not the other is the bias.
 *  3. DIVIDING BY ZERO. Every ratio returns `null` when the divisor is 0. A window with no
 *     settled markets is normal and must read `—`, never `Infinity` or `NaN`.
 *  4. A CONVERTED CURRENCY NOBODY CAN CHECK. `tzs()` returns `null` unless a rate AND its
 *     date have been entered. There is no default rate, because a rate nobody entered is a
 *     fabricated number wearing a currency symbol.
 *  5. AN INVISIBLE MODEL SWITCH. Haiku → Opus is roughly a 5× cost change. `modelMix` is
 *     returned alongside every cost so a jump in cost-per-resolution can be attributed to
 *     the model rather than mistaken for the product getting more expensive.
 *
 * ⛔ AND THE POPULATION IS NAMED EVERY TIME. `costPerResolution` states which buckets it
 * includes and how much spend is UNATTRIBUTED, because silently dropping the unattributed
 * spend is precisely what makes a product look cheaper than it is.
 */
import { prisma, hasDatabase } from "./prisma";
import { aiCycleDal, type AiSpendCycleRecord } from "./ai-cycle-dal";
import { aiUsageDal } from "./ai-usage-dal";
import { getPlatformTimezone } from "./platform-config";
import { tzOffsetMsAt } from "../zoned-time"; // relative — see the note in ai-usage.ts
import {
  getCycleConfig, getCreditConfig, clampCycleSize, CYCLE_EPS, PRICE_REV, RETAIN_DAYS,
  type CycleConfig, type AiFeature,
} from "./ai-usage";

const DAY_MS = 86_400_000;
const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── platform-local time ───────────────────────────────────────────────────────────────
// ⛔ "Today" and "this year" are PLATFORM-LOCAL (Africa/Dar_es_Salaam), never raw UTC.
// At UTC+3 a UTC year boundary is three hours out, so a cycle closed at 01:00 EAT on
// 1 January would be counted in the previous year — on the one figure Ali reads by year.

/** The wall-clock parts of an instant in the platform's timezone. */
function zonedParts(atMs: number, tz: string): { year: number; month: number; day: number } {
  const shifted = new Date(atMs + tzOffsetMsAt(tz, atMs));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** UTC instant of local midnight starting the given local calendar day. */
function zonedDayStartMs(atMs: number, tz: string): number {
  const p = zonedParts(atMs, tz);
  const guess = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0, 0);
  // Two passes: the offset at the guessed instant may differ from the offset at `atMs`
  // across a DST edge. Tanzania has no DST, but this must not be wrong if the platform
  // timezone is ever changed to one that does.
  return guess - tzOffsetMsAt(tz, guess);
}

// ── types ─────────────────────────────────────────────────────────────────────────────

export type CycleRow = AiSpendCycleRecord & {
  /** How long the cycle lasted, in ms. Null while it is still open. Ali asked for this by
   *  name: "we see each cycle how much it lasted". */
  lastedMs: number | null;
  /** Fraction of the stamped size actually spent. >1 means the last call overshot the
   *  boundary — real, bounded by one call, and shown rather than hidden. */
  usedPct: number;
};

export type YearRow = {
  year: number;
  /** Cycles CLOSED in this platform-local year — an exact count, not a derived one. */
  closed: number;
  /** USD across those closed cycles, each at the size IT was opened with. */
  costUsd: number;
  /** Mean days a cycle lasted in this year, or null when none closed. */
  avgLastedDays: number | null;
  /** Is this year still running? A part-year total must never be read as a full year. */
  partial: boolean;
};

export type ProjectionResult =
  | { ok: false; reason: "no-closed-cycles" | "too-little-history"; observedDays: number; closedCycles: number; minDays: number }
  | { ok: true; cyclesPerYear: number; usdPerYear: number; observedDays: number; closedCycles: number; cyclesPerDay: number };

export type LineCost = {
  line: "polls" | "updown" | "chat" | "other";
  features: AiFeature[];
  spendUsd: number;
  calls: number;
  /** Settled markets on this line in the window — the divisor. */
  resolutions: number;
  /** null when there were no resolutions. Never Infinity. */
  usdPerResolution: number | null;
  cyclesPerResolution: number | null;
  /** Spend on this line whose `subjectId` is null — visible, never silently folded in. */
  unattributedUsd: number;
};

export type CycleReadModel = {
  config: CycleConfig;
  priceRev: string;
  /** ⛔ `blocked` means a cycle has ended and nobody has started the next: AI is paused. */
  gate: { blocked: boolean; lastClosedIndex: number };
  open: CycleRow | null;
  closedCount: number;
  /** Cycles funded by the current top-up limit, and how much of it is gone. */
  funded: { limitUsd: number; cycles: number | null; consumedCycles: number | null; spentUsd: number };
  years: YearRow[];
  projection: ProjectionResult;
  lines: LineCost[];
  modelMix: { model: string; calls: number; usd: number; pct: number }[];
  /**
   * Σ cycle.costUsd vs Σ event.costUsd over a span BOTH ledgers genuinely cover — the
   * reconciliation the page shows and `test:ai-cycles` §1 asserts.
   *
   * ⛔ `sinceIso` is null (and `comparable` false) when no cycle has opened inside the
   * retained window yet. The page then says the reconciliation is not comparable, rather
   * than showing a drift that is really just retention pruning the event ledger.
   */
  conservation: { cyclesUsd: number; eventsUsd: number; driftUsd: number; sinceIso: string | null; comparable: boolean };
  fx: { rate: number; asOfIso: string; ageDays: number | null; usable: boolean; stale: boolean };
};

// ── helpers the page and the guard share ──────────────────────────────────────────────

/** USD → TZS. ⛔ Returns null unless a rate AND a date are set. Never invents one. */
export function tzs(usd: number, cfg: CycleConfig): number | null {
  if (!(cfg.fxTzsPerUsd > 0) || !cfg.fxAsOfIso) return null;
  return round2(usd * cfg.fxTzsPerUsd);
}

/** cost × (1 + margin). Kept pure so the guard can assert the arithmetic without a DB. */
export function suggestedPriceUsd(costUsd: number, targetMarginPct: number): number {
  return round6(costUsd * (1 + targetMarginPct / 100));
}

/** ⛔ Ratios return null on a zero divisor. `—` on screen, never Infinity or NaN. */
export function safeRatio(numerator: number, divisor: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(divisor) || Math.abs(divisor) < CYCLE_EPS) return null;
  return numerator / divisor;
}

export function decorate(c: AiSpendCycleRecord): CycleRow {
  const lastedMs = c.closedAt ? Math.max(0, Date.parse(c.closedAt) - Date.parse(c.openedAt)) : null;
  return { ...c, lastedMs, usedPct: c.sizeUsd > 0 ? (c.costUsd / c.sizeUsd) * 100 : 0 };
}

/**
 * CYCLES CLOSED PER PLATFORM-LOCAL YEAR.
 *
 * ⛔ COUNTED FROM THE LEDGER, NOT DERIVED FROM SPEND ÷ SIZE. Each closed cycle carries the
 * size it was OPENED with, so a year that ran at $50 and a year that ran at $100 both report
 * the number of cycles that genuinely closed. Dividing that year's dollars by today's size
 * would silently restate history the moment Ali retunes the denomination (§10a).
 */
export function yearsFrom(cycles: AiSpendCycleRecord[], tz: string, nowMs: number): YearRow[] {
  const byYear = new Map<number, { closed: number; costUsd: number; lasted: number[] }>();
  for (const c of cycles) {
    if (c.status !== "CLOSED" || !c.closedAt) continue;
    const y = zonedParts(Date.parse(c.closedAt), tz).year;
    const row = byYear.get(y) ?? { closed: 0, costUsd: 0, lasted: [] };
    row.closed += 1;
    row.costUsd = round6(row.costUsd + c.costUsd);
    row.lasted.push(Math.max(0, Date.parse(c.closedAt) - Date.parse(c.openedAt)));
    byYear.set(y, row);
  }
  const thisYear = zonedParts(nowMs, tz).year;
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, r]) => ({
      year,
      closed: r.closed,
      costUsd: round6(r.costUsd),
      avgLastedDays: r.lasted.length ? round2(r.lasted.reduce((s, x) => s + x, 0) / r.lasted.length / DAY_MS) : null,
      partial: year >= thisYear,
    }));
}

/**
 * THE RUN-RATE, AND WHEN IT REFUSES TO GIVE ONE.
 *
 * ⛔ CLOSED CYCLES ONLY, over the span from the FIRST cycle opening to the LAST CLOSE. The
 * open cycle contributes neither its partial spend nor its elapsed time; counting one
 * without the other is exactly the bias §9.2 warns about, in either direction.
 */
export function projectCyclesPerYear(cycles: AiSpendCycleRecord[], minDays: number): ProjectionResult {
  const closed = cycles.filter((c) => c.status === "CLOSED" && c.closedAt).sort((a, b) => a.index - b.index);
  if (closed.length === 0) {
    const observedDays = cycles.length
      ? Math.max(0, (Date.now() - Math.min(...cycles.map((c) => Date.parse(c.openedAt)))) / DAY_MS)
      : 0;
    return { ok: false, reason: "no-closed-cycles", observedDays: round2(observedDays), closedCycles: 0, minDays };
  }
  const firstOpen = Math.min(...closed.map((c) => Date.parse(c.openedAt)));
  const lastClose = Math.max(...closed.map((c) => Date.parse(c.closedAt as string)));
  const observedDays = Math.max(0, (lastClose - firstOpen) / DAY_MS);
  if (observedDays < minDays) {
    return { ok: false, reason: "too-little-history", observedDays: round2(observedDays), closedCycles: closed.length, minDays };
  }
  // 🔴 THE RATE IS DRIVEN BY SPEND, NOT BY THE NUMBER OF ROWS — and that is not a detail.
  //
  // An officer can close a cycle early ("close the books at month end"), and a cycle closed
  // with little or nothing in it is still a CLOSED ROW. Counting rows would let bookkeeping
  // inflate "cycles per year": three empty closes in an afternoon would triple the figure
  // Ali prices from, while not a cent more had been spent. Seen for real — the live drive's
  // own close/start actions left five $0.00 cycles in the ledger.
  //
  // Σ(cost ÷ the size THAT cycle was opened with) is "how many cycles' worth of spend", which
  // is what the question actually means. When cycles close naturally at their full size the
  // two are identical, so nothing is lost — only the distortion.
  const cyclesConsumed = closed.reduce((s, c) => s + (c.sizeUsd > 0 ? c.costUsd / c.sizeUsd : 0), 0);
  const cyclesPerDay = cyclesConsumed / observedDays;
  const usdPerDay = closed.reduce((s, c) => s + c.costUsd, 0) / observedDays;
  return {
    ok: true,
    cyclesPerDay: round6(cyclesPerDay),
    cyclesPerYear: round2(cyclesPerDay * 365),
    usdPerYear: round2(usdPerDay * 365),
    observedDays: round2(observedDays),
    closedCycles: closed.length,
  };
}

// ── the divisors: what we actually resolved ───────────────────────────────────────────

/**
 * SETTLED MARKETS PER PRODUCT LINE — the divisor for cost-per-resolution.
 *
 * ⛔ `settledAt`, NOT `status = RESOLVED`. A RESOLVED market with `settledAt = null` is
 * still inside its objection window with an intact pool: the verdict exists, the product
 * has not been delivered, and counting it would inflate the divisor and understate the cost.
 *
 * ⛔ Up & Down rounds ARE markets (`UpDownRound.marketId` is `@unique`), so the poll count
 * has to EXCLUDE them or 18,165 Up & Down rounds would be counted as poll resolutions and
 * the cost per poll would come out roughly 270× too cheap.
 */
export async function settledCounts(sinceIso: string | null): Promise<{ polls: number; updown: number }> {
  const client = prisma();
  if (!hasDatabase() || !client) return { polls: 0, updown: 0 };
  const where = sinceIso ? { settledAt: { not: null, gte: new Date(sinceIso) } } : { settledAt: { not: null } };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [polls, updown] = await Promise.all([
    (client as any).predictionMarket.count({ where: { ...where, upDownRound: { is: null } } }),
    (client as any).predictionMarket.count({ where: { ...where, upDownRound: { isNot: null } } }),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { polls: Number(polls), updown: Number(updown) };
}

/**
 * ⛔ EVERY `AiFeature` MUST APPEAR HERE EXACTLY ONCE, and `test:ai-cycles` §14 proves it.
 *
 * 🔴 `other` was missing. Spend recorded under it counted toward the page total and toward
 * conservation, and appeared in NO product line — so the line table silently failed to sum
 * to the total, and nothing said so. That is the same silent-gap shape as an unattributed
 * bucket, one level up: a population the consumer reads that the producer never covered.
 */
export const LINE_FEATURES: Record<LineCost["line"], AiFeature[]> = {
  // ⛔ `sentinel` is the POLLS line. It is the per-market resolution check for long-form
  // polls, and its 3,004 calls are the largest single input to what a poll costs. Filing it
  // anywhere else — or leaving it out — is the under-count this whole build exists to stop.
  polls: ["polls", "sentinel"],
  updown: ["updown"],
  chat: ["chat"],
  other: ["other"],
};

// ── the whole page, in one read ───────────────────────────────────────────────────────

export async function getCycleReadModel(): Promise<CycleReadModel> {
  const tz = getPlatformTimezone();
  const now = Date.now();
  const [cfg, credit, cycles] = await Promise.all([
    getCycleConfig(),
    getCreditConfig(),
    aiCycleDal.all(100_000),
  ]);
  const size = clampCycleSize(cfg.sizeUsd);

  const open = cycles.find((c) => c.status === "OPEN") ?? null;
  const closed = cycles.filter((c) => c.status === "CLOSED");
  const maxIndex = cycles.reduce((m, c) => Math.max(m, c.index), 0);

  // The ledger begins at the first cycle's open. Conservation and the line costs are scoped
  // to that instant — before it, spend was metered in dollars only, and comparing the two
  // over a window one of them does not cover would manufacture a drift that is not real.
  const sinceIso = cycles.length ? cycles.reduce((a, c) => (a < c.openedAt ? a : c.openedAt), cycles[0].openedAt) : null;

  const events = await aiUsageDal.recent(sinceIso ?? new Date(now - 400 * DAY_MS).toISOString(), 500_000);

  // ⚠️ NO today/7d/30d SUMS HERE. They were computed and rendered NOWHERE — the KPI band at
  // the top of the page already shows those windows from . A second
  // computation of the same figures is a second chance for them to disagree.

  // ── product lines ───────────────────────────────────────────────────────────────────
  const counts = await settledCounts(sinceIso);
  const resolutionsByLine: Record<LineCost["line"], number> = {
    polls: counts.polls,
    updown: counts.updown,
    // ⛔ Chat resolves nothing. Its divisor is 0 and its cost-per-resolution is `—` by
    // construction, not by accident — the chatbot is not billed per market and pretending
    // otherwise would fold $0.02 of chat into the price of a poll.
    chat: 0,
    // Same for anything filed as `other`: it exists so the lines SUM to the total, and it
    // has no divisor of its own.
    other: 0,
  };

  const lines: LineCost[] = (Object.keys(LINE_FEATURES) as LineCost["line"][]).map((line) => {
    const feats = LINE_FEATURES[line];
    const rows = events.filter((e) => feats.includes(e.feature as AiFeature));
    const spendUsd = round6(rows.reduce((s, e) => s + e.costUsd, 0));
    const unattributedUsd = round6(rows.filter((e) => !e.subjectId).reduce((s, e) => s + e.costUsd, 0));
    const resolutions = resolutionsByLine[line];
    const usdPerResolution = safeRatio(spendUsd, resolutions);
    return {
      line, features: feats, spendUsd, calls: rows.length, resolutions,
      usdPerResolution: usdPerResolution === null ? null : round6(usdPerResolution),
      cyclesPerResolution: usdPerResolution === null ? null : round6(usdPerResolution / size),
      unattributedUsd,
    };
  });

  // ── model mix ───────────────────────────────────────────────────────────────────────
  const mix = new Map<string, { calls: number; usd: number }>();
  for (const e of events) {
    const m = mix.get(e.model) ?? { calls: 0, usd: 0 };
    m.calls += 1; m.usd = round6(m.usd + e.costUsd);
    mix.set(e.model, m);
  }
  const mixTotal = [...mix.values()].reduce((s, m) => s + m.usd, 0);
  const modelMix = [...mix.entries()]
    .map(([model, m]) => ({ model, calls: m.calls, usd: m.usd, pct: mixTotal > 0 ? (m.usd / mixTotal) * 100 : 0 }))
    .sort((a, b) => b.usd - a.usd);

  // ── conservation ────────────────────────────────────────────────────────────────────
  //
  // 🔴 THE TWO LEDGERS DO NOT COVER THE SAME SPAN, AND COMPARING THEM NAIVELY IS A
  // GUARANTEED FALSE ALARM ON A DATE YOU CAN NAME.
  //
  // `AiSpendCycle` is NEVER pruned; `AiUsageEvent` is pruned at `RETAIN_DAYS` (180). So from
  // 180 days after the first cycle opened — 2026-12-23, for the ledger backfilled on
  // 2026-08-23 — the events behind cycle 1 start vanishing while cycle 1 keeps its $100.
  // Summing "all cycles" against "all surviving events" would then show a drift that grows
  // to hundreds of dollars, and the page would tell an operator to investigate retention
  // doing exactly its job. A reconciliation that cries wolf on a schedule gets ignored, and
  // then the real drift it exists to catch goes unseen too.
  //
  // So the comparison is scoped to a span BOTH sides genuinely cover: it starts at the first
  // cycle that OPENED at or after the retention cutoff, and counts only cycles from there.
  // A cycle straddling the cutoff is excluded from both sides rather than half-counted.
  const retentionCutoffIso = new Date(now - RETAIN_DAYS * DAY_MS).toISOString();
  const anchor = cycles.slice().sort((a, b) => a.index - b.index).find((c) => c.openedAt >= retentionCutoffIso);
  const conservationSince = anchor ? anchor.openedAt : null;
  const cyclesUsd = conservationSince === null
    ? 0
    : round6(cycles.filter((c) => c.openedAt >= conservationSince).reduce((s, c) => s + c.costUsd, 0));
  const eventsUsd = conservationSince === null
    ? 0
    : round6(events.filter((e) => e.createdAt >= conservationSince).reduce((s, e) => s + e.costUsd, 0));

  // ── FX honesty ──────────────────────────────────────────────────────────────────────
  const fxAgeDays = cfg.fxAsOfIso ? Math.max(0, (now - Date.parse(cfg.fxAsOfIso)) / DAY_MS) : null;
  const fxUsable = cfg.fxTzsPerUsd > 0 && !!cfg.fxAsOfIso && Number.isFinite(Date.parse(cfg.fxAsOfIso));

  const spentThisWindow = round6(await aiUsageDal.sumCostSince(credit.topUpWindowStartIso));

  return {
    config: cfg,
    priceRev: PRICE_REV,
    gate: {
      blocked: !open && maxIndex > 0,
      lastClosedIndex: maxIndex,
    },
    open: open ? decorate(open) : null,
    closedCount: closed.length,
    funded: {
      limitUsd: credit.limitUsd,
      cycles: credit.limitUsd > 0 ? round2(credit.limitUsd / size) : null,
      consumedCycles: credit.limitUsd > 0 ? round2(spentThisWindow / size) : null,
      spentUsd: spentThisWindow,
    },
    years: yearsFrom(cycles, tz, now),
    projection: projectCyclesPerYear(cycles, cfg.minDaysForProjection),
    lines,
    modelMix,
    conservation: {
      cyclesUsd, eventsUsd, driftUsd: round6(cyclesUsd - eventsUsd),
      sinceIso: conservationSince, comparable: conservationSince !== null,
    },
    fx: {
      rate: cfg.fxTzsPerUsd,
      asOfIso: cfg.fxAsOfIso,
      ageDays: fxAgeDays === null ? null : round2(fxAgeDays),
      usable: fxUsable,
      stale: fxUsable && fxAgeDays !== null && fxAgeDays > 30,
    },
  };
}

/** Paginated ledger for the admin table. */
export async function listCycles(page: number, pageSize: number): Promise<{ rows: CycleRow[]; total: number }> {
  const { rows, total } = await aiCycleDal.list(Math.max(1, page), Math.min(200, Math.max(1, pageSize)));
  return { rows: rows.map(decorate), total };
}

