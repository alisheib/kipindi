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
 */
import {
  adviseFromHistory, advisedMinDuration, MIN_SAMPLES_FOR_ADVICE, type FeedHistory,
} from "../src/lib/server/updown-feed-advice.ts";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const H = (over: Partial<FeedHistory>): FeedHistory => ({
  assetKey: "TEST", readings: 500, confirmed: 500, failed: 0,
  medianLagSeconds: 20, maxLagSeconds: 35, ...over,
});
const A = (h: FeedHistory, durationMinutes?: number, stalenessSeconds = 90) =>
  adviseFromHistory(h, { durationMinutes, stalenessSeconds, allowedDurations: ALLOWED_DURATIONS });

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
}

// ═══ 2 · A HEALTHY ASSET READS AS HEALTHY ══════════════════════════════════
{
  const good = A(H({ assetKey: "BTC", medianLagSeconds: 20, maxLagSeconds: 35 }), 3);
  ok("2.1 · a fast, reliable asset is ①", good.level === 1, `${good.level} · ${good.message}`);
  ok("2.2 · …and still reports what it rests on", good.basedOnReadings === 500);
  ok("2.3 · …and 3 minutes is fine when the worst reading fits the result phase",
     good.advisedMinDurationMinutes === 3, String(good.advisedMinDurationMinutes));
}

// ═══ 3 · THE STALENESS LIMIT IS READ FROM CONFIG, NOT ASSUMED ══════════════
//
// ⛔ The SAME history is safe or unsafe depending on how strict the platform is set to be.
// Quoting a hardcoded limit in a warning is how an operator acts on a rule that no longer
// applies — so the number in the sentence must be the live one.
{
  const sol = H({ assetKey: "SOL", medianLagSeconds: 86, maxLagSeconds: 108 });
  const at90 = A(sol, 5, 90);
  const at180 = A(sol, 5, 180);
  ok("3.1 · ⭐ 86s against a 90s limit is flagged", at90.level >= 2, `${at90.level} · ${at90.message}`);
  ok("3.2 · …and the sentence quotes the LIVE limit", /90s staleness limit/.test(at90.message), at90.message);
  ok("3.3 · ⭐ the same asset against a 180s limit is not warned about for staleness",
     !/staleness limit/.test(at180.message), at180.message);
  ok("3.4 · a median PAST the limit is a refusal, not a caution",
     A(H({ medianLagSeconds: 95, maxLagSeconds: 120 }), 5, 90).level === 3);
}

// ═══ 4 · THE ADVISED MINIMUM COMES FROM THE ASSET'S OWN WORST READING ══════
{
  ok("4.1 · a 35s worst reading fits a 3-minute round's 1-minute phase",
     advisedMinDuration(35, ALLOWED_DURATIONS) === 3, String(advisedMinDuration(35, ALLOWED_DURATIONS)));
  ok("4.2 · ⭐ a 108s worst reading needs a phase of 2 minutes → 10 minutes",
     advisedMinDuration(108, ALLOWED_DURATIONS) === 10, String(advisedMinDuration(108, ALLOWED_DURATIONS)));
  ok("4.3 · a 400s worst reading needs 7 minutes of phase → 60 minutes",
     advisedMinDuration(400, ALLOWED_DURATIONS) === 60, String(advisedMinDuration(400, ALLOWED_DURATIONS)));
  ok("4.4 · …and something no duration can cover advises nothing rather than lying",
     advisedMinDuration(99_999, ALLOWED_DURATIONS) === null);

  // ⛔ The advice must actually FIRE on the duration being chosen — an advisory that only
  // appears in a summary nobody opens is not a guard.
  const slow = H({ assetKey: "SOL", readings: 300, confirmed: 300, medianLagSeconds: 60, maxLagSeconds: 108 });
  const at3 = A(slow, 3);
  const at10 = A(slow, 10);
  ok("4.5 · ⭐ choosing 3 minutes on that asset is BLOCKED, not merely warned about",
     at3.level === 3 && /not running SOL below 10 minutes/i.test(at3.message) && /not offered/i.test(at3.message), `${at3.level} · ${at3.message}`);
  ok("4.6 · …and choosing 10 minutes is not", !/we advise/i.test(at10.message), at10.message);
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

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-feed-advice: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
