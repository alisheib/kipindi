/**
 * The Millionea console's two small formatting rules (MASWALI-BUILD S4), shared by its pages.
 * ⛔ Times are EAT, always — the week's rules are written in East Africa Time, and an officer in another zone must read
 *    the same clock the players do.
 */
import type { WeekState } from "@/lib/maswali-week-label";

const EAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** "Fri 23 Oct, 18:00" in East Africa Time, or a dash. */
export function fmtEat(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? EAT.format(d) : "—";
}

/**
 * ⭐ S6-ADMIN · G4 · AN INSTANT INSIDE A SENTENCE THE CONSOLE PRINTS — a refusal, the open's checklist, an alert:
 * "Fri 23 Oct, 18:00 (EAT)", the console's own time with its zone named, as its tables and hints write it. Never a raw
 * ISO string (the lead's ruling G4). Takes an ISO string or an epoch in milliseconds.
 */
export function eatInText(at: string | number | null | undefined): string {
  const iso = typeof at === "number" ? (Number.isFinite(at) ? new Date(at).toISOString() : null) : at;
  return `${fmtEat(iso)} (EAT)`;
}

/**
 * ⭐ HOW LONG AGO, AS THE CONSOLE SAYS IT (MASWALI-BUILD FLOW 8, the lead's ruling of 2026-10-23, from the GUIDE lane's walk):
 * the platform console's own wording ("4 h ago", "3 d ago" — the house console's `relativeEat`), in whole hours under 48
 * hours and whole days from 48. The real time since the instant, never a setting's threshold (the release-wait alert
 * printed "Alert when a release waits (hours)" as if it were the time since the window closed). A negative elapsed time
 * (a clock behind) reads as "0 h ago", never as a future.
 */
export function agoInText(elapsedMs: number): string {
  const hours = Math.max(0, Math.floor((Number.isFinite(elapsedMs) ? elapsedMs : 0) / 3_600_000));
  return hours < 48 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

const EAT_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", weekday: "short", day: "2-digit", month: "short" });
const EAT_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * The same instant in two halves, for a KPI tile: the day ("Fri 23 Oct") is the figure and the clock ("18:00") is the
 * line beneath it, which wraps. A tile's figure ellipsises when it is wider than its tile, and a clipped time is the one
 * part of a timestamp an officer needs (§A5).
 */
export function fmtEatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? EAT_DAY.format(d) : "—";
}
export function fmtEatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? EAT_CLOCK.format(d) : "—";
}

/** The same instant in the source's own zone, with the zone named — how the source itself prints the start. */
export function fmtInZone(iso: string | null | undefined, zone: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  try {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return `${f.format(d)} · ${zone}`;
  } catch {
    return `${EAT.format(d)} · EAT`;
  }
}

/**
 * ⭐ S6-ADMIN · G3 · AN OFFICER WITH NO NAME ON RECORD, as the console names them: a stable handle from the id's tail, in the
 * player handle's shape (`displayLabel`: "Player #A3F2K8") — "Officer #A3F2K8", never the raw id.
 */
export function officerHandle(id: string): string {
  return `Officer #${id.replace(/^usr_/, "").slice(-6).toUpperCase()}`;
}

/**
 * ⭐ S6-ADMIN · G6 · THE KINDS OF EVENT a question is built on, in the console's words (the lead's ruling G6: labels, not codes).
 * The stored value stays the code (`EventKind`, `maswali-dal.ts`); each kind has its criterion template in the builder.
 */
export const EVENT_KIND_LABEL: Readonly<Record<string, string>> = {
  SPORT: "Match result",
  PRICE: "Price or rate",
  WEATHER: "Weather reading",
  ANNOUNCEMENT: "Announcement",
};

/**
 * ⭐ MASWALI-BUILD FLOW 2 (the lead's ruling of 2026-10-23) · THE SEAL TABLE'S MARK ON A QUESTION STILL UNSEALED AT ITS VOID
 * DEADLINE. A fact, not a verdict: the officer seals the result from its source if the source gave it by the deadline,
 * and voids only a question with no result by then (the rules' section 5; the console's alert says so in full,
 * `voidDeadlineAlertText`). It read "void proposed", which leaned toward a void the rule may not allow. The console is
 * English only. `test:maswali-admin-plain` 9.7.
 */
export const VOID_DEADLINE_PASSED = "past its void deadline";

type ChipVariant = "neutral" | "live" | "pending" | "resolved" | "success" | "danger" | "info";

/** A week's state as a chip: the word the console uses and its tone. */
export function weekStateChip(state: WeekState): { label: string; variant: ChipVariant } {
  switch (state) {
    case "DRAFT": return { label: "Draft", variant: "neutral" };
    case "OPEN": return { label: "Selling", variant: "live" };
    case "CLOSED": return { label: "Closed", variant: "pending" };
    case "RESOLVING": return { label: "Sealing", variant: "info" };
    case "SETTLED": return { label: "Settled", variant: "success" };
    case "VOIDED": return { label: "Voided", variant: "danger" };
  }
}
