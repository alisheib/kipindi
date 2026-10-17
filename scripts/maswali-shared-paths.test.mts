/**
 * test:maswali-shared-paths — MASWALI-BUILD S3/S4, ON BOTH STORES: the code Millionea's build touched that every product
 * runs (a poll's bet and free exit, the loss limit's net, the house book, the nightly invariants, the console reads),
 * driven for a player who has never seen Millionea (`scripts/lib/maswali-shared-paths-child.mts`).
 *
 *   npm run test:maswali-shared-paths     (boots the on-box Postgres through db-scratch)
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3): the loss-limit exclusion is raw SQL, and only Postgres can run it.
 * The floor is per store (3.1 reads the house ledger on Postgres only). It only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-shared-paths",
  casesFile: "scripts/lib/maswali-shared-paths-child.mts",
  minPass: { memory: 15, postgres: 16 },
  dbPrefix: "mlw_shared",
});
