# 50pick — Admin & Reporting Specification (Batch 3 · 2026-07-07)

Finalizes the admin surface the earlier passes only primed (A8 primitives).
Companion specimen: `specimens/50pick-admin-batch3.html`. Idiom: admin is
staff-facing — EN primary, SW subtitle (matching the shipped console's
"Overview · Muhtasari" convention), **no ZH in admin**, mono-heavy, denser
type ramp (13px body). Colour restraint is normative: **no gold anywhere in
admin except the resolved/sealed state**, aqua only on genuinely live feeds,
claret only on destructive or irreversible actions, royal for nav/selection.

---

## §1 Reporting console (`/admin/reports`) — the finalized surface

**Header bar.** Title + SW subtitle ("Reports · Ripoti"), period segmented
control (`Today · 7d · 30d · MTD · Custom`), a compare toggle ("vs prior
period"), export split-button (`CSV` primary · `PDF` menu), and a mono
freshness stamp `generated 07 Jul · 09:41 EAT` — reports are snapshots, so
the stale-data chip pattern (§6 micro-spec) does **not** apply here; the
stamp does.

**Money definitions (normative — one source of truth for every report):**
- `Stakes` — gross amounts committed in settled markets in period.
- `Payouts` — winner distributions incl. pool share, excl. refunds.
- `GGR = Stakes − Payouts` (voids/refunds excluded from both sides).
- `Bonus cost` — bonus-wallet value converted to withdrawable cash.
- `NGR = GGR − Bonus cost − payment fees`.
- `Hold % = GGR / Stakes` — shown to 1 decimal; the platform-fee model
  makes this near-constant, so drift is an alarm, not a KPI win.
All money in TZS, tabular mono, thousands-separated, negative in rose with
a true minus (−). Percentages never colour-coded by sign alone (a11y).

**KPI strip.** Six `AdminKpi` tiles with the (now-fed) spark slot:
GGR, NGR, Deposits, Withdrawals, Hold %, Active players. Delta chips read
`▲ +8.2% vs prior` in yes-green / rose, computed only when compare is on.

**Daily P&L table.** `admin-tbl` + `SortTh`: Date · Stakes · Payouts ·
GGR · Bonus · Fees · NGR · Hold%. Sticky footer totals row (border-top
double hairline). Row hover reveals a `csvExport` row-glyph (drill-down
export). Empty period → illustrated `adminGeneric` EmptyState. Loading →
row skeletons (§6 micro-spec geometry).

**Category breakdown.** `AdminBarList` share-of-GGR by category with
per-row hold%; bars royal, no per-category colour coding (categories are
not statuses).

**Regulator pack.** Card per statutory report (monthly Gaming Board pack):
state chain `Draft → Prepared → Approved → Submitted → Acknowledged`
rendered as the fairness-chain pattern; **maker-checker is mandatory** —
`Prepared by A. Mushi · 05 Jul`, `Approved by ali-admin · 06 Jul`; the
Submit action stays disabled until both slots are signed. Download row
gives the exact file artefact (`GB-2026-06.pdf · 1.2 MB · sha256 …a41f`,
hash truncated with copy glyph). Acknowledged state gets the seal — the
one sanctioned gold in this console.

**Scheduled reports.** List rows: name, cadence (`Weekly · Mon 06:00 EAT`),
recipients as chips, last-run status pip, pause toggle (royal), and a
claret-text delete behind the §10 confirmation hierarchy (medium).

## §2 Resolution Ceremony (`/admin/resolver/[id]`)

The two-officer attestation designed as a ceremony, because it *is* the
fairness story. Layout: evidence left, verdict rail right.

- **Evidence panel:** market question + close facts, the declared official
  source as an `externalLink` chip (URL shown in mono, opens read-only),
  paste-slot for the evidence excerpt, and the market's final tipping bar
  frozen at close (numerals only — no animation on a settled thing).
- **Verdict selector:** three radio-cards `YES · NDIO` (yes-green outline),
  `NO · HAPANA` (rose outline), `VOID · BATILISHA` (neutral, claret text,
  requires reason select — void refunds stakes and must always toast
  player-side, closing the audit's silent-void bug).
- **Attestation rail:** two signature slots. Officer A: signed state —
  `attest` glyph, name, `05 Jul · 17:48 EAT`, immutable. Officer B: the
  current actor — countersign button (royal) enabled only when a verdict
  is selected and B ≠ A (enforced visually: self-countersign renders the
  button disabled with "second officer required · afisa wa pili").
- **Seal & publish:** disabled until both signatures exist; on publish the
  `seal-impress` runs once and the **objection-window ring** (24 h, the
  countdown-escalation pattern) starts. Publishing is the hard tier of the
  §10 confirmation hierarchy: typed word `SEAL`.
- **Audit line:** every act appends to the visible mono trail
  (`17:48 attest officer_a verdict=YES`), matching the live-feed idiom.

## §3 KYC / AML workstation (`/admin/kyc/[id]`)

- **Left: document viewer** — ID front/back/selfie tabs, zoom chips
  (`100% · 200% · fit`), rotate, and an EXIF/liveness meta strip in mono.
  The viewer area is the one legitimately light surface in admin (documents
  are photographed on paper); frame it panel-dark with 12px inset.
- **Right: decision rail** — checklist rows each with pass/fail/pending
  tri-state (yes-green check · rose x · muted dash): name matches, DOB 18+,
  document authentic, selfie match, sanctions/PEP clear, source-of-funds
  on file. Risk score as `AdminMeter` (rose past threshold). SLA chip
  (`2h 14m left`, countdown-escalation colours). Approve = royal button
  (the gold burst is the *player's* moment, not the officer's); Reject
  requires a reason code select (document unreadable / mismatch / expired /
  suspected fraud / other+note) and is the medium confirm tier. Escalate
  to AML = neutral ghost. Queue context strip: `#12 of 47 in queue ·
  oldest 6h`.
- **Maker-checker:** approvals above a configurable risk score require a
  second officer — same two-slot rail as §2, reused component.

## §4 Payments operations (`/admin/payments`)

- **Per-MNO health cards** (M-Pesa, Airtel, HaloPesa, Mixx): success rate
  (24h) as the headline number, p50/p95 latency in mono, last failure
  reason + time, deposit/withdraw split meters, and a status pip
  (yes-green ≥98% · gold 95–98 · rose <95). Each card carries the
  **kill-switch** toggle pair (deposits / withdrawals) — switching one off
  is the hard confirm tier and renders the card header claret-tinted with
  `PAUSED BY ali-admin · 11:02 EAT`.
- **Reconciliation strip:** internal ledger vs PSP settlement for the
  period — matched count, unmatched count (rose when >0), drift amount
  (must be TZS 0; any other value renders claret with an `Investigate`
  link that filters the ledger to unmatched refs). Uses the `reconcile`
  glyph.
- **Retry queue:** mini table of failed transactions — ref, MNO, amount,
  attempts, next retry countdown, manual `Retry now` / `Cancel & refund`
  (medium confirm). Row ages >1h auto-escalate a rose left-rule.

## §5 Shared admin rules (normative)
- Every money mutation renders the actor + timestamp inline; nothing
  money-touching is anonymous.
- Every destructive/irreversible action uses the §10 confirmation
  hierarchy; claret is its only home.
- Tables: 13px, mono numerals right-aligned, header `SortTh`, sticky
  totals where sums exist, skeleton rows on >150ms loads.
- Empty states use the illustrated `adminGeneric` kind — never bare text.
- Exports: CSV always available where a table exists; filename pattern
  `50pick_{report}_{period}_{generated}.csv` shown in the toast.
- All timestamps EAT, mono, `07 Jul · 09:41` format; ISO on hover.
