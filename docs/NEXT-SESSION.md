# 50pick — next-session brief

Read the two always-on skills first (`.claude/skills/50pick-standards` +
`.claude/skills/50pick-audit`), then this. **Current-state only** — old per-session logs were
consolidated 2026-07-21; the detail lives in git history + the authoritative docs listed at the
bottom. Last updated 2026-07-21.

## Current state (LIVE, healthy)
- **Final Audit COMPLETE** — all 11 Criticals + all Highs + all Mediums closed
  (`docs/FINAL-AUDIT-REMEDIATION.md`). Money is provable: double-entry ledger + nightly
  wallet↔ledger trial balance, atomic money writes (`withMoneyTx`), fork-proof audit chain.
- **Prod is live + healthy at `https://50pick.tz`** (= `www` = `kipindi-production.up.railway.app`,
  same Railway instance). Every push to `main` auto-deploys `prisma migrate deploy && … && next
  start`. Railway CLI = `alisheib07` (`railway logs -s 50pick`).
- **Reporting subsystem finalized** (8 catalogue reports → PDF/XLSX, regulator-grade; landscape
  wide appendices; one `summarise()`/`moneyForWindow()` money source). Verified by rasterizing
  real PDFs, not just a green suite.
- **Platform-wide design pass done** — most of the design-master-brief §5–§7 backlog was ALREADY
  shipped (see "do not re-chase").
- **Admin console finalized (2026-07-21e)** — 41 routes audited; the substantive fixes below are
  live. **Rates & fees verified end-to-end: what an officer SETS is what the engine APPLIES**
  (form → persist → read-back → audit → immutable `feeSnapshot` on each new poll → payout reads
  only the snapshot). Fee simulator runs the real payout fn on the saved config. Added a
  non-blocking warning when the fee ceiling is 0% (silently zeroes all commission).
- **Proposals feature-state finalized (2026-07-21) — 4-state, admin-controlled switch.** The old
  boolean `enabled` on `src/lib/server/proposals-config.ts` is now a `state` machine —
  **ACTIVE · COMING_SOON · MAINTENANCE · DISABLED** — driven entirely from `/admin/proposals`
  (segmented selector, takes effect immediately with no redeploy, audited `proposals.config.updated`).
  Old snapshots migrate via a new `defineConfig` `migrate` hook (`enabled:true→ACTIVE`,
  `false→DISABLED`) so hydration never breaks. **Server-enforced** (the reward is a regulated
  inducement): `createProposal` / `castVote` / the `createProposalAction` server action refuse in
  every non-ACTIVE state (`isProposalsActive`) — never trust the client. Reflected on **every**
  entry point (top-app-bar, nav-more, avatar-menu, public-footer, `/proposals` board + `[id]` +
  `/proposals/new` composer, `propose-promo`, markets promo): COMING_SOON = gilt "coming soon"
  badge + banner (aspirational); MAINTENANCE = amber `--warning` badge + banner (pause glyph,
  visibly distinct from the gilt, never NO-rose); DISABLED = every entry point hidden +
  `/proposals*` redirected to an honest muted "not available" board. New primitives:
  `components/ui/maintenance-badge.tsx`, `components/ui/proposals-state-badge.tsx`,
  `components/proposals/proposals-state-views.tsx`. Trilingual (EN/SW/ZH) guidance added; a short
  `proposals.comingSoonTag`/`maintenanceTag` keeps badges from truncating in SW; the EN-title
  composer placeholder was fixed to always be English. Proof: `npm run test:proposals-state`
  (28 assertions — gate per state + migration + audit). **Verified live** across all 4 states ×
  360/768/1280/1920 × EN/SW/ZH (128 screenshots, human-read via a 19-agent adversarial visual
  audit) + a live server-refusal probe. ⚠️ **Deploy behaviour (owner decision):** default state is
  **COMING_SOON**. On this deploy, prod lands in COMING_SOON if it has no persisted
  `proposals.config` row (propose blocked, gilt "coming soon" preserved). If a row with
  `enabled:true` exists it migrates to **ACTIVE** (feature fully open, no badge). Today prod shows
  proposals *open but labelled "coming soon"* — so **after deploy, confirm the state at
  `/admin/proposals` and set the one you want** (it applies instantly). To launch: pick **Active**.
- Gate discipline held on every push: `tsc` + `next build` clean · `test:all` green on a fresh
  store (only `test:responsive` fails locally — it needs a live `:3000`, documented exception).

### Admin-finalize fixes now live (2026-07-21e)
- **KYC maker-checker parity** — the player-page one-click Approve now blocks HIGH-RISK
  (`kycRiskScore ≥ KYC_MAKER_CHECKER_THRESHOLD`) → routes to the workstation's two-officer flow
  (was a single-officer bypass of a money-out gate). Audited.
- **RG-safe suspend** — suspend only accepts an ACTIVE account, so restore→ACTIVE can no longer
  lift a SELF_EXCLUDED / COOLED_OFF / PENDING_KYC state.
- **A-5 no-fabrication** closed on aml/compliance/candidates/moderation/insights/privacy (failed
  read → `unavailable`/`AdminLoadError`, never a false "queue clear"). Fixed a literal `·`
  rendering as garbage text on candidates + ai-polls.
- **Money-surface honesty** (no payout/ledger arithmetic touched) — confirms on bonus grant/cancel,
  withdrawal retry, proposal publish; AML Approve honestly disabled (server refuses it by design);
  officer-attributed bonus-grant audit; finance "Operator margin" reconciled to canonical GGR
  `holdPct` (was omitting refunds); honest `formatTzs` labels.
- **Governance + a11y** — support-contact config persists + audits + hydrates on boot (was
  reverting on every deploy); AI-budget controls audit; ≥40px tap targets; gold discipline
  (2nd chart series `--gold`→`--royal-300`); mobile-nav Esc + focus; objections hides
  compliance-only controls from MODERATORs; emergency-void strip gold→brand.

## Do NOT re-chase (already done / intentional — "fixing" a correct one is itself a bug)
- **Player-app art layer is shipped**: category-art (topic-chip glyphs, market watermark, home
  category row), PageHero (proposals/fairness), leaderboard top-3 gilt podium, invite share-card +
  QR + `navigator.share` + EarningsRing, wallet 30-day sparkline + MNO logos, `RewardBurst` on
  proposal/KYC approve, KYC progress rail, source-of-funds glyphs, fairness diagram, RG self-care
  art, legal per-doc icons. Branded OG for `?ref=` invite links.
- **A-5 already done** on finance / players[id] / cohorts / self-exclusions / approvals / overview /
  resolver-queue. **B6** (a settled outcome is READ, never inferred) holds everywhere. **All 41
  admin `loading.tsx` are real layout-matched skeletons.** Money always via `formatTzs`.
- **PII**: self-exclusion roster + privacy on-behalf list mask via `maskName()`. The admin players
  LIST shows a verified legal name to a COMPLIANCE officer BY DESIGN (gated surface, officer needs
  identity) — NOT masked; `display-label` doc corrected to match.
- **AML Approve is deliberately disabled** server-side (releasing without a gateway dispatch would
  destroy money) — do not "re-enable" without the real dispatch + settle path.
- **Solo-resolution** is real-money-state locked (POCA §16); **testing overrides default OFF in
  prod**. `TEST_FUNDING=true` pre-launch lets testers solo-resolve; it hard-locks at go-live.
- **bet-stake single-`$transaction`** merged; **M2** largest-remainder payout done; **C3/C6** ledger
  + audit-chain done. See `docs/COMPLIANCE-DECISIONS.md`.

## Remaining before real money
**Code (LOW polish, non-blocking):** resolver-queue stage-1 one-click closes a LIVE market with no
confirm (defensible — no money moves, two-officer downstream); a few payments tiles + the AML note
lack SW subtitles; DSAR "Mark fulfilled" shown on ERASURE rows (always refused); duplicated
ClientPager/SortBtn in moderation + proposals clients; `publishCandidateAction` lacks the
future-date guard `createMarketAction` has. **Two-officer for LARGE balance adjustments** deferred
BY DESIGN (single-officer + 50M cap + atomic + audited; a prepare→approve flow is its own tested,
money-adjacent change).

**⚠️ ONE OWNER RULING (🛑 STOP-flagged — relabelled, sum NOT changed):** the /admin/transactions
"Fees" tile sums cashout COMMISSION (gaming revenue, already in GGR) alongside gateway fees, so it
can't reconcile to the canonical NGR "fees". It's relabelled **"Fees & commission"**. DECIDE: keep
the combined figure, or restrict `feesTzs` to GATEWAY_TYPES. Don't change silently.

**Operator / ops go-live gate (NOT code — the real blocker):** flip `/admin/payments` provider
mock→selcom + redeploy · clear the conflicted-resolution flag · Selcom float PIN (cash-out) · turn
OFF `TEST_FUNDING` + rebaseline the DB at launch · `AZAMPAY_/MIXX_WEBHOOK_SECRET` (SELCOM set) · R2
creds · Sentry DSN · VAPID · pentest · flip `AUTO_SETTLE=true` once the rail is live + reconciled.
Full map: `docs/GO-LIVE-READINESS.md` + `docs/GO-LIVE-RUNBOOK.md` + `docs/LAUNCH-GO-NO-GO.md`.

## Guardrails (do not violate)
- Every push to `main` = a LIVE prod deploy. **Full `npm run test:all` before ANY money push.**
  `tsc` + `next build` green before pushing. Verify after: prod HTTP 200/307 + clean boot logs.
- Never `throw` at boot on a non-fatal (a thrown `instrumentation.register()` = 500 everywhere).
- Money lock order wallet→market; claim the row; migrations hand-authored + tested on the local PG
  first (never `prisma migrate dev` at prod). Never fabricate money/state (A-5).
- ⚠️ A prior `next build` leaves a production `.next` that 404s `next dev` — `rm -rf .next` first.
  A parallel session may share this repo — only stage/commit YOUR files; delete temp scripts.

## Authoritative docs (sources of truth — this brief only summarises them)
`docs/perfection-plan.md` (0-issue plan + 9-role gate) · `docs/DESIGN_AUTHORITY.md` +
`docs/design-master-brief.md` (design invariants + palette) · `docs/FINAL-AUDIT-REMEDIATION.md`
(audit tracker) · `docs/COMPLIANCE-DECISIONS.md` · `docs/GO-LIVE-READINESS.md` +
`docs/GO-LIVE-RUNBOOK.md` + `docs/LAUNCH-GO-NO-GO.md` (launch) · `docs/DATA-LAYER.md` +
`docs/FLOWS.md` (data + money flows) · `docs/PAYMENTS-HARDENING-2026-07-20.md` +
`docs/SELCOM-API-DIGEST.md` (payments) · `docs/ROUTE-AUDIT-2026-07-17.md` (routing/RBAC) ·
`CLAUDE.md` (architecture + ACTIVE-WORK banner).
