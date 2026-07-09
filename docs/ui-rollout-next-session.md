# Next session — continue the Final UI enhancement Kit rollout

> Paste everything below the line into a fresh Claude Code session opened in `F:\kipindi-main`.
> It resumes the kit rollout from where the last session stopped. The single source of rollout
> truth is **`docs/ui-rollout-tracker.md`** — the first unchecked row is always the resume point.

---

You are continuing the **Final UI enhancement Kit** rollout (Claude Design's finished UI pass) into the
live 50pick app. This is disciplined, one-item-at-a-time implementation — not redesign.

## Mindset — hold FIVE lenses at once, on EVERY item (non-negotiable, Ali)
Never work as just a coder. For every tracker item — recon, decision, implementation, and review —
think **simultaneously** as all five of these, and let the tension between them shape the result:
1. **Integration engineer** — how does this connect end-to-end? Data flow, server/client boundary,
   i18n parity, money-path safety, and reuse of the already-built primitives (don't rebuild, don't diverge).
2. **UI/UX engineer** — pixel polish, responsiveness at 360/768/1280/1920, accessibility (keyboard +
   `aria` + contrast), motion + reduced-motion, and the card standard. READ the screenshots.
3. **Software architect** — structure and maintainability: single source of truth, no divergence between
   two copies of the same thing, clean abstractions, delete what's superseded.
4. **Manager** — scope discipline and risk: what ships now vs. defers, what's a launch blocker, what to
   flag to Ali. One item at a time; keep the tracker + memory truthful.
5. **Player** — the real end-user in Tanzania: is it clear, trustworthy, fast, delightful, RG-safe, and
   correct in EN/SW/ZH? Would *they* understand and trust this screen?
If any lens raises a concern, resolve it or record it — don't ship past it silently.

## Orient first (do this before touching anything)
1. Read **`docs/ui-rollout-tracker.md`** — the single source of rollout truth. Every item (Foundations,
   PART A A1–A10, PART B B1–B12, PART C, admin reporting, assets) is a row with status / commit / live
   evidence / notes. **The first `[ ]` row is where you resume.** Update the row after every item.
2. Read the kit itself: `Final UI enhancement Kit/50pick-design-final/` — `README.md`, `QA-REPORT.md`,
   and the specs under `spec/` (`50pick-refinement-spec.md` = the map; `50pick-micro-interactions-spec.md`
   = normative motion/celebrations; `50pick-admin-reporting-spec.md`). The living standard is
   `reference/50pick-reference-build.html` + `reference-app.js` and the `specimens/*.html` mockups —
   **port their behavior, don't reinterpret.**
3. Skim the auto-loaded `ui-kit-rollout` memory — it has the resume point + per-item recon and gotchas.

## Done so far — **PART A (A1–A10) + PART B (B1–B12) COMPLETE** (all committed + pushed to `main`, Railway auto-deploys; each verified with screenshots + 158/158 ui-regression)

**PART B tail (2026-07-09) — closes out PART B:**
- **B9** `0049213` — `landmark` glyph optical redraw: old apex-roof + separate entablature line merged into a blur at the 12–14px it renders at (category chips + market-detail watermark); redrawn to the kit's canonical geometry (shared with `bank`) — one closed pediment + gap-before-columns. (percent/activity + 12 controlled-poll glyphs were already done in F0.)
- **B10** `5fc3784` (code) / ⊘ bitmap — the two orphan hero components (`hero-constellation.tsx` 655L + `hero-slideshow.tsx` 220L w/ its ~20-slide array) were **already deleted** in `5fc3784`; verified no lingering `components/landing` refs, tsc clean, dir gone. Home hero is a single inline `hero-bg.webp` in `page.tsx`. Only the ⊘ bitmap replacement (F1 shot → new TZ hero) remains, sourced externally by Ali.
- **B11** `0b0ddc6` — BrandTopo swept to 0.09 everywhere (`route-error` 0.06→0.09 + component default 0.07→0.09; `live`/`auth-shell` were already 0.09). PageHero is a FiftyMark-watermark surface, not BrandTopo → out of scope.


**PART B (2026-07-09):**
- **B1** `c2f305d` — ConvictionDial: grab-pip + `--brand-400` focus ring + one-time coach hint, RG magnetic detents (1×/2×/5×/10×) + 50× single-drag gate, detent-ladder keyboard, side-aware aria-valuetext, localized poles, reduced-motion needle-jump.
- **B3** `0f7daf2` — Empty states: redrew `markets` (YES/NO pips), added 5 illustrated kinds (proposals/kyc/fairness/rg/admin) in the component's gold-accent idiom; wired /proposals + admin empties. (kyc/fairness/rg reserved for PART C.)
- **B4** `227d56d` — Buttons gold-discipline: `SubmitButton` default gold→**primary** (fixed auth/kyc/rg/sof/withdraw at the root); deposit re-opts into gold. (Recipe/padding/spinner were already in place.)
- **B5** `83e5108` — PageHero `glow=aqua` variant added; /live BrandTopo 0.04→0.09. (/live slim header stays; full aqua hero = C1e.)
- **B6** `2de92d9` — Wallet money caps are now a **single source of truth**: `validators.ts` consts drive the zod enforcement AND the Limits-tab display + deposit/withdraw bounds. Methods = real MNO list.
- **B7** `34687b4` — Win-celebration now uses the shared A5 `RewardBurst` crest (completes the A5-deferred win pairing — pure SVG, no bitmap); bet-confirm shows the side-aware §10.2 pool-share invariant (`poolShareIfWins`). Celebrate discipline held: WIN only.
- **B8** `3597111` — Admin gold purge (the A8-breadth gold half): ~21 admin KPI values gold→neutral + net-flow charts gold→royal across ~13 screens.

**Cross-cutting (this session):**
- **Navigation IA overhaul** `05ae462` (+ decisions `d8a7095`) — see `docs/navigation-ia-review.md`. R1 (top nav from `lg` + "More ▾" overflow `nav-more.tsx`; bottom nav `lg:hidden`), R2 (mobile 5th tab = Positions/"Bets", **Ali-confirmed keep**), R3 (/positions no Back), R6 (KYC-gate `?next=` round-trip + Continue CTA). R4 resolved (`/` is a real home).
- **Gold-discipline swept everywhere** `3556845` — sign-up CTAs (header + market-detail) gold→royal. Gold = money-in/earned only, app-wide. (**Ali: "no one is above the law."**)
- **Logo/brand audit clean** `6a50fb0` — every context uses the right variant + current needle mark; fixed `favicon.svg` oklch→sRGB hex for favicon-context compatibility.
- **Full regression run**: tsc · functional suite 42/42 · ui-regression 158/158 · i18n **1210³**.

---
**PART A:**
- **Foundations** `279d0a4` — glyph kit merge, `state-tokens.css`+`micro-patterns.css` wired, `scripts/ui-regression.mjs`.
- **A1** `8cfa885` (+ card-fix `edfd073`) — MarketCard v2 (spark, trader crest, localized labels, uniform 356px height).
- **A2** `91831f7` — `components/auth/auth-shell.tsx` brand side-rail on the 6 `/auth/*` pages.
- **A3** `b679181` — shared `components/ui/route-error.tsx` across all 8 error boundaries.
- **A4** `c6f94ad` — PageHero mastheads on /proposals, /proposals/new, /fairness.
- **A5** `1a8561e` — shared `components/brand/reward-burst.tsx` (gilt rays + medallion); wired into proposals-approved, KYC-approved, and an OperationResultModal `celebrate` opt.
- **A6** `1c2803f` — payment-tile system (`components/wallet/payment-logo.tsx` + reworked `ProviderRadioGrid`) across deposit/withdraw/Methods; royal selection, MNO placeholders, disabled state, deposit trust-strip slot.
- **A7** `ccd1db6` — category-art layer: 14px glyph in topic chips (/markets + /results), 96px watermark on /markets/[id], home "Browse by topic" row.
- **A8** `4753241` (**~ in-flight**) — admin primitives `AdminMeter`/`AdminBarList`/`AdminSpark` in `components/admin/admin-charts.tsx` + AdminKpi `series` slot + shared admin gold→aqua/brand fixes. **Adopted only on `players/cohorts`.** BREADTH REMAINS (see below).
- **A9** `c592bc7` — invite share-card + QR (`/profile/invite`) and wallet 30-day balance spark (`/wallet`).
- **A10** `15f600e` — leaderboard top-3 podium (gilt ring + crown on #1) + hot-flame streak chips.

## RESUME HERE → first unchecked row = **PART C (C1a)** — per-page pass begins
PART A + PART B are done. PART C is the per-page phase: **C1a–C2m** in the tracker (13 items). Work them in
tracker order, one at a time, full per-item loop each.
- **C1a** `/markets/[id]` hero — category watermark (A7 already there) + gilt hairline; open/closing/waiting
  (`hourglassOff`)/resolved states.
- **Two teed-up quick wins:** **C1e** just needs to mount `<PageHero glow="aqua">` on `/live` (the B5 variant is
  built) — but note this converts /live's deliberately-slim header into a full hero, so treat it as a real
  per-page call (check the dense card wall at 4 widths, not a one-liner). **C1b/C1d/C2h** consume the **B3
  `kyc`/`fairness`/`rg` EmptyState illustrations** — already drawn, don't redraw them.
- After PART C → **admin reporting** (ADM1–4, per `50pick-admin-reporting-spec.md`).

## Still-open carry-overs (recorded, pick up anytime)
- **A8-breadth (gold half DONE in B8 `3597111`).** Remaining = **opportunistic primitive adoption**: wire
  `AdminMeter`/`AdminBarList`/`AdminSpark` into the ~12 admin screens whose data actually fits a meter/bar-list/
  spark (players/cohorts already done). Not every screen needs it — adopt where it improves scannability, don't
  force it. Primitives are built + ready in `components/admin/admin-charts.tsx`. Dev gotcha: `db.user.list()` is
  a **sync array** in the in-memory dev store → wrap `.catch` calls in `Promise.resolve(...)`.
- **A5 win-payout variant** + **A9 Satori 1080² share PNG** wait on ⊘ bitmaps (`win-seal.png`, `invite.webp`).
- **A3 follow-up:** not-found.tsx should get the RouteError frame with a pegged (100/0) TippingBar.
- **A4 deferred:** /proposals/[id] + /profile/invite mastheads (reward framing comes via A5/A9 — mostly moot now).

## Reusable hooks already built (use these, don't rebuild)
`RewardBurst` (`components/brand/reward-burst.tsx`, now also the win crest) · `PaymentLogo` + `MNO_LOGOS` (`components/wallet/payment-logo.tsx`) ·
`AdminMeter`/`AdminBarList`/`AdminSpark` (`components/admin/admin-charts.tsx`) · `categoryGlyph()` (`components/ui/glyphs.tsx`) ·
`EmptyState` kinds incl. proposals/kyc/fairness/rg/admin (`components/ui/empty-state.tsx`) · `BackLink` leaf-back (`components/ui/back-link.tsx`) ·
`NavMore` overflow menu (`components/layout/nav-more.tsx`) · `motionReduced()` + `haptics.*` (`lib/haptics.ts`) for RM/haptics ·
PageHero `glow=aqua` (`components/ui/page-hero.tsx`) · money caps single-sourced from `lib/server/validators.ts` consts.
CSS: `reward-burst__*`, `admin-bar-grow`, `podium-crown`, `dial-focus-ring`/`dial-coach` (state-tokens/component-local, all reduced-motion-safe).
**Nav model + logo variants:** see `docs/navigation-ia-review.md` (destination-vs-leaf rule) and `components/brand.tsx` (FiftyMark/Lockup/Wordmark/Tile/Favicon).

## Per-item working loop (unchanged platform standards)
1. Implement one tracker item. **Never regress money paths** (deposit/withdraw/bet/resolve/payout).
2. `npx tsc --noEmit` + relevant `test:*` (money/i18n). Trilingual EN/SW/ZH — show the SW state, nothing
   truncates (i18n parity currently **1210³**; adding keys must keep parity across all three locales).
3. **Live-drive:** start the dev server, seed, screenshot the changed screens to gitignored
   `.50pick-shots/`, then **READ the screenshots** to confirm no visual break / overflow / contrast regression.
4. Run `node scripts/ui-regression.mjs` (Playwright 360/768/1280/1920 — no h-overflow, zero console errors,
   interactions fire; currently **158/158**). Grow the script's ROUTES as new UI lands.
5. Clean up as you go: remove superseded components/CSS/imports in the same commit; run `tsc` for dead imports.
6. Commit per item with the co-author trailer + push (Railway auto-deploys). **Update the tracker row
   (status `[x]`, commit hash, live evidence) AND the `ui-kit-rollout` memory.** `prefers-reduced-motion`
   fallback on every animation. **Gold = earned-money only** (leaderboard #1 + reward pages are the sanctioned
   exceptions; admin gold = resolved seal only).

## The card standard (Ali, non-negotiable)
MarketCards are the iconic surface — perfect, consistent, responsive or we fail. When a change touches or
adds a card-like surface, audit the real populated grid at 360/768/1280/1920 and READ the shots: uniform
heights, columns reflow (1/2/3/3 on /markets), aligned buttons, zero h-overflow. Seed the board first
(`POST /api/dev-test/seed-markets`); the default **Today** filter often shows only 1 card (filter behavior,
not a card bug — select WHEN=All to see the true grid).

## Local run + seeding (Node 24, in-memory dev store)
```
SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000
```
- Seed **player**: `GET /auth/demo` (phone +255700000000). Seed **admin session cookie**:
  `POST /api/dev-test/seed-admin {"phone":"+255700000000"}` (from the browser context so the cookie sticks).
- **Populate the board:** `POST /api/dev-test/seed-markets` (adds ~30 live markets WITH history so sparklines
  render), then `POST /api/dev-test/stress-bulk-bet {marketId,n,yesRatio,stake}` for trader crests.
- **Wallet txns for the spark:** `seed-wallet` only sets balance (no txns) — drive real deposits via the UI
  (quick-amount chip + Confirm) to create txn rows.
- **Force a locale** in Playwright: `context.addCookies([{name:"kp-locale",value:"sw",domain:"localhost",path:"/"}])`.

## Dev-server gotchas (Windows)
- Shells reset cwd after a `cd`/`Set-Location` — commands still run; call binaries with absolute paths
  (e.g. `F:/kipindi-main/node_modules/.bin/tsc.cmd`) or `cd /f/kipindi-main && <cmd>` in one Bash line.
- Killing the `npx next dev` wrapper orphans the node child on :3000. On EADDRINUSE:
  `netstat -ano | grep ":3000"` → `taskkill //PID <pid> //F`, then restart.
- `ui-regression.mjs` uses `domcontentloaded` not `networkidle` (the board polls live odds, never idles).
  **Run it on a FRESH dev-server store** — a heavily-seeded store makes notification polls fire
  `navigator.vibrate`, whose "blocked without a user gesture" warning ui-regression counts as a console
  error (36 false-fails last session; 158/158 again after a restart).

Start by: (1) read the tracker (`docs/ui-rollout-tracker.md`) + the two `spec/` files + `docs/navigation-ia-review.md`;
(2) implement **C1a** (the first unchecked row — `/markets/[id]` hero states); (3) run the per-item loop
(tsc + money/i18n + live-drive + ui-regression 158/158); (4) update tracker + `ui-kit-rollout` memory + commit/push;
(5) continue to the next unchecked PART C row. Hold the five lenses on every item. **C1a touches a money leaf
(`/markets/[id]` → the bet flow) — do not regress deposit/withdraw/bet/resolve/payout.**
