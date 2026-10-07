# OMEGA-COMPILE01 tools — the Vodacom lane, 2026-10-07 (session asheib-c5)

The handover's tools (`../tools/`, ALI-BLADE15) as this PC runs them: Node instead of Python (no Python here), Git Bash,
and a heavy-job lock shared with the other sessions on this PC (marketing S14, ▶ 0e money doors). Everything here was
used for A8i-2, A8j, the S6 close-out and WP12's proof. **The work order and its state are in `docs/VODACOM-PLAN.md` §0
on main — read that first; this folder is only the tooling.**

⚠️ Every script names this session's scratchpad near its top (`S="C:/Users/asheib/AppData/Local/Temp/claude/…/scratchpad"`):
point `S` (and `R="$S/runs"`) at your own scratchpad before running anything, and keep the worktree names
(`F:/kipindi-a8j`, `F:/kipindi-a8i2`, `F:/kipindi-wp12`) or change them where they are named.

## The shared lock and its queue (agreed by the sessions on this PC)

- Lock: `mkdir F:/kipindi-locks/heavy-node.lock` plus an `owner` file whose FIRST WORD is the session's name. Release
  only a lock whose owner line is your own. Heavy = tsc, `next build`, dev servers + Playwright drives, scratch
  Postgres, `test:all`, `red:all`.
- Queue: `F:/kipindi-locks/heavy-node.wait`, one line, the waiter's name first. A waiter writes it only when there is
  none (noclobber), never over another session's note (even while that session holds the lock: it may have a second
  job queued), re-reads it on every try and yields if it is no longer its own, and deletes it — only its own — once it
  holds the lock.
- `kp-lock.sh` is that protocol (sourced; `take_lock "<what>"`, `release`; `KP_WAIT_MAX` seconds, default 5400).
  Set `ME=` to your session's name.

## Runners

- `kp-with-server.sh <worktree> <port> <log> <command…>` — takes the lock (unless `KP_NO_LOCK=1`, when a chain already
  holds it), refuses if that worktree already runs a server or under 5 GB free, starts a FRESH in-memory `next dev`
  (no `DATABASE_URL`, local-only secrets, `DISABLE_ADMIN_TOTP=true`), warms the routes, runs the command with `BASE` and
  `KP_BASE` set, stops only its own processes (`kp-procs.ps1`), releases, writes `<log>.done` with the exit code.
  ⛔ Turbopack needs a real `node_modules` (a junctioned one serves only `next dev --webpack`).
- `kp-locked.sh <worktree> <log> <command…>` — the same lock, no server.
- `chain-lib.sh` — `run` (one fresh server per command, the worktree's fingerprint read before and after), `wait_done`,
  `wp12_trees` (BEFORE = WP12's parent, AFTER = the `vodacom-wp12` tip).
- The chains, one lock turn each, each waiting for the previous one's `.done`: `k-chain.sh` (A8j's WebKit runs + the
  S6 close-out), `wa-chain.sh` (typecheck, `test:all` with the database suites, `red:all`), `wb-chain.sh` (parity:
  a v2 baseline re-captured from the pre-S6 commit `7c859cdf` — the harness of the WP12 tree against a server of that
  commit, `KP_TREE` naming it — and WP12's fresh baseline at its parent, each calibrated by prove-red and a null compare,
  then both compares at the tip), `wb2-chain.sh` (header fit + its two reds), `wc-chain.sh` (tiles, preview, footer ×4),
  `wd-chain.sh` (landmark seal ×2, local `qa:live`, the G1 drive + prove-red), `we-chain.sh` (the A8j drive in WebKit).
- `watch-deploy.sh <sha-prefix>` — waits until 50pick.tz and www serve `dpl=<sha>`, then prints `/api/health`.

## Ports of the handover's tools

- `apply_changeset.mjs <cs.json> <repo> [--write]` — `apply_changeset.py` in Node: every find exactly once
  (newline-insensitive), nothing written unless all resolve.
- `closeout/result-drive.mjs`, `crash-edit.mjs`, `first-load-parts.mjs` — the A8h drive (all three crash titles), the
  throwaway guard edit, and the WP6c first-load reader. ⚠️ Run the reader with `MSYS_NO_PATHCONV=1`: Git Bash rewrites
  `/markets` into `C:/Program Files/Git/markets`.
- `wp12/make-r2.cjs` + `wp12/WP12-r2.json` — the handover's `WP12.json` re-anchored for main of 2026-10-07 (its
  CHANGELOG entry above A8i's; rule 8 dated the day it lands). `wp12/gates.sh <worktree> <outdir>` — WP12's light
  gates, one log each (compare two trees' logs).
- `rec/apply-pairs.cjs`, `rec/swap-block.cjs` — exact-once text replacements in a CRLF working copy, from files (so a
  backslash survives: Git Bash eats them in `node -e` arguments).

## Lessons of the day

- WebKit served a page's scripts from its memory cache past a route abort: a "sleeping page" must open in a context of
  its own. Playwright's WebKit 2272 honours a disabled default submit control (A8j's second field is a belt there).
- Never edit a chain script while it runs (bash reads the file as it goes); stop the waiting chain, edit, relaunch.
- A stopped background task can leave its bash child running: find it by command line and stop it before relaunching.
