# Up & Down — Interaction / Loading / Transition Audit — Implementation Handover

**Audit date:** 2026-08-07 · **Auditor roles:** Software Architect · Compliance Engineer · UI/UX Engineer · QA Engineer
**Scope:** the Up & Down section — `/updown` (board), `/updown/[roundId]` (round detail), `/updown/history`, the shared quick-bet stack, and every shared surface it touches (toast, NavProgress, RefreshPoller, RouteTransition, wallet pill, result announcer, win celebration).
**Source reviewed:** full `src/` snapshot of `F:\kipindi-main` taken 2026-08-07 (~07:26 UTC), incl. `CLAUDE.md`. Stack: Next.js 16 App Router · React 19 · Prisma 6.5.
**Status: ANALYSIS ONLY. No code was changed.** This document is the work order for the implementation session.

---

## 0 · Read this first — the rules this handover was written under

The findings below were checked against the platform's own recorded standards, and every fix is prescribed **inside** the existing patterns — no new frameworks, no refactors for taste:

- **Primary/secondary signal rule** — `operation-result-modal.tsx` header: *"every mutation pipes through it… the toast / corner notification is a secondary signal… failures stay open until dismissed."*
- **Falling-edge toasts** — `useDeferredToast(pending)`; error toasts immediate; zero raw `setTimeout` for messaging.
- **Phase from instants, never from a server-rendered prop** — the E-82/E-99/E-104 lesson, encoded in `roundPhase()` / `resultClock()` (`src/lib/updown-card-phase.ts`).
- **A-5 honesty** — real data or nothing; no fabricated numbers/promises on money surfaces.
- **Gold budget, YES/NO colour discipline, kit-only primitives, design frozen** (`test:design-frozen`).
- **Trilingual EN/SW/ZH** via `i18n-dict.ts`; player-facing copy never hardcoded.
- **Standing product decisions that must NOT be reversed by the implementer** (§6).

Severity: **P0** = must fix before real clients bet money · **P1** = fix in the same campaign · **P2** = polish, schedule after.

---

## 1 · How the section works today (verified map)

**One money path.** Board card, round bet box and round stake panel all call `useUpDownQuickBet` (`src/components/updown/use-quick-bet.ts`) → `buyPositionAction` (`src/app/markets/actions.ts:72`) → `buyPosition` (market-service). The hook is **optimistic**: it bumps a per-side delta (`optUp/optDown`) *before* the request, renders `shownUp/Down = server + optimistic`, rolls back on failure, and lets the caller's poller reconcile. Each tap gets a fresh idempotency key — repeat taps are deliberately repeat bets (Ali's decision, recorded in the hook header).

**Success feedback (E-64):** 4 channels — card/side pulse (`usePlacePulse`), `aria-live` line, haptic `confirm`, and a 3 s `success` toast (guarded by `test:updown-bet-feedback`).

**Failure feedback:** `danger` toast with the **raw server error string**, default 4.5 s auto-dismiss (`toast.tsx` `DEFAULT_DURATION`), then everything reverts. *(This is the visual sequence Ali reported: "bet looks placed → toast says you cannot bet → it disappears.")*

**Refresh model:** board mounts `<RefreshPoller intervalMs={20_000}>`; round page mounts `refreshCadence()` (20 s live · 5 s awaiting result · **off** once settled). `buyPositionAction` on success calls `revalidatePath` for `/markets`, `/markets/[id]`, `/positions`, `/wallet`, `/updown` — **not** `/updown/[roundId]`. Nothing in the quick-bet stack dispatches `50pick:refresh` (conviction dial and sell button both do).

**Phase model:** the board card derives `locked/bettable` live from instants (`roundPhase` + server-anchored countdown) — the E-82 fix. The countdown pod self-advances into the result phase (E-104). The round page's *pod* is instant-driven; the round page's *stake panel* is **not** (see UD‑2).

**Board composition:** `getBoard` returns at most three cards — `[current, justClosed(confirming), lastDone]` (`updown-board.ts:479–495`) — plus tape, tabs, heartbeat. Round/board state is derived from instants server-side on every render, so staleness is bounded by the poll interval.

---

## 2 · Findings — the reported symptom (bet placement)

### UD-1 · **P0** — No client pre-flight before the optimistic apply; wallet balance is never consulted
- **Where:** `use-quick-bet.ts:110–160` (`place()`); all three surfaces.
- **What happens:** the only gate is `stakeReady` (amount within min/max). Balance, lock instant and round state are never checked client-side, so a tap that is *predictably* doomed still: bumps "You're in" optimistically → fires the request → fails → rolls back with a toast. Insufficient balance is the most common real-money case and the likeliest cause of Ali's report. The conviction dial already sets the precedent: *"Pre-click 'Insufficient balance' warning when `stake > balance`"* (CLAUDE.md, UX commitments) — the quick-bet stack has nothing equivalent; no updown surface even receives the balance.
- **Required behaviour:** a tap that cannot succeed must **never look like a placed bet**. Pre-flight failures are prevented (button state + inline reason), not round-tripped.
- **Implementation notes (pattern-faithful):**
  1. Thread `walletBalance: number | null` from the server pages (`getBoard` / `getRoundDetail` already run with `session.userId`; the shell already reads the wallet — add the field to the board/detail payloads, or fetch alongside) into `UpDownCard` / `UpDownBetBox` / `RoundStakePanel` → `useUpDownQuickBet`.
  2. In the hook: `insufficient = balance != null && stake > balance`. When `insufficient`: place buttons disabled; helper line shows a factual inline message (new i18n keys, e.g. `udInsufficientBalance` EN/SW/ZH) + a ghost "Deposit" link to `/wallet/deposit`. Same register as the empty-side note (info glyph, faint ink — G5, not an alarm).
  3. `place()` gains a guard clause: if any pre-flight fails, return **without** touching `optUp/optDown` and without a network call; announce via `aria-live` + factual toast. (This is the "toast before failing" behaviour Ali asked for.)
  4. Keep the server as the security boundary — this is UX-only, exactly like `stake-math.ts` says.
- **Verify:** with balance 500 and stake 1 000: buttons disabled + reason visible; no network request in devtools; no "You're in" flash. Extend `scripts/updown-quickbet.test.mts` with the balance gate (pure logic).

### UD-2 · **P0** — Round page stake panel stays live up to 20 s after the lock (E-82's defect, still alive in one branch)
- **Where:** `src/app/updown/[roundId]/page.tsx:90–95, 328–342` — `isOpen = round.state === "open"` is a **server-rendered prop**; `RoundStakePanel` renders iff `isOpen` and has no notion of `selectionClosesAt`.
- **What happens:** a player sitting on the round page when the lock passes keeps a fully live stake panel — chips, custom field, and the **gold Confirm** — for up to `LIVE_ROUND_MS` (20 s), while the pod above it already says "Result in" (the pod was fixed by E-104; the panel wasn't). Tapping Confirm in that window produces exactly the reported sequence: optimistic "You're in" → server refuses `SELECTION_CLOSED` ("Selections closed while placing your bet") → rollback + vanishing toast. The page's own comment (lines 92–94) says this gap "is worse than no lock at all".
- **Required behaviour:** the panel must flip to the locked presentation at the lock **instant**, exactly as the board card does, with zero refetch.
- **Implementation notes:** do not invent a second rule — reuse the one that exists. Extract the open-vs-locked branch of the right rail into a small client component (e.g. `RoundActionPanel`) that receives `state`, `selectionClosedAt`, `closesAt`, `serverNowMs`, plus both panels' props; derive `const { bettable, locked } = roundPhase(...)` off `useServerNow` (both already exported), render `RoundStakePanel` while bettable and the existing locked `<section>` (chip `udLockedTitle` + `udLockedWhy` + `myExactPayout` line) once locked. Board card behaviour is the reference implementation (`updown-card.tsx:238–277`). Additionally, belt-and-braces inside the hook: refuse `place()` when `selectionClosesAtMs` (new opt) has passed on the server-anchored clock (covers the final-second race on *all* surfaces, board included).
- **Verify:** open a round page ~30 s before lock; freeze network (devtools offline is not needed — just don't wait for the poll); at lock+1 s the panel must already be the locked card. Add a pure test to the `roundPhase` suite (updown-window §7) asserting the panel branch uses it; add a Playwright case "tap at lock+1s → no optimistic flash, no request".

### UD-3 · **P0** — Failed-bet feedback breaks the platform's own primary/secondary rule (toast-vs-popup decision)
- **Where:** `use-quick-bet.ts:150–158`; contract in `operation-result-modal.tsx` header + CLAUDE.md ("failures stay until dismissed — LCCP informed-consent pattern").
- **What happens:** money-path failures are a corner toast that auto-dismisses in 4.5 s. A player mid-tap-flurry can miss why their money "bounced". Meanwhile a *successful* markets bet gets a full `OperationResultModal`. Loud where the platform succeeded, whispered where it refused — inverted relative to the house rule.
- **Required behaviour — the decision matrix (§5)** distinguishes three failure classes. Summary: prevented failures never fire; transient race failures = **persistent toast** (stays until dismissed); compliance/account blocks = **`OperationResultModal` (danger)**.
- **Implementation notes:**
  1. Kit change (one, additive): `toast.tsx` — support `durationMs: 0` ⇒ sticky (no auto-dismiss timer, no progress bar animation; close button/swipe still work). Small, backwards-compatible; the flood-guard cap of 4 already bounds pile-up.
  2. In the hook, branch on the action's `code` (already returned by `buyPosition` — `SELECTION_CLOSED`, `RATE_LIMITED`, `SUSPENDED`, `INVALID`, `NOT_FOUND`, plus the BUSY/admission message): race/transient ⇒ sticky `danger` toast; `SUSPENDED` + RG-limit + maintenance ⇒ raise a shared `UpDownBetBlockedModal` built on `OperationResultModal` (variant `danger`/`warning`, no gold — a refusal is not earned money). The modal host can live beside the announcer so all three surfaces share it.
  3. On `SELECTION_CLOSED`, also flip the local surface to locked immediately (set a `lockedByServer` flag consumed by the same `roundPhase` wrapper from UD-2) — the server has spoken; don't keep offering the buttons until the next poll.
- **Verify:** simulate each code (dev-test seed + drive); confirm sticky toast persists until dismissed; confirm RG-limit tap produces the modal and the modal survives navigation focus rules (Esc, focus trap — free via `<Modal>`).

### UD-4 · **P0** — Server rejection strings are unlocalized and leak the EN(+SW) service copy to ZH users
- **Where:** `market-service.ts` error strings (e.g. lines 585–720: "Slow down.", "Not enough balance.", "Selections are closed — … · Uchaguzi umefungwa…"); rendered verbatim in `use-quick-bet.ts:152–153`.
- **What happens:** the toast body is whatever English (sometimes bilingual EN·SW) string the service produced; a ZH player gets untranslated copy at the exact moment their money was refused. It also bypasses the copy register rules (RG wording) entirely.
- **Required behaviour:** the client renders **its own localized message keyed off `code`**, with the server string demoted to optional detail (or dropped). Server strings remain as API/audit truth — do not translate the server; translate the surface.
- **Implementation notes:** add `t.market.udErr*` keys (EN/SW/ZH) for: `SELECTION_CLOSED`, `RATE_LIMITED`, `SUSPENDED` (generic "account/game unavailable" — the modal from UD-3 carries specifics), `INVALID` (bounds/balance fallback), `NOT_FOUND`, `BUSY` (retryable). Map in one place — a small `udBetErrorCopy(code, t)` next to the hook, so the three surfaces cannot drift. Keep `r.error` as a `description` fallback only when the code is missing.
- **Verify:** switch locale to ZH, drive one failure of each class, confirm no Latin service copy appears.

### UD-5 · **P1** — Bet success on the round page leaves the whole page (and the wallet pill) stale for up to 20 s
- **Where:** `buyPositionAction` (`markets/actions.ts:83–91`) revalidates five paths but not `/updown/[roundId]`; the quick-bet stack never dispatches `50pick:refresh`; `buyPosition` emits `market:odds` SSE but no `wallet:balance` (`market-service.ts:917`; wallet-service emits it only for deposits/withdrawals).
- **What happens:** after the one money commit on the D3 page: pool bar, volume, players, the two multipliers, `myExactPayout` and the top-bar balance pill all stay as they were — the only movement is the optimistic chip. On the board the same tap re-renders everything (because `/updown` *is* revalidated), so the two surfaces sharing one control behave differently. The pill's whole reason to exist ("yes, your money moved") is defeated on the round page.
- **Required behaviour:** committed money is reflected on the committing surface within one perceptible beat.
- **Implementation notes:** follow the existing idiom exactly — conviction dial (`conviction-dial.tsx:885`) and sell button dispatch `window.dispatchEvent(new Event("50pick:refresh"))` after a successful action; the round page already mounts a `RefreshPoller` listening for that very event. Dispatch it in the hook's success branch (once per falling edge if you coalesce — see UD-7). This also fixes the pill (layout re-renders with the refresh). Do **not** add a `wallet:balance` emit to `buyPosition` unless Ali asks — the event-refresh path is sufficient and touches no money code.
- **Verify:** place a bet from the round page; pool figures + pill move within ~1 s; devtools shows exactly one RSC refetch.

### UD-6 · **P1** — Every board tap forces a full board re-render, N× under rapid tapping
- **Where:** `revalidatePath("/updown")` inside `buyPositionAction`; contradicted by `updown-card.tsx:311–314` ("the card does NOT … router.refresh() per tap; the board's 20s poller reconciles").
- **What happens:** each tap's action response re-runs `getBoard` (asset list, confirmed reads, chain stats, per-user stakes) and streams a full board render. The "bet a lot in one tap" flow multiplies this — 6 taps ≈ 6 sequential full board renders racing the 20 s poller, on the 2G/low-end profile the standards bar names. It is also what makes rapid-tap reconciliation twitchy (each render resets optimistic deltas mid-burst).
- **Required behaviour:** at most one board reconciliation per tap **burst**, not per tap.
- **Implementation notes (choose one, flag in PR):**
  - **(a) preferred:** remove `/updown` from the action's `revalidatePath` list and have the hook dispatch `50pick:refresh` on the **falling edge** of `pending` (mirror of `useDeferredToast` — one refresh once the burst settles). One mechanism then serves board *and* round page (UD-5).
  - **(b) minimal:** keep the revalidate, add the falling-edge event only for the round page. (Leaves the N× cost.)
  - Either way the RefreshPoller's existing 5 s dedupe absorbs the poller overlap.
- **Verify:** network tab, 5 fast taps: exactly 5 action POSTs (each is a real bet — correct) but **one** board refetch after the last settles.

### UD-7 · **P1** — Rollback/reconcile edge cases under concurrent taps
- **Where:** `use-quick-bet.ts:102, 151, 156`.
- **What happens:** deltas are clamped (`Math.max(0, …)`) so nothing goes negative, but with ≥2 bets in flight, a reconcile landing between a success and a late failure can briefly overstate "You're in" until the next poll; a session-expiry mid-flight (action `redirect("/auth/login")`) leaves the optimistic delta applied while the router navigates — combined with the generic catch, the player can see "Bet not placed" *and* get bounced to sign-in.
- **Required behaviour:** the displayed stake is never above server truth + genuinely-in-flight stakes; auth loss routes cleanly to sign-in with `next=` back to the surface.
- **Implementation notes:** track in-flight amounts in a `ref` map keyed by idempotency key; on success move key → settled (cleared on next server advance), on failure delete key; derive `optUp/Down` from the map instead of two counters. Small, contained, testable in `updown-quickbet.test.mts`. For auth: detect the redirect (the action never returns) — set a "signing in" state instead of the failure toast.
- **Verify:** unit-test the map logic; manual: expire the session (revoke via second login), tap — no failure toast, clean sign-in round-trip.

---

## 3 · Findings — loaders, pending states, stuck indicators

### UD-8 · **P1** — The gold Confirm has no in-flight presentation (breaks the SubmitButton convention)
- **Where:** `round-stake-panel.tsx:184–192`.
- **What happens:** the one money commit on the page disables while pending — nothing else. No spinner, no pending label, no `aria-busy`. Platform rule: *"All forms use SubmitButton (spinner + pending label via useFormStatus)"*; every admin control wires `loading={pending}`. Under load a bet may legitimately queue up to 15 s (admission budget) — 15 s of a dead-looking gold button.
- **Fix:** it's a programmatic action, not a form, so mirror the SubmitButton *presentation*: `disabled={!stakeReady || pending}`, `aria-busy={pending}`, `{pending && <Spinner size={14} />}`, label swaps to `t.common.working`-equivalent (`udPlacing…` keys). Keep gold.
- **Verify:** throttle network; Confirm shows spinner+label; double-activation impossible (already disabled).

### UD-9 · **P1** — Board place buttons: in-flight state is a helper-line dot only; escalation absent
- **Where:** `updown-stake-controls.tsx:165–191`.
- **What happens:** by design the two buttons stay enabled while pending (repeat taps = repeat bets — do not change). The only in-flight signal is the tiny helper line swapping to `live-dot + streaming`. On a slow link the player has no per-button acknowledgement between tap and pulse, and no message at all if the admission queue holds the bet for seconds.
- **Fix (keeps Ali's decision intact):** (1) per-side in-flight micro-indicator — track the last tapped side while pending and render a 12 px `Spinner` inside that button next to the multiplier (buttons stay enabled); (2) staged feedback: if any bet has been pending > ~2.5 s, the helper line escalates to a queued message (`udStillPlacing` — "Still placing — busy moment, your tap is queued") driven off a timestamp ref, not `setTimeout`-messaging (a render-time comparison against the tick that already exists in the card is fine; or one interval in the hook cleared on settle).
- **Verify:** throttle to Slow 3G; tap once — spinner appears in the tapped button; >2.5 s shows the queued line; UI never claims failure while the request is alive.

### UD-10 · **P1** — NavProgress can run a phantom 8 s bar (stuck loader class)
- **Where:** `nav-progress.tsx:87–98`.
- **What happens:** the capture-phase click handler starts the bar for **any** internal `a[href]`, including: ctrl/cmd/shift/middle-clicks (new tab — this page never navigates), `target="_blank"` internal links, and clicks on a link to the **current** URL (pathname+search unchanged ⇒ completion effect never fires). Each leaves the bar crawling to 85 % for the full 8 s safety timeout — a loader that promises a navigation that is not happening.
- **Fix:** in `onClick`: bail when `e.defaultPrevented`, `e.button !== 0`, `e.metaKey || e.ctrlKey || e.shiftKey || e.altKey`, `anchor.target && anchor.target !== "_self"`, `anchor.hasAttribute("download")`, or resolved href equals current `pathname + search` (and hash-only — already handled).
- **Verify:** ctrl-click a nav link → no bar; click the active bottom-nav tab → no bar.

### UD-11 · **P2** — BackLink navigations show no navigation loader
- **Where:** `back-link.tsx` (button + `router.back()/push`), used at the top of the round page and history.
- **What happens:** forward navigations get the gold bar; going back from a round gets nothing — inconsistent perceived speed on the highest-traffic exit of the section.
- **Fix:** dispatch `window.dispatchEvent(new Event("50pick:navigating"))` before `router.back()/push` — the exact idiom `updown-card.tsx` already uses.

### UD-12 · **P2** — Toast auto-dismiss + `role="status"`: danger toasts under-announced
- **Where:** `toast.tsx:341` (`role="status"` on every item).
- **What happens:** `status` is polite; a money-failure toast can be read late or never by SRs while it auto-dismisses in 4.5 s. With UD-3's sticky failures this becomes minor, but the kit should still announce failures assertively.
- **Fix:** `role={variant === "danger" ? "alert" : "status"}` on the item. One line, kit-level.

---

## 4 · Findings — rendering, transitions, navigation, states

### UD-13 · **P1** — Asset/duration tab switch blanks the entire board to the skeleton
- **Where:** `/updown/page.tsx:105–144` (tabs are plain `<Link>`s to `?asset=…&d=…`), `force-dynamic` + `loading.tsx`.
- **What happens:** every filter click is a full route navigation: the live board (tape, heartbeat, three cards, a countdown mid-tick) is replaced by the shimmer skeleton and re-enters — a hard flash for what is conceptually a filter, and the countdown restarts its `--:--` pre-hydration tick. It reads as a page reload, not a tab.
- **Required behaviour:** tab changes keep the current board visible, dimmed/pending, and swap in place.
- **Implementation notes:** extract the tab rows into one small client component that calls `router.push(href)` inside `startTransition`, rendering `data-pending`/`aria-busy` on the grid wrapper while pending (CSS: reduce opacity via an existing token — check `state-tokens.css` for a pending treatment before adding one). Next keeps the previous page visible during a transition-wrapped navigation instead of falling to `loading.tsx`. No data-layer change; `loading.tsx` still covers cold entries. This is the section's single biggest perceived-quality win.
- **Verify:** click through all durations rapidly — board never blanks, active chip moves instantly (optimistic `aria-current` from the pending href), cards swap once data lands.

### UD-14 · **P1** — Round-detail skeleton does not match the page it precedes (the B7 defect class, again)
- **Where:** `/updown/[roundId]/loading.tsx` vs `page.tsx:194, 274`.
- **What happens:** the skeleton is a single stacked column (`h-40` + `h-36`, `py-6`); the real page is a 2-column `xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]` layout with `pt-[22px] pb-14`. On desktop the whole page reflows when content arrives — the exact "152px layout jump" defect the page's own comment says B7 fixed for the widths.
- **Fix:** mirror the real geometry: same paddings, and at `xl` a two-column grid — left hero ghost (~`h-[300px]`), right rail with two stacked ghosts (pool ~`h-40`, panel ~`h-56`), full-width proof ghost omitted (it only exists when decided). Keep `kp-shimmer-track`.
- **Verify:** DevTools → 1440 px, hard-reload a round URL; no element shifts columns when the page lands.

### UD-15 · **P1** — Board/round errors are conflated with empty/404 states
- **Where:** board: `/updown/page.tsx:45–60` (`getBoard(...).catch(() => null)` → EmptyState "No rounds open right now"); round: `page.tsx:83–84` (`getRoundDetail(...).catch(() => null)` → `notFound()`); **and no `error.tsx` exists anywhere under `/updown`** while `/markets`, `/positions`, `/wallet` all have one.
- **What happens:** a DB outage renders as a calm "no games today" board; a transient failure on a round URL renders as a 404 — telling a player their round *does not exist* while their money is in it. Both misreports are production-risk grade on a real-money product (a player screenshots "my bet's page says not found").
- **Fix:** (1) add `error.tsx` to `/updown`, `/updown/[roundId]`, `/updown/history` following the sibling pattern (`route-error` kit component, retry via `reset()`); (2) drop both `.catch(() => null)` swallows so real throws reach the boundary; keep `notFound()` strictly for "query succeeded, no such round". `generateMetadata`'s catch can stay.
- **Verify:** temporarily throw inside `getRoundDetail` in dev — round URL shows the error boundary with retry, not 404; board likewise.

### UD-16 · **P1** — Card-wide `role="link"` navigation swallows taps meant for the bet controls
- **Where:** `updown-card.tsx:349–361` (whole `<article>` clickable) + `updown-stake-controls.tsx` (only buttons/input stop propagation).
- **What happens:** on the authed bettable card, taps on anything that is *not* a button — the "STAKE" label, the "You're in" chips, the helper/estimate lines, the gaps between chips — bubble to the article and **navigate away** mid-stake-entry. On mobile this is a constant mis-tap hazard on the money surface (player is lining up a bet; a 2 mm miss yanks them to the detail page). It is also a nested-interactive a11y smell (link containing radios/inputs/buttons).
- **Fix:** wrap the quick-bet block (the `UpDownStakeControls` render at line 516) in a `div` with `onClick={(e) => e.stopPropagation()}` (and `onKeyDown` for Enter/Space bubbling), so the controls area is a navigation-dead zone while header/countdown/stats keep the card-as-link behaviour. Remove the per-child `stopPropagation` plumbing if it becomes redundant (keep the prop for the input's Escape case). Alternative (bigger, not required): make only the header row the link.
- **Verify:** on a touch device / device-mode, tap between two stake chips — nothing navigates; tap the header — navigates.

### UD-17 · **P2** — Board slot-shift at phase boundaries can move a money button under the pointer
- **Where:** `updown-board.ts:479–495` (slots `[current, justClosed, lastDone]`) + 20 s poller.
- **What happens:** at rollover the old current card moves to slot 2 and a new bettable card enters slot 1 — on the same tick a player may be mid-tap. The buttons are position-stable *within* a card, but the card under the finger changes identity. Risk is bounded (rollover ≈ once per round) but this is a real-money mis-tap vector.
- **Fix options (product call, present to Ali):** (a) accept + add a ~300 ms `pointer-events: none` settle on a card that just entered slot 1 (cheap, invisible); (b) keep slots visually fixed with an enter transition (kit `m-settle-in`). Recommend (a).

### UD-18 · **P2** — History round cards are raw `<a>` → full document reloads
- **Where:** `/updown/history/page.tsx:183–188` (`CardTag: "a"`).
- **What happens:** every click out of history is an MPA reload — slowest navigation in the section, skips the router cache and RouteTransition. (NavProgress still fires, so the bar + a white reload double-signal.)
- **Fix:** use `next/link` (`Link` with `href={roundLink}`); keep the `div` fallback when `roundId` is null.

### UD-19 · **P2** — History shows live rounds but never updates; timestamps in UTC
- **Where:** same page — no `RefreshPoller`; `fmtDate` renders `MM-DD HH:mm Z` UTC while the round page states EAT explicitly.
- **Fix:** mount `<RefreshPoller intervalMs={20_000} enabled={anyOpen} />` (rule-shaped, like `refreshCadence`); format dates via the EAT helper for consistency with the settlement proof (a player comparing their history row to the proof should not have to convert time zones).

### UD-20 · **P2** — Locked card understates a hedged player's position
- **Where:** `updown-card.tsx:294` — `mySide = myUpStake > 0 ? "UP" : …` and the single `exactWin` line at 563–567.
- **What happens:** a player holding **both** sides (legal — repeat taps, either side) sees only "You win X if Up" while locked; their DOWN outcome is unstated. `myExactPayout` is a single number — confirm with the server rule which side it prices (it comes from `projectedPayout`; if it assumes one side, both-side holders get a silently wrong figure — that would be an A-5-grade misstatement on a money surface and upgrades this to P1).
- **Fix:** first *verify* `myExactPayout` semantics in `updown-board.ts`/`updown-service.ts` for the both-sides case; then either render two lines ("if Up… / if Down…", server supplying both) or suppress the line for hedged holders rather than print a half-truth.

### UD-21 · **P2** — `aria-live` success line doesn't re-announce identical consecutive bets
- **Where:** `use-quick-bet.ts:137`, consumed at `updown-stake-controls.tsx:214`.
- **What happens:** two identical taps (same side, same stake) set the same string; most SRs won't re-announce unchanged live-region content, so the second bet is silent for SR users — the exact E-64 gap, one channel down.
- **Fix:** suffix an invisible counter (`\u200B`.repeat(nonce % 2) or include the running total: "Bet placed · Up · TZS 1,000 · total TZS 2,000" — the total is better copy anyway).

### UD-22 · **P2** — Empty state can hide a *paused* chain behind "no rounds"
- **Where:** `/updown/page.tsx:188–189`; `chainPaused` is returned by `getBoard` and never rendered.
- **What happens:** with manual round generation (admins emit every ~5 min), the between-rounds gap shows the same copy as "this market is idle". A player can't tell "wait 2 minutes" from "nothing here today".
- **Fix:** when `rounds.length === 0 && !chainPaused` is false but the chain exists, prefer a softer state ("Next round is being prepared — Rounds open every N min") — new i18n keys; keep `EmptyState` kit component. Copy needs Ali's sign-off (product voice).

---

## 5 · The toast ↔ popup decision matrix (Up & Down)

| Event | Today | Decision | Rationale |
|---|---|---|---|
| Bet placed (board card) | 3 s success toast + pulse + haptic + aria-live | **Keep — toast** (do not add a modal) | Fast game; modal would block the next tap. Guarded by `test:updown-bet-feedback`. |
| Bet placed (round page Confirm) | same | **Keep — toast** + UD-5 refresh so the *page itself* confirms (pool, pill move) | The surface updating is the primary confirmation; toast stays secondary per house rule. |
| Bet refused — predictable (insufficient balance, invalid amount, already locked *locally*) | danger toast after a doomed round-trip | **Prevent — no toast, no request** (UD-1/UD-2): disabled control + inline reason (+ deposit CTA) | "Toast before failing": never let a doomed tap look placed. |
| Bet refused — race/transient (`SELECTION_CLOSED` at the boundary, `RATE_LIMITED`, `BUSY`) | 4.5 s danger toast, raw EN | **Sticky danger toast** (durationMs 0), localized by code; on `SELECTION_CLOSED` flip surface to locked | Failure must stay until read (house rule) but a modal would be disproportionate for a race the UI then explains via the locked panel. |
| Bet refused — compliance/account (`SUSPENDED`, RG daily-loss limit, self-exclusion, maintenance) | 4.5 s danger toast, raw EN | **`OperationResultModal`** (danger/warning; no gold), localized | LCCP informed-consent: these must be read and acknowledged; house rule says exactly this. |
| WIN | `WinCelebration` modal | **Keep — modal** | Already correct (calm, RG-compliant). |
| LOSS | 6 s `factual` toast | **Keep — toast** | RG: a loss is never mirrored celebration; correct as built. |
| VOID / stake returned | 6 s default toast | **Keep — toast** (consider `factual` variant for consistency with LOSS — same "stating a fact" register) | Minor consistency nit only. |
| Round result while player on round page | announcer + page swaps to result panel | **Keep** | Correct. |

---

## 6 · Guardrails — standing decisions the implementer must NOT change

1. **Repeat taps = repeat bets** (hook header, Ali). Do not debounce, do not disable the side buttons while pending. UD-9's spinner is additive only. If Ali wants a same-side cooldown, that is *his* call to record — raise it, don't ship it.
2. **Success toast on quick-bet stays** — removing/altering the four channels breaks `test:updown-bet-feedback` and reverses a recorded player-driven decision.
3. **In-app only for Up & Down results** — no `notifyWin/notifyLoss`, no push/inbox (announcer header, Ali 2026-07-24).
4. **The dial-side lock model, pricing module (`updown-pricing`), refund reason module, A-5 rules** — untouched. No client ever re-derives money.
5. **Design is frozen** (`test:design-frozen`); every new visual uses existing tokens/kit primitives; new copy lands in `i18n-dict.ts` in all three locales; no emojis; gold budget respected (a refusal modal is never gold).
6. **Money-path code** (`buyPosition`, locks, admission) — none of these fixes require touching it; if the implementer thinks one does, stop and re-read UD-3/UD-4 (the *client* maps codes; the server is not edited). The one server-file edit in this handover is `markets/actions.ts` revalidate list (UD-6a), which is orchestration, not money.
7. Run the house protocol per stage: `npm run test:all` relevant suites (`test:updown-*`, `test:design-frozen`, `test:measure`), `qa:live` gauntlet, then live-drive on production per `50pick-audit` skill. Full `test:all` before any push that grazes a money file.

---

## 7 · Suggested implementation order (one session, staged commits)

1. **Stage 1 — the reported defect, end to end (P0):** UD-2 (phase-aware panel) → UD-1 (pre-flight + balance) → UD-4 (code→i18n map) → UD-3 (sticky toast + blocked-modal + kit `durationMs: 0`). One commit per item; Playwright case "tap at lock" + quickbet unit tests extended.
2. **Stage 2 — truth after commit (P1):** UD-5 + UD-6 together (they share the falling-edge refresh) → UD-7.
3. **Stage 3 — pending/loader polish (P1):** UD-8, UD-9, UD-10, UD-13, UD-14, UD-15, UD-16.
4. **Stage 4 — P2 batch:** UD-11, UD-12, UD-17 (after Ali picks a/b), UD-18–UD-22.

Estimated blast radius: ~14 files in `src/components/updown`, `src/components/ui` (toast, nav-progress, back-link), `src/app/updown/**` (+3 new `error.tsx`), `src/app/markets/actions.ts` (one array), `src/lib/i18n-dict.ts`. Zero schema, zero money-service changes.

---

## 8 · Phase 2 preview — patterns to sweep platform-wide (noted while auditing, not yet audited)

These were *observed in passing* and are the checklist seeds for the full end-to-end review we agreed to do next:

- Error-string localization by `code` — every `useTransition`+toast call site platform-wide (wallet, proposals, profile) likely shares UD-4's defect.
- `catch(() => null)` → empty/404 conflation — grep-audit all `page.tsx` data fetches; several routes lack `error.tsx`.
- NavProgress modifier/target/same-URL cases (UD-10) fix benefits every page.
- Raw `<a>` for internal links (found in history; sweep for others).
- Server-prop-derived phase/time on any live surface (markets countdowns, resolver queue) — the E-82 class.
- Sticky-failure support in the toast kit unlocks the primary/secondary rule everywhere.
- Poller enablement rules (`refreshCadence`-style) for other live pages (`/live`, `/markets`, notifications panel).

---

*Prepared for the implementation session. Every finding carries file:line evidence from the 2026-08-07 snapshot; re-verify line numbers against HEAD before editing — the repo moves fast.*
