# 50pick — Platform-Wide Interaction / Loading / Transition / State Audit — Handover (Phase 2)

**Audit date:** 2026-08-07 · **Roles:** Software Architect · Compliance Engineer · UI/UX Engineer · QA Engineer
**Scope:** the whole platform *except* the Up & Down section (that is Phase 1: `UPDOWN-UX-AUDIT-HANDOVER.md`). Money flows (wallet/markets/positions), auth & account, discovery & shell, and the admin console.
**Source:** full `src/` snapshot of `F:\kipindi-main`, 2026-08-07. Every finding below was produced by focused review and the most severe were **re-verified line-by-line against the source** before inclusion.
**Status: ANALYSIS ONLY — nothing changed.** This is the work order for the implementation session(s).

> **Parallel work note (Ali, 2026-08-07):** a Claude Code session is updating design components right now. This document is deliberately split into **BEHAVIOUR** (findings B-*) and **VISUAL** (findings V-*). The behaviour findings are logic/state/routing and won't collide with a restyle. The visual findings are called out separately so they can be folded into the design session — check each V-item against whatever that session changed before implementing, and treat its restyle as authoritative on tokens/spacing.

> **Live-verification gap:** this sandbox cannot reach www.50pick.tz (network tunnel blocked) and I don't enter passwords into login forms. The visual findings below are read from the code (emoji in copy, skeleton geometry, hardcoded strings, native browser bubbles). A live click-through pass — the kind that catches real pixel/contrast/overflow issues — still wants the Claude-in-Chrome extension connected with you logged in. Flag me when you want that.

---

## 0 · The five patterns behind almost everything

Nearly every behaviour finding is one of five repeated shapes. Fixing the *pattern* is worth more than fixing each instance, so the P0/P1 lists group by pattern and the appendix (§7) lists every raw occurrence for the implementer to sweep.

1. **Swallowed read → fabricated safe state.** `try { … } catch { /* graceful */ }` (or `.catch(() => 0/[]/null)`) on a *data read*, then the empty/zero default renders as truth. On money & compliance surfaces this shows a funded player TZS 0, tells a KYC'd player to start KYC, or hides a live alarm card — indistinguishable from being robbed or from "all clear". This is the platform's own A-5 rule ("real data or nothing") turned inside out. **Every route already has, or should have, an `error.tsx`; the catch prevents it from ever firing.**
2. **Raw server error string → player toast/panel, unlocalized.** Service layer returns English (sometimes EN·SW) prose or a machine code; the UI renders `r.error` verbatim. A SW/ZH player gets English — or the literal token `RATE_LIMITED` — at the exact moment money or an action failed. The correct pattern exists in the codebase (`verify-error.ts` → `verifyErrorMessage`, used by `email-verify-banner.tsx`); it's just not adopted widely.
3. **No pending state around an awaited server action** (and no `try/catch`). The two highest-stakes forms (deposit, withdraw) and ~16 admin controls fire an action with no spinner/disable and no failure surface if the action *throws* (vs returns `!ok`). Result: dead-looking button → double-submit, or silent nothing after a click. `SubmitButton`/`useFormStatus` and `useDeferredToast`/`ActionOverlay` are the house patterns; adoption is uneven.
4. **Phase/time derived from a stale server prop or the raw device clock**, instead of instants + server-anchored offset. The E-82 lesson (already fixed for the Up & Down board and SellButton) is still live in the conviction dial, the market-detail `Countdown`, and every market card's "N left" string. Symptoms: a live market shows a dead `00:00`, or a funded player is told "insufficient / closed" for up to a poll interval.
5. **Full-document reloads via raw `<a href>` for internal navigation** (filters, pagination, notifications, CTAs). Each tears down the shell: flash, scroll lost, SSE reconnect, JS re-parse — the exact cost the 2G/low-end standards bar forbids. `<Link>` is used correctly elsewhere; these are stragglers.

---

## 1 · P0 — must fix before real clients transact

### B-1 · Money & compliance reads swallow errors and render fabricated zero/empty/false state
- **Pattern 1.** Verified occurrences:
  - `src/app/wallet/page.tsx:68` — `try { w = await db.wallet.findByUserId(...) } catch {}` → `balance = w?.balance ?? 0` (:70). A transient DB blip shows a funded player **TZS 0 + "make your first deposit"**; `wallet/error.tsx` exists but can never fire. Txns (:75) → `[]` = "No activity yet".
  - `src/app/wallet/withdraw/page.tsx:63` → `AmountField max={… wallet?.balance ?? 0}` (:166) silently makes the form unusable.
  - `src/app/positions/page.tsx:38, 53–54` — positions + per-market `getMarket` catches → held positions vanish, "No open positions yet".
  - `src/app/markets/[id]/page.tsx:145, 251` — `myPositions` catch → "You haven't bet yet"; `myBalance = 0` → dial's "insufficient balance" fires for a funded player on the commit screen.
  - `src/app/profile/responsible-gambling/page.tsx:50` — failure fabricates a full default RG record (**all limits null, no exclusion**) with a working save form — misstates a player-protection state.
  - `src/app/profile/kyc/page.tsx:43` — status-read failure renders the blank Step-1 form to a possibly APPROVED/PENDING player (invites duplicate submission).
  - `src/app/proposals/[id]/page.tsx:43` — DB error becomes `notFound()`; a real proposal 404s.
- **Symptom:** a network hiccup is indistinguishable from theft, from "you have no money/positions", from "you have no limits", or from "this doesn't exist" — on the surfaces where that misread matters most.
- **Required:** a *failed read* renders a distinct, persistent "couldn't load — retry" state (or rethrows to the route `error.tsx`). Empty states are reachable **only** from a successful empty query.
- **Fix note:** drop the read catches (let `error.tsx` catch) **or** catch into an explicit `loadFailed` flag that renders a failure panel and suppresses the empty-state/CTA. For the dial, pass `balance: number | null` and suppress the insufficient warning when null (the pre-check is already `!== undefined`-guarded). Admin has the exact primitive to copy: `AdminLoadError` + `AdminKpi unavailable` ("n/a · NOT zero"). `generateMetadata` catches may stay.
- **Verify:** throw from each read in dev; confirm a failure panel, never `0`/empty/404.

### B-2 · Admin retry cancels the original FAILED payout even when the retry was refused — the obligation vanishes
- **Verified:** `src/app/admin/payments/payment-actions.ts` — `retryWithdrawalAction:174`, `retryDepositAction:133`, `bulkRetryAction` (loop). Sequence is: `const r = await withdraw(...)` then **unconditional** `db.txn.update(txnId, { status:"CANCELLED", description:"… superseded by retry" })`, *then* return `r.ok ? … : …`. But `withdraw()`/`deposit()` refuse early (kill-switch paused, KYC no longer APPROVED, rate-limited, below `PROVIDER_MIN_PAYOUT_TZS`) **without creating a replacement txn** (`wallet-service.ts:~1200–1251`).
- **Symptom:** officer clicks Retry, the gateway refuses, the toast says "Retry failed again" — but the row is now CANCELLED and gone from the FAILED-only retry queue. Real player money owed, no record prompting anyone to pay it, and the audit says "superseded by retry" that never dispatched. The toast and the queue contradict each other one refresh apart.
- **Required:** cancel the old record **only** when a replacement was produced (`r.ok`). On refusal the FAILED row stays, refusal reason appended.
- **Fix note:** move the `db.txn.update(...CANCELLED...)` inside `if (r.ok)` in all three actions; on `!r.ok` append the reason to `description` and keep `audit({ retried:false })`. No client change — the queue self-corrects on the existing `revalidatePath`.
- **Verify:** seed a FAILED withdrawal, pause that MNO's withdrawals, click Retry (and "Retry all") → the row must remain FAILED in the queue.

### B-3 · Admin 2FA can be removed or re-provisioned with no step-up — defeats the TOTP gate on every money action
- **Verified:** `src/app/admin/2fa/setup/actions.ts` — `removeTotpAction:48` and `provisionTotpAction:21` gate only on `requireAdmin` (session + staff role); no `requireAdminTotp`, no current-code proof. The page is in `TOTP_EXEMPT` (`admin/layout.tsx:37`) because it's the enrolment page. Client "Remove 2FA" is a one-click button with no confirm ceremony (`setup-client.tsx:71`).
- **Symptom:** a stolen/hijacked staff session cookie — the exact threat step-up 2FA exists to contain — can strip or replace the officer's authenticator in one request, then pass `requireAdminTotp` on AML release, settlement, balance-adjust, kill-switch, provider switch. It is the weakest ceremony guarding the strongest capability.
- **Required:** removing/rotating an *existing* secret requires a valid current TOTP code (or the documented AML-lead recovery) **plus** a hard-tier typed confirm.
- **Fix note:** in both actions, `if (await hasTotp(session.userId))` require a `code` field verified by `verifyTotp` before mutating; wrap the client button in `ConfirmModal tier="hard" typedWord="REMOVE"` + code input, matching the kill-switch pattern.
- **Verify:** with a valid session but no TOTP cookie, POST `removeTotpAction` → must refuse.

### B-4 · Single officer can move up to TZS 50,000,000 behind the console's weakest ceremony
- **Verified:** `src/app/admin/players/[id]/balance-adjust-controls.tsx` (one modal, reason ≥5 chars, no typed word, no second officer) vs `wallet-service.ts:1476` `ADJUSTMENT_CAP_TZS = 50_000_000` with the code comment "two-officer is a documented follow-up".
- **Symptom:** ceremony is inverted against risk — pausing deposits (reversible) needs typed "PAUSE"; a ≥1M AML *withdrawal* needs two officers; but **crediting a player 50M** (50× the two-person threshold) is one officer, one click, five characters. A8 "unified maker-checker" is not applied to the largest single-actor money move in the product.
- **Required:** hard-tier typed confirm above a threshold, and the existing two-officer stage-1/countersign at/above the two-person threshold.
- **Fix note:** reuse the AML `getFirstSignature` config-store pattern in `adjustBalanceAction` for `|amount| ≥ 1M`; add `ConfirmModal tier="hard"` client-side. Leave the atomic `adminAdjustBalance` untouched.
- **Verify:** attempt a 2M credit as one officer → stage-1 recorded, second officer required; audit shows both ids.

### B-5 · Forgeable success modal on the wallet from unsigned query params
- **Verified:** `src/app/wallet/wallet-result-modal.tsx:15–45` renders `OperationResultModal` "Deposit confirmed · Funds added · TZS {amount}" purely from `searchParams` (`?deposited=…&amount=…`); the amount/txn are never checked against the store or ownership.
- **Symptom:** anyone can craft/share `…/wallet?deposited=x&amount=5000000` and screenshot a genuine gilt "Funds added · TZS 5,000,000" modal — on the platform that deleted `seedHistory()` for fabricating data. A stale bookmark also replays it.
- **Required:** validate the referenced txn server-side (the page already loads the user's txns at `wallet/page.tsx:75`) and render the modal only for an owned, recent transaction.
- **Fix note:** look the id up in the loaded txns; render only on match, with the *stored* amount.
- **Verify:** open the URL with a fabricated id/amount → no success modal.

*(Phase-1 P0s remain: UD-1 balance pre-flight, UD-2 lock-race panel, UD-3/UD-4 failure feedback+i18n. This document does not repeat them.)*

---

## 2 · P1 — fix in the same campaign (behaviour)

### B-6 · Deposit & withdraw have no pending state after confirm — dead button, double-submit
- **Pattern 3.** `wallet/deposit/deposit-confirm.tsx:31,64`, `wallet/withdraw/withdraw-confirm.tsx:51,109`, `ui/confirm-dialog.tsx:74` (closes instantly on confirm, no pending wiring). The happy-path forms have no `useFormStatus` consumer; server-action redirects don't fire NavProgress. Deposit's confirm includes a synchronous Selcom `create-order` (2–10s on 2G).
- **Symptom:** confirm → modal vanishes → page looks idle for the whole round-trip → anxious re-submit (idempotency dedupes server-side, but the UX is broken). The bet dial and SellButton do this correctly.
- **Fix:** give `ConfirmDialog` a `pending` prop like `SellConfirmModal` (keep open + spinner until settled), or render a `useFormStatus` trigger. Disable the trigger while pending.

### B-7 · Raw/English server errors surfaced to players across money, auth, profile, proposals, chat
- **Pattern 2.** Verified surfaces → sources: deposit (`deposit/actions.ts:55,77,80,106` → `deposit/page.tsx:96`), withdraw (`wallet-service.ts` strings → `withdraw/page.tsx:102`), cash-out (`sell-button.tsx:131,213` renders `r.error` as toast body **and modal title**), dial non-balance errors (`conviction-dial.tsx:808,810`), profile email/name/avatar/password (`profile/actions.ts` strings → the editors), **EmailEditor prints literal `RATE_LIMITED`/`EMAIL_SUPPRESSED`** (`email-editor.tsx:51`, and drops `retryAfterSec`), KYC (`kyc-service.ts` → `kyc/page.tsx:86` + uploader toasts), proposals (`proposals-service.ts` → `vote-control.tsx:73`, and the raw English decline-reason enum at `proposals/[id]/page.tsx:85`), chat (`_actions/chat.ts:169,176` English fallback replies; stub `detectLang` has no ZH).
- **Symptom:** SW/ZH players get English or machine tokens at the failure moment.
- **Fix:** server returns codes (mostly already present); client maps code → `t.*`. Copy the `verifyErrorMessage` pattern (it already handles `retryAfterSec`). Add the missing dictionary keys in all three locales.

### B-8 · ~16 admin mutation controls have no failure feedback when the action *throws*
- **Pattern 3.** Verified no-try/catch clients: `kill-switch-toggle`, `control-plane` (×2), `retry-controls`, `bulk-retry-controls`, `reconcile-controls`, `stuck-payout-controls`, `payout-status-control`, `two-admin-toggle`, `resolve-controls`, `resolution-ceremony`, `settle-button`, `kyc-decision-rail`, `report-pack-controls`, `balance-adjust-controls`, `suspend-controls`, `force-reverify-controls`. `requireStaff` **throws** (`rbac-guard.ts:44`); a thrown action escapes `startTransition`, clears pending, and shows nothing.
- **Symptom:** officer clicks a money control, spinner ends, nothing happens — can't tell applied / refused / unknown-timeout. Only `aml-actions-client`, `reset-password-button`, `set-email-form`, `totp` setup do it right.
- **Fix:** a shared `runAdminAction(fn, fd)` helper that maps a throw to `{ok:false,error}`, or per-control try/catch → the existing toast/`ActionOverlay`. On throw, say "server error — nothing may have applied; refresh before retrying".

### B-9 · AML two-officer queue misreports its own state (wrong audit category + volatile source)
- **Verified:** `admin/aml/page.tsx:34` scans `getAuditPage({ category:"ADMIN" })` for `aml.approve.stage1`, but `aml/actions.ts:104` writes it as `category:"COMPLIANCE"` and stores the durable signature in config-store *precisely because the audit-ring scan lost it on deploy*. The "awaiting second signature" KPI (:80) and the per-row stage-1 badge (:121) therefore never populate; the info cards on `/admin/aml:151` and `/admin/approvals:251` claim "ADMIN audit category" (false).
- **Symptom:** on the money-release queue, officers can't see which items await a countersign, who signed stage-1, or that they're blocked from self-countersigning. Enforcement is server-side correct; the console just misinforms.
- **Fix:** export a `getFirstSignature`/`listFirstSignatures` read from the config-store layer and use it in `page.tsx`; delete the audit scan; correct the two info sentences.

### B-10 · Conviction dial + market countdowns tick on the wrong instant and the raw device clock
- **Pattern 4.** `conviction-dial.tsx:206` uses `Date.parse(resolutionAt)` vs raw `Date.now()`, no `serverNow`, and no `selectionClosedAt` (props :136). `markets/[id]/page.tsx:561` passes only `resolutionAt`; `side-picker.tsx:21` doesn't thread the cutoff. `markets/countdown.tsx:7` paints `00 00 00 00` until hydration and runs on the client clock. Market cards derive "N left" from `resolutionAt` (`markets/page.tsx:371`) and render a static string (`market-card.tsx:368`).
- **Symptom:** (a) betting shuts at `selectionClosedAt` (earlier than `resolutionAt`) — for up to a poll interval the dial stays live, the player aims, opens the 10s quote hold, confirms, and only then gets `SELECTION_CLOSED`; (b) a device clock a few minutes off shows a live market as "Closed" or a dead `00:00`; (c) 2G hydration lag shows an all-zero countdown at first paint. SellButton already solved all of this — mirror it.
- **Fix:** thread `selectionClosedAt ?? resolutionAt` + `serverNow` into dial, side-picker, cards and `Countdown`; compute `offset = serverNow − Date.now()` once; render the true initial remainder with `suppressHydrationWarning` on the seconds cell only.

### B-11 · Full-document reloads via raw `<a>` on discovery + notifications
- **Pattern 5.** `markets/page.tsx:137,159,431,464` (When/Topic chips, "see all"), `ui/pagination.tsx:99` (URL mode), `results/page.tsx:223–249` (sort/category chips), `market-card.tsx:377` (LIVE-card "Details"; non-live uses Link), `markets/[id]/page.tsx:594` (auth CTAs), `comments-thread.tsx:147`, and `notifications-panel.tsx:158` (`window.location.href = n.href`). History round cards (Phase-1 UD-18) are the Up & Down instance.
- **Symptom:** every filter/page/notification click is an MPA teardown — flash, scroll lost, sticky search cleared, SSE reconnect, full JS re-parse.
- **Fix:** `<Link>` (`scroll={false}` for filters; default for pagination — it already accepts `onNavigate`). Notifications: `router.push` after an *awaited* mark-read (see B-15).

### B-12 · No try/catch around awaited actions inside `useTransition` on player forms — a flaky network nukes the page to the error boundary
- **Pattern 3 (player side).** `kyc-doc-uploader.tsx:51,148`, `email-editor.tsx:29`, `name-editor.tsx:47`, `password-section.tsx:26`, `vote-control.tsx:66` (leaves the optimistic vote applied, no rollback), `create-form.tsx:56` (loses the typed proposal), `avatar-uploader.tsx:74`.
- **Symptom:** offline/flaky mid-action (the primary mobile condition) throws inside the transition → React routes it to `error.tsx`, replacing the whole KYC page / proposal form with all typed content. `email-verify-banner.tsx:66` is the correct template (try/catch → localized toast + rollback).
- **Fix:** wrap each awaited action; on catch run the same rollback + error path as `!r.ok`.

### B-13 · Session-revoked explanation is unreliable; several auth states dead-end
- **Verified:** `session.js:87` sets the `kp_revoked` flash inside `try { jar.set(...) } catch { /* read-only context */ }` — but `getSession()` runs mostly during Server Component renders where cookie mutation throws, so the flash is silently never written and the stale cookie isn't deleted. The proxy (`proxy.ts:188`) validates only the HMAC, not the active-session registry, so it never sets it either. `login/page.tsx:33` also mutates a cookie during render (throws, swallowed). Related dead-ends: self-excluded login collapses to generic "contact support" (`login/actions.ts:43` maps all `SUSPENDED` to `blocked`; the `excluded=1` panel is unreachable from login); `error=session_expired` after a 2FA lapse is unmapped (`login/page.tsx:81`) → blank form; lockout is shown as generic rate-limiting, losing the "reset your password" way out (`auth-service.ts:759`).
- **Fix:** detect the registry mismatch in `proxy.ts` (a route-handler context where `res.cookies.set` works) and redirect to `/auth/login?revoked=1`; make the login page read query params, never mutate cookies in render. Add distinct codes: `SELF_EXCLUDED`/`COOLED_OFF` → `?excluded=1`/`?cooled=1`; `session_expired` panel (+ preserve `next=`); `LOCKED` panel with countdown + "Reset password" CTA.

### B-14 · `next=` intent dropped at several hops in the auth funnel
- **Verified:** OTP resend form posts only phone+purpose (`otp/page.tsx:110`; `resendOtpAction` rebuilds URL without `next`, `login/actions.ts:132`); `verifyLoginOtpAction` failure redirect omits `next` (:151); 2FA pending-expired drops `next` (:85); authed user hitting `/auth/login?next=/wallet` is bounced to `/` not `/wallet` (`auth/layout.tsx:25`); `/proposals?f=mine` gate loses `?f=mine` (`proposals/page.tsx:78`).
- **Fix:** round-trip `next=` through every hop including error hops.

### B-15 · Notifications panel: mark-read races the navigation; no optimistic dismiss; unguarded 5s poll
- **Verified:** `notifications-panel.tsx:95` (poll, no try/catch → unhandled rejection every 5s offline), `:150` (`void markNotifReadAction(...)` fire-and-forget then `window.location.href` — unload aborts the in-flight action, so the tapped item intermittently stays unread), `:167` (dismiss/markAll: awaited round trips, no pending state, rejection surfaces nothing).
- **Fix:** wrap the poll (silent skip offline); dismiss = optimistic remove + rollback + persistent failure notice; mark-read awaited before `router.push`, or keepalive-safe.

### B-16 · Duplicate refreshes and non-deferred success toasts on money mutations
- **Verified:** dial (`:885,922`) and sell (`:148`) dispatch `50pick:refresh` **and** the poller's handler calls `router.refresh()` → two RSC fetches per mutation on pollered pages; `wallet-result-modal.tsx:31` adds a third on a just-revalidated page. Pull-to-refresh (`pull-to-refresh.tsx:50`) does `router.refresh()` *and* dispatches the event → double, then hides the spinner on a fixed 600ms timer regardless of whether data landed. Success toasts fire immediately inside the transition on dial/sell (before `router.refresh()` commits) instead of the `useDeferredToast` falling edge used by admin.
- **Fix:** one refresh per mutation (dispatch the event *or* call refresh, not both); tie the PTR spinner to the transition settling; success toasts on the falling edge, errors immediate.

### B-17 · `RefreshPoller` / pollers that don't stop, and lists that reset under the user
- **Verified:** `notify-poller.tsx:94` polls every 2s in hidden tabs and `onWake` fires on *hide* with no `document.hidden` check; `/live` `pulse-grid.tsx:69` resets the infinite wall to 24 cards whenever the live count changes on the 15s tick (chops a scrolled reader back to the top); `comments-thread.tsx:50` freezes at first render (15s poll's fresh data ignored); `/watchlist` has no poller and an N+1 `getMarket` fan-out (`watchlist/page.tsx:32`); markets board fetches the LIVE list up to 4× per render + per-market comment counts (`markets/page.tsx:36,210,215,275`).
- **Fix:** gate `notify-poller` on visibility like `refresh-poller`; `/live` reset on `query` change only, clamp count on data change; reconcile `CommentsThread` server truth on prop change; add a poller + batched read to watchlist; fetch the board LIVE list once and pass down, batch comment counts.

### B-18 · SSE reconnect has no jitter and resets backoff on `onopen` (deploy = thundering herd + flap loop)
- **Verified:** `use-event-stream.ts:63` resets `backoffRef` to 1s in `onopen`; `:82` retries at exactly +1/+2/+4s with no jitter.
- **Symptom:** after a Railway deploy every client retries in lockstep at the worst moment; a proxy that accepts-then-drops (502-after-headers mid-deploy) produces an indefinite tight 1s loop the backoff never dampens.
- **Fix:** ±30% jitter; reset backoff only after the socket has stayed open ~10s or delivered a real event.

### B-19 · Back-navigation scroll restore defeated; deposit-return/receipt never self-update
- **Verified:** `route-transition.tsx:41` unconditional `window.scrollTo(0,0)` on every pathname change (incl. popstate) fights `scroll-restore.tsx`; the `startViewTransition` wraps only the key update so the "cross-fade" is a no-op. `wallet/deposit/return/page.tsx` and `wallet/receipt/[id]/page.tsx` are `force-dynamic` with **no `RefreshPoller`** — a PENDING player sits on "do not deposit again" and the page never flips to PAID (credit lands ~15s server-side); the comment even promises "the receipt updates itself".
- **Fix:** scroll-to-top on pushed navs only (skip on popstate), or drop the manual scroll and rely on Next default for `<Link>`. Add a poller to return/receipt while state is PENDING/PROCESSING, stopping on terminal states.

### B-20 · Chat composer sends on Enter while pending; other double-submit gaps
- **Verified:** `ChatPanel.tsx:55,132` — send button is `disabled={pending}` but `handleKey`→`handleSubmit` never checks `pending`; hammering Enter queues overlapping `chatWithClaude` calls (burns quota, interleaves replies). `rg-confirm-submit.tsx:34` and `sessions/page.tsx:103` (destructive) have no pending feedback after confirm. `vote-control.tsx:66` applies responses in arrival order → stale tally on rapid up→down.
- **Fix:** `if (pending) return;` in chat `handleSubmit`; `useFormStatus` triggers on the destructive ceremonies; sequence votes with a request counter.

---

## 3 · P2 — behaviour polish

- **B-21** Cash-out has no quote hold/expiry: the player consents to a rendered value that can be a poll-interval stale and the server executes "now" (`sell-confirm-modal.tsx`, `sell-button.tsx:124`, `markets/actions.ts:95`). The bet path solved this with a 10s hold — the exit path (same pool volatility) has nothing. *(Upgrade to P1 if cash-out volume is expected at launch.)*
- **B-22** Deposit confirm opens for invalid input (TZS 0 confirmable; provider round-tripped-unavailable leaves no radio checked → native browser validation bubble, the kit-banned dialog class): `deposit-confirm.tsx:21`, `provider-radio-grid.tsx:39`.
- **B-23** `depositAction` hard-codes amount bounds (`deposit/actions.ts:52`) that contradict the page's admin-test cap and drift from `validators.ts`. Import `DEPOSIT_MIN/MAX_TZS`.
- **B-24** WatchStar mid-session expiry shows "couldn't update" instead of the login redirect (`watch-star.tsx:41`; action returns `error:"auth"`); duplicate stars for one market don't reconcile.
- **B-25** SearchBox desyncs from the URL on back/forward and on "Clear search" (`search-box.tsx:95`).
- **B-26** First-visit primer ambushes 700ms after *any* first landing incl. a deep-linked `/markets/[id]?side=YES` (`first-visit-primer.tsx:223`); suppress on detail/`?side=`.
- **B-27** OTP expiry countdown is client-invented, restarts at 5:00 on reload/failed-verify (`otp-expiry-countdown.tsx:12`) — a fabricated progress bar; anchor to a real `expiresAt`. Launch-track (dormant until SMS).
- **B-28** Admin: TOTP step-up expiry mid-action drops `?next` and typed work (`admin-guard.ts:57`); `ConfirmModal` has no `loading` state so the provider switch can double-fire (`modal.tsx:221`, `control-plane.tsx:258`); bulk-retry runs ≤50 sequential gateway calls behind a 10px inline link with no overlay (`bulk-retry-controls.tsx`); admin success toasts mostly non-deferred; sidebar-badge queries unguarded + run twice (`admin-shell.tsx:56`); TOTP verify form can wedge a permanent spinner (`verify-form.tsx:14`); KYC doc viewer has no load/error state so a fetch failure looks like bad evidence (`kyc-doc-viewer.tsx:74`); 2FA enrolment dead-ends with no return path / second-code prompt (`setup-client.tsx:44`).
- **B-29** Loading skeletons that don't match the page (paint jump): `wallet/loading.tsx` (1 card vs 2-col + spark), `positions/loading.tsx` (1-col vs 2-col + PnL strip), `wallet/deposit/loading.tsx` (spinner vs form), `markets/loading.tsx` (spinner panel, no search bar), `markets/[id]/loading.tsx` (dial skeleton in the wrong column — the bet widget jumps sides on load). *(This is behaviour-adjacent but visual — coordinate with the design session.)*

---

## 4 · VISUAL findings (fold into the design-component session)

These are read from code, not from a live screen — **re-check each against whatever the design session changed** before acting. A true visual pass needs the browser extension + a login (see the note up top).

- **V-1 · Emoji in player UI copy** — the platform rule is "no emojis in UI copy". Verified live emoji in rendered markup (not comments): the 🔒 lock glyph on the Up & Down locked chips (`app/updown/[roundId]/page.tsx:400`, `components/updown/updown-card.tsx:558`). Sweep for others the design session may be touching; keep glyphs to the kit `I.*` icon set.
- **V-2 · Skeleton geometry mismatches (B-29)** — the most visible "cheap" moment: content visibly reflowing/jumping columns when a page resolves. Highest-impact are `markets/[id]` (bet widget jumps column) and `/wallet` (card snaps to half-width, a second card + spark pop in). The design session should make each `loading.tsx` mirror its page's real grid.
- **V-3 · Native browser validation bubble** on the deposit form (B-22) — an OS-styled tooltip on a bespoke dark surface reads as broken. Replace with the kit inline-error treatment.
- **V-4 · Broken-image glyph** in the admin KYC doc viewer (B-28) when the doc fetch 403s/fails — looks like tampered evidence. Needs a skeleton + explicit error card.
- **V-5 · Toast `role`** — every toast is `role="status"` (polite); danger/failure toasts should be `role="alert"` so screen readers announce a money failure promptly (`toast.tsx:341`). (a11y, but cheap and lands in the toast component the design session owns.)
- **V-6 · Manufactured latency** — the `/live` "loading more" 350ms `setTimeout` over in-memory data (`pulse-grid.tsx:83`) and the PTR 600ms fixed spinner (B-16) both *add* perceived slowness. Remove.
- **V-7 · Hardcoded English SR labels** in carousels/primer (`featured-contest.tsx:129,146`, `notable-carousel.tsx:80`) — invisible but fails the trilingual bar for AT users.

If the design session is rebuilding toasts/modals/skeletons/buttons, hand it: V-1, V-2, V-3, V-4, V-5, V-6 — they live exactly in those components.

---

## 5 · What's notably WELL built (verified — so you know it was checked)

Money: the card-deposit return leg (unsigned params only *select* the order; outcome comes from the signed re-query; PENDING never shown as failure); the bet quote-hold engine (RAF strip, pending-freeze banks elapsed time, BUSY→retry reuses the idempotency key); per-intent idempotency keys surviving `revalidatePath`; `OperationResultModal` (absolute-timestamp auto-close, failures never auto-close, gold discipline); SellButton's close-state modelling (server verdict + selection cutoff + clock offset — the template the dial should copy); receipt status exhaustiveness (`Record<status,…>` = missing status is a build error).

Auth/account: `SubmitButton`/`useFormStatus` discipline on every form path; `RateLimitBanner` self-clearing countdown on login; `EmailVerifyBanner` (codes not prose, honest `sent:false`/`suppressed`, try/catch) — the best interactive component in the codebase; reset-password token pre-validation UX; consistent open-redirect discipline on `next=`.

Discovery/shell: WatchStar optimistic toggle; locale switch without reload (overlay tied to real pending); `HashFocus` (streaming-aware, aborts on user scroll); `Modal` as the single dialog primitive; MarketCard data honesty (no fabricated 50/50, ≥4-point sparkline gate); RefreshPoller visibility pause + 5s event dedupe; useEventStream hidden-tab disconnect.

Admin: the stuck-payout release ceremony (reason recorded, server re-queries provider, refuses on CONFIRMED, idempotent reversal) — the model the other money actions should match; `AdminLoadError`/`AdminKpi unavailable` (the A-5 fix, where adopted); payout-status declared-vs-derived with "reality wins"; the resolution ceremony (staged-verdict lock, self-countersign blocked, typed SEAL); URL-driven table state with namespaced prefixes.

---

## 6 · Suggested order (behaviour; run after / alongside the design session)

1. **P0 batch first:** B-1 (the swallowed-read sweep — biggest correctness win), B-2, B-3, B-4, B-5. Plus Phase-1 P0s.
2. **Pattern sweeps** (each fixes many findings at once): Pattern 2 error→i18n mapping (B-7), Pattern 3 pending+try/catch (B-6, B-8, B-12), Pattern 5 `<Link>` (B-11).
3. **Live-freshness + phase:** B-10, B-16, B-17, B-19.
4. **Auth robustness:** B-13, B-14, B-15, B-9, B-18, B-20.
5. **P2 + admin polish** (B-21…B-29) and the **VISUAL** set alongside the design session.

---

## 7 · Appendix — raw occurrence lists for the sweeps

**Pattern 1 (swallowed read → fabricated state), player surfaces:** `wallet/page.tsx:68,75`, `wallet/withdraw/page.tsx:63`, `positions/page.tsx:38,53`, `positions/[positionId]`, `positions/performance`, `markets/page.tsx`, `markets/[id]/page.tsx:145,247,251`, `results/page.tsx`, `fairness/page.tsx`, `live/page.tsx`, `leaderboard/page.tsx`, `watchlist/page.tsx`, `profile/page.tsx:37`, `profile/kyc/page.tsx:43`, `profile/responsible-gambling/page.tsx:50`, `profile/invite/page.tsx:103`, `proposals/[id]/page.tsx:43`, `auth/register/page.tsx`. **Admin (render-as-zero on money):** `admin/payments/page.tsx:45,55`, `admin/finance/page.tsx:66–101`, `admin/page.tsx:29–41`. Distinguish "failed" (panel) from "genuinely empty" (empty state) in every one.

**Routes still missing `error.tsx`** (only 8 exist platform-wide): all of `auth/*`, `fairness`, `help`, `leaderboard`, `legal/*`, `live`, `markets/[id]`, `positions/[positionId]`, `positions/performance`, every `profile/*`, `proposals/[id]`, `proposals/new`, `results`, `updown` + `updown/[roundId]` + `updown/history` (Phase-1 UD-15), `wallet/deposit`, `wallet/deposit/return`, `wallet/receipt/[id]`, `wallet/withdraw`, `watchlist`. Add the sibling `route-error` pattern where a swallowed catch is being removed.

**Pattern 2 (raw error → surface):** `deposit/actions.ts:55,77,80,106`, `sell-button.tsx:131,213`, `conviction-dial.tsx:808,810`, `email-editor.tsx:36,51`, `name-editor.tsx:52`, `avatar-uploader.tsx:79,97`, `password-section.tsx:39`, `kyc-doc-uploader.tsx:56,153`, `vote-control.tsx:73`, `create-form.tsx:59`, `proposals/[id]/page.tsx:85`, `_actions/chat.ts:169,176`, plus the profile/KYC/RG/account/reset-password pages echoing `?error=` (also B-13/security note: these `?error=` echoes are query-injectable attacker text in trusted alert chrome — map to codes, never render the raw param).

**Pattern 3 (no pending / no try-catch around awaited action):** player — `deposit-confirm.tsx`, `withdraw-confirm.tsx`, `kyc-doc-uploader.tsx`, `email-editor.tsx`, `name-editor.tsx`, `password-section.tsx`, `vote-control.tsx`, `create-form.tsx`, `avatar-uploader.tsx`, `ChatPanel.tsx`, `rg-confirm-submit.tsx`; admin — the 16 in B-8 + `verify-form.tsx`.

**Pattern 4 (stale phase / device clock):** `conviction-dial.tsx:206`, `side-picker.tsx:21`, `markets/countdown.tsx:7`, `market-card.tsx:80,368`, `markets/page.tsx:371,447`.

**Pattern 5 (raw `<a>` internal):** `markets/page.tsx:137,159,431,464`, `pagination.tsx:99`, `results/page.tsx:223–249`, `market-card.tsx:377`, `markets/[id]/page.tsx:594–597`, `comments-thread.tsx:147`, `notifications-panel.tsx:158,160`, `updown/history` cards (UD-18).

---

*Prepared for the implementation session(s). Phase 1 (`UPDOWN-UX-AUDIT-HANDOVER.md`) covers the Up & Down section and is not repeated here. Re-verify line numbers against HEAD before editing — the repo moves fast. The VISUAL set (§4) should be reconciled with the in-flight design-component work before implementation.*
