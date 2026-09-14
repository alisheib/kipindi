# 🧭 House Bots — PROGRESS (the planner)

> **This file is the single source of truth for where House Bots stands.** It lives on branch **`house-bots`**
> of `github.com/alisheib/kipindi` at `plans/house-bots/PROGRESS.md`.
> Open it from anywhere, phone included:
> **https://github.com/alisheib/kipindi/blob/house-bots/plans/house-bots/PROGRESS.md**
>
> ⛔ A tracker that lags the work is worse than none, because the next session trusts it. Every session updates this file
> **in the same commit as its work** and pushes **`house-bots`**. Only what is pushed counts; local folders on any machine
> don't. Setup, paths and the push overrides are in `README.md`.

## Status now
| | |
|---|---|
| **Overall** | 🟡 **PLANNED · build not started** |
| **Current step** | P0 ✅ (P0.1–P0.6). **Commit 1 🟡:** written, merged with `origin/main`, and pushed. Done so far: typecheck 0 errors, `npm run build` ✅, `test:house-bot-rules` 486/0, `test:dal-parity` 1206/0, `test:house-bot-migrations` 674/0 on Postgres 18.3, `red:dal-parity` 9/9, and the COMPLIANCE entry. **Next:** the 3-lens adversarial review, then `test:all` (RESUME AT step 7). |
| **Blocked on** | Nothing external. ✅ **Hold lifted 2026-09-14:** the KYC audit (`ali-f6`) pushed its P1 fixes ("AUDIT 95 (4/n)"…"(9/n)", no migration), its §6b "RESUME AT (session 96)" handover tops `origin/main`, and it sent "ALL-CLEAR heavy window" (after 02:55 UTC). On Ali-Blade15, still run only one heavy Node job at a time. |
| **Production** | Nothing deployed. The feature does not exist in production. |
| **Master switch** | n/a (ships OFF at release; Ali alone turns it on) |
| **Last updated** | 2026-09-14 (~08:20 EAT) · Ali-Blade15 · build session `ali-e4` (P0.6 ✅; Commit 1 review running) |

## ▶ RESUME AT (overwrite this block every time you stop)
1. Get onto the branch on whatever machine you are on: `README.md` → "Resume on any machine" (steps 0–5).
2. **Coordinate first** (prompt "COORDINATE WITH OTHER CLAUDE SESSIONS FIRST"). Session names are per machine and change every session: run `ListAgents` and message whichever 50pick sessions are live on **your** machine.
   - On Ali-Blade15 on 2026-09-13 that was `ali-f6` (the KYC audit, in `C:/kipindi-main`, port 3009).
   - As it reported at ~21:00 UTC, its heavy windows were tsc + next build + suites for its first fix, then Playwright captures, the full predeploy battery and its red harnesses (which rewrite files only in `C:/kipindi-main`). It promised to send "ALL-CLEAR heavy window" and "DONE".
   - **Never overlap `npm ci`, `next build`, `test:all` or Playwright with another session on the same laptop.**
3. **P0.2 and P0.3 are ✅** (2026-09-13, build session `ali-e4`; details in the P0 table). Nothing else to check before the hold lifts.
4. **✅ Hold lifted 2026-09-14.** Both conditions below were met: P1 and the §6b session 96 block are on `origin/main`, and ali-f6 sent the ALL-CLEAR. The block is kept as the record of how the hold worked; the live next steps are step 7. The conditions were:
   - (a) **Any machine, checkable in git:** the KYC audit's fixes are on `origin/main`, and the topmost RESUME AT in `git show origin/main:docs/LIVE-QA-CAMPAIGN.md` §6b is the audit session's own block (newer than "session 95"), saying its work is done. ali-f6's first fix ("P0", no migration) was pushed at 21:27 UTC 2026-09-13; its P1 batch was still in flight. **Last check, 2026-09-14 02:41 UTC:**
     - **P1 is pushed.** `origin/main` is at "AUDIT 95 (9/n) · the release's claims get gates…", six commits after "(3/n)" and 128 files; ali-f6 told ali-e4. It added no migration: none is newer than `20260913120000_kyc_at_withdrawal`.
     - **Still pending on the audit side:** a docs-only §6b handover commit, then Railway deploy verification, production read-only checks and its red harnesses. **"ALL-CLEAR heavy window" has not been sent.**
     - **Merge plan (agreed with ali-f6):** merge `origin/main` into `house-bots` once, after the Commit 1 edit-only files are committed and after the §6b docs commit lands. Files P1 shares with Commit 1: `package.json` and `docs/FLOWS.md` only.
     - **P1 brings:** predeploy guards `test:wallet-status-writers` (pinned at 36 wallet write sites; `db.wallet` members fixed), `test:kyc-gate-state-table` and `test:refused-funds-p1`; new 2026-09-14 COMPLIANCE entries (the House bots entry goes after them); Terms and Privacy v2026-09-14 (re-derive before Commit 6); a wide `i18n-dict.ts` change.
     - **So:** the merge may run once both conditions above hold; `npm ci`, builds, tests and Playwright stay held until ALL-CLEAR.
   - (b) **Same laptop only:** no other session on this machine is inside a heavy Node window (on Ali-Blade15: wait for ali-f6's "ALL-CLEAR heavy window"). On a different PC this condition does not apply, but coordinate with that PC's own sessions.

   If unsure, ask the audit session (if it is live on your machine) or Ali. Then:
   - **Before merging:** `git fetch origin`, re-run the P0.1 `git cat-file -e` check, and confirm `git diff --stat HEAD origin/main -- prisma/migrations` shows no migration newer than `20260913120000_kyc_at_withdrawal` (ali-f6 planned none; a new one moves the A23 timestamp floor).
   - **P0.4:** merge `origin/main` into `house-bots` + `npm ci` (after telling ali-f6).
     - ✅ **Merge-only already done, 2026-09-14,** of `origin/main` "AUDIT 95 (3/n)", with ali-f6's agreement (P1 touches no schema, migration, `store.ts` or `prisma-dal.ts`).
     - **After the P1 push:** merge `origin/main` into `house-bots` again (never rebase), then run `npm ci` and the embedded-postgres reinstall.
   - **Allowed while holding** (edit and git only; on Ali-Blade15 no npm, build, tests or Playwright until ALL-CLEAR):
     - Write Commit 1 (Prisma schema, the two house migrations, DAL and memory twins, pure modules) as pushed `WIP house-bots:` commits.
     - Hold the COMPLIANCE-DECISIONS entry until P1 lands. P1 adds several 2026-09-14 entries at the top of that file.
   - **New guards arriving with P1** (ali-f6, 2026-09-14). Plan for them:
     - **`test:wallet-status-writers`** (in `predeploy`) is a census of EVERY wallet write in `src/`, pinned at exactly 36 sites (35 until P1's dev-only `/auth/demo` balance reset added one; ali-f6, 2026-09-14).
       - Only `applyFreeze` (`wallet-freeze.ts`), `closeAccount` (`user-service.ts`) and the two registration creates in `auth-service.ts` may write `Wallet.status` or `freezeReasons`.
       - `db.wallet`'s members in `store.ts` and `prisma-dal.ts` are pinned to exactly `adjust/create/findByUserId/listAll/update`, and `adjust` may not assign status.
       - Any house-bot wallet write or new wallet DAL member must move `SITE_COUNT` (and the member list) in the same commit, after reading the population the guard prints.
     - **`test:kyc-gate-state-table` and `test:refused-funds-p1`** (both in `predeploy`, both pure). They rely on the kyc-gate precedence: a final refusal is checked before `approvedEver`.
     - **Also in P1:**
       - failure reason `account_close_held`;
       - a large `i18n-dict.ts` change (zh 你→您 sweep, new keys);
       - changes to the admin kyc, players, finance and aml pages.

       Expect merge conflicts only there.
   - **After merging, re-read the moved code before trusting any plan `file:line` anchor.** ali-f6 reported its P0 fix on `main` (2026-09-13 21:27 UTC, no migration):
     - `kyc-service.ts` gains `closedToPlayer()` and `underSubmissionLock()`. Every player KYC write re-reads the row under the `kyc:<userId>` lock, and `submitForReview` is now a compare-and-swap. Anchors moved a lot.
     - `TERMS_VERSION` moved to `src/lib/terms-version.ts`. This matters for P1's version bump in Commit 6.
     - Age is one predicate, `isOfAge` in `src/lib/id-documents.ts`. The NIDA mock QA hooks are off in production.
     - Its P1 batch then touches `refused-funds`, `wallet-service`, `wallet-freeze`, `user-service` (`closeAccount`), `notification-service`, `email`, `i18n-dict`, the legal pages and admin/player pages. These include House Bots hook points (A2 rows 5, 10 and 11; F7 money hooks; A5 closure), so re-derive every anchor there.
   - **P0.5 and P0.6.**
   - Start **Commit 1**: set its row to 🟡 and push that change first.
5. **C4 restored (2026-09-13, `ali-e4`).** Amendment C4's lost title, merge list and first evidence bullets were recovered verbatim from the planning agent's transcript and put back in `04-amendments.md`, with a note saying so. The file's header now warns that its line anchors date from 2026-09-13. Nothing is open here.
6. **N1–N2 written into the plan (2026-09-14, `ali-e4`).**
   - **Where:** the last section of `04-amendments.md` holds N1 (Enter now, polls only) and N2 (targeted polls, exact timing). All 49 review findings are merged and a 40-finding consistency critic is applied. D17–D18 and risks 13–20 are in PLAN §16b, the overlaps in PLAN §18, and `TGT-01`…`TGT-40` in `01-scenario-register.md`. The owner defaults are W7–W16 below.
   - **How to build:** N1–N2 add no commit and no third migration. Build them inside commits 1–8 per the "N1/N2" bullets under Scope per commit.
   - The P0.4 hold (step 4) has since been lifted.
7. **Next, in order (2026-09-14, `ali-e4`; one heavy job at a time on Ali-Blade15):**
   1. ✅ 2026-09-14: build workflow `wf_579b088e-e06` (8 agents) wrote the Commit 1 files: schema, the two migrations, `src/lib/house-bot/*`, `house-bot-dal.ts` and `house-bot/book.ts` with their store edits, the rules, migrations and dal-parity suites with red wiring and `package.json` keys, and the docs of record (the COMPLIANCE entry is held). Its static cross-file audit found 10 minor issues, all fixed. The files are committed as `WIP house-bots: C1 …` commits. **Nothing has been compiled or run yet.**
   2. ✅ 2026-09-14: merged `origin/main` "AUDIT 95 (11/n)" into `house-bots` (merge only, after re-running the P0.1 check and confirming no new migration), then pushed. `docs/FLOWS.md` merged cleanly. The one conflict was the `predeploy` line in `package.json`: resolved by keeping `origin/main`'s line (P1's new guards) with `test:house-bot-rules` added after `test:dal-parity`, checked against the merge base.
   3. `npx prisma generate`, `npm run typecheck`, then `test:house-bot-rules`, `test:dal-parity`, `test:house-bot-migrations`, `red:dal-parity`, `test:red-anchors` and `test:guards-exist`, one at a time. Fix what fails.
      - **Progress 2026-09-14:** `prisma generate` ✅. `npm run typecheck` ✅ (0 errors) after two type-only fixes in `house-bot-dal.ts`: the `SORTED_CHECKS` cast now goes through `unknown`, and the `withoutStamps` spread is asserted. `test:house-bot-rules` ✅: 486 passed, 0 failed, controls included. `test:dal-parity` ✅: 1206 passed, 0 failed (house mappers and column maps, memory twins, create-only markers, User password history, market reopen fields, no wallet access), controls included. `test:house-bot-migrations`, first run: 662 passed, 12 failed. Every unique-violation case came back unnamed on Postgres, while memory named it. A probe showed `@prisma/client` 6.19.3 leaves the index name out of raw 23505 errors (PLAN §18 row "`uniqueViolation` reading"). The DAL's two raw-SQL doors now resolve the name from the table and the DETAIL's key columns. Typecheck ✅ again (0 errors). `test:house-bot-migrations` re-run ✅: 674 passed, 0 failed on the scratch Postgres 18.3. That covers source shape, replay, the blocked apply, every CHECK and named unique, and Postgres/memory parity case for case. Not measured here, by design: S1 (c), the old build on the new schema (`verify:house-bot-migrations-old-build`, outside `test:all`), and `houseBotSchemaReady()` (commit 4). `test:dal-parity` re-run ✅: 1206 passed, 0 failed. `red:dal-parity` ✅: 9/9 mutations caught (each by its own assertion), including the 4 house mutations (the txn marker read, the positions update arm writing `houseBotId`, `passwordSetAt` in the date list, the intent `staleAt` read). Working tree untouched, gate green afterwards. `test:red-anchors`: 1652 passed, 11 failed. **Every failure is inherited from `origin/main`** (the failing files and every red script key are identical to main): 7 `red:icon-sizes` / `red:social-*` scripts it cannot parse, missing anchors in `top-app-bar.tsx` and `src/lib/house-book.ts`, and 74 undeclared harnesses against a ceiling of 65. All 9 `dal-parity` anchors resolve exactly once. `test:guards-exist`: 8 passed, 1 failed, on 4 phantom KYC citations inherited from main (`test:kyc-cert-d1`, `test:kyc-security`, `test:kyc-stage-service`, `test:kyc-status-honesty`; none is in main's `package.json`); no house-bot citation is a phantom. Reported to ali-f6. It fixed the four citations on `main` in `274bbf59` (comments only; `test:guards-exist` 9/0 there), so the next merge of `origin/main` brings the fix. It also confirmed that the 11 red-anchors failures are the standing baseline: 1638/11 before its session, none in KYC files, left for the owners of those areas. **Docs of record:** the COMPLIANCE-DECISIONS House bots entry is written as "2026-09-14 (fourth)", at the top above P1's three same-day entries. Its §10 bullet names Terms v2026-09-14's in-app promise (PLAN §18 row "P2 Terms §10 notice text"). `test:design-one-door` ✅. `test:docs`: 1 broken reference, inherited from `main` (`docs/LIVE-QA-CAMPAIGN.md:6130`, where the §6b handover prose written in `623f41b7` mentions `npm run -s`); the file is identical to main, and it has been reported to ali-f6. ali-f6 then fixed that line on `main` in `85762146` (`test:docs` green there), so the next merge of `origin/main` brings the fix. P0.6 ✅ (sub-step 4). **Next:** see sub-step 5.
   4. ✅ 2026-09-14: P0.6 recorded. Phase D = `next start` WORKS (see the P0 table).
   5. ✅ 2026-09-14: the COMPLIANCE-DECISIONS House bots entry is written (`07a71e8a`). **Next:** the 3-lens adversarial review of Commit 1 (workflow `wf_b826fc45-41d`, read-only), fix its confirmed findings, then `test:all` and the rest of Commit 1's definition of done.

## Legend
⬜ not started · 🟡 in progress · ✅ done (date · machine · commit subject) · ⛔ blocked (reason) · ⏭️ skipped by Ali's ruling · — not applicable

---

## P0: preconditions (amendment S1)
Run in **Git Bash** from the worktree.

| # | Check | Status |
|---|---|---|
| P0.1 | `git fetch origin`, then `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` succeeds | ✅ 2026-09-13 · Ali-Blade15 (planning session) |
| P0.2 | `git log origin/main --oneline --grep "KYC AT WITHDRAWAL"` lists the series, and the topmost RESUME AT in `docs/LIVE-QA-CAMPAIGN.md` §6b on `origin/main` says the KYC-at-withdrawal work is pushed and its migration applied in production | ✅ 2026-09-13 · Ali-Blade15 · build session `ali-e4`: the grep lists all seven, "KYC AT WITHDRAWAL (1/n) · the gate, S1, the freeze model, legal and copy" through "(7/n) · the audit prompt states the legal-version rule precisely". The topmost §6b RESUME AT on origin/main (session 95) states the release is LIVE and that `20260913120000_kyc_at_withdrawal` was applied to production at 20:08:42 EAT, before the push. ⚠️ ali-f6's audit block is still to come; that is the P0.4 hold, not a P0.2 failure |
| P0.3 | See the three steps below | ✅ 2026-09-13 · **LF variant matched.** Step 1 re-derived by `ali-e4` from `git show origin/main:…/migration.sql`: LF `3f03069239a84c0cefdc1da2cd07a1e18136c358936e9d55747964483f38e5f2`, CRLF `bf82c95d71016be99f66bcfe29adc0512be9e3f3383a2d4200ceebb76534e765`. Steps 2–3 were done by session `ali-f6` in a read-only transaction: checksum `3f030692…f5f2` (= LF), `finished_at` 2026-09-13 17:08:52 UTC, `rolled_back_at` NULL, applied_steps_count 1. On Ali's ruling this session did not query production itself |
| P0.4 | **Merge, never rebase:** `git merge --no-edit origin/main` on `house-bots`, then `npm ci` + `npm i -D --no-save embedded-postgres@18.3.0-beta.17`, then push `house-bots` | ✅ **2026-09-14 · Ali-Blade15 · `ali-e4`:** merge-only of "AUDIT 95 (3/n)" done earlier with ali-f6's agreement. After ali-f6's ALL-CLEAR (and after telling it): `npm ci` ✅ (its `prisma generate` postinstall passed on the in-progress Commit 1 schema) and `npm i -D --no-save embedded-postgres@18.3.0-beta.17` ✅. Then, after the Commit 1 files were committed, the second merge of `origin/main` ("AUDIT 95 (11/n)": P1 and the §6b docs; `package.json` predeploy conflict resolved) was committed and pushed. **P0.4 ✅** |
| P0.5 | `npm run db:scratch` starts PostgreSQL on `127.0.0.1:5433` (loopback only) | ✅ 2026-09-14 · Ali-Blade15 · `ali-e4`: `tsx scripts/db-scratch.mts --run node --version` initialised a fresh cluster in `.pgscratch/` (git-ignored), printed "Ready: PostgreSQL 18.3" on 127.0.0.1:5433 (the script sets `listen_addresses=127.0.0.1`), ran the command and stopped cleanly (exit 0) |
| P0.6 | Local admin render method, recorded: **phase D = `next start`: WORKS** | ✅ 2026-09-14 · Ali-Blade15 · `ali-e4`. **Method:** after `npm run build`, `tsx scripts/db-scratch.mts --run` ran a throwaway script (deleted, never committed). The script created database `hb_p06` on the scratch cluster, ran `prisma migrate deploy` (every migration, both house-bot ones included) and seeded the owner with `scripts/seed-admin-local.mts`. The dev-only seed route returns 404 under production, which is why the script was used. It then ran `next start -p 3021` with `NODE_ENV=production`, `DISABLE_ADMIN_TOTP=true` and a local `SESSION_SECRET` and `OTP_PEPPER`. In Playwright Chromium it signed in through `/auth/admin` and landed on `/admin`, whose h1 read "Overview" at 1280 and at 360. Both viewport screenshots were opened and read. At 1280: the signed-in owner session, the full sidebar, the KPI cards and the money-flow chart. At 360: the collapsed menu and stacked cards. Port 3021 was released afterwards |

**P0.3: production migration row matches the file**
1. **Expected checksum:** `git show origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql | sha256sum`. Hash the **git blob**, never the checked-out file (core.autocrlf adds CRLF) and never through a PowerShell pipe.
2. **Connect:** `railway login` (Ali approves the pairing), then `railway link` to 50pick/production. Use the Postgres service's `DATABASE_PUBLIC_URL`.
3. **Query, read-only:** `select migration_name, checksum, finished_at, rolled_back_at from _prisma_migrations where migration_name like '%kyc_at_withdrawal'`.
   - **GO** only if the checksum equals step 1's LF hash **or** its CRLF variant (`git show origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql | sed 's/$/\r/' | sha256sum`; Prisma stores the hash of the bytes on the machine that applied it), `finished_at` is set and `rolled_back_at` is null. Record which variant matched.

**P0.6: local admin render**
1. `npm run build`, then `DATABASE_URL=<the URL npm run db:scratch prints> DISABLE_ADMIN_TOTP=true npm run start` (the start script runs `prisma migrate deploy` first and needs `DATABASE_URL`), with a seeded owner.
2. Open `/admin` and read the screenshot.
3. Record "phase D = next start: WORKS / NOT MEASURED". `next dev` for admin stays forbidden (`03-design-spec.md` §7) unless an amendment changes it.

---

## Build: 8 commits (PLAN §11; amendment placement per `04-amendments.md`)

**Definition of done, identical for every commit:**
- **impl:** implemented.
- **tsc:** `npx tsc --noEmit` clean.
- **suites:** the commit's new `test:` suites pass.
- **all:** `npm run test:all` green, with a server on `:3000` (`npm run build`, then `DATABASE_URL=<db:scratch URL> npm run start`).
  - Without a server, skip the two server suites (see `scripts/test-all.mjs` header for the exact `--skip` names) and record them NOT MEASURED.
- **red:** its `red:` harness passes, with each mutation failing its own assertion.
- **drive:** real behaviour driven or rendered as the commit requires, with screenshots opened and read.
- **review:** the adversarial review workflow ran with 3 lenses. Reviewers write their answer once at the end, and every confirmed finding is fixed.
- **docs:** `docs/HOUSE-BOTS.md` and this file updated.
- **push:** `house-bots` pushed (branch confirmed with `git branch --show-current` first).

| # | Commit | Status | impl | tsc | suites | all | red | drive | review | docs | push |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Docs of record · schema · migrations · DAL · pure modules | 🟡 | 🟡 | ✅ | ✅ | ⬜ | — | ⬜ | ⬜ | 🟡 | ⬜ |
| 2 | Money seam (`placeHouseBet`, gates, markers, exclusions) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Designation · eligibility · password verification (services) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Engine · notifications · holder hooks · money hooks · schema gate | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Reporting · data rights · resolver exposure · holder chip | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Public text (Rules, Terms, privacy, FAQ, chatbot) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Console `/admin/house-bots` · nav/RBAC · ops scripts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Local end-to-end drive · rehearsals · final docs · release prep | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |

### Scope per commit
Detail lives in `PLAN.md` + `04-amendments.md`. Names here are pointers, not specs.

**Commit 1: docs of record, schema, migrations, DAL, pure modules**
- **Docs:**
  - `docs/COMPLIANCE-DECISIONS.md` House-bots entry (D1–D16, supersedes, accepted risks, the REL-2 migration exception).
  - `docs/HOUSE-BOTS.md` skeleton (names no script that doesn't exist yet).
  - Supersede notes on `F6-LIQUIDITY-DESIGN.md`, `UPDOWN-FINAL-DESIGN.md` and `feature-backlog.md`.
  - P3/P4 doc skeletons.
- **Schema + 2 migrations:**
  - S1 migration law.
  - A23 migration rules: timestamped after `20260913120000_kyc_at_withdrawal`, touching no KYC table; `IF NOT EXISTS` with fixed names; above 500k positions or 1M transactions, build the marker indexes `CONCURRENTLY` by hand first.
  - HouseBot, HouseBotControl, HouseBotRuntime, HouseBotAlertOnce, HouseBotEvent, HouseBotIntent tables.
  - `Position` and `Transaction` `houseBotId` markers.
  - `User.passwordSetAt/Via` + `emailSetByOfficerAt` (A4).
  - Consent-void, `alertedAt` and `scopeFrom` columns (A3, A8, A11); BigInt caps (C1); `labelKey` (C2); retention rows (A20); indexes and runtime keys (A24).
- **Code:** DAL + in-memory twin; `src/lib/house-bot/{constants, pause-reasons, rules, clock}`; `server/house-bot/book.ts`.
- **Constants and policy:** `HOUSE_AUDIT` (R7); `PENALTY_BOXED` kind (R5); product policy (F1); rules parse/migrator (F4).
- **Suites:** `test:house-bot-rules`, `test:house-bot-migrations`, `test:dal-parity`.
- **N1/N2 schema and pure modules:**
  - **Tables:** `HouseBotPress` (8th table) and `HouseBotTarget` (7th), each with a memory twin, A20 7-year retention, a P3 row and a chain-purge NEVER entry. A23 `houseBotSchemaReady()` and the preflight count 8 tables.
  - **HouseBotIntent:** kind MANUAL, `requestedById`, `entryCondition`, `staleAt`, `transientAttempts`, `targetId`, the polls-only MANUAL CHECK, and the named indexes `hbi_counter_anchor_uq`, `hbi_fill_opener_anchor_uq`, `hbi_manual_anchor_uq`, `hbi_manual_live_market_uq`, `hbi_staff_bot_finished_idx`, `hbi_staff_finished_idx`.
  - **HouseBotEvent:** `marketId`, the new kinds and `hbe_opener_draw_uq`.
  - **Caps and control columns:** the staff-chosen caps, `targetsMaxActive`, `gTargetsMaxActive`, `gStaffChosenMaxCounterpartyShare`, `gStaffEdgeWinRatePts`, `gStaffEdgeNetTzs` and `boardDisclosureSections`.
  - **Markets:** `PredictionMarket.reopenedAt` and `reopenCount` in the markers migration.
  - **DAL:** `uniqueViolation()`.
  - **Rules:** v1 `enterNow` and `targeting`; `N1-*` and `N2-*` cross-field rules; the Start mode rule; `effectiveTiming.enterNow` and `effectiveTargetTiming`.
  - **Constants:** `LOCK_MARGIN_MS` (7000) and `TARGET_ARMING_SEC` (12), both pinned; `house:targets`; EngineCodes, cap codes and `HOUSE_AUDIT` keys.
  - **COMPLIANCE entry:** D17/D18, risks 13–20 and the do-not-restore lines.
  - **Suites:** rules, migrations and dal-parity gain the N1/N2 cases: press, intent-insert, draw and target twins. The picker case waits for commit 7.

**Commit 2: money seam**
- **Seam:** `placeHouseBet` + `buyPositionGuarded`; H0–H9; bet context (A7); lock timeouts (A9 seam); scope predicate + H3 refusals (A12 seam).
- **Exit and pool:** exit-window formula byte-identical (A14); locked pool + fresh price in H3 (A15 seam).
- **Settlement paths:** wagering reversal skipped everywhere + labels (A17); sanctioned changes (a)–(q) (A18); holder-vs-own-bot hook (A21 seam); gate parity (F3).
- **Suites:** `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-caps`.
- **RED:** `red:house-bot-money`.
- **N1/N2 seam:**
  - **Modules:** `pools.ts` (`lockedForHouse`) and `blackout.ts` (`{blocked}` only; A13 exempts it by name).
  - **H0:** the ordered rule; status is never part of it.
  - **`staleAt`:** re-read on `clock_timestamp()` before `markPlaced` → `house_intent_stale`.
  - **H2:** declared order pinned in `house-bot-seam.anchors.mjs`, with `STAFF_CHOSEN_PER_DAY`, `STAFF_CHOSEN_DAILY_STAKE` and `TARGET_ONCE`.
  - **H3:** MANUAL `entryCondition` from the claimed row; `house_counterparty_concentration`; `house_info_blackout` for MANUAL and targeted rows.
  - **H4:** `GLOBAL_STAFF_CHOSEN_*` and pro-rata counterparty attribution.
  - **`lockedForHouse`:** one SQL aggregate with the exclusions and `LOCK_MARGIN_MS`; golden-grid parity with `exitWindowClosesAt`; EXPLAIN pin at 20,000 positions; memory twin. H3 uses it for MANUAL, targeted COUNTER and FILL.
  - **Sanctioned change (r):** `adminReopenMarket` stamps `reopenedAt` and `reopenCount`.
  - **Registries:** `GATE_PARITY` and `BET_PATH_REASONS` rows; reasons in en/sw/zh.
  - **RED:** the N1/N2 `red:house-bot-money` mutations.

**Commit 3: designation services (no console actions yet)**
- Eligibility with contexts.
- Password verification: reserved attempts, never a session (C4 service side).
- Consent void, service side (A3); password history (A4); erasure refusal + pseudonymising + `house_bot_live` (A5 erasure, R6); recipients (A22).
- `HOUSE_BOT` notification kind + `notifyHouseBotOwner` + owner email template.
- **Suites:** `test:house-bot-designation`.
- **N1/N2 services:**
  - **Consent void (A3):** ends every ACTIVE target as ENDED(CONSENT_VOID), with TARGET_ENDED events, in the same `wallet:<botUser>` transaction.
  - **Erasure (A5):** pseudonymises `HouseBotPress.reason` and the new event reasons to "[erased]".
  - **Suite:** `test:house-bot-designation` gains one case per void cause.

**Commit 4: engine**
- **Hooks and causes:** trigger hook + sweep; holder hook matrix (A2); causes and void, engine side (A3); closure → auto-REMOVED (A5 closure); holder-vs-own-bot alert (A21).
- **Engine core:** planner/poller/claims; alert outbox claim + 30 s repair (A8); mapper (A10); `scopeFrom` (A11); scope predicate in the planner (A12); market view (A13); fresh-price closeness (A15); lifecycle table (A16); audits outside locks (A19); runtime robustness (A24).
- **Kill switch:** OFF write order (A9).
- **Schema gate (A23):** `houseBotSchemaReady()`. When false, the engine does not start and `/api/health` returns 503. The engine-stale warning waits 90 s after boot.
- **Alerts:** notifications (PLAN §7 + C13 matrix); money hooks.
- **Other:** penalty box event (R5); holder hook not env-gated (R6); retention pass (P3).
- **Future safeguards:** F5 bounds revalidation, F6 channel policy, F7 no module state, F8 raw-SQL writers.
- ⚠️ **Before pushing Commit 4, see W1** (public repo).
- **Suites:** `test:house-bot-engine`, `test:house-bot-info-edge`, `test:house-bot-comms`, `test:house-bot-holder-lifecycle`.
- **RED:** `red:house-bot-engine`.
- **N1/N2 engine:**
  - **Modules:** `opener-side.ts`, called by the planner before `decide()`, so decide stays pure; `enter-now.ts`, whose decision reads the bot's own positions, and its `marketHeld` predicate.
  - **Fire:** `fire.ts fireClaimedIntent` (no lock, no ambient admission, `inFlight` registry); the write-back clamp for every kind.
  - **Claims and planner:** claim on `staleAt`; `transientAttempts`; the STALE pass before POISON; MANUAL and targeted expiry at `staleAt` + 5 s; press audit lease repair.
  - **Lifecycle:** FILL on `lockedForHouse`; A16 reopen from `reopenedAt`.
  - **Targets:** poll triggers in the sweep only (the hook keeps Up & Down and is suspended above 5 s skew); target decide; hold to exit close + `LOCK_MARGIN_MS`; fire re-read; `endTargets()`.
  - **Copy and alerts:** mapper and `feed-copy.ts` rows; `notifyAdminsHouseBotStaffChosen`; target roster alerts; `staff-stake-voided`, `staff-stake-self-decided` and `staff-edge` alerts; hourly summary split.
  - **RED:** the N1/N2 `red:house-bot-engine` mutations.

**Commit 5: reporting and data rights**
- §9 splits; house-liquidity report + CSV (R1); exposure everywhere (R2); statutory notes (R3); no rewards on house stakes (R4, F9).
- DSAR views (R5 = G1); durable audit readers (R8); `houseStake` in decision audits + KYC card (R9 = G2).
- Resolver display (§1-F11); holder chip + SellButton `houseStake`.
- **Suites:** `test:house-bot-reports`, plus `test:dsar-secrets` and `test:erasure` additions.
- **N1/N2 reports:**
  - **Book:** entry split (automatic, targeted, Enter now) in `book.ts`.
  - **R1 sections:** entry split; Enter now register from `HouseBotPress` (placed and refused, with code); previews without a stake; voided or reopened markets; markets decided by the choosing officer; staff-chosen scorecard; targets register; vetoes.
  - **Other outputs:** CSV columns; R9 (q) `houseStake.staffChosen.requestedBy`; "of which chosen by you" on the resolver card, ceremony, emergency-void confirm and objection panel; R3 memo.
  - **Data rights:** R5 `events[]` kinds; `test:erasure` §8 reason bucket; `test:dsar-secrets` kind list.

**Commit 6: public text**
- Rulebook §8 carve-out + disclosure (en/sw/zh); Terms §4; privacy notice (P1); META bumps; §10 waiver record (P2); FAQ; chatbot bullet.
- **Suites:** `test:house-bot-disclosure`.
- **N1/N2 text:**
  - Privacy line naming staff-chosen markets (en/sw/zh, native review).
  - Chatbot forbidden phrases.
  - Board draft section "Stakes chosen by staff".
  - `test:house-bot-disclosure` §docs pins risks 13–20 and the do-not-restore lines.

**Commit 7: console**
- **Routes and wizard:** `/admin/house-bots` routes, tabs and views; wizard + UserPicker (C5); rules and limits forms (C1, C2, C6, C14, C15).
- **Password UI (C4 console side):** `autoComplete=new-password` + password-manager ignore attributes; busy latch + `submitId`; the re-verify "start again" checkbox; reserved-attempts copy.
- **Dialogs and states:** modals (C3, C7); switch and Start states (C10); live strip (C11); re-auth / STALE_BUILD / drafts (C12); consent UX (C8, C9).
- **Wiring:** nav/RBAC; console audit pins (R7); FAILURE-INVENTORY §6.
- **Ops scripts:** `ops:house-bots-off` (A9); `--drift` / `ops:house-bots-remark` (S3); feature state + `ops:house-bots-sunset` (F2).
- **Suites:** `test:house-bot-console`.
- **RED and visual:** `red:house-bot-console`; `qa:house-bots-visual`.
- **N1/N2 console:**
  - **Press flow:** `HouseBotPress` for every N1/N2 action.
  - **Actions:** `searchHouseBotMarketsAction` (polls only, `HOUSE_BOT_MARKET_PICKER_SEARCH`), `previewEnterNowAction`, `enterNowHouseBotAction`, `getEnterNowStatusAction`, `previewHouseBotTargetAction`, and `add/update/removeHouseBotTargetAction` (`wallet:<botUser>` then `house:targets`; audit and alert after release); the staff-chosen cancel veto.
  - **Picker:** `MarketPicker` and picker DAL; the dal-parity picker case lands here.
  - **Screens:** Enter now modal; targets tab; rules and limits fields with the 02 §3.8 exemption; strip `enterNow`/`targets`; Start-confirm active-targets line; Board disclosure checklist; feed entry filter; lexicon tables.
  - **Gates:** A19 source scan widened; gate outcome per new file.
  - **Ops and records:** sunset ends targets; FAILURE-INVENTORY §6.
  - **RED and visual:** RED console mutations; visual fixtures.

**Commit 8: end-to-end and release prep**
- **Ops scripts:** `seed:house-bots-local`, `drive:house-bots-local`, `ops:house-bots-status`, `ops:preflight-house-bot-migrations` (A23).
- **Rehearsals (S4):** migrations under load, rollback, two processes, audit burst, two-admin ON.
- **Docs:**
  - risks 8–12 (S5);
  - runbooks: S3, F2, and A23 (deploy with the switch OFF unless the 60 s overlap is verified; roll back only with the switch OFF and 0 open marked positions);
  - final docs (P4: RULES §2.11, FLOWS §9, FAILURE-INVENTORY §7.1, AGENT-PROGRAMME §5, DATA-RETENTION);
  - A1 record.
- **Scenario coverage gate** (below).
- **N1/N2 drive:**
  - **`drive:house-bots-local`** (local seeded DB only): Enter now THIN and OPENER; a poll target STAKE 10 s (lands from 5:07); EXIT_CLOSE 10 s (from 5:10); an Up & Down 3-min COUNTER 10/10.
  - **Phase D:** a step for Esc with a choice open.
  - **S4 rehearsal 3:** includes inline fire vs poller.
  - **Release record:** prints "Enter now preview: NOT MEASURED in production (it writes)".
  - **FAILURE-INVENTORY §7.1:** entry kinds, target statuses and end causes.
  - **Coverage gate:** includes every `TGT-` id (re-count with grep).

### Scenario coverage gate (before REL-0)
Every scenario id in `01-scenario-register.md` (`HB-ACC-*`, `HB-LC-*`, `ENG-*`, `CA-*`, `CRA-*`, `FS-*`, `TGT-*`) must appear in at
least one house-bot test assertion name or comment, or be listed here with a reason.

| Metric | Value |
|---|---|
| Ids in register | 241 on 2026-09-13 (CA 57 · CRA 37 · ENG 52 · FS 41 · HB-ACC 59 · HB-LC 52). Re-count with grep before quoting. |
| Ids in register, `TGT-*` | 40 on 2026-09-14 (`TGT-01`…`TGT-40`, section `targeted-and-manual`). Re-count with grep before quoting. |
| Ids covered by tests | ⬜ not measured yet |
| Exceptions (id · reason) | — |

---

## Release (amendment S2 steps R0–R6, called REL-0…REL-6 here): only after all 8 commits are ✅

Run every Release command in **Git Bash**. S2 R0's "Rebase on origin/main" is superseded: **merge** `origin/main` (the branch is shared across machines). Any "rebase" instruction anywhere in these documents is superseded the same way.
| Step | What | Status |
|---|---|---|
| REL-0 | **(T-1 day)** P0 re-run · merge `origin/main` · `git diff origin/main...house-bots --stat -- prisma/migrations` shows exactly the 2 house folders · `test:all`, every `red:house-bot-*`, `drive:house-bots-local`, `qa:house-bots-visual` and the S4 rehearsals green on this SHA · coverage gate met · `ops:preflight-house-bot-migrations` GO · **checklist sent to Ali, and his "go" received, explicitly naming REL-2** | ⬜ |
| REL-1 | Quiet hour chosen: preflight shows the bets in the last 15 min; not during the nightly trial balance; a window of at least 10 minutes | ⬜ |
| REL-2 | See the steps below | ⬜ |
| REL-3 | While the old container still serves: `houseBotSchemaReady()` query true · `HouseBotControl.enabled=false` · `/api/health` ok · Position count still rising | ⬜ |
| REL-4 | See the steps below | ⬜ |
| REL-5 | See the checks below | ⬜ |
| REL-6 | "First switch-on" guide delivered to Ali: limits → designate → rules → Start → ON → watch the feed 15 min → OFF on any FAILED row or unexplained alert. Rollback plan: amendment S3 | ⬜ |
| — | Ali switches house bots ON (his action, not a session's) | ⬜ |

**REL-2: migrations applied to production from the build machine**
1. **Pre-check:** `MSYS_NO_PATHCONV=1 DATABASE_URL=<Postgres DATABASE_PUBLIC_URL> npx prisma migrate status` shows exactly the 2 house migrations pending.
2. **Apply:** `MSYS_NO_PATHCONV=1 DATABASE_URL=<Postgres DATABASE_PUBLIC_URL> npx prisma migrate deploy`.
3. **Verify:** both rows finished, and each row's checksum equals `git show HEAD:<migration file> | sha256sum` or its CRLF variant (`… | sed 's/$/\r/' | sha256sum`), whichever matches the bytes on this machine (`git ls-files --eol <file>`); record which. A checksum mismatch alone is NOT a failed apply; never `migrate resolve --rolled-back` a finished row.
4. **On failure:** follow the S2 recovery (preflight `--post`, then `migrate resolve --rolled-back`). Never leave a failed row.
5. ⚠️ **This is an explicit exception** to the 50pick-audit skill's "migrations reach production only through the deploy". It is needed because the start script applies DDL while the old container still serves. It must be named in Ali's REL-0 "go" and recorded in the COMPLIANCE entry.

**REL-4: merge and deploy**
1. Read the live service config and record `overlapSeconds`. An outage is expected only if it is null; the switch stays OFF regardless.
2. Merge and push from a **temporary release worktree**. Never use the main checkout another session may be in; the house-bots worktree's pre-push guard stays armed.
   1. `git -C <repo> fetch origin`
   2. `git -C <repo> worktree add --detach <repo>-rel4 origin/main`
   3. `git -C <repo>-rel4 merge --no-ff --no-edit origin/house-bots`
   4. `git -C <repo>-rel4 push origin HEAD:main`: the one sanctioned `main` refspec in this whole programme. **This is the deploy.**
   5. `git -C <repo> worktree remove <repo>-rel4`

   If step 3 conflicts, stop, remove the release worktree and re-run REL-0; never resolve a conflict at the deploy gate.

**REL-5: post-deploy checks, within 10 minutes**
- `curl -s -D - -o /dev/null https://50pick.tz/ | grep -io 'dpl=[0-9a-f]*' | head -1 | cut -d= -f2` equals `git rev-parse origin/main`.
- `/api/health` shows `houseBots.schemaReady=true` and `leadership.lifecycle.isMe=true`.
- After the 90 s boot grace, `ops:house-bots-status` shows: OFF, 0 bots, 0 marked rows, engine enabled, beats fresh.
- PLAN §12 production checks and §15 phase F pass.
- **At +10 min:** 0 marked rows and 0 HOUSE_BOT notifications.

⛔ **From REL-4 on, record REL-5, REL-6 and every later change to this file on branch `house-bots` only.** A docs-only push to
`main` is another production deploy.

## ⏳ Waiting on Ali (owner defaults Ali may override; the build uses the default unless Ali says otherwise)
| # | Question | Default being built |
|---|---|---|
| W1 | GitHub repo is **public** | Ali (2026-09-13): "keep public for now, later we make private". ✅ **Answered early, 2026-09-13 UTC, to build session `ali-e4`:** keep the repo public and push Commit 4's engine code publicly (Ali typed "3b" = "keep it public and push the engine code anyway", then approved this edit manually). No further question is needed before Commit 4 unless the repo's visibility changes first. |
| W2 | What a *trigger* player sees in their data export (R5) | excluded days + countered count only |
| W3 | Terms §10's written in-app notice can't be kept today (P2; since Terms v2026-09-14 §10 no longer promises SMS) | waived on Ali's ruling; defect recorded |
| W4 | Retention of skipped/expired intents (A20) | kept 7 years (proposal on file: 90 days) |
| W5 | Platform-wide sign-out on password change (A1) | not in this build (separate hardening) |
| W6 | A pointer to this planner in `main`'s CLAUDE.md / NEXT-PLAN | the House Bots session must NOT push `main` for it; whichever session next pushes `main` for its own work may add the row |
| W7 | Reason on staff-chosen actions | a reason (5–300) is required on every Enter now press, target add/update/remove and staff cancel |
| W8 | Schedule, pool band and closing-soon skip | Enter now ignores the schedule, pool band and closing-soon skip; targets obey the schedule and ignore the pool band and closing-soon skip |
| W9 | Products for Enter now | Enter now: polls only (Up & Down not built) |
| W10 | Who may press, and who is told | any ADMIN may press, and every staff-chosen PLACED stake alerts every admin (bell + email, uncapped) |
| W11 | Information blackout scope | a LIVE poll is closed to Enter now and targets while any of `sentinelOutcome`, `sentinelConfidence`, `sentinelDetermined`, `sentinelClosedAt`, `resolvedOutcome`, `resolutionStage1By` is recorded, while `resolveClaimedAt` is younger than `RESOLVE_CLAIM_TTL_MS`, or once `reopenedAt` is set |
| W12 | Late-entry tolerance (`staleAt`) | 15 s Enter now, 60 s targets |
| W13 | Products for targets | targets are polls only |
| W14 | Target defaults; early entry | target defaults reactTo FIRST and timingFrom STAKE, early entry not built |
| W15 | Counterparty share limit | counterparty share limit 50% |
| W16 | Staff-edge alert | staff-edge alert at 15 points or TZS 100,000 |

W15 and W16 are recommended values for nullable control-row columns: `gStaffChosenMaxCounterpartyShare` (NULL makes Enter now refuse), and `gStaffEdgeWinRatePts` / `gStaffEdgeNetTzs` (NULL turns that alert off). The "Use recommended values" button fills them; nothing saves them silently.

## 📓 Session log (append-only, newest first)
| Date | Machine | Paths | Session | What happened | Where it stopped |
|---|---|---|---|---|---|
| 2026-09-14 (~01:00–02:20 UTC) | Ali-Blade15 | `C:/kipindi-house-bots` | Build (`ali-e4`, continued) | Sealed N1–N2 with a split workflow: 7 writers plus a consistency critic, which returned 40 findings (2 blockers, 11 majors, 27 minors). Each was checked against the code and all 40 were applied. Re-derived the code anchors after the merge. Replaced the sealing sheet's private ids with N1/N2 section references, because they collided with 04's C-amendments and PLAN's D-decisions, and made the new copy gender-neutral. Wrote N1–N2 into `04-amendments.md` (last section, plus pointer notes on A15, A16, A23, A24, C4, R9 and P1), PLAN §13/§16b/§17/§18, `01` (TGT-01…TGT-40), `02` §3.3/§3.8/§3.9, `03` S3/S4/§4, README, the prompt and this file. No npm, build, test or server run; nothing touched production. | **N1–N2 ✅ in the plan.** The P0.4 hold is unchanged. **Next:** Commit 1 as edit-only WIP. The Commit 1 spec workflow (run `wf_2bf70f6b-d40`) was still running at this point; its output exists only on Ali-Blade15, so another machine re-derives Commit 1 from PLAN, 04 and this file. |
| 2026-09-13 (~21:05 UTC) | Ali-Blade15 | `C:/kipindi-house-bots`, hooks `C:/kipindi-house-bots-hooks` | Build (`ali-e4`) | Coordinated with `ali-f6` (KYC audit: port 3009, heavy windows, no new migration planned) and messaged the planning session. **P0.2 ✅. P0.3 ✅ on the LF variant:** hashes re-derived here; the production row was read by ali-f6 in a read-only transaction; Ali ruled that is enough. On Ali's ruling, committed the planning session's uncommitted hold notice together with these results. **Installed the README step 5 push guard** (Ali approved): `extensions.worktreeConfig=true` on the shared repo; `core.hooksPath` set only in this worktree's `config.worktree` (the main checkout still has none; its `.git/hooks` held only samples); the hook refused a simulated push to `main` and passed `house-bots` (tested by feeding it stdin, never by a real push). Read the prompt, README, PLAN, `02`, `03` and `04` in full (not yet `01`). Found amendment C4's heading and opening text missing, then recovered them verbatim from the planning agent's transcript and restored them, plus a stale-anchor warning at the top of `04-amendments.md`. Later in the same session: Ali answered W1 early (the repo stays public); the hold was rewritten so any machine can check it; read CLAUDE.md, TRAPS, SETUP, F6-LIQUIDITY-DESIGN, UPDOWN-FINAL-DESIGN §D3/§3b and `01` in full. Ali then asked for two new features: Enter now, and targeted markets with exact entry timing. The design-and-review workflow finished with a draft and 49 review findings; its final seal overflowed the output limit. Every finding was ruled ACCEPTED (some merged), and a split sealing workflow started writing the final N1–N2 text. **2026-09-14:** with ali-f6's agreement, `origin/main` "AUDIT 95 (3/n)" was merged into `house-bots`, merge only. ali-f6's P1 ETA was about 2–3 hours, then its red harnesses. No npm, build, test or server run. Nothing touched production. In `C:/kipindi-main` no files changed; only its shared git config gained `extensions.worktreeConfig`. | **P0.4 half done:** merged; `npm ci`, tests, P0.5 and P0.6 wait for P1 + ALL-CLEAR. **N1–N2:** sealing in progress, not yet in the plan. **Next:** write N1–N2 into the plan, then Commit 1 as edit-only WIP |
| 2026-09-13 | Ali-Blade15 | `C:/kipindi-house-bots` | Planning (ali-4c) | Session `ali-f6` reported that KYC-at-withdrawal is on origin/main and applied in production, and that its audit has P0/P1 fixes coming. Verified P0.1 and the commit series; recorded the blob hash for P0.3. Added the coordination section and the atomic-permission rule to the prompt. Relayed everything to the new session `ali-e4`. | P0 partly done; ⛔ hold before P0.4 for ali-f6's fixes |
| 2026-09-13 | Ali-Blade15 | `C:/kipindi-main`, `C:/kipindi-house-bots` | Planner | Moved the plan into git on branch `house-bots` with this tracker, README and prompt. A fresh-machine simulation and a mechanics check found 26 issues (push-to-main override, rebase on a shared branch, Windows path/shell syntax, local Postgres recipe, checksum on CRLF, missing A23/G1/G2 placement, post-REL-4 recording, release criteria). All fixed. An independent re-check confirmed 26/26 and found 7 follow-ups, also fixed (REL-4 release worktree, merge-not-rebase everywhere, LF/CRLF checksums, server DATABASE_URL, sync fallback, dpl compare, migrate-status target). | Build not started; P0 blocked on the KYC push |
| 2026-09-13 | Ali-Blade15 | — | Planning | Code map (8 agents) → 3 slice designs → 3 adversarial reviews (50 findings) → 2 plan critics (35) → scenario register (241) → sealed flows + design spec → verified amendments. Ali approved the plan; decisions D1–D16. | Plan approved |

## Rules for updating this file
1. **Same commit as the work.** Change Status now, RESUME AT, and the rows you touched in the commit that did the work. Push `house-bots` immediately.
2. **Never rebase `house-bots`.** It is shared across machines. Bring in `main` with `git merge --no-edit origin/main`; take other machines' work with `git merge --ff-only origin/house-bots`, or `--no-edit` if both sides have commits.
3. **Stopping mid-commit** (end of session, machine trouble): commit what exists as `WIP house-bots: <what>`, write the exact state into RESUME AT (done / half-done / next command), push. WIP commits are fine on this branch.
4. **git is the truth for code.** Record commit *subjects* and dates here, not SHAs as facts (`git log` has them).
5. **Never quote a recorded number as current** (counts, balances, ids); re-derive it and say when.
6. **A new machine** follows `README.md` steps 0–5 for tools, Postgres, the Railway login and the push guard. Secrets are not in git.
7. **At the end of every session**, add one Session log row (date · `hostname` · paths · what happened · where it stopped), even if nothing shipped.
