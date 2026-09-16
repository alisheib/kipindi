/**
 * HOUSE-BOT COMMS — who is told what, on which channel, and how often (PLAN §7, 04 C13, F6, N1 §7, N2 §7).
 *
 *   npm run test:house-bot-comms
 *
 * ⛔ WHAT THIS GUARDS. The engine's decisions are proven elsewhere; this is about the sentence a human reads. An
 * alert that reaches nobody, reaches the wrong person, says a figure it cannot back, repeats itself past the
 * dedupe, quotes an officer's reason, or links somewhere that stops resolving in 60 days is a defect even though
 * every stake was correct. It runs on a real Postgres AND on the in-memory store, because the caps and the
 * duplicate window are store behaviour.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-comms", casesFile: "scripts/lib/house-bot-comms-cases.mts", minPass: 30, dbPrefix: "hb_comms" });
