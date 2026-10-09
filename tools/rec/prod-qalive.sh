#!/usr/bin/env bash
# Production read-back of WP12 (asheib-c5): qa:live against the live site, from F:/kipindi-a8j detached at the pushed tip.
# [E3] signs the QA player mobile01 in ONCE through the real form (one attempt; a failed sign-in stops the run): tell the
# peers first. The password file is copied in only where git ignores it, never printed, and removed afterwards.
#   bash prod-qalive.sh <pushed tip sha> [base, default https://www.50pick.tz]
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; TIP="${1:?the pushed tip}"; BASE_URL="${2:-https://www.50pick.tz}"
cd /f/kipindi-a8j || { echo "no kipindi-a8j"; exit 2; }
git diff --quiet && git diff --cached --quiet || { echo "STOP: kipindi-a8j has tracked changes"; exit 2; }
git checkout -q --detach "$TIP" || { echo "STOP: cannot detach at $TIP"; exit 2; }
echo "kipindi-a8j at $(git rev-parse --short HEAD) · base $BASE_URL"
cp /f/kipindi-main/.env.qa.local ./.env.qa.local || { echo "STOP: no .env.qa.local to copy"; exit 2; }
if ! git check-ignore -q .env.qa.local; then rm -f ./.env.qa.local; echo "STOP: .env.qa.local is not ignored here"; exit 2; fi
BASE="$BASE_URL" npm run qa:live > "$R/prod-qalive.log" 2>&1
e=$?
rm -f ./.env.qa.local
[ -e ./.env.qa.local ] && echo "⛔ .env.qa.local still present" || echo ".env.qa.local removed"
echo "qa:live exit=$e"
sed 's/\x1b\[[0-9;]*m//g' "$R/prod-qalive.log" | grep -E "^\s*(FAIL|BLOCKED)|\[E[0-9]\]|passed|failed|RESULT|summary" | tail -25
exit $e
