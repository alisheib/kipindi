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
| **Current step** | P0: preconditions |
| **Blocked on** | The KYC-at-withdrawal work is not on `origin/main`. On 2026-09-13 its migration `20260913120000_kyc_at_withdrawal` existed only in an unpushed local commit ("KYC AT WITHDRAWAL (1/n)") on Ali-Blade15. It must be on `origin/main` and applied in production first (amendment S1). |
| **Production** | Nothing deployed. The feature does not exist in production. |
| **Master switch** | n/a (ships OFF at release; Ali turns it on himself) |
| **Last updated** | 2026-09-13 · Ali-Blade15 · planning session (planner verified by a fresh-machine simulation) |

## ▶ RESUME AT (overwrite this block every time you stop)
1. Get onto the branch on whatever machine you are on: `README.md` → "Resume on any machine" (steps 0–5).
2. Run **P0.1–P0.3**. If any fails, **STOP**: tell Ali the build is waiting for the KYC session to push its migration and apply it in production. Do not start Commit 1.
3. When P0.1–P0.3 pass:
   - **P0.4:** merge `origin/main` into `house-bots` + `npm ci`.
   - **P0.5 and P0.6.**
   - Start **Commit 1**: set its row to 🟡 and push that change first.

## Legend
⬜ not started · 🟡 in progress · ✅ done (date · machine · commit subject) · ⛔ blocked (reason) · ⏭️ skipped by Ali's ruling · — not applicable

---

## P0: preconditions (amendment S1)
Run in **Git Bash** from the worktree.

| # | Check | Status |
|---|---|---|
| P0.1 | `git fetch origin`, then `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` succeeds | ⬜ |
| P0.2 | `git log origin/main --oneline --grep "KYC AT WITHDRAWAL"` lists the series, and the topmost RESUME AT in `docs/LIVE-QA-CAMPAIGN.md` §6b on `origin/main` says the KYC-at-withdrawal work is pushed and its migration applied in production | ⬜ |
| P0.3 | See the three steps below | ⬜ |
| P0.4 | **Merge, never rebase:** `git merge --no-edit origin/main` on `house-bots`, then `npm ci` + `npm i -D --no-save embedded-postgres@18.3.0-beta.17`, then push `house-bots` | ⬜ |
| P0.5 | `npm run db:scratch` starts PostgreSQL on `127.0.0.1:5433` (loopback only) | ⬜ |
| P0.6 | Local admin render method, recorded: ______ | ⬜ |

**P0.3: production migration row matches the file**
1. **Expected checksum:** `git show origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql | sha256sum`. Hash the **git blob**, never the checked-out file (core.autocrlf adds CRLF) and never through a PowerShell pipe.
2. **Connect:** `railway login` (Ali approves the pairing), then `railway link` to 50pick/production. Use the Postgres service's `DATABASE_PUBLIC_URL`.
3. **Query, read-only:** `select migration_name, checksum, finished_at, rolled_back_at from _prisma_migrations where migration_name like '%kyc_at_withdrawal'`.
   - **GO** only if the checksum equals step 1, `finished_at` is set and `rolled_back_at` is null.

**P0.6: local admin render**
1. `npm run build`, then `npm run start` with the `db:scratch` database, a seeded owner and `DISABLE_ADMIN_TOTP=true`.
2. Open `/admin` and read the screenshot.
3. Record "phase D = next start: WORKS / NOT MEASURED". `next dev` for admin stays forbidden (`03-design-spec.md` §7) unless an amendment changes it.

---

## Build: 8 commits (PLAN §11; amendment placement per `04-amendments.md`)

**Definition of done, identical for every commit:**
- **impl:** implemented.
- **tsc:** `npx tsc --noEmit` clean.
- **suites:** the commit's new `test:` suites pass.
- **all:** `npm run test:all` green, with `npm run start` serving `:3000`.
  - Without a server, skip the two server suites (see `scripts/test-all.mjs` header for the exact `--skip` names) and record them NOT MEASURED.
- **red:** its `red:` harness passes, with each mutation failing its own assertion.
- **drive:** real behaviour driven or rendered as the commit requires, with screenshots opened and read.
- **review:** the adversarial review workflow ran with 3 lenses. Reviewers write their answer once at the end, and every confirmed finding is fixed.
- **docs:** `docs/HOUSE-BOTS.md` and this file updated.
- **push:** `house-bots` pushed (branch confirmed with `git branch --show-current` first).

| # | Commit | Status | impl | tsc | suites | all | red | drive | review | docs | push |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Docs of record · schema · migrations · DAL · pure modules | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
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

**Commit 2: money seam**
- **Seam:** `placeHouseBet` + `buyPositionGuarded`; H0–H9; bet context (A7); lock timeouts (A9 seam); scope predicate + H3 refusals (A12 seam).
- **Exit and pool:** exit-window formula byte-identical (A14); locked pool + fresh price in H3 (A15 seam).
- **Settlement paths:** wagering reversal skipped everywhere + labels (A17); sanctioned changes (a)–(q) (A18); holder-vs-own-bot hook (A21 seam); gate parity (F3).
- **Suites:** `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-caps`.
- **RED:** `red:house-bot-money`.

**Commit 3: designation services (no console actions yet)**
- Eligibility with contexts.
- Password verification: reserved attempts, never a session (C4 service side).
- Consent void, service side (A3); password history (A4); erasure refusal + pseudonymising + `house_bot_live` (A5 erasure, R6); recipients (A22).
- `HOUSE_BOT` notification kind + `notifyHouseBotOwner` + owner email template.
- **Suites:** `test:house-bot-designation`.

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

**Commit 5: reporting and data rights**
- §9 splits; house-liquidity report + CSV (R1); exposure everywhere (R2); statutory notes (R3); no rewards on house stakes (R4, F9).
- DSAR views (R5 = G1); durable audit readers (R8); `houseStake` in decision audits + KYC card (R9 = G2).
- Resolver display (§1-F11); holder chip + SellButton `houseStake`.
- **Suites:** `test:house-bot-reports`, plus `test:dsar-secrets` and `test:erasure` additions.

**Commit 6: public text**
- Rulebook §8 carve-out + disclosure (en/sw/zh); Terms §4; privacy notice (P1); META bumps; §10 waiver record (P2); FAQ; chatbot bullet.
- **Suites:** `test:house-bot-disclosure`.

**Commit 7: console**
- **Routes and wizard:** `/admin/house-bots` routes, tabs and views; wizard + UserPicker (C5); rules and limits forms (C1, C2, C6, C14, C15).
- **Password UI (C4 console side):** `autoComplete=new-password` + password-manager ignore attributes; busy latch + `submitId`; the re-verify "start again" checkbox; reserved-attempts copy.
- **Dialogs and states:** modals (C3, C7); switch and Start states (C10); live strip (C11); re-auth / STALE_BUILD / drafts (C12); consent UX (C8, C9).
- **Wiring:** nav/RBAC; console audit pins (R7); FAILURE-INVENTORY §6.
- **Ops scripts:** `ops:house-bots-off` (A9); `--drift` / `ops:house-bots-remark` (S3); feature state + `ops:house-bots-sunset` (F2).
- **Suites:** `test:house-bot-console`.
- **RED and visual:** `red:house-bot-console`; `qa:house-bots-visual`.

**Commit 8: end-to-end and release prep**
- **Ops scripts:** `seed:house-bots-local`, `drive:house-bots-local`, `ops:house-bots-status`, `ops:preflight-house-bot-migrations` (A23).
- **Rehearsals (S4):** migrations under load, rollback, two processes, audit burst, two-admin ON.
- **Docs:**
  - risks 8–12 (S5);
  - runbooks: S3, F2, and A23 (deploy with the switch OFF unless the 60 s overlap is verified; roll back only with the switch OFF and 0 open marked positions);
  - final docs (P4: RULES §2.11, FLOWS §9, FAILURE-INVENTORY §7.1, AGENT-PROGRAMME §5, DATA-RETENTION);
  - A1 record.
- **Scenario coverage gate** (below).

### Scenario coverage gate (before REL-0)
Every scenario id in `01-scenario-register.md` (`HB-ACC-*`, `HB-LC-*`, `ENG-*`, `CA-*`, `CRA-*`, `FS-*`) must appear in at
least one house-bot test assertion name or comment, or be listed here with a reason.

| Metric | Value |
|---|---|
| Ids in register | 241 on 2026-09-13 (CA 57 · CRA 37 · ENG 52 · FS 41 · HB-ACC 59 · HB-LC 52). Re-count with grep before quoting. |
| Ids covered by tests | ⬜ not measured yet |
| Exceptions (id · reason) | — |

---

## Release (amendment S2 steps R0–R6, called REL-0…REL-6 here): only after all 8 commits are ✅
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
1. **Pre-check:** `npx prisma migrate status` against production shows exactly the 2 house migrations pending.
2. **Apply:** `MSYS_NO_PATHCONV=1 DATABASE_URL=<Postgres DATABASE_PUBLIC_URL> npx prisma migrate deploy`.
3. **Verify:** both rows finished, and each row's checksum equals `git show HEAD:<migration file> | sha256sum`.
4. **On failure:** follow the S2 recovery (preflight `--post`, then `migrate resolve --rolled-back`). Never leave a failed row.
5. ⚠️ **This is an explicit exception** to the 50pick-audit skill's "migrations reach production only through the deploy". It is needed because the start script applies DDL while the old container still serves. It must be named in Ali's REL-0 "go" and recorded in the COMPLIANCE entry.

**REL-4: merge and deploy**
1. Read the live service config and record `overlapSeconds`. An outage is expected only if it is null; the switch stays OFF regardless.
2. Merge `house-bots` into `main` as one merge commit, then push. **This is the deploy.**

**REL-5: post-deploy checks, within 10 minutes**
- `curl -s -D - -o /dev/null https://50pick.tz/ | grep -io 'dpl=[0-9a-f]*' | head -1` equals `git rev-parse origin/main`.
- `/api/health` shows `houseBots.schemaReady=true` and `leadership.lifecycle.isMe=true`.
- After the 90 s boot grace, `ops:house-bots-status` shows: OFF, 0 bots, 0 marked rows, engine enabled, beats fresh.
- PLAN §12 production checks and §15 phase F pass.
- **At +10 min:** 0 marked rows and 0 HOUSE_BOT notifications.

⛔ **From REL-4 on, record REL-5, REL-6 and every later change to this file on branch `house-bots` only.** A docs-only push to
`main` is another production deploy.

## ⏳ Waiting on Ali (owner defaults he may override; the build uses the default unless he says otherwise)
| # | Question | Default being built |
|---|---|---|
| W1 | GitHub repo is **public** | Ali (2026-09-13): "keep public for now, later we make private". ⚠️ **Before pushing Commit 4** (engine logic players could study to game the bots), ask Ali again: make the repo private first, or explicitly confirm pushing engine code publicly. Do not push Commit 4 until he answers. |
| W2 | What a *trigger* player sees in his data export (R5) | excluded days + countered count only |
| W3 | Terms §10 "in-app + SMS" promise can't be kept today (P2) | waived on Ali's ruling; defect recorded |
| W4 | Retention of skipped/expired intents (A20) | kept 7 years (proposal on file: 90 days) |
| W5 | Platform-wide sign-out on password change (A1) | not in this build (separate hardening) |
| W6 | A pointer to this planner in `main`'s CLAUDE.md / NEXT-PLAN | the House Bots session must NOT push `main` for it; whichever session next pushes `main` for its own work may add the row |

## 📓 Session log (append-only, newest first)
| Date | Machine | Paths | Session | What happened | Where it stopped |
|---|---|---|---|---|---|
| 2026-09-13 | Ali-Blade15 | `C:/kipindi-main`, `C:/kipindi-house-bots` | Planner | Moved the plan into git on branch `house-bots` with this tracker, README and prompt. A fresh-machine simulation and a mechanics check found 26 issues (push-to-main override, rebase on a shared branch, Windows path/shell syntax, local Postgres recipe, checksum on CRLF, missing A23/G1/G2 placement, post-REL-4 recording, release criteria). All fixed. | Build not started; P0 blocked on the KYC push |
| 2026-09-13 | Ali-Blade15 | — | Planning | Code map (8 agents) → 3 slice designs → 3 adversarial reviews (50 findings) → 2 plan critics (35) → scenario register (241) → sealed flows + design spec → verified amendments. Ali approved the plan; decisions D1–D16. | Plan approved |

## Rules for updating this file
1. **Same commit as the work.** Change Status now, RESUME AT, and the rows you touched in the commit that did the work. Push `house-bots` immediately.
2. **Never rebase `house-bots`.** It is shared across machines. Bring in `main` with `git merge --no-edit origin/main`; take other machines' work with `git merge --ff-only origin/house-bots`, or `--no-edit` if both sides have commits.
3. **Stopping mid-commit** (end of session, machine trouble): commit what exists as `WIP house-bots: <what>`, write the exact state into RESUME AT (done / half-done / next command), push. WIP commits are fine on this branch.
4. **git is the truth for code.** Record commit *subjects* and dates here, not SHAs as facts (`git log` has them).
5. **Never quote a recorded number as current** (counts, balances, ids); re-derive it and say when.
6. **A new machine** follows `README.md` steps 0–5 for tools, Postgres, the Railway login and the push guard. Secrets are not in git.
7. **At the end of every session**, add one Session log row (date · `hostname` · paths · what happened · where it stopped), even if nothing shipped.
