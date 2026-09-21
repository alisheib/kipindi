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
/** 2026-09-20: the NEVER list stopped being a comment. Cases 11–22 are its controls. */
const GUARD = "src/lib/server/purge-protected.ts";
const SCHEMA = "prisma/schema.prisma";

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

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 2026-09-20 · THE NEVER LIST. Until this date it was a COMMENT: `chain-purge.ts` named
  // fourteen tables under NEVER and `grep -c "HouseBot"` on that file returned 1. The eight
  // house tables (04 A20) were enforced by nothing at all. Cases 11–22 are the controls for
  // what replaced it, and every one of them plants a shape this code could really take —
  // an exemption someone adds, a list someone tidies, a wrapper someone adds for logging,
  // a table someone forgets — never a straw man.
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "a-house-exemption-is-added-to-the-predicate",
    why: "⭐ THE SHAPE 'REMOVE A HOUSE TABLE FROM THE ENFORCEMENT' ACTUALLY TAKES. Nobody deletes eight names from three places; somebody adds ONE early return because a house write is 'needed' somewhere, and every HouseBot* table leaves the NEVER list in a single line. This is the original defect restored — the docblock still says fourteen, the guard now holds six — and the 2026-09-20 audit found exactly that state shipped inside a commit marked COMPLETE",
    file: GUARD,
    suite: "chain-purge",
    from: `export function isProtectedModel(name: string): boolean {`,
    to: `export function isProtectedModel(name: string): boolean {\n  if (name.toLowerCase().startsWith("housebot")) return false;`,
    expect: "9: 🔴 the purge CANNOT write houseBotIntent — every mutating method is refused",
  },
  {
    name: "a-ninth-house-table-is-added-and-forgotten",
    why: "⭐ THE FAILURE A HAND-WRITTEN LIST CANNOT SEE, and the whole reason the population is derived. A new house table is added to the schema, it does not happen to be called HouseBot-something, and nobody remembers `chain-purge.ts` exists. The runtime guard cannot see it either until `prisma generate` runs — which is exactly the window this case lives in, because the assertion it breaks reads `prisma/schema.prisma` itself rather than the generated client. ⚠️ The planted table hangs off the family by `houseBotId`, with no Prisma relation, because that is the idiom this schema really uses",
    file: SCHEMA,
    suite: "chain-purge",
    from: `model HouseBotPress {`,
    to: `model BotLiquidityLedger {\n  id         String @id\n  houseBotId String\n  amountTzs  BigInt\n}\n\nmodel HouseBotPress {`,
    expect: "10: 🔴 EVERY house table the SCHEMA declares is protected — a new one cannot escape",
  },
  {
    name: "a-house-table-is-renamed-out-of-the-family",
    why: "The other direction of the same hole: a house table is renamed and silently stops matching the rule, while the pinned floor goes on naming a model the schema no longer has. ⭐ It is the case that stops the FLOOR from becoming a stale answer standing in for a live one — a pin nobody checks is the `recorded_numbers_rot` shape, and this is what checks it",
    file: SCHEMA,
    suite: "chain-purge",
    from: `model HouseBotPress {`,
    to: `model PressLog {`,
    expect: "10: ⭐ …and the pinned FLOOR is a subset of what the schema derives, so it cannot go stale",
  },
  {
    name: "the-back-relation-sweep-returns",
    why: "🔴 THE REAL DEFECT OF 2026-09-20, RESTORED VERBATIM, and it was caught by a positive control rather than by any of the thirteen refusal assertions. The rule followed any field whose type was in the family; the DMMF adds the BACK-relation of every relation, so `User` carries `houseBots HouseBot[]`, joined the family, and dragged in every model with a `user` field — `Comment` among them. The guard then refused the purge's OWN `comment.deleteMany`: the feature was completely broken while every 'this table is refused' assertion passed HARDER than before",
    file: GUARD,
    suite: "chain-purge",
    from: `      if (m.fields.some((f) => f.ownsRelation === true && f.isList !== true && family.has(f.type))) {`,
    to: `      if (m.fields.some((f) => family.has(f.type))) {`,
    expect: "10: 🔴 CONTROL — a BACK-relation does not drag its owner into the family",
  },
  {
    name: "deleteMany-falls-out-of-the-mutating-list",
    why: "⭐ THE TIDY-UP. `delete` and `deleteMany` read as the same thing to someone shortening a list, and only one of them is how a purge destroys a table. Every protected model stays 'protected' — against eight verbs out of nine — and the one that matters is open. No source scan for 'does it call deleteMany' can see this, because the call site does not exist yet: the point of the guard is the call site somebody writes next year",
    file: GUARD,
    suite: "chain-purge",
    from: `  "upsert", "delete", "deleteMany",`,
    to: `  "upsert", "delete",`,
    expect: "9: 🔴 the purge CANNOT write auditLog — every mutating method is refused",
  },
  {
    name: "raw-sql-is-allowed-back-in",
    why: "⛔ THE ONLY BYPASS A PER-MODEL PROXY STRUCTURALLY CANNOT POLICE. `$queryRawUnsafe('DELETE FROM \"HouseBotIntent\"')` is an ordinary thing for a future edit to reach for — this repo's own house DAL is written almost entirely in raw SQL, so it is the idiom a reader would copy — and a proxy that intercepts model accessors never sees a table named inside a string",
    file: GUARD,
    suite: "chain-purge",
    from: `  "$executeRaw", "$executeRawUnsafe", "$queryRaw", "$queryRawUnsafe", "$runCommandRaw",`,
    to: `  "$executeRaw", "$executeRawUnsafe", "$queryRaw", "$runCommandRaw",`,
    expect: "9: ⛔ $queryRawUnsafe() is refused outright — a SQL string is invisible to a per-model guard",
  },
  {
    name: "the-interactive-transaction-hands-back-a-raw-client",
    why: "⭐ THE WRAPPER THAT LOOKS REDUNDANT. `$transaction(fn)` hands the callback a fresh client, and re-wrapping it reads like belt-and-braces until you notice that ONE refactor from the array form to `async (tx) => …` moves every write in this file onto an unguarded client. Nothing else in the suite could see it: the refusals are all asserted on the outer client, which stays guarded",
    file: GUARD,
    suite: "chain-purge",
    from: `            return (original as (...a: unknown[]) => unknown).call(obj, (tx: unknown) => fn(guardProtectedModels(tx)), ...rest);`,
    to: `            return (original as (...a: unknown[]) => unknown).call(obj, (tx: unknown) => fn(tx), ...rest);`,
    expect: "9: ⛔ the client handed to $transaction(fn) is guarded too",
  },
  {
    name: "the-delegate-result-is-wrapped",
    why: "🔴 THE MUTATION THAT BREAKS THE PRODUCT WHILE EVERY REFUSAL STILL PASSES. Wrapping a delegate method in an `async` shim is what anyone adds to log or time a call. But `$transaction([...])` INSPECTS the promises it is handed, and the purge's only write path is exactly that array — so the whole ceremony stops working, and the thirteen 'this table is refused' assertions are untouched because they never reach a transaction. The identity check is the only thing standing between this edit and a dead purge",
    file: GUARD,
    suite: "chain-purge",
    from: `          return typeof m === "function" ? (m as (...a: unknown[]) => unknown).bind(deleg) : m;`,
    to: `          return typeof m === "function" ? async (...a: unknown[]) => (m as (...a: unknown[]) => unknown).apply(deleg, a) : m;`,
    expect: "9: ⚠️ …and a delegate's own return value is NOT wrapped, so $transaction([…]) still works",
  },
  {
    name: "the-guard-refuses-reads-as-well",
    why: "⭐ THE OVER-BROAD GUARD, which is the failure mode a REFUSAL-ONLY suite is blind to. Drop the method filter and every protected model is sealed completely — the cost panel can no longer count positions or ledger rows, and the new live-intent precondition can no longer count intents, so the purge refuses every chain for the wrong reason. `red:chain-purge` already keeps `the-precondition-refuses-everything` for this shape one layer up; this is the same disease inside the guard",
    file: GUARD,
    suite: "chain-purge",
    from: `          if (typeof method === "string" && MUTATING_METHODS.includes(method)) {`,
    to: `          if (typeof method === "string") {`,
    expect: "9: ⭐ …but READS pass through untouched — the cost panel counts what it may not delete",
  },
  {
    name: "the-guard-is-never-called",
    why: "⛔ THE `guards-exist` DISEASE, one level down: the guard is written, reviewed, tested and NOT WIRED. `pc()` is the only way to obtain a client in this module, which is what makes wiring a single point — and a single point is a single line somebody can delete while every assertion about the guard's behaviour goes on passing, because they call the guard directly",
    file: SERVICE,
    suite: "chain-purge",
    from: `  return guardProtectedModels(c);`,
    to: `  return c;`,
    expect: "9: the guard is WIRED — pc() never hands out a raw client",
  },
  {
    name: "the-live-intent-check-reads-the-wrong-markets",
    why: "⭐ THE WRONG POPULATION, WHICH IS THIS FEATURE'S OWN RECURRING DEFECT. §8 of the suite exists because the verification asked the wrong set; this asks the live-intent count the wrong set. It is not a disabled check — it runs, it counts, it reports a number, and the number is about one market out of the chain's hundreds. ⚠️ The fixture seeds its intent on the SECOND market deliberately, so a check that only looks at the first reports a clean chain",
    file: SERVICE,
    suite: "chain-purge",
    from: `  const liveIntents = await countLiveHouseIntents(rounds.map((r) => r.marketId));`,
    to: `  const liveIntents = await countLiveHouseIntents(rounds.slice(0, 1).map((r) => r.marketId));`,
    expect: "11: 🔴 a chain with a PENDING house intent on one of its markets is REFUSED",
  },
  {
    name: "the-live-intent-precondition-refuses-every-chain",
    why: "⭐ POSITIVE CONTROL for the new refusal, the same shape `the-precondition-refuses-everything` keeps for the ARCHIVED arm. Both 'is it refused?' assertions pass HARDER, no chain is ever purged, and the compliance control Ali asked for simply does not work. CRA-15 names this case itself: 'after the intent expires the purge proceeds'",
    file: SERVICE,
    suite: "chain-purge",
    from: `  if (liveIntents > 0) {`,
    to: `  if (liveIntents >= 0) {`,
    expect: "11: ⭐ CONTROL — once the intent is terminal the SAME chain is allowed",
  },
  {
    name: "the-docblock-drifts-from-the-guard-again",
    why: "🔴 THE ORIGINAL DEFECT IN MINIATURE, and the reason the NEVER line is parsed rather than read. One name leaves the comment — a tidy-up, a merge, a reflow — and the file's most-read sentence quietly stops describing what the code holds. That is precisely how fourteen tables came to be documented and six enforced, for as long as the file existed",
    file: SERVICE,
    suite: "chain-purge",
    from: ` * NEVER    · AuditLog, HouseBot, HouseBotAlertOnce, HouseBotControl, HouseBotEvent, HouseBotIntent, HouseBotPress, HouseBotRuntime, HouseBotTarget, HousePoolLedger, LedgerEntry, Position, Transaction, UpDownObservation`,
    to: ` * NEVER    · AuditLog, HouseBot, HouseBotAlertOnce, HouseBotControl, HouseBotEvent, HouseBotIntent, HouseBotRuntime, HouseBotTarget, HousePoolLedger, LedgerEntry, Position, Transaction, UpDownObservation`,
    expect: "12: ⭐ …and every table the guard protects is named in the docblock",
  },
];
