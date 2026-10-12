S7 battery at a7786df6 (helper C, second run) - 2026-10-12
Tree: origin/vodacom-s7-release2 @ a7786df620a9437229679a7e0a18f9ed59c84dbd (detached; de44e087 is an ancestor).
Node v24.21.0. No npm ci; prisma generate re-run. The .pgscratch ownership fix and the unshallowed clone were kept.

SUMMARY
Battery (node scripts/test-all.mjs --skip responsive,motion --serial): 519/526 green (typecheck included), 1888 s, exit 1.
FAILED: test:marketing-preflight, test:contacts-export, test:revoked-deadend, test:admin-section-gate, test:needle-rest,
        test:house-bot-disclosure, test:orphans
After the re-runs, only the three known reds stay red: test:orphans, test:contacts-export, test:marketing-preflight.
test:guards-exist PASSES. The server suites pass on a server. test:house-bot-disclosure passes once origin/main is current.

RE-RUN OF EACH FAILED SUITE ON ITS OWN
- test:house-bot-disclosure: red at first (115 passed, 3 failed), then ALL PASS 118/118 after `git fetch origin main`.
  Cause: the suite compares against the local origin/main ref, which in this container was still 19dd3211a (fetched
  before the stake change). So the stake change's two rulebook pages showed up as "differs". Against current
  origin/main (203b13807 = de44e087 + two docs-only commits) it is green. It would hit the same false red on any
  checkout whose origin/main ref is older than de44e087. First red lines, verbatim:
    FAIL 6.6 · D19a · src/app/_actions/chat.ts is byte-identical to origin/main — the chatbot keeps main's words, and this guard proved it without editing the file or exporting anything from it — clean against origin/main 19dd3211a · 1 file(s) compared
    FAIL 5.1 · ⛔ D19a · every published word is `origin/main`'s own — ... all identical to 19dd3211a — {"comparedAgainst":"19dd3211a","compared":16,"differs":["src/app/legal/rules/up-down/page.tsx","src/app/legal/rules/yes-no/page.tsx"],"missing":[]}
    FAIL 5.1.c3 · POSITIVE CONTROL · not one changed file is inside the pinned population — ... {"changedVsMain":134,"sweptIn":["src/app/legal/rules/up-down/page.tsx","src/app/legal/rules/yes-no/page.tsx"],"planted":[...],"pinned":16}
    (battery line) !! FLOOR — test:house-bot-disclosure ran 115 assertion(s), fewer than the 118 a green run printed.
- test:marketing-preflight: still red, KNOWN (unchanged since 5388b4ca): 38 passed, 1 failed
    FAIL B1 · ⭐ BEFORE ANYTHING IS LOADED — both tools call the boot module first (the private Railway host, in any letter case and with or without a trailing  — wrong [pre-flight run through a junction: exit 2, 1 line(s) ("REFUSING: no DATABASE_URL — run through the runner, which se"); evidence run through a junction: exit 2, 2 line(s) ("ledger file: /home/user/kipindi/.qa-shots/marketing-se...
- test:contacts-export: still red, KNOWN (unchanged since 5388b4ca). On Node 24 it exits 1 silently right after K7 PASS (it hangs in K8 and the event loop drains).
- test:orphans: still red, KNOWN:
     ✗ scripts/qa/landing-v3/panels/band-panel.js
     ✗ scripts/qa/landing-v3/panels/hero-panel.js

SERVER RE-RUNS (fresh in-memory dev server on :3000: rm -rf .next, no DATABASE_URL, DISABLE_ADMIN_TOTP=true; /api/health 200;
routes warmed; BASE=http://localhost:3000 and the server's SESSION_SECRET passed; the server's process group was stopped after)
  In the battery all three failed for want of a server (the 45 s timeouts, as in run 1).
  test:revoked-deadend     PASS 46 passed, 0 failed (a warm-up run before it was also 46/0)
  test:admin-section-gate  PASS 21 passed, 0 failed
  test:needle-rest         PASS 92 passed, 0 failed

STAKE-CHANGE TWINS (each run ALONE, then git diff --exit-code)
  red:stake-bounds   9/9 defects caught, tree restored, diff clean (0)
  red:rate-copy      12/12 defects caught, tree restored, diff clean (0)
  test:red-anchors   5286 passed, 0 failed
  Tree clean at the end: yes (git status empty)

COMPARISON WITH RUN 1 (5388b4ca)
  Changed verdict to PASS:
   - test:guards-exist: run 1 was red (NEW PHANTOM qa:journey-home); now PASS 0.8 s. The release's fix landed.
   - The 17 scratch-Postgres suites and 4 plan suites from run 1 pass in the battery itself now, because the
     sandbox fixes (.pgscratch ownership, unshallow) were kept. E.g. test:cashout-price-guard PASS, test:vodacom-plan PASS.
   - test:house-bot-designation (a flake in run 1) was green in this battery.
  Changed verdict to RED:
   - test:house-bot-disclosure: green in run 1's battery, red in this battery. This is the stale origin/main
     ref in the container (see above), not the code: it is ALL PASS 118/118 against current origin/main.
  Same verdict: test:orphans, test:contacts-export, test:marketing-preflight stay red (known). The server suites pass on a server.
  No new code red at a7786df6.
