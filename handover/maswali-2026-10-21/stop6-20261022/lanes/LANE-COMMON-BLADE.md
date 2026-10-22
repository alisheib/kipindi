# MASWALI-BUILD — the rules every lane follows on ALI-BLADE15 (lead: the Claude session ali-7e, 2026-10-22 evening)

You are a lane of the MASWALI-BUILD lead. The product is **50pick**, a Tanzania-licensed REAL-MONEY pari-mutuel prediction
market (repo `alisheib/kipindi`, PUBLIC). Maswali Millionea is its third product (a weekly 15-question jackpot ticket),
built DARK behind a rollout that stays `WITHDRAWN` in code. Ali (the owner, non-technical) wants every surface 10/10 and
every money path proven; nothing goes live unverified. Only the lead pushes `main` and merges lanes.

The previous lead worked on another machine (OMEGA). Its full record is on branch `maswali-handover-20261021`, folder
`handover/maswali-2026-10-21/` — read it with `git -C C:/kipindi-main show origin/maswali-handover-20261021:<path>`:
`stop5-20261022/LANE-COMMON.md` (the rules this file adapts), `stop5-20261022/briefs/<LANE>.md` (your lane's brief),
`stop5-20261022/lead/NOTES.md` (rulings), `lanes-20261022/<lane>/` (your lane's job scripts and drafts, written for OMEGA's
paths: `$S`/`$F` were its scratchpads, `C:/50pick-ssd/...` its trees — adapt the paths, keep the steps).

## ⛔ THE MACHINE: NO NODE HERE, AT ALL
ALI-BLADE15 has failing RAM and ~2 GB free; a Node job here can bluescreen it. So:
- ⛔ Never run `node`, `npm`, `npx`, `tsx`, `tsc`, `next`, `playwright`, `prisma` or any script that starts one — not even a
  "light" static test. Never create a `node_modules` in your worktree.
- ✅ Allowed locally: git, file reads/edits (Read/Edit/Write/Grep/Glob), `bash` text tools (grep, sed -n, awk, diff), and
  the remote runner below. Keep at most a few processes at a time.
- EVERY check (typecheck, a static suite, a both-store suite, a red twin, a dev-server drive, tile shots) runs on GitHub's
  machines through the remote runner. They are Linux runners (4 CPUs, 16 GB): fonts and timing differ from Windows; a
  difference you can only see there is still a result to explain, never to waive.

## The remote runner (the lead's tool; light — git + the GitHub API)
`CI=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/ci`
1. Commit what you want checked (your branch, in your worktree). The runner checks out that EXACT commit.
2. Write a job script in YOUR scratch folder (`$CI/../lanes/<lane>/jobs/<name>.sh`), e.g.:
   ```bash
   #!/usr/bin/env bash
   . "$CI_RUN/lib.sh"                       # step / serve / serve_tree / plant_check / finish
   step tsc npx tsc --noEmit
   step hub npx tsx scripts/maswali-hub.test.mts
   step notify npm run test:maswali-notify            # db-scratch suites work (embedded PostgreSQL is installed)
   serve 3410 FEATURE_MILLIONEA=ACTIVE FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW -- \
     bash -c 'node scripts/maswali-player-drive.mjs > "$OUT/drive.log" 2>&1; echo "drive rc=$?" | tee -a "$OUT/summary.txt"'
   finish                                    # prints the summary and exits non-zero if any step failed
   ```
   `step <name> <cmd…>` logs to `$OUT/<name>.log` (names: letters, digits, dot, dash, underscore — NO colon). `serve <port>
   [VAR=v …] -- <cmd…>` starts a FRESH in-memory `next dev` (no DATABASE_URL, DISABLE_ADMIN_TOTP=true) and runs `<cmd>` with
   BASE/KP_BASE=http://localhost:<port>. Anything written under `$OUT` or the tree's `.50pick-shots/` is brought back.
   A red twin plants into a source file and restores it: run it on the runner, never here.
3. Run it IN THE BACKGROUND (Bash with run_in_background: true; you are told when it ends):
   `bash $CI/ci-run.sh <lane>-<what> <commit-sha> <job.sh> --wait` (add `--webkit` when a check needs WebKit).
   It prints the run's address; when done, the run's log and artifacts are in `$CI/runs/<lane>-<what>-<stamp>/`:
   `run.log` (the whole log) and `art/` (the artifact keeps the runner's folders: `$OUT` lands under `art/out/_temp/out/`,
   tiles under `art/out/kipindi/kipindi/.50pick-shots/` — use `find "$CI/runs/<run>/art" -name summary.txt` to be sure).
4. Batch: each run costs ~4 minutes of setup (npm ci, browsers). Put a whole batch in one job; at most TWO runs of yours
   at a time. Never print or commit a secret; the runner's logs are PUBLIC.

## Git (unchanged from the OMEGA rules)
- Your worktree is the one your brief names (no node_modules). `git branch --show-current` before every commit. Stage BY
  NAME (`git add <paths>`), never `-A` or `.`. Never `git stash`. Never force-push. Never rewrite pushed history.
- Commit messages via a file (Write it into your scratch folder, then `git commit -F <file>`). Subject starts
  `MASWALI-BUILD <STEP> <n>:` (your brief names STEP). End the body with a blank line and
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push ONLY your branch, full refspec: `git push origin refs/heads/<b>:refs/heads/<b>`; confirm with
  `git ls-remote origin refs/heads/<b>`. Push after every commit you have checked (a WIP commit may be pushed marked
  "WIP: not verified" when you must stop).
- Files on this machine check out with CRLF (core.autocrlf=true) and commit as LF; `.sh` files are LF. Use Edit/Write.
- ⛔ ESCAPES ARE EATEN HERE: the Edit and Write tools decode a typed backslash followed by u, b, f, n, r or t into the RAW
  character (a regex word boundary becomes a backspace byte; a no-break-space escape becomes the invisible character), and
  a bash heredoc collapses a double backslash — even with a quoted delimiter. When new text must contain such an escape
  (in a regex, a JS string, a test plant), write a small Python script file whose text builds it with `chr(92)` and run it
  (`python <file> <target>`), then scan the target for control bytes:
  `python -c "import sys; d=open(sys.argv[1],'rb').read(); print([hex(c) for c in (8,7,11,12,27) if bytes([c]) in d])" <file>`.
  The repo's `test:source-bytes` also fails on them — run it on the runner after any such edit.

## Honesty (AGENTS.md §4, §8)
- Never waive a failed check, invent a result, or quote a count you did not see printed. A red that predates your change is
  still reported, with its proof (the same check failing on your branch's base, on the runner).
- Every change carries its guard and a mutation proof (the guard fails when the change is undone). Assert values (a measured
  box, a computed style, a rendered string in en/sw/zh), not source text.
- Derive what to run from the diff: `git grep -l <changed path or symbol> -- scripts/` (tests, red twins, anchors — anchors
  pin exact lines: re-pin what you move). Floors only rise, to a count a green run PRINTED.
- PUBLIC repo: describe anti-abuse/harm controls by what they enforce, never by signals/thresholds/windows/counts.
- Design: AGENTS §7 + `docs/DESIGN_AUTHORITY.md` (§0, §M8a); the kit in `src/components/ui/*` (extend, never duplicate);
  ONE glyph family `I`; money via `formatTzs`/`.amount`; every player string in en/sw/zh with identical placeholders and
  the DECIDED words; tap targets ≥ 40px; no layout shift; motion from the platform tokens with a reduced-motion end state;
  WITHDRAWN must stay dark.
- Reading tiles: the Read tool shows a PNG. Read at most ~40 per pass, sw first; say which tiles you read.

## ⭐ Every change is a recorded FINAL rule (Ali, 2026-10-22)
In the SAME commit: the rule in the document that OWNS it (AGENTS §3: design → DESIGN_AUTHORITY §M8a; an owner ruling →
COMPLIANCE-DECISIONS; money → RULES; a defect → FAILURE-INVENTORY / MASWALI-PLAN §8), and every other place that states the
OLD rule corrected or struck. ⛔ Do NOT edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md` (the lead's).

## Your final report (the lead acts on it; complete and plain)
1. Commits pushed (sha + subject) and the branch head as `git ls-remote` shows it.
2. Every check: the run (address), each step's printed result (counts); every floor you changed.
3. Anything red: the failure text, whether it predates you (with proof), what you did.
4. Decisions you took (with reasons); anything that needs the lead or Ali.
5. What is left, in order. 6. `git status --short` at the end (clean, or why not).
