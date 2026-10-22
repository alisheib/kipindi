#!/usr/bin/env bash
# ci-run.sh <name> <target-rev> <job.sh> [--wait] [--webkit]
#   Runs <job.sh> against the EXACT commit <target-rev> on GitHub's machines: builds a run commit (the target + the MLN run
#   workflow + .ci-run/{lib.sh,job.sh}) with git plumbing (no checkout), pushes it to a fresh branch ci/run/<name>-<stamp>,
#   prints the run's id and address. With --wait it polls until the run completes and saves its log and artifact to
#   $CI/runs/<name>-<stamp>/ (run.log, art/...). Light: git + the GitHub API only; no Node runs here.
#   The target must exist in C:/kipindi-main's object store (every worktree shares it). <name>: letters, digits, dash.
set -u
CI=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/ci
NAME="$1"; REV="$2"; JOB="$3"; shift 3
WAIT=0; WEBKIT=0
for a in "$@"; do case "$a" in --wait) WAIT=1 ;; --webkit) WEBKIT=1 ;; esac; done
case "$NAME" in *[!a-zA-Z0-9-]*|"") echo "bad name '$NAME'"; exit 2 ;; esac
[ -f "$JOB" ] || { echo "no job file $JOB"; exit 2; }
cd /c/kipindi-main || exit 2
TARGET=$(git rev-parse --verify -q "$REV^{commit}") || { echo "unknown revision $REV"; exit 2; }
STAMP=$(date -u +%m%d-%H%M%S)
BR="ci/run/$NAME-$STAMP"
IDX="$CI/.idx-$NAME-$STAMP"
export GIT_INDEX_FILE="$IDX"
git read-tree "$TARGET" || exit 3
addf() { local b; b=$(git hash-object -w "$1") && git update-index --add --cacheinfo "100644,$b,$2"; }
addf "$CI/mln-run.yml" .github/workflows/mln-run.yml || exit 3
addf "$CI/lib.sh" .ci-run/lib.sh || exit 3
addf "$JOB" .ci-run/job.sh || exit 3
if [ $WEBKIT -eq 1 ]; then addf "$CI/lib.sh" .ci-run/webkit || exit 3; fi
TREE=$(git write-tree)
unset GIT_INDEX_FILE; rm -f "$IDX"
C=$(git commit-tree "$TREE" -p "$TARGET" -m "ci(mln-run): $NAME on ${TARGET:0:9} (a run branch; never merged)") || exit 3
git push -q origin "$C:refs/heads/$BR" || { echo "push failed"; exit 4; }
T=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
RID=""
for i in $(seq 1 40); do
  RID=$(GH_TOKEN="$T" gh run list --branch "$BR" --json databaseId -q '.[0].databaseId' 2>/dev/null)
  [ -n "$RID" ] && break
  sleep 3
done
echo "run: $NAME  target ${TARGET:0:9}  branch $BR  id ${RID:-?}  https://github.com/alisheib/kipindi/actions/runs/${RID:-}"
echo "$(date -u +%FT%TZ) $NAME ${TARGET:0:9} $BR ${RID:-?}" >> "$CI/runs.txt"
[ $WAIT -eq 1 ] || exit 0
[ -n "$RID" ] || { echo "no run id found"; exit 5; }
exec bash "$CI/ci-wait.sh" "$RID" "$NAME-$STAMP"
