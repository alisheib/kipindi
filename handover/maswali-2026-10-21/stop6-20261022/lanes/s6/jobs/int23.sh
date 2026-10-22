#!/usr/bin/env bash
# S6-INT 22 + 23 on the release head: the two reds fixed (register-cache's re-pin + its red twin; read-tiers' 7.1 by the
# renamed field), the notify suite on both stores (its desk-list case reads the renamed field), tsc and red-anchors.
# Then the same two suites at the pre-merge base d5d20ccd3 (S6-INT 20) in a worktree of its own sharing node_modules
# (its package-lock.json is byte-identical): each must be RED there, which proves both reds predate S6-INT 21.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step red-anchors npm run test:red-anchors
step read-tiers npm run test:read-tiers
step register-cache npm run test:maswali-register-cache
step red-register-cache npm run red:maswali-register-cache
step integrity-list npm run test:maswali-integrity-list
step notify npm run test:maswali-notify
step integrity npm run test:maswali-integrity
BASE_TREE=/tmp/s6-base
git worktree add -q --detach "$BASE_TREE" d5d20ccd3 && ln -s "$PWD/node_modules" "$BASE_TREE/node_modules"
echo "base tree: $(git -C "$BASE_TREE" rev-parse --short=9 HEAD)"
( cd "$BASE_TREE" && npx tsx scripts/read-tiers.test.mts ) > "$OUT/base-read-tiers.log" 2>&1; rc=$?
echo "---- [base-read-tiers] rc=$rc (expected 1)"; grep -a -E "FAIL|passed" "$OUT/base-read-tiers.log" | tail -4
echo "base-read-tiers rc=$rc (expected 1)" >> "$OUT/summary.txt"; [ $rc -ne 0 ] || LIB_FAILED=1
( cd "$BASE_TREE" && npx tsx scripts/maswali-register-cache.test.mts ) > "$OUT/base-register-cache.log" 2>&1; rc=$?
echo "---- [base-register-cache] rc=$rc (expected 1)"; tail -4 "$OUT/base-register-cache.log"
echo "base-register-cache rc=$rc (expected 1)" >> "$OUT/summary.txt"; [ $rc -ne 0 ] || LIB_FAILED=1
rm -f "$BASE_TREE/node_modules"; git worktree remove --force "$BASE_TREE"
finish
