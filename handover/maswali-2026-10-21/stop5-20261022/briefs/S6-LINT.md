# Lane S6-LINT — the Millionea claims lint: dark-safe gating (ruling 6) and the review's findings 1–8 and 10–13

- Lead: asheib-f3 ("main" to SendMessage). Integrator: lane S6 — it merges your branch into `claude/maswali-s6-release` and
  runs the batteries. You report to "main"; say there when a commit is ready to merge.
- Tree: `C:/50pick-ssd/kipindi-mln-rep` (clean, real node_modules; now on `mln-s6-reports`). Start:
  `git -C C:/50pick-ssd/kipindi-mln-rep fetch origin && git -C C:/50pick-ssd/kipindi-mln-rep checkout -b claude/maswali-s6-lint origin/claude/maswali-s6-release`,
  then `git diff --quiet HEAD@{1} HEAD -- package-lock.json`; if it differs, `bash $S/mln-slot-s7c.sh s6-lint npm ci`
  before anything else. Push the branch at once (full refspec; confirm with `git ls-remote`).
- Finding 9 lands on the release branch as `MASWALI-BUILD S6-INT 16` (the 640-character limit at the composer's door,
  `test:maswali-claims` §8, plant C27). Merge `origin/claude/maswali-s6-release` (`git merge --no-ff`) whenever it moves;
  never rebase. Your cases go after §8; your plants after (C27).
- Step name for commits: `S6-LINT <n>`. Ports 3650–3659 · `KP_SCRATCH_PORT=5496` · scratch `$F/s6-lint/`.
- Heavy jobs: `bash $S/mln-slot-s7c.sh s6-lint <cmd…>` (slots 6 and 4, shared by S6 and its four lanes: one heavy job at
  a time, batched; long ones with `run_in_background`).

## Read first
1. `$F/LANE-COMMON.md` — the rules, including the last section ("Every change is a recorded FINAL rule").
2. `AGENTS.md` at your worktree root.
3. The lint review after round 17: `$F/s6/lint-review.md` (findings 1–14, each with its traced sentences, the lines and
   the fix; its probes in `$F/s6/lint/`), and lane N's review `$F/s6/phase1-A.md` (L-7, L-8; D3 on the classic-campaign
   flag; "The classic-campaign flag" under "Checked and sound").
4. `src/lib/marketing/millionea-claims.ts` (its header first), `src/lib/marketing/footer.ts` (the composer's one door),
   `src/lib/server/marketing/millionea-lint-epoch.ts`, `instrumentation.ts`, `scripts/maswali-claims.test.mts` (its
   header lists every round's cases) and `scripts/anchors/maswali-claims.anchors.mjs`.

## The lead's rulings (decisions, binding)
- **Ruling 6:** the claims lint, while Millionea is dark, must not change classic behaviour. Gate every effect on a classic
  campaign behind the ACTIVE ceiling. While the rollout is WITHDRAWN or STAFF_PREVIEW only Millionea-tagged campaigns meet
  the lint; a tagged campaign is refused with MILLIONEA_NOT_LIVE, worded without the product's name. Prove that a classic
  campaign started before and after the stamp sends exactly as on main.
- **Accepted corrections to ruling 6:** drop the boot write (`instrumentation.ts` → `millionea-lint-epoch`); stamp
  `first_run` at the first door that judges an UNTAGGED campaign under the ACTIVE ceiling (nothing reads or writes it
  before); while not ACTIVE the composer's counter runs only the tagged rules, and the untagged rules run server-side only
  (no client prop carries them).
- **Lint round (ruling l):** findings 1–13, finding 9 first (done by the integrator). L-8: reword MILLIONEA_UNTAGGED without
  the product's name while dark, and confirm the lint's chunk is acceptable under the dark rule (or move what ruling 6
  makes server-only off the client). L-7 (optional): tighten `hookContext` for `afterCommit`'s run-now branch.

## Items, in this order (each: the change, its case, its plant, its readers, its records)
1. **Ruling 6 + its corrections.** Cases: a classic campaign judged before and after the stamp, under WITHDRAWN,
   STAFF_PREVIEW and ACTIVE (save, test send, an engine slice) — its verdict and its send equal to main's (the review's
   D3 items 1–3: no `rules_unreadable` wait, no refusal of an untagged body for a Millionea signal, no refusal of a Chinese
   body, unless ACTIVE); a tagged campaign while dark refused in words that do not name Millionea; no boot write
   (`instrumentation.ts` holds no lint call: a static census case); `first_run` written by the first door that judges an
   untagged campaign under ACTIVE, and by nothing before; the counter's client bundle carries no untagged rule (a static
   case on the composer's import graph). Plants for each. Readers: the instrumentation readers (`test:multi-container`,
   `test:monitoring`, `test:audit-drain`, `test:money-busy`, `test:contacts-boundary`, `test:house-bot-holder-lifecycle`),
   the marketing suites (`test:campaign-gates`, `test:campaign-visuals`, `test:marketing-preflight` + red, the marketing
   engine's suites under `scripts/marketing-engine/`), `test:client-graph-safe`, `test:maswali-claims` + red.
2. **Findings 1–8 and 10–13** (the review's order: 1–4 HIGH first). For each: every sentence the review traced is a case
   with the verdict the lead's rulings give it (refused, or ordinary copy allowed), the fix exactly as the review states it
   or better, and a plant in `maswali-claims.anchors.mjs` that turns the case red. Finding 11: state each rule as the
   refusal it enforces — no "unless" list spelled out in a public repo (AGENTS: describe a control by what it enforces);
   correct the false sentences the review quotes. Finding 13: the suite and red-twin gaps it lists. Raise the floor only to
   a count a green run printed.
3. **L-8** and, if you take it, **L-7** — a case and a plant each.

## Readers to run (derive the rest from your diff: `git grep -l <path or symbol> -- scripts/`)
`test:maswali-claims` + `red:maswali-claims` · `test:campaign-gates`, `test:campaign-visuals`, `test:marketing-preflight` +
red, `scripts/marketing-engine/*` suites · `test:client-graph-safe` · the instrumentation readers above · `test:house-bot-
reports` (both stores, if an audit read moves) · `test:unsaved-changes`, `test:admin-act-gate` if the composer's UI moves ·
tsc (slot) once per batch.

## Records each item changes
- The lint module's header (the rule stated once, in force) and every place that states the old rule: the composer's
  comments in `footer.ts`, `campaign-template.ts`, `campaign-draft.ts`, the marketing docs under `docs/` that describe the
  lint (grep "Millionea" in `docs/MARKETING*`), the claims suite's header.
- `docs/MASWALI-PLAN.md` §8 row MB-47 (its treatment as built; rows are yours, §0/§1 are not) and a
  `docs/FAILURE-INVENTORY.md` §9b entry per finding (as the integrator's finding-9 entry).
- `docs/DESIGN_AUTHORITY.md` §M8a only if a screen changes: new items start at 28 (19–27 are taken) — ask main for the
  number first.

## Forbidden (LANE-COMMON)
⛔ Never edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md`. ⛔ Never build, test or run a server in
`F:\kipindi-main`; never edit outside your worktree except `$F/s6-lint/`. ⛔ Never `test:all`, `e2e:money`/`e2e:fault`/
`e2e:card`, anything against production, or `/auth/demo` in a warm-up list. ⛔ Never `git stash`, force-push or rewrite
pushed history; stage by name; push only your branch, full refspec, confirmed by `git ls-remote`. ⛔ PUBLIC repo: describe
a control by what it enforces, never its signals or thresholds; never print or commit a secret. ⛔ Never waive a failed
check or quote a count you did not see printed. ⛔ WITHDRAWN stays dark. ⛔ Do not touch kipindi-mln-gate, -rb, -par or
maswali-s7-red-20261021.

## Report (to "main", at each milestone and at the end)
LANE-COMMON's six points; for each item, its commit, its cases and plants, the records it changed, and every printed result.
