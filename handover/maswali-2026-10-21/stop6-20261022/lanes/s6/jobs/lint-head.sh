#!/usr/bin/env bash
# S6-LINT at its head (ba19508a6, S6-LINT 4): the two checks it owes (tsc, red:maswali-claims), its own suite at the
# printed floor, and every reader of the files its four commits changed (composer-loader, campaign-template, footer,
# millionea-claims, millionea-untagged, campaign-draft, campaign-test-send, engine) — all static or memory suites.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step claims npm run test:maswali-claims
step red-claims npm run red:maswali-claims
step client-graph npm run test:client-graph-safe
step red-anchors npm run test:red-anchors
step campaign-compose npm run test:campaign-compose
step campaign-gates npm run test:campaign-gates
step campaign-audience npm run test:campaign-audience
step campaign-models npm run test:campaign-models
step campaign-visuals npm run test:campaign-visuals
step marketing-window npm run test:marketing-window
step marketing-preflight npm run test:marketing-preflight
step red-marketing-preflight npm run red:marketing-preflight
step marketing-wordings npm run test:marketing-wordings
step marketing-optout npm run test:marketing-optout
step marketing-consent npm run test:marketing-consent
step marketing-engine npm run test:marketing-engine
step journey-shell npm run test:journey-shell
step privacy-notice npm run test:privacy-notice
step support-contact npm run test:support-contact
finish
