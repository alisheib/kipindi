/**
 * e2e:maswali-money — the /millionea confirm action with real FormData, through
 * the same action core the Next server action calls. Both stores get the same
 * assertions on a disposable database; no production account or data is used.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "e2e:maswali-money",
  casesFile: "scripts/lib/maswali-money-action-child.mts",
  minPass: { memory: 38, postgres: 38 },
  dbPrefix: "mlw_action",
});
