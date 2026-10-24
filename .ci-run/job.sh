#!/usr/bin/env bash
# Pre-push minimum (memory: tsc before ANY push — a type error makes Railway refuse every build).
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
finish
