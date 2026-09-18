/**
 * HOUSE-BOT INFO EDGE — the engine never learns what a player cannot see (04 A13, N1 §4.1; C4 ruling 160).
 *
 *   npm run test:house-bot-info-edge
 *
 * ⛔ WHAT THIS GUARDS. A LIVE poll can carry an AI result check (Sentinel columns stamped by an early re-check) and a
 * CLOSED one a staged verdict (stage-1 of two-admin resolution). A house stake placed on the strength of either would be
 * placed with knowledge no player has. The engine therefore reads a market only through `PublicMarketView`, and the
 * one fact it may learn about a result check is `{blocked}` from `blackout.ts`.
 *
 * Static sections run in the memory child; the view-identity section runs on BOTH stores. No Postgres is a failure
 * (exit 3, NOT MEASURED), never a skip.
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `5` while the run prints
 * memory 20 and Postgres 5 — and THIS suite is why a scalar is wrong in principle, not only in degree: its static
 * sections run in the memory child only, so a single number can never be higher than the Postgres child's 5 and the
 * memory child could have lost fifteen cases with the suite still green. Raised to the counts
 * `npm run test:house-bot-info-edge` PRINTED at `d2f20795`, never to an arithmetic guess.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-info-edge", casesFile: "scripts/lib/house-bot-info-edge-cases.mts", minPass: { memory: 20, postgres: 5 }, dbPrefix: "hb_info" });
