/**
 * THE MATCH — the landing's Up & Down band as a scoreboard (landing v3, R5 · spec updown-band-v2 §3.4).
 *
 * The band's one type and the pure rules that read it. Isomorphic by design: the server builds an
 * `UpdownBandRound` (`src/lib/server/updown-band-round.ts`), the band renders it, and the band's client
 * wrapper re-reads it once a minute (R5(a)) through the same functions — one reading of one round.
 *
 * ⛔ NO DIRECTIVE AND NO IMPORT FROM A `"use client"` MODULE. The server calls everything here; a client
 * helper called from server code once took down every page while the build stayed green.
 *
 * ⛔ LAW 40 IS ENFORCED BY THE TYPE. `UpdownBandRound` carries no money field of any kind — no pool, rate,
 * volume, player count or payout — so no render of it can promise winnings. `test:updown-match` §10 fails
 * on any key that looks like one.
 */
import { quoteStaleAtMs } from "./updown-quote-age";

/** Where one confirmed read stands against the round's frozen targets. VOID (between them) is LEVEL. */
export type MatchSide = "UP" | "DOWN" | "LEVEL";
export type MatchRead = { ms: number; price: number; side: MatchSide };
/** What the scoreboard says: a side leads, nobody leads, the round has only its open, or no price yet. */
export type MatchLead = "up" | "down" | "level" | "kickoff" | "awaiting";

export type UpdownBandRound = {
  roundId: string;
  assetName: string;
  /** The asset's key (BTC) — the mark's fallback letters and the public history feed's `asset`. */
  assetKey: string;
  iconKey: string;
  durationMinutes: number;
  decimals: number;
  openPrice: number | null;
  /** The frozen winning boundaries: ≥ upTarget is UP, ≤ downTarget is DOWN, strictly between voids. */
  upTarget: number | null;
  downTarget: number | null;
  opensAtMs: number;
  /** When betting closes (`selectionClosedAt ?? closesAt`) — what the clock counts to. */
  betsCloseAtMs: number;
  /** The deciding instant: the price at this boundary settles the round. */
  closesAtMs: number;
  serverNowMs: number;
  /** CONFIRMED reads with opensAt < ms ≤ serverNow, oldest first; side from the targets (VOID → LEVEL).
   *  null = the read FAILED (renders "Awaiting price"), never "no reads". [] when the targets are null. */
  reads: MatchRead[] | null;
  /** quoteStaleAtMs(newest read, or the open when there is none, readCadenceMs); null when openPrice is null. */
  staleAtMs: number | null;
  /** The asset's median confirmed-read cadence, so a read the band's 60-second refresh brings in (R5(a))
   *  ages by the same rule as the reads the server sent. Null when unmeasurable (the 5-minute floor rules). */
  readCadenceMs: number | null;
};
// ⛔ NO money field of any kind — no pools, rates, volume, players or payout. Law 40 is enforced by the type.

/** The scoreboard's answer. `reads: null` (a failed read) is awaiting, never "no new price". */
export function matchLead(r: UpdownBandRound): MatchLead {
  if (r.openPrice == null || r.upTarget == null || r.downTarget == null || r.reads == null) return "awaiting";
  const latest = r.reads.at(-1);
  if (!latest) return "kickoff";
  return latest.side === "UP" ? "up" : latest.side === "DOWN" ? "down" : "level";
}

/** The instant the verdict turns past tense: its quote goes stale, or the round reaches its deciding
 *  price — past that boundary every verdict is past tense. Null when nothing can age (no open). */
export function matchAgedAtMs(r: UpdownBandRound): number | null {
  return r.staleAtMs == null ? null : Math.min(r.staleAtMs, r.closesAtMs);
}

/**
 * The target rule for a read the CLIENT brings in (the 60-second refresh, R5(a)).
 *
 * ⛔ THE SERVER DOES NOT USE THIS. `toUpdownBandRound` calls the settlement function itself,
 * `decideOutcomeByTargets` (`updown-service.ts`), unchanged. That module is server-only (it reaches the
 * stores), so the browser cannot import it; this is its comparison, restated for the browser and pinned
 * EQUAL to it by `test:updown-match` §1 at both boundaries, one tick either side and a sweep between —
 * with a planted `>` for `>=` that must fail. Missing inputs are LEVEL here because the band only asks
 * this of a round whose open and targets are known (`matchLead` is awaiting otherwise).
 */
export function sideByTargets(price: number, upTarget: number, downTarget: number): MatchSide {
  if (!Number.isFinite(price) || !Number.isFinite(upTarget) || !Number.isFinite(downTarget)) return "LEVEL";
  if (price >= upTarget) return "UP";
  if (price <= downTarget) return "DOWN";
  return "LEVEL";
}

/**
 * ⭐ R5(c) · F1 (2026-09-27) — THE INK OF A CONFIRMED PRICE, BY THE ROUND'S TARGETS.
 *
 * The round page paints its hero figure by settlement's own rule (`decideOutcomeByTargets`, on the server, handed to
 * `price-hero.tsx` as `tone`). The `/updown` card and the terminal's live line are CLIENT code and cannot import that
 * server-only module, so they read this — `sideByTargets` above, pinned equal to settlement by `test:updown-match` §1 —
 * and §11b pins that both of them do, against a planted by-the-open copy that must fail.
 * UP ink at or above `upTarget`, DOWN ink at or below `downTarget`, muted strictly between: a banded round voids
 * anywhere inside its band, so a read there leads nobody (E-261 generalised — the band says "Nobody leads" there).
 * ⛔ Null when the price or either target is unknown or not a number; the caller decides what an unbanded round wears.
 */
export type ReadTone = "up" | "down" | "level";
export function readTone(
  price: number | null | undefined,
  upTarget: number | null | undefined,
  downTarget: number | null | undefined,
): ReadTone | null {
  if (price == null || upTarget == null || downTarget == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(upTarget) || !Number.isFinite(downTarget)) return null;
  const side = sideByTargets(price, upTarget, downTarget);
  return side === "UP" ? "up" : side === "DOWN" ? "down" : "level";
}

/** The token each tone paints with — `price-hero.tsx`'s own three inks, named once for the card (as `var()`) and for
 *  the terminal, whose canvas resolves a token NAME through `charts/ink-bridge.ts`. */
export const READ_TONE_TOKEN = { up: "--yes-300", down: "--no-300", level: "--text-muted" } as const satisfies Record<ReadTone, string>;

/**
 * The `/updown` card's value tone. By the TARGETS whenever the round has them; E-261's by-the-open rule ONLY for a
 * round that has none (a legacy round, or one whose targets are not frozen yet) — the same fallback `price-hero.tsx`
 * keeps when the page hands it no `tone`. Null when there is no price, or nothing to read it against.
 */
export function valueTone(
  price: number | null | undefined,
  openPrice: number | null | undefined,
  upTarget: number | null | undefined,
  downTarget: number | null | undefined,
): ReadTone | null {
  const byTargets = readTone(price, upTarget, downTarget);
  if (byTargets || price == null || !Number.isFinite(price)) return byTargets;
  if (openPrice == null || !Number.isFinite(openPrice)) return null;
  return price > openPrice ? "up" : price < openPrice ? "down" : "level";
}

/**
 * The terminal's ONE live-price line (§B12.6), in the ink of the round IN PLAY on the board (R5(c) · F1): the board's
 * first unsettled round with frozen targets, so the line and the card under it cannot disagree about one read.
 * ⛔ The gilt reference when no such round is in play, or its read has no tone — the terminal charts HISTORY, and a
 * line with no round to be read against states the price, not a side.
 */
export function liveLineToken(
  livePrice: number | null | undefined,
  round: { upTarget: number | null; downTarget: number | null } | null | undefined,
): (typeof READ_TONE_TOKEN)[ReadTone] | "--gilt" {
  const tone = round ? readTone(livePrice, round.upTarget, round.downTarget) : null;
  return tone ? READ_TONE_TOKEN[tone] : "--gilt";
}

/** Two confirmed reads are grid boundaries at least a minute apart, so anything closer than this to the
 *  newest read the band holds is that same observation seen again (a quote stamped a few seconds off its
 *  boundary), never a new one. */
export const MATCH_SAME_READ_MS = 30_000;

/**
 * Fold the newest CONFIRMED read (the public history feed's `livePrice` + `sourceQuotedAt`) into the round.
 * Returns the new round, or null when there is nothing new to show — the caller keeps what it has.
 *
 * ⛔ REAL READS ONLY. Nothing is interpolated: a read that landed while the tab was hidden and has since
 * been superseded is simply not drawn (the verdict always reads the newest). A read at or past the
 * deciding instant is not the band's to show — the round page announces results.
 */
export function mergeConfirmedRead(r: UpdownBandRound, price: unknown, quotedAt: unknown): UpdownBandRound | null {
  if (typeof price !== "number" || !Number.isFinite(price) || typeof quotedAt !== "string") return null;
  const ms = Date.parse(quotedAt);
  if (!Number.isFinite(ms)) return null;
  if (r.openPrice == null || r.upTarget == null || r.downTarget == null || r.reads == null) return null;
  if (ms <= r.opensAtMs || ms >= r.closesAtMs) return null;
  const newest = r.reads.at(-1)?.ms ?? r.opensAtMs;
  if (ms - newest < Math.max(MATCH_SAME_READ_MS, (r.readCadenceMs ?? 0) / 2)) return null;
  return {
    ...r,
    reads: [...r.reads, { ms, price, side: sideByTargets(price, r.upTarget, r.downTarget) }],
    staleAtMs: quoteStaleAtMs(ms, r.readCadenceMs),
  };
}
