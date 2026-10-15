/**
 * THE LAUNCH RECORD — when the new journey was on for everyone, observed and kept (the Vodacom plan S13 WP2,
 * `docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md`, Correction 18).
 *
 * The journey's state is the lower of a code/env ceiling and the Owner's stored cap (`simple-journey-switch.ts`). Only the
 * cap's ceremony writes a row, and the S15 flip is "one commit": with no cap stored, a deploy alone launches the journey
 * and nothing records the moment. The agency's "before vs after" needs that moment, so this module OBSERVES the effective
 * state on every lifecycle pass (leader only) and keeps every change, whatever caused it — the code ceiling,
 * `FEATURE_SIMPLEJOURNEY`, or the Owner's cap.
 *
 * ── THE RECORD ──────────────────────────────────────────────────────────────────────────────────────────────────────
 * One `SystemConfig` row, `journey.rollout.observed`:
 *     { v: 1, observedSince, transitions: [{ at, state, source, processStartedAt }], gap }
 * `observedSince` is when observation began; the state before it is not known, and the windows never assume it.
 * Bounded at `JOURNEY_LAUNCH_MAX_TRANSITIONS`: the first observation and the first move to ACTIVE are never dropped, and
 * whatever is dropped from the middle becomes `gap` — days inside it are "not known", never assumed ACTIVE.
 *
 * ── THE RULES ───────────────────────────────────────────────────────────────────────────────────────────────────────
 *   ⛔ A FAILED READ WRITES NOTHING. The switch reader answers WITHDRAWN on a failed read (it must: a surprise never shows
 *      the new journey), so its `UNREAD` is skipped here — recording it would invent a rollback. A record that cannot be
 *      read, or does not parse, is left exactly as it is; the panel says "could not be read" instead of guessing a launch.
 *   ⛔ AN OLDER BUILD CANNOT WRITE A MOVE BACK. Each observation carries the start time of the process that made it, and
 *      one from a process that started before the last recorded one is ignored — so during a deploy, when two builds run
 *      for a minute, the old build's state cannot follow the new build's flip back into the record.
 *   ⛔ TWO CONTAINERS WRITE ONE TRANSITION. Every write is a compare-and-swap (`createConfigIfAbsent` /
 *      `replaceConfigIfValue`); the loser writes nothing and the next pass re-reads.
 *   ⭐ Each move writes one SYSTEM audit row, `journey.rollout.observed`.
 * Precision: one lifecycle tick plus the switch's 10-second snapshot. Windows work on whole EAT days and exclude the
 * launch day itself, so neither matters to a figure.
 *
 * Inline DAL, the `simple-journey-switch.ts` pattern: the database row with `DATABASE_URL`, process memory without.
 * ⛔ The prelaunch reset DROPS this key (`scripts/ops-prelaunch-reset.mts`), like `journey.rollout.switch`: its audit
 * rows go with the log the reset wipes, and the next pass starts the record again.
 */
import { simpleJourneyCeiling, isRolloutState, type RolloutState } from "@/lib/feature-state";
import type { LaunchFacts } from "@/lib/journey/measures";
import { audit } from "./audit";
import { createConfigIfAbsent, loadConfigResult, replaceConfigIfValue } from "./config-store";
import { hasDatabase } from "./prisma";
import { journeySwitchNow } from "./simple-journey-switch";

export const JOURNEY_LAUNCH_KEY = "journey.rollout.observed";
export const JOURNEY_LAUNCH_VERSION = 1;
/** The most transitions kept. The first observation and the first ACTIVE are never dropped. */
export const JOURNEY_LAUNCH_MAX_TRANSITIONS = 200;

/** When this process started: every observation carries it (see "AN OLDER BUILD" above). */
export const PROCESS_STARTED_AT = Date.now() - Math.round(process.uptime() * 1000);

export type StoredTransition = { at: string; state: RolloutState; source: string; processStartedAt: string };
export type StoredLaunchRecord = {
  v: 1;
  observedSince: string;
  transitions: StoredTransition[];
  gap: { from: string; to: string } | null;
};

/** What one observation saw. `null` = the state could not be read (nothing is written). */
export type ObservedState = { state: RolloutState; source: string } | null;

/* ── The store — the database row, or process memory with no database ───────────────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_LAUNCH: { value: unknown } | undefined;
}
const mem = () => (globalThis.__50PICK_JOURNEY_LAUNCH ??= { value: null });
const jsonCopy = (v: unknown): unknown => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!hasDatabase()) return { ok: true, value: jsonCopy(mem().value) };
  const r = await loadConfigResult<unknown>(JOURNEY_LAUNCH_KEY);
  return r.ok ? { ok: true, value: r.value } : { ok: false };
}

async function storeCreate(value: StoredLaunchRecord): Promise<"created" | "exists"> {
  if (!hasDatabase()) {
    if (mem().value !== null) return "exists";
    mem().value = jsonCopy(value);
    return "created";
  }
  return createConfigIfAbsent(JOURNEY_LAUNCH_KEY, value);
}

async function storeReplace(expected: unknown, value: StoredLaunchRecord): Promise<boolean> {
  if (!hasDatabase()) {
    if (JSON.stringify(mem().value) !== JSON.stringify(expected)) return false;
    mem().value = jsonCopy(value);
    return true;
  }
  return replaceConfigIfValue(JOURNEY_LAUNCH_KEY, expected, value);
}

/* ── Parsing — strict, so a hand edit or a half-written row is "malformed", never a guessed launch ───────────────── */

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const isIso = (v: unknown): v is string => typeof v === "string" && ISO_RE.test(v) && Number.isFinite(Date.parse(v));
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keysAre = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).sort().join(",") === [...keys].sort().join(",");

/** The stored row, or `"malformed"` (null = no row yet). */
export function parseLaunchRecord(raw: unknown): StoredLaunchRecord | null | "malformed" {
  if (raw === null || raw === undefined) return null;
  if (!isObj(raw) || !keysAre(raw, ["v", "observedSince", "transitions", "gap"])) return "malformed";
  if (raw.v !== JOURNEY_LAUNCH_VERSION || !isIso(raw.observedSince) || !Array.isArray(raw.transitions)) return "malformed";
  if (raw.transitions.length === 0 || raw.transitions.length > JOURNEY_LAUNCH_MAX_TRANSITIONS) return "malformed";
  let prev = -Infinity, prevState: unknown = null;
  for (const t of raw.transitions) {
    if (!isObj(t) || !keysAre(t, ["at", "state", "source", "processStartedAt"])) return "malformed";
    if (!isIso(t.at) || !isRolloutState(t.state) || typeof t.source !== "string" || t.source.length > 200 || !isIso(t.processStartedAt)) return "malformed";
    const at = Date.parse(t.at);
    if (at < prev || t.state === prevState) return "malformed"; // ordered, and a transition is a CHANGE
    prev = at; prevState = t.state;
  }
  if (Date.parse((raw.transitions[0] as StoredTransition).at) !== Date.parse(raw.observedSince)) return "malformed";
  if (raw.gap !== null) {
    if (!isObj(raw.gap) || !keysAre(raw.gap, ["from", "to"]) || !isIso(raw.gap.from) || !isIso(raw.gap.to)) return "malformed";
    if (Date.parse(raw.gap.from) >= Date.parse(raw.gap.to)) return "malformed";
  }
  return raw as StoredLaunchRecord;
}

/** The record as the windows read it (`LaunchFacts`, milliseconds). */
export function launchFactsOf(rec: StoredLaunchRecord): LaunchFacts {
  const transitions = rec.transitions.map((t) => ({ at: Date.parse(t.at), state: t.state }));
  const first = transitions.find((t) => t.state === "ACTIVE");
  return {
    observedSince: Date.parse(rec.observedSince),
    firstActiveAt: first ? first.at : null,
    startedActive: transitions[0]?.state === "ACTIVE",
    transitions,
    gap: rec.gap ? { from: Date.parse(rec.gap.from), to: Date.parse(rec.gap.to) } : null,
  };
}

/**
 * Keep the record bounded: the first observation, the first ACTIVE and the newest ones. Whatever is dropped AFTER the
 * first ACTIVE widens `gap` to cover it, so the days it held read "not known" rather than whatever came before. A move
 * dropped BEFORE the first ACTIVE costs nothing: no window reads the state of a day before the launch day.
 */
export function boundTransitions(rec: StoredLaunchRecord, max = JOURNEY_LAUNCH_MAX_TRANSITIONS): StoredLaunchRecord {
  const t = rec.transitions;
  if (t.length <= max) return rec;
  const firstActive = t.findIndex((x) => x.state === "ACTIVE");
  const keep = new Set<number>([0]);
  if (firstActive >= 0) keep.add(firstActive);
  for (let i = t.length - 1; keep.size < max && i >= 0; i--) keep.add(i);
  const kept = [...keep].sort((a, b) => a - b);
  let gapFrom = rec.gap ? Date.parse(rec.gap.from) : Infinity, gapTo = rec.gap ? Date.parse(rec.gap.to) : -Infinity;
  for (let i = 0; i < t.length; i++) {
    if (keep.has(i) || firstActive < 0 || i < firstActive) continue;
    // A dropped transition makes its own instant and everything until the next kept one unknown.
    const next = kept.find((k) => k > i);
    gapFrom = Math.min(gapFrom, Date.parse(t[i].at));
    gapTo = Math.max(gapTo, next !== undefined ? Date.parse(t[next].at) : Date.parse(t[i].at) + 1);
  }
  return {
    ...rec,
    transitions: kept.map((i) => t[i]),
    gap: Number.isFinite(gapFrom) ? { from: new Date(gapFrom).toISOString(), to: new Date(gapTo).toISOString() } : rec.gap,
  };
}

/* ── Observing ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * What players are shown right now, and why — or null when it cannot be known. Under a WITHDRAWN ceiling the switch
 * store is not read (its `UNREAD` then is a real WITHDRAWN, not a failure); otherwise an `UNREAD` stored switch is a
 * failed read and yields null.
 */
export async function readRolloutNow(): Promise<ObservedState> {
  const { ceiling, source } = simpleJourneyCeiling();
  if (ceiling === "WITHDRAWN") return { state: "WITHDRAWN", source: `ceiling ${source} WITHDRAWN` };
  const r = await journeySwitchNow();
  if (r.stored.kind === "UNREAD") return null;
  const stored = r.stored.kind === "SET" ? `stored SET ${r.stored.cap}` : `stored ${r.stored.kind}`;
  return { state: r.state, source: `ceiling ${source} ${ceiling} · ${stored}` };
}

export type ObserveResult =
  | { wrote: "created" | "appended"; from: RolloutState | null; to: RolloutState }
  | { wrote: "unchanged" }
  | { wrote: "skipped"; why: "state unreadable" | "record unreadable" | "record malformed" | "older build" | "clock behind" | "lost the race" };

/**
 * ⭐ ONE OBSERVATION. Called by the lifecycle pass (leader only) with the defaults; the suites pass `read` and
 * `processStartedAt` to stand in for another container.
 */
export async function observeJourneyRollout(
  nowMs: number = Date.now(),
  opts: { read?: () => Promise<ObservedState>; processStartedAt?: number } = {},
): Promise<ObserveResult> {
  const seen = await (opts.read ?? readRolloutNow)().catch(() => null);
  if (!seen) return { wrote: "skipped", why: "state unreadable" };
  const started = opts.processStartedAt ?? PROCESS_STARTED_AT;
  const loaded = await storeLoad().catch(() => ({ ok: false as const }));
  if (!loaded.ok) return { wrote: "skipped", why: "record unreadable" };
  const parsed = parseLaunchRecord(loaded.value);
  if (parsed === "malformed") {
    console.error(`[journey-launch] the record "${JOURNEY_LAUNCH_KEY}" is malformed — left as it is; the panel reads it as unreadable`);
    return { wrote: "skipped", why: "record malformed" };
  }
  const at = new Date(nowMs).toISOString();
  const entry: StoredTransition = { at, state: seen.state, source: seen.source.slice(0, 200), processStartedAt: new Date(started).toISOString() };

  if (parsed === null) {
    const rec: StoredLaunchRecord = { v: JOURNEY_LAUNCH_VERSION, observedSince: at, transitions: [entry], gap: null };
    const r = await storeCreate(rec);
    if (r !== "created") return { wrote: "skipped", why: "lost the race" };
    await audit({
      category: "SYSTEM", action: "journey.rollout.observed", actorId: null, targetType: "JourneyRollout", targetId: JOURNEY_LAUNCH_KEY,
      payload: { from: null, to: seen.state, at, source: entry.source, firstObservation: true },
    });
    return { wrote: "created", from: null, to: seen.state };
  }

  const last = parsed.transitions[parsed.transitions.length - 1];
  if (last.state === seen.state) return { wrote: "unchanged" };
  if (started < Date.parse(last.processStartedAt)) return { wrote: "skipped", why: "older build" };
  if (nowMs < Date.parse(last.at)) return { wrote: "skipped", why: "clock behind" };
  const next = boundTransitions({ ...parsed, transitions: [...parsed.transitions, entry] });
  const swapped = await storeReplace(loaded.value, next);
  if (!swapped) return { wrote: "skipped", why: "lost the race" };
  await audit({
    category: "SYSTEM", action: "journey.rollout.observed", actorId: null, targetType: "JourneyRollout", targetId: JOURNEY_LAUNCH_KEY,
    payload: { from: last.state, to: seen.state, at, source: entry.source },
  });
  return { wrote: "appended", from: last.state, to: seen.state };
}

/* ── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type LaunchRecordRead =
  /** `facts` null: no record yet (the first lifecycle pass writes it). */
  | { ok: true; facts: LaunchFacts | null; record: StoredLaunchRecord | null }
  | { ok: false; why: "unreadable" | "malformed" };

/** The record, for the measures. ⛔ Never a guess: a failed or malformed read says so. Never throws. */
export async function journeyLaunchRecord(): Promise<LaunchRecordRead> {
  try {
    const loaded = await storeLoad();
    if (!loaded.ok) return { ok: false, why: "unreadable" };
    const parsed = parseLaunchRecord(loaded.value);
    if (parsed === "malformed") return { ok: false, why: "malformed" };
    return { ok: true, facts: parsed ? launchFactsOf(parsed) : null, record: parsed };
  } catch {
    return { ok: false, why: "unreadable" };
  }
}

/** ⚠️ TEST SEAM — the memory twin's row, for the suites and the dev seed route (never production: it is memory only). */
export function __setJourneyLaunchMemoryForTests(value: unknown): void {
  if (hasDatabase()) throw new Error("journey-launch: the memory seam is for the memory store only");
  mem().value = jsonCopy(value);
}
