S7 battery at 5388b4ca (helper C) - 2026-10-12
Tree: origin/vodacom-s7-land8 @ 5388b4caa616e417ff29867d13e4ceaa813ddc4b (detached). Node v24.21.0. Container ran as root.

SUMMARY
First pass of node scripts/test-all.mjs --skip responsive,motion --serial: 497/525 green (typecheck included), 1280 s, exit 1.
After fixing two sandbox causes and re-running each affected suite on its own:
  4 real reds (2 expected, 2 not), 1 flake that passed on re-run. Everything else is green.

TWO SANDBOX CAUSES (not code; fixed in the container only, no file changed)
 a) 17 scratch-Postgres suites: initdb runs as user "postgres" and could not create
    /home/user/kipindi/.pgscratch in a root-owned checkout ("initdb: error: could not create
    directory ... Permission denied"). Fix: mkdir .pgscratch; chown postgres:postgres (it is gitignored).
 b) 4 plan suites (test:mobile-visual-plan, test:marketing-setup-plan, test:landing-ten-plan,
    test:vodacom-plan): "commit 2ac17c36 does not exist in this repository" - the clone was shallow.
    Fix: git fetch --unshallow.
 Re-run on its own after the fix, each was green except where listed below:
   PASS test:cashout-price-guard, results-freshness, agent-fee-expiry, contacts-import-db,
        contacts-staging-db, kyc-restart-docs, house-bot-migrations, house-bot-money, house-bot-caps,
        house-bot-engine, house-bot-comms, house-bot-info-edge, house-bot-reports, house-bot-console,
        house-bot-ops, visual-pass-r8d-stores, mobile-visual-plan, marketing-setup-plan,
        landing-ten-plan, vodacom-plan
   FLAKE test:house-bot-designation - the first re-run failed 1 assertion; the second re-run was ALL PASS (3/3):
        FAIL [postgres] 6.9 · no void written, but a self-exclusion began after verifiedAt → Start refused (RG backstop) — {"ok":false,"code":"CONSENT","message":"Can't start: their self-exclusion on 12 Oct 2026 ended their permission. Enter their password to confirm it again.","row":{"code":"CONSENT_VOID","short":"Permission ended","message ...
        FAIL 0.pg · the Postgres run exits 0 with assertions and no failure — exit 1 · 160 passed (at least 161) · 1 failed

FAILED SUITES THAT STAY RED
1. test:guards-exist - NEW, CAUSED BY THIS RELEASE.
   This release adds comments in scripts/filter-language.test.mts:208 and scripts/popup-fit.test.mts:242
   that cite `qa:journey-home` (the WP11 drive), and package.json has no such key.
     §1 · a guard cited FROM CODE must exist
        scanned 3346 files · 1173 distinct script names cited
        ⛔ NEW PHANTOM qa:journey-home  — cited in:
             scripts/filter-language.test.mts
             scripts/popup-fit.test.mts
     FAIL no NEW citation of a guard that does not exist (1173 cited) — 1 new phantom: qa:journey-home
     GUARDS EXIST: 8 passed, 1 failed

2. test:contacts-export - NOT caused by this release (no file in it differs from origin/main). Red on Node 24.
   On Node 24.21.0 the process exits with code 1 and NO failure line: it prints K7 PASS, then exits during
   K8 ("a CANCELLED download is not a failed walk"). The likely cause: the `await pending` after reader.cancel()
   never settles, the event loop drains, and the pre-set process.exitCode = 1 stands. This happened in the
   battery and in both re-runs. The last lines are verbatim:
     PASS K6 · ⛔ C3 · the erased tombstone is in no file: not the whole book's, not a vip filter's (it carries vip); every row with no sourceRef is — whole 9 · vip 2 · tombstone absent
     PASS K7 · ⛔ over 200,000 matching → 422 text/plain naming BOTH numbers, the walk never started, no pii.revealed, no contacts.exported, one contacts.export_refused — 422 · "Too many to export at once: 200,001 contacts match, and one file holds at most 200,000. Narrow the filter." · walked 0 · contacts.export_refused
     (process ends here, exit 1, no summary line)
   For comparison, the image's Node v22.22.0 runs to the end: "contacts-export: 42 passed, 3 failed".
   package.json engines and CI both say Node 24.

3. test:marketing-preflight - NOT caused by this release (unchanged from origin/main). Probably the sandbox: the
   B1 "run through a junction" probe. Red in the battery and the re-run:
     FAIL B1 · ⭐ BEFORE ANYTHING IS LOADED — both tools call the boot module first (the private Railway host, in any letter case and with or without a trailing  — wrong [pre-flight run through a junction: exit 2, 1 line(s) ("REFUSING: no DATABASE_URL — run through the runner, which se"); evidence run through a junction: exit 2, 2 line(s) ("ledger file: /home/user/kipindi/.qa-shots/marketing-setup/U5")]

4. test:orphans - KNOWN (main's own two landing-v3 panel files):
     🔴 2 UNDECLARED orphan(s) — nothing runs these and nothing admits it:
          ✗ scripts/qa/landing-v3/panels/band-panel.js
          ✗ scripts/qa/landing-v3/panels/hero-panel.js

test:house-bot-disclosure: PASSED in the battery (the known 5.1 red did not appear).

SERVER RE-RUNS (fresh in-memory dev server: rm -rf .next; next dev -p 3000, no DATABASE_URL, DISABLE_ADMIN_TOTP=true;
/api/health 200; routes warmed. The suites default to BASE=http://localhost:3009, so BASE=http://localhost:3000 was passed)
  test:admin-section-gate  PASS  21 passed, 0 failed
  test:needle-rest         PASS  92 passed, 0 failed
  test:revoked-deadend     PASS  46 passed, 0 failed - with SESSION_SECRET passed and on a warmed server.
     Two earlier tries are not counted: one without the server's secret failed only the two "idle" checks that need it,
     and one on a just-compiled server stopped at addCookies (a step that depends on timing).
  The server's process group was stopped afterwards.

RED TWINS
  test:red-anchors           5286 passed, 0 failed
  red:journey-home           243/243 caught
  red:markets-redirect       31/31 caught
  red:journey-shell          208/208 caught (all 417 proofs held)
  red:journey-account        61/61 caught (all 123 proofs held)
  red:simple-journey-flag    41/41 caught
  red:journey-sheet          17/17 caught
  red:hero-copy              29 caught, MISSED = 0
  red:marketing-optout       44/44 surface plants caught, RED PROOF COMPLETE (run alone)
  All keys exist in package.json.

TREE CLEAN after red:marketing-optout: yes (git diff --exit-code = 0, git status clean)
