/**
 * U39 · WHAT ONE SEGMENT COSTS, MEASURED FROM OUR OWN SENDS — and how fast one chunk goes out.
 *
 * Pure and client-safe: it imports `sms-compose` and nothing else, and it reads a NARROW row (`CostWalkRow`) — no
 * number, no body, no reference — so the walk can be driven by a suite and can never carry a phone number anywhere.
 *
 * ── WHY A WALK, AND WHY THIS ONE ─────────────────────────────────────────────────────────────────────────────────
 * ⛔ NO PRICE CONSTANT EXISTS ANYWHERE IN THIS CODEBASE, and none is added here. `planSms` returns segments and
 * deliberately no money ("the price per segment is the provider's", `sms-compose.ts`); a hard-coded TZS 6 would go
 * stale the day the rate changes and would then be a fabricated promise about money (§7.5).
 *
 * ⭐ What the platform DOES hold is the raw material. Every accepted row carries the reply's balance
 * (`SmsMessage.balanceTzs`), and a reply's figure is PRE-CHARGE (`sms.ts`, `BLACKBALL-SMS.md` §1.4): the TZS 6 lands
 * after the reply. So for two consecutive chunks, `balance(i) − balance(i+1)` is chunk i's charge — when nothing else
 * could have been charged in between. That condition is the whole of this file.
 *
 * 🔴 "OVER RECENT ACCEPTED SENDS" WAS THE PLAN'S WORDING, AND IT UNDER-PRICES. Blackball bills per DELIVERED message:
 * one good number and one unroutable number were "accepted whole" and only TZS 6 was charged (`BLACKBALL-SMS.md`
 * §0 step 3). A walk over accepted chunks would price that pair at TZS 3 a message — the dangerous direction for a
 * spend estimate. So a pair counts only when EVERY row of the earlier chunk was DELIVERED.
 *
 * 🔴 AND A SEGMENT CANNOT BE READ OFF A ROW. `SmsMessage` has no segments column, only `bodyLen` (UTF-16 units). A
 * row is segment-CERTAIN only at `bodyLen ≤ 70` (`SMS_LIMITS.UCS2.single`): one segment in either coding. A longer
 * row (an invite, a marketing body) cannot be priced without a schema change U39 deliberately does not make, so its
 * chunk never forms a pair. Counting every body as one segment would double the price of a two-segment invite.
 *
 * ⭐ THE MEDIAN, NOT THE MEAN, AND NOT THE LAST PAIR. A top-up makes a pair negative, an asynchronous charge makes one
 * zero and the next one double. Those are voided or outvoted; a mean or a "latest pair" rule is moved by every one.
 *
 * Guard: `npm run test:campaign-estimate` §3. Red: `npm run red:campaign-estimate` (in memory).
 */
import { SMS_LIMITS } from "@/lib/sms-compose";

/** Mirrors `SmsStatus` (store.ts) — kept literal so this file imports nothing server-side. */
export type CostWalkStatus = "QUEUED" | "ACCEPTED" | "DELIVERED" | "FAILED" | "UNKNOWN";

/**
 * ⭐ THE ONLY FIELDS THE WALK MAY SEE. The server projects each `SmsMessage` row down to this before handing it over
 * (`server/marketing/estimate.ts`), so a number, a body length beyond its count, or a reference never enters it.
 */
export type CostWalkRow = {
  provider: string;
  status: CostWalkStatus;
  bodyLen: number;
  balanceTzs: number | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
};

/**
 * The walk's three limits, and the pace's one. `windowRows` is what the server reads (`listRecent`); `maxAgeDays`
 * drops a price older than a month (a rate change must age out); `minPairs` is how many clean pairs a median needs
 * before it is called a measurement; `minChunks` the same for the pace.
 */
export const COST_WALK = { windowRows: 500, maxAgeDays: 30, minPairs: 3, minChunks: 3 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const msOf = (iso: string | null): number => (iso === null ? Number.NaN : Date.parse(iso));

/**
 * One row's segment count when it is CERTAIN, else null. ⛔ Never a guess: `bodyLen ≤ 70` is one segment in GSM-7
 * and in UCS-2 alike; above it the coding (which the row does not record) decides, so the answer is "unknown".
 */
export function segmentsOf(r: CostWalkRow): number | null {
  return Number.isInteger(r.bodyLen) && r.bodyLen >= 1 && r.bodyLen <= SMS_LIMITS.UCS2.single ? 1 : null;
}

export type SegmentCostMeasure =
  | { kind: "measured"; tzsPerSegment: number; sends: number; pairs: number; spread: { min: number; max: number }; since: string }
  | { kind: "configured"; tzsPerSegment: number }
  | { kind: "unknown"; reason: "no-sends" | "too-few-sends" | "history-unreadable" };

/** One clean pair: the earlier chunk's charge (`delta`) over its certain segments. */
export type CostPair = { unit: number; delta: number; segments: number; rows: number; createdAt: string };

type Chunk = { createdAt: string; createdMs: number; sentMs: number; balance: number; rows: CostWalkRow[] };

/** The provider's rows created inside the walk's age window. */
function recentOf(rows: readonly CostWalkRow[], o: { provider: string; now: number }): CostWalkRow[] {
  const since = o.now - COST_WALK.maxAgeDays * DAY_MS;
  return rows.filter((r) => {
    if (r.provider !== o.provider) return false;
    const c = msOf(r.createdAt);
    return Number.isFinite(c) && c >= since;
  });
}

/**
 * Every VALID consecutive pair, in send order. A chunk is the rows sharing (createdAt, sentAt, balanceTzs) — one
 * request's reply, as `sendBatch` writes it. A pair (cᵢ, cᵢ₊₁) counts only when ALL of these hold:
 *   · every row of cᵢ is DELIVERED (billing is per delivered message — see the header);
 *   · every row of cᵢ has a CERTAIN segment count;
 *   · cᵢ₊₁ was created after cᵢ, and every cᵢ delivery is at or before cᵢ₊₁'s creation (the charge has landed
 *     before the next reading was asked for — so two chunks of ONE batch never pair);
 *   · no OTHER row of the provider was created, or delivered, inside (cᵢ.createdAt, cᵢ₊₁.createdAt] — a QUEUED or
 *     UNKNOWN send, an accepted row with no balance, or a late delivery of an earlier chunk could each have been
 *     charged between the two readings;
 *   · Δ = balance(cᵢ) − balance(cᵢ₊₁) is positive (a top-up or a not-yet-landed charge is voided, never averaged).
 * ⚠️ Conservative on purpose: a voided pair costs a measurement, a wrongly counted one costs an officer a wrong price.
 */
export function validCostPairs(rows: readonly CostWalkRow[], o: { provider: string; now: number }): CostPair[] {
  const ours = rows.filter((r) => r.provider === o.provider);
  const byKey = new Map<string, Chunk>();
  for (const r of recentOf(rows, o)) {
    if (r.sentAt === null || r.balanceTzs === null || !Number.isFinite(r.balanceTzs)) continue;
    const sentMs = msOf(r.sentAt);
    if (!Number.isFinite(sentMs)) continue;
    const key = `${r.createdAt}|${r.sentAt}|${r.balanceTzs}`;
    let c = byKey.get(key);
    if (!c) {
      c = { createdAt: r.createdAt, createdMs: msOf(r.createdAt), sentMs, balance: r.balanceTzs, rows: [] };
      byKey.set(key, c);
    }
    c.rows.push(r);
  }
  // Send order; on a tie the higher (earlier, pre-charge) balance first.
  const chunks = [...byKey.values()].sort((a, b) => a.sentMs - b.sentMs || b.balance - a.balance);

  const pairs: CostPair[] = [];
  for (let i = 0; i + 1 < chunks.length; i++) {
    const a = chunks[i];
    const b = chunks[i + 1];
    if (!(b.createdMs > a.createdMs)) continue;
    if (!a.rows.every((r) => r.status === "DELIVERED")) continue;
    let segments = 0;
    let certain = true;
    for (const r of a.rows) {
      const s = segmentsOf(r);
      if (s === null) { certain = false; break; }
      segments += s;
    }
    if (!certain || segments <= 0) continue;
    if (!a.rows.every((r) => { const d = msOf(r.deliveredAt); return Number.isFinite(d) && d <= b.createdMs; })) continue;
    const members = new Set<CostWalkRow>([...a.rows, ...b.rows]);
    const inside = (t: number) => Number.isFinite(t) && t > a.createdMs && t <= b.createdMs;
    if (ours.some((r) => !members.has(r) && (inside(msOf(r.createdAt)) || inside(msOf(r.deliveredAt))))) continue;
    const delta = a.balance - b.balance;
    if (!(delta > 0)) continue;
    pairs.push({ unit: delta / segments, delta, segments, rows: a.rows.length, createdAt: a.createdAt });
  }
  return pairs;
}

function medianOf(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * ⭐ THE PRICE OF ONE SEGMENT, AND WHERE IT CAME FROM. Measured (the median of ≥ 3 clean pairs) wins; otherwise the
 * configured price (the owner's, from the Marketing SMS settings — U49s), captioned "configured, not yet measured";
 * otherwise unknown.
 * ⛔ AN EMPTY HISTORY IS `unknown("no-sends")`, NEVER A PRICE OF 0 — a zero here would print "TZS 0" as a campaign cost.
 */
export function measureSegmentCost(
  rows: readonly CostWalkRow[],
  o: { provider: string; now: number; configuredTzs?: number | null },
): SegmentCostMeasure {
  const pairs = validCostPairs(rows, o);
  if (pairs.length >= COST_WALK.minPairs) {
    const units = pairs.map((p) => p.unit);
    return {
      kind: "measured",
      tzsPerSegment: medianOf(units),
      sends: pairs.reduce((n, p) => n + p.rows, 0),
      pairs: pairs.length,
      spread: { min: Math.min(...units), max: Math.max(...units) },
      since: pairs.reduce((s, p) => (p.createdAt < s ? p.createdAt : s), pairs[0].createdAt),
    };
  }
  const configured = o.configuredTzs;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return { kind: "configured", tzsPerSegment: configured };
  }
  return { kind: "unknown", reason: recentOf(rows, o).length === 0 ? "no-sends" : "too-few-sends" };
}

/* ══ THE PACE ════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type ChunkPace = { minChunkMs: number; chunks: number; batchMax: number };

/**
 * How long each chunk took, measured from our own rows: inside one batch (the rows sharing `createdAt`), chunk k took
 * `sentAt(k) − sentAt(k−1)`, and the first `sentAt(1) − createdAt`. A non-positive time is dropped (it measures
 * nothing). Exported so a suite can plant "the slowest chunk" against the same population.
 */
export function chunkTimes(rows: readonly CostWalkRow[], o: { provider: string; now: number }): number[] {
  const batches = new Map<string, { createdMs: number; sent: Set<number> }>();
  for (const r of recentOf(rows, o)) {
    if (r.sentAt === null) continue;
    const s = msOf(r.sentAt);
    if (!Number.isFinite(s)) continue;
    let b = batches.get(r.createdAt);
    if (!b) {
      b = { createdMs: msOf(r.createdAt), sent: new Set<number>() };
      batches.set(r.createdAt, b);
    }
    b.sent.add(s);
  }
  const out: number[] = [];
  for (const b of batches.values()) {
    let prev = b.createdMs;
    for (const s of [...b.sent].sort((x, y) => x - y)) {
      const d = s - prev;
      if (d > 0) out.push(d);
      prev = s;
    }
  }
  return out;
}

/**
 * ⭐ THE FASTEST MEASURED CHUNK, because the duration it feeds is a FLOOR: "at least this long". The slowest chunk
 * would turn the floor into a guess that can be beaten, and a mean into one that is beaten half the time. Null below
 * `COST_WALK.minChunks` timed chunks — "not yet measured" beats a floor drawn from one send.
 */
export function measureChunkPace(
  rows: readonly CostWalkRow[],
  o: { provider: string; now: number; batchMax: number },
): ChunkPace | null {
  const times = chunkTimes(rows, o);
  if (times.length < COST_WALK.minChunks || !(o.batchMax >= 1)) return null;
  return { minChunkMs: Math.min(...times), chunks: times.length, batchMax: o.batchMax };
}
