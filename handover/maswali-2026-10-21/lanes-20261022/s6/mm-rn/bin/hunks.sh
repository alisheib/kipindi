#!/bin/sh
# usage: hunks.sh <tree> <path> [context]
C=${3:-3}
git -C F:/kipindi-main cat-file -p "$1:$2" | awk -v C="$C" '
{ line[NR]=$0 }
END {
  inh=0; n=0
  for (i=1;i<=NR;i++) {
    if (line[i] ~ /^<<<<<<< /) { n++; s=i-C; if (s<1) s=1; print "---- hunk " n " @" i; for (k=s;k<i;k++) print k": "line[k]; inh=1 }
    if (inh) print i": "line[i]
    if (line[i] ~ /^>>>>>>> /) { inh=0; e=i+C; if (e>NR) e=NR; for (k=i+1;k<=e;k++) print k": "line[k] }
  }
  print "TOTAL hunks: " n
}'
