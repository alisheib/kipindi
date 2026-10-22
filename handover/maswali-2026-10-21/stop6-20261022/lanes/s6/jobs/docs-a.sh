#!/usr/bin/env bash
# S6-DOCS 1-3 at the lane's merged head (002b788f0): the checks S6-DOCS 2 left owed — tsc, red:maswali-rbac, every reader
# of the shared admin files ruling (m) changed (roles.ts, rbac.ts, the section gate, the nav groups, the shell, the
# layout), the guide's own guard and red, test:maswali-fairness on both stores (S6-DOCS 1 re-pinned its child), and the
# section gate's browser half on a fresh in-memory dev server.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step red-anchors npm run test:red-anchors
step maswali-rbac npm run test:maswali-rbac
step red-maswali-rbac npm run red:maswali-rbac
step rbac npm run test:rbac
step admin-nav npm run test:admin-nav
step control-gates npm run test:control-gates
step staff-role npm run test:staff-role
step admin-roles npm run test:admin-roles
step admin-act-gate npm run test:admin-act-gate
step admin-soft-gate npm run test:admin-soft-gate
step layout-staleness npm run test:layout-staleness
step shell-boundary npm run test:shell-boundary
step admin-clip npm run test:admin-clip
step design-frozen npm run test:design-frozen
step grid-paging npm run test:grid-paging
step kyc-stage npm run test:kyc-stage
step sms-cost-guard npm run test:sms-cost-guard
step stacking npm run test:stacking
step read-tiers npm run test:read-tiers
step admin-guide npm run test:maswali-admin-guide
step red-admin-guide npm run red:maswali-admin-guide
step maswali-plan npm run test:maswali-plan
step docs npm run test:docs
step agent-rules npm run test:agent-rules
step cert-a6 npm run test:cert-a6
step admin-charts npm run test:admin-charts
step admin-overview-feed npm run test:admin-overview-feed
step campaigns-page npm run test:campaigns-page
step campaign-compose npm run test:campaign-compose
step campaign-estimate npm run test:campaign-estimate
step campaign-gates npm run test:campaign-gates
step chain-purge npm run test:chain-purge
step confirm-gate npm run test:confirm-gate
step contacts-export npm run test:contacts-export
step contacts-form npm run test:contacts-form
step house-page npm run test:house-page
step insights npm run test:insights
step i18n npm run test:i18n
step journey-home npm run test:journey-home
step journey-shell npm run test:journey-shell
step maswali-register npm run test:maswali-register
step measure npm run test:measure
step dark-edge npm run test:millionea-dark-edge
step operator-error npm run test:operator-error
step player-invite-unpaid npm run test:player-invite-unpaid
step player-page-reads npm run test:player-page-reads
step proof-privacy npm run test:proof-privacy
step simple-journey npm run test:simple-journey-flag
step updown-source npm run test:updown-source
step r5g npm run test:visual-pass-r5g
step r8c npm run test:visual-pass-r8c
step withdrawn npm run test:withdrawn-features
step fairness npm run test:maswali-fairness
step evidence npm run test:maswali-evidence
step tax-report npm run test:tax-report
step red-tax-report npm run red:tax-report
step maswali-config npm run test:maswali-config
serve 3550 -- bash -c 'node scripts/admin-section-gate.test.mjs > "$OUT/section-gate.log" 2>&1; rc=$?; echo "section-gate rc=$rc" >> "$OUT/summary.txt"; echo "---- [section-gate] rc=$rc"; tail -25 "$OUT/section-gate.log"; exit $rc' || LIB_FAILED=1
finish
