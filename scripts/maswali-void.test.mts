/**
 * test:maswali-void — MASWALI-BUILD R1 + R10d, ON BOTH STORES: the week void completes exactly once, at any size, and is
 * retried until it does (`docs/MASWALI-PLAN.md` MR-18, §5b "Week void").
 *
 *   npm run test:maswali-void     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-void-child.mts`). The Postgres half refunds 2,000 tickets across 300
 * players in one transaction and prints its time, books the refunds in one ledger group, drives the heal through its own
 * CLI, and proves that a refund failing at its last statement rolls back whole. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP
 * (exit 3, NOT MEASURED).
 *
 * The floor is per store (five cases read Postgres alone: the time, the ledger group twice, the rollback and its retry).
 * It only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-void",
  casesFile: "scripts/lib/maswali-void-child.mts",
  minPass: { memory: 52, postgres: 57 },
  dbPrefix: "mlw_void",
  timeoutMs: 30 * 60_000,
});
