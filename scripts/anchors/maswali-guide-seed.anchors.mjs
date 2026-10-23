/**
 * Anchors for `red:maswali-guide-seed` (MASWALI-BUILD S6-GUIDE 6) — each puts back one way the admin guide's seeded story
 * could stop telling one coherent story, in the real route, and names the rule of `scripts/maswali-guide-seed.test.mts`
 * that must turn red. DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once.
 *
 * `expect` is the start of the rule's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const ROUTE = "src/app/api/dev-test/seed-maswali-guide/route.ts";

export const MUTATIONS = [
  {
    name: "(1) a seal before its event (M3 sealed at 12:50, its kick-off at 13:00)",
    file: ROUTE,
    from: `{ role: "MAIN", ordinal: 3, topic: "sports", source: NBC, day: 5, time: "13:00", sealDay: 5, sealTime: "15:10" },`,
    to: `{ role: "MAIN", ordinal: 3, topic: "sports", source: NBC, day: 5, time: "13:00", sealDay: 5, sealTime: "12:50" },`,
    expect: "2.4 ·",
  },
  {
    name: "(2) the settled stamp left on the real clock, weeks before the week's own close",
    file: ROUTE,
    from: "    await weekStore.patch(w3.id, { settledAt: released.toISOString() }); // the declared fixture of the settled stamp",
    to: "",
    expect: "2.5 ·",
  },
  {
    name: "(3) the story told a day late: the window of the week with objections already closed",
    file: ROUTE,
    from: `    const storyNow = new Date(at(mn, 0, "10:30")).toISOString();`,
    to: `    const storyNow = new Date(at(mn, 1, "10:30")).toISOString();`,
    expect: "2.5 ·",
  },
  {
    name: "(4) the weeks not consecutive: the second week a fortnight after the first",
    file: ROUTE,
    from: "    const m2 = m3 + 7 * DAY;",
    to: "    const m2 = m3 + 14 * DAY;",
    expect: "2.1 ·",
  },
  {
    name: "(5) \"(dev seed)\" back in the evidence an officer wrote",
    file: ROUTE,
    from: "  if (s.topic === \"sports\") return outcome === \"YES\" ? `Official match report: ${home} 2–1 ${away}.` : `Official match report: ${home} 1–1 ${away}.`;",
    to: "  if (s.topic === \"sports\") return `Official result for ${home} (dev seed)`;",
    expect: "2.8 ·",
  },
  {
    name: "(6) a player named as a dev account",
    file: ROUTE,
    from: `const PLAYERS = ["Neema Mfano", "Baraka Mfano",`,
    to: `const PLAYERS = ["Dev player 9dd1", "Baraka Mfano",`,
    expect: "2.8 ·",
  },
];
