import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ_NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatTzs(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `TZS ${sign}${TZ_NUMBER.format(Math.abs(value))}`;
}

/** ⭐ THE ONE COMPACTION GRAMMAR FOR MONEY ON THIS PLATFORM. Every player surface that shortens a
 *  TZS figure calls THIS — never a local `(x / 1000).toFixed(0)`, never a hand-written suffix.
 *
 *  The contract, so a caller can size a control without reading the body:
 *    ≥ 1e9  → "TZS 1.2B"   (1 dp)
 *    ≥ 1e6  → "TZS 1.3M"   (1 dp below 10M, 0 dp at or above it)
 *    ≥ 1e3  → "TZS 17K"    (rounded, UPPERCASE K)
 *    else   → "TZS 1,234"
 *  Negatives carry the real minus glyph "−" (U+2212), never a hyphen. The widest output is ten
 *  characters, "TZS 999.9M" — the width the landing hero's proof rail sizes its type steps
 *  against (see `.kp-proof__num` in globals.css).
 *
 *  ⚠️ WHY THIS EARNS A DOC BLOCK. The landing hero prints Σ open pools through this helper as
 *  "TZS 1.3M", while `/markets` printed the SAME quantity — same predicate, same book, both
 *  filtered by the same `discovery.ts` — as "TZS 1280k", because that one call site divided by
 *  1000 itself. Two adjacent player surfaces, one figure, two grammars. The A10 money-format
 *  guard only matches `.toLocaleString`, so a bare division walks straight past it.
 *  ⛔ Lowercase "k" is NOT this grammar. Four other sites compact numbers with their own
 *  thresholds (positions/pnl-chart, markets/conviction-dial, admin/admin-charts,
 *  updown/stake-math) and two of them are lowercase. Unifying those needs a unit-free SIBLING of
 *  this function, not a quiet edit here — they render different quantities, one of them is the
 *  betting dial, and changing this function's suffixes would move money copy on every surface. */
export function formatTzsCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `TZS ${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TZS ${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `TZS ${sign}${Math.round(abs / 1_000)}K`;
  return `TZS ${sign}${TZ_NUMBER.format(abs)}`;
}

/**
 * THE TOP-BAR BALANCE — exact while it is short enough to ROLL, letters once it
 * would outgrow the bar. Ali's rule, 2026-08-25.
 *
 * ⭐ WHY A THRESHOLD AND NOT SIMPLY `formatTzsCompact`. The pill's whole purpose is
 * to make a change VISIBLE: it rolls the digits and pulses gilt so a player sees
 * their money move. Compact ROUNDS to the nearest thousand, so a 500 TZS bet
 * against "TZS 195K" would change nothing on screen — the exact defect the pill was
 * built to fix, reintroduced on the device most players use. Rounding only where
 * rolling was never going to read anyway keeps both properties.
 *
 * ⭐ AND IT BOUNDS THE WIDTH, WHICH IS THE OTHER HALF. `formatTzs` grows with the
 * balance, so the pill is as wide as the player is rich and a bar that fits a small
 * balance can break for a big one. Above the threshold the string is ~6-8 characters
 * whatever the magnitude, so the widest the pill can EVER be is `TZS 999,999` — 11
 * characters, at any balance, for ever.
 *
 * ⚠️ THE THRESHOLD IS 1,000,000 AND IT WAS MEASURED, not chosen for roundness.
 * Production, 2026-08-25: 100 wallets, median TZS 0, p95 **TZS 886,854**, MAX
 * **TZS 1,000,000**; 4 wallets at or above 1M, none above 10M. So the rolling
 * counter keeps working for effectively every real player, and the compact branch
 * exists for the balances that would otherwise break the layout.
 *
 * ⛔ NO THIRD FORMAT IS INVENTED — both branches are formatters that already exist,
 * so this adds a CHOICE, not a spelling.
 */
export const BALANCE_COMPACT_ABOVE = 1_000_000;

export function formatBalancePill(value: number): string {
  return Math.abs(value) >= BALANCE_COMPACT_ABOVE ? formatTzsCompact(value) : formatTzs(value);
}

/** Absolute magnitude, no sign: "TZS 1,234" (rounds). For P&L cells that carry
 *  their own sign/colour and only need the number. */
export function formatTzsAbs(value: number): string {
  return `TZS ${TZ_NUMBER.format(Math.round(Math.abs(value)))}`;
}

/** Signed P&L: "+TZS 1,234" / "−TZS 1,234" (real minus glyph). */
export function formatTzsSigned(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatTzsAbs(value)}`;
}

export function formatNumber(value: number): string {
  return TZ_NUMBER.format(value);
}

/* ── Date formatting ─────────────────────────────────────────────── */

/** Platform timezone — admin-configurable at /admin/config, persisted to DB.
 *  Defaults to Africa/Dar_es_Salaam (EAT, UTC+3) for Tanzania.
 *  ALL player-visible times, AI sentinel prompts, and resolution displays
 *  use this timezone. Change it in admin → changes everywhere instantly.
 *  Admin/audit trails always store UTC; this only affects display. */
import { getPlatformTimezone } from "@/lib/server/platform-config";
/** Reads the current admin-configured timezone. Dynamic — reflects admin changes. */
export function PLATFORM_TZ_GET(): string { return getPlatformTimezone(); }
function tz(): string { return getPlatformTimezone(); }

/** "11 Jun 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz() });
}

/** "11 Jun" */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: tz() });
}

/** "11 Jun 2026, 14:30" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz() });
}

/** "11 Jun, 14:30" — day + clock, NO year (POLISH-BACKLOG §1.2).
 *
 *  For the compact 11px lines that state a deadline: "selection closes …",
 *  "results expected by …". Deliberately NOT `formatDateTime`, which adds the
 *  year and overflows those lines.
 *
 *  The reason this exists at all: three player-facing surfaces were calling
 *  `new Date(iso).toLocaleDateString("en-GB", {…})` INLINE with no `timeZone`,
 *  so they rendered in whatever zone the server happens to run in — three hours
 *  off EAT — while every helper in this file was already correct. A deadline
 *  three hours wrong is a real problem on a product where betting closes at one.
 *  Routing them through a named helper is what stops the next one drifting. */
export function formatDayTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz(),
  });
}

/**
 * THE DATE BESIDE A COUNTDOWN — day + clock, plus the YEAR when the deadline is
 * not in the year the reader is in.
 *
 * Jay (Gaming Board) item #6: every timer must name its absolute instant, so a
 * player reading "170 DAYS" does not have to do the arithmetic. `formatDayTime`
 * alone would have been the obvious fix and it is not enough:
 * ⚠️ MEASURED ON PRODUCTION 2026-08-25 — **7 of 51 LIVE markets resolve in a later
 * year on the platform clock**, the furthest at 170 days out
 * (`mkt_0d271bde3ae784abe12b`, 2027-02-10). Beside a three-digit DAYS cell, a bare
 * "10 Feb" is exactly the arithmetic the item exists to remove, and
 * DESIGN_AUTHORITY §A5 forbids clipping a timestamp — not stating only half of one.
 *
 * 🔴 THE FIRST CENSUS SAID **3 of 49**, AND IT WAS WRONG IN THE EXACT WAY THIS
 * FUNCTION EXISTS TO PREVENT. `resolutionAt` is `timestamp WITHOUT time zone`
 * holding UTC, and Postgres's `naive AT TIME ZONE 'Africa/Dar_es_Salaam'`
 * INTERPRETS a naive value as EAT wall time instead of converting it — the opposite
 * direction. It therefore missed every market sitting ON the boundary: four resolve
 * at 2026-12-31T21:00Z or later, which is 1 Jan 2027 in Dar. Those four are the
 * whole point. Re-derived the way the product does it — read as UTC, then ask Intl
 * for the year in `tz()` — which is what the number above now is.
 *
 * ⛔ It adds NO third format: both branches are formatters that already exist, so
 * the cross-year string is the same-year string plus a year. The choice is the only
 * new fact, and it lives here once.
 *
 * PURE and EXPORTED (`now` is a parameter, not a hidden `Date.now()`) because a rule
 * a suite has to hold cannot live inside a render — see SESSION-PROMPT-CLOSE-THE-BOARD
 * §1b. Guard: `npm run test:timer-date`.
 */
export function formatDeadline(iso: string, now: number = Date.now()): string {
  return sameZonedYear(iso, now) ? formatDayTime(iso) : formatDateTime(iso);
}

/** Do these two instants fall in the same year ON THE PLATFORM CLOCK? Asked through
 *  Intl in `tz()`, never `getFullYear()` — a New Year boundary is exactly where the
 *  host's zone and the platform's disagree, and that is the one moment this decides. */
function sameZonedYear(iso: string, now: number): boolean {
  const year = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: tz() }).format(d);
  return year(new Date(iso)) === year(new Date(now));
}

/** "11 Jun" — day + month, no year, timezone-correct. */
export function formatDayShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz() });
}

/** "14:30:05" — time-only for feeds / audit */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz() });
}

/** "14:30" — short clock for compact feeds */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz() });
}

/** "2026-06-11" — sortable date string */
export function formatDateISO(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** "11 Jun 2026, 14:30" — safe version that returns "—" for null/undefined/invalid */
export function formatDateTimeSafe(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return formatDateTime(iso);
}

/** "$0.05" — USD cost for AI generation reports */
export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Fill {placeholders} in an i18n string.
 *
 * The dictionary is a plain frozen object — there is no t() function and no ICU
 * layer — so interpolation is done at the call site. This is that, in one place,
 * with a GLOBAL replace: `String.replace("{pct}", …)` only swaps the FIRST
 * occurrence, so a sentence that mentions the rate twice would silently keep one
 * raw `{pct}` in the player's face. Several strings now do mention it twice.
 *
 *   fill(t.dialog.freeExitBody, { mins: 5, pct: 10 })
 */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (raw, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : raw,
  );
}

/** Format a rate (0.10) as a percentage string ("10%"), trimming a trailing .0 */
export function fmtRate(rate: number): string {
  return `${pctNum(rate)}%`;
}

/**
 * A rate (0.10) as the bare number for a "{pct}%" slot → 10.
 *
 * The copy carries the "%" so that Chinese can put it where Chinese puts it.
 * Rounded to one decimal: an admin who types 12.5% must see 12.5, not
 * 12.500000000000002.
 */
export function pctNum(rate: number): number {
  const v = rate * 100;
  return Number.isInteger(v) ? v : Number(v.toFixed(1));
}
