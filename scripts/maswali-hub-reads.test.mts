/**
 * test:maswali-hub-reads — the Millionea hub's own reads on BOTH stores (MASWALI-BUILD S5-DESIGN-HUB): the moved close
 * (R1-hub M7, read from the audit entry `moveClose` writes), the final week announced ahead (L22, OD-03) and the hub week's
 * commitments (the lead's ruling on R1-register H2). The cases: `scripts/lib/maswali-hub-reads-child.mts`.
 *
 *   npm run test:maswali-hub-reads     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ The Postgres half is what proves the moved close is read back from the audit TABLE, as production reads it, and not
 * the memory ring. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED). The floor is per store; it only rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-hub-reads",
  casesFile: "scripts/lib/maswali-hub-reads-child.mts",
  minPass: { memory: 13, postgres: 13 },
  dbPrefix: "mlw_hubreads",
});
