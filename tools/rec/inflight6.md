**⏳ IN FLIGHT (updated 2026-10-07 ~20:10 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane** (the other sessions on
that PC hold marketing S14 and ▶ 0e MONEY DOORS, by agreement; this session signs the shared lock `asheib-c5`). Ali
(2026-10-07, away): *"keep going and putting progress updated until you're done … keep pushing live"* — each piece goes
live once its core is proven, the rest runs after it, and anything found is fixed forward. Done today: A8i-2 and A8j
LIVE (above); A8j's WebKit runs; **the S6 close-out's three owed items, all passing** (§0i "S6 STOPPED HERE"); QA
Mobile 01 signs in on production again (its password reset through the console's own Reset password, with Ali's
approval; the new one is in `F:\kipindi-main\.env.qa.local`). Money doors' release is live (`012cccbc`: no email
before a deposit, the email bar deleted, the TZS 1,000 minimum) and this lane's work sits on it. **Now: WP12, the last
S6 package** — branch `vodacom-wp12` (pushed, NOT on main; worktree `F:\kipindi-wp12`), twelve commits, now on main
`b2e9db81` over the `db:scratch` fix below: the bell's bytes put back (A1); the handover's WP12 change set (rule 8 dated
the day it lands, six statements corrected by an independent read); the tile drive `qa:journey-shell` (its §12 now reads
the deleted email bar: neither reader may see one); A8j's WebKit follow-up (P1x reports the engine's rule); the S4
canvas brought to the owner's ruling; the Up & Down card's UD-16 comment made true; `qa:journey-preview`'s step 7 (WP6b
item 8); `qa:enter-where-pressed` with `REDUCED_MOTION=1` (A8i-2's owed "reduced motion"); parity 2.9 reading which tree
it runs on; `shortfallPlan` without its email step (its test's header corrected too); the plans' notes for the ruling,
and the email bar's SHELVED row deleted. Independent reviews found five slips, all fixed. **Turn A is running** (since
18:55 EAT, on `ec4734af`; to ~21:00 EAT): typecheck clean; `test:all` 437/467 — main's known failures, plus twelve
database suites that could not start their cluster; `red:all` past half way. **Found and fixed on the way, for every
lane on that PC:** (1) `red:all`'s timeout ends only npm's shell on Windows, so a timed-out harness RAN ON beside the
next one, mutating files — `red:house-bot-console` made eleven harnesses read DIRTY and `red:house-bot-c5` refuse
(stopped safely through its restore guard's console-stop status; every target back to HEAD), and `red:kyc-gate` did the
same later. **LIVE on main (`b2e9db81`):** the runner waits for a timed-out harness before it reads the tree (a pid
counts only with its exact start time; default `--orphan-wait` 4 h) and stops the fleet rather than run beside one; a
DIRTY report no longer prints `src/` as `rc/`; reviewed, five findings fixed. (2) `db:scratch`'s sweep cannot see its
own leftover `io_worker` in a worktree whose `node_modules` is a junction (most worktrees there), so after the first
database suite every later start fails with "gave no reason"; run from the checkout the junctions point at, the old
sweep matched the siblings' LIVE clusters. The fix (`3b511393`, branch `vodacom-dbscratch`; reviewed, seven findings
fixed) knows a cluster by its `-D` and its postmaster's pid, sweeps before `--reset` and around initdb, bounds the stop
(a dead postmaster made `--run` exit 0) and prints postgres's own reason; it goes to main once turn A2 has run the
database suites with it. **Queued under the lock** (each turn stops if the one before did not end well): A2 — WP12 on
`b2e9db81`: typecheck, `test:all` with the database suites, and every harness turn A's `red:all` failed or read DIRTY,
again with room (the long house-bot drives wait for a turn after WP12); B — parity (the v2 baseline re-captured from
`7c859cdf`, WP12's fresh baseline at its parent, each calibrated, both compares); **then WP12 goes live**; then B2 —
the header fit and its reds; C — the 335 tiles (read one by one), the preview drive, the footer four ways; D — the
landmark seal both ways, local `qa:live`, G1 and its prove-red; E — the A8j drive in WebKit; F — S7 WP0's reds and bar
probe, and the A8i-2 drive under reduced motion; then `qa:live` on production (mobile01, once), and the records.
**S7 WP0 has started, by Ali's choice** (before S6 closed, S7-PLAN's narrower overrule): branch `vodacom-s7`
(`2f340ecd`, replays cleanly onto WP12): red:ticker-honesty's cases declared and judged by the whole check id,
test:stacking's primer checks renumbered; its records and bar probe are drafted, and its runs are turn F. **If this
session is gone:** WP12's run list is in its S6-PLAN notes and the handover's `tools/WP12.json`; this machine's tools are
on `vodacom-handover`, `handover/vodacom-2026-10-07/omega-tools/` (its README). (Left alone on that PC:
`F:\kipindi-journey` keeps uncommitted edits from 2026-10-06, an early start that the handover draft supersedes.)
