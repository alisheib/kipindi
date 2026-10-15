/**
 * THE MEASURES' READS — the Vodacom plan S13 WP5 (`docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md`,
 * "The SQL and DAL definitions"). Every number the measures view needs comes from one of these narrow reads, each with a
 * window or an id list, and the same answer on both stores.
 *
 *   counters      the daily funnel totals over a day range (`journey-funnel.ts`'s own read)
 *   homeViews     views of "/" per day (`site-visits.ts`'s narrow per-path read — never the top-50 ranking)
 *   campaigns     landing visits per day and campaign tag (`site-visits.ts`)
 *   R1            confirmed SHORTFALL deposits (origin `low_balance`) completed in [from, to), players, unmarked
 *   R2            every confirmed player deposit completed in [from, to), unmarked
 *   bets          the unmarked bets of a set of players placed in [from, to] (R2's follow-ups, R3's candidates)
 *   R3            the bets placed back from a deposit (S9's `Position.origin = "deposit_return"`) — S9 only
 *   R4            players who joined in [from, to), with the first unmarked bet of each
 *   W             player deposits started per EAT day, by outcome (the launch watch's confirm rate)
 *
 * ⛔ PLAYERS ONLY, AT READ TIME: an account whose role is not a staff role (`STAFF_ROLES`) — AGENT accounts included
 *    (S13-PLAN Correction 17). ⛔ UNMARKED ONLY: a row the house marker carries is outside these measures (S13 Point 1,
 *    accepted by Ali 2026-10-14 — `S13_RULINGS.markedStakesExcluded`) and is never named on any surface (D19).
 * ⛔ NO WHOLE-TABLE READ IN THE PRISMA TWIN: every query carries a window or an id list (ids in chunks), and
 *    `test:journey-measures` records the client calls on Postgres and fails on one without. The MEMORY twin reads its
 *    own in-process maps, which is what a memory store is.
 * ⭐ A deposit's instant is `COALESCE(completedAt, createdAt)` for windows; measure 4's one-to-one match uses `completedAt`
 *    alone, as S9's writer does (A11). Rows go through Prisma's typed API, never raw SQL: `placedAt` and `completedAt` are
 *    naive UTC timestamps and the typed API converts them (A12).
 * ⛔ A READ THAT FAILS THROWS. The view turns a thrown read into "could not be read" for the cells that need it, and never
 *    into a zero (`cellFor`).
 */
import type { Prisma, UserRole } from "@prisma/client";
import { eatDayKey } from "@/lib/eat-day";
import type { SavedQuestionBet } from "@/lib/journey/measures";
import { funnelRows, type FunnelRow } from "./journey-funnel";
import { S9_RECORDS } from "./journey-measures-s9";
import { positionStore } from "./market-dal";
import { hasDatabase, prisma } from "./prisma";
import { STAFF_ROLES, isStaffRole } from "./roles";
import { campaignVisitsByDay, pathViewsByDay, type CampaignVisits, type DayViews } from "./site-visits";
import { db } from "./store";

export type DepositRead = {
  id: string;
  userId: string;
  /** `COALESCE(completedAt, createdAt)` — where the deposit falls in a window. */
  at: number;
  /** Measure 4's match instant (S9's rule); null never matches. */
  completedAt: number | null;
  /** S9's saved QUESTION bet, or null (a round, none, malformed — or S9 not on this build: see `s9`). */
  savedBet: SavedQuestionBet | null;
};
export type BetRead = { id: string; userId: string; marketId: string; side: string; stake: number; placedAt: number };
export type JoinRead = { id: string; joinedAt: number; firstBetAt: number | null };
export type OutcomeDay = { day: string; confirmed: number; failed: number; undecided: number };

/** Which twin answers. */
export const MEASURES_DAL_KIND: "prisma" | "memory" = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? "prisma" : "memory";
/** This build carries S9's records (the seam is open). */
export const S9_ON = S9_RECORDS !== null;

const STAFF = [...STAFF_ROLES] as UserRole[];
const CHUNK = 1_000;
const ms = (d: Date | string | null | undefined): number | null => (d === null || d === undefined ? null : new Date(d).getTime());
const chunks = <T,>(xs: readonly T[]): T[][] => { const out: T[][] = []; for (let i = 0; i < xs.length; i += CHUNK) out.push(xs.slice(i, i + CHUNK)); return out; };
const savedOf = (raw: unknown): SavedQuestionBet | null => (S9_RECORDS ? S9_RECORDS.savedQuestionBet(raw) : null);
/** `[from, to)` on `COALESCE(completedAt, createdAt)`, as a Prisma filter. */
const completedIn = (fromMs: number, toMs: number): Prisma.TransactionWhereInput => ({
  OR: [
    { completedAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
    { completedAt: null, createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
  ],
});

/* ── The Prisma twin ─────────────────────────────────────────────────────────────────────────────────────────────── */

function client() {
  const c = prisma();
  if (!c) throw new Error("journey-measures: no database client");
  return c;
}

async function prismaDeposits(fromMs: number, toMs: number, shortfallOnly: boolean): Promise<DepositRead[]> {
  const select: Record<string, boolean> = { id: true, userId: true, createdAt: true, completedAt: true };
  if (S9_ON && shortfallOnly) select.pendingBet = true; // S9's column — selected only when the seam is open
  const rows = await client().transaction.findMany({
    where: {
      type: "DEPOSIT", status: "CONFIRMED", houseBotId: null, user: { role: { notIn: STAFF } },
      ...(shortfallOnly ? { origin: "low_balance" } : {}),
      ...completedIn(fromMs, toMs),
    },
    select: select as Prisma.TransactionSelect,
  });
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, userId: r.userId as string,
    at: (ms(r.completedAt as Date | null) ?? ms(r.createdAt as Date)) as number,
    completedAt: ms(r.completedAt as Date | null),
    savedBet: shortfallOnly ? savedOf(r.pendingBet) : null,
  }));
}

async function prismaBets(userIds: readonly string[], fromMs: number, toMs: number, returnedOnly: boolean): Promise<BetRead[]> {
  const out: BetRead[] = [];
  for (const ids of chunks([...new Set(userIds)])) {
    const where: Record<string, unknown> = { userId: { in: ids }, houseBotId: null, placedAt: { gte: new Date(fromMs), lte: new Date(toMs) } };
    if (returnedOnly) where.origin = "deposit_return"; // S9's column — asked only when the seam is open
    const rows = await client().position.findMany({
      where: where as Prisma.PositionWhereInput,
      select: { id: true, userId: true, marketId: true, side: true, stake: true, placedAt: true },
    });
    for (const r of rows) out.push({ id: r.id, userId: r.userId, marketId: r.marketId, side: r.side, stake: Number(r.stake), placedAt: r.placedAt.getTime() });
  }
  return out;
}

const prismaTwin = {
  async shortfallDeposits(fromMs: number, toMs: number) { return prismaDeposits(fromMs, toMs, true); },
  async confirmedDeposits(fromMs: number, toMs: number) { return prismaDeposits(fromMs, toMs, false); },
  async betsOf(userIds: readonly string[], fromMs: number, toMs: number) { return prismaBets(userIds, fromMs, toMs, false); },
  async returnedBetsOf(userIds: readonly string[], fromMs: number, toMs: number) { return prismaBets(userIds, fromMs, toMs, true); },
  async joinedPlayers(fromMs: number, toMs: number): Promise<JoinRead[]> {
    const users = await client().user.findMany({
      where: { role: { notIn: STAFF }, createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
      select: { id: true, createdAt: true },
    });
    const first = new Map<string, number>();
    for (const ids of chunks(users.map((u) => u.id))) {
      const g = await client().position.groupBy({ by: ["userId"], where: { userId: { in: ids }, houseBotId: null }, _min: { placedAt: true } });
      for (const r of g) if (r._min.placedAt) first.set(r.userId, r._min.placedAt.getTime());
    }
    return users.map((u) => ({ id: u.id, joinedAt: u.createdAt.getTime(), firstBetAt: first.get(u.id) ?? null }));
  },
  async depositOutcomes(fromMs: number, toMs: number): Promise<Array<{ status: string; createdAt: number }>> {
    const rows = await client().transaction.findMany({
      where: { type: "DEPOSIT", houseBotId: null, user: { role: { notIn: STAFF } }, createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
      select: { status: true, createdAt: true },
    });
    return rows.map((r) => ({ status: r.status, createdAt: r.createdAt.getTime() }));
  },
};

/* ── The memory twin — the in-process maps a memory store is ─────────────────────────────────────────────────────── */

async function memPlayers(): Promise<Map<string, { createdAt: string }>> {
  const users = await Promise.resolve(db.user.list());
  return new Map(users.filter((u) => !isStaffRole(u.role)).map((u) => [u.id, { createdAt: u.createdAt }]));
}

async function memDeposits(fromMs: number, toMs: number, shortfallOnly: boolean): Promise<DepositRead[]> {
  const [players, txns] = await Promise.all([memPlayers(), Promise.resolve(db.txn.listAll())]);
  const out: DepositRead[] = [];
  for (const t of txns) {
    if (t.type !== "DEPOSIT" || t.status !== "CONFIRMED" || t.houseBotId || !players.has(t.userId)) continue;
    if (shortfallOnly && t.origin !== "low_balance") continue;
    const completed = t.completedAt ? Date.parse(t.completedAt) : null;
    const at = completed ?? Date.parse(t.createdAt);
    if (!(at >= fromMs && at < toMs)) continue;
    out.push({ id: t.id, userId: t.userId, at, completedAt: completed, savedBet: shortfallOnly ? savedOf((t as { pendingBet?: unknown }).pendingBet) : null });
  }
  return out;
}

async function memBets(userIds: readonly string[], fromMs: number, toMs: number, returnedOnly: boolean): Promise<BetRead[]> {
  const ids = new Set(userIds);
  const out: BetRead[] = [];
  for (const p of await positionStore.values()) {
    if (!ids.has(p.userId) || p.houseBotId) continue;
    if (returnedOnly && (p as { origin?: string | null }).origin !== "deposit_return") continue;
    const at = Date.parse(p.placedAt);
    if (at >= fromMs && at <= toMs) out.push({ id: p.id, userId: p.userId, marketId: p.marketId, side: p.side, stake: p.stake, placedAt: at });
  }
  return out;
}

const memoryTwin: typeof prismaTwin = {
  async shortfallDeposits(fromMs, toMs) { return memDeposits(fromMs, toMs, true); },
  async confirmedDeposits(fromMs, toMs) { return memDeposits(fromMs, toMs, false); },
  async betsOf(userIds, fromMs, toMs) { return memBets(userIds, fromMs, toMs, false); },
  async returnedBetsOf(userIds, fromMs, toMs) { return memBets(userIds, fromMs, toMs, true); },
  async joinedPlayers(fromMs, toMs) {
    const players = await memPlayers();
    const joined = [...players.entries()].filter(([, u]) => { const t = Date.parse(u.createdAt); return t >= fromMs && t < toMs; });
    const ids = new Set(joined.map(([id]) => id));
    const first = new Map<string, number>();
    for (const p of await positionStore.values()) {
      if (!ids.has(p.userId) || p.houseBotId) continue;
      const t = Date.parse(p.placedAt);
      if (Number.isFinite(t) && (!first.has(p.userId) || t < (first.get(p.userId) as number))) first.set(p.userId, t);
    }
    return joined.map(([id, u]) => ({ id, joinedAt: Date.parse(u.createdAt), firstBetAt: first.get(id) ?? null }));
  },
  async depositOutcomes(fromMs, toMs) {
    const [players, txns] = await Promise.all([memPlayers(), Promise.resolve(db.txn.listAll())]);
    const out: Array<{ status: string; createdAt: number }> = [];
    for (const t of txns) {
      if (t.type !== "DEPOSIT" || t.houseBotId || !players.has(t.userId)) continue;
      const at = Date.parse(t.createdAt);
      if (at >= fromMs && at < toMs) out.push({ status: t.status, createdAt: at });
    }
    return out;
  },
};

const twin = MEASURES_DAL_KIND === "prisma" ? prismaTwin : memoryTwin;

/* ── The reads the view calls ────────────────────────────────────────────────────────────────────────────────────── */

/** The funnel's daily totals, every dimension, over an inclusive EAT-day range. */
export function counterRows(fromDay: string, toDay: string): Promise<FunnelRow[]> {
  return funnelRows(fromDay, toDay);
}

/** Views of the home page per EAT day (absent day = no view counted). */
export async function homeViewsByDay(fromDay: string, toDay: string): Promise<Map<string, number>> {
  const rows: DayViews[] = await pathViewsByDay("/", fromDay, toDay);
  return new Map(rows.map((r) => [r.day, r.views]));
}

/** Landing visits per EAT day and campaign tag. */
export function campaignVisits(fromDay: string, toDay: string): Promise<CampaignVisits[]> {
  return campaignVisitsByDay(fromDay, toDay);
}

/** R1 — confirmed shortfall deposits completed in [from, to). */
export function shortfallDeposits(fromMs: number, toMs: number): Promise<DepositRead[]> { return twin.shortfallDeposits(fromMs, toMs); }
/** R2 — every confirmed player deposit completed in [from, to). */
export function confirmedDeposits(fromMs: number, toMs: number): Promise<DepositRead[]> { return twin.confirmedDeposits(fromMs, toMs); }
/** The unmarked bets of these players placed in [from, to] (inclusive: a follow-up's last instant counts). */
export function betsOf(userIds: readonly string[], fromMs: number, toMs: number): Promise<BetRead[]> {
  return userIds.length === 0 ? Promise.resolve([]) : twin.betsOf(userIds, fromMs, toMs);
}
/** R3 — the bets placed back from a deposit (S9). ⛔ Throws when this build does not carry S9's records. */
export function returnedBetsOf(userIds: readonly string[], fromMs: number, toMs: number): Promise<BetRead[]> {
  if (!S9_ON) return Promise.reject(new Error("journey-measures: S9's records are not on this build"));
  return userIds.length === 0 ? Promise.resolve([]) : twin.returnedBetsOf(userIds, fromMs, toMs);
}
/** R4 — players who joined in [from, to), each with the first unmarked bet ever placed. */
export function joinedPlayers(fromMs: number, toMs: number): Promise<JoinRead[]> { return twin.joinedPlayers(fromMs, toMs); }

/** W — player deposits started in [from, to), per EAT day, by outcome. REVERSED counts as confirmed (it went through). */
export async function depositOutcomesByDay(fromMs: number, toMs: number): Promise<Map<string, OutcomeDay>> {
  const out = new Map<string, OutcomeDay>();
  for (const r of await twin.depositOutcomes(fromMs, toMs)) {
    const day = eatDayKey(r.createdAt);
    const d = out.get(day) ?? { day, confirmed: 0, failed: 0, undecided: 0 };
    if (r.status === "CONFIRMED" || r.status === "REVERSED") d.confirmed++;
    else if (r.status === "FAILED" || r.status === "CANCELLED") d.failed++;
    else d.undecided++;
    out.set(day, d);
  }
  return out;
}
