/**
 * HOUSE-BOT MONEY — the money seam on a real Postgres AND on the in-memory store (PLAN §12, N1 Tests).
 *
 *   npm run test:house-bot-money
 *
 * ⛔ WHAT THIS GUARDS. A house stake moves real money from a real account through the player's own bet
 * path. This suite drives `placeHouseBet` end to end on both stores and asserts the money facts: the
 * marker on the position and on every transaction of it, cash only, no wagering, no early exit, the
 * refusals that must leave money and intent untouched (a superseded intent rolls back, a stale one
 * never writes), settlement paying and refunding marked rows with the marker, and — on Postgres — the
 * books balancing afterwards and `lockedForHouse`'s SQL agreeing with the JS exit window on the A14 grid.
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/house-bot-money-cases.mts` runs in two child processes, and
 * every line it prints carries its store. A case that passes in memory and fails on Postgres is a FAIL.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS PER STORE AND MEASURED (replan ruling 515, 2026-09-18). It was the scalar `50` while the run
 * prints memory 115 and Postgres 133, so it would not have noticed 65 memory cases and 83 Postgres cases vanishing.
 * Raised to the counts `npm run test:house-bot-money` PRINTED at `d2f20795`, never to an arithmetic guess, and a SCALAR
 * becomes a PAIR because one number is bounded by the SMALLER child.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

/* ⭐ RAISED 115 → 124 / 133 → 142 at §12 (the holder's own RG loss limit, and settlement into a CLOSED wallet), to
 * what `npm run test:house-bot-money` PRINTED on this run — BOTH children measured, neither number an arithmetic
 * guess. The +9 in EACH child is the measurement: §12's nine assertions reaching both stores. A build where they
 * reached only the memory twin would have shown +9 and +0, which is the divergence the pair exists to catch. */
await runTwoStores({ suite: "test:house-bot-money", casesFile: "scripts/lib/house-bot-money-cases.mts", minPass: { memory: 131, postgres: 149 }, dbPrefix: "hb_money" });
