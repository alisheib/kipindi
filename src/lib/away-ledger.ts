"use client";

/**
 * The away-ledger — what settled while the player was not here, held until they are told.
 *
 * An outcome routed to `LEDGER` by `routeOutcome` is not discarded and not shown: it is
 * recorded here, and `AwaySummaryBar` states the whole set once, calmly, in one bar. That is
 * §F6 read literally — *a burst coalesces into one, never a stack* — applied to the burst
 * that prompted this work.
 *
 * ⛔ THIS IS NOT THE RECORD. The durable record of every one of these events is the bell:
 * a trilingual `Notification` row with 180-day retention, written on the server inside the
 * same transaction as the money. This is a presentation buffer for ONE sitting, which is why
 * it is `sessionStorage` and why losing it costs nothing — the player can always open the
 * bell and see everything. ⛔ Do not promote it to `localStorage` and do not let any figure
 * here become the thing a player is asked to trust; read the row.
 *
 * @see docs/DESIGN_AUTHORITY.md §F6 · §F7 (a promise about money is computed, never a constant)
 */

import type { OutcomeKind } from "@/lib/outcome-announcement";

export type LedgerEntry = {
  /** The producer's own dedupe key — `positionId` on the market lane, `roundId` on Up & Down.
   *  ⛔ Per POSITION, never per market: two bets on one market are two results, and a
   *  per-market key silently swallowed the second (the defect `notify-poller`'s own header
   *  records). */
  id: string;
  kind: OutcomeKind;
  /** The REALISED payout from the settled row. ⛔ Never a place-time projection: on a
   *  pari-mutuel market the pools keep moving after a bet, so the two are different numbers
   *  and only one of them was paid (E-115). */
  amount: number;
  stake: number;
  settledAtMs: number | null;
  label: string;
};

export type AwaySummary = {
  total: number;
  wins: number;
  losses: number;
  voids: number;
  /** ⛔ NON-NULL ONLY WHEN `homogeneous` IS. See `summarise`. */
  figure: number | null;
  /** The single outcome every entry shares, or `null` when the set is mixed. */
  homogeneous: OutcomeKind | null;
};

/* ⛔ STORAGE IS A CONVENIENCE, NEVER A DEPENDENCY. Shape copied from `reality-check.tsx`,
 * which was hardened after an unguarded `sessionStorage` touch threw in a storage-blocked
 * browser and took the whole signed-in app to the error page. The Map is the PRIMARY and
 * storage is the copy that survives a reload — written in that order so a throw on the way
 * out cannot lose what we already hold. */
const memStore = new Map<string, string>();

/** Per-user, because AppShell survives a soft-nav across login and logout: an unscoped key
 *  would show one account's settled results to the next person on the same browser. Same
 *  cross-account leak `reality-check.tsx` records and scopes for. */
let storeKey = "50pick:away-ledger:anon";

const subs = new Set<(entries: LedgerEntry[]) => void>();

function read(): LedgerEntry[] {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(storeKey);
  } catch { /* storage blocked — fall through to memory */ }
  if (raw === null) raw = memStore.get(storeKey) ?? null;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: LedgerEntry[]): void {
  const raw = JSON.stringify(entries);
  memStore.set(storeKey, raw);
  try { window.sessionStorage.setItem(storeKey, raw); } catch { /* memory already holds it */ }
  for (const fn of Array.from(subs)) fn(entries);
}

export function initLedger(userId: string | null): void {
  storeKey = `50pick:away-ledger:${userId ?? "anon"}`;
}

/**
 * Record one outcome the player was not present for.
 *
 * Idempotent by `id`, and it returns whether the entry is now held — which is what lets a
 * producer answer "was this delivered?" honestly before it writes an announced-marker.
 * ⛔ A producer that marks a result announced without checking this is the permanent-loss
 * defect, one layer down.
 */
export function recordAway(entry: LedgerEntry): boolean {
  const entries = read();
  if (entries.some((e) => e.id === entry.id)) return true;
  write([...entries, entry]);
  return true;
}

export function readAway(): LedgerEntry[] {
  return read();
}

export function clearAway(): void {
  write([]);
}

export function subscribeAway(fn: (entries: LedgerEntry[]) => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

/**
 * Reduce the ledger to what may honestly be said about it in one sentence.
 *
 * ⭐ **THE MONEY-HONESTY RULE: A SUMMARY CARRIES A FIGURE ONLY WHEN EVERY ENTRY SHARES ONE
 * OUTCOME.** Otherwise it carries counts, and the player opens the record.
 *
 * ⛔ WHY, CONCRETELY. Two wins of 12,000 and one loss of 4,000 is not "+TZS 8,000". That
 * number was never paid, never lost, and appears in no ledger row — it is the platform
 * inventing a figure that makes a mixed session read as a good one. It is the same class of
 * defect as striking a projected payout in gilt (E-115) and as calling a refund a loss
 * (E-65): a money statement the rows do not support.
 *
 * ⛔ AND THE STRICT READING IS THE RIGHT ONE. "TZS 24,000 paid" beside "1 lost" is still
 * refused, even though "paid" is itself homogeneous — a figure sitting next to a mixed count
 * reads as the session's result no matter how it is labelled, and the reader who most needs
 * the truth is the one skimming. `figure` is `null` whenever `homogeneous` is, full stop.
 *
 * The precedent is already in the product: the collapsed summary seal
 * (`win-celebration.tsx`) sums a wins-ONLY tail and drops the label, because naming one
 * market over a figure covering several would be false. This is that rule, generalised.
 */
export function summarise(entries: LedgerEntry[]): AwaySummary {
  const wins = entries.filter((e) => e.kind === "WIN").length;
  const losses = entries.filter((e) => e.kind === "LOSS").length;
  const voids = entries.filter((e) => e.kind === "VOID").length;
  const total = entries.length;

  const kinds = new Set(entries.map((e) => e.kind));
  const homogeneous = total > 0 && kinds.size === 1 ? entries[0].kind : null;

  // Each outcome's honest quantity is a different column: a win states what was PAID, a
  // refund states what came BACK, a loss states what was STAKED. ⛔ They are not
  // interchangeable and must never be added to one another.
  let figure: number | null = null;
  if (homogeneous === "WIN" || homogeneous === "VOID") {
    figure = entries.reduce((sum, e) => sum + e.amount, 0);
  } else if (homogeneous === "LOSS") {
    figure = entries.reduce((sum, e) => sum + e.stake, 0);
  }

  return { total, wins, losses, voids, figure, homogeneous };
}
