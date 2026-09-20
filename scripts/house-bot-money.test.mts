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

/* ⭐ MEMORY RAISED 115 → 124 at §12 (the holder's own RG loss limit, and settlement into a CLOSED wallet), to what
 * `npx tsx scripts/lib/house-bot-money-cases.mts` PRINTED on the memory child of that run. ⚠️ POSTGRES LEFT AT 133
 * AND SAID SO: the shared scratch cluster on 5433 was serving another lane while this landed, so §12's nine on the
 * Postgres child are NOT MEASURED — and this suite's own header is the reason not to guess, since raising a floor to
 * an arithmetic sum nobody printed is the rot ruling 515 was filed about. The next run that has the cluster to
 * itself should print it and raise this half to 142. */
await runTwoStores({ suite: "test:house-bot-money", casesFile: "scripts/lib/house-bot-money-cases.mts", minPass: { memory: 124, postgres: 133 }, dbPrefix: "hb_money" });
