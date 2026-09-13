# Paste everything below the line into a NEW Claude Code session (any machine)

---

You are building **"House Bots"** for 50pick, a LIVE real-money platform (repo `github.com/alisheib/kipindi`; pushing `main` = live deploy).
Planning is finished and **approved by Ali (2026-09-13)**. Do not re-plan or re-ask decided questions. Execute, verify, record, report.

## STEP 0: GET ONTO THE BRANCH AND FIND WHERE WE ARE
1. Follow "Resume on any machine" in `plans/house-bots/README.md` on branch `house-bots`. The worktree is `C:\kipindi-house-bots`.
   - If you have no local copy yet: `git clone https://github.com/alisheib/kipindi.git C:\kipindi-main`, then `git -C C:\kipindi-main worktree add C:\kipindi-house-bots house-bots`.
2. `git -C C:\kipindi-house-bots pull --rebase`, then read `plans/house-bots/PROGRESS.md`. **Its "RESUME AT" block is your first instruction.** The Status table and Session log tell you what earlier sessions on other machines did.
3. Another Claude session may be working in `C:\kipindi-main`. **Never edit, stage, check out or build there.** Only work in `C:\kipindi-house-bots`.

## READ BEFORE WRITING CODE (in `plans/house-bots/`)
1. `PLAN.md`: decisions D1–D16 and invariants I1–I10 are binding; §18 reconciles overlapping amendments.
2. `04-amendments.md`: A1–A24, C1–C15, R1–R9, P1–P4, S1–S5, F1–F9. **Every one is mandatory.** Use its "Commit placement" tables.
3. `02-sealed-flows.md` and `03-design-spec.md`: the flow and design law for every screen.
4. `01-scenario-register.md`: 241 scenarios. By Release R0, each id must be covered by a test assertion (PROGRESS "Scenario coverage gate").
5. Repo files:
   - `CLAUDE.md`
   - `docs/COMPLIANCE-DECISIONS.md` (newest entries)
   - `docs/F6-LIQUIDITY-DESIGN.md`
   - `docs/UPDOWN-FINAL-DESIGN.md` §D3/§3b
   - `docs/DESIGN_AUTHORITY.md`
   - `docs/TRAPS.md`
   - your memory index

**Precedence:** amendments > sealed flows / design spec > PLAN. Where any document disagrees with the **code**, trust the code, say so,
and fix the document in the same commit.

## THE PLANNER IS NOT OPTIONAL
`plans/house-bots/PROGRESS.md` is the single source of truth for progress across machines.
- **Starting a commit:** set its row to 🟡, update Status now and RESUME AT, commit and push.
- **Finishing a commit:** fill its Definition-of-Done cells, update Status and RESUME AT in the **same commit** as the work, push.
- **Stopping for any reason:** commit `WIP house-bots: <what>` with the exact state in RESUME AT (done / half-done / next command), push.
- **Every session ends** with one new Session log row (date · machine from `hostname` · what happened · where it stopped).
- Only pushed state counts. Never push `main` before Release R4.

## P0: PRECONDITIONS (amendment S1). Stop and tell Ali if any fails
- `git fetch`; `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` succeeds. The KYC-at-withdrawal work, first local commit `ac411357`, plus follow-ups, must be on `origin/main`.
- Production `_prisma_migrations` row `…kyc_at_withdrawal`: `finished_at` set, `rolled_back_at` null, checksum = sha256 of the `origin/main` file.
- Then `git rebase origin/main` on `house-bots` and `npm ci` in the worktree (own `node_modules`, never a junction).

## WORKING RULES
- Build in PLAN §11 order (commits 1 → 8). Stage files **by name**, never `git add -A`. Push the branch after every commit. Rebase on `origin/main` often.
- **Per commit, in this order:**
  1. Implement.
  2. `npx tsc --noEmit`.
  3. The commit's new `test:` suites.
  4. `npm run test:all`.
  5. The commit's `red:` harness: each mutation fails its OWN assertion. `red:`, `drive:`, `qa:`, `ops:` are NOT in `test:all`; run them explicitly.
  6. An **adversarial review workflow** on the diff, with three lenses: money/concurrency, logic/integrity/exploitability, UX/visual/repo-gates. Tell every reviewer to research first and write its whole answer ONCE at the end; subagents return only their final message. Check each result starts with its heading.
  7. Fix every confirmed finding.
  8. Update `docs/HOUSE-BOTS.md` and `PROGRESS.md`.
  9. Commit, then push.
- **Green is not verification.** Drive real behaviour against local Postgres (`127.0.0.1:5433`, loopback-only guard), and render real screens per PLAN §15, phases A–F.
  - Open and read every screenshot.
  - Report anything you couldn't measure as NOT MEASURED, never as passed.
- **Local admin rendering:** PLAN §15 assumes `next dev` renders an empty admin body. The memory index now says `next dev` + in-memory store + `DISABLE_ADMIN_TOTP=true` renders admin. **Re-check first (P0.6).** Prefer real routes when they work; the static harness is the fallback.
- **Money paths:** read the bet-concurrency rules in `market-service.ts` before editing.
  - An abort must escape `withLock`.
  - Writes inside a lock take the caller's `tx`.
  - Emits happen after the outer lock.
- **Standing traps:**
  - Never quote a recorded number without re-deriving it.
  - Never write class-shaped strings in comments (Tailwind scans `src/**`).
  - In Git Bash, use `MSYS_NO_PATHCONV=1` for `/`-leading env values, and no heredoc'd Python writing backslashes.
  - A build is not a render.
- **Master switch:** it ships **OFF**. Never turn it on and never designate a bot in production. The first switch-on is Ali's.

## RELEASE (amendment S2): only when all 8 commits are ✅ in PROGRESS
| Step | Action |
|---|---|
| R0 | Re-run P0. Rebase. The migrations diff shows exactly the 2 house folders. All suites, `red`, `drive`, visual and S4 rehearsals green on this SHA. Preflight says GO. Scenario coverage gate met. **Send Ali the checklist and wait for his one-word "go".** |
| R1 | Pick a quiet hour: preflight shows bet volume, and it must not clash with the nightly trial balance. |
| R2 | From this machine: `MSYS_NO_PATHCONV=1 DATABASE_URL=… npx prisma migrate deploy`. On failure, follow S2 recovery. Never leave a failed migration row. |
| R3 | While the old container still serves: schema ready, `enabled=false`, health ok, Position inserts continue. |
| R4 | Merge `house-bots` into `main` as one merge commit, then push. It is one deploy, with a brief outage while `overlapSeconds` is null. |
| R5 | `dpl=` SHA = merge. `houseBots.schemaReady=true`. `ops:house-bots-status`: OFF, 0 bots, 0 marked rows, fresh beats. PLAN §12 production checks + §15 phase F. At +10 minutes: 0 marked rows. |
| R6 | Write Ali's "First switch-on" guide. Rollback plan: amendment S3. |

Record every R-step result in PROGRESS.md, with measured values or NOT MEASURED.

## REPORT BACK TO ALI (plain language; he is non-technical)
- **What to cover:**
  - What shipped, what was verified and how, what is NOT MEASURED, and the open risks.
  - Step by step, how to: set global limits, designate a bot, set its rules, start it, switch house bots on, pause everything, re-verify after the holder changes his password, and remove a bot.
- **Update in the same pass:**
  - `plans/house-bots/PROGRESS.md`;
  - `docs/HOUSE-BOTS.md`, `docs/COMPLIANCE-DECISIONS.md`, `docs/RULES.md`, `docs/FLOWS.md`, `docs/DATA-RETENTION.md`, `docs/README.md`;
  - the `docs/LIVE-QA-CAMPAIGN.md` §6b handoff;
  - memory on the current machine.
