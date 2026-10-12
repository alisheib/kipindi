#!/usr/bin/env bash
# S7's landing proof on a cloud VM (Linux, 4 cores, ~15 GB): chain-land6.sh's and chain-wp1c.sh's steps
# (origin/vodacom-visual-tools tools/s7-omega-2026-10-12/), run directly - no shared lock, ONE heavy job at a time.
# Usage: chain-cloud.sh <phase> [args]   (phases below; each appends to $R/STATUS)
export PATH=/opt/node24/bin:$PATH
R=${R:-/tmp/claude-0/proof}
TIP=${TIP:-/home/user/kipindi-land6}   # the branch worktree (vodacom-s7-land7)
SRV=${SRV:-/home/user/kipindi-srv}     # the server worktree (its own npm ci)
PORT=${PORT:-3076}
mkdir -p "$R"
note() { echo "$(TZ=Africa/Dar_es_Salaam date '+%H:%M:%S') $*" | tee -a "$R/STATUS"; }
freegb() { awk '/MemAvailable/ {printf "%.1f", $2/1048576}' /proc/meminfo; }
die() { note "STOP: $*"; exit 2; }
srv_at() {
  local want; want=$(git -C "$TIP" rev-parse "$1^{commit}") || die "cannot resolve $1"
  [ -z "$(git -C "$SRV" status --porcelain --untracked-files=no)" ] || die "the server worktree is dirty"
  git -C "$SRV" checkout -q --detach "$want" || die "checkout of $1 failed"
  [ "$(git -C "$SRV" rev-parse HEAD)" = "$want" ] || die "the server tree is at $(git -C "$SRV" rev-parse --short HEAD), not $1"
  note "server tree VERIFIED at $(git -C "$SRV" rev-parse --short=8 HEAD)"
}
PGF="$R/srv.pgid"
stop_server() {
  if [ -f "$PGF" ]; then local g; g=$(cat "$PGF"); kill -TERM -"$g" 2>/dev/null; sleep 4; kill -KILL -"$g" 2>/dev/null; rm -f "$PGF"; fi
  fuser -k -n tcp "$PORT" >/dev/null 2>&1; sleep 1
}
FONT_FAIL="next/font/google queries have exactly one entry"
fonts_ok() { [ "$(curl -s -o /dev/null -m 15 -w "%{http_code}" "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap")" = "200" ]; }
font_invalid() { grep -a -q "issue establishing a connection while requesting https://fonts.googleapis.com" "$R/$1.server.log" && note "INVALID $1: the dev server could not fetch Google Fonts"; }
# One fresh in-memory dev server (Turbopack) in the server worktree; the command runs from that tree with every base
# variable the drives read and the server's own secrets; then the server is stopped. Exit code to $R/<tag>.code.
run_srv() {
  local tag="$1"; shift
  local log="$R/$tag.log" srv="$R/$tag.server.log" up=0 tries code
  export KP_SESSION_SECRET KP_OTP_PEPPER
  KP_SESSION_SECRET=$(openssl rand -hex 32); KP_OTP_PEPPER=$(openssl rand -hex 32)
  for tries in 1 2; do
    stop_server; rm -rf "$SRV/.next"
    ( cd "$SRV" && exec setsid env -u DATABASE_URL SESSION_SECRET="$KP_SESSION_SECRET" OTP_PEPPER="$KP_OTP_PEPPER" \
        DISABLE_ADMIN_TOTP=true npx next dev -p "$PORT" > "$srv" 2>&1 ) &
    echo $! > "$PGF"
    up=0
    for i in $(seq 1 240); do
      code=$(curl -s -o /dev/null -m 60 -w "%{http_code}" "http://localhost:$PORT/" || true)
      [ "$code" = "200" ] && { up=1; break; }
      grep -q "$FONT_FAIL" "$srv" 2>/dev/null && break
      sleep 2
    done
    [ $up -eq 1 ] && break
    note "$tag: server did not come up (try $tries)"
  done
  if [ $up -ne 1 ]; then stop_server; echo 99 > "$R/$tag.code"; note "$tag: NO SERVER"; return 99; fi
  for p in / /markets /positions /wallet /profile /auth/demo /updown /results /live /account /watchlist /help; do curl -s -o /dev/null -m 180 "http://localhost:$PORT$p"; done
  ( cd "$SRV" && BASE="http://localhost:$PORT" KP_BASE="http://localhost:$PORT" LIVE_BASE="http://localhost:$PORT" \
      SESSION_SECRET="$KP_SESSION_SECRET" "$@" ) > "$log" 2>&1
  local rc=$?
  stop_server
  echo $rc > "$R/$tag.code"
  note "$tag: exit $rc (free $(freegb) GB)"
  return $rc
}
verdict() { sed 's/\x1b\[[0-9;]*m//g' "$R/$1.log" | grep -a -E "$2" | tail -"${3:-3}" | tr '\n' ' ' | cut -c1-300; }
WD=""
watchdog() {  # below 1.0 GB available, stop this run's dev server (the run then fails on its own and says so)
  rm -f "$R/WATCHDOG.off"
  ( while [ ! -f "$R/WATCHDOG.off" ]; do f=$(freegb); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt";
      if awk -v f="$f" 'BEGIN{exit !(f<1.0)}'; then note "WATCHDOG: free $f GB - stopping the dev server"; stop_server; sleep 60; fi; sleep 15; done ) &
  WD=$!
}
# Whatever ends a phase - its last line, a die, a signal - the watchdog and this run's dev server go with it.
trap 'touch "$R/WATCHDOG.off"; [ -n "$WD" ] && kill "$WD" 2>/dev/null; stop_server' EXIT

PHASE="$1"; shift
case "$PHASE" in
  # ── A · the branch worktree: typecheck, the gates, the population plants, the file-editing reds alone ──────────────
  inprocess)
    WANT="$1"; GATES="$2"
    [ "$(git -C "$TIP" rev-parse HEAD)" = "$(git -C "$TIP" rev-parse "$WANT")" ] || die "the branch worktree is not at $WANT"
    [ -z "$(git -C "$TIP" status --porcelain --untracked-files=no)" ] || die "the branch worktree is dirty"
    note "A start: tip $(git -C "$TIP" rev-parse --short=8 HEAD) · free $(freegb) GB"
    ( cd "$TIP" && npx tsc --noEmit ) > "$R/1-typecheck.log" 2>&1; T=$?; note "1 typecheck: exit $T ($(grep -c 'error TS' "$R/1-typecheck.log") errors)"
    : > "$R/2-gates.txt"
    # three at a time (in-process suites; none writes a file - the file-editing reds run alone, in phase "reds")
    export R TIP; tr ' ' '\n' < "$GATES" | grep -v '^$' | xargs -P 3 -n 1 bash /tmp/claude-0/chain/gate-one.sh
    note "2 gates: $(awk '$2!=0{print $1"="$2}' "$R/2-gates.txt" | tr '\n' ' ')· $(awk '$2==0' "$R/2-gates.txt" | wc -l)/$(wc -l < "$R/2-gates.txt") exit 0"
    [ -z "$(git -C "$TIP" status --porcelain --untracked-files=no)" ] || note "WARNING: the branch tree is not clean after the gates"
    ;;
  plants)
    bash /tmp/claude-0/chain/plants-wp2-linux.sh "$TIP" "$R" > "$R/3-plants.log" 2>&1; note "3 population plants: $(tail -1 "$R/3-plants.log")"
    ;;
  reds)
    for r in red:featured-card red:one-sided red:ticker-honesty red:contrast red:timer-date red:filter-language red:measure red:chat-availability red:failure-reasons; do
      ( cd "$TIP" && timeout 2400 npm run "$r" ) > "$R/4-$r.log" 2>&1; rc=$?; git -C "$TIP" diff --exit-code > /dev/null; d=$?
      note "4 $r alone: exit $rc · $(verdict "4-$r" 'caught|CAUGHT|ALL|FAIL|MISSED|passed|proved|PROVED' 1) · tree $([ $d -eq 0 ] && echo clean || echo DIRTY)"
      [ $d -eq 0 ] || { git -C "$TIP" checkout -- .; note "restored the branch tree"; }
    done
    ;;
  # ── B · parity v3 calibrated on this VM at calibration 3's commit: --prove-red, the baseline, the null compare ────────
  parity-cal)
    WANT="$1"; B="$R/parity-v3-$(git -C "$TIP" rev-parse --short=8 "$WANT").json"
    [ -e "$B" ] && die "a baseline already exists at $B (never overwrite one)"
    fonts_ok || die "Google Fonts unreachable"
    srv_at "$WANT"; watchdog
    run_srv 5-prove-red npm run qa:classic-shell-parity -- --prove-red; font_invalid 5-prove-red
    note "5 prove-red: $(sed 's/\x1b\[[0-9;]*m//g' "$R/5-prove-red.log" | grep -a -E '^  (PASS|FAIL)' | awk '{print $1}' | sort | uniq -c | tr '\n' ' ') · $(verdict 5-prove-red 'ALL PASS|FAILURES|REFUSED' 1)"
    [ "$(cat "$R/5-prove-red.code")" = "0" ] || { touch "$R/WATCHDOG.off"; die "prove-red did not pass"; }
    sleep 30; fonts_ok || die "Google Fonts unreachable before the baseline"
    run_srv 6-baseline npm run qa:classic-shell-parity -- --baseline "$B"; font_invalid 6-baseline
    note "6 baseline: $(verdict 6-baseline 'ALL PASS|FAILURES|REFUSED|written|rejected|INVALID' 3) · $(stat -c %s "$B" 2>/dev/null) bytes"
    { [ "$(cat "$R/6-baseline.code")" = "0" ] && [ -s "$B" ]; } || { touch "$R/WATCHDOG.off"; die "the baseline failed"; }
    sleep 30; fonts_ok || die "Google Fonts unreachable before the null compare"
    run_srv 7-null npm run qa:classic-shell-parity -- --compare "$B"; font_invalid 7-null
    note "7 null compare: $(verdict 7-null '^  FAIL|ALL PASS|FAILURES|REFUSED|passed' 4)"
    touch "$R/WATCHDOG.off"
    ;;
  # ── C · the tip in the server worktree: qa:first-load builds at HEAD and reads the build; local qa:live ─────────────
  firstload)
    WANT="$1"; fonts_ok || die "Google Fonts unreachable before the build"
    srv_at "$WANT"
    ( cd "$SRV" && rm -rf .next && timeout 3600 npm run -s qa:first-load -- --build --read --log "$R/8-first-load-build.log" ) > "$R/8-first-load.log" 2>&1
    note "8 qa:first-load --build --read: exit $? · $(verdict 8-first-load 'PASS|FAIL|refused|not measured' 2)"
    ;;
  live)
    WANT="$1"; srv_at "$WANT"; watchdog
    run_srv 9-live node scripts/pre-deploy-live-check.mjs; font_invalid 9-live
    note "9 qa:live local: $(verdict 9-live 'ALL PASS|passed|failed|FAIL' 2)"; touch "$R/WATCHDOG.off"
    ;;
  parity-tip)
    WANT="$1"; PB="$2"; fonts_ok || die "Google Fonts unreachable before the parity compare"
    srv_at "$WANT"; watchdog
    # A hard limit: one run stalled 17 min inside a browser call late in the Sell phase (2026-10-12; a repro was clean).
    run_srv 10-parity timeout 3300 npm run qa:classic-shell-parity -- --compare "$PB" --allow-base; font_invalid 10-parity
    note "10 parity v3 vs $(basename "$PB"): $(verdict 10-parity '^  FAIL|passed —|FAILURES|REFUSED|ALL PASS' 4)"; touch "$R/WATCHDOG.off"
    ;;
  # ── D · served skeleton --main, classic readers: a null pair at main, then the tip, compared offline ───────────────
  skeleton)
    MAIN="$1"; WANT="$2"; watchdog
    srv_at "$MAIN"
    run_srv 11-skel-main-a npm run qa:served-skeleton -- --capture "$R/skel-main-a.json" --viewers guest,player; sleep 30
    run_srv 11-skel-main-b npm run qa:served-skeleton -- --capture "$R/skel-main-b.json" --viewers guest,player; sleep 30
    srv_at "$WANT"
    run_srv 11-skel-tip npm run qa:served-skeleton -- --capture "$R/skel-tip.json" --viewers guest,player
    ( cd "$TIP" && node scripts/qa-served-skeleton.mjs --compare "$R/skel-main-a.json" "$R/skel-main-b.json" --main --norm store-ids ) > "$R/12-skel-null.log" 2>&1; N=$?
    ( cd "$TIP" && node scripts/qa-served-skeleton.mjs --compare "$R/skel-main-a.json" "$R/skel-tip.json" --main --norm store-ids ) > "$R/12-skel-tip.log" 2>&1; K=$?
    note "12 served skeleton --main: null pair exit $N · $(tail -1 "$R/12-skel-null.log" | cut -c1-110) · main->tip exit $K · $(tail -1 "$R/12-skel-tip.log" | cut -c1-110)"
    touch "$R/WATCHDOG.off"
    ;;
  # ── E · L1's drive on the tip, then its control (lazy-overlays.tsx as L1's parent had it) ────────────────────────────
  lostchunk)
    WANT="$1"; L1="$2"; srv_at "$WANT"; watchdog
    run_srv 13-lost-chunk npm run -s qa:lost-chunk
    note "13 qa:lost-chunk on the tip: $(verdict 13-lost-chunk 'PASS|FAIL|NOT MEASURED|controls?' 2)"
    sleep 30
    git -C "$SRV" checkout "$L1~1" -- src/components/layout/lazy-overlays.tsx || die "could not put L1's parent file back"
    run_srv 14-lost-chunk-control npm run -s qa:lost-chunk -- --expect-crash
    git -C "$SRV" checkout "$WANT" -- src/components/layout/lazy-overlays.tsx; rm -rf "$SRV/.next"
    [ -z "$(git -C "$SRV" status --porcelain --untracked-files=no)" ] && note "14 qa:lost-chunk control (L1's parent file): $(verdict 14-lost-chunk-control 'PASS|FAIL|NOT MEASURED|control' 2) · server tree restored, clean" || note "14 WARNING: the server tree is not clean after the control"
    ( cd "$TIP" && npm run -s qa:chunks-prod -- --self-test ) > "$R/15-chunks-self.log" 2>&1; note "15 qa:chunks-prod --self-test: exit $? · $(verdict 15-chunks-self 'PASS|FAIL|controls?' 1)"
    touch "$R/WATCHDOG.off"
    ;;
  # ── F · WP9's four drives on the tip ─────────────────────────────────────────────────────────────────────────────────
  wp9drives)
    WANT="$1"; srv_at "$WANT"; watchdog
    mkdir -p "$R/shots-preview"
    run_srv 16-journey-preview env KP_SHOTS="$R/shots-preview" npm run -s qa:journey-preview
    note "16 qa:journey-preview: $(verdict 16-journey-preview 'passed|PASS|FAIL|failed' 2)"; sleep 30
    run_srv 17-unread-handover npm run -s qa:journey-unread-handover
    note "17 qa:journey-unread-handover: $(verdict 17-unread-handover 'passed|PASS|FAIL|failed' 2)"; sleep 30
    run_srv 18-header-fit npm run -s qa:journey-header-fit
    note "18 qa:journey-header-fit: $(verdict 18-header-fit 'passed|PASS|FAIL|failed' 2)"; sleep 30
    run_srv 19-landmark-journey npm run -s qa:landmark-seal -- --journey
    note "19 qa:landmark-seal --journey: $(verdict 19-landmark-journey 'passed|PASS|FAIL|failed|problem' 2)"
    touch "$R/WATCHDOG.off"
    ;;
  *) echo "unknown phase $PHASE"; exit 2 ;;
esac
note "phase $PHASE done · server tree at $(git -C "$SRV" rev-parse --short=8 HEAD) · free $(freegb) GB"
