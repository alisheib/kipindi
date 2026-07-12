-- Player 2FA (F2a): one-time recovery/backup codes.
--
-- Stored HMAC-hashed (never plaintext). A code is consumed exactly once (usedAt
-- stamped) when a player logs in without their authenticator device. Regenerated
-- as a set at enrollment / manual regenerate. Additive; no change to existing rows.
CREATE TABLE IF NOT EXISTS "TotpBackupCode" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "codeHash"  TEXT NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TotpBackupCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TotpBackupCode_userId_idx" ON "TotpBackupCode"("userId");
CREATE INDEX IF NOT EXISTS "TotpBackupCode_userId_codeHash_idx" ON "TotpBackupCode"("userId", "codeHash");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TotpBackupCode_userId_fkey'
  ) THEN
    ALTER TABLE "TotpBackupCode"
      ADD CONSTRAINT "TotpBackupCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
