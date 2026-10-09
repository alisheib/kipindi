#!/usr/bin/env bash
# End-to-end controls for test:stacking 6.1 - run against a SCRATCH copy of src/, never the real tree.
set -u
SCR="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/ctl-stack"
TSX="/f/kipindi-rot3/node_modules/.bin/tsx"
cd "$SCR"

run() { # label
  echo "=================== $1"
  "$TSX" scripts/stacking-contract.test.mts > out.log 2>&1
  echo "exit=$?"
  grep -E "^FAIL|^[0-9]+ passed" out.log | cut -c1-330
}

# 0. untouched copy: must be green (same as the real tree)
run "0. untouched scratch copy"

# 1. an unnamed z just above the local plane, in CSS
cp "$SCR/../ctl-stack/src/app/globals.css" globals.orig
printf '\n.kp-plant { position: relative; z-index: 12; }\n' >> src/app/globals.css
run "1. CSS rule with z-index: 12 planted in globals.css"
cp globals.orig src/app/globals.css

# 2. an unnamed z in a Tailwind class
cp src/components/ui/pull-to-refresh.tsx pull.orig
printf '\nexport const KpPlant = () => <div className="fixed z-[13]" />;\n' >> src/components/ui/pull-to-refresh.tsx
run "2. className z-[13] planted in a tsx file"
cp pull.orig src/components/ui/pull-to-refresh.tsx

# 3. the ticker's lift drifts to 25 (a real chrome-adjacent value)
sed -i 's/position: relative; z-index: 11; }/position: relative; z-index: 25; }/' src/app/globals.css
run "3. ticker lift raised 11 -> 25"
cp globals.orig src/app/globals.css

# 4. the boundary widened (the 'cheap fix'): LOCAL_PLANE_MAX 10 -> 19 in the test copy
cp scripts/stacking-contract.test.mts test.orig
sed -i 's/^const LOCAL_PLANE_MAX = 10;/const LOCAL_PLANE_MAX = 19;/' scripts/stacking-contract.test.mts
printf '\n.kp-plant { position: relative; z-index: 12; }\n' >> src/app/globals.css
run "4. LOCAL_PLANE_MAX widened to 19, z-index: 12 planted (6.1 goes green; 6.1b must catch the widening)"
cp globals.orig src/app/globals.css
cp test.orig scripts/stacking-contract.test.mts

# 5. 11 dropped from KNOWN_ROOT_RUNGS (back to the original failure)
sed -i 's/^  11, 20, 30, 40, 45,/  20, 30, 40, 45,/' scripts/stacking-contract.test.mts
run "5. 11 removed from KNOWN_ROOT_RUNGS (the state main was in)"
cp test.orig scripts/stacking-contract.test.mts

# 6. back to untouched
run "6. restored scratch copy"
