/** One factual snapshot rule, driven through real services in memory and disposable PostgreSQL. */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:u43-snapshot-commit",
  casesFile: "scripts/lib/u43-snapshot-commit-cases.mts",
  minPass: 16,
  dbPrefix: "u43_snapshot_commit",
});
