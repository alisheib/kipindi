#!/usr/bin/env bash
# Lane DOORS: the type-level mutation proof — a temporary file hands MarketsGhost `false`; tsc must refuse both lines.
# The file is removed on exit, whatever happens.
cd C:/50pick-ssd/kipindi-mln-ddoor || exit 2
P=src/app/markets/zz-dark-type-plant.tsx
trap 'rm -f "$P"; echo "plant removed: $([ -e "$P" ] && echo NO || echo yes)"' EXIT
printf '%s\n' 'import MarketsGhost from "./markets-ghost";' 'export const planted = <MarketsGhost millionea={false} />;' 'export const plantedPreview = <MarketsGhost millionea preview={false} />;' 'export const fine = <MarketsGhost millionea preview />;' > "$P"
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
npx tsc --noEmit
echo "tsc rc=$?"
