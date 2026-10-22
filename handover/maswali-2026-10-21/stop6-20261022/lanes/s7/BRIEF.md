# Lane S7 — adversarial hardening, finish (with the objection door OB merged) — lead ali-7e on ALI-BLADE15, 2026-10-22 evening

- Worktree `C:/kipindi-mln-s7` · branch `claude/maswali-s7-s5` (head `a7feccbef` = S7-MERGE 3: OB at 1c8b42284 merged; clean)
  · step names `S7-F9 <n>` (next 14) and `S7-MERGE <n>` (next 4) · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/s7/`.
- Read FIRST: `../LANE-COMMON-BLADE.md` (this machine's rules — no Node here; every check through the remote runner).
- Then (git show from `origin/maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`):
  `stop5-20261022/briefs/S7.md`, `stop5-20261022/briefs/OB.md`, `stop5-20261022/lead/mr16-as-built.md`, the S7/OB parts of
  `stop5-20261022/lead/NOTES.md`, your tools in `lanes-20261022/s7/`; and `docs/MASWALI-PLAN.md` §7b "S7" on your branch.
- Your last commit message (`git log -1 --format=%B a7feccbef`) holds "What is left, in order" 1–7: your work order.

## Step 0 — merge the current S5 release (S7-MERGE 4)
`git fetch origin`; merge `origin/claude/maswali-s5-release` (head `2ed817395` or newer; 16+ commits since your last merge
e34bcdc95: S5-R2-TICKETS, S5-FACTS/FACTS2, the language-loader colour fix, three red fixes, and the e2e:maswali-fault harness
fix — the kill now reaches the release on Linux, and 1.2 also requires that the killed release never finished). Resolve as
S7-MERGE 1–3 did (every resolution in the commit message; D19a re-pinned ONCE if the dictionary moved; anchors re-derived
where a merge moved a pinned line); push. The S5 round-2 lanes (HUB, REGISTER, PLATFORM, landing door) land on the release
later — you merge the release once more at the end; do not wait for them.

## Then your list 1–7 (all on the runner)
1–2. test:house-bot-blob-pin + test:house-bot-disclosure; qa:maswali-objection-console on a fresh in-memory dev server.
3. S7-F9 14 (the docs change written, not applied — RULES §2.12's sunset paragraph = MR-30's final-week rule as players read
   it, no floor top-up; DESIGN_AUTHORITY §M8a item 19) with test:maswali-law, test:rules-copy, test:maswali-config.
4. The full reds on your head: red:maswali-money-path (every plant, 6b included), red:dal-parity, red:maswali-fence,
   red:maswali-objections. Long reds may be split across PARALLEL runs with their `--only` selectors: each run has its own
   machine and tree, so two plants can never collide. The union of the selectors must cover every plant; print each run's
   caught/missed counts and the total.
5. The S17 rush with MB-97: apply the written harness change; the rush's latency is measured on a GitHub runner, so
   measure a BASELINE (the same harness at your S7 base before the change, or the release head) and your head IN THE SAME
   JOB (same machine), and record both with the machine named — never compare a runner's figure with OMEGA's. Targets:
   the lead's (p95 ≤ 1,000 ms, p99 ≤ 2,000 ms, 0 BUSY on OMEGA): judge them on the runner against the baseline measured
   with them; if the runner's baseline itself misses the targets, report that plainly — do not change the targets.
   Record MB-97 in MASWALI-PLAN §7b S7 (your section, not §0/§1).
6. red:house-bot-console and red:house-bot-c5 (the long one): split across parallel runs by their selectors if they have
   them; otherwise one run each (a job may run up to ~5.5 hours).
7. Your report must include the three texts item 7 names (the §8 MB-74 and MB-96 rows, the MR-16 reserve naming, and the
   plan §0 line that still names what TK.2 watches — the lead fixes §0).

## Public-repo rule (sharp here)
TK.2 / MB-96 and the harm controls: say what a control enforces, never what it watches, its window, count or threshold —
in code comments, test names, commit messages, docs and run names.

## Done means
1–6 done, tsc 0 and every Maswali two-store suite at or above its floor on the runner at your final pushed head, every red
caught (0 missed), the rush recorded. Then your report (LANE-COMMON-BLADE's six points).
