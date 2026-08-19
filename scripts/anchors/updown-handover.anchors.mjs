/**
 * THE ANCHORS `red:updown-handover` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason `updown-readiness.anchors.mjs` sets out at length: the fleet
 * auditor must answer *"does every anchor still resolve, exactly once?"* WITHOUT executing a
 * harness that rewrites real source. One definition, imported by both, so adding a mutation
 * adds it to the audit in the same keystroke.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ⭐ THIS FILE EXISTS BECAUSE THE RATCHET CAUGHT ME. `test:red-anchors` §4 holds a ceiling on
 * how many harnesses do not declare their anchors; adding `red:updown-handover` took it from 67
 * to 68 and the suite went red on the same commit that introduced it. Raising the ceiling was
 * the available shortcut and is exactly what a ratchet exists to refuse — so the harness joined
 * the audited set instead, and the ceiling came DOWN to 67 rather than up to 68.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const RULE = "src/lib/updown-card-phase.ts";
const CARD = "src/components/updown/updown-card.tsx";
const POD = "src/components/updown/round-countdown.tsx";
const ADV = "src/components/updown/updown-handover.tsx";
const BOARD = "src/lib/server/updown-board.ts";
const PAGE = "src/app/updown/[roundId]/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // THE PRODUCT AS IT SHIPPED: no handover at all. Every surface falls back to "Round settled".
    name: "no-handover-at-all (the dead end, exactly as production served it)",
    file: RULE,
    suite: "updown-handover",
    from: `  const settled = state === "resolved" || state === "void";\n  if (!settled) return { phase: "none", targetMs: null, counting: false, ready: false };`,
    to: `  const settled = state === "resolved" || state === "void";\n  if (true) return { phase: "none", targetMs: null, counting: false, ready: false };\n  if (!settled) return { phase: "none", targetMs: null, counting: false, ready: false };`,
  },
  {
    // The naive reading of the brief: in `live`, count to the successor's OPEN. Measured on
    // production that instant is ~91s in the PAST on 98.6% of settles, so this is a dead clock —
    // `useCountdown` clamps at zero and the pod would read `00:00` for ever.
    // ⚠️ THIS ANCHOR WAS RE-CUT once already, when `live` stopped carrying a bets-close target.
    name: "naive-countdown-to-the-open (a dead 00:00 on 98.6% of real settles)",
    file: RULE,
    suite: "updown-handover",
    from: `    return { phase: "live", targetMs: null, counting: false, ready: true };`,
    to: `    return { phase: "live", targetMs: successorOpensAtMs, counting: true, ready: true };`,
  },
  {
    // ⭐ §6's backgrounded tab. Every phase here is driven by one 1s interval and Chrome throttles
    // it in a hidden tab; without this listener a returning player sits on a stale phase.
    name: "clock-does-not-recover-from-a-backgrounded-tab",
    file: POD,
    suite: "updown-handover",
    from: `    document.addEventListener("visibilitychange", onVisible);`,
    to: `    void onVisible;`,
  },
  {
    // 🔴 The card's clock stopping at the close — the defect that produced BOTH a dead `00:00`
    // during the result overrun and a handover pinned in `hold` for ever.
    name: "card-clock-freezes-at-the-close-again (a dead 00:00 and a stuck hold)",
    file: CARD,
    suite: "updown-handover",
    from: `  const nowMs = serverNow ?? serverNowMs ?? closesAtMs;`,
    to: `  const nowMs = closesAtMs - (useCountdown(closesAtMs, serverNowMs) ?? 0) * 1000;`,
  },
  {
    // The hold anchored to the caller's clock instead of the result — it then restarts on every
    // poll, and `router.refresh()` fires constantly, so the ticker appears and vanishes for ever.
    name: "hold-anchored-to-now (a ticker that restarts on every poll)",
    file: RULE,
    suite: "updown-handover",
    from: `  if (settledAtMs != null && nowMs < settledAtMs + holdMs) {`,
    to: `  if (nowMs < nowMs + holdMs) {`,
  },
  {
    // ⛔ THE ONE THAT MATTERS MOST. A boundary can pass minutes before the round that starts
    // there exists; "the instant has gone by" is not "there is somewhere to go".
    name: "ready-without-a-successor-row (a navigation to a round that does not exist)",
    file: RULE,
    suite: "updown-handover",
    from: `  if (successorExists && successorOpensAtMs != null) {`,
    to: `  if (successorOpensAtMs != null) {`,
  },
  {
    // A stopped chain inventing a next match. Five of nineteen live chains are stopped.
    name: "stopped-chain-still-promises-a-next-match",
    file: RULE,
    suite: "updown-handover",
    from: `  if (!chainRunning) return { phase: "unavailable", targetMs: null, counting: false, ready: false };`,
    to: `  if (false) return { phase: "unavailable", targetMs: null, counting: false, ready: false };`,
  },
  {
    // `opensAt <= now` is load-bearing across this product. Handing over to a pre-created round
    // whose window has not begun would let a player stake against a line that does not exist.
    name: "pre-created-round-handed-over-early (breaks `opensAt <= now`)",
    file: RULE,
    suite: "updown-handover",
    from: `  if (successorOpensAtMs != null && nowMs < successorOpensAtMs) {`,
    to: `  if (false && successorOpensAtMs != null && nowMs < successorOpensAtMs) {`,
  },
  {
    // The dead `00:00` coming back on the round page — E-99 rule 3, which production was breaking.
    name: "round-page-pod-shows-a-dead-00:00-again",
    file: POD,
    suite: "updown-handover",
    from: `    : settled ? "—:—"\n    : spent ? "—:—"`,
    to: `    : settled ? "00:00"\n    : spent ? "—:—"`,
  },
  {
    // …and on the board card.
    name: "board-card-shows-a-dead-00:00-again",
    file: CARD,
    suite: "updown-handover",
    from: `            : settledNow ? "—:—"`,
    to: `            : settledNow ? "00:00"`,
  },
  {
    // "Closed" returning to a settled card. Copy discipline §7: closed is not a result.
    name: "settled-card-says-Closed-again",
    file: CARD,
    suite: "updown-handover",
    from: `              : state === "resolved" ? t.market.statusResolved`,
    to: `              : state === "resolved" ? t.market.statusClosed`,
  },
  {
    // `push` builds a back-stack of dead rounds; Back then walks the player backwards one at a time.
    name: "auto-advance-uses-push (a back button that walks through dead rounds)",
    file: ADV,
    suite: "updown-handover",
    from: `    router.replace(`,
    to: `    router.push(`,
  },
  {
    // The overlay gate removed — a handover fires under an open stake sheet and carries a typed
    // amount onto a DIFFERENT round's pool.
    name: "auto-advance-ignores-an-open-modal (a stake sheet abandoned mid-decision)",
    file: ADV,
    suite: "updown-handover",
    from: `      if (document.body.style.overflow === "hidden") return;`,
    to: `      if (false) return;`,
  },
  {
    // The in-flight gate removed — a bet submitted a heartbeat earlier vanishes mid-flight.
    name: "auto-advance-ignores-an-in-flight-bet",
    file: ADV,
    suite: "updown-handover",
    from: `      if (document.body.dataset.udBusy === "1") return;`,
    to: `      if (false) return;`,
  },
  {
    // ⭐ §6 · a player reading their settlement proof, moved anyway.
    name: "auto-advance-ignores-a-reader (the page replaced mid-sentence)",
    file: ADV,
    suite: "updown-handover",
    from: `    if (typeof window !== "undefined" && window.scrollY > SCROLL_DEFER_PX) return;`,
    to: `    void SCROLL_DEFER_PX;`,
  },
  {
    // The successor matched by number instead of by instant. Round n+1 exists after an abandoned
    // boundary but starts up to 83 minutes later — calling it "next" is a lie about the clock.
    name: "successor-matched-by-roundNumber (an 83-minute gap sold as imminent)",
    file: BOARD,
    suite: "updown-handover",
    from: `  const next = pool.find((x) => x.id !== r.id && x.opensAt === r.closesAt) ?? null;`,
    to: `  const next = pool.find((x) => x.id !== r.id) ?? null;`,
  },
  {
    // The detail page silently unwired — the surface that would have shipped broken.
    name: "round-detail-never-resolves-a-successor (half-wired, type-checks fine)",
    file: BOARD,
    suite: "updown-handover",
    from: `    board.successor = await successorFor(r, chain);`,
    to: `    void successorFor;`,
  },
  {
    // The board landing on a stopped chain again — measured live: one card, 25 hours old.
    name: "board-defaults-to-the-shortest-duration-again (a dead front door)",
    file: BOARD,
    suite: "updown-handover",
    from: `    ?? runningDurations(activeAsset.id)[0]`,
    to: `    ?? undefined`,
  },
  {
    // The strip trusting the query string. A hand-edited URL could then state a result that did
    // not happen, on a money surface (A-5).
    name: "last-round-strip-trusts-the-URL (a fabricated result from a query string)",
    file: PAGE,
    suite: "updown-handover",
    from: `    && fromDetail.round.closesAt === detail.round.opensAt`,
    to: `    && true`,
  },
];
