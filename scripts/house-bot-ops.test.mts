/**
 * HOUSE-BOT OPS — the suite for Commit 7's four ops scripts and the DAL members they need.
 *
 *   npm run test:house-bot-ops
 *
 * ⛔ THE SUITE LANDS BEFORE THE SCRIPTS. Its §0 marker gate is armed while the correct answer is still
 * "exactly ONE file outside `src/` carries a `houseBotId` UPDATE, and it is a control that rolls back",
 * so the scripts that follow land INTO a gate rather than under one written to fit them. The four
 * scripts this lane owes — the direct-pg OFF (A9), the status reader and its drift legs (S3), the
 * NULL-filling remark (S3) and the sunset (F2) — are scheduled in PROGRESS.md and appear in C7-SPEC
 * zero times, which is how a builder closes Commit 7 without them while nothing turns red.
 *
 * ⛔ OWNER RULING D19 OUTRANKS EVERYTHING HERE, and D20 with it: an ops script prints to a TERMINAL and
 * may name the feature there; nothing it writes into a shared artefact may, and house bots are ordinary
 * players in every report.
 *
 * ⛔ THE MASTER SWITCH IS THE OWNER'S ALONE. No ops script may turn house bets ON. One may turn them
 * OFF — refusing to stop is never the safe default. `ops.pop.3` is that law made mechanical.
 *
 * Both children run the same case list: the memory store, then a fresh scratch Postgres database. No
 * Postgres is a FAILURE (exit 3, NOT MEASURED), never a skip. §0's source pins run in the memory child
 * only — a source file reads the same on both stores — which is why the floor is a PAIR and not a
 * number: a section that stops running fails the floor even while every case that ran passed.
 *
 * ⭐ THE FLOORS ARE MEASURED BY RUNNING IT, NEVER BY ARITHMETIC, and they may only rise.
 *   · memory 16, postgres 1 — this commit: §0's marker gate and master-switch law, plus the store case.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-ops", casesFile: "scripts/lib/house-bot-ops-cases.mts", minPass: { memory: 16, postgres: 1 }, dbPrefix: "hb_ops" });
