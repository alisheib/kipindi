EXTRA_STEPS="red:stake-share-fee red:winnings-tax-ledger red:fee-model-caption red:maswali-law"
#!/usr/bin/env bash
# FEE-TAX release gate — AGENTS.md §4 at the EXACT integrated commit, on GitHub's machines:
#   typecheck · CI's in-memory battery (test:all, which holds every test:* suite of predeploy) · test:integrity ·
#   predeploy's other steps (red:report-window-truth, build, first-load, verify:house-bot-bundle) ·
#   the browser gates on a fresh in-memory server (qa:live, responsive, motion, revoked-deadend, admin-section-gate) ·
#   the money end to end on a throwaway PostgreSQL (e2e:money, e2e:fault, e2e:card + PG_EXTRA).
# test:needle-rest is NOT run: main's own known red (55/35, the same 35 cases since 7e3a06ea0, U43 — paused),
# confirmed on fb53c9bd6's CI (run 39985996447); nothing in this programme touches the chat disc.
# EXTRA_STEPS / PG_EXTRA: set on the line above this header by the per-release job file.
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
step test-all node scripts/test-all.mjs --no-tsc --skip responsive,motion,revoked-deadend,admin-section-gate,needle-rest,integrity
step integrity npm run test:integrity
step red-report-window-truth npm run red:report-window-truth
for s in ${EXTRA_STEPS:-}; do step "extra-${s//:/-}" npm run "$s"; done
step build npm run build
# As CI's Build step does: tie this .next to the exact commit, or qa:first-load refuses ("kp-head is missing").
[ -d .next ] && git rev-parse HEAD > .next/kp-head
step first-load npm run qa:first-load -- --read --routes 'index,markets,positions,help,live,results,watchlist,markets/[id],account,updown/history'
step house-bot-bundle npm run verify:house-bot-bundle
cat > "$OUT/browser.sh" <<'EOS'
set -u
all=0
for s in qa:live test:responsive test:motion test:revoked-deadend test:admin-section-gate; do
  f="$OUT/browser-${s//:/-}.log"
  npm run -s "$s" > "$f" 2>&1; rc=$?
  echo "$s rc=$rc :: $(grep -a -E 'passed|failed|PASS|FAIL' "$f" | tail -2 | tr '\n' ' ' | cut -c1-240)"
  [ $rc -eq 0 ] || { all=1; tail -40 "$f"; }
done
exit $all
EOS
step browser serve 3100 -- bash "$OUT/browser.sh"
# Each money suite on its OWN fresh scratch PostgreSQL: they assert platform-wide invariants (e.g. card's "total wallet
# money == total CONFIRMED deposits"), so a database another suite already used fails them by construction; and the
# fault suite refuses a database not certified as a disposable load-test target (scripts/load/ci-plant-marker.mjs).
for s in e2e:money e2e:fault e2e:card ${PG_EXTRA:-}; do
  n="${s//:/-}"
  cat > "$OUT/pg-$n.sh" <<EOS
set -u
export DATABASE_URL="\$VERIFY_DATABASE_URL"
export USE_PRISMA_DAL=true
npx prisma migrate deploy > "$OUT/pg-$n-migrate.log" 2>&1 || { echo "MIGRATE FAILED"; tail -20 "$OUT/pg-$n-migrate.log"; exit 3; }
node scripts/load/ci-plant-marker.mjs || exit 3
npm run -s "$s"
EOS
  # --reset: db-scratch's cluster is PERSISTENT (.pgscratch), so without it each suite would inherit the last one's rows.
  step "pg-$n" npx tsx scripts/db-scratch.mts --reset --run bash "$OUT/pg-$n.sh"
done
finish
