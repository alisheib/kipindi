#!/usr/bin/env bash
# READ-ONLY, production: does a classic page's JavaScript carry the journey chrome? (S6 WP6b owed item 2.)
# For each route: fetch the HTML as a signed-out visitor, list every /_next/ script it loads, fetch each, and grep for
# strings only the journey chrome holds. CONTROL: the same grep must find the classic bar's own test id in some chunk.
# usage: chunks-check.sh [base]   (default https://50pick.tz)
BASE="${1:-https://50pick.tz}"
TMP=$(mktemp -d)
fail=0
for route in / /markets /positions /help; do
  curl -sL -A "Mozilla/5.0 (chunks-check)" "$BASE$route" -o "$TMP/page.html"
  grep -o 'src="/_next/[^"]*\.js[^"]*"' "$TMP/page.html" | sed 's/^src="//; s/"$//' | sort -u > "$TMP/scripts.txt"
  n=$(wc -l < "$TMP/scripts.txt")
  : > "$TMP/all.js"
  while read -r s; do curl -s "$BASE$s" >> "$TMP/all.js"; echo >> "$TMP/all.js"; done < "$TMP/scripts.txt"
  bytes=$(wc -c < "$TMP/all.js")
  # The shell MARK's id (kp-journey-shell) is NOT journey code: since WP7 every classic overlay reads the mark, so the
  # constant ships to everyone. Journey CHROME is what must never load; the mark must never be in a classic page's HTML.
  journey=$(grep -o 'journey-top-bar\|journey-tabs\|kp-jhdr' "$TMP/all.js" | sort | uniq -c | tr '\n' ' ')
  control=$(grep -o 'deposit-header\|deposit-rail' "$TMP/all.js" | sort | uniq -c | tr '\n' ' ')
  inhtml=$(grep -o 'journey-top-bar\|journey-tabs\|kp-journey-shell\|data-journey[^-]' "$TMP/page.html" | sort | uniq -c | tr '\n' ' ')
  echo "$route · $n scripts, $bytes bytes · journey strings in JS: ${journey:-none} · in HTML: ${inhtml:-none} · control (classic test ids): ${control:-NONE}"
  [ -n "$journey" ] && fail=1
  [ -n "$inhtml" ] && fail=1
done
rm -rf "$TMP"
[ $fail -eq 0 ] && echo "PASS — no classic page loads the journey chrome" || echo "FAIL — a classic page carries journey code or markup"
exit $fail
