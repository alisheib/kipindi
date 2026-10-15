/**
 * THE HARM WATCH'S DAILY COUNT — the Vodacom plan S13 WP3 (`docs/design-system/v5-2026-09-29-simplified-journey/
 * S13-PLAN.md`, Correction 19).
 *
 * The compliance record says the two markers small top-ups feed — RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES — are
 * "watched next to the 'short balance → deposit' measure" (`docs/COMPLIANCE-DECISIONS.md`, 2026-09-29 §4). But NOTHING
 * persists a harm flag: Player Safety recomputes every flag on each render and a flag lasts only as long as its
 * detector's window (≤ 8 days). So there was nothing to watch "next to" anything over time. This keeps one number per
 * EAT day: how many accounts carried each marker when the day was counted.
 *
 * ⛔ ONE DETECTOR, UNCHANGED (D20a, D20d). The count runs `detectHarmMarkers` — exactly what Player Safety runs — on
 * every candidate, and adds, excludes or splits nothing: no role filter, no account filter, no new marker.
 * ⭐ THE CANDIDATES LOSE NOTHING. RAPID_DEPOSIT_ESCALATION needs a confirmed deposit created in the last 24 hours, and
 * CHASING_LOSSES three confirmed deposits created in the last 7 days (`responsible-gambling.ts`, the DETECTORS list) —
 * so an account with no confirmed deposit in the last 7 days can carry neither. The candidates are the accounts with a
 * confirmed deposit in the last 8 days (a day's margin), and `test:harm-watch` proves the count equals a full walk of
 * every user on the same fixtures.
 * ⛔ A DAY NOT COUNTED IS "NOT COUNTED", NEVER 0. A failed read, an overrun of the time ceiling or a day the leader
 * never reached reads "not counted" on the panel; the series only ever holds counts that were made.
 *
 * Once per EAT day after 03:00 EAT, leader only (the lifecycle pass), idempotent by day, with a time ceiling so the
 * tick stays on time. One `SystemConfig` row, `journey.harm.daily`, at most 400 days. ⛔ Shown to compliance VIEW only,
 * on the panel's launch watch, and never in a file that leaves 50pick (S13 Point 8). The prelaunch reset DROPS the key.
 */
import { eatDayKey, EAT_OFFSET_MS } from "@/lib/eat-day";
import { createConfigIfAbsent, loadConfigResult, replaceConfigIfValue } from "./config-store";
import { hasDatabase, prisma } from "./prisma";
import { db } from "./store";
import { detectHarmMarkers } from "./responsible-gambling";

export const HARM_WATCH_KEY = "journey.harm.daily";
export const HARM_WATCH_VERSION = 1;
/** Days kept — the counters' own period. */
export const HARM_WATCH_MAX_DAYS = 400;
/** The candidates: accounts with a confirmed deposit created this many days back (the detectors need 7; one more is margin). */
export const HARM_WATCH_CANDIDATE_DAYS = 8;
/** The count is taken once an EAT day, from this hour. */
export const HARM_WATCH_FROM_EAT_HOUR = 3;
/** The most one snapshot may take before it records the day "not counted" and hands the tick back. */
export const HARM_WATCH_CEILING_MS = 30_000;
const BATCH = 10;
const DAY_MS = 86_400_000;

export type HarmDay =
  | { day: string; at: string; rapidDeposit: number; chasingLosses: number; scanned: number }
  | { day: string; at: string; notCounted: string };
export type StoredHarmSeries = { v: 1; days: HarmDay[] };

/* ── The store — the database row, or process memory with no database ───────────────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_HARM_WATCH: { value: unknown } | undefined;
}
const mem = () => (globalThis.__50PICK_HARM_WATCH ??= { value: null });
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

/* ── Parsing ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** The stored series, `null` for no row yet, or `"malformed"`. */
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
  | { wrote: "counted"; day: string; rapidDeposit: number; chasingLosses: number; scanned: number }
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
  const started = clock();
  const ceiling = opts.ceilingMs ?? HARM_WATCH_CEILING_MS;
  const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id));
  let entry: HarmDay;
  try {
    const ids = await (opts.candidates ?? harmCandidates)(nowMs - HARM_WATCH_CANDIDATE_DAYS * DAY_MS);
    let rapid = 0, chasing = 0, overran = false;
    for (let i = 0; i < ids.length; i += BATCH) {
      if (clock() - started > ceiling) { overran = true; break; }
      const flags = await Promise.all(ids.slice(i, i + BATCH).map((id) => detect(id)));
      for (const f of flags) {
        if (f.some((x) => x.marker === "RAPID_DEPOSIT_ESCALATION")) rapid++;
        if (f.some((x) => x.marker === "CHASING_LOSSES")) chasing++;
      }
    }
    if (!overran && clock() - started > ceiling) overran = true;
    entry = overran
      ? { day, at: new Date(nowMs).toISOString(), notCounted: `the count ran past its ${ceiling >= 1000 ? `${Math.round(ceiling / 1000)}-second` : `${ceiling} ms`} ceiling` }
      : { day, at: new Date(nowMs).toISOString(), rapidDeposit: rapid, chasingLosses: chasing, scanned: ids.length };
  } catch (err) {
    entry = { day, at: new Date(nowMs).toISOString(), notCounted: `a read failed: ${String((err as Error)?.message ?? err).slice(0, 120)}` };
  }
  const days = [...(parsed?.days ?? []), entry].slice(-HARM_WATCH_MAX_DAYS);
  const swapped = await storeWrite(loaded.value, { v: HARM_WATCH_VERSION, days });
  if (!swapped) return { wrote: "skipped", why: "lost the race" };
  return "notCounted" in entry
    ? { wrote: "not-counted", day, why: entry.notCounted }
    : { wrote: "counted", day, rapidDeposit: entry.rapidDeposit, chasingLosses: entry.chasingLosses, scanned: entry.scanned };
}

/* ── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type HarmSeriesRead = { ok: true; byDay: Map<string, HarmDay> } | { ok: false; why: "unreadable" | "malformed" };

/** The counted days, for the launch watch. ⛔ A day absent from the map was not counted — never read it as 0. */
export async function harmWatchSeries(): Promise<HarmSeriesRead> {
  try {
    const loaded = await storeLoad();
    if (!loaded.ok) return { ok: false, why: "unreadable" };
    const parsed = parseHarmSeries(loaded.value);
    if (parsed === "malformed") return { ok: false, why: "malformed" };
    return { ok: true, byDay: new Map((parsed?.days ?? []).map((d) => [d.day, d])) };
  } catch {
    return { ok: false, why: "unreadable" };
  }
}

/** ⚠️ TEST SEAM — the memory twin's row, for the suites and the dev seed route (memory store only). */
export function __setHarmWatchMemoryForTests(value: unknown): void {
  if (hasDatabase()) throw new Error("harm-watch: the memory seam is for the memory store only");
  mem().value = jsonCopy(value);
}
