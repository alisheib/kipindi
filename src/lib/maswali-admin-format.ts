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
