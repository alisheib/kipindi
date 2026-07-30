-- Up & Down · a round captures its source link at open (2026-07-30).
--
-- WHY THIS IS SAFE ON THE LIVE DATABASE. Two nullable ADD COLUMNs with no default —
-- catalogue-only on PostgreSQL 11+, no table rewrite, no lock beyond a brief ACCESS
-- EXCLUSIVE on the catalogue. `IF NOT EXISTS` makes the whole file re-runnable. Railway
-- runs `prisma migrate deploy` BEFORE `next start` (package.json "start"), so the columns
-- exist before any code reads them.
--
-- WHAT IT FIXES. `UpDownAsset.priceSourceUrl` was documented as the link "a round records
-- at generation and resolves against", and three other surfaces repeated that claim —
-- including the PLAYER-FACING resolution criterion frozen onto every round. None of it was
-- implemented: `UpDownRound` had no source column, and resolution read the asset row LIVE
-- at each boundary. Editing an asset's link therefore re-pointed rounds that already held
-- player money, and the criterion the player agreed to silently became untrue.
--
-- WHY THERE IS A BACKFILL, unlike 20260728150000_updown_margin. There, NULL had a correct
-- meaning: "opened before the margin model — use the legacy rule". Here NULL has no
-- correct meaning for a round still in flight. Such a round already holds money against a
-- page, and the only surviving record of WHICH page is the asset row it opened from. Left
-- NULL, the new code must fall back to `UpDownAsset.priceSourceUrl` — which is precisely
-- the bug this migration closes, reintroduced for exactly the rounds that have money on
-- them. So we state the truth in the data at the one moment it is still recoverable. Same
-- reasoning, and the same `IS NULL` idempotency guard, as
-- 20260713160000_settlement_gate_and_objections.
--
-- SCOPE IS NARROW ON PURPOSE: only rounds that have NOT settled. A settled round's money
-- has moved and its proof panel already renders from its OBSERVATIONS, which carry their
-- own cited link — writing a value there would assert a page we did not witness. Those
-- stay NULL, and every read path treats NULL as "legacy, skip the check".
--
-- ⚠️ VERIFIED BEFORE MERGE, not assumed. `scripts/audit-updown-source-drift.mts` was run
-- read-only against production: 1,396 unsettled rounds, 3 assets, and ZERO confirmed
-- observations — so no round had ever been bounded by a reading that could contradict its
-- asset's current domain, and the backfill cannot pin a link a round did not use. Re-run
-- that audit before applying this to any other environment; a round it reports as DRIFTED
-- is an operator-void candidate, NOT a backfill candidate.

ALTER TABLE "UpDownRound" ADD COLUMN IF NOT EXISTS "capturedSourceUrl"    TEXT;
ALTER TABLE "UpDownRound" ADD COLUMN IF NOT EXISTS "capturedSourceDomain" TEXT;

UPDATE "UpDownRound" r
   SET "capturedSourceUrl"    = a."priceSourceUrl",
       "capturedSourceDomain" = a."sourceDomain"
  FROM "UpDownChain" c
  JOIN "UpDownAsset" a ON a."id" = c."assetId"
 WHERE r."chainId" = c."id"
   AND r."settledAt" IS NULL
   AND r."capturedSourceUrl" IS NULL;
