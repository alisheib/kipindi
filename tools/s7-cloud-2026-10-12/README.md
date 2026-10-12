# S7 on a cloud VM (claude.ai/code, Linux) — the landing proof's chain (2026-10-12)

The heavy proofs of Vodacom S7's landing (WP5–WP10 + L1, VODACOM-PLAN §0j's "IN FLIGHT" bullet), ported from
`tools/s7-omega-2026-10-12/` (OMEGA-COMPILE01's chain-land6.sh and chain-wp1c.sh) to a Linux VM with no shared lock:
one heavy job at a time, each phase run on its own.

| file | what it does |
|---|---|
| `chain-cloud.sh <phase> [args]` | the phases: `inprocess <tip> <gates>` (typecheck + the gates, three at a time), `plants`, `reds` (nine file-editing / temp-copy reds, each alone, tree checked clean), `parity-cal <52715180>` (--prove-red, this VM's v3 baseline, its null compare), `firstload <tip>`, `live <tip>`, `parity-tip <tip> <baseline>`, `skeleton <main> <tip>`, `lostchunk <tip> <L1>`, `wp9drives <tip>` |
| `gate-one.sh` | one in-process gate (used by `inprocess` through xargs -P 3) |
| `plants-wp2-linux.sh` | WP2's four population plants (LF line endings) |
| `land6-gates.txt` | the 109 gates (OMEGA's list) |
| `remount.py <tree> wall|card` | WP10 review: a SHELVED row's re-mount, done on a scratch copy, to measure which journey-home checks it turns red |

Paths at the top of `chain-cloud.sh` (`R`, `TIP`, `SRV`, `PORT`) are this VM's: re-point them. The VM's browser was the
image's Chromium 141 mapped onto Playwright 1.59's expected path (the sandbox refused Playwright's download host), so
Firefox and WebKit drives could not run there. Each dev server is fresh and in memory (`env -u DATABASE_URL`, its own
random SESSION_SECRET / OTP_PEPPER, handed to the drive too), DISABLE_ADMIN_TOTP=true, Google Fonts checked first, a
memory watchdog at 1 GB.
