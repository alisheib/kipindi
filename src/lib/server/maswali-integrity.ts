/**
 * MASWALI MILLIONEA — COMPLIANCE'S INTEGRITY READS (MASWALI-BUILD S4 part 3; MASWALI-PLAN §7b S4 item 1 and 5).
 *
 *   · the CLUSTER REPORT at close: groups of a week's holders the platform's own records connect, and identical full
 *     answer sets held by different accounts — so an officer can look before the week pays;
 *   · PICK-SHIFT ALERTS while a week sells: a question whose answers swing hard among the latest tickets, the shape of
 *     a result leaking before its event.
 *
 * ⛔ COMPLIANCE ONLY. Pick aggregates never reach a player before settlement, and never the trading officer who seals
 *    (MR-14, MB-34): these reads are called only by `/admin/maswali/integrity`.
 * ⛔ The repository is public: this file says what the report is FOR, not what makes two accounts look connected.
 * Each read is one aggregate, bounded, and degrades to "could not be read" rather than to an empty report.
 */
import { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "./prisma";
import { ticketStore, weekStore, type StoredWeek } from "./maswali-dal";
import { getAuditPage } from "./audit";
import { db } from "./store";
import { SLOT_COUNT, slotLabel } from "@/lib/maswali-score";

const onPostgres = () => hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const LOOKBACK_DAYS = 60;

export type ClusterGroup = { accounts: Array<{ userId: string; holder: string; tickets: number }>; basis: "records" | "answers"; detail: string };
export type ClusterReport = { weekId: string; code: string; holders: number; groups: ClusterGroup[]; readable: boolean };

const holderName = async (userId: string) => {
  // ⚠️ The memory store answers synchronously: never `.catch` the call itself, catch the awaited read.
  let u: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { u = await db.user.findById(userId); } catch { u = null; }
  return u ? (u.displayName?.trim() || `…${u.phoneE164.slice(-4)}`) : "(closed account)";
};

/** Accounts among `userIds` the platform's records connect, as groups of user ids (two or more each). */
async function connectedGroups(userIds: string[]): Promise<string[][] | null> {
  if (userIds.length < 2) return [];
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const links = new Map<string, Set<string>>();
  const add = (key: string, users: string[]) => {
    for (const u of users) { const s = links.get(u) ?? new Set<string>(); for (const v of users) if (v !== u) s.add(v); links.set(u, s); }
    void key;
  };
  if (onPostgres()) {
    const c = prisma();
    if (!c) return null;
    try {
      const ids = Prisma.join(userIds);
      const a = await c.$queryRaw<Array<{ users: string[] }>>`
        SELECT array_agg(DISTINCT "actorId") AS users FROM "AuditLog"
         WHERE "actorId" IN (${ids}) AND ip IS NOT NULL AND "createdAt" >= ${since}::timestamp
         GROUP BY ip HAVING count(DISTINCT "actorId") > 1 LIMIT 500`;
      const b = await c.$queryRaw<Array<{ users: string[] }>>`
        SELECT array_agg(DISTINCT "userId") AS users FROM "Transaction"
         WHERE "userId" IN (${ids}) AND type = 'WITHDRAWAL' AND msisdn IS NOT NULL
         GROUP BY msisdn HAVING count(DISTINCT "userId") > 1 LIMIT 500`;
      for (const r of [...a, ...b]) add("", r.users);
    } catch (err) {
      console.error("[maswali-integrity] the connection read failed:", (err as Error)?.message ?? err);
      return null;
    }
  } else {
    // The memory store keeps the recent audit ring; a test seam only — production reads the table above.
    const byKey = new Map<string, Set<string>>();
    for (const e of getAuditPage({ limit: 5_000 })) {
      if (!e.actorId || !userIds.includes(e.actorId) || !e.ip) continue;
      const s = byKey.get(e.ip) ?? new Set<string>(); s.add(e.actorId); byKey.set(e.ip, s);
    }
    for (const s of byKey.values()) if (s.size > 1) add("", [...s]);
  }
  // Connected components over the links, so a chain A–B–C reads as one group.
  const seen = new Set<string>(), groups: string[][] = [];
  for (const u of links.keys()) {
    if (seen.has(u)) continue;
    const stack = [u], group: string[] = [];
    while (stack.length) { const x = stack.pop()!; if (seen.has(x)) continue; seen.add(x); group.push(x); for (const y of links.get(x) ?? []) if (!seen.has(y)) stack.push(y); }
    if (group.length > 1) groups.push(group.sort());
  }
  return groups;
}

/** ⭐ The cluster report for one week that has closed (its commitment is fixed, so the report describes what will pay). */
export async function clusterReport(week: StoredWeek): Promise<ClusterReport> {
  const tickets = (await ticketStore.listForWeek(week.id)).filter((t) => t.status !== "CANCELLED");
  const perUser = new Map<string, number>();
  for (const t of tickets) perUser.set(t.userId, (perUser.get(t.userId) ?? 0) + 1);
  const userIds = [...perUser.keys()];
  const groups: ClusterGroup[] = [];
  const connected = await connectedGroups(userIds.slice(0, 5_000));
  for (const g of connected ?? []) {
    groups.push({ basis: "records", detail: `${g.length} accounts the platform's records connect`,
      accounts: await Promise.all(g.map(async (u) => ({ userId: u, holder: await holderName(u), tickets: perUser.get(u) ?? 0 }))) });
  }
  // The same fifteen answers held by different accounts.
  const byPicks = new Map<string, Set<string>>();
  for (const t of tickets) { const s = byPicks.get(t.picksKey) ?? new Set<string>(); s.add(t.userId); byPicks.set(t.picksKey, s); }
  for (const users of byPicks.values()) {
    if (users.size < 2) continue;
    const list = [...users].sort();
    groups.push({ basis: "answers", detail: `${list.length} accounts hold the same fifteen answers`,
      accounts: await Promise.all(list.map(async (u) => ({ userId: u, holder: await holderName(u), tickets: perUser.get(u) ?? 0 }))) });
  }
  return { weekId: week.id, code: week.code, holders: userIds.length, groups: groups.slice(0, 50), readable: connected !== null };
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
