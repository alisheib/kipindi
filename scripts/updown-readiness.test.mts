/**
 * Up & Down — READINESS: which symbol may run at which duration, and WHY.
 *
 *   npx tsx scripts/updown-readiness.test.mts     (npm run test:updown-readiness)
 *
 * ⭐ ALI'S DECISION, 2026-08-04: **gold is offered at 15 minutes and above only.**
 *
 * ⛔ AND IT REVERSED THE ORIGINAL INSTRUCTION, WHICH IS WHY THE MEASUREMENT MATTERED.
 * §6ad decision 3 was *"gold's `minMoveTicks` comes down from 15 ($0.15)"*. The seam
 * measurement says the opposite: a bar labelled T−1 closes at the instant the bar labelled T
 * opens, so those two numbers describe the same moment — and on gold they differ by
 * **$0.29–$0.87 on all five seams measured**, against BTC's **$0.01 on four of five**.
 * Shadow mode agreed from the other direction: `/quote` fell outside the same minute's bar on
 * **6 of 30** XAU samples by $0.055–$0.201, while **75 of 75** crypto samples agreed.
 *
 * So $0.15 was already BELOW the provider's own price ambiguity. Lowering it further means
 * gold rounds are decided by which representation the feed returned; raising it above the
 * noise (~$1.00) means almost every short gold round refunds. **Gold does not work at 3–5
 * minutes at any floor.** At 15m+ its median move (0.036%) is several times the seam noise.
 *
 * ⛔ THE GATE IS SERVER-SIDE. A dropdown is a courtesy: a stale page, a scripted POST or a
 * second tab can still submit anything, so §3 drives `createChain` rather than a component.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import {
  findSymbol, symbolReadiness, readinessMark, validateSymbolDuration,
  SYMBOL_CATALOGUE,
} from "../src/lib/server/updown-symbols.ts";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";
import { MIN_MOVE_TICKS_FLOOR, createAsset, createChain, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { assetStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
// §6 — the measured half of the gate, and the seam that lets the SERVER half be driven.
import { adviseFromHistory, type FeedHistory } from "../src/lib/server/updown-feed-advice.ts";
import { __setFeedHistoryForTests } from "../src/lib/server/updown-feed-history.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
for (const cat of ["crypto", "macro"]) {
  await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: cat, rationale: "fixture", addedBy: "system" });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · GOLD IS 15 MINUTES AND ABOVE
// ═══════════════════════════════════════════════════════════════════════════
{
  const xau = findSymbol("XAU/USD");
  ok("1.1 · gold carries a measured minimum duration", xau?.minDurationMinutes === 15, String(xau?.minDurationMinutes));

  for (const d of [3, 5, 10]) {
    const r = symbolReadiness(xau, d);
    ok(`1.2.${d} · ⭐ gold at ${d}m is ③ UNUSABLE`, r.level === 3, `${readinessMark(r.level)} ${r.reason.slice(0, 60)}`);
  }
  for (const d of [15, 30, 60]) {
    const r = symbolReadiness(xau, d);
    ok(`1.3.${d} · gold at ${d}m is offered`, r.level !== 3, `${readinessMark(r.level)}`);
  }

  // ⛔ THE REASON IS THE POINT. "Gold is not available" is a worse answer than seeing why —
  // and the sentence has to be in the operator's terms, not ours.
  const r = symbolReadiness(xau, 5);
  ok("1.4 · ⭐ and it explains itself in the operator's own terms, naming the feed",
     /feed/i.test(r.reason) && /disagrees/i.test(r.reason), r.reason);
  ok("1.5 · the reason quotes the measured figure rather than asserting a rule",
     /0\.87|\$0\.8/.test(r.reason), r.reason);

  // ⚠️ NOT `unsupported` — gold WORKS, at longer durations. Marking it unsupported would
  // remove it from the list entirely and raise the question the reason exists to answer.
  ok("1.6 · ⭐ gold is NOT marked unsupported — it works, at the right length",
     !xau?.unsupported, String(xau?.unsupported));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE THREE LEVELS, AND WHAT EACH MEANS
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("2.1 · a 24/7 coin at an allowed duration is ① ready",
     symbolReadiness(findSymbol("BTC/USD"), 5).level === 1);
  // ② is a real caveat that does NOT stop the round: the asset works, it produces nothing
  // until the week reopens, and an operator who does not know that reads silence as a fault.
  const fx = symbolReadiness(findSymbol("EUR/USD"), 15);
  ok("2.2 · ⭐ a weekend-shut market is ② — a caveat, not a refusal", fx.level === 2, readinessMark(fx.level));
  ok("2.3 · and it says the silence is deliberate, because that is what gets misread as a fault",
     /deliberate|not a fault/i.test(fx.reason), fx.reason);
  const spx = symbolReadiness(findSymbol("SPX"), 15);
  ok("2.4 · a symbol the plan cannot feed is ③, with the plan reason", spx.level === 3 && /plan/i.test(spx.reason));
  const unknown = symbolReadiness(undefined, 5);
  ok("2.5 · ⭐ an UNKNOWN symbol is ③, never ① — an uncatalogued symbol voids every round it touches",
     unknown.level === 3, readinessMark(unknown.level));
  ok("2.6 · the marks are numerals, so they survive a monochrome screen or a screenshot",
     readinessMark(1) === "①" && readinessMark(2) === "②" && readinessMark(3) === "③");
  // ⛔ Every ② and ③ must carry a reason. A greyed option with no explanation is exactly the
  // "why isn't gold in the list?" question this design exists to prevent.
  const noReason = SYMBOL_CATALOGUE.flatMap((s) =>
    ALLOWED_DURATIONS.map((d) => ({ s, d, r: symbolReadiness(s, d) })))
    .filter((x) => x.r.level !== 1 && !x.r.reason.trim());
  ok("2.7 · ⭐ NO ② or ③ anywhere in the catalogue is silent — every one carries its reason",
     noReason.length === 0, noReason.map((x) => `${x.s.symbol}@${x.d}m`).join(", "));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE SERVER REFUSES IT — the dropdown is a courtesy, this is the control
// ═══════════════════════════════════════════════════════════════════════════
{
  const gold = await createAsset({
    key: "XAUR", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
    priceSourceUrl: "https://api.twelvedata.com/time_series", category: "macro",
    decimals: 2, minMoveTicks: 40,
  }, OFFICER);
  ok("3.1 · the gold asset is created", gold.ok, gold.ok ? "" : gold.error);
  if (!gold.ok) throw new Error(gold.error);

  const short = await createChain({ assetId: gold.data.id, durationMinutes: 5 }, OFFICER);
  ok("3.2 · ⭐ THE SERVER REFUSES a 5-minute gold chain — even if the option is clicked anyway",
     !short.ok, short.ok ? "CREATED" : short.error);
  ok("3.3 · and the refusal is the SAME sentence the form greys the option with — one answer, not two",
     !short.ok && short.error === validateSymbolDuration("XAU/USD", 5), short.ok ? "" : short.error);

  const long = await createChain({ assetId: gold.data.id, durationMinutes: 15 }, OFFICER);
  ok("3.4 · a 15-minute gold chain IS created", long.ok, long.ok ? "" : long.error);

  // Crypto is unaffected — its seam noise is ~2,000x smaller than a median 5-minute move.
  const btc = await createAsset({
    key: "BTCR", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/time_series", category: "crypto",
    decimals: 2, minMoveTicks: 2,
  }, OFFICER);
  if (!btc.ok) throw new Error(btc.error);
  const three = await createChain({ assetId: btc.data.id, durationMinutes: 3 }, OFFICER);
  ok("3.5 · ⭐ a 3-MINUTE BITCOIN chain is created — the shortest round the product has ever offered",
     three.ok, three.ok ? "" : three.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE CATALOGUE ITSELF CANNOT CARRY A FORBIDDEN TICK
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ Every catalogue entry is a PREFILL for the asset form. An entry below the floor would
// hand the operator a value the server then refuses — a form that fights itself.
{
  const below = SYMBOL_CATALOGUE.filter((s) => s.minMoveTicks < MIN_MOVE_TICKS_FLOOR);
  ok("4.1 · ⭐ no catalogued symbol prefills a tick below the floor",
     below.length === 0, below.map((s) => `${s.symbol}=${s.minMoveTicks}`).join(", "));
  // Gold's is not merely above the floor — it is above its own measured feed noise ($0.20).
  const xau = findSymbol("XAU/USD")!;
  ok("4.2 · ⭐ gold's prefilled band clears its own feed's disagreement with itself",
     xau.minMoveTicks * Math.pow(10, -xau.decimals) > 0.20,
     `$${(xau.minMoveTicks * Math.pow(10, -xau.decimals)).toFixed(2)} vs $0.20 measured`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · A CAUTION IS NOT A BAN — SOLANA BELOW 5 MINUTES
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 THE CONSOLE RECOMMENDED EXACTLY WHAT THE OPERATOR GUIDE SAYS TO AVOID.
// Driven on production 2026-08-04: the Add-chain form offered `① 3 min` for Solana —
// mark ①, no caveat, indistinguishable from Bitcoin — while the guide classifies SOL as
// CARE and says "Avoid 3-minute Solana rounds". A control that recommends what the
// contract warns against is the same class of defect as one that offers what the server
// refuses; the operator is given no way to know.
//
// ⭐ The arithmetic is the reason, and it is why this is ② and NOT ③. Solana trades near
// $74, so the two-tick floor ($0.02) is ~0.03% of the price — where the same $0.02 on
// Bitcoin at ~$64,000 is ~0.00003%. SOL must therefore travel a thousand times further,
// *proportionally*, to decide a round, and a quiet three minutes refunds. But it WORKS:
// §6ao proved it and it paid a real winner (`udr_0e0717…`, 73.83 → 73.87 → UP), and the
// guide's DO-NOT box lists only three things — gold under 15m, widening the band, empty
// chains. Short Solana is not one of them. So it must stay SELECTABLE and merely say why.
//
// ⛔ Pin the PROPERTY, not the sentence: level 2, still choosable, reason mentions the
// arithmetic. A guard on exact wording would break the next time the copy is edited.
{
  const sol = findSymbol("SOL/USD")!;
  const btc = findSymbol("BTC/USD")!;

  const at3 = symbolReadiness(sol, 3);
  ok("5.1 · ⭐ Solana at 3 minutes is a CAUTION, not a plain ready",
     at3.level === 2, `level ${at3.level} (${readinessMark(at3.level)})`);
  ok("5.2 · …and it is NOT banned — a caution must stay selectable",
     at3.level !== 3, `level ${at3.level} would grey the option out`);
  ok("5.3 · …and it says WHY, in the operator's terms",
     at3.reason.length > 40 && /0\.0\d%|share of the price|proportion|refund/i.test(at3.reason),
     JSON.stringify(at3.reason).slice(0, 120));

  // The server gate must agree with the dropdown: a caution does NOT refuse.
  ok("5.4 · ⛔ the SERVER still accepts a 3-minute Solana chain (a caution is advice)",
     validateSymbolDuration("SOL/USD", 3) === null,
     String(validateSymbolDuration("SOL/USD", 3)));

  // 5 minutes and above is where the guide says it is fine — no caution there.
  for (const d of [5, 10, 15, 30, 60]) {
    ok(`5.5 · Solana at ${d} minutes is plain ready`,
       symbolReadiness(sol, d).level === 1, `level ${symbolReadiness(sol, d).level}`);
  }

  // ⛔ AND THE CAUTION MUST NOT LEAK ONTO BITCOIN. This is the check that would catch a
  // "fix" that simply cautions every short round — which would be noise, and noise is how
  // a real warning stops being read.
  ok("5.6 · ⭐ Bitcoin at 3 minutes is UNAFFECTED — the guide says begin here",
     symbolReadiness(btc, 3).level === 1, `level ${symbolReadiness(btc, 3).level}`);
  ok("5.7 · …and Ethereum at 3 minutes too",
     symbolReadiness(findSymbol("ETH/USD")!, 3).level === 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · ⭐ THE MEASURED GATE — what the asset has ACTUALLY done here, folded in
// ═══════════════════════════════════════════════════════════════════════════
//
// Ali, 2026-08-05: *"guide admins as they go for every asset based on history of 12data"*, and
// on what to do with that guidance: *"not advise — don't allow it. Anything risky don't allow
// it… grey the field out or don't allow it in the dropdown."*
//
// ⛔ THE PROPERTY THAT MATTERS IS THAT THE TWO HALVES ARE ONE ANSWER. A greyed option and a
// server refusal come from the same function reading the same record — §6.3 drives `createChain`
// itself rather than asserting the symbol, because a form that greys what the server accepts (or
// offers what it refuses) is the defect this design exists to prevent.
{
  const H = (over: Partial<FeedHistory>): FeedHistory => ({
    assetKey: "X", readings: 500, confirmed: 500, failed: 0,
    medianLagSeconds: 20, maxLagSeconds: 35, ...over,
  });
  const advise = (h: FeedHistory, d?: number) =>
    adviseFromHistory(h, { durationMinutes: d, abandonAfterSeconds: 390 });

  const btc = findSymbol("BTC/USD")!;
  // A record that blocks: a reading 200s after the boundary leaves a 3-minute round no
  // betting time at all, because a chain does not open before its price is known (E-83).
  const blocked = H({ assetKey: "BTC", medianLagSeconds: 200, maxLagSeconds: 260 });

  const r3 = symbolReadiness(btc, 3, advise(blocked, 3));
  ok("6.1 · ⭐ a measured ③ BLOCKS a duration the catalogue alone would have allowed",
     r3.level === 3, `${readinessMark(r3.level)} ${r3.reason.slice(0, 70)}`);
  ok("6.2 · …and the refusal carries the measurement, not a bare rule",
     /200s/.test(r3.reason) && /betting/.test(r3.reason), r3.reason);
  ok("6.3 · …and it names the length it advises instead",
     /below 10 minutes/.test(r3.reason), r3.reason);
  ok("6.4 · …while the same asset at 10 minutes stays open",
     symbolReadiness(btc, 10, advise(blocked, 10)).level !== 3);

  // ⛔ THE SERVER HALF, DRIVEN. Not "the symbol reads ③" but "the write is refused".
  __setFeedHistoryForTests(new Map([["BTCM", { ...blocked, assetKey: "BTCM" }]]));
  const measuredAsset = await createAsset({
    key: "BTCM", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
    priceSourceUrl: "https://api.twelvedata.com/time_series", category: "crypto",
    decimals: 2, minMoveTicks: 2,
  }, OFFICER);
  if (!measuredAsset.ok) throw new Error(measuredAsset.error);
  const scripted = await createChain({ assetId: measuredAsset.data.id, durationMinutes: 3 }, OFFICER);
  ok("6.5 · ⭐ THE SERVER REFUSES the pairing the console greys — a scripted POST does not slip past",
     !scripted.ok, scripted.ok ? "CREATED" : scripted.error.slice(0, 80));
  ok("6.6 · …with the same sentence the dropdown shows — one answer, not two",
     !scripted.ok && scripted.error === symbolReadiness(btc, 3, advise({ ...blocked, assetKey: "BTCM" }, 3)).reason,
     scripted.ok ? "" : scripted.error.slice(0, 80));
  const allowed = await createChain({ assetId: measuredAsset.data.id, durationMinutes: 10 }, OFFICER);
  ok("6.7 · …and the same asset at an advised length IS created — the gate is not a wall",
     allowed.ok, allowed.ok ? "" : allowed.error.slice(0, 80));
  __setFeedHistoryForTests(null);

  // ⭐ UNMEASURED MUST READ AS UNMEASURED. Production has exactly this shape: SOL has 2
  // readings. Two samples produce a median as readily as two thousand.
  const thin = advise(H({ assetKey: "SOL", readings: 2, confirmed: 2, medianLagSeconds: 200, maxLagSeconds: 260 }), 3);
  const solThin = symbolReadiness(findSymbol("SOL/USD")!, 3, thin);
  ok("6.8 · ⭐ two readings do not block anything — an unmeasured asset is not a broken one",
     solThin.level === 2, `${readinessMark(solThin.level)}`);
  ok("6.9 · …and no median is quoted from two samples",
     !/200s/.test(solThin.reason), solThin.reason);

  // ⛔ MEASUREMENT ESCALATES ONLY — it never lifts a catalogue floor or erases a caveat.
  // The catalogue's floors rest on price-scale and bar-seam arithmetic, which
  // `UpDownObservation` does not measure at all.
  const perfect = advise(H({ assetKey: "XAU", medianLagSeconds: 5, maxLagSeconds: 9 }), 5);
  ok("6.10 · ⭐ a perfect measured record does NOT lift gold's 15-minute floor",
     symbolReadiness(findSymbol("XAU/USD")!, 5, perfect).level === 3);
  ok("6.11 · ⭐ …nor erase Solana's price-scale caution, which is not what the feed record measures",
     /share of the price|0\.0\d%|band cannot/i.test(
       symbolReadiness(findSymbol("SOL/USD")!, 3, advise(H({ assetKey: "SOL", medianLagSeconds: 5, maxLagSeconds: 9 }), 3)).reason,
     ));
  ok("6.12 · a plain ① record adds no noise to a plain ① symbol",
     symbolReadiness(btc, 15, advise(H({ assetKey: "BTC" }), 15)).level === 1 &&
     symbolReadiness(btc, 15, advise(H({ assetKey: "BTC" }), 15)).reason === "");

  // Both caveats survive together — the weekend AND the record, neither swallowing the other.
  const eurSlow = symbolReadiness(
    findSymbol("EUR/USD")!, 15,
    advise(H({ assetKey: "EURUSD", readings: 200, confirmed: 190, medianLagSeconds: 20, maxLagSeconds: 35 }), 15),
  );
  ok("6.13 · a weekend caveat and a measured caveat are BOTH shown, not one or the other",
     /weekend/i.test(eurSlow.reason) && /95% of the time/.test(eurSlow.reason), eurSlow.reason);

  // ⛔ AND THE ABSENCE OF A RECORD MUST NOT WEAKEN ANYTHING. `measured` is optional so the
  // catalogue stays callable without a database; omitted means "nobody measured", never "fine".
  ok("6.14 · ⭐ omitting the record leaves every catalogue rule exactly as strict",
     symbolReadiness(findSymbol("XAU/USD")!, 5).level === 3 &&
     symbolReadiness(findSymbol("SPX"), 15).level === 3 &&
     symbolReadiness(undefined, 5).level === 3);
}

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-readiness: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
