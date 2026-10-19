/** U43 result-window guard mutations. Data only, so test:red-anchors can audit them. */
export const MUTATIONS = [
  {
    file: "src/lib/updown-board-order.ts",
    from: "latestClose <= currentOpen",
    to: "latestClose >= currentOpen",
    expect: "1.3 same-window result stays off the current board",
  },
  {
    file: "src/lib/server/updown-board.ts",
    from: "const lastDone = latestNonOverlappingResult(mapped, current);",
    to: 'const lastDone = mapped.find((r) => r.state === "resolved" || r.state === "void");',
    expect: "2.1 production board uses the non-overlap selector",
  },
  {
    file: "scripts/live/updown-visual-states.mjs",
    from: 'const armed = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 5 });',
    to: 'await post("/api/dev-test/updown-advance");\nconst armed = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 6 });',
    expect: "3.1 local state fixture does not open an overlapping initial round",
  },
  {
    file: "scripts/live/updown-visual-states.mjs",
    from: "if (!testHandover?.opened?.id || testHandover.opened.opensAt !== testHandover.closed.closesAt) {",
    to: "if (!testHandover?.opened?.id) {",
    expect: "3.3 local state fixture verifies exact adjacent handover",
  },
].map((mutation, index) => ({ name: `U43-window-${index + 1}`, suite: "u43-board-window", ...mutation }));
