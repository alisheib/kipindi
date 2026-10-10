// Handover head: turn B's results (2026-10-10 04:46–06:47 EAT) and what followed, replacing the "running" paragraph.
const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/handover-head.md";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("   **Turn B was running from 04:46 EAT**");
const end = s.indexOf("2. The final proof, in lock turns");
if (start < 0 || end < 0 || end < start) throw new Error("anchors");
const text = [
  "   **Turn B done on `4b754b89`** (04:46–06:47 EAT, the lock held; `S/wm16b2-chain.sh`, results `S/runs/wm16b2-*`):",
  "   classic-shell parity's baseline at main `e7a979c6` captured (224 cells) and its null compare 40/40 and `--prove-red`",
  "   green — but the tip's compare REFUSED (A18: the merge `1e4586e5` brought 78 served files \"from elsewhere\"; both",
  "   merges' main sides, `9aa4eec2` and `e7a979c6`, are ancestors of the baseline commit, so the baseline holds every file",
  "   they brought — verified — which is the case `--allow-base` exists for; turn C runs it); `qa:bar-geometry` and its red",
  "   5/5 on the tip and on main's control; header fit green (least slack 10.7px at sw 320) and its red 10/10; the landmark",
  "   seals 504 journey cells and 276 classic cells, 0 problems; needle-rest twice green; the font probe; the preview drive",
  "   33/33 with no page error; **local `qa:live` 330/334 — the 4 all /profile/invite on an in-memory server: its tab's agent",
  "   read chained `.then` on the in-memory store's row (not a promise), so the page lost its body — a real defect since",
  "   R5-G, production (Prisma) unaffected, FIXED on the branch `3d2beb17`** (r5g 3.5 now runs the in-memory store's shape;",
  "   3.5″ a census: no `db.x.y(…).then(` in src; R5-G 30/30 and R6-C 40/40 proofs); **333 tiles** in",
  "   `S/visual/tiles-r6b2` (`qa:journey-shell` 1642 passed, 3 failed — the same invite page — and 2 blocked: Up & Down",
  "   round pages with no local price feed).",
  "   **Then (06:50 EAT):** turn C on `3d2beb17` (`S/wm16c2-chain.sh`: parity `--allow-base`, `qa:live`) and **round 6's",
  "   read**: eight readers on the 333 tiles with `S/visual/read-brief-r6-fixes.md` (what every fix since round 5 must look",
  "   like), the diff overlays against round 5 (`S/visual/diff-r6`, 323 changed · 8 equal · 2 new) and",
  "   `S/visual/reader-r6-1..8.txt`. If this file still says they were running, rerun them: `node S/visual/prep-r6.cjs 8`,",
  "   then one reader agent per prompt file; the parity compare's differences are each attributed to a named EXPECTED_DIFFS",
  "   entry (never a re-baseline).",
  "",
].join("\n");
s = s.slice(0, start) + text + s.slice(end);
s = s.replace(/\(updated 2026-10-10 ~0[0-9]:[0-9]{2} EAT\)/, "(updated 2026-10-10 ~06:55 EAT)");
fs.writeFileSync(p, s);
console.log("ok");
