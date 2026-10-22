# Lane S6-DOCS — the admin guide (Ali's PDF), the legal and data records, the migration proof

- Lead: asheib-f3 ("main" to SendMessage). Integrator: lane S6 — it merges your branch into `claude/maswali-s6-release` and
  runs the batteries. You report to "main"; say there when a commit is ready to merge.
- Tree: `C:/50pick-ssd/kipindi-mln-fply` (clean, real node_modules; now on `claude/maswali-s5-fix-player`). Start:
  `git -C C:/50pick-ssd/kipindi-mln-fply fetch origin && git -C C:/50pick-ssd/kipindi-mln-fply checkout -b claude/maswali-s6-docs origin/claude/maswali-s6-release`,
  then `git diff --quiet HEAD@{1} HEAD -- package-lock.json`; if it differs, `bash $S/mln-slot-s7c.sh s6-docs npm ci`
  before anything else. Push the branch at once (full refspec; confirm with `git ls-remote`). Merge
  `origin/claude/maswali-s6-release` (`git merge --no-ff`) whenever it moves; never rebase.
- Step name for commits: `S6-DOCS <n>`. Ports 3670–3679 · `KP_SCRATCH_PORT=5498` · scratch `$F/s6-docs/`.
- Heavy jobs (a dev server to read labels, tsc, a scratch Postgres): `bash $S/mln-slot-s7c.sh s6-docs <cmd…>` (slots 6
  and 4, shared by S6 and its four lanes: one heavy job at a time, batched; long ones with `run_in_background`). A dev
  server: `bash $S/mln-server-run.sh C:/50pick-ssd/kipindi-mln-fply <port> <log> -- <cmd>` on your ports only.

## Read first
1. `$F/LANE-COMMON.md` — the rules, including the last section ("Every change is a recorded FINAL rule").
2. `AGENTS.md` at your worktree root.
3. `$F/s6/phase1-final.md` ("C. Open items", "D. Needs Ali") — the gaps your items close, verified there.
4. `docs/MASWALI-PLAN.md` §3 (MR-1…MR-32: the rules every guide sentence links to), §6.2 (the weekly runbook), §7b S6 items
   7–10, §8 rows MB-33, MB-69, MB-70, MB-86, MB-91, MB-92; `docs/RULES.md`; `docs/maswali-operator-guide.html` as it is.
5. The ADMIN-COMPLETENESS review's results (ask main for the file; they say which controls, filters, sorts, searches and
   pagers each /admin/maswali screen has — the guide describes exactly those).

## 1 · The admin guide — Ali's deliverable (first, and to his standard from the start)
`docs/maswali-operator-guide.html` becomes the admin guide PDF on Ali's Desktop (the lead renders it with the repo's
pipeline at the end and reads every page). Ali's words: **"no unneeded wording, no unneeded things; clear, perfect for
admins to know how Maswali works, how they work it and what everything means".** Rewrite it in three parts, in this order:
1. **How Millionea works — one page.** The week; the ticket; 15 questions with 10 counted (the reserves, in order); the
   pool; the fee at payout (the figure from the rules the week froze — say where an admin reads it, never a hard-coded
   number that a config change would make false); rollover; sharing.
2. **How admins run it — each /admin/maswali screen in the order of a week's life:** draft → publish → sales close →
   results and seals (two officers) → objections → settlement and payout → void and refunds → reports. For each step:
   who may do it (the role), where (the screen and the button, their labels COPIED from the rendered UI — read them on a dev
   server of your branch, never paraphrased), what the system refuses, and what to do when it refuses. The sorting,
   filtering, searching and paging of /admin/maswali, /admin/maswali/pools and /admin/maswali/integrity are described
   where they are used.
3. **What everything means — a glossary** of every term an admin sees: status words, the audit names shown in the UI, the
   report columns. One line each, English.
Rules: every rule links its owner (MASWALI-PLAN §3 MR-nn, or RULES §n). Nothing about HOW any anti-abuse control detects
anything (a public repo): only what it enforces. No history, no programme talk, no lane or step codes, no implementation
names (no file, function or table names). Case: a static suite (extend the guide's existing reader if one exists, else a
new light `scripts/<name>.test.mts`) that fails when a label quoted in the guide is not in the rendered page's source of
that label, when a section of part 2 lacks its who/where/refused/what-to-do, or when a programme code or a file name
appears; its plant. Records: the guide itself; `docs/MASWALI-PLAN.md` §7b S6 item 10's row note via main.

## 2 · The records and the legal items (the lead's rulings, binding)
- **(a) The migration proof:** keep the migrations' names. On a throwaway Postgres (your `KP_SCRATCH_PORT`, through the
  slot; never production): `prisma migrate deploy` from main's migrations folder (`git show 67e47f8d2:prisma/migrations`
  checked out to your scratch), then this branch's folder on the same database — exactly the new migrations apply, a
  second deploy says "No pending migrations", and each new migration's SQL replays once cleanly; then
  `npm run verify:backup-schema`. Report every printed line; record the proof in the migrations' own header comments.
- **(m)** the Auditor's access exactly as MB-92's text (the evidence pack and the screens it names; nothing else) — a case
  per screen in `test:maswali-rbac` (+ its plant).
- **(n)** draft timeless approved campaign wordings (en, sw) that never say "this week's questions" when no week is on
  sale — to main, for Ali's approval list. No code until approved.
- **(o)** draft the death script (MB-86) and the Millionea section of the Terms (OD-18) — to main, for the legal review on
  Ali's list; GBT's answer on OD-08 goes on the same list. No live legal text changes in this lane.
- **(p)** a list for a UI lane, to main: MB-33 (the register's criteria and seal evidence), MB-70 (the slip's rules strip),
  L17 ("corrected on objection" on the public register).
- **(q) the rest of the open list**, each with its case and plant where it is code, and its record:
  - the privacy notice (item 7): tickets in exports, the salt, the seven-year keep — with its version moved and a dated
    `docs/COMPLIANCE-DECISIONS.md` entry (the notice's own version rule; `test:privacy-notice`);
  - the evidence pack (item 8) carries `maswali.settlement.float_unread` (`test:maswali-evidence`, both stores);
  - the support scripts (item 9): a check-window claim goes to the officer who set the result (binding §6), never
    "Compliance rules on it"; the scripts' header no longer says the guide is "not written yet"; the chat handoff;
  - MASWALI-ARCHITECTURE.md (item 10): the data, notices and reports modules as built;
  - the binding rules text's §11 states the stale-form rule (a form opened before a week was made final cannot buy) — a
    move of the binding text goes with its hash in `millionea-rules-version.ts` inside the unpublished version, with a
    dated COMPLIANCE line (as S6-INT 11 did); `test:maswali-fairness` §L re-pinned;
  - item 1: the proof page's gate (the review verified it uses the wrong one) — case and plant;
  - MB-91: `maswali-config` 1.10 no longer calls the five-day answer owed (Ali ruled five days on 2026-10-21);
  - TAX-REPORT.md no longer says OD-08 is owed for Finance (confirmed 2026-10-21; GBT still open); `test:tax-report` gets
    a floor at its printed count;
  - the harm watch's candidate window derived from the detectors' exported constants (item 6), with nothing about the
    window written in any doc or comment beyond the constant's name (`test:harm-watch` H.10e stays green).
- PDFs: re-render `50pick-betting-rules-final.pdf` and `50pick-rates-for-admins.pdf` only if their sources move; read every
  page; say what moved.

## Readers to run (derive the rest from your diff: `git grep -l <path or symbol> -- scripts/`)
`test:maswali-fairness` (both stores), `test:privacy-notice`, `test:maswali-evidence` (both stores), `test:maswali-rbac`
+ red, `test:maswali-config`, `test:tax-report` + red, `test:harm-watch` (both stores, H.10e), `test:house-bot-disclosure`
and `test:house-bot-blob-pin` (D19a: a legal file or the dictionary moved), the support-script and chat suites your diff
names, `test:filter-language`, tsc (slot) once per batch.

## Records (the lane's whole job is records — LANE-COMMON's last section in full)
Each rule in its owner; every other place that states the old rule corrected; each record named in the commit message.
`docs/DESIGN_AUTHORITY.md` §M8a: new items start at 28 (19–27 are taken) — ask main for the number first.

## Forbidden (LANE-COMMON)
⛔ Never edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md`. ⛔ Never build, test or run a server in
`F:\kipindi-main`; never edit outside your worktree except `$F/s6-docs/`. ⛔ Never `test:all`, `e2e:money`/`e2e:fault`/
`e2e:card`, anything against production, or `/auth/demo` in a warm-up list. ⛔ Never `git stash`, force-push or rewrite
pushed history; stage by name; push only your branch, full refspec, confirmed by `git ls-remote`. ⛔ PUBLIC repo: describe
a control by what it enforces, never its signals or thresholds; never print or commit a secret. ⛔ Never waive a failed
check or quote a count you did not see printed. ⛔ WITHDRAWN stays dark. ⛔ Do not touch kipindi-mln-gate, -rb, -par or
maswali-s7-red-20261021.

## Report (to "main", at each milestone and at the end)
LANE-COMMON's six points; the guide's three parts as rendered (which labels you read on which page); the drafts for
Ali's list; for each item its commit, cases and plants, the records it changed, and every printed result.
