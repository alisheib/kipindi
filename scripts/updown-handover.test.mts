/**
 * E-166 · THE HANDOVER — round N ends, round N+1 takes the screen.
 *
 *   npm run test:updown-handover
 *
 * ⛔ EVERY CHECK HERE MUST FAIL IF THE FEATURE IS DELETED. `handoverClock` returning a constant
 * `{phase:"none",targetMs:null,counting:false,ready:false}` — i.e. the behaviour before this
 * shipped — must break §2 through §7. That is the bar standards §5b sets.
 *
 * ⛔ AND IT ASSERTS VALUES, NOT SYMBOLS (§5b.2). Every instant is compared to the millisecond
 * against a figure computed independently in the test, and every phase has an ANTI-CONSTANT
 * twin: a second input that must produce a DIFFERENT answer, so a hardcoded return cannot pass.
 *
 * ⚠️ THE NUMBERS IN §6 ARE MEASURED, NOT INVENTED. They come from
 * `scripts/live/ops/handover-gap-census.cjs` run against production on 2026-08-19 over every
 * settled round in 24 hours (n=1,203): the successor was ALREADY OPEN on 1,186 of them (98.6%),
 * median `opensAt − resolvedAt` = −91.5s, median `createdAt − resolvedAt` = 0.1s. The brief's
 * countdown is the 1.3% case, and §6 is the check that keeps the common case working.
 */
import { readFileSync } from "node:fs";
import { handoverClock } from "../src/lib/updown-card-phase.ts";
import { DWELL_HANDOVER_HOLD_MS as HANDOVER_HOLD_MS } from "../src/lib/feedback-timing.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}
const read = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
/** Source with comments stripped — a rule quoted in a comment is not a rule that runs. */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// A real production shape: BTC/USD 5m round #2596. Opened 09:11, closed 09:17, resolved
// 09:18:31.2 — and its successor #2597 opened at 09:17:00, i.e. 91.2 SECONDS BEFORE it settled.
const CLOSE = Date.parse("2026-08-19T09:17:00.000Z");
const RESOLVED = Date.parse("2026-08-19T09:18:31.200Z");
const SUCC_OPENS = CLOSE;                       // the successor opens where this round closed
const PAST_HOLD = RESOLVED + HANDOVER_HOLD_MS + 1;

/** The ordinary production call, with one field overridden per check. */
const call = (o: Partial<Parameters<typeof handoverClock>[0]> = {}) => handoverClock({
  state: "resolved",
  settledAtMs: RESOLVED,
  successorExists: true,
  successorOpensAtMs: SUCC_OPENS,
  chainRunning: true,
  nowMs: PAST_HOLD,
  ...o,
});

console.log("\n── 1 · an UNSETTLED round has no handover at all ──");
{
  for (const state of ["open", "locked", "closing", "confirming"] as const) {
    const c = call({ state, settledAtMs: null });
    ok(`1.${state} a ${state} round reports phase "none"`, c.phase === "none", `got ${c.phase}`);
    ok(`1.${state}b …and offers nothing to count or navigate to`,
      c.targetMs === null && c.counting === false && c.ready === false);
  }
  // ⛔ ANTI-CONSTANT: the SAME inputs with a settled state must NOT be "none", or the rule is
  // simply returning idle for everything.
  ok("1.5 ⭐ …while the same inputs on a RESOLVED round are not idle", call().phase !== "none");
  ok("1.6 ⭐ VOID hands over exactly like a decision does — a refund is not a dead end (rule 7)",
    call({ state: "void" }).phase === call({ state: "resolved" }).phase);
}

console.log("\n── 2 · the HOLD: the result is held before the handover speaks ──");
{
  const during = call({ nowMs: RESOLVED + 1 });
  ok("2.1 ⭐ one millisecond after the result, the phase is `hold`", during.phase === "hold", `got ${during.phase}`);
  ok("2.2 …and the pod is given nothing to show, so the result stands alone",
    during.targetMs === null && during.counting === false && during.ready === false);
  const lastMs = call({ nowMs: RESOLVED + HANDOVER_HOLD_MS - 1 });
  ok("2.3 the hold runs to its last millisecond", lastMs.phase === "hold");
  const atBoundary = call({ nowMs: RESOLVED + HANDOVER_HOLD_MS });
  ok("2.4 ⭐ and ENDS exactly at settle + HANDOVER_HOLD_MS, to the millisecond",
    atBoundary.phase !== "hold", `still ${atBoundary.phase} at +${HANDOVER_HOLD_MS}ms`);

  // ⛔ ANTI-CONSTANT / ANTI-MOUNT-ANCHOR. The hold must be measured from the RESULT, not from
  // some fixed offset of `now` — a hold anchored to the mount restarts on every poll, which is
  // the defect the rule's own header names. A round that settled a minute ago is PAST its hold
  // at an instant where a round that settled a moment ago is still inside it.
  const older = call({ settledAtMs: RESOLVED - 60_000, nowMs: RESOLVED + 1 });
  ok("2.5 ⭐ the hold FOLLOWS `settledAtMs` — an older settle is already past it at the same `now`",
    older.phase !== "hold", `got ${older.phase}`);
  ok("2.6 ⛔ a legacy row with no settle instant skips the hold rather than holding for ever",
    call({ settledAtMs: null, nowMs: RESOLVED }).phase !== "hold");
  // The constant itself: a magic number here would be untestable and unfindable.
  ok("2.7 the hold is a real, sane, named constant — and it lives with the other dwell times",
    Number.isFinite(HANDOVER_HOLD_MS) && HANDOVER_HOLD_MS >= 1_000 && HANDOVER_HOLD_MS <= 6_000,
    `${HANDOVER_HOLD_MS}ms`);
  // ⛔ And the caller must honour an override, or the constant is decoration.
  ok("2.8 ⭐ `holdMs` overrides it — the hold is a parameter, not a hardcode",
    call({ nowMs: RESOLVED + 100, holdMs: 50 }).phase !== "hold"
    && call({ nowMs: RESOLVED + 100, holdMs: 5_000 }).phase === "hold");
}

console.log("\n── 3 · NO SUCCESSOR IS POSSIBLE — say so, never invent a clock ──");
{
  const stopped = call({ chainRunning: false });
  ok("3.1 ⭐ a stopped chain reports `unavailable`", stopped.phase === "unavailable", `got ${stopped.phase}`);
  ok("3.2 ⛔ with NO target and NO countdown — a paused chain must not promise a next match",
    stopped.targetMs === null && stopped.counting === false);
  ok("3.3 ⛔ and it is never `ready`, so nothing navigates into a chain that is not running",
    stopped.ready === false);
  // ⛔ THE STRONG FORM. Even with a real, open successor in hand, a stopped chain says
  // unavailable — an operator who stops a chain mid-flight has stopped the game.
  ok("3.4 ⭐ `chainRunning:false` WINS over a successor that exists and is open",
    call({ chainRunning: false, successorExists: true, successorOpensAtMs: CLOSE }).phase === "unavailable");
  // ANTI-CONSTANT: the same call with the chain running must NOT be unavailable.
  ok("3.5 …while the identical call on a RUNNING chain is not unavailable",
    call({ chainRunning: true }).phase !== "unavailable");
}

console.log("\n── 4 · COUNTING — the successor's open is genuinely still ahead (1.3% of settles) ──");
{
  const soon = PAST_HOLD + 47_000;              // the brief's own "NEXT MATCH IN 0:47"
  const c = call({ successorExists: false, successorOpensAtMs: soon });
  ok("4.1 ⭐ phase is `counting`", c.phase === "counting", `got ${c.phase}`);
  ok("4.2 ⭐ and the target is the OPEN INSTANT, to the millisecond",
    c.targetMs === soon, `got ${c.targetMs} want ${soon}`);
  ok("4.3 the digits tick", c.counting === true);
  ok("4.4 ⛔ but it is NOT ready — nothing may navigate to a round that has not opened",
    c.ready === false);

  // ⛔ ANTI-CONSTANT: a different instant must move the target. A hardcoded 47s would pass 4.1–4.3.
  const later = call({ successorExists: false, successorOpensAtMs: PAST_HOLD + 4_320_000 });
  ok("4.5 ⛔ the target FOLLOWS the instant — a 72-minute gap counts 72 minutes",
    later.targetMs === PAST_HOLD + 4_320_000 && later.targetMs !== c.targetMs,
    `far=${later.targetMs} near=${c.targetMs}`);

  // ⛔ THE SLIP. `advanceChain` declines to move `nextBoundaryAt` while a bar is unpublished, so
  // the instant a poll reports can move LATER between polls. The rule must simply re-answer from
  // the new instant — never accumulate, never keep counting to the old one.
  const slipped = call({ successorExists: false, successorOpensAtMs: soon + 60_000 });
  ok("4.6 ⭐ SLIP · a boundary that moves later re-targets exactly, with no accumulation",
    slipped.targetMs === soon + 60_000 && slipped.counting === true);

  // ⛔ `opensAt <= now` IS LOAD-BEARING ACROSS THIS PRODUCT AND THIS RULE MAY NOT BREAK IT.
  // A pre-created round is a real row whose window has not begun; it counts down, it is not
  // handed over to.
  const preCreated = call({ successorExists: true, successorOpensAtMs: soon });
  ok("4.7 ⭐ a PRE-CREATED successor still counts to its open and is NOT ready",
    preCreated.phase === "counting" && preCreated.ready === false && preCreated.targetMs === soon);

  // ⛔ NEVER A DEAD OR NEGATIVE CLOCK. A counting target is always in the future.
  ok("4.8 ⛔ a counting target is never at or before `now` (E-99 rule 3)",
    c.targetMs! > PAST_HOLD && later.targetMs! > PAST_HOLD && slipped.targetMs! > PAST_HOLD);
}

console.log("\n── 5 · WAITING — a boundary has passed and no round is there yet ──");
{
  // The abandoned-boundary / unpublished-bar case: 20 of 2,357 successions in 48h, measured.
  const w = call({ successorExists: false, successorOpensAtMs: CLOSE });
  ok("5.1 ⭐ phase is `waiting` — the instant passed but no round exists", w.phase === "waiting", `got ${w.phase}`);
  ok("5.2 ⛔ `—:—`, never a dead 0:00: no target and not counting",
    w.targetMs === null && w.counting === false);
  ok("5.3 ⛔ AND NOT READY. This is the whole reason `ready` is not `now >= opensAt` — a boundary "
    + "can arrive minutes before the round that starts there, and navigating then is a navigation to nothing",
    w.ready === false);
  const noInstant = call({ successorExists: false, successorOpensAtMs: null });
  ok("5.4 no instant at all is also `waiting`, not a fabricated countdown",
    noInstant.phase === "waiting" && noInstant.targetMs === null);
  // ANTI-CONSTANT: the same call WITH a successor row must not be waiting.
  ok("5.5 …while the identical call with a real successor row is not waiting",
    call({ successorExists: true }).phase !== "waiting");
}

console.log("\n── 6 · LIVE — the successor is ALREADY OPEN. 98.6% of real settles ──");
{
  const c = call();  // the measured production shape: opensAt 91.2s BEFORE resolvedAt
  ok("6.1 ⭐ THE COMMON CASE · phase is `live`, not a negative countdown", c.phase === "live", `got ${c.phase}`);
  ok("6.2 ⭐ and it IS ready — the surface may hand the screen over now", c.ready === true);
  // ⛔ THE DEFECT THIS BRANCH EXISTS TO PREVENT: `successorOpensAt − now` is NEGATIVE here, so a
  // naive "count to the open" would render a dead or negative clock on 98.6% of real settles.
  ok("6.3 ⛔ PROOF A NAIVE COUNTDOWN WOULD BE NEGATIVE — the open is behind us",
    SUCC_OPENS - PAST_HOLD < 0, `open−now=${SUCC_OPENS - PAST_HOLD}ms`);
  // ⭐ AND THE POD DOES NOT COUNT AT ALL HERE. This was built the other way first — the digits
  // ran to the successor's own bets-close — and the board screenshot killed it: the successor is
  // the card immediately to the left, already showing that clock, so the settled card rendered a
  // second identical `02:50` under a different caption. The next match's clock belongs to the
  // next match; this pod says the STATE and shows `—:—`.
  ok("6.4 ⭐ nothing is counted — the next match's clock belongs to the next match",
    c.targetMs === null && c.counting === false, `targetMs=${c.targetMs} counting=${c.counting}`);
  // ⛔ ANTI-CONSTANT: `live` must not be reachable without a successor row, whatever the instants.
  ok("6.5 ⛔ …and `live` is unreachable without a real successor row",
    call({ successorExists: false }).phase !== "live");
  // The long-overrun case. Max measured overrun is 304s; a 3-minute round's betting window is
  // 180s, so the successor CAN already be locked — or even finished — when its predecessor
  // settles. The handover still happens: the chain of handovers walks the player forward.
  ok("6.6 ⭐ the phase does not depend on how far in the past the open is — a 306s-old successor "
    + "(the measured minimum) hands over exactly like a 76s-old one",
    call({ successorOpensAtMs: PAST_HOLD - 306_000 }).phase === "live"
    && call({ successorOpensAtMs: PAST_HOLD - 76_000 }).phase === "live");
}

console.log("\n── 7 · `ready` is the ONE gate on navigation, and it is strict ──");
{
  // Every shape that must NOT be ready, in one place — a regression here is a navigation to a
  // round that does not exist, or one the player may not bet on yet.
  const notReady: Array<[string, ReturnType<typeof handoverClock>]> = [
    ["unsettled", call({ state: "open", settledAtMs: null })],
    ["inside the hold", call({ nowMs: RESOLVED + 1 })],
    ["chain stopped", call({ chainRunning: false })],
    ["counting to a future open", call({ successorExists: false, successorOpensAtMs: PAST_HOLD + 1_000 })],
    ["pre-created but not open", call({ successorExists: true, successorOpensAtMs: PAST_HOLD + 1_000 })],
    ["boundary passed, no row", call({ successorExists: false, successorOpensAtMs: CLOSE })],
    ["no instant at all", call({ successorExists: false, successorOpensAtMs: null })],
  ];
  for (const [what, c] of notReady) {
    ok(`7.x not ready · ${what}`, c.ready === false, `phase=${c.phase} ready=${c.ready}`);
  }
  ok("7.8 ⭐ …and the ONE shape that IS ready is a real, open successor on a running chain",
    call().ready === true);
  // ⛔ THE INVARIANT, STATED RATHER THAN ENUMERATED (§5b.9): ready ⇒ a row exists AND its open
  // instant has passed. Driven over a grid so a future edit cannot slip a branch past it.
  let violations = 0, readyCount = 0;
  for (const exists of [true, false]) {
    for (const opens of [null, CLOSE, PAST_HOLD - 1, PAST_HOLD, PAST_HOLD + 1_000]) {
      for (const running of [true, false]) {
        for (const now of [RESOLVED + 1, PAST_HOLD, PAST_HOLD + 600_000]) {
          const c = handoverClock({
            state: "resolved", settledAtMs: RESOLVED, successorExists: exists,
            successorOpensAtMs: opens,
            chainRunning: running, nowMs: now,
          });
          if (c.ready) {
            readyCount++;
            if (!exists || opens == null || opens > now || !running) violations++;
          }
          // ⛔ AND THE OTHER HALF OF THE SAME LAW: counting ⇒ a target strictly in the future.
          if (c.counting && !(c.targetMs != null && c.targetMs > now)) violations++;
          // ⛔ A target without counting, or counting without a target, is a dead clock.
          if (c.counting !== (c.targetMs != null)) violations++;
        }
      }
    }
  }
  ok("7.9 ⭐ over 60 input combinations: `ready` implies an existing, open successor on a running "
    + "chain, and `counting` implies a target strictly in the future",
    violations === 0, `${violations} violations`);
  ok("7.10 …and the sweep actually REACHED the ready state, so 7.9 is not vacuous",
    readyCount > 0, `readyCount=${readyCount}`);
}

console.log("\n── 8 · the surfaces are WIRED to it (asserting the call, never the symbol) ──");
{
  const card = code("src/components/updown/updown-card.tsx");
  const pod = code("src/components/updown/round-countdown.tsx");
  const page = code("src/app/updown/[roundId]/page.tsx");
  const board = code("src/lib/server/updown-board.ts");
  const adv = code("src/components/updown/updown-handover.tsx");

  ok("8.1 ⭐ the board card calls the rule", /handoverClock\(\{/.test(card));
  ok("8.2 ⭐ the round-page pod calls the rule", /handoverClock\(\{/.test(pod));
  ok("8.3 ⭐ the auto-advance calls the rule — not a fourth copy of the decision",
    /handoverClock\(\{/.test(adv));
  // ⛔ ASSERT WHAT THE CALL CARRIES (§5b.2). A `handoverClock({...})` fed the MOUNT instant
  // instead of the server's `resolvedAt` would satisfy 8.1 and be the exact defect the rule's
  // header forbids, so the argument itself is the check.
  // ⛔ TRACED TO THE SERVER FIELD, NOT MERELY "a variable called settledAtMs". Each surface is
  // checked at the point where the value ENTERS it, so an edit that swapped in `Date.now()` — the
  // defect the rule's header names, because a mount-anchored hold restarts on every poll — fails
  // here rather than passing on a plausible-looking identifier.
  // ⚠️ THE CHAIN GAINED A LINK 2026-08-19 AND THESE TWO CAUGHT IT, which is what they are for.
  // The rule is no longer fed the server's `resolvedAt` directly — it is fed `holdAnchor`, which
  // `useHoldAnchor` derives FROM `resolvedAt`, because a hold measured from the server's stamp
  // is already spent by the time a 5s (round page) or 20s (board) poll delivers the result.
  // So the trace is now two hops, and both are asserted.
  ok("8.4a ⭐ the board card feeds the rule its hold anchor…",
    /settledAtMs:\s*holdAnchor\b/.test(card));
  ok("8.4a2 ⭐ …which is `useHoldAnchor` over the server's `resolvedAtMs` prop",
    /useHoldAnchor\(\s*roundId,\s*settledNow,\s*resolvedAtMs,/.test(card));
  ok("8.4b ⭐ …which the board page fills from the server payload",
    /resolvedAtMs=\{r\.resolvedAtMs\}/.test(code("src/app/updown/page.tsx")));
  ok("8.4c ⭐ the pod feeds the rule its hold anchor…",
    /settledAtMs:\s*holdAnchor\b/.test(pod));
  ok("8.4c2 ⭐ …over the server's `handover.settledAtMs`",
    /useHoldAnchor\(\s*handover\?\.roundId \?\? "",\s*settled,\s*handover\?\.settledAtMs \?\? null,/.test(pod));
  ok("8.4c3 ⭐ and the auto-advance shares the SAME anchor — a hold that ended here before it "
    + "ended in the pod would navigate while the ticker was still counting",
    /useHoldAnchor\(\s*roundId,\s*settled,\s*settledAtMs,/.test(adv));
  // ⛔ AND ALL THREE FEED IT THE TICKING SERVER CLOCK, not the raw `serverNowMs` prop. The prop is
  // the instant the SERVER rendered; the stamp must be when THIS SCREEN saw the result, which on
  // a slow connection is a second or more later. Passing the prop would shorten the hold by the
  // latency — worst exactly where the standards bar cares, on the low-end Android over 2G.
  ok("8.4c4 ⛔ every anchor is fed a ticking server-anchored clock, never the render-time prop",
    /useHoldAnchor\([^)]*,\s*serverNow\)/.test(card)
    && /useHoldAnchor\([^)]*,\s*now,?\s*\)/s.test(pod)
    && /useHoldAnchor\([^)]*,\s*now\)/.test(adv));
  // THREE consumers on this page, and all three must read the same server field: the poll bound,
  // the pod's ticker, and the auto-advance. Two agreeing while the third drifts is how a page
  // polls past a handover it has already made, or holds a ticker it has already navigated off.
  ok("8.4d ⭐ all THREE round-page consumers read `round.resolvedAtMs` — the poll bound, the pod "
    + "and the auto-advance",
    (page.match(/settledAtMs[:=]\s*\{?round\.resolvedAtMs\}?/g) ?? []).length === 3,
    `${(page.match(/settledAtMs[:=]\s*\{?round\.resolvedAtMs\}?/g) ?? []).length} of 3 call sites`);
  ok("8.4e ⛔ and NO surface reaches for the device clock to decide a handover phase",
    [card, pod, adv].every((s) => !/handoverClock\(\{[^}]*Date\.now\(\)/s.test(s)));
  ok("8.5 ⛔ and no surface re-derives the successor's instants — they come from the payload",
    [card, pod].every((s) => /successorOpensAtMs:\s*(successor\?\.opensAtMs|handover\.successorOpensAtMs)/.test(s)));

  // The server must actually SEND them, or every check above is green over an empty payload.
  ok("8.6 ⭐ the server resolves a successor and sends it", /successorFor\(/.test(board) && /successor:\s*await successorFor/.test(board));
  ok("8.7 ⭐ the ROUND DETAIL path resolves one too — the surface that would have shipped broken",
    /board\.successor\s*=\s*await successorFor\(r, chain\)/.test(board));
  ok("8.8 ⛔ the successor is matched on the INSTANT, not on `roundNumber + 1` — a skipped "
    + "boundary makes the numbers lie about adjacency",
    /x\.opensAt === r\.closesAt/.test(board) && !/roundNumber\s*\+\s*1/.test(board));
  ok("8.9 ⛔ and when no row matches, the instant is the chain's own persisted boundary",
    /chain\.nextBoundaryAt/.test(board));

  // ── ⭐ THE HOLD ANCHOR ITSELF — a hold that is spent before the player sees the result is
  // not a hold. Source-level because it is a hook, and a hook is not drivable from node.
  ok("8.4d1 ⭐ the anchor SEEDS on first sight and only stamps on an observed transition — "
    + "otherwise opening an already-settled round would hold a result nobody watched arrive",
    /if \(prev === undefined\) \{\s*seen\.current\.set\(roundId, settled\);/.test(pod));
  ok("8.4d2 ⛔ …and stamps at most ONCE per round, so a poll cannot restart the hold",
    /prev === false && nowMs != null && !stamps\.current\.has\(roundId\)/.test(pod));
  // ⛔ DURING RENDER, NOT IN AN EFFECT — and this is the check that would have caught the defect
  // the E2E found. An effect runs after the commit, so on the very render where `settled` first
  // flips true the stamp does not exist yet, the hook falls back to a `resolvedAt` that is
  // already seconds old, and the hold reads as spent. Measured: the redirect fired 155ms after
  // the result appeared. If this stamp is ever moved back inside a `useEffect`, this fails.
  ok("8.4d3 ⭐ the stamp is taken DURING RENDER, so the hold governs the very render it is for",
    /stamps\.current\.set\(roundId, nowMs\);/.test(pod)
    && !/useEffect\([^)]*stamps\.current\.set/s.test(pod));
  ok("8.4d4 ⛔ an UNOBSERVED settle falls back to the server instant, so a stale round is not "
    + "held at all",
    /if \(!settled\) return resolvedAtMs;\s*return stamps\.current\.get\(roundId\) \?\? resolvedAtMs;/.test(pod.replace(/\s+/g, " ")));

  // ── ⭐ §6 · THE BACKGROUNDED TAB. Every phase in this feature is driven by one 1s interval,
  // and Chrome throttles that to ~once a minute in a hidden tab. Measured in the E2E: a
  // backgrounded round page sat on a settled round for nine seconds without advancing.
  // ⛔ ASSERT THE SUBSCRIPTION IN STATEMENT POSITION, NEVER THE WORD (§5b.1). The first version of
  // this check tested `/visibilitychange/` — and the RED harness caught it immediately: deleting
  // the `addEventListener` line leaves the word intact in the `removeEventListener` beside it, so
  // the guard stayed green over a clock that never recovers. A mention is not a subscription.
  const addVis = (pod.match(/^\s*document\.addEventListener\("visibilitychange", onVisible\);\s*$/m) ?? []).length;
  const remVis = (pod.match(/removeEventListener\("visibilitychange", onVisible\)/g) ?? []).length;
  ok("8.4e1 ⭐ the clock SUBSCRIBES to `visibilitychange`, so a tab that was hidden lands on the "
    + "right phase on its first frame back",
    addVis === 1, `${addVis} add-listener statements`);
  ok("8.4e2 ⛔ …by RE-READING the instant, never by counting missed ticks (no accumulation)",
    /const onVisible = \(\) => \{ if \(document\.visibilityState === "visible"\) tick\(\); \};/.test(pod));
  ok("8.4e3 ⛔ and it is paired with exactly one removal, so a remount cannot stack listeners",
    remVis === 1, `${remVis} remove-listener calls`);

  // ── 🔴 THE CARD'S CLOCK MUST NOT STOP AT THE CLOSE. `useCountdown` clamps at zero, so deriving
  // "now" from it froze the card's clock at `closesAtMs` for ever — which made the result-phase
  // overrun render a dead `00:00` (E-99 rule 3, live on the board) and pinned the handover in
  // `hold` permanently. Both were found by the E2E, neither by any suite.
  ok("8.4f1 ⭐ the board card's `now` is the ticking server clock…",
    /const nowMs = serverNow \?\? serverNowMs \?\? closesAtMs;/.test(card));
  ok("8.4f2 ⛔ …and is NEVER re-derived from the clamped countdown again",
    !/closesAtMs - secondsToClose \* 1000/.test(card));

  // ⛔ THE HOLD MUST NOT BE A MAGIC NUMBER ANYWHERE (Ali's §3, in as many words).
  const bare = [card, pod, page, adv].filter((s) => /\b2_?500\b/.test(s));
  ok("8.10 ⛔ no surface hardcodes the hold — it is the named constant or nothing",
    bare.length === 0, `${bare.length} file(s) contain a bare 2500`);
  // ⛔ AND IT LIVES AT THE DEFINITION SITE, WITH THE OTHER DWELLS. `feedback-timing.ts` §0d:
  // *"a duration a MOMENT chooses deliberately lives here, never as a literal at a call site."*
  // The hold arrived in `updown-card-phase.ts` before that file existed and was moved on the
  // merge — it has to be read against the celebration's 7s, which is the whole point of §8.11.
  const timing = code("src/lib/feedback-timing.ts");
  ok("8.10b ⭐ the hold is defined beside the other dwell times, not in the rule that uses it",
    /export const DWELL_HANDOVER_HOLD_MS = /.test(timing)
    && !/export const \w*HANDOVER_HOLD_MS/.test(code("src/lib/updown-card-phase.ts")));
  // ⛔ AND IT IS SHORTER THAN THE MOMENTS IT MUST NOT INTERRUPT. This is an ORDERING, not a
  // number: if the hold ever grew past the result toast it would be holding a screen longer
  // than the platform holds the announcement of the thing on it.
  const val = (name: string) => Number((new RegExp(`export const ${name} = ([0-9_]+)`).exec(timing)?.[1] ?? "0").replace(/_/g, ""));
  ok("8.10c ⛔ …and it is the SHORTEST of them — the successor is already ~91s old, so a generous "
    + "hold is betting time taken from the player, not generosity",
    val("DWELL_HANDOVER_HOLD_MS") > 0
    && val("DWELL_HANDOVER_HOLD_MS") < val("DWELL_CELEBRATION_MS")
    && val("DWELL_HANDOVER_HOLD_MS") < val("DWELL_RESULT_MS"),
    `hold=${val("DWELL_HANDOVER_HOLD_MS")} celebration=${val("DWELL_CELEBRATION_MS")} result=${val("DWELL_RESULT_MS")}`);

  // ── ⭐ THE MERGE COUPLING, MADE A GUARD (standards §8b: "ask what the two changes do to EACH
  // OTHER"). The win celebration dwells 7s — 2.8× the hold — so on the numbers alone the
  // handover would navigate a winner off their own seal. It does not, because the celebration
  // is a kit `<Modal>`, `<Modal>` takes `useModalLock`, and the auto-advance defers to that very
  // lock. ⛔ That chain is load-bearing and NOTHING else was asserting it: if the celebration
  // ever renders outside the kit modal, a winner loses their moment at 2.5s.
  const celeb = code("src/components/markets/win-celebration.tsx");
  const modal = code("src/components/ui/modal.tsx");
  ok("8.11 ⭐ the win celebration renders in the kit <Modal>…", /<Modal\b/.test(celeb));
  ok("8.11b ⭐ …which takes `useModalLock`…", /useModalLock/.test(modal));
  ok("8.11c ⭐ …which is exactly the lock the auto-advance defers to, so a 7s celebration is "
    + "never cut short by a 2.5s hold",
    /document\.body\.style\.overflow === "hidden"/.test(adv));

  // ⛔ THE REDIRECT IS `replace`, NEVER `push`. `push` builds a back-stack of dead rounds and
  // the back button then walks the player backwards through them one at a time.
  ok("8.11 ⭐ the auto-advance uses router.replace", /router\.replace\(/.test(adv));
  ok("8.12 ⛔ …and never router.push", !/router\.push\(/.test(adv));
  // ⛔ THE RESULT IS CARRIED, not stolen.
  ok("8.13 ⭐ the new URL carries `?from=` so the last round's result travels with the player",
    /\?from=\$\{encodeURIComponent\(roundId\)\}/.test(adv));
  ok("8.14 ⭐ and the strip's outcome is read from the DATABASE, never from that query string",
    /getRoundDetail\(fromId\)/.test(page) && /fromDetail\.round\.outcome/.test(page));
  ok("8.15 ⛔ the strip only renders for a GENUINE predecessor — same chain, and it closed "
    + "exactly where this round opened",
    /fromDetail\.round\.closesAt === detail\.round\.opensAt/.test(page));

  // ⛔ THE DEFERRAL GATES MUST BE REAL CONTROLS, NOT COMMENTS.
  ok("8.16 ⭐ an open overlay defers the redirect — read from the lock `useModalLock` sets",
    /document\.body\.style\.overflow === "hidden"/.test(adv));
  ok("8.17 ⭐ an in-flight bet defers it too", /dataset\.udBusy/.test(adv));
  // ⭐ §6 · a player reading their settlement proof is not moved. The proof is the trust artefact
  // this page exists for; replacing it mid-sentence is the same discourtesy as taking their
  // result away, one screen down.
  ok("8.17b ⭐ and so does having scrolled into the detail",
    /window\.scrollY > SCROLL_DEFER_PX/.test(adv));
  ok("8.17c ⛔ …by a NAMED threshold, never a number typed into the condition",
    /const SCROLL_DEFER_PX = \d+;/.test(adv));
  // …and something must SET that flag, or 8.17 guards a value nobody writes.
  const bet = code("src/components/updown/use-quick-bet.ts");
  ok("8.18 ⛔ …and the bet hook actually PUBLISHES that flag while a place is pending",
    /body\.dataset\.udBusy = "1"/.test(bet) && /delete body\.dataset\.udBusy/.test(bet));
  ok("8.19 ⛔ reference-counted, so one card settling cannot clear another's in-flight bet",
    /udBusyCount/.test(bet));

  // ⛔ THE DEAD `00:00` IS GONE FROM BOTH PODS. This is E-99 rule 3 and it was being broken on
  // production by the settled branch of each.
  ok("8.20 ⭐ the round-page pod no longer falls through to a literal 00:00",
    !/"00:00"/.test(pod), "a literal 00:00 is still reachable in round-countdown.tsx");
  ok("8.21 ⭐ nor does the board card", !/"00:00"/.test(card));

  // ⛔ "Closed" is never a result (copy discipline §7).
  ok("8.22 ⭐ the card's header word comes from the round's state, not from `!bettable`",
    /state === "resolved" \? t\.market\.statusResolved/.test(card));
}

console.log("\n── 9 · the copy exists in all three languages, and stays on one line ──");
{
  const dict = read("src/lib/i18n-dict.ts");
  const keys = [
    "udNextMatchIn", "udNextMatchLive", "udNextMatchSoon", "udNextMatchNone",
    "udNextMatchLiveBody", "udNextMatchCountingBody", "udNextMatchSoonBody", "udNextMatchNoneBody",
    "udNextMatchGo", "udLastRound", "udLastRoundView",
  ];
  for (const k of keys) {
    const n = (dict.match(new RegExp(`\\b${k}:`, "g")) ?? []).length;
    ok(`9.${k} present in EN + SW + ZH`, n === 3, `found ${n} definitions`);
  }
  // ⛔ THE POD CAPTION MUST NOT REFLOW THE POD. Four captions × three languages sit on one line
  // in an 8.5px mono pod at 360px; a long one wraps, the pod grows, and the board shifts.
  // 26 characters is the measured comfortable ceiling for that box.
  const caps: string[] = dict.match(/udNextMatch(In|Live|Soon|None):\s*"([^"]*)"/g) ?? [];
  const tooLong = caps.filter((c: string) => (c.match(/"([^"]*)"/)?.[1] ?? "").length > 26);
  ok("9.len ⭐ every pod caption is ≤26 chars in every locale, so the pod cannot reflow",
    caps.length === 12 && tooLong.length === 0, `${caps.length} captions, too long: ${tooLong.join(" | ")}`);
  // ⛔ AND "Closed" MAY NOT COME BACK AS A HANDOVER WORD.
  ok("9.closed ⛔ no handover string calls a finished round `closed`",
    !/udNextMatch\w*:\s*"[^"]*[Cc]losed/.test(dict));
}

console.log("\n── 10 · the board no longer lands on a chain that is not running ──");
{
  const board = code("src/lib/server/updown-board.ts");
  // 🔴 Measured on production 2026-08-19: `/updown` served ONE card — a round settled 25 hours
  // earlier on BTC's STOPPED 3-minute chain — because the duration default was `durations[0]`,
  // i.e. simply the shortest. BTC 5m/10m/15m were all live one tab away.
  ok("10.1 ⭐ the default duration prefers a RUNNING chain",
    /runningDurations\(activeAsset\.id\)\[0\]/.test(board));
  ok("10.2 ⭐ …and so does the default asset",
    /assets\.find\(\(a\) => runningDurations\(a\.id\)\.length > 0\)/.test(board));
  ok("10.3 ⛔ an EXPLICIT ?d= still wins, so a player who asked for a stopped length is told "
    + "it is idle rather than silently moved",
    /opts\?\.durationMinutes && activeAsset\.durations\.includes\(opts\.durationMinutes\)/.test(board));
  ok("10.4 ⛔ and the fallback survives an all-stopped platform rather than going dark",
    /\?\? activeAsset\.durations\[0\] \?\? null/.test(board));
  ok("10.5 ⛔ the TABS still offer every length — a chain's state says whether MORE rounds will "
    + "appear, not whether the ones there can be played (E-67)",
    /durations: allChains\s*\n?\s*\.filter\(\(c\) => c\.assetId === a\.id\)/.test(board));
}

console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
