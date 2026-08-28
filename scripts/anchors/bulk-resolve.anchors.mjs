/**
 * RED anchors for `npm run test:bulk-resolve`.
 *
 * ⛔ EVERY CASE MUST MAKE THE SUITE EXIT NON-ZERO *AND* PRINT ITS OWN `FAIL <expect>` LINE.
 * "The file changed" is not a RED, and neither is "something went red" — a defect caught
 * for the wrong reason is reported as WRONG REASON, never as a pass.
 *
 * ⭐ TWO CASES MATTER MORE THAN THE REST AND NEITHER IS ABOUT RESOLVE LOGIC:
 * `block-everything` (a verdict that refuses every row keeps every safety rule perfectly
 * and is useless) and `matrix-goes-blind` (a check that examines nothing prints its
 * all-clear in exactly the same words as a clean run).
 *
 * ── SHAPE ────────────────────────────────────────────────────────────────────────
 * Every case carries a TOP-LEVEL `from`/`to` — the primary mutation — because that is what
 * the repo-wide auditor `scripts/red-anchors.test.mts` reads. An earlier draft nested every
 * anchor inside `edits: [...]` with nothing at the top level, and the auditor died on
 * `toEol(undefined)`: a harness that hides its anchors from the fleet auditor is a harness
 * whose anchors can rot in silence, which is the one thing that file exists to prevent.
 *
 * `also` carries the SECOND half of a paired mutation. Several of these defects are only
 * reachable as a pair, because the verdict's agreement check fails CLOSED: breaking one half
 * alone produces `internal-disagreement` (a refusal, which is safe) rather than the
 * dangerous state the case is about. ⚠️ `also` anchors are not seen by the fleet auditor,
 * but `red:bulk-resolve` itself reports an unresolvable one as ANCHOR FAIL and exits
 * non-zero — so they cannot rot unnoticed either.
 */

const ELIG = "src/lib/server/bulk-resolve-eligibility.ts";
const ACTION = "src/app/admin/resolver-queue/bulk-resolve-action.ts";
const BAR = "src/app/admin/resolver-queue/bulk-resolve-bar.tsx";
const REGISTRY = "src/lib/server/source-registry.ts";
const DAL = "src/lib/server/market-dal.ts";
const PAGE = "src/app/admin/resolver-queue/page.tsx";
const SUITE = "scripts/bulk-resolve.test.mts";

export const MUTATIONS = [
  {
    name: "⭐ POSITIVE CONTROL · the verdict refuses every row",
    file: ELIG,
    expect: "1.9 the known-good fixture is ELIGIBLE",
    from: `  const eligible = agrees && floor.confident && !rowStateBlocked;`,
    to: `  const eligible = false;`,
  },
  {
    name: "⭐ SCANNER LIVENESS · the agreement matrix drives nothing",
    file: SUITE,
    expect: "2.1 the full floor matrix was driven",
    from: `  for (let bits = 0; bits < 96; bits++) {`,
    to: `  for (let bits = 0; bits < 0; bits++) {`,
  },
  {
    name: "⭐ THE MATRIX GOES BLIND TO THE PRODUCTION SHAPE (determined NULL + an assessment)",
    file: SUITE,
    expect: "2.4 the matrix drives a PRESENT assessment with determined NULL (every production row)",
    from: `    const determined = DET[bits % 3];`,
    to: `    const determined = DET[bits % 2];`,
  },
  {
    name: "the floor is RESTATED inline instead of asking decideAutoResolve",
    file: ELIG,
    expect: "1.1 the verdict CALLS decideAutoResolve (one definition site)",
    from: `  const floor = decideAutoResolve({ assessment: a, mode: "auto", threshold, sourceMatches });`,
    to: `  const floor = { confident: !!a && a.confidence >= threshold, goAuto: false, haveOutcome: !!a };`,
  },
  {
    name: "a citation from the wrong host stops blocking the row",
    file: ELIG,
    expect: "3.2 …naming the citation as the reason",
    from: `  const floor = decideAutoResolve({ assessment: a, mode: "auto", threshold, sourceMatches });`,
    to: `  const floor = decideAutoResolve({ assessment: a, mode: "auto", threshold, sourceMatches: true });`,
    also: [{ from: `    if (!sourceMatches) {`, to: `    if (false) {` }],
  },
  {
    name: "🔴 A-5 · an UNRECORDED determined flag is read as TRUE",
    file: ELIG,
    expect: "5.3 determined=NULL blocks",
    from: `    determined: m.sentinelDetermined === true,`,
    to: `    determined: m.sentinelDetermined !== false,`,
    also: [{ from: `    else if (m.sentinelDetermined == null) add("determined-not-recorded");`, to: `    else if (false) add("determined-not-recorded");` }],
  },
  {
    name: "🔴 the migration artifact OUTRANKS the citation failure (every production row)",
    file: ELIG,
    expect: "12 · 99% espn · the migration artifact never leads",
    from: `  "below-threshold",
  "determined-not-recorded",
] as const;`,
    to: `  "below-threshold",
] as const;`,
    also: [{ from: `  "not-determined",
  "source-none-cited",`, to: `  "not-determined",
  "determined-not-recorded",
  "source-none-cited",` }],
  },
  {
    name: "the DAL coerces an unrecorded determined flag to false",
    file: DAL,
    expect: "5.6 the DAL reads the column as null, never coerced to false",
    from: `    sentinelDetermined: r.sentinelDetermined ?? null,`,
    to: `    sentinelDetermined: r.sentinelDetermined ?? false,`,
  },
  {
    name: "🔴 the host rule drops its leading dot (evilkitco.com matches kitco.com)",
    file: REGISTRY,
    expect: "4.3 a look-alike domain does NOT match",
    from: "    (s) => s.enabled && s.category === category && (host === s.domain || host.endsWith(`.${s.domain}`)),",
    to: "    (s) => s.enabled && s.category === category && (host === s.domain || host.endsWith(s.domain)),",
  },
  {
    name: "the page grows a SECOND host rule instead of consuming the shared one",
    file: PAGE,
    expect: "4.9 the page consumes sourceMatchesAny, never its own host rule",
    from: `        sourceMatchesAny(trustedSources, m.sentinelSourceUrl, resolvePublishCategory(m.category)));`,
    to: `        !!m.sentinelSourceUrl);`,
  },
  {
    name: "a LIVE market becomes bulk-overridable (betting still open)",
    file: ELIG,
    expect: "6.5 nothing is both row-state and overridable",
    from: `export const OVERRIDABLE: ReadonlySet<BulkBlockReason> = new Set<BulkBlockReason>([
  "no-assessment",`,
    to: `export const OVERRIDABLE: ReadonlySet<BulkBlockReason> = new Set<BulkBlockReason>([
  "still-live",
  "no-assessment",`,
  },
  {
    name: "an already-RESOLVED market stops being refused",
    file: ELIG,
    expect: "7.1 a RESOLVED market is blocked and NOT overridable",
    from: `  if (sealed) add("already-resolved");`,
    to: `  if (false) add("already-resolved");`,
    also: [{ from: `  const rowStateBlocked = sealed || staged || (!sealed && m.status === "LIVE")`, to: `  const rowStateBlocked = staged || (!sealed && m.status === "LIVE")` }],
  },
  {
    name: "🔴 POCA §16 · a staged row becomes bulk-countersignable",
    file: ELIG,
    expect: "7.9 two-admin · ANOTHER officer's stage-1 is refused too",
    from: `  const staged = !!m.resolutionStage1By;`,
    to: `  const staged = !!m.resolutionStage1By && m.resolutionStage1By === officerId;`,
  },
  {
    /* ⭐ THE SECOND HALF OF THE SAME RULE, and the one the original mutation could not
       reach. Re-coupling `staged` to the CURRENT POLICY is the defect that shipped: the
       refusal vanished the moment two-admin was toggled off, and `resolveMarket` drops its
       own stage-1 and different-officer guards under that same setting — so the officer who
       staged ten markets could seal all ten with their own press. A mutation that only
       narrows `staged` to "my own signature" leaves the policy coupling untested. */
    name: "🔴 POCA §16 · a staged row un-stages itself when two-admin is switched off",
    file: ELIG,
    expect: "16.1 a row carrying a stage-1 signature is NOT eligible with the policy OFF",
    from: `  const staged = !!m.resolutionStage1By;`,
    to: `  const staged = requireTwoOfficer && !!m.resolutionStage1By;`,
  },
  {
    name: "the claim TTL drifts away from the engine's",
    file: ELIG,
    expect: "7.6 the queue's claim TTL equals the engine's",
    from: `export const RESOLVE_CLAIM_TTL_MS = 10 * 60_000;`,
    to: `export const RESOLVE_CLAIM_TTL_MS = 2 * 60_000;`,
  },
  {
    name: "🔴 the human fallback stops releasing the resolve claim",
    file: "src/lib/server/market-service.ts",
    expect: "7.6b the engine RELEASES the claim when a market transitions",
    from: `      status: "CLOSED",
      resolutionNotifiedAt: nowIso,
      resolveClaimedAt: null,`,
    to: `      status: "CLOSED",
      resolutionNotifiedAt: nowIso,`,
  },
  {
    name: "a doubly-blocked row is accused of the WRONG clause",
    file: ELIG,
    expect: "8.1 a doubly-blocked row leads with the CITATION",
    /* ⚠️ ANCHORED FROM `"claimed-elsewhere"` DOWN, and that is not padding. The five
       source/evidence/threshold lines on their own appear TWICE in this file — once in
       `REASON_ORDER` and once in `OVERRIDABLE` — and `resolveAnchor` refuses an ambiguous
       anchor rather than injecting into whichever came first. `claimed-elsewhere` is row
       state, so it is in REASON_ORDER and never in OVERRIDABLE. */
    from: `  "claimed-elsewhere",
  "no-assessment",
  "outcome-unknown",
  "not-determined",
  "source-none-cited",
  "source-different-domain",
  "source-untrusted",
  "thin-evidence",
  "below-threshold",`,
    to: `  "claimed-elsewhere",
  "no-assessment",
  "outcome-unknown",
  "not-determined",
  "thin-evidence",
  "below-threshold",
  "source-none-cited",
  "source-different-domain",
  "source-untrusted",`,
  },
  {
    name: "🔴 the bulk action stops validating the outcome before the engine",
    file: ACTION,
    expect: "10.4 the outcome is validated before it reaches the engine",
    from: `      if (outcome !== "YES" && outcome !== "NO") {`,
    to: `      if (outcome === null) {`,
  },
  {
    name: "🔴 the AI's excerpt is written as the OFFICER's player-facing evidence",
    file: ACTION,
    expect: "10.9 NOTHING is written as the officer's player-facing evidence",
    from: `        const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId });`,
    to: `        const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId, evidence: m.sentinelEvidence ?? undefined });`,
  },
  {
    name: "🔴 the override audit is written for a row the floor never refused",
    file: ACTION,
    expect: "10.20 the override audit is gated on an override that was actually USED",
    from: `      const usedOverride = !v.eligible && !!typed && v.overridable`,
    to: `      const usedOverride = !!typed && v.overridable`,
  },
  {
    name: "the override half loses its own compliance gate",
    file: ACTION,
    expect: "10.7 the override half is gated on its OWN control key",
    from: `const OVERRIDE_DOMAIN = CONTROL_DOMAIN.bulkResolveOverride;`,
    to: `const OVERRIDE_DOMAIN = CONTROL_DOMAIN.bulkResolveMarkets;`,
  },
  {
    name: "markets are sealed in PARALLEL (20 concurrent withLock transactions)",
    file: ACTION,
    expect: "10.3 markets are sealed SEQUENTIALLY",
    from: `    for (const id of unique) {`,
    to: `    await Promise.all(unique.map(async (id) => {`,
  },
  {
    name: "🔴 the raw payload is only bounded AFTER dedupe",
    file: ACTION,
    expect: "10.22 the raw payload is bounded BEFORE dedupe",
    from: `  const raw = formData.getAll("marketIds");
  if (raw.length > PER_PAGE) {`,
    to: `  const raw = formData.getAll("marketIds");
  if (false) {`,
  },
  {
    name: "🔴 an aborted batch reports nothing, over markets it really sealed",
    file: ACTION,
    expect: "10.23 the buckets are declared OUTSIDE the try, so an abort still reports them",
    from: `  const resolved: BulkResolveOutcome[] = [];
  const staged: BulkResolveOutcome[] = [];
  const skipped: BulkResolveOutcome[] = [];
  const alreadyApplied: BulkResolveOutcome[] = [];
  const failed: BulkResolveOutcome[] = [];
  let attempted = 0;

  try {`,
    to: `  let attempted = 0;

  try {
    const resolved: BulkResolveOutcome[] = [];
    const staged: BulkResolveOutcome[] = [];
    const skipped: BulkResolveOutcome[] = [];
    const alreadyApplied: BulkResolveOutcome[] = [];
    const failed: BulkResolveOutcome[] = [];`,
  },
  {
    name: "the per-market catch is deleted, so one throw unwinds the whole batch",
    file: ACTION,
    expect: "10.17 one market that throws does not abandon the rest (inner AND outer catch)",
    from: `      } catch (err) {`,
    to: `      } finally {`,
  },
  {
    name: "🔴 the typed gate is passed as two INDEPENDENT props (hard with no word)",
    file: BAR,
    expect: "11.10b …and the tier is never passed independently of the word",
    from: `      {...(hasOverride
        ? ({ tier: "hard", typedWord: "RESOLVE" } as const)
        : ({ tier: "medium" } as const))}`,
    to: `      tier={hasOverride ? "hard" : "medium"}
      typedWord={hasOverride ? "RESOLVE" : undefined}`,
  },
  {
    name: "a mixed batch is reported as one tidy success",
    file: BAR,
    expect: "11.11 the headline counts every bucket, never a bare success",
    from: "        r.alreadyApplied.length ? `${r.alreadyApplied.length} already done` : \"\",\n        r.skipped.length ? `${r.skipped.length} skipped` : \"\",",
    to: `        "",
        "",`,
  },
];
