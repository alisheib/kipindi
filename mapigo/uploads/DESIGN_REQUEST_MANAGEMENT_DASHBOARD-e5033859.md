# Kipindi — Management &amp; Analytics Dashboard Design Request

**Audience:** Claude Designer
**Project:** Kipindi — Tanzania-licensed pool-based time-window sports betting platform with an in-play prediction game called **Mapigo**
**Live demo:** https://kipindi-production.up.railway.app
**Design tokens already locked:** see [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), [`docs/tokens.json`](tokens.json), and [`docs/DESIGN_REQUEST_LANDING_V2.md`](DESIGN_REQUEST_LANDING_V2.md). **Please do not invent new tokens or new colour ramps.**

---

## What I want

A **complete operator-management dashboard** that gives Kipindi staff (operators, compliance officers, finance, customer support, the founder, and the regulator on inspection) a full real-time picture of:

- Players — who they are, how they behave, what state they're in
- Money — what came in, what went out, what we kept, what we owe in tax
- Games — what's being bet, what's being won, what's being voided
- Compliance — AML queue, self-exclusion roster, audit chain integrity, KYC funnel
- System — backups, integrity alerts, error rates, payment-provider health

**Currently the `/admin` route has:** Overview KPIs, audit log, AML queue, player roster, self-exclusions, system (backup + verify chain). It's a skeleton. We need to upgrade it to a proper management cockpit.

**Not what I want:** a TradingView clone with 40 charts a screen. A mediocre WordPress admin. Buttons that look like they came from Bootstrap. Tabs upon tabs upon tabs.

---

## Locked brand baseline (do not change — these apply to every screen you design)

These come from the existing system. The dashboard must look like the rest of Kipindi.

- **Positive = gold (#DEBC54)**. Wins, profitable periods, +deltas.
- **Active = royal blue.** Selected nav, primary CTAs.
- **Neutral = grey scale.** Body content, secondary KPIs.
- **Loss / negative = `--bet-lose: #6F798F` (a muted slate, NOT bright red).** Crucially: we do **not** use Bootstrap red for losses anywhere — it reads as "fail / error" and we want operators to read it as "this is a number that moved down."
- **Errors / alerts only use `--danger`** (a deep muted red), never the bright crimson seen in casino dashboards.
- **Live indicator:** gold pulsing dot, not green.
- Typography: **Sora** (display + headings + chart titles), **Inter** (body + table data), **JetBrains Mono** (numbers, IDs, timestamps, codes).
- Pattern motif: **Sokoni** subtle gold pattern at 0.025–0.06 opacity on backdrop slabs only; never on cards or tables.
- Dark theme is canonical; light theme works and is a fast operator preference toggle.
- Bilingual EN + SW pairs on labels and section titles. **French (fr) was added** in Sprint 11; the dashboard must respect the language toggle in the top nav.
- "Loss" copy reframe doesn't apply on the operator side — operators see real numbers; players see "the pool grew."

### Existing component library you should reuse (do not redesign)

- `Card` + `CardBody` (`src/components/ui/card.tsx`) — every panel surface
- `Chip` (`src/components/ui/chip.tsx`) — variants: brand, gold, success, warning, danger, info, neutral
- `Button` (`src/components/ui/button.tsx`) — variants: primary, secondary, ghost, danger, gold; sizes: sm/md/lg/xl
- `Tabs` (`src/components/ui/tabs.tsx`) — segmented + underlined variants
- `Breadcrumbs` (`src/components/ui/breadcrumbs.tsx`)
- `Avatar` (`src/components/ui/avatar.tsx`)
- `EmptyState` (`src/components/ui/empty-state.tsx`)
- `Pattern` for backdrops
- `CountUp` for animated numbers (string-format-preset only — no function props)
- `Sparkline` + `AreaChart` + `StakeDistribution` (`src/components/charts/`)

If you need a new chart component (waterfall, donut, geo-map), propose its props + states. Don't ship pixel-only mocks for charts that don't exist as components.

---

## Pages you need to design

### 1. `/admin` — Overview cockpit (redesign existing)
The single screen the founder opens at 8am.

**Top strip — 4 KPI tiles, equal width:**
- **Active players (24h)** — count, sparkline (7-day), delta vs yesterday
- **Gross Gaming Revenue (24h)** — TZS, sparkline (7-day), delta
- **Net Gaming Revenue (24h)** — TZS (after winnings paid), sparkline, delta. Distinguish from GGR visually.
- **Withdrawals pending review** — count of `AML_REVIEW` transactions, with a pulse if &gt; 0

**Mid section — 2 columns:**
- Left: **24-hour money flow** — stacked area chart (deposits + bets stacked positive, withdrawals + payouts stacked negative). Time on x-axis, TZS on y-axis.
- Right: **Live activity feed** — last 20 audit entries, real-time, with category chips. Click any row → /admin/audit?actorId=...

**Bottom strip — 4 secondary tiles:**
- KYC funnel (registered → started → pending → approved) as a horizontal mini-funnel
- Mobile-money provider mix (M-Pesa / Tigo Pesa / Airtel / HaloPesa / Mixx) as a thin horizontal stacked bar with %
- Self-exclusion roster size + churn rate
- Match-integrity alerts (count, last 24h)

### 2. `/admin/finance` — Financial dashboard (NEW)
Where finance + the regulator look.

- Period picker: today / 7d / 28d / quarter / custom range
- Headline KPIs: Deposits in, Withdrawals out, GGR, NGR, Tax accrued, Operator margin %, Total wallet liability (sum of all wallet balances)
- Chart 1: Net flow over time (area chart)
- Chart 2: Operator margin over time (line chart)
- Chart 3: Provider mix over time (stacked bar)
- Chart 4: Top-10 player concentration (horizontal bars, anonymised player ids)
- Table: Provider-by-provider summary (name, deposits, deposits #, withdrawals, withdrawals #, fees, net)
- Export buttons: Download CSV (regulator format) / Download PDF report

### 3. `/admin/players` — Player roster (already exists, expand)
Currently shows: search, status filter, basic table.

Add:
- Lifetime metrics per row: lifetime deposit, lifetime withdrawal, NGR contribution, bet count
- Risk-score column (computed: rapid deposit cycling, late-night play, declined cards, breached prior limits)
- Cohort filter: registration month, region (Mainland TZ vs Zanzibar), age band, KYC status
- Bulk export: CSV of selected rows
- Row click → drill-down (page 4)

### 4. `/admin/players/[id]` — Per-player drill-down (NEW)
Everything about one player on one page.

- Header: avatar + display name + phone + status chip + KYC chip + region + joined date
- Quick stats strip: lifetime deposit, lifetime withdrawal, NGR, bets count, last bet, account age
- Tabs: Activity / Bets / Transactions / KYC / Limits / Self-exclusion / Audit
- Activity tab: full timeline (audit entries for this user)
- Bets tab: paginated list with filters
- Transactions tab: paginated list with status chips
- KYC tab: NIDA number, documents, verification timestamps, override button (compliance officer only)
- Limits tab: current deposit + loss + session limits, history of limit changes (deferred increases visible)
- Self-exclusion tab: current state + history
- Audit tab: every state change for this user
- Privileged-action bar at bottom (sticky): Freeze wallet · Refund · Manual self-exclude · Force KYC re-verify — each requires reason + two-person approval

### 5. `/admin/games` — Game performance (NEW)
What's being played and how it's performing.

- Period picker
- Top-line KPIs: bets placed, GGR (match), GGR (Mapigo), cash-out usage %, bet voids
- Match-betting drill-down: per-match table with league, kickoff time, status, total pool, winner-side mix, GGR contribution
- Window-betting drill-down: per-window-kind table (W_0_15 / W_15_30 / etc.) with bet count, total pool, average stake
- Mapigo drill-down: rounds played, SPIKE/DRIFT/CALM call distribution, hot-streak players, average stake
- Charts: pool size over time (line), call distribution (donut), cash-out usage % over time (line)

### 6. `/admin/compliance` — Compliance overview (NEW)
The page the regulator sees first on inspection.

- KYC funnel as a real funnel chart with conversion rates between steps
- AML queue summary (pending, last 7 days approved, last 7 days rejected, average time-to-decision)
- Self-exclusion roster summary (active, by period, expiring this week)
- Cooling-off summary
- Limit-increase deferrals (count of pending 24h-deferred increases)
- Reality-check engagement (% of players who continued, vs took a break, vs self-excluded after the prompt)
- Match-integrity alerts (last 30 days)
- Audit chain status: green if `verifyChain()` returns valid, red with break-point if not
- Backup status: last snapshot timestamp, snapshots in the rolling history
- One-click report exports per regulator: GBT monthly · TRA tax · FIU SAR

### 7. `/admin/system` — System operations (already exists, expand)
Currently has backup-now + verify-chain.

Add:
- Live system stats: uptime, memory, request rate, error rate (last 24h), active sessions count
- Backup history: timestamp, size, snapshot id, restore button (with confirm)
- Audit chain history: chain length, last verify result + timestamp + reviewer
- Payment-provider health: per-provider success rate (last 24h), latency p50/p95
- Match-feed health: API-Football last successful pull, lag, error rate
- SMS provider health: queued / sent / failed last 24h
- Job queue: scheduled tasks (nightly chain verify, daily KYC re-check, weekly GBT export, etc.)
- Manual maintenance actions: Freeze deposits · Freeze withdrawals · Pause Mapigo · Cancel match (each opens a confirm dialog with reason field)

### 8. `/admin/reports` — Regulator-ready reports (NEW)
A dedicated reports module with the exact formats GBT, TRA, and FIU expect.

- Templates list: GBT monthly summary, TRA withholding-tax remittance, FIU SAR, ISO 27001 audit log export, KYC re-verification roster, self-exclusion register (cross-operator format)
- Each template: select period, preview, download (CSV / PDF / signed JSON)
- Generation log: who generated what, when, signed receipt for the regulator

---

## Visual + interaction principles

- **Density without clutter.** Operators look at this all day. Tight 4px-grid spacing inside cards, ample breathing room between cards.
- **Numbers are the hero.** Sora bold, tabular, large; labels small and uppercase tracked.
- **Animations are functional only.** No "wow" celebrations on operator screens. CountUp is OK; particle effects are not.
- **Colour gradients reserved for hero brand surfaces.** Operator cards stay flat with brand-accent borders.
- **Time-range picker is the same component everywhere.** Pinned to the top-right of every page that has one.
- **Every chart has a corresponding underlying table** accessible via a "View as table" toggle (a11y + drill-down).
- **Empty states are dignified.** "No transactions in this window — pick a wider range" rather than "Oops!" emoji.

---

## Constraints

- Mobile + tablet support is **not** required for the management dashboard. Design for **1440 desktop** primary, **1024 tablet landscape** secondary. The operators sit at desks.
- **No third-party charting libraries.** We have `Sparkline`, `AreaChart`, `StakeDistribution`. New chart needs are SVG-based components designed to match the system. If you need a donut, define it.
- **Every action that changes state must be auditable.** Any button that does something must produce an audit entry. Show the user a toast on success.
- **Two-person approval is real.** For anything that moves money, freezes accounts, or overrides KYC, designs MUST show the second-officer queue, not just a single-click button.
- **Nothing on this dashboard is player-facing.** Confidentiality is paramount. The Designer must mark every screen with a "STAFF · CONFIDENTIAL" header band.

---

## Output I'd like back

1. **Wireframes** for /admin overview, /admin/finance, /admin/players/[id], /admin/compliance — at 1440 + 1024
2. **High-fidelity mocks** in dark theme + light theme for those four
3. **Component additions** — list new components needed (donut chart, time-range picker, two-person approval queue, regulator-export button) with proposed props
4. **Information architecture** — final left-nav structure, breadcrumb pattern, search behaviour
5. **A clear "what's left in code" summary** so I can hand the implementation back to engineering with the right priority order

---

## What's already in the codebase (for grounding)

The existing skeleton is at `src/app/admin/`:

- `/admin` — overview KPIs (last 24h audit by category, latest 25 entries, sample wallet)
- `/admin/audit` — full audit log with category + actor filters, hash-chain backed
- `/admin/players` — search + filter + per-row links to audit
- `/admin/aml` — AML_REVIEW queue with functional approve/reject + two-person approval flag
- `/admin/self-exclusions` — placeholder for production Postgres iteration
- `/admin/system` — backup-now + verify-audit-chain buttons

The data layer (`src/lib/server/`) already has:
- `audit.ts` — append-only HMAC-chained log with `verifyChain()`
- `backup.ts` — JSON snapshot to disk
- `bet-service.ts` — placeBet, settleBet, settleWindow, cashOutBet, previewCashOut
- `mapigo-service.ts` — placeMapigoBet, settleRound
- `wallet-service.ts` — deposit, withdraw with AML-trigger thresholds
- `responsible-gambling.ts` — limits, self-exclusion, cooling-off, reality-check interval
- `notification-service.ts` — DB-backed notifications with mark-read/dismiss
- `integrity-service.ts` — Sportradar-shaped match-integrity adapter (stub)
- `user-service.ts` — exportUserData (GDPR Art 15), closeAccount
- `totp.ts` — RFC 6238 TOTP primitive ready for admin 2FA wiring
- `store.ts` — single-source-of-truth in-memory store mirroring the Prisma schema 1:1

Aggregation queries (24h GGR, NGR, KYC funnel, etc.) are not yet implemented — they will be added once your designs land. We'll need from you a list of the analytics queries each page requires so engineering can write them server-side correctly.

---

## Inspiration to look at

Premium operator-dashboard benchmarks:
- Stripe Atlas dashboard (information density + restraint)
- Linear (the project tool — animation discipline + sidebar pattern)
- Vercel (deploy / observability layout)
- Looker Studio (chart legibility) — but please make ours *prettier*
- Pinnacle Sports back-office (the only premium sportsbook on the planet — minimal, numerical)

Anti-patterns to avoid:
- Power BI / Tableau density — too many small charts on one page
- WordPress admin panels — visually offensive
- Vanilla Bootstrap dashboards — instantly read as cheap
- Crypto trading-bot dashboards — too noisy, too neon

---

## Constraints summary (one paragraph)

The management dashboard must look like a continuation of the player-facing Kipindi — same Sora/Inter/JBM type, same gold-positive / royal-active / muted-loss colour discipline, same Sokoni pattern at low opacity, same EN+SW+FR bilingual treatment for labels — but **denser, calmer, and with operator-grade table + chart density**. Every screen must support dark + light, must respect the language toggle, and must produce auditable side effects on every state-changing action. Two-person approval is shown as a queue, not a single button. Reports must export in the exact CSV/PDF formats the Tanzania Gaming Board, Tanzania Revenue Authority, and Financial Intelligence Unit expect. No mobile / tablet polish required — this is desktop-first.

Thank you. Send back the four wireframes first; we'll iterate from there.
