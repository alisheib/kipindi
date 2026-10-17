/**
 * Anchors for `red:maswali-engine` (MASWALI-BUILD S2) — each puts back one way a Millionea week could be run wrong, in the
 * real source, and names the assertion that must turn red, and in which suite:
 *   · engine — the memory child of `test:maswali-engine` (`scripts/lib/maswali-engine-child.mts`)
 *   · score  — `test:maswali-score` (the 352-case table)
 *   · money  — `test:maswali-money` (the grid and worked example A)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const DAL = "src/lib/server/maswali-dal.ts";
const SVC = "src/lib/server/maswali-service.ts";

export const MUTATIONS = [
  {
    name: "(1) the freeze is removed: a question's English text becomes patchable after the open",
    file: DAL,
    from: "const QUESTION_PATCHABLE: Record<string, (v: unknown) => unknown> = {\n  outcome: (v) => v,",
    to: "const QUESTION_PATCHABLE: Record<string, (v: unknown) => unknown> = {\n  textEn: (v) => v,\n  outcome: (v) => v,",
    expect: "4.2 · ⛔ questionStore.patch refuses 'textEn'",
    suite: "engine",
  },
  {
    name: "(2) the close guard is off by one minute (29 minutes pass for 30)",
    file: SVC,
    from: "  if (closeMs > earliest - rules.minLockBufferMinutes * 60_000) {",
    to: "  if (closeMs > earliest - rules.minLockBufferMinutes * 60_000 + 60_000) {",
    expect: "2.10 · ⛔ …and at 18:29",
    suite: "engine",
  },
  {
    name: "(3) a void reserve is not skipped: it stands in for a voided main",
    file: "src/lib/maswali-score.ts",
    from: "  const usable = reserves.filter((q) => q.outcome === \"YES\" || q.outcome === \"NO\").map((q) => slotOf(\"RESERVE\", q.ordinal));",
    to: "  const usable = reserves.filter((q) => q.outcome !== null).map((q) => slotOf(\"RESERVE\", q.ordinal));",
    expect: "1 · v=1 reserves-void=1 ",
    suite: "score",
  },
  {
    name: "(4) the close is stamped twice: the store's claim no longer checks the week is still open",
    file: DAL,
    from: "    if (!cur || cur.state !== \"OPEN\" || cur.closedAt != null) return false;",
    to: "    if (!cur) return false;",
    expect: "5.9 · ⛔ a second stampClose loses the claim",
    suite: "engine",
  },
  {
    name: "(5) a question can be sealed after the week settled",
    file: SVC,
    from: "    if (week.state === \"SETTLED\" || week.state === \"VOIDED\" || week.state === \"DRAFT\") return refuse(",
    to: "    if (week.state === \"VOIDED\" || week.state === \"DRAFT\") return refuse(",
    expect: "9.6 · ⛔ nothing can be sealed on a SETTLED week",
    suite: "engine",
  },
  {
    name: "(6) the floor is forgotten: J is only R + S",
    file: "src/lib/maswali-money.ts",
    from: "  const J = Math.max(floor, R + S);",
    to: "  const J = R + S;",
    expect: "2.2 · week 2",
    suite: "money",
  },
  {
    name: "(7) the top-up loses its max(0, …): a week above the floor gets a negative top-up for its dust",
    file: "src/lib/maswali-money.ts",
    from: "  const U = Math.max(0, F + paid - (R + S));",
    to: "  const U = F + paid - (R + S);",
    expect: "no top-up when R + S already reaches the floor",
    suite: "money",
  },
];
