#!/usr/bin/env bash
# R5b: the switch suite, its red twin, and the anchor audit.
. "$CI_RUN/lib.sh"
step t-fee-law-switch npm run test:fee-law-switch
step red-fee-law-switch npm run red:fee-law-switch
step t-red-anchors npm run test:red-anchors
finish
