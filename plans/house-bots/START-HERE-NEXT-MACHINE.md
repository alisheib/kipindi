# START HERE — the prompt for the next machine (written 2026-09-21, Ali-Blade15)

> # ⛔ THE NEXT MACHINE HAS RUN. READ `INTEGRATION-2026-09-21.md` BEFORE ACTING ON §4 OR §5 BELOW.
> This file was written on Ali-Blade15 *for* the next machine. That machine (OMEGA-COMPILE01) picked it up
> the same day and worked through it, so several figures here are now closed or were undercounts:
>
> | this file says | what was measured on the next machine |
> |---|---|
> | §2 "`ops-lane` — every lane merged into it" | it was NOT: **ten commits** across four lanes had landed after it absorbed them. All five branches are merged now. |
> | §4.1 six audit exports · §4.2 `houseBots` in the feature table | both CLOSED (platform vocabulary; renamed to the neutral `desk`, the L52 remedy) |
> | §4.3 "**two** dead anchors" | an undercount by seven — there were **NINE**, all rotted by `§2J · THE JOIN`. Re-pointed AND driven: 7 caught / 0 wrong-assertion / 0 missed, plus the chatbot and console ones. |
> | §4.4 two readiness papers | CLOSED — `RELEASE-READINESS-2026-09-21.md` now carries a dated supersede block naming `READINESS-2026-09-21.md` as the record. Neither is deleted. |
> | §5 "the rows needing PRODUCTION — permanently not measurable" | re-triaged row by row: of 76 owed rows, exactly **ONE** genuinely needs production. |
> | §7 "🔴 ALI-BLADE15 HAS FAILING RAM" | correct for THAT machine. OMEGA-COMPILE01 has 31.8 GB, 12 cores, `gc.auto` default, and the pre-push guard already wired. Its blockers do not transfer. |
>
> ⛔ **Everything else in this file still stands**, especially §6 (the verification standard) and §8 (what only
> Ali decides) — §6 is what caught every defect on the next machine too, including three in its own instruments.
>
> Paste the block in §0 as your first message on the new machine. Everything else in this file is the detail
> behind it. ⛔ **RE-DERIVE EVERY NUMBER.** Every figure here was measured on 2026-09-20/21 and is ageing.

---

## §0 — THE PROMPT. Paste this.

```
Read plans/house-bots/START-HERE-NEXT-MACHINE.md, then plans/house-bots/HANDOVER-2026-09-21.md,
then the readiness statement it names as the record. Do not read PROGRESS.md first — its older
rows were written by sessions that recorded work as finished when it was not.

Then: re-derive the state yourself before trusting any number in any of them, and tell me
what is actually left. Do not start building until you have done that.

Standing rules: the master switch is mine alone and stays OFF. Never touch production.
Never weaken a guard, lower a floor, widen an exemption, delete a proof, rebase, or
force-push. Push as you go. Decide rather than ask me, except where this file says the
decision is mine.
```

---

## §1 — WHAT THIS IS

50pick runs house accounts: the platform placing its own stakes, through ordinary player accounts the owner
designates. **OWNER RULING D19 outranks everything: nothing about it may reach a player or the holder.**
**D20: house bots are ordinary players in every report.** The code is ALREADY on `main` (Ali pushed it
2026-09-18) with the master switch OFF. Nothing has ever staked there.

⛔ **THE SWITCH IS ALI'S ALONE.** His words: *"i wont ever turn thr switch on until usay so its ready and i
fo."* Two halves, neither skippable — a session states IN WRITING, ON MEASURED EVIDENCE, that it is ready;
then **Ali** turns it on. No session ever turns it on, or treats a green gate as permission.

## §2 — WHERE THE WORK IS

| branch | what it carries |
|---|---|
| `ops-lane` | **THE INTEGRATION BRANCH** — every lane merged into it. Start here. |
| `house-bots` | the trunk: `origin/main` merged in, C5-6's review, C5-7, C7 step 5, C5-8 |
| `alerts-lane` | the silent-alert fixes, the eighteen scenarios, Commit-7 rows, the mutation batches |
| `rel-lane` | the release ladder, the owner switch-on sheet, the rehearsals, **the audit-drain fix** |

⛔ **NONE OF IT IS ON `main` YET.** `main` is at `418f1b59` and carries only the original house-bot code.

⛔ **ALL FOUR BRANCHES ARE PUSHED.** GitHub is the only store this machine's failing RAM cannot corrupt —
it already corrupted a git object here. **Push after every coherent piece.**

## §3 — WHAT IS DONE

- **C7 step 5** — the desk's activity and history panels, on both the desk and the account page. It was
  recorded finished and had never been built; two later steps were built on top of the hole.
- **Four emergency ops scripts** — off, status with drift, remark, sunset. Also assigned and scheduled in no
  step; `C7-SPEC` mentioned them zero times.
- **The retention protection** — 14 tables were documented never-deletable and 6 enforced. Now a proxy wired
  at one point with a DERIVED population.
- **The D19d chatbot guard** — and the chatbot's own output was scanned by NOTHING for house vocabulary.
- **The audit-row loss** — every deploy silently lost compliance rows; 0 of 10 landed on a real kill, now
  10 of 10 in 23 ms. See §5, it is not finished.
- **A house-word guard whose population is derived** — 675 of 1,087 files were inside NO house-word check.
- **The coverage question settled**: 281 scenarios, 24 proven by id, 254 routed to a running suite, **18 had
  no test at all** (judged one at a time; three must be RECONCILED not tested — their rows describe behaviour
  the owner ruled against), 9 withdrawn, 0 unaccounted for.

## §4 — WHAT BLOCKS THE PUSH TO `main`

The last verdict was **NOT FIT**, with four named items. A lane was closing them when this was written —
**re-derive their state before doing anything**:

1. **Six exports on `src/lib/server/audit.ts`** (`0.260.1`, `0.260.c3`) — a real D19 ruling: house-feature
   names that must be gated, or platform vocabulary? They arrived with the audit-drain work, which is
   platform-wide.
2. **`houseBots` in `src/lib/server/feature-state.ts`** (`3.hop.2`, `6.hop.2`) — ⭐ precedent: L52 renamed a
   rate-limit key to a neutral word rather than exempting it.
3. **Two dead anchors** — `house-bot-c5.anchors.mjs` `S5-M59` and `S5-M69`.
4. **Two readiness papers claim the same office.** RULED: the later and fuller is the record; the other gets
   a dated supersede line and is NOT deleted.

⛔ **1 and 2 are TRUE INTEGRATION REDS — neither branch was red alone.** They exist only because two lanes'
work met. That is what merging and re-running is for.

## §5 — WHAT IS OWED AFTER A PUSH

- **The register rows needing a served page.** 27 hard-code port 3021. A fresh `next build` plus one server
  clears them. ⭐ **LIVE_BASE MAY be set — ONLY to an explicit loopback address with a port.** Never a
  hostname, never `50pick.tz`, never unset-and-hope. (The blanket ban existed because the harness used to
  default to production; the merge fixed that.)
- **The rows needing PRODUCTION** — permanently not measurable from a dev machine. NOT MEASURED, reason named.
- **`AR-2`, the largest unknown**: Railway's own docs say npm intercepts SIGTERM and the service is
  force-quit. 50pick starts with `npm run start`. **If true the audit drain never runs** — nor Next's request
  draining, nor the leadership hand-back. Unmeasurable without production. **Ali's call.**
- **Four live defects on `main` itself**, found here and not caused here: `test:popup-fit` red by eleven,
  `test:red-anchors` 66 against its own ceiling of 65, and two rotted `rg-doors` anchors.
- **Commit 5 is still not closed** — three register rows have no test at all: `ENG-19`, `CA-18`, `CA-31`.

## §6 — THE VERIFICATION STANDARD. This is what caught everything.

- ⛔ **Every assertion needs a PLANTED CONTROL** planting a shape the REAL code could contain.
- ⭐ **Every REFUSAL guard needs a POSITIVE CONTROL** — something that must still be ALLOWED. A protection
  guard once swept in too much and refused the purge's own cleanup, and **all thirteen of its assertions
  passed HARDER while the feature was broken.** Only a positive control caught it.
- ⛔ **An anchor that RESOLVES is not an assertion that went RED.** Ten of 281 were found aimed at the wrong
  assertion.
- ⛔ **A mutation that will not PARSE is not a caught defect.** Four syntax errors were being counted as
  successes.
- ⛔ **A guard's SCOPE is part of its claim.** A house word sat live on an admin page for weeks because the
  lexicon scanned one folder and the string lived in another.
- ⛔ **STRIP COMMENTS AND STRINGS** before any presence scan. A guard was once red because a phantom script
  name sat inside backticks in a docblock — the guard reads backticks as a real reference.
- ⛔ **PRINT THE POPULATION.** A sweep over zero passes.
- ⛔ **RENDER IT.** Defects found only by looking at the page: a raw internal word in the ADDRESS BAR, seven
  currency amounts painted outside the money component, a save footer crushed to 138px at phone width, one
  activity panel able to stop a queued stake while the other could not. Capture VIEWPORT TILES, never
  full-page, and OPEN AND READ every one.
- ⛔ **A RECORDED NUMBER ROTS, AND SO DOES A RECORDED RESULT.** A mutation marked "run and caught" could not
  even compile. **Four separate recorded figures turned out to be composites** — true numbers beside untrue
  descriptions. Re-derive everything.

## §7 — MACHINE AND PROCESS TRAPS

- ⛔ **ONE BUILDER PER WORKING COPY.** Parallel lanes need separate git worktrees, each with `node_modules`
  **COPIED** (never junctioned, never `npm ci` through one — it deletes the other tree).
- ⛔ **ENFORCE A FREEZE BY STOPPING LANES, NOT BY DECLARING ONE.** Three rounds of integration measured trees
  that had already moved, because lanes kept being refilled. **This was the single biggest waste of the run.**
- ⛔ **A red harness MUTATES the working tree**, and on this platform a killed one used to leave the planted
  defect on disk. Verify `git status --porcelain` empty before AND after every drive.
- ⛔ **`scripts/red-anchors.test.mts` is a SINGLE-LANE file** — its ceiling is asserted by EQUALITY.
- ⚠️ **Windows: `execSync` goes through cmd.exe where `^` is the escape character**, so `<sha>^` silently
  resolves to `<sha>`. Use explicit parent SHAs.
- ⚠️ **Windows cannot deliver SIGTERM to itself** — `process.kill(pid,"SIGTERM")` becomes `TerminateProcess`
  and no handler runs. Use `process.emit("SIGTERM")` for a faithful test.
- ⚠️ **Inline `node -e` eats backslashes here.** Write a script FILE.
- ⚠️ **`npm run -s <name>` on a missing script exits 1 with an EMPTY log in ~1s.** That is a WRONG NAME, not
  a failing suite.
- ⚠️ **`tsconfig` covers `scripts/**/*.ts` but NOT `.mts`/`.mjs`** — which is most of the guard code. A green
  typecheck proves nothing about it.
- 🔴 **ALI-BLADE15 HAS FAILING RAM.** It bluescreens under load, has corrupted application files, and on
  2026-09-21 **corrupted a git object in the shared pack** (it later read back clean — the RAM signature).
  Auto-gc is DISABLED (`gc.auto=0`) and must stay so until a repair is done with every lane idle.
  **Run MemTest86.** On a new machine this may all be moot — verify rather than assume.
- ⚠️ **The pre-push guard that stops `main` being pushed is a 158-byte file OUTSIDE every checkout**, at
  `C:/kipindi-house-bots-hooks/pre-push`. Untracked, in no clone, in no backup. **Recreate it on the new
  machine** or nothing stops an accidental push to live.

## §8 — WHAT ONLY ALI DECIDES

1. **The switch.** Never a session's.
2. **`AR-2`** — whether to change the production start command so shutdown signals reach the app.
3. **Whether to narrow the house desk to his account alone** — today any admin can open it.
4. **The four register rows flagged for a ruling**, and the two unrelated live bugs on his queue (a report
   download that stops silently at 500 rows; an admin action that does not ask for his code).

⛔ **THE GAMING BOARD NEEDS NOTHING** (owner ruling 2026-09-20). No Board draft, no Board documents. Record
it as a VERBAL OWNER REPORT, never as a regulator document; it satisfies no condition asking for WRITTEN
approval and it weakens no control.
