# 50pick / Kipindi — Player-View Audit (2026-06-28)

> **STATUS — fixes applied 2026-06-28.** All 5 blockers, all High items, and most Mediums/Polish below have been implemented and verified (typecheck + unit suite + production build all green). Cash-out (B2) was resolved per the operator's clarification: cash-out is an *early exit* (stake back, free in the window, −fee after), never a profit — so the UI was made honest rather than the math changed. **B5 (referral on signup) was intentionally left in place** as the documented testing mode (deposits aren't live yet). **Deliberately NOT changed** (need design QA / are refactors, not bugs): radius-scale reconciliation, `<Toggle>` `left`→`transform`, `safeNextPath` extraction, OTP-countdown seeding (page now gated/dormant). Admin role is a separate session.

Full-surface audit of the **player (user) role** only. Admin role is a separate session.
Payment-gateway internals and SMS sending were explicitly out of scope (still in progress) — but wallet/deposit/withdraw **UI**, copy, and notification wiring were reviewed.

Method: 7 parallel evidence-based read-only lanes (auth, KYC/SoF/RG, betting/markets, wallet/rewards/referral, profile/nav/shell, design-system/theming, email). Every finding cites `file:line`. No code was changed during the audit.

Severity key: 🔴 Blocker (fix before real-money launch) · 🟠 High · 🟡 Medium · 🔵 Polish.

---

## 0. Headline — the scariest cluster: false statements shown to players

For a *licensed real-money* product, the most dangerous findings are screens that **tell the player something untrue about money**. Three of the five blockers are exactly this:

1. **"TZS 10,000 starter credit is in your wallet"** welcome toast — the new user actually has **TZS 0**. (Lane 5)
2. **Cash-out "Locking in TZS X profit"** — cash-out can **never** pay a profit; it always returns stake − 9%. (Lane 3)
3. **Deposit minimum** is stated as 500 / 1 / 500 across three places and the server contradicts itself. (Lane 4)

These should be triaged first.

---

## 1. 🔴 Blockers

### B1 — Welcome toast promises TZS 10,000 the new player doesn't have
`src/components/layout/auth-flash.tsx:23` · cross-ref `src/lib/server/auth-service.ts:257,407`, `affiliate-config.ts:75`
On `welcome=new` the toast asserts *"TZS 10,000 starter credit is in your wallet."* The real starter balance is the admin knob `starterBalanceTzs`, **default 0** (only hard-coded tester phones get 100,000). The 10,000 figure is actually the *referrer* affiliate reward, not a signup credit. New player lands on `/profile/kyc?welcome=new`, is told they have 10,000, opens the wallet → sees 0. **False financial statement on the first screen.**
**Fix:** drive the toast from the same value the wallet is seeded with; suppress the credit line when `starterBalanceTzs === 0`.

### B2 — Cash-out can never pay a profit, but the whole sell UI promises one
`src/lib/server/market-service.ts:701-718` · `src/components/markets/sell-button.tsx:90-135` · `sell-confirm-modal.tsx:132-134`
`cashOutValue` returns `value = round(stake × (1 − feeRate))`, `gross = stake` — i.e. cash-out always returns the player's **own stake minus 9%** (or full stake in the 5-min grace). `net = value − stake` is **always ≤ 0**. Yet SellButton styles a gold "profit" tone at `ratio ≥ 1.05`, fires `dispatchWinCelebration({kind:"CASHOUT"})` when `net > 0` (impossible), and the modal says *"Locking in TZS X profit."*
**Decision needed:** either the cash-out model is wrong (should pay an early-exit pool share) or the entire profit/celebration UI is dead/misleading. Code and copy must agree.

### B3 — Deposit minimum stated three different ways; action guard contradicts the schema
`src/app/wallet/deposit/deposit-amount.tsx:82` ("Min TZS 500") · `deposit/actions.ts:22` ("between TZS 1 and 2,000,000") · `validators.ts:80` ("Minimum deposit is TZS 500")
A player entering 100 passes the page guard, hits the schema, and bounces back with a *different* minimum than the action's own error claimed. Contradictory limits on a money form read as broken and are a compliance smell.
**Fix:** make the action reject `amount < 500` with one canonical message; keep helper text in sync (single source).

### B4 — Broken `mailto:` on the main KYC screen renders JS source as the email address
`src/app/profile/kyc/page.tsx:245`
DOB "Wrong? Contact support" link uses `` `mailto:${SUPPORT_EMAIL}` `` (function reference) instead of `${SUPPORT_EMAIL()}` (every other usage calls it, e.g. `:148`). React stringifies the function → `href` becomes `mailto:function SUPPORT_EMAIL() {...}`. Visible to every user with a DOB.
**Fix:** `${SUPPORT_EMAIL()}`.

### B5 — Referral pays the referrer on SIGNUP (testing mode) — the documented launch-revert
`src/lib/server/affiliate-config.ts:72-77` · `affiliate-service.ts:241-260`
Default config ships `trigger:"SIGNUP"`, `referrerAmountTzs:10_000`, `recipient:"REFERRER"`, so TZS 10,000 (bonus wallet) is paid on **every sign-up** with no deposit/bet gate. The only anti-farm guard is a best-effort same-IP check via an **in-memory** session map (empty/unreliable in prod). Classic fake-account farm vector.
**Fix (launch):** flip to `trigger:"FIRST_DEPOSIT"` (path exists at `affiliate-service.ts:427-429`) or `prize.milestone:"FIRST_BET"`; confirm at `/admin/affiliate`.

---

## 2. 🟠 High

### Compliance / correctness
- **Bet placement not gated on `SELF_EXCLUDED`/`COOLED_OFF` *status* — only the RG timer.** `src/lib/server/market-service.ts:207-226`. Deposits (`wallet-service.ts:52`) and login (`auth-service.ts:71,503`) check both; betting relies solely on `isLockedOut()` timestamps. If timer and status diverge (admin clears timer, data migration), a self-excluded player could bet. **Fix:** add explicit status check alongside the `SUSPENDED`/`CLOSED` block.
- **Voided markets never fire the player's in-page resolution toast/celebration.** `src/app/api/fairness/recent/route.ts:40` only feeds `status:"RESOLVED"`; the NotifyPoller (`notify-poller.tsx:107`) never prunes VOIDED markets and re-polls forever. **Fix:** include VOIDED in the feed; prune on void.
- **Inline payout/lean projection uses hardcoded default fees, not effective per-market config.** `src/components/markets/conviction-dial.tsx:397-400` calls `payout.ts` (fixed 9%) while settlement uses `getEffectiveConfig(marketId)` (`market-service.ts:892`). Under a per-market fee override the `HouseLeanWarning` can disagree with reality. **Fix:** feed effective config into the client projection or compute lean server-side.
- **`/live` hero labeled "Most contested" actually shows the soonest-closing market.** `src/app/live/page.tsx:116-123` uses `markets[0]` (sorted by `resolutionAt`); the real tipping calc `tippingMarkets` (`:60`) is computed but unused. **Fix:** sort by `abs(yesPct-50)`.

### Money UI / privacy
- **Withdraw uses raw `<input>` while deposit uses the kit.** `src/app/wallet/withdraw/page.tsx:150-163,182-194`. Different focus rings/heights; browser number spinner leaks back (deposit deliberately removed it). **Fix:** use `DepositAmount`-style control + `<Input prefix="+255">`.
- **Withdraw balance bypasses `<Cash>` — hide-balances eye leaks.** `src/app/wallet/withdraw/page.tsx:71-77` prints raw `.toLocaleString()`; everywhere else honors the global mask. **Fix:** render through `<Cash>`.

### Email gaps (account security / completeness)
- **OTP signup/login send no welcome or login email.** `src/lib/server/auth-service.ts:174-295` (`verifyOtpAndAuth`) — only the password path (`:457`, `:604`) sends them. Whether a player gets a welcome / new-sign-in security email depends on which form they used. **Fix:** mirror the password-path sends in `verifyOtpAndAuth`.
- **Account closure sends no email and no in-app notice.** `src/lib/server/user-service.ts:57-85` writes only an audit row. A licensed operator should confirm a one-way closure. **Fix:** add closure email + `notify()` (template needs creating).
- **Email-address change fires no security alert to the old address.** `src/lib/server/email-verification.ts:104-109` only mails the new address. Account-takeover red flag. **Fix:** alert the previous address + in-app `notify()` (copy the `passwordChanged` pattern).

### Design-system (cross-cutting)
- **Form-field family is fragmented — five different input styles, none the canonical `<Input>`.** Three local `Field()` redefinitions (`profile/kyc/page.tsx:404`, `source-of-funds/page.tsx:246`, `responsible-gambling/page.tsx:195`) diverge in height (h-10/h-11), radius, background, and focus ring — **the KYC player page even uses `admin-focus`** (`kyc/page.tsx:435`). Plus withdraw raw inputs, deposit's gold-ring reimplementation, close-account's red ring, and underline-only name/email editors. **Highest-leverage fix:** route all through `<Input>`/`<Field>` (already supports `prefix`, `mono`, `error`, `size`). Resolves the inconsistency *and* the stray admin-focus.
- **Dual radius scale (the clearest "two systems" signal).** globals.css tokens (`--r-sm:8px/--r-md:12px/--r-lg:16px`) ≠ Tailwind (`sm:4px/md:8px/lg:12px`). `rounded-lg` (12px) sits next to `var(--r-lg)` (16px) for the "same" radius. **Fix:** reconcile to one set of values.
- **Leaderboard re-implements `TierBadge`.** `src/app/leaderboard/page.tsx:225` ignores the exported `<TierBadge>` / `.tier-*` classes; same tier looks different here vs everywhere. Also `sovereign` + `silver` both render "S" (`:233`). **Fix:** import the canonical badge.

### Nav / IA
- **Two orphan hero components — heavy, unreferenced.** `src/components/landing/hero-constellation.tsx` and `hero-slideshow.tsx` are imported nowhere (live landing uses static `hero-bg.webp`). Slideshow references 20 image assets; constellation runs 7 dials + 18 particles. **Fix:** delete, or wire one in deliberately and drop the static hero.
- **Source-of-Funds has low discoverability.** `src/app/profile/page.tsx:210` — reachable only from the settings grid; no banner/notification drives players there when AML thresholds trigger (KYC gets a dedicated banner + avatar-menu entry). **Fix:** surface SoF the way KYC is when required.

---

## 3. 🟡 Medium

### Accuracy / copy / data honesty
- **Wallet "Methods" & "Limits" tabs are hardcoded mock data shown to real players** (fake "+2557*****99", fake TZS 50,000 daily limit, "Edit" links implying they're live). `src/app/wallet/wallet-client.tsx:317-330,442-505`. **Fix:** hydrate from real data or remove before launch.
- **Deposit "Funds typically arrive within 60 seconds"** but real async mobile-money returns `PROCESSING` and credits on webhook. `src/app/wallet/deposit/page.tsx:151-153`. **Fix:** soften to "usually within a minute."
- **SoF status shows raw enum text to players** — `PENDING`, income band id `12m-50m`, source id. `src/app/wallet/.../source-of-funds/page.tsx:121,127,129`. **Fix:** map to the display labels the page already has.
- **Bonus/invite copy overstates current behavior** — bonus empty state promises "winning proposals"; invite "How it works" implies play is required before the referrer earns (opposite of current SIGNUP trigger). `wallet-client.tsx:177-180`, `invite/page.tsx:197-201`. **Fix:** tie to B5 revert.
- **Leaderboard hides all real players below 6 rows** (shows 12 fake), and has no `<RefreshPoller>`. `src/app/leaderboard/page.tsx:133`. **Fix:** show real players from row 1; add poller.
- **Stale dial docs:** comments say "1×→5×" but the dial reaches **200×** (TZS 500 → 100,000 in one gesture). `src/components/markets/conviction-dial.tsx:10,152,292`. Worth a deliberate RG review of the 200× cap, not just a comment fix.

### Email
- **SoF submission has no acknowledgement** (only `?saved=1`); KYC submit sends `kycSubmittedHtml`. `source-of-funds/actions.ts:45`. *(Note: SoF accept/reject emails DO fire from the admin approvals action — `approvals/actions.ts:69` via `sofDecisionHtml`/`notifySof`. The earlier Lane-2 claim that they were missing was a false positive.)*
- **`sessionRevokedHtml` is dead code — session revocation is silent.** Defined `email.ts:852`, never wired; `session-registry.ts:103` sends nothing. **Fix:** wire from the single-session enforcement point or delete.
- **Withdrawal failed/returned is in-app only; `amlRejectRefundHtml` orphaned.** `wallet-service.ts:317`. Breaks the dual-channel money rule. **Fix:** send the email on failed/AML-reject refund.
- **Cool-off confirmation has no in-app notification** (email only); self-exclusion does both. `responsible-gambling.ts:210`. Phone-only RG users get no confirmation. **Fix:** add `notifyCoolOff` mirroring `notifySelfExclusion`.
- **SoF "MORE_INFO" decision can't reach the player** — template branch exists (`email.ts:807-835`) but approvals only passes ACCEPTED/REJECTED. **Fix:** expose MORE_INFO or remove the branch.
- **No cashback-specific email** — cashback fires the generic "Bonus added" email; a player making one deposit gets two emails seconds apart. `wallet-service.ts:224-244`, `bonus-service.ts:143`. **Fix:** dedicated cashback copy or consolidate.

### Auth
- **`/auth/otp` surface is shipped but unreachable from the live (password) flow — and broken if hit directly** (stale link → `EXPIRED`). `otp/page.tsx:68`, `login/actions.ts:110`, `auth-service.ts:226`. **Fix:** feature-flag/404 until SMS OTP is wired.
- **OTP code box is a raw `<input>` at a 3rd height (52px vs 48px).** `otp/page.tsx:76-89`. **Fix:** `OtpInput` atom at `h-12`.
- **Two banner styles across the 4 auth pages** (rich on login/register, flat on otp/forgot/reset). **Fix:** one `<AuthBanner>` atom.
- **Stale comments point to a non-existent `auth/(public)/layout.tsx`** (guard actually lives in `auth/layout.tsx`). `login/page.tsx:23-24`, `register/page.tsx:23-25`.

### Design-system
- **~20+ raw `<button className="btn …">` instead of `<Button>`** (markets + layout + profile), several overriding radius/height inline. Consistency-debt path by which sizes drift.
- **Two toggle implementations; the GPU-friendly one is dead.** `<Toggle>` animates `left:` (a layout property) — `toggle.tsx:50,55` — while the unused `.kp-switch` (globals.css:1229) does it correctly via `transform`. **Fix:** switch `<Toggle>` to `translateX`, delete the dead class.
- **Three rolling-number implementations** (`.value-roll` canonical, wallet-pill inline `wbp-delta-fade`, dial `useRollingNumber`) with different durations. Consolidate.
- **Two spinner speeds** (standalone 0.7s vs in-Button `animate-spin` 1s). Have Button reuse `<Spinner>`.
- **Three bespoke "segmented capsule" pills** (Tabs segmented, LanguageToggle, avatar-menu language picker). Unify into one atom.
- **Notification badge uses raw `#ef4444`** (the only stray hex on the player surface). `notifications-panel.tsx:207,209,217`. **Fix:** `var(--no-500)`/`var(--danger-500)` + `var(--text-on-brand)`.
- **Privacy page hardcodes `privacy@50pick.tz`** instead of `SUPPORT_EMAIL()`/config — goes stale if the operator changes contact. `legal/privacy/page.tsx:17`.

### Nav / perf
- **Notifications poll every 5s with no backoff**, on every page, even backgrounded/closed. `notifications-panel.tsx:99`. **Fix:** pause on `document.hidden`; widen when panel closed.
- **`/live` renders every market unpaginated with O(n) per-market chart fan-out.** `live/page.tsx:43-58,100`. Inconsistent with the 12/page discipline elsewhere.

---

## 4. 🔵 Polish (selected)

- Dead imports: `CountdownPill` (`login/page.tsx:10`), `cn` (`top-app-bar.tsx:13`).
- Duplicated `next`-path sanitization regex across 6+ sites → extract `safeNextPath()`.
- OTP expiry countdown is cosmetic-only, hardcoded 5:00, not seeded from real `expiresAt` (`otp-expiry-countdown.tsx:14-15`).
- `verify-email` secondary CTA labeled "Resend link" but links to `/profile/account` (no resend). `verify-email/page.tsx:87`.
- Help page internal quick-links use raw `<a>` (full reload) instead of `<Link>`. `help/page.tsx:198`.
- `maximumScale:5` caps zoom (WCAG 1.4.4 risk). `layout.tsx:77`.
- Typo "minus a a small operator margin" `live/page.tsx:110-111`.
- Ad-hoc motion timing (literal ms + generic easings) across modals/menus instead of `--dur-*`/`--ease-*` tokens — all GPU-safe and reduced-motion-covered, timing-consistency only.
- `bg-black/60` scrim (reality-check) + `#fff` literals (toggle/checkbox/language-toggle) should be tokens.
- Notifications empty state hand-built instead of `<EmptyState>` (`notifications-panel.tsx:335+`).
- Money formatting has 4 helpers (`compact`, `fmt`, inline `toLocaleString` ×2) + inconsistent `<Cash>` adoption — consolidate.
- Several oklch literals duplicating tokens (top-app-bar active nav, bottom-nav shadow/capsule, wallet-pill border, cashback gradient) — candidate `--surface-ghost-hover`, `--g-gold` tokens.
- Various dead/ignored props (CircularProgress `tone`/`stroke`, SteppedProgress unclamped `current`), redundant PositionCard "Final"/"Payout" columns, duplicate cash-out computation on `/positions`.

---

## 5. What's working well (verified, not assumed)

- **Money-safety core is excellent.** Every wallet/bonus move runs under `withLock("wallet:<userId>")` with atomic `db.wallet.adjust` deltas; consistent wallet→market lock order prevents deadlock; pool conservation holds; idempotency is real and layered (cashback `sourceRef`, referral one-per-recruit, invite keyed grants, status-gated settlement). Bonus invariant `bonusBalance == Σ remaining` preserved.
- **Dual-wallet model is honest** — non-withdrawable bonus clearly marked with a play-through meter ("Play TZS X more to turn this into withdrawable cash").
- **Auth security is solid** — per-phone + per-IP rate limits, 5-strike lockout under a per-user lock, single password-policy source, single-use HMAC reset links, anti-enumeration, logout CSRF handling, consistent open-redirect defense.
- **Compliance gating is mostly right** — withdraw hard-gated on KYC APPROVED; deposit gated on lockout + RG limits + AML/SoF threshold (single-txn ≥1M, rolling-30d ≥5M) *before* taking money; self-exclusion/cool-off are one-way, immediate, revoke all sessions; NIDA uniqueness (one ID = one account); KYC review race-safe + idempotent.
- **Auth redirect/gating is defense-in-depth** — edge proxy 307s unauthed protected routes to the right login with `?next=`, and every protected page re-checks the session. All player nav targets resolve to real routes; no dead links in the shell.
- **Dual-channel money notifications** (in-app bell + best-effort email) on place/win/loss/refund/cashout/bonus/KYC/withdraw — never blocking the transaction.
- **Email infra is disciplined** — one Postmark transport, one bilingual `wrap()` template (consistent from-address/footer/helpline), suppression list survives deploys, HTML-escaped input, no boot-time sends or boot-time AI.
- **Betting correctness** — side-locking invariant holds in the UI; confirm modal reads a locked quote (tamper-proof); server re-validates side/stake/status/time; bars & dials math correct (clamped 0–100, even-split at zero, edge-aware); closed-by-time handled client+server; equal-height cards confirmed.
- **Animations are GPU-safe across the board** (transform/opacity only, one `<Toggle>` exception) with reduced-motion honored three ways (global clamp, `data-motion` tier, in-app toggle).
- **Color discipline is strong** — exactly one stray hex on the whole player surface; zero arbitrary Tailwind hex; no foreign UI-kit residue (no Material/Chakra/Bootstrap remnants); consistent Sora/Inter/JetBrains-Mono typography.
- **Several atoms are exemplary and well-adopted** — `Pagination` (shared, URL-driven), `EmptyState`/`ErrorState`, `Chip` (`StatusBadge` is a correct thin adapter), `Toast`, `ConfirmDialog`, bottom-nav floating-pill safe-area math.

---

## 6. Suggested fix order

1. **Blockers B1–B4** (false money statements + broken KYC link) — small, high-trust-impact edits.
2. **B5 referral revert** — config flip (coordinate with deposit go-live).
3. **High compliance:** self-exclusion bet gate; voided-market resolution toast.
4. **High consistency (one batch):** consolidate the form-field family onto `<Input>`/`<Field>` (kills the admin-focus leak, withdraw raw inputs, deposit ring, three local `Field()`s, name/email editors); then leaderboard `TierBadge`; then radius-scale reconciliation.
5. **High email:** OTP-path welcome/login, account-closure, email-change security alert.
6. **High UI:** withdraw `<Cash>` privacy leak; `/live` "most contested" label; delete orphan heroes.
7. Mediums (mock wallet tabs, raw enum text, copy honesty, OTP surface gating, notifications backoff) → Polish.
