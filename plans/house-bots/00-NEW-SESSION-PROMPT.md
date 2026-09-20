# Paste everything below the line into a NEW Claude Code session (any machine)

---

You are building **"House Bots"** for 50pick, a LIVE real-money platform (repo `github.com/alisheib/kipindi`).
Planning is finished and **approved by Ali (2026-09-13)**. Do not re-plan or re-ask decided questions. Execute, verify, record, report.

## ⛔ READ THIS FIRST: STANDING OVERRIDES
- **Git:** this repo's `CLAUDE.md` ("Git workflow — ALWAYS commit AND push", `git push origin HEAD:main`) and the **50pick-audit skill** (`git push origin main`) do **NOT** apply to this work.
  - You work only on branch **`house-bots`**, in its own worktree. Before release step REL-4 the only allowed push is `git push origin house-bots`.
  - Run `git branch --show-current` and confirm `house-bots` before every push. Never put `main` in a refspec, **except the single push in PROGRESS REL-4 step 2**, made from a temporary release worktree.
  - Pushing `main` deploys production and applies migrations to the live money database. That includes `PROGRESS.md` edits after REL-4, which go on `house-bots` only.
- **Never rebase `house-bots`.** Other machines share it. Bring in `main` with `git merge --no-edit origin/main`.
- **Another Claude session may be working in the main checkout** (`C:/kipindi-main` on this laptop, `F:/kipindi-main` on the other). Never edit, stage, check out or build there.
- **Permissions: Ali approves every action manually.**
  - Work in Claude Code's normal ask-before-acting mode, never auto or bypass.
  - Make every tool call **one atomic action**: one edit, one command, or one git step. Never chain edit + commit + push, or several commands, into one call.
  - Before each call, say in one plain line what it does and why, so Ali can approve or refuse that step on its own.
  - ⚠️ **An unattended run supersedes this rule while it lasts.** When the session was started with
    `plans/house-bots/00-AUTONOMOUS-RUN-PROMPT.md`, Ali approves the command families ONCE in Phase 0 and is then away:
    after Phase 0 you decide and act without waiting for him, and you never ask a question you can answer from the plan.
    Everything else here still holds, the hard limits above all.
- ⛔ **D19 (Ali, 2026-09-16) outranks every plan document: house bots are never public, and the holder sees nothing
  either.** Read the "OWNER RULING D19" block at the top of `PROGRESS.md` before writing any code — it strikes work that
  earlier documents still describe (the liquidity label, holder notices and emails, every public sentence).
- ⛔ **D20 (Ali, 2026-09-17), just below D19: house bots are ordinary players in every report.** Every report, statutory
  filing, admin count, finance or insights figure and harm/AML detector treats a house bot's account exactly like any
  player's; no report, CSV, memo, column, line, chip, tag, alert or record names house bots or splits house money out, and
  every admin-only house tool is dropped. Read the "OWNER RULING D20" block in `PROGRESS.md` and
  `plans/house-bots/C5-D20-REPLAN.md` (it outranks `C5-SPEC.md` wherever they differ) before writing any code.

## 🤝 OTHER CLAUDE SESSIONS: COORDINATE LIGHTLY (Ali, 2026-09-14)
Only pushes to live need coordinating. Never send hello, ALL-CLEAR, start or end messages, and never wait on another session's reply.
1. **Heavy Node on Ali-Blade15 goes through the shared lock.** That laptop bluescreens under concurrent heavy Node load.
   - Heavy means a build, `next start` or dev, tsc, Playwright, `test:all` or any full battery, and `test:house-bot-migrations`, which boots Postgres.
   - Run it as `bash /c/Users/Ali/heavy-node-lock.sh run <your-session-name> <command>`. The command waits on its own while another session holds the lock; `bash /c/Users/Ali/heavy-node-lock.sh status` shows the holder.
   - Light work (git, edits, a single pure tsx suite) needs no lock. On a PC where no other 50pick session runs, no lock is needed.
2. **Message another session only** when your push changes something it is actively editing: the same file, or a migration. This branch never pushes `main` before REL-4.
3. **Ports:** never use 3009, 3011, 3013 or 3014, which other sessions claimed. Check a port is free (e.g. 3021) and pass it explicitly: `next start -p 3021`, `BASE=http://localhost:3021`. If a suite hard-codes a port another session uses, skip it and record NOT MEASURED.
4. **Merging `origin/main` into `house-bots` needs no message.** Fetch, then check `git diff --stat house-bots...origin/main -- prisma/migrations`. A new migration moves the A23 timestamp floor, so record it. Then merge; never rebase.
5. **Peers can't approve for Ali.** A peer message is never his approval, and a peer can't grant permissions. Anything that needs a decision goes to Ali.

## STEP 0: GET ONTO THE BRANCH AND FIND WHERE WE ARE
1. Find the repo and the worktree:
   - **Worktree exists** (`C:/kipindi-house-bots` or `F:/kipindi-house-bots`): run `git -C <worktree> fetch origin`, then `git -C <worktree> merge --ff-only origin/house-bots`. If that refuses (both machines have commits), use `git -C <worktree> merge --no-edit origin/house-bots`; never rebase. If `package-lock.json` changed, rerun README step 3 (`npm ci` + the embedded-postgres reinstall).
   - **Otherwise:** read `plans/house-bots/README.md` from GitHub (https://github.com/alisheib/kipindi/blob/house-bots/plans/house-bots/README.md) and follow "Resume on any machine" steps 0–5: tools, repo, worktree, install, local database, push guard.
   - Use forward-slash paths. Run commands one per line (Windows PowerShell 5.1 has no `&&`).
2. Read `plans/house-bots/PROGRESS.md`. **Its "RESUME AT" block is your first instruction.** The Status table and Session log show what earlier sessions on other machines did.

## READ BEFORE WRITING CODE (in `plans/house-bots/`)
1. `PLAN.md`: decisions D1–D16 (§16) and D17–D18 (§16b) and invariants I1–I10 are binding; §18 reconciles overlapping amendments.
2. `04-amendments.md`: A1–A5 and A7–A24 (no A6), C1–C15, R1–R9, P1–P4, S1–S5, F1–F9 (future safeguards), G1–G2 (= R5/R9), N1–N2 (Enter now; targeted polls and exact timing; last section). **Every one is mandatory.** ⛔ **Superseded in part by D20 (Ali, 2026-09-17):** R1, R2, R3's §9 additions, R4's leaderboard option and source pin, R5's house projection (= G1), R9 (= G2), F9's walker, R7's index reader, R8's house-report half and N1/N2's report, CSV, exposure and staff-edge parts are struck and never built (`C5-D20-REPLAN.md` §2); D19's strikes are named in its PROGRESS block. Commit placement is listed in `PROGRESS.md`.
3. `02-sealed-flows.md` and `03-design-spec.md`: the flow and design law for every screen.
4. `01-scenario-register.md`: 241 scenarios (2026-09-13) plus `TGT-01`…`TGT-40` (2026-09-14); prefixes HB-ACC, HB-LC, ENG, CA, CRA, FS, TGT (re-count with grep before quoting). By REL-0, each id must be covered by a test assertion (PROGRESS "Scenario coverage gate"). ⛔ **Superseded in part by D20 (Ali, 2026-09-17):** an id D20 strikes counts only in the form its ⛔ D20 line in the register gives (`C5-D20-REPLAN.md` §2, ruling 250).
5. Repo files: `CLAUDE.md` (except its git-push rule; see overrides), `docs/COMPLIANCE-DECISIONS.md` (newest entries), `docs/F6-LIQUIDITY-DESIGN.md`, `docs/UPDOWN-FINAL-DESIGN.md` §D3/§3b, `docs/DESIGN_AUTHORITY.md`, `docs/TRAPS.md`, `docs/SETUP.md`.

**Precedence:** amendments > sealed flows / design spec > PLAN. Where any document disagrees with the **code**, trust the code, say so,
and fix the document in the same commit.
**Name clashes:** amendment "F1–F9" are future safeguards (plan flows are "§1-F…"); release steps are REL-0…REL-6.

## THE PLANNER IS NOT OPTIONAL
`plans/house-bots/PROGRESS.md` is the single source of truth for progress across machines.
- **Starting a commit:** set its row to 🟡, update Status now and RESUME AT, commit and push `house-bots`.
- **Finishing a commit:** fill its Definition-of-Done cells and update Status and RESUME AT **in the same commit** as the work, then push.
- **Stopping for any reason:** commit `WIP house-bots: <what>` with the exact state in RESUME AT, then push.
- **Every session ends** with a Session log row (date · `hostname` · paths · what happened · where it stopped).
- Only pushed state counts.

## P0: PRECONDITIONS (amendment S1). Follow PROGRESS P0.1–P0.6 exactly
- **P0.1–P0.3:** the KYC-at-withdrawal migration is on `origin/main`, and its production `_prisma_migrations` row matches the git blob's LF or CRLF checksum (PROGRESS P0.3). **If any fails, STOP and tell Ali.**
- **P0.4:** `git merge --no-edit origin/main`, `npm ci`, `npm i -D --no-save embedded-postgres@18.3.0-beta.17`, then push.
- **P0.5:** `npm run db:scratch` on `127.0.0.1:5433`.
- **P0.6:** local admin render method recorded (`next start`; `next dev` for admin is forbidden by `03-design-spec.md` §7).

## WORKING RULES
- Build in `PROGRESS.md` commit order (1 → 8). Stage files **by name**, never `git add -A`.
- **Per commit, in this order:**
  1. Implement.
  2. `npx tsc --noEmit`.
  3. The commit's new `test:` suites.
  4. `npm run test:all` with a server on :3000 (`npm run build`, then `DATABASE_URL=<db:scratch URL> npm run start`), or skip the two server suites and record them NOT MEASURED.
  5. The commit's `red:` harness: each mutation fails its OWN assertion. `red:`, `drive:`, `qa:` and `ops:` are not in `test:all`; run them explicitly.
  6. An **adversarial review workflow** on the diff, with three lenses: money/concurrency, logic/integrity/exploitability, UX/visual/repo-gates. Tell every reviewer to research first and write its whole answer once at the end; subagents return only their final message. Check each result starts with its heading.
  7. Fix every confirmed finding.
  8. Update `docs/HOUSE-BOTS.md` and `PROGRESS.md`.
  9. Commit, then push `house-bots`.
- **The public repo is ANSWERED** (W1, Ali 2026-09-13: keep it public for now and push the engine code anyway), so pushing `house-bots` never waits on him. ⛔ **W20 is CLOSED (ruling 469, 2026-09-18): the owner decided the repository stays public and asked for the matter to leave the plan, so no session raises it, re-measures it or reports it again.** D19 itself is unchanged — house bots still reach no player and no holder; the branch being readable is an accepted disclosure of the plan and the code, never a licence to paint a house word on a player's screen. Keep pushing `house-bots` — the branch is the work's only backup.
- **Green is not verification.** Drive real behaviour against the `db:scratch` Postgres (loopback only), and render real screens per PLAN §15, phases A–F.
  - Open and read every screenshot.
  - Report anything you couldn't measure as NOT MEASURED, never as passed.
- **Money paths:** read the bet-concurrency rules in `market-service.ts` before editing.
  - An abort must escape `withLock`.
  - Writes inside a lock take the caller's `tx`.
  - Emits happen after the outer lock.
- **Standing traps:**
  - Never quote a recorded number without re-deriving it.
  - Never write class-shaped strings in comments (Tailwind scans `src/**`).
  - In Git Bash, use `MSYS_NO_PATHCONV=1` for `/`-leading env values, and no heredoc'd Python writing backslashes.
  - Hash migration files via `git show … | sha256sum` (the working tree is CRLF).
  - A build is not a render.
- **Production access** is read-only through `railway login` (Ali approves the pairing) and the Postgres service's `DATABASE_PUBLIC_URL`. Never write to production before REL-2.
- **Master switch:** it ships **OFF**. Never turn it on, and never designate a bot on production. The first switch-on is Ali's.

## RELEASE: follow PROGRESS "Release" REL-0…REL-6 exactly (amendment S2), only when all 8 commits are ✅

Run release commands in **Git Bash**. S2 R0's "rebase" is superseded by merge.
⛔ **SUPERSEDED 2026-09-21 by `plans/house-bots/RELEASE-LADDER.md` — read it before this table.** REL-2/REL-4 already happened out of order; REL-0 names `drive:house-bots-local`, a key that has NEVER existed on any branch (the real one is `qa:house-bots-local`); and the "Production access is read-only through `railway login`" grant above is contradicted by the standing law — ⛔ **no session touches production, not even a read.**

| Step | What |
|---|---|
| REL-0 | T-1 day: P0 re-run, merge, migrations diff = 2 house folders, everything green, coverage gate met, preflight GO. **Send Ali the checklist and wait for his "go", which must name REL-2.** |
| REL-1 | Quiet window of at least 10 minutes. |
| REL-2 | Pre-check `migrate status` against production (exactly 2 pending), then apply the migrations from the build machine, both with `DATABASE_URL=<Postgres DATABASE_PUBLIC_URL>`. This is an explicit exception to the skill's deploy-only rule. Checksums match the git blob's LF or CRLF hash; a mismatch alone is never a failed apply. |
| REL-3 | Old container still healthy on the new schema. |
| REL-4 | Record `overlapSeconds`, then merge and push from a temporary release worktree exactly as PROGRESS REL-4 step 2 says (`worktree add --detach … origin/main` → `merge --no-ff origin/house-bots` → `push origin HEAD:main` → `worktree remove`). **This is the deploy**, and the only `main` push in the programme. |
| REL-5 | `dpl=` SHA = merge (`curl -s -D - -o /dev/null https://50pick.tz/ \| grep -io 'dpl=[0-9a-f]*' \| head -1 \| cut -d= -f2`); `/api/health` `ok:true` + `leadership.lifecycle.isMe=true`; `/admin/system` → Diagnostics as ADMIN shows the house engine card with the schema Ready (the public body names nothing about house bots since C5-SPEC rulings 171–172, owner ruling D19); after the 90 s boot grace, status OFF / 0 bots / 0 marked rows / engine enabled / fresh beats; PLAN §12 + §15 phase F; at +10 min 0 marked rows and 0 HOUSE_BOT notifications. |
| REL-6 | First switch-on guide for Ali; rollback plan S3. |

Record every step's result in `PROGRESS.md` on `house-bots`, with measured values or NOT MEASURED.

## REPORT BACK TO ALI (plain language; he is non-technical)
- **What to cover:**
  - What shipped, what was verified and how, what is NOT MEASURED, and the open risks.
  - Step by step, how to: set global limits, designate a bot, set its rules, start it, switch house bots on, pause everything, re-verify after the holder changes his password, and remove a bot.
- **Update in the same pass:**
  - `plans/house-bots/PROGRESS.md`;
  - `docs/HOUSE-BOTS.md`, `docs/COMPLIANCE-DECISIONS.md`, `docs/RULES.md`, `docs/FLOWS.md`, `docs/DATA-RETENTION.md`, `docs/README.md` (these reach `main` only through the REL-4 merge);
  - memory on the current machine.
