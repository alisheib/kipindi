#!/bin/bash
# Production read-back, READ-ONLY, Node's fetch through the session proxy (NODE_USE_ENV_PROXY=1). No QA_SIGNED_IN.
export PATH=/opt/node24/bin:$PATH NODE_USE_ENV_PROXY=1
unset QA_SIGNED_IN
cd /home/user/kipindi-close
OUT=/tmp/claude-0/l3/prod; 
until grep -q DONE $OUT/SUMMARY 2>/dev/null; do sleep 10; done
: > $OUT/SUMMARY2
timeout 900 node scripts/qa-chunks-prod.mjs --origin https://50pick.tz > $OUT/chunks-prod2.log 2>&1; echo "$? qa:chunks-prod --origin https://50pick.tz (proxy)" >> $OUT/SUMMARY2
BASE=https://50pick.tz timeout 1800 node scripts/pre-deploy-live-check.mjs > $OUT/qa-live2.log 2>&1; echo "$? qa:live https://50pick.tz (proxy)" >> $OUT/SUMMARY2
echo DONE >> $OUT/SUMMARY2
