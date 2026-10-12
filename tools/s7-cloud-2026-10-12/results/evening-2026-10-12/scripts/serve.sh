#!/bin/bash
# serve.sh <dir> <port> <log> — a local in-memory dev server (no DATABASE_URL), secrets generated per run, never printed.
DIR=$1; PORT=$2; LOG=$3
S=$(openssl rand -hex 32); P=$(openssl rand -hex 32)
echo "$S" > /tmp/claude-0/l3/.ss.$PORT; chmod 600 /tmp/claude-0/l3/.ss.$PORT
export PATH=/opt/node24/bin:$PATH
cd "$DIR" && exec setsid env -u DATABASE_URL SESSION_SECRET="$S" OTP_PEPPER="$P" DISABLE_ADMIN_TOTP=true npx next dev -p "$PORT" > "$LOG" 2>&1
