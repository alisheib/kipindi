/**
 * test:maswali-close-race — R2 of the adversarial review of S3 (2026-10-17), ON BOTH STORES: the close waits for a
 * purchase or a cancel in flight, so every ticket a closed week holds is in its count, its sales and its Merkle root
 * (`scripts/lib/maswali-close-race-child.mts`).
 *
 *   npm run test:maswali-close-race     (boots the on-box Postgres through db-scratch)
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3): the race is between two transactions, and only Postgres has them.
 * The floor only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-close-race",
  casesFile: "scripts/lib/maswali-close-race-child.mts",
  minPass: { memory: 13, postgres: 13 },
  dbPrefix: "mlw_closerace",
});
