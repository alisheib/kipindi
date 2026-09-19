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
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `90` while the run
 * prints memory 702 and Postgres 681 — it would not have noticed SIX HUNDRED cases vanishing in either child, which
 * is the widest gap of any house floor. Raised to the counts `npm run test:house-bot-engine` PRINTED at `d2f20795`,
 * never to an arithmetic guess, and a SCALAR becomes a PAIR because one number is bounded by the SMALLER child.
 * ⭐ RAISED AGAIN at C7 step 4b, with A24's poller-failure limb and X1's duty names in it — the ten cases behind
 * replan rulings 514 and 507, each seen RED on BOTH stores against the unfixed tree before the fix went in — to
 * what `npm run test:house-bot-engine` PRINTED on that run: **memory 715, Postgres 694**.
 * ⛔ A floor only ever rises, and only to a count a run printed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({ suite: "test:house-bot-engine", casesFile: "scripts/lib/house-bot-engine-cases.mts", minPass: { memory: 715, postgres: 694 }, dbPrefix: "hb_engine" });
