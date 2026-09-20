# Paste everything below the line into a NEW Claude Code session (OMEGA-COMPILE01) — the all-day unattended run

---

Continue building **House Bots** for 50pick on branch `house-bots` of github.com/alisheib/kipindi. Follow `plans/house-bots/00-NEW-SESSION-PROMPT.md` and `plans/house-bots/PROGRESS.md`; **PROGRESS's RESUME AT is your first build instruction.**

## ⏱ PHASE 0 — the first minutes, while Ali is still here (do this BEFORE any build work)

Ali will be away all day. He approves permissions and answers questions **only now**. After Phase 0 you never wait on him.

1. **Fetch and read, fast:** first make sure nothing else writes `F:/kipindi-house-bots` (`git status --short`; list `node.exe`/`postgres.exe`/`claude.exe` command lines — an earlier session's workflow can still be running there; if one is, tell Ali in one line and wait for him to close it, never kill another Claude session yourself). Then `git fetch origin` and fast-forward; read **PROGRESS's "OWNER RULING D20" and "OWNER RULING D19" blocks in full**, then `plans/house-bots/C5-D20-REPLAN.md` whole, then PROGRESS "Status now", RESUME AT (▶ twelfth session), "Waiting on Ali" and "🧷 Later — sealing to-do".
2. **Ask nothing.** ⛔ **W20 is CLOSED (ruling 469, 2026-09-18) and this step no longer measures or mentions it.** The
   owner decided the repository stays public and asked for the matter to leave the plan; raising it again is how it came
   back five times. *(Deleted here on 2026-09-18 under ruling 516 (iv), because this file is the GENERATOR: leaving the
   order in it is how the closed matter would be re-raised a seventh time, whatever the copies it generates say.)*
   **W25** (on `main`, every admin console page sends its data — other players' names and stakes — to any signed-in
   account) is now scheduled work rather than something to tell him about: its decision, scope and probe are ruling 472
   in `plans/house-bots/C5-D20-REPLAN.md` §5. Read it there.
   ⛔ Do NOT re-ask W1–W24 or X3/X7/X8, and do not re-ask D19 or D20: they are recorded at the top of PROGRESS and in
   `docs/COMPLIANCE-DECISIONS.md`. Ali's standing instruction is to decide the rest yourself. If something genuinely new
   appears, put it in "Waiting on Ali" with a recommended default and build the default.
3. **Permissions, once.** Tell Ali in one plain list which command families this run needs, then exercise ONE harmless instance of each so every prompt appears now, not at 3 pm: `git fetch/add/commit/push origin house-bots` · `npm run --silent test:<key>` (incl. the two-store suites that boot the scratch Postgres on :5433) · `npx tsc --noEmit`, `npx esbuild`, `npx tsx` · `node <scratchpad>/*.mjs` (mutation harnesses) · PowerShell `New-Item -ItemType Junction` and `[System.IO.Directory]::Delete` (never Git Bash `cmd /c rmdir` — MSYS mangles `/c`), `git worktree add/remove` · `npx next dev -p 3021` / `next start -p 3021` for renders + a Playwright screenshot script · `date -u`. If Ali wants fewer prompts, offer (don't apply without his explicit yes) an allowlist via the `update-config` skill scoped to those families and to `git push origin house-bots` only.
4. **Say "Phase 0 done — running unattended"**, push PROGRESS with Ali's answers, and start.

## 🏃 THE UNATTENDED RUN — at least THREE plan commits

**⭐ STATE AT THE LAST STOP (2026-09-17, eleventh session, OMEGA-COMPILE01):** Commit 5 is IN PROGRESS and was **re-planned by owner ruling D20** (Ali, 2026-09-17: house bots are normal players in every report; every admin-only house tool is dropped). **`plans/house-bots/C5-D20-REPLAN.md` is Commit 5's authority** — it outranks `C5-SPEC.md` wherever they differ, and `C5-SPEC.md` (rulings 168–263) stays the authority only for the rulings the replan keeps; do NOT re-take rulings, and number new ones from 274 (264–273 are in the replan's §5). Done: steps 1–4 (the D19 data-rights fixes, the readers, R9), step 5 closed for D19 with rulings 259–260 (the console gate for house data and `qa:house-bot-console-probe`, 0 of 1,131 non-staff responses with house data) at `2033383b`. Next: the replan's §3 checkpoints — **C5-5b** (un-build what D20 struck and step 4/5 already built) → **C5-6** (R8 + R6) → **C5-7** (the absence sweep and the served layer) → **C5-8** (closing gates). Each checkpoint is ONE run of `plans/house-bots/tools/c5-step-fast.js` through the Workflow tool: pass the file's text inline as `script` the first time (the tool refuses a `scriptPath` it did not create), then reuse the path it returns; `args` = `{step, rulings, tag, baseSha, task, nextRuling: 274, visual, scratch (required), and on Ali-Blade15 machine/root/baseline/mainCheckout/heavyLock}`. ⛔ **Never SendMessage an agent running inside a workflow** — it resumes a second copy that writes the same tree; stop the workflow and relaunch instead.

**Goal:** finish **Commit 5** through `C5-D20-REPLAN.md` §3, then **Commit 6** (the non-disclosure commit: the private Gaming Board draft — which says reports treat house accounts as ordinary player accounts — the chatbot guard, the docs and the suite that proves the absence), then **Commit 7** (the console that CONTROLS the bots — it brings the House Bots link in the admin navbar; no results report, CSV or per-market house line, per D20) if context remains. Ali's cadence and quality bar still hold: a commit closes only when it is right logically (both stores, mutations aimed at every covered branch, `node scripts/test-all.mjs --skip responsive,motion` compared red-by-red against clean `origin/main` in `F:/kipindi-old-build`, the review lenses) and visually (every surface it produces rendered at 1280 and 360 and every bell and email rendered, each screenshot opened and read; the platform UI kit and the existing templates are the only look — a surface that invents its own look or words is a defect). **Pace (Ali, 2026-09-17):** no unnecessary work — full two-store suites once per checkpoint, mutations only in the closing batch, no verification layer whose result is certain.

**What is left, in order** (PROGRESS RESUME AT is authoritative):
1. **Commit 5**, through `plans/house-bots/C5-D20-REPLAN.md` §3 (recorded checkpoint by checkpoint in PROGRESS RESUME AT):
   - **C5-5b · the D20 un-build:** remove R9's audit keys and reads, the emergency-void house share (bell, letter, cert-c1),
     the KYC house facts and line, the R2 display (`exposure-copy.ts`, `exposure-line.tsx`, held-chip titles, bulk count,
     row tag, dialog slots), `houseStakeForConsole` / `houseBotLabelsForConsole`, and every step-3 reader, DAL member (both
     twins and its parity case) and case whose only consumers were struck; each touched admin file returns to `origin/main`'s
     bytes except the ruling 259/260 gate lines; render each un-built surface once at 1280 and 360 and read it.
   - **C5-6 · R8 + R6:** rulings 214–216 (durable audit reads for the report pack and RG engagement, the "do not sign" state,
     rendered and read) and 244–245 (erasure: six house buckets, live-bot refusal, `red:erasure`, engine 19.8b).
   - **C5-7 · absence sweep + served layer:** rulings 232, 235's F6 email half, 239's absence half, 243, 247–250 with D20's
     struck ids in the coverage; `qa:house-bot-holder-view` for every viewer and the production-posture pass,
     `qa:house-bot-console-probe` in the served layer; every captured page read at 1280 and 360.
   - **C5-8 · closing gates:** merge `origin/main` first (check `git diff --stat house-bots...origin/main -- prisma/migrations`);
     ONE mutation batch of the surviving mutations from a temporary worktree on its own scratch Postgres port; every
     `test:house-bot-*` suite on both stores; tsc; `test:all` in both trees compared red by red; `verify:house-bot-bundle` on a
     fresh build; the holder-view and console probes; the review over the whole commit (one lens hunting API routes, DSAR
     deliverables, console pages as a non-staff session and admin client chunks); `docs/HOUSE-BOTS.md`; PROGRESS row ✅.
2. **Commit 6**, the short non-disclosure commit (read `C6-SPEC-EXTRACT.md`'s banner first): the private Gaming Board draft (saying reports treat house accounts as ordinary player accounts, D20)
   ~~`docs/BOARD-DISCLOSURE-HOUSE-BOTS.md`~~ ⛔ **STRUCK 2026-09-20 (owner ruling D21, `docs/COMPLIANCE-DECISIONS.md`): the Board needs nothing; this file never existed and is not to be written.** The chatbot's forbidden-phrase guard (D19d), the docs, and `test:house-bot-disclosure`
   extended into a NON-disclosure suite that pins the two rulebooks, Terms and the privacy notice **byte-identical to
   `origin/main`**.
3. **Commit 7** (the console that controls the bots, per D20 — no results report, CSV or per-market house line) if context remains — and with it the two items Commit 4 deferred: **N1-9**'s mutation (an inline
   fire not registered in `inFlight`, which needs the inline Enter now fire that lands there — PROGRESS L23) and the console
   controls X1, X2, X4, X5, X6 recorded under "💡 Proposed extra controls".
4. **Each commit closes the same way Commit 4 did:** merge `origin/main` first (check
   `git diff --stat house-bots...origin/main -- prisma/migrations` — a new main migration means renaming the house folders
   again, which is now a well-trodden path), `node scripts/test-all.mjs --skip responsive,motion` in this tree and in
   `F:/kipindi-old-build` compared red by red, `verify:house-bot-bundle` on a fresh `npx next build`,
   `qa:house-bot-holder-view`, the commit's own `red:` drive, the 3-lens adversarial review as a Workflow (**Ali authorises
   it**: money/concurrency · logic/integrity/exploitability · UX/visual/repo gates; give every reviewer D19 and have one hunt
   for anything a player or holder could still see), a fix with a case and a mutation for every confirmed finding, then
   `docs/HOUSE-BOTS.md`, the PROGRESS row ✅ and a push.

**Decide alone.** Record new rulings from 274. Where a document is silent or two disagree, decide within the approved plan (authority: owner rulings D19 and D20 above everything; `C5-D20-REPLAN.md` > `C5-SPEC.md`; 04 > 02/03 > PLAN > 01; code over plan when the code is right), write the decision as a numbered ruling in the commit's SPEC §6 before the code, and move on. A genuine owner-only question that appears mid-run goes into PROGRESS "Waiting on Ali" with a recommended default, and you BUILD THE DEFAULT unless it is on the hard-limit list below. Improvements outside the plan go into "💡 Proposed extra controls" or "🧷 Later" — never built without Ali's yes.

**Push every piece.** WIP commit + `git push origin house-bots` at least every 45–60 minutes and after every green step; verify with `git ls-remote origin refs/heads/house-bots`. Keep RESUME AT current in the same commit.

## ⛔ HARD LIMITS (never relax; if a step needs one, record BLOCKED with the reason and continue with other work)
- **D19: nothing about house bots reaches a player, including the holder.** Never add or keep a public sentence, a
  chip, a label, a holder notice or email, or a failure message that names a house bot, a liquidity stake or a 50pick
  stake. The regulator draft and the admin console are the only places the feature is described.
- **D20: house bots are normal players in every report.** Never build a house-liquidity report, statement or CSV column,
  a staff-edge alert, a house line on an admin screen, a house key in a decision audit, a report memo, column, split or
  exclusion, or an internal record. Every console surface reads house data only through `house-console-read.ts`.
- Never push `main` or put `main` in a refspec; never rebase `house-bots`; merge `origin/main` only (check `git diff --stat house-bots...origin/main -- prisma/migrations` first; a main migration sorting after the house folders means renaming them again — **one is already waiting: `20260916120000_sms_message`**, so the next merge renames `20260916150000_house_bot_tables` / `20260916150100_house_bot_markers` past it).
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
