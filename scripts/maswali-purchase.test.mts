/**
 * test:maswali-purchase — MASWALI-BUILD S3, ON BOTH STORES: buying N tickets through the one bet path, the replay, the cap
 * under concurrency, real balance only and the responsible-gambling gates, the sales pause, the free cancel and the week
 * void (`docs/MASWALI-PLAN.md` §7b S3 items 1–3).
 *
 *   npm run test:maswali-purchase     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-purchase-child.mts`). The Postgres half proves what memory can only
 * imitate: the cap counted under a real advisory lock while 20 and 50 purchases race, the conditional ticket writes, and
 * the POOL ledger account. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store (7.6 reads the voided pool on Postgres only). It only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-purchase",
  casesFile: "scripts/lib/maswali-purchase-child.mts",
  minPass: { memory: 68, postgres: 69 },
  dbPrefix: "mlw_purchase",
});
