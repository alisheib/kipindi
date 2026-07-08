# UI Rollout Tracker — Final UI Enhancement Kit

Single source of rollout truth for porting Claude Design's Final UI enhancement Kit
(`Final UI enhancement Kit/50pick-design-final/`) into the live app. Work strictly
against this, one item at a time. Update the row **after every item**. If context
resets, this file says exactly where to resume.

Status legend: `[ ]` not started · `~` in flight · `[x]` done · `⊘` blocked/sourced-externally

Regression gate: a batch is not "done" until the full suite (tsc + money/i18n tests +
smoke scripts + `scripts/ui-regression.mjs` at 360/768/1280/1920) passes and is logged.

---

## Foundations (step 1)

| Item | Status | Commit | Live evidence | Notes |
|---|---|---|---|---|
| F0 · Merge `glyphs-additions.tsx` into `glyphs.tsx` (spread `...Iplus`; percent/activity redraws win; remove interim controlled-poll block) | [x] | 279d0a4 | tsc PASS; screens render | +G64 (2.2) wrapper; Ibase+Iplus spread; removed 12 interim controlled-poll glyphs. `bank` added (payment tile); existing `landmark` kept |
| F1 · Wire `state-tokens.css` + `micro-patterns.css` after `globals.css` | [x] | 279d0a4 | render OK all 4 widths | copied to `src/app/`, imported in `layout.tsx`; classes available, applied by later A/B items |
| F2 · `scripts/ui-regression.mjs` (Playwright 360/768/1280/1920; no h-overflow, zero console errors, key interactions, screenshot+read) | [x] | 279d0a4 | 158/158 pass, 52 shots | domcontentloaded (board polls → never networkidle); ONLY/WIDTHS env filters |
| F3 · Foundations regression green (tsc + money/i18n + smoke + ui-regression) | [x] | 279d0a4 | see batch log | all green; switcher-test needs fresh store (documented state-leak) |

---

## PART A — Cross-cutting (do first, in order)

| Item | Status | Commit | Live evidence | Notes |
|---|---|---|---|---|
| A1 · MarketCard v2 — spark + trader crests, `@` labels, demote MoveChip | [x] | 8cfa885 | /live full grid + /markets EN 1280 + SW 360 (NDIO/HAPANA fit); ui-reg 158/158 | spark = real YES% history, smooth cubic, aqua, draws in (pathLength=1); crest = 3 av-stack + count (falls back to meta count when no traders); YES/NO localized (NDIO/是); move → mono micro-text above bar. All 4 pages (/ /markets /live /results) already plumbed the data. Added `seed-markets` dev endpoint |
| A2 · `AuthShell` + brand side-rail (6 `/auth/*` routes) | [x] | 91831f7 | a2-login lg (rail) + 390 (rail hidden) + SW (tagline+NDIO/HAPANA); ui-reg 158/158 | new `auth-shell.tsx`; adopted by login/register/otp/forgot/reset/verify (admin auth untouched). Rail: royal `--bg-overlay`, BrandTopo 0.09, localized tagline (`railTagline` key ×3), YES 64% TippingBar, trust strip. No gold in rail. ⚠ pre-existing gold `SubmitButton` CTA on auth → flag for B4 gold-discipline |
| A3 · Shared `RouteError` (root + 6 boundaries) | [x] | _a3pending_ | a3-routeerror EN 1280 + SW 390 (triggered real boundary); ui-reg 158/158 | new `route-error.tsx`; all 8 boundaries (root/admin/auth/markets/positions/profile/proposals/wallet) now thin wrappers. FiftyMark 64 + BrandTopo 0.06 frame, rose alert tint only (no claret), digest ref, Try again + back link(s). global-error.tsx left as-is (self-contained). Follow-up: not-found pegged-bar frame still TODO |
| A4 · `PageHero` on 5 bare routes | [ ] | | | proposals×3 gold, fairness info, invite gold |
| A5 · Shared reward-burst (`reward-burst.tsx`) | [ ] | | | proposals-approved, KYC, market-create, win payout; render post server-confirm |
| A6 · MNO/payment tile system | [ ] | ⊘ logos | | tiles ship with placeholders; MNO marks sourced externally (Ali) |
| A7 · Category-art layer (chips/watermark/home row) | [ ] | | | 14px glyph in chips; 96px 6% watermark; royal selected, not gold |
| A8 · Admin primitives (AdminKpi spark, AdminBarList, AdminMeter, AdminFunnelChart) | [ ] | | | ~13 admin screens; no gold except resolved seal |
| A9 · Invite share-card + QR + wallet balance spark | [ ] | | | share-card shows CODE not balance; spark aqua not gold |
| A10 · Leaderboard podium | [ ] | | | canonical TierBadge (kill local); crown + hot; gold ring #1 |

---

## PART B — Refine-existing (keep/upgrade)

| Item | Status | Commit | Live evidence | Notes |
|---|---|---|---|---|
| B1 · ConvictionDial — thumb grab-pip + focus ring + coach hint; widen NDIO/HAPANA box ~24%; RG detent @10× + deliberate 2nd gesture past 50× | [ ] | | | verify 360px; reduced-motion needle jump |
| B2 · MarketCard MoveChip → mono micro-text (folds into A1) | [x] | 8cfa885 | /live grid shows mono move-line | done with A1: removed the chip + old `.mcard-move*` CSS; now right-aligned mono `↗ +Npt` above the bar |
| B3 · Empty states — redraw `emptyMarkets` (scales+YES/NO pips), widen box 360px, drop 52px ring; add 5 new | [ ] | | | new: proposals, KYC rail, fairness, RG, admin-generic |
| B4 · Buttons/chips — systematize states (Part D recipe); per-size padding 12/16/20/24, `--r-md`/`--r-lg`; 0.7s spinner; drop leading glyph on SW gold CTA | [ ] | | | |
| B5 · PageHero — add `glow=aqua` for `/live`; BrandTopo 0.09 | [ ] | | | |
| B6 · Wallet cards / profile hero / EarningsRing — KEEP; add balance spark (A9) + real Methods/Limits data | [ ] | | | mock data = launch blocker |
| B7 · Modals — OperationResultModal success → reward-burst end-frame; bet-confirm pool-share sentence (EN/SW/ZH) | [ ] | | | pool-share is a hard invariant |
| B8 · Admin KPI/tables/charts — upgrade via A8 | [ ] | | | |
| B9 · Glyphs — redraw 3 (percent/activity/landmark), add 12 controlled-poll (done in F0) | ~ | 279d0a4 | via F0 | percent+activity redraws + 12 controlled-poll DONE; `landmark` optical redraw still pending (Iplus adds `bank`; existing `landmark` unchanged) |
| B10 · Hero image — REPLACE F1 shot; delete 20 orphan slides + 2 orphan hero components | [ ] | ⊘ bitmap | | webp sourced externally; component deletion here |
| B11 · BrandTopo — 0.05 → 0.09 everywhere | [ ] | | | |
| B12 · PulseRing / SignalPip / GiltCorner — KEEP as-is | [x] | | | no-op by design |

---

## PART C — Per-page

| Item | Status | Commit | Live evidence | Notes |
|---|---|---|---|---|
| C1a · `/markets/[id]` hero — category watermark (A7) + gilt hairline; states open/closing/waiting(hourglassOff)/resolved | [ ] | | | |
| C1b · `/profile/kyc` — progress-rail line-art, ID silhouettes, APPROVED reward-burst, canonical `<Input>` | [ ] | | | KYC gates withdraw — clarity first |
| C1c · `/profile/sessions` — device cards (glyph, geo, mono time, this-device aqua rule), claret revoke, IP reveal-on-tap | [ ] | | | replace debug dump |
| C1d · `/fairness` — PageHero glow=info + 5-step provably-fair SVG chain (gilt on attest node) | [ ] | | | step labels in HTML not SVG |
| C1e · `/live` — PageHero glow=aqua; hero = most-contested (`abs(yesPct-50)`); dense TippingBar-wall card | [ ] | | | fixes "soonest-closing" label lie |
| C2a · `/` home — category row (A7) + animated stats band (real aggregates, count-up-flash) | [ ] | | | |
| C2b · `/results` — aggregate YES/NO donut + one featured result card; keep header lean | [ ] | | | |
| C2c · `/positions` — mini countdown-ring + YES/NO exposure bar | [ ] | | | |
| C2d · `/positions/performance` — streak pip-chain + best-win gilt crest | [ ] | | | gold right here |
| C2e · `/wallet/withdraw` — KYC-lock line-art, merge 3 notices, route amount/balance through kit controls | [ ] | | | money-path audit flags |
| C2f · `/proposals*` — PageHero (A4), proposals EmptyState, propose banner, category tint | [ ] | | | |
| C2g · `/profile`, `/account`, `/source-of-funds` — GiltCorner only if reward framing; per-source glyphs; signature line-art; warning-topo on close-account | [ ] | | | SoF = royal not gold |
| C2h · `/profile/responsible-gambling` — RG self-care line-art, yes-toned helpline callout | [ ] | | | no gambling imagery |
| C2i · `/help` — per-FAQ topic glyphs, tone-coded quick-link chips | [ ] | | | |
| C2j · `/offline` route — FiftyMark + retry + precache | [ ] | | | |
| C2k · OG — extend dynamic OG to leaderboard/results/proposals/profile; gradient align; render png masters | [ ] | ⊘ font | | rasterize where Sora/Inter/JBM installed |
| C2l · `manifest.json` — shortcuts (Markets/Wallet/Deposit) + narrow screenshot label | [ ] | | | |
| C2m · `legal/*` — LegalHeader GiltCorner + per-doc glyph | [ ] | | | |

---

## Admin reporting surface (Batch 3 spec)

| Item | Status | Commit | Live evidence | Notes |
|---|---|---|---|---|
| ADM1 · Reporting console — GGR/NGR defs, daily P&L w/ totals, category breakdown, regulator pack maker-checker chain | [ ] | | | per `50pick-admin-reporting-spec.md` |
| ADM2 · Two-officer Resolution Ceremony | [ ] | | | |
| ADM3 · KYC/AML workstation | [ ] | | | |
| ADM4 · Payments ops — MNO kill-switches, reconciliation, retry queue | [ ] | | | |

---

## Assets (PART E) — produce or source

| Asset | Path | Status | Notes |
|---|---|---|---|
| DROP-IN svg/glyphs ×59 | `public`/in-code | [ ] | currentColor; wired per usage |
| DROP-IN empty-states ×5 | in-code | [ ] | via F0 |
| DROP-IN badges ×12 + gilt | `svg/badges*` | [ ] | map tiers I–V to TierBadge; locked = 30% ink + lock |
| DROP-IN pay/card.svg + bank.svg | `public/pay/` | [ ] | delivered |
| DROP-IN comms (email+SMS/WA) | `comms/` | [ ] | server-side tokens |
| Hero bg webp | `public/hero/hero-bg.webp` | ⊘ | bitmap pipeline (Ali) |
| Propose/Bonus/Invite banners | `public/banners/*.webp` | ⊘ | bitmap pipeline |
| Category art ×7 | `public/category/*.webp` | ⊘ | bitmap pipeline |
| Section texture | `public/texture/navy-weave.png` | ⊘ | bitmap pipeline |
| Win seal png | `public/celebrate/win-seal.png` | ⊘ | bitmap pipeline |
| MNO logos ×4 | `public/pay/{mpesa,airtel,halopesa,mixx}.svg` | ⊘ | source official (Ali) |
| OG masters png | `public/og/*.png` | ⊘ | rasterize where brand fonts installed |
| Regulator seal | deposit trust strip | ⊘ | never fabricate; labeled slot until supplied |

---

## Open items to flag to Ali
- MNO brand logos (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas) — trademarked, source official.
- Bitmap tier (hero, banners, category art, texture, win-seal) — needs image pipeline.
- Regulator seal — licensed asset.
- SMS sender ID (`"KIPINDI"`) and real deploy domain — env-driven.

---

## Batch log
_(append one entry per batch: date · items · regression result)_

- **2026-07-08 · Foundations (F0–F3)** — merged glyph kit (49 glyphs + 5 empty-states, G64 wrapper, removed interim controlled-poll block, percent/activity redraws now win); wired `state-tokens.css` + `micro-patterns.css`; added reusable `scripts/ui-regression.mjs`.
  **Regression:** `tsc` PASS · test:i18n (en=sw=zh=1202) · test:trilingual (36) · test:markets (18) · test:ledger (69) · test:audit (15) · test:emergency (30) · test:bonus (59) · test:proposals (44) · test:admin-roles (33) · admin-grids-smoke (125) · markets-retest (18) · switcher-test (5/5, fresh store) · **ui-regression 158/158** across 360/768/1280/1920, 52 screenshots read (markets, wallet, admin verified — no breaks). ALL GREEN.
