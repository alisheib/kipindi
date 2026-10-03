# DECISIONS — U29–U40 (S10, 2026-10-01, on Ali's standing delegation of technical calls)

Resolves the critic's X1–X29 and M1–M16 (`specs/CRITIC-U29-U40.md`). THIS FILE WINS over the specs. It builds
on `DECISIONS-U21-U28.md` (C1–C26), which still binds.

## Data and write paths
- **X1 · dal-parity numbers:** §21 U24 · §22 U22 · §23 U23 · **§24 U29** (ContactImport/Row; U31/U32/U33 members are
  sub-assertions) · **§25 the ONE bulk keyed-reads commit** · **§26 U35** (U36 and U40 extend §26).
- **X2 · ONE staging model** (U29 owns it): `ContactImport.status` ∈ {STAGING, STAGED, COMMITTING, PAUSED, DONE,
  CANCELLED}; cursors `stagedThrough` / `committedThrough` (the name `cursor` is banned); columns for `decision`,
  consent `basis`, `pausedAt`, `pausedBy`, `finishedAt`; `ContactImportRow` carries `line` (the file row, the
  name C15 uses), the drafted fields, `readError`, `outcome`, `outcomeReason`. The mapping stored is U28's
  `ColumnMapping` (X20).
- **X3 · ONE commit write path:** `commitBatch` (U32, in `src/lib/server/contacts/import-commit.ts`), ONE
  transaction: CAS on `committedThrough` → creates through the ONE create builder (skip duplicates) → updates
  guarded by `updatedAt` AND `sourceRef ≠ "erasure"` (null-safe) → re-decide ONCE on a refused write → outcomes
  → `mirrorContactCache` for every touched number → U33's consent write (idempotent).
- **X4 · ONE outcome union** in `import-decide.ts`: `ImportOutcome` = create | update | keep | fail;
  `ImportOutcomeReason` = chosen_keep | erased | suppressed | same_run | no_change | write_refused |
  changed_during_import | invalid. The row column, U32's sentences and U31's copy all read it.
- **X5 · Consent writable at import** only when the number has NO ledger row, is not suppressed and is not held by
  a player — computed INSIDE `decide()`. U32's "no consent rows" assertion is scoped to file columns and the
  third-party basis.
- **X6 · ONE create builder** `newContactRow` in `src/lib/server/contacts/contact-write.ts` (U22 creates it; U31,
  U32, U33 reuse it). An imported row's `sourceRef` = the import run id. Caches only via `mirrorContactCache`.
- **X10 · ONE bulk keyed-reads commit (§25)**, built by the first consumer (U30a): `marketingContact.msisdnsPresent`,
  `user.findByPhones` (avatar omitted), `suppression.findActiveAmong`, `messagingConsent.latestAmong`. U31, U32,
  U33 and U38 reuse them.
- **X18 · Run ownership:** a run belongs to its creator; an ADMIN may adopt (pause/resume) any run, and the screen
  says who started it.
- **X19 · Unreadable records:** `ParsedContactsFile` (C15) gains `unreadable: { line: number; reason: string }[]`
  (an amendment the lead lands on `parsed-file.ts`); U29 stages each as a row with `readError`; U30 counts and
  lists them. The row number is `line` everywhere.
- **X20 · Mapping and limits:** store U28's mapping; an over-limit or bad field is REPORTED by `draftContactRow`
  (never clipped) and lands in U30's `invalid` bucket with the field named (M3). One limits table (C12).
- **X21 · Tags:** `tagKey` / stored lowercase (C11). U31's owner decision 3 is moot.
- **X22 · Erased rows:** `msisdnsPresent` counts an erased row as present, so pre-flight says "already in the book"
  and `decide()` collapses it to KEEP (C3) — erasure is never disclosed.
- **X28 · One constant each:** `import-limits.ts` imports `NEXT_ACTION_BODY_LIMIT_BYTES` and the 200 000-row cap
  from `xlsx-limits.ts`.
- **X29 · The idle sweep** cancels only STAGING/STAGED runs idle 14 days, NEVER a PAUSED commit; the screen says so.

## Audience, campaign, confirm
- **X7 · ONE audience resolver:** U38 EXTENDS U24's `ContactAudienceFilter` with a `population` axis (book |
  players | both) and the player arm — the same parser (unknown values refuse, C2), key and `describeAudience`
  (string[]). No second filter type, parser, key or describer.
- **X8 · Walk order and cursor:** the book by `id`, players by user `id`; cursor `b:<id>` | `p:<userId>` | `done`,
  parsed in `audience.ts` only. No phone number ever forms a cursor.
- **X9 · The confirmed count is the campaign population** (book ∪ players) from U38's campaign-audience count; U40's
  fence and members key use that same count and walk.
- **X12 · SmsCampaign:** status ∈ {DRAFT, CONFIRMED, PREPARING, RUNNING, PAUSED, DONE, CANCELLED} (no approval
  status: OQ1 removed the gate); recipient status ∈ {PENDING, HELD, SENT, DELIVERED, FAILED, SKIPPED}; columns
  include `draftRevision`, `confirmTier`, per-variant `codingSw/segmentsSw/codingEn/segmentsEn` and
  `nameFallbackSw/En`, `sourcePhrase` (M5), `audienceFilter` (canonical key JSON), `audienceWatermark` (X13),
  `estimateSegments`/`estimateTzs` (frozen at confirm, X15), `enqueueCursor`, `enqueuedAt`. U36's counts read it.
- **X13 · Watermark:** `audienceFilter` = the canonical key JSON; `audienceWatermark` = U40's keyed members key
  (null on the typed tier); the client fence token is never stored.
- **X14 · ONE live-send switch:** SystemConfig `marketing.sms.live` = { enabledBy, enabledAt } — ABSENT means
  CLOSED. EVERY marketing-purpose send path checks it, the officer's own TEST send included (it costs money and is
  marketing-shaped). `MARKETING_WRITERS` lists `campaign-test-send.ts` from U37 on. Flipping it is owner gate G1.
- **X15 · ONE estimate at the confirmation:** computed on the server from the SAVED segment counts (U37's save) ×
  the campaign population (the spend ceiling, not the forecast), frozen into `estimateSegments`/`estimateTzs`.
- **X16 · No orphan actions:** every exported `*Action` ships in the SAME push as the UI that calls it.
- **X17 · The import dialog:** `src/app/admin/contacts/import/contacts-import-dialog.tsx`, owned by U30; ONE action
  file `src/app/admin/contacts/import/import-actions.ts` (U30 creates it with the entrance, staging, pre-flight,
  paste and XLSX actions; U32 adds the start/commit/pause actions to it).
- **X23 · Audit names:** one namespace `contacts.import.*` — `contacts.import.stage_refused` (staging) vs
  `contacts.import.commit_refused` (commit); the consent basis is `contacts.import.consent_basis`. U50 registers all.
- **X24 · consent.ts order:** U33a before U38a; the rg-doors anchor line stays byte-identical.
- **X25 · D19 in U38:** the sample shows no per-row player flag to a masked role; no number search runs against the
  player arm.
- **X26 · Suites:** `test:contacts-import` is the ONE runner (C21) with section modules `decide.mts`, `commit.mts`,
  `preflight.mts`; `test:read-tiers` joins predeploy once (at U30), measured green first.
- **X27 · Export:** filters only — no ticked-selection export (U23's bar has none; ids never travel in a URL).
- **X11 · CSV:** U34 writes through U28's `csv-write.ts` (C16); its columns derive from `CONTACT_FIELDS` plus
  export-only columns; the masked file masks phone AND email (C/M5 of the first tranche) and drops `source`.

## Gaps
- **M1/M4 · Ownership:** U30 owns the entrance, the staging actions, pre-flight, paste, XLSX and D18; U32 owns the ONE
  start action (freeze the decision, fix the basis, STAGED→COMMITTING) in `import-actions.ts`.
- **M2/M3 · U30's `invalid` bucket** includes sample-sheet numbers (with the sample-sheet sentence), Excel-shortened
  numbers (`excelShortenedSentence`) and any field problem with the field named.
- **M5 · Source phrase:** `SmsCampaign.sourcePhrase`; the renderer AND the worst-case counter include it for every
  non-account source until OQ3 is answered (priced in, never dropped).
- **M6 · §5.8 record:** `SmsCampaignRecipient.gateTrail` (JSON: every check and its verdict, the wording and source)
  written by U43 for EVERY recipient, sent or skipped.
- **M7 · Bulk "record consent"** arrives with U33b's basis picker (U23 omits it until then; said on the bar).
- **M8 · Cross-unit edits:** U37 flips `CAMPAIGN_SCREENS.compose` and the admin-nav REACHED_WITHOUT_NAV row; U38 adds
  `describeAudience` to U36's list rows.
- **M9 · Ordering gates:** U16 (erasure reach) covers SmsCampaign/SmsCampaignRecipient BEFORE U42 writes the first
  recipient; U15 (one send path) allowlists U37's test send and U39's dev seed route.
- **M10 · Predeploy:** `test:erasure`, `test:read-tiers`, `test:client-graph-safe` join predeploy at U29b, each
  measured green on clean main first.
- **M11 · U30's lists** page at 25 with the true totals.
- **M12 · The test send** obeys the send window once U13 exists; U14's frequency cap excludes `SmsCampaignTest`.
- **M13 · "Show this import's contacts"** (the `import` filter) is REQUIRED on U32's done state.
- **M14 · U50** registers every new audit action listed by the critic.
- **M16 · Estimates** at confirm come from server-stored segments (X15).

## Owner gates (Ali only — the build stops at each)
G1 the first OPEN of the live switch (recommended: Ali's own test to his own number) · G2 the first real campaign
start · G3 real spend beyond the ledger cap or a top-up · G4 U33's four consent-basis wordings and the 18+ sentence
(append-only evidence) · G5 OQ3 (the source phrase in the body) · G6 OQ11 · G7 a production QA GROWTH account
(TOTP-enrolled, never his login) for live checks and the ping measurement · G8 which real numbers a live import may
write · G9 setting SMS_PRICE_PER_SEGMENT_TZS · G10 public/DSAR text · G11 every 🔵 → ✅ that needs an admin session
· G12 officer "Suppress" permanence.
