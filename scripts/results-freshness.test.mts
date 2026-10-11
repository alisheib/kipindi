/**
 * test:results-freshness — R9-D (the Vodacom plan's S6 visual pass, round 9, 2026-10-11, tiles 168–170), ON BOTH STORES:
 * the settled archive behind /results and /fairness (`listTerminalMarkets`) is never behind a market write this process
 * has committed — tile 170 printed "0 imetatuliwa · TZS 0 imekamilika" and "Bado hakuna soko lililotatuliwa" beside a LIVE
 * strip naming a settlement, to a player whose tickets held six settled bets — and its siblings keep the same rule: the
 * strip's memo (`getPlatformStats`) and the sign-off rulings (`objectionRulings`). `src/lib/server/market-change-log.ts`
 * holds the rule; docs/RAILWAY-LIVE.md §13 records the process boundary.
 *
 *   npm run test:results-freshness     (boots the on-box Postgres through db-scratch — run it alone, in a lock turn)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/results-freshness-cases.mts` runs in two child processes through the runner the
 * two-store suites use: the memory store, then a fresh scratch database with every migration applied. ⛔ Only Postgres has
 * transactions, so the commit cases (F.7: noted when the lock's transaction COMMITS, never before, never on a rollback)
 * prove the deferral there; on memory the same lines state what memory does. A case that passes in memory and fails on
 * Postgres is a FAIL. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR IS THE CASE LIST, the same on both stores — every line runs on each, with its store's expectation:
 * §0 ×2 · F.4 ×4 · F.1 ×3 · F.2 ×4 · F.3 ×3 · F.5 ×4 (a b d e) · F.6 ×10 (sentinel, updown with F.5c and F.8b, objection
 * with F.8c, recategorise, shortTitles, demo, delete) · F.8d ×1 · F.7 ×3 · C ×24 (C.1 ×2 · C.2 ×2 · C.3 ×10 · C.4 · C.5 ×2 ·
 * C.6 ×3 · C.7 · C.8 ×2 · C.9) = 58. It only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:results-freshness",
  casesFile: "scripts/lib/results-freshness-cases.mts",
  minPass: 58,
  dbPrefix: "r9d_results_fresh",
});
