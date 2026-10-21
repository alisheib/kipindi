#!/usr/bin/env bash
# job-needle-bisect.sh — test:needle-rest at several main commits in kipindi-mln-base (one fresh in-memory dev each),
# to name the commit that stopped the Needle's rest/glide (red on main 4471bb44: 55 passed, 35 failed).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
T=C:/50pick-ssd/kipindi-mln-base
for sha in "$@"; do
  git -C "$T" checkout -q --detach "$sha" || { echo "$sha checkout failed"; continue; }
  bash "$S/mln-server-run.sh" kipindi-mln-base 3463 "$S/lead/needle-bisect-$sha.log" -- node scripts/needle-rest.test.mjs
  echo "$(date -u +%T) $sha :: $(git -C "$T" log -1 --format=%s | cut -c1-70) :: $(grep -E '\[needle-rest\] [0-9]+ passed' "$S/lead/needle-bisect-$sha.log" | tail -1)"
done
git -C "$T" checkout -q --detach 4471bb4404223a32761e5d4ac1c4fcebe1f44c6b
