-- Audit M3: index LedgerEntry.userId for per-user ledger scans (the C3 wallet↔
-- ledger trial balance filters by player). CONCURRENTLY-safe on an empty table;
-- on a populated production table Postgres will briefly lock — acceptable for a
-- one-off index add during a deploy window.
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");
