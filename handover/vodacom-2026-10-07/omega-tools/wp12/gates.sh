#!/usr/bin/env bash
# gates.sh <worktree> <outdir> : WP12's light gates (no server, no typecheck), each to its own log; a summary line each.
WT="$1"; OUT="$2"; mkdir -p "$OUT"; cd "/f/$WT" || exit 2
for k in test:guards-exist test:orphans test:docs test:live-target-safe test:source-bytes test:support-contact test:design-one-door test:decomment test:red-anchors test:vodacom-plan test:journey-shell test:journey-tickets test:wallet-reach; do
  timeout 600 npm run -s "$k" > "$OUT/$k.log" 2>&1; rc=$?
  echo "$k exit=$rc :: $(sed 's/\x1b\[[0-9;]*m//g' "$OUT/$k.log" | grep -v '^\s*$' | tail -2 | tr '\n' ' ' | cut -c1-230)"
done
