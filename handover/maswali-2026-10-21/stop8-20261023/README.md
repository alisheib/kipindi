# ⏹ STOP 8 — 2026-10-23 ~13:00 UTC (OMEGA-COMPILE01, the Claude session asheib-f3; Ali: "tokens will end soon, make sure you push progress")

Say **"continue maswali"** in a new session. Read THIS file first, then `docs/MASWALI-PLAN.md` §0 on `main`.

## Production (main) — LIVE and read back
- `main` **`07a400bc3`** (09:00 UTC): S5 round 2 — the classic phone rail draws **Millionea's track in Live's place**
  (Markets · Up & Down · Deposit · Millionea · More; Live leads More), the landing's door row (the Live link; "Be this
  week's winner?" while a week sells), REGISTER + PLATFORM round 2. Read back: dpl on 3 hosts (760 s), chunks-prod 6/6 ×2,
  production qa:live 358/0; the served phone rail checked in the HTML (sw: Masoko · Juu na Chini · Amana · Millionea · Zaidi).
- Under it, `ac9fd7c21` (08:09 UTC): **Next.js 16.4.0 → 16.4.2** — critical GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, high
  GHSA-p3m5-59mp-jv5r (Ali: "patch it first"); read back green (production qa:live 357/0).
- **Millionea is ACTIVE** (Railway variable since 2026-10-22 23:32 UTC). Nothing sells until a week opens.
- CI on main fails only test:needle-rest 55/35 — the same 35 cases since U43's 7e3a06ea0 (not Maswali's).

## In flight (each pushed; each lane writes "what is left" in its last commit body) — push ORDER
1. **UDDOT** `claude/maswali-ud-dot` (e5c5e09bf+): Ali's ruling 2026-10-23 — Up & Down's golden "product-line" dot and
   its accent ink removed from the phone rail and the desktop bar (every nav tab alike; Millionea keeps its gold diamond and
   coloured name). Guard test:nav-tabs-alike 17/0 (+ red 10/10); gates were green (tsc, build, qa:live 379/391, rail drawn
   221/0, 108 desktop tiles + 81 rail tiles read); owed at the stop: rail dark, the two DB readers, parity vs
   `parity-main-07a400bc3.json`, the reds, CI 39931479459.
2. **LICBASIS** `claude/maswali-licence-basis` (82d49d05b+): Ali's ruling 2026-10-23 — GBT confirmed nothing written is
   needed; with nothing recorded, Millionea's licence basis is the platform's GBT licence (the footer's licence number)
   under his ruling, so weeks open with no Owner click; a recorded basis (incl. None) always wins; no number → no default.
   Suite test:maswali-licence-gate (memory 66/0; + red 5/5). Owed: its PG half, engine/void, browser look, build, qa:live,
   CI. → Merge UDDOT + LICBASIS into one release branch (COMPLIANCE-DECISIONS: keep BOTH new 2026-10-23 entries), gate the
   merged head (tsc, build, qa:live ×2, both lanes' suites, CI), push under `F:/kipindi-locks/main-push.lock`, read back.
3. **S7 + S6 as ONE release** — `claude/maswali-s6-release` (S6-SHIP; ad0e8b999+) merges S7's final head
   (`claude/maswali-s7-s5`, S7-SHIP; ca750cd32+), GUIDE's guide, FLOW's fixes and main (after step 2). ⛔ DEADLINE: the
   Millionea rules page + Terms live before any week OPENS (earliest Monday 2026-10-26 00:00 EAT = Sunday 21:00 UTC).
   - S7-SHIP: migration proof green; parity 0 differing cells; CI fixes done; the final reds at ca750cd32 running in
     its red trees (C:/50pick-ssd/maswali-s7-red-20261023, -red2-; KP 5493/5490).
   - S6-SHIP: migration proof main → S7 → S6 green (114 migrations; verify:backup-schema 16/0); the production SmsMessage
     count done (Ali's pre-approved read: 3,102 rows, 1.8 MB — the index builds in ms); the claims lint judges ONLY
     Millionea-tagged campaigns (the lead's ruling 2026-10-23); five console texts fixed; the DB battery was running
     (maswali-evidence 7.3 PG suspected flaky — re-run alone, scope the spy if timing). The approved final-gate plan:
     exact-head gates (tsc, build + first-load, CI, qa:live ×2, the legal drive, door census, admin shots/drive, migration
     proof, money e2e) + the delta's suites (deposit-gate-return, payment-background + reds for FLOW's MB-57).
   - FLOW `claude/maswali-flow-fixes` (4ca6b20b9+): Ali's final end-to-end evaluation (redirects, warnings,
     notifications, rendering, placement). Fixed: the void-deadline alert (seal if the source gave the result; void only
     otherwise), the chip "past its void deadline". Recorded: QL.1 (no competition/event field → the 4-per-competition
     and one-per-event limits are not enforced; for Ali's list). In progress: MB-57 — after a low-balance deposit from the
     slip, return to the slip with every pick intact.
   - GUIDE `claude/maswali-s6-guide` (81bc89c42+): the admin guide — Ali's rework in progress (the general rules as
     bullets first; no unneeded words or titles; screenshots of the key screens from a LOCAL dev server). The final PDF
     goes to `C:\Users\asheib\Desktop\Millionea admin guide.pdf` on OMEGA (the current version is there).
4. Then S5's last polish: HUB `claude/maswali-s5-r2-hub` (536b66535, last commit WIP) and R3-FIX `claude/maswali-s5-r3-fix`.

## Ali's rulings of 2026-10-23 (recorded or being recorded in COMPLIANCE-DECISIONS by their lanes)
Next.js patch first · the phone rail order (Markets · Up & Down · Deposit · Millionea · More) · remove Up & Down's dot ·
the licence basis = the GBT licence by his ruling (GBT needs nothing written; they monitor the live site) · all admins
seal (the 9 ADMIN accounts pass every grant) · the guarantee is paid in later by his admin (the PDF has the steps) ·
the guide's rework · the final end-to-end evaluation before ending.

## Ali's list (still his)
The guarantee pay-in (an admin: Pools → Owner card → Guarantee → 2,000,000 + bank reference → Pay in → FUND GUARANTEE) ·
rotate the Railway workspace token pasted on ALI-BLADE15 on 2026-10-22 · QL.1 (question limits need two new fields).

## Clean-up done (2026-10-23)
115 remote branches archived in `F:\kipindi-archive\maswali-branches-20261023.bundle` (verified, complete history) and
deleted (135 → 22 on origin); 31 stale local branches deleted (each proven contained); 14 stale worktrees removed;
C:\50pick-ssd\tmp 29 GB → 1.6 GB. Kept trees: maswali-coord-20261019, kipindi-mln-gate, kipindi-mln-par, kipindi-mln-int
(S6), maswali-s7-integrate-20261019 (S7) and the lane trees (kipindi-mln-dot, -lic, -flow, -guide, the S7 red trees).
⚠️ TOOLING: `npm install` prunes the --no-save embedded-postgres (+ its dependency async-exit-hook): restore both from
`maswali-coord-20261019/node_modules` after any install, or db-scratch exits 2.

## Files here
`LANE-COMMON.md`, `briefs/` (today's six briefs), `tools/` (the gate and parity jobs, the cell check, contact sheets, the
one SmsMessage count script). The previous stops: `../stop6-20261022/README.md` (STOP 7 top block), `../stop5-20261022/`.
