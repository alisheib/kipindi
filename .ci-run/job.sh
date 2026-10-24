#!/usr/bin/env bash
# R5b push check: types, and /api/health served by a fresh server with its new feeLaw block (the deploy gate reads this route).
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
cat > $OUT/health.sh <<'EOS'
set -e
body=$(curl -s -m 120 "$BASE/api/health")
echo "$body" | head -c 1500; echo
echo "$body" | grep -q "\"feeLaw\":{\"live\":false,\"switch\":\"none\",\"switchedAt\":null}" && echo "HEALTH feeLaw OK"
echo "$body" | grep -q "\"ok\":true" && echo "HEALTH ok:true"
EOS
step health serve 3100 -- bash $OUT/health.sh
finish
