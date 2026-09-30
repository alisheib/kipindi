/**
 * test:journey-estimate — the Vodacom plan S3 engine (`docs/VODACOM-PLAN.md` §3.1; rulings SJ-1, SJ-2, SJ-3, SJ-21).
 *
 *   npm run test:journey-estimate     (in predeploy)
 *   npm run red:journey-estimate      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/markets/estimate.ts` to:
 *   (a) THE GOLDEN FIXTURES — the deck's own numbers. Dodoma YES 24,825 / NO 50,462 at 13%: card ≈2.8× / ≈1.4×;
 *       sheet TZS 1,000 → TZS 2,700 ≈2.7×; TZS 5,000 → TZS 12,360 ≈2.5×. Yanga YES 20,000 / NO 43,700: ≈2.9× / ≈1.4×.
 *       And `HOW_TO_EXAMPLE` renders TZS 1,000 → ≈2.7× → TZS 2,700.
 *   (b) PARITY — the sheet's TZS figure is `payoutFor`'s, and the SERVER's `projectedPayout` (the figure stored as
 *       `potentialPayout`) agrees with it; the card's tenths agree with `poolFee`'s own net pool, away from a tie.
 *   (c) EXACT HALF-UP — at an exact tie the card rounds UP, which a float cannot promise (3 / 65 at 13% is 19.85).
 *   (d) THE {pct} SOURCE — the frozen loser-share total, never `commissionRate`; null under capped-commission.
 *   (e) HIDDEN — the capped model, the display switch off, and no rates at all print no figure.
 *   (f) THE STATES — closed, emptyPool, oneSidedRefund, fillsEmptySide (card: words; sheet: a figure), invalidStake,
 *       and the empty side reported as a FACT even with the display switch off.
 *   (g) THE CAP — exactly 100.0× prints; above it `overCap`, and the text is the cap.
 *   (h) UP & DOWN — an UPDOWN round gets null.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written, so `test:red-anchors` counts the twin as in-process.
 */
import * as ENGINE from "../src/lib/markets/estimate.ts";
import { payoutFor, poolFee, type Side } from "../src/lib/payout.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { projectedPayout } from "../src/lib/server/market-service.ts";

const PROVE_RED = process.argv.includes("--prove-red");

type Impl = {
  estimateFor: typeof ENGINE.estimateFor;
  HOW: typeof ENGINE.HOW_TO_EXAMPLE;
  CAP: number;
};
const REAL: Impl = { estimateFor: ENGINE.estimateFor, HOW: ENGINE.HOW_TO_EXAMPLE, CAP: ENGINE.ESTIMATE_DISPLAY_CAP };

/** The deck's rates: 13% loser-share (3% platform + 10% operator). `commissionRate` is set to a DIFFERENT figure on
 *  purpose — a {pct} that read it would say 25. */
const LS13 = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.25, feeCeilingRate: 1 / 3, showEstimatedWinnings: true };
const CAPPED = { feeModel: "capped-commission" as const, commissionRate: 0.10, feeCeilingRate: 1 / 3, showEstimatedWinnings: true };
const DODOMA = { yesPool: 24_825, noPool: 50_462 };
const YANGA = { yesPool: 20_000, noPool: 43_700 };
const BOUNDS = { min: 1_000, max: 1_000_000 };

/** A deterministic generator, so a failure names a case that reproduces. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

async function run(impl: Impl, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const est = (m: { yesPool: number; noPool: number }, side: Side, stake: number, rates: unknown = LS13, extra: Record<string, unknown> = {}) => {
    try { return impl.estimateFor({ ...m, side, stake, rates: rates as never, bettable: true, bounds: BOUNDS, ...extra }); }
    catch (e) { return { threw: String(e) } as never; }
  };

  /* ── (a) the golden fixtures ─────────────────────────────────────────── */
  log("\n(a) THE GOLDEN FIXTURES — the deck's own numbers");
  const dy = est(DODOMA, "YES", 0), dn = est(DODOMA, "NO", 0);
  ok("a.dodoma.card · the card reads ≈2.8× on YES and ≈1.4× on NO (the zero-stake multiple, half-up)",
    dy?.state === "priced" && dy.multText === "2.8" && dy.payout === null && dn?.state === "priced" && dn.multText === "1.4", j({ dy, dn }));
  const d1 = est(DODOMA, "YES", 1_000), d5 = est(DODOMA, "YES", 5_000);
  ok("a.dodoma.sheet · the sheet at TZS 1,000 reads TZS 2,700 ≈2.7×, and at TZS 5,000 TZS 12,360 ≈2.5×",
    d1?.payout === 2_700 && d1.multText === "2.7" && d5?.payout === 12_360 && d5.multText === "2.5", j({ d1, d5 }));
  const yy = est(YANGA, "YES", 0), yn = est(YANGA, "NO", 0);
  ok("a.yanga.card · Yanga's card reads ≈2.9× on YES and ≈1.4× on NO", yy?.multText === "2.9" && yn?.multText === "1.4", j({ yy, yn }));
  const how = (() => { try { return impl.estimateFor({ ...impl.HOW, bettable: true }); } catch { return null; } })();
  ok("a.how-to · HOW_TO_EXAMPLE renders TZS 1,000 → ≈2.7× → TZS 2,700 (SJ-21)",
    impl.HOW.stake === 1_000 && how?.payout === 2_700 && how.multText === "2.7" && how.feePct === 13, j({ how, stake: impl.HOW.stake }));

  /* ── (b) parity ──────────────────────────────────────────────────────── */
  log("\n(b) PARITY — the sheet's figure IS the server's figure; the card's IS the fee function's");
  const rnd = prng(20260930);
  const RATES = [0, 0.05, 0.10, 0.125, 0.13, 0.15, 0.2, 0.3333, 0.5];
  let sheetMiss: string | null = null, cardMiss: string | null = null, sheetN = 0, cardN = 0;
  for (let i = 0; i < 3000 && (!sheetMiss || !cardMiss); i++) {
    const r = RATES[i % RATES.length];
    const rates = { ...LS13, platformFeeRate: 0, operatorFeeRate: r };
    const yesPool = 1 + Math.floor(rnd() * 5_000_000), noPool = 1 + Math.floor(rnd() * 5_000_000);
    const side: Side = rnd() < 0.5 ? "YES" : "NO";
    const stake = 1_000 + Math.floor(rnd() * 200_000);
    const s = est({ yesPool, noPool }, side, stake, rates);
    const want = payoutFor({ yesPool, noPool, side, stake }, rates).payout;
    const t = (10 * want) / stake;
    const tie = Math.abs(t - Math.floor(t) - 0.5) < 1e-9;
    if (s?.payout !== want || (!tie && !s.overCap && s.multTenths !== Math.floor(t + 0.5))) sheetMiss ??= j({ yesPool, noPool, side, stake, r, got: s, want });
    else sheetN++;
    const c = est({ yesPool, noPool }, side, 0, rates);
    const own = side === "YES" ? yesPool : noPool;
    const x = (10 * poolFee(yesPool, noPool, rates, side).netPool) / own;
    const near = Math.abs(x - Math.floor(x) - 0.5) < 1e-6;
    if (!near && !c?.overCap && c?.multTenths !== Math.floor(x + 0.5)) cardMiss ??= j({ yesPool, noPool, side, r, got: c, x });
    else cardN++;
  }
  ok("b.sheet · over 3,000 seeded cases the sheet's TZS figure is `payoutFor`'s exactly, and its tenths are that figure's half-up",
    !sheetMiss, sheetMiss ?? `${sheetN} cases`);
  ok("b.card · …and the card's tenths are `poolFee`'s net pool over the own pool, half-up (ties excluded here — see (c))",
    !cardMiss, cardMiss ?? `${cardN} cases`);
  // The server: `projectedPayout` prices from the market's FROZEN snapshot — the figure a placed bet stores.
  const snap = snapshotFromConfig({ ...DEFAULT_GLOBAL_CONFIG, feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 });
  let serverMiss: string | null = null;
  for (const [m, side, stake] of [[DODOMA, "YES", 1_000], [DODOMA, "YES", 5_000], [DODOMA, "NO", 20_000], [YANGA, "YES", 3_000], [YANGA, "NO", 777_777]] as const) {
    const server = await projectedPayout({ ...m, feeSnapshot: snap }, side, stake);
    const client = est(m, side, stake, ENGINE.pickEstimateRates(snap));
    if (client?.payout !== server) serverMiss ??= j({ m, side, stake, server, client: client?.payout });
  }
  ok("b.server · the server's `projectedPayout` (the stored `potentialPayout`) equals the sheet's figure, from the frozen snapshot",
    !serverMiss, serverMiss ?? "5 cases");

  /* ── (c) exact half-up ───────────────────────────────────────────────── */
  log("\n(c) EXACT HALF-UP — a tie rounds up, which a float cannot promise");
  // (3 + 0.87·65) / 3 = 19.85 exactly; the natural float formula, 1 + (1 − 0.13)·65/3, is 19.849999999999998 and
  // rounds to 19.8 — found by searching every pool pair up to 5,000 for a tie the floats get wrong.
  const tie = est({ yesPool: 3, noPool: 65 }, "YES", 0);
  ok("c.tie · at an exact tie (YES 3 / NO 65 at 13% = 19.85×) the card reads ≈19.9×", tie?.multText === "19.9", j(tie));
  const tie2 = est({ yesPool: 4, noPool: 5 }, "YES", 0, { ...LS13, platformFeeRate: 0, operatorFeeRate: 0 });
  ok("c.tie2 · …and at 0% (4 / 5 = 2.25×) it reads ≈2.3×", tie2?.multText === "2.3", j(tie2));

  /* ── (d) the {pct} source ────────────────────────────────────────────── */
  log("\n(d) {pct} — the frozen loser-share total, never commissionRate");
  const p13 = est(DODOMA, "YES", 0);
  const p125 = est(DODOMA, "YES", 0, { ...LS13, platformFeeRate: 0.05, operatorFeeRate: 0.075 });
  const pOff = est(DODOMA, "YES", 0, { ...LS13, showEstimatedWinnings: false });
  const pCap = est(DODOMA, "YES", 0, CAPPED);
  ok("d.pct · 3% + 10% reads 13 (not the 25 in commissionRate), 5% + 7.5% reads 12.5, it stays with the display switch off, and capped-commission has none",
    p13?.feePct === 13 && p125?.feePct === 12.5 && pOff?.feePct === 13 && pCap?.feePct === null, j({ p13: p13?.feePct, p125: p125?.feePct, pOff: pOff?.feePct, pCap: pCap?.feePct }));

  /* ── (e) hidden ──────────────────────────────────────────────────────── */
  log("\n(e) HIDDEN — no figure where the market must not show one");
  const hCap = est(DODOMA, "YES", 1_000, CAPPED), hOff = est(DODOMA, "YES", 1_000, { ...LS13, showEstimatedWinnings: false }), hNone = est(DODOMA, "YES", 0, null);
  const noFig = (e: ENGINE.Estimate | null) => !!e && e.state === "hidden" && e.payout === null && e.multText === null && e.multTenths === null && e.lean === null;
  ok("e.hidden · a capped-commission market, the display switch off, and no rates at all print NO figure", noFig(hCap) && noFig(hOff) && noFig(hNone), j({ hCap, hOff, hNone }));

  /* ── (f) the states ──────────────────────────────────────────────────── */
  log("\n(f) THE STATES — words where there is no honest figure");
  const closed = impl.estimateFor({ ...DODOMA, side: "YES", stake: 0, rates: LS13, bettable: false });
  const empty = est({ yesPool: 0, noPool: 0 }, "YES", 0), emptyS = est({ yesPool: 0, noPool: 0 }, "NO", 5_000);
  ok("f.closed-empty · a closed market is `closed`; an empty pool is `emptyPool` (card and sheet), with no figure",
    closed?.state === "closed" && closed.multText === null && empty?.state === "emptyPool" && empty.emptySide === "BOTH" && emptyS?.state === "emptyPool" && emptyS.payout === null,
    j({ closed, empty, emptyS }));
  const one = est({ yesPool: 30_000, noPool: 0 }, "YES", 0), oneS = est({ yesPool: 30_000, noPool: 0 }, "YES", 2_000);
  ok("f.one-sided · the OTHER side empty is `oneSidedRefund` with no figure (\"Upande mmoja tu\"), on the card and the sheet",
    one?.state === "oneSidedRefund" && one.multText === null && one.emptySide === "NO" && oneS?.state === "oneSidedRefund" && oneS.payout === null, j({ one, oneS }));
  const first = est({ yesPool: 30_000, noPool: 0 }, "NO", 0), firstS = est({ yesPool: 30_000, noPool: 0 }, "NO", 2_000);
  const firstWant = payoutFor({ yesPool: 30_000, noPool: 0, side: "NO", stake: 2_000 }, LS13).payout;
  ok("f.fills · THIS side empty: the card prints no figure (\"Kuwa wa kwanza\"), the sheet at a real stake prints `payoutFor`'s",
    first?.state === "fillsEmptySide" && first.multText === null && firstS?.state === "fillsEmptySide" && firstS.payout === firstWant && firstS.multText !== null,
    j({ first, firstS, firstWant }));
  const fact = est({ yesPool: 30_000, noPool: 0 }, "YES", 0, { ...LS13, showEstimatedWinnings: false });
  ok("f.fact · the empty side is reported whatever the display switch says", fact?.state === "oneSidedRefund" && fact.emptySide === "NO", j(fact));
  const bad = [500, 1_000_001, 1_000.5, -1_000, Number.NaN].map((s) => est(DODOMA, "YES", s));
  ok("f.stake · a stake below the minimum, above the maximum, fractional, negative or not a number is `invalidStake`, with no figure",
    bad.every((b) => b?.state === "invalidStake" && b.payout === null && b.multText === null), j(bad.map((b) => b?.state)));
  const thin = est({ yesPool: 1_000_000, noPool: 5_000 }, "YES", 0), fair = est(DODOMA, "NO", 0);
  ok("f.lean · the lean is `leanFor` over the multiple: thin on a side the other barely backs, fair on Dodoma NO",
    thin?.lean === "thin" && fair?.lean === "fair", j({ thin: thin?.lean, fair: fair?.lean }));

  /* ── (g) the cap ─────────────────────────────────────────────────────── */
  log("\n(g) THE CAP — above ESTIMATE_DISPLAY_CAP the figure is not printed");
  const r10 = { ...LS13, platformFeeRate: 0, operatorFeeRate: 0.10 };
  const at = est({ yesPool: 1_000, noPool: 110_000 }, "YES", 0, r10);       // 1 + 0.9·110 = 100.0 exactly
  const over = est({ yesPool: 1_000, noPool: 110_056 }, "YES", 0, r10);     // 100.05 → 100.1 half-up
  ok("g.cap · exactly 100.0× prints; above it `overCap`, the text is the cap and no tenths are printed",
    impl.CAP === 100 && at?.multText === "100.0" && !at.overCap && over?.overCap === true && over.multText === "100" && over.multTenths === null, j({ at, over }));

  /* ── (h) up & down ───────────────────────────────────────────────────── */
  log("\n(h) UP & DOWN — not a card, no journey estimate");
  const ud = impl.estimateFor({ ...DODOMA, side: "YES", stake: 0, rates: LS13, bettable: true, productLine: "UPDOWN" });
  const market = impl.estimateFor({ ...DODOMA, side: "YES", stake: 0, rates: LS13, bettable: true, productLine: "MARKET" });
  ok("h.updown · an UPDOWN round gets null; a long-form market gets its estimate", ud === null && market?.multText === "2.8", j({ ud, market }));

  return failed;
}

if (!PROVE_RED) {
  console.log("journey-estimate — the Vodacom plan S3 engine (pure; the server leg runs on the in-memory store)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`\nJOURNEY ESTIMATE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  const real = ENGINE.estimateFor;
  const S = 1_000_000;
  /** Recompute a priced CARD result's tenths some other (wrong) way. */
  const recard = (how: (own: number, opp: number, rate: number) => number): typeof real => (input) => {
    const r = real(input);
    if (!r || input.stake !== 0 || r.multTenths === null) return r;
    const own = input.side === "YES" ? input.yesPool : input.noPool, opp = input.side === "YES" ? input.noPool : input.yesPool;
    const rate = (input.rates?.platformFeeRate ?? 0) + (input.rates?.operatorFeeRate ?? 0);
    const t = how(own, opp, rate);
    return { ...r, multTenths: t, multText: `${Math.floor(t / 10)}.${t % 10}` };
  };
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "the card floors instead of rounding half-up (the platform's Up & Down rule, applied where SJ-1 forbids it)",
      expect: /^a\.dodoma\.card /, impl: { ...REAL, estimateFor: recard((own, opp, rate) => Math.floor((10 * (own + (1 - rate) * opp)) / own)) } },
    { name: "the card rounds in floats (a tie lands on the wrong side)",
      expect: /^c\.tie /, impl: { ...REAL, estimateFor: recard((own, opp, rate) => Math.round((1 + ((1 - rate) * opp) / own) * 10)) } },
    { name: "the card prices a 1-shilling bet instead of the zero-stake multiple",
      expect: /^a\.dodoma\.card /, impl: { ...REAL, estimateFor: (i) => {
        const r = real(i);
        if (!r || i.stake !== 0 || r.multTenths === null) return r;
        const p = payoutFor({ yesPool: i.yesPool, noPool: i.noPool, side: i.side, stake: 1 }, i.rates ?? {}).payout;
        return { ...r, multTenths: p * 10, multText: `${p}.0` };
      } } },
    { name: "the sheet uses its own formula (the multiple times the stake) instead of `payoutFor`",
      expect: /^b\.sheet /, impl: { ...REAL, estimateFor: (i) => {
        const r = real(i);
        if (!r || i.stake === 0 || r.payout === null) return r;
        const own = i.side === "YES" ? i.yesPool : i.noPool, opp = i.side === "YES" ? i.noPool : i.yesPool;
        const rate = (i.rates?.platformFeeRate ?? 0) + (i.rates?.operatorFeeRate ?? 0);
        return { ...r, payout: Math.floor(i.stake * (1 + ((1 - rate) * opp) / (own + i.stake))) };
      } } },
    { name: "{pct} read from commissionRate",
      expect: /^d\.pct /, impl: { ...REAL, estimateFor: (i) => { const r = real(i); return r && { ...r, feePct: Math.round((i.rates?.commissionRate ?? 0) * 1000) / 10 }; } } },
    { name: "a capped-commission market prices a figure",
      expect: /^e\.hidden /, impl: { ...REAL, estimateFor: (i) => real({ ...i, rates: i.rates && { ...i.rates, feeModel: "loser-share" } }) } },
    { name: "the display switch is ignored",
      expect: /^e\.hidden /, impl: { ...REAL, estimateFor: (i) => real({ ...i, rates: i.rates && { ...i.rates, showEstimatedWinnings: true } }) } },
    { name: "an empty own side prints a figure on the card",
      expect: /^f\.fills /, impl: { ...REAL, estimateFor: (i) => {
        const r = real(i);
        return r && r.state === "fillsEmptySide" && i.stake === 0 ? { ...r, multTenths: 999, multText: "99.9" } : r;
      } } },
    { name: "a one-sided market is priced",
      expect: /^f\.one-sided /, impl: { ...REAL, estimateFor: (i) => {
        const r = real(i);
        return r && r.state === "oneSidedRefund" ? { ...r, state: "priced", multTenths: 10, multText: "1.0" } : r;
      } } },
    { name: "the empty side is hidden by the display switch",
      expect: /^f\.fact /, impl: { ...REAL, estimateFor: (i) => { const r = real(i); return r && i.rates?.showEstimatedWinnings === false ? { ...r, emptySide: null } : r; } } },
    { name: "a stake outside the bounds is priced",
      expect: /^f\.stake /, impl: { ...REAL, estimateFor: (i) => real({ ...i, bounds: null, stake: Number.isFinite(i.stake) ? Math.abs(Math.round(i.stake)) : 1_000 }) } },
    { name: "the cap is not applied",
      expect: /^g\.cap /, impl: { ...REAL, estimateFor: (i) => {
        const r = real(i);
        if (!r || !r.overCap) return r;
        const own = i.side === "YES" ? i.yesPool : i.noPool, opp = i.side === "YES" ? i.noPool : i.yesPool;
        const rate = (i.rates?.platformFeeRate ?? 0) + (i.rates?.operatorFeeRate ?? 0);
        const t = Math.round((10 * (own * S + (S - rate * S) * opp)) / (own * S));
        return { ...r, overCap: false, multTenths: t, multText: `${Math.floor(t / 10)}.${t % 10}` };
      } } },
    { name: "an Up & Down round gets an estimate",
      expect: /^h\.updown /, impl: { ...REAL, estimateFor: (i) => real({ ...i, productLine: null }) } },
    { name: "the How to Play example drifts (TZS 2,000)",
      expect: /^a\.how-to /, impl: { ...REAL, HOW: { ...REAL.HOW, stake: 2_000 } } },
  ];
  let caught = 0, pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    cond ? pass++ : fail++;
    console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`);
  };
  const clean = await run(REAL, quiet);
  ok("the REAL engine passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 && caught === plants.length ? 0 : 1;
}
