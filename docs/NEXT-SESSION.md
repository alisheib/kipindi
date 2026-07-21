# 50pick — next-session brief

Read the two always-on skills first (`.claude/skills/50pick-standards` +
`.claude/skills/50pick-audit`), then this. Last updated 2026-07-21 (platform-wide design pass).

## State at handoff
- **The Final Audit is COMPLETE** — all 11 Criticals + all Highs + all Mediums
  closed. Record: `docs/FINAL-AUDIT-REMEDIATION.md`.
- **Prod HEALTHY.** Verify against **`https://50pick.tz`** — the live app
  (re-confirmed 2026-07-20). `www.50pick.tz` and `kipindi-production.up.railway.app`
  serve the same Railway instance. The old "custom domain parks on an Apache page"
  note was true on 2026-07-16 and was fixed by the DNS cutover on 2026-07-17 — it is
  **obsolete, do not re-raise it.** Railway CLI = alisheib07 (`railway logs -s 50pick`).
- Now finishing the **perfection-plan §9 enhancement work** before the payment
  gateway. Live tracker: **`docs/ENHANCEMENT-PLAN-STATUS.md`** (grouped: (A)
  code-doable / (B) needs-Ali / (C) optional).
- Go-live + payment-gateway map: **`docs/GO-LIVE-READINESS.md`**.

## Done (Session — 2026-07-21, platform-wide DESIGN + missing-detail pass)

Method: acted as "Claude Design". Before touching anything, ran a 4-lane grounded
survey (leaderboard/invite/wallet · category-art + PageHero · KYC/sessions/SoF/
fairness/help/RG/legal · admin viz + silent-zero). **Headline finding: most of the
design-master-brief §5–§7 [H] backlog is ALREADY SHIPPED** — proving before fixing
kept us from re-building finished work. See "Proven already-done" below.

Gate green on every push: `tsc` + `next build` clean · `test:tokens`/`test:outcome`/
`test:integrity` pass · money-safety suites (money-invariants 83 · wallet · ledger 89
· trial-balance · payout-alloc · concurrency · admin-money-ops · admin-roles) all
green · `test:i18n` parity 1420/1420/1420. Visual: real screenshots read for every
new surface × state (incl. a temp admin preview route for the A-5 failure states).
All 4 batches LIVE on https://50pick.tz (fresh boot + smoke: admin=307, register=200,
OG=200 image/png; no 500s).

1. **Admin players console viz** (`e7af7b2`). New **`AdminGauge`** primitive
   (`admin-charts.tsx`) — a radial value gauge (the console only had the horizontal
   `AdminMeter`); static SVG so reduced-motion-safe. `players/[id]` risk score is now
   that gauge, coloured by the SAME band tokens the page used (`--yes/--warning/
   --danger-500`). ⚠️ Deliberately NOT `ConfidenceDial`/`CircularProgress` as the
   6-28 audit suggested — that is a YES/NO tipping dial and would misread a risk score
   as a bet split (B2). `players/cohorts` "Registrations over time" hand-rolled height%
   bars → `AdminAreaChart`. `players` list: header count-chips → console-standard
   `AdminKpi` band (Total/Active/Pending KYC/Blocked) + a new **Population-mix**
   segmented bar (green Active / amber pending / rose blocked / grey closed); local
   hand-rolled `SortTh` → shared `admin-sort` `SortTh` (44px tap target).

2. **Sessions device glyph** (`d31bba9`). `/profile/sessions` hard-coded
   `I.smartphone`, so a desktop session showed a phone. Now follows the parsed UA:
   tablet→`deviceTablet`, phone→`devicePhone`, else `deviceDesktop`. Wired 3 dead glyphs.

3. **Silent-zero → explicit "unavailable" (A-5)** (`e040fba`). Admin money/analytics
   reads used `.catch(()=>0|[])`, rendering "TZS 0" / an empty queue as if real — a
   fabricated figure and, for the compliance queues, a false "nothing pending".
   **Display-only, no money arithmetic touched.** New `AdminKpi unavailable` ("n/a ·
   couldn't compute", amber) + `AdminLoadError` strip (admin-shell.tsx). Applied to
   finance (7 money scalars + taxAccrued guard), overview (active/GGR/NGR + AML count),
   live (GGR/active), approvals (KYC/AML/SOF queues distinguish failed-read from empty),
   resolver-queue (failed read ≠ "Queue is clear"). A GENUINE zero still shows "TZS 0";
   only failures change. **Deferred:** benign empty CHARTS still say "No data in this
   window" on failure — they don't fabricate a number, so lower priority.

4. **Branded OG for shared invite/registration links** (`86c09ef`). `/auth/register`
   OG was the site default; a shared `?ref=CODE` link now unfurls with a branded
   "You've been invited · Predict events. Not chance." card via the existing
   `/api/og/page` route. Zero new i18n keys (reuses `common.youveBeenInvited` /
   `auth.signUpTitle` / `auth.railTagline`); no fabricated reward figure.

### Proven ALREADY-DONE 2026-07-21 (do NOT re-chase — verified in code)
Category-art layer (topic-chip glyphs, `/markets/[id]` watermark, home category row,
MarketCard watermark); PageHero on proposals-list/new + fairness; Leaderboard top-3
gilt PODIUM; Invite share-card + QR + `navigator.share` + EarningsRing; Wallet 30-day
balance sparkline + real MNO logos in Methods; `RewardBurst` on proposals-approved AND
KYC-APPROVED; KYC progress rail + per-slot ID silhouettes; Source-of-funds per-source
glyphs; Fairness provably-fair diagram; Help per-FAQ glyphs; RG self-care art + helpline
callout; Legal per-doc header icons. (The kit glyphs `kycRail`/`fairnessChain`/
`rgSelfCare` are unwired, but each page has an equivalent bespoke component — NOT a gap.)

### Genuinely remaining / DEFERRED (need data or are money-adjacent — NOT a visual tweak)
- **AdminKpi spark on money tiles** (overview/finance/live GGR/NGR/active): needs an
  HONEST per-metric 24h/7d series. `moneyFlowSeries` is net-flow, not GGR — feeding it
  into a GGR spark implies a trend that isn't that metric's (fabrication). Requires a
  bucketed analytics helper = money-adjacent enhancement.
- **Wallet limit-usage meters**: Limits tab shows platform caps; the RG page sets
  personal limits but computes NO "used today/week/loss" figure. A usage meter needs
  that money-adjacent sum — out of a visual pass's remit.
- **Wallet txn-list provider logos**: the row's green/rose in/out arrow is already the
  right primary indicator and the row has no `provider` enum (only `providerRef`, shown
  expanded). Adding a logo risks clutter for no clear win — left as-is.
- **Wider dynamic OG** (leaderboard/results/proposals/profile): same easy pattern the
  invite OG now proves — a fast follow-up via `/api/og/page`.
- **PII in two admin list views** (privacy on-behalf, self-exclusion roster): still a
  compliance mask-vs-justified-need call, unchanged.

### ▶ NEXT SESSION (run-until-done, Ali away) — paste `docs/FINALIZE-SESSION-PROMPT.md`
Autonomous FINALIZE pass. Lanes, safe-first: (1) sparse "Today" board graceful "see this
week →" fill; (2) mask PII in the 2 admin list views; (3) full-platform visual QA sweep
(read screenshots, fix objective defects only); (4) ⚠️ LAST + careful + READ-ONLY — the two
deferred money-adjacent items (AdminKpi money-tile sparks, wallet limit-usage meters), which
must **STOP-and-report** on any payout/settlement/ledger/payment touch and stay deferred
rather than ship a figure that isn't the real metric. The go-live gate (Selcom flip, float
PIN, TEST_FUNDING off, secrets, DNS) is operator-only — see docs/GO-LIVE-READINESS.md.

## Done (Session — 2026-07-20, ADMIN-only console detail pass)

Full scan of the operator console (41 routes: `src/app/admin/**` + `src/components/admin/**`).
Gate green: `tsc` clean · `npm run build` OK · `test:all` 82/83 (only `test:responsive` fails
locally — needs a live :3000) · `test:tokens`/`test:outcome`/`test:integrity` all pass. Visual:
scoped `responsive-audit` (SURFACE=admin, 360+1280, EN+SW) = **144 pass / 0 fail** (36 soft
touch-target warnings, all pre-existing chrome).

- **Loaders — all 41 routes now have a real skeleton.** 8 had NO `loading.tsx` (events,
  insights, kyc/[id], objections, payments, resolver/[id], settlement, transactions); 32 were a
  bare centred `BrandSpinner`. Each now renders the real `AdminPageHead` + a body skeleton that
  mirrors the page's KPI band / table columns / card stacks, composed from a new shared kit
  **`src/components/admin/admin-skeletons.tsx`** (SkBody/SkKpiRow/SkCard/SkFormCard/SkTableCard/
  SkChip/SkBar/SkBlock). Template was `ai-polls/[id]/loading.tsx`.
- **Pagination on every genuinely-unbounded list** (shared `AdminPagination`): invite campaigns,
  invite contacts, objections queue, settlement payout queue, payments retry queue, config
  per-market overrides. Verified NOT to touch intentionally-capped lists (affiliate leaderboard =
  service-side top-10; finance top-10/drift-20; compliance "next-in-queue" previews; live feeds).
- **Shared empty states.** New **`src/components/admin/admin-table-empty.tsx`** (the
  `TableEmptyRow` the 2026-06-28 audit §3 asked for) wraps the shared `EmptyState` atom in a
  colspan row. Adopted across 10 hand-rolled table empties in 8 files (markets, markets/[id],
  players, players/[id], self-exclusions, privacy ×2, compliance, aml ×2, finance). reports
  generation-log empty also unified onto `EmptyState`.
- **B6 (settled outcome is READ, never inferred) on two admin surfaces — VISUAL only, reads
  stored fields, no arithmetic touched:** (1) the markets list showed a pool-implied `%` for
  RESOLVED rows and never the verdict — now reads `resolvedOutcome` (Settled YES/NO · Void · or
  "Settled" with no side when unknown). (2) resolver-queue fed **pool-lopsidedness** into a
  `CircularProgress`/`ConfidenceDial` as `yesPct`, so a 90%-NO market drew a YES-green needle
  labelled "80%" — now shows the honest crowd YES% ("crowd"). ⚠️ `CircularProgress`' `tone`/
  `stroke` props are DEAD (the impl ignores them) — don't rely on them.
- **Named fixes:** removed the dead "Coming soon" branch in reports `generate-button.tsx` (no
  call site set `available={false}`); ai-usage now draws a 30-day spend `AdminAreaChart` from
  `anthropic.daily` (data already computed, was discarded) — only when the Cost API key is set,
  else nothing (no fabricated line); moderation got a real KPI band (In queue / Auto-hidden /
  Reported); dropped the stray `PeriodPicker` from 4 pages that never read `?range` (objections,
  approvals, compliance, cohorts); objections body re-wrapped to the standard
  `px-4 lg:px-6 py-5 space-y-4` (its content was unpadded). Added objections/settlement/events/
  insights to the `responsive-audit` admin list.

⚠️ **Money-logic risks FOUND — reported, not fixed (out of a visual pass's remit):**
- **Silent-zero-on-failure is widespread** on money/analytics reads — `.catch(() => 0 | [] | {})`
  in finance (heaviest), overview, live, approvals, players, cohorts, kyc/[id], resolver/[id],
  resolver-queue. A failed query renders "TZS 0" / an empty queue as if real (an approvals or
  settlement queue reading empty on a fetch error is the dangerous case). Contradicts A-5. Fix =
  an explicit "unavailable" state, not a zero — a deliberate follow-up.
- **PII in list views:** privacy on-behalf table + self-exclusion roster render the full
  `displayName` (phones are masked). 2026-06-28 audit §3 flagged it; left to a compliance call.

**Deferred / decided (with reasons):**
- **KPI `series`/spark slot** still unused on most tiles (only cohorts + reports feed it). Wiring
  24h/7d mini-series into overview/finance/live needs new per-tile series data — an enhancement,
  not a visual tweak.
- **Segment error boundaries:** decided the single `admin/error.tsx` (→ shared `RouteError`) is
  sufficient — admin routes are stateless server-renders reachable from the sidebar, so a segment
  boundary preserves nothing extra. Documented, not added.
- **Confirms on KYC approve/reject + candidates publish:** these lack a final confirm modal
  (unlike settlement / AML-approve / objection / resolver stage-2). Left as-is — adding a modal to
  a compliance/AI-pipeline flow is behavioural, beyond a visual pass; flagged for review.
- **system rate-limiter table** silently `slice(0,25)`s ephemeral buckets — low value, deferred.

## Done (Session N — 2026-07-20, visual + a user-reported settlement bug)

- 🔴 **Resolved market cards showed the WRONG outcome.** `market-card.tsx` derived the settled
  side from `yesPct >= 50` (the crowd's money split) instead of `resolvedOutcome`, so every
  upset rendered the opposite of the truth and contradicted the detail page. Card now takes a
  `resolvedOutcome` prop, wired at all resolvable call sites (`/markets`, `/results`,
  `/watchlist`); unknown outcome renders "RESOLVED" with **no** side rather than a guess.
  New invariant **B6** + `npm run test:outcome` (verified to fail on the original line).
  **Measured on prod before the fix: 4 of 8 sampled resolved markets showed the wrong side**
  (worst on lopsided 100%-YES pools that settled NO). After: 8/8 card↔detail agreement live.
- **Motion tokens were colliding across stylesheets** — see invariant **B5** and
  `npm run test:tokens`. Read B5's scope table before citing that fix; several repaired rules
  are dead CSS. Real delta = chat panel, countdown ring, probability chart.
- 4 loading-skeleton widths aligned to their pages; `appUrl()` deduplicated and defaulted to
  the live domain; dead `lucide-react` removed.
- `npm run qa:visual` — new post-deploy live check (10 routes × 360/1280, screenshots).

⚠️ **Open, worth deciding:** `/markets` defaults to the "Today" filter and can render an empty
board while the same header reads "6 live · TZS 501k in play". Ali chose leave-as-is on
2026-07-20, before seeing it rendered. It is the first screen a tester hits.

✅ **FIXED 2026-07-20 @ `6b1975b`** — was: "the MarketCard sparkline draws on zero live cards;
`market-history.ts` is an in-memory Map on both store paths". That diagnosis was right but
incomplete. The same root cause was *also* making `/markets/[id]` render a **fabricated** price
chart: with history wiped on every deploy, `seedHistory()` generated a synthetic LCG random walk
for every market and drew it as real. The card was blank because it obeyed the A-5
no-fabrication rule; the detail page did not. Now persisted in a `MarketSnapshot` table,
`seedHistory` deleted, charts start empty and fill with real bets. Guard: `npm run test:history`.

## Done (Session M — money-ops, all live + verified)
A1 R2 storage seam (H8) · A2 audited balance-adjust + force-reverify KYC · A3 PSP
reconcile match/write-off · A4 withdrawal + bulk retry · A5 aggregates (verified
materialized) · M2 largest-remainder payouts (Σ == floor(netPool) exactly;
money-e2e drift 0.00). New tests: `test:payout-alloc`, `test:admin-money-ops`.

## Do next (code) — in priority order
1. **When a parallel Session E branch (`enhance/perfection-9`) is ready:** fetch it,
   run the full gate (`tsc` + `build` + `test:all` + `test:integrity`), merge to
   `main`, deploy, verify. (Coordination contract: `docs/PARALLEL-SESSION-COORDINATION.md`.)
2. **Cross-cutting features (best AFTER E merges — they touch money/schema + UI):**
   A6 featured/pinned markets · A7 configurable compliance knobs (KYC/AML thresholds
   → `/admin/config`) · A13 officer/RBAC UI · A14 scheduled-reports engine · A15
   post-publish market edit · A16 bonus start/end windows · two-officer for large
   balance adjustments (reuse E's `twoOfficerGate`).
3. **Dedicated focused session (highest blast radius):** bet-STAKE
   single-`$transaction` — thread `tx` through bonus-service + a pool-unwind path;
   verify with the load harness. (Money already correct + durable + detected.)

## Guardrails (do not violate)
- Every push = LIVE deploy. **Full `npm run test:all` before ANY money push** (M2
  once shipped on a subset and a stale test slipped through).
- `tsc` + `next build` green before pushing. Never `throw` at boot on a non-fatal.
- Money lock order wallet→market; claim rows; migrations on the local PG first.
- Keep the trackers + `CLAUDE.md` banner + memory in sync as you go.

## Ali / ops (not code) — the real go-live gate
Repoint DNS 50pick.tz→Railway · turn OFF `TEST_FUNDING` + format/rebaseline the DB
at go-live · set `SELCOM_/AZAMPAY_/MIXX_WEBHOOK_SECRET` · R2 creds (activates A1) +
`npm i @aws-sdk/client-s3` · Sentry DSN + `npm i @sentry/node` · VAPID keys · ⊘
bitmap assets · Redis (H2) · TRA ruling + F6 decision · pentest. Then integrate the
aggregator (only the outbound call in `payments.ts` is a stub) → `AUTO_SETTLE=true`.
