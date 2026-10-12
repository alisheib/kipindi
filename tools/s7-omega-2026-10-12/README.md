# S7 on OMEGA-COMPILE01 — the lock-turn chains (2026-10-12)

The heavy proofs of Vodacom S7 WP1–WP4 as they ran on OMEGA-COMPILE01, ported from ALI-BLADE15's
`tools/s7-blade-2026-10-12/` (same helpers, OMEGA's paths). Recipes, not gates: re-point `S=` (the session scratchpad),
`TIP=` (the branch worktree) and `SRV=` (the server worktree, which needs its OWN `npm ci` — Turbopack refuses a
junctioned `node_modules`) before running one.

| file | what it does |
|---|---|
| `chain-wp1.sh <sha>` | parity v3's calibration at WP1's commit: `--prove-red`, the v3 baseline, then a null `--compare` on a second fresh server |
| `chain-wp2.sh <wp2> <wp1> <baseline>` | WP2's proof: typecheck, its gates, the population plants, the file-mutating reds alone, `next build`, local qa:live, parity v3 against WP1's baseline, the served-skeleton pair |
| `chain-land.sh <tip> <wp1> <baseline>` | the same at the stack's tip, with WP3's and WP4's gates and `red:ticker-honesty` (WP1–WP4 landed together, VODACOM-PLAN §0h point 71) |
| `plants-wp2.sh <tree> <results>` | the four widened populations: a defect planted in the moved home body turns each guard red on its own check |
| `after-wp1.sh`, `after-wp1-land.sh` | start the next chain only when WP1's null compare exited 0 |

Every chain: one fresh in-memory dev server at a time (`env -u DATABASE_URL`, ports 3076/3077), each checkout verified
by sha, Google Fonts checked before every server run and a run whose server could not fetch them marked INVALID, a
memory watchdog that stops only this tree's dev server below 0.45 GB free, 30 s between runs. Run each through the
shared lock, in the background:

    LOCK_ME=<session> bash /f/kipindi-locks/withlock.sh <label> bash chain-….sh <args>

It waits behind another session's wait note; never TaskStop a chain that holds the lock (its release trap would not
run).
