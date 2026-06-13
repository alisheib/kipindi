-- Extra documents an officer can request during KYC review (each with a
-- written description), stored as a JSON array on the submission.
ALTER TABLE "KycSubmission" ADD COLUMN "extraRequests" JSONB;

-- Index NIDA number so the one-NIDA-per-account uniqueness lookup is cheap.
-- (Not a UNIQUE constraint: a single person may legitimately have a prior
--  REJECTED submission re-using their own NIDA; uniqueness across *different*
--  users is enforced in application code, which can scope to active states.)
CREATE INDEX "KycSubmission_nidaNumber_idx" ON "KycSubmission"("nidaNumber");
