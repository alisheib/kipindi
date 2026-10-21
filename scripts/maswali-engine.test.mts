/**
 * test:maswali-engine — MASWALI-BUILD S2, ON BOTH STORES: a Millionea week from draft through open, close, fifteen seals,
 * the gate, the objection window, the whole-week void and the carry (`docs/MASWALI-PLAN.md` §7b S2).
 *
 *   npm run test:maswali-engine     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-engine-child.mts`, each store in its own child). The Postgres half
 * proves what memory can only imitate: the conditional claims (`stampOpen`, `stampClose`, `moveClose`, `claimCarry`) as
 * real `UPDATE … WHERE`, the one-open-week partial unique index, and the freeze's allowlists against the real columns.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store: the ticket-holder case (6.4) runs in the memory child only. Measured from the first printed
 * run; it only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-engine",
  casesFile: "scripts/lib/maswali-engine-child.mts",
  minPass: { memory: 202, postgres: 210 }, // S5-FIX-SRV 1-6, A3-A9, 2b, 2d: printed by the green run at dd0627d5f
  dbPrefix: "mlw_engine",
});
