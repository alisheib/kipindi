# Next session — continue the Final UI enhancement Kit rollout

> Paste everything below the line into a fresh Claude Code session opened in `F:\kipindi-main`.
> The single source of rollout truth is **`docs/ui-rollout-tracker.md`** — the first unchecked
> row is always the resume point. This handoff just orients you.

---

You are continuing the **Final UI enhancement Kit** rollout (Claude Design's finished UI pass) into the
live 50pick app. Disciplined, one-item-at-a-time implementation — not redesign.

## Mindset — hold FIVE lenses at once, on EVERY item (non-negotiable, Ali)
For every tracker item — recon, decision, implementation, review — think **simultaneously** as all five and
let the tension shape the result: **1. integration engineer** (end-to-end data flow, server/client boundary,
i18n parity, money-path safety, REUSE the built primitives — don't rebuild/diverge). **2. UI/UX engineer**
(pixel polish, responsiveness 360/768/1280/1920, a11y kbd+aria+contrast, motion + reduced-motion, the card
standard — READ the screenshots). **3. software architect** (single source of truth, no divergence, delete the
superseded). **4. manager** (scope/risk, ship-vs-defer, flag to Ali; keep tracker + memory truthful). **5. player**
(the Tanzanian end-user: clear, trustworthy, fast, delightful, RG-safe, correct in EN/SW/ZH). If any lens raises
a concern, resolve it or record it — never ship past it silently.

## ⚑ Standing directives from Ali (this session — keep obeying)
1. **Perfection standard — nothing less.** Every detail, every width, every locale.
2. **Production shows ONLY live data — never seed/test data.** All `dev-test` endpoints are 404 in prod, and the
   new UI HIDES when its real aggregate is empty (home stats band hidden at 0 settled; results donut/featured only
   when resolved markets exist). A fresh prod deploy must show *nothing* until genuine markets resolve.
3. **Responsiveness-test at 360 (mobile) FIRST on every item**, then 768/1280/1920. Lots of users are mobile.
4. **Gold = earned-money / earned-status only** ("no one is above the law"). Nav/CTA gold → royal.
5. **Never regress money paths** (deposit/withdraw/bet/resolve/payout). Run `test:wallet` + `test:numeric` on any
   money-touching item.

## Done — PART A+B COMPLETE · LOGO REPLACED · PART C through C2d (all pushed to `main`)
Read `docs/ui-rollout-tracker.md` for the full row-by-row log. Highlights this session:
- **LOGO REPLACED → mark-a** (`fe81145`): the old ringed "50" needle mark is GONE. New mark = a circle split
  YES-emerald LEFT / NO-rose RIGHT by a diagonal chord + gilt needle + gilt/navy hub (no ring, no numerals — the
  wordmark carries the name). `FiftyMark` (brand.tsx) rewritten (same API → all in-app chrome auto-updated); all
  favicons/app-icons/OG/email+report letterhead regenerated via `sharp`. Source SVGs committed under
  `Final logo design/`. Brand hex: green `#1EA362` · red `#B03A3E` · gold `#E3BC66` · pivot navy `#1A2140`.
- **Bell badge fix** (`f1a0224`): the unread badge now hugs the bell's top-right (the button renders 80px).
- **PART C so far:** C1a market-detail hero states (`8ed7b83`) · C1b KYC 4-node rail + ID silhouettes (`5eda4a7`)
  · C1c sessions device card (`2a15281`) · C1d fairness 5-step chain (`f511647`) · C1e /live aqua hero + dense
  bar-wall (`bb6e164`) · C2a home animated stats band (`4f021cb`) · C2b results YES/NO donut + featured card
  (`4dbf8e6`) · C2c positions countdown-ring + exposure bar (`0c42b35`) · C2d performance best-win crest + streak
  pip-chain (`371eb5a`). i18n parity now **1216³**. ui-regression **158/158**.

## RESUME HERE → first unchecked row = **C2e** (`/wallet/withdraw`) — ⚠ MONEY PATH
Spec §C2e: KYC-lock line-art (padlock over ID silhouette — reuse B3 `kyc` idiom), merge the three notices into one
iconized panel, **route the amount through the deposit's kit control and balance through `<Cash>`** (both are open
audit flags on a money path). Then C2f–C2m in tracker order, then admin reporting ADM1–4.
- **C2h** consumes the already-drawn B3 `rg` EmptyState illustration — don't redraw it.

## Reusable primitives already built — USE these, don't rebuild
`FiftyMark`/`FiftyLockup`/`FiftyTile` (mark-a, brand.tsx) · `RewardBurst` (brand/reward-burst) · `PaymentLogo`+
`MNO_LOGOS` (wallet/payment-logo) · `Admin*` charts (admin/admin-charts) · `categoryGlyph()` + `I.*` (ui/glyphs) ·
`EmptyState` kinds incl. kyc/fairness/rg (ui/empty-state) · `BackLink` · `NavMore` · `PageHero` glow=info/gold/aqua
(ui/page-hero) · `motionReduced()`+`haptics.*` (lib/haptics). **New this session (PART C):** `CountdownRing`
(positions/countdown-ring — serverNow-seeded, aqua→gold<1h) · `StatsBand` (home/stats-band — count-up on
scroll-in) · `OutcomeDonut`+`FeaturedResult` (inline in results/page) · `StreakChain` (inline in performance/page)
· `FairnessChain` (inline in fairness/page) · `ProgressRail` (inline in kyc/page) · `IpReveal` (profile/ip-reveal)
· CSS `.gilt-hairline` / `.closing-pill` / `@keyframes closing-pulse` (state-tokens.css, RM-safe).

## Per-item working loop
1. Implement ONE item. Never regress money paths.
2. `F:/kipindi-main/node_modules/.bin/tsc.cmd --noEmit` + relevant `npm run test:*` (money/i18n). Trilingual
   EN/SW/ZH; adding keys keeps parity across all three (currently **1216³**).
3. **Live-drive** on a fresh dev server → screenshot to `.50pick-shots/` → **READ the shots** (mobile 360 FIRST).
4. `node scripts/ui-regression.mjs` must stay **158/158** — grow ROUTES as new UI lands.
5. Delete superseded code in the same commit. Commit per item with the co-author trailer + push. Update the
   **tracker row** AND the `ui-kit-rollout` memory.

## ⚠ Dev/verification notes (learned this session)
- **Real resolved-market data:** the dev store has NO resolved markets by default (`listMarkets` filters only
  `"Demo · "` titles; nothing resolves the rest; `stress-regulator-grade` only does stage-1). There is an
  **uncommitted** dev endpoint `src/app/api/dev-test/resolve-seed-markets/route.ts` (404 in prod, on disk) that
  bets on real seed markets, pulls resolutionAt into the past, **two-officer resolves** them (stage-1 officer A +
  stage-2 officer B → pays winners), AND seeds the demo user (+255700000000) with 4 wins / 1 loss / 5 open. Use it
  to verify resolved-market + positions UI against REAL data (`POST {count,betsPerMarket}`). **DELETE it at final
  rollout cleanup** (Ali: only live data ships; it never ships anyway — 404 in prod — but keep the tree clean).
- **ui-regression gotcha:** ensure ONE clean dev server first. An orphaned prior `next dev` on :3000 (seeded store)
  makes ui-reg report dozens of FALSE fails (all the benign `navigator.vibrate` "no user gesture" warning).
  Fix: `taskkill //F //IM node.exe`, confirm `netstat -ano | grep ":3000"` shows a lone PID, then one fresh server.
- **Windows shells reset cwd** after `cd`; call binaries by absolute path or `cd /f/kipindi-main && <cmd>` in one
  Bash line. Force a Playwright locale via cookie `{name:"kp-locale",value:"sw",domain:"localhost",path:"/"}`.

## Local run + seeding (Node 24, in-memory dev store)
```
SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000
```
Seed player: `GET /auth/demo` (+255700000000). Seed admin cookie: `POST /api/dev-test/seed-admin {"phone":"+255700000000"}`.
Populate board: `POST /api/dev-test/seed-markets`. Real resolved + demo ledger: `POST /api/dev-test/resolve-seed-markets`.

## The card standard (Ali, non-negotiable)
MarketCards are the iconic surface — perfect, consistent, responsive or we fail. When a change touches a
card-like surface, audit the real populated grid at 360/768/1280/1920 and READ the shots: uniform heights,
columns reflow, aligned buttons, zero h-overflow. (Default **Today** filter often shows 1 card — select All.)

Start by: (1) read `docs/ui-rollout-tracker.md` (first `[ ]` = resume = **C2e**) + spec §C2e in
`Final UI enhancement Kit/50pick-design-final/spec/50pick-refinement-spec.md` line 135; (2) implement C2e with a
money-path audit (route amount/balance through kit controls, merge notices, KYC-lock line-art) — run
`test:wallet`+`test:numeric`; (3) full per-item loop; (4) update tracker + `ui-kit-rollout` memory; (5) continue
C2f→C2m, then ADM1–4. Hold the five lenses on every item.
