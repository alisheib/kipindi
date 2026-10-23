# MASWALI-BUILD — the rules every lane follows (OMEGA-COMPILE01, session asheib-f3, from 2026-10-22 PM)

You are a lane of the MASWALI-BUILD lead (Claude session asheib-f3 on OMEGA-COMPILE01; it is "main" to SendMessage).
The product is **50pick**, a Tanzania-licensed REAL-MONEY pari-mutuel prediction market (repo `alisheib/kipindi`,
PUBLIC). Maswali Millionea is its third product (a weekly 15-question jackpot ticket), built DARK behind a rollout
switch that stays `WITHDRAWN` in code. Ali (the owner, non-technical) wants every surface 10/10 and every money path
proven; nothing goes live unverified. Only the lead pushes `main`.

## Paths
- `$S` = the toolbox of the previous lead (scripts, briefs, critic reports, tiles, the parity baseline):
  `C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad`
- `$F` = this lead's scratchpad: `C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad`
  Your scratch folder is `$F/<lane>/` (logs, message files, helper scripts — never inside the repo).
- The hand-over (read-only, via git): branch `maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`
  (README.md top "STOP 3", MERGE-NOTES.md, critics/). `$S/critics/` holds the same critic files on disk.

## Read first
1. `AGENTS.md` at your worktree root — THE rules file. It wins over everything.
2. Your brief (`$F/briefs/<LANE>.md`) and the documents it names.
3. ⛔ Do NOT edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md` (the lead owns the tracker). Other docs your change
   owns (DESIGN_AUTHORITY §M8a for a ruling you implement, COMPLIANCE-DECISIONS, a test header) change in the same commit.

## The machine (shared by every lane — be frugal)
- Windows 11, 12 logical CPUs, 32 GB of which ~15 GB is free for us (Ali's apps hold the rest). Bash (Git Bash) and
  PowerShell 5.1. No Python.
- Your worktree is on the SSD (`C:/50pick-ssd/<yours>`) with a REAL `node_modules`. ⛔ Never build, test or run a server
  in `F:\kipindi-main`. Never edit files outside your worktree except your scratch folder.
- `export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'` for node jobs.
- Git Bash eats backslashes in `node -e '…'` and in heredocs: write files with the Write/Edit tools.
- Git Bash rewrites a leading-slash argument into a Windows path: prefix `MSYS_NO_PATHCONV=1` when passing routes.

## Heavy jobs only through a slot helper (the machine-wide budget)
HEAVY = `npx tsc --noEmit`, `next build`, `next dev` + any browser drive/shots, every suite that boots a scratch
PostgreSQL (db-scratch, "both stores", `*-pg-*`), every `red:*` twin of such a suite, `qa:*`, `test:responsive`,
`test:motion`, `test:all`, `e2e:*`. A single static `npx tsx scripts/<x>.test.mts` that only reads source is LIGHT.
- S5 lanes: `bash $S/mln-slot-s5x.sh <lane> <command…>` (slots 1, 2, 3, 5). S7/S6: the slot named in your brief.
- The helper waits while free RAM < 5 GB and yields to `F:/kipindi-locks/heavy-node.lock`. Batch your heavy work: one
  tsc per batch, one server at a time, few browsers.
- Long jobs: `run_in_background: true` and wait for the completion notice (never a sleep-poll loop; foreground Bash
  stops at 10 min). Pipe output to a log in your scratch folder; read its tail.
- ⛔ Never `test:all`, never `e2e:money`/`e2e:fault`/`e2e:card`, never anything against production, never `/auth/demo`
  in a server warm-up list. The lead runs the batteries.
- Database suites: `KP_SCRATCH_PORT=<your port>`; one database suite at a time per worktree (one `.pgscratch`).
- A dev server: `bash $S/mln-server-run.sh <your tree> <port> <log> [VAR=…] -- <cmd>` (a fresh in-memory `next dev`; your
  ports only; BASE `http://localhost:<port>`, never 127.0.0.1). Stop a server by its PORT, never by a path match; stop
  only what you started. Drives that read English set the `kp-locale` cookie and read `<html lang>` back.
- A `red:*` twin plants a defect INTO a source file and restores it. After every red run (and after any timeout or
  stop) run `git status --short`; restore a planted file with `git checkout -- <file>`; delete `.red-*.lock` /
  `.red-in-place.bak` leftovers.

## Git
- `git branch --show-current` before every commit. Stage BY NAME (`git add <paths>`), never `-A` or `.`.
- Never `git stash` (one stack for every worktree on this PC). Never force-push. Never rewrite pushed history.
- Commit messages via a file: Write the message into your scratch folder, then `git commit -F <file>`. Subject starts
  `MASWALI-BUILD <STEP> <n>:` (your brief names STEP). End the body with a blank line and
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push ONLY your branch, with a full refspec: `git push origin refs/heads/<b>:refs/heads/<b>`; then confirm
  `git ls-remote origin refs/heads/<b>` shows the new sha (a plain push here can print "Everything up-to-date" without
  pushing). Push after EVERY commit — a session limit can stop you at any moment; an unpushed commit is lost work.

## Honesty (AGENTS.md §4, §8)
- Never waive a failed check, invent a result, or quote a count you did not see printed. A red that predates your change
  is still reported, with its proof (the same check failing on your branch's base).
- Every change carries its guard and a mutation proof (the guard fails when the change is undone). Assert values (a
  measured box, a computed style, a rendered string in en/sw/zh, a contrast ratio), not source text.
- Derive what to run from the diff: `git grep -l <changed path or symbol> -- scripts/` (tests, red twins, anchors — S5's
  anchors pin exact lines: re-pin what you move). Floors only rise, to a count a green run PRINTED.
- PUBLIC repo: describe anti-abuse/harm controls by what they enforce, never by signals/thresholds. Never print or commit
  a secret.
- Design: AGENTS §7 + `docs/DESIGN_AUTHORITY.md` (§0, §M8a); the kit in `src/components/ui/*` (extend, never duplicate);
  ONE glyph family `I` (a new key → ask the lead); money via `formatTzs`/`.amount`; every player string in en/sw/zh with
  identical placeholders and the DECIDED words; tap targets ≥ 40px; no layout shift; motion from the platform tokens
  with a reduced-motion end state; WITHDRAWN must stay dark (a door you touch draws nothing while WITHDRAWN).

## Talking to the lead
SendMessage to "main" for: a gap in another lane's file (file, line, tile — never fork it), a decision you cannot take,
a blocked step. Keep working on what is not blocked meanwhile.

## Your final report (the lead acts on it; complete and plain)
1. Commits pushed (sha + subject) and the branch head as `git ls-remote` shows it.
2. Every check you ran: the exact command → its printed result (counts); every floor you changed.
3. Anything red: the failure text, whether it predates you (with proof), what you did.
4. Decisions you took (with reasons); anything that needs the lead or Ali.
5. What is left, in order.
6. `git status --short` at the end (clean, or why not).

## ⭐ Every change is a recorded FINAL rule (Ali, 2026-10-22: "make sure any change is final rule and documented everywhere it should be documented, so nothing is misleading")
In the SAME commit as the change:
- the rule goes into the document that OWNS it (AGENTS §3): design → `docs/DESIGN_AUTHORITY.md` (§M8a for Millionea; the
  platform section it amends otherwise); an owner ruling → `docs/COMPLIANCE-DECISIONS.md` (dated, his words quoted);
  money/rules → `docs/RULES.md` or the Millionea rules text; a finding/defect → `docs/FAILURE-INVENTORY.md` / the §8 MB row;
  a programme fact → MASWALI-PLAN (the lead's §0/§1 — tell the lead);
- every OTHER place that still states the OLD rule is corrected or struck (grep docs/, the guides, code comments, test
  headers) — a fact lives once, elsewhere a link to its owner;
- name each record you changed in the commit message and your report.
