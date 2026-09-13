# 🧭 House Bots — PROGRESS (the planner)

> **This file is the single source of truth for where House Bots stands.** It lives on branch **`house-bots`**
> of `github.com/alisheib/kipindi` at `plans/house-bots/PROGRESS.md`.
> Open it from anywhere, phone included:
> **https://github.com/alisheib/kipindi/blob/house-bots/plans/house-bots/PROGRESS.md**
>
> ⛔ A tracker that lags the work is worse than none, because the next session trusts it. Every session updates this file
> **in the same commit as its work** and pushes the branch. Only what is pushed counts; local folders on any machine do not.

## Status now
| | |
|---|---|
| **Overall** | 🟡 **PLANNED · build not started** |
| **Current step** | P0: preconditions |
| **Blocked on** | The KYC-at-withdrawal work (commit `ac411357`) sat only in `C:\kipindi-main` on Ali-Blade15 on 2026-09-13 and was not on `origin/main`. Its migration must be on `origin/main` and applied in production first (S1). |
| **Production** | Nothing deployed. The feature does not exist in production. |
| **Master switch** | n/a (ships OFF at release; Ali turns it on himself) |
| **Last updated** | 2026-09-13 · Ali-Blade15 · planning session |

## ▶ RESUME AT (overwrite this block every time you stop)
1. Get onto the branch on whatever machine you are on: see `README.md` → "Resume on any machine".
2. Run the **P0** checks below.
   - If `origin/main` does not yet contain `prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql`, **STOP.** Tell Ali the build is waiting for the KYC session to push, and do not start Commit 1.
3. When P0 passes:
   - `git rebase origin/main` on `house-bots`;
   - `npm ci` in the worktree;
   - start **Commit 1**, set its row to 🟡 and push that change first.

## Legend
⬜ not started · 🟡 in progress · ✅ done (date · machine · commit subject) · ⛔ blocked (reason) · ⏭️ skipped by Ali's ruling · — not applicable

---

## P0: preconditions (amendment S1)
| # | Check | Status |
|---|---|---|
| P0.1 | `git fetch` → `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` succeeds | ⬜ |
| P0.2 | The KYC session's final commit (named in its handoff) is on `origin/main` | ⬜ |
| P0.3 | Production `_prisma_migrations` row `…kyc_at_withdrawal`: `finished_at` set, `rolled_back_at` null, checksum = sha256 of the `origin/main` file | ⬜ |
| P0.4 | `house-bots` rebased onto that `origin/main`; worktree `C:\kipindi-house-bots` has its own `node_modules` (`npm ci`, never a junction) | ⬜ |
| P0.5 | Local Postgres on `127.0.0.1:5433` works, with the loopback-only guard (`docs/SETUP.md`) | ⬜ |
| P0.6 | Local admin rendering re-checked: `next dev` + in-memory + `DISABLE_ADMIN_TOTP=true` vs the static harness. Record the method that works: ______ | ⬜ |

---

## Build: 8 commits (PLAN §11; amendment placement per `04-amendments.md`)

**Definition of done, identical for every commit:**
- **impl:** implemented.
- **tsc:** `npx tsc --noEmit` clean.
- **suites:** the commit's new `test:` suites pass.
- **all:** `npm run test:all` green.
- **red:** its `red:` harness passes, with each mutation failing its own assertion.
- **drive:** real behaviour driven or rendered as the commit requires, with screenshots opened and read.
- **review:** the adversarial review workflow ran with 3 lenses, and every confirmed finding is fixed.
- **docs:** `docs/HOUSE-BOTS.md` and this file updated.
- **push:** the branch is pushed.

| # | Commit | Status | impl | tsc | suites | all | red | drive | review | docs | push |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Docs of record · schema · migrations · DAL · pure modules | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Money seam (`placeHouseBet`, gates, markers, exclusions) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Designation · eligibility · password verification (services) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Engine · notifications · holder hooks · money hooks | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Reporting · data rights · resolver exposure · holder chip | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Public text (Rules, Terms, privacy, FAQ, chatbot) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Console `/admin/house-bots` · nav/RBAC · ops scripts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Local end-to-end drive · rehearsals · final docs · release prep | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — | ⬜ | ⬜ | ⬜ | ⬜ |

### Scope per commit
Detail lives in `PLAN.md` + `04-amendments.md`. Names here are pointers, not specs.

**Commit 1: docs of record, schema, migrations, DAL, pure modules**
- **Docs:**
  - `docs/COMPLIANCE-DECISIONS.md` House-bots entry (D1–D16, supersedes, accepted risks).
  - `docs/HOUSE-BOTS.md` skeleton (names no script that doesn't exist yet).
  - Supersede notes on `F6-LIQUIDITY-DESIGN.md`, `UPDOWN-FINAL-DESIGN.md` and `feature-backlog.md`.
  - P3/P4 doc skeletons.
- **Schema + 2 migrations (S1 migration law):**
  - HouseBot, HouseBotControl, HouseBotRuntime, HouseBotAlertOnce, HouseBotEvent, HouseBotIntent tables.
  - `Position` and `Transaction` `houseBotId` markers.
  - `User.passwordSetAt/Via` + `emailSetByOfficerAt` (A4).
  - Consent-void, alert-outbox and `scopeFrom` columns (A3, A8, A11); BigInt caps (C1); `labelKey` (C2).
  - Retention rows (A20); indexes and runtime keys (A24).
- **Code:** DAL + in-memory twin; `src/lib/house-bot/{constants, pause-reasons, rules, clock}`; `server/house-bot/book.ts`.
- **Constants and policy:** `HOUSE_AUDIT` (R7), `PENALTY_BOXED` kind (R5), product policy (F1), rules parse/migrator (F4).
- **Suites:** `test:house-bot-rules`, `test:house-bot-migrations`, `test:dal-parity`.

**Commit 2: money seam**
- **Seam:** `placeHouseBet` + `buyPositionGuarded`; H0–H9; bet context (A7); lock timeouts (A9 seam); scope predicate + H3 refusals (A12).
- **Exit and pool:** exit-window formula byte-identical (A14); locked pool + fresh price (A15).
- **Settlement paths:** wagering reversal skipped everywhere + labels (A17); sanctioned changes (a)–(q) (A18); holder-vs-own-bot hook (A21); gate parity (F3).
- **Suites:** `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-caps`.
- **RED:** `red:house-bot-money`.

**Commit 3: designation services (no console actions yet)**
- Eligibility with contexts.
- Password verification: reserved attempts, never a session (C4 service side).
- Consent void (A3), password history (A4), closure/erasure + `house_bot_live` (A5, R6), recipients (A22).
- `HOUSE_BOT` notification kind + `notifyHouseBotOwner` + owner email template.
- **Suites:** `test:house-bot-designation`, `test:house-bot-holder-lifecycle`.

**Commit 4: engine**
- **Hooks and causes:** trigger hook + sweep; holder hook matrix (A2); causes and void (A3 engine side).
- **Engine core:** planner/poller/claims; outcome mapper (A10); `scopeFrom` (A11); market view (A13); lifecycle table (A16); audits outside locks (A19); runtime robustness (A24).
- **Kill switch:** OFF write order (A9).
- **Alerts:** notifications §7 + C13 matrix; money hooks.
- **Other:** penalty box event (R5); holder hook not env-gated (R6); retention pass (P3).
- **Future safeguards:** F5 bounds revalidation, F6 channel policy, F7 no module state, F8 raw-SQL writers.
- **Suites:** `test:house-bot-engine`, `test:house-bot-info-edge`, `test:house-bot-comms`.
- **RED:** `red:house-bot-engine`.

**Commit 5: reporting and data rights**
- §9 splits; house-liquidity report + CSV (R1); exposure everywhere (R2); statutory notes (R3); no rewards on house stakes (R4, F9).
- DSAR views (R5); durable audit readers (R8); `houseStake` in decision audits + KYC card (R9).
- Resolver display (F11); holder chip + SellButton `houseStake`.
- **Suites:** `test:house-bot-reports`, plus `test:dsar-secrets` and `test:erasure` additions.

**Commit 6: public text**
- Rulebook §8 carve-out + disclosure (en/sw/zh); Terms §4; privacy notice (P1); META bumps; §10 waiver record (P2); FAQ; chatbot bullet.
- **Suites:** `test:house-bot-disclosure`.

**Commit 7: console**
- **Routes and wizard:** `/admin/house-bots` routes, tabs and views; wizard + UserPicker (C5); rules and limits forms (C1, C2, C6, C14, C15).
- **Dialogs and states:** modals (C3, C7); switch and Start states (C10); live strip (C11); re-auth / STALE_BUILD / drafts (C12); consent UX (C8, C9).
- **Wiring:** nav/RBAC; console audit pins (R7); FAILURE-INVENTORY §6.
- **Ops scripts:** `ops:house-bots-off` (A9); `--drift` / `ops:house-bots-remark` (S3); feature state + `ops:house-bots-sunset` (F2).
- **Suites:** `test:house-bot-console`.
- **RED and visual:** `red:house-bot-console`; `qa:house-bots-visual`.

**Commit 8: end-to-end and release prep**
- **Ops scripts:** `seed:house-bots-local`, `drive:house-bots-local`, `ops:house-bots-status`, `ops:preflight-house-bot-migrations`.
- **Rehearsals (S4):** migrations under load, rollback, two processes, audit burst, two-admin ON.
- **Docs:** risks 8–12 (S5); runbooks (S3, F2); final docs (P4: RULES §2.11, FLOWS §9, FAILURE-INVENTORY §7.1, AGENT-PROGRAMME §5, DATA-RETENTION); A1 record.
- **Scenario coverage gate** (below).

### Scenario coverage gate (before Release R0)
Every scenario id in `01-scenario-register.md` (`HB-ACC-*`, `HB-LC-*`, `ENG-*`, `CA-*`, `CRA-*`, `FS-*`) must appear in at
least one house-bot test assertion name or comment, or be listed here with a reason.

| Metric | Value |
|---|---|
| Ids in register | 241 (re-count with grep before quoting) |
| Ids covered by tests | ⬜ not measured yet |
| Exceptions (id · reason) | — |

---

## Release (amendment S2): only after all 8 commits are ✅
| Step | What | Status |
|---|---|---|
| R0 | P0 re-run · rebase · migrations diff shows exactly the 2 house folders · all suites, red, drive, visual, rehearsals green on this SHA · preflight GO · **checklist sent to Ali, his "go" received** | ⬜ |
| R1 | Quiet hour chosen (preflight bet volume; not during nightly trial balance) | ⬜ |
| R2 | Migrations applied to production from this machine (`MSYS_NO_PATHCONV=1 DATABASE_URL=… npx prisma migrate deploy`) | ⬜ |
| R3 | Old container still healthy: schema ready, `enabled=false`, health ok, Position inserts continuing | ⬜ |
| R4 | `house-bots` merged into `main` as one merge commit, then pushed (this is the deploy) | ⬜ |
| R5 | `dpl=` SHA = merge · `houseBots.schemaReady=true` · `ops:house-bots-status` OFF / 0 bots / 0 marked rows / fresh beats · §12 + §15-F checks · +10 min re-check | ⬜ |
| R6 | "First switch-on" guide delivered to Ali | ⬜ |
| — | Ali switches house bots ON (his action, not a session's) | ⬜ |

## ⏳ Waiting on Ali (owner defaults he may override; the build uses the default unless he says otherwise)
| # | Question | Default being built |
|---|---|---|
| W1 | Make the GitHub repo private | Ali: "keep public for now, later we make private" (2026-09-13) |
| W2 | What a *trigger* player sees in his data export (R5) | excluded days + countered count only |
| W3 | Terms §10 "in-app + SMS" promise can't be kept today (P2) | waived on Ali's ruling; defect recorded |
| W4 | Retention of skipped/expired intents (A20) | kept 7 years (proposal on file: 90 days) |
| W5 | Platform-wide sign-out on password change (A1) | not in this build (separate hardening) |

## 📓 Session log (append-only, newest first)
| Date | Machine | Session | What happened | Where it stopped |
|---|---|---|---|---|
| 2026-09-13 | Ali-Blade15 | Planning | Code map (8 agents) → 3 slice designs → 3 adversarial reviews (50 findings) → 2 plan critics (35) → scenario register (241) → sealed flows + design spec → verified amendments. Ali approved the plan; decisions D1–D16. Branch `house-bots` created with the plan documents and this tracker. | Build not started; P0 blocked on the KYC push |

## Rules for updating this file
1. **Same commit as the work.** Change Status now, RESUME AT, and the rows you touched in the commit that did the work. Push immediately.
2. **Stopping mid-commit** (end of session, machine trouble): commit what exists as `WIP house-bots: <what>`, write the exact state into RESUME AT (what's done, what's half-done, next command), push. WIP commits are fine on this branch; **never push to `main` before Release R4.**
3. **git is the truth for code.** Record commit *subjects* and dates here, not SHAs as facts (`git log` has them).
4. **Never quote a recorded number as current** (counts, balances, ids); re-derive it and say when.
5. **A new machine** has none of the secrets. `.env` files, Railway CLI login and local Postgres are set up per `docs/SETUP.md` and are not in git.
6. **At the end of every session**, add one Session log row, even if nothing shipped.
