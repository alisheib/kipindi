Battery at b3692269 (helper C2) - 2026-10-12/13

VERDICT: NO NEW RED

Tree: origin/live-fix-l2-rel @ b3692269860dcc536111f88e7628ab1f84583e66 (detached worktree; origin/main 6da7f936 is an ancestor).
L2 + its review, stacked on L3 and S7's close, plus the scripts-only re-pin of test:house-bot-reports' line pin (+63).
Node v24.21.0 (tarball from nodejs.org/dist/latest-v24.x, SHA256 checked against SHASUMS256.txt; /opt/node24/bin first on PATH).
Set-up: clone unshallowed; npm ci; npx prisma generate; npm i -D --no-save embedded-postgres@18.3.0-beta.17 (package files untouched);
.pgscratch chowned to postgres; Playwright's chromium-1217 / headless_shell-1217 mapped onto the image's 1194 builds.
The first battery was lost to a container restart about 533 suites in (its reds so far: only the six known ones below). .pgscratch
was wiped and re-created, and the battery re-run from the start. Everything below is from that second, complete run.

TOTALS
node scripts/test-all.mjs --skip responsive,motion --serial: 522/528 green (typecheck included, PASS 22.7 s), 1868.6 s, exit 1.
FAILED: test:marketing-preflight, test:contacts-export, test:revoked-deadend, test:admin-section-gate, test:needle-rest, test:orphans
git status --porcelain empty after the battery.

EVERY RED, WITH ITS RE-RUN ON ITS OWN
- test:orphans - red on re-run (exit 1). KNOWN, not this commit's: main's own scripts/qa/landing-v3/panels/band-panel.js and
  scripts/qa/landing-v3/panels/hero-panel.js are the "2 UNDECLARED orphan(s)".
- test:contacts-export - red on re-run (exit 1). KNOWN, not this commit's: on Node 24 it exits 1 silently after K7's PASS, in K8.
- test:marketing-preflight - red on re-run (exit 1, 38 passed, 1 failed). KNOWN, not this commit's: B1 "pre-flight run through
  a junction: exit 2 ... REFUSING: no DATABASE_URL" (the sandbox).
- test:revoked-deadend, test:admin-section-gate, test:needle-rest - red in the battery only because no server was running. Green on a server (below).
- test:house-bot-reports - GREEN in the battery (94.6 s). The re-pin fixed 9c254bec's new red.
- test:house-bot-designation - GREEN in the battery (28.4 s). No 6.9 flake this time.
Also green in the battery: test:kyc-gate (42.7 s), test:house-bot-seam, test:bet-landed-key, test:action-redirect.

SERVER SUITES (fresh in-memory dev server on :3000: rm -rf .next, env -u DATABASE_URL, random SESSION_SECRET/OTP_PEPPER,
DISABLE_ADMIN_TOTP=true; /api/health 200; / and /markets 200, /positions /wallet /profile 307 (signed out); BASE=http://localhost:3000
and the server's SESSION_SECRET passed; the server's process group was stopped after)
  test:revoked-deadend 46 passed, 0 failed · test:admin-section-gate 21/0 · test:needle-rest 92/0
  Sandbox note: the first server answered / and /markets 500, because next/font/google could not fetch the font files. Node's fetch
  does not read HTTPS_PROXY. The server was stopped and restarted fresh (rm -rf .next) with NODE_USE_ENV_PROXY=1, which only
  changes the environment, and the suites ran against that server. No code was changed.

RED TWINS (each ALONE at b3692269; git status --porcelain was empty after EVERY one)
  test:red-anchors          5288 passed, 0 failed
  red:journey-sheet         17/17 caught
  red:shortfall             12/12 caught
  red:pending-bet           19/19 caught
  red:journey-estimate      14/14 caught
  red:deposit-ceiling       9/9 caught
  red:enter-where-pressed   103/103 caught
  red:implicit-submit       61/61 caught · 1/1 green held
  red:failure-reasons       20/20 defects caught, tree restored
  red:journey-shell         208/208 caught · all 417 proofs held
  red:journey-home          243/243 caught
  red:simple-journey-flag   41/41 caught
  red:dal-parity            279/283, then 279/283 on a re-run. NOT NEW: origin/main 6da7f936 (detached, same node_modules: lockfile
                            and prisma/ identical) gives 280/283. The missed cases differ on every run (b3692269: 20, 111, 184, 237,
                            then 69, 72, 222, 263; main: 32, 56, 150). Each one is "red, but not on <its check> - got (no FAIL line)".
                            So it is the known flake on this VM class, not a regression. Every run ended "working tree untouched ·
                            green after: true".
  red:action-redirect       14/14 caught
  red:bet-landed-key        10/10 caught
