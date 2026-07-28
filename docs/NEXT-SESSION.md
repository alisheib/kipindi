# 50pick — next-session brief

Read the two always-on skills first (`.claude/skills/50pick-standards` +
`.claude/skills/50pick-audit`), then this. **Current-state only** — old per-session logs were
consolidated 2026-07-21; the detail lives in git history + the authoritative docs listed at the
bottom. **Last updated 2026-07-28 (head `f67e2d95`).**

## ⚡ What changed since 2026-07-24 — read this before anything else
Six sessions landed. Three of them **retire rules stated further down this file**, so acting on
the old text would be actively wrong:

1. 🟢 **The payment provider is `selcom` in prod, NOT `mock`** (verified read-only 2026-07-27).
   The long-standing "flip provider mock→selcom" blocker is **CLOSED**. Deposits run on the real
   rail. Money-mode is still TEST (`TEST_FUNDING` on) — turning that off + rebaselining the DB is
   a launch-day step.
2. 🟢 **AML Approve now really DISPATCHES** (`dispatchApprovedWithdrawal`: AML_REVIEW → PROCESSING
   → gateway → exactly-once settle; two-officer gate kept; a provider refusal reverts to review,
   no auto-refund). ⛔ **The "AML Approve is deliberately disabled" rule below is RETIRED** — do
   not re-disable it. Selcom disbursement phases 1–3 are shipped and live.
3. 🟢 **Design system consolidated to ONE archive** (`docs/design-system/v2-2026-07-27/`), **The
   Needle** shipped, the **motion layer** landed and — as of `f67e2d95` — is genuinely **adopted**
   (it had zero consumers before). `docs/MOTION-HAPTICS-ADOPTION-PROMPT.md` is retired.
   New guard: **`npm run test:motion`**. Also shipped: **Up & Down D3** round detail.

🔴 **THE ONE REMAINING LAUNCH GATE IS NOT CODE:** `PAYMENT_VENDOR_PIN` (the Selcom float-account
PIN) + a funded float. Selcom confirmed the same creds serve disbursement, so nothing else is
outstanding on their side. Set it in the Railway dashboard (secret — never chat/git), then hit
the admin **Test Selcom** button from an allow-listed IP.

⚠️ **Two suites need a live server on :3000 and fail without one — expected, not a regression:**
`test:responsive` and `test:motion`. Serverless runs should pass `--skip responsive,motion`.
⚠️ **A parallel session may share this repo.** `git fetch` before analysing, and only ever stage
your own files — never `git add -A`.

## Current state (LIVE, healthy)
- **2026-07-28 — MEASURE + INK-RAMP + SEARCH shipped (8 commits, `0b1e3322`→`57cafab2`, all live).**
  Full record: [`docs/MEASURE-TEXT-SEARCH-AUDIT-2026-07-28.md`](MEASURE-TEXT-SEARCH-AUDIT-2026-07-28.md).
  Three defects closed, each now guarded by a test verified to fail on its own bug:
  🔴 **1,325 utility-class usages compiled to NOTHING** — `tailwind.config.ts` never
  bridged `text.subtle/muted/faint`, the numeric `royal` ramp, or `gilt` at all, so a
  four-step ink ramp rendered as two and everything meant to recede did not.
  Contrast proved on every surface (faint is the tight one at 4.74–4.87 vs AA 4.5).
  · **No width rule existed anywhere** — `admin/layout.tsx` had no cap, so 43 pages
  rendered at 2,344px on a 2560 monitor with 1,492px-wide form fields. Now a six-tier
  measure (DESIGN_AUTHORITY **B7**), and the responsive audit is **two-sided** at last
  (it only ever asserted lower bounds, which is why this passed QA for so long).
  · **12 duplicated searches, 10 broken on multi-word** — one grammar now
  (`src/lib/search`), with `"phrase"`, `-exclude`, `field:value`, and `/regex/` on the
  three admin surfaces where it costs nothing.
  ⚠️ **Deferred on purpose, with measurements in the doc:** transactions/ai-usage
  search into SQL, regex on those two, and the `User`/`Transaction` trigram indexes
  (a plain `CREATE INDEX` blocks writes = blocks deposits). Postgres picks a seq scan
  over the GIN index at 20k rows, so the benefit today is zero and the risk is not.
  ⚠️ **`.claude/skills/50pick-audit/SKILL.md` says the local PG cluster is at
  `F:\pg-loadtest`. That drive does not exist — it is `C:\pg-loadtest`.**

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
- ⛔ ~~**AML Approve is deliberately disabled** server-side~~ — **RETIRED 2026-07-27.** The real
  dispatch + settle path now exists (`dispatchApprovedWithdrawal`), so Approve is enabled and
  genuinely pays out. See the "What changed" block at the top.
- **Solo-resolution** is real-money-state locked (POCA §16); **testing overrides default OFF in
  prod**. `TEST_FUNDING=true` pre-launch lets testers solo-resolve; it hard-locks at go-live.
- **bet-stake single-`$transaction`** merged; **M2** largest-remainder payout done; **C3/C6** ledger
  + audit-chain done. See `docs/COMPLIANCE-DECISIONS.md`.
- **Settlement has NO global on/off switch — by design (owner decision 2026-07-24, recorded in
  `docs/COMPLIANCE-DECISIONS.md`).** `AUTO_SETTLE`, the `/admin/payments` `autoSettle` toggle,
  `getAutoSettleEnabled()` and the global `settleDueMarkets()` sweep are DELETED — do not re-add
  them or go hunting for them. Settlement is **per-market timer-driven**: an adjudicated market arms
  its own timer for its `objectionsClosedAt` and pays itself then; a ~5-minute reconciler re-arms any
  market whose timer was dropped; `/admin/system` shows live scheduler health (timers armed + next
  fire). The payout gates are UNCHANGED — objection window · standing objection freezes the pool ·
  winner-floor · exact conservation · idempotent (no double-pay). `/admin/settlement` remains the
  **human fallback** (manual "Settle now" + the objection-frozen view).
- **No global AI "sentinel sweep"** — no 4-hourly pass over live markets, no sweep interval, no
  pause/resume, no sentinel countdown. Each market is AI-checked at its own resolution time by the
  per-market scheduler; an operator re-checks ONE market on demand with "Re-check this market now"
  on `/admin/resolver-queue`. That page also carries **resolution mode**: the two-officer ceremony
  ("human", the default) or "auto", where the AI seals the outcome only above its confidence
  threshold (low confidence / UNKNOWN always falls back to human).

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
creds · Sentry DSN · VAPID · pentest · **settlement — nothing to flip** (there is no global switch
any more): once the rail is live + reconciled, confirm on `/admin/system` that "Timers armed" is
non-zero with a sane next fire, that `/admin/settlement` has nothing stuck in "Ready to settle",
and that `/admin/resolver-queue` is in the resolution mode you intend.
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
