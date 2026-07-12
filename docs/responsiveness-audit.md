# 50pick / Kipindi — Full-Platform Responsiveness Audit (sprint spec)

> **Mission:** every single surface, at every breakpoint, in every state and
> language, is pixel-clean and fully usable — **pages, popups, modals, dialogs,
> toasts, notifications, dropdowns, reports, tables, forms, buttons, the bet
> dial — everything.** Zero horizontal overflow, nothing clipped-not-scrolled,
> nothing off-screen, all touch targets usable. Player **and** operator.
>
> Created 2026-07-12. Drive it ONE lane at a time, screenshot + READ every cell,
> fix on sight, then the six-role sign-off (see `next-session-prompt.md §4.5`).

---

## 0 · Why this sprint
The engineering-consistency + finalization tracks are complete and gates are
green (`ui-regression` 158/158 at 360/768/1280/1920). But that matrix only
covers **top-level player pages in their default state**. It does **not** yet
exhaustively cover: the **smallest real phone (320)**, **landscape**, every
**overlay** (modals/dialogs/toasts/dropdowns/sheets/menus), **admin** at mobile
widths for real interactions, **reports/tables** scroll behaviour, **long-string
/ SW+ZH** overflow, and the **filled/edge** data states. This sprint closes all
of that.

## 1 · Breakpoints (test EVERY surface at each)
| Tag | Width×Height | Represents |
|---|---|---|
| xs | **320×568** | low-end Android / iPhone SE — the true Tanzanian floor |
| sm | **360×740** | most common Android |
| md | **390×844** | iPhone |
| lg-phone | **430×932** | large phone |
| land | **740×360** | phone **landscape** (keyboard-open + rotation) |
| tablet | **768×1024** | tablet portrait |
| tablet-L | **1024×768** | tablet landscape / small laptop |
| laptop | **1280×800** | laptop |
| desktop | **1920×1080** | desktop |

Also: **200% browser zoom** at 1280 (a11y reflow, WCAG 1.4.10) as a spot-check.

## 2 · Surface inventory (every route — nothing skipped)

### 2a · Player / public
`/` · `/markets` · `/markets/[id]` · `/positions` · `/positions/performance` ·
`/leaderboard` · `/proposals` · `/proposals/[id]` · `/proposals/new` · `/results`
· `/live` · `/wallet` · `/wallet/deposit` · `/wallet/withdraw` · `/profile` ·
`/profile/account` · `/profile/kyc` · `/profile/invite` · `/profile/sessions` ·
`/profile/source-of-funds` · `/profile/responsible-gambling` · `/fairness` ·
`/help` · `/legal/{terms,privacy,aml,responsible-gambling}` ·
`/auth/{login,register,otp,forgot-password,reset-password,verify-email}` · `/offline`

### 2b · Admin / operator (all 25)
`/admin` · `/admin/live` · `/admin/markets` · `/admin/markets/[id]` ·
`/admin/resolver-queue` · `/admin/resolver/[id]` · `/admin/ai-polls` ·
`/admin/ai-polls/[id]` · `/admin/candidates` · `/admin/proposals` ·
`/admin/sources` · `/admin/config` · `/admin/finance` · `/admin/payments` ·
`/admin/reports` · `/admin/players` · `/admin/players/[id]` · `/admin/players/cohorts`
· `/admin/affiliate` · `/admin/bonuses` · `/admin/invites` · `/admin/invites/[id]` ·
`/admin/compliance` · `/admin/moderation` · `/admin/aml` · `/admin/kyc/[id]` ·
`/admin/self-exclusions` · `/admin/privacy` · `/admin/retention` · `/admin/audit` ·
`/admin/system` · `/admin/ai-usage` · `/admin/approvals` · `/admin/2fa/setup`

## 3 · Overlays & interactive detail (the "every popup/toast/dialog" pass) 🔑
For EACH, open it and verify at xs/sm/land/tablet/desktop:

- **Modals / dialogs / `ConfirmModal`** — bet-confirm, cash-out, **seal ceremony
  (type-SEAL)**, KYC approve/reject/more-info, market void/emergency-cancel,
  payment kill-switch confirm, config-save confirms, delete confirms, 2FA/TOTP
  step-up, RG limit-change, self-exclusion, source-of-funds. → dialog fits the
  viewport (no off-screen header/buttons), scrolls INTERNALLY if tall, backdrop
  covers, focus-trap works, ≥40px targets, close reachable one-handed.
- **Toasts / snackbars** (success/warning/danger) — don't cover the bottom-nav /
  primary CTA; wrap long text; stack cleanly; dismissable; safe-area inset.
- **Notifications** — the bell badge + the **inbox dropdown/sheet**; long titles
  wrap; empty state; scroll within panel.
- **Dropdowns / popovers** — `Select`, `DateSelect`, `TimeSelect`, category/topic
  filters, sort menus, `nav-more`, the **avatar menu** (+ Staff-console jump),
  admin filter bars → open within viewport, never clip off-edge, scroll if long.
- **The conviction/bet dial** (`conviction-dial.tsx`) — drag arc + 3 stake inputs
  + **lock/unlock** at xs & landscape; the dial + inputs must both fit and stay
  operable; keyboard entry doesn't shove layout.
- **Sheets / drawers** — mobile filter sheets, onboarding, share sheet.
- **Tables / grids** — admin ledgers, players, audit, reports, resolver queue,
  finance → table scrolls **inside its own `overflow-x-auto`**, the PAGE never
  scrolls horizontally; sticky headers hold; row actions reachable.
- **Reports** — report-pack **stepper** (Draft→…→Ack), pack cards, catalogue
  cards, PDF/XLSX action rows → wrap/stack on mobile, no button overflow.
- **Forms** — register, KYC upload, **proposal-new** (multi-step), admin config,
  withdraw → labels+fields wrap, no clipped inputs, keyboard doesn't hide the
  submit, error text fits.
- **Chips / badges / meters / stat tiles** — never overflow their row; wrap or
  scroll; KPI rows reflow (no squished 5-up on 320).
- **Live ticker · stats band · market-card grid** — reflow columns cleanly; the
  ticker never forces page-width; cards go 1-up on phone.

## 4 · States to combine (each surface × each state)
default · **loading** (skeleton) · **empty** (unseeded) · **error** (failed
fetch / boundary) · **filled/edge** (long titles, huge numbers e.g. `TZS
1,234,567,890`, max-length names, many rows) · **EN / SW / ZH** (SW & ZH strings
are longer/wider → the #1 overflow source; test all three).

## 5 · Pass criteria (per cell)
1. **0 horizontal overflow**: `documentElement.scrollWidth ≤ clientWidth + 1`.
2. **No clipped-not-scrolled** content: anything overflowing lives in an
   `overflow:auto` container, not silently cut.
3. **Nothing off-screen**: modal/dialog/dropdown fully within the viewport;
   primary action always reachable.
4. **Touch targets ≥ 40×40** (buttons, chips-as-buttons, nav, dial controls).
5. **No overlap / collision**: text over icons, toast over CTA, sticky over content.
6. **Readable**: no text truncated without ellipsis; contrast ≥ 4.5:1 holds at all widths.
7. **Motion** honours `prefers-reduced-motion`.
8. **Screenshot READ** (not just captured) at xs + one desktop per surface/overlay.

## 6 · Method & tooling (build on what exists)
Existing, reuse/extend:
- `scripts/ui-regression.mjs` — player pages @360/768/1280/1920 (extend: add **320**, **430**, **landscape**).
- `scripts/responsive-overflow-test.mjs` · `scripts/overlay-responsiveness-test.mjs` · `scripts/chat-responsiveness-e2e.mjs` — overlay/overflow drivers to widen.
- `scripts/visual-matrix.mjs` — the route×locale×width screenshot matrix (add overlays + xs + admin@mobile).
- `scripts/admin-grids-smoke.mjs` — admin @360/1280 (extend to 320 + open one overlay per page).
- `scripts/axe-audit.mjs` — a11y (re-run at mobile widths for the reflow checks).

New (build this sprint):
- **`scripts/responsive-audit.mjs`** — the master driver: for each surface it
  loads at every breakpoint, **opens each overlay** (click the trigger), runs the
  §5 assertions, and writes shots to `.50pick-shots/responsive/<surface>/<width>-<state>.png`.
  Seeds via the dev-test endpoints; auths via `/auth/demo` (player) + `seed-admin` (operator).
  Emits a pass/fail table per surface. **Add `npm run test:responsive`.**

## 7 · Execution plan (lanes — ONE per verified batch, six-role gate each)
1. **Lane A — global chrome:** top-app-bar, bottom-nav, avatar menu, nav-more,
   live-ticker, toasts, notification inbox, footer — at xs→desktop + landscape.
   (These wrap every page, so fix here first.)
2. **Lane B — player core:** `/`, `/markets`, `/markets/[id]` (+ the **bet dial**
   & bet-confirm modal), `/positions`, `/wallet` + deposit/withdraw (+ payment
   dropdowns, KYC-lock, confirms).
3. **Lane C — player rest:** leaderboard, proposals (+ new-proposal form),
   results, live, profile subpages, fairness/help/legal, auth flows.
4. **Lane D — admin grids & filters:** markets, players, audit, finance,
   resolver-queue, aml, invites, bonuses, affiliate — **table scroll** + filter
   bars + KPI reflow at 320/landscape.
5. **Lane E — admin ceremonies & reports:** resolver/[id] seal ceremony, KYC
   decision rail, reports stepper + pack cards, config forms, payments kill-switch,
   2FA — every dialog/confirm at mobile.
6. **Lane F — states & i18n sweep:** loading/empty/error + **SW & ZH** long-string
   overflow across the highest-risk surfaces from A–E.
7. **Lane G — regression-lock:** `test:responsive` all-green + `ui-regression`
   (extended) + `axe-audit` @mobile + read the shot set; update this doc's
   checklist and the tracker.

## 8 · Progress checklist (tick as lanes land)
- [ ] Lane A — global chrome
- [ ] Lane B — player core (+ bet dial / confirm modal)
- [ ] Lane C — player rest
- [ ] Lane D — admin grids & filters
- [ ] Lane E — admin ceremonies & reports
- [ ] Lane F — states & EN/SW/ZH overflow
- [ ] Lane G — regression-lock + `test:responsive` wired into the gate
- [ ] `scripts/responsive-audit.mjs` built + `npm run test:responsive` added

> Update this file (§8 + notes) at the end of every batch, mirror into
> `SESSION_STATUS.md`, and append to `ui-rollout-tracker.md`.
