/**
 * RED anchors for `npm run red:presence-class` — the control for `test:presence-class`
 * (PRESENCE, 2026-09-04).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE. `red-anchors.test.mts` §3 audits every declared anchor
 * WITHOUT running the harness that injects it, and it can only do that because the mutations
 * are importable data rather than literals buried in a `.cjs`. Same law as
 * `motion-ladder.anchors.mjs` beside this file.
 *
 * ⛔ EVERY ANCHOR MUST RESOLVE EXACTLY ONCE — `red-anchor.mjs`'s `resolveAnchor` refuses both
 * zero matches (a rotted anchor proves nothing) and two or more (an ambiguous one proves the
 * wrong thing).
 *
 * Each mutation restores a defect that ACTUALLY SHIPPED, or inverts a rule the routing law
 * depends on. Nine of them, and the ones marked ⭐ are the reason this row exists at all: two
 * of the defects below were live in production on the morning of 2026-09-04.
 */

export const MUTATIONS = [
  {
    // ⭐ E-266, restored verbatim: the destructive flood guard.
    name: "toast.tsx — restore the destructive flood guard (announcements destroyed unseen)",
    file: "src/components/ui/toast.tsx",
    from: `    setToasts((prev) => [...prev, next]);`,
    to: `    setToasts((prev) => { const merged = [...prev, next]; return merged.slice(-MAX_VISIBLE); });`,
    expect: "4.1",
  },
  {
    // ⭐ E-266's other half: the marker written before the announcement.
    name: "notify-poller.tsx — mark the position announced BEFORE announcing it",
    file: "src/components/markets/notify-poller.tsx",
    from: `              if (seen.has(p.positionId)) continue;\n\n              const label =`,
    to: `              if (seen.has(p.positionId)) continue;\n              seen.add(p.positionId);\n\n              const label =`,
    expect: "3.1",
  },
  {
    // ⭐ E-268, restored: the announced-set with no memory fallback re-announces every 2s.
    name: "notify-poller.tsx — drop the memory fallback for the announced-set",
    file: "src/components/markets/notify-poller.tsx",
    from: `const memSeen = new Map<string, string>();`,
    to: `const memSeenDisabled = new Map<string, string>();`,
    expect: "3.3",
  },
  {
    name: "outcome-announcement.ts — let a hidden tab celebrate into an empty room",
    file: "src/lib/outcome-announcement.ts",
    from: `  if (!ctx.attentive) return { channel: "LEDGER", presence: "RETURNING" };`,
    to: `  if (false) return { channel: "LEDGER", presence: "RETURNING" };`,
    expect: "1.1",
  },
  {
    // ⭐ THE MUTATION THAT TAUGHT THIS SUITE SOMETHING. The first version flipped `== null` to
    // `=== undefined` and was NOT caught — because rule 4 coerces `null` to 0 and routed it
    // away regardless, so the check was asserting a branch it could not reach. Removing the
    // gate outright exposes the real hole: an `undefined` timestamp passes rule 4 (`undefined
    // < n` is false) AND rule 5 (`n - undefined` is NaN, `NaN > MAX` is false) and lands on
    // the seal. That is what a producer reading an absent field actually hands us.
    name: "outcome-announcement.ts — remove the unknown-timestamp gate (undefined reaches the seal)",
    file: "src/lib/outcome-announcement.ts",
    from: `  if (outcome.settledAtMs == null) return { channel: "LEDGER", presence: "RETURNING" };`,
    to: `  if (outcome.settledAtMs === -1) return { channel: "LEDGER", presence: "RETURNING" };`,
    expect: "1.2",
  },
  {
    // ⭐ THE GATE THIS HARNESS ARGUED THE SHAPE OF. Its first draft was the broader
    // `!Number.isFinite(x)`, which also swallowed null/undefined and thereby made the
    // unknown-timestamp mutation above uncatchable — the run came back 10/11 naming that gate.
    // The two are disjoint now, so each is provable on its own; this anchor is the proof for
    // the NaN half. ⛔ Widening either gate makes the other's mutation a MISS again.
    name: "outcome-announcement.ts — remove the NaN gate (a malformed date parses onto the seal)",
    file: "src/lib/outcome-announcement.ts",
    from: `  if (typeof outcome.settledAtMs === "number" && !Number.isFinite(outcome.settledAtMs)) {`,
    to: `  if (typeof outcome.settledAtMs === "string") {`,
    expect: "1.2b",
  },
  {
    // The boundary comparison, inverted by one character — the classic off-by-one that a
    // presence check written by hand gets wrong and a cross-product catches.
    name: "outcome-announcement.ts — invert the presence-window boundary",
    file: "src/lib/outcome-announcement.ts",
    from: `  if (outcome.settledAtMs < ctx.presenceSinceMs) return { channel: "LEDGER", presence: "RETURNING" };`,
    to: `  if (outcome.settledAtMs <= ctx.presenceSinceMs) return { channel: "LEDGER", presence: "RETURNING" };`,
    expect: "1.4b",
  },
  {
    name: "outcome-announcement.ts — invert the freshness cap so only STALE results celebrate",
    file: "src/lib/outcome-announcement.ts",
    from: `  if (ctx.serverNowMs - outcome.settledAtMs > MAX_LIVE_AGE_MS) {`,
    to: `  if (ctx.serverNowMs - outcome.settledAtMs < MAX_LIVE_AGE_MS) {`,
    expect: "1.5",
  },
  {
    // ⭐ THE FALSE MONEY STATEMENT. A netted figure across wins and losses.
    name: "away-ledger.ts — net a mixed set into one figure (a number nobody was ever paid)",
    file: "src/lib/away-ledger.ts",
    from: `  let figure: number | null = null;
  if (homogeneous === "WIN" || homogeneous === "VOID") {`,
    to: `  let figure: number | null = entries.reduce((s, e) => s + e.amount - e.stake, 0);
  if (homogeneous === "WIN" || homogeneous === "VOID") {`,
    expect: "5.1",
  },
  {
    // The clock defect: applying the server offset to a delta between two device readings.
    name: "presence-window.ts — mix the clocks when measuring how long the tab was hidden",
    file: "src/lib/presence-window.ts",
    from: `  const hiddenForMs = Date.now() - hiddenAtDevice;`,
    to: `  const hiddenForMs = serverNow() - hiddenAtDevice;`,
    expect: "2.2",
  },
  {
    // ⭐ E-269: the calm branch withdrawn, so the countdown lies again under reduced motion.
    name: "motion.css — drain the countdown to empty under reduced motion (the false claim)",
    file: "src/app/motion.css",
    from: `  .toast-countdown  { animation: none !important; transform: scaleX(1); }`,
    to: `  .toast-countdown  { animation: none !important; transform: scaleX(0); }`,
    expect: "7.3",
  },
  {
    // §F5 — a buzz for a render, on the one surface that must answer nothing.
    name: "away-summary-bar.tsx — buzz the player for arriving",
    file: "src/components/layout/away-summary-bar.tsx",
    from: `    setEntries(readAway());`,
    to: `    setEntries(readAway()); haptics.success();`,
    expect: "6.1",
  },
];
