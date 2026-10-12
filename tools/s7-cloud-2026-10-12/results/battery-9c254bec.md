Battery at 9c254bec (helper C) - 2026-10-12

VERDICT: NEW RED: test:house-bot-reports (its 0.232.2 line pin on market-service.ts; L2 moved all seven pinned sites +63 lines)

Tree: origin/live-fix-l2r @ 9c254becc1373248cfb80d9fab5324c8cfc9a614 (detached; origin/main 6da7f936 is an ancestor).
L3r tip origin/live-fix-l3r = 4e7504f5 was not run as a full battery. Only test:house-bot-reports was run there (green).
Node v24.21.0 (/opt/node24/bin first on PATH). No npm ci (no dependency change since a7786df6); prisma generate re-run.
Sandbox: the container runs as root, so .pgscratch was chowned to postgres and the clone was unshallowed (as in the earlier batteries).
A battery started at 49bd2b5b was stopped unfinished on the coordinator's instruction and replaced by this one.

TOTALS
node scripts/test-all.mjs --skip responsive,motion --serial: 521/528 green (typecheck included), 1770 s, exit 1.
FAILED: test:marketing-preflight, test:contacts-export, test:revoked-deadend, test:admin-section-gate, test:needle-rest,
        test:house-bot-reports, test:orphans

EVERY RED, WITH ITS RE-RUN ON ITS OWN
- test:house-bot-reports - NEW. Red again on its own re-run (2 passed, 1 failed). ALL PASS 3/3 at origin/main 6da7f936 and
  ALL PASS 3/3 at the L3r tip 4e7504f5, so L2's change to market-service.ts caused it. The pin (scripts/lib/house-bot-reports-cases.mts:947)
  expects 1695, 2970, 3441, 3910, 4042, 4183, 4780. The tree has 1758, 3033, 3504, 3973, 4105, 4246, 4843 (each +63).
  The controls (c1, c3, c3b, c4, c4b) fail with it, because they plant at the old lines (:2970/:1695). First failing lines, verbatim:
    FAIL [memory] 0.232.2 · …and the seven marked sites are exactly the seven line numbers this pin was written against — a site that MOVES is reported here (the pin is line-pinned on purpose; the money anchors match by text and cannot rot from a line move) — ["market-service.ts:1758","market-service.ts:3033","market-service.ts:3504","market-service.ts:3973","market-service.ts:4105","market-service.ts:4246","market-service.ts:4843"]
    FAIL [memory] 0.232.c1 · CONTROL · a positioned write whose marker is DELETED is reported, and exactly one site goes red — the plant really changed the file — [{"at":"src/lib/server/market-service.ts:3033","why":"positionId p.id with NO marker — a house stake's money row would be written as a player's"}]
    FAIL [memory] 0.232.c3 · CONTROL · a marker copied from the WRONG object — present, well-formed, reading another position in scope — is reported, which is the defect a presence-only scan passes — [{"at":"src/lib/server/market-service.ts:3033","why":"positionId p.id but the marker reads position — the marker is copied from the WRONG object"}]
    FAIL [memory] 0.232.c3b · CONTROL · the same defect in the OTHER accepted spelling (houseBotId: <x>.houseBotId ?? null) is reported, ... {"wrongProp":[{"at":"src/lib/server/market-service.ts:3033", ...}],"rightProp":[]}
    FAIL [memory] 0.232.c4 · CONTROL · the stake form used where no position with that positionId is marked from the same ctx is reported — ... [{"at":"src/lib/server/market-service.ts:3033", ...}]
    FAIL [memory] 0.232.c4b · CONTROL · …and the REAL stake write goes red the moment the position it is paired with stops being the one it names — ... [{"at":"src/lib/server/market-service.ts:1758","why":"the stake form (ctx.kind === house) is used where no position with id positionId is marked from the same ctx in any enclosing function"}]
    FAIL 0.mem · the memory run exits 0 with assertions and no failure — exit 1 · 245 passed (at least 251) · 6 failed
  The likely fix, by the file's own method: re-derive the seven line numbers from the tree and move the controls' :2970/:1695 to :3033/:1758.
- test:orphans - red on re-run. KNOWN, also red at origin/main 6da7f936 (main's own scripts/qa/landing-v3/panels/{band,hero}-panel.js).
- test:contacts-export - red on re-run. KNOWN, also red at origin/main (on Node 24 it exits 1 silently after K7, in K8).
- test:marketing-preflight - red on re-run. KNOWN, also red at origin/main (B1 "run through a junction": 1 failed, sandbox).
- test:revoked-deadend, test:admin-section-gate, test:needle-rest - red in the battery only for want of a server. Green on a server (below).

ASKED-FOR SUITES (all green in the battery, Node 24)
  test:kyc-gate PASS (42.5 s; its §6 passes on this VM under Node 24) · test:house-bot-seam PASS · test:bet-landed-key PASS ·
  test:action-redirect PASS · test:docs PASS · test:guards-exist PASS · test:vodacom-plan PASS · test:updown-quickbet PASS · test:money-busy PASS

SERVER SUITES (fresh in-memory dev server on :3000: rm -rf .next, no DATABASE_URL, DISABLE_ADMIN_TOTP=true; /api/health 200;
routes warmed; BASE=http://localhost:3000 and the server's SESSION_SECRET passed; the server's process group was stopped after)
  test:revoked-deadend 46 passed, 0 failed (its warm-up run before was also 46/0) · test:admin-section-gate 21/0 · test:needle-rest 92/0

RED TWINS (each ALONE at 9c254bec; git status --porcelain was empty after EVERY one)
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
  red:dal-parity            281/283, then 278/283 on a re-run. NOT NEW: origin/main 6da7f936 gives 279/283 too. The missed
                            cases differ on every run (9c254bec: 224 and 274, then 35, 55, 146 and 230; main: 59, 108, 177, ...),
                            each "red, but not on <its check> — got (no FAIL line)". So it is a flake on this VM, not a
                            regression. "working tree untouched · green after: true" every time.
  red:action-redirect       14/14 caught
  red:bet-landed-key        10/10 caught
  (red:rg-doors was named in a message but not in the list, so it was not run.)
