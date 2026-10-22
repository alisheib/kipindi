/**
 * test:maswali-share-payout — OD-13, ON BOTH STORES: a share owed to a winner whose account cannot sign in, paid by a
 * Compliance officer to the registered number at the holder's request — the share to the shilling, the withdrawal rules
 * unchanged, through the self-exclusion's freeze and never around another hold, exactly once, in the platform's chain →
 * wallet order, recorded and read back (MASWALI-BUILD S6-MONEY; `src/lib/server/maswali-share-payout.ts`).
 *
 *   npm run test:maswali-share-payout     (boots the on-box Postgres through db-scratch)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/maswali-share-payout-child.mts`). The Postgres half proves what memory can only
 * imitate: two officers' payments ordered by real advisory locks, and the payment's ledger group balancing (A.10; the
 * memory store keeps no ledger, so its A.10m holds the payment's own arithmetic instead).
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 * Its plants are in `red:maswali-money-path` ((SM2)…(SM13), suite `sharepay`); the race across two processes is S16 §6c
 * (`load:maswali-cross-instance`: two officers on two instances pay one share once; a payment racing a hold). The floor is
 * what a green run printed and only ever rises.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:maswali-share-payout",
  casesFile: "scripts/lib/maswali-share-payout-child.mts",
  minPass: { memory: 29, postgres: 29 },
  dbPrefix: "mlw_sharepay",
  timeoutMs: 20 * 60_000,
});
