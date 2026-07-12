# Status-Label Lexicon — drift inventory & migration plan (2026-07-12)

Source: full read-only scan (Track 2a). Dict locale blocks in `src/lib/i18n-dict.ts`:
**EN 15–1056 · SW 1057–2084 · ZH 2085–3112**. All existing status keys have full
3-locale parity (no en-only). Intra-locale dupes to collapse: `closesIn` (176 vs 510),
`waitingForResults` (445 vs 476 vs `waitingForResultsAside` 523), `recentlyResolved`
(266 vs 477).

Drift lives in ADMIN (near-zero dict usage). Player surface already reads the dict
(market-card, conviction-dial, sell-button, resolution-panel, proposals StatusBadge).

## Batch plan (one family per verified push)
- **2a·1 — Family 3: two-officer resolution ceremony** (the "22 variants"). ~38 hardcoded
  sites across ~12 admin files. Build canonical `status.*` ceremony keys (EN/SW/ZH), migrate.
- **2a·2 — Family 2: selection/betting-close** ("14 phrasings for one state").
- **2a·3 — Family 1: market-lifecycle enum chips** — build ONE shared admin `<StatusBadge>`
  replacing raw `<Chip>{status}</Chip>` + per-file STATUS_LABEL maps.
- **2a·4 — Family 4: KYC/withdrawal/proposal review states.**

## Family 3 hardcoded sites (migrate in 2a·1)
- app/admin/approvals/page.tsx:77 "Co-sign required"; :87 "Avg cosign time"; :133 "AML queue · awaiting first signature"; :174 "…pending review"; :98 body
- app/admin/aml/actions.ts:115 "Stage 1 recorded — second officer required to release."
- app/admin/aml/page.tsx:73 "Awaiting 2nd signature"; :112 "stage 1 by {id}"; :125 "No transactions awaiting review."; :138 body
- app/admin/aml/aml-actions-client.tsx:30 "…second officer is required."; :44 "Stage 1 recorded" / "Second officer required before funds release."
- app/admin/page.tsx:53 "AML pending" delta "needs review"
- app/admin/proposals/page.tsx:34 "Pending review" delta "awaiting review"
- app/admin/kyc/[id]/kyc-actions.ts:52,69,70 "second officer" wording
- app/admin/kyc/[id]/kyc-decision-rail.tsx:129 "Two-officer approval required"; :134; :153 "Approve (second officer)"
- app/admin/resolver-queue/resolve-controls.tsx:40,43,44,100 stage-1/second-officer
- app/admin/resolver-queue/page.tsx:90 "${n} pending"; :92 "${n} awaiting 2nd"; :232 "Two-officer rule"; :242 "Stage 1"; :256 "Stage 2"; :258
- app/admin/resolver/[id]/page.tsx:90 "AWAITING 2ND OFFICER"; :92 "AWAITING STAGE 1"; :176 "Two-officer attestation"; :179 "Officer A · Stage 1"; :186 "Officer B · Stage 2"; :218 "Sealed"/"Countersign & seal"/"Stage-1 attestation"; :299 "awaiting signature"
- app/admin/resolver/[id]/resolution-ceremony.tsx:71 "Stage 1 attested"/"Awaiting a second officer to seal."; :147; :178 "Second officer required · Afisa wa pili anahitajika"; :181-182; :190 "Countersign note · Optional"
- app/admin/reports/pack-actions.ts:82,97 "Second officer required"
- app/admin/reports/report-pack-controls.tsx:80 "Second officer required · Afisa wa pili" (NO "anahitajika" — differs from ceremony:178); :88 "Approve pack & countersign"
- app/admin/reports/report-pack-card.tsx:114 "…two-officer chain…"; :145 "awaiting signature"

Existing dict ceremony keys (reuse/extend): fairnessStage1/2(+Body) 260-263, home.twoOfficerResolution 441, market.resTwoOfficer 496.
