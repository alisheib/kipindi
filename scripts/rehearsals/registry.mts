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
  /** Nothing drives it anywhere. `why` says what it is waiting on. This is the only status that owes work. */
  | "not-built";

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
    status: "not-built",
    needs: "postgres",
    why:
      "Its two instruments are not on this branch. `ops:house-bots-status --drift` and `ops:house-bots-remark` were " +
      "built on `ops-lane` and reach `rel-lane` only at REL-M; the drill also needs the PRE-MERGE SHA booted against " +
      "the same database, which is a second worktree, not a script. What CAN be driven without them — that the " +
      "immutability pin refuses a `houseBotId` UPDATE while the remark path stays open — is a `not-built` row until " +
      "it is written, and this register will not call it anything else. See the procedure in §S3 of 04-amendments.",
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

/** The rows that still owe work. `run.mts --all` can never exit 0 while this is non-empty. */
export const owed = (): Rehearsal[] => REHEARSALS.filter((r) => r.status === "not-built");
