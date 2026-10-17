/**
 * test:maswali-integrity — MASWALI-BUILD S4 part 3, ON BOTH STORES: compliance's cluster report at close and its pick-shift
 * alerts (`scripts/lib/maswali-integrity-child.mts`). The Postgres half runs the report's real aggregates.
 *
 *   npm run test:maswali-integrity     (boots the on-box Postgres through db-scratch; ⛔ no Postgres is a failure)
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-integrity",
  casesFile: "scripts/lib/maswali-integrity-child.mts",
  minPass: 8,
  dbPrefix: "mlw_integrity",
});
