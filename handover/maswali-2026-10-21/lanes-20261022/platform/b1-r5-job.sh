#!/usr/bin/env bash
# R5 (Millionea ACTIVE, scheduler and ticker off): D15's browser guard and its red twin (the census switched off).
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
echo "== qa:chat-yield (guard)"; node scripts/qa-chat-yield.mjs $F/r2-d15-guard; echo "rc=$? :: qa:chat-yield"
echo "== qa:chat-yield --prove-red"; node scripts/qa-chat-yield.mjs --prove-red $F/r2-d15-red; echo "rc=$? :: qa:chat-yield --prove-red"
exit 0
