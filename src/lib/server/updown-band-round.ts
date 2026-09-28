/**
 * WHICH ROUND THE LANDING'S UP & DOWN BAND SHOWS, AND WHAT IT READS FROM IT (landing v3, R5 · spec
 * updown-band-v2 §3.3–§3.4). Server-side; zero new queries — it reads only what `getRoundDetail` returns.
 *
 * ── THE PICKER ──────────────────────────────────────────────────────────────────────────────────
 * The band is five sections down, so it shows a round a reader can still ACT on (≥ 2 minutes of betting
 * left) that has something to SHOW (a confirmed read after its open). Among those, the shortest duration
 * wins — the fast game's own pitch — and a tie goes to the round with the most time left. A round with
 * only its open is kept as a fallback (the kick-off state), used only when nothing better turns up.
 * Cost: usually one `getRoundDetail`, as before; never more than three.
 *
 * ── THE SIDE OF A READ ──────────────────────────────────────────────────────────────────────────
 * ⛔ THE SETTLEMENT FUNCTION ITSELF: `decideOutcomeByTargets`, imported unchanged. The band's "Juu
 * inaongoza" is the answer the round would settle on if it closed at that read — nothing re-derived.
 */
import { decideOutcomeByTargets } from "./updown-service";
import type { RoundDetail } from "./updown-board";
import { pickLocalized } from "@/lib/localized";
import type { Locale } from "@/lib/i18n-dict";
import { quoteStaleAtMs } from "@/lib/updown-quote-age";
import type { MatchRead, UpdownBandRound } from "@/lib/updown-match";

/** At least this much betting left: the band is five sections down, and a round picked with less had
 *  usually shut by the time anyone scrolled to it (v3 review). */
export const UD_MIN_LEFT_MS = 2 * 60_000;
/** ORDERING ONLY — BTC's confirmed grid is ~3 min and a read lands ~91 s after its boundary, so a younger
 *  round has usually seen only its open. The read itself decides (`hasPostOpenRead`). */
export const UD_READ_AGE_MS = 3 * 60_000;

/** The market-row fields the picker reads (an UPDOWN market's resolution IS its round's close). */
type Row = { createdAt: string; selectionClosedAt: string | null; resolutionAt: string };

export const isSeasoned = (m: Row, nowMs: number): boolean => nowMs - Date.parse(m.createdAt) >= UD_READ_AGE_MS;

/**
 * Up to three candidate rounds, best first: ≥ `UD_MIN_LEFT_MS` of betting left · seasoned first · the
 * shortest result phase (monotone in duration: 3→1, 5→1, 10→2, 15→3, 30→6, 60→12 min, so no duration
 * field is needed on the market row) · the most betting time left.
 */
export function pickBandCandidates<M extends Row>(rows: M[], nowMs: number): M[] {
  const lockMs = (m: Row) => Date.parse(m.selectionClosedAt ?? m.resolutionAt);
  const left = (m: Row) => lockMs(m) - nowMs;
  const phase = (m: Row) => Date.parse(m.resolutionAt) - lockMs(m);
  return rows
    .filter((m) => Number.isFinite(left(m)) && Number.isFinite(phase(m)) && left(m) >= UD_MIN_LEFT_MS)
    .sort((a, b) =>
      (Number(isSeasoned(b, nowMs)) - Number(isSeasoned(a, nowMs)))
      || (phase(a) - phase(b))
      || (left(b) - left(a)))
    .slice(0, 3);
}

/** The round-detail fields `hasPostOpenRead` looks at (a structural subset, so a test can build one). */
type ReadsView = { round: { opensAt: string; serverNowMs: number }; roundReads: { t: string }[] | null };

/** True when the round has a CONFIRMED read after its open and not after the server's now. */
export function hasPostOpenRead(d: ReadsView): boolean {
  const opens = Date.parse(d.round.opensAt);
  return d.roundReads?.some((r) => { const ms = Date.parse(r.t); return ms > opens && ms <= d.round.serverNowMs; }) ?? false;
}

type WalkView = ReadsView & { round: ReadsView["round"] & { state: string } };

/**
 * The walk over `pickBandCandidates`' answer (kept here, not inline in `page.tsx`, so `test:updown-match`
 * can drive it with a planted reader). The first candidate with something to show wins; the first
 * readable one without is the kick-off fallback; the walk stops at the first YOUNG candidate that has
 * nothing to show, because the list is sorted seasoned-first and every candidate after it is young too.
 * A read that fails (null) is skipped, never a zero.
 */
export async function walkBandCandidates<M extends Row, D extends WalkView>(
  candidates: M[], nowMs: number, readDetail: (m: M) => Promise<D | null>,
): Promise<D | null> {
  let fallback: D | null = null;
  for (const m of candidates) {
    const d = await readDetail(m).catch(() => null);
    if (!d || d.round.state !== "open" || Date.parse(d.round.opensAt) > d.round.serverNowMs) continue;
    if (hasPostOpenRead(d)) return d;          // the shortest duration that has something to show
    fallback ??= d;                             // kick-off state, if nothing better turns up
    if (!isSeasoned(m, nowMs)) break;           // sorted: every remaining candidate is young too
  }
  return fallback;
}

/** What the band draws, from fields `getRoundDetail` already returns. No money field (law 40). */
export function toUpdownBandRound(d: RoundDetail, locale: Locale): UpdownBandRound {
  const { round, asset } = d;
  const opensAtMs = Date.parse(round.opensAt);
  const closesAtMs = Date.parse(round.closesAt);
  const serverNowMs = round.serverNowMs;
  const { openPrice, upTarget, downTarget } = round;
  const targetsKnown = openPrice != null && upTarget != null && downTarget != null;
  // The quote time is `boundaryAt`: the bar feed's `quotedAt` IS the bar's datetime (updown-feed.ts), so
  // the stamp and the stem's x are one instant.
  const reads: MatchRead[] | null = !targetsKnown ? [] : d.roundReads == null ? null : d.roundReads
    .map((r) => ({ ms: Date.parse(r.t), price: r.price }))
    .filter((r) => Number.isFinite(r.ms) && Number.isFinite(r.price) && r.ms > opensAtMs && r.ms <= serverNowMs)
    .sort((a, b) => a.ms - b.ms)
    .map((r) => {
      const o = decideOutcomeByTargets(r.price, upTarget, downTarget).outcome;
      return { ...r, side: o === "UP" ? "UP" : o === "DOWN" ? "DOWN" : "LEVEL" } as MatchRead;
    });
  const newestMs = reads?.at(-1)?.ms ?? opensAtMs;
  return {
    roundId: round.roundId,
    assetName: pickLocalized(locale, asset.nameEn, asset.nameSw, asset.nameZh),
    assetKey: asset.key,
    iconKey: asset.iconKey,
    durationMinutes: round.durationMinutes,
    decimals: asset.decimals,
    openPrice,
    upTarget,
    downTarget,
    opensAtMs,
    betsCloseAtMs: Date.parse(round.selectionClosedAt ?? round.closesAt),
    closesAtMs,
    serverNowMs,
    reads,
    staleAtMs: openPrice == null ? null : quoteStaleAtMs(newestMs, d.readCadenceMs),
    readCadenceMs: d.readCadenceMs,
  };
}
