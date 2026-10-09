five slips, all fixed. **Turn A is running** (since 18:55 EAT, on `ec4734af`): typecheck clean; `test:all` 437/467 — main's
known failures, plus twelve database suites that could not start their cluster; `red:all` under way (to ~21:10 EAT).
**Found and fixed on the way, for every lane on that PC:** (1) `db:scratch`'s sweep cannot see its own leftover
`io_worker` in a worktree whose `node_modules` is a junction (most worktrees there), so after the first database suite
every later start fails with "gave no reason"; run from the checkout the junctions point at, the old sweep matched the
siblings' LIVE clusters. The fix (`ecd9acfc`, branch `vodacom-dbscratch`; an independent review's seven points folded
in) knows a cluster by its data directory and its postmaster's pid, sweeps before `--reset` and around initdb, bounds
the stop (a dead postmaster made `--run` exit 0), and prints postgres's own reason. (2) `red:all`'s timeout ends only
npm's shell on Windows, so a timed-out harness runs on BESIDE the next, mutating files: `red:house-bot-console` made
eleven harnesses read DIRTY and `red:house-bot-c5` refuse (stopped safely through its restore guard's console-stop
status; every target back to HEAD), and `red:kyc-gate` did the same later. The fix (`6df6480a`, branch
`vodacom-redall`) waits for a timed-out harness before it reads the tree and stops the fleet if it outlives
`--orphan-wait`; a DIRTY report no longer prints `src/` as `rc/`. Both go to main once proven. (3) Two WP12 pieces were
stale against the owner's ruling and were fixed before their runs: the tile drive's §12 (its classic control expected
the deleted email bar) and the shortfall test's header. WP12 is rebased onto main over the database fix (the patch
identical). **Queued under the lock:** A2 — WP12 rebased: typecheck, `test:all` with the database suites, and every
harness turn A's `red:all` failed or read DIRTY, again with room (the long house-bot drives go to a turn after WP12);
B — parity (