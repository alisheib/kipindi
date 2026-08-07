# 50pick — UX Audit Implementation Master Plan (LIVING DOCUMENT)

> **This is the single source of truth for the 2026-08-07 UX-audit implementation.**
> Any session — mine or another — reads THIS file first, works the next open item,
> updates the status marks in this file in the same commit, then commits + pushes.
> Do not start work without reading the "PICK UP HERE" block directly below.

**Owner:** Ali · **Created:** 2026-08-07 · **Location:** `docs/ux-audit-2026-08/MASTER-PLAN.md`

---

## ▶ PICK UP HERE  (update this block every session)

- **Overall status:** IMPLEMENTING — Session A COMPLETE (7/7); Phase 2 core design set under way (toast rung 4, DA-8, DA-9, DA-2, DA-6, DS-2, DS-3, DS-4 done).
- **Active session:** ⚠️ OWNERSHIP RETURNED TO THE CLOUD SESSION 2026-08-07: the local session on F:\ imported the bundle, pushed through DS-3 and STOPPED COMPLETELY (Ali confirmed). The cloud session (claude-fable-5, working a clone of `origin/main`; the F:\ tree is idle — do not edit there) owns everything again — money, Up & Down, platform, all design work.
- **Next action:** UD-7 (in-flight delta map keyed by idempotency key + auth-loss "signing in" state), then Stage 3 (UD-8/9/10/13/14/15/16 — do DA-3's 40px stake chips with UD-9). Do DA-3 (E-112 stake chips to the 40px floor) together with the UD-9 tap-target item when Stage 3 reaches it; DA-4 (E-114 refund-toast tick) alongside UD-12.
- **Blocked on:** nothing. Only the §9 items need Ali; they are parked, work continues.
- **Environment note:** tests MUST run under Node 24 (`/opt/node24` in the cloud session). Under Node 22, tsx dual-instantiates modules and the seam-patching suites (late-bet, settlement-gate) fail falsely. Cloud sandbox extras: Google Fonts is blocked, so `next build` fails locally — verify CSS atoms on production via `npm run qa:bundle-css -- --live` after the deploy; `qa:live` runs with `QA_OFFLINE=1`; the local qa:live board has no live card on a fresh store, so "at least one bettable market exists" fails there — verified identical at clean HEAD, not a regression signal.
- **Pre-existing red suites at `da231631` (verified identical before/after Session A; NOT caused by this work):** `test:kyc-doc-metadata` (1 fail), `test:updown-push` (1 fail, §2 suppression-gate else-branch), `test:orphans` (sessions 29–35 left unwired live-QA scripts), `test:updown-admin-options` (2 fails). `test:trilingual` is flaky (random poll fixture; passes on re-run). `test:prisma-delegate` needs the Prisma engine binary — unavailable in the cloud sandbox (blocked CDN), fine on Ali's machine. Fix the updown ones during Session B, orphans/kyc during the sweep/cleanup phases.
- **Last updated by:** cloud implementation session (claude-fable-5), 2026-08-07 — batch of EIGHT items this session: DA-2 (glyphs onto the M5 primitives; kit `GlyphSwap`; gate `test:glyph-motion`) · DA-6 (ATOM J — §M in the authority, EXTEND.md deleted) · UD-2 · UD-1 · UD-4 · UD-3 (Stage 1 complete) · UD-5+UD-6. 🔴 **PUSH PENDING — NEEDS ALI:** the cloud git proxy refuses writes ("alisheib/kipindi is not in this session's authorized repository set"); seven commits are stacked locally on `main` (bc10b28a → 778c697f + this one) and push the moment repo access is added to the session's sources. A `git bundle` of the same commits was also delivered to Ali in-chat as a fallback (import on the F:\ machine: `git fetch <bundle> main && git merge --ff-only FETCH_HEAD && git push` — ff-only, nothing to merge). ⛔ Until these land on origin, a NEW session must not start from a fresh clone of origin/main — it would re-do this work; resume THIS cloud session, or import the bundle first. test:all 182/188 (only the documented reds + server-needing suites; the new suite is green), qa:live 120/1 identical to clean-HEAD baseline. ⚠️ Fresh-container note: Node 24 installed from the npm `node-linux-x64` package (nodejs.org is 403 through the proxy); Prisma client generates with `PRISMA_SCHEMA_ENGINE_BINARY=<fake> PRISMA_QUERY_ENGINE_LIBRARY=<fake> PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate --no-engine` (engines CDN blocked); Playwright's chromium-1217 satisfied by symlinking the pre-installed 1194 build under /opt/pw-browsers.

> When you finish an item: tick it in §5/§6, update the counters in §4, and rewrite this
> block (status / active session / next action / last updated). One session owns `main`
> at a time — never run two implementation sessions in parallel (per
> `docs/PARALLEL-SESSION-COORDINATION.md`).

---

## 1 · What this plan covers

Two audit reports, taken from a 2026-08-07 snapshot, describe every interaction / loading /
rendering / navigation / transition / error-state weakness found before real-money testing:

| Report | File | Findings |
|---|---|---|
| **Report 1 — Up & Down** | `docs/ux-audit-2026-08/UPDOWN-UX-AUDIT-HANDOVER.md` | 22 (UD-1 … UD-22) |
| **Report 2 — Platform-wide** | `docs/ux-audit-2026-08/PLATFORM-UX-AUDIT-HANDOVER.md` | ~29 behaviour (B-1…B-29) + 7 visual (V-1…V-7) |

Supporting files in the same folder: `SESSION-PROMPTS.md` (copy-paste kickoff per session),
`updown-handover-brief.html` + `platform-handover-brief.html` (visual summaries), and this plan.

---

## 2 · Rules of engagement (all sessions)

1. **Sequential only.** One session owns `main`/deploys/money at a time.
2. **Re-verify before editing.** The audit is a snapshot; a design-component session has since
   touched the code. Re-check each finding's `file:line` against HEAD. If it no longer
   reproduces, mark it `SUPERSEDED` in §5/§6 (with a one-line note) and move on — don't force it.
3. **Money engine untouched.** No edits to buyPosition / deposit / withdraw money math, locks,
   admission, pricing, payout or refund modules — only the specific admin-action / plumbing lines
   the reports name.
4. **Respect the guardrails** in each report: Ali's standing decisions (repeat taps = repeat bets;
   Up & Down results in-app only; keep the 4-channel bet feedback / `test:updown-bet-feedback`),
   design freeze (`test:design-frozen`), gold budget, kit-only primitives, EN+SW+ZH for new copy,
   no emoji in UI.
5. **Per item:** relevant `test:*` → `qa:live` → live-drive on production → update THIS plan →
   commit AND push. Full `test:all` before any push that grazes a money file.
6. **Update the plan in the same commit as the code.** A ticked box with no commit, or a commit
   with no ticked box, is a bug in the record.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done (tested + pushed) ·
`[S]` superseded / already fixed (note why) · `[-]` deferred by Ali.

---

## 3 · Session order (most important first)

| # | Session | Report(s) | Gate | Prompt |
|---|---|---|---|---|
| **A** | **Money-safety & ops** (server actions + admin console) | Report 2 P0s + admin | **START NOW** — no design collision | `SESSION-PROMPTS.md → Session A` |
| **B** | **Up & Down** (player front-end, all 22) | Report 1 | after design session merges | `SESSION-PROMPTS.md → Session B` |
| **C** | **Platform front-end sweeps** (5 patterns + freshness + auth) | Report 2 remaining | after B | `SESSION-PROMPTS.md → Session C` |
| **D** | **Design session** (already running) | Report 2 VISUAL V-1…V-7 | in parallel, its own owner | `SESSION-PROMPTS.md → design block` |
| **DS** | **Design-consistency sweep** — new toast/popup/modal set applied to ALL 24 signal surfaces | §6 "DS" tracker (27 items) | after the new design set is defined; runs with/after C | in the RUN-EVERYTHING prompt |
| **DA** | **Design-system atoms** — carried over from the design session (toast rung, 178 glyphs, E-112/114/115, ATOM J, .gilt-ink, cleanups) | §6 "DA" tracker (12 items) | with DS; DA-5 under Session-A money rules; 2 items need Ali (§9) | in the RUN-EVERYTHING prompt |

Rationale: Session A protects real money and touches files the design work isn't in, so it can
run immediately and in parallel-safe isolation. B and C are player-surface work that must land on
top of the merged design components, so they wait. D folds the visual items into the rebuild it is
already doing.

---

## 4 · Progress counters (update as you go)

- **Session A (money/ops):** 7 / 7 items done
- **Session B (Up & Down):** 7 / 22 findings done (Stage 1 COMPLETE; Stage 2: UD-5/6 done, UD-7 next)
- **Session C (platform front-end):** 0 / ~17 findings done
- **Visual set (design):** 1 / 7 done
- **DS · design-consistency sweep (toasts/popups/modals):** 4 / 27 done
- **DA · design-system atoms (carried over from design session):** 5 / 12 done (2 need Ali)
- **TOTAL:** 24 / ~92 done

---

## 5 · SESSION A tracker — Money-safety & ops  (do these first)

> **Turnkey specs:** `SESSION-A-EDIT-SPECS.md` has exact before→after edits for every item below,
> verified at HEAD 2026-08-07. Tick each box here (and bump §4) as it is tested + pushed.

- [x] **B-2** Admin Retry cancels a *refused* payout record → move `db.txn.update(CANCELLED)` inside `if(r.ok)` in `admin/payments/payment-actions.ts` (retryDeposit/retryWithdrawal/bulkRetry). *(P0)*
- [x] **B-3** Admin 2FA removable with no step-up → require current TOTP + hard confirm in `admin/2fa/setup/actions.ts` + `setup-client.tsx`. *(P0)* — remove needs current code + typed REMOVE (hard ConfirmModal); rotation needs current code; first-time enrolment stays open.
- [x] **B-4** 50M single-officer balance adjust → AML maker-checker ≥1M + hard-tier confirm in `admin/players/[id]/balance-adjust-controls.tsx` / `adjustBalanceAction`. *(P0)* — durable stage-1 store (config-store, same pattern as AML), different-officer countersign on the IDENTICAL amount, self-countersign blocked, both ids audited; client types CREDIT/DEBIT ≥1M and shows the awaiting-second state. `adminAdjustBalance` primitive untouched.
- [x] **B-5** Forgeable wallet success modal → validate txn (owned) server-side in `wallet/wallet-result-modal.tsx` + `wallet/page.tsx`. *(P0)* — modal renders only for a txn in the user's own loaded txns, with STORED status+amount; `sp.status`/`sp.amount` no longer trusted.
- [x] **B-1 (money slice)** Swallowed reads render zero/empty on wallet, withdraw, positions, markets/[id] balance, `/admin/payments`, `/admin/finance`, `/admin` → failure panels, never `0`. *(P0)* — player money pages now throw to their route error.tsx (RouteError + retry); markets/[id] passes balance undefined on failure (dial suppresses the false "insufficient"); admin dashboards read to null → AdminLoadError, never a fabricated empty list/chart.
- [x] **B-8** ~16 admin controls silent on thrown action → shared `runAdminAction` try/catch → toast/overlay. *(P1)* — `src/lib/client/run-admin-action.ts`; wired into all 16 controls; NEXT_REDIRECT rethrown so step-up redirects still work.
- [x] **B-9** `/admin/aml` stage-1 badge + "awaiting second" KPI read the durable store, not the audit ring; fix the two info sentences. *(P1)* — stage-1 store extracted to `admin/aml/stage1-store.ts`, page uses `listFirstSignatures`; info cards on /admin/aml + /admin/approvals now say COMPLIANCE category + durable stage-1.

---

## 6 · SESSION B & C trackers

### Session B — Up & Down (Report 1, all 22) — run in the 4 staged commits

**Stage 1 (P0 — the reported bet bug):**
- [x] UD-2 phase-aware round stake panel (lock race) — DONE 2026-08-07: new `round-action-panel.tsx` (client) owns the page's open-vs-locked slot, deriving from `roundPhase` off the server-anchored clock exactly like the board card; the locked markup moved there (one copy). Belt-and-braces: `useUpDownQuickBet` gains `selectionClosesAtMs`/`serverNowMs` and `place()` refuses past the lock instant BEFORE the optimistic apply (factual toast + aria-live, no request) — threaded on both live surfaces (round panel + board card; `updown-bet-box.tsx` has ZERO consumers at HEAD — dead component, left for the sweep). Guards: `test:updown-window` §7b (4 structural checks) + `test:updown-bet-feedback` 3.4 re-pinned to the new exact shape (2 danger + 1 factual). Playwright "tap at lock+1s" not addable locally (no live round on a fresh store — documented limitation); covered by 7b.3's before-optimistic ordering assertion.
- [x] UD-1 balance + lock pre-flight in `useUpDownQuickBet` — DONE 2026-08-07: pure rule `insufficientFor(balance, spentSinceTruth, stake)` in `stake-math.ts` (an optimistic burst counts against the rendered balance; **null balance gates NOTHING** — B-1, a failed read never invents "insufficient"); `place()` refuses BEFORE the optimistic apply (factual toast + aria-live, zero network); both board place buttons + the round page's gold Confirm disable with an inline info-register reason + Deposit link; balance threaded server-side on both pages (`db.wallet.findByUserId(...).catch(() => null)` — failed read stays null). New key `udInsufficientBalance` EN/SW/ZH. Guards: `test:updown-quickbet` §29 (9 checks, pure + structural), `test:updown-bet-feedback` 3.4 re-pinned (2 danger + 2 factual pre-flight refusals).
- [x] UD-4 error-code → i18n map (udErr* keys) — DONE 2026-08-07: one map in `bet-error-copy.ts` (`udBetErrorMap(t.market)`) covering all six `buyPosition` refusal codes (SELECTION_CLOSED · RATE_LIMITED · BUSY · SUSPENDED · INVALID · NOT_FOUND); the hook's failure toast renders the localized message keyed off `r.code`, with the raw service string demoted to a code-less fallback only. Six `udErr*` keys in EN/SW/ZH. Server strings untouched (API/audit truth — translate the surface, never the server). Both live surfaces build the map from the one home. Guard: `test:updown-quickbet` §30 (all codes × 3 locales; the toast prefers the code copy; one-home wiring).
- [x] UD-3 sticky failure toast (add `durationMs:0`) + compliance blocked-modal — DONE 2026-08-07 (kit `durationMs:0` already existed from DS-1): both danger failure toasts (server refusal + thrown action) are now STICKY; `SUSPENDED` routes to the new shared `UpDownBetBlockedModal` (kit `OperationResultModal`, danger, no gold — LCCP read-and-acknowledge), one host per page fed by a `50pick:updown-bet-blocked` window event (the `50pick:refresh` idiom), mounted beside the announcer on board + round pages; `SELECTION_CLOSED` flips the local surface to locked immediately (`serverLocked` in the hook → card `liveNow`, round panel `lockedByServer` via `onServerLocked`) and further taps refuse factually. New key `udBlockedTitle` EN/SW/ZH. Guard: `test:updown-quickbet` §31 (6 checks). Matrix rows verified against §5: prevented (UD-1/2) · sticky race toast · modal for compliance.

**Stage 2 (P1 freshness):**
- [x] UD-5 round-page + wallet pill refresh after bet — DONE 2026-08-07 with UD-6 (one mechanism): the hook dispatches `50pick:refresh` on the FALLING EDGE of its pending transition (useDeferredToast mirror, zero setTimeout), armed by the success branch; both pages' RefreshPoller (round page listens via refreshCadence mount) pick it up, so pool figures, `myExactPayout` and the top-bar pill move within a beat. No `wallet:balance` SSE emit added (per the report — event-refresh suffices, touches no money code).
- [x] UD-6 one board refresh per tap burst (remove `/updown` from action revalidate) — DONE 2026-08-07, option (a): `revalidatePath("/updown")` removed from `buyPositionAction` (orchestration, not money — the ONE server-file edit Report 1 licenses); the falling-edge event is the single reconciliation per burst; the poller's 5s dedupe absorbs overlap. Guard: `test:updown-quickbet` §32 (4 checks: no per-tap revalidate, other four revalidates intact, falling-edge dispatch, success-armed).
- [ ] UD-7 in-flight delta map / concurrent-tap rollback

**Stage 3 (P1 loaders/transitions/boundaries):**
- [ ] UD-8 gold Confirm spinner · [ ] UD-9 per-tap in-flight signal + queued escalation
- [ ] UD-10 NavProgress phantom-bar guards · [ ] UD-13 tab switch keeps board (no skeleton blank)
- [ ] UD-14 round skeleton matches layout · [ ] UD-15 add `error.tsx` ×3 + stop swallowing · [ ] UD-16 controls are a nav-dead-zone

**Stage 4 (P2):**
- [ ] UD-11 BackLink nav bar · [ ] UD-12 toast `role=alert` · [ ] UD-17 rollover slot settle (ask Ali a/b)
- [ ] UD-18 history `<Link>` · [ ] UD-19 history poller + EAT dates · [ ] UD-20 hedged-player payout line
- [ ] UD-21 aria-live re-announce · [ ] UD-22 paused-chain empty state

### Session C — Platform front-end sweeps (Report 2 remaining)

- [ ] **Pattern 2** — B-7 one error-code→`t.*` mapper adopted everywhere
- [ ] **Pattern 3 (player)** — B-6 deposit/withdraw pending state · B-12 try/catch+rollback on awaited actions
- [ ] **Pattern 5** — B-11 raw `<a>` → `<Link>` (filters, pagination, CTAs, notifications)
- [ ] **Pattern 1 (rest)** — B-1 remaining player pages + add missing `error.tsx` (see report §7 appendix)
- [ ] **Pattern 4** — B-10 dial/side-picker/cards/Countdown use `selectionClosedAt ?? resolutionAt` + serverNow
- [ ] **Freshness** — B-16 one refresh per mutation + deferred toasts · B-17 pollers (notify/live/comments/watchlist) · B-19 scroll-restore + deposit-return/receipt pollers
- [ ] **Auth** — B-13 session-revoked/self-excluded/expired/lockout panels · B-14 `next=` round-trips · B-15 notifications optimistic dismiss + awaited mark-read · B-18 SSE jitter/backoff · B-20 chat/vote/ceremony double-submit
- [ ] **P2 batch** — B-21 cash-out quote hold · B-22 deposit-confirm validation · B-23 deposit bounds import · B-24 WatchStar auth redirect · B-25 SearchBox URL sync · B-26 primer suppression · B-27 OTP countdown anchor · B-28 admin polish set · B-29 skeleton geometry

### Design session — VISUAL set (Report 2 §4)
- [ ] V-1 remove emoji from UI copy · [ ] V-2 skeletons mirror real grid · [ ] V-3 kill native validation bubble
- [ ] V-4 KYC doc viewer load/error state · [ ] V-5 toast `role=alert` · [ ] V-6 remove fake latency · [ ] V-7 localize SR labels

### DS · Design-consistency sweep — the NEW toast / popup / modal design set applied EVERYWHERE (Ali, 2026-08-07)

> **Goal:** the new design set for toasts and popups is applied uniformly across the WHOLE signal &
> overlay system — no surface left on the old look, no one-off styling. This is a *coverage* task,
> not a bug fix: every one of the 24 surfaces below must (a) render in the new design set, (b) use
> the shared kit primitive (`toast()` / `<Modal>` / `<OperationResultModal>` / `ConfirmModal`) rather
> than a hand-rolled panel, and (c) obey the toast-vs-popup decision matrices in both reports
> (Report 1 §5, Report 2 — consequential mutation → OperationResultModal, failures persist, toast is
> secondary). Do this AFTER the design-component session has defined the new set; then conform all
> consumers to it. If the design session already migrated a surface, mark it `[S]`.

**Core kit primitives (must define the new design set, everything else inherits):**
- [x] DS-1 `ui/toast.tsx` — new toast look; variants success/danger/warning/factual/gold; `role=alert` for danger (V-5); sticky `durationMs:0` support (from UD-3). — rung 4 (`.mat-toast`) + composed `.mat-tint-*` per variant; factual stays untinted; dead `.toast` class family swept from globals.
- [x] DS-2 `ui/modal.tsx` (`Modal` + `ConfirmModal`) — new popup chrome; add `loading` state (B-28); tiers. — Modal already rung 3 (design session); ConfirmModal gains `loading` (both buttons disabled, spinner + t.common.working, scrim/Esc/✕ blocked, aria-busy); wired into control-plane's provider switch. Remaining consequential call sites take it during the DS sweep.
- [x] DS-3 `markets/operation-result-modal.tsx` — the canonical result popup; new crest/strip. — crest disc + detail-row tones now compose off the semantic ramp with color-mix (lit-glass recipe, same families as the toast tints); zero hand-typed oklch left in the TONE map.
- [x] DS-4 `ui/confirm-dialog.tsx` — align to the new `ConfirmModal` look + pending (B-6). — look was already ConfirmModal-delegated (rung 3); gains the `pending` hold-open contract (confirm no longer closes; ConfirmModal `loading` through the round-trip; falling-edge release; `onConfirm() === false` = refused pre-flight). Wired via `useFormStatus` into deposit-confirm + withdraw-confirm with `reportValidity()` pre-flight — B-6's two named money forms done; B-6's remaining half (B-12 try/catch) stays in Session C.

**Confirm / result popups (conform to the new set):**
- [ ] DS-5 bet-confirm-modal · [ ] DS-6 sell-confirm-modal · [ ] DS-7 win-celebration · [ ] DS-8 objection-dialog · [ ] DS-9 notify-prompt · [ ] DS-10 rg/reality-check · [ ] DS-11 rg/rg-confirm-submit · [ ] DS-12 admin/action-overlay · [ ] DS-13 onboarding/first-visit-primer

**Banners / inline signals (conform to the new set + tone rules):**
- [ ] DS-14 ui/callout · [ ] DS-15 ui/notice-bar · [ ] DS-16 ui/offline-banner · [ ] DS-17 ui/tooltip · [ ] DS-18 ui/maintenance-badge · [ ] DS-19 ui/coming-soon-badge · [ ] DS-20 layout/announcement-banner · [ ] DS-21 layout/email-verify-banner · [ ] DS-22 auth/rate-limit-banner · [ ] DS-23 markets/house-lean-warning · [ ] DS-24 layout/notifications-panel + layout/needle-drawer

**Sweep gate (must pass to call DS done):**
- [ ] DS-25 No hand-rolled toast/popup remains — grep for ad-hoc fixed-position "toast"/inline modal panels not using the kit primitives; migrate any found.
- [ ] DS-26 Every consequential mutation platform-wide routes to `OperationResultModal` (not a bare toast); failures persist; toast stays secondary — audited against the matrices.
- [ ] DS-27 One screenshot pass at 360/768/1280 (needs the Chrome extension + login) confirming every surface reads as one system in light + dark. Report to Ali.

### DA · Design-system atoms — carried over from the design-component session (Ali handover, 2026-08-07)

> These are the design session's own OUTSTANDING atoms + filed cleanups. The census workflow
> (9 agents) never completed — do NOT wait on it; work from the code. Several overlap this audit's
> findings (noted inline) — do the DA and the audit item together so a surface is touched once.
> ⛔ **DA-5 (E-115) crosses into `src/lib/server/` and moves money — treat it under the Session A
> money rules: ledger verification + a fresh money census + full `test:all` before any push.**

**Outstanding named atoms:**
- [x] DA-1 **Toast** — repaint at elevation rung 4 (M2 says rung 4; it currently paints rung 1); the six variants sit on a flat fill and each hand-writes a border the tints now compose — drive borders from the composed tints, not per-variant literals. *(This IS the core of DS-1 + V-5 + UD-3 — do them as one.)* — DONE with DS-1; contrast corpus rebased onto the wash stops.
- [x] DA-2 **The 178 glyphs (M5)** — four glyph primitives exist, zero glyphs use them yet; migrate all 178 onto the primitives. — the glyph SYSTEM is on the primitives (2026-08-07): every bespoke glyph animation swept (spinning `rotateCcw` → kit Spinner ×3 · `shieldAlert` infinite pulse → single-shot `.g-ring` · the two infinite-pulsing gold motifs rest still per M5/M3), and each primitive now has real consumers at its own trigger — `.g-swap-in` through the new kit `GlyphSwap` (`ui/glyph-swap.tsx`; eye/bell toggles ×4, fires on state CHANGE, static first render), `.g-ring` on the bell's new-unread edge (the same edge that fires the haptic), `.g-nudge-up/-down` on price-direction DATA changes only (market card + UpDown card — never mount, the keyframe's own rule), `.g-settle` on done-check arrivals. Guard: `npm run test:glyph-motion` (26 checks — no bespoke Tailwind animation on/wrapping a glyph, never hover, both clamped M6 branches per primitive, adoption floor per family), RED-verified against all three violation shapes. Static glyphs stay static — M5 governs motion, it does not demand it.
- [ ] DA-3 **E-112** — the five Up & Down stake chips render **26px** against the platform's own **40px** money-control floor, and they decide how much a player stakes → raise to the 40px floor. *(Overlaps UD-9 / tap-target work — do together.)*
- [ ] DA-4 **E-114** — the refund toast paints a confirmation **tick** over a returned stake → use the `factual` variant (no tick, no gold). *(Same defect family as UD-12 / the LOSS-toast fix — do together.)*
- [ ] DA-5 **E-115 · the money atom** — ⛔ crosses into `src/lib/server/`; needs **ledger verification + a fresh money census**. Gate under Session A money rules; full `test:all` before push. Overlaps `.gilt-ink` (DA-7).
- [x] DA-6 **ATOM J** — fold M1–M8 into `DESIGN_AUTHORITY.md`, then delete `EXTEND.md` and the merged `material.css` sections. ⚠️ **M6's text must land saying THREE gates — the delivery's wording says two; fix to three.** — DONE 2026-08-07: `DESIGN_AUTHORITY.md` gains **§M (M1–M8)** in the authority's voice, stating the law AS SHIPPED (measured gold ×1.2011/E-124, 24% wash cap/E-130, rung-independent `.mat-tint-*`, E-129 focus outline, `.g-ring` on `--m-glide`); **M6 names THREE gates** (prefers-reduced-motion clamp incl. delay/E-126 · `html.kp-reduce-motion` mirror · `[data-motion="reduced"]` low-end-Android throttle/E-125). `EXTEND.md` `git rm`'d; the stale "out for commission" banner in the authority replaced with the delivered/merged record; every current-law pointer to EXTEND.md re-aimed at §M (two gate headers, glyph-swap, glyph-motion gate, 11-material README + material.css header, NEXT-SESSION table). `material.css`'s §A/§B/§C were already deleted at merge (sessions 34–35); §D stays — its migration map is NOT finished, per its own rule.
- [ ] DA-7 **`.gilt-ink`** — money amounts as struck type; needs the celebration/payout surfaces, which overlap DA-5 (E-115) — sequence after/with it.

**Filed cleanups (not yet swept):**
- [x] DA-8 **E-128** — remove five dead `win-*` classes. ⛔ **Do NOT remove `badge-seal-rays` — it is reused by `.seal-sheen`.** — `.win-card-rare`/`.win-seal`/`.win-aura-anim`(+keyframe) deleted (`.win-card`/`.win-trophy-halo` had gone in ATOM B); badge-seal-rays kept; keyframe-registry REUSED pin updated.
- [x] DA-9 **E-132** — `--bg-elevated2` is at 26%, above the 24% ink cap; it is superseded by rung 2 → drop/retune to the cap. — token RETIRED: toast now rung 4; avatar button + landing icon plate take `--wash-float`; tailwind alias removed; contrast corpus updated.
- [ ] DA-10 **`share-button.tsx`** — hand-rolled overlay → migrate to the kit `<Modal>`. *(Same as DS-25 — one fix.)*

**⚠️ NEEDS ALI — no atom can decide these (park until answered; see §9):**
- [ ] DA-Q Design-system README **Q5–Q8**: (Q5) the Gold asset-icon tint vs the "gold = earned money only" rule; (Q6) the 360px card title — ellipsis or 2-line clamp (Swahili runs ~35% longer); (Q7) real Gold/Silver artwork; (Q8) the Up & Down top-nav treatment.
- [ ] DA-P The kit `<Modal>`'s rendered photograph for the design record — needs an OPEN market on the board to capture (Chrome extension + login).

---

## 7 · Definition of done + MANDATORY cleanup (Ali: remove every stale doc at the end)

The project is DONE only when every box in §5 and §6 is `[x]` or `[S]`, all `test:*` suites +
`qa:live` are green, prod is live-driven clean, **and the cleanup checklist below is executed.**

**Ali's instruction:** once everything is implemented and 100% valid, delete every working/stale doc
this effort produced (and any older stale doc it obsoletes), keeping only the permanent record.

### 7a · Fold the durable lessons in FIRST (one fact, one home — CLAUDE.md rule)
Before deleting anything, migrate each *rule* a finding revealed into the doc that OWNS the subject,
as ONE line — never a copy of the report:
- "A failed read never renders as zero/empty/404" → the data-layer / standards doc.
- "Phase & time derive from instants + server clock, never a stale prop" → `DESIGN_AUTHORITY.md` or the updown window doc.
- "Player-facing errors resolve through the i18n dictionary by code" → the standards skill.
- "Consequential mutation → OperationResultModal; failures persist" → already in CLAUDE.md; confirm it still reads true.
- Any new guard/test added → note it where the other test guards are listed.

### 7b · Final cleanup checklist (run in the LAST commit, after 7a)
- [ ] `MASTER-PLAN.md` — **KEEP** permanently. Add a top banner: `STATUS: COMPLETE — <date>`. Its ticked trackers ARE the record of what shipped.
- [ ] `SESSION-A-EDIT-SPECS.md` — **DELETE** (`git rm`) — fully consumed.
- [ ] `UPDOWN-UX-AUDIT-HANDOVER.md` — **DELETE** after 7a.
- [ ] `PLATFORM-UX-AUDIT-HANDOVER.md` — **DELETE** after 7a.
- [ ] `SESSION-PROMPTS.md` — **DELETE**.
- [ ] `updown-handover-brief.html` — **DELETE**.
- [ ] `platform-handover-brief.html` — **DELETE**.
- [ ] Scan `docs/` for docs THIS work made stale/duplicative (e.g. anything that now restates a rule folded in at 7a, or pointers to files that no longer exist). List them in the final commit message; delete the clearly-dead ones, and for anything ambiguous leave a one-line note for Ali rather than guessing.
- [ ] Commit message: `UX audit 2026-08: complete — lessons folded to owning docs, working reports removed` + the stale-doc list.

**Rule:** do NOT delete anything while any §5/§6 item is still open — a half-done project needs its
full reports. Deletion is a single closing commit, `git rm` (the machine can hard-delete via git in
Claude Code; the cloud device-bridge cannot, so cleanup belongs to the implementing session, not here).

---

## 8 · File map

```
F:\kipindi-main\docs\ux-audit-2026-08\
├── MASTER-PLAN.md                     ← THIS FILE — read first, update every session
├── SESSION-A-EDIT-SPECS.md            ← turnkey before→after edits for Session A (verified at HEAD)
├── UPDOWN-UX-AUDIT-HANDOVER.md        ← Report 1 (Up & Down, UD-1…22)
├── PLATFORM-UX-AUDIT-HANDOVER.md      ← Report 2 (platform, B-1…29 + V-1…7)
├── SESSION-PROMPTS.md                 ← copy-paste kickoff prompt per session
├── updown-handover-brief.html         ← visual summary of Report 1
└── platform-handover-brief.html       ← visual summary of Report 2
```

---

## 9 · OPEN DECISIONS — needs Ali (park work here until answered)

Carried from the design-system README + the design session. No implementation atom can decide these;
the session should surface them to Ali and continue with everything else meanwhile.

- **Q5** Gold asset-icon tint vs the "gold = earned money only" rule — is the gold ring on the Gold asset allowed as identity, or must it change?
- **Q6** 360px card title in Swahili/Chinese (~35% longer) — ellipsis or 2-line clamp? (This also settles UD card + market-card behaviour.)
- **Q7** Real Gold / Silver artwork — supply assets, or keep the lettermark chips?
- **Q8** Up & Down top-nav treatment — final placement/style.
- **DA-P** The kit `<Modal>` rendered photograph for the design record needs an OPEN market live on the board at capture time.

> When Ali answers, record the decision here (one line each) and unblock DA-Q / the affected atoms.
