#!/usr/bin/env bash
# The reds owed on the release (S6-INT 20's list, item 1) and S7's objection red, at the pushed head 75c6c203e (S6-INT 23):
# every plant of the money path (114, (6b) included), the objections, the fence, the integrity lists, the withdrawal email
# gate, the marketing preflight and the house desk's money. One after another (each red rewrites live files and restores
# them byte for byte); the tree must be clean at the end (`finish` prints it). red:house-bot-console runs on its own.
. "$CI_RUN/lib.sh"
step red-money-path npm run red:maswali-money-path
step red-objections npm run red:maswali-objections
step red-fence npm run red:maswali-fence
step red-integrity-list npm run red:maswali-integrity-list
step red-withdraw-email-gate npm run red:withdraw-email-gate
step red-marketing-preflight npm run red:marketing-preflight
step red-house-bot-money npm run red:house-bot-money
test -z "$(git status --porcelain)" && echo "tree clean after the reds" || { echo "TREE DIRTY after the reds"; LIB_FAILED=1; }
finish
