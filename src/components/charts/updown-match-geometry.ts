/**
 * THE MATCH TRACK'S GEOMETRY — pure numbers for `updown-match-track.tsx` (landing v3, R5 · spec
 * updown-band-v2 §5.1). A member of the chart home (`test:chart-one-home`); `test:updown-match` pins it.
 *
 * The track is a match timeline, not a price chart: x is TIME on a FIXED domain, open → deciding close
 * (never "open → the last read", which would slide every stem each time a read lands), and each confirmed
 * read is a stem from the opening line, up for UP and down for DOWN, its length a bounded function of how
 * far the read sits from the open. Everything is a percentage rounded to 2 dp, so the markup is stable.
 *
 * The scale D is floored three ways so a stem can never shout: 5 × the round's margin (a read just over
 * a target is a modest stem, and every tip clears the void band), 5 bps of the open (a quiet market does
 * not draw full-height stems off cents), and 1.1 × the largest move (the tallest stem keeps headroom).
 */
import type { UpdownBandRound } from "@/lib/updown-match";

export const MATCH = {
  /** Stem length bounds, % of plot height (from the rail at 50%). */
  stemMin: 10, stemMax: 40,
  /** Half-height of a LEVEL read's tie tick, % — 12px tall on the 56px plot. */
  tieHalf: 10.7,
  /** Bead radius (px, drawn by CSS offset onto the tip) and the opening dot's radius (px). */
  bead: 4, kick: 3,
  /** The void band is drawn only when at least this tall, % — invisible slivers are not drawn. */
  voidMinPct: 2.8,
  /** The scale's floor as a fraction of the open, in basis points. */
  scaleFloorBps: 5,
  /** Headroom over the largest move. */
  reach: 1.1,
} as const;

const r2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** An instant's x on the fixed open → close domain, % (0–100, 2 dp). The gate is `matchX(betsCloseAtMs)`:
 *  83.33% for 5/10/15/30/60-minute rounds, 75% for 3 (the span is the duration plus the result phase). */
export function matchX(ms: number, opensAtMs: number, closesAtMs: number): number {
  const span = closesAtMs - opensAtMs;
  if (!(span > 0) || !Number.isFinite(ms)) return 0;
  return r2(clamp((ms - opensAtMs) / span, 0, 1) * 100);
}

/** The scale D, in price units: max(reach × max|dev|, 5 × margin, open × 5 bps). */
export function matchScale(r: UpdownBandRound): number {
  const open = r.openPrice ?? 0;
  const maxDev = Math.max(0, ...(r.reads ?? []).map((x) => Math.abs(x.price - open)));
  const margin = r.openPrice != null && r.upTarget != null && r.downTarget != null
    ? Math.max(r.upTarget - open, open - r.downTarget) : 0;
  return Math.max(MATCH.reach * maxDev, 5 * margin, Math.abs(open) * MATCH.scaleFloorBps / 10_000);
}

export type MatchStem = { x: number; tip: number; side: "up" | "down"; latest: boolean };
export type MatchGeometry = {
  gatePct: number;
  /** The void band around the rail (top y and height, %), drawn only when ≥ `voidMinPct`. */
  void: { y: number; h: number } | null;
  /** The opening dot: the open is confirmed. */
  kick: boolean;
  /** LEVEL reads — a tick across the rail, never a stem. */
  ties: { x: number }[];
  stems: MatchStem[];
  /** The newest read, when it is not LEVEL. */
  bead: { x: number; y: number; side: "up" | "down" } | null;
};

export function matchGeometry(r: UpdownBandRound): MatchGeometry {
  const gatePct = matchX(r.betsCloseAtMs, r.opensAtMs, r.closesAtMs);
  const open = r.openPrice;
  const reads = r.reads ?? [];
  if (open == null) return { gatePct, void: null, kick: false, ties: [], stems: [], bead: null };
  const D = matchScale(r);
  let band: MatchGeometry["void"] = null;
  if (r.upTarget != null && r.downTarget != null && D > 0) {
    const top = 50 - ((r.upTarget - open) / D) * MATCH.stemMax;
    const bottom = 50 + ((open - r.downTarget) / D) * MATCH.stemMax;
    const h = bottom - top;
    if (h >= MATCH.voidMinPct) band = { y: r2(top), h: r2(h) };
  }
  const ties: { x: number }[] = [];
  const stems: MatchStem[] = [];
  let bead: MatchGeometry["bead"] = null;
  reads.forEach((read, i) => {
    const x = matchX(read.ms, r.opensAtMs, r.closesAtMs);
    if (read.side === "LEVEL") { ties.push({ x }); return; }
    const len = D > 0 ? clamp((Math.abs(read.price - open) / D) * MATCH.stemMax, MATCH.stemMin, MATCH.stemMax) : MATCH.stemMin;
    const side = read.side === "UP" ? "up" : "down";
    const tip = r2(side === "up" ? 50 - len : 50 + len);
    const latest = i === reads.length - 1;
    stems.push({ x, tip, side, latest });
    if (latest) bead = { x, y: tip, side };
  });
  return { gatePct, void: band, kick: true, ties, stems, bead };
}
