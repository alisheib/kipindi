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
 * The floor is per store and the same on both: every case runs on both. It only ever rises. 175 → 177 (S7-F, 2026-10-18):
 * a closed week is no longer made final (13.5a), so the Owner's stop takes effect from the next week, G, and the week it
 * refused settles under its own rules (14.0). → 182 (S7-F3): the final week's slip form, refused when it did not state the
 * final week and sold when it did (14.0c, 14.0d).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-player",
  casesFile: "scripts/lib/maswali-player-child.mts",
  // S5-FIX-PLAYER (2026-10-21): 186 printed on each store — seven new cases (P5 7.10, P7 7.11, P6 8.0, P9 12.0 and 12.9,
  // P8 12b.4a, P10 13.3a; 4.3 and 8.21 re-pinned in the open).
  // S5 integration (2026-10-21, int1): 187 printed on each store — S5-FIX-PLATFORM D7's 11.2e beside the seven above.
  // S7 × S5 merge (claude/maswali-s7-s5): both sides' cases run — 194 printed on each store at dfb438dd2 (2026-10-22).
  minPass: { memory: 194, postgres: 194 },
  dbPrefix: "mlw_player",
});
