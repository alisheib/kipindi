#!/bin/bash
# Production read-back, READ-ONLY: no QA_SIGNED_IN, so qa:live's [E3] never signs in.
export PATH=/opt/node24/bin:$PATH
unset QA_SIGNED_IN
cd /home/user/kipindi-close
OUT=/tmp/claude-0/l3/prod; : > $OUT/SUMMARY
BASE=https://50pick.tz timeout 1800 node scripts/pre-deploy-live-check.mjs > $OUT/qa-live.log 2>&1; echo "$? qa:live https://50pick.tz" >> $OUT/SUMMARY
timeout 900 node scripts/qa-chunks-prod.mjs --origin https://50pick.tz > $OUT/chunks-prod.log 2>&1; echo "$? qa:chunks-prod --origin https://50pick.tz" >> $OUT/SUMMARY
timeout 1200 node scripts/cls-budget.mjs https://50pick.tz /,/markets,/results,/live > $OUT/cls-classic.log 2>&1; echo "$? qa:cls-budget classic https://50pick.tz" >> $OUT/SUMMARY
echo DONE >> $OUT/SUMMARY
