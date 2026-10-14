/**
 * THE MEASURES VIEW — one model for the panel and the three files (the Vodacom plan S13 WP6,
 * `docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md`). A screen and a file made at one instant read the
 * same object, so they cannot disagree.
 *
 * ⭐ IT COMPOSES, IT DOES NOT COMPUTE. Every figure is `cellFor` (the pure core, `src/lib/journey/measures.ts`) over the
 *    narrow reads (`journey-measures-dal.ts`); every window is `measureWindows`; every rule is the core's.
 * ⛔ NO `?? 0` ON A FIGURE. A read that throws makes exactly the cells that need it "could not be read"; the launch record
 *    unreadable makes every cell so (without it, before and after cannot be told apart). A record this build does not keep
 *    (S9's) is "not yet available". A counting gap — a day the counters recorded nothing while the site had
 *    visits — is dropped from both halves and named.
 * ⭐ THE LAUNCH WATCH (S15's rollback figures, S13 Point 9): question bets per day against 70% of the before mean for three
 *    full days, and the deposit confirm rate over the trailing three days against 80% of the before rate. DISPLAY ONLY —
 *    no alert, no switch. The HARM rows ride with it only when the caller says the viewer holds compliance VIEW; this
 *    module holds no session and decides nothing about who may see what.
 * Memoised for 60 seconds per (campaign, period, harm), as `getInsights` is.
 */
import { eatDayKey, eatDayStartMs } from "@/lib/eat-day";
import {
  MEASURES, REFERENCE_ROW, S13_RULINGS, DEPOSIT_FOLLOW_UP_MS, FIRST_BET_HORIZON_MS,
  agencySchedule, addDays, cellFor, changeOf, dayRange, definitionNotes, eatDayEndMs, inBoundsVerdict, launchDayOf, matchReturnedBets,
  measureWindows, median, monthWindow, weekWindow, dayStanding, followedWithin,
  type AgencySchedule, type Cell, type DayWindow, type LaunchFacts, type MeasureDef, type MeasureKey, type MeasureWindows,
  type HarmDays, type InBoundsKey, type InBoundsVerdict, type RolloutState, type Variant,
} from "@/lib/journey/measures";
import { FUNNEL_STEPS, funnelTag } from "@/lib/journey/funnel";
import { harmWatchSeries, type HarmDay } from "./harm-watch";
import { journeyLaunchRecord } from "./journey-launch";
import {
  S9_ON, betsOf, campaignVisits, confirmedDeposits, counterRows, depositOutcomesByDay, homeViewsByDay, joinedPlayers,
  returnedBetsOf, shortfallDeposits, type BetRead, type DepositRead, type JoinRead, type OutcomeDay,
} from "./journey-measures-dal";
import { JOURNEY_FUNNEL_RETENTION_DAYS, type FunnelRow } from "./journey-funnel";

const DAY_MS = 86_400_000;
const TTL_MS = 60_000;

export type SourceKey = "launch" | "counters" | "views" | "campaigns" | "shortfall" | "deposits" | "bets" | "returned" | "joined" | "outcomes" | "harm";
export type SourceState = "ok" | "unreadable" | "unavailable" | "not-read";

/** The period a file covers (the panel reads all of them at once). */
export type MeasuresPeriod = { kind: "baseline" } | { kind: "week"; monday: string } | { kind: "month"; month: string };

export type MeasureRow = {
  def: MeasureDef;
  before: Cell;
  after: Record<7 | 14 | 28, Cell>;
  changes: Record<7 | 14 | 28, { tenths: number; text: string } | null>;
  sinceLaunch: Cell;
  /** The requested period's cell (a week or a month); for the baseline period, the before cell. */
  period: Cell;
  periodChange: { tenths: number; text: string } | null;
  /** Measure 5 only: the median minutes to a first bet among the numerator, per column (null: no such player). */
  median: { before: number | null; after: Record<7 | 14 | 28, number | null>; sinceLaunch: number | null; period: number | null } | null;
};

export type ReferenceCell = { status: "counts" | "unreadable" | "unavailable" | "not-launched" | "pruned"; deposits: number | null; notices: number | null; note: string | null };

export type CampaignRow = {
  campaign: string;
  sheetOpens: number | null;
  homeOpens: number | null;
  bets: number | null;
  sheetToBet: Cell;
  /** Landing visits with exactly this tag (the visit counter); null when the visit read failed. */
  landingVisits: number | null;
  /** The tag is only in the visit counter's totals: the journey counters never saw it (S13-PLAN Correction 24). */
  visitOnly: boolean;
};

export type WatchDay = {
  day: string;
  questionBets: number | null;
  allBets: number | null;
  confirmed: number | null;
  failed: number | null;
  undecided: number | null;
  /** On the new journey from 00:00 to 24:00 (after launch only). */
  active: boolean;
};

export type LaunchWatch = {
  baseline: { questionBetsPerDay: number | null; confirmRate: number | null; days: number };
  lines: { questionBets: number | null; confirmRate: number | null };
  days: WatchDay[];
  /** Three consecutive full ACTIVE days of question bets under the line. Null before three such days exist. */
  betsBelowLine: { below: boolean; days: string[] } | null;
  /** The trailing three full ACTIVE days' confirm rate, against the line. Null before three such days exist. */
  confirmTrailing: { rate: number | null; below: boolean; days: string[] } | null;
  harm: null | {
    readable: boolean;
    before: { rapidDeposit: number | null; chasingLosses: number | null; daysCounted: number };
    days: Array<{ day: string; counted: HarmDay | null }>;
  };
  /** S16's "measures in bounds" (Ali's rule, 2026-10-14) — read only with the harm counts, so only for compliance VIEW. */
  bounds: InBoundsVerdict | null;
};

export type JourneyMeasuresView = {
  generatedAt: number;
  campaign: string | null;
  period: MeasuresPeriod;
  periodWindow: DayWindow;
  launch:
    | { state: "unreadable"; why: string }
    | { state: "not-launched"; observedSince: number | null; current: RolloutState | null }
    | { state: "launched"; launchDay: string; startedActive: boolean; observedSince: number; current: RolloutState | null; firstActiveAt: number };
  windows: MeasureWindows;
  rows: MeasureRow[];
  reference: { before: ReferenceCell; after: Record<7 | 14 | 28, ReferenceCell> };
  campaigns: { seen: string[]; table: CampaignRow[]; window: DayWindow };
  schedule: AgencySchedule;
  watch: LaunchWatch;
  sources: Record<SourceKey, SourceState>;
  s9: boolean;
  definitions: { notes: string[] };
};

type Read<T> = { ok: true; value: T } | { ok: false };
const settle = async <T,>(p: () => Promise<T>): Promise<Read<T>> => {
  try { return { ok: true, value: await p() }; } catch (err) {
    console.error("[journey-measures] a read failed:", String((err as Error)?.message ?? err).slice(0, 300));
    return { ok: false };
  }
};

/** Every read the view makes, as one object — so a suite can make any ONE of them fail and see what the view prints. */
type Reads = {
  launch: typeof journeyLaunchRecord; counterRows: typeof counterRows; homeViewsByDay: typeof homeViewsByDay;
  campaignVisits: typeof campaignVisits; shortfallDeposits: typeof shortfallDeposits; confirmedDeposits: typeof confirmedDeposits;
  betsOf: typeof betsOf; returnedBetsOf: typeof returnedBetsOf; joinedPlayers: typeof joinedPlayers;
  depositOutcomesByDay: typeof depositOutcomesByDay; harmWatchSeries: typeof harmWatchSeries;
};
const REAL_READS: Reads = {
  launch: journeyLaunchRecord, counterRows, homeViewsByDay, campaignVisits, shortfallDeposits, confirmedDeposits, betsOf,
  returnedBetsOf, joinedPlayers, depositOutcomesByDay, harmWatchSeries,
};
let readsOverride: Partial<Reads> | null = null;
/** ⚠️ TEST SEAM — replace some reads (a suite plants a failing one). Clears the memo. Never called by the product. */
export function __setJourneyMeasuresReadsForTests(o: Partial<Reads> | null): void {
  readsOverride = o;
  memo().clear();
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_MEASURES: Map<string, { at: number; view: JourneyMeasuresView }> | undefined;
}
const memo = () => (globalThis.__50PICK_JOURNEY_MEASURES ??= new Map());

/** The day the counters still hold (they delete days before it, `pruneJourneyFunnel`). */
export function retainedFromDay(nowMs: number): string {
  return eatDayKey(nowMs - JOURNEY_FUNNEL_RETENTION_DAYS * DAY_MS);
}

export type ViewOptions = {
  nowMs?: number;
  campaign?: string | null;
  period?: MeasuresPeriod;
  /** The viewer holds compliance VIEW — decided by the caller, on the server. Only then are the harm rows read. */
  includeHarm?: boolean;
  /** Skip the memo (the files: a download is made from a fresh read). */
  fresh?: boolean;
};

/** ⭐ THE VIEW. Never throws: every failure is a status on the cells that needed the failed source. */
export async function journeyMeasuresView(opts: ViewOptions = {}): Promise<JourneyMeasuresView> {
  const nowMs = opts.nowMs ?? Date.now();
  const campaign = opts.campaign ? funnelTag(opts.campaign) || null : null;
  const period: MeasuresPeriod = opts.period ?? { kind: "baseline" };
  const key = JSON.stringify([campaign, period, !!opts.includeHarm]);
  if (!opts.fresh && opts.nowMs === undefined) {
    const hit = memo().get(key);
    if (hit && nowMs - hit.at < TTL_MS) return hit.view;
  }
  const view = await build(nowMs, campaign, period, !!opts.includeHarm);
  if (opts.nowMs === undefined) memo().set(key, { at: nowMs, view });
  return view;
}

/** Drop the memo (after a seed, in the suites). */
export function clearJourneyMeasuresMemo(): void {
  memo().clear();
}

async function build(nowMs: number, campaign: string | null, period: MeasuresPeriod, includeHarm: boolean): Promise<JourneyMeasuresView> {
  const R: Reads = readsOverride ? { ...REAL_READS, ...readsOverride } : REAL_READS;
  const sources: Record<SourceKey, SourceState> = {
    launch: "not-read", counters: "not-read", views: "not-read", campaigns: "not-read", shortfall: "not-read", deposits: "not-read",
    bets: "not-read", returned: S9_ON ? "not-read" : "unavailable", joined: "not-read", outcomes: "not-read", harm: "not-read",
  };
  const retained = retainedFromDay(nowMs);

  /* 1 · the launch record */
  const rec = await R.launch().catch(() => ({ ok: false as const, why: "unreadable" as const }));
  sources.launch = rec.ok ? "ok" : "unreadable";
  const facts: LaunchFacts | null = rec.ok ? rec.facts : null;
  const windows = measureWindows({ launch: facts, nowMs, retainedFromDay: retained });
  const launchDay = launchDayOf(facts);
  const current = facts && facts.transitions.length ? facts.transitions[facts.transitions.length - 1].state : null;
  const launch: JourneyMeasuresView["launch"] = !rec.ok
    ? { state: "unreadable", why: rec.why }
    : facts && facts.firstActiveAt !== null && launchDay
      ? { state: "launched", launchDay, startedActive: facts.startedActive, observedSince: facts.observedSince, current, firstActiveAt: facts.firstActiveAt }
      : { state: "not-launched", observedSince: facts?.observedSince ?? null, current };

  const periodWindow: DayWindow = period.kind === "week" ? weekWindow(facts, period.monday, retained)
    : period.kind === "month" ? monthWindow(facts, period.month, retained)
    : windows.before;
  const schedule = agencySchedule(launchDay, nowMs);

  /* 2 · the reads, once each, over the union of every window's days */
  const watchFrom = windows.before.days[0] ?? addDays(windows.today, -S13_RULINGS.beforeDays);
  const allDays = [...new Set([
    ...windows.before.days, ...windows.after[28].days, ...windows.sinceLaunch.days, ...periodWindow.days,
    ...dayRange(watchFrom, addDays(windows.today, -1)),
  ])].sort();
  const fromDay = allDays[0] ?? addDays(windows.today, -1);
  const toDay = allDays[allDays.length - 1] ?? addDays(windows.today, -1);
  const fromMs = eatDayStartMs(fromDay), toMs = eatDayEndMs(toDay);

  const [counters, views, visits, shortfall, deposits, joined, outcomes] = await Promise.all([
    settle(() => R.counterRows(fromDay, toDay)),
    settle(() => R.homeViewsByDay(fromDay, toDay)),
    settle(() => R.campaignVisits(fromDay, toDay)),
    settle(() => R.shortfallDeposits(fromMs, toMs)),
    settle(() => R.confirmedDeposits(fromMs, toMs)),
    settle(() => R.joinedPlayers(fromMs, toMs)),
    settle(() => R.depositOutcomesByDay(fromMs, toMs)),
  ]);
  sources.counters = counters.ok ? "ok" : "unreadable";
  sources.views = views.ok ? "ok" : "unreadable";
  sources.campaigns = visits.ok ? "ok" : "unreadable";
  sources.shortfall = shortfall.ok ? "ok" : "unreadable";
  sources.deposits = deposits.ok ? "ok" : "unreadable";
  sources.joined = joined.ok ? "ok" : "unreadable";
  sources.outcomes = outcomes.ok ? "ok" : "unreadable";
  // Follow-ups: the deposits' players' bets to 30 minutes past the span; S9's returned bets likewise.
  const depositUsers = deposits.ok ? [...new Set(deposits.value.map((d) => d.userId))] : [];
  const bets = deposits.ok ? await settle(() => R.betsOf(depositUsers, fromMs, toMs + DEPOSIT_FOLLOW_UP_MS)) : ({ ok: false } as Read<BetRead[]>);
  sources.bets = !deposits.ok ? "not-read" : bets.ok ? "ok" : "unreadable";
  let returned: Read<BetRead[]> = { ok: false };
  if (S9_ON && shortfall.ok) {
    const users = [...new Set(shortfall.value.map((d) => d.userId))];
    returned = await settle(() => R.returnedBetsOf(users, fromMs, toMs + DEPOSIT_FOLLOW_UP_MS));
    sources.returned = returned.ok ? "ok" : "unreadable";
  }

  /* 3 · counter sums and counting gaps */
  const rows: FunnelRow[] = counters.ok ? counters.value : [];
  const viewMap: Map<string, number> = views.ok ? views.value : new Map();
  const counted = new Set(rows.map((r) => r.day));
  const gapDays = new Set(counters.ok && views.ok ? allDays.filter((d) => !counted.has(d) && (viewMap.get(d) ?? 0) > 0) : []);
  const sum = (step: string, origins: readonly string[] | null, variant: Variant | null, days: ReadonlySet<string>, camp: string | null) => {
    let n = 0;
    for (const r of rows) {
      if (r.step !== step || !days.has(r.day)) continue;
      if (origins && !origins.includes(r.origin)) continue;
      if (variant && r.variant !== variant) continue;
      if (camp && r.utmCampaign !== camp) continue;
      n += r.count;
    }
    return n;
  };
  const viewsIn = (days: ReadonlySet<string>) => { let n = 0; for (const d of days) n += viewMap.get(d) ?? 0; return n; };
  const launchUnreadable = !rec.ok;

  /** The cells of one measure over one window. */
  const cellOf = (m: MeasureDef, w: DayWindow, side: "before" | "after", camp: string | null): { cell: Cell; median: number | null } => {
    const v: Variant = w.variant;
    const usesCounters = m.numerator.half.source !== "rows" || m.denominator.half.source !== "rows";
    const notCounted = usesCounters ? w.days.filter((d) => gapDays.has(d)) : [];
    const days = new Set(w.days.filter((d) => !notCounted.includes(d)));
    const base = { measure: m, side, window: w, campaign: camp, s9: S9_ON, notCounted };
    if (launchUnreadable) return { cell: cellFor(null, null, { ...base, readable: false }), median: null };
    switch (m.key) {
      case "homeToSheet": {
        const h = m.numerator.half;
        const n = h.source === "counter" ? sum("sheet_open", h.origins[v], v, days, null) : 0;
        return { cell: cellFor(n, viewsIn(days), { ...base, readable: counters.ok && views.ok }), median: null };
      }
      case "sheetToBet": {
        const hn = m.numerator.half, hd = m.denominator.half;
        const n = hn.source === "counter" ? sum("bet", hn.origins[v], v, days, camp) : 0;
        const d = hd.source === "counter" ? sum("sheet_open", hd.origins[v], v, days, camp) : 0;
        return { cell: cellFor(n, d, { ...base, readable: counters.ok }), median: null };
      }
      case "shortToDeposit": {
        const hd = m.denominator.half;
        const d = hd.source === "counter" ? sum("low_balance", hd.origins[v], v, days, null) : 0;
        if (side === "before") return { cell: cellFor(null, d, { ...base, readable: counters.ok }), median: null };
        const n = shortfall.ok ? shortfall.value.filter((x) => x.savedBet && days.has(eatDayKey(x.at))).length : 0;
        return { cell: cellFor(n, d, { ...base, readable: counters.ok && shortfall.ok }), median: null };
      }
      case "depositToBet": {
        if (side === "before" || !S9_ON) return { cell: cellFor(null, null, { ...base, readable: true }), median: null };
        const inWin = shortfall.ok ? shortfall.value.filter((x) => x.savedBet && days.has(eatDayKey(x.at))) : [];
        const due = inWin.filter((x) => x.at + DEPOSIT_FOLLOW_UP_MS <= nowMs);
        const matched = returned.ok
          ? matchReturnedBets(due.filter((x) => x.completedAt !== null).map((x) => ({ id: x.id, userId: x.userId, at: x.completedAt as number, savedBet: x.savedBet })), returned.value)
          : new Set<string>();
        return { cell: cellFor(matched.size, due.length, { ...base, readable: shortfall.ok && returned.ok, waiting: inWin.length - due.length }), median: null };
      }
      case "depositToAnyBet": {
        const inWin = deposits.ok ? deposits.value.filter((x) => days.has(eatDayKey(x.at))) : [];
        const due = inWin.filter((x) => x.at + DEPOSIT_FOLLOW_UP_MS <= nowMs);
        const byUser = new Map<string, number[]>();
        if (bets.ok) for (const b of bets.value) { const l = byUser.get(b.userId) ?? []; l.push(b.placedAt); byUser.set(b.userId, l); }
        const n = due.filter((x) => followedWithin(x, byUser)).length;
        return { cell: cellFor(n, due.length, { ...base, readable: deposits.ok && bets.ok, waiting: inWin.length - due.length }), median: null };
      }
      case "timeToFirstBet": {
        const inWin: JoinRead[] = joined.ok ? joined.value.filter((p) => days.has(eatDayKey(p.joinedAt))) : [];
        const due = inWin.filter((p) => p.joinedAt + FIRST_BET_HORIZON_MS <= nowMs);
        const within = due.filter((p) => p.firstBetAt !== null && p.firstBetAt <= p.joinedAt + FIRST_BET_HORIZON_MS);
        const minutes = within.map((p) => Math.max(0, ((p.firstBetAt as number) - p.joinedAt) / 60_000));
        return {
          cell: cellFor(within.length, due.length, { ...base, readable: joined.ok, waiting: inWin.length - due.length }),
          median: joined.ok ? median(minutes) : null,
        };
      }
    }
  };

  /* 4 · the rows */
  const AFTER = S13_RULINGS.afterDays;
  const measureRows: MeasureRow[] = MEASURES.map((m) => {
    const b = cellOf(m, windows.before, "before", campaign);
    const a = Object.fromEntries(AFTER.map((n) => [n, cellOf(m, windows.after[n], "after", campaign)])) as Record<7 | 14 | 28, { cell: Cell; median: number | null }>;
    const s = cellOf(m, windows.sinceLaunch, "after", campaign);
    const p = period.kind === "baseline" ? b : cellOf(m, periodWindow, "after", campaign);
    return {
      def: m,
      before: b.cell,
      after: { 7: a[7].cell, 14: a[14].cell, 28: a[28].cell },
      changes: { 7: changeOf(b.cell, a[7].cell), 14: changeOf(b.cell, a[14].cell), 28: changeOf(b.cell, a[28].cell) },
      sinceLaunch: s.cell,
      period: p.cell,
      periodChange: period.kind === "baseline" ? null : changeOf(b.cell, p.cell),
      median: m.key === "timeToFirstBet"
        ? { before: b.median, after: { 7: a[7].median, 14: a[14].median, 28: a[28].median }, sinceLaunch: s.median, period: p.median }
        : null,
    };
  });

  /* 5 · the reference row (internal; counts, never a share) */
  const refOf = (w: DayWindow, side: "before" | "after"): ReferenceCell => {
    if (launchUnreadable) return { status: "unreadable", deposits: null, notices: null, note: "could not be read" };
    if (side === "after" && w.notLaunched) return { status: "not-launched", deposits: null, notices: null, note: null };
    if (w.pruned) return { status: "pruned", deposits: null, notices: null, note: "older than 400 days" };
    if (side === "after" && !S9_ON) return { status: "unavailable", deposits: null, notices: null, note: "not yet available" };
    if (!counters.ok || !shortfall.ok) return { status: "unreadable", deposits: null, notices: null, note: "could not be read" };
    const days = new Set(w.days.filter((d) => !gapDays.has(d)));
    return {
      status: "counts",
      deposits: shortfall.value.filter((x) => !x.savedBet && days.has(eatDayKey(x.at))).length,
      notices: sum("low_balance", ["updown"], w.variant, days, null),
      note: null,
    };
  };

  /* 6 · the campaign table — over the period the panel is reporting (before launch: the baseline; after: since launch) */
  const campWindow: DayWindow = period.kind !== "baseline" ? periodWindow : launch.state === "launched" ? windows.sinceLaunch : windows.before;
  const campDays = new Set(campWindow.days);
  const seenCounter = [...new Set(rows.filter((r) => r.utmCampaign && campDays.has(r.day)).map((r) => r.utmCampaign))];
  const visitTotals = new Map<string, number>();
  if (visits.ok) for (const v of visits.value) if (campDays.has(v.day)) visitTotals.set(v.campaign, (visitTotals.get(v.campaign) ?? 0) + v.visits);
  const seen = [...new Set([...seenCounter, ...visitTotals.keys()])].sort();
  const m2 = MEASURES.find((m) => m.key === "sheetToBet") as MeasureDef;
  const side: "before" | "after" = campWindow.key === "before" ? "before" : "after";
  const table: CampaignRow[] = seen.map((c) => {
    const inCounters = seenCounter.includes(c);
    const v = campWindow.variant;
    const betOrigins = m2.numerator.half.source === "counter" ? m2.numerator.half.origins[v] : [];
    return {
      campaign: c,
      sheetOpens: counters.ok && !launchUnreadable ? sum("sheet_open", null, v, campDays, c) : null,
      homeOpens: counters.ok && !launchUnreadable ? sum("sheet_open", ["home"], v, campDays, c) : null,
      bets: counters.ok && !launchUnreadable ? sum("bet", betOrigins, v, campDays, c) : null,
      sheetToBet: cellOf(m2, campWindow, side, c).cell,
      landingVisits: visits.ok ? visitTotals.get(c) ?? 0 : null,
      visitOnly: !inCounters,
    };
  });

  /* 7 · the launch watch */
  const watch = await launchWatch({
    windows, facts, launchUnreadable, rows, counters, outcomes, gapDays, includeHarm, nowMs, sources, harmRead: R.harmWatchSeries,
    boundsCells: Object.fromEntries(measureRows.filter((r) => (S13_RULINGS.inBounds.measures as readonly string[]).includes(r.def.key))
      .map((r) => [r.def.key, { before: r.before, after: r.after[7] }])) as Record<InBoundsKey, { before: Cell; after: Cell }>,
  });

  return {
    generatedAt: nowMs, campaign, period, periodWindow, launch, windows, rows: measureRows,
    reference: { before: refOf(windows.before, "before"), after: { 7: refOf(windows.after[7], "after"), 14: refOf(windows.after[14], "after"), 28: refOf(windows.after[28], "after") } },
    campaigns: { seen, table, window: campWindow },
    schedule, watch, sources, s9: S9_ON,
    definitions: { notes: definitionNotes() },
  };
}

/** The question bets' origins (old and new journeys) and every bet origin, from the one allow-list. */
const QUESTION_BET_ORIGINS = ["dial", "sheet", "deposit_return"] as const;
const ALL_BET_ORIGINS: readonly string[] = FUNNEL_STEPS.bet;

async function launchWatch(x: {
  windows: MeasureWindows; facts: LaunchFacts | null; launchUnreadable: boolean; rows: FunnelRow[];
  counters: Read<FunnelRow[]>; outcomes: Read<Map<string, OutcomeDay>>; gapDays: ReadonlySet<string>; includeHarm: boolean; nowMs: number;
  sources: Record<SourceKey, SourceState>; harmRead: typeof harmWatchSeries;
  boundsCells: Record<InBoundsKey, { before: Cell; after: Cell }>;
}): Promise<LaunchWatch> {
  const R = S13_RULINGS.rollback;
  const perDay = (day: string): WatchDay => {
    const counted = x.counters.ok && !x.gapDays.has(day);
    let q = 0, all = 0;
    if (counted) for (const r of x.rows) {
      if (r.day !== day || r.step !== "bet") continue;
      if ((QUESTION_BET_ORIGINS as readonly string[]).includes(r.origin)) q += r.count;
      if (ALL_BET_ORIGINS.includes(r.origin)) all += r.count;
    }
    const o = x.outcomes.ok ? x.outcomes.value.get(day) ?? { day, confirmed: 0, failed: 0, undecided: 0 } : null;
    return {
      day,
      questionBets: counted ? q : null, allBets: counted ? all : null,
      confirmed: o ? o.confirmed : null, failed: o ? o.failed : null, undecided: o ? o.undecided : null,
      active: !!x.facts && dayStanding(x.facts, day) === "active",
    };
  };
  const beforeDays = x.windows.before.days.map(perDay);
  const qb = beforeDays.filter((d) => d.questionBets !== null);
  const decided = beforeDays.filter((d) => d.confirmed !== null && d.failed !== null);
  const decidedTotal = decided.reduce((n, d) => n + (d.confirmed as number) + (d.failed as number), 0);
  const baseline = {
    questionBetsPerDay: !x.launchUnreadable && qb.length > 0 ? qb.reduce((n, d) => n + (d.questionBets as number), 0) / qb.length : null,
    confirmRate: !x.launchUnreadable && decidedTotal > 0 ? decided.reduce((n, d) => n + (d.confirmed as number), 0) / decidedTotal : null,
    days: qb.length,
  };
  const lines = {
    questionBets: baseline.questionBetsPerDay === null ? null : baseline.questionBetsPerDay * R.betsShare,
    confirmRate: baseline.confirmRate === null ? null : baseline.confirmRate * R.confirmShare,
  };
  const afterDays = x.windows.sinceLaunch.days.map(perDay);
  const fullActive = afterDays.filter((d) => d.active);
  const lastN = (n: number) => fullActive.slice(-n);
  let betsBelowLine: LaunchWatch["betsBelowLine"] = null;
  if (lines.questionBets !== null && fullActive.length >= R.betsDays) {
    const tail = lastN(R.betsDays);
    betsBelowLine = { below: tail.every((d) => d.questionBets !== null && (d.questionBets as number) < (lines.questionBets as number)), days: tail.map((d) => d.day) };
  }
  let confirmTrailing: LaunchWatch["confirmTrailing"] = null;
  if (fullActive.length >= R.confirmDays) {
    const tail = lastN(R.confirmDays);
    const ok = tail.every((d) => d.confirmed !== null && d.failed !== null);
    const c = tail.reduce((n, d) => n + (d.confirmed ?? 0), 0), f = tail.reduce((n, d) => n + (d.failed ?? 0), 0);
    const rate = ok && c + f > 0 ? c / (c + f) : null;
    confirmTrailing = { rate, below: rate !== null && lines.confirmRate !== null && rate < lines.confirmRate, days: tail.map((d) => d.day) };
  }

  let harm: LaunchWatch["harm"] = null;
  let bounds: InBoundsVerdict | null = null;
  if (x.includeHarm) {
    const s = await x.harmRead().catch(() => ({ ok: false as const, why: "unreadable" as const }));
    x.sources.harm = s.ok ? "ok" : "unreadable";
    const counted = (day: string): HarmDay | null => (s.ok ? s.byDay.get(day) ?? null : null);
    const beforeCounted = x.windows.before.days.map(counted).filter((d): d is Extract<HarmDay, { rapidDeposit: number }> => !!d && "rapidDeposit" in d);
    harm = {
      readable: s.ok,
      before: {
        rapidDeposit: beforeCounted.length ? beforeCounted.reduce((n, d) => n + d.rapidDeposit, 0) / beforeCounted.length : null,
        chasingLosses: beforeCounted.length ? beforeCounted.reduce((n, d) => n + d.chasingLosses, 0) / beforeCounted.length : null,
        daysCounted: beforeCounted.length,
      },
      days: x.windows.sinceLaunch.days.map((day) => ({ day, counted: counted(day) })),
    };
    // S16's rule reads the harm counts, so its verdict exists only where the harm rows do.
    const series = (key: "rapidDeposit" | "chasingLosses", days: readonly string[]) =>
      days.map((d) => { const c = counted(d); return c && "rapidDeposit" in c ? c[key] : null; });
    const harmDays: HarmDays | null = s.ok
      ? {
        rapidDeposit: { before: series("rapidDeposit", x.windows.before.days), after: series("rapidDeposit", x.windows.after[7].days) },
        chasingLosses: { before: series("chasingLosses", x.windows.before.days), after: series("chasingLosses", x.windows.after[7].days) },
      }
      : null;
    bounds = x.launchUnreadable ? null : inBoundsVerdict({ after7: x.windows.after[7], cells: x.boundsCells, harm: harmDays });
  }
  return { baseline, lines, days: afterDays, betsBelowLine, confirmTrailing, harm, bounds };
}

/** The measures as one record per key, for the files and the suites. */
export function rowsByKey(v: JourneyMeasuresView): Record<MeasureKey, MeasureRow> {
  return Object.fromEntries(v.rows.map((r) => [r.def.key, r])) as Record<MeasureKey, MeasureRow>;
}

/** The reference row's definition (re-exported so the panel imports one module). */
export { REFERENCE_ROW };
export type { DepositRead };
