#!/usr/bin/env bash
# FEE-TAX R0 — a docs-only change (COMPLIANCE-DECISIONS, RULES, MASWALI-PLAN, NEXT-PLAN, a new tracker).
# CI's own in-memory battery — every test:* suite that reads those documents is in it, test:red-anchors included —
# then the red twins of the plan guards and of the two money-law guards that read RULES.md.
. "$CI_RUN/lib.sh"
step test-all node scripts/test-all.mjs --no-tsc --skip responsive,motion,revoked-deadend,admin-section-gate,needle-rest,integrity
for r in maswali-plan landing-ten-plan marketing-setup-plan mobile-visual-plan phosphor-plan vodacom-plan maswali-law rate-copy; do
  step "red-$r" npm run "red:$r"
done
finish
