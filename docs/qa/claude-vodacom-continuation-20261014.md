# 50pick Vodacom continuation — Claude Code handoff

Prepared 2026-10-14. This is a continuation of the existing Vodacom plan, not a new project. Product name: **50pick**; repository: **https://github.com/alisheib/kipindi** (legacy directory names contain kipindi). Ali authorizes continued visual/logic/animation fixes, parallel isolated work, recoverable GitHub checkpoints and verified LIVE releases. Keep the journey **STAFF_PREVIEW** until its actual S15 gates are satisfied. A saved LIVE checkpoint does not mean S8 or the whole plan is complete.

**CURRENT CODEX READ (2026-10-15 11:05 UTC; supersedes older status lines below):** `main` is live at
`c8a982cd755553bcc7ba52c018910dc5e85ee637` with the seed-clock and home-hydration repairs. All three hosts
serve that SHA with healthy, migrated DB and `STAFF_PREVIEW`; www/apex chunk gates are 6/6, signed-out production
`qa:live` 352/0, visual 20/20 cells. Exact-tip CI run 38723925475 is still in progress. Ali authorized one
`mobile01` production sign-in on preceding live `50b586d50`; [E3] passed 385/0 including the seven-page signed-in read.
That one attempt is consumed: do not repeat it without fresh explicit authorization. S8 still owes V1's release,
A21 re-measure, parity v4 and the closing battery. The live-fix candidate is next; S9, S10, S11 and later lanes stay on
checkpoint branches. See VODACOM-PLAN §0k for the release evidence and current blockers.

## ⭐ CODEX TAKEOVER (2026-10-15) — read this first; paste the prompt below into the Codex session

From 2026-10-15 the integrator and release owner is a **Codex session** (Ali's choice). The Claude session on
OMEGA-COMPILE01 stops pushing `main`; its helpers finish their lanes on their own branches and push nothing. This block
and the prompt supersede the older sections of this file wherever they disagree (A21 now passes; the admin empty-state
alignment was closed 2026-10-14; S2 is ✅).

```text
You are taking over as the integrator and release owner for the 50pick Vodacom plan (the sponsor's "Simplified Journey").
50pick is a Tanzania-licensed REAL-MONEY pari-mutuel prediction market. Repo: https://github.com/alisheib/kipindi (private).
`main` IS PRODUCTION: every push to main auto-deploys to https://www.50pick.tz (also https://50pick.tz and
https://kipindi-production.up.railway.app). There is no staging. You finalize the development: integrate the lanes, release
each one live with its proof, close S8–S13, and prepare S14–S16 for the owner (Ali). Lead on architecture; ask Ali in plain
English only for decisions that are truly his.

READ FIRST, in order (verify every fact against the repo; docs drift):
CLAUDE.md (mechanics; its status paragraphs are history) → docs/SETUP.md → docs/NEXT-PLAN.md (row ▶ 0c) →
docs/VODACOM-PLAN.md §0 RESUME AT, §1 board, §0k (S8; newest bullet "2026-10-15 Claude continuation (3)") →
docs/qa/claude-vodacom-continuation-20261014.md (its top block — this takeover — wins over older text) → docs/RULES.md (money)
→ docs/DESIGN_AUTHORITY.md (the ONLY design rulebook) → .claude/skills/50pick-audit/SKILL.md, .claude/skills/50pick-standards/SKILL.md,
.claude/skills/railway/SKILL.md → docs/qa/visual-audit-20261015.md (58 visual findings and their owners).

WHERE IT STANDS (updated 2026-10-15 11:05 UTC — check `git log origin/main -8` and VODACOM-PLAN §0 first):
- LIVE: 331048acb (A21 root-:has() fix + house-bots N3) → 6b19de2ec (demo seed) → 50b586d50 (handoff docs) →
  c8a982cd7 (home hydration and the demo-seed guard scanner), deployed and read back.
- S0, S3, S3b, S4, S6 ✅; S2 ✅ 2026-10-15; S1 live (Ali's own "Turn my preview on" press waits until the whole plan is done,
  his 2026-10-02 rule); S7 closed (✅ at S14); S8 OPEN; S9–S13 building; S14–S16 need Ali.
- S8 closes when: (a) lane V1's bet-sheet visual fixes have landed and A21 is re-measured at the release commit on a QUIET
  machine (`npm run qa:bet-sheet-production` ≤150 ms; it read 78/0 at 331048acb); (b) a classic parity compare
  (`scripts/qa-classic-shell-parity.mjs --compare <v4 baseline>`) has every difference explained — 67/67 is expected once
  6b19de2ec is in, plus V1's intended Callout differences, cell by cell; (c) `npm run test:all` WITH the database suites at
  the close tip; (d) [E3] is measured 385/0 under Ali's one-attempt `mobile01` authorization; (e) the close record in
  VODACOM-PLAN §0k and the §1 row; S8's done-when is in §1.

LANES (each branch's last commit says "READY FOR RELEASE (proof…)" or "WIP: …"; all on GitHub as checkpoints):
- seed clock fix — codex/s8-integration @6b19de2ec — proven (test:demo-seed-clock 3/3, red 4/4, 110 suites, tsc 0, build 0)
- live fixes (3) — codex/live-fixes-1014 — question-page auth doors (S10 point 4), Up & Down balance = cash + bonus (S12 F1),
  a round in its lock window stays on the board (S12 F2)
- S9 release candidate — codex/s9-release — CARRIES A MIGRATION (see PRISMA); Ali's 2026-10-14 copy decisions applied
- S10 visitor path — codex/vodacom-s10-build — WP1–WP8a; WP8b needs S9 on main; WP9 is the release
- S11 How to Play + copy — codex/vodacom-s11-build
- S12 consistency — codex/vodacom-s12-w (Swahili words, NDIO, madau, Terms), codex/vodacom-s12-j (@cf8465754) and
  codex/vodacom-s12-j-marker-v2 (@82f283d45, WP10b on top of J; the older j-marker and j-marker-20261015 are superseded) (Juu/Chini
  in the journey's language; J extracts the sheet's LowBlock), codex/vodacom-s12-a
  (admin inks), codex/vodacom-s12-v (the audit's Up & Down/shell items), codex/vodacom-s12-f (message titles), codex/vodacom-s12-wp1
  (parity v5); plan on codex/vodacom-s12-build
- S13 measures panel — codex/vodacom-s13-build
- V1 — codex/visual-v1 — bet sheet clipping/alignment, low-balance rails, sheet titles, kit Callout sm 11px → 13px, .btn-xl
- V2a — codex/visual-v2a — classic board pages (/markets sort + stats at 320, pagers, carousels, chips, home rows, card spacing)
- NOT STARTED: V2b — header/footer/auth/legal/help/404/question page/leaderboard (F03 F04 F07 F08 F09 F13 F19 F21 F22 F23 F24
  F25 F26 F27 F28 F40 F42 F45 F46 F51 F54); kit backlog F38 F39; S7 follow-up F41; F20/F29 ship with the next Terms/Privacy
  version (hash-bound text).
COORDINATION: Claude helpers on OMEGA-COMPILE01 may still be finishing a lane; they commit but never push. Integrate READY
branches first; do not edit a branch whose last commit is a Claude "WIP" younger than 2 hours. Merge, never rebase or force,
shared branches. You are now the ONLY session that pushes main — but another session (house bots) has pushed main before:
`git fetch` and read `git log origin/main` before every push.

RELEASE LAW (every push to main):
1. Per change: its own guard (a test:* script in package.json; test:all auto-discovers it) AND a mutation proof (a red:* twin
   or in-process plants that make the guard fail). Never weaken a guard to pass; change a pinned expectation only when your
   change is the reason, and say so. File-mutating red twins one at a time, clean `git diff` after.
2. Per push: `npm run typecheck` = 0; a production build at the exact commit (`RAILWAY_GIT_COMMIT_SHA=$(git rev-parse HEAD)
   npx next build`, clean src); every suite that reads a changed file green (5 suites need a server on :3000 —
   responsive, motion, revoked-deadend, admin-section-gate, needle-rest — run those on their own server); local
   `npm run qa:live` on a FRESH in-memory dev server (port 3009, no DATABASE_URL, random SESSION_SECRET ≥32 chars,
   OTP_PEPPER ≥16, JOURNEY_PREVIEW_SECRET, DISABLE_ADMIN_TOTP=true) — all pass.
3. Push: stage files BY NAME (never `git add -A`), `git push origin HEAD:main`, never --force.
4. Read back (Railway builds 3–6 min): all three hosts serve `dpl=<full sha>` (`curl -s https://www.50pick.tz/ | grep -o
   'dpl=[0-9a-f]*'`); `/api/health` ok, database reachable and migrated, `simpleJourney` STAFF_PREVIEW; `npm run
   qa:chunks-prod -- --origin https://www.50pick.tz` and `-- --origin https://50pick.tz` both 6/6; `BASE=https://www.50pick.tz
   npm run qa:live` all pass ([E3] prints NOT MEASURED unless authorized); `railway logs -s 50pick` shows a clean boot; look at
   the changed pages live (360 and 1280, en and sw) and read the screenshots.
5. Record in ONE place per fact: VODACOM-PLAN §0/§0k/§1, NEXT-PLAN ▶ 0c (its "N/18 sessions ✅" count is guarded), this
   guide's top block; run the suites that read those docs (test:vodacom-plan, test:docs, test:tracker-hygiene,
   test:integrity, test:design-one-door …); push the docs commit and read it back.
Per session close: test:all with the database suites, classic parity, tiles (screenshots read by eye).

PRISMA / DATABASE:
- Schema prisma/schema.prisma; `npm ci` generates the client (`npx prisma generate` after a schema change). Node 24, npm,
  the lockfile; Next pinned 16.4.0.
- Migrations are hand-written: prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql, idempotent (IF NOT EXISTS),
  additive where possible. Never `prisma migrate dev` (interactive; its shadow diff trips on known drift).
- Test on a disposable local PostgreSQL first (OMEGA-COMPILE01: F:\pg-loadtest on port 5433, scripts/load/README.md —
  three gates refuse production): `npx prisma migrate deploy`, then the PG battery (`e2e:money`, the DB suites).
- MANDATORY with any migration: `npm run verify:backup-schema` (KP_SCRATCH_PORT=5443 if 5433 is busy). The backup's DDL is
  generated from the live DB; a migration once broke three nights of backups (docs/BACKUP-RUNBOOK.md "THE THREE NIGHTS").
- Production gets migrations ONLY through the deploy (`start` = `prisma migrate deploy && next start`). Never hand-run SQL
  against production.
- Read-only production DB checks (e.g. `npm run qa:short-title-fit`) take PROD_DATABASE_PUBLIC_URL from the environment or
  `.env.qa.local` at the checkout root (on OMEGA-COMPILE01: F:\kipindi-main\.env.qa.local); they prove the session read-only
  first. Pass it only into the process environment; never print it.

RAILWAY: account alisheib07@gmail.com; project 50pick (5e87353c-1d59-433d-a683-a32b9149f74c), environment production,
service 50pick (baba8802-7f79-4306-9706-1e19a4b95e7c). Verify `railway whoami` / `railway status` first (this PC also had
another account). `railway logs -s 50pick` for boot logs. The production DB host (postgres.railway.internal) is reachable
only inside Railway (`railway run --service 50pick -- <cmd>`). Environment variables are Ali's decisions.

MACHINE (if you run on OMEGA-COMPILE01 — Windows, i7-8700 6c/12t, 32 GB): F: is a slow HDD; work in SSD worktrees under
C:\50pick-ssd (TEMP/TMP=C:\50pick-ssd\tmp); F:\kipindi-main is the long-lived checkout. RAM, not CPU, is the limit (3–5 GB
free with nine lanes) — add work as lanes finish. `.next/dev/node_modules` holds JUNCTIONS into node_modules: never
recursive-delete a .next without first removing them (PowerShell `[System.IO.Directory]::Delete(path, $false)` on each
reparse point). A stale dev cache answers "HMR hash mismatch" and crashes qa:live: clear .next/dev and restart. Files are
CRLF in worktrees (autocrlf), LF in git. `next dev` writes an untracked AGENTS.md — never commit it. A21's fixture: a clean
exact-commit production build, then `npm run qa:bet-sheet-prod-serve` (127.0.0.1:3044; env KP_QA_MEMORY_BOOTSTRAP=
bet-sheet-local-production, NODE_ENV=production, random SESSION_SECRET/JOURNEY_PREVIEW_SECRET/OTP_PEPPER, and NO
DATABASE_URL, RAILWAY_GIT_COMMIT_SHA or NEXT_DEPLOYMENT_ID at serve time), then `QA_CHROMIUM_PATH=<Chrome for Testing 147>
npm run qa:bet-sheet-production` from the same worktree — only on a quiet machine. Elsewhere: clone, `npm ci`, and choose
your own scratch directory.

SAFETY (non-negotiable): never print or commit credentials (.env.qa.local, .env.local, Railway, Selcom, Blackball, Postmark).
Never create or delete production accounts. [E3] — S8's signed-in production read — passed once on `50b586d50` with
Ali's explicit authorization: `QA_SIGNED_IN=mobile01 BASE=https://www.50pick.tz npm run qa:live`, 385/0. A second
sign-in needs a NEW explicit authorization; the first attempt ended any other `mobile01` session. No money moves on production
except Ali's S14 journey. Money rules live in docs/RULES.md; a money path never changes without test:money-invariants,
test:fee-model, test:withdrawal and e2e:money on PostgreSQL. Never fabricate data, prices, approvals, signatures or elapsed
observation time; never waive a failed check — explain it with evidence or fix its cause. Keep the journey at STAFF_PREVIEW
until S15's gates.

OWNER RULES IN FORCE: "responsiveness and UI consistency is a rule" (every change at 320/360/390/768/1280/1920 × en/sw/zh,
built from the kit, the same thing never done two ways — 2026-10-15); "push live each progress"; "perfect spacing, margins,
fonts"; parallelise as the machine allows; the 2026-10-14 answers in docs/COMPLIANCE-DECISIONS.md (top entries).

OWNER (Ali) ITEMS: S14 — a real TZS 1,000 journey on production with a staff account, and the agency's sign-off or
his override; S15 — the go (the flip); S16 — at least 7 real days after launch (no shortening).

ORDER OF WORK: (1) The live fixes. (2) V1 → S8's close (A21 re-measure on a quiet
machine, parity, battery, record). (3) S9 (merge main; battery with the DB suites; verify:backup-schema; release).
(4) S10 (WP8b after S9), S11, S12 (W, J, A, V, F, WP1), S13 — each its own release with its proof. (5) V2a, V2b, the kit
backlog, F41. (6) Prepare S14 for Ali (the checklist, the preview press, the TZS 1,000 journey) and S15's readiness; S16 waits
for the calendar.
```

## UPDATE 2026-10-15 ~08:15 UTC (Claude, OMEGA-COMPILE01)

- **LIVE is `331048acb7d0c585601c399f68bcf771b0b82a10`** (main `3769e3c3d..331048acb`): A21's root-`:has()` fix merged
  with main's house-bots N3. Read back: all three hosts serve the exact `dpl` from 07:21:23 UTC, health ok, DB migrated,
  STAFF_PREVIEW; `qa:chunks-prod` 6/6 on both public hosts; production `qa:live` 352/0 signed out ([E3] NOT MEASURED).
  **A21 PASSES** at the exact commit on a quiet machine (`qa:bet-sheet-production` 78/0; heading frames 81–112 ms vs
  150). **Exact-tip CI passes** (run 38697728924). Record: VODACOM-PLAN §0k, "2026-10-15 Claude continuation (3)".
- **S2 is ✅** (VODACOM-PLAN §0d's close record): Ali signed in to /admin himself; Claude reviewed and approved all 40
  drafted short titles; `qa:short-title-fit` (read-only, production) clean.
- **Next, in order:** (1) [E3] — Ali signs in as a regular player in the app's browser pane; the coordinator reads the
  seven pages only. (2) The demo seed's single clock read with its own guard, then a classic parity compare that must
  read 67/67 (at `331048acb` it read 66/67: the one failure is the seed's per-row clock, measured — §0k). (3) S8's closing
  battery and close record. (4) Land, each as its own release: the live fixes (`codex/live-fixes-1014`), S9
  (`codex/s9-release`, a migration: `verify:backup-schema` first), visual lane V1 (`codex/visual-v1`), then S10–S13.
- **Machine note:** the limit on OMEGA-COMPILE01 is RAM (32 GB, ~3.5 GB free with nine lanes), not CPU — add a lane only
  when one finishes. `F:\kipindi-main\.env.qa.local` holds the production read-only database URL the `qa:*` read scripts
  use (pass it into the process environment only; never print it); it also holds QA passwords, which this session does
  not use — signing in on production is Ali's.

## UPDATE 2026-10-14 ~12:30 UTC (Claude, OMEGA-COMPILE01)

- **LIVE is `4946a777deaa8e206336202d8c57db8ad39ec3ba`** (main `f830a091c..4946a777d`): Ali's Up & Down ruling (Up/Down
  only, no multiplier on any Up & Down choice) and the A21 first-frame warm-up (behind the flag). Read back: both public
  hosts serve the exact `dpl` from 12:08:15 UTC, health ok on all three, DB migrated, STAFF_PREVIEW, `qa:chunks-prod` 6/6
  on both, production `qa:live` 351/0 signed out ([E3] NOT MEASURED), live /updown read by eye. Record: VODACOM-PLAN §0k,
  "2026-10-14 Claude continuation (2)".
- **Next, in order:** (1) A21's root-`:has()` fix (the journey mark as a root-layout attribute on `<html>`; the not-found,
  signed-out-header and sort-open switches off `:root`), measured on a quiet machine with `qa:bet-sheet-production`;
  with it the sw "madau" form for the two new Up & Down sentences. (2) Land `codex/s8-battery-final` `a4a5f409e`
  (db:probe-sheet-facts). (3) Parity v4 compare. (4) S9: integrate `codex/vodacom-s9-fixes` `daaffe1b3` as its own
  release (it carries a migration: `verify:backup-schema` and the PG battery first). (5) Critique, then build, S10–S13.
- **Tools for A21** (this machine, `F:\50pick-work\tools\`): `a21-first-second-lite.mjs` (first/second open on one page,
  load-robust ratio), `a21-css-strip.mjs` (serve the CSS with root-`:has()` selectors removed before load),
  `a21-invalidations.mjs` (Chrome's style-invalidation tracking with a timeline), `a21-has-trials.mjs`, `a21-sheet-census.mjs`.

## UPDATE 2026-10-14 ~10:45 UTC (Claude, OMEGA-COMPILE01)

- **LIVE is `08a8c04728219690b91eba5ae34a2ac4697f40b3`** (main `da19e5a21..08a8c0472`), read back on all three hosts:
  exact `dpl`, health ok, DB migrated (102, unchanged), lease on the new instance, STAFF_PREVIEW, service worker = Git blob,
  pages no-store. **`qa:chunks-prod` now PASSES 6/6 on www and apex** (the Next 16.4 owner-mark repair); production
  `qa:live` 351/0 signed out, [E3] NOT MEASURED. Full record: `docs/VODACOM-PLAN.md` §0k, the "2026-10-14 Claude
  continuation" bullet. **The newest notes live on `main`** — this session's pushes of `codex/*` branches were refused by the
  auto-mode safety classifier (only the main push went through), so `origin/codex/vodacom-s8` may lag main.
- **Closed today:** CI's 90 admin empty-state cells (owner-level fix; admin sweep 4060/0); the chunk gate; the BUSY
  (22/0), row-23 transport (26/0) and pending-age (101/0, real 34.5 min) browser gates, each with its own new drive; the
  refusal line now stands above the CTA in the footer; each pending band is announced once with the late offer.
  Rows 11/18 stay NOT DRIVEN with their in-process proofs.
- **Still open for S8:** A21 — measured on THIS machine (i7-8700, Chrome for Testing 147) at 196–288 ms vs 150 (it was
  249–351 at da19); the first-open premium is first-use cost (V8 lazy compile, the `≈` system-font fallback, shaping, the
  Modal's first open), and an idle body rehearsal was measured useless and reverted. Then the parity v4 baseline at the
  live main plus one compare (the 105 served bytes of the two owner templates are the named difference; classic parity
  reads none of it), `test:all` with the database suites, [E3], exact-tip CI (main CI 38550351294 was running).
- **S9:** independent review of `9869dd701` says LAND WITH FIXES (H1–H3, M1–M4; review file on this machine
  `F:\50pick-work\s9-review\REVIEW-9869dd701.md`); fixes in progress on `codex/vodacom-s9-fixes`.
- **Owner request 2026-10-14:** remove the odds from Up & Down cards (keep Up/Down only), its own release
  (`codex/updown-no-odds`, in progress).
- **This machine:** F: is a spinning disk — work from SSD worktrees `C:\50pick-ssd\kipindi-int` (integration) and
  `C:\50pick-ssd\kipindi-s8`; never recursive-delete a `.next` without unlinking `.next/dev/node_modules` junctions; a stale
  dev cache causes `reloadPage: HMR hash mismatch` (crashes qa:live). Ali (2026-10-14): parallelise as needed on this PC.

## Release facts — 2026-10-14 checkpoint

- Exact app/main/LIVE commit: `da19e5a21a4aae56c8f9dfa49eb18e74d97c6f09`, pushed to main at 06:56 UTC on Ali's explicit instruction, "before anything push live then give me prompt." This is an authorized checkpoint release with known open gates, not S8 acceptance or completion of the whole plan. There is no Prisma delta from prior main and boot reports no pending migrations.
- Railway deployment `eb3bb94b-afc0-4f23-8fa2-88fe6767f472` is **SUCCESS**. At 07:00:20 UTC both public hosts and the Railway host returned health200/ok, a reachable/migrated production database, and initial script `dpl` values matching the full release SHA. Service worker bytes match the exact Git blob; page cache headers are private/no-store. The journey ceiling/state remain **STAFF_PREVIEW**.
- WWW production browser sweep: **349 passed /0 failed**. Existing mobile01 E3 was **NOT MEASURED**, never silently passed. The separately authorized temporary zero-wallet PLAYER login/cleanup proof is **92 checks /0 failed**, using one real login and the original E3 readers plus12 signed-in pages. Actual logout and cleanup completed: user, phone, wallet, ActiveSession and contact all absent; zero balances and no money/KYC/referral rewards/housebot/campaign dependencies. One empty automatically created invite-code leaf was cascaded only after proving no recruits/commission/dependents. Five owned auth audit rows were retained and the temporary credential file removed. **17 unknown notification POSTs were intentionally blocked** because the production action ID differed from the Windows manifest; this proves page isolation and owned cleanup, not notification transport or console-clean behavior. Mobile01, signup/adult gates and S14 production money remain unmeasured.
- `qa:chunks-prod` **FAILED 0/6 on each public host** (123 GETs each): both expected client-boundary templates have empty `data-dgst`, whereas the gate requires `BAILOUT_TO_CLIENT_SIDE_RENDERING`. Asset-fetch status, journey absence and boundary counts did not fail. The actual locked Next16.4 renderer reproduces the new blank format offline; an unrelated browser bailout does too, so blanket blank acceptance would weaken the guard. Read [`s8-next164-boundary-diagnostic-20261014.md`](s8-next164-boundary-diagnostic-20261014.md) for the observed source/renderer proof and narrow ownership/profile repair proposal. The current gate remains failed. Source-bound release summary: [`vodacom-checkpoint-release-20261014.json`](vodacom-checkpoint-release-20261014.json).
- PR CI [38521854830](https://github.com/alisheib/kipindi/actions/runs/38521854830) checked out merge `ca64ee8ec3f6af37b5be8449f0357b40bdd3b853`: **535/535** memory suites, typecheck, build and first-load passed. Responsive failed **90** alignment cells (7191 passed,317 warnings); remaining browser/PG stages were not reached. Main CI [38525147376](https://github.com/alisheib/kipindi/actions/runs/38525147376), literal da19, remained in the memory suite at 07:10:47 UTC; inspect its final result on resume. PR1 closed automatically when main advanced.
- Exact-da local production build and first-load **10/10** passed. A21 **77 pass /1 fail**: six 4×CPU times were141.2,139.8,**152.1**,148.5,148.3,139ms; the strict limit is150ms. Keep it failed; averaging, rounding, resampling unchanged code or expanding the allowance does not close it. Receipt drive **98/98** (24 real fixture bets,480 clean URL frames), cold original5000/key recovery **7/7** (zero money writes), temporal/native-history controls **52/52**, actual startup identity controls **40/40 +65/65**, and all26 receipt/cold images were read. These are local proofs, not S14 production wagers. Exact-da 20-cell production entry read found no missing assets/hash mismatches/page errors; its21 console errors correspond to21 deliberately blocked POSTs and its compression/noModule limits remain recorded.
- Current source includes reviewed account-owned recovery/auth carry, normal collection fixes, exact Next 16.4.0/chunk proof repair, matching-receipt layout cleanup, supported native history writes and the local production fixture identity fix. Its earlier parity proof is exclusively at `bf0278b464120a4b4637905960ad604061d52a03`: 67/67, 224 shell + 8 Sell + 44 book + 56 question cells, zero unexpected differences. Do not relabel that proof as da19 or a later commit.

All14 temporary-player screenshots were read. The unvisited whole classic-home image (390x7834) held a3697px blank raster band; its preserved hash is `003ae28bc43b8b41d7a2d789192e9c59a6efe054659ce67b2bcd2d9f76ae9aff`. The public same-route follow-up at390x844 visited every section in400px steps: all lower sections appeared, with unchanged viewport/document geometry before and after capture. This is consistent with the existing one-time `Reveal` IntersectionObserver animations, not proof of a permanent empty page or a bad main minimum-height. Preserve the initial capture and verify real section visitation before diagnosing a blank full-page image; do not erase the sections or change CSS based on an unvisited screenshot. This follow-up does not certify all signed-in visual variants.

## Get the current handoff, not just the default clone

Updated §0k/handoff notes are saved on **codex/vodacom-s8 after release evidence**, leaving main at the exact app release commit. Fresh machine:

```bash
git clone https://github.com/alisheib/kipindi.git 50pick
cd 50pick
git fetch origin --prune
git switch --create codex/vodacom-s8 --track origin/codex/vodacom-s8
git rev-parse HEAD origin/main
git log --oneline origin/main..HEAD
git diff origin/main..HEAD -- src public prisma next.config.ts package.json package-lock.json
git fetch origin codex/vodacom-s9 codex/s8-integration-guards
```

On an existing checkout, inspect `git status`, branch and `git worktree list` first; adapt the switch command and preserve all unrelated edits. Compare main/S8/S9 before integrating. Work in a clean isolated `codex/` branch/worktree; do not reset or force-push another session's work. Current PC's original dirty `C:\kipindi-main` was deliberately preserved. Old paths in docs are historical, not instructions to reuse someone else's directory.

Read in order: `CLAUDE.md` onboarding; `docs/SETUP.md`; `docs/NEXT-PLAN.md` board; `docs/VODACOM-PLAN.md` §0/§0k and §1; S8-PLAN and its closing amendments A1–A24; `docs/qa/s8-parity-calibration-omega-dev072.md`; `docs/qa/s8-owner-recovery-20261014.md`; `docs/qa/s8-outstanding-browser-proof-plan-20261014.md`. Plans live under `docs/design-system/v5-2026-09-29-simplified-journey/`. The S9 plan is on its separate branch; read it there without blindly merging. CLAUDE's old status paragraphs, old counts and SETUP's historical TEST-money sentence do not establish current release/payment state; the current tracker and measured live state win.

## Install, access and local isolation

- Use **Node24.x, npm and the lockfile** (`npm ci`, which generates Prisma); pinned Next is **16.4.0**. Do not substitute another Next version or change package manager. Install Chromium and WebKit only when needed for their browser gates.
- Default local development uses memory with `DATABASE_URL` absent. Use real auth/demo/dev-test doors and real staff-preview signing; no handmade session or KYC/provider approval. `npm start` runs production migrations and Next; use the documented dev command for ordinary memory development.
- On this PC disposable data lives at `F:\50pick-work`: TEMP/TMP, npm/browser cache, generated builds and captures. On another machine choose its own scratch directory and record it. Real checkout `node_modules` stays with that checkout. If `.next` is redirected to an external scratch folder, give that output its own `node_modules` alias to the same checkout dependencies: a shared ancestor previously mixed Next16.2.4 and16.4.0 and invalidated fixture startup. Never recursively move a generated Next tree across drives through dependency junctions; preserve/rename only the known link. Generated Next `AGENTS.md` was read and preserved.
- Parallel isolated jobs are authorized. Check running jobs before duplicating them. A mutating HTTP fixture and a scratch PostgreSQL cluster each have one owner; serialize their writers. Use fresh memory processes for full parity captures. Keep source and fixture frozen during each proof.
- `scripts/live/bet-sheet-prod-bootstrap.mts` is only the explicit loopback memory production-build fixture on127.0.0.1:3044. It validates the serialized config deploymentId and exact40hex source HEAD, refuses conflicting existing Railway/Next env IDs, sets both before Next imports, then checks Next's cached ID before app seeding. Its HTTP metadata exposes all three runtime identities. The production driver also checks actual RSC header/body identity and document preservation. Refuse stale/mixed build premises; do not weaken the application's production-store guard.

Railway identity is **alisheib07@gmail.com**, project **50pick** (`5e87353c-1d59-433d-a683-a32b9149f74c`), environment **production**, app service **50pick** (`baba8802-7f79-4306-9706-1e19a4b95e7c`), with Postgres and Redis. Before any Railway action read `.claude/skills/railway/SKILL.md`, then verify `railway whoami` and `railway status`: this PC also had a different project's account. Reuse available authenticated access; a new machine may require the ordinary approved browser login. Never paste, print or commit credentials, cookies or a Railway variable value. CLI/connector auth and staff/QA browser sessions do not transfer merely because Git does.

For missing access on the new machine: verify `git ls-remote origin` and `gh auth status`; use the user's normal GitHub login/credential manager or `gh auth login` when required. Verify installed Railway CLI/help, use its normal `railway login` browser approval for the account above if needed, and link the exact project/environment/app service. Environment ID is `372d937a-4bf1-43fc-919c-9c75a599067d`; Postgres service ID is `21ab039c-a4ad-45cc-b825-938a57bdd9a8`; Redis ID is `7fcd442e-53ba-4b85-86cd-08328251b5d2`. Never print `railway variables` output; capture it privately and expose only required values to the intended process. Read `docs/AGENT-ACCESS.md` for the difference between Claude permission rules and missing credentials; its old access observations require verification. The human owns Claude's permission settings. Do not widen the agent's own permissions or bypass an automatic rejection.

Production is `https://50pick.tz` and `https://www.50pick.tz` (Railway host `https://kipindi-production.up.railway.app`). **Every push to main auto-deploys; there is no staging.** `railway run` executes locally with injected env; `railway ssh` runs in the container. Internal Postgres DNS works inside Railway; an approved off-box DB operation needs the securely supplied public connection, never an exported local production `.env`. Before migrations inspect **all** pending migrations with `prisma migrate status`, follow the repository audit/migration protocol and use `migrate deploy`; never `migrate dev`, a live reset, or raw SQL that bypasses migration bookkeeping.

Post-release Railway state has no pending operations: one online app replica, Postgres and Redis online, and the live lifecycle lease belongs to the current instance. One pre-existing Postgres warning remains. Boot also reports existing password-only admin configuration (`DISABLE_ADMIN_TOTP=true`) and missing/placeholder provider-specific webhook secrets. These are observed configuration warnings, not new S9 approvals: verify the current owner/operator decisions before enabling an affected provider or changing admin access; avoid locking out an owner without enrolled TOTP.

## Resume S8 closure first

Use the new exact-tip CI and release facts above. Finish the strict150ms A21 failure and any current failed V20/history/font cells, then measure relevant corrected-source gates. The retained full bf Chromium WP11 run was418 pass /2 fail /6 outstanding, with79 tiles read; its failures and Windows WebKit font observations remain evidence, not waived greens.

Also fix the responsive wide-screen empty-state alignment defects across all15 measured admin routes: updown,updown/rounds,updown/proposals,transactions,kyc,kyc/refused,bonuses,affiliate,invites,agents,aml,self-exclusions,privacy,events,desk. Six wide widths fail per route; preserve populated tables and compare with the reviewed collection ownership convention. Reproduce the measured geometry, fix the owning component, inspect the images and run affected controls. The CI red is not a reason to widen an allowance or suppress the route. The chunk boundary gate is another open release check; determine its precise cause before a narrow proof-backed repair.

For the strict tap investigation, the captured-pick handler currently performs supported native `pushState` before `flushSync(open(...))`. Router synchronization may account for added work before the sheet heading paints; that is a profiling hypothesis, not an accepted cause or fix. Preserve owned storage restoration, native stake/key recovery, exact receipt cleanup, original-document Back/Forward and real Next history state semantics while measuring any changed sequence.

The six outstanding gates are detailed in the portable proof plan:

1. Actual pending-deposit ten/thirty-minute bands: create a genuine local mock-async PROCESSING deposit, retain its original txn/time and observe real elapsed time in en/sw/zh, with long/late tiles at320/360/390/1280. Do not advance clocks, redate rows, fabricate a provider confirmation or create a second payment. Keep the aging server isolated from global maintenance/rail changes.
2. Account-blocked divergence (row11) and missing own wallet (row18): ordinary cooling-off/freeze cannot substitute. They need the proposed reviewed bounded synthetic-owner dev-memory divergence fixture, actual server refusals and restoration/zero-money proofs.
3. Missing parameters and invalid side (two row23 entries): forward a narrowly altered real multipart action request to the real local server, preserving auth/owner/UUID/action binding; never fulfill a fake reply. Prove uncertainty, original key, zero money and explicit valid retry.
4. Authoritative BUSY: an existing bounded door is `/api/dev-test/marketing-live-seed?busy=60000`, which holds the real shared admission slot. Require authenticated `/api/admin/admission` acquisition/counter premises, then actual CTA refusal and zero own rows; `?busy=0` plus verified limit/queue restoration in finally. The old storm that admitted the tap remains unmeasured.

Preserve S8 money laws: `kp-pending-bet` is keyless selection/auth attribution with its24h boundary; `kp-sheet-intents:v2:<owner>` retains unresolved original quote/keys without age/quota/foreign-owner eviction; complete historical `kp-sheet-intents:legacy:v1` bytes remain to tab close, with only exact owned positive receipts resolving recovery. Durable write/readback faults keep locks. Missing/foreign identity,401 or stale epoch cannot settle another account or mint fresh authority. A new shared transport-only attribution reader preserves /markets' safe64-character campaign codes; auth/new-marker canonical referral rules stay strict.

## S9 and the remaining stages

`origin/codex/vodacom-s9` currently has primary reviewed preparation `ae18a4aa83a40432d201054a1f4acecfdd8796ee` and newer **9869dd701c427b04a71b3bbd1c6c142daa18061d, still awaiting independent root review**. It is not main/LIVE/S9 completion. Latest preparation binds background signed claims to original funding/current wallet/transaction and defers completion publication until commit; its local proof reports are scoped, not all-money-path safety. Inspect the actual diff and S9-PLAN §5i–§5k before deciding what lands, integrate the verified S8 base deliberately, then rerun affected source/memory/real-PG/rollback plants at the new source. Do not blindly cherry-pick the entire branch.

S9 funding controller/storage writer, classic Card UNKNOWN/retry handling, expected-owner deposit action, new three-locale funding disclosure and UI remain unbuilt. Keep a separate bounded funding-owner namespace; no UUID on observe/open/UNKNOWN and no bare FAILED/time expiry granting a new payment. The missing installed reference constraint/global writer serialization, refund/contradiction resolution and real-provider/live gates remain open. S10 auth/recovery groundwork is integrated, but guest host activation/visitor journey is not. Do not turn the guest host on prematurely.

After S8/S9: S10 visitor → register → deposit → return; S11 complete How-to/flip-ready copy; S12 consistency sweep including Juu/Chini, admin ink, short titles, NDIO and outside-site surfaces; S13 measured reports; S14 complete e2e/identity-checklist/real staff TZS1000 preview journey and actual agency sign-off or explicit owner ruling; S15 controlled ACTIVE flip and rollback monitoring; S16 shelving only at least seven real days later with healthy measures/no rollback and required agency acknowledgment. Do not fabricate any external approval, baseline period or final observation. Normal 50pick visual/animation fixes stay authorized alongside this plan; preserve its design system and classic contract.

## Verification, checkpoint and release discipline

- Read current package commands/workflow, run typecheck, appropriate actual-source/store/browser tests and their meaningful reds; commit/push recoverable branches with precise handoff notes. Money-path release requires the full suite, not a targeted subset. S8 WP12 specifies `npm run test:all -- --serial --skip responsive,motion`, red anchors, affected in-process reds, file-mutating reds individually and a clean post-run diff; responsive/motion/running-server gates are measured separately, never silently omitted as passed.
- Before LIVE: clean exact candidate, production build, exact-tip CI, relevant browser/visual proofs and classic parity against the accepted method/baseline. Each result names source hash, method, viewer/locale/width population and failures. The strict tap limit stays150ms.
- Merge/push main only within the user's authorized release scope, keep STAFF_PREVIEW, then verify the actual Railway deployed SHA (not just Git), both public hosts, health/database, assets/chunks/deployment identity, signed-out[E2] and signed-in[E3] QA and relevant classic CLS/absence gates. Update §0k/board/handoff with measured outcomes; a failed/unread release check stays open.
- Ali explicitly authorized a new **own temporary QA account/sign-in and normal account cleanup** if needed for signed-in read-only QA. Use only that account, keep credentials/cookies in ignored local storage, record its cleanup outcome, and preserve legally retained money/audit rows; do not touch another person's account or fake staff/KYC status. A real deposit/bet is a separately documented S14 production proof, not a prerequisite for merely reading classic pages.
- Raw captures, browser downloads, scratch clusters and secret fixture/cookie files under F: or ignored artifacts are **not portable Git evidence**. Current notes include hashes and source bindings; only claim a transferred file after its hash matches, otherwise recreate a fresh honest proof. Accepted classic home-day baseline SHA256 is `A70976149669B3AA13D322E44BE1DB2A05ECDFC0374BA9A12C711D92BC441070`; calibration52/52, fresh NULL68/68 and red247/247 belong to their recorded ff8 source/method. Old captures are never silently reinterpreted or goldens edited to absorb defects. No claimed perfect/percentage completion follows from this checkpoint.

For the existing LIVE pipeline, save the candidate branch first, then inspect a fresh `origin/main`. The verified candidate must be clean and contain current main; reconcile and retest if main has moved. Once release checks genuinely pass, the publication command is:

```bash
git fetch origin
git status --short
git merge-base --is-ancestor origin/main HEAD
# Require the preceding check to succeed and the reviewed candidate to be clean.
git push origin HEAD:refs/heads/main
```

Follow Railway's deployment for that exact full SHA until SUCCESS and no pending rollout. Then explicitly target each public host with `npm run qa:chunks-prod -- --origin https://www.50pick.tz` and the apex equivalent. For public browser QA set `BASE` to the intended host, remove `QA_SIGNED_IN` and run `npm run qa:live`; E3 is then unmeasured. Never interpret all public checks passing as signed-in proof. Use the separately authorized scoped QA login when required. The current failed chunk gate must be repaired with its real positive/negative controls before it can count as passed. A failed deployment/read-back requires diagnosis and a verified fix or approved prior-build rollback, with a truthful state update.

Start by reading the finalized release block and §0k, inspecting current branches/CI/access, and continuing the first genuinely open gate. Keep progress recoverable so another machine can resume.
