/**
 * E-99 · THE RESULT CLOCK — the third timer, and the rule that decides what it shows.
 *
 *   npm run test:updown-result-clock
 *
 * ⛔ EVERY CHECK HERE MUST FAIL IF THE FEATURE IS DELETED. `resultClock` returning a constant
 * `{awaiting:false,targetMs:null,counting:false}` — i.e. the behaviour before this shipped —
 * must break §2, §3 and §5. That is the bar §0 sets, and it is the bar four of session 27's
 * own checks failed to clear.
 */
import { readFileSync } from "node:fs";
import { resultClock, roundPhase } from "../src/lib/updown-card-phase.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const CLOSE = Date.parse("2026-08-05T15:38:00.000Z");
const LAG = 92;                                   // BTC's measured median, seconds
const EXPECTED = CLOSE + LAG * 1000;

console.log("\n── 1 · before the close there is no result clock at all ──");
{
  const c = resultClock({ state: "open", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE - 60_000 });
  ok("1.1 an OPEN round is not awaiting a result", c.awaiting === false);
  ok("1.2 …and offers no result target, so the betting clock keeps the digits",
    c.targetMs === null, `targetMs=${c.targetMs}`);
  const locked = resultClock({ state: "locked", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE - 20_000 });
  ok("1.3 the RESULT PHASE (locked, pre-close) still counts to the CLOSE, not to the result",
    locked.awaiting === false && locked.targetMs === null);
}

console.log("\n── 2 · after the close it counts to the MEASURED instant ──");
{
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE + 10_000 });
  ok("2.1 ⭐ past the close the round IS awaiting a result", c.awaiting === true);
  ok("2.2 ⭐ and the target is boundary + the asset's own median, to the millisecond",
    c.targetMs === EXPECTED, `got ${c.targetMs} want ${EXPECTED}`);
  ok("2.3 ⭐ the digits tick", c.counting === true);
  // ⛔ THE ANTI-CONSTANT CHECK. A different asset's median must move the target — otherwise
  // someone could hardcode 90s and every check above would still pass.
  const slower = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: CLOSE + 151_000, nowMs: CLOSE + 10_000 });
  ok("2.4 ⛔ the target FOLLOWS the measurement — a slower asset counts longer",
    slower.targetMs === CLOSE + 151_000 && slower.targetMs !== c.targetMs,
    `slow=${slower.targetMs} fast=${c.targetMs}`);
}

console.log("\n── 3 · the overrun is normal and must NOT render as 0:00 ──");
{
  // p90 is 116s against a ~92s median, so roughly one round in ten passes its own estimate.
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: EXPECTED + 30_000 });
  ok("3.1 still awaiting — an overrun is not a settlement", c.awaiting === true);
  ok("3.2 ⭐ but it has STOPPED counting, so the card shows `—:—` and never a dead 0:00",
    c.counting === false);
  ok("3.3 …and it still reports the target, so the caption can stay 'Result in'",
    c.targetMs === EXPECTED);
}

console.log("\n── 4 · an UNMEASURED asset gets no clock, not a plausible one (A-5) ──");
{
  const c = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: null, nowMs: CLOSE + 5_000 });
  ok("4.1 it is awaiting a result", c.awaiting === true);
  ok("4.2 ⛔ with NO target — we never invent a median we have not measured",
    c.targetMs === null);
  ok("4.3 ⛔ and it does not count", c.counting === false);
}

console.log("\n── 5 · a settled round never shows a result clock ──");
for (const state of ["resolved", "void"] as const) {
  const c = resultClock({ state, closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE + 10_000 });
  ok(`5.1 ${state}: not awaiting`, c.awaiting === false);
  ok(`5.2 ${state}: no target, so the pod reads its settled state`, c.targetMs === null);
}

console.log("\n── 6 · the result clock cannot re-open betting (the money check) ──");
{
  // ⛔ THE ONE WAY THIS FEATURE COULD COST MONEY. The card retargets its countdown past the
  // close, so `running` becomes true again — and if `bettable` were derived from "the clock is
  // running" the UP/DOWN controls would light up on a round `buyPosition` has already shut.
  const now = CLOSE + 10_000;
  const phase = roundPhase({ state: "confirming", selectionClosesAtMs: CLOSE - 60_000, closesAtMs: CLOSE, nowMs: now });
  const clock = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: now });
  ok("6.1 ⭐ the clock is running while the round is NOT bettable",
    clock.counting === true && phase.bettable === false,
    `counting=${clock.counting} bettable=${phase.bettable}`);
  ok("6.2 …and it is not 'locked' either — locked means the result PHASE, before the close",
    phase.locked === false);
}

console.log("\n── 7 · E-104 · the phase must change AT THE BOUNDARY, not at the next poll ──");
{
  // 🔴 WATCHED ON PRODUCTION 2026-08-05 (`udr_8bd25a9f786ea498f132`): at the close the pod read
  // a DEAD `00:00` under a live "Result in" caption for FOURTEEN SECONDS, then jumped to 01:18.
  // The countdown to the close ran out and the phase did not move, because the round page
  // derived it from `round.state` — a value rendered ONCE on the server. E-102's poller cut
  // that wait from "forever" to "one interval"; only deriving from the instants removes it.
  const oneMsAfter = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE + 1 });
  ok("7.1 ⭐ ONE MILLISECOND after the close the round is already awaiting a result",
    oneMsAfter.awaiting === true && oneMsAfter.counting === true, JSON.stringify(oneMsAfter));
  ok("7.2 ⭐ …with the measured target, so nothing ever renders a dead 0:00 in between",
    oneMsAfter.targetMs === EXPECTED);
  const oneMsBefore = resultClock({ state: "confirming", closesAtMs: CLOSE, expectedResultAtMs: EXPECTED, nowMs: CLOSE - 1 });
  ok("7.3 …and one millisecond BEFORE it, it is not — the boundary is exact",
    oneMsBefore.awaiting === false);
}

console.log("\n── 8 · E-104 · the POD is wired to the rule, with a LIVE clock ──");
{
  // ⛔ Source-level, because the thing under test is a `setInterval` inside a client component
  // that no node suite can drive. What IS testable is that the component reaches for the shared
  // rule and for a ticking clock, rather than trusting a prop — which is the whole defect.
  // 🔴 THE FIRST VERSION OF THIS SECTION SCORED 1 OF 5 AGAINST ITS OWN MUTATIONS, and every
  // miss was the same mistake in a new place — the mistake this campaign has a rule for:
  //   · it looked for `useServerNow(` anywhere in the file and matched the hook's own
  //     DEFINITION, so replacing the CALL with `null` changed nothing it could see;
  //   · it looked for the server-anchor line anywhere in the file and matched `useCountdown`'s
  //     identical line, so deleting the new hook's anchor passed;
  //   · it looked for `resultLabels={` and matched `data-was-resultLabels={` as a substring.
  // ⛔ So: SCOPE each check to the function under test, and anchor on statements with a
  // leading boundary. "Assert the call site, not the symbol" is not enough on its own when the
  // symbol is defined in the same file.
  const strip = (p: string) => { try { return readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); } catch { return ""; } };
  const between = (src: string, from: RegExp, to: RegExp) => {
    const i = src.search(from);
    if (i < 0) return "";
    const rest = src.slice(i);
    const j = rest.slice(1).search(to);
    return j < 0 ? rest : rest.slice(0, j + 1);
  };
  const src = strip("src/components/updown/round-countdown.tsx");
  const podBody = between(src, /export function RoundCountdownPod/, /^export function /m);
  const hookBody = between(src, /export function useServerNow/, /^export function /m);
  ok("8.0 the probe actually found both functions (never measure an empty string)",
    podBody.length > 200 && hookBody.length > 100, `pod=${podBody.length} hook=${hookBody.length}`);
  // The call sits behind a ternary (`const clock = … ? resultClock({ … }) : null`), so anchor
  // on the BINDING and allow the guard between it and the call — not on `= resultClock`, which
  // was wrong about the shape of the code it was guarding.
  ok("8.1 ⭐ the POD binds its phase to the SHARED rule rather than re-deriving it",
    /const clock =[\s\S]{0,120}?resultClock\(\{/.test(podBody),
    "no `const clock = … resultClock({` inside RoundCountdownPod");
  ok("8.2 ⭐ …and feeds it a LIVE, server-anchored now — the CALL, not the definition",
    /=\s*useServerNow\(serverNowMs\)/.test(podBody) && /nowMs:\s*now\b/.test(podBody),
    "RoundCountdownPod does not call useServerNow(serverNowMs) and pass it as nowMs");
  // ⛔ Assert what the hook CARRIES, inside the hook. A `useServerNow` that ignored
  // `serverNowMs` would satisfy 8.2 while putting the player on their own device clock, which
  // on this campaign's own laptop is 94 seconds out (E-81).
  ok("8.3 the live clock is anchored to the SERVER's instant, never to the device alone",
    /serverNowMs != null \? serverNowMs - Date\.now\(\) : 0/.test(hookBody),
    "useServerNow's own body does not offset against serverNowMs");

  const page = strip("src/app/updown/[roundId]/page.tsx");
  // A leading boundary, so `data-was-roundClosesAtMs={` cannot pass for the real prop.
  ok("8.4 ⭐ the round page hands the pod the BOUNDARY, so it can switch by itself",
    /(^|\s)roundClosesAtMs=\{/m.test(page), "no roundClosesAtMs passed");
  ok("8.5 …and the measured target and the settled flag with it",
    /(^|\s)resultTargetMs=\{/m.test(page) && /(^|\s)settled=\{/m.test(page));
  ok("8.6 …and the captions for the phases it can now enter alone",
    /(^|\s)resultLabels=\{/m.test(page), "no resultLabels passed — the pod would keep the stale caption");
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
