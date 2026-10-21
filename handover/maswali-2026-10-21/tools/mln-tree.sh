#!/usr/bin/env bash
# mln-tree.sh <dir-name> <branch-or-sha> [--new-branch <name>]
# Creates an SSD worktree under C:/50pick-ssd/<dir-name> (MASWALI-BUILD, OMEGA-COMPILE01, 2026-10-19), with a REAL
# node_modules (npm ci, never a junction), prisma generate, and the scratch-Postgres packages copied from kipindi-rel2
# (embedded-postgres 18.3.0-beta.17 + the three MSVC DLLs already in its native/bin).
set -u
NAME=$1; REF=$2; NEWB=${4:-}
DIR=C:/50pick-ssd/$NAME
LOG=C:/50pick-ssd/logs/mln-tree-$NAME.log
mkdir -p C:/50pick-ssd/logs C:/50pick-ssd/tmp
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
{
  echo "== $(date -u +%FT%TZ) setup $NAME at $REF ${NEWB:+(new branch $NEWB)}"
  if [ ! -d "$DIR" ]; then
    if [ -n "$NEWB" ]; then git -C F:/kipindi-main worktree add -b "$NEWB" "$DIR" "$REF" || exit 3
    else git -C F:/kipindi-main worktree add "$DIR" "$REF" || exit 3; fi
  fi
  cd "$DIR" || exit 3
  git log --oneline -1
  echo "== npm ci"; npm ci --no-audit --no-fund >/dev/null 2>&1 || { echo "!! npm ci failed"; npm ci --no-audit --no-fund 2>&1 | tail -20; exit 4; }
  echo "== prisma generate"; npx prisma generate >/dev/null 2>&1 || { echo "!! prisma generate failed"; exit 5; }
  echo "== postgres packages"
  SRC=C:/50pick-ssd/maswali-coord-20261019/node_modules
  mkdir -p node_modules/@embedded-postgres
  cp -r "$SRC/embedded-postgres" node_modules/ && cp -r "$SRC/async-exit-hook" node_modules/ && cp -r "$SRC/@embedded-postgres/windows-x64" node_modules/@embedded-postgres/ || { echo "!! pg copy failed"; exit 6; }
  ls node_modules/@embedded-postgres/windows-x64/native/bin/ | grep -c -i -E "msvcp140.dll|vcruntime140.dll|vcruntime140_1.dll"
  echo "== DONE $(date -u +%FT%TZ) $NAME"
} >"$LOG" 2>&1
tail -3 "$LOG"
