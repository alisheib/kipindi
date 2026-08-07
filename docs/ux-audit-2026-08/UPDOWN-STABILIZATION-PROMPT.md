# ▶ COPY-PASTE KICKOFF — Up & Down full stabilization session (Ali, 2026-08-07)

Copy everything between the lines into a NEW session started FROM the `alisheib/kipindi`
repo source (so it can push). Prerequisite: the 10-commit stack `bc10b28a…ff0e2a4a` is on
`origin/main` (Ali pushes it; if it is not there yet, STOP and ask Ali).

---

You are the SOLE implementation session on kipindi (50pick), dedicated entirely to making
the **Up & Down game perfectly safe and perfectly functional** — every technical bug, every
visual bug, found and fixed. Real players bet real money on it; treat every gap as a
money-trust defect.

READ FIRST, IN ORDER: `CLAUDE.md` → the `50pick-standards`, `50pick-audit` and `railway`
skills → `docs/ux-audit-2026-08/MASTER-PLAN.md` ("PICK UP HERE" + the Session B tracker;
Stages 1–2 are DONE — UD-1…7 shipped 2026-08-07, re-verify file:line against HEAD before
editing anything they touched) → `docs/ux-audit-2026-08/UPDOWN-UX-AUDIT-HANDOVER.md`
(findings UD-8…UD-22 + §5 matrix + §6 guardrails) → `docs/LIVE-QA-CAMPAIGN.md` topmost
resume block (open E-findings).

THE MISSION, in priority order — one item at a time, test → commit → push each:

1. **The money-affecting feed defect — E-63.** SOL 5m voids ~99% of rounds as
   `source-failed` while CONFIRMED open observations sit in the DB; root cause is located
   at the round-open path (`openPrice` never stamped from the observation at `opensAt`;
   close path works). Fix it, prove it against the ledger and live rounds on all four
   assets (BTC/ETH/SOL/XAU via the real Twelve Data key on production), and add a guard
   test. Also read E-74 (quote timestamps rounded UP) before touching staleness logic.
2. **The two red Up & Down suites** the plan documents: `test:updown-push` (§2
   suppression-gate else-branch) and `test:updown-admin-options` (2 fails) — fix to green.
3. **Session B Stage 3** (UD-8 gold-Confirm spinner · UD-9 in-flight signal — do **DA-3**,
   the 26px→40px stake chips/E-112, together with it via the `--h-control-*` tokens ·
   UD-10 NavProgress guards · UD-13 tab switch keeps board · UD-14 skeleton geometry ·
   UD-15 `error.tsx` ×3 + stop swallowing · UD-16 controls nav-dead-zone).
4. **Session B Stage 4** (UD-11 · UD-12 + **DA-4**/E-114 refund-toast `factual` · UD-17
   — ask Ali a/b first · UD-18 · UD-19 · UD-20 · UD-21 · UD-22).
5. **Full live QA sweep — BOTH sides of the game (Ali, 2026-08-07: "full from admin side
   and player side").**
   · **Player side:** board + round + history + positions/wallet touchpoints, driven on
     production as a real player (small real TZS where the test bootstrap allows), every
     state (open/locked/confirming/resolved/void/refund), SSE, pollers, deep links,
     sign-in round-trips.
   · **Admin side:** the whole Up & Down console — assets, chains, durations, pause/
     resume, proposals, resolver/observation views, per-asset feed health panel, manual
     re-checks, void/refund handling, audit trail. Every control does what its label
     says, every figure is real (A-5), every action lands in the audit log.
   · **CALCULATIONS verified end-to-end:** open/close/targets, movePct, the implied
     multipliers vs `updown-pricing`, `myExactPayout` vs actual settlement payout,
     refunds, fees vs the frozen snapshot, pool == Σ stakes — proven against the LEDGER
     and the settlement proof, never against a screenshot. (Verify only — the pricing/
     payout modules themselves stay untouched per the guardrails.)
   · AI paths: resolution/oracle, poll generation where it feeds Up & Down.
6. **Full visual + responsiveness + theme-consistency pass**: 360/768/1280 (and 1920
   where the matrix names it) × EN/SW/ZH, player AND admin surfaces, with screenshots
   (Playwright locally; `qa:sweep`/`qa:material-probe` patterns). Fix every visual bug —
   overflow, clipped copy (SW runs ~35% longer), broken states, contrast, reduced-motion,
   tap targets. Everything must read as ONE system in the theme kit: kit primitives only,
   rungs/tints per DESIGN_AUTHORITY §M, no hand-rolled panels; design is frozen
   (`test:design-frozen`).

⭐ **UNRELATED BUGS: fix as you go (Ali's standing instruction).** Any visual or technical
defect you meet on the way — even outside Up & Down — gets fixed in its own small commit
(or filed in the plan with one line if it is genuinely large/money-path), never silently
passed by. Same bar: test, doc update, commit, push.

RULES (non-negotiable): the §6 guardrails of the handover (repeat taps = repeat bets;
4-channel bet feedback; in-app-only results; pricing/refund modules and `buyPosition`
untouched — for E-63 the fix is in the round-open/observation path under `updown-service`,
NOT in bet money math; if you believe money code must change, stop and ask Ali). Tests must
run under Node 24. Every push deploys live — verify on production after each. Full
`npm run test:all` before any push that grazes a money file; `qa:live` per item; update
`MASTER-PLAN.md` (tick + counters + PICK UP HERE) in the SAME commit as the code. Trilingual
copy, no emoji, gold budget. All docs stay current as you go.

DONE = every Session B box + DA-3/DA-4 ticked, all `test:updown-*` suites green, E-63 fixed
and measured decisive-rate healthy on all four assets, the visual pass recorded with
screenshots, and Ali told — in plain language — what changed and what he should see in the
game.

---
