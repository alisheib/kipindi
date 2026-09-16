# Paste everything below the line into a NEW Claude Code session (OMEGA-COMPILE01) — the all-day unattended run

---

Continue building **House Bots** for 50pick on branch `house-bots` of github.com/alisheib/kipindi. Follow `plans/house-bots/00-NEW-SESSION-PROMPT.md` and `plans/house-bots/PROGRESS.md`; **PROGRESS's RESUME AT is your first build instruction.**

## ⏱ PHASE 0 — the first minutes, while Ali is still here (do this BEFORE any build work)

Ali will be away all day. He approves permissions and answers questions **only now**. After Phase 0 you never wait on him.

1. **Fetch and read, fast:** `git fetch origin`; read PROGRESS "Status now", RESUME AT, "Waiting on Ali", "💡 Proposed extra controls" and "🧷 Later — sealing to-do" (L6 and L23–L24 are this run's); skim C4-SPEC §6 rulings 143–162 (the D19 un-build, X7, step 11); **read PROGRESS's "OWNER RULING D19" block in full.**
2. **Ask nothing, but tell Ali one thing: W20.** The GitHub repository is still **public** (measured 2026-09-16 15:25 UTC),
   and D19 says house bots are never public. Only he can change it: GitHub → Settings → General → Danger Zone → Change
   visibility → Private, then check Railway still deploys `main`. Say it once, in one line, and carry on either way.
   ⛔ Do NOT re-ask W1–W19 or X3/X7/X8: they are recorded in
   PROGRESS "Waiting on Ali", and **owner ruling D19 (2026-09-16) — house bots are never public** — is recorded at the
   top of PROGRESS and in `docs/COMPLIANCE-DECISIONS.md`. Read D19 before any code: it removes work that is already
   built. Ali's standing instruction is to decide the rest yourself. The one item flagged for him and a lawyer (W2, a
   trigger player's data export vs the PDPA access right) is **not** a blocker: build the recorded default and move on.
   If something genuinely new appears, put it in "Waiting on Ali" with a recommended default and build the default.
3. **Permissions, once.** Tell Ali in one plain list which command families this run needs, then exercise ONE harmless instance of each so every prompt appears now, not at 3 pm: `git fetch/add/commit/push origin house-bots` · `npm run --silent test:<key>` (incl. the two-store suites that boot the scratch Postgres on :5433) · `npx tsc --noEmit`, `npx esbuild`, `npx tsx` · `node <scratchpad>/*.mjs` (mutation harnesses) · PowerShell `New-Item -ItemType Junction` and `[System.IO.Directory]::Delete` (never Git Bash `cmd /c rmdir` — MSYS mangles `/c`), `git worktree add/remove` · `npx next dev -p 3021` / `next start -p 3021` for renders + a Playwright screenshot script · `date -u`. If Ali wants fewer prompts, offer (don't apply without his explicit yes) an allowlist via the `update-config` skill scoped to those families and to `git push origin house-bots` only.
4. **Say "Phase 0 done — running unattended"**, push PROGRESS with Ali's answers, and start.

## 🏃 THE UNATTENDED RUN — at least THREE plan commits

**Goal:** close Commit 4 (engine), then Commit 5 (reporting · data rights · resolver exposure · staff edge per ruling 78 — its holder chip and holder copy are struck by D19c), then Commit 6 (now the NON-disclosure commit: the private Gaming Board draft, the chatbot guard, the docs and the suite that proves the absence), and continue into Commit 7 (console) if context remains. Ali's cadence and quality bar still hold: a commit closes only when it is right logically (both stores, mutations aimed at every covered branch, `node scripts/test-all.mjs --skip responsive,motion` compared red-by-red against clean `origin/main` in `F:/kipindi-old-build`, the 3-lens review) and visually (every surface it produces rendered at 1280 and 360 and every bell and email rendered, each screenshot opened and read; the platform UI kit and the existing templates are the only look — a surface that invents its own look or words is a defect).

**What is left, in order** (PROGRESS RESUME AT 4b ⬜ item 4 is authoritative; §5 steps 1–11 are built, the D19
un-build and X7 are done, and rulings 143–162 are taken):
1. **Finish step 11** (two items; `red:house-bot-engine` already runs green — 22 caught, 0 missed, 0 not measured,
   0 files left dirty, 2026-09-16 — and any run of it must stay that way: act on every MISSED / WRONG-ASSERTION /
   STALE line by fixing the case or the anchor, never by loosening an assertion):
   (a) **declare the mutations the new cases still lack** — L1 (the hook removed from
   the call site → 18.77), L2 (the trigger run inside the admission slot or the lock → 18.80a–c), L3 (the sweep timer
   not started, or the lease check skipped → 11.30/11.31), L4 (the wrong counterparty id → 18.L4a–c), and 11b's EXPLAIN
   pins (a read rewritten so it cannot use its partial index → the matching money 7.x pin); (b) **L6** — a double sweep
   at leader failover writes one row per stake (two processes over one pass, reusing
   `scripts/lib/house-bot-two-process-child.mts`), with a case on Postgres and a mutation.
2. **Commit 4's closing gates.** (a) **Merge `origin/main` first.** At the last handover it was `b726cb7f` (21 commits,
   SMS on Blackball) and it brings `20260916120000_sms_message`, which sorts AFTER both house migration folders — so
   `git mv` them past it (`20260916150000_house_bot_tables` / `20260916150100_house_bot_markers`, re-checked against
   whatever `main` has by then) and update `prisma/schema.prisma`, `docs/HOUSE-BOTS.md`, `C4-TRIGGER-EXTRACT.md`, this
   prompt and PROGRESS standing fact 5. A read-only `git merge-tree --write-tree house-bots origin/main` showed two
   conflicts, `scripts/dal-parity.test.mts` and `src/lib/server/auth-service.ts`. Then `npx prisma generate`, tsc, and
   the house suites on both stores. (b) Move `F:/kipindi-old-build` to the same `origin/main` and run
   `node scripts/test-all.mjs --skip responsive,motion` in both trees, comparing red by red. (c) `verify:house-bot-bundle`
   on a fresh build, `qa:house-bot-holder-view` (read every screenshot), the full `red:house-bot-money`. (d) The 3-lens
   adversarial review as a Workflow (**Ali authorises it**: money/concurrency · logic/integrity/exploitability ·
   UX/visual/repo gates; each reviewer researches first and writes its whole answer once) — give every reviewer D19 and
   ask one of them to hunt for anything a player or holder could still see. (e) Fix every confirmed finding with a case
   and a mutation. (f) Docs: `docs/HOUSE-BOTS.md` §4 and §12 and its stale counts line (re-derive every number), the
   PROGRESS Commit 4 row ✅, push.
3. Then **Commit 5** from `C5-SPEC-EXTRACT.md` — read its D19c banner first. Its reports, CSV, staff-edge,
   resolver-exposure and data-rights work stands; its holder-facing half (the holder chip, `SellButton`'s `houseStake`,
   the activity-feed chip, item 12) is struck. Take its 30 open points as rulings in a new `C5-SPEC.md` §6 **before any
   code**, adjusted for D19: the holder's own export carries no house section (W2's default), the officer's DSAR view
   keeps it. Render every admin surface at 1280 and 360 and read it.
4. Then **Commit 6**, which D19 turned into a SHORT non-disclosure commit (read `C6-SPEC-EXTRACT.md`'s banner first):
   the private Gaming Board draft, the chatbot's forbidden-phrase guard (D19d), the docs, and `test:house-bot-disclosure`
   extended to pin the two rulebooks, Terms and the privacy notice **byte-identical to `origin/main`**.
5. Then **Commit 7** (the console — it brings the House Bots link in the admin navbar) if context remains.

**Decide alone.** Where a document is silent or two disagree, decide within the approved plan (authority 04 > 02/03 > PLAN > 01; code over plan when the code is right), write the decision as a numbered ruling in the commit's SPEC §6 before the code, and move on. A genuine owner-only question that appears mid-run goes into PROGRESS "Waiting on Ali" with a recommended default, and you BUILD THE DEFAULT unless it is on the hard-limit list below. Improvements outside the plan go into "💡 Proposed extra controls" or "🧷 Later" — never built without Ali's yes.

**Push every piece.** WIP commit + `git push origin house-bots` at least every 45–60 minutes and after every green step; verify with `git ls-remote origin refs/heads/house-bots`. Keep RESUME AT current in the same commit.

## ⛔ HARD LIMITS (never relax; if a step needs one, record BLOCKED with the reason and continue with other work)
- **D19: nothing about house bots reaches a player, including the holder.** Never add or keep a public sentence, a
  chip, a label, a holder notice or email, or a failure message that names a house bot, a liquidity stake or a 50pick
  stake. The regulator draft and the admin console are the only places the feature is described.
- Never push `main` or put `main` in a refspec; never rebase `house-bots`; merge `origin/main` only (check `git diff --stat house-bots...origin/main -- prisma/migrations` first; a main migration sorting after the house folders means renaming them again — **one is already waiting: `20260916120000_sms_message`**, so the next merge renames `20260915150000_house_bot_tables` / `20260915150100_house_bot_markers` past it).
- Never touch production (no `railway`, no production database, not even a read). Never turn the master switch on; designate bots only in a local scratch database.
- Never use ports 3009, 3011, 3013, 3014. Never edit, stage, check out or build in `F:/kipindi-main`. Never delete another session's files or worktrees.
- Never skip hooks, force-push, or weaken a guard or ratchet to pass. If the permission system or the auto-mode classifier refuses something, do not work around it: record it and move on.

## 🪤 TRAPS (the full list is in PROGRESS and memory; these cost hours before)
- **A shell-spawned `next dev` survives `child.kill()` on Windows** — the shell dies and Next keeps the port (a warm-up server held 3021 for sixteen hours). Kill the tree: `taskkill /T /F /PID <pid>`, then confirm the port is free.
- **A render finds what a test cannot.** Every row of the Swahili inbox passed cert-c3, and five of them still said English words (ruling 142). Render through the REAL emitters and read the page; `qa:house-bot-bells` does exactly that.
- A background command piped through `grep` without `--line-buffered` looks silent while it runs. Two notices written in the same millisecond have no stable newest-first order — find a row by what it says.
- Assert the pass DECIDES before asserting what was not decided (an unparseable rule made every §18 negative case pass vacuously). Prove a rules parse with the real parser (`pathToFileURL` for `F:/` imports in scratch scripts).
- Fixture ids reused across sections collide on unique indexes only in a FULL run. `stakeTzs` is CHECKed 1…1e9 on every intent row. The sweep watermark only moves forward.
- `npm run --silent test:<wrong-key>` prints nothing — grep `package.json`. An `await` inside a non-async arrow kills a cases file at load — `npx esbuild <cases> --outfile=/dev/null` first. Memory-store `db.*` returns plain values (try/catch, never `.catch`). Engine reads one at a time. Wait on the DATABASE clock, never `sleep()` margins.
- Raw-text guards read comments (seam 4.3). `test:failure-reasons` 9b reads any `code: "X"` literal; 8c pins `checkLossLimit` callers.
- Mutations: commit first; temporary `git worktree add --detach` + a `node_modules` junction; `HB_ENGINE_SECTIONS`; a run that never reached its store is NOT MEASURED (the harness must say so); restore bytes + `git diff --quiet`. ⛔ Remove the junction FIRST and PROVE it is gone (PowerShell `[System.IO.Directory]::Delete('<worktree>\node_modules', $false)`; in Git Bash `cmd /c rmdir` is mangled by MSYS path conversion and deletes NOTHING while reporting success), then `git worktree remove --force` — with the junction in place git deletes through it into the real `node_modules` (it took `.bin` and `.package-lock.json` on 2026-09-16; repair with `npm rebuild --ignore-scripts` and prove the toolchain with one suite).
- Turbopack refuses a junctioned `node_modules` and webpack mode 500s on `node:` imports — render from a worktree with real `node_modules` (`F:/kipindi-old-build`, restored clean afterwards).
- The scratch Postgres runs `Asia/Beirut`; the engine refuses to boot there (production TimeZone is NOT MEASURED — REL-0).
- A module reached both by `import()` and by a CommonJS path loads TWICE: a module-level `let` is not shared. State two
  paths must share lives on `globalThis` under `Symbol.for` (ruling 156).
- A dev server's stack trace contains the folder name `kipindi-house-bots`, which a house-word scan reads as a leak:
  strip the root path, and keep a control that proves the scan still catches a planted word.
- `page.goto` on an RSC or aborted navigation reports `ERR_ABORTED`; read served HTML through `ctx.request` instead.
- `taskkill /T /F` can leave a `.next\dev\build\postcss.js` worker alive when its parent died first — after every kill,
  list `node.exe` processes and their command lines, not just the port.
- A run filtered to some sections is UNDER the two-store population floor by design: a red runner must read the floor
  line's own numbers (exit, passed, failed), never the closing `ALL PASS`/`FAILURES` summary, or a green baseline refuses.
- `db-scratch --run` REUSES a cluster already listening on :5433 that it did not start, and that cluster's owner may stop
  it mid-run; a Postgres case can also throw `Can't reach database server` once under load (PROGRESS L24).

## 🛑 STOPPING
Stop only when context is nearly full or every planned commit is closed. Then: WIP commit, RESUME AT rewritten, a Session log row (`date -u`), push, memory updated, and a final message that starts **"We're done here. Run the prompt in a new session."** followed by a short plain report for Ali (non-technical): what shipped, what was proven, what is NOT MEASURED, and his questions (with the defaults you built).
