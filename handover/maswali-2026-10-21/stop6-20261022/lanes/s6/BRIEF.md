# Lane S6-INT — the S6 integrator (fairness, notices, reports, legal, data) — lead ali-7e on ALI-BLADE15, 2026-10-22 evening

- Worktree `C:/kipindi-mln-s6` · branch `claude/maswali-s6-release` (head `d5d20ccd3` = S6-INT 20, clean) · step name
  `S6-INT <n>` (next 21) · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/s6/`.
- Read FIRST: `../LANE-COMMON-BLADE.md` (this machine's rules — no Node here; every check through the remote runner).
- Then (git show from `origin/maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`):
  `stop5-20261022/briefs/S6.md`, `stop5-20261022/briefs/S6-{NOTICES,LINT,MONEY,DOCS,ADMIN}.md` (the five lanes' briefs and the
  lead's binding rulings), the S6 parts of `stop5-20261022/lead/NOTES.md`, your kit in `lanes-20261022/s6/` (resolve.mjs /
  replace.mjs keep CRLF — they are Node: do not run them here; read them for the resolutions), and `docs/MASWALI-PLAN.md`
  §7b "S6" on your branch.
- Your last commit message (`git log -1 --format=%B d5d20ccd3`) holds "WHAT IS LEFT, IN ORDER" 1–5: your work order.
  Each lane's last commit message holds its own "what is left" (NOTICES `6499c7c88` WIP, LINT `ba19508a6`, MONEY `7823a9685`
  WIP, DOCS `a4033dbf5` WIP, ADMIN `b48dd3709` WIP).

## The plan for S6 on this machine
You integrate, and you also FINISH the console-side lanes yourself, one at a time, on their own branches (each in a
worktree you create: `git -C C:/kipindi-main worktree add C:/kipindi-mln-s6<x> claude/maswali-s6-<lane>` after
`git -C C:/kipindi-main fetch origin` and `git -C C:/kipindi-main branch --track claude/maswali-s6-<lane> origin/claude/maswali-s6-<lane>`):
1. Merge S7's tip into this branch first (`origin/claude/maswali-s7-s5`, a7feccbef or newer: OB's objection door and its
   control — the Millionea control count becomes 26: pin the PRINTED count). Push.
2. LINT (`ba19508a6`, ready but its tsc + red:maswali-claims are owed): run them on the runner at the lane's head; merge it.
3. ADMIN (WIP G1): its "left" list (re-pin the open-week refusal anchor; test:maswali-register-cache's "source invalidate";
   tsc; the DB suites that read the changed services; the admin drive + shots at 360/768/1280, READ). Then its remaining
   items G2–G9 per its brief. Merge.
4. DOCS (WIP: the Auditor reads the console, ruling (m)): tsc, red:maswali-rbac, the remaining light readers, read-tiers 7.1's
   proof at the base; then its items per its brief EXCEPT the admin guide's final PDF render (the lead renders it at the end
   from the finished console) — the guide's HTML text is DOCS' and must describe exactly the console as built. Merge.
5. Your own owed reds (item 1 of your list) and, after each merge, the merged head's readers on both stores where they have
   two, its reds, tsc. Push after each.
NOTICES and MONEY (money and delivery paths) are another lane's — the lead will start it; do not take them, but merge their
ready heads when the lead tells you.

## Public-repo rule
Harm and anti-abuse controls (the claims lint, the harm watch, the takeover alert): say what each enforces, never what it
reads, its window, count or threshold — code comments, test names, commit messages, docs, run names.

## Done means (for this round)
S7 merged; LINT, ADMIN and DOCS merged with their checks green on the runner at the merged head; your owed reds caught (0
missed); tsc 0. Then your report (LANE-COMMON-BLADE's six points) with S6's remaining list in order (NOTICES, MONEY, the
acceptance on the integrated head).
