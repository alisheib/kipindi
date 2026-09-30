/**
 * WHEN A CARD'S MARKET STOPS TAKING BETS, as the card's meta row says it — "Inafungwa leo" / "Siku {n}" (the Vodacom
 * plan S3, `docs/VODACOM-PLAN.md` §3.1; wording `journey.cardClosesToday` / `journey.cardDaysLeft`).
 *
 * ⭐ THE INSTANT IS WHEN BETTING CLOSES, NOT WHEN THE MARKET RESOLVES: `selectionClosedAt ?? resolutionAt`. A market
 * whose selection shuts days before its resolution would otherwise invite a bet the server then refuses.
 *
 * ⭐ "TODAY" IS AN EAST AFRICA DAY (`eatDayKey`, the platform's one definition). A market closing at 00:30 EAT is not
 * "closing today" at 23:59 EAT the evening before, however few minutes are left; and one closing tomorrow at 01:00 with
 * three hours to go is "Siku 1", not "leo". `n` counts EAT calendar days from today to the closing day — exactly the
 * way a reader in Dar es Salaam counts them.
 *
 * Pure (it imports only `eat-day.ts`, which imports nothing), so the card can render it and a suite can pin it.
 */
import { eatDayKey, eatDayStartMs } from "@/lib/eat-day";

export type CardCloseLabel =
  | { kind: "today" }
  | { kind: "days"; n: number }
  /** Betting has closed — the card shows no close label (it is not bettable). */
  | { kind: "closed" };

type Instant = string | number | Date | null | undefined;

const ms = (v: Instant): number | null => {
  if (v === null || v === undefined) return null;
  const t = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant betting closes: `selectionClosedAt`, else `resolutionAt`; null when neither is a real instant. */
export function cardClosesAtMs(m: { selectionClosedAt?: Instant; resolutionAt?: Instant }): number | null {
  return ms(m.selectionClosedAt) ?? ms(m.resolutionAt);
}

/** The label for a card at `nowMs`. `null` only when the market carries no closing instant at all. */
export function cardCloseLabel(m: { selectionClosedAt?: Instant; resolutionAt?: Instant }, nowMs: number): CardCloseLabel | null {
  const closes = cardClosesAtMs(m);
  if (closes === null || !Number.isFinite(nowMs)) return null;
  if (closes <= nowMs) return { kind: "closed" };
  const today = eatDayKey(nowMs);
  const closeDay = eatDayKey(closes);
  if (closeDay === today) return { kind: "today" };
  // Whole EAT days between the two calendar days (each an exact 24 h — Tanzania keeps no daylight saving).
  const n = Math.round((eatDayStartMs(closeDay) - eatDayStartMs(today)) / DAY_MS);
  return { kind: "days", n };
}

/** The words, from the reader's `journey` dictionary. Null for a closed market (no label) and for no instant. */
export function cardCloseText(
  label: CardCloseLabel | null,
  t: { cardClosesToday: string; cardDaysLeft: string; cardDaysLeftOne: string },
): string | null {
  if (!label || label.kind === "closed") return null;
  if (label.kind === "today") return t.cardClosesToday;
  return label.n === 1 ? t.cardDaysLeftOne : t.cardDaysLeft.replace("{n}", String(label.n));
}
