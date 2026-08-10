/**
 * G1 · THE DURATION GATE'S SECOND AXIS — does the asset move enough to DECIDE?
 *
 * 🔴 WHAT THIS GUARDS. `symbolReadiness` / `validateSymbolDuration` gated a pairing on whether
 * the asset could be **PRICED IN TIME** (E-84/E-89). ⛔ **Nothing gated on whether it MOVES
 * enough to be decided** — two different failure modes with one symptom, the stake coming back,
 * and the second unguarded.
 *
 * ⭐ MEASURED ON PRODUCTION 2026-08-06, and the numbers are why this axis exists at all:
 *
 *     asset  gap   n    p10 |move|   floor    headroom
 *     BTC    18m   74   $8.22        $0.02    411×
 *     XAU    18m   59   $0.84        $0.40      2.1×
 *
 * Bitcoin has so much room above its own band that no duration can threaten it, which is
 * exactly why the gate looked complete for as long as Bitcoin was the only thing running.
 *
 * ⛔ AND IT CORRECTED THE DESIGN DOCUMENT. §3b projected a 3-minute gold p10 of ~$0.34 by
 * scaling $0.84 with √t. **Production contradicts that scaling in direction** — gold's p10 over
 * 18 / 36 / 54 minutes is 0.84 → 0.74 → 0.71, FALLING, because the lower tail is set by quiet
 * regimes rather than by a random walk. So nothing here extrapolates: a ③ requires a directly
 * measured window, and an inference from a longer window may only ever warn. §2 is that rule.
 *
 *   npm run test:updown-movement
 */
import { readFileSync } from "node:fs";
import {
  judgeMovement, headroomOf, MIN_MOVE_SAMPLES, MOVE_BLOCK_HEADROOM, MOVE_CAUTION_HEADROOM,
  type MovementProfile,
} from "../src/lib/updown-movement.ts";
import { symbolReadiness, validateSymbolDuration } from "../src/lib/server/updown-symbols.ts";

const MOVEMENT = "src/lib/updown-movement.ts";
const HISTORY = "src/lib/server/updown-feed-history.ts";
const SYMBOLS = "src/lib/server/updown-symbols.ts";
const CONFIG = "src/lib/server/updown-config.ts";
const CONSOLE = "src/app/admin/updown/page.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
function sliceBraces(text: string, open: string): string | null {
  const at = text.indexOf(open);
  if (at < 0) return null;
  let i = at + open.length - 1;
  if (text[i] !== "{") { const j = text.indexOf("{", i); if (j < 0) return null; i = j; }
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}") { depth--; if (depth === 0) return text.slice(at, k + 1); }
  }
  return null;
}

/** The two real profiles, exactly as production measured them. */
const XAU: MovementProfile = {
  assetKey: "XAU", tickFloorAbs: 0.4,
  windows: [
    { gapMinutes: 18, samples: 59, p10Abs: 0.84, medianAbs: 4.13 },
    { gapMinutes: 36, samples: 57, p10Abs: 0.74, medianAbs: 6.24 },
    { gapMinutes: 54, samples: 56, p10Abs: 0.71, medianAbs: 5.08 },
  ],
};
const BTC: MovementProfile = {
  assetKey: "BTC", tickFloorAbs: 0.02,
  windows: [
    { gapMinutes: 18, samples: 74, p10Abs: 8.22, medianAbs: 55.61 },
    { gapMinutes: 36, samples: 67, p10Abs: 22.01, medianAbs: 82.6 },
    { gapMinutes: 54, samples: 63, p10Abs: 12.0, medianAbs: 83.98 },
  ],
};

console.log("\nUp & Down · G1 — the second axis: does it move enough to decide?\n");

// ── §1. THE REAL ASSETS, AT THE DURATIONS THEY ACTUALLY RUN ──────────────────
console.log("§1 · production's own numbers, judged");
{
  const btc = judgeMovement(BTC, 15);
  ok("1.1 Bitcoin at 15 minutes is unremarkable — 411× its own band", btc.level === 1,
     `level ${btc.level}, headroom ${btc.headroom?.toFixed(0)}`);
  ok("1.2 …and the headroom is the measured one, not a rounded story",
     btc.headroom != null && Math.abs(btc.headroom - 411) < 1, String(btc.headroom));

  const xau = judgeMovement(XAU, 15);
  ok("1.3 GOLD at 15 minutes is a CAUTION — 2.1× is thin, and nothing said so before",
     xau.level === 2, `level ${xau.level}, headroom ${xau.headroom?.toFixed(2)}`);
  ok("1.4 …it names the window it measured and the sample count, so the claim can be weighed",
     /18 minutes/.test(xau.message) && /59/.test(xau.message), xau.message.slice(0, 120));
  ok("1.5 …and it is NOT blocked — 2.1× is thin, not unworkable",
     xau.level !== 3, "blocking a live, correctly-settling chain would be worse than the gap");

  // ⛔ THE CASE THE WHOLE AXIS EXISTS FOR.
  const xau3 = judgeMovement(XAU, 3);
  ok("1.6 gold at THREE minutes is warned about, from a longer window", xau3.level === 2 && xau3.inferred);
  ok("1.7 …and the sentence says the window is LONGER than the round, so the reader can weigh it",
     /LONGER than a 3-minute round/.test(xau3.message), xau3.message.slice(0, 160));
  ok("1.8 Bitcoin at three minutes is still unremarkable — it cannot reveal gold's problem",
     judgeMovement(BTC, 3).level === 1);

  // ⚠️ 1.4 ABOVE MEASURES THE **INFERRED** SENTENCE, and only that one — gold's 18-minute
  // window is longer than a 15-minute round, so `judgeMovement(XAU, 15)` never reaches the
  // direct branch. The RED harness found it: emptying the direct branch's window clause was
  // MISSED by the whole suite. A caution measured AT the round's own length has to name its
  // provenance too, or the operator cannot tell a 30-sample claim from a 3,000-sample one.
  const directCaution = judgeMovement(
    { assetKey: "XAU", tickFloorAbs: 0.4, windows: [{ gapMinutes: 15, samples: 30, p10Abs: 0.84, medianAbs: 4 }] },
    15,
  );
  ok("1.9 a caution measured AT the round's own length is not marked as inferred",
     directCaution.level === 2 && directCaution.inferred === false);
  ok("1.10 …and it still names the window and the sample count it rests on",
     /over 15 minutes/.test(directCaution.message) && /30 samples/.test(directCaution.message),
     directCaution.message.slice(0, 160));
}

// ── §2. ⭐ A BLOCK NEEDS DIRECT EVIDENCE; AN INFERENCE MAY ONLY WARN ──────────
console.log("\n§2 · the rule that keeps a model from refusing an operator's write");
{
  // Directly measured AT the duration, and the quietest tenth does not clear the band.
  const direct: MovementProfile = {
    assetKey: "XAU", tickFloorAbs: 0.4,
    windows: [{ gapMinutes: 3, samples: 40, p10Abs: 0.34, medianAbs: 1.6 }],
  };
  const blocked = judgeMovement(direct, 3);
  ok("2.1 a DIRECTLY measured window below the band BLOCKS", blocked.level === 3,
     `level ${blocked.level}`);
  ok("2.2 …and says what it costs the player, not just that it is refused",
     /one round in ten/.test(blocked.message) && /come back/.test(blocked.message));
  ok("2.3 …and it is marked as direct, not inferred", blocked.inferred === false);

  // The SAME headroom, but only ever observed over a LONGER window.
  const onlyLong: MovementProfile = {
    assetKey: "XAU", tickFloorAbs: 0.4,
    windows: [{ gapMinutes: 30, samples: 40, p10Abs: 0.34, medianAbs: 1.6 }],
  };
  const soft = judgeMovement(onlyLong, 3);
  ok("2.4 ⭐ the same figure INFERRED from a longer window warns and does NOT block",
     soft.level === 2 && soft.inferred, `level ${soft.level}, inferred ${soft.inferred}`);
  ok("2.5 …and it says so plainly rather than hiding the inference",
     /not been measured directly/.test(soft.message), soft.message.slice(0, 200));

  // ⛔ NEVER judge a round by a window SHORTER than itself — that claims more movement than
  // the round can produce, which is the optimistic direction and the one that hurts players.
  const shortOnly: MovementProfile = {
    assetKey: "XAU", tickFloorAbs: 0.4,
    windows: [{ gapMinutes: 3, samples: 99, p10Abs: 9.9, medianAbs: 20 }],
  };
  const j = judgeMovement(shortOnly, 30);
  ok("2.6 a 30-minute round is NOT judged by a 3-minute window", j.headroom === null && j.unmeasured);
  ok("2.7 …and says the length has not been measured rather than inventing a verdict",
     /not over a window as long as 30 minutes/.test(j.message), j.message.slice(0, 160));
}

// ── §3. THE SAMPLE FLOOR, AND THE HONEST NOTHING ─────────────────────────────
console.log("\n§3 · below the floor it says so; it never guesses");
{
  const thin: MovementProfile = {
    assetKey: "SOL", tickFloorAbs: 0.02,
    windows: [{ gapMinutes: 5, samples: MIN_MOVE_SAMPLES - 1, p10Abs: 0.001, medianAbs: 0.01 }],
  };
  const t = judgeMovement(thin, 5);
  ok("3.1 a window under the sample floor is not used, however alarming it looks",
     t.level !== 3 && t.unmeasured, `level ${t.level}`);
  ok("3.2 an asset with no profile at all reports unmeasured, never ①",
     judgeMovement(undefined, 5).unmeasured && judgeMovement(undefined, 5).level === 2);
  ok("3.3 …and names the refund wording an operator would actually see if it were wrong",
     /did not move far enough/.test(judgeMovement(undefined, 5).message));
  ok("3.4 a zero/absent tick floor cannot produce a verdict",
     judgeMovement({ assetKey: "X", tickFloorAbs: 0, windows: XAU.windows }, 15).unmeasured);
  ok("3.5 the thresholds are the ones the header documents",
     MOVE_BLOCK_HEADROOM === 1 && MOVE_CAUTION_HEADROOM === 3 && MIN_MOVE_SAMPLES === 20);
  ok("3.6 `headroomOf` is p10 ÷ floor and nothing else",
     headroomOf({ gapMinutes: 18, samples: 59, p10Abs: 0.84, medianAbs: 4 }, 0.4) === 0.84 / 0.4);
  ok("3.7 …and refuses a null window rather than returning 0",
     headroomOf(null, 0.4) === null);
}

// ── §4. IT ACTUALLY GATES — the readiness function, driven ───────────────────
console.log("\n§4 · the gate, driven rather than read");
{
  const blockAdvice = judgeMovement(
    { assetKey: "XAU", tickFloorAbs: 0.4, windows: [{ gapMinutes: 3, samples: 40, p10Abs: 0.2, medianAbs: 1 }] },
    3,
  );
  ok("4.1 the movement verdict under test is a ③", blockAdvice.level === 3);
  // ⚠️ DRIVEN ON **BTC/USD**, and the first version of this check used XAU/USD and failed —
  // correctly. Gold carries a CATALOGUE floor of 15 minutes, so it is already refused at 3 for
  // a different and older reason, and the assertion was measuring that instead of this axis.
  // Bitcoin has no catalogue floor, so movement is the only thing that can block it: the check
  // now isolates the thing it names. (The gold case is asserted for what it is, in 4.5.)
  const r = symbolReadiness({ symbol: "BTC/USD", category: "crypto" } as never, 3, undefined, blockAdvice);
  ok("4.2 ⭐ `symbolReadiness` turns it into a ③", r.level === 3, `level ${r.level}`);
  ok("4.3 …carrying the engine's own sentence, not a generic one", r.reason === blockAdvice.message);
  // ⛔ THE SERVER GATE IS THE SAME FUNCTION, so a scripted POST meets the same refusal a
  // greyed dropdown shows. A console that greys what the server accepts is its own defect.
  ok("4.4 `validateSymbolDuration` refuses the write for the same reason",
     validateSymbolDuration("BTC/USD", 3, undefined, blockAdvice) === blockAdvice.message);
  ok("4.5 …and gold at three minutes was ALREADY refused, by the catalogue floor that predates this axis",
     (validateSymbolDuration("XAU/USD", 3) ?? "").length > 0,
     "measurement only ever escalates — it must not be the only thing holding that line");
  ok("4.6 …and allows it when movement is fine", validateSymbolDuration("XAU/USD", 30, undefined,
     judgeMovement(BTC, 30)) === null);

  // A ② joins the caveats rather than being swallowed.
  const caution = judgeMovement(XAU, 15);
  const r2 = symbolReadiness({ symbol: "XAU/USD", category: "metal" } as never, 15, undefined, caution);
  ok("4.7 a movement ② surfaces as a caveat", r2.level === 2 && r2.reason.includes("quietest tenth"));
  // ⛔ …but "not measured" must NOT become a caveat on every option of a fresh board, or the
  // operator learns to read past the ② that means something.
  const r3 = symbolReadiness({ symbol: "BTC/USD", category: "crypto" } as never, 15, undefined,
     judgeMovement(undefined, 15));
  ok("4.8 an UNMEASURED movement verdict does not pin a warning to every option",
     r3.level === 1, r3.reason.slice(0, 120));
  // Absence must not weaken the gate in the other direction either.
  ok("4.9 omitting movement entirely leaves the existing gate exactly as it was",
     symbolReadiness({ symbol: "BTC/USD", category: "crypto" } as never, 15).level === 1);
}

// ── §5. WIRED EVERYWHERE — the E-99 lesson, as a check ───────────────────────
console.log("\n§5 · every call site passes it (an omitted optional argument type-checks and does nothing)");
{
  const symbols = stripComments(read(SYMBOLS));
  const config = stripComments(read(CONFIG));
  const consoleSrc = stripComments(read(CONSOLE));
  const history = stripComments(read(HISTORY));

  ok("5.1 `symbolReadiness` accepts a movement verdict", /movement\?:\s*MovementAdvice/.test(symbols));
  ok("5.2 …and a ③ from it is a ③", /movement\s*&&\s*movement\.level\s*===\s*3/.test(symbols));
  ok("5.3 …and a ② joins the caveats, excluding the unmeasured case",
     /movement\.level\s*===\s*2\s*&&\s*!movement\.unmeasured/.test(symbols));
  ok("5.4 `validateSymbolDuration` forwards it to `symbolReadiness`",
     /symbolReadiness\(findSymbol\(symbol\),\s*durationMinutes,\s*measured,\s*movement[,)]/.test(symbols));
  // ⛔ THE WRITE PATH. Without this the console greys an option the server still accepts.
  const createChain = sliceBraces(config, "const { validateSymbolDuration } = await import");
  ok("5.5 the create-chain gate loads the movement record", /movementAdviceFor/.test(config));
  ok("5.6 …and passes it into the refusal",
     /validateSymbolDuration\([\s\S]*?measured,\s*movement[,)]/.test(config));
  ok("5.7 the console passes it for every duration option",
     /symbolReadiness\(findSymbol\(a\.symbol\),\s*d,\s*feed\?\.advise\(a\.key,\s*d\),\s*feed\?\.movement\(a\.key,\s*d\)[,)]/.test(consoleSrc));
  ok("5.8 …and when deciding whether an asset is usable at ANY duration",
     /symbolReadiness\(spec,\s*d,\s*feed\?\.advise\(a\.key,\s*d\),\s*feed\?\.movement\(a\.key,\s*d\)[,)]/.test(consoleSrc));
  ok("5.9 the lookup exposes movement beside the feed advice", /movement:\s*\(assetKey,\s*durationMinutes\)/.test(history));
  void createChain;
}

// ── §6. THE QUERY'S OWN BOUNDS — the trap it already fell into once ──────────
console.log("\n§6 · the aggregation is bounded, and it does not ask the data only about the gaps we expected");
{
  const history = read(HISTORY);
  const q = history.slice(history.indexOf("export async function movementByAssetKey"));
  ok("6.1 the pair window is bounded to the longest round the platform offers", /65 minutes/.test(q));
  ok("6.2 …and to a rolling 30 days, so the cost cannot grow with the table",
     /30 days/.test(q));
  ok("6.3 …and a bucket must reach the sample floor to become a claim",
     /having\s+count\(\*\)\s*>=\s*\$\{MIN_MOVE_SAMPLES\}/.test(q));
  // 🔴 THE MISTAKE THIS RAN INTO. The first query filtered `gap_min in (1,3,5,10,15,30,60)` —
  // the ALLOWED_DURATIONS — and returned ZERO rows for gold, because a 15-minute chain's
  // boundaries sit **18** minutes apart (duration + result phase). Asking the data only about
  // the numbers we expected made a well-measured asset look unmeasured.
  ok("6.4 ⛔ it does not filter the gaps to a list of expected durations",
     !/gap_min\s+in\s*\(/.test(q),
     "a 15-minute chain's boundaries are 18 minutes apart — a duration list finds nothing");
  ok("6.5 the floor is the asset's own `minMoveTicks × 10^-decimals`",
     /power\(10,\s*-a\."decimals"\)\s*\*\s*a\."minMoveTicks"/.test(q));
  ok("6.6 …and only CONFIRMED readings with a real price are paired",
     /state"\s*=\s*'CONFIRMED'/.test(q) && /price"\s+is\s+not\s+null/.test(q));
}

console.log(`\nupdown-movement: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} failed:\n${fails.map((f) => `   · ${f}`).join("\n")}\n`);
  process.exit(1);
}
console.log("✓ the gate now asks both questions: can it be priced, and can it be decided.\n");
