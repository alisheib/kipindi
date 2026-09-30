/**
 * THE JOURNEY FUNNEL REPORT — what the `/admin/insights` panel shows (the Vodacom plan S3b, §0f and §3.10).
 *
 * Three reads, one answer:
 *   · the daily totals (`JourneyFunnelDay`) for the window, per journey (old/new) and optionally one campaign;
 *   · home-page views from the visit counter (`SiteVisitPage`, path "/"), set against the journey that is LIVE for
 *     players (the new one only once the rollout is ACTIVE);
 *   · from the rows (players only, house stakes excluded): confirmed deposits in the window and how many were followed
 *     by the same player's bet within 30 minutes, and the median time from sign-up to a first bet for players who
 *     signed up in the window. These have no journey or campaign on the row, so they are shown for everyone.
 *
 * Read-only. The row pass is the one `insights.ts` already makes (`db.txn.listAll`); the page caches nothing new.
 */
import { db } from "./store";
import { eatDayKey } from "../eat-day";
import { funnelRows } from "./journey-funnel";
import { siteVisitsReport } from "./site-visits";
import { simpleJourneyStateNow } from "./simple-journey-switch";
import { funnelMeasures, median, totalsFor, type Measure } from "../journey/funnel-measures";

export const JOURNEY_REPORT_WINDOWS = [7, 14, 28] as const;
export type JourneyReportWindow = (typeof JOURNEY_REPORT_WINDOWS)[number];
/** A deposit counts as "followed by a bet" when the same player bets within this long of its confirmation. */
export const DEPOSIT_TO_BET_MS = 30 * 60 * 1000;

export type JourneyFunnelReport = {
  fromDay: string;
  toDay: string;
  days: JourneyReportWindow;
  campaign: string | null;
  /** The journey players are shown now: its column carries the home-page views. */
  liveVariant: "old" | "new";
  measures: Record<"old" | "new", Measure[]>;
  homeViews: number;
  deposits: { confirmed: number; betWithin30: number };
  timeToFirstBet: { players: number; medianMinutes: number | null };
  /** The campaigns seen in the window, for the filter. */
  campaigns: string[];
};

const DAY = 86_400_000;

export async function journeyFunnelReport(opts: { days?: number; campaign?: string | null; now?: number } = {}): Promise<JourneyFunnelReport> {
  const days: JourneyReportWindow = (JOURNEY_REPORT_WINDOWS as readonly number[]).includes(opts.days ?? 14) ? (opts.days as JourneyReportWindow) ?? 14 : 14;
  const now = opts.now ?? Date.now();
  const toDay = eatDayKey(now);
  const fromDay = eatDayKey(now - (days - 1) * DAY);
  const fromMs = Date.parse(`${fromDay}T00:00:00.000Z`) - 3 * 60 * 60 * 1000; // the EAT day's first instant
  const campaign = opts.campaign && opts.campaign.trim() ? opts.campaign.trim().toLowerCase() : null;

  const [rows, visits, state, users, txns] = await Promise.all([
    funnelRows(fromDay, toDay),
    siteVisitsReport(fromDay, toDay, 50).catch(() => null),
    simpleJourneyStateNow().catch(() => "WITHDRAWN" as const),
    db.user.list(),
    db.txn.listAll(),
  ]);
  const liveVariant: "old" | "new" = state === "ACTIVE" ? "new" : "old";
  const homeViews = campaign ? 0 : (visits?.pages.find((p) => p.path === "/")?.views ?? 0);

  // From the rows: players only, house stakes never.
  const players = new Map(users.filter((u) => u.role === "PLAYER").map((u) => [u.id, u]));
  const betsByUser = new Map<string, number[]>();
  for (const t of txns) {
    if (t.type !== "BET_PLACED" || t.houseBotId || !players.has(t.userId)) continue;
    const at = Date.parse(t.createdAt);
    if (!Number.isFinite(at)) continue;
    const list = betsByUser.get(t.userId) ?? [];
    list.push(at);
    betsByUser.set(t.userId, list);
  }
  let confirmed = 0, betWithin30 = 0;
  for (const t of txns) {
    if (t.type !== "DEPOSIT" || t.status !== "CONFIRMED" || t.houseBotId || !players.has(t.userId)) continue;
    const at = Date.parse(t.completedAt ?? t.createdAt);
    if (!Number.isFinite(at) || at < fromMs || at > now) continue;
    confirmed++;
    if ((betsByUser.get(t.userId) ?? []).some((b) => b >= at && b <= at + DEPOSIT_TO_BET_MS)) betWithin30++;
  }
  const firstBetMinutes: number[] = [];
  for (const u of players.values()) {
    const joined = Date.parse(u.createdAt);
    if (!Number.isFinite(joined) || joined < fromMs || joined > now) continue;
    const bets = betsByUser.get(u.id);
    if (!bets?.length) continue;
    firstBetMinutes.push(Math.max(0, Math.round((Math.min(...bets) - joined) / 60_000)));
  }
  const deposits = { confirmed, betWithin30 };
  const measures = {
    old: funnelMeasures(totalsFor(rows, "old", campaign), liveVariant === "old" ? homeViews : 0, deposits),
    new: funnelMeasures(totalsFor(rows, "new", campaign), liveVariant === "new" ? homeViews : 0, deposits),
  };
  const campaigns = [...new Set(rows.map((r) => r.utmCampaign).filter(Boolean))].sort();
  return {
    fromDay, toDay, days, campaign, liveVariant, measures, homeViews, deposits,
    timeToFirstBet: { players: firstBetMinutes.length, medianMinutes: median(firstBetMinutes) },
    campaigns,
  };
}
