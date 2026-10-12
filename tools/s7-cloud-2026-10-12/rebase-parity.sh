#!/usr/bin/env bash
# Main moved under the landing (the minimum-stake change, de44e087): a v3 baseline at that main, then the rebased tip against it.
export R=/tmp/claude-0/proof
C=/tmp/claude-0/chain/chain-cloud.sh
B=$R/parity-v3-de44e087.json
bash $C parity-base de44e0872 $B > $R/rebase-base.out 2>&1; sleep 30
grep -q "6b baseline at de44e0872: .*written" $R/STATUS || { echo "$(TZ=Africa/Dar_es_Salaam date '+%H:%M:%S') REBASE PARITY STOP: the baseline was not written" >> $R/STATUS; exit 2; }
bash $C parity-tip a7786df62 $B > $R/rebase-tip.out 2>&1
echo "$(TZ=Africa/Dar_es_Salaam date '+%H:%M:%S') REBASE PARITY DONE" >> $R/STATUS
