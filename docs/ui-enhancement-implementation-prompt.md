# Next session — Implement the "Final UI enhancement Kit" (Claude Design pass)

> Paste everything below the line into a fresh Claude Code session opened in `F:\kipindi-main`.
> Goal: **port Claude Design's finished UI pass into the live app**, screen by screen, without
> regressing money paths. The design work is done and machine-verified — this session is disciplined
> implementation, not redesign.

---

You are implementing the **Final UI enhancement Kit** that Claude Design delivered. It lives at:

    F:\kipindi-main\Final UI enhancement Kit\50pick-design-final\

**Read these first, in order:** `README.md` (contents + integration order), `QA-REPORT.md` (what's
verified), then the three specs — `spec/50pick-refinement-spec.md` (the §9-format pass: PART A =
A1–A10 cross-cutting; PART B = refine-existing keep/upgrade; PART C = per-page; PART D = systems
answers incl. the unified state-token recipe; PART E = asset list + 6-batch plan), `spec/50pick-
micro-interactions-spec.md` (**normative** motion/z/glow, buttons, chips, filter/sort/pager, loaders,
forms, toasts, tooltips, confirmation hierarchy, ledger/receipt, celebration timelines, badges), and
`spec/50pick-admin-reporting-spec.md`. **`reference/50pick-reference-build.html` + `reference-app.js`
is the living standard — open it in a browser and PORT its behavior; do not reinterpret it.** HTML
specimens under `specimens/` show the target states.

## What's DROP-IN (use directly)
- `code/glyphs-additions.tsx` — merge into `src/components/ui/glyphs.tsx`: spread `...Iplus` into the
  `I` export (same `G`/`G64` wrapper idiom). Its redraws of `percent`, `activity`, and `bank→landmark`
  **replace** the flagged originals.
- `code/state-tokens.css` and `code/micro-patterns.css` — add after `globals.css`; apply
  `.is-interactive` to Button/Chip/card CTAs (or fold the four rules into the existing `.btn` recipe).
  Every animation already has a `prefers-reduced-motion` fallback — keep it.
- `svg/glyphs/*` (59, currentColor) · `svg/glyphs-ink/*` (pre-tinted for emails) · `svg/empty-states/*`
  (5 new: proposals, kycRail, fairnessChain, rgSelfCare, adminGeneric) · `svg/badges/*` +
  `svg/badges-gilt/*` (12 medallions — map tiers I–V to the canonical `TierBadge` enum; locked = 30%
  muted ink + lock overlay) · `public/pay/card.svg` + `bank.svg` · `og/*.svg` masters (rasterize where
  Sora/Inter/JetBrains Mono are installed, or via the Satori pipeline) · `comms/*` (email + SMS/WA
  templates — `{{tokens}}` are server-side).

## Suggested implementation order (commit + live-test each)
1. **Foundations:** merge glyphs-additions.tsx; wire state-tokens.css + micro-patterns.css. Verify
   `tsc`, i18n parity, and that existing screens still render (admin-grids-smoke, markets-retest).
2. **A1 — MarketCard v2** (the verdict's #1 move): render the already-fetched `spark` + trader crests;
   demote the MoveChip to mono micro-text. One change lifts `/`, `/markets`, `/live`, `/results`.
3. The rest of **PART A** in order: A2 `AuthShell` + brand side-rail (lights up all 6 auth pages) ·
   A3 shared `RouteError` (7 boundaries) · A4 `PageHero` on the 5 bare routes (+ `glow=aqua` for /live)
   · A5 shared reward-burst · A7 category-art layer · A8 admin primitives (`AdminKpi spark`,
   `AdminBarList`, `AdminMeter`, `AdminFunnelChart`) · A9 invite share-card + QR + wallet balance spark
   · A10 leaderboard podium. (A6 MNO logos — see "not in the kit" below.)
4. **PART B refine-existing** (per its keep/upgrade verdicts): ConvictionDial thumb-pip + SW label
   width + the RG detent past 50× · redraw `emptyMarkets` + widen empty boxes to 360px · button/chip
   state systematization + kit-drift fixes (padding, `--r-md`, 0.7s spinner) · bet-confirm pool-share
   sentence (EN/SW/ZH) · OperationResultModal success → reward-burst end-frame · redraw the 3 glyphs.
5. **PART C** per-page items, then the **admin reporting** surface (Batch 3 spec).

## OLD design — what to KEEP vs what's NOT needed
**KEEP as reference while implementing:**
- `docs/design-master-brief.md` — the spec cross-references its § numbers; it's the map.
- `docs/visual-assets-brief.md` — the **bitmap tier is deliberately NOT in the kit** (see below); this
  brief holds the exact paths/dimensions/art-direction for it.
- `docs/glyph-reference-for-design.md`, `docs/kit-gap-audit.md` — the spec cites gap-audit A-1/A-2/A-6.
- The existing design system in-code (`globals.css`, `brand.tsx`, `glyphs.tsx`, `empty-state.tsx`,
  `chip.tsx`, `button.tsx`, `admin-shell.tsx`) — the kit **merges into** these, never wholesale-replaces.

**Already removed (spent outbound-ask artifacts — the answer is now in-hand):**
- `50pick-DESIGN-perfect-truth.zip` (the outbound bundle), `docs/design-prompt.md` (the outbound
  prompt), and `docs/design-handover.md` (the outbound handover; its §6 questions are answered in the
  spec's PART D). Recoverable from git history if ever needed.

**Superseded — don't design against these:**
- `50PICK/design_handoff_prediction_market_kit/` (the v1 theme kit) — superseded as the authoritative
  reference by the Final Kit's `reference-build.html`. Retained as archive only; do not design against it.
- Assets the kit explicitly replaces: the 3 flagged glyph originals, the weakest `emptyMarkets` scales
  illustration, the current F1 hero image, and the **two orphan hero components** the audit flagged
  (delete these as you port; the 20 orphan hero slides were already removed).

## NOT in the kit — must be SOURCED, do not fabricate (flag to Ali)
- **MNO brand logos** (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas) — trademarked; source official
  assets from each operator's brand portal. `mobileMoney.svg` is the in-house interim tile; `card.svg`
  + `bank.svg` are delivered.
- **Bitmap tier** — hero photo, in-page banners (propose/bonus/invite), category art ×7, section
  texture, win-seal PNG. Needs an image pipeline; exact paths/dims in `visual-assets-brief.md` Part E
  and the spec Part E. (This is where an image-gen tool comes back in.)
- **Regulator seal** — never fabricated; the deposit trust strip ships with a labeled slot until the
  licensed asset is supplied. Also still open: **SMS sender ID** (`"KIPINDI"`) and the real **deploy
  domain** — env-driven, need Ali's registered values.

## Maintain your OWN rollout tracker + apply the kit step-by-step
- First thing: create **`docs/ui-rollout-tracker.md`** — one row per item (A1–A10, B1–B12, the PART C
  per-page items, admin reporting, and each asset). Columns: item · status `[ ] / ~ / [x]` · commit ·
  live evidence (screenshot/test) · notes. This is the single source of rollout truth. **Update it after
  every item** and work strictly against it, one step at a time — never batch-blind. If context resets,
  the tracker tells the next run exactly where to resume.
- Report progress against the tracker at the end of each batch (done / in-flight / next).

## Clean up as you go — leave no dead UI behind
- When you port a surface, **remove the old thing it replaces** in the same commit: superseded
  components (e.g. the 2 orphan hero components, the replaced glyph originals), dead CSS classes,
  orphaned imports/assets, now-unused exports. Do **not** leave old + new side by side "just in case."
- After each batch, sweep for rot: `tsc` (catches dead imports), grep for now-unreferenced
  components/classes/assets, and delete them. Old, unused progress must not accumulate or mislead later.

## Full regression AFTER EACH batch/sprint (automatic — don't skip)
Before starting the next batch, run the whole suite and only proceed when green:
- **Correctness:** `npx tsc --noEmit`; all money + i18n suites
  (`test:markets/proposals/emergency/bonus/ledger/audit/i18n/trilingual/admin-roles`);
  `admin-grids-smoke`, `markets-retest`, `switcher-test`.
- **Responsiveness / CSS / UI (add a reusable `scripts/ui-regression.mjs`):** Playwright over the key
  player + admin routes at **360 / 768 / 1280 / 1920** — assert **no horizontal overflow**
  (`scrollWidth ≤ clientWidth + 1`), **zero console/page errors**, that primary interactions still fire
  (open avatar menu, market filter, bet dial focus, a form submit), and **screenshot each changed screen
  → READ the screenshot** to confirm no visual break, overlap, or contrast regression. Keep this script
  and grow it as new UI lands, so every later batch re-verifies the earlier ones.
- Log the regression result in the tracker row. A batch isn't "done" until this passes.

## Working rules (unchanged from the platform's standards)
- **Never regress money paths** (deposit/withdraw/bet/resolve/payout).
- Per change: `tsc` + relevant `test:*` → **live-drive with Playwright** (seed admin + `/auth/demo`,
  screenshot to gitignored `.50pick-shots/`, then READ it) → commit + push (Railway auto-deploys).
- **Trilingual EN/SW/ZH** — show the SW state; nothing may truncate (i18n parity stays 1202³).
- **`prefers-reduced-motion`** fallback on every motion. **Gold = earned-money only.** Reuse the kit;
  name tokens. Commit per batch/theme with live evidence.
- Local run (Node 24): `SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development
  DISABLE_ADMIN_TOTP=true npx next dev -p 3000`; seed admin via `POST /api/dev-test/seed-admin`;
  player via `GET /auth/demo`; markets via `POST /api/dev-test/stress-money`. Restart the dev server
  between long runs (stress-money bloats the in-memory store).

Start by: (1) create the rollout tracker; (2) read the kit's README + specs + reference build; (3) do
step 1 (foundations); (4) run the full regression; then report before proceeding to A1.
