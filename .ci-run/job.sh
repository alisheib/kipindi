#!/usr/bin/env bash
# The three admin browser drives, each on its own FRESH in-memory server with Millionea ACTIVE and the background
# schedulers off — as the Maswali hand-over ran them (FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false).
. "$CI_RUN/lib.sh"
E="FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false"
step drive-maswali-admin serve 3101 $E -- npm run -s qa:maswali-admin-drive
step drive-objection-console serve 3102 $E -- npm run -s qa:maswali-objection-console
step drive-purge-ceremony serve 3103 $E -- npm run -s qa:purge-ceremony
finish
