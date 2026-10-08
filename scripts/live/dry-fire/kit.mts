/**
 * THE DRY-FIRE HARNESS'S KIT — small, dependency-free pieces every other module of the harness stands on
 * (`scripts/live/marketing-dry-fire.mts`; spec `docs/marketing-specs/ENGINE-SPEC.md` §4.13 · §4.15):
 *
 *   · a SEEDED random source (`makeRng`, `unit`) — every choice the harness makes is a function of the run's seed, so a run
 *     that fails replays exactly (`--seed=N`);
 *   · a VIRTUAL WALL CLOCK (`clockOf`) — `Date` is replaced for the process by a function that reads the real clock plus an
 *     offset the harness moves FORWARD ONLY. The engine, `sendBatch`, the window, the reaper and the audit chain all read this
 *     one clock, so "ten minutes later" is one `advance` and every part of the system agrees on it. ⛔ The offset never goes
 *     back (the consent ledger's own clock holds a stamp at its highest value, `ledger-stamp.ts`);
 *   · a console TAP (`tapConsole`) — every line the server modules print is kept (never echoed) so the harness can prove no
 *     phone number reached a log line;
 *   · small statistics and table helpers.
 *
 * ⛔ NOTHING HERE TOUCHES A DATABASE, A NETWORK OR A SERVER MODULE. ⛔ This file holds no backslash (an editing tool decodes
 * them): line breaks are built from their codes and patterns are character classes.
 */
import { format } from "node:util";

export const NL = String.fromCharCode(10);
export const SEC = 1_000;
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
/** Africa/Dar_es_Salaam is UTC+3 all year (no daylight saving) — the offset the send window is judged by (`window.ts`). */
export const EAT_MS = 3 * HOUR;

export const pad = (n: number | string, width: number, ch = "0"): string => String(n).padStart(width, ch);
export const json = (v: unknown): string => JSON.stringify(v);
/** 12,345 — thousands separated by a comma, no locale. */
export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const sign = n < 0 ? "-" : "";
  const s = String(Math.round(Math.abs(n)));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return sign + out;
}
/** A duration in milliseconds, in the unit that reads best. */
export function ms(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  if (n < 1) return `${(Math.round(n * 100) / 100).toFixed(2)} ms`;
  if (n < 1_000) return `${(Math.round(n * 10) / 10).toFixed(1)} ms`;
  if (n < 60_000) return `${(Math.round(n / 10) / 100).toFixed(2)} s`;
  return `${(Math.round(n / 600) / 100).toFixed(2)} min`;
}

/* ══ THE SEEDED RANDOM SOURCE ═══════════════════════════════════════════════════════════════════════════════════════ */

/** FNV-1a over a string: a stable 32-bit hash, the same on every machine. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, well-spread generator over one 32-bit state. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  /** The next number in [0, 1). */
  next(): number;
  /** An integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  pick<T>(xs: readonly T[]): T;
  /** A new array in a seeded order (Fisher-Yates); the input is not touched. */
  shuffle<T>(xs: readonly T[]): T[];
  /** An independent source derived from this run's seed and a label — so adding a draw in one place never moves another. */
  fork(label: string): Rng;
};

export function makeRng(seed: number, label = ""): Rng {
  const gen = mulberry32((seed >>> 0) ^ hash32(label));
  const rng: Rng = {
    next: gen,
    int: (lo, hi) => lo + Math.floor(gen() * (hi - lo + 1)),
    chance: (p) => gen() < p,
    pick: (xs) => xs[Math.floor(gen() * xs.length)],
    shuffle: (xs) => {
      const a = xs.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(gen() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    },
    fork: (l) => makeRng(seed, `${label}/${l}`),
  };
  return rng;
}

/** A uniform number in [0, 1) that is a pure function of (seed, label, key) — the same for the same key whatever order the
 *  keys are asked in. Fault plans use it, so a plan never depends on the order requests happen to arrive in. */
export function unit(seed: number, label: string, key: string): number {
  return mulberry32(hash32(`${seed}|${label}|${key}`))();
}

/* ══ STATISTICS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type Summary = { count: number; min: number | null; median: number | null; p95: number | null; max: number | null; mean: number | null; sum: number };

/** Nearest-rank percentile over a sorted array. */
function rank(sorted: readonly number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

export function summarize(xs: readonly number[]): Summary {
  const v = xs.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (v.length === 0) return { count: 0, min: null, median: null, p95: null, max: null, mean: null, sum: 0 };
  const sum = v.reduce((a, b) => a + b, 0);
  return { count: v.length, min: v[0], median: rank(v, 0.5), p95: rank(v, 0.95), max: v[v.length - 1], mean: sum / v.length, sum };
}

/* ══ THE VIRTUAL WALL CLOCK ═════════════════════════════════════════════════════════════════════════════════════════ */

const RealDate: DateConstructor = globalThis.Date;
const realPerf = performance.now.bind(performance);

export type Clock = {
  /** Virtual wall time, epoch ms: the real clock plus the offset. */
  now(): number;
  /** A monotonic clock in ms: `performance.now()` plus the same offset — what the engine measures durations with. */
  mono(): number;
  /** Real elapsed time in ms, untouched by the offset — what the harness MEASURES with. */
  real(): number;
  offsetMs(): number;
  /** Move time forward by `ms` (never backwards). */
  advance(ms: number): void;
  /** Move time forward to `wallMs` (a no-op when that instant has passed). */
  jumpTo(wallMs: number): void;
  /** The epoch ms of an EAT wall-clock time on the EAT date `dayShift` days after today's (virtual). */
  eat(dayShift: number, hour: number, minute: number): number;
  /** Minutes after EAT midnight of a virtual instant. */
  eatMinutes(wallMs?: number): number;
  /** Move to 11:00 EAT of the next EAT day unless the clock already reads between 08:30 and 15:00 EAT — a scenario starts with
   *  the send window open and hours to spare, whatever time of day the run began (ENGINE-SPEC §5 rule 9). */
  alignToWindow(): void;
};

type ClockState = { offsetMs: number; api: Clock };
declare global {
  // eslint-disable-next-line no-var
  var __DRY_FIRE_CLOCK__: ClockState | undefined;
}

/**
 * ⭐ THE ONE VIRTUAL CLOCK OF THIS PROCESS — installed on first use, shared by every module instance, never uninstalled.
 * `Date` becomes a function whose prototype IS the real `Date.prototype` (as the fake-timer libraries do), so `instanceof Date`
 * holds for every date, real or virtual, and `Date.parse` / `Date.UTC` are the real ones. `new Date()` and `Date.now()` read the
 * offset; `new Date(x)` is untouched.
 */
export function clockOf(): Clock {
  const held = globalThis.__DRY_FIRE_CLOCK__;
  if (held) return held.api;
  const state: ClockState = { offsetMs: 0, api: null as unknown as Clock };
  const virtualNow = (): number => RealDate.now() + state.offsetMs;
  const VirtualDate = function (this: unknown, ...args: unknown[]): unknown {
    if (!new.target) return new RealDate(virtualNow()).toString();
    if (args.length === 0) return new RealDate(virtualNow());
    return Reflect.construct(RealDate, args, new.target);
  } as unknown as DateConstructor;
  Object.setPrototypeOf(VirtualDate, RealDate);
  Object.defineProperty(VirtualDate, "prototype", { value: RealDate.prototype, writable: false });
  Object.defineProperty(VirtualDate, "now", { value: virtualNow, writable: true, configurable: true });
  const eatMinutes = (wallMs: number = virtualNow()): number => {
    const moved = wallMs + EAT_MS;
    return Math.floor((moved - Math.floor(moved / DAY) * DAY) / MIN);
  };
  const eat = (dayShift: number, hour: number, minute: number): number => {
    const moved = virtualNow() + EAT_MS;
    const midnight = Math.floor(moved / DAY) * DAY - EAT_MS;
    return midnight + dayShift * DAY + hour * HOUR + minute * MIN;
  };
  const api: Clock = {
    now: virtualNow,
    mono: () => realPerf() + state.offsetMs,
    real: realPerf,
    offsetMs: () => state.offsetMs,
    advance: (by) => {
      if (Number.isFinite(by) && by > 0) state.offsetMs += by;
    },
    jumpTo: (at) => {
      const by = at - virtualNow();
      if (Number.isFinite(by) && by > 0) state.offsetMs += by;
    },
    eat,
    eatMinutes,
    alignToWindow: () => {
      const m = eatMinutes();
      if (m >= 8 * 60 + 30 && m < 15 * 60) return;
      const today = eat(0, 11, 0);
      api.jumpTo(today > virtualNow() ? today : eat(1, 11, 0));
    },
  };
  state.api = api;
  globalThis.__DRY_FIRE_CLOCK__ = state;
  globalThis.Date = VirtualDate;
  return api;
}

/* ══ THE CONSOLE TAP ════════════════════════════════════════════════════════════════════════════════════════════════ */

export type ConsoleTap = {
  /** Every line printed since the tap began, oldest first (each cut to 600 characters). */
  lines: string[];
  /** How many lines were swallowed. */
  count(): number;
  /** The lines printed since `mark()`'s answer. */
  since(mark: number): string[];
  mark(): number;
  stop(): void;
};

const LEVELS = ["log", "info", "warn", "error", "debug"] as const;

/** Swallow `console.*` into memory. The harness's own output goes through `out` (stdout directly), never through here. */
export function tapConsole(): ConsoleTap {
  const saved = LEVELS.map((l) => [l, console[l]] as const);
  const lines: string[] = [];
  let stopped = false;
  for (const l of LEVELS) {
    console[l] = (...args: unknown[]) => {
      if (lines.length < 400_000) lines.push(format(...args).slice(0, 600));
    };
  }
  return {
    lines,
    count: () => lines.length,
    since: (mark) => lines.slice(mark),
    mark: () => lines.length,
    stop: () => {
      if (stopped) return;
      stopped = true;
      for (const [l, fn] of saved) console[l] = fn;
    },
  };
}

/** Print one line to stdout, past any console tap. */
export function out(line = ""): void {
  process.stdout.write(line + NL);
}

/** Yield to the event loop once — a macrotask turn, so other pending work (another driver's step) runs before this resumes. */
export function yieldTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/* ══ TABLES ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A plain-text table: header row, a rule, rows — each column as wide as its widest cell. */
export function table(header: readonly string[], rows: readonly (readonly string[])[], align: readonly ("l" | "r")[] = []): string[] {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const cell = (s: string, i: number): string => (align[i] === "r" ? s.padStart(widths[i]) : s.padEnd(widths[i]));
  const line = (r: readonly string[]): string => `| ${header.map((_, i) => cell(r[i] ?? "", i)).join(" | ")} |`;
  const rule = `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`;
  return [line(header), rule, ...rows.map(line)];
}

/** An error's message, cut, as a claim's detail may carry it. */
export const why = (err: unknown): string => String((err as Error)?.message ?? err).slice(0, 240);
