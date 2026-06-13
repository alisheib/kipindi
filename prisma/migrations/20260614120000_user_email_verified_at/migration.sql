-- Email-address confirmation: track when a user proved ownership of their
-- email via a signed verification link. Null = email present but unconfirmed
-- (or no email on file). Set/changed by the shared setUserEmail() helper.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
