/**
 * THE HARM WATCH'S DAILY COUNT — the Vodacom plan S13 WP3 (`docs/design-system/v5-2026-09-29-simplified-journey/
 * S13-PLAN.md`, Correction 19).
 *
 * The compliance record says the markers small top-ups feed — RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES — are
 * "watched next to the 'short balance → deposit' measure" (`docs/COMPLIANCE-DECISIONS.md`, 2026-09-29 §4). But NOTHING
 * persists a harm flag: Player Safety recomputes every flag on each render and a flag lasts only as long as its
 * detector's own look-back. So there was nothing to watch "next to" anything over time. This keeps one number per
 * EAT day: how many accounts carried each marker when the day was counted.
 *
 * ⛔ THE SAME DETECTOR, UNCHANGED (D20a, D20d). The count runs `detectHarmMarkers` — exactly what Player Safety runs —
 * on every candidate, and adds, excludes or splits nothing: no role filter, no account filter, no new marker.
 * ⭐ THE CANDIDATES LOSE NOTHING. Both markers are raised only on an account's own recent confirmed deposits
 * (`responsible-gambling.ts`, the DETECTORS list) — so an account with none of those can carry neither. The candidates
 * are the accounts with a confirmed deposit inside a window holding every deposit either detector reads
 * (`HARM_WATCH_CANDIDATE_DAYS`), and `test:harm-watch` proves the count equals a full walk of every user on the same
 * fixtures.
 * ⛔ AN UNCOUNTED DAY READS "NOT COUNTED", NEVER 0. A failed read, an overrun of the time ceiling or a day the leader
 * never reached reads "not counted" on the panel; the series only ever holds counts that were made.
 *
 * Once per EAT day after 03:00 EAT, leader only (the lifecycle pass), idempotent by day, with a time ceiling on the day's
 * own count — and, once Millionea has opened, a budget of the same size on its ticket read — so the tick stays on time.
 * One `SystemConfig` row, `journey.harm.daily`, at most 400 days. ⛔ Shown to compliance VIEW only,
 * on the panel's launch watch, and never in a file that leaves 50pick (S13 Point 8). The prelaunch reset DROPS the key.
 *
 * ⭐ REPORTED TWICE ONCE MASWALI MILLIONEA HAS OPENED (MASWALI-BUILD S6, OD-22). The count above is unchanged, for every
 * candidate as before; a second count takes the same markers over the candidates that hold no
 * Millionea ticket (any week, any state) — the series S16's bounds are judged on, so a jackpot's pull on deposits cannot
 * be read as the journey's. It is written only on a day counted after the first PUBLIC week opened, and into its OWN row,
 * `journey.harm.noTicket.daily` (`HARM_WATCH_NO_TICKET_KEY`), in the very shape of the first: the S13 row keeps exactly
 * the shape it had before S6, so a build older than S6 reads it as it always did (a rollback past S6 loses no day of the
 * S16 history). ⛔ The split dates the event it reports (round 4, the lead's ruling): it starts at the first PUBLIC
 * week's opening — the private drive's opening starts nothing, and a day counted before the public one is a whole count.
 * Once it has, a candidate holding ANY Millionea ticket, the drive's included, is out of the second count: the
 * definition of a ticket is the measures' one (`journey-measures-dal.ts`). Measures 5 and 4b key on no opening at all —
 * each leaves out a unit by a ticket within that unit's own horizon (round 5).
 */
import { eatDayKey, EAT_OFFSET_MS } from "@/lib/eat-day";
import { createConfigIfAbsent, loadConfigResult, replaceConfigIfValue } from "./config-store";
import { hasDatabase, prisma } from "./prisma";
import { db } from "./store";
import { DEPOSIT_ESCALATION_LOOKBACK_MS, RECENT_ACTIVITY_MS, detectHarmMarkers } from "./responsible-gambling";
import { millioneaOpenings, ticketHolders } from "./journey-measures-dal";

export const HARM_WATCH_KEY = "journey.harm.daily";
/** ⭐ S6 · OD-22 — the second count's own row: the same markers over the candidates holding no Millionea ticket. */
export const HARM_WATCH_NO_TICKET_KEY = "journey.harm.noTicket.daily";
export const HARM_WATCH_VERSION = 1;
/** Days kept — the counters' own period. */
const DAY_MS = 86_400_000;
export const HARM_WATCH_MAX_DAYS = 400;
/**
 * The candidates: accounts with a confirmed deposit created this many days back — a window that holds every deposit the
 * markers are raised on, so no account that can carry one is left out (`test:harm-watch` H.2 proves it on fixtures).
 * ⭐ DERIVED, never typed: the larger of the windows the detectors export (`RECENT_ACTIVITY_MS`,
 * `DEPOSIT_ESCALATION_LOOKBACK_MS`, from `responsible-gambling.ts`), rounded up — a window moved there moves this with it.
 */
export const HARM_WATCH_CANDIDATE_DAYS = Math.ceil(Math.max(RECENT_ACTIVITY_MS, DEPOSIT_ESCALATION_LOOKBACK_MS) / DAY_MS);
/** The count is taken once an EAT day, from this hour. */
export const HARM_WATCH_FROM_EAT_HOUR = 3;
/**
 * The most the day's own count (its candidates and its walk over them) may take before it records the day "not counted"
 * and hands the tick back. ⭐ S6 · the second count's ticket read has a budget of its own, the same: past it, only that
 * day's split is dropped (round 7). So a snapshot hands the tick back within two ceilings.
 */
export const HARM_WATCH_CEILING_MS = 30_000;
const BATCH = 10;
const SECOND_MS = 1_000;

export type HarmDay =
  | { day: string; at: string; rapidDeposit: number; chasingLosses: number; scanned: number }
  | { day: string; at: string; notCounted: string };
export type StoredHarmSeries = { v: 1; days: HarmDay[] };
/** ⭐ S6 · OD-22 — a day's second count, as the snapshot reports it (stored as a day of the second row). */
export type HarmNoTicket = { rapidDeposit: number; chasingLosses: number; scanned: number };

/* ── The store — the database row, or process memory with no database ───────────────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_HARM_WATCH: { value: unknown } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_HARM_WATCH_NO_TICKET: { value: unknown } | undefined;
}
const mem = () => (globalThis.__50PICK_HARM_WATCH ??= { value: null });
const memNoTicket = () => (globalThis.__50PICK_HARM_WATCH_NO_TICKET ??= { value: null });
const jsonCopy = (v: unknown): unknown => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!hasDatabase()) return { ok: true, value: jsonCopy(mem().value) };
  const r = await loadConfigResult<unknown>(HARM_WATCH_KEY);
  return r.ok ? { ok: true, value: r.value } : { ok: false };
}

async function storeWrite(expected: unknown, value: StoredHarmSeries): Promise<boolean> {
  if (!hasDatabase()) {
    if (JSON.stringify(mem().value) !== JSON.stringify(expected ?? null)) return false;
    mem().value = jsonCopy(value);
    return true;
  }
  if (expected === null || expected === undefined) return (await createConfigIfAbsent(HARM_WATCH_KEY, value)) === "created";
  return replaceConfigIfValue(HARM_WATCH_KEY, expected, value);
}

/** ⭐ S6 · the second row's twins of `storeLoad` / `storeWrite`: the same compare-and-swap, its own key. */
async function noTicketLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!hasDatabase()) return { ok: true, value: jsonCopy(memNoTicket().value) };
  const r = await loadConfigResult<unknown>(HARM_WATCH_NO_TICKET_KEY);
  return r.ok ? { ok: true, value: r.value } : { ok: false };
}

async function noTicketWrite(expected: unknown, value: StoredHarmSeries): Promise<boolean> {
  if (!hasDatabase()) {
    if (JSON.stringify(memNoTicket().value) !== JSON.stringify(expected ?? null)) return false;
    memNoTicket().value = jsonCopy(value);
    return true;
  }
  if (expected === null || expected === undefined) return (await createConfigIfAbsent(HARM_WATCH_NO_TICKET_KEY, value)) === "created";
  return replaceConfigIfValue(HARM_WATCH_NO_TICKET_KEY, expected, value);
}

/* ── Parsing ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** The stored series, `null` for no row yet, or `"malformed"`. One shape for both rows. */
export function parseHarmSeries(raw: unknown): StoredHarmSeries | null | "malformed" {
  if (raw === null || raw === undefined) return null;
  if (!isObj(raw) || Object.keys(raw).sort().join(",") !== "days,v" || raw.v !== HARM_WATCH_VERSION || !Array.isArray(raw.days)) return "malformed";
  if (raw.days.length > HARM_WATCH_MAX_DAYS) return "malformed";
  let prev = "";
  for (const d of raw.days) {
    if (!isObj(d) || typeof d.day !== "string" || !DAY_RE.test(d.day) || d.day <= prev || typeof d.at !== "string" || !ISO_RE.test(d.at)) return "malformed";
    prev = d.day;
    const keys = Object.keys(d).sort().join(",");
    if (keys === "at,day,notCounted") { if (typeof d.notCounted !== "string" || !d.notCounted) return "malformed"; continue; }
    if (keys !== "at,chasingLosses,day,rapidDeposit,scanned" || !isCount(d.rapidDeposit) || !isCount(d.chasingLosses) || !isCount(d.scanned)) return "malformed";
    if (d.rapidDeposit > d.scanned || d.chasingLosses > d.scanned) return "malformed";
  }
  return raw as StoredHarmSeries;
}

/* ── The candidates ──────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Every account with a CONFIRMED deposit created at or after `sinceMs` — no role, account or marker filter (D20a). A
 * windowed read on both stores: the Prisma twin asks for distinct accounts in the window; the memory twin reads the
 * store's own range query.
 */
export async function harmCandidates(sinceMs: number): Promise<string[]> {
  if (hasDatabase() && process.env.USE_PRISMA_DAL !== "false") {
    const client = prisma();
    if (!client) return [];
    const rows = await client.transaction.findMany({
      where: { type: "DEPOSIT", status: "CONFIRMED", createdAt: { gte: new Date(sinceMs) } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return rows.map((r) => r.userId).sort();
  }
  const rows = await Promise.resolve(db.txn.listInRange(sinceMs, Number.MAX_SAFE_INTEGER));
  return [...new Set(rows.filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED").map((t) => t.userId))].sort();
}

/* ── The snapshot ────────────────────────────────────────────────────────────────────────────────────────────────── */

export type HarmSnapshotResult =
  | { wrote: "counted"; day: string; rapidDeposit: number; chasingLosses: number; scanned: number; noTicket?: HarmNoTicket }
  | { wrote: "not-counted"; day: string; why: string }
  | { wrote: "skipped"; why: "before 03:00 EAT" | "already counted" | "series unreadable" | "series malformed" | "lost the race" };

/** The EAT hour (0–23) of an instant. */
const eatHour = (ms: number) => new Date(ms + EAT_OFFSET_MS).getUTCHours();

/**
 * ⭐ ONE DAY'S COUNT. Called from the lifecycle pass (leader only) with the defaults; the suites pass the detector,
 * the candidate read and the ceiling to stand in for a slow store or another container.
 */
export async function snapshotHarmMarkers(
  nowMs: number = Date.now(),
  opts: {
    detect?: (userId: string) => Promise<Array<{ marker: string }>>;
    candidates?: (sinceMs: number) => Promise<string[]>;
    ceilingMs?: number;
    clock?: () => number;
    /** S6 · OD-22 — when the first PUBLIC Millionea week opened (null: none has), and which candidates hold a ticket. */
    openedAt?: () => Promise<number | null>;
    holders?: (userIds: readonly string[]) => Promise<Set<string>>;
  } = {},
): Promise<HarmSnapshotResult> {
  if (eatHour(nowMs) < HARM_WATCH_FROM_EAT_HOUR) return { wrote: "skipped", why: "before 03:00 EAT" };
  const day = eatDayKey(nowMs);
  const loaded = await storeLoad().catch(() => ({ ok: false as const }));
  if (!loaded.ok) return { wrote: "skipped", why: "series unreadable" };
  const parsed = parseHarmSeries(loaded.value);
  if (parsed === "malformed") {
    console.error(`[harm-watch] the series "${HARM_WATCH_KEY}" is malformed — left as it is; the panel reads it as unreadable`);
    return { wrote: "skipped", why: "series malformed" };
  }
  if (parsed?.days.some((d) => d.day === day)) return { wrote: "skipped", why: "already counted" };

  const clock = opts.clock ?? Date.now;
  // ⭐ S6 · OD-22 — the second count, once a PUBLIC Millionea week has opened (round 4: the drive's opening starts
  // nothing). ⛔ A failed read of the openings or of who holds a ticket leaves the day without its second count (it reads
  // "not counted" there); it never costs the day its own count. ⭐ Round 6 · the second count's reads are made OUTSIDE the
  // ceiling's clock — the openings before it starts, who holds a ticket with it held — so the ceiling bounds the day's
  // own count (its candidates and its walk over them) exactly as before S6, and a slow ticket read can never cost the day
  // that count.
  const openedAt = await (opts.openedAt ?? (async () => (await millioneaOpenings()).publicAt))().catch(() => null);
  const started = clock();
  const ceiling = opts.ceilingMs ?? HARM_WATCH_CEILING_MS;
  const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id));
  let entry: HarmDay;
  let split: HarmNoTicket | null = null;
  try {
    const ids = await (opts.candidates ?? harmCandidates)(nowMs - HARM_WATCH_CANDIDATE_DAYS * DAY_MS);
    // Who holds a ticket is read by the measures' one definition of a ticket (any week, the drive's included), as it stood
    // at the count's own instant (`ticketHolders`: bought at or before it, one row per holder).
    // ⭐ Round 7 · that read has a time budget of its own, the ceiling's: it is raced against it, and a read that runs past
    // it costs the day only its split — never its own count, never the tick more than one more ceiling.
    let held = 0;
    const holders: Set<string> | null = openedAt !== null && openedAt <= nowMs
      ? await (async () => {
        const from = clock();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const read = (opts.holders ?? ((who: readonly string[]) => ticketHolders(who, nowMs)))(ids).catch(() => null);
          const budget = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ceiling); });
          const got = await Promise.race([read, budget]);
          held = clock() - from;
          return held > ceiling ? null : got;
        } finally {
          if (timer) clearTimeout(timer);
        }
      })()
      : null;
    /** The time the day's own count has taken: the ceiling's clock, less the ticket read's. */
    const spent = () => clock() - started - held;
    let rapid = 0, chasing = 0, overran = false;
    let rapidNo = 0, chasingNo = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      if (spent() > ceiling) { overran = true; break; }
      const batch = ids.slice(i, i + BATCH);
      const flags = await Promise.all(batch.map((id) => detect(id)));
      flags.forEach((f, k) => {
        const without = holders !== null && !holders.has(batch[k]);
        if (f.some((x) => x.marker === "RAPID_DEPOSIT_ESCALATION")) { rapid++; if (without) rapidNo++; }
        if (f.some((x) => x.marker === "CHASING_LOSSES")) { chasing++; if (without) chasingNo++; }
      });
    }
    if (!overran && spent() > ceiling) overran = true;
    entry = overran
      ? { day, at: new Date(nowMs).toISOString(), notCounted: `the count ran past its ${ceiling >= SECOND_MS ? `${Math.round(ceiling / SECOND_MS)}-second` : `${ceiling} ms`} ceiling` }
      : { day, at: new Date(nowMs).toISOString(), rapidDeposit: rapid, chasingLosses: chasing, scanned: ids.length };
    if (!overran && holders !== null) split = { rapidDeposit: rapidNo, chasingLosses: chasingNo, scanned: ids.filter((id) => !holders.has(id)).length };
  } catch (err) {
    entry = { day, at: new Date(nowMs).toISOString(), notCounted: `a read failed: ${String((err as Error)?.message ?? err).slice(0, 120)}` };
  }
  const days = [...(parsed?.days ?? []), entry].slice(-HARM_WATCH_MAX_DAYS);
  const swapped = await storeWrite(loaded.value, { v: HARM_WATCH_VERSION, days });
  if (!swapped) return { wrote: "skipped", why: "lost the race" };
  // ⭐ S6 · the second count joins its own row only once the day's own count is in: the container that wrote the first
  // writes the second. A second row that cannot be read or is malformed is left as it is — that day reads "not counted"
  // for players without a ticket, and nothing else moves.
  const written = split !== null && "rapidDeposit" in entry && (await recordNoTicket(day, entry.at, split).catch(() => false));
  return "notCounted" in entry
    ? { wrote: "not-counted", day, why: entry.notCounted }
    : { wrote: "counted", day, rapidDeposit: entry.rapidDeposit, chasingLosses: entry.chasingLosses, scanned: entry.scanned, ...(written && split ? { noTicket: split } : {}) };
}

/** ⭐ S6 · one day of the second row, by the same compare-and-swap; false when it was not written (read, shape, race). */
async function recordNoTicket(day: string, at: string, split: HarmNoTicket): Promise<boolean> {
  const loaded = await noTicketLoad();
  if (!loaded.ok) return false;
  const parsed = parseHarmSeries(loaded.value);
  if (parsed === "malformed") {
    console.error(`[harm-watch] the series "${HARM_WATCH_NO_TICKET_KEY}" is malformed — left as it is; that day reads as not counted`);
    return false;
  }
  if (parsed?.days.some((d) => d.day === day)) return false;
  const days = [...(parsed?.days ?? []), { day, at, ...split }].slice(-HARM_WATCH_MAX_DAYS);
  return noTicketWrite(loaded.value, { v: HARM_WATCH_VERSION, days });
}

/* ── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type HarmSeriesRead =
  | {
    ok: true;
    byDay: Map<string, HarmDay>;
    /** ⭐ S6 · the second row's days (players without a Millionea ticket); null when that row cannot be read or is malformed. */
    noTicketByDay: Map<string, HarmDay> | null;
  }
  | { ok: false; why: "unreadable" | "malformed" };

/** The counted days, for the launch watch. ⛔ A day absent from the map was not counted — never read it as 0. */
export async function harmWatchSeries(): Promise<HarmSeriesRead> {
  try {
    const loaded = await storeLoad();
    if (!loaded.ok) return { ok: false, why: "unreadable" };
    const parsed = parseHarmSeries(loaded.value);
    if (parsed === "malformed") return { ok: false, why: "malformed" };
    const second = await noTicketLoad().catch(() => ({ ok: false as const }));
    const parsedSecond = second.ok ? parseHarmSeries(second.value) : "malformed";
    return {
      ok: true,
      byDay: new Map((parsed?.days ?? []).map((d) => [d.day, d])),
      noTicketByDay: parsedSecond === "malformed" ? null : new Map((parsedSecond?.days ?? []).map((d) => [d.day, d])),
    };
  } catch {
    return { ok: false, why: "unreadable" };
  }
}

/** ⚠️ TEST SEAM — the memory twin's row, for the suites and the dev seed route (memory store only). */
export function __setHarmWatchMemoryForTests(value: unknown): void {
  if (hasDatabase()) throw new Error("harm-watch: the memory seam is for the memory store only");
  mem().value = jsonCopy(value);
}

/** ⚠️ TEST SEAM — the memory twin's second row (S6 · OD-22), memory store only. */
export function __setHarmWatchNoTicketMemoryForTests(value: unknown): void {
  if (hasDatabase()) throw new Error("harm-watch: the memory seam is for the memory store only");
  memNoTicket().value = jsonCopy(value);
}
