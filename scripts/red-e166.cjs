/**
 * RED PROOF for E-166 — round N ends, round N+1 takes the screen.
 *
 *   node scripts/red-e166.cjs        (npm run red:updown-handover)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ MUTATION 1 IS THE PRODUCT AS IT SHIPPED THIS MORNING. `handoverClock` returning idle for
 * everything IS the pre-fix behaviour: on production 2026-08-19 a settled round rendered
 * `Round settled 00:00` under the header word "Resolved", with the poller already disabled
 * behind it. If the suite can be green over that, it is guarding nothing.
 *
 * ⛔ AND MUTATION 4 IS THE ONE THAT MATTERS MOST. `ready` is the single gate on a navigation;
 * loosening it to "the open instant has passed" sends a player to a round that does not exist,
 * because a boundary can arrive minutes before the bar that opens it. That mutation is
 * plausible, it is what a reasonable person would write, and it must be caught.
 *
 * ⚠️ THE ANCHORS ARE THE FRAGILE PART, and this harness has already watched its sibling rot:
 * `red-e102.cjs` lost three of five anchors the moment the handover arm reshaped their subjects,
 * and printed "ANCHOR NOT FOUND … proves NOTHING" rather than a false green. Keep that report —
 * a harness that scores itself out of the mutations it managed to apply is E-108 all over again.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const SUITE = "scripts/updown-handover.test.mts";
const RULE = "src/lib/updown-card-phase.ts";
const CARD = "src/components/updown/updown-card.tsx";
const POD = "src/components/updown/round-countdown.tsx";
const ADV = "src/components/updown/updown-handover.tsx";
const BOARD = "src/lib/server/updown-board.ts";

const MUTATIONS = [
  {
    // THE PRODUCT AS IT SHIPPED: no handover at all. Every surface falls back to "Round settled".
    name: "no-handover-at-all (the dead end, exactly as production served it)",
    file: RULE,
    find: `  const settled = state === "resolved" || state === "void";\n  if (!settled) return { phase: "none", targetMs: null, counting: false, ready: false };`,
    with: `  const settled = state === "resolved" || state === "void";\n  if (true) return { phase: "none", targetMs: null, counting: false, ready: false };\n  if (!settled) return { phase: "none", targetMs: null, counting: false, ready: false };`,
  },
  {
    // The naive reading of the brief: in `live`, count to the successor's OPEN. Measured on
    // production that instant is ~91s in the PAST on 98.6% of settles, so this is a dead clock —
    // `useCountdown` clamps at zero and the pod would read `00:00` for ever.
    // ⚠️ THIS ANCHOR WAS RE-CUT once already, when `live` stopped carrying a bets-close target.
    name: "naive-countdown-to-the-open (a dead 00:00 on 98.6% of real settles)",
    file: RULE,
    find: `    return { phase: "live", targetMs: null, counting: false, ready: true };`,
    with: `    return { phase: "live", targetMs: successorOpensAtMs, counting: true, ready: true };`,
  },
  {
    // ⭐ §6's backgrounded tab. Every phase here is driven by one 1s interval and Chrome throttles
    // it in a hidden tab; without this listener a returning player sits on a stale phase.
    name: "clock-does-not-recover-from-a-backgrounded-tab",
    file: POD,
    find: `    document.addEventListener("visibilitychange", onVisible);`,
    with: `    void onVisible;`,
  },
  {
    // 🔴 The card's clock stopping at the close — the defect that produced BOTH a dead `00:00`
    // during the result overrun and a handover pinned in `hold` for ever.
    name: "card-clock-freezes-at-the-close-again (a dead 00:00 and a stuck hold)",
    file: CARD,
    find: `  const nowMs = serverNow ?? serverNowMs ?? closesAtMs;`,
    with: `  const nowMs = closesAtMs - (useCountdown(closesAtMs, serverNowMs) ?? 0) * 1000;`,
  },
  {
    // The hold anchored to the caller's clock instead of the result — it then restarts on every
    // poll, and `router.refresh()` fires constantly, so the ticker appears and vanishes for ever.
    name: "hold-anchored-to-now (a ticker that restarts on every poll)",
    file: RULE,
    find: `  if (settledAtMs != null && nowMs < settledAtMs + holdMs) {`,
    with: `  if (nowMs < nowMs + holdMs) {`,
  },
  {
    // ⛔ THE ONE THAT MATTERS MOST. A boundary can pass minutes before the round that starts
    // there exists; "the instant has gone by" is not "there is somewhere to go".
    name: "ready-without-a-successor-row (a navigation to a round that does not exist)",
    file: RULE,
    find: `  if (successorExists && successorOpensAtMs != null) {`,
    with: `  if (successorOpensAtMs != null) {`,
  },
  {
    // A stopped chain inventing a next match. Five of nineteen live chains are stopped.
    name: "stopped-chain-still-promises-a-next-match",
    file: RULE,
    find: `  if (!chainRunning) return { phase: "unavailable", targetMs: null, counting: false, ready: false };`,
    with: `  if (false) return { phase: "unavailable", targetMs: null, counting: false, ready: false };`,
  },
  {
    // `opensAt <= now` is load-bearing across this product. Handing over to a pre-created round
    // whose window has not begun would let a player stake against a line that does not exist.
    name: "pre-created-round-handed-over-early (breaks `opensAt <= now`)",
    file: RULE,
    find: `  if (successorOpensAtMs != null && nowMs < successorOpensAtMs) {`,
    with: `  if (false && successorOpensAtMs != null && nowMs < successorOpensAtMs) {`,
  },
  {
    // The dead `00:00` coming back on the round page — E-99 rule 3, which production was breaking.
    name: "round-page-pod-shows-a-dead-00:00-again",
    file: POD,
    find: `    : settled ? "—:—"\n    : spent ? "—:—"`,
    with: `    : settled ? "00:00"\n    : spent ? "—:—"`,
  },
  {
    // …and on the board card.
    name: "board-card-shows-a-dead-00:00-again",
    file: CARD,
    find: `            : settledNow ? "—:—"`,
    with: `            : settledNow ? "00:00"`,
  },
  {
    // "Closed" returning to a settled card. Copy discipline §7: closed is not a result.
    name: "settled-card-says-Closed-again",
    file: CARD,
    find: `              : state === "resolved" ? t.market.statusResolved`,
    with: `              : state === "resolved" ? t.market.statusClosed`,
  },
  {
    // `push` builds a back-stack of dead rounds; Back then walks the player backwards one at a time.
    name: "auto-advance-uses-push (a back button that walks through dead rounds)",
    file: ADV,
    find: `    router.replace(`,
    with: `    router.push(`,
  },
  {
    // The overlay gate removed — a handover fires under an open stake sheet and carries a typed
    // amount onto a DIFFERENT round's pool.
    name: "auto-advance-ignores-an-open-modal (a stake sheet abandoned mid-decision)",
    file: ADV,
    find: `      if (document.body.style.overflow === "hidden") return;`,
    with: `      if (false) return;`,
  },
  {
    // The in-flight gate removed — a bet submitted a heartbeat earlier vanishes mid-flight.
    name: "auto-advance-ignores-an-in-flight-bet",
    file: ADV,
    find: `      if (document.body.dataset.udBusy === "1") return;`,
    with: `      if (false) return;`,
  },
  {
    // ⭐ §6 · a player reading their settlement proof, moved anyway.
    name: "auto-advance-ignores-a-reader (the page replaced mid-sentence)",
    file: ADV,
    find: `    if (typeof window !== "undefined" && window.scrollY > SCROLL_DEFER_PX) return;`,
    with: `    void SCROLL_DEFER_PX;`,
  },
  {
    // The successor matched by number instead of by instant. Round n+1 exists after an abandoned
    // boundary but starts up to 83 minutes later — calling it "next" is a lie about the clock.
    name: "successor-matched-by-roundNumber (an 83-minute gap sold as imminent)",
    file: BOARD,
    find: `  const next = pool.find((x) => x.id !== r.id && x.opensAt === r.closesAt) ?? null;`,
    with: `  const next = pool.find((x) => x.id !== r.id) ?? null;`,
  },
  {
    // The detail page silently unwired — the surface that would have shipped broken.
    name: "round-detail-never-resolves-a-successor (half-wired, type-checks fine)",
    file: BOARD,
    find: `    board.successor = await successorFor(r, chain);`,
    with: `    void successorFor;`,
  },
  {
    // The board landing on a stopped chain again — measured live: one card, 25 hours old.
    name: "board-defaults-to-the-shortest-duration-again (a dead front door)",
    file: BOARD,
    find: `    ?? runningDurations(activeAsset.id)[0]`,
    with: `    ?? undefined`,
  },
  {
    // The strip trusting the query string. A hand-edited URL could then state a result that did
    // not happen, on a money surface (A-5).
    name: "last-round-strip-trusts-the-URL (a fabricated result from a query string)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `    && fromDetail.round.closesAt === detail.round.opensAt`,
    with: `    && true`,
  },
];

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) { console.error("   the suite is not green to begin with — nothing can be proven"); process.exit(2); }

let proven = 0, anchorless = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN — and try its CRLF form, because most files in
  // this repo are CRLF and a multi-line `\n` anchor silently edits nothing.
  const find = original.includes(m.find) ? m.find : m.find.replace(/\n/g, "\r\n");
  const repl = find === m.find ? m.with : m.with.replace(/\n/g, "\r\n");
  if (!original.includes(find)) {
    console.error(`   ANCHOR NOT FOUND in ${m.file} — this mutation proves NOTHING. Fix the anchor.`);
    anchorless++;
    continue;
  }
  writeFileSync(m.file, original.replace(find, repl), "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const line = out.match(/^(?:ALL PASS|FAILURES) — (\d+) passed, (\d+) failed$/m);
  const failed = line ? Number(line[2]) : 0;
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const l of out.split(/\r?\n/).filter((x) => x.includes("FAIL")).slice(0, 3)) console.log(`     ${l.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error(`   🔴 REVERT FAILED on ${m.file}`); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
// ⛔ A MISSING ANCHOR IS A FAILURE, NOT A SKIP. Scoring out of the mutations that happened to
// apply is exactly how E-108's guards validated a dead block and stayed green for eight sessions.
if (anchorless > 0) console.error(`🔴 ${anchorless} mutation(s) had no anchor — repair them before trusting this harness.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
