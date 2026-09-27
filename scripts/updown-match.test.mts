/**
 * THE MATCH TELLS THE TRUTH — the landing's Up & Down band (landing v3, R5 · spec updown-band-v2 §15.1).
 *
 *   npx tsx scripts/updown-match.test.mts          (npm run test:updown-match, in predeploy)
 *
 * The band says who is ahead of a real-money round, dated, and draws its confirmed reads on a timeline.
 * Every rule that makes that statement true is pinned here, and EVERY CHECK IS A FUNCTION run twice: on
 * the real implementation (must pass) and on a deliberately wrong one planted in this file (must fail) —
 * `>` for `>=`, an x-domain ending at the last read, a bare 5-minute floor, `reach` 1.25, a young
 * candidate walked past, a money key on the type. A check that cannot fail its control proves nothing.
 * ⛔ IN-PROCESS: no file is written and no repo file is mutated.
 *
 *  §1  a read's side IS settlement's (`decideOutcomeByTargets`), server and the refresh's browser copy
 *  §2  the x-domain is fixed open → close; the lock post sits at 83.33% (75% for 3-minute rounds)
 *  §3  a read at the open, or after the server's now, is not a stem
 *  §4  the scale's three floors; stems within [10, 40]%; every tip clears the void band
 *  §5  the void band: absent on BTC, drawn on gold
 *  §6  the shared stale rule is exactly the terminal's old strict `>`; no cadence ⇒ 5 minutes
 *  §7  the verdict ages at min(stale, close); kick-off ages from the open
 *  §8  all five leads; a failed read is awaiting, never "no new price"
 *  §9  the picker's order and the walk's stop
 *  §10 the round type carries no money (law 40)
 *  §11 R5(a) · the 60-second refresh folds in only a genuinely new confirmed read
 *  §12 the words, in en / sw / zh, and no eaten space (the served-HTML trap)
 *  §13 the band itself, rendered: S8 is today's band; a round renders the match in its DOM order
 */
import { readFileSync } from "node:fs";
import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict, type Dict, type Locale } from "../src/lib/i18n-dict.ts";
import { decideOutcomeByTargets } from "../src/lib/server/updown-service.ts";
import {
  matchLead, matchAgedAtMs, sideByTargets, mergeConfirmedRead, MATCH_SAME_READ_MS,
  type UpdownBandRound, type MatchSide,
} from "../src/lib/updown-match.ts";
import { QUOTE_GAP_FACTOR, QUOTE_STALE_FLOOR_MS, medianCadenceMs, quoteStaleAtMs, isQuoteStale } from "../src/lib/updown-quote-age.ts";
import {
  pickBandCandidates, walkBandCandidates, toUpdownBandRound, hasPostOpenRead, isSeasoned, UD_MIN_LEFT_MS, UD_READ_AGE_MS,
} from "../src/lib/server/updown-band-round.ts";
import { MATCH, matchX, matchScale, matchGeometry } from "../src/components/charts/updown-match-geometry.ts";
import { matchWords } from "../src/components/home/updown-match-words.tsx";
import { ALLOWED_DURATIONS, selectionClosesAt, roundSpanMinutes } from "../src/lib/updown-durations.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
/** A check returns its defects; the real code must return none and the planted copy at least one. */
const proves = (label: string, real: string[], planted: string[]) => {
  ok(label, real.length === 0, real.join("; "));
  ok(`${label} · CONTROL bites`, planted.length > 0, planted.length ? `planted caught: ${planted[0]}` : "the planted defect passed");
};
const MIN = 60_000;

// ── Fixtures ────────────────────────────────────────────────────────────────────────────────────
/** A readable round detail as `getRoundDetail` returns it (the fields the band reads). */
function detail(o: {
  open?: number | null; up?: number | null; down?: number | null; duration?: number; decimals?: number;
  opensAtMs?: number; nowMs?: number; reads?: { ms: number; price: number }[] | null; cadence?: number | null;
  state?: string; iconKey?: string; key?: string;
}) {
  const duration = o.duration ?? 10;
  const opensAtMs = o.opensAtMs ?? Date.UTC(2026, 8, 27, 11, 20);            // 14:20 EAT
  const closesAtMs = opensAtMs + roundSpanMinutes(duration) * MIN;
  const closesAt = new Date(closesAtMs).toISOString();
  return {
    round: {
      roundId: "udr_test", durationMinutes: duration, state: o.state ?? "open",
      opensAt: new Date(opensAtMs).toISOString(), closesAt, selectionClosedAt: selectionClosesAt(closesAt, duration),
      serverNowMs: o.nowMs ?? opensAtMs + 8 * MIN,
      openPrice: o.open === undefined ? 85000 : o.open,
      upTarget: o.up === undefined ? 85000.02 : o.up,
      downTarget: o.down === undefined ? 84999.98 : o.down,
    },
    asset: { key: o.key ?? "BTC", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: o.iconKey ?? "crypto", decimals: o.decimals ?? 2 },
    roundReads: o.reads === null ? null : (o.reads ?? []).map((r) => ({ t: new Date(r.ms).toISOString(), price: r.price })),
    readCadenceMs: o.cadence === undefined ? 3 * MIN : o.cadence,
  };
}
// deno-lint-ignore no-explicit-any
const band = (o: Parameters<typeof detail>[0], locale: Locale = "en") => toUpdownBandRound(detail(o) as any, locale);
const O = Date.UTC(2026, 8, 27, 11, 20);        // the round opens 14:20 EAT
// S1: reads at 14:23 (−$6.20) and 14:26 (+$18.52), rendered at 14:28.
const S1 = band({ reads: [{ ms: O + 3 * MIN, price: 84993.8 }, { ms: O + 6 * MIN, price: 85018.52 }] });
const S2 = band({ reads: [{ ms: O + 3 * MIN, price: 85004 }, { ms: O + 6 * MIN, price: 84987.6 }] });
// S3: gold, targets ±$0.40, read +$0.20.
const GOLD = { open: 2650, up: 2650.4, down: 2649.6, iconKey: "gold", key: "XAU" };
const S3 = band({ ...GOLD, reads: [{ ms: O + 6 * MIN, price: 2650.2 }] });
const S4 = band({ reads: [] });
const S6 = band({ reads: null });

const toSide = (o: string): MatchSide => (o === "UP" ? "UP" : o === "DOWN" ? "DOWN" : "LEVEL");

// ── §1 · the side of a read IS settlement's ─────────────────────────────────────────────────────
console.log("\n§1 · a read's side is decideOutcomeByTargets, at both boundaries and between");
function sideDefects(side: (p: number, u: number, d: number) => MatchSide): string[] {
  const d: string[] = [];
  const cases: [number, number, number][] = [];
  for (const [open, m, tick] of [[85000, 0.02, 0.01], [2650, 0.4, 0.01], [1.0845, 0.0003, 0.0001]] as const) {
    const u = open + m, dn = open - m;
    cases.push([u, u, dn], [dn, u, dn], [open, u, dn], [open + tick, u, dn], [open - tick, u, dn], [u - tick / 10, u, dn], [dn + tick / 10, u, dn]);
    for (let i = 0; i <= 400; i++) cases.push([dn - 2 * m + (i / 100) * m, u, dn]);
  }
  for (const [p, u, dn] of cases) {
    const want = toSide(decideOutcomeByTargets(p, u, dn).outcome);
    const got = side(p, u, dn);
    if (got !== want) { d.push(`price ${p} (up ${u}, down ${dn}): ${got}, settlement says ${want}`); if (d.length > 3) break; }
  }
  return d;
}
proves("1.1 the browser's copy (`sideByTargets`) equals settlement on 1,224 prices incl. both exact targets",
  sideDefects(sideByTargets), sideDefects((p, u, dn) => (p > u ? "UP" : p < dn ? "DOWN" : "LEVEL")));
ok("1.2 the SERVER's reads take settlement's side: exactly at upTarget is UP",
  band({ reads: [{ ms: O + 3 * MIN, price: 85000.02 }] }).reads![0].side === "UP");
ok("1.3 …exactly at downTarget is DOWN", band({ reads: [{ ms: O + 3 * MIN, price: 84999.98 }] }).reads![0].side === "DOWN");
ok("1.4 …one tick off the open is LEVEL (VOID → LEVEL)", band({ reads: [{ ms: O + 3 * MIN, price: 85000.01 }] }).reads![0].side === "LEVEL");

// ── §2 · the x-domain is fixed ──────────────────────────────────────────────────────────────────
console.log("\n§2 · the timeline's x-domain is fixed at [open, close]");
function gateDefects(x: (ms: number, open: number, close: number, lastReadMs: number) => number): string[] {
  const d: string[] = [];
  for (const dur of ALLOWED_DURATIONS) {
    const close = Date.UTC(2026, 8, 27, 12, 0);
    const open = close - roundSpanMinutes(dur) * MIN;
    const lock = Date.parse(selectionClosesAt(new Date(close).toISOString(), dur)!);
    const lastRead = open + Math.round((lock - open) / 3);
    const want = dur === 3 ? 75 : 83.33;
    const got = x(lock, open, close, lastRead);
    if (got !== want) d.push(`${dur}-minute round: the lock at ${got}%, want ${want}%`);
  }
  if (x(O, O, O + 12 * MIN, O + 3 * MIN) !== 0 || x(O + 12 * MIN, O, O + 12 * MIN, O + 3 * MIN) !== 100) d.push("open is not 0% or close is not 100%");
  if (x(O + 99 * MIN, O, O + 12 * MIN, O + 3 * MIN) !== 100 || x(O - MIN, O, O + 12 * MIN, O + 3 * MIN) !== 0) d.push("x is not clamped to [0, 100]");
  return d;
}
proves("2.1 the lock post: 83.33% for 5/10/15/30/60, 75% for 3; open 0, close 100, clamped",
  gateDefects((ms, o, c) => matchX(ms, o, c)),
  gateDefects((ms, o, _c, last) => Math.round(Math.min(1, Math.max(0, (ms - o) / (last - o))) * 10000) / 100));
ok("2.2 the geometry's gate IS matchX(betsClose)", matchGeometry(S1).gatePct === 83.33, `${matchGeometry(S1).gatePct}`);
const g1 = matchGeometry(S1);
ok("2.3 S1's stems stand at their reads' own instants (25% and 50% of a 12-minute span)",
  g1.stems.length === 2 && g1.stems[0].x === 25 && g1.stems[1].x === 50, JSON.stringify(g1.stems.map((s) => s.x)));

// ── §3 · what counts as a read ──────────────────────────────────────────────────────────────────
console.log("\n§3 · a read at the open, or after the server's now, is not a stem");
const edge = detail({ reads: [{ ms: O, price: 85000 }, { ms: O + 3 * MIN, price: 85010 }, { ms: O + 8 * MIN, price: 85020 }, { ms: O + 9 * MIN, price: 85030 }], nowMs: O + 8 * MIN });
const readsDefects = (reads: { ms: number }[] | null): string[] =>
  !reads ? ["no reads"] : [
    ...(reads.some((r) => r.ms === O) ? ["the OPENING read was drawn as a stem"] : []),
    ...(reads.some((r) => r.ms > O + 8 * MIN) ? ["a read after the server's now was drawn"] : []),
    ...(reads.length !== 2 ? [`${reads.length} reads kept, want 2 (the one after the open and the one AT now)`] : []),
  ];
// deno-lint-ignore no-explicit-any
const edgeReads = toUpdownBandRound(edge as any, "en").reads;
const plantedEdge = edge.roundReads!.map((r) => ({ ms: Date.parse(r.t) })).filter((r) => r.ms >= O && r.ms <= O + 9 * MIN);
proves("3.1 opensAt < ms ≤ serverNow", readsDefects(edgeReads), readsDefects(plantedEdge));
ok("3.2 hasPostOpenRead: false with only the opening read", !hasPostOpenRead(detail({ reads: [{ ms: O, price: 85000 }] })));
ok("3.3 hasPostOpenRead: true with a read after it", hasPostOpenRead(detail({ reads: [{ ms: O, price: 85000 }, { ms: O + 3 * MIN, price: 85001 }] })));
ok("3.4 hasPostOpenRead: false when that read is after the server's now",
  !hasPostOpenRead(detail({ reads: [{ ms: O + 9 * MIN, price: 85001 }], nowMs: O + 8 * MIN })));
ok("3.5 targets unknown ⇒ reads [] (awaiting), never a side guessed from the open",
  JSON.stringify(band({ up: null, down: null, reads: [{ ms: O + 3 * MIN, price: 85001 }] }).reads) === "[]");
ok("3.6 a failed read stays null", band({ reads: null }).reads === null);

// ── §4 · the scale's floors and the stems ───────────────────────────────────────────────────────
console.log("\n§4 · D = max(1.1 × max|dev|, 5 × margin, 5 bps of the open); stems in [10, 40]%");
const huge = band({ reads: [{ ms: O + 3 * MIN, price: 85500 }] });
function scaleDefects(scale: (r: UpdownBandRound) => number): string[] {
  const d: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (!near(scale(S1), 42.5)) d.push(`BTC at $85k: D ${scale(S1)}, want the 5 bps floor 42.5`);
  if (!near(scale(S3), 2)) d.push(`gold ±$0.40: D ${scale(S3)}, want the 5 × margin floor 2`);
  if (!near(scale(huge), 550)) d.push(`a +$500 read: D ${scale(huge)}, want the 1.1 × reach 550`);
  return d;
}
proves("4.1 each of the three floors binds where it should", scaleDefects(matchScale),
  scaleDefects((r) => Math.max(1.25 * Math.max(0, ...(r.reads ?? []).map((x) => Math.abs(x.price - r.openPrice!))),
    5 * Math.max(r.upTarget! - r.openPrice!, r.openPrice! - r.downTarget!), r.openPrice! * 5 / 10_000)));
ok("4.2 S1: +$18.52 draws 17.43% up (tip 32.57), −$6.20 takes the 10% floor (tip 60)",
  g1.stems[1].tip === 32.57 && g1.stems[0].tip === 60, JSON.stringify(g1.stems));
ok("4.3 the tallest stem keeps its headroom: +$500 draws 40/1.1 = 36.36%", matchGeometry(huge).stems[0].tip === 13.64,
  `${matchGeometry(huge).stems[0].tip}`);
let stemBad = "", tipBad = "";
for (let i = 0; i < 400; i++) {
  const open = 100 + i * 211.7, m = open * (0.00001 + (i % 17) * 0.00004);
  const rr: { ms: number; price: number }[] = [];
  for (let k = 0; k < 1 + (i % 5); k++) rr.push({ ms: O + (k + 1) * MIN, price: open + (((i * 7 + k * 13) % 41) - 20) * m * 0.9 });
  const r = band({ open, up: open + m, down: open - m, reads: rr });
  const g = matchGeometry(r);
  const D = matchScale(r);
  const top = 50 - (m / D) * MATCH.stemMax, bottom = 50 + (m / D) * MATCH.stemMax;
  for (const s of g.stems) {
    const len = Math.abs(50 - s.tip);
    if (len < MATCH.stemMin - 0.01 || len > MATCH.stemMax + 0.01) stemBad ||= `round ${i}: stem ${len}%`;
    if (s.side === "up" ? s.tip > top + 0.01 : s.tip < bottom - 0.01) tipBad ||= `round ${i}: tip ${s.tip} inside the void band [${top}, ${bottom}]`;
  }
}
ok("4.4 every stem of 400 generated rounds stays within [10, 40]%", !stemBad, stemBad);
ok("4.5 every tip clears the void band's edge", !tipBad, tipBad);
ok("4.6 only the NEWEST read is the latest stem and carries the bead",
  g1.stems.filter((s) => s.latest).length === 1 && g1.stems[1].latest && g1.bead?.x === 50 && g1.bead.side === "up");
const levelLast = matchGeometry(band({ reads: [{ ms: O + 3 * MIN, price: 85030 }, { ms: O + 6 * MIN, price: 85000.01 }] }));
ok("4.7 a LEVEL newest read is a tie tick; no bead, and the earlier UP stem is not lit as latest",
  levelLast.bead === null && levelLast.ties.length === 1 && levelLast.stems.every((s) => !s.latest));

// ── §5 · the void band ──────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the void band: never on BTC, a faint band on gold");
ok("5.1 BTC ±$0.02 at $85k: no void band", matchGeometry(S1).void === null);
const gv = matchGeometry(S3).void;
ok("5.2 gold ±$0.40: a void band ≥ 2.8% (16% here, centred on the rail)", gv != null && gv.h >= MATCH.voidMinPct && gv.y === 42 && gv.h === 16, JSON.stringify(gv));

// ── §6 · the shared stale rule ──────────────────────────────────────────────────────────────────
console.log("\n§6 · quoteStaleAtMs is exactly the terminal's old strict `>`");
const oldStale = (q: number, now: number, c: number | null) => now - q > Math.max(c != null ? 2.5 * c : 0, 5 * 60_000);
function staleDefects(staleAt: (q: number, c: number | null) => number): string[] {
  const d: string[] = [];
  const q = 1_790_000_000_000;
  for (const c of [null, 7, 60_000, 3 * MIN, 3 * MIN + 1, 200_001, 12 * MIN]) {
    // Instants are integer ms (Date.parse / Date.now), so the boundary a reader meets is the first
    // integer at or past the returned value.
    const s = Math.ceil(staleAt(q, c));
    if (oldStale(q, s - 1, c) || !oldStale(q, s, c)) d.push(`cadence ${c}: the boundary is ${s - q} ms, the old rule's is not`);
    if (!Number.isInteger(staleAt(q, c))) d.push(`cadence ${c}: a fractional instant ${staleAt(q, c) - q}`);
  }
  return d;
}
proves("6.1 the first stale instant matches the old rule to the millisecond (odd cadences included)",
  staleDefects(quoteStaleAtMs), staleDefects((q, c) => q + Math.max(c != null ? 2.5 * c : 0, 5 * 60_000) + 1));
ok("6.1b CONTROL · a bare 5-minute floor (cadence ignored) is also caught",
  staleDefects((q) => q + 5 * 60_000 + 1).length > 0);
ok("6.2 no cadence ⇒ the 5-minute floor", quoteStaleAtMs(0, null) === QUOTE_STALE_FLOOR_MS + 1 && QUOTE_STALE_FLOOR_MS === 300_000);
ok("6.3 BTC's ~3-minute grid: a read is current for 7.5 minutes", quoteStaleAtMs(0, 3 * MIN) === 450_001 && QUOTE_GAP_FACTOR === 2.5);
let sweepBad = "";
for (let k = -3; k <= 3; k++) for (const c of [null, 3 * MIN + 1]) {
  const now = quoteStaleAtMs(0, c) + k;
  if (isQuoteStale(0, now, c) !== oldStale(0, now, c)) sweepBad ||= `cadence ${c} at +${k}`;
}
ok("6.4 isQuoteStale ⟺ the old rule around the boundary", !sweepBad, sweepBad);
ok("6.5 medianCadenceMs: null below two deltas, the median otherwise",
  medianCadenceMs([0, 60]) === null && medianCadenceMs([0, 60, 180]) === 120 && medianCadenceMs([0, 60, 180, 190]) === 60);
ok("6.6 the terminal no longer holds a private copy of the rule",
  !/5 \* 60_000\)/.test(readFileSync(new URL("../src/lib/server/updown-board.ts", import.meta.url), "utf8")));

// ── §7 · ageing ─────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · the verdict ages at min(stale, close)");
const early = band({ reads: [{ ms: O + 3 * MIN, price: 85018.52 }] });
ok("7.1 a 14:23 read ages 7.5 minutes later, at 14:30:30 — before the 14:32 close", matchAgedAtMs(early) === O + 3 * MIN + 450_001);
ok("7.1b S1's 14:26 read would go stale at 14:33:30, so S1 ages at the 14:32 close", matchAgedAtMs(S1) === S1.closesAtMs);
const late = band({ reads: [{ ms: O + 10 * MIN, price: 85020 }], nowMs: O + 10 * MIN + 5_000 });
ok("7.2 a read too late to go stale before the close ages AT the close", matchAgedAtMs(late) === late.closesAtMs);
ok("7.3 kick-off ages from the OPEN", S4.staleAtMs === quoteStaleAtMs(O, 3 * MIN) && matchAgedAtMs(S4) === O + 450_001);
ok("7.4 no open price ⇒ nothing can age", band({ open: null, up: null, down: null }).staleAtMs === null);

// ── §8 · the five leads ─────────────────────────────────────────────────────────────────────────
console.log("\n§8 · matchLead covers all five");
ok("8.1 up · down · level · kickoff · awaiting",
  matchLead(S1) === "up" && matchLead(S2) === "down" && matchLead(S3) === "level" && matchLead(S4) === "kickoff" && matchLead(S6) === "awaiting",
  [S1, S2, S3, S4, S6].map(matchLead).join(","));
ok("8.2 a FAILED read is awaiting — never the kick-off's 'no new price since the open'", matchLead(S6) === "awaiting");
ok("8.3 no open or no targets is awaiting", matchLead(band({ open: null })) === "awaiting" && matchLead(band({ up: null, down: null })) === "awaiting");

// ── §9 · the picker and the walk ────────────────────────────────────────────────────────────────
console.log("\n§9 · ≥ 2 min left · seasoned first · shortest duration · most time left · three · stop at the young");
const NOW = Date.UTC(2026, 8, 27, 12, 0);
const row = (id: string, dur: number, leftMin: number, ageMin: number) => {
  const lock = NOW + leftMin * MIN;
  const close = lock + (roundSpanMinutes(dur) - dur) * MIN;
  return { id, createdAt: new Date(NOW - ageMin * MIN).toISOString(), selectionClosedAt: new Date(lock).toISOString(), resolutionAt: new Date(close).toISOString() };
};
const rows = [
  row("E-60m", 60, 50, 10), row("B-10m-5left", 10, 5, 5), row("F-1left", 3, 1, 2),
  row("D-5m-young", 5, 4, 1), row("A-3m", 3, 2.5, 3.5), row("C-10m-7left", 10, 7, 3),
];
function pickDefects(pick: typeof pickBandCandidates): string[] {
  const got = pick(rows, NOW).map((r) => r.id).join(",");
  return got === "A-3m,C-10m-7left,B-10m-5left" ? [] : [`picked ${got}`];
}
proves("9.1 the order and the three", pickDefects(pickBandCandidates),
  pickDefects(((r: typeof rows, n: number) => r.filter((m) => Date.parse(m.selectionClosedAt!) - n >= UD_MIN_LEFT_MS)
    .sort((a, b) => Date.parse(a.selectionClosedAt!) - Date.parse(b.selectionClosedAt!)).slice(0, 3)) as typeof pickBandCandidates));
ok("9.2 under 2 minutes of betting is never shown", !pickBandCandidates(rows, NOW).some((r) => r.id === "F-1left") && UD_MIN_LEFT_MS === 120_000);
ok("9.3 seasoned = 3 minutes old", isSeasoned(row("x", 10, 5, 3), NOW) && !isSeasoned(row("x", 10, 5, 2.9), NOW) && UD_READ_AGE_MS === 180_000);
type D = ReturnType<typeof detail>;
const mk = (id: string, withRead: boolean, state = "open") =>
  detail({ reads: withRead ? [{ ms: O + 3 * MIN, price: 85010 }] : [{ ms: O, price: 85000 }], nowMs: O + 5 * MIN, state });
async function walkDefects(walk: typeof walkBandCandidates): Promise<string[]> {
  const d: string[] = [];
  const cands = [row("S-noread", 10, 5, 10), row("Y-noread", 10, 6, 1), row("Y2-read", 10, 7, 1)];
  const byId: Record<string, D> = { "S-noread": mk("S", false), "Y-noread": mk("Y", false), "Y2-read": mk("Y2", true) };
  const seen: string[] = [];
  const got = await walk(cands, NOW, async (m) => { seen.push(m.id); return byId[m.id]; });
  if (got !== byId["S-noread"]) d.push(`returned ${Object.entries(byId).find(([, v]) => v === got)?.[0]}, want the seasoned kick-off fallback`);
  if (seen.join(",") !== "S-noread,Y-noread") d.push(`read ${seen.join(",")} — it must stop at the first young candidate`);
  const first = await walk([row("S1", 10, 5, 10), row("S2", 10, 6, 10)], NOW, async (m) => (m.id === "S1" ? mk("S1", false) : mk("S2", true)));
  if (!first || !hasPostOpenRead(first)) d.push("a seasoned round WITH a read was passed over for a kick-off");
  const skip = await walk([row("X", 10, 5, 10), row("L", 10, 5, 10), row("S", 10, 6, 10)], NOW, async (m) =>
    m.id === "X" ? Promise.reject(new Error("store down")) : m.id === "L" ? mk("L", true, "locked") : mk("S", true));
  if (!skip || skip.round.state !== "open") d.push("a failed or locked read was not skipped");
  return d;
}
proves("9.4 the walk: first with a read wins; kick-off fallback; stops at the young; skips failures",
  await walkDefects(walkBandCandidates),
  await walkDefects((async (cands, _n, read) => {
    let fb = null;
    for (const m of cands) { const d = await read(m).catch(() => null); if (!d || d.round.state !== "open") continue; if (hasPostOpenRead(d)) return d; fb ??= d; }
    return fb;
  }) as typeof walkBandCandidates));

// ── §10 · no money on the type ──────────────────────────────────────────────────────────────────
console.log("\n§10 · UpdownBandRound carries no money field (law 40)");
const typeSrc = readFileSync(new URL("../src/lib/updown-match.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const block = typeSrc.match(/export type UpdownBandRound = \{([\s\S]*?)\n\};/)?.[1] ?? "";
const typeKeys = [...block.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").matchAll(/(\w+)\??\s*:/g)].map((m) => m[1]);
const moneyDefects = (keys: string[]) => keys.filter((k) => k !== "openPrice" && /pool|rate|volume|player|payout|price$/i.test(k)).map((k) => `money key "${k}"`);
proves("10.1 no pool / rate / volume / player / payout / price key but openPrice", moneyDefects(typeKeys), moneyDefects([...typeKeys, "poolTzs"]));
ok("10.2 the parsed type IS the object the server builds (so 10.1 read the real shape)",
  typeKeys.length > 10 && JSON.stringify([...typeKeys].sort()) === JSON.stringify(Object.keys(S1).sort()),
  `type [${typeKeys.join(",")}] · object [${Object.keys(S1).join(",")}]`);

// ── §11 · R5(a) · the 60-second refresh ─────────────────────────────────────────────────────────
console.log("\n§11 · R5(a) · a refresh folds in only a genuinely new confirmed read");
const iso = (ms: number) => new Date(ms).toISOString();
type Merge = typeof mergeConfirmedRead;
function mergeDefects(merge: Merge): string[] {
  const d: string[] = [];
  const next = merge(S1, 84987.6, iso(O + 9 * MIN));
  if (!next || next.reads!.length !== 3 || next.reads![2].side !== "DOWN" || next.reads![2].ms !== O + 9 * MIN) d.push("a new read 3 minutes on was not appended as DOWN");
  else {
    if (next.staleAtMs !== quoteStaleAtMs(O + 9 * MIN, S1.readCadenceMs)) d.push("the new read did not re-age the verdict");
    if (matchLead(next) !== "down") d.push("the lead did not follow the new read");
  }
  if (merge(S1, 85018.52, iso(O + 6 * MIN + 5_000))) d.push("the SAME observation (quoted 5 s off its boundary) was drawn twice");
  if (merge(S1, 85030, iso(O + 5 * MIN))) d.push("an OLDER read was appended");
  if (merge(S1, 85030, iso(S1.closesAtMs))) d.push("the deciding read was shown on the band");
  if (merge(S4, 85030, iso(O))) d.push("the opening read was drawn as a stem");
  if (merge(S1, "85030", iso(O + 9 * MIN)) || merge(S1, 85030, null) || merge(S1, Number.NaN, iso(O + 9 * MIN))) d.push("a malformed feed was folded in");
  if (merge(S6, 85030, iso(O + 9 * MIN))) d.push("a FAILED round read came alive from one refresh");
  const k = merge(S4, 85000.01, iso(O + 3 * MIN));
  if (!k || matchLead(k) !== "level") d.push("kick-off did not take its first read");
  return d;
}
proves("11.1 new → appended with settlement's side and re-aged; same, older, deciding, malformed → nothing",
  mergeDefects(mergeConfirmedRead),
  mergeDefects(((r, price, q) => {
    if (typeof price !== "number" || typeof q !== "string" || r.reads == null) return null;
    const ms = Date.parse(q);
    return { ...r, reads: [...r.reads, { ms, price, side: sideByTargets(price, r.upTarget!, r.downTarget!) }] };
  }) as Merge));
ok("11.2 the same-read window is 30 s (reads are grid boundaries ≥ a minute apart)", MATCH_SAME_READ_MS === 30_000);
const stateSrc = readFileSync(new URL("../src/components/home/updown-match-state.tsx", import.meta.url), "utf8");
ok("11.3 it reads the PUBLIC history feed (no new route) once a minute, only while visible, and stops at the close",
  /\/api\/updown\/history\?asset=\$\{encodeURIComponent\(assetKey\)\}&range=15M/.test(stateSrc)
  && /MATCH_REFRESH_MS = 60_000/.test(stateSrc)
  && /document\.visibilityState !== "visible"/.test(stateSrc)
  && /serverNow\(\) >= closesAtMs/.test(stateSrc));

// ── §12 · the words ─────────────────────────────────────────────────────────────────────────────
console.log("\n§12 · the words, in all three languages, and no eaten space");
const html = (n: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, n));
const text = (n: ReactNode) => html(n).replace(/<[^>]+>/g, "");
/** What a reader sees: the aged span hidden, the present one shown (or the reverse). The tense spans
 *  hold at most one nested span (a time), so the match allows exactly one level of nesting. */
const seen = (n: ReactNode, aged = false) => html(n)
  .replace(new RegExp(`<span class="kp-udbug__${aged ? "now" : "was"}">(?:[^<]|<span[^>]*>[^<]*</span>)*</span>`, "g"), "")
  .replace(/<[^>]+>/g, "");
/** The rule as a reader sees it before (or, with `decided`, after) the deciding instant. */
const seenRule = (n: ReactNode, decided = false) => html(n)
  .replace(new RegExp(`<span class="kp-udrule__${decided ? "now" : "was"}">(?:[^<]|<span[^>]*>[^<]*</span>)*</span>`, "g"), "")
  .replace(/<[^>]+>/g, "");
type Want = { verdict: string; aged?: string; detail: string; agedDetail?: string; rule: string; note?: string };
const WANT: Record<string, Record<Locale, Want>> = {
  S1: {
    en: { verdict: "Up leads", aged: "Up led", detail: "at 14:26 · Above open by $18.52", rule: "The price at 14:32 decides. Under $0.02 from the open, every stake comes back." },
    sw: { verdict: "Juu inaongoza", aged: "Juu iliongoza", detail: "saa 14:26 · Juu ya ufunguzi kwa $18.52", rule: "Bei ya saa 14:32 inaamua. Tofauti ikiwa ndogo kuliko $0.02, kila dau linarudi." },
    zh: { verdict: "涨方领先", aged: "涨方曾领先", detail: "14:26 时 · 高于开盘 $18.52", rule: "以 14:32 的价格判定。与开盘价相差不足 $0.02，所有投注全额退还。" },
  },
  S2: {
    en: { verdict: "Down leads", aged: "Down led", detail: "at 14:26 · Below open by $12.40", rule: "" },
    sw: { verdict: "Chini inaongoza", aged: "Chini iliongoza", detail: "saa 14:26 · Chini ya ufunguzi kwa $12.40", rule: "" },
    zh: { verdict: "跌方领先", aged: "跌方曾领先", detail: "14:26 时 · 低于开盘 $12.40", rule: "" },
  },
  S3: {
    en: { verdict: "Nobody leads", aged: "Nobody led", detail: "at 14:26 · Only $0.20 from the open — not enough to decide", note: "If it closes here, every stake comes back.", rule: "The price at 14:32 decides. Under $0.40 from the open, every stake comes back." },
    sw: { verdict: "Hakuna anayeongoza", aged: "Hakuna aliyeongoza", detail: "saa 14:26 · Tofauti na ufunguzi $0.20 tu — haitoshi kuamua", note: "Ikifunga hapa, kila dau linarudi.", rule: "Bei ya saa 14:32 inaamua. Tofauti ikiwa ndogo kuliko $0.40, kila dau linarudi." },
    zh: { verdict: "暂无领先方", aged: "当时无领先方", detail: "14:26 时 · 与开盘价仅差 $0.20，不足以判定", note: "若以此价收盘，所有投注全额退还。", rule: "以 14:32 的价格判定。与开盘价相差不足 $0.40，所有投注全额退还。" },
  },
  S4: {
    en: { verdict: "Kick-off · Pick a side", detail: "No new price since the open at 14:20", agedDetail: "Opened at 14:20", rule: "" },
    sw: { verdict: "Mwanzo · Chagua upande", detail: "Bado hakuna bei mpya tangu ufunguzi saa 14:20", agedDetail: "Ilifunguliwa saa 14:20", rule: "" },
    zh: { verdict: "开局 · 选择一方", detail: "自 14:20 开盘以来暂无新价格", agedDetail: "14:20 开盘", rule: "" },
  },
};
const ROUNDS: Record<string, UpdownBandRound> = { S1, S2, S3, S4 };
for (const [name, byLoc] of Object.entries(WANT)) {
  for (const loc of ["en", "sw", "zh"] as const) {
    const want = byLoc[loc];
    const w = matchWords(dict[loc] as Dict, loc, ROUNDS[name]);
    const bad: string[] = [];
    if (seen(w.verdict) !== want.verdict) bad.push(`verdict "${seen(w.verdict)}"`);
    if (want.aged && seen(w.verdict, true) !== want.aged) bad.push(`aged verdict "${seen(w.verdict, true)}"`);
    if (seen(w.detail) !== want.detail) bad.push(`detail "${seen(w.detail)}"`);
    if (want.agedDetail && seen(w.detail, true) !== want.agedDetail) bad.push(`aged detail "${seen(w.detail, true)}"`);
    if (want.rule && seenRule(w.rule) !== want.rule) bad.push(`rule "${seenRule(w.rule)}"`);
    if ((w.note ?? undefined) !== want.note) bad.push(`note "${w.note}"`);
    ok(`12.${name}.${loc} ${want.verdict}`, bad.length === 0, bad.join(" · "));
  }
}
{
  const w = matchWords(dict.en as Dict, "en", S6);
  ok("12.S6 awaiting: 'Awaiting price', no second line, no guessed side", text(w.verdict) === dict.en.market.udAwaitingRead && w.detail === null && w.note === null);
  const asym = matchWords(dict.en as Dict, "en", band({ open: 85000, up: 85000.05, down: 84999.98, reads: [{ ms: O + 3 * MIN, price: 85001 }] }));
  ok("12.asym uneven targets state both prices, the side words named",
    seenRule(asym.rule) === "The price at 14:32 decides. Up at $85,000.05 or higher, Down at $84,999.98 or lower — in between, every stake comes back.", seenRule(asym.rule));
  // A paragraph boundary is a line break to a reader, so it is one here; inline tags are nothing.
  const strip = (s: string) => s.replace(/<\/p>/g, "\n").replace(/<[^>]+>/g, "");
  const w1 = matchWords(dict.sw as Dict, "sw", S1), w4 = matchWords(dict.sw as Dict, "sw", S4);
  const swRule = html(w1.rule).replace(/<span class="kp-udrule__was">(?:[^<]|<span[^>]*>[^<]*<\/span>)*<\/span>/g, "");
  const swAll = renderToStaticMarkup(createElement(Fragment, null,
    createElement("p", { key: 1 }, w1.detail), createElement("p", { key: 2 }, w4.verdict), createElement("p", { key: 3 }, w4.detail)));
  const EATEN = ["kwa<span", "·Juu", "inaamua.Tofauti", "14:26·", "upandeBado"];
  const eaten = EATEN.filter((s) => (swAll + swRule).includes(s) || strip(swAll + swRule).includes(s));
  ok("12.html no eaten space in the markup or its text (kwa<span · ·Juu · inaamua.Tofauti · 14:26· · upandeBado)", eaten.length === 0, eaten.join(", "));
  // ── frame panel 2026-09-27: the detail breaks only between its clauses; the rule turns past; the aged note ──
  const d1 = html(w1.detail), d3 = html(matchWords(dict.sw as Dict, "sw", S3).detail);
  ok("12.chunks the detail is two no-break clauses — 'saa 14:26 ·' | 'Juu ya ufunguzi kwa $18.52'",
    /<span class="kp-udbug__chunk">saa <span[^>]*>14:26<\/span> ·<\/span> <span class="kp-udbug__chunk">Juu ya ufunguzi kwa <span class="amount">\$18\.52<\/span><\/span>/.test(d1), d1);
  ok("12.chunks the level line breaks only at its dash — '… tu —' | 'haitoshi kuamua'",
    /<span class="kp-udbug__chunk">Tofauti na ufunguzi <span class="amount">\$0\.20<\/span> tu —<\/span> <span class="kp-udbug__chunk">haitoshi kuamua<\/span>/.test(d3), d3);
  for (const loc of ["en", "sw", "zh"] as const) {
    const want = { en: "The price at 14:32 decided.", sw: "Bei ya saa 14:32 iliamua.", zh: "已以 14:32 的价格判定。" }[loc];
    const r = seenRule(matchWords(dict[loc] as Dict, loc, S1).rule, true);
    ok(`12.decided.${loc} past the deciding instant the rule reads "${want}"`, r.startsWith(want), r);
  }
  ok("12.aged note for a lead, none for kick-off or awaiting",
    w1.agedNote === dict.sw.home.udMatchAgedNote && w4.agedNote === null && matchWords(dict.en as Dict, "en", S6).agedNote === null);
  ok("12.html …and the spaces are really there", swAll.includes("kwa <span") && strip(swRule).includes("inaamua. Tofauti") && strip(swAll).includes("14:26 · Juu"),
    `${strip(swAll)} ‖ ${strip(swRule)}`);
  const plantedRule = swRule.replace("</span> <span", "</span><span");
  ok("12.html · CONTROL bites: the rule's two sentences run together when the space is lost",
    EATEN.some((s) => strip(plantedRule).includes(s)));
  ok("12.zh two Chinese sentences join with no space after the full stop", !text(matchWords(dict.zh as Dict, "zh", S1).rule).includes("。 "));
  const aria = matchWords(dict.en as Dict, "en", S1).aria;
  ok("12.aria the timeline in words, with EAT and every read",
    aria === "Round timeline: opened 14:20, betting closes 14:30, the price at 14:32 decides (EAT). Confirmed prices since the open: 14:23: Below open by $6.20; 14:26: Above open by $18.52.", aria);
  ok("12.aria no reads ⇒ 'none yet'", matchWords(dict.en as Dict, "en", S4).aria.endsWith("since the open: none yet."));
  const all = (["en", "sw", "zh"] as const).map((l) => html([matchWords(dict[l] as Dict, l, S1).verdict, matchWords(dict[l] as Dict, l, S1).detail, matchWords(dict[l] as Dict, l, S1).rule])).join("");
  ok("12.law no absolute price, no 'live', no pool on the band's words", !/85,0\d\d\.\d\d|\blive\b|\bhai\b|pool|dimbwi|奖池/i.test(all));
}

// ── §13 · the band, rendered ────────────────────────────────────────────────────────────────────
console.log("\n§13 · the band, rendered on the server (sw)");
try {
  const { UpdownBand } = await import("../src/components/home/updown-band.tsx");
  const t = dict.sw as Dict;
  const s8 = renderToStaticMarkup(createElement(UpdownBand, { t, locale: "sw", liveCount: 2, round: null }));
  ok("13.1 S8 is today's band: solo, the live count, the one primary Play link",
    s8.includes('class="kp-updown kp-updown--solo"') && s8.includes("raundi 2 hai sasa")
    && s8.includes('class="btn btn-primary btn-lg max-w-full kp-updown__all"') && s8.includes(t.home.updownCta) && !s8.includes("kp-udmatch"));
  const s1 = renderToStaticMarkup(createElement(UpdownBand, { t, locale: "sw", liveCount: 2, round: S1 }));
  const at = (s: string) => s1.indexOf(s);
  ok("13.2 a round: no live count beside it (I-12)", !s1.includes("raundi 2 hai sasa"));
  ok("13.3 DOM order: verdict, then the Up link, then the Down link",
    at("kp-udbug__verdict") > 0 && at("kp-udbug__verdict") < at("kp-udbug__pick--up") && at("kp-udbug__pick--up") < at("kp-udbug__pick--down"));
  ok("13.4 the picks go into THIS round with the side kept", s1.includes('href="/updown/udr_test?side=UP"') && s1.includes('href="/updown/udr_test?side=DOWN"'));
  ok("13.5 the lead is stamped for the ink, and the leader is never lit (both picks solid)",
    s1.includes('data-lead="up"') && s1.includes("btn btn-yes btn-lg kp-udbug__pick") && s1.includes("btn btn-no btn-lg kp-udbug__pick"));
  ok("13.6 the digits are SEEDED: real mm:ss at render, never --:--, as one timer",
    /role="timer" aria-label="Dau linafungwa baada ya 02:00">02:00</.test(s1), s1.match(/role="timer"[^>]*>[^<]*</)?.[0] ?? "no timer");
  ok("13.7 the track is one image named in words, with EAT", /role="img" aria-label="Ratiba ya raundi: [^"]*\(EAT\)[^"]*"/.test(s1));
  ok("13.8 fresh at render ⇒ no data-aged; the S1 detail and rule are there",
    !s1.includes("data-aged") && s1.includes("Juu ya ufunguzi kwa <span") && s1.includes("Bei ya saa <span"));
  const agedRound = band({ reads: [{ ms: O + 1 * MIN, price: 85018.52 }], nowMs: O + 9 * MIN });
  ok("13.9 a round already aged at render is past tense on the SERVER (data-aged, no :has())",
    renderToStaticMarkup(createElement(UpdownBand, { t, locale: "sw", liveCount: 1, round: agedRound })).includes('data-aged="true"'));
  const noGold = !/gold|gilt|amount text-gold/.test(s1.replace(/kp-udbug|kp-udtrack/g, ""));
  ok("13.10 nothing on the band is gold", noGold);
} catch (e) {
  ok("13.0 the band renders on the server", false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | "));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 60) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
