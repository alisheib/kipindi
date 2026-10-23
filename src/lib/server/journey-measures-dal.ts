/**
 * THE MEASURES' READS — the Vodacom plan S13 WP5 (`docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md`,
 * "The SQL and DAL definitions"). Every number the measures view needs comes from one of these narrow reads, each with a
 * window or an id list, and the same answer on both stores.
 *
 *   counters      the daily funnel totals over a day range (`journey-funnel.ts`'s own read)
 *   homeViews     views of "/" per day (`site-visits.ts`'s narrow per-path read — never the top-50 ranking)
 *   campaigns     landing visits per day and campaign tag (`site-visits.ts`)
 *   R1            confirmed SHORTFALL deposits (origin `low_balance`) completed in [from, to), players, unmarked
 *   R2            every confirmed player deposit completed in [from, to), unmarked (each marked when a ticket followed it)
 *   bets          the unmarked bets of a set of players placed in [from, to] (R2's follow-ups, R3's candidates)
 *   R3            the bets placed back from a deposit (S9's `Position.origin = "deposit_return"`) — S9 only
 *   R4            players who joined in [from, to), with the first unmarked bet of each (each marked when it bought a ticket)
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
 * ⛔ A MASWALI MILLIONEA TICKET IS NO BET HERE (MASWALI-BUILD S6, OD-22, MB-46): every bet read leaves out the positions
 *    on a MASWALI market, on both twins, so a ticket is never a deposit's follow-up nor a new player's first bet. The
 *    counters never see one (the ticket purchase is its own action, which counts no funnel step), so the five measures
 *    and the comparison row stay the journey's alone. And measures 5 and 4b leave out a unit whose player bought a ticket
 *    within the window the measure reads for it (R2 and R4 mark it, `markDeposits` and `markSignUps`; one definition of
 *    a ticket, read only by `ticketPurchases` and `firstTickets`, each bounded in time), so a ticket-only sign-up can
 *    never drag measure 5 down and a figure never moves once its horizon has passed. `millioneaOpenings` gives the view
 *    the launch it marks.
 */
import type { Prisma, UserRole } from "@prisma/client";
import { eatDayKey } from "@/lib/eat-day";
import { DEPOSIT_FOLLOW_UP_MS, FIRST_BET_HORIZON_MS, type SavedQuestionBet } from "@/lib/journey/measures";
import { funnelRows, type FunnelRow } from "./journey-funnel";
import { S9_RECORDS } from "./journey-measures-s9";
import { marketStore, positionStore } from "./market-dal";
import { ticketStore, weekStore } from "./maswali-dal";
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
  /** ⭐ S6 · OD-22 — present (R2 only) when its player bought a Millionea ticket within this deposit's follow-up window. */
  ticketInHorizon?: true;
};
export type BetRead = { id: string; userId: string; marketId: string; side: string; stake: number; placedAt: number };
export type JoinRead = {
  id: string; joinedAt: number; firstBetAt: number | null;
  /** ⭐ S6 · OD-22 — present when this player bought a Millionea ticket within the first-bet horizon after joining. */
  ticketInHorizon?: true;
};
export type OutcomeDay = { day: string; confirmed: number; failed: number; undecided: number };

/** Which twin answers. */
export const MEASURES_DAL_KIND: "prisma" | "memory" = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? "prisma" : "memory";
/** This build carries S9's records (the seam is open). */
export const S9_ON = S9_RECORDS !== null;

const STAFF = [...STAFF_ROLES] as UserRole[];
const CHUNK = 1_000;
const ms = (d: Date | string | null | undefined): number | null => (d === null || d === undefined ? null : new Date(d).getTime());
/** ⚠️ TEST SEAM — the chunk size a suite shrinks to prove a read spans chunks; the product never sets it. */
let chunkSize = CHUNK;
export function __setMeasuresChunkForTests(n: number | null): void {
  if (n !== null && !(Number.isSafeInteger(n) && n >= 1)) throw new Error(`journey-measures: a chunk size is a whole number of at least 1 (got ${n})`);
  chunkSize = n ?? CHUNK;
}
const chunks = <T,>(xs: readonly T[]): T[][] => { const out: T[][] = []; for (let i = 0; i < xs.length; i += chunkSize) out.push(xs.slice(i, i + chunkSize)); return out; };
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

/** ⭐ S6 · OD-22 — a position on a Millionea week's market is a ticket, never a bet in these measures. */
const NOT_A_TICKET: Prisma.PositionWhereInput = { market: { productLine: { not: "MASWALI" } } };

async function prismaBets(userIds: readonly string[], fromMs: number, toMs: number, returnedOnly: boolean): Promise<BetRead[]> {
  const out: BetRead[] = [];
  for (const ids of chunks([...new Set(userIds)])) {
    const where: Record<string, unknown> = { userId: { in: ids }, houseBotId: null, placedAt: { gte: new Date(fromMs), lte: new Date(toMs) }, ...NOT_A_TICKET };
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
      const g = await client().position.groupBy({ by: ["userId"], where: { userId: { in: ids }, houseBotId: null, ...NOT_A_TICKET }, _min: { placedAt: true } });
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

/** ⭐ S6 · OD-22 — of these markets, the Millionea weeks' (the memory twin's `NOT_A_TICKET`). */
async function memTicketMarkets(marketIds: Iterable<string>): Promise<Set<string>> {
  const ids = [...new Set(marketIds)];
  if (ids.length === 0) return new Set();
  const books = await marketStore.bookByIds(ids);
  return new Set([...books.values()].filter((b) => b.productLine === "MASWALI").map((b) => b.id));
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
  const tickets = await memTicketMarkets(out.map((b) => b.marketId));
  return tickets.size === 0 ? out : out.filter((b) => !tickets.has(b.marketId));
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
    const mine = (await positionStore.values()).filter((p) => ids.has(p.userId) && !p.houseBotId);
    const tickets = await memTicketMarkets(mine.map((p) => p.marketId));
    for (const p of mine) {
      if (tickets.has(p.marketId)) continue;
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

/**
 * ⭐ S6 · OD-22 / OD-21 — ONE DEFINITION OF A MASWALI MILLIONEA TICKET, READ HERE ALONE: every ticket row, of ANY week —
 * the private drive's included (the drive is kept out of every measure) — in any state (a ticket bought and cancelled was
 * still bought). Its readers: `ticketPurchases` says WHEN each account bought one inside a window (4b, `markDeposits`);
 * `firstTickets` each account's FIRST ticket bought by an instant (5, `markSignUps`, and the harm watch's
 * `ticketHolders`).
 * ⛔ BOUNDED IN TIME AS WELL AS BY ACCOUNT (rounds 6 and 7): an id list (ids in chunks) AND a window on the ticket's own
 * `createdAt` on both twins — the `[userId, createdAt]` index on Postgres. R2 reads each chunk of its deposits over that
 * chunk's own span of horizons, so what it returns never grows with how long ago Millionea launched; R4 and the harm
 * watch read one row per buyer, its first ticket, which Postgres groups from that buyer's tickets bought by the bound
 * (the work grows with those tickets; the answer does not).
 */
export async function ticketPurchases(userIds: readonly string[], fromMs: number, toMs: number): Promise<Map<string, number[]>> {
  const ids = [...new Set(userIds)];
  const out = new Map<string, number[]>();
  const add = (userId: string, at: number) => { const l = out.get(userId) ?? []; l.push(at); out.set(userId, l); };
  if (ids.length === 0 || !(fromMs <= toMs)) return out;
  if (MEASURES_DAL_KIND === "prisma") {
    for (const chunk of chunks(ids)) {
      const rows = await client().maswaliTicket.findMany({
        where: { userId: { in: chunk }, createdAt: { gte: new Date(fromMs), lte: new Date(toMs) } },
        select: { userId: true, createdAt: true },
      });
      for (const r of rows) add(r.userId, r.createdAt.getTime());
    }
    return out;
  }
  for (const id of ids) {
    for (const t of await ticketStore.listForUser(id)) { const at = Date.parse(t.createdAt); if (at >= fromMs && at <= toMs) add(id, at); }
  }
  return out;
}

/**
 * ⭐ S6 · OD-22 (round 7) — each of these accounts' FIRST Millionea ticket bought at or before `byMs`: on Postgres one row
 * per buyer (grouped by account, its minimum `createdAt`), never every ticket each one ever bought.
 */
export async function firstTickets(userIds: readonly string[], byMs: number): Promise<Map<string, number>> {
  // Sorted, so its chunks are the same whatever order the rows came back in (round 14).
  const ids = [...new Set(userIds)].sort();
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  if (MEASURES_DAL_KIND === "prisma") {
    for (const chunk of chunks(ids)) {
      const g = await client().maswaliTicket.groupBy({ by: ["userId"], where: { userId: { in: chunk }, createdAt: { lte: new Date(byMs) } }, _min: { createdAt: true } });
      for (const r of g) if (r._min.createdAt) out.set(r.userId, r._min.createdAt.getTime());
    }
    return out;
  }
  for (const id of ids) {
    let first = Number.POSITIVE_INFINITY;
    for (const t of await ticketStore.listForUser(id)) { const at = Date.parse(t.createdAt); if (at <= byMs && at < first) first = at; }
    if (Number.isFinite(first)) out.set(id, first);
  }
  return out;
}

/** ⭐ S6 · OD-22 — of these accounts, the ones that had bought a Millionea ticket by `byMs` (the harm watch's second count). */
export async function ticketHolders(userIds: readonly string[], byMs: number): Promise<Set<string>> {
  return new Set((await firstTickets(userIds, byMs)).keys());
}

/** Whether any Millionea week, of either line, has ever opened: before one has no ticket can exist, so none is read. */
async function anyWeekOpened(): Promise<boolean> {
  return (await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING", "SETTLED", "VOIDED"], limit: 1 })).length > 0;
}

/**
 * ⭐ S6 · OD-22 (round 5, the lead's decision) — WHO 5 AND 4b LEAVE OUT: a unit whose player bought a Millionea ticket
 * WITHIN THAT UNIT'S OWN HORIZON — the window the measure itself reads for it, from the measures' own definitions: the
 * first-bet horizon after a sign-up (5, `FIRST_BET_HORIZON_MS`) and the follow-up window after a deposit (4b,
 * `DEPOSIT_FOLLOW_UP_MS`), both ends included, as the counts read them. A ticket of any week counts. So every figure is
 * final once its horizon has passed, in either launch order, and every window, before and after alike, is judged by the
 * same rule: no instant of a launch decides who is left out. The unit is marked (`ticketInHorizon`), never dropped, so
 * the view knows what each window left out. ⛔ No ticket is read at all while no Millionea week has ever opened, and
 * (round 7) none outside the units' own horizons: R2 reads each chunk of its deposits, taken in time order, over that
 * chunk's own span — its first deposit to its last deposit's follow-up end (`markDeposits`); R4 reads each sign-up's
 * FIRST ticket bought by the latest horizon's end (`markSignUps`), which is exact — no ticket precedes its own account,
 * so a first ticket at or before the sign-up's horizon end lies inside that horizon.
 */
async function markDeposits(rows: DepositRead[]): Promise<DepositRead[]> {
  if (rows.length === 0 || !(await anyWeekOpened())) return rows;
  const order = rows.map((_, i) => i).sort((a, b) => rows[a].at - rows[b].at);
  const marked = new Set<number>();
  for (let i = 0; i < order.length; i += chunkSize) {
    const part = order.slice(i, i + chunkSize);
    const from = rows[part[0]].at, to = rows[part[part.length - 1]].at + DEPOSIT_FOLLOW_UP_MS;
    const bought = await ticketPurchases(part.map((k) => rows[k].userId), from, to);
    for (const k of part) {
      const d = rows[k];
      if ((bought.get(d.userId) ?? []).some((t) => t >= d.at && t <= d.at + DEPOSIT_FOLLOW_UP_MS)) marked.add(k);
    }
  }
  return marked.size === 0 ? rows : rows.map((d, k) => (marked.has(k) ? { ...d, ticketInHorizon: true as const } : d));
}

async function markSignUps(rows: JoinRead[]): Promise<JoinRead[]> {
  if (rows.length === 0 || !(await anyWeekOpened())) return rows;
  let spanTo = Number.NEGATIVE_INFINITY;
  for (const p of rows) if (p.joinedAt + FIRST_BET_HORIZON_MS > spanTo) spanTo = p.joinedAt + FIRST_BET_HORIZON_MS;
  const first = await firstTickets(rows.map((p) => p.id), spanTo);
  if (first.size === 0) return rows;
  return rows.map((p) => {
    const t = first.get(p.id);
    return t !== undefined && t <= p.joinedAt + FIRST_BET_HORIZON_MS ? { ...p, ticketInHorizon: true as const } : p;
  });
}

/** R1 — confirmed shortfall deposits completed in [from, to). */
export function shortfallDeposits(fromMs: number, toMs: number): Promise<DepositRead[]> { return twin.shortfallDeposits(fromMs, toMs); }
/**
 * R2 — every confirmed player deposit completed in [from, to); ⭐ S6 · OD-22: one whose player bought a Millionea ticket
 * within its follow-up window is marked `ticketInHorizon` (measure 4b leaves it out).
 */
export async function confirmedDeposits(fromMs: number, toMs: number): Promise<DepositRead[]> {
  return markDeposits(await twin.confirmedDeposits(fromMs, toMs));
}
/** The unmarked bets of these players placed in [from, to] (inclusive: a follow-up's last instant counts). */
export function betsOf(userIds: readonly string[], fromMs: number, toMs: number): Promise<BetRead[]> {
  return userIds.length === 0 ? Promise.resolve([]) : twin.betsOf(userIds, fromMs, toMs);
}
/** R3 — the bets placed back from a deposit (S9). ⛔ Throws when this build does not carry S9's records. */
export function returnedBetsOf(userIds: readonly string[], fromMs: number, toMs: number): Promise<BetRead[]> {
  if (!S9_ON) return Promise.reject(new Error("journey-measures: S9's records are not on this build"));
  return userIds.length === 0 ? Promise.resolve([]) : twin.returnedBetsOf(userIds, fromMs, toMs);
}
/**
 * R4 — players who joined in [from, to), each with the first unmarked bet ever placed; ⭐ S6 · OD-22: one who bought a
 * Millionea ticket within the first-bet horizon after joining is marked `ticketInHorizon` (measure 5 leaves it out).
 */
export async function joinedPlayers(fromMs: number, toMs: number): Promise<JoinRead[]> {
  return markSignUps(await twin.joinedPlayers(fromMs, toMs));
}

/**
 * ⭐ S6 · MB-46 / OD-22 — WHEN MASWALI MILLIONEA OPENED, from the week records (both stores; a handful of rows):
 * `publicAt`, the first PUBLIC week's opening: the date the measures view marks, and the instant from which the harm
 * watch's second count splits the S16 series (round 4: the private drive's weeks never split it, and a day before the
 * first public week is a whole count). Who measures 5 and 4b leave out does not key on it (round 5, `markDeposits`, `markSignUps`).
 * Null when no public week has opened. A week opens once (`stampOpen` writes its `opensAt`); a DRAFT has not opened.
 */
export type MillioneaOpenings = { publicAt: number | null };
export async function millioneaOpenings(): Promise<MillioneaOpenings> {
  const weeks = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING", "SETTLED", "VOIDED"], visibility: "PUBLIC" });
  const t = weeks.map((w) => Date.parse(w.opensAt)).filter((x) => Number.isFinite(x));
  return { publicAt: t.length ? Math.min(...t) : null };
}

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
