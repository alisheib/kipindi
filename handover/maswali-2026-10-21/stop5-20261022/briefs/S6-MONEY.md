# Lane S6-MONEY — OD-13's officer payout through the freeze, the payout float before crediting (MB-11), the cluster-with-winner alert (MB-35), the rules version on each ticket (MB-69)

- Lead: asheib-f3 ("main" to SendMessage). Integrator: lane S6 — it merges your branch into `claude/maswali-s6-release` and
  runs the batteries. You report to "main"; say there when a commit is ready to merge.
- Tree: `C:/50pick-ssd/kipindi-mln-fsrv` (clean, real node_modules; now on `claude/maswali-s5-fix-srv`). Start:
  `git -C C:/50pick-ssd/kipindi-mln-fsrv fetch origin && git -C C:/50pick-ssd/kipindi-mln-fsrv checkout -b claude/maswali-s6-money origin/claude/maswali-s6-release`,
  then `git diff --quiet HEAD@{1} HEAD -- package-lock.json`; if it differs, `bash $S/mln-slot-s7c.sh s6-money npm ci`
  before anything else. Push the branch at once (full refspec; confirm with `git ls-remote`). Merge
  `origin/claude/maswali-s6-release` (`git merge --no-ff`) whenever it moves; never rebase.
- Step name for commits: `S6-MONEY <n>`. Ports 3660–3669 · `KP_SCRATCH_PORT=5497` · scratch `$F/s6-money/`.
- Heavy jobs: `bash $S/mln-slot-s7c.sh s6-money <cmd…>` (slots 6 and 4, shared by S6 and its four lanes: one heavy job
  at a time, batched; long ones with `run_in_background`).

## Read first
1. `$F/LANE-COMMON.md` — the rules, including the last section ("Every change is a recorded FINAL rule").
2. `AGENTS.md` at your worktree root — the money rules (§6: amounts, the ledger, conservation; never a thrown boot).
3. `$F/s6/phase1-final.md` ("Wording and RG of the notices", H2 = OD-13; "Open items": MB-11, MB-35, MB-69) and the words
   review `$F/s6/words-review.md` (H2: why no code can pay a winner who cannot sign in today).
4. `docs/MASWALI-PLAN.md` §3 (MR-…), §5b (the ledger movements), §8 rows MB-11, MB-35, MB-69; OD-13 in §2.
   `src/lib/server/maswali-settlement.ts`, `maswali-money-service.ts`, `wallet-service.ts` (`withdraw`), `responsible-
   gambling.ts` (the freeze), `src/lib/server/maswali-console.ts` (the float alert strip).

## The lead's rulings (decisions, binding)
- **(k) OD-13:** BUILD the officer payout through the freeze before ACTIVE — a winner whose account cannot sign in
  (self-excluded; and whatever OD-13 names) is paid their share by an officer act: identity and email rules unchanged, both
  stores, money conserved to the shilling, audited, race-safe (the chain lock and the wallet lock in the platform's order),
  with a red twin. Until it lands the notices tell the interim truthful sentence (the NOTICES lane writes it); when your act
  lands, the sentence it replaces is yours to switch in the same commit (coordinate with NOTICES through main).
- **MB-11:** the payout float is checked BEFORE crediting, not only after; the float alert is seen by Finance and
  Compliance (today the Millionea strip on /admin shows only to trading viewers and the Owner).
- **MB-35:** an alert when a cluster holds a winner.
- **MB-69:** the binding rules' version is stamped on each ticket at purchase (`MILLIONEA_RULES_VERSION`, beside the
  week's mark; today `maswali-money-service.ts` around :466 writes the week code and the instant only).

## Items (each: the change, its case, its plant, its readers, its records)
1. **OD-13's act.** A control (registered in `control-gates.ts`, its domain from the plan's §7b table; the rbac count moves:
   the release prints 25, and S7's objection door adds one when it lands — pin the PRINTED count), a server action behind
   it, an admin control on /admin/maswali/integrity beside the held shares (typed confirmation, its record read back,
   `useMayAct`/`useActDisabledReason`, the unsaved-changes census). Cases on BOTH stores: the paid amount equals the share
   to the shilling, the ledger balances, the wallet freeze is not lifted for anything else, a second press pays nothing, two
   officers at once pay once, a role without the control is refused and drawn its lock; a red twin plant per guard (in
   `scripts/anchors/maswali-money-path.anchors.mjs` or the suite's own anchors).
2. **MB-11** — the float read before the first credit; a short or unread float stops the crediting and says so; the alert's
   audience includes Finance and Compliance (a case per role on the console strip). Plants.
3. **MB-35** — the cluster-with-winner alert (Compliance's integrity page and the console strip): a case with a cluster
   that holds a winning ticket, and its control (one that does not). Plant. Describe what it enforces, never how a cluster
   is detected (PUBLIC repo).
4. **MB-69** — the version on each ticket; a case on both stores that a ticket bought under version V records V; plant.

## Readers to run (derive the rest from your diff: `git grep -l <path or symbol> -- scripts/`)
`test:maswali-settle`, `test:maswali-purchase`, `test:maswali-void`, `test:maswali-integrity`, `test:maswali-adversarial`,
`test:maswali-engine`, `test:house-bot-money` + `red:house-bot-money`, `test:house-bot-console` + red,
`red:maswali-money-path --only <your plants>`, `test:dal-parity` + red, `test:wallet-status-writers`,
`test:house-bot-holder-lifecycle`, `test:house-bot-reports` (both stores: a new audit read is a census entry),
`test:maswali-rbac` + red, `test:control-gates`, `test:admin-act-gate`, `test:unsaved-changes`, `test:maswali-integrity-list`
· all on BOTH stores where the suite has two · tsc (slot) once per batch.

## Records each item changes
- OD-13: a dated `docs/COMPLIANCE-DECISIONS.md` entry if the act implements an owner decision's text (quote the decision);
  `docs/MASWALI-PLAN.md` §8 rows (rows are yours, §0/§1 are not); `docs/RULES.md` or the binding Millionea rules text if
  either states how such a winner is paid (a binding-text move goes with its hash in `millionea-rules-version.ts`, inside
  the unpublished version, with a dated COMPLIANCE line — tell main first); the operator guide's step for it (the DOCS
  lane writes the guide; send it the labels).
- MB-11, MB-35, MB-69: their §8 rows; a `docs/FAILURE-INVENTORY.md` §9b entry each; every comment that states the old rule.
- `docs/DESIGN_AUTHORITY.md` §M8a only for a new screen element: new items start at 28 (19–27 are taken) — ask main for the number first.

## Forbidden (LANE-COMMON)
⛔ Never edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md`. ⛔ Never build, test or run a server in
`F:\kipindi-main`; never edit outside your worktree except `$F/s6-money/`. ⛔ Never `test:all`, `e2e:money`/`e2e:fault`/
`e2e:card`, anything against production, or `/auth/demo` in a warm-up list. ⛔ Never `git stash`, force-push or rewrite
pushed history; stage by name; push only your branch, full refspec, confirmed by `git ls-remote`. ⛔ PUBLIC repo: describe
a control by what it enforces, never its signals or thresholds; never print or commit a secret. ⛔ Never waive a failed
check or quote a count you did not see printed. ⛔ WITHDRAWN stays dark. ⛔ Do not touch kipindi-mln-gate, -rb, -par or
maswali-s7-red-20261021.

## Report (to "main", at each milestone and at the end)
LANE-COMMON's six points; for each item, its commit, its cases (both stores) and plants, the records it changed, and every
printed result.
