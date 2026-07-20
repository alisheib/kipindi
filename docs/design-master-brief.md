> **STATUS: authoritative** — palette + composition source of truth. The live
> tokens in `src/app/globals.css` match this brief to ~0.3%. Invariants (single
> theme, YES/NO semantics, claret/aqua rules) are in `docs/DESIGN_AUTHORITY.md`.

# 50pick — Master Design Brief ("the perfect truth")

> **For Claude Design (highest access).** This is the complete, grounded source of truth to
> **visually finalize the entire 50pick platform** — every page, every atom (glyphs, buttons,
> chips, timers, inputs), every state (hover/focus/active/disabled/loading/empty/error), every
> effect, and every image/illustration asset. It supersedes ad-hoc notes.
>
> **Every mockup you produce MUST carry the full data model** (§2): exact hex colours, **real
> EN/SW/ZH strings** (this app is **English / Swahili / Chinese — NOT Arabic**), real market
> products, all interaction states, and the interaction logic. **No lorem-ipsum, no placeholder
> colours, no fake copy.** (Historical companion files — `visual-assets-brief.md`,
> `glyph-reference-for-design.md`, `kit-gap-audit.md`, the teal `design_handoff_prediction_market_kit/`
> — were removed in the 2026-07-15 finalization; see `F:/50pick-design-archive/` + git history.
> Invariants now live in `docs/DESIGN_AUTHORITY.md`; implementation is `src/app/globals.css`.)
> current screenshots. Return format: §9.
>
> **Nothing is off-limits — this is a full refinement pass, not just gap-filling.** If an item that
> already exists could be better (a component, a screen, a glyph, a color use, a motion, a layout),
> **say so and propose the upgrade.** Do not assume "already built" = "final." Challenge the
> conviction dial, the market card, the empty states, the buttons, the hero, the charts — anything.
> Candidate existing items to critique are listed in §4g.

---

## 1. Product in one paragraph
**50pick** — a Tanzania-licensed, regulator-ready **pari-mutuel prediction market**. Players back
**YES**/**NO** on real-world outcomes (sport, weather, macro, crypto, culture, tech); all stakes
join one pool; the correct side shares it (after ~9% tax+commission). Live implied probability.
**Mobile-first, dark-first, trilingual EN/SW/ZH.** Real money under a gambling licence → **trust
and clarity over spectacle.** Voice: editorial confidence — "the wisdom of YES & NO."

---

## 2. GROUND TRUTH for every mockup (use these verbatim)

### 2a. Exact palette (sRGB hex — match, don't approximate)
`Canvas #0A0E33` (deep) / `#060A50` (royal) · `Panel #131645` · **Gilt `#D49824` / light `#FEC766`
/ deep `#B97F12`** · `Royal/brand #4983F4` (light `#6CA2FF`) · `Aqua/live #36BABA` ·
**YES #00A24F · NO #E6424C** · `Claret #A4273F` · `Ink #F5F8FF` · `Muted ink #C8CBCF`.
Signature: **gilt-on-royal-navy**, and the **YES-green ↔ NO-rose** duality. Never pure black,
never neon.

### 2b. Real trilingual strings (EN | SW | ZH) — put real text in mockups
| Concept | EN | SW | ZH |
|---|---|---|---|
| Place bet | Place bet | Weka dau | 下注 |
| YES / NO | YES / NO | NDIO / HAPANA | 是 / 否 |
| Deposit / Withdraw | Deposit / Withdraw | Amana / Toa | 充值 / 提现 |
| Markets | Markets | Masoko | 市场 |
| Results | Results | Matokeo | 结果 |
| Positions | Positions | Nafasi | 持仓 |
| Propose | Propose | Kupendekeza | 提议 |
| Empty-window | Nothing closing that soon | Hakuna yanayofunga hivi karibuni | 近期没有即将结束的市场 |
**Rule:** SW runs ~20–40% longer than EN — every label, chip and button must survive the SW
length without truncation. Show the **SW state** in at least one variant of each mockup.

### 2c. Real products (use these exact markets, not invented ones)
- "Simba SC wins NBC Premier League 2026-27" (sport)
- "Long rains begin before 15 Apr" (weather)
- "USD/TZS closes < 2,650 in Q2" (macro)
- "Bitcoin closes above $100,000 on 1 July" (crypto)
- "Diamond Platnumz releases new album before Oct" (culture)
- "SGR Dodoma–Singida begins operations before Dec" (tech/infra)
Currency is **TZS** (Tanzanian Shilling); realistic figures: `TZS 100,000` balance,
`TZS 20,000` propose reward, quick-stakes `1k / 5k / 10k / 25k / 50k / 100k`, pool `TZS 4.2M`,
`1,000 predictors`, `6d left`. Odds shown as implied %, e.g. `YES 50% / NO 50%`.

### 2d. State matrix — show EVERY interactive surface in ALL states
`default · hover · focus-visible · active/pressed · disabled · loading` for controls, and
`empty · loading (skeleton) · error · populated` for data surfaces. A mockup that shows only the
happy/filled state is incomplete.

### 2e. Interaction logic (so mockups are truthful, not decorative)
- **Bet:** pick YES/NO → drag the **ConvictionDial** to set stake → confirm modal → optimistic
  position → win-celebration on resolve. Selection closes before resolution (`waiting for results`).
- **Board filters:** `When {New·Ending soon·Today·This week·All}` × `Topic {All·Sports·Macro·
  Weather·Crypto·Culture·Tech·Other}`; URL-driven, server-rendered (shareable). Default = Today.
- **Deposit/withdraw:** pick provider (M-Pesa/Airtel/HaloPesa/Mixx/Card|Bank) → amount → confirm.
  Withdraw gated on KYC-approved.
- **Resolve (admin):** two-officer sign-off; gilt "seal" moment.

---

## 3. Design system (condensed — full detail in design-handover.md)
**Type:** Sora (display) · Inter (body) · JetBrains Mono (numerals/labels/eyebrows).
**Colour discipline (inviolable):** **gold = earned-money ONLY** (wins, bonus, deposit CTA,
resolved seal); aqua = live/in-play; royal/brand = active/nav; claret = destructive; green/rose =
YES/NO. **Motion:** 40+ keyframes + `ConfidenceDial`, `TippingBar`, `PulseRing`, `SignalPip`,
`BrandTopo`, `GiltCorner` in `brand.tsx`; **`prefers-reduced-motion` respected — keep it.**
**Illustration idiom:** **gilt line-art / etched SVG, single gold accent, NO mascots, NO baked-in
text** (trilingual). All new scene art follows this.

---

## 4. ATOMIC LAYER — refine, fill gaps, complete every state

### 4a. Glyphs (129 exist — `components/ui/glyphs.tsx` is the source)
Strong custom set. **Gaps to fill:** real **MNO/payment logos** (M-Pesa, Airtel Money, HaloPesa,
Mixx by Yas, Card, Bank) — biggest single iconography win, used on deposit/withdraw + wallet
Methods; **per-source glyphs** (salary/business/savings/investment/gift) for source-of-funds;
**per-FAQ topic glyphs** (help); **device glyphs** (phone vs desktop) for sessions; **category art
layer** (the 8 topics) promoted from watermark-only to filter chips + detail-header watermark +
home category row. Keep line stroke, weight and box consistent with the existing 129.

### 4b. Buttons (`btn-primary/gold/ghost/yes/no/aqua/claret/danger`, sizes sm/md/lg)
Provide the **full state set** for each variant: default / hover (brightness+saturate+drop-shadow,
already the pattern) / focus-visible (ring) / active (`press-pop`) / disabled / loading (spinner).
Confirm the gold CTA and YES/NO buttons read distinctly in all three languages.

### 4c. Chips / tags (`chip.tsx` — neutral/yes/no/live/resolved/pending/gold/brand/…)
Status chips (LIVE/HOT/RESOLVED/VOID/pending) + category chips. Give a `selected`/hover treatment
and confirm the `resolved` gilt-gradient chip vs `live` aqua chip vs `no` rose chip are unmistakable.

### 4d. Timers / clocks (`countdown.tsx`, `countdown-pill.tsx`, `sentinel-countdown`,
`otp-expiry-countdown`, `conviction-dial` tachymeter)
Unify a **countdown visual language**: card "6d left" pill, urgent (<1h) pulse, a **circular
countdown ring** for open positions + KYC/OTP expiry, and the admin sentinel. Spec calm→urgent
escalation (aqua → gold → rose) with reduced-motion fallback.

### 4e. Inputs, empty states, meters
Inputs: amount/phone/OTP/search — all states. **Empty states** (`empty-state.tsx`, 7 kinds) — add
kinds: **proposals** (ballot/quill), **KYC progress rail**, **provably-fair diagram** (fairness),
**RG self-care scene**, **admin generic**. New primitive requests: **`AdminMeter`** (value-vs-cap
gauge) and **`AdminBarList`** (horizontal distribution bars) — see §6.

### 4f. Interaction states & effects (23 hover / focus-visible / active / 14 disabled / 40
transitions / ~24 anim utils today)
Systematize a **state token set** so every interactive element shares one hover/focus/active/
disabled recipe. Effects opportunity: a shared **"reward burst"** (gilt rays + `GiltCorner` +
FiftyMark) for money peaks; richer `odds-flash` usage; staggered `kp-rise` on grids. **Every effect
needs a `prefers-reduced-motion` static fallback.**

---

### 4g. EXISTING items to challenge & refine (nothing is off-limits)
These are already built and considered "good" — **push them anyway** if you see better. For each,
either bless it or propose a concrete upgrade (with real data + hex, per §2):
- **ConvictionDial / TippingBar** (`brand.tsx`, `conviction-dial.tsx`) — the signature bet
  interaction and live-odds bar. Is the dial's readability, drag affordance, tachymeter, and halo
  the best it can be on a 360px phone? Trilingual label fit?
- **MarketCard** (`market-card.tsx`) — the most-repeated component (4 pages). Beyond wiring the dead
  spark/traders: is the density, hierarchy, YES/NO pricing, chip stack, and watermark optimal?
- **Empty states** (`empty-state.tsx`, 7 kinds) — good gilt line-art. Are the illustrations, copy,
  and CTA the strongest version? Any kind that's generic/weak?
- **Buttons & chips** (`button.tsx`, `chip.tsx`) — solid variants/states. Refine hover/active/focus
  recipes, gilt CTA weight, and the LIVE/RESOLVED/YES/NO chip legibility.
- **PageHero / glow variants** (gold/rose/info/yes) — good masthead. Better gradient, framing,
  watermark? New glow tones needed?
- **Wallet cards, /profile hero, /invite EarningsRing** — the current "best" surfaces. Can they go
  further without breaking gold-discipline?
- **Modals** (`ConfirmDialog`, `OperationResultModal`, `bet-confirm`, `sell-confirm`,
  `win-celebration`) — the success/reward crests are flagged under-built (§6.5); critique the whole
  modal system's chrome, rise motion, and scrim.
- **Admin KPI/tables/charts** (`admin-shell.tsx`, `admin-charts.tsx`) — consistent but static;
  challenge the KPI tile, table density, and chart legibility.
- **The 129 glyphs** — audit for stroke/weight/optical consistency; call out any weak ones to redraw.
- **The hero image, category watermark, BrandTopo, GiltCorner, PulseRing, SignalPip** — all
  fair game to elevate.
Deliverable for this section: a short **"refine existing" list** — item → keep or upgrade → the
specific change. Be candid; we would rather redo a built thing now than ship it merely-fine.

## 5. PER-PAGE MANIFEST (grounded — from a full read of all ~66 routes)

### 5a. Player — core
| Route | Gap | Suggested asset/feature | Pri |
|---|---|---|---|
| `/` home | Ends abruptly after 2 sections | Category showcase row + animated stats band (markets settled / TZS paid); rotate hero | M |
| `/markets` | Text-only filter rail; utilitarian | **Category glyphs in topic chips**; slim gilt board-header | M |
| `/markets/[id]` (core bet) | Title on flat bg; card watermark absent on the hero screen | **Category-glyph watermark** behind the question; slim gilt hero band | **H** |
| `/live` | Renders same MarketCard as /markets; live identity thin | Dense **TippingBar wall** variant or live-odds ticker | M |
| `/results` | Visually identical to /markets | Promote outcome split to a **YES/NO donut / aggregate TippingBar**; "notable result" featured card | M |
| `/positions` | Countdown as plain text | Mini **countdown ring** on open cards; YES/NO exposure bar | L |
| `/positions/performance` | Best-win/streak text-only | **Streak pip-chain / flame** row; gilt "best win" crest | L |
| `/leaderboard` | **No podium** (top-3 are plain numbers); empty-state draws a podium the real board never uses | **Top-3 podium header** (crest + TierBadge + avatar, gilt #1) | **H** |
| MarketCard (shared) | ✅ **RESOLVED 2026-07-20 @ `6b1975b`** — history is persisted in a `MarketSnapshot` table, so sparklines render from real data as bets land. The diagnosis below was right but understated the damage: the same empty-Map condition also made `/markets/[id]` draw a **fabricated** chart via `seedHistory()` (a synthetic LCG walk), on every market, after every deploy. The card was blank precisely *because* it obeyed A-5; the detail page did not. `seedHistory` is deleted, guarded by `npm run test:history`. A new market's chart starts EMPTY — correct, not a regression. ⛔ Never "fix" an empty chart by inventing points. Note the fix used a dedicated table, **not** the `PredictionMarket.history` JSON column the old TODOs suggested — a JSON column rewrites up to 800 points on every bet. **Original finding, kept for the record:** *Sparkline is wired end-to-end but renders on ZERO cards in production.* The render path is complete — `market-card.tsx` draws it (`Spark`, Catmull-Rom `smoothPath` L94–99) and `/`, `/markets`, `/results` all call `getCardChart()` and pass `spark`/`move24h`/`traders` (`markets/page.tsx:300-302`). The **data** is the gap: `market-history.ts` is still an in-memory `Map` on BOTH store paths (the Prisma impl is 4 `TODO`s, L80–100), so history is wiped on every deploy and per-instance. `getCardChart` returns `{spark: []}` below 2 points, and the card hides the spark below 4 — so cards stay flat until enough bets land on the *same instance* after a deploy. **Measured live 2026-07-20: `.mcardp-spark` count = 0 on /markets, /live and /results.** Fix = persist history (the `PredictionMarket.history` JSON column those TODOs describe), NOT more render work. | **H** |

### 5b. Player — money & profile
| Route | Gap | Suggested asset/feature | Pri |
|---|---|---|---|
| `/wallet` | Flat activity list; initials not logos; text-only limits | **Balance sparkline** (30-day, aqua pip); **MNO logo set**; limit-usage meters | **H** |
| `/wallet/deposit` | Only art is cashback promo; provider initials | **Trust strip** (gaming-board seal + provider logos) | M |
| `/wallet/withdraw` | Flat KYC gate + dense notices | **KYC-lock line-art**; merge notices into one iconized panel | M |
| `/proposals` | No masthead; monotone cards; borrowed empty art | `PageHero glow=gold`; **proposals-native EmptyState**; per-card CategoryIcon tint | M |
| `/proposals/[id]` | **Prize celebration under-built** (flat gradient + lone trophy) | **"Approved / +TZS" reward burst** (gilt rays + GiltCorner + FiftyMark) | **H** |
| `/proposals/new` | Long flat form; no reward reinforcement | `PageHero glow=gold`; reward-reminder banner; reward graphic in success modal | M |
| `/profile` | Only hero is textured; KYC/SoF CTAs plain boxes | `GiltCorner`/`BrandTopo` on KYC/SoF cards; empty-badge line-art | M |
| `/profile/account` | Very flat; debug-style activity table | Line-art empty activity; **warning-topo on close-account**; row category glyphs | M |
| `/profile/kyc` | Steps are chips; identical upload slots; APPROVED doesn't celebrate | **KYC progress rail illustration**; **ID-silhouette line-art** per slot; gilt burst on APPROVED | **H** |
| `/profile/sessions` | Reads like a debug dump (raw mono IDs/IPs) | **Device/session cards** (phone vs desktop glyph); **aqua "live" accent** on current | **H** |
| `/profile/source-of-funds` | Plain text radio tiles | **Per-source glyphs**; GiltCorner on declaration + signature line-art | M |
| `/profile/invite` | **No share-card image** (text+URL only); no QR | **Generated invite SHARE-CARD image** (royal + FiftyMark + gilt "You've been invited" + code) via `navigator.share`; **QR** | **H** |
| `/profile/responsible-gambling` | Three gray panels; no wellbeing art | **RG self-care line-art**; helpline as `yes`-toned support callout | M |
| `/fairness` | Flattest (no PageHero); 5-step list bare | `PageHero glow=info`; **provably-fair / two-officer audit-chain SVG diagram** | **H** |
| `/help` | FAQ pure text | Per-FAQ topic glyphs; tone-coded quick-link chips | L–M |

### 5c. Auth, legal, system
| Route/File | Gap | Suggested asset/feature | Pri |
|---|---|---|---|
| all 6 `/auth/*` | Each hand-rolls the same lonely centered card; no brand warmth | **Extract `AuthShell` + a `lg:`-only brand side-rail** (live TippingBar/ConfidenceDial specimen + "Predict events. Not chance." + 18+/licence trust strip) — one change lights up all 6 | **H** |
| root `error.tsx` / `not-found.tsx` | Generic alert glyph; no bespoke art | Branded 404/error via **kit motifs** (broken/extreme TippingBar, BrandTopo frame, GiltCorner) — no mascot | M |
| 6 route `error.tsx` (markets/positions/wallet/proposals/profile/auth) | **Drop all brand** (bare alert-circle) vs root | Unify on a shared **`RouteError`** (FiftyMark + BrandTopo) | **H** |
| offline (`offline-banner.tsx`, `sw.js`) | No offline page; SW serves stale home | Branded **`/offline`** route + precache | M |
| `api/og/*` | Dynamic OG is **markets-only**; static PNGs generic | Dynamic OG for leaderboard/results/proposals/profile; align hero gradient to navy | M |
| `manifest.json` | No `shortcuts`; narrow screenshot mislabeled | PWA **shortcuts** (Markets/Wallet/Deposit); fix narrow screenshot | M |
| `legal/*` | Prose-only; no per-doc identity | **GiltCorner-framed `LegalHeader`** + per-doc icon (terms/shield/RG/AML) | M |
| ~~`BrandTopo`~~ | ~~opacity 0.05 = invisible on navy~~ | ✅ **DONE** — verified 2026-07-20. Component default is `opacity = 0.09` (`brand-topo.tsx:7`) and every one of the 7 call sites passes 0.08–0.09. Already in spec; **do not "re-fix" this.** | ✅ |

### 5d. Admin console (restraint — internal tooling)

> **Update 2026-07-20 (admin console detail pass):** several rows below are now DONE — see
> `docs/NEXT-SESSION.md`. Closed: `ai-usage` daily-spend chart (`AdminAreaChart` from
> `anthropic.daily`, shown only when the Cost API key is set); `moderation` KPI band; all 41
> loaders are now real skeletons; every unbounded admin list is paginated; hand-rolled table
> empties routed through the shared `EmptyState` via `AdminTableEmpty`. Still open: the
> `AdminKpi spark` slot is fed only by cohorts + reports (wiring the rest needs new per-tile
> series data); `players` still shows counts in header chips (no KPI band); the hand-rolled
> distribution bars on `cohorts`; `players/[id]` risk gauge.

| Route | Gap | Suggested viz | Pri |
|---|---|---|---|
| `ai-usage` | ✅ **DONE 2026-07-20** — daily-spend `AdminAreaChart` wired from `anthropic.daily` (only with the Cost API key; else nothing, no fabricated line). Credit gauge (`AdminMeter`) was already present. | ~~`AdminAreaChart` daily spend~~ | ✅ |
| `players` | **No AdminKpi band** (counts in header chips); local SortTh | Add KPI band + status-mix bar; use kit SortTh | M |
| `moderation` | ✅ **DONE 2026-07-20** — KPI band added (In queue / Auto-hidden / Reported) | ~~KPI band~~ | ✅ |
| `ai-polls` + `candidates` | Multi-stage pipeline described in **prose, never drawn** | Shared **`AdminFunnelChart`** from `countByState()` | M |
| `players/cohorts` | **Hand-rolled** distribution + month bars | `AdminBarList` + `AdminAreaChart` | M |
| `config` / `privacy` / `invites` / `audit` | fee-vs-ceiling / DSAR-SLA aging / conversion / 24h-by-category all text-only | **`AdminMeter`** gauges + `AdminStackedBars` (data already computed) | M |
| `players/[id]` | Risk score is a bare number | Reuse **`CircularProgress`** gauge (as resolver-queue) | M |
| overview/live/finance/markets… | Headline **`AdminKpi spark` slot** — still fed only by cohorts + reports (2026-07-20); the rest need per-tile 24h/7d series data | Feed 24h/7d mini-series into the top band (one helper lifts the whole console) | M |
| many tables | ✅ **DONE 2026-07-20** — table zero-row states routed through the shared `EmptyState` via the new `AdminTableEmpty` colspan helper (markets, markets/[id], players, players/[id], self-exclusions, privacy×2, compliance, aml×2, finance) | ~~Route all through illustrated `EmptyState`~~ | ✅ |

---

## 6. CROSS-CUTTING — the highest-leverage shared work (do these first)
1. **MarketCard `spark`** — render path SHIPPED, but it draws on **zero** live cards because
   market history is in-memory and dies every deploy. The remaining work is **persistence**, not
   UI. See §5a. **[H]**
2. ~~**`AuthShell` + brand side-rail**~~ — ✅ **SHIPPED** (`src/components/auth/auth-shell.tsx`).
3. ~~**Shared `RouteError`**~~ — ✅ **SHIPPED** (`src/components/ui/route-error.tsx`; all 7 boundaries funnel into it).
4. **`PageHero` adoption** — 5 routes (3× proposals, fairness, invite) skip the existing masthead. **[M]**
5. **Shared "reward burst" asset** — pays off on proposals-approved, KYC-approved, create-success, payout. **[M]**
6. **Real MNO/payment logo set** — biggest iconography upgrade (deposit + withdraw + wallet). **[H]**
7. **Category-art layer** — promote the 8 category glyphs to chips + detail watermark + home row. **[M]**
8. **Admin: `AdminKpi spark` helper + `AdminBarList` + `AdminMeter` + `AdminFunnelChart`** — four small
   primitives finish most admin elevations. **[M]**
9. **Invite share-card image + QR** and **wallet balance sparkline** — the two net-new "extra features"
   that most finish their pages. **[H]**
10. **Leaderboard podium** for top-3. **[H]**

---

## 7. ASSET PRODUCTION LIST
Bitmaps: **hero background** (replaces the deleted 20 stock slides) · in-page **banners**
(propose/bonus/invite) · **OG/social cards** (+ dynamic per surface) · **category art set** (8) ·
**section texture** · **win/resolution seal** · **MNO logo set** · **invite share-card** template.
Line-art SVG (kit idiom): KYC progress rail · provably-fair diagram · RG self-care scene ·
source-of-funds source glyphs · device glyphs · per-FAQ glyphs · proposals empty state · reward
burst · branded 404/error/offline motifs. App icons already exist (regenerate only if asked).

---

## 8. Constraints (respect in every deliverable)
Reuse kit + tokens (name them) · **never regress money paths** · **gold = earned-money only** ·
`prefers-reduced-motion` fallback on every motion · **trilingual EN/SW/ZH**, SW-length-safe, **no
baked-in text in reusable art** · **no mascots** (gilt line-art idiom) · dark-first · don't fabricate
legal/business values.

---

## 9. Return format (so it round-trips to the implementing Claude)
Per recommendation:
```
### <title>  — [impact H/M/L] [effort S/M/L]
- Route/component: <where>   ·   State(s) shown: <default/hover/empty/…>
- Change: <what, concretely, with the REAL EN/SW/ZH copy + hex used>
- Kit/token/glyph: <Chip variant=brand · --gold-300 · GiltCorner · add glyph X>
- Motion: <trigger → anim → duration/easing>  ·  reduced-motion: <fallback>
- Asset(s) to produce: <path + dimensions + format>
- Why it earns its place · Risk/money-path: <note>
```
Deliver **per-page mockups with the full data model baked in** (§2), plus the shared components in
§6 and the assets in §7. End with a one-paragraph verdict + the single highest-value move.
