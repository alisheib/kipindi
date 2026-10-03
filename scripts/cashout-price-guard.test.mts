/**
 * test:cashout-price-guard — Vodacom plan S6, A8c, ON BOTH STORES: a sale is paid exactly the figure the player confirmed,
 * or nothing happens and the player is told why. `docs/VODACOM-PLAN.md` §0i (A8c) and §0h points 38 to 44.
 *
 *   npm run test:cashout-price-guard     (boots the on-box Postgres 18.3 through db-scratch)
 *   npm run red:cashout-price-guard      (plants the guard's defects into the real service, memory child; commit first)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/cashout-price-guard-cases.mts` runs in two child processes through the runner
 * the house-bot money suites use: the memory store, then a fresh scratch database with every migration applied. A case
 * that passes in memory and fails on Postgres is a FAIL — the in-memory lock is one process's mutex and its store hands out
 * live objects, so only Postgres can show a refusal that writes on another connection, or a lock that does not hold.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED). The same cases run in memory inside `test:cashout`, which
 * is in predeploy and has no cluster.
 *
 * ⚠️ WHY A SUITE OF ITS OWN, NOT ROWS IN `test:house-bot-money`. That case list is the house seam's, with a floor measured
 * for it; a cash-out guard every player meets is not the house's, and folding it in would move another suite's floor.
 *
 * ⛔ THE FLOOR IS PER STORE: the assertions the case list makes by construction — 61 on every store (its loops run three
 * moved prices, four figures at a shut exit, four figures handed straight to the service and six broken figures), three
 * more on Postgres alone (the ledger line and the trial balance) — plus the child's store check. The first printed run
 * must equal it; if it does not, the floor is re-measured from that print, never guessed again, and it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:cashout-price-guard",
  casesFile: "scripts/lib/cashout-price-guard-child.mts",
  minPass: { memory: 62, postgres: 65 },
  dbPrefix: "co_price",
});
