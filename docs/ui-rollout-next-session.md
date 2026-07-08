# Next session — continue the Final UI enhancement Kit rollout

> Paste everything below the line into a fresh Claude Code session opened in `F:\kipindi-main`.
> It resumes the kit rollout from where the last session stopped. The single source of rollout
> truth is **`docs/ui-rollout-tracker.md`** — the first unchecked row is always the resume point.

---

You are continuing the **Final UI enhancement Kit** rollout (Claude Design's finished UI pass) into the
live 50pick app. This is disciplined, one-item-at-a-time implementation — not redesign.

## Orient first (do this before touching anything)
1. Read **`docs/ui-rollout-tracker.md`** — the single source of rollout truth. Every item (Foundations,
   PART A A1–A10, PART B B1–B12, PART C, admin reporting, assets) is a row with status / commit / live
   evidence / notes. **The first `[ ]` row is where you resume.** Update the row after every item.
2. Read the kit itself: `Final UI enhancement Kit/50pick-design-final/` — `README.md`, `QA-REPORT.md`,
   and the specs under `spec/` (`50pick-refinement-spec.md` = the map; `50pick-micro-interactions-spec.md`
   = normative motion/celebrations; `50pick-admin-reporting-spec.md`). The living standard is
   `reference/50pick-reference-build.html` + `reference-app.js` — **port its behavior, don't reinterpret.**
3. Skim the last session's memory for context (auto-loaded): the `ui-kit-rollout` memory has the resume
   point + per-item recon.

## Done so far (all committed + pushed to `main`, Railway auto-deploys; each verified with screenshots + 158/158 ui-regression)
- **Foundations** `279d0a4` — merged glyph kit into `src/components/ui/glyphs.tsx` (Ibase + `...Iplus`
  spread, `G64` 2.2-stroke wrapper, removed 12 interim controlled-poll glyphs, percent/activity redraws
  win); wired `src/app/state-tokens.css` + `micro-patterns.css` after globals; added the reusable
  **`scripts/ui-regression.mjs`** harness.
- **A1** `8cfa885` — MarketCard v2: real-YES%-history sparkline (aqua, `pathLength=1` draw-in), trader
  crest, localized NDIO/HAPANA labels, MoveChip→mono micro-text (B2). Added `seed-markets` dev endpoint.
- **card-fix** `edfd073` — MarketCard made uniform: trader row on EVERY card (min-height, avatars only
  when seeds exist), move-line slot reserved → YES/NO buttons align across the grid. (Fixed a card
  inconsistency the user spotted — keep an eye on card consistency as new card variants land.)
- **A2** `91831f7` — `components/auth/auth-shell.tsx`: lg brand side-rail across the 6 non-admin `/auth/*`
  pages (royal `--bg-overlay`, BrandTopo 0.09, localized tagline `railTagline`, YES 64% TippingBar, trust
  strip; no gold in rail). Admin auth untouched.
- **A3** `b679181` — `components/ui/route-error.tsx`: FiftyMark+BrandTopo frame, no claret; all 8 error
  boundaries are now thin wrappers. (global-error.tsx left self-contained.)
- **A4** `c6f94ad` — PageHero masthead on /proposals (gold+trophy), /proposals/new (gold+trophy),
  /fairness (info+shieldcheck). Deferred with reasons: /proposals/[id] (detail page — reward via A5),
  /profile/invite (already has a gold EarningsRing hero → A9 reworks it).

## RESUME HERE → A5 · Shared reward-burst
Build `components/brand/reward-burst.tsx`: 12 gilt rays (`#FEC766`→transparent) radiating from a
`GiltCorner`-framed medallion holding the context glyph (trophy / shieldcheck / resolved star), an amount
line in JetBrains Mono `--gold-300` with `count-up-flash`, and a Sora caption. **Gold is legitimate on
every one of these — each is an earned-money or earned-status peak.** Reduced-motion: static end-frame,
rays at 40% opacity, amount rendered final.
- **Reuse existing kit CSS** (already in `globals.css`): `celebrate-pop` (~1072), `count-up-flash` (~1073),
  `badge-seal-rays` (~1447); `GiltCorner` at `brand.tsx:187`; `FiftyMark`.
- **Integration points:** (1) `components/markets/operation-result-modal.tsx` — the shared success modal.
  Add a `celebrate` opt so ONLY earned-money success (payout, proposal-approved, KYC-approved) gets the ray
  burst — NOT deposit / bet-placed. (This is also B7's "success → reward-burst end-frame".) (2) proposals
  APPROVED on /proposals/[id]. (3) KYC APPROVED on /profile/kyc. (4) win payout in `win-celebration.tsx`
  — pairs with `public/celebrate/win-seal.png` (bitmap, deferred asset; do the SVG variants first).
- **Hard rule:** the burst renders only AFTER the server-confirmed state, never optimistically on money.

After A5: A6 (⊘ MNO logos external), A7, A8, A9, A10 → PART B → PART C → admin reporting. Follow tracker order.

## Open flags to fold in (recorded, not yet done)
- **B4 gold-discipline:** the gold `SubmitButton` CTA leaks onto the auth surface (gold = earned-money only).
- **A3 follow-up:** not-found.tsx should get the RouteError frame with a pegged (100/0) TippingBar.
- **A4 deferred:** /proposals/[id] and /profile/invite mastheads (see A4 notes).

## Per-item working loop (unchanged platform standards)
1. Implement one tracker item. **Never regress money paths** (deposit/withdraw/bet/resolve/payout).
2. `npx tsc --noEmit` + relevant `test:*` (money/i18n). Trilingual EN/SW/ZH — show the SW state, nothing
   truncates (i18n parity currently **1203³**; adding keys must keep parity across all three locales).
3. **Live-drive:** start the dev server, seed, screenshot the changed screens to gitignored
   `.50pick-shots/`, then **READ the screenshots** to confirm no visual break / overflow / contrast regression.
4. Run `node scripts/ui-regression.mjs` (Playwright 360/768/1280/1920 — no h-overflow, zero console errors,
   interactions fire). Grow the script's ROUTES as new UI lands.
5. Clean up as you go: remove superseded components/CSS/imports in the same commit. Run `tsc` to catch dead
   imports; grep for now-unreferenced classes/assets.
6. Commit per item with the co-author trailer + push (Railway auto-deploys). **Update the tracker row
   (status `[x]`, commit hash, live evidence) AND the `ui-kit-rollout` memory.** `prefers-reduced-motion`
   fallback on every animation. **Gold = earned-money only.**

## Local run + seeding (Node 24, in-memory dev store)
```
SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000
```
- Seed admin: `POST /api/dev-test/seed-admin` · player: `GET /auth/demo` (phone +255700000000).
- **Populate the board:** `POST /api/dev-test/seed-markets` (adds ~25 live markets WITH 16-pt history so
  sparklines render), then `POST /api/dev-test/stress-bulk-bet {marketId,n,yesRatio,stake}` on a market for
  trader crests.
- **Trigger an error boundary** for a visual check: create a temp throwing route under a segment
  (e.g. `src/app/markets/boomtest/page.tsx` that `throw`s), screenshot, then delete it.
- **Force a locale** in Playwright: `context.addCookies([{name:"kp-locale",value:"sw",domain:"localhost",path:"/"}])`.

## Dev-server gotchas (Windows)
- Killing the `npx next dev` wrapper orphans the node child on :3000. If a restart fails with EADDRINUSE:
  `netstat -ano | grep ":3000"` → `taskkill //PID <pid> //F`, then restart.
- `switcher-test.mjs` needs a FRESH store (documented state-leak: /auth/demo reuses the phone admin-grids
  seeds as ADMIN). Restart the dev server before running it.
- `ui-regression.mjs` uses `domcontentloaded` not `networkidle` (the board polls live odds, never idles).

Start by: (1) read the tracker + kit specs; (2) implement A5 (the first unchecked row); (3) run the full
regression; (4) update tracker + memory + commit/push; (5) continue to the next unchecked row.
