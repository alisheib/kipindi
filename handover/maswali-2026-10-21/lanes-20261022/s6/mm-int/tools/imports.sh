#!/bin/bash
# usage: imports.sh <repo> <tree-of-importers> <tree-of-modules> <file-list>
REPO="$1"; SRC="$2"; MOD="$3"; LIST="$4"
cd "$REPO" || exit 1
while read -r f; do
  case "$f" in *.ts|*.tsx|*.mts|*.mjs) ;; *) continue;; esac
  git cat-file -p "$SRC:$f" 2>/dev/null | tr '\n' ' ' | grep -o 'import[^;]*from "[^"]*"' | while read -r imp; do
    mod=$(echo "$imp" | sed -E 's/.*from "([^"]*)".*/\1/')
    names=$(echo "$imp" | grep -o '{[^}]*}' | head -1 | tr -d '{}' | tr ',' '\n' | sed -E 's/^ *type +//; s/ +as +.*//; s/^ *//; s/ *$//' | grep -v '^$')
    [ -z "$names" ] && continue
    case "$mod" in
      @/*) base="src/${mod#@/}";;
      ./*|../*) base=$(dirname "$f")/"$mod"; base=$(echo "$base" | awk -F/ '{n=0; for(i=1;i<=NF;i++){ if($i=="."||$i=="") continue; if($i==".."){n--; continue} a[++n]=$i } s=a[1]; for(i=2;i<=n;i++) s=s"/"a[i]; print s}');;
      *) continue;;
    esac
    path=""
    for ext in "" .ts .tsx .mts .mjs .js /index.ts /index.tsx; do
      p="$base$ext"; p="${p%.ts.ts}"
      if git cat-file -e "$MOD:$p" 2>/dev/null; then path="$p"; break; fi
    done
    if [ -z "$path" ]; then echo "NOMODULE $f -> $mod"; continue; fi
    body=$(git cat-file -p "$MOD:$path")
    for n in $names; do
      if ! echo "$body" | grep -qE "export (default )?(declare )?(async )?(function\*? |const |let |var |type |interface |class |enum |abstract class )$n\b|export \{[^}]*\b$n\b|export \* from"; then
        echo "MISSING $f imports {$n} from $mod ($path)"
      fi
    done
  done
done < "$LIST"
