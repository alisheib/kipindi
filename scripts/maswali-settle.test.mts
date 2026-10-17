/**
 * test:maswali-settle — MASWALI-BUILD S3, ON BOTH STORES: a week's settlement and everything around it — the S3 acceptance
 * (a)–(f) to the shilling, the preview and its digest, the chain, the drive's own jackpot, held shares and the forfeit,
 * the sunset, OD-17's loss limit and the nightly invariants (`docs/MASWALI-PLAN.md` §7b S3 items 4–9, §5b).
 *
 *   npm run test:maswali-settle     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-settle-child.mts`). The Postgres half books every group in the real
 * ledger inside one transaction per week, settles 1,500 tickets in bulk, and reads HOUSE:COMMISSION for the house result.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * The floor is per store (10.4 reads the commission account on Postgres only, and R3.6, R8.1 and R8.2 a rollback only
 * Postgres can make). It only ever rises: 62/63 → 85/89 with the review's R3, R4c, R6, R8 and R9 cases (2026-10-17).
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-settle",
  casesFile: "scripts/lib/maswali-settle-child.mts",
  minPass: { memory: 85, postgres: 89 },
  dbPrefix: "mlw_settle",
  timeoutMs: 30 * 60_000,
});
