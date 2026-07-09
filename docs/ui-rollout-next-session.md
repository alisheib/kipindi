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

## Done so far — **PART A (A1–A10) is COMPLETE** (all committed + pushed to `main`, Railway auto-deploys; each verified with screenshots + 158/158 ui-regression)
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

## RESUME HERE → **PART B (B1–B12)**, first unchecked row = **B1 · ConvictionDial**
Per `50pick-refinement-spec.md` B-section + `50pick-micro-interactions-spec.md`:
- **B1 ConvictionDial** — thumb grab-pip + focus ring + coach hint; widen the NDIO/HAPANA box ~24%; RG
  detent at 10× stake + a deliberate second gesture past 50×; **verify at 360px**; reduced-motion = needle
  jump (no animated sweep). Component: `src/components/markets/conviction-dial.tsx`.
- Then B3 (empty states — redraw `emptyMarkets`, add 5), B4 (button/chip state recipe — **incl. the flagged
  gold `SubmitButton` CTA leaking onto the auth surface**), B5 (PageHero `glow=aqua` for /live; BrandTopo 0.09),
  B6 (wallet real Methods/Limits data — mock = launch blocker), B7 (OperationResultModal success → set the A5
  `celebrate` on payout/earned-money only; bet-confirm pool-share sentence), B8 (admin upgrade via A8), B10
  (delete orphan hero components — bitmap ⊘), B11 (BrandTopo 0.05→0.09 everywhere). B2 done (folded into A1),
  B9 `~` (landmark redraw pending), B12 no-op by design.
- After PART B → **PART C** (per-page C1–C2m) → **admin reporting** (ADM1–4).

## Still-open carry-overs (recorded, pick up anytime)
- **A8-breadth:** adopt `AdminMeter`/`AdminBarList`/`AdminSpark` on the other ~12 admin screens (ai-usage,
  players, moderation, ai-polls, candidates, config, privacy, invites, audit, players/[id], live, finance)
  **and purge remaining admin gold** (GGR/NGR `gold`/`tone="gold"` KPI values on overview/finance; admin-shell
  `AdminFunnel` conversion is still gold). Primitives are built + ready. Dev gotcha: `db.user.list()` is a
  **sync array** in the in-memory dev store → wrap `.catch` calls in `Promise.resolve(...)`.
- **A5 win-payout variant** + **A9 Satori 1080² share PNG** wait on ⊘ bitmaps (`win-seal.png`, `invite.webp`).
- **A3 follow-up:** not-found.tsx should get the RouteError frame with a pegged (100/0) TippingBar.
- **A4 deferred:** /proposals/[id] + /profile/invite mastheads (reward framing comes via A5/A9 — mostly moot now).

## Reusable hooks already built (use these, don't rebuild)
`RewardBurst` (`components/brand/reward-burst.tsx`) · `PaymentLogo` + `MNO_LOGOS` map (`components/wallet/payment-logo.tsx`) ·
`AdminMeter`/`AdminBarList`/`AdminSpark` (`components/admin/admin-charts.tsx`) · `categoryGlyph()` (`components/ui/glyphs.tsx`) ·
CSS: `reward-burst__*`, `admin-bar-grow`, `podium-crown` (all in `src/app/state-tokens.css`, all reduced-motion-safe).

## Per-item working loop (unchanged platform standards)
1. Implement one tracker item. **Never regress money paths** (deposit/withdraw/bet/resolve/payout).
2. `npx tsc --noEmit` + relevant `test:*` (money/i18n). Trilingual EN/SW/ZH — show the SW state, nothing
   truncates (i18n parity currently **1207³**; adding keys must keep parity across all three locales).
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

Start by: (1) read the tracker + kit specs; (2) implement B1 (the first unchecked row); (3) run the full
regression; (4) update tracker + memory + commit/push; (5) continue to the next unchecked row.
