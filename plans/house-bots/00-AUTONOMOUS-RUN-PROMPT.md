# Paste everything below the line into a NEW Claude Code session (OMEGA-COMPILE01) — the all-day unattended run

---

Continue building **House Bots** for 50pick on branch `house-bots` of github.com/alisheib/kipindi. Follow `plans/house-bots/00-NEW-SESSION-PROMPT.md` and `plans/house-bots/PROGRESS.md`; **PROGRESS's RESUME AT is your first build instruction.**

## ⏱ PHASE 0 — the first minutes, while Ali is still here (do this BEFORE any build work)

Ali will be away all day. He approves permissions and answers questions **only now**. After Phase 0 you never wait on him.

1. **Fetch and read, fast:** `git fetch origin`; read PROGRESS "Status now", RESUME AT, "Waiting on Ali", "💡 Proposed extra controls" and "🧷 Later — sealing to-do"; skim C4-SPEC §6 rulings 114–142; **read PROGRESS's "OWNER RULING D19" block in full.**
2. **Ask nothing. Every owner question is answered.** ⛔ Do NOT re-ask W2–W19 or X3/X7/X8: they are recorded in
   PROGRESS "Waiting on Ali", and **owner ruling D19 (2026-09-16) — house bots are never public** — is recorded at the
   top of PROGRESS and in `docs/COMPLIANCE-DECISIONS.md`. Read D19 before any code: it removes work that is already
   built. Ali's standing instruction is to decide the rest yourself. The one item flagged for him and a lawyer (W2, a
   trigger player's data export vs the PDPA access right) is **not** a blocker: build the recorded default and move on.
   If something genuinely new appears, put it in "Waiting on Ali" with a recommended default and build the default.
3. **Permissions, once.** Tell Ali in one plain list which command families this run needs, then exercise ONE harmless instance of each so every prompt appears now, not at 3 pm: `git fetch/add/commit/push origin house-bots` · `npm run --silent test:<key>` (incl. the two-store suites that boot the scratch Postgres on :5433) · `npx tsc --noEmit`, `npx esbuild`, `npx tsx` · `node <scratchpad>/*.mjs` (mutation harnesses) · PowerShell `New-Item -ItemType Junction`, `cmd /c rmdir`, `git worktree add/remove` · `npx next dev -p 3021` / `next start -p 3021` for renders + a Playwright screenshot script · `date -u`. If Ali wants fewer prompts, offer (don't apply without his explicit yes) an allowlist via the `update-config` skill scoped to those families and to `git push origin house-bots` only.
4. **Say "Phase 0 done — running unattended"**, push PROGRESS with Ali's answers, and start.

## 🏃 THE UNATTENDED RUN — at least THREE plan commits

**Goal:** close Commit 4 (engine), then Commit 5 (reporting · data rights · resolver exposure · staff edge per ruling 78 — its holder chip and holder copy are struck by D19c), then Commit 6 (now the NON-disclosure commit: the private Gaming Board draft, the chatbot guard, the docs and the suite that proves the absence), and continue into Commit 7 (console) if context remains. Ali's cadence and quality bar still hold: a commit closes only when it is right logically (both stores, mutations aimed at every covered branch, `node scripts/test-all.mjs --skip responsive,motion` compared red-by-red against clean `origin/main` in `F:/kipindi-old-build`, the 3-lens review) and visually (every surface it produces rendered at 1280 and 360 and every bell and email rendered, each screenshot opened and read; the platform UI kit and the existing templates are the only look — a surface that invents its own look or words is a defect).

**Commit 4 remaining, in order** (PROGRESS RESUME AT 4b ⬜ item 4 is authoritative; steps 1–11's engine work is CLOSED
apart from X7, and rulings 114–142 are taken):
0. ⛔ **FIRST — un-build every player-facing disclosure (D19).** The liquidity label on holder outcome notices, the
   `houseStake` options and their 10 `market-service.ts` call sites, every `notifyHouseBotOwner*` notice and email with
   its copy table, registry rows and `designation.ts` call sites, the holder half of the A2 hook and the L2 sweep, and
   the house wording in `objHouseStakeOnly` / `failHousePositionNoExit`. Then invert the suites that pin them
   (`house-bot-money-cases` §8, `house-bot-comms-cases`, `house-bot-seam` 6.m1/6.n1/6.n4, `anchors/house-bot-money`,
   `cert-c1`'s template count, `cert-c3`, `guards-exist`, `kyc-copy-truth` §6, `failure-reasons`) so they now prove the
   ABSENCE: no player-facing string, in any of the three locales, says house, bot, liquidity or "50pick … stake". Take
   each as a ruling in `C4-SPEC.md` §6 (143+) first, and prove the removal with cases and a mutation. RESUME AT item 4.0
   lists every file and line.
1. **X7 · ruling 136** — BOTH_SIDES checked again at fire (`fire.ts`): SKIPPED(BOTH_SIDES) and `boxAccount`, never
   refusing the player's own stake. Cases on both stores, then a mutation.
2. **Step 11** — `test:house-bot-info-edge` (A13; N1 04:3724-3730; exempt `ud-price.ts` by name, ruling 57);
   `red:house-bot-engine` (N1-1…9, N2-E1…E8) with an anchors file in its command (`red-anchors` UNDECLARED_CEILING is
   exact); A24 EXPLAIN pins and L5's `triggerPage` pin; MON-06 (two processes, L6); L1–L4 and L7.
3. **Closing gates:** move `F:/kipindi-old-build` to `origin/main` (`dc05eeae`: docs and one accessibility fix, NO
   migration — merge it into `house-bots` first), then `node scripts/test-all.mjs --skip responsive,motion` in both trees
   compared red by red; the 3-lens adversarial review (**Ali authorizes a Workflow for this review**: money/concurrency,
   logic/integrity/exploitability, UX/visual/repo gates; each reviewer researches first and writes its whole answer
   once) — give every reviewer D19 and ask one of them to hunt for anything a player or holder could still see; fix
   every confirmed finding with a case and a mutation; docs (`docs/HOUSE-BOTS.md` §4 and §12, PROGRESS row ✅); push.
4. Then **Commit 5** from `C5-SPEC-EXTRACT.md` — its holder-facing half is struck by D19c, the reports and admin
   surfaces are unchanged; its 30 open points become rulings in a new `C5-SPEC.md` §6 first. Then **Commit 6**, which
   D19 has turned into a SHORT commit: the private Gaming Board draft, the chatbot's forbidden-phrase guard, the docs,
   and `test:house-bot-disclosure` inverted into a **non-disclosure** suite that pins the rulebooks, Terms and the
   privacy notice byte-identical to `origin/main`. Read `C6-SPEC-EXTRACT.md`'s banner before anything else.

**Decide alone.** Where a document is silent or two disagree, decide within the approved plan (authority 04 > 02/03 > PLAN > 01; code over plan when the code is right), write the decision as a numbered ruling in the commit's SPEC §6 before the code, and move on. A genuine owner-only question that appears mid-run goes into PROGRESS "Waiting on Ali" with a recommended default, and you BUILD THE DEFAULT unless it is on the hard-limit list below. Improvements outside the plan go into "💡 Proposed extra controls" or "🧷 Later" — never built without Ali's yes.

**Push every piece.** WIP commit + `git push origin house-bots` at least every 45–60 minutes and after every green step; verify with `git ls-remote origin refs/heads/house-bots`. Keep RESUME AT current in the same commit.

## ⛔ HARD LIMITS (never relax; if a step needs one, record BLOCKED with the reason and continue with other work)
- **D19: nothing about house bots reaches a player, including the holder.** Never add or keep a public sentence, a
  chip, a label, a holder notice or email, or a failure message that names a house bot, a liquidity stake or a 50pick
  stake. The regulator draft and the admin console are the only places the feature is described.
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
