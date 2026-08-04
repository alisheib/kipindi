/**
 * Up & Down — THE TICK-FLOOR MARGIN, and the band that must not be rounding noise.
 *
 *   npx tsx scripts/updown-margin.test.mts     (npm run test:updown-margin)
 *
 * ⭐ ALI'S DECISION, 2026-08-04: **the margin is the tick floor**, so ~99% of rounds decide
 * (against ~63% today). Measured on 5,000 real 1-minute bars per asset, the curve is brutally
 * steep — between 0% and 0.01% the void rate leaps from ~1% to ~20%:
 *
 *     BTC 5m   median move 0.031%   @0.00% → 0.5% void    @0.02% → 36.6%
 *     ETH 5m   median move 0.043%   @0.00% → 0.6%         @0.02% → 26.6%
 *     XAU 5m   median move 0.023%   @0.00% → 28.5%        @0.02% → 47.7%
 *
 * **There is no setting that gives both a visible winning band and a ~95% pay rate.** A round
 * that refunds pays 0% fee and hands a "winner" their stake back (E-65), so a 25-40% void rate
 * — what the E-32 ladder deliberately targeted — is a quarter of the product not happening.
 *
 * 🔴 AND THE FLOOR ITSELF BECOMES DANGEROUS AT ONE TICK (§6ad scenario 1). With `decimals: 2`
 * and `minMoveTicks: 1` the band is **0.01** while `toFixed(2)` rounding error is up to
 * **0.005** — the band is twice the noise it is measured against, so a round can be decided by
 * rounding. That is not theoretical: **E-73** found production running the ENABLED gold asset
 * at exactly 1 tick, across all 1,291 live gold rounds, on a feed whose own two endpoints
 * disagree by **$0.06–$0.20** at a single instant.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import {
  computeTargets, marginBpsForChain, resolveScheduledMarginBps,
  recommendMinMoveTicks, MIN_MOVE_TICKS_FLOOR, DEFAULT_UPDOWN_CONFIG,
  createAsset, __resetUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import { decideOutcomeByTargets } from "../src/lib/server/updown-service.ts";
import { __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "fixture", addedBy: "system" });

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE MARGIN IS THE TICK FLOOR
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("1.1 · ⭐ the shipped default margin is ZERO bps — the band IS the tick",
     DEFAULT_UPDOWN_CONFIG.defaultMarginBps === 0, String(DEFAULT_UPDOWN_CONFIG.defaultMarginBps));
  // ⛔ An EMPTY schedule is a meaningful value, not an omission: it means every duration falls
  // through to `defaultMarginBps`. A leftover rung would silently re-price one duration band.
  ok("1.2 · ⭐ the E-32 ladder is retired — no rung survives to re-price a duration behind our back",
     DEFAULT_UPDOWN_CONFIG.marginSchedule.length === 0,
     JSON.stringify(DEFAULT_UPDOWN_CONFIG.marginSchedule));
  ok("1.3 · so no duration resolves to a scheduled margin any more",
     [3, 5, 10, 15, 30, 60].every((d) => resolveScheduledMarginBps(DEFAULT_UPDOWN_CONFIG, "crypto", d) === null));

  const btc = { decimals: 2, minMoveTicks: 2 };
  const t = computeTargets(63_572.10, 0, btc);
  ok("1.4 · ⭐ at 0 bps the band is exactly the tick, not zero — a round can never be decided by no move at all",
     t.margin === 0.02, String(t.margin));
  ok("1.5 · and the two targets straddle the open by that tick",
     t.upTarget === 63_572.12 && t.downTarget === 63_572.08, `${t.downTarget}…${t.upTarget}`);

  // ⭐ THE POINT OF THE WHOLE DECISION, stated as arithmetic: at the tick floor a typical
  // move clears the band enormously, so the round decides.
  const medianMove = 63_572.10 * 0.00031; // BTC's measured median 5-minute move, 0.031%
  ok("1.6 · ⭐ a MEDIAN 5-minute BTC move clears the tick band ~1,000x over — this is why ~99% of rounds now decide",
     medianMove / t.margin > 500, `move ${medianMove.toFixed(2)} vs band ${t.margin}`);

  // …and the old ladder's 2 bps band was comparable to that same move, which is why a third
  // of rounds refunded.
  const old = computeTargets(63_572.10, 2, btc);
  ok("1.7 · the retired 2 bps band was the SAME ORDER as a median move — hence ~37% refunds",
     old.margin / medianMove > 0.4 && old.margin / medianMove < 2.5,
     `band ${old.margin} vs move ${medianMove.toFixed(2)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · A BAND MUST NEVER BE THE SIZE OF THE ROUNDING ERROR
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("2.1 · the floor is 2 ticks", MIN_MOVE_TICKS_FLOOR === 2, String(MIN_MOVE_TICKS_FLOOR));

  // At `decimals: 2` the price rounds to 0.01, so `toFixed` error reaches 0.005 on EACH of
  // the two prices that decide the round. A 1-tick band is 0.01 — twice the error on one
  // price, and the SAME as the two combined.
  const oneTick = computeTargets(4_056.21, 0, { decimals: 2, minMoveTicks: 1 });
  const roundingBothEnds = 0.005 * 2;
  ok("2.2 · ⭐ a 1-tick band is no bigger than the combined rounding error — the round would be decided by toFixed",
     oneTick.margin <= roundingBothEnds, `band ${oneTick.margin} vs rounding ${roundingBothEnds}`);
  const twoTick = computeTargets(4_056.21, 0, { decimals: 2, minMoveTicks: 2 });
  ok("2.3 · ⭐ two ticks clears it", twoTick.margin > roundingBothEnds, `band ${twoTick.margin}`);

  ok("2.4 · a decisive move is still decisive at the floor",
     decideOutcomeByTargets(63_572.20, 63_572.12, 63_572.08).outcome === "UP");
  ok("2.5 · and an in-band close is an honest no-move, not a source failure",
     decideOutcomeByTargets(63_572.10, 63_572.12, 63_572.08).voidReason === "no-move");
  // §6ad scenario 5 — rare but real, and the copy must own it.
  ok("2.6 · close == open EXACTLY is a no-move refund, never a coin-flip",
     decideOutcomeByTargets(63_572.10, 63_572.12, 63_572.08).outcome === "VOID");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE SERVER REFUSES TO SAVE AN ASSET BELOW THE FLOOR
// ═══════════════════════════════════════════════════════════════════════════
{
  const base = {
    symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/time_series", category: "crypto" as const, decimals: 2,
  };
  const bad = await createAsset({ ...base, key: "TICK1", minMoveTicks: 1 }, OFFICER);
  ok("3.1 · ⭐ an asset at ONE tick is REFUSED — this is E-73's live configuration",
     !bad.ok, bad.ok ? "accepted" : bad.error);
  ok("3.2 · and the refusal explains WHY in an operator's terms, not as a range",
     !bad.ok && /rounding/i.test(bad.error), bad.ok ? "" : bad.error);
  const zero = await createAsset({ ...base, key: "TICK0", minMoveTicks: 0 }, OFFICER);
  ok("3.3 · zero ticks is refused", !zero.ok);
  const good = await createAsset({ ...base, key: "TICK2", minMoveTicks: 2 }, OFFICER);
  ok("3.4 · two ticks is accepted", good.ok, good.ok ? "" : good.error);
  // ⚠️ The DEFAULT must also clear the floor, or an asset created without the field lands
  // exactly on the configuration this suite exists to forbid.
  const dflt = await createAsset({ ...base, key: "TICKD" }, OFFICER);
  ok("3.5 · ⭐ an asset created WITHOUT the field defaults to the floor, not to 1",
     dflt.ok && dflt.data.minMoveTicks >= MIN_MOVE_TICKS_FLOOR,
     dflt.ok ? String(dflt.data.minMoveTicks) : dflt.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE RECOMMENDATION — a number the operator is SHOWN, not one they must know
// ═══════════════════════════════════════════════════════════════════════════
{
  // BTC: the feed's own disagreement is a cent, so rounding dominates and the floor holds.
  const btc = recommendMinMoveTicks({ decimals: 2, referencePrice: 63_572, feedNoiseAbs: 0.01 });
  ok("4.1 · BTC recommends the floor — its feed agrees with itself to the cent",
     btc.ticks === 2, `${btc.ticks} — ${btc.why}`);

  // ⭐ XAU: measured 0.06-0.20 disagreement between /quote and the 1-minute bar at ONE
  // instant (shadow mode, 6 of 30 samples). A band under that is decided by which reading
  // arrived, not by the market.
  const xau = recommendMinMoveTicks({ decimals: 2, referencePrice: 4_056, feedNoiseAbs: 0.20 });
  ok("4.2 · ⭐ GOLD recommends far more than the floor — its own feed disagrees with itself by up to $0.20",
     xau.ticks >= 40, `${xau.ticks} ticks = $${(xau.ticks / 100).toFixed(2)} — ${xau.why}`);
  ok("4.3 · and it says WHY it is the feed, not the rounding",
     /disagrees with itself/i.test(xau.why), xau.why);
  ok("4.4 · the recommendation can never fall below the hard floor",
     recommendMinMoveTicks({ decimals: 8, referencePrice: 1, feedNoiseAbs: 0 }).ticks >= MIN_MOVE_TICKS_FLOOR);
  ok("4.5 · a missing noise measurement falls back to rounding alone rather than throwing",
     recommendMinMoveTicks({ decimals: 2, referencePrice: 100 }).ticks === 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · A PER-CHAIN OVERRIDE STILL WINS — this is a default, not a hard-coding
// ═══════════════════════════════════════════════════════════════════════════
{
  const asset = { category: "crypto" };
  ok("5.1 · with no override a chain runs at the tick floor (0 bps)",
     marginBpsForChain({ marginBps: null, durationMinutes: 5 } as never, DEFAULT_UPDOWN_CONFIG, asset) === 0);
  ok("5.2 · ⭐ an operator can still widen ONE chain — the decision set a default, not a law",
     marginBpsForChain({ marginBps: 25, durationMinutes: 5 } as never, DEFAULT_UPDOWN_CONFIG, asset) === 25);
}

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-margin: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
