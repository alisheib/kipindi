# 50pick — UX Audit Implementation Master Plan (LIVING DOCUMENT)

> **This is the single source of truth for the 2026-08-07 UX-audit implementation.**
> Any session — mine or another — reads THIS file first, works the next open item,
> updates the status marks in this file in the same commit, then commits + pushes.
> Do not start work without reading the "PICK UP HERE" block directly below.

**Owner:** Ali · **Created:** 2026-08-07 · **Location:** `docs/ux-audit-2026-08/MASTER-PLAN.md`

---

## ▶ PICK UP HERE  (update this block every session)

- **Overall status:** IMPLEMENTING — Session A COMPLETE (7/7); core design set landed (toast rung 4, DA-8, DA-9, DS-2, DS-3, DS-4); Session B (Up & Down stabilization) UNDER WAY in the cloud session.
- **Active session:** ⚠️ OWNERSHIP RETURNED TO THE CLOUD SESSION 2026-08-07: the local session on F:\ imported the bundle, pushed through DS-3 and STOPPED COMPLETELY (Ali confirmed). The cloud session (claude-fable-5, working a clone of `origin/main`; the F:\ tree is idle — do not edit there) owns everything again — money, Up & Down, platform, all design work. ⚠️ Its mission text claimed "UD-1…7 shipped" — verified FALSE against HEAD `862fefcc` (no balance pre-flight in the hook, no RoundActionPanel, no udErr* keys, `/updown` still in the action revalidate list, no in-flight map); only the sticky-toast kit support (UD-3's kit half) landed via DS-1. Session B therefore runs ALL FOUR stages here.
- **Next action:** Session B stages 1→4 + E-63 seal; then the live QA sweep + visual pass; DA-2/DA-6 after.
- **Blocked on:** nothing. Only the §9 items need Ali; they are parked, work continues.
- **Environment note:** tests MUST run under Node 24 (`/opt/node24` in the cloud session). Under Node 22, tsx dual-instantiates modules and the seam-patching suites (late-bet, settlement-gate) fail falsely. Cloud sandbox extras: Google Fonts is blocked, so `next build` fails locally — verify CSS atoms on production via `npm run qa:bundle-css -- --live` after the deploy; `qa:live` runs with `QA_OFFLINE=1`; the local qa:live board has no live card on a fresh store, so "at least one bettable market exists" fails there — verified identical at clean HEAD, not a regression signal.
- **Pre-existing red suites:** ✅ **`test:updown-push` and `test:updown-admin-options` FIXED 2026-08-07 (Session B session)** — all three failures were stale/broken GUARDS over correct product code: push §2's gate check matched `\n      }\n` literally (vacuously green on CRLF, false-red on LF — the same commit judged opposite ways per machine; now brace-matched and CRLF-normalized, + a new `gate-loses-its-else` red mutation, `red:updown-push` 5/5); admin-options 6.11 pinned a superseded layout's literals (now pins the RATIO band-span > stake-span) and 7.4 pinned the pre-E-110 one-axis gate call (now requires both measured+movement axes); 3 stale `red:updown-admin-options` anchors refreshed, 9/9. Still red at baseline: `test:kyc-doc-metadata` (1 fail), `test:orphans` (sessions 29–35 left unwired live-QA scripts) — sweep/cleanup phases. `test:trilingual` is flaky (random poll fixture; passes on re-run). `test:prisma-delegate` needs the Prisma engine binary — unavailable in the cloud sandbox (blocked CDN), fine on Ali's machine.
- **Last updated by:** cloud implementation session (claude-fable-5), 2026-08-07 — red-suite repairs above; tsc error count identical before/after (48, all from the sandbox's engine-less Prisma client — green on Ali's machine).

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
- **Session B (Up & Down):** 4 / 22 findings done (Stage 1 complete; the tracker's earlier '1' was UD-3's kit half via DS-1, now absorbed)
- **Session C (platform front-end):** 0 / ~17 findings done
- **Visual set (design):** 1 / 7 done
- **DS · design-consistency sweep (toasts/popups/modals):** 4 / 27 done
- **DA · design-system atoms (carried over from design session):** 3 / 12 done (2 need Ali)
- **TOTAL:** 19 / ~92 done

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
- [x] UD-2 phase-aware round stake panel (lock race) — `RoundActionPanel` derives open↔locked from `roundPhase` + `useServerNow` (the board card's exact rule); page routes BOTH states through it; hook refuses `place()` past the lock on every surface (the final-second belt); adoption pinned by `test:updown-window` §7b.
- [x] UD-1 balance + lock pre-flight in `useUpDownQuickBet` — `walletBalance` threaded through `getBoard`/`getRoundDetail` (null = unknown, NEVER zero); doomed taps prevented (no optimistic flash, no request), buttons disabled + inline reason + Deposit route; factual register.
- [x] UD-4 error-code → i18n map (udErr* keys) — `updown-bet-errors.ts`, EN/SW/ZH keys added; server string demoted to no-code fallback only; RG daily-loss classified to the modal via its stable phrase (code is INVALID — see §9 note for Ali). `test:updown-quickbet` §29.
- [x] UD-3 sticky failure toast + compliance blocked-modal — server refusals now `danger` + `durationMs:0` (kit support landed in DS-1); SUSPENDED/RG → `UpDownBetBlockedModal` on `OperationResultModal` (danger, no gold, stays until dismissed); SELECTION_CLOSED flips the surface locked instantly. `test:updown-bet-feedback` 3.4 restated.

**Stage 2 (P1 freshness):**
- [ ] UD-5 round-page + wallet pill refresh after bet
- [ ] UD-6 one board refresh per tap burst (remove `/updown` from action revalidate)
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
- [ ] DA-2 **The 178 glyphs (M5)** — four glyph primitives exist, zero glyphs use them yet; migrate all 178 onto the primitives.
- [ ] DA-3 **E-112** — the five Up & Down stake chips render **26px** against the platform's own **40px** money-control floor, and they decide how much a player stakes → raise to the 40px floor. *(Overlaps UD-9 / tap-target work — do together.)*
- [ ] DA-4 **E-114** — the refund toast paints a confirmation **tick** over a returned stake → use the `factual` variant (no tick, no gold). *(Same defect family as UD-12 / the LOSS-toast fix — do together.)*
- [ ] DA-5 **E-115 · the money atom** — ⛔ crosses into `src/lib/server/`; needs **ledger verification + a fresh money census**. Gate under Session A money rules; full `test:all` before push. Overlaps `.gilt-ink` (DA-7).
- [ ] DA-6 **ATOM J** — fold M1–M8 into `DESIGN_AUTHORITY.md`, then delete `EXTEND.md` and the merged `material.css` sections. ⚠️ **M6's text must land saying THREE gates — the delivery's wording says two; fix to three.**
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

- **UD-4 note (2026-08-07):** the RG daily-loss refusal returns `code: "INVALID"` (same as a bounds error), so the client routes it to the acknowledge-modal by matching the refusal's stable phrase. A dedicated `RG_LIMIT` code in `buyPosition` would be cleaner — but that file is under the money-guardrail, so it is Ali's call, not this session's.

> When Ali answers, record the decision here (one line each) and unblock DA-Q / the affected atoms.
