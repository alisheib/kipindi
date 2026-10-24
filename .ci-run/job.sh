#!/usr/bin/env bash
# FEE-TAX R1 — the three browser drives the second-officer setting moved, each on its own FRESH in-memory server
# (the card must read "nothing stored" at the start).
. "$CI_RUN/lib.sh"
step drive-maswali-admin serve 3101 -- npm run -s qa:maswali-admin-drive
step drive-objection-console serve 3102 -- npm run -s qa:maswali-objection-console
step drive-purge-ceremony serve 3103 -- npm run -s qa:purge-ceremony
finish
