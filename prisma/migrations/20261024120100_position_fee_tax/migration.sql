-- FEE-TAX-2026-10 · RELEASE R2 (lane b) — step 2 of 2: A STAKE-SHARE POSITION'S OWN FEE AND ITS WITHHELD TAX.
--
-- HAND-WRITTEN AND EXPAND-ONLY. Two nullable INTEGER columns on "Position", no default, no backfill, no index, no CHECK:
--   * "feeTzs"         -- under `stake-share` only: this stake's own fee (its largest-remainder share of its side's fee),
--                         written by settleMarket on the position's WIN or LOSS write;
--   * "winningsTaxTzs" -- under `stake-share` only: the winnings tax withheld from this position's prize for TRA (0 on a
--                         loser), written on the same write.
-- Both stay NULL on every row of every other fee model, on every refund, and on every row settled before this file —
-- an older row is never rewritten (docs/FEE-TAX-PLAN.md §3; src/lib/server/market-service.ts → settleMarket). Nothing
-- writes either column until a stake-share market settles, and none can be created while src/lib/fee-law-gate.ts is shut.
--
-- The old container keeps serving during the deploy: it does not know the columns, so its writes neither set nor clear
-- them. A nullable, default-less ADD COLUMN is a catalogue-only change, but it still takes ACCESS EXCLUSIVE on the table
-- every bet writes, so each attempt's lock wait is capped at 3 s and the whole thing retries (the 20261013160000 shape):
-- a failed attempt rolls both additions back before it sleeps, and a deadlock is retried like a lock timeout. One table,
-- so there is no lock-order question. Never generated with `prisma migrate diff` (it would drop the raw-SQL indexes).
-- Recovery, if it ever gives up (20 attempts): its failed _prisma_migrations row blocks every later deploy until
--   npx prisma migrate resolve --rolled-back 20261024120100_position_fee_tax
-- is run against production; the file is re-runnable (IF NOT EXISTS), so the next deploy then applies it cleanly.
DO $$
DECLARE
  attempt integer := 0;
BEGIN
  PERFORM set_config('lock_timeout', '3s', true);
  LOOP
    BEGIN
      ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "feeTzs" INTEGER;
      ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "winningsTaxTzs" INTEGER;
      EXIT;
    EXCEPTION WHEN lock_not_available OR deadlock_detected THEN
      attempt := attempt + 1;
      IF attempt >= 20 THEN
        RAISE;
      END IF;
      PERFORM pg_sleep(1.5);
    END;
  END LOOP;
END
$$;
