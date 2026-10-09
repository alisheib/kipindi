#!/usr/bin/env bash
# READ-ONLY, production: is the A8d+A8g+A8h push live, and is nothing else changed for players?
# usage: a8-prod.sh <expected-commit-prefix>
WANT="$1"; BASE=https://50pick.tz
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP=$(mktemp -d); fail=0
dpl=$(curl -sI "$BASE/" | grep -io 'dpl=[^&>;" ]*' | head -1); live=${dpl#dpl=}
echo "deploy: preload ${dpl:-?} · want ${WANT}"
case "$live" in "$WANT"*) echo "PASS 1 the live deploy (?dpl=) is the pushed commit";; *) echo "FAIL 1 the live deploy is ${live:-?}, not ${WANT}"; fail=1;; esac
curl -sL -A "Mozilla/5.0 (a8-prod)" "$BASE/" -o "$TMP/home.html"
grep -o 'href="/_next/static/[^"]*\.css[^"]*"' "$TMP/home.html" | sed 's/^href="//; s/"$//' | sort -u > "$TMP/css.txt"
: > "$TMP/all.css"; while read -r c; do curl -s "$BASE$c" >> "$TMP/all.css"; echo >> "$TMP/all.css"; done < "$TMP/css.txt"
for cls in kp-sell-stack kp-sell-wrap; do n=$(grep -o "\.$cls" "$TMP/all.css" | wc -l); echo "  .$cls in the served CSS: $n"; [ "$n" -ge 1 ] || fail=1; done
for route in / /markets /positions /help /results /updown; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0 (a8-prod)" "$BASE$route"); echo "  $route → $code"
  if [ "$route" = "/positions" ]; then [ "$code" = "307" ] || fail=1; else [ "$code" = "200" ] || fail=1; fi
done
bash "$HERE/chunks-check.sh" "$BASE" || fail=1
rm -rf "$TMP"; [ $fail -eq 0 ] && echo "a8-prod: PASS" || echo "a8-prod: FAIL"; exit $fail
