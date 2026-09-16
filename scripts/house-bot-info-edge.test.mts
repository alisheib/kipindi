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
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-info-edge", casesFile: "scripts/lib/house-bot-info-edge-cases.mts", minPass: 5, dbPrefix: "hb_info" });
