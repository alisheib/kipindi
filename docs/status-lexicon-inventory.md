# Status-Label Lexicon — drift inventory & migration plan (2026-07-12)

Source: full read-only scan (Track 2a). Dict locale blocks in `src/lib/i18n-dict.ts`:
**EN 15–1056 · SW 1057–2084 · ZH 2085–3112**. All existing status keys have full
3-locale parity (no en-only). Intra-locale dupes to collapse: `closesIn` (176 vs 510),
`waitingForResults` (445 vs 476 vs `waitingForResultsAside` 523), `recentlyResolved`
(266 vs 477).

Drift lives in ADMIN (near-zero dict usage). Player surface already reads the dict
(market-card, conviction-dial, sell-button, resolution-panel, proposals StatusBadge).

## Batch plan (one family per verified push)
- **2a·1 — Family 3: two-officer resolution ceremony** ✅ **DONE 2026-07-12.** Built
  `src/lib/admin-status-lexicon.ts` (`CEREMONY` — 13 canonical `{en, sw?}` entries + `bi()`
  bilingual join). Migrated the recurring ceremony vocabulary across **9 files**:
  report-pack-controls, resolution-ceremony, resolver/[id]/page, resolver-queue/page,
  aml/page, report-pack-card, approvals/page, pack-actions, kyc-actions. **Fixed the
  `Afisa wa pili` → `Afisa wa pili anahitajika` drift** (report-pack-controls now matches
  the resolver ceremony). SW is lifted verbatim from shipped sources (admin surfaces +
  player dict `resTwoOfficer`/`step1`/`step2`) — never fabricated. **Left as-is** (unique
  contextual copy, not shared drifting labels): one-off toasts/subtitles
  (resolve-controls, resolution-ceremony toasts, aml-actions-client, aml/actions.ts:115
  mid-sentence), and the genuinely-distinct KYC heading "Two-officer approval required" /
  button "Approve (second officer)" (kyc-decision-rail) — folding those in would change
  wording, not fix drift. Verified: tsc · admin-grids-smoke 125/125 · fresh-server
  13/13 rendered-string assertions (incl. drift fix in situ) · test:all 45/45.
- **2a·2 — Family 2: selection/betting-close** ✅ **DONE 2026-07-12.** Added the
  `SELECTION` group to `admin-status-lexicon.ts` (selectionClose, selectionCloses,
  betsClose, betsClosed, selectionClosedWaiting) + migrated **7 files** (poll-actions,
  ai-polls/page, ai-polls/[id]/page, admin-proposals-client, resolver/[id]/page,
  resolver-queue/page, markets/page, markets/[id]/page). **Fixed:** the "Selection Close"
  vs "Selection close" case drift (same bilingual label, same file — poll-actions:322 vs
  :1350), and the config help text that quoted a title-cased "Selection Closed — Waiting
  for Results" no longer matching the sentence-cased string players actually see. Kept the
  intentional present/past tense split (betsClose = "when", betsClosed = "has"). SW from
  i18n-dict (selectionCloseDate / selectionClosedWaiting) — not fabricated. Verified:
  tsc · admin-grids-smoke 125/125 · fresh-server 9/9 assertions (drift fixes confirmed) ·
  test:all 45/45.
  - _Player-dict intra-locale dupes (closesIn 176/510, waitingForResults 445/476/523,
    recentlyResolved 266/477) remain a separate cleanup — they live in the trilingual
    dict (test:i18n path), not the admin lexicon._
- **2a·3 — Family 1: market-lifecycle enum chips** ✅ **DONE 2026-07-12.** Built
  `src/components/admin/status-badge.tsx` (`<MarketStatusBadge>`) — the ONE way to render a
  `MarketStatus` (DRAFT/LIVE/CLOSED/RESOLVED/VOIDED) chip; owns the enum→variant map
  (LIVE→success, RESOLVED→gold, CLOSED→warning, DRAFT/VOIDED→neutral) + the enum→label via
  a new `LIFECYCLE` lexicon group. Replaced the raw `<Chip>{m.status}</Chip>` + duplicated
  inline variant ternary (markets/page) and the local `STATUS_LABEL` map + ternary
  (markets/[id]). **Byte-identical rendered output** (the Chip atom upper-cases via CSS, so
  "LIVE" and "Live" already displayed the same — the fix removes the source drift + the
  duplicated logic, not pixels). Server-safe component (`import type MarketStatus`, no
  bundle bloat). Position-status chips (OPEN/WIN/LOSS/VOID/CASHED_OUT) + the resolver
  "SEALED · outcome" seal chip are a DIFFERENT enum — intentionally out of Family 1.
  Verified: tsc · admin-grids-smoke 125/125 · fresh-server 4/4 assertions (list + detail
  badges render, correct variants) + read screenshot · test:all 45/45.
- **2a·4 — Family 4: KYC/withdrawal/proposal review states** ✅ **DONE 2026-07-12 — closes Track 2a.**
  Added the `REVIEW` lexicon group (KYC: notStarted/inProgress/pendingReview/approved/rejected/
  additionalInfo; DSAR: pending/fulfilled/rejected) + `<KycStatusBadge>` / `<DsarStatusBadge>`
  (in status-badge.tsx) owning the enum→variant maps. Migrated the KYC chips (players/[id] header
  + KYC-tab Status item) and the DSAR chip (privacy). **Fixed:** officers no longer see the raw
  screaming enum ("PENDING_REVIEW", "ADDITIONAL_INFO_REQUIRED") — now "Pending review" /
  "More information needed" (the latter reuses dict `kycMoreInfo`). Proposal review states were
  ALREADY consolidated (dict-backed `<StatusBadge>`), so untouched. Withdrawal/AML txn states
  render no raw-enum chip in the admin UI today (no work needed). Audit-log payloads intentionally
  keep the raw enum (compliance precision). **Out of scope (different enum):** user account-status
  (ACTIVE/PENDING_KYC/SUSPENDED/…) still raw in a few spots — a future "account-status" cleanup,
  not a review state. Verified: tsc · admin-grids-smoke 125/125 · fresh-server 7/7 assertions
  (KYC PENDING_REVIEW + ADDITIONAL_INFO both render clean labels, no underscored enum in any status
  chip) + read screenshot · test:all 45/45.

> **Track 2a (admin status-lexicon) COMPLETE** — Families 1–4 all shipped. `admin-status-lexicon.ts`
> now holds CEREMONY + SELECTION + LIFECYCLE + REVIEW; badges live in `components/admin/status-badge.tsx`.

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
