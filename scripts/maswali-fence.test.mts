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
 * printed run; it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-fence",
  casesFile: "scripts/lib/maswali-fence-child.mts",
  minPass: { memory: 36, postgres: 29 },
  dbPrefix: "mlw_fence",
});
