#!/usr/bin/env bash
# The last red owed on the release (S6-INT 20's list, item 1): the desk console's red twin, every plant, on the pushed
# release head 641603e2b (S6-INT 24). It rewrites live files and restores them byte for byte; the tree must be clean.
. "$CI_RUN/lib.sh"
step red-house-bot-console npm run red:house-bot-console
test -z "$(git status --porcelain)" && echo "tree clean after the red" || { echo "TREE DIRTY after the red"; git status --short | head; LIB_FAILED=1; }
finish
