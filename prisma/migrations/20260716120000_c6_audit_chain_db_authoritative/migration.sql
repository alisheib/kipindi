-- C6 — make the append-only audit chain DB-AUTHORITATIVE and FORK-PROOF across
-- Railway instances. Before this, each instance chained off its own in-memory
-- ring, so two instances could stamp against the same head and fork the chain.
--
-- Every statement is idempotent and DEFENSIVE: this migration runs automatically
-- on every prod deploy (`prisma migrate deploy`), and it must NEVER fail the
-- deploy on pre-C6 data (a failed migration = prod down). See the DO block.

-- (1) Monotonic insertion counter for an O(log n) chain-tail lookup. BIGSERIAL
--     backfills existing rows in heap order; that order is NOT trusted for chain
--     position — selectHead() confirms the greatest-seq row is a true tail and
--     falls back to an anti-join otherwise, self-healing on the first new append.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "seq" BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_seq_key" ON "AuditLog"("seq");

-- (2) Fork-proofing. No two entries may share a prevHash, so the hash chain is
--     physically forced to stay linear even if a write ever skipped the advisory
--     lock. Created DEFENSIVELY: if the pre-C6 table already holds a fork
--     (duplicate prevHash from old multi-instance fire-and-forget writes), we do
--     NOT fail the deploy — we warn and create a plain index instead, and the
--     advisory lock alone then prevents NEW forks. 'GENESIS' may legitimately
--     appear once; more than once is a legacy fork.
DO $$
DECLARE dups int;
BEGIN
  SELECT COUNT(*) INTO dups FROM (
    SELECT "prevHash" FROM "AuditLog" GROUP BY "prevHash" HAVING COUNT(*) > 1
  ) d;
  IF dups = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_prevHash_key" ON "AuditLog"("prevHash");
  ELSE
    RAISE WARNING '[C6] AuditLog has % duplicate prevHash value(s) (pre-C6 legacy forks); creating a NON-unique index and relying on the advisory lock to prevent new forks.', dups;
    CREATE INDEX IF NOT EXISTS "AuditLog_prevHash_idx" ON "AuditLog"("prevHash");
  END IF;
END $$;
