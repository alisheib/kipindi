/**
 * test:maswali-player — MASWALI-BUILD S5, ON BOTH STORES: what a player sees and what a player does — the gate, the hub's
 * week and headline, the slip, the acts (buy and the free cancel), the tickets, the live frame and its audience, the
 * settled, rolled and voided weeks (refunds pending, then landed), the held and forfeited shares, the register, the seen
 * state, the closure screen and the exclusions (`docs/MASWALI-PLAN.md` §7b S5 items 1, 2, 4–10; the S5 review's round 2),
 * and its re-review: weeks in calendar order, pages with a total, the final week, held and forfeited shares, the seen mark
 * and the cancel's session (RR1–RR8).
 *
 *   npm run test:maswali-player     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-player-child.mts`). The Postgres half is what proves the read models
 * read the LEDGER (the `POOL:` account, the jackpot, the guarantee) and the new seen-notice table, not the memory
 * mirror. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store and the same on both: every case runs on both. It only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-player",
  casesFile: "scripts/lib/maswali-player-child.mts",
  // S5-FIX-PLAYER (2026-10-21): 186 printed on each store — seven new cases (P5 7.10, P7 7.11, P6 8.0, P9 12.0 and 12.9,
  // P8 12b.4a, P10 13.3a; 4.3 and 8.21 re-pinned in the open).
  // S5 integration (2026-10-21, int1): 187 printed on each store — S5-FIX-PLATFORM D7's 11.2e beside the seven above.
  minPass: { memory: 187, postgres: 187 },
  dbPrefix: "mlw_player",
});
