# House Bots — START HERE (any machine, any session)

**What this is:** the approved plan and live progress tracker for **House Bots**. The owner designates real 50pick accounts, and a
server engine stakes from them on Up & Down rounds and polls, so players see real money to win. It was planned and approved
2026-09-13 and is being built on branch **`house-bots`**. It never reaches `main` before release step REL-4.

**Where we are right now → [`PROGRESS.md`](PROGRESS.md)** (read its "RESUME AT" block first).
From a phone or any browser: https://github.com/alisheib/kipindi/blob/house-bots/plans/house-bots/PROGRESS.md

**What to tell a new session:** *"Continue House Bots — branch `house-bots`, start at `plans/house-bots/README.md`."*
(Nothing on `main` points here yet, so give the session this sentence.)

## Files
| File | What it is | Authority |
|---|---|---|
| `PROGRESS.md` | Status, resume point, commit checklist, release steps, session log | **The only record of progress** |
| `00-NEW-SESSION-PROMPT.md` | Paste into a new Claude Code session to build or resume | — |
| `04-amendments.md` | Verified amendments, all mandatory: A1–A5 and A7–A24 (there is no A6: it became R5/G1) · C1–C15 (C4–C7 are in the second-to-last section) · R1–R9 (R1–R4 in the second-to-last section) · P1–P4 (P1 in the second-to-last section) · S1–S5 · F1–F9 (future safeguards) · G1–G2 (= R5/R9) · N1–N2 (Enter now; targeted polls and exact timing; last section) | **1st** |
| `02-sealed-flows.md` | Every flow step by step (password lifecycle in depth) | 2nd |
| `03-design-spec.md` | Screen-by-screen design law and the render/responsive protocol | 2nd |
| `PLAN.md` | Approved plan: decisions D1–D16 and D17–D18 (§16b), invariants I1–I10, flows §1-F1…F11, data, engine, console, verification; §18 reconciles overlaps | 3rd |
| `01-scenario-register.md` | 241 scenarios (2026-09-13) plus 40 `TGT-` scenarios (2026-09-14); prefixes HB-ACC, HB-LC, ENG, CA, CRA, FS, TGT; re-count with grep. Each has its expected behaviour and test | reference |

**Order of authority:** `04-amendments.md` > `02-sealed-flows.md` / `03-design-spec.md` > `PLAN.md`. Where any of them
disagrees with the code, trust the code and fix the doc in the same commit.
**Name clashes:** "F1–F9" in amendments are *future safeguards*; plan flows are cited as "§1-F1…F11". Release steps are
"REL-0…REL-6", not to be confused with amendments R1–R9 or preconditions P0.x.
**Never rebase:** any "rebase" instruction in these documents (e.g. S2 R0, the scenario register) is superseded by merging
`origin/main`, because the branch is shared across machines.

## Resume on any machine
Use **forward slashes** in paths (they work in Git Bash, PowerShell and cmd). Run each command on its own line; Windows
PowerShell 5.1 cannot parse `&&`.

**0. Tools**
- `node -v` must print 24.x; under Node 22 suites fail falsely.
- Run `npx playwright install chromium` once per machine.

**1. Find or get the repository**
- **Existing clone:** look before cloning. This laptop uses `C:/kipindi-main`; the other laptop uses `F:/kipindi-main`. Check with `git -C C:/kipindi-main worktree list` or `git -C F:/kipindi-main worktree list`.
- **If one exists:** `git -C <repo> fetch origin`. That's safe even if another session works there: fetch never touches its working tree.
- **If none exists:** `git clone https://github.com/alisheib/kipindi.git C:/kipindi-main`.
- **Everywhere below,** `<repo>` is that path. Put the worktree next to it (`C:/kipindi-house-bots` or `F:/kipindi-house-bots`), and record the paths in your Session log row.

**2. Get the House Bots worktree**
- **Folder missing:**
  1. `git -C <repo> worktree prune`
  2. `git -C <repo> worktree add <worktree> house-bots`

  Git creates the local branch tracking `origin/house-bots`. Never use `-b house-bots`; the branch already exists on origin. Then run the "Folder exists" steps below, in case a stale local `house-bots` branch was reused.
- **Folder exists:**
  1. `git -C <worktree> fetch origin`
  2. `git -C <worktree> merge --ff-only origin/house-bots`

  If `--ff-only` refuses because both machines have commits, use `git -C <worktree> merge --no-edit origin/house-bots`. **Never rebase this branch.** If `package-lock.json` changed, redo step 3.

**3. Install**
1. `cd <worktree>`
2. `npm ci` (own `node_modules`, never a junction to another folder).
3. After every `npm ci`: `npm i -D --no-save embedded-postgres@18.3.0-beta.17`. `npm ci` deletes it, and `npm run db:scratch` needs it.

**4. Local database and secrets**
- **No `.env`:** there is none in this repo, and there should not be (`docs/SETUP.md`).
- **Local Postgres:** `npm run db:scratch` gives PostgreSQL 18.3 on `127.0.0.1:5433`, loopback only. See `scripts/db-scratch.mts` and `docs/BACKUP-RUNBOOK.md` → "The scratch cluster".
- **Production:** read **only** through the Railway CLI.
  1. `railway login`: Ali approves the pairing.
  2. `railway link` the 50pick project, production environment.
  3. For database reads, use the **Postgres** service's `DATABASE_PUBLIC_URL` (`railway variables --service Postgres`). The app's `DATABASE_URL` is an internal host that doesn't resolve from a laptop.

**5. Recommended guard against pushing `main` by accident** (once per machine)
1. `git -C <repo> config extensions.worktreeConfig true`
2. `git -C <worktree> config --worktree core.hooksPath <worktree>-hooks`
3. Create `<worktree>-hooks/pre-push` containing:
   ```sh
   #!/bin/sh
   while read l s r x; do case "$r" in refs/heads/main) echo "BLOCKED: house-bots worktree may not push main before REL-4"; exit 1;; esac; done
   exit 0
   ```
This affects only this worktree. The main checkout keeps its normal behaviour.

**6. Start a new Claude Code session** and paste `plans/house-bots/00-NEW-SESSION-PROMPT.md`.

## ⛔ Standing overrides for anyone working in the House Bots worktree
- **CLAUDE.md** ("Git workflow — ALWAYS commit AND push", `git push origin HEAD:main`) and the **50pick-audit skill** (`git push origin main`) do **NOT** apply here.
  - Before REL-4 the only allowed push is `git push origin house-bots`.
  - Run `git branch --show-current` and confirm `house-bots` before every push. Never put `main` in a refspec, **except the single push in PROGRESS REL-4 step 2**, made from a temporary release worktree.
- **Pushing `main` is a live deploy** (any push, even docs-only), and the start script applies database migrations. That includes `PROGRESS.md` edits after REL-4: record them on `house-bots` only.
- **Never build, stage or check out in a checkout another session is using.**
- **Pushing `house-bots` is safe:** CI runs only on `main` and PRs, and Railway deploys `main`.
