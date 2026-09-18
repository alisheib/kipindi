/**
 * THE ONE EXPECT-DRIFT ROLL-CALL (replan ruling 505; lifted out of `house-bot-console-cases.mts` 1.318).
 *
 * 🔴 THE DEFECT. Every red drive matches a mutation's declared `expect` against the FAIL lines of the run it triggers.
 * `red:house-bot-console`, `red:house-bot-engine` and `red:house-bot-money` do it with
 * `result.fails.find((l) => l.includes(d.expect))`; `red:house-page` and `red:house-book` do it with the label's own
 * SECTION TOKEN. Either way, an `expect` that no label of that suite can match is not a failed mutation — it is
 * classed WRONG-ASSERTION, `missed++`, and the drive exits 1. Red for the wrong reason, which is the one thing a red
 * drive exists to refuse, and inside C5-8's single batch run it reads exactly like success.
 *
 * ⛔ WHY IT IS ONE MODULE AND NOT ONE BLOCK. Step 1 found THREE rotted declarations (`453-off`, `453-accounts`,
 * `373-subject`) and found them only because someone went looking; the block that now catches them lived in one cases
 * file and covered one suite's declarations. `test:red-anchors` §3 is structurally blind to the class — it resolves the
 * `from` TEXT and never looks at `expect` — so the only guard that can see it is one that runs inside the suite whose
 * labels are the population. Every house anchors file gets one, at the END of its suite, reading the labels THAT RUN
 * printed.
 *
 * ⛔ TWO TIERS, AND THE SECOND IS NOT A WEAKENING. Some declarations name assertions a GREEN run never prints — a
 * catch-branch label such as `0.throw`, and the roll-call's own two labels, which are appended after it runs. So an
 * `expect` counts as REACHABLE when the run PRINTED it, or when the label literal is in the suite's own DECOMMENTED
 * source (the repo's one stripper, so a stale `expect` quoted in a comment cannot launder itself). Source-tier entries
 * are NAMED in the extra, never silently accepted.
 *
 * ⛔ THE MATCHER IS THE DRIVE'S OWN MATCHER, NOT A CONVENIENT ONE. A roll-call that checked `includes` for a suite
 * whose drive compares section tokens would pass declarations the drive then rejects — the "check that passes through
 * the wrong field" class. `match: "section"` is `red-house-page` / `red-house-book`'s `failedSections` rule, and it
 * disables the source tier by construction: a token like `2.1` is a substring of half a file, so a source tier there
 * would accept anything. Those two suites print every label they own on a green run, so the printed tier is complete.
 */

/** One declared mutation, as the anchors files write them. `suite` is absent in the single-suite files. */
export type DeclaredMutation = { readonly name: string; readonly expect: string; readonly suite?: string };

export type DriftReport = {
  /** Declarations this suite owns. */
  declared: number;
  /** Declarations in the same file that name ANOTHER suite's labels, which this run cannot print — named, never silent. */
  otherSuites: string[];
  /** Reachable only through the source tier (a catch-branch label, or a label appended after this check). */
  printedOnlyInSource: string[];
  /** ⛔ THE DEFECT: an `expect` no label of this suite can match. */
  stale: string[];
  /** Labels this run printed, counted — the population, printed so a floor is raised to a measured number. */
  labels: number;
  match: "substring" | "section";
  sourceTier: boolean;
};

/** The token `red-house-page` / `red-house-book` extract from a FAIL line: the label's first word, split on space or the separator. */
export const sectionTokenOf = (label: string): string => label.trim().split(/[\s·]/)[0];

/** The short id a declaration is known by in a drive's `--only` argument. */
const idOf = (m: DeclaredMutation): string => m.name.split(" ")[0];

export type RollCallInput = {
  /** This suite's own keys in the declaration file; EMPTY means the file holds only this suite's declarations. */
  suiteKeys: readonly string[];
  declarations: readonly DeclaredMutation[];
  /** Every label this run emitted, in order. */
  emitted: readonly string[];
  /** This suite's DECOMMENTED source — the second tier. Pass "" with `match: "section"`. */
  source: string;
  /** The two labels this roll-call itself emits, which are appended AFTER it runs and so cannot be in `emitted` yet. */
  ownLabels: readonly string[];
  match?: "substring" | "section";
};

export function expectDriftReport(input: RollCallInput): DriftReport {
  const match = input.match ?? "substring";
  const sourceTier = match === "substring";
  const pool = [...input.emitted, ...input.ownLabels];
  const reachable = (expect: string): boolean =>
    match === "section" ? pool.some((l) => sectionTokenOf(l) === expect) : pool.some((l) => l.includes(expect));
  const isMine = (m: DeclaredMutation) => input.suiteKeys.length === 0 || input.suiteKeys.includes(m.suite ?? "");
  const mine = input.declarations.filter(isMine);
  const others = input.declarations.filter((m) => !isMine(m));
  const unreached = mine.filter((m) => !reachable(m.expect));
  const printedOnlyInSource = sourceTier ? unreached.filter((m) => input.source.includes(m.expect)) : [];
  const stale = unreached.filter((m) => !printedOnlyInSource.includes(m));
  return {
    declared: mine.length,
    otherSuites: others.map((m) => `${m.suite ?? "(none)"}:${idOf(m)}`),
    printedOnlyInSource: printedOnlyInSource.map(idOf),
    stale: stale.map((m) => `${idOf(m)} → ${m.expect}`),
    labels: input.emitted.length,
    match,
    sourceTier,
  };
}

/**
 * ⛔ THE CONTROL, AND IT IS PART OF THE HELPER SO NO CALL SITE CAN SHIP WITHOUT ONE. It asks two questions of the same
 * detector: does it FIND a declaration this run really printed, and does it refuse one that does not exist? The
 * sentinel is built by CONCATENATION because the source tier reads the calling suite's own file — written as one
 * literal it could find itself and the control could never fail.
 */
export function expectDriftControl(input: RollCallInput, minLabels: number): { pass: boolean; extra: string } {
  const sentinel = "an assertion that " + "does not exist in this suite";
  const probe = expectDriftReport({ ...input, declarations: [{ name: `${sentinel} · sentinel`, expect: sentinel, suite: input.suiteKeys[0] }] });
  const mine = input.declarations.filter((m) => input.suiteKeys.length === 0 || input.suiteKeys.includes(m.suite ?? ""));
  const first = mine[0];
  const found = first ? expectDriftReport({ ...input, declarations: [first] }) : null;
  const pass = input.emitted.length >= minLabels && mine.length > 0
    && found !== null && found.stale.length === 0
    && probe.stale.length === 1 && !input.source.includes(sentinel);
  return {
    pass,
    extra: JSON.stringify({ labels: input.emitted.length, mine: mine.length, firstFound: found?.stale.length === 0, sentinelRefused: probe.stale.length === 1 }),
  };
}
