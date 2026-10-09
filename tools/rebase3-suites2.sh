#!/usr/bin/env bash
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
OUT="$S/runs/rebase3-results.txt"; L="$S/runs/rebase3-logs"; mkdir -p "$L"
cd F:/kipindi-vis || exit 1
echo "--- resumed without test:all and the database suites: $(wc -l < "$S/runs/rebase3-list2.txt")" >> "$OUT"
while read -r n; do t0=$(date +%s); FORCE_COLOR=0 timeout 900 npm run -s "$n" > "$L/${n//:/_}.log" 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-t0 ))s — $(grep -v '^\s*$' "$L/${n//:/_}.log" | tail -1 | cut -c1-150)" >> "$OUT"; done < "$S/runs/rebase3-list2.txt"
echo "ALL DONE" >> "$OUT"
