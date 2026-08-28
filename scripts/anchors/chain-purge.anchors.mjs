/**
 * THE ANCHORS `red:chain-purge` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * The chain purge is the heaviest destructive control on the platform, and every mutation
 * below is a way it has ALREADY gone wrong somewhere on this platform, or the exact reversal
 * of a decision that was made because it did.
 *
 * ⭐ 1 IS THE ONE THE WHOLE DESIGN EXISTS TO PREVENT. Deleting the market instead of stamping
 * it is what a teardown script did on production on 2026-08-28: two STAKE_DEBIT ledger pairs
 * were left standing against a market that no longer existed, the books claimed TZS 2,000 in
 * escrow for it, and `house-money.cjs` still printed "the books balance". At the scale of a
 * whole chain that is manufactured thousands of times over with every money suite green.
 *
 * ⭐ 2 IS THE SAME LIE ONE LAYER DOWN — the tombstone blanks the pools along with the titles,
 * so the row survives and means nothing. Every "no delete" assertion still passes.
 *
 * ⭐ 3 IS THE TWO-OFFICER GATE SILENTLY BECOMING ONE, which is the failure this repo has
 * already documented: `twoOfficerGate` PASSES when the maker is absent, because for its other
 * callers a missing maker means "no conflict". Remove the explicit stage-1 assertion and a
 * ceremony that never started completes with a single signature.
 *
 * ⭐ 4 IS EXPORT-AFTER-DESTROY: the pack still gets written and hashed, so the audit row still
 * carries a sha256 — of an artefact recording rounds that are already gone.
 *
 * ⭐ 5 IS THE UNSCOPED DELETE, verbatim from `ops-updown-reset-games.mts`, which takes the
 * observations every OTHER duration on the asset still needs.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement CONTAINS its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const SERVICE = "src/lib/server/chain-purge.ts";
const ACTIONS = "src/app/admin/retention/purge-actions.ts";
const STORE = "src/app/admin/retention/purge-stage1-store.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "the-market-is-deleted-again",
    why: "⭐ THE DEFECT THE WHOLE DESIGN EXISTS TO PREVENT, and it is not hypothetical: a teardown did exactly this on production on 2026-08-28 and left two STAKE_DEBIT pairs standing against a market that no longer existed, while house-money.cjs printed \"the books balance\". LedgerEntry.marketId, HousePoolLedger.marketId and Transaction.positionId are loose strings with no FK, so nothing in the database stops it and nothing in the money suites notices",
    file: SERVICE,
    suite: "chain-purge",
    from: `          db.predictionMarket.updateMany({`,
    to: `          db.predictionMarket.deleteMany({`,
    expect: "5: 🔴 the market is REDACTED, never deleted",
  },
  {
    name: "the-tombstone-blanks-the-money-too",
    why: "The row survives and means nothing. Every \"never deletes\" assertion still passes, the trial balance moves, and GGR/NGR/settlement-fee reads silently narrow — a tombstone that erases the pools is a deletion wearing a stamp",
    file: SERVICE,
    suite: "chain-purge",
    from: `              purgedAt: new Date(),`,
    to: `              yesPool: 0, noPool: 0,\n              purgedAt: new Date(),`,
    expect: "5: 🔴 …and it does NOT write yesPool",
  },
  {
    name: "two-officer-silently-becomes-one",
    why: "⭐ THE DOCUMENTED DOWNGRADE. `twoOfficerGate` returns null — PASSES — when makerId is absent, because for its other callers a missing maker means no conflict. For a ceremony that REQUIRES two officers that reading is backwards: no maker means it never started. Combined with saveConfig, which never throws, a silently-dropped stage 1 makes ONE officer sufficient",
    file: ACTIONS,
    suite: "chain-purge",
    from: `    if (!stage1) {`,
    to: `    if (false) {`,
    expect: "6: 🔴 stage 2 REFUSES when there is no first signature",
  },
  {
    name: "the-stage1-write-is-not-read-back",
    why: "`saveConfig` catches, logs and returns void, so a failed write is indistinguishable from a successful one — and an absent maker PASSES the gate. Trusting the write is what turns a storage hiccup into a one-officer purge",
    file: STORE,
    suite: "chain-purge",
    from: `  const readBack = await loadConfig<PurgeStage1>(KEY(chainId));`,
    to: `  const readBack = { actorId: sig.actorId } as PurgeStage1;`,
    expect: "6: 🔴 the stage-1 write is READ BACK",
  },
  {
    name: "deleting-starts-before-the-export",
    why: "⭐ THE JOB SKIPS STRAIGHT TO DELETING, so the first batch destroys rounds the evidence pack has not recorded yet. The pack is still written afterwards and still hashed, so the completion audit row still carries a sha256 and everything LOOKS evidenced — of an artefact describing rounds that were already gone. Only a check that counts the rounds AT THE MOMENT OF EXPORT can tell the two apart. ⚠️ Re-anchored after the first attempt went red on a real but different assertion: gating the export on an empty chain modelled 'the export never runs', not 'the export runs too late'",
    file: SERVICE,
    suite: "chain-purge",
    from: `    phase: "exporting",`,
    to: `    phase: "deleting",`,
    expect: "3: 🔴 the evidence pack is written BEFORE any deletion",
  },
  {
    name: "the-unscoped-delete-returns",
    /* ⚠️ The reset script is named in this COMMENT, not in the `why` string below — see the
       note in chain-purge.test.mts §5: a filename inside a STRING reads to `test:orphans` as a
       reference and marks a declared-orphan script reachable. */
    why: "⭐ The Up & Down reset script's unscoped `deleteMany({})`, verbatim. Unscoped, it takes the observations that the 15- and 30-minute chains on the same asset still need — and re-observing a confirmed boundary is forbidden, so the readings do not come back. The one deletion on this platform that cannot be undone by any means",
    file: SERVICE,
    suite: "chain-purge",
    from: `        await roundStore.deleteMany(roundIds);`,
    to: `        await roundStore.deleteMany(roundIds); await pc().upDownObservation.deleteMany({});`,
    expect: "5: 🔴 the purge never deletes a upDownObservation",
  },
  {
    name: "the-precondition-refuses-everything",
    why: "⭐ POSITIVE CONTROL. Every refusal assertion passes HARDER, no chain is ever purged and the audit trail is perfectly safe — while the control Ali asked for does not work at all. A control that never works is not a safe control, it is a broken one, and no refusal-only suite can see it",
    file: SERVICE,
    suite: "chain-purge",
    from: `  if (chain.state !== "ARCHIVED") {`,
    to: `  if (chain.state !== "NEVER_A_REAL_STATE") {`,
    expect: "1: ⭐ CONTROL — a settled, archived chain IS allowed",
  },
  {
    name: "the-verification-asks-the-stamped-rows-whether-they-are-stamped",
    why: "🔴 THE REAL SHIPPED DEFECT, restored verbatim (found 2026-08-28 while confirming the migration had landed). Scoping the verification population to `purgedBy = officerB AND purgedAt IS NOT NULL` breaks it three ways at once: the follow-up 'is anything unstamped?' query is VACUOUS, because both its arms are dead against a set already filtered to stamped rows; a market that FAILED to stamp has purgedAt NULL and is excluded from the population before the question is asked, which is `pool-residual.cjs`'s inner join reproduced in the very feature designed around that finding; and `purgedBy` names the OFFICER, not the chain, so a second purge re-verifies the first one's markets. The job then completes, and the completion audit row says so",
    file: SERVICE,
    suite: "chain-purge",
    from: `      const marketIds = [...new Set((packed.markets ?? []).map((m) => m.id))];`,
    to: `      const marketIds = (await db.predictionMarket.findMany({ where: { purgedBy: job.officerB, purgedAt: { not: null } }, select: { id: true } })).map((m) => m.id);`,
    expect: "8: 🔴 the verification population is NOT scoped by the OFFICER",
  },
  {
    name: "a-deleted-market-no-longer-fails-the-job",
    why: "⭐ THE CLASS THE WHOLE TOMBSTONE DESIGN EXISTS TO PREVENT, made invisible again — and note that it does NOT require deleting anything to be dangerous. `vanished` is still measured and still written to the failure payload; it simply stops being a reason to fail. So a purge that DELETED markets rather than redacting them completes cleanly, writes `updown.chain.purged`, and leaves every LedgerEntry, HousePoolLedger and Transaction naming those markets pointing at nothing — the 2026-08-28 production defect at the scale of a whole chain, with `house-money.cjs` still printing \"the books balance\" because both halves of every pair are present",
    file: SERVICE,
    suite: "chain-purge",
    from: `    if (leftoverRounds > 0 || leftoverChaff > 0 || unstamped > 0 || vanished > 0) {`,
    to: `    if (leftoverRounds > 0 || leftoverChaff > 0 || unstamped > 0) {`,
    expect: "8: 🔴 …and it FAILS the job",
  },
  {
    name: "the-completion-row-counts-rounds-as-markets",
    why: "The append-only compliance row asserts the ROUND count as the number of markets redacted. The two are equal only if every round names a distinct market that still exists — exactly what the verification had no way to establish before this fix. It is the mildest of the three and the hardest to ever disprove afterwards: the number is plausible, permanent, and nothing else records what it should have been",
    file: SERVICE,
    suite: "chain-purge",
    from: `        marketsRedacted,`,
    to: `        marketsRedacted: job.total,`,
    expect: "8: ⛔ the completion audit row does NOT report the round count as the market count",
  },
];
