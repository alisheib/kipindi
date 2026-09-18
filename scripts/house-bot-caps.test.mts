/**
 * HOUSE-BOT CAPS — every cap the seam enforces, inside the bet's own locks, on Postgres AND memory
 * (PLAN §12 I6, 04 A9, N1 §3, N2 §3).
 *
 *   npm run test:house-bot-caps
 *
 * ⛔ WHAT THIS GUARDS. A cap that the engine checks but the seam does not is a cap a race walks through.
 * This suite trips every per-bot cap code and every global one at its exact boundary, proves the declared
 * H2 order when two caps fail at once, fires concurrent bursts that must stop EXACTLY at a cap, and
 * proves the in-lock re-reads: `staleAt` on the database clock, the information blackout, counterparty
 * concentration and pro-rata attribution, the raw product line and the Up & Down round lock, and a
 * NO_FUNDS abort after `markPlaced`. On Postgres it also proves A9's lock timeouts: a house bet waits at
 * most 2 s on `house:control` or `market:<id>`, a player's bet on the same market is not held behind it,
 * and switching OFF never waits on the lock.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `50` — the value this
 * suite was born with — while a green run prints memory 82 and Postgres 91, so it would not have noticed 32 memory
 * cases and 41 Postgres cases vanishing. Raised to the counts `npm run test:house-bot-caps` PRINTED at `d2f20795`,
 * never to an arithmetic guess, and a SCALAR becomes a PAIR because one number is bounded by the SMALLER child.
 * ⚠️ MEASURED THREE TIMES, AND THE FLAKE IS PART OF THE RECORD. `8.2 · CONTROL · the race was live` failed on
 * Postgres in BOTH runs taken while other suites were running (`attempts: 1` for both racers, then `attempts: 0` for
 * the cash-out) and PASSED in the run taken on an idle machine. It is a load-sensitive concurrency control, not a
 * product defect and not caused by this floor: the same case failed before this floor existed. A failing run prints
 * 90 + 1 failed; the GREEN run prints 91, and 91 is therefore the floor. ⛔ This costs nothing in noise — `0.pg` is a
 * single assertion that already requires `fail === 0`, so a flaking 8.2 fails that line with or without the floor.
 * The flake itself is a finding for the next session, recorded here rather than left in a terminal.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-caps", casesFile: "scripts/lib/house-bot-caps-cases.mts", minPass: { memory: 82, postgres: 91 }, dbPrefix: "hb_caps" });
