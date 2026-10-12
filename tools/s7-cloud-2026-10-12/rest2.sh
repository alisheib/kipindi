#!/usr/bin/env bash
# The landing proof's server phases on THIS VM after the parity calibration: first-load, local qa:live, parity at the tip.
# (served skeleton, qa:lost-chunk with its control, chunks-prod --self-test and WP9's four drives run on a helper VM.)
export R=/tmp/claude-0/proof
C=/tmp/claude-0/chain/chain-cloud.sh
TIP=4089c9c6; PB=$R/parity-v3-52715180.json
until grep -q "phase parity-cal done\|STOP" $R/STATUS; do sleep 15; done
sleep 30
bash $C firstload $TIP > $R/rest-firstload.out 2>&1; sleep 30
bash $C live $TIP > $R/rest-live.out 2>&1; sleep 30
bash $C parity-tip $TIP $PB > $R/rest-parity-tip.out 2>&1
echo "$(TZ=Africa/Dar_es_Salaam date '+%H:%M:%S') REST DONE (this VM's three phases)" >> $R/STATUS
