/**
 * THE DYNAMIC ADVISORY — what the console tells an operator about an asset, derived from
 * what the feed has ACTUALLY done here rather than from a constant somebody typed once.
 *
 *   npx tsx scripts/updown-feed-advice.test.mts     (npm run test:updown-advice)
 *
 * ⛔ THE PROPERTY THAT MATTERS MOST IS THE ONE ABOUT SILENCE: an asset with a handful of
 * readings must be reported as UNMEASURED, not summarised. Two readings produce a median just
 * as readily as two thousand, and a median is indistinguishable from a fact once it is on
 * screen. Production has exactly this shape today — BTC has 204 readings and SOL has 2.
 *
 * 🔴 AND THE SECOND MOST IMPORTANT IS §6 — E-84. This suite's first version was written from
 * the same wrong model as the engine, so 22 checks passed while the engine would have stamped
 * ③ *"more than half its rounds cannot be priced in time"* on the healthiest asset on the
 * platform. §6 therefore asserts against BITCOIN'S ACTUAL PRODUCTION RECORD, read from the live
 * database, rather than against numbers invented to suit the rule under test. It is the check
 * that fails if the fix is reverted.
 */
import {
  adviseFromHistory, advisedMinDuration, bettingSecondsAfterLag,
  MIN_SAMPLES_FOR_ADVICE, MIN_BETTING_SECONDS, type FeedHistory,
} from "../src/lib/server/updown-feed-advice.ts";
import { ALLOWED_DURATIONS, selectionClosesAt, roundSpanMinutes } from "../src/lib/updown-durations.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const H = (over: Partial<FeedHistory>): FeedHistory => ({
  assetKey: "TEST", readings: 500, confirmed: 500, failed: 0,
  medianLagSeconds: 20, maxLagSeconds: 35, ...over,
});
/** 390s is production's derived deadline: ladder 180 + staleness 90 + grace 120. */
const A = (h: FeedHistory, durationMinutes?: number, abandonAfterSeconds = 390) =>
  adviseFromHistory(h, { durationMinutes, abandonAfterSeconds, allowedDurations: ALLOWED_DURATIONS });

// ═══ 1 · IT NEVER INVENTS CONFIDENCE ═══════════════════════════════════════
{
  const thin = A(H({ assetKey: "SOL", readings: 2, confirmed: 2, medianLagSeconds: 84, maxLagSeconds: 108 }));
  ok("1.1 · ⭐ two readings is UNMEASURED, not a median",
     thin.unmeasured === true, JSON.stringify(thin));
  ok("1.2 · …and it does NOT quote a lag figure it cannot support",
     !/\b84s|\b108s/.test(thin.message), thin.message);
  ok("1.3 · …and it says how many readings it has, so the operator can weigh it",
     /only 2 recorded reading/i.test(thin.message), thin.message);
  ok("1.4 · …and it advises no minimum rather than a fabricated one",
     thin.advisedMinDurationMinutes === null);
  ok("1.5 · it is a CAUTION, not a refusal — an unmeasured asset is not a broken one",
     thin.level === 2, String(thin.level));

  const justUnder = A(H({ readings: MIN_SAMPLES_FOR_ADVICE - 1 }));
  const justOver = A(H({ readings: MIN_SAMPLES_FOR_ADVICE }));
  ok("1.6 · the threshold is a real edge, not decoration",
     justUnder.unmeasured === true && justOver.unmeasured === false);

  // ── 🔴 E-89 · NEVER-READ IS ITS OWN STATE, AND SAYING "only 0" IS NOT IT ──
  //
  // The operator guide §8.5 defines TWO states and the console's asset table renders both:
  // `no readings yet` (the platform has never read this asset) and `not measured yet` (it has,
  // but under the sample floor). The Add-chain dropdown collapsed them into one sentence —
  // "BTC has only 0 recorded readings on this platform" — which is a different claim ("only",
  // as though a few had been taken) in a register no one writes in. Driven live on the board
  // built for §9, where every asset genuinely has zero.
  const never = A(H({ assetKey: "BTC", readings: 0, confirmed: 0, medianLagSeconds: null, maxLagSeconds: null }));
  ok("1.7 · ⭐ zero readings never renders as `only 0 recorded readings`",
     !/only 0 recorded reading/i.test(never.message), never.message);
  ok("1.8 · …it says the asset has NEVER been read, as the guide's §8.5 state does",
     /never been read/i.test(never.message), never.message);
  ok("1.9 · …and it still names the asset it is talking about",
     /\bBTC\b/.test(never.message), never.message);
  ok("1.10 · …still a caution, still no fabricated minimum",
     never.level === 2 && never.unmeasured === true && never.advisedMinDurationMinutes === null,
     JSON.stringify(never));
  // ⛔ AND THE SIBLING STATE MUST SURVIVE THE FIX. A change that made every thin asset read
  // "never been read" would satisfy 1.8 while destroying the distinction it exists to draw.
  ok("1.11 · …while ONE reading is still 'only 1 recorded reading', not 'never'",
     /only 1 recorded reading\b/i.test(A(H({ assetKey: "SOL", readings: 1, confirmed: 1 })).message)
     && !/never been read/i.test(A(H({ assetKey: "SOL", readings: 1, confirmed: 1 })).message),
     A(H({ assetKey: "SOL", readings: 1, confirmed: 1 })).message);
}

// ═══ 2 · A HEALTHY ASSET READS AS HEALTHY ══════════════════════════════════
{
  const good = A(H({ assetKey: "BTC", medianLagSeconds: 20, maxLagSeconds: 35 }), 3);
  ok("2.1 · a fast, reliable asset is ①", good.level === 1, `${good.level} · ${good.message}`);
  ok("2.2 · …and still reports what it rests on", good.basedOnReadings === 500);
  ok("2.3 · …and 3 minutes is fine when the wait leaves the round its betting time",
     good.advisedMinDurationMinutes === 3, String(good.advisedMinDurationMinutes));
}

// ═══ 3 · THE DEADLINE IS THE ABANDON DEADLINE, READ FROM CONFIG ════════════
//
// ⛔ E-84. It is NOT `maxStalenessSeconds`: that limit judges `sourceQuotedAt − boundaryAt`,
// which is 0.00s on every one of BTC's 198 confirmed production readings, while the quantity
// measured here is `confirmedAt − boundaryAt`. `abandonAfterSeconds` is what `advanceChain` and
// `healStuckRounds` actually give up on, so it is what a slow reading must be judged against.
{
  const slow = H({ assetKey: "SLOW", medianLagSeconds: 330, maxLagSeconds: 380 });
  const at390 = A(slow, 60, 390);
  const at900 = A(slow, 60, 900);
  ok("3.1 · ⭐ 330s against a 390s deadline is flagged", at390.level >= 2, `${at390.level} · ${at390.message}`);
  ok("3.2 · …and the sentence quotes the LIVE deadline", /390s deadline/.test(at390.message), at390.message);
  ok("3.3 · ⭐ the same asset against a 900s deadline is not warned about for the deadline",
     !/deadline/.test(at900.message), at900.message);
  ok("3.4 · a median PAST the deadline is a refusal, not a caution",
     A(H({ medianLagSeconds: 400, maxLagSeconds: 450 }), 60, 390).level === 3);
  ok("3.5 · …and it says what happens to the money, not just that it is late",
     /stake refunded/.test(A(H({ medianLagSeconds: 400, maxLagSeconds: 450 }), 60, 390).message));
}

// ═══ 4 · THE WAIT COMES OUT OF THE BETTING WINDOW ══════════════════════════
//
// Since E-83 a chain does not open a round until its reading confirms, so a late reading does
// not endanger settlement — it shortens the window players may bet in.
{
  // ⭐ Cross-checked against the ROUND SHAPE ITSELF, not against a restatement of it: bets stop
  // at `selectionClosesAt`, and this asserts that instant really is `durationMinutes` after the
  // boundary for every allowed duration. If the shape ever changes, this fails here rather than
  // silently mis-advising.
  let shapeAgrees = true;
  for (const d of ALLOWED_DURATIONS) {
    const boundary = Date.parse("2026-08-05T12:00:00.000Z");
    const closeIso = new Date(boundary + roundSpanMinutes(d) * 60_000).toISOString();
    const lockIso = selectionClosesAt(closeIso, d);
    const lockSecondsAfterBoundary = (Date.parse(lockIso!) - boundary) / 1000;
    if (lockSecondsAfterBoundary !== d * 60) shapeAgrees = false;
    if (bettingSecondsAfterLag(d, 0) !== lockSecondsAfterBoundary) shapeAgrees = false;
  }
  ok("4.1 · ⭐ the window a late reading eats is the REAL one — checked against selectionClosesAt",
     shapeAgrees);

  ok("4.2 · a 20s wait leaves a 3-minute round 160s of betting",
     bettingSecondsAfterLag(3, 20) === 160, String(bettingSecondsAfterLag(3, 20)));
  ok("4.3 · ⭐ a 132s wait leaves a 3-minute round 48s — production's actual BTC number",
     bettingSecondsAfterLag(3, 132) === 48, String(bettingSecondsAfterLag(3, 132)));

  ok("4.4 · a 20s wait supports the shortest round", advisedMinDuration(20) === 3);
  ok("4.5 · ⭐ a 132s wait advises 5 minutes — 3 keeps under half its window",
     advisedMinDuration(132) === 5, String(advisedMinDuration(132)));
  ok("4.6 · a 200s wait advises 10 minutes", advisedMinDuration(200) === 10, String(advisedMinDuration(200)));
  ok("4.7 · …and a wait no round length survives advises nothing rather than lying",
     advisedMinDuration(99_999) === null);

  // ⛔ The advice must actually FIRE on the duration being chosen — an advisory that only
  // appears in a summary nobody opens is not a guard.
  const slow = H({ assetKey: "SOL", readings: 300, confirmed: 300, medianLagSeconds: 200, maxLagSeconds: 260 });
  const at3 = A(slow, 3);
  const at10 = A(slow, 10);
  ok("4.8 · ⭐ choosing 3 minutes on that asset is BLOCKED, not merely warned about",
     at3.level === 3 && /not running SOL below 10 minutes/i.test(at3.message) && /not offered/i.test(at3.message),
     `${at3.level} · ${at3.message}`);
  ok("4.9 · …and the refusal says what the player would have got, in seconds",
     /no betting time left at all/.test(at3.message), at3.message);
  ok("4.10 · …and choosing 10 minutes is not", at10.level === 1 && !/not offered/i.test(at10.message), at10.message);
  ok("4.11 · the block is the platform's minimum betting window, not a round number",
     A(H({ medianLagSeconds: 3 * 60 - MIN_BETTING_SECONDS }), 3).level !== 3 &&
     A(H({ medianLagSeconds: 3 * 60 - MIN_BETTING_SECONDS + 1 }), 3).level === 3);
}

// ═══ 5 · A FLAKY ASSET IS REFUSED, AND THE REASON IS MONEY ═════════════════
{
  const flaky = A(H({ assetKey: "SNP", readings: 200, confirmed: 150, failed: 50 }), 15);
  ok("5.1 · 75% success is a ③", flaky.level === 3, `${flaky.level}`);
  ok("5.2 · …and the reason names the commercial consequence, not just the percentage",
     /refunded round earns nothing|refund often/i.test(flaky.message), flaky.message);
  const marginal = A(H({ readings: 200, confirmed: 194, failed: 6 }), 15);
  ok("5.3 · 97% is a caution, not a refusal", marginal.level === 2, String(marginal.level));
}

// ═══ 6 · ⭐ BITCOIN'S REAL PRODUCTION RECORD — E-84, THE REGRESSION CHECK ═══
//
// Read from the live database 2026-08-05, over 204 readings from 2026-08-04 14:55 to
// 2026-08-05 07:13. The engine's first version scored this ③ at every duration with the
// sentence "more than half its rounds cannot be priced in time" — of an asset that priced
// 97.1% of its readings and settled real winners at three minutes the same morning.
{
  const BTC: FeedHistory = {
    assetKey: "BTC", readings: 204, confirmed: 198, failed: 0,
    medianLagSeconds: 132, maxLagSeconds: 433,
  };
  const ABANDON = 390; // production: ladder 180 + staleness 90 + grace 120

  for (const d of ALLOWED_DURATIONS) {
    const a = A(BTC, d, ABANDON);
    ok(`6.1·${d}m · ⭐ Bitcoin is NEVER blocked — it is the healthiest asset on the platform`,
       a.level !== 3, `${a.level} · ${a.message}`);
    ok(`6.2·${d}m · …and is never told its rounds cannot be priced`,
       !/cannot be priced/i.test(a.message), a.message);
  }

  const at3 = A(BTC, 3, ABANDON);
  ok("6.3 · ⭐ 3 minutes is a CAUTION carrying the measured betting window",
     at3.level === 2 && /48s of betting/.test(at3.message), `${at3.level} · ${at3.message}`);
  ok("6.4 · …and it says the round still settles, so the operator is not scared off a working duration",
     /settles correctly/.test(at3.message), at3.message);
  ok("6.5 · …and it advises the shortest length that keeps its window",
     at3.advisedMinDurationMinutes === 5, String(at3.advisedMinDurationMinutes));
  ok("6.6 · the 97.1% success rate is reported, not hidden",
     /97% of the time here \(204 readings\)/.test(at3.message), at3.message);
  ok("6.7 · 15 minutes carries no betting-window warning at all",
     !/betting/.test(A(BTC, 15, ABANDON).message), A(BTC, 15, ABANDON).message);

  // ⛔ THE MISTAKE ITSELF, PINNED. 132s exceeds the 90s staleness window; if anyone ever passes
  // that number here again as the deadline, BTC goes ③ and this fails.
  ok("6.8 · ⭐ the deadline is not the staleness window — 132s vs 90s must not condemn Bitcoin",
     A(BTC, 5, 390).level !== 3 && A(BTC, 5, 90).level === 3,
     "if both are non-3 the deadline is being ignored; if both are 3 the wrong one is in use");
}

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-feed-advice: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
