/**
 * test:maswali-fence — MASWALI-BUILD S0.5, ON BOTH STORES: no generic door or read treats a Maswali Millionea week as a
 * Yes/No poll. `docs/MASWALI-PLAN.md` §7b "S0.5" and its corrections of 2026-10-17.
 *
 *   npm run test:maswali-fence     (boots the on-box Postgres through db-scratch)
 *   npm run red:maswali-fence      (plants the fence's defects into the real source, memory child; commit first)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-fence-cases.mts`, each store in its own child). The Postgres half is
 * the point: before S0.5 `toStoredMarket` read every non-UPDOWN line as MARKET on Postgres only, so a memory-only proof
 * of the fence would have passed while production still saw a poll.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store: the census (§5, seven assertions) runs in the memory child only. Measured from the first
 * printed run; it only ever rises. +3 on both with 2.4b–2.4d (S7-F9, the automatic resolver against two-admin
 * authorization): 32 printed on Postgres, 38 on memory — printed while the census's 5.1 is red for another lane's file
 * (`src/app/results/millionea-results-view.tsx`, no census entry), so a green memory run prints 39. S7-MERGE 2 brought
 * DOORS' census entry for that file (5056da01a): memory prints 39, all green — the floor rises to it.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-fence",
  casesFile: "scripts/lib/maswali-fence-child.mts",
  minPass: { memory: 39, postgres: 32 },
  dbPrefix: "mlw_fence",
});
