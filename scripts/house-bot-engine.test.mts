/**
 * HOUSE-BOT ENGINE — the engine's decisions, timing, outcome table and platform hooks, on a real Postgres AND on
 * the in-memory store (PLAN §12, 04 A7–A24, N1 §4, N2 §4).
 *
 *   npm run test:house-bot-engine
 *
 * ⛔ WHAT THIS GUARDS. The engine decides when a house stake is placed, on which side and how much, and what every
 * refusal does to the intent. A decision that reads a result check, a hook that joins a committed transaction or
 * a planner lease that is never written are all invisible to a green unit suite on one store; this suite runs one
 * case list on both.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-engine", casesFile: "scripts/lib/house-bot-engine-cases.mts", minPass: 90, dbPrefix: "hb_engine" });
