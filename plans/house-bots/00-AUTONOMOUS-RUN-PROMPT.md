# Paste everything below the line into a NEW Claude Code session (OMEGA-COMPILE01) — the all-day unattended run

---

Continue building **House Bots** for 50pick on branch `house-bots` of github.com/alisheib/kipindi. Follow `plans/house-bots/00-NEW-SESSION-PROMPT.md` and `plans/house-bots/PROGRESS.md`; **PROGRESS's RESUME AT is your first build instruction.**

## ⏱ PHASE 0 — the first minutes, while Ali is still here (do this BEFORE any build work)

Ali will be away all day. He approves permissions and answers questions **only now**. After Phase 0 you never wait on him.

1. **Fetch and read, fast:** `git fetch origin`; read PROGRESS "Status now", RESUME AT, "Waiting on Ali", "💡 Proposed extra controls" and "🧷 Later — sealing to-do"; skim C4-SPEC §6 rulings 114–132.
2. **Ask every open owner question in ONE `AskUserQuestion` round** (at most 4 questions per call; use two calls back to back if needed), each with a recommended default first:
   - W17 — `HOUSE_BOT` stays out of the money notification kinds (recommended: yes).
   - X3 catch-up summaries · X7 BOTH_SIDES penalty check at fire · X8 "reactions running late" alert (recommended: X7 yes, X8 yes, X3 no).
   - L10 — the platform `rejectAmlAction` non-atomic refund (recommended: record only; a separate `main` session fixes it).
   - `swahili-default` — the verified Swahili-default-language fix is on branch `swahili-default` (`8822b648`), NOT live; the classifier blocked the `main` push (recommended: Ali merges it himself or approves one `git push origin swahili-default:main`).
   - Anything else you find unresolved in "Waiting on Ali". Record every answer in PROGRESS immediately and push.
3. **Permissions, once.** Tell Ali in one plain list which command families this run needs, then exercise ONE harmless instance of each so every prompt appears now, not at 3 pm: `git fetch/add/commit/push origin house-bots` · `npm run --silent test:<key>` (incl. the two-store suites that boot the scratch Postgres on :5433) · `npx tsc --noEmit`, `npx esbuild`, `npx tsx` · `node <scratchpad>/*.mjs` (mutation harnesses) · PowerShell `New-Item -ItemType Junction`, `cmd /c rmdir`, `git worktree add/remove` · `npx next dev -p 3021` / `next start -p 3021` for renders + a Playwright screenshot script · `date -u`. If Ali wants fewer prompts, offer (don't apply without his explicit yes) an allowlist via the `update-config` skill scoped to those families and to `git push origin house-bots` only.
4. **Say "Phase 0 done — running unattended"**, push PROGRESS with Ali's answers, and start.

## 🏃 THE UNATTENDED RUN — at least THREE plan commits

**Goal:** close Commit 4 (engine), then Commit 5 (reporting · data rights · resolver exposure · holder chip · staff edge per ruling 78), then Commit 6 (public text), and continue into Commit 7 (console) if context remains. Ali's cadence and quality bar still hold: a commit closes only when it is right logically (both stores, mutations aimed at every covered branch, `node scripts/test-all.mjs --skip responsive,motion` compared red-by-red against clean `origin/main` in `F:/kipindi-old-build`, the 3-lens review) and visually (every surface it produces rendered at 1280 and 360 and every bell and email rendered, each screenshot opened and read; the platform UI kit and the existing templates are the only look — a surface that invents its own look or words is a defect).

**Commit 4 remaining, in order** (PROGRESS ⬜ list is authoritative; rulings 114–132 are taken):
1. Step 7 — cases §19 for `src/lib/server/house-bot/holder-hook.ts` on both stores (every A2 row, the sweep repeating the hook, idempotence, `pauseDetail.causes` added/cleared bells, PLAN §14 password effects incl. OFFICER_TEMP, rows 16–18, C8 break-end bell once and no double bell, closure → REMOVED, ruling 130's durable queue incl. an unreadable queue on Postgres), then mutations.
2. Step 8 — the kill switch OFF drain (A9) as a service, with A9's drain timing cases in `test:house-bot-caps`.
3. Step 9 — every emitter (C13, F6 `CHANNEL_POLICY`, N1 §7, N2 §7, the step-7 `HolderAlerts`, ruling 132's three holder notices), registry rows (`test:cert-c1`/`c3`, `kyc-copy-truth` §6, `position-permalink` 4.4), **every bell and email rendered and read**; THEN wire `instrumentation.ts` (engine + `workerTicks` + `plannerTicks` + `triggerTicks`), the A2 holder call sites (`plans/house-bots/C4-HOOK-ANCHORS.md` — several need a small "capture the lock result first" restructure), the lifecycle chore, and `test:house-bot-holder-lifecycle` with A2's walker and F8's `scripts/**` scan (ruling 128: call sites never before emitters). Ruling 113's exit-config alert when the server `RulesContext` builder exists.
4. Step 10 — money hooks (F7) at `C4-HOOK-ANCHORS.md`'s slots; `test:lock-tx-threading` and `test:wallet-status-writers` on touch.
5. Step 11 — the four suites + `red:house-bot-engine`; A24 EXPLAIN pins; MON-06; the Later list items L1–L7 that land in Commit 4.
6. Closing gates: `test:all` vs clean main, the 3-lens adversarial review (**Ali authorizes a Workflow for this review**: three lenses — money/concurrency, logic/integrity/exploitability, UX/visual/repo gates; each reviewer researches first and writes its whole answer once), fix every confirmed finding with a case and a mutation, docs (`docs/HOUSE-BOTS.md`, PROGRESS), push.

**Decide alone.** Where a document is silent or two disagree, decide within the approved plan (authority 04 > 02/03 > PLAN > 01; code over plan when the code is right), write the decision as a numbered ruling in the commit's SPEC §6 before the code, and move on. A genuine owner-only question that appears mid-run goes into PROGRESS "Waiting on Ali" with a recommended default, and you BUILD THE DEFAULT unless it is on the hard-limit list below. Improvements outside the plan go into "💡 Proposed extra controls" or "🧷 Later" — never built without Ali's yes.

**Push every piece.** WIP commit + `git push origin house-bots` at least every 45–60 minutes and after every green step; verify with `git ls-remote origin refs/heads/house-bots`. Keep RESUME AT current in the same commit.

## ⛔ HARD LIMITS (never relax; if a step needs one, record BLOCKED with the reason and continue with other work)
- Never push `main` or put `main` in a refspec; never rebase `house-bots`; merge `origin/main` only (check `git diff --stat house-bots...origin/main -- prisma/migrations` first; a main migration sorting after `20260915150100` means renaming the house folders again).
- Never touch production (no `railway`, no production database, not even a read). Never turn the master switch on; designate bots only in a local scratch database.
- Never use ports 3009, 3011, 3013, 3014. Never edit, stage, check out or build in `F:/kipindi-main`. Never delete another session's files or worktrees.
- Never skip hooks, force-push, or weaken a guard or ratchet to pass. If the permission system or the auto-mode classifier refuses something, do not work around it: record it and move on.

## 🪤 TRAPS (the full list is in PROGRESS and memory; these cost hours before)
- Assert the pass DECIDES before asserting what was not decided (an unparseable rule made every §18 negative case pass vacuously). Prove a rules parse with the real parser (`pathToFileURL` for `F:/` imports in scratch scripts).
- Fixture ids reused across sections collide on unique indexes only in a FULL run. `stakeTzs` is CHECKed 1…1e9 on every intent row. The sweep watermark only moves forward.
- `npm run --silent test:<wrong-key>` prints nothing — grep `package.json`. An `await` inside a non-async arrow kills a cases file at load — `npx esbuild <cases> --outfile=/dev/null` first. Memory-store `db.*` returns plain values (try/catch, never `.catch`). Engine reads one at a time. Wait on the DATABASE clock, never `sleep()` margins.
- Raw-text guards read comments (seam 4.3). `test:failure-reasons` 9b reads any `code: "X"` literal; 8c pins `checkLossLimit` callers.
- Mutations: commit first; temporary `git worktree add --detach` + a `node_modules` junction; `HB_ENGINE_SECTIONS`; a run that never reached its store is NOT MEASURED (the harness must say so); restore bytes + `git diff --quiet`; remove the junction with `cmd /c rmdir`, never `rm -rf`, then `git worktree remove`.
- Turbopack refuses a junctioned `node_modules` and webpack mode 500s on `node:` imports — render from a worktree with real `node_modules` (`F:/kipindi-old-build`, restored clean afterwards).
- The scratch Postgres runs `Asia/Beirut`; the engine refuses to boot there (production TimeZone is NOT MEASURED — REL-0).

## 🛑 STOPPING
Stop only when context is nearly full or every planned commit is closed. Then: WIP commit, RESUME AT rewritten, a Session log row (`date -u`), push, memory updated, and a final message that starts **"We're done here. Run the prompt in a new session."** followed by a short plain report for Ali (non-technical): what shipped, what was proven, what is NOT MEASURED, and his questions (with the defaults you built).
