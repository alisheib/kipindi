> **STATUS: authoritative build brief — FOR CLAUDE FABLE (highest design access).**
> This single file is the complete, self-contained source of truth for producing **four
> professionally-designed 50pick documents**. Every fact and number below was verified against the
> live code and docs on **2026-07-16**. Build from THIS file alone — you do not need to read the
> codebase. If any instruction here conflicts with something you find elsewhere, THIS file wins.
> Where you see **`VERIFY`**, state the caveat in the document rather than inventing a value.

# 50pick — Four-Document Build Brief (for Claude Fable)

## Part 0 — Your task, in one screen

Produce **four self-contained HTML documents**, each of which opens in a browser and prints to a
clean **A4 PDF** (the user will do `Ctrl-P → Save as PDF`). Output them here:

| # | File | Title | Audience | Tone |
|---|------|-------|----------|------|
| 1 | `reports/01-admin-workbook.html` | **50pick Admin Technical Workbook** | Internal ops & compliance staff | Precise, procedural, do-this-then-that |
| 2 | `reports/02-technical-stack.html` | **50pick Technical Stack Report** | Technical reviewers / investors | Confident, architectural |
| 3 | `reports/03-platform-overview.html` | **50pick Platform Overview** | Mixed / semi-external (partners, regulator-facing) | Editorial, trustworthy |
| 4 | `reports/04-money-rulebook.html` | **50pick Money Rulebook** | Owner & finance (internal) | Exact, numbers-first |

**Hard rules (do not break):**
1. **Self-contained.** Everything inline: CSS in a `<style>` tag, logo as inline `<svg>` (source in
   §1.4), no external image files except optional Google-Fonts `<link>` (allowed). No build step.
2. **Use ONLY the numbers, routes, and facts in this brief.** No invented figures, no lorem-ipsum.
3. **Currency is TZS** (Tanzanian Shilling), whole shillings, thousands separators (`TZS 100,000`).
4. **Follow the shared design system in Part 1** so the four read as one branded suite.
5. **Print-correct:** include the `@page`/print CSS in §1.7 so the navy background and gilt survive
   printing (browsers strip backgrounds by default — the CSS forces colour).
6. When a fact is marked **LIVE**, it is shipped today; **PLANNED** = designed/not built;
   **SUPERSEDED** = do not use.

**Be creative _within_ the brand.** The palette, fonts, logo, and colour-discipline rules are fixed.
Layout, composition, cover art (gilt line-art / etched SVG), section dividers, tables, and callouts
are yours to make beautiful. No mascots, no neon, no pure black.

---

## Part 1 — Shared design system (apply to all four documents)

### 1.1 Brand in one line
**50pick — "the wisdom of YES & NO."** A Tanzania-licensed pari-mutuel prediction market. Voice:
**editorial confidence, trust and clarity over spectacle.** Tagline you may use on covers:
**"Predict events. Not chance."** Signature look: **gilt-on-royal-navy**, with the **YES-green ↔
NO-rose** duality.

### 1.2 Exact palette (sRGB hex — match, do not approximate)

| Role | Hex | Use |
|------|-----|-----|
| Canvas — deep | `#0A0E33` | page background (base) |
| Canvas — royal | `#060A50` | background gradient partner, hero |
| Panel | `#131645` | cards, callout blocks, table bodies |
| **Gilt / gold (primary accent)** | `#D49824` | **earned-money & emphasis ONLY** — money figures, seals, key rules, CTA-style highlights |
| Gilt — light | `#FEC766` | gold gradient top, hover sheen |
| Gilt — deep | `#B97F12` | gold gradient bottom, rule underlines |
| Royal / brand blue | `#4983F4` | links, active/nav accents, diagram strokes |
| Royal — light | `#6CA2FF` | secondary brand accent |
| Aqua / live | `#36BABA` | "live / in-play / now" only, ≤8% of any page |
| **YES** (win / affirmative) | `#00A24F` | YES side, wins, positive |
| **NO** (loss / negative) | `#E6424C` | NO side, losses, negative |
| Claret (editorial) | `#A4273F` | editorial weight, regulator/footer crest, destructive; never next to NO-rose or on money |
| Ink (primary text) | `#F5F8FF` | body text on dark |
| Muted ink (secondary) | `#C8CBCF` | captions, secondary text |
| Logo green | `#1EA362` | inside the mark only |
| Logo rose | `#B03A3E` | inside the mark only |
| Logo gilt | `#E3BC66` | inside the mark only (needle + hub) |
| Logo center dot | `#1A2140` | inside the mark only |

### 1.3 Colour discipline (INVIOLABLE)
- **Gold = earned-money & top-priority emphasis ONLY** (money totals, rates, resolved "seal", the one
  key takeaway of a section). Never use gold as decorative filler.
- **YES-green / NO-rose are semantic** — never inverted, never reused for a non-money meaning.
- **Claret** = editorial/regulatory/destructive accents only. Never on a money surface, never beside
  NO-rose.
- **Aqua** = "live/now" finishing accent only, sparse.
- **Single dark theme. No light mode.** Never pure black (`#000`), never neon.

### 1.4 Logo — inline SVG source (paste these verbatim)

**Colour mark** (use on dark covers & headers):
```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="50pick" role="img">
  <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="#1EA362"/>
  <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="#B03A3E"/>
  <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#E3BC66" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="5" fill="#E3BC66"/>
  <circle cx="50" cy="50" r="1.7" fill="#1A2140"/>
</svg>
```

**Monochrome / white mark** (use on gilt or busy backgrounds, or as a faint watermark):
```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="50pick" role="img">
  <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="rgba(247,248,252,0.3)"/>
  <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="rgba(247,248,252,0.14)"/>
  <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#F7F8FC" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="5" fill="#F7F8FC"/>
</svg>
```

**The mark's meaning (use in cover art / a "the mark" caption if you like):** two semicircles split
vertically — **green YES** on the left, **rose NO** on the right — crossed by a **gilt needle** with
a **gilt hub**: the duality of YES & NO, weighed. Repo source files (for reference only; inline the
SVG above rather than linking): `public/brand/mark-color.svg`, `mark-white.svg`, `mark-dark.svg`,
`mark-simplified.svg`; `public/favicon.svg`; raster `public/icons/mark-color-512.png`.

### 1.5 Typography (Google Fonts — the one allowed external link)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```
- **Sora** — display / headings (400–800).
- **Inter** — body / running text (400–700). Body default.
- **JetBrains Mono** — numerals, rates, labels, eyebrows, code, route paths (400–600).
- **Rule:** every money figure and rate renders in **JetBrains Mono**. Every heading in **Sora**.

### 1.6 Ready-to-use CSS foundation (drop into each doc's `<style>`, then extend)
```css
:root{
  --canvas:#0A0E33; --royal:#060A50; --panel:#131645;
  --gold:#D49824; --gold-light:#FEC766; --gold-deep:#B97F12;
  --brand:#4983F4; --brand-light:#6CA2FF; --aqua:#36BABA;
  --yes:#00A24F; --no:#E6424C; --claret:#A4273F;
  --ink:#F5F8FF; --muted:#C8CBCF; --border:rgba(245,248,255,.12);
  --g-gold:linear-gradient(180deg,var(--gold-light),var(--gold-deep));
  --hero-grad:linear-gradient(135deg,#0A0E33 0%,#060A50 55%,#131645 100%);
  --r-sm:4px; --r-md:8px; --r-lg:12px; --r-xl:16px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);
  font-family:Inter,system-ui,"Helvetica Neue",Arial,sans-serif;
  font-size:14px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4{font-family:Sora,Inter,sans-serif;line-height:1.2;letter-spacing:-.01em;margin:0 0 .4em}
h1{font-size:36px;font-weight:800} h2{font-size:28px;font-weight:700}
h3{font-size:22px;font-weight:600} h4{font-size:18px;font-weight:600}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--gold)}
.num,.rate,code,.mono{font-family:"JetBrains Mono",monospace}
a{color:var(--brand-light);text-decoration:none}
.page{max-width:820px;margin:0 auto;padding:56px 64px}          /* content column */
.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 24px}
.callout{border-left:4px solid var(--gold);background:rgba(212,152,36,.08);
  border-radius:var(--r-md);padding:14px 18px;margin:18px 0}
.callout.warn{border-left-color:var(--no);background:rgba(230,66,76,.08)}
.callout.info{border-left-color:var(--brand);background:rgba(73,131,244,.08)}
.tile{background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);
  padding:18px 20px;text-align:left}
.tile .figure{font-family:"JetBrains Mono",monospace;font-size:32px;font-weight:600;color:var(--gold)}
.tile .label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.grid{display:grid;gap:16px}
.grid-3{grid-template-columns:repeat(3,1fr)} .grid-2{grid-template-columns:repeat(2,1fr)}
table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border)}
th{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted)}
td.num,th.num{font-family:"JetBrains Mono",monospace;text-align:right}
.tag{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:11px;
  padding:2px 8px;border-radius:999px;border:1px solid var(--border)}
.tag.yes{color:var(--yes);border-color:var(--yes)} .tag.no{color:var(--no);border-color:var(--no)}
.tag.live{color:var(--aqua);border-color:var(--aqua)}
.tag.gold{color:var(--gold);border-color:var(--gold)}
.route{font-family:"JetBrains Mono",monospace;color:var(--brand-light)}
hr{border:0;height:1px;background:var(--border);margin:32px 0}
```

### 1.7 Cover, running header/footer, and print CSS (shared skeleton)
Give every document the same **cover page** (full-bleed `--hero-grad`, large colour mark, eyebrow,
title, subtitle, date `2026-07-16`, version `v1.0`, a thin gilt rule, and a **confidential** line),
the same **running footer** (`50pick — the wisdom of YES & NO` · document title · page number), and
a faint **white-mark watermark** on section-divider pages.

```css
@page{ size:A4; margin:18mm 16mm; }
@media print{
  body{background:var(--canvas)}
  .cover{page-break-after:always}
  h2{page-break-after:avoid} table,.panel,.callout,.tile{page-break-inside:avoid}
  .page{padding:0}
}
.cover{min-height:100vh;background:var(--hero-grad);display:flex;flex-direction:column;
  justify-content:center;padding:72px;position:relative}
.cover svg{width:96px;height:96px}
.cover .doc-title{font-family:Sora;font-size:48px;font-weight:800;margin:24px 0 8px}
.cover .rule{width:120px;height:3px;background:var(--g-gold);margin:24px 0}
.confidential{position:absolute;bottom:48px;left:72px;font-family:"JetBrains Mono",monospace;
  font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
```
Footer text (all docs): **"CONFIDENTIAL · © 2026 50pick · For internal use"** (Doc 3 may soften to
"CONFIDENTIAL DRAFT" since it is semi-external — your call).

### 1.8 Illustration idiom
Gilt line-art / etched SVG, **single gold accent**, no mascots, no baked-in text (keep art
language-neutral). Good motifs: the split YES/NO mark, a balance/needle, a pooled-liquidity ring, a
gilt corner flourish, thin topographic contour lines behind covers.

---

## Part 2 — DOCUMENT 1: Admin Technical Workbook / Operations Manual

**Purpose:** a step-by-step operating manual — everything a 50pick admin does, from generating a poll
to paying winners to validating a player. Structure it as numbered **SOPs** (Standard Operating
Procedures) with clear "Steps 1–n", a master **route map** table, and callout boxes for the
dangerous/irreversible bits. Use the `.route` style for every path.

### 2.0 Cover + "How this workbook is organised" + a one-page **Admin Route Map** table
List every console with its route and one-line purpose (all confirmed to exist):

`/admin` (overview) · `/admin/markets`, `/admin/markets/new`, `/admin/markets/[id]` ·
`/admin/ai-polls` (+`[id]`) · `/admin/candidates` · `/admin/proposals` · `/admin/sources` ·
`/admin/ai-usage` · `/admin/resolver-queue`, `/admin/resolver/[id]` · `/admin/objections` ·
`/admin/settlement` · `/admin/players` (+`[id]`, `/cohorts`) · `/admin/kyc/[id]` · `/admin/approvals`
· `/admin/aml` · `/admin/payments` · `/admin/finance` · `/admin/reports` · `/admin/compliance` ·
`/admin/self-exclusions` · `/admin/privacy` · `/admin/retention` · `/admin/audit` ·
`/admin/moderation` · `/admin/bonuses` · `/admin/invites` (+`[id]`) · `/admin/affiliate` ·
`/admin/events` · `/admin/insights` · `/admin/live` · `/admin/system` · `/admin/config` ·
`/admin/2fa/setup` · `/admin/totp-verify`.

### 2.1 SOP — Signing in & security (do first, every session)
- All `/admin/*` pages require an admin session; a non-admin is redirected to `/auth/admin`.
- **TOTP / 2FA is enforced.** Without a valid TOTP cookie you are bounced to `/admin/totp-verify`;
  first-time enrolment is at `/admin/2fa/setup`. Privileged (money) actions demand a fresh step-up.
- **Roles:** `PLAYER · AGENT · MODERATOR · ADMIN · COMPLIANCE · SUPPORT`. **Money actions
  (settlement, wallet, AML) are ADMIN/COMPLIANCE only** — never MODERATOR.
- **Everything you do is logged** to an HMAC-chained, append-only audit log, reviewable at
  `/admin/audit`. Assume every click is on the record.

### 2.2 SOP — Generating polls (markets)
**Path A — Manual creation (`/admin/markets/new`), 4-step wizard:**
1. **Question** — Title in English (**≥10 characters**), optional Swahili + Chinese; pick a category
   (sports / macro / weather / crypto / culture / tech / other).
2. **Resolution source** — a public, authoritative, reachable source URL (`https://…`) + the
   resolution timestamp (when the real-world event settles).
3. **Resolution criterion** — the binding written rule (**≥30 characters**) that decides YES vs NO.
4. **Review & Publish** — publishing routes to `/admin/markets`. At creation the poll **freezes its
   fee rates** (`feeSnapshot`) — later config changes will NOT reprice it.

**Path B — AI-assisted generation (`/admin/ai-polls`):** a 4-layer pipeline —
L1 **Generate** (Claude Haiku 4.5, optional live web search, date-anchored) → L2 **Validate/sanitise**
(hard filters: banned categories politics/religion/adult/violence, past/invalid dates, missing source,
duplicates, XSS) → L3 **Score** (confidence floor, lead-time window, dedup, trusted source) →
L4 **Human officer review** on `/admin/ai-polls` (`[id]` to edit): **approve / edit / reject →
publish**. **The AI never publishes on its own — a human always has the final say.** Operator knobs
(no redeploy): web-search toggle, daily target, min confidence, min lead hours, max horizon, max batch.
- **Supporting surfaces:** `/admin/candidates` (candidate pipeline), `/admin/sources`
  (**source-trust registry — a market cannot publish without an admin-enabled source URL**),
  `/admin/proposals` (player-proposed markets), `/admin/ai-usage` (Claude token spend).
- **Trilingual note:** English is canonical for settlement; Swahili & Chinese are display translations.

### 2.3 SOP — Resolving & settling a market (THE money-critical flow — 3 separate stages)
> **Callout (info):** adjudication and payment are deliberately separated so a dispute can still
> change the outcome *before any money moves*.

- **Stage 1 — Two-officer resolution ceremony.** Queue at `/admin/resolver-queue`; open a market at
  `/admin/resolver/[id]`. Officer A reviews the declared source + resolution criterion + final tipping
  bar + the optional **AI-Sentinel recommendation** (a suggestion, not a verdict) and records a
  **Stage-1** attestation (YES / NO / VOID) with an evidence excerpt. **A different Officer B**
  counter-signs **Stage 2** to seal it. Self-countersign is blocked. **No money moves** at this stage —
  positions stay OPEN, the pool stays whole.
- **Stage 2 — Objection window.** Sealing opens a **24-hour objection window** (configurable,
  `objectionWindowHours`, at `/admin/config`). An **open objection freezes settlement**; rule on it at
  `/admin/objections` — an upheld objection can VOID or reverse the outcome while money is still pooled.
- **Stage 3 — Settlement / payout (`/admin/settlement`).** Auto-payout is currently **PAUSED** (it only
  runs when the env flag `AUTO_SETTLE=true`; today settlement is **manual** until the payment
  aggregator is integrated). For a READY market: press **"Settle now"** → a confirm modal states the
  verdict, pool, and open positions → **"Settle & pay winners."** Requires ADMIN/COMPLIANCE + step-up
  TOTP. Guards re-check under a lock: cannot pay before the window closes, cannot pay with an objection
  standing, cannot pay twice.
> **Callout (warn):** **Settlement is irreversible** — money paid into player wallets cannot be
> clawed back. Read the confirm modal every time.

- **Emergency void / refund:** the emergency-void control on `/admin/markets` voids a market and
  **refunds every open stake in full (zero fee)**; requires a reason (≥5 chars), atomic + audited.
  This is also the standard path for one-sided markets.

### 2.4 SOP — Checking orders / bets
> **Callout (info):** there is **no single "payment status" column.** An order lives in **two**
> lifecycles:
> - **Bet lifecycle** — `Position.status`: `OPEN · WIN · LOSS · VOID · CASHED_OUT`.
> - **Money lifecycle** — `Transaction.status`: `PENDING · PROCESSING · AML_REVIEW · CONFIRMED ·
>   FAILED · REVERSED · CANCELLED`. Providers: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Mixx,
>   TTCL Pesa, Card, Bank transfer, Internal.

- **Per-market bets:** `/admin/markets/[id]` — every position with Ref, predictor (masked phone),
  side, stake, projected payout, **status**, placed time; filter by side/status, search by
  phone/name/id. Shows the poll's frozen fee arithmetic (smaller side = prize, commission, fee charged,
  worst-winner-ratio) and flags one-sided / lopsided pools.
- **Per-player bets & money:** `/admin/players/[id]`.
- **Payment operations:** `/admin/payments` (next SOP).

### 2.5 SOP — Validating players (KYC / AML / SOF)
- **Queues:** `/admin/approvals` shows three — **KYC awaiting verification**, **AML pending**, **SOF
  declarations** — each row deep-links to its workstation.
- **KYC decision (`/admin/kyc/[id]`):** review ID front, ID back, and selfie + applicant details
  (masked NIDA/phone); read the **risk score** and its factors; note the **maker-checker threshold** —
  above it a **second officer** is required. An auto checklist covers: NIDA verified, 18+, all docs
  present, SOF on file. Then **Approve** or **Reject** (reason required on reject; self-review blocked;
  idempotent). The player is emailed on decision.
- **KYC gate rule:** KYC is **NOT** required to place a bet (Tanzania Gaming Board model) — it **gates
  withdrawals**.
- **AML / EDD (`/admin/aml`):** review queue for `AML_REVIEW` transactions + a suspicious-bet detector
  (stake spike ≥10× the 30-day median, or velocity ≥100 bets/24h). **Two-officer rule** for amounts
  **≥ TZS 1,000,000** (`TWO_PERSON_THRESHOLD_TZS = 1_000_000`): a first officer records Stage 1, a
  **different** officer counter-signs. *(Note: some older docs say TZS 5M — that was an audit finding
  that has been fixed; the live threshold is **TZS 1M**, kept equal to the AML-hold trigger so no
  withdrawal slips through single-officer.)*
- **Source-of-Funds (SOF):** reviewed on `/admin/approvals`; auto-triggered when a deposit is a single
  **≥ TZS 1M** or rolling-30-day **≥ TZS 5M**.
- **Player account admin (`/admin/players` + `[id]`):** search & filter (masked phones); **suspend /
  restore**, **reset password**, **set email**, **data export**. ADMIN/COMPLIANCE-tier, step-up TOTP,
  audited. (Two-person approval on wallet freeze/reversal/closure is *target architecture, not yet
  enforced* — note this honestly.)

### 2.6 SOP — Payments, finance, config & reports (reference SOPs)
- **`/admin/payments`** — per-MNO health (success rate, p50/p95 latency), **kill-switches** to pause
  deposits/withdrawals per provider, a **retry queue** for failed txns, and **reconciliation** (ledger
  vs PSP; drift must be **TZS 0**). *(Live telemetry from real txns; settlement-file feed pending the
  aggregator contract.)*
- **`/admin/finance`** (ADMIN/COMPLIANCE) — GGR / NGR, deposits/withdrawals, operator margin, wallet
  liability, house accounts from the **double-entry ledger**, statutory levies (TRA + GBT on
  commission).
- **`/admin/config`** — live-editable rate & policy knobs (commission, fee ceiling, cash-out fee +
  free-exit grace, withdrawal fee + gateway share, TRA/GBT rates, objection window) + a **fee
  simulator** and a "worst winner ratio" guard. **Changes apply to FUTURE polls only.**
- **`/admin/reports`** — regulator pack (Daily operations, GBT monthly, FIU SAR, ISO 27001 export, KYC
  re-verify roster, self-exclusion register, RG engagement, match-integrity). Maker-checker signing;
  HMAC-signed; every generation/download audited.
- **Also available:** `/admin/compliance`, `/admin/self-exclusions`, `/admin/privacy` (DSAR),
  `/admin/retention`, `/admin/moderation`, `/admin/audit`; growth: `/admin/bonuses`, `/admin/invites`,
  `/admin/affiliate`, `/admin/events`, `/admin/insights`, `/admin/live`, `/admin/system`.
- **Not part of the product:** there is **no exchange / order-matching** surface (50pick is pool
  betting), and **seeded/guaranteed liquidity is design-only, not built** — do not document it as a
  live feature.

### 2.7 Suggested layout for Doc 1
Cover → route-map table → SOP 2.1…2.6 each as its own section with numbered steps, a small
"Roles & TOTP" chip row at the top of money SOPs, warn-callouts on the irreversible actions, and a
closing **"Daily / weekly admin checklist"** page you compose from the SOPs (e.g. clear resolver
queue, action objections, settle READY markets, clear KYC/AML queues, check payment reconciliation
drift = 0, review audit anomalies).

---

## Part 3 — DOCUMENT 2: Technical Stack Report

**Purpose:** what 50pick is built with and how it fits together. Confident and architectural. Use
dependency **tables**, a simple **inline-SVG architecture diagram** (Cloudflare → Railway [Next.js +
Postgres + Redis]), and a prominent **"Cloudflare R2 — coming soon"** panel.

### 3.1 Stack at a glance
- **App:** `fiftypick` (v0.1.0) — *"Licensed pool-based time-window sports betting platform — Tanzania
  first."* Brand **50pick**; codebase name **Kipindi**.
- **Framework:** **Next.js ^16** (App Router, React Server Components, server actions).
- **UI runtime:** **React 19**.
- **Language:** **TypeScript 5.7** (strict; lint & typecheck both `tsc --noEmit`).
- **Runtime:** **Node 20+**.

### 3.2 Key dependencies (table — package · purpose)
| Package | Purpose |
|---|---|
| `next` ^16 / `react` 19 | Web framework + UI (App Router, RSC, server actions) |
| `prisma` / `@prisma/client` ^6.5 | ORM + generated client over **PostgreSQL** |
| `@anthropic-ai/sdk` | **AI engine — Anthropic Claude**: poll generation, the "Market Sentinel" auto-resolver, and the help chatbot. **No OpenAI.** |
| `tailwindcss` ^3.4 (+ postcss, autoprefixer) | Styling / design tokens |
| `lucide-react` + 129 custom glyphs | Iconography |
| **`postmark`** | **Transactional email** *(not Resend)* |
| `web-push` | Web push notifications |
| **`pdfkit`** + `exceljs` | PDF + XLSX report generation |
| `qrcode` | Invite/share QR codes |
| `zod` | Runtime input validation |
| `playwright` + `axe-core` + `tsx` | Browser/e2e, accessibility audits, TS script runner |

Testing is **~70 standalone `tsx` test scripts** (`test:wallet`, `test:kyc`, `test:fee-model`,
`test:trilingual`, …) orchestrated by `test:all` / `predeploy` — **no Jest/Vitest**.

### 3.3 Data layer
- **PostgreSQL** via Prisma. Money fields are `Decimal(18,2)`, whole TZS. ~19 tables.
- **Feature-flagged DAL** selected by env `USE_PRISMA_DAL`: `true` → Prisma/Postgres (production, already
  flipped); `false` → an in-memory `Map` store (local dev runs the whole app with zero DB). Core
  entities route through `src/lib/server/store.ts` + `prisma-dal.ts`.

### 3.4 Hosting & deployment (Railway)
- **Railway** hosts the `kipindi` service + a managed **PostgreSQL** tile + a **Redis** service (rate
  limiting). No disk volumes — all state in Postgres.
- **Deploy flow:** push to `main` → Railway build → production `start` =
  `prisma migrate deploy && node scripts/seed-test-float.mjs && next start` (**every deploy
  auto-applies pending migrations**, seeds a test float, boots Next.js). Migrations authored locally
  with `prisma migrate dev`.
- **Production:** `kipindi-production.up.railway.app`, fronted by the custom domain **`www.50pick.tz`**.
- **Required env:** `DATABASE_URL`, `USE_PRISMA_DAL=true`, `SESSION_SECRET` (≥32), `OTP_PEPPER` (≥16),
  `NEXT_PUBLIC_APP_URL`, `AUDIT_CHAIN_SECRET` (distinct from SESSION_SECRET), + per-provider webhook
  HMAC secrets (Selcom / AzamPay / Mixx / Postmark).

### 3.5 ⭐ Cloudflare & R2 — **PLANNED, not yet in use** (feature this panel)
> **Callout (gold panel titled "Cloudflare R2 — coming soon"):**
> **Today (LIVE):** user avatars and KYC documents (ID front/back, selfie) are stored as **base64
> data-URLs inside PostgreSQL TEXT columns** — `User.avatarDataUrl @db.Text`, and
> `KycDocument.storageKey` holds the base64 image (decoded server-side and streamed by the admin
> viewer). **Not `bytea`, not object storage.** No S3/R2 SDK is installed and **no `R2_*` env vars
> exist.** Cloudflare's DNS + CDN + WAF layer for `50pick.tz` is being set up, and Redis is on Railway
> — but **storage is still in the database.**
>
> **Planned (NEXT):** per `docs/CLOUDFLARE-SETUP-GUIDE.md`, target architecture is **Cloudflare (DNS +
> CDN + WAF + R2) in front of Railway**. Step 8 provisions an R2 bucket **`kipindi-kyc`** + an R2 API
> token, adds env vars `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
> R2_BUCKET_NAME=kipindi-kyc / R2_ENDPOINT`, and the code task is *"move base64 from Postgres → R2
> signed URLs."* The `storageKey` column and the "signed-URL redirect" TODO are the **pre-built seam**
> for this migration. Planned cost ≈ **$25–51/month** (Cloudflare Pro + WAF, R2, Railway Redis, Sentry).

### 3.6 Architecture & disciplines (narrative + the diagram)
- **Type:** Tanzania-licensed, regulator-ready **pari-mutuel (pool-based) prediction market** on
  Next.js 16 App Router with the feature-flagged DAL. Server logic under `src/lib/server/` (auth,
  wallet, KYC, markets, AI provider, notifications, audit chain, locks, rate-limit).
- **AI subsystem:** Anthropic Claude powers poll/market generation ("submit_poll" tool), the "Market
  Sentinel" auto-resolver, and the help chatbot — all metered in an `AiUsageEvent` table with cost
  caps.
- **Money/compliance discipline:** HMAC audit chain, OTP brute-force defence, webhook
  HMAC + replay + idempotency, wallet atomicity via locks, two-officer resolution, KYC/AML gates.
  In-process locks/rate-limit are slated to move to Postgres advisory locks / Redis before horizontal
  scaling.
- **i18n:** **trilingual EN / SW / ZH** (`enum Locale { EN SW ZH }`, default SW). English is canonical
  for settlement; SW & ZH are display translations generated in the same Claude call. CJK covered by a
  system-font fallback stack (no webfont download). **Not Arabic.**
- **"Skills"/toolchain used to build it:** TypeScript + Next.js/React, Prisma, Tailwind, Playwright +
  axe-core for QA, a `tsx` script-based test gauntlet, PDFKit/ExcelJS for reports, and Claude
  (Anthropic SDK) as the AI engine.
- **Diagram (build as inline SVG):**
  `Player (mobile-first PWA)` → `Cloudflare DNS/CDN/WAF (+ R2 planned)` → `Railway: Next.js 16
  (RSC + server actions)` → `Prisma DAL` → `PostgreSQL` ; side boxes: `Redis (rate-limit)`,
  `Anthropic Claude (AI)`, `Postmark (email)`, `Mobile-money PSPs (planned: Selcom/AzamPay)`.

---

## Part 4 — DOCUMENT 3: Platform Overview

**Purpose:** what 50pick is, what it does, the regulations & policies, how profit and loss happen, and
the duties on both sides. Editorial and trustworthy. Cover with a strong "what it is" one-pager, a
**regulation matrix**, and a **player-vs-operator duties** two-column spread.

### 4.1 What 50pick is
50pick — **"the wisdom of YES & NO"** — is a **Tanzania-licensed pari-mutuel prediction market.**
Players back **YES** or **NO** on real-world propositions across **8 categories** (sports, weather,
macro, crypto, culture, tech, other). All stakes on a market join **one pool**; at settlement the
operator takes a **capped commission** and the **net pool is paid pro-rata to the correct side only.**
A live **conviction dial** shows the implied probability, updating with every bet. **Mobile-first,
dark-first, trilingual (EN/SW/ZH).** Real money under a gambling licence → **trust and clarity over
spectacle.**
- **Player surfaces:** landing, `/markets` (+ detail/bet), `/live`, `/results`, `/leaderboard`,
  `/positions` (+ performance), `/watchlist`, `/proposals` (propose a market for a reward), `/wallet`
  (+ deposit/withdraw via six mobile-money providers), `/profile` (KYC, source-of-funds, responsible
  gambling, sessions, security, notifications, activity, invite), `/fairness`, `/help`, `/legal/*`.
  Auth is phone + password (OTP paths preserved for when an SMS provider is signed).

### 4.2 Regulations & compliance (build as a matrix)
- **Regulator:** **Gaming Board of Tanzania (GBT)** — license **in progress** (application needs GLI
  certification first). Also **TRA** (tax) and **FIU** (financial intelligence, POCA Cap 423).
- **Standards applied:** **GLI-33** (Event Wagering Systems — primary; wager records, cancellation/void
  policy, pari-mutuel pool handling), **GLI-19** (Interactive Gaming — registration, age/identity,
  player-funds, sessions, RG tools), **GLI-27** (network security). Targeting **ISO 27001**. (RNG is
  N/A for outcomes — resolution is human two-officer.)
- **Live controls:** HMAC-chained append-only audit log; **two-officer market settlement**;
  **two-officer AML approvals ≥ TZS 1M**; source-trust registry (no publish without an approved
  source); **24-hour objection window** gating payout; self-exclusion / cooling-off / deposit-limit /
  SOF gates; KYC-gated withdrawals; rate limiting; single active session; Postgres advisory locks on
  money paths.
- **Planned (be honest it's not all built):** geo-fencing to Tanzania, tagged-release change
  management, atomic market-close enforcement, ledger-as-source-of-truth + hourly reconciliation,
  durable exactly-once settlement, authoritative NIDA integration, sanctions/PEP screening, KYC docs
  to R2 signed URLs, off-host WORM audit export, RG hardening.
> **Callout (warn):** the platform's headline **load/concurrency numbers were measured against the
> in-memory store, not Postgres**, and must **not** be quoted to the GBT until the Postgres-backed load
> suite runs. (State this caveat if you cite any performance figure; better to omit raw load numbers.)
- **Contract-pending integrations:** payment aggregator (Selcom/AzamPay), SMS/OTP (Beem/AT/Twilio),
  authoritative NIDA mTLS, Sportradar match-integrity feed (currently a stub; football resolution is
  manual), GBT pre-application meeting, GLI lab + ISO 27001 audit.

### 4.3 Policies & the two-sided contract (player-vs-operator duties spread)
**What the player must do / accept:**
- Be **18+**; accept the current Terms (recorded).
- **KYC to withdraw** (NIDA number + ID front/back + selfie); betting is allowed pre-KYC.
- Declare **source of funds** when triggered (single deposit ≥ TZS 1M or 30-day ≥ TZS 5M).
- Play within their own responsible-gambling limits.

**What 50pick commits to (money promises — quote these):**
- **"A winning bet is never paid less than it staked."**
- **"We never take more than a third of what you win."**
- **Players are never taxed on their own money** (the 15% withdrawal withholding tax was removed
  2026-07-14). The only direct player charges are the capped pool commission (via payout), a **1%
  withdrawal fee**, and a **10% early-cash-out fee** only if exiting after the free window.
- **Responsible gambling, server-enforced:** deposit limits (increases deferred 24h, decreases
  immediate), reality-check/session timer, cooling-off, self-exclusion — checked on every
  bet/deposit/withdraw. Helpline placeholder **0800 11 0011**.
- **Fairness (`/fairness`):** provably-fair pari-mutuel math, two-officer resolution against a public
  source, HMAC audit chain, published void policy, 24-hour objection window.

### 4.4 How profit & loss happen (mechanism only — exact numbers live in Doc 4)
- **Revenue = a capped commission on each settled pool.** `fee = min(commission × pool, ceiling ×
  smaller side)`; `netPool = pool − fee`; each winner gets `stake × (netPool / winning-side pool)`.
  Rates are **frozen per market at creation** so retuning never reprices placed bets.
- **Outcome-neutral:** the house takes a rake and does **not** hold a position — it does not care which
  side wins. (This is why house-backed liquidity was rejected — it would break neutrality.)
- **Where the platform earns nothing:** a **one-sided market** (all stakes on one side) has no opposing
  pool → at settlement **everyone is refunded at 0% fee**. A **voided** market also refunds in full at
  zero fee. A **lopsided** market hits the fee ceiling, so the operator takes *less* than the headline
  commission.
- **Taxes come only out of the operator's commission** (TRA + GBT), never the player. Reporting: **GGR =
  Stakes − Payouts − Refunds**; **NGR = GGR − Bonus − Fees**; **Hold% = GGR / Stakes**; house balances
  come from the double-entry ledger.

---

## Part 5 — DOCUMENT 4: The Money Rulebook (numbers only)

**Purpose:** the numbers we must keep in mind — commission, per-bet, cash-out / early cash-out, limits,
fees, taxes. Numbers-first. Lead with **big gold figure tiles**, then the verified fee table, worked
examples, and a one-page **"Rates cheat-sheet"** (defaults + admin bounds). Every figure below is
verified in `src/lib/payout.ts` and `docs/FEE-MODEL-DECISION-2026-07-14.md` (SHIPPED).

> **Callout (info):** the pricing model is **whole-pool pari-mutuel** — **no odds margin, no
> overround, not an AMM.** Rates are **frozen per poll** at creation (`feeSnapshot`); admin changes
> apply to **future polls only.**

### 5.1 Commission (our cut) — the headline rule
> ### "Our commission is 10% of the pool, but never more than a third of the smaller side."
```
pool        = yesPool + noPool
smaller     = min(yesPool, noPool)        # the prize
commission  = 10% × pool
ceiling     = ⅓  × smaller
fee         = min(commission, ceiling)    # the rule
netPool     = pool − fee
payout(p)   = round(p.stake / winningPool × netPool)
```
- `DEFAULT_COMMISSION_RATE = 0.10` · `DEFAULT_FEE_CEILING_RATE = 1/3`.
- **Admin bounds:** commission **0–30%** (`MAX_COMMISSION_RATE = 0.30`); ceiling **0–100%**
  (`MAX_FEE_CEILING_RATE = 1.0`, warn above 50%).
- **Legacy fallback:** polls created before fee-snapshots existed use **0.09** (9%); the ⅓ ceiling
  still applies (so those winners can only be paid *more*).
- **The 10%/⅓ rule crosses seamlessly at 70/30** — no cliff, no threshold (a step function would be
  gameable).

**Verified fee table — pool 100,000** (present this as the centrepiece table):

| YES / NO | fee (TZS) | winner (big side) gets back | our share of losers' money |
|---|---:|---:|---:|
| 50 / 50 | 10,000 | 1.80× | 20% |
| 60 / 40 | 10,000 | 1.50× | 25% |
| **70 / 30 (seam)** | **10,000** | **1.29×** | **33%** |
| 80 / 20 | 6,667 | 1.167× | 33% |
| 90 / 10 | 3,333 | 1.074× | 33% |
| 95 / 5 | 1,667 | 1.035× | 33% |
| 100 / 0 | 0 | full refund | — |

**Worked example (the poll that drove the fix):** YES 300,000 / NO 10,500 → `fee = min(31,050, 3,500)
= 3,500`; a **100,000** stake pays **102,333** — and the fee is **3,500 whether YES or NO wins**
(outcome-neutral).

### 5.2 Per-bet fee & "GBT" — clear the confusion
- **There is NO per-bet or per-transaction fee.** Placing a bet records `fee: 0`. Deposits are `fee: 0`.
- **"GBT" is NOT a per-bet fee.** GBT = **Gaming Board of Tanzania**; the **GBT levy = 5% of our
  commission** (`DEFAULT_GBT_LEVY_ON_COMMISSION_RATE = 0.05`), paid out of the house's take — never
  charged to a player. (See §5.6.)

### 5.3 Cash-out & early cash-out (windows measured from when the bet was placed)
| Window | Timing (default) | What the player gets |
|---|---|---|
| **FREE exit** | 0 – 5 min after placing | full stake back, **fee 0** |
| **PAID exit** | next 15 min (to ~20 min) | stake × **0.90** (**10% fee**) |
| **LOCKED** | after that | no exit — rides to settlement |

- `DEFAULT_CASHOUT_FEE_RATE = 0.10` · `DEFAULT_FREE_EXIT_GRACE_MINUTES = 5` ·
  `DEFAULT_PAID_EXIT_WINDOW_MINUTES = 15`. **Admin bounds:** cash-out fee **0–30%**, grace **0–60 min**,
  paid window **0–1440 min**.
- **Runway rule:** cash-out is only offered if the bet had **≥ the free-window (5 min)** of betting time
  left when placed. A ≤3-minute poll, or a last-moment bet, gets **no cash-out at all.**
- Selling always shuts at **selection close**, whichever comes first. **Bonus-funded bets cannot be
  cashed out.** The early-exit fee is now **house revenue** (whole stake leaves the pool).
- *(Doc note: `DEFAULT_CASHOUT_FEE_RATE` is 0.10 = the shipped default; a test file resets a global to
  0.09 — that is a test artifact, not the default.)*

### 5.4 Stake & payout limits (gold tiles)
- **Minimum stake:** **TZS 100.** **Maximum stake:** **TZS 100,000** (conviction dial: base 500 ×
  max multiplier 200). Stake must be a whole integer.
- **Starter balance:** **TZS 0** in production.
- **No maximum-payout cap and no liquidity cap** exist — payout is purely the pari-mutuel share of the
  net pool. (House-backed / seeded liquidity is **design-only, not built** — do not present it as a
  number.)

### 5.5 Deposits & withdrawals
- **Deposits:** **free** (fee 0).
- **Withdrawal fee:** **1%** (`DEFAULT_WITHDRAWAL_FEE_RATE = 0.01`); of that, **0.5%** goes to the
  payment gateway (`DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE = 0.005`), the rest to the house. Admin bound
  **0–5%**. Withdrawals require **KYC APPROVED**; **≥ TZS 1M** routes to **AML review**.
- **NO withholding tax.** The old 15%-of-every-withdrawal tax is **deleted (2026-07-14)**: deposit
  100,000, never bet, withdraw → receive **99,000** (was 85,000).

### 5.6 Taxes — levied ONLY on 50pick's commission
- **TRA tax = 10% of our commission** (`DEFAULT_TRA_TAX_ON_COMMISSION_RATE = 0.10`).
- **GBT levy = 5% of our commission** (`DEFAULT_GBT_LEVY_ON_COMMISSION_RATE = 0.05`).
- **Combined = 15% of commission.** Admin bounds: each 0–50%, sum ≤ 100%.
- **GGR nets out refunds:** `GGR = Stakes − Payouts − Refunds`, so a one-sided/voided poll (full
  refund, zero fee) is taxed on nothing.
> **Callout (warn):** **OPEN — needs a tax ruling.** The ledger books the TRA/GBT levy on the
> *commission slice*; the statutory Daily-Operations report books it on *GGR*. Which base is correct is
> a tax question and is **deliberately unresolved in code.** Present both, flagged as open.

### 5.7 Bonuses, referrals & rewards
- **Bonus wallet (LIVE):** wagering **5× by turnover**, **expiry 30 days**, multiple bonuses FIFO;
  winnings from a bonus bet go to the **real** balance; bonus-funded positions can't be cashed out.
  Cashback (10% deposit-back) is **deferred / not built.**
- **Referral / affiliate:** commission accrues **at settlement** = `(stake / pool) × fee`
  (commission-share mode = 50% of margin, **currently disabled**, 24-month window, cap TZS 250,000).
  **Prize mode (enabled):** first-bet milestone **TZS 10,000**, cap **20 per referrer**, minimum bet
  **TZS 20,000**, requires a deposit. Signup-bonus mode (new 2,000 / referrer 10,000) is disabled.
- **Proposal reward:** **TZS 20,000** on a proposed market's resolution.

### 5.8 One-page "Rates cheat-sheet" (compose this as a single reference table)
Commission 10% (bound 0–30%) · fee ceiling ⅓ of smaller (bound 0–100%, warn >50%) · legacy 9% ·
per-bet fee 0 · cash-out fee 10% (bound 0–30%) · free-exit 5 min (0–60) · paid-exit 15 min (0–1440) ·
min stake 100 · max stake 100,000 · starter 0 · deposit fee 0 · withdrawal fee 1% (0–5%, 0.5% to
gateway) · withholding tax 0 · TRA 10% of commission · GBT 5% of commission · bonus wager 5× / 30 days
· referral prize 10,000 (min bet 20,000, cap 20) · proposal reward 20,000 · AML/two-officer & SOF
single-deposit threshold TZS 1M · SOF 30-day threshold TZS 5M.

> **SUPERSEDED — do NOT use:** the older `.docx` fee proposal ("matched money = 2× the smaller side",
> a 4% TRA / 3% commission / 2% reserve / 1% providers rate stack, and a "15% withholding tax on
> winnings"). None of that shipped. The shipped model is the capped-commission model above.

---

## Part 6 — Corrections & "VERIFY before publishing" list (read before you start)

Fold these into the right documents; do not contradict them:
1. **Email = Postmark**, not Resend. (Doc 2)
2. **Photos/KYC docs = base64 in Postgres TEXT columns**, not `bytea`, not R2. **R2 is planned, not
   built.** (Doc 2 — the headline "coming soon" item.)
3. **AML two-officer & AML-hold threshold = TZS 1,000,000** (confirmed in code). Older docs/README say
   5M — that was an audit finding, now fixed; use **1M**. (Docs 1, 3, 4)
4. **Cash-out default fee = 10%** (a test file's 0.09 reset is an artifact). (Doc 4)
5. **Tax filing base (commission slice vs GGR) is an OPEN question** — present it, don't resolve it.
   (Docs 3, 4)
6. **Do not quote raw load/concurrency numbers to the regulator** — they were measured on the
   in-memory store, not Postgres. (Doc 3)
7. **No "exchange" and no seeded/house liquidity** as live features (pool betting only; liquidity is
   design-only). (Docs 1, 3, 4)
8. **Language is EN / SW / ZH — not Arabic.** English is canonical for settlement. (Docs 2, 3)

---

## Part 7 — Delivery checklist (tick before you hand back)
- [ ] Four files exist: `reports/01-admin-workbook.html` … `04-money-rulebook.html`.
- [ ] Each is fully self-contained (inline CSS, inline SVG mark, only Google-Fonts as an external link).
- [ ] Palette hexes match §1.2 exactly; every money figure & rate is in JetBrains Mono; headings in Sora.
- [ ] Gold is used only for money/emphasis; YES-green / NO-rose never inverted; no pure black, no neon.
- [ ] Shared cover + footer + watermark make the four read as one suite.
- [ ] Print CSS from §1.7 is present so backgrounds survive `Ctrl-P → Save as PDF` (A4).
- [ ] Every number/route/fact comes from this brief; nothing invented; `VERIFY`/`OPEN` items flagged.
- [ ] Tested: open each HTML in Chrome/Edge, print-preview looks clean at A4 with correct colours.
