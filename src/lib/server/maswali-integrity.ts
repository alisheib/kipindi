/**
 * MASWALI MILLIONEA — COMPLIANCE'S INTEGRITY READS (MASWALI-BUILD S4 part 3, S6; MASWALI-PLAN §7b S4 items 1 and 5, MB-35).
 *
 *   · the CLUSTER REPORT at close (MB-35): what it enforces is that Compliance sees coordinated coverage BEFORE a week
 *     pays — which groups of accounts the platform's records tie together hold the week's tickets, how much of the board
 *     each group and the whole week cover (S6), and, once no seal can change any more, whether a group holds a winning
 *     ticket (S6). It reads the platform's records over a window that ends at the week's close and says so, so the report
 *     built later for the evidence pack is the report Compliance saw (S6 review R2-3). And nothing the week's holders
 *     share can hide them (R3): a crowded place links nobody, yet it is still reported, on a line of its own, with the
 *     holders on it — never dropped, never merged into a group — and a group is one line however many accounts it
 *     holds, so a ring is one group. Every line, groups and crowded lines together, stands in ONE order
 *     (`clusterLineOrder`): a line holding a winning ticket first, then the groups the records tie, then shared
 *     answers, then crowded places (R4, R5) — and on the integrity page in three tiers (`clusterRows`, R6–R8): the
 *     weeks not yet settled, then the settled weeks still holding a share, then the decided ones;
 *   · PICK-SHIFT ALERTS while a week sells: a question whose answers swing hard among the latest tickets, the shape of
 *     a result leaking before its event.
 *
 * ⛔ COMPLIANCE ONLY. Pick aggregates never reach a player before settlement, and never the trading officer who seals
 *    (MR-14, MB-34): these reads are called only by `/admin/maswali/integrity` and the per-week evidence pack.
 * ⛔ The repository is public: this file says what the report is FOR, not what makes two accounts look connected.
 * ⛔ NO SILENT CAP (S6; the console's own law since `86eacd88`): every holder is read and every line reported — a report
 *    that stops at N lines answers "nothing else to look at" for a line it never read. A crowded line carries its count
 *    and its figures whole and the first of its holders; the rest open a page at a time from its row
 *    (`crowdedLineHolders`, R4), and the evidence pack's report reads them whole in its one statement (`crowdedWhole`,
 *    R5) — each whole list the same length as its count, an invariant the read asserts. A read that fails, on either
 *    store, degrades to "could not be read" (`readable: false`) rather than to an empty report or a throw (R6).
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "./prisma";
import { questionStore, ticketStore, weekStore, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { gradable } from "./maswali-service";
import { getAuditPage } from "./audit";
import { db } from "./store";
import { MAIN_COUNT, SLOT_COUNT, canonicalPicks, grade, slotLabel } from "@/lib/maswali-score";
import { shareStateOf } from "@/lib/maswali-share-note";
import { wholeReadCoverage, type ClusterCoverage } from "@/lib/maswali-cluster-coverage";

const onPostgres = () => hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const LOOKBACK_DAYS = 60;
/** Every way to answer the ten mains: the board a group's tickets are measured against. */
const BOARD = 2 ** MAIN_COUNT;
/** The link read's own bound (`connectedGroups`). Not exported. */
const CROWD_BOUND = 10;
/** R4 · how many of a crowded line's holders the report carries itself: the ones its row names. The rest open a page at
 *  a time from the row (`crowdedLineHolders`). */
export const CLUSTER_LINE_PREVIEW = 6;

/** The span of the platform's records a week's report reads: the days up to its close, fixed by the close itself. */
export type ClusterWindow = { from: string; to: string };

/** R2-3 · the week's window: it ends at the close (the scheduled close for a week not yet closed) — never at the build. */
export function clusterWindowOf(week: Pick<StoredWeek, "closedAt" | "closesAt">): ClusterWindow {
  const to = Date.parse(week.closedAt ?? week.closesAt);
  return { from: new Date(to - LOOKBACK_DAYS * 86_400_000).toISOString(), to: new Date(to).toISOString() };
}

export type ClusterGroup = {
  /** R3 · a stable id: the same members on the same basis give the same id on every read, so a link to one line opens
   *  that line, whatever else the report holds. */
  id: string;
  /** The line's accounts: every one of a group's; for a crowded line (R4) the first `CLUSTER_LINE_PREVIEW` in id order
   *  only — the rest a page at a time through `crowdedLineHolders` — or, R5, every one in a report built whole for the
   *  evidence pack (`crowdedWhole`), which reads no name. */
  accounts: Array<{ userId: string; holder: string; tickets: number }>;
  /** R4 · how many accounts the line holds in all. */
  accountCount: number;
  /** `crowded`: the holders on one crowded place, which links nobody (R3) — a line of its own. */
  basis: "records" | "answers" | "crowded";
  detail: string;
  /** S6 · MB-35 · the line's tickets in the week (cancelled ones excluded), and the distinct ways they answer the ten
   *  mains between them — how much of the board the line covers together: `combos` of `BOARD`, and that share 0…1. */
  tickets: number;
  combos: number;
  coverage: number;
  /** S6 · the line's winning tickets on the week's final results; null while the results are not final. */
  winners: number | null;
};
export type ClusterReport = {
  weekId: string; code: string; holders: number; readable: boolean;
  /** R6 · the week's own state as the report read it: the integrity page lists the weeks not yet decided first — still
   *  to pay, then settled holding a share (R8). */
  weekState: StoredWeek["state"];
  /** R7 · the week's winning shares still held — by Compliance, or by the settlement itself for review — so not yet
   *  decided: a settled week holding one is not done with (the lead's ruling) — the page lists it after the weeks still
   *  to pay and before the decided ones (R8). */
  undecidedShares: number;
  /** R4 · every line of the report — the groups and the crowded lines together — in ONE order (`clusterLineOrder`, the
   *  lead's R5 ruling): a line holding a winning ticket first (once the results are final); then the groups the records
   *  tie, then shared answers, then crowded places; then the winning tickets, the reach and the accounts; and last the
   *  stable id, so the order is the same on every read. */
  lines: ClusterGroup[];
  /** The groups among `lines` (bases `records` and `answers`), in its order. */
  groups: ClusterGroup[];
  /** R3 · the crowded lines among `lines`, in its order — never merged into a group. */
  crowded: ClusterGroup[];
  /** R2-3 · the records the report read: the window that ends at the week's close. */
  window: ClusterWindow;
  /** R2-9 · MB-35's weekly figure: the distinct ways the week's tickets answer the ten mains, and that share of `BOARD`. */
  combos: number;
  boardCoverage: number;
  /** S5 (ad96345b6) · how much of the record the report considered and showed — the integrity page's one disclosure. This
   *  report reads every holder and carries every line, so it says so (`wholeReadCoverage`; S6-INT, the lead's ruling). */
  coverage: ClusterCoverage;
  /**
   * S6 · whether `winners` speaks: the week has settled, or its objection window has closed — R2-2: a correction or an
   * upheld objection can still change the graded set inside the window (MB-34), so a winner is not a fact before it
   * closes. The release refuses while the window is open, so the count still arrives before the week pays (MB-35).
   */
  resultsFinal: boolean;
  /** S6 · MB-35 · the lines — groups and crowded lines — holding at least one winning ticket: the fact Compliance weighs
   *  before the week pays. */
  groupsWithWinner: number;
};

/** Display names for the accounts in the report, read in batches (never one row per account, never a cap). */
async function holderNames(userIds: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(userIds)];
  for (let i = 0; i < ids.length; i += 5_000) {
    // ⚠️ The memory store answers synchronously: never `.catch` the call itself, catch the awaited read.
    let rows: Awaited<ReturnType<typeof db.user.findByIds>> = [];
    try { rows = await db.user.findByIds(ids.slice(i, i + 5_000)); } catch { rows = []; }
    for (const u of rows) out.set(u.id, u.displayName?.trim() || `…${u.phoneE164.slice(-4)}`);
  }
  return out;
}

/** A ticket's answers to the ten mains as one key: the point of the board it covers. */
const mainsOf = (t: StoredTicket): string => t.selections.slice(0, MAIN_COUNT).join("");
/** The same key in SQL, for a `MaswaliTicket` row aliased `t` (its answers are a JSON array of "YES" and "NO", neither a
 *  prefix of the other, so the joined key is as distinct as the answers). Built from `MAIN_COUNT`, never typed. */
const MAINS_SQL = Prisma.raw(Array.from({ length: MAIN_COUNT }, (_, i) => `coalesce(t.selections->>${i}, '')`).join(" || "));

/** R3 · a line's stable id: its basis and its members in id order (account ids are ASCII, so the code-unit order here is
 *  the byte order the SQL sorts by). The SQL computes the same for a crowded place, whose members it never returns. */
const lineId = (basis: ClusterGroup["basis"], users: readonly string[]): string =>
  createHash("md5").update(`${basis}:${[...users].sort().join(",")}`).digest("hex").slice(0, 16);

/** A line's figures from its holders' tickets: how many, the ways they cover, and the winning ones among them. */
function figuresOf(users: readonly string[], byUser: ReadonlyMap<string, StoredTicket[]>, winning: ReadonlySet<string>) {
  const held = users.flatMap((u) => byUser.get(u) ?? []);
  return { tickets: held.length, combos: new Set(held.map(mainsOf)).size, winners: held.filter((t) => winning.has(t.id)).length };
}

/** R4 · a crowded place's line as the read returns it: its id, how many holders it has, the first of them in id order,
 *  and its figures — never its whole list. */
type CrowdedPlace = {
  id: string; count: number; preview: string[]; tickets: number; combos: number; winners: number;
  /** R5 · every holder in id order, read in the same statement — only when the report is built whole, for the pack. */
  members: string[] | null;
};
/** The week's holders the records tie together (`groups`), and the crowded places they share (`crowded`). */
type Links = { groups: string[][]; crowded: CrowdedPlace[] };

/**
 * The places two or more of the week's holders share inside its window, each marked crowded or not, and each crowded
 * one with its line's id — the one rule the report's read and the read of one crowded line's holders share (Postgres).
 */
const placesSql = (weekId: string, w: ClusterWindow) => Prisma.sql`
  WITH holders AS (
    SELECT DISTINCT "userId" AS u FROM "MaswaliTicket" WHERE "cycleId" = ${weekId} AND "status" <> 'CANCELLED'
  ), seen AS (
    SELECT DISTINCT a.ip, a."actorId" AS u FROM "AuditLog" a
     WHERE EXISTS (SELECT 1 FROM holders h WHERE h.u = a."actorId")
       AND a.ip IS NOT NULL AND a."createdAt" >= ${w.from}::timestamp AND a."createdAt" <= ${w.to}::timestamp
  ), shared AS (
    SELECT ip FROM seen GROUP BY ip HAVING count(*) > 1
  ), crowd AS (
    SELECT l.ip, count(DISTINCT l."actorId") AS n FROM "AuditLog" l JOIN shared s ON s.ip = l.ip
     WHERE l.category = 'AUTH' AND l."actorId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM holders h WHERE h.u = l."actorId")
       AND l."createdAt" >= ${w.from}::timestamp AND l."createdAt" <= ${w.to}::timestamp
     GROUP BY l.ip
  ), places AS (
    SELECT s.ip, COALESCE(c.n, 0) > ${CROWD_BOUND} AS crowded FROM shared s LEFT JOIN crowd c ON c.ip = s.ip
  ), lines AS (
    SELECT p.ip, left(md5('crowded:' || string_agg(seen.u, ',' ORDER BY seen.u COLLATE "C")), 16) AS id
      FROM places p JOIN seen ON seen.ip = p.ip WHERE p.crowded GROUP BY p.ip
  )`;

/** The memory twin's read (a test seam: production reads the tables above, by the same rule). */
function memoryPlaces(holders: ReadonlySet<string>, w: ClusterWindow): { places: Array<{ users: string[]; crowded: boolean }>; devices: string[][] } {
  const fromMs = Date.parse(w.from), toMs = Date.parse(w.to);
  const put = (m: Map<string, Set<string>>, k: string, u: string) => { const s = m.get(k) ?? new Set<string>(); s.add(u); m.set(k, s); };
  const byAddress = new Map<string, Set<string>>(), byDevice = new Map<string, Set<string>>();
  const crowdAddress = new Map<string, Set<string>>(), crowdDevice = new Map<string, Set<string>>();
  for (const e of getAuditPage({ limit: 10_000 })) {
    const at = Date.parse(e.createdAt);
    if (!e.actorId || !e.ip || !(at >= fromMs && at <= toMs)) continue;
    const device = e.userAgent ? JSON.stringify([e.ip, e.userAgent]) : null;
    if (holders.has(e.actorId)) { put(byAddress, e.ip, e.actorId); if (device) put(byDevice, device, e.actorId); }
    else if (e.category === "AUTH") { put(crowdAddress, e.ip, e.actorId); if (device) put(crowdDevice, device, e.actorId); }
  }
  return {
    places: [...byAddress].filter(([, s]) => s.size > 1).map(([k, s]) => ({ users: [...s].sort(), crowded: (crowdAddress.get(k)?.size ?? 0) > CROWD_BOUND })),
    devices: [...byDevice].filter(([k, s]) => s.size > 1 && (crowdDevice.get(k)?.size ?? 0) <= CROWD_BOUND).map(([, s]) => [...s]),
  };
}

/** Where the suites make the report's link read fail (R6). Empty outside them. (The statements it sends are counted at
 *  the client, by the suite — R7 — so a statement added without a word here is counted all the same.) */
type ClusterReadSeams = {
  /** At the start of the read, on either store: a throw here is the read failing. */
  beforeRead?: () => void;
};
let readSeams: ClusterReadSeams = {};
/** ⚠️ TEST SEAM ONLY — never call this from application code. `null` clears it. */
export function __setClusterReadSeamsForTests(s: ClusterReadSeams | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setClusterReadSeamsForTests is a test seam and refuses to run in production.");
  readSeams = s ?? {};
}

/**
 * Accounts among the week's holders the platform's records tie together, read over the week's own window (R2-3), as
 * groups of two or more. ⛔ What it enforces (R3): a crowded place links nobody and is returned on its own (`crowded`),
 * never merged into a group and never dropped; a group is one group however many accounts it holds. R4 · a crowded
 * place comes back as what its line shows — its count, the first of its holders, its figures — never its list; R5 ·
 * `whole` (the evidence pack's read) brings every crowded line's holders in the same one statement — the list and the
 * count come from one group of one statement, so their lengths agree: an invariant, asserted, not a way the read fails.
 * R6 · a read that fails returns null on either store (the report says `readable: false`).
 */
async function connectedGroups(
  weekId: string, byUser: ReadonlyMap<string, StoredTicket[]>, winning: ReadonlySet<string>, w: ClusterWindow, whole: boolean,
): Promise<Links | null> {
  if (byUser.size < 2) return { groups: [], crowded: [] };
  const links = new Map<string, Set<string>>();
  const crowded: CrowdedPlace[] = [];
  const add = (users: readonly string[]) => {
    for (const u of users) { const s = links.get(u) ?? new Set<string>(); for (const v of users) if (v !== u) s.add(v); links.set(u, s); }
  };
  if (onPostgres()) {
    const c = prisma();
    if (!c) return null;
    try {
      readSeams.beforeRead?.();
      // S6 · the week's holders as a subquery, never a bound list of ids (no bind-parameter ceiling, nothing sliced), and
      // every place the read finds (no LIMIT): the report's population is the week's, whole. R4 · a crowded place returns
      // its line — its count, its first holders, its tickets, the ways they cover and its winning tickets — never its list.
      // The winning tickets go in as one array (an empty one written out, so its type is never left to inference).
      const winIds = winning.size > 0 ? Prisma.sql`${[...winning]}::text[]` : Prisma.sql`ARRAY[]::text[]`;
      // A crowded place's holders in id order: the first of them for the console, every one for the pack (R5).
      const listed = whole
        ? Prisma.sql`array_agg(seen.u ORDER BY seen.u COLLATE "C") FILTER (WHERE p.crowded)`
        : Prisma.sql`(array_agg(seen.u ORDER BY seen.u COLLATE "C") FILTER (WHERE p.crowded))[1:${CLUSTER_LINE_PREVIEW}::int]`;
      const places = await c.$queryRaw<Array<{
        crowded: boolean; id: string | null; holders: number; users: string[] | null; listed: string[] | null;
        tickets: number | null; combos: number | null; winners: number | null;
      }>>`
        ${placesSql(weekId, w)}, figs AS (
          SELECT l.ip, count(t.id)::int AS tickets, count(DISTINCT ${MAINS_SQL})::int AS combos,
                 (count(t.id) FILTER (WHERE t.id = ANY(${winIds})))::int AS winners
            FROM lines l JOIN seen ON seen.ip = l.ip
            JOIN "MaswaliTicket" t ON t."userId" = seen.u AND t."cycleId" = ${weekId} AND t."status" <> 'CANCELLED'
           GROUP BY l.ip
        ), members AS (
          SELECT p.ip, p.crowded, count(*)::int AS holders,
                 array_agg(seen.u) FILTER (WHERE NOT p.crowded) AS users, ${listed} AS listed
            FROM places p JOIN seen ON seen.ip = p.ip
           GROUP BY p.ip, p.crowded
        )
        SELECT m.crowded, l.id, m.holders, m.users, m.listed, f.tickets, f.combos, f.winners
          FROM members m LEFT JOIN lines l ON l.ip = m.ip LEFT JOIN figs f ON f.ip = m.ip`;
      const devices = await c.$queryRaw<Array<{ users: string[] }>>`
        WITH holders AS (
          SELECT DISTINCT "userId" AS u FROM "MaswaliTicket" WHERE "cycleId" = ${weekId} AND "status" <> 'CANCELLED'
        ), seen AS (
          SELECT DISTINCT a.ip, a."userAgent" AS ua, a."actorId" AS u FROM "AuditLog" a
           WHERE EXISTS (SELECT 1 FROM holders h WHERE h.u = a."actorId")
             AND a.ip IS NOT NULL AND a."userAgent" IS NOT NULL AND a."createdAt" >= ${w.from}::timestamp AND a."createdAt" <= ${w.to}::timestamp
        ), shared AS (
          SELECT ip, ua FROM seen GROUP BY ip, ua HAVING count(*) > 1
        ), crowd AS (
          SELECT l.ip, l."userAgent" AS ua, count(DISTINCT l."actorId") AS n FROM "AuditLog" l JOIN shared s ON s.ip = l.ip AND s.ua = l."userAgent"
           WHERE l.category = 'AUTH' AND l."actorId" IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM holders h WHERE h.u = l."actorId")
             AND l."createdAt" >= ${w.from}::timestamp AND l."createdAt" <= ${w.to}::timestamp
           GROUP BY l.ip, l."userAgent"
        )
        SELECT array_agg(seen.u) AS users FROM seen JOIN shared ON shared.ip = seen.ip AND shared.ua = seen.ua
          LEFT JOIN crowd ON crowd.ip = seen.ip AND crowd.ua = seen.ua
         WHERE COALESCE(crowd.n, 0) <= ${CROWD_BOUND}
         GROUP BY seen.ip, seen.ua`;
      // R3 · inside the window, on both sides — the window the report names.
      const numbers = await c.$queryRaw<Array<{ users: string[] }>>`
        SELECT array_agg(DISTINCT "userId") AS users FROM "Transaction"
         WHERE "userId" IN (SELECT DISTINCT "userId" FROM "MaswaliTicket" WHERE "cycleId" = ${weekId} AND "status" <> 'CANCELLED')
           AND type IN ('DEPOSIT', 'WITHDRAWAL') AND msisdn IS NOT NULL
           AND "createdAt" >= ${w.from}::timestamp AND "createdAt" <= ${w.to}::timestamp
         GROUP BY msisdn HAVING count(DISTINCT "userId") > 1`;
      for (const r of places) {
        if (!r.crowded) { if (r.users) add(r.users); continue; }
        if (!r.id) continue;
        const list = r.listed ?? [];
        // R5 · an invariant (one group of one statement over distinct pairs), asserted: were it ever broken the read
        // would be no read, and would say so (`readable: false`) rather than carry a short list.
        if (whole && list.length !== r.holders) throw new Error("a crowded line's holders did not add up to its count");
        crowded.push({
          id: r.id, count: r.holders, preview: list.slice(0, CLUSTER_LINE_PREVIEW), members: whole ? list : null,
          tickets: r.tickets ?? 0, combos: r.combos ?? 0, winners: r.winners ?? 0,
        });
      }
      for (const r of [...devices, ...numbers]) add(r.users);
    } catch (err) {
      console.error("[maswali-integrity] the connection read failed:", (err as Error)?.message ?? err);
      return null;
    }
  } else {
    // The memory store: a test seam only — production reads the tables above, by the same rules, and both return the
    // same lines. R6 · and it fails as they do: a read that throws returns null, never a throw out of the report.
    try {
      readSeams.beforeRead?.();
      const fromMs = Date.parse(w.from), toMs = Date.parse(w.to);
      const { places, devices } = memoryPlaces(new Set(byUser.keys()), w);
      for (const p of places) {
        if (!p.crowded) { add(p.users); continue; }
        crowded.push({
          id: lineId("crowded", p.users), count: p.users.length, preview: p.users.slice(0, CLUSTER_LINE_PREVIEW), members: whole ? p.users : null,
          ...figuresOf(p.users, byUser, winning),
        });
      }
      for (const d of devices) add(d);
      const byNumber = new Map<string, Set<string>>();
      for (const u of byUser.keys()) {
        for (const t of await db.txn.findByUserTypes(u, ["DEPOSIT", "WITHDRAWAL"], 10_000)) {
          const at = Date.parse(t.createdAt);
          if (t.msisdn && at >= fromMs && at <= toMs) { const s = byNumber.get(t.msisdn) ?? new Set<string>(); s.add(u); byNumber.set(t.msisdn, s); }
        }
      }
      for (const s of byNumber.values()) if (s.size > 1) add([...s]);
    } catch (err) {
      console.error("[maswali-integrity] the connection read failed:", (err as Error)?.message ?? err);
      return null;
    }
  }
  // Connected components over the links, so a chain A–B–C reads as one group.
  const seen = new Set<string>(), groups: string[][] = [];
  for (const u of links.keys()) {
    if (seen.has(u)) continue;
    const stack = [u], group: string[] = [];
    while (stack.length) { const x = stack.pop()!; if (seen.has(x)) continue; seen.add(x); group.push(x); for (const y of links.get(x) ?? []) if (!seen.has(y)) stack.push(y); }
    if (group.length > 1) groups.push(group.sort());
  }
  return { groups, crowded };
}

/** The bases in the order Compliance reads them (R5): what the records tie, then shared answers, then crowded places —
 *  which link nobody and so never rank above a group. */
const BASIS_RANK: Readonly<Record<ClusterGroup["basis"], number>> = { records: 0, answers: 1, crowded: 2 };

/**
 * ⭐ THE REPORT'S ONE ORDER (R4; the lead's R5 ruling), the report's and the integrity page's alike: a line holding a
 * winning ticket first (once the results are final); then by basis — the groups the records tie, then shared answers,
 * then crowded places; then the winning tickets, the reach (the ways covered) and the accounts; and last the stable id,
 * so the order is the same on every read.
 */
export function clusterLineOrder(x: ClusterGroup, y: ClusterGroup): number {
  const won = (g: ClusterGroup) => ((g.winners ?? 0) > 0 ? 0 : 1);
  return won(x) - won(y) || BASIS_RANK[x.basis] - BASIS_RANK[y.basis] || (y.winners ?? 0) - (x.winners ?? 0)
    || y.combos - x.combos || y.accountCount - x.accountCount || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
}

/** R8 · a week's TIER on the integrity page (the lead's ruling): 0 · not yet settled (still to pay, its winners perhaps
 *  not counted yet); 1 · settled, still holding a winning share (Compliance's, or the settlement's own for review — the
 *  share itself is never paged away: the console's held-shares table lists every one); 2 · decided — voided, or
 *  settled with no share held (a voided week's refunds still unpaid are the console's own alert). */
const paidOut = (r: ClusterReport): number =>
  (r.weekState === "VOIDED" || (r.weekState === "SETTLED" && r.undecidedShares === 0) ? 2 : r.weekState === "SETTLED" ? 1 : 0);

/** One line of one week's report, as the integrity page lists it. */
export type ClusterRow = { report: ClusterReport; line: ClusterGroup };

/**
 * ⭐ THE INTEGRITY PAGE'S ORDER OVER THE WEEKS IT SHOWS (the lead's R6–R8 rulings), in THREE tiers (`paidOut`): the
 * weeks not yet settled first — still to pay, their winners perhaps not counted yet — then the settled weeks still
 * holding a share, then the decided weeks; so neither a held week's nor a decided week's winning lines ever push a
 * pending week off the first page (MB-35) — and within each tier, the one order (`clusterLineOrder`).
 * The weeks' own order stands for a tie (the sort is stable), and a report that could not be built adds no line. Pure.
 */
export function clusterRows(reports: ReadonlyArray<ClusterReport | null>): ClusterRow[] {
  return reports.flatMap((r) => (r ? r.lines.map((line) => ({ report: r, line })) : []))
    .sort((a, b) => paidOut(a.report) - paidOut(b.report) || clusterLineOrder(a.line, b.line));
}

/**
 * ⭐ The cluster report for one week that has closed (its commitment is fixed, so the report describes what will pay).
 * S6 · MB-35 · every line says how much of the board its accounts cover between them and, once the week's results are
 * final, how many winning tickets it holds — in its `detail`, the sentence the integrity page prints, and in its fields
 * for the evidence pack. R4 · a line holding a winner comes first, whatever its basis: it is the one to look at before
 * the release. `now` decides only whether the objection window has closed; the records read are the week's own window
 * (R2-3). R5 · `crowdedWhole` is the evidence pack's read: every crowded line carries every one of its holders, read in
 * the report's one statement with the report's own ticket counts, and no name is read at all (the pack carries ids
 * only, so `holder` is left empty).
 */
export async function clusterReport(week: StoredWeek, now: Date = new Date(), o: { crowdedWhole?: boolean } = {}): Promise<ClusterReport> {
  const whole = o.crowdedWhole === true;
  const tickets = (await ticketStore.listForWeek(week.id)).filter((t) => t.status !== "CANCELLED");
  const byUser = new Map<string, StoredTicket[]>();
  for (const t of tickets) byUser.set(t.userId, [...(byUser.get(t.userId) ?? []), t]);
  const userIds = [...byUser.keys()];
  const span = clusterWindowOf(week);

  // A winning ticket, on the week's own record: the settlement's stamp once settled; the grader's answer once the
  // objection window has closed (R2-2: inside it a correction or an upheld objection can still change the graded set);
  // nothing before (a provisional winner is not a fact Compliance can act on).
  const resultsFinal = week.state === "SETTLED" || (week.objectionsCloseAt !== null && Date.parse(week.objectionsCloseAt) <= now.getTime());
  const gq = week.state !== "SETTLED" && resultsFinal ? gradable(await questionStore.listForWeek(week.id)) : null;
  const wins = (t: StoredTicket): boolean => {
    if (week.state === "SETTLED") return t.won === true;
    if (!gq) return false;
    try {
      const g = grade(gq, canonicalPicks(t.selections));
      return g.kind === "GRADED" && g.wins;
    } catch {
      return false;
    }
  };
  // R4 · the week's winning tickets, once its results are final: one set every line counts its winners from.
  const winning = new Set(resultsFinal ? tickets.filter(wins).map((t) => t.id) : []);

  const connected = await connectedGroups(week.id, byUser, winning, span, whole);
  // The same fifteen answers held by different accounts.
  const byPicks = new Map<string, Set<string>>();
  for (const t of tickets) { const s = byPicks.get(t.picksKey) ?? new Set<string>(); s.add(t.userId); byPicks.set(t.picksKey, s); }
  const raw: Array<{ basis: "records" | "answers"; users: string[] }> = [
    ...(connected?.groups ?? []).map((users) => ({ basis: "records" as const, users: [...users].sort() })),
    ...[...byPicks.values()].filter((s) => s.size >= 2).map((s) => ({ basis: "answers" as const, users: [...s].sort() })),
  ];
  const places = connected?.crowded ?? [];

  const names = whole ? null : await holderNames([...raw.flatMap((g) => g.users), ...places.flatMap((p) => p.preview)]);
  const account = (u: string) => ({ userId: u, holder: names ? names.get(u) ?? "(closed account)" : "", tickets: byUser.get(u)?.length ?? 0 });
  const lineOf = (o: { id: string; basis: ClusterGroup["basis"]; accounts: ClusterGroup["accounts"]; accountCount: number; tickets: number; combos: number; winners: number }): ClusterGroup => {
    const winners = resultsFinal ? o.winners : null;
    const n = o.accountCount.toLocaleString("en");
    const who = o.basis === "records" ? `${n} accounts the platform's records connect`
      : o.basis === "answers" ? `${n} accounts hold the same fifteen answers`
      : `${n} holders share one crowded place, which ties no one together`;
    const reach = `${o.tickets.toLocaleString("en")} ${o.tickets === 1 ? "ticket covers" : "tickets cover"} ${o.combos.toLocaleString("en")} of the ${BOARD.toLocaleString("en")} ways to answer the ten mains`;
    const outcome = winners === null ? "" : winners === 0 ? " · no winning ticket" : ` · holds ${winners.toLocaleString("en")} winning ${winners === 1 ? "ticket" : "tickets"}`;
    return {
      id: o.id, basis: o.basis, detail: `${who} · ${reach}${outcome}`, accounts: o.accounts, accountCount: o.accountCount,
      tickets: o.tickets, combos: o.combos, coverage: o.combos / BOARD, winners,
    };
  };
  const all = [
    ...raw.map(({ basis, users }) => lineOf({ id: lineId(basis, users), basis, accounts: users.map(account), accountCount: users.length, ...figuresOf(users, byUser, winning) })),
    ...places.map((p) => lineOf({
      id: p.id, basis: "crowded", accounts: (p.members ?? p.preview).map(account), accountCount: p.count, tickets: p.tickets, combos: p.combos, winners: p.winners,
    })),
  ];
  // R3 · one line per id: everything a line says is its holders', so a second line with the same holders on the same
  // basis (two answer sets they share, two crowded places) would only repeat it — and each id is then one line's.
  // R4 · and ONE order for every line, groups and crowded lines together (R5's rule).
  const lines = [...new Map(all.map((g) => [g.id, g] as const)).values()].sort(clusterLineOrder);
  const weekCombos = new Set(tickets.map(mainsOf)).size;
  return {
    weekId: week.id, code: week.code, holders: userIds.length, readable: connected !== null, weekState: week.state,
    undecidedShares: tickets.filter((t) => t.status === "SETTLED" && t.won === true && shareStateOf(t.frozenReason) === "held").length,
    lines, groups: lines.filter((g) => g.basis !== "crowded"), crowded: lines.filter((g) => g.basis === "crowded"),
    window: span, combos: weekCombos, boardCoverage: weekCombos / BOARD, coverage: wholeReadCoverage(userIds.length, lines.length),
    resultsFinal, groupsWithWinner: lines.filter((g) => (g.winners ?? 0) > 0).length,
  };
}

/**
 * R4 · ONE crowded line's holders, a page at a time and in id order: what its row opens on the integrity page. The line
 * is found by its id (`ClusterGroup.id`), over the week's own window and by the report's own rule; an id that names no
 * crowded line of the week answers no holder. Null when the read fails. ⛔ One line, one page: the evidence pack never
 * reads through here (R5) — a report built `crowdedWhole` brings every line's holders in one statement.
 */
export async function crowdedLineHolders(
  weekId: string, id: string, page: number, perPage: number,
): Promise<{ total: number; accounts: ClusterGroup["accounts"] } | null> {
  const week = await weekStore.get(weekId);
  if (!week) return { total: 0, accounts: [] };
  const w = clusterWindowOf(week);
  const per = Math.max(1, Math.floor(perPage) || 1), pg = Math.max(1, Math.floor(page) || 1);
  const counts = new Map<string, number>();
  for (const t of await ticketStore.listForWeek(week.id)) if (t.status !== "CANCELLED") counts.set(t.userId, (counts.get(t.userId) ?? 0) + 1);
  let total = 0, ids: string[] = [];
  if (onPostgres()) {
    const c = prisma();
    if (!c) return null;
    try {
      const rows = await c.$queryRaw<Array<{ total: number; users: string[] }>>`
        ${placesSql(week.id, w)}, one AS (SELECT ip FROM lines WHERE id = ${id} LIMIT 1)
        SELECT (SELECT count(*)::int FROM seen JOIN one ON one.ip = seen.ip) AS total,
               ARRAY(SELECT seen.u FROM seen JOIN one ON one.ip = seen.ip ORDER BY seen.u COLLATE "C"
                      OFFSET ${(pg - 1) * per}::int LIMIT ${per}::int) AS users`;
      total = rows[0]?.total ?? 0;
      ids = rows[0]?.users ?? [];
    } catch (err) {
      console.error("[maswali-integrity] a crowded line's holders could not be read:", (err as Error)?.message ?? err);
      return null;
    }
  } else {
    const place = memoryPlaces(new Set(counts.keys()), w).places.find((p) => p.crowded && lineId("crowded", p.users) === id);
    const users = place?.users ?? [];
    total = users.length;
    ids = users.slice((pg - 1) * per, pg * per);
  }
  const names = await holderNames(ids);
  return { total, accounts: ids.map((u) => ({ userId: u, holder: names.get(u) ?? "(closed account)", tickets: counts.get(u) ?? 0 })) };
}

// ── MB-94 · A SEAL FROM A NEW DEVICE ─────────────────────────────────────────────────────────────────

export const SEAL_DEVICE_ACTION = "maswali.seal.device";
export const SEAL_NEW_DEVICE_ACTION = "maswali.seal.new_device";
/** A seal whose device could not be checked against the officer's own history: Compliance sees it, never an all-clear. */
export const SEAL_DEVICE_UNCHECKED_ACTION = "maswali.seal.device_unchecked";

/**
 * The officer's own seal-device history, counted EXACTLY: every seal-device row they have, and those from this same
 * device. Counted in the read on both stores (`getAuditForActorDurable`'s `actions` and `from` filters), so an officer's
 * other audit rows, however many, can never crowd a device out of the answer (S5 review: a window over the newest rows of
 * every action went silent for a busy officer, and the integrity page then read all clear).
 */
type SealDeviceHistory = { seals: number; fromDevice: number };
type SealDeviceAuditPort = {
  history: (officerId: string, device: { ip: string | null; userAgent: string | null }) => Promise<SealDeviceHistory>;
  write: (entry: Parameters<typeof import("./audit").audit>[0]) => Promise<{ recorded: boolean }>;
};

async function defaultSealDevicePort(): Promise<SealDeviceAuditPort> {
  const { getAuditForActorDurable, audit } = await import("./audit");
  return {
    history: async (officerId, device) => {
      const [all, same] = await Promise.all([
        getAuditForActorDurable(officerId, { actions: [SEAL_DEVICE_ACTION], limit: 1 }),
        getAuditForActorDurable(officerId, { actions: [SEAL_DEVICE_ACTION], from: device, limit: 1 }),
      ]);
      return { seals: all.total, fromDevice: same.total };
    },
    write: audit,
  };
}

/**
 * After a seal, a void or a correction: record where it came from, and raise a COMPLIANCE record when the officer has
 * never sealed from there before — or when that could not be checked (`SEAL_DEVICE_UNCHECKED_ACTION`), so the integrity
 * page never reads an unread history as all clear. ⛔ Never blocks the seal (it has already landed) and never throws.
 * True only when the history was read and every required audit row was recorded.
 */
export async function noteSealDevice(
  input: { officerId: string; weekId: string; slots: number[]; ip: string | null; userAgent: string | null },
  injected?: SealDeviceAuditPort,
): Promise<boolean> {
  try {
    const port = injected ?? await defaultSealDevicePort();
    // Read BEFORE this seal's own device row is written, or the count would always include it.
    const history = await port.history(input.officerId, { ip: input.ip, userAgent: input.userAgent }).catch(() => null);
    const device = await port.write({ category: "ADMIN", action: SEAL_DEVICE_ACTION, actorId: input.officerId, targetType: "MaswaliCycle", targetId: input.weekId,
      payload: { slots: input.slots }, ip: input.ip, userAgent: input.userAgent });
    let flagRecorded = true;
    if (history === null) {
      const unchecked = await port.write({ category: "COMPLIANCE", action: SEAL_DEVICE_UNCHECKED_ACTION, actorId: input.officerId, targetType: "MaswaliCycle", targetId: input.weekId,
        payload: { slots: input.slots }, ip: input.ip, userAgent: input.userAgent });
      flagRecorded = unchecked.recorded;
    } else if (history.fromDevice === 0) {
      const newDevice = await port.write({ category: "COMPLIANCE", action: SEAL_NEW_DEVICE_ACTION, actorId: input.officerId, targetType: "MaswaliCycle", targetId: input.weekId,
        payload: { slots: input.slots, firstSeal: history.seals === 0 }, ip: input.ip, userAgent: input.userAgent });
      flagRecorded = newDevice.recorded;
    }
    return history !== null && device.recorded && flagRecorded;
  } catch { return false; /* a note about a seal that already landed never surfaces as the seal failing */ }
}

/** One record the integrity page lists: a seal from a new device, or one whose device could not be checked. */
export type SealDeviceFlag = { officerId: string | null; weekId: string | null; at: string; kind: "new" | "unchecked"; firstSeal: boolean };

/** The recent seal-device flags, newest first, for the integrity page — both kinds, so an unchecked seal is never hidden. */
export async function recentNewDeviceSeals(limit = 20): Promise<SealDeviceFlag[] | null> {
  try {
    const { getAuditByActionsDurable } = await import("./audit");
    // Both are COMPLIANCE rows: naming the category makes the read a range scan of one category (`getAuditByActionsDurable`).
    const r = await getAuditByActionsDurable([SEAL_NEW_DEVICE_ACTION, SEAL_DEVICE_UNCHECKED_ACTION], { category: "COMPLIANCE", limit });
    return r.entries.map((e) => ({ officerId: e.actorId, weekId: e.targetId ?? null, at: e.createdAt,
      kind: e.action === SEAL_DEVICE_UNCHECKED_ACTION ? "unchecked" as const : "new" as const,
      firstSeal: !!(e.payload as { firstSeal?: boolean } | null)?.firstSeal }));
  } catch {
    return null;
  }
}

/** A question whose answers swung among the latest tickets of a selling week. */
export type PickShift = { weekId: string; code: string; slot: number; label: string; before: number; recent: number; recentTickets: number };

/**
 * PICK SHIFTS while a week sells: for each question, the share of YES among the tickets of the last `windowHours`
 * against the share before; a swing of at least `minSwing` (0…1) over at least `minRecent` recent tickets is reported.
 */
export async function pickShifts(opts: { windowHours?: number; minSwing?: number; minRecent?: number } = {}): Promise<PickShift[]> {
  const windowMs = (opts.windowHours ?? 2) * 3_600_000, minSwing = opts.minSwing ?? 0.3, minRecent = opts.minRecent ?? 30;
  const out: PickShift[] = [];
  for (const w of await weekStore.list({ states: ["OPEN"] })) {
    const live = await ticketStore.listForWeek(w.id, { status: "LIVE" });
    const cut = Date.now() - windowMs;
    const recent = live.filter((t) => Date.parse(t.createdAt) >= cut), before = live.filter((t) => Date.parse(t.createdAt) < cut);
    if (recent.length < minRecent || before.length < minRecent) continue;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const share = (xs: typeof live) => xs.filter((t) => t.selections[i] === "YES").length / xs.length;
      const b = share(before), r = share(recent);
      if (Math.abs(r - b) >= minSwing) out.push({ weekId: w.id, code: w.code, slot: i + 1, label: slotLabel(i + 1), before: b, recent: r, recentTickets: recent.length });
    }
  }
  return out;
}
