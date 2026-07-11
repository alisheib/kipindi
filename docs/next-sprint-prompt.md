> ⚠️ **SUPERSEDED (2026-07-11)** — use `docs/next-session-prompt.md` as the
> canonical handoff. This file is kept for history only; its mission was executed.

# Next session — "What's missing / loosely-built / needs better design" sprint

> Paste this as the opening prompt. It's a **discovery-first quality sprint**: find
> what's missing, half-built, or under-designed across the platform, then fix it —
> plus one concrete new feature (an admin↔player switcher) and license to bring in
> fresh design (glyphs / motion / screen redesigns) where it genuinely helps.

## Repo & workflow (unchanged)
- Repo `F:\kipindi-main`, branch `main`, push after every screen (Railway auto-deploys). Node 24, PowerShell tool.
- Stack: Next.js 16 · React 19 · TS · Prisma · in-memory dev store · kit in `src/components/ui` + brand in `src/components/brand.tsx`.
- Local admin: `SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000`; then `POST /api/dev-test/seed-admin {"phone":"+255700000000"}`. Player session: `GET /auth/demo`.
- Seed data: `stress-money`, `proposals-seed`, `seed-candidates`, `seed-ai-polls`, `seed-kyc`. **Restart the dev server between long runs** — repeated `stress-money` bloats the in-memory store and makes `/admin/compliance` (a per-all-users scan) hang. Not a bug; just clear state.
- Per screen: read → fix → `npx tsc --noEmit` + relevant `test:*` → live-drive with Playwright (`waitUntil:"domcontentloaded"`, screenshot to gitignored `.50pick-shots/`, then READ the screenshot) → commit + push. Retest scripts already exist: `markets-retest`, `polls-candidates-retest`, `reports-retest`, `proposals-retest`, `proposals-mixed-retest`, `resolver-queue-retest`, `admin-grids-smoke`. Money-path suites: `test:markets/proposals/emergency/bonus/ledger/audit/i18n/trilingual/admin-roles` — keep green.

## Ground rules
- **Do not fabricate legal/business values** (license no., TIN, dates, regulator citations) — flag them for Ali.
- Don't regress money paths. Reuse the kit + reference "good" screens; don't invent one-off UI.
- Prefer **discovery before building**: fan out read-only audit agents (general-purpose), synthesize grounded `file:line` findings, THEN fix per theme with commits + live tests. (This is how the last two sprints ran; it worked well.)

---

## PART A — Primary mission: find what's missing / loosely-built / needs redesign
Do a **platform-wide gap + quality audit** (player AND admin), then fix the concrete
wins. Look specifically for:

1. **Missing functionality** — buttons/links that lead nowhere or are stubbed; flows
   that dead-end; "coming soon"/mock/placeholder data (known stubs to evaluate:
   `admin/live` ui-stubs, `admin/compliance` "Sportradar stub adapter",
   `admin/finance` placeholder tax formula — decide real vs. acceptable-pre-integration).
2. **Loosely implemented** — happy-path-only features with no empty/error/loading state,
   weak validation, silent failures, no success/confirmation feedback, missing
   `OperationResultModal`/toast, actions without optimistic or pending UI.
3. **Under-designed screens** — pages that are functional but visually thin, cramped,
   or off-brand vs. the strong screens (markets detail, resolver queue, proposals).
   Candidates flagged earlier: `profile/invite` (distinct hero, no PageHeader),
   `results` (compact search-first header — confirm it's intentional), the legal
   pages (dense prose, unbranded header), several admin screens never deep-passed
   (sources, config, finance, players/cohorts, affiliate, bonuses, invites,
   compliance, moderation, aml, self-exclusions, privacy, retention, audit, system,
   ai-usage, approvals — they pass the smoke test + have the global refresh, but
   none had an individual kit/responsive/interaction deep-pass).
4. **Inconsistencies not yet caught** — spacing, empty-state patterns, confirm-dialog
   variants, tab controls (wallet underline vs positions pills), page-width conventions,
   duplicated components (the deposit/withdraw/wallet provider-card is copy-pasted 3×).

Deliver as ranked findings, then fix the high-value ones (commit per theme, live-tested).

---

## PART B — New feature: admin ↔ player switcher (admin-only, kit-clean)
Add a small, standards-compliant way to move between the **player app** and the
**admin console**, visible **only to admin-tier users**.

- **Gate:** `ADMIN_CONSOLE_ROLES` from `@/lib/server/roles` (ADMIN/COMPLIANCE/MODERATOR).
  `src/components/layout/app-shell.tsx` already loads `session` + the user `u` (has
  `u.role`) — pass an `isAdmin` flag down; render nothing for players.
- **Player → admin:** an admin-only control in the player top bar
  (`src/components/layout/top-app-bar.tsx` / `avatar-menu.tsx`) → link to `/admin`.
  Small, understated, unmistakably "staff" (gilt/gold accent like the admin
  confidential band), kit `Button`/`Chip` + a glyph (`I.shieldcheck` / `I.settings`).
- **Admin → app:** a "Back to app" affordance in the admin shell
  (`src/components/admin/admin-shell.tsx` top bar / sidebar) → `/markets` or `/`.
  There's currently no clean way back to the player app from admin.
- Must be responsive, i18n-clean, and match the kit. Design the exact affordance
  yourself (you know the kit better than Ali) — a segmented toggle, a labelled pill,
  or a menu item — pick the cleanest. Live-test both directions + confirm players
  never see it.

---

## PART C — Design latitude (use where it earns its place)
You may bring in **new design**, not just reuse: new glyphs, motion/micro-interactions,
animations, screen re-layouts, new object/card formations. Reference material in-repo:
- `50PICK/design_handoff_prediction_market_kit/` (Design Kit.html + `kit/design-canvas.jsx`)
- `docs/glyph-reference-for-design.md`, `docs/kit-gap-audit.md`, `docs/consistency-audit.md`
- The brand motion vocabulary already in `brand.tsx` (TippingBar recast, PulseRing,
  BrandSpinner, SignalPip) and `globals.css` keyframes — extend that language, don't
  fight it. Respect `prefers-reduced-motion`.
Use design deliberately: elevate thin screens, add a purposeful glyph where one's
missing, a tasteful transition where a state-change feels abrupt. No motion for its
own sake.

---

## Carry-over flags for Ali (from the 2026-07-06/07 sprints — need his input)
1. **Terms license number & TIN** are placeholders ("to be confirmed at launch",
   "TIN pending"). Footer reads `NEXT_PUBLIC_LICENSE_REF` from env — set it in Railway.
2. **SMS sender ID defaults to `"KIPINDI"`** (`src/lib/server/sms.ts`) — old brand,
   on every OTP text. Env-overridable (`SMS_SENDER_ID`) but sender IDs are
   telco-registered; don't flip blindly — confirm the registered ID, then set it.
3. **Reports say "50pick Africa"** (`src/lib/server/reports/brand.ts`) vs "50pick"
   elsewhere — confirm legal-entity name vs. align.
4. Deferred legal polish: effective-date lines on 3/4 legal pages (need real dates),
   terms↔privacy↔AML cross-links, OG brand-font loading (card works with fallback),
   minor `#0a0e33`/`#0c0e28` background-token drift.

## Carry-over: deferred Theme-4 player refactors (from the player-consistency sprint)
Extract shared components to kill duplication + unify interaction:
- one **provider-card** (deposit/withdraw/wallet, copied 3×),
- one **confirm-dialog** (cool-off/self-exclude/close-account differ),
- one **account-editor** pattern (name/email/password present 3 ways),
- unify **wallet vs positions tab controls**, align **profile page-width** (1080 vs 640),
- remaining raw **oklch/rgba** literals → tokens (home hero YES/NO, market-card popover,
  provider avatars, panel shadows).

## Suggested order
1. Discovery audit (agents) → ranked gap/quality report.
2. Admin↔player switcher (self-contained, high-visible value).
3. Fix the highest-value gaps/under-designed screens (commit per theme).
4. Theme-4 shared-component extractions.
5. Design elevations where they earn it.
