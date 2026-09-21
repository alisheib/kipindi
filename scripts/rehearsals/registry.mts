/**
 * THE S4 REHEARSAL REGISTER — the five drills `plans/house-bots/04-amendments.md` §S4 names, and where each one
 * actually lives.
 *
 * ⛔ WHY THIS FILE EXISTS. `04-amendments.md` §S4 lists five rehearsals and the REL-0 release gate required "the S4
 * rehearsals" to pass. Measured on 2026-09-21: the word "rehearsal" appeared in NO file under `scripts/` and in NO
 * `package.json` key. A checklist row naming a run that has no runnable home is not a gate — it is a row that
 * whoever reads the checklist has to decide about on the spot, and the honest decision ("it does not exist") is the
 * one nobody takes at T-1 day. `RELEASE-LADDER.md` §REL-0 struck the clause for exactly that reason.
 *
 * This register is the home. Every drill is a row with a STATUS that says what is true of it today, and a row can
 * only say `built` when it names a script that runs. The runner (`run.mts`) prints this table, runs the built rows,
 * and exits 3 (NOT MEASURED) — never 0 — while any drill is still owed.
 *
 * ⚠️ THIS FILE NAMES `CRA-28` AND `CRA-29`, AND THAT HAS A MEASURED SIDE EFFECT — recorded here so nobody has to
 * rediscover it. `house-bot-reports-cases.mts` §0.250 scans every file under `src/` and `scripts/` for the ids
 * ruling 250 names and treats a hit as "declared in the tree". Measured on 2026-09-21 by reproducing that exact
 * arithmetic with and without this folder: 2,261 → 2,266 files, ids found in the tree 7 → 8, and **`CRA-28` moves
 * from the "deferred by name" door to the "found in the tree" door.** The gate's verdict is UNCHANGED —
 * `undeclared` is empty either way, `deferredOnly` stays non-empty and its first element is still `HB-ACC-14`, so
 * control `0.250.c1` still has a real sample. ⛔ But a scanner finding `CRA-28` here does NOT mean CRA-28 is
 * covered: the row below says in as many words that nothing drives it. A string is not an assertion.
 *
 * ⛔ A STATUS IS A MEASUREMENT, NOT A HOPE. Each non-`built` row carries the evidence for its status, re-checked
 * when this file was written; `covered` rows name the file AND the assertion that covers them, so the claim can be
 * refuted by opening it. Two rows were downgraded when exactly that was done — see `two-admin-on`.
 */

export type RehearsalStatus =
  /** A script in this folder drives it. `script` is set and `run.mts --all` runs it. */
  | "built"
  /** Driven in full somewhere else that already runs. `where` names the file and the assertions. */
  | "covered"
  /** The condition it rehearsed no longer exists. `why` says what ended it. */
  | "moot"
  /** Nothing drives it anywhere. `why` says what it is waiting on. */
  | "not-built"
  /**
   * ⛔ PART of it is driven by a script in this folder and the REST CANNOT BE DRIVEN HERE AT ALL. `script` is set
   * and `run.mts --all` runs it; the script exits 3, never 0. `why` names the slices that ARE driven and the ones
   * that are not, and where the procedure for the remainder lives. **A `partial` row OWES WORK exactly like
   * `not-built`** — `owed()` counts it, so `--all` can never exit 0 while one exists. The status exists because
   * both honest alternatives were worse: `not-built` hides work that now runs every day, and `built` would let a
   * release row read "drill 2 passed" over a drill whose rollback was never performed.
   */
  | "partial";

export type Rehearsal = {
  /** The id the runner and any checklist row use. */
  id: string;
  /** Its number in `plans/house-bots/04-amendments.md` §S4 "Rehearsals". */
  drill: number;
  title: string;
  status: RehearsalStatus;
  /** What the drill has to have to run at all. */
  needs: "postgres" | "none";
  /** Set iff status is `built`: the script the runner spawns, repo-relative. */
  script?: string;
  /** Set iff status is `covered`: where it is driven, named precisely enough to be refuted. */
  where?: string;
  /** The evidence behind a `covered`, `moot` or `not-built` status. */
  why?: string;
  /** The scenario-register rows the drill discharges, for the coverage roll-call. */
  scenarios?: string[];
};

export const REHEARSALS: readonly Rehearsal[] = [
  {
    id: "migrations-under-load",
    drill: 1,
    title: "Migrations under load — 20 bets/s during the apply",
    status: "moot",
    needs: "postgres",
    why:
      "There is no house DDL left to apply. Both house migration folders are on `origin/main` and applied " +
      "(`RELEASE-LADDER.md` §REL-1 and §REL-2: the DDL went in through `start`'s own `prisma migrate deploy` on " +
      "2026-09-18). A drill that rehearses applying migrations that are already applied measures nothing. " +
      "⚠️ It becomes live again the day a NEW house migration is written — the procedure survives in §S3/§S4.",
  },
  {
    id: "rollback",
    drill: 2,
    title: "The rollback drill — pre-merge SHA, drift, remark, and the book against the ledger",
    status: "partial",
    needs: "postgres",
    script: "scripts/rehearsals/rollback.mts",
    why:
      "DRIVEN HERE, against a scratch Postgres the run creates and drops. (§1) The immutability pin, BEHAVIOURALLY: " +
      "`db.txn.update` cannot re-mark, un-mark or POSITION a ledger row, read back from the COLUMN and not from the " +
      "mapper, each refusal carrying the positive control §S3 step 4 actually asks for — the same update still WRITES " +
      "its other fields. `test:house-bot-reports` 0.232.4 pins the two store twins' SPELLING; nothing anywhere drove " +
      "the behaviour, and nothing held that positive control. (§2) The drift-free baseline: legs (a), (b) and (c) at 0 " +
      "over a database filled by real settlement, VOID, emergency void, a player cash-out and a real agent commission, " +
      "each leg printing its population and each carrying a planted control that writes the exact shape the pre-merge " +
      "SHA writes. (§3) Wagering, which no drift query can ever see. " +
      "🔴 IT MEASURED ONE THING NOBODY HAD: drift leg (c1) joins `Transaction.positionId`, and every AGENT_COMMISSION " +
      "row on this platform is written by `creditInternal` with `positionId: null` — so that leg cannot fire at all, " +
      "and its 0 is a 0 over an empty population. Leg (c2) is the only half of (c) that can find commission. " +
      "NOT MEASURED, for two structural reasons. (1) Step 2 is not a script: 'boot the pre-merge SHA' needs a second " +
      "worktree with its own node_modules and a Prisma client without `houseBotId`, and hand-writing the unmarked rows " +
      "instead would rehearse §2 again rather than a rollback. (2) Steps 4–7 need `ops:house-bots-status --drift` and " +
      "`ops:house-bots-remark`, keys on `origin/ops-lane` only — read read-only for the procedure, not merged, because " +
      "lane 2 is renumbering the register inside that branch. ⭐ The drill's §0 ARMS ITSELF: it holds the four drift " +
      "predicates as constants and compares them against `scripts/ops-house-bots-status.mts` the moment REL-M lands " +
      "that file, so the two copies of the query cannot drift apart in silence. " +
      "THE PROCEDURE for the remainder: `plans/house-bots/RELEASE-LADDER.md` §10, ten numbered steps.",
    scenarios: ["S3"],
  },
  {
    id: "two-processes",
    drill: 3,
    title: "Two OS processes — the lock margin and the claim hold across a real process boundary",
    status: "covered",
    needs: "postgres",
    where:
      "`scripts/lib/house-bot-caps-cases.mts` §8 (MON-06: two processes at −5 s / +5 s skew, spawning " +
      "`scripts/lib/house-bot-two-process-child.mts` through `clock-skew-preload.mjs`) and " +
      "`scripts/lib/house-bot-engine-cases.mts` (which spawns the same child). Run by `npm run test:house-bot-caps` " +
      "and `npm run test:house-bot-engine`.",
    why:
      "Verified by opening both files on 2026-09-21: each spawns `house-bot-two-process-child.mts` as a real OS " +
      "process, so the drill's own condition — two processes, not two promises — is driven where it is claimed.",
  },
  {
    id: "audit-burst",
    drill: 4,
    title: "The audit chain under a burst (CRA-29) — every decision recorded, the chain intact, the HMACs valid",
    status: "built",
    needs: "postgres",
    script: "scripts/rehearsals/audit-burst.mts",
    scenarios: ["CRA-29"],
  },
  {
    id: "two-admin-on",
    drill: 5,
    title: "Two-admin authorization switched ON (CRA-28) — a house-held market needs stage 2 by a different officer",
    status: "not-built",
    needs: "postgres",
    why:
      "⛔ DOWNGRADED FROM `covered` WHEN THE CLAIM WAS CHECKED (2026-09-21). The handover said this drill 'maps to " +
      "`house-bot-reports-cases.mts`'. Measured: `CRA-28` appears in that file exactly once, inside the ruling-250 " +
      "coverage ROLL-CALL list at §0 — a list of ids, not an assertion about two-officer resolution. And " +
      "`scripts/two-admin-policy.test.mts` (`npm run test:two-admin`) contains no `houseBot`, `house_bot` or " +
      "`houseBotId` at all, so it drives the policy over ordinary markets only. Nothing anywhere resolves a " +
      "HOUSE-HELD market with `requireTwoOfficer` true. The drill is owed.",
    scenarios: ["CRA-28"],
  },
] as const;

export const byId = (id: string): Rehearsal | undefined => REHEARSALS.find((r) => r.id === id);

/**
 * The rows that still owe work. `run.mts --all` can never exit 0 while this is non-empty.
 * ⛔ `partial` IS OWED. A drill that has a script running every day is still not a drill that was performed.
 */
export const owed = (): Rehearsal[] => REHEARSALS.filter((r) => r.status === "not-built" || r.status === "partial");
