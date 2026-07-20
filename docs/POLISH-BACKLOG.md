# Polish backlog — localization, design, scale

> Produced 2026-07-20 by a three-way audit (localization completeness · design flaws ·
> scale readiness) run against `main` @ `8b0c96e`, with every HIGH/CRITICAL finding passed
> to an independent verifier whose job was to refute it. Only findings that survived are here.
>
> **Nothing in this file is shipped.** The one CRITICAL item found in the same pass — the
> fabricated market price history — was fixed and deployed separately (`6b1975b`).

## Status of the critical finding (done, for context)

`seedHistory()` fabricated a 16-point LCG random walk and `/markets/[id]` rendered it as real
price history to real-money bettors, on every market, after every deploy. Fixed in `6b1975b`:
`MarketSnapshot` table, `seedHistory` deleted, guard at `npm run test:history`. Charts now
start empty and fill with real bets. See `market-history.ts` header for the full story.

---

## 1 · FIX NOW — wrong, cheap, no money path touched

Ranked. Localization first, per the standing priority that Swahili must be perfect everywhere.

1. **Untranslated category on every market card** — `src/components/markets/market-card.tsx:278`.
   The most-seen untranslated token in the product: a Swahili player sees the filter chip
   `MICHEZO` above cards reading `SPORTS`.
   ⚠️ Do **not** reach for `categoryLabel()` — it has no `"other"` arm and renders blank.
   Build the map inline from `t.market.catSports|catMacro|catWeather|catCrypto|catCulture|catTech|catOther`,
   fall back to `catOther`, and narrow the prop at line 19 to `MarketCategory`.

2. **Selection-close time is 3 h wrong and English** — `src/app/positions/page.tsx:241`.
   **First check whether `TZ` is set on Railway** — that decides whether this is live.
   Add `formatDayTime(iso)` to `src/lib/utils.ts` (same fields, `timeZone: tz()`); do *not*
   reuse `formatDateTime`, which adds the year and overflows the 11 px line.
   Apply at `positions/page.tsx:241`, `markets/[id]/page.tsx:529` (`formatDate`),
   `profile/responsible-gambling/page.tsx:107` (`formatDateTime`),
   `positions/performance/page.tsx:101` (`formatDateShort`).
   Set `TZ=Africa/Dar_es_Salaam` on Railway regardless.

3. **Delete the dead shadow design system** — remove `src/app/micro-patterns.css` and its
   import at `src/app/layout.tsx:11`. 176 lines, 47 classes, 17 tokens, 15 keyframes — all
   verified to have **zero** TSX references. It is a hex-based parallel kit that future work
   will copy from by accident. Also drop `.chip50` from `scripts/ui-regression.mjs:63` and
   audit the duplicate `.is-interactive` / `.spark-draw` / `.btn-spin` in `state-tokens.css`.

4. **YES/NO buttons sit below the touch floor** — `src/app/globals.css:1867`: `height: 36px` →
   `40px`; absorb it by changing `.mcardp-actions` margin at `:1866` from `13px 0 11px` to
   `11px 0 9px`. **Keep the override** — it holds card-height parity with the resolved branch.
   Verify at 360 px in sw/zh; the labels contain a nested `%` span and may wrap.
   Do **not** touch the kit floor at `:475-476` (148 call sites including admin).

5. **Inverted text hierarchy** — `src/app/live/featured-contest.tsx:95` and
   `src/app/results/notable-carousel.tsx:64`: the de-emphasised `/ n` span uses
   `text-text-tertiary` (L86%) inside a `text-text-subtle` (L70%) parent, so the *quiet*
   element renders brighter than its parent. Both → `text-text-faint`.

6. **OG share card prints an ungrouped number** — `src/app/api/og/market/[id]/route.tsx:191`:
   wrap `{m.yesPool + m.noPool}` in the file's own `tzs()` helper (line 25). Currently a public
   social card reads `1500000 TZS volume`.

7. **13 hardcoded English page titles** — convert each to `generateMetadata()` + `getServerT()`
   (pattern at `src/app/markets/page.tsx:17`): `profile/{account,activity,invite,kyc,notifications,responsible-gambling,security,sessions,source-of-funds}`,
   `wallet/deposit`, `wallet/deposit/return`, `wallet/receipt/[id]`, `watchlist`.
   Also `src/app/layout.tsx:69` — derive `openGraph.locale` from the cookie it already reads at `:95`.

8. **English relative timestamps in the notification bell** —
   `src/components/layout/notifications-panel.tsx:55-63`. Add `t.common.relNow/relMinutes/relHours/relDays`
   in all three locales and pass `t` into `relTime`.

9. **Two missing loading skeletons** — add `loading.tsx` to `src/app/wallet/receipt/[id]/` and
   `src/app/wallet/deposit/return/`, reusing the sibling `/wallet` skeleton. Both do a DB read
   before painting, and the receipt is exactly where a player is anxious about their money.

10. **Two buttons, one action, two sizes** — `src/app/proposals/page.tsx:131,140`:
    `size="sm"`/`s={12}` → `size="md"`/`s={15}` to match the hero at `:71`. Both render
    simultaneously in the empty state.

11. **Invisible watermark + missing reduced-motion** — `globals.css:1822` opacity `0.055` →
    `0.18` (a 1.2 % lightness delta is nothing, and the hover reveal is behind `hover:hover`,
    so phones never see it). Extend `globals.css:1863` with
    `.mcardp,.mcardp-watermark{transition:none}` and `.mcardp:hover{transform:none}`.

12. **SSE payload carries stale English** — narrow `src/lib/server/event-bus.ts:37` to
    `{userId, notification:{id}}`. The sole consumer (`notifications-panel.tsx:113`) uses it
    only as a refresh trigger. Removes a loaded gun.

13. **aria-labels on shared primitives** — `src/components/ui/cash.tsx:90` ("balance hidden")
    and `src/components/brand.tsx:570` ("Loading"). Both are client components; call `useT()`.
    Leave the email placeholders and the 2FA mask alone.

---

## 2 · FIX SOON — real, but larger or needs a decision

- **Wallet transaction descriptions (i18n).** Do the no-migration half only: render the label
  client-side from the existing `type`/`provider` columns via a dict map, falling back to the
  stored `description`. Covers 7 of 13 sites, plus `wallet-client.tsx:297` (raw `tx.type`) and
  `wallet/receipt/[id]/page.tsx:90`.
  ⛔ Do **not** change `opts.description` where it feeds `postLedgerEntries`/audit
  (`wallet-service.ts:997,1004,1071`) — those must stay byte-stable English.

- **Chinese notifications.** Additive only (`notify()` already accepts `titleZh`).
  Do **RG (`notification-service.ts:783,795`) and KYC (`:723-755`) first** — a licensed
  operator needs the player to be able to read those. The remaining ~40 can follow.
  Email localization: narrow to subject line + `detailRows` labels via the `user.locale`
  already read at `email.ts:368`; do not refactor `sendEmailToUser`'s never-throws contract.

- **Cash-out failure headline.** Give `market-service.ts:1300,1363` codes
  `BONUS_FUNDED`/`ZERO_VALUE` and map them in a **local** mapper in `sell-button.tsx:130-133`.
  Do not reuse `conviction-dial`'s `errorToToast` unmodified — its INVALID arm says
  "insufficient balance", which is nonsense for a cash-out. Money gate applies.

- **Server-side date helpers** — `market-service.ts:366`, `wallet-service.ts:125`,
  `responsible-gambling.ts:36`. Same fix as FIX NOW #2 but in money files, so gated.
  Leave `email.ts:344` alone (already correct). Add the lint rule banning bare
  `toLocale*String` afterwards, with an escape for `"use client"` files.

- **`--text-tertiary` is identical to `--text-secondary`** (`globals.css:262`). One line —
  give tertiary ~`oklch(78% 0.060 268)`. Decision needed: it is also a chart fill
  (`score-band.ts:36`, `admin-charts.tsx:117,141,220,345`), so re-verify admin charts.
  Drop the `--text-disabled` half; that token has zero consumers.

- **Localized date output** — `utils.ts:51-72` is pinned to `en-GB`. Add an optional locale
  param defaulting to today's behaviour so it can land incrementally. Highest-leverage
  remaining language gap after FIX NOW #1.

- **Localize the OG route and the PWA manifest.** Both are new-install / shared-link surfaces
  — worth doing before marketing spend, not after.

- **OTP SMS is hardcoded to Swahili** — `auth-service.ts:170` passes a `"SW"` literal, making
  the EN/ZH branches at `sms.ts:156-163` dead code. Latent while SMS is off; fix before the
  SMS provider is armed.

---

## 3 · LATER — scale, with the threshold at which each bites

- **Leaderboard** (`src/app/leaderboard/page.tsx:75-80`) — `db.user.list()` with no `where`/`take`,
  then one positions query per user, uncached, on a **public** page. The comment claims
  "N+1 → 1"; it made the N+1 *parallel*, which is harder on the connection pool than serial.
  Bites at **~1k users**, and whoever shares the leaderboard link is the trigger.
- **`db.txn.listAll()`** (`prisma-dal.ts:835`) — `findMany()` with no filter or limit, called
  from 12+ sites that then filter by date **in JavaScript** (`analytics.ts:39,199,357`,
  `report-money.ts:131,143,167,205`, `reports/catalogue.ts:198,418,735`, `insights.ts:89`,
  `kyc-risk.ts:27`). The adjacent `txn.search` does it correctly and its own comment says this
  table "must never be walked in memory". Same shape on `db.wallet.listAll()`. **~1k users.**
- **Board N+1** — `markets/page.tsx` (`countComments` per card) and `positions/page.tsx:50`
  (serial market fetch, then `cashOutValue` per open position). Bounded by page size today.
  *(The `getCardChart` half of this was fixed in `6b1975b` via `getCardCharts`.)*
- **Missing composite indexes** — `Position [userId,status]`/`[userId,placedAt]`;
  `PredictionMarket [status,resolutionAt]` (the board's hot query currently has to choose
  between two single-column indexes).
- **SSE ceiling** — `event-bus.ts:58` `setMaxListeners(500)` with 4 listeners per client in
  `api/events/route.ts` ⇒ **~125 concurrent clients**, on a product whose pitch is live odds.
  User-scoped events are filtered *after* fan-out.
- **Lifecycle ticker** — serial sweeps on a 60 s interval guarded by a process-local boolean,
  including a trial balance that walks **every** wallet. Past one pass > 60 s it silently
  starts skipping, and nothing alerts.
- **Multi-container** — `admission.ts` (the DB-protection semaphore), `rate-limit.ts`, and the
  ticker's `lastReconcileAt`/`lastPaymentSweepAt` are all module-local. Correct today only
  because production runs ONE container.
- **Pending registrations** (`auth-service.ts:149`) — dropped on every deploy, so a player mid-OTP
  is told their session expired after already burning an SMS. Invisible: no funnel
  instrumentation and no error tracking.

---

## 4 · NOT WORTH IT

- **The 252 touch-target warnings** are mostly the desktop header nav (`a[Markets] 76×34`,
  `a[Live] 50×34`, …). WCAG 2.5.8 asks 24×24; the repo's own bar is 40. On pointer devices
  these are fine — only the genuinely thumb-reachable ones (FIX NOW #4, #10) are real.
- **The 4 `test:responsive` hard failures** are Playwright navigation races on admin routes
  ("Execution context was destroyed"), not defects. Baseline is 2012 / 4 / 252; hold that line
  rather than chasing it to zero.
- **`--text-disabled`** — zero consumers. Delete rather than fix.
