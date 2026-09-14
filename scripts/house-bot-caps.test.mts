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
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-caps", casesFile: "scripts/lib/house-bot-caps-cases.mts", minPass: 50, dbPrefix: "hb_caps" });
