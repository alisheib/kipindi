#!/usr/bin/env bash
# ci-wait.sh <run-id> [<folder-name>] — waits for a GitHub Actions run to complete (polls every 30 s), then saves its
# whole log and its artifacts under $CI/runs/<folder-name>/ and prints the conclusion, each job's failed steps and the
# summary lines of the log. Light: the GitHub API only. Run it with run_in_background for anything long.
set -u
CI=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/ci
RID="$1"; NAMEF="${2:-$1}"
T=$(cd /c/kipindi-main && printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
export GH_TOKEN="$T"
st=""
while :; do
  st=$(gh run view "$RID" --repo alisheib/kipindi --json status,conclusion -q '.status + " " + .conclusion' 2>/dev/null)
  case "$st" in completed*) break ;; esac
  sleep 30
done
D="$CI/runs/$NAMEF"; mkdir -p "$D"
gh run view "$RID" --repo alisheib/kipindi --log > "$D/run.log" 2>&1
gh run download "$RID" --repo alisheib/kipindi -D "$D/art" > /dev/null 2>&1
echo "run $RID: $st -> $D"
gh run view "$RID" --repo alisheib/kipindi --json jobs -q '.jobs[] | "  job " + .name + ": " + (.conclusion // .status) + ([.steps[] | select(.conclusion == "failure") | " | FAILED: " + .name] | join(""))' 2>/dev/null
sed -E 's/^[^\t]*\t[^\t]*\t[0-9T:.-]+Z ?//' "$D/run.log" | grep -a -E "^(---- \[|==== |PLANT|[A-Za-z0-9._-]+ rc=[0-9]+)" | tail -80
