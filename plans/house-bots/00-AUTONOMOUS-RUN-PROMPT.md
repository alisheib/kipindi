# Paste everything below the line into a NEW Claude Code session (OMEGA-COMPILE01) — the all-day unattended run

---

Continue building **House Bots** for 50pick on branch `house-bots` of github.com/alisheib/kipindi. Follow `plans/house-bots/00-NEW-SESSION-PROMPT.md` and `plans/house-bots/PROGRESS.md`; **PROGRESS's RESUME AT is your first build instruction.**

## ⏱ PHASE 0 — the first minutes, while Ali is still here (do this BEFORE any build work)

Ali will be away all day. He approves permissions and answers questions **only now**. After Phase 0 you never wait on him.

1. **Fetch and read, fast:** `git fetch origin`; read PROGRESS "Status now", RESUME AT, "Waiting on Ali", "💡 Proposed extra controls" and "🧷 Later — sealing to-do"; skim C4-SPEC §6 rulings 114–142.
2. **Ask only what is still open, in ONE `AskUserQuestion` round** (at most 4 per call), each with a recommended default first. ⛔ **Do NOT re-ask what Ali already answered** on 2026-09-15 (recorded in PROGRESS "Waiting on Ali": W17 out of Money · W4 7 years · W2/W5–W16 as written · X7 yes · X3 and X8 no · L10 fixed on house-bots · the Swahili default is LIVE · no allow-list). Still open, with the defaults being built:
   - **W18** — Commit 6: waive the two rulebooks' own "material changes are announced" promises and make those sentences true going forward (recommended: yes, as recorded), or publish an announcement at release.
   - **W19** — Commit 6: the house-bot privacy line under "Legitimate interest" as sealed and flagged in the release note (recommended), or under "Performance of contract".
   - Anything NEW in "Waiting on Ali" or "💡 Proposed extra controls" since. Record every answer in PROGRESS immediately and push.
3. **Permissions, once.** Tell Ali in one plain list which command families this run needs, then exercise ONE harmless instance of each so every prompt appears now, not at 3 pm: `git fetch/add/commit/push origin house-bots` · `npm run --silent test:<key>` (incl. the two-store suites that boot the scratch Postgres on :5433) · `npx tsc --noEmit`, `npx esbuild`, `npx tsx` · `node <scratchpad>/*.mjs` (mutation harnesses) · PowerShell `New-Item -ItemType Junction`, `cmd /c rmdir`, `git worktree add/remove` · `npx next dev -p 3021` / `next start -p 3021` for renders + a Playwright screenshot script · `date -u`. If Ali wants fewer prompts, offer (don't apply without his explicit yes) an allowlist via the `update-config` skill scoped to those families and to `git push origin house-bots` only.
4. **Say "Phase 0 done — running unattended"**, push PROGRESS with Ali's answers, and start.

## 🏃 THE UNATTENDED RUN — at least THREE plan commits

**Goal:** close Commit 4 (engine), then Commit 5 (reporting · data rights · resolver exposure · holder chip · staff edge per ruling 78), then Commit 6 (public text), and continue into Commit 7 (console) if context remains. Ali's cadence and quality bar still hold: a commit closes only when it is right logically (both stores, mutations aimed at every covered branch, `node scripts/test-all.mjs --skip responsive,motion` compared red-by-red against clean `origin/main` in `F:/kipindi-old-build`, the 3-lens review) and visually (every surface it produces rendered at 1280 and 360 and every bell and email rendered, each screenshot opened and read; the platform UI kit and the existing templates are the only look — a surface that invents its own look or words is a defect).

**Commit 4 remaining, in order** (PROGRESS RESUME AT 4b ⬜ item 4 is authoritative; steps 1–10 are CLOSED and rulings 114–142 are taken):
1. **X7 · ruling 136** — BOTH_SIDES checked again at fire (`fire.ts`): SKIPPED(BOTH_SIDES) and `boxAccount`, never refusing the player's own stake. Cases on both stores, then a mutation.
2. **Step 11** — `test:house-bot-info-edge` (A13; N1 04:3724-3730; exempt `ud-price.ts` by name, ruling 57); `red:house-bot-engine` (N1-1…9, N2-E1…E8) with an anchors file in its command (`red-anchors` UNDECLARED_CEILING is exact); A24 EXPLAIN pins and L5's `triggerPage` pin; MON-06 (two processes, L6); L1–L4 and L7.
3. **Closing gates:** move `F:/kipindi-old-build` to `origin/main` (now `dc05eeae`: five commits, docs and one accessibility fix, NO migration — merge it into `house-bots` first), then `node scripts/test-all.mjs --skip responsive,motion` in both trees compared red by red; the 3-lens adversarial review (**Ali authorizes a Workflow for this review**: money/concurrency, logic/integrity/exploitability, UX/visual/repo gates; each reviewer researches first and writes its whole answer once); fix every confirmed finding with a case and a mutation; docs (`docs/HOUSE-BOTS.md` §4 and §12, PROGRESS row ✅); push.
4. Then **Commit 5** from `plans/house-bots/C5-SPEC-EXTRACT.md` (its 30 open points become rulings in a new `C5-SPEC.md` §6 first) and **Commit 6** from `C6-SPEC-EXTRACT.md`.

**Decide alone.** Where a document is silent or two disagree, decide within the approved plan (authority 04 > 02/03 > PLAN > 01; code over plan when the code is right), write the decision as a numbered ruling in the commit's SPEC §6 before the code, and move on. A genuine owner-only question that appears mid-run goes into PROGRESS "Waiting on Ali" with a recommended default, and you BUILD THE DEFAULT unless it is on the hard-limit list below. Improvements outside the plan go into "💡 Proposed extra controls" or "🧷 Later" — never built without Ali's yes.

**Push every piece.** WIP commit + `git push origin house-bots` at least every 45–60 minutes and after every green step; verify with `git ls-remote origin refs/heads/house-bots`. Keep RESUME AT current in the same commit.

## ⛔ HARD LIMITS (never relax; if a step needs one, record BLOCKED with the reason and continue with other work)
- Never push `main` or put `main` in a refspec; never rebase `house-bots`; merge `origin/main` only (check `git diff --stat house-bots...origin/main -- prisma/migrations` first; a main migration sorting after `20260915150100` means renaming the house folders again).
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
- Mutations: commit first; temporary `git worktree add --detach` + a `node_modules` junction; `HB_ENGINE_SECTIONS`; a run that never reached its store is NOT MEASURED (the harness must say so); restore bytes + `git diff --quiet`; remove the junction with `cmd /c rmdir`, never `rm -rf`, then `git worktree remove`.
- Turbopack refuses a junctioned `node_modules` and webpack mode 500s on `node:` imports — render from a worktree with real `node_modules` (`F:/kipindi-old-build`, restored clean afterwards).
- The scratch Postgres runs `Asia/Beirut`; the engine refuses to boot there (production TimeZone is NOT MEASURED — REL-0).

## 🛑 STOPPING
Stop only when context is nearly full or every planned commit is closed. Then: WIP commit, RESUME AT rewritten, a Session log row (`date -u`), push, memory updated, and a final message that starts **"We're done here. Run the prompt in a new session."** followed by a short plain report for Ali (non-technical): what shipped, what was proven, what is NOT MEASURED, and his questions (with the defaults you built).
