# STOP 5 — 2026-10-22 ~15:05 UTC (OMEGA-COMPILE01, the Claude session asheib-f3)

Ali: "I'll continue from another machine" — the session's tokens ran out. Say **"continue maswali"** in a new session; it
reads `docs/MASWALI-PLAN.md` §0 on branch **`claude/maswali-s5-release`** (head `a0e2e1bd8`, the ⏹ STOP 5 block) first.

## 1 · Finish first: the S5 dark push (Ali chose "the checked parts now"; pre-approved)
- Production still serves `main` `da3d32180`. Nothing of S5–S8 is live.
- The release head `a0e2e1bd8` = `b120fcbe0` (S5 + FACTS2 + the language-change loader's green/red fix) + three green red
  fixes (r7c 1.4, r5h 3.5, ui-consistency).
- Printed at `b120fcbe0`: tsc 0; e2e:maswali-money 3/0 (`lead/summary.txt`, `lead/money-summary.txt`).
- Re-run the whole gate at the head: `tools/job-s5-gate.sh` (tsc, `next build`, the dark checks = qa:live + the player
  drive's WITHDRAWN step + door-dark on WITHDRAWN and STAFF_PREVIEW, classic parity against main's frozen baseline
  `parity-v5-bfa0b7d57.json`), `tools/job-s5-money2.sh` + `tools/s5-money-inner.sh` (e2e:money/fault/card on a reset
  scratch PostgreSQL), e2e:maswali-fault, and CI (`gh workflow run CI --ref claude/maswali-s5-release`; compare failing
  CASES with main's run 39625785032 — main fails r5a 8.13, r5j 1.1, r6c 2.3, r7c 2.1/2.5/3.9, dead-css 1.1, rate-copy).
  The tools carry OMEGA's paths ($S/$F); on another machine adapt the paths, keep the steps. ⚠️ `next start` refuses to
  run without DATABASE_URL by design — the local qa:live runs on the in-memory dev server.
- Then: `main-push.lock`, push the release to `main` (fast-forward), Railway deployment check, AGENTS §4 read-back,
  `FEATURE_MILLIONEA=STAFF_PREVIEW`, one QA staff + one QA player sign-in. Record it in §0.

## 2 · Then continue (order in MASWALI-PLAN §0 "Next")
- **S5 round 2:** HUB, REGISTER, PLATFORM (rail swap `748003c0d`), TICKETS' landing door (`d75b56704`, done) → merge →
  integrated render (`briefs/RENDER.md`) → critics to 10/10 (`../critics/COMMON-R2.md`) → next S5 push.
- **S7:** `claude/maswali-s7-s5` + OB `claude/maswali-s7-ob` (`1c8b42284`, done; `lead/mr16-as-built.md` goes into §3).
- **S6:** integrator `claude/maswali-s6-release`; lanes `claude/maswali-s6-{notices,lint,money,docs,admin}` (briefs in
  `briefs/S6-*.md`; each pushed its state with "what is left" in its last commit). S6-MONEY `7823a9685` and S6-NOTICES
  `6499c7c88` are WIP (not verified) — do not merge them as final.
- **S8:** Ali's list (`lead/ali-list.md`).

## 3 · Files here
`LANE-COMMON.md` (rules every lane follows), `briefs/` (every lane brief), `lead/NOTES.md` (the lead's full log: rulings,
§M8a numbers 19–29, merges, lane states), `lead/agents.md`, `lead/ali-list.md`, `lead/mr16-as-built.md`, `tools/`.
The admin guide's DRAFT PDF is on Ali's Desktop on OMEGA (`tools/render-draft.mjs` + `tools/pdf-pages.ps1` made it).
