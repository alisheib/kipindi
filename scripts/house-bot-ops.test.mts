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
 *   · memory 16, postgres 1 — step 1: §0's marker gate and master-switch law, plus the store case.
 *   · memory 28, postgres 13 — step 2: §1's two DAL members, markSunset and openExposureByMarket, on
 *     BOTH twins. The gap between the two floors is §0 exactly: 15 source pins that run in the memory
 *     child only, which is why this floor is a PAIR — a section that stops running fails the floor even
 *     while every case that ran passed.
 *   · memory 35, postgres 26 — step 3: §2, `ops:house-bots-off` (A9). Seven SOURCE pins in the memory
 *     child (the owner's law, the imported copy, the by-host connection, the absent advisory lock, the
 *     absent audit write, and the positive control that the file really is INSIDE the derived ops
 *     population); thirteen in the Postgres child, which RUNS the script five times — dry, applied,
 *     applied again, with no DATABASE_URL, and against a closed port.
 *   · memory 41, postgres 40 — step 4: §3, `ops:house-bots-status` and its three drift legs. Six more
 *     in the memory child (four SOURCE pins, plus the file RUN with no database at all and its --drift
 *     REFUSED there rather than reported clean); fourteen more in the Postgres child, where the five
 *     release figures are compared against numbers the suite measured itself on a populated database —
 *     a reader printing 0 everywhere would satisfy a "clean world" assertion while counting nothing.
 *   · memory 48, postgres 52 — step 5: §4, `ops:house-bots-remark`, the ONLY ops script that writes to
 *     a money table. Seven more in the memory child (the ONE statement pinned byte-for-byte and the
 *     five shapes it must refuse, plus the gate now admitting exactly two files and naming both);
 *     twelve more in the Postgres child, which DRIVES it: dry, refused while the switch is ON, refused
 *     over its ceiling, applied, applied again, and then drift leg (a) re-read — with two marked
 *     positions held by DIFFERENT bots, so "it wrote a bot id" cannot pass for "it wrote the RIGHT one".
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-ops", casesFile: "scripts/lib/house-bot-ops-cases.mts", minPass: { memory: 48, postgres: 52 }, dbPrefix: "hb_ops" });
