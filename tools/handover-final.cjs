// Handover head, 2026-10-10 ~08:55 EAT: round 6's read done, three fixes and the history-bar branch on vodacom-visual.
const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/handover-head.md";
let s = fs.readFileSync(p, "utf8");
function rep(a, b) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${n} × ${a.slice(0, 70)}`); s = s.replace(a, () => b); }
s = s.replace(/\(updated 2026-10-10 ~0[0-9]:[0-9]{2} EAT\)/, "(updated 2026-10-10 ~08:55 EAT)");
rep("- **`origin/vodacom-visual`** at `3d2beb17` (`4b754b89`, the proven merged tip, + the invite page's in-memory fix) — ",
  "- **`origin/vodacom-visual`** at `5c13a9a2` (`4b754b89`, the proven merged tip, + `3d2beb17` the invite page's in-memory fix,\n  `11e8e628` the hub's Sign out ink, `34245fd4` /results' spotlight flag, and the history-bar branch's three commits) — ");
rep("1. **Done on `origin/vodacom-visual-history-bar`", "1. **MERGED on vodacom-visual (`94bf79ad`); was `origin/vodacom-visual-history-bar`");
rep("2. **Done on the same branch (`6123d45c`;", "2. **MERGED (`4d6dab4b`; was `6123d45c`;");
rep("3. **Done on the same branch (`2e58013d`;", "3. **MERGED (`5c13a9a2`; was `2e58013d`;");
const a = "   **Then (06:50 EAT):** turn C on `3d2beb17`";
const start = s.indexOf(a), end = s.indexOf("2. The final proof, in lock turns");
if (start < 0 || end < 0) throw new Error("turn C anchors");
const text = [
  "   **Turn C done on `3d2beb17`** (06:48–07:16 EAT): local `qa:live` **334/334** (the invite fix confirmed); classic parity",
  "   with `--allow-base` (the A18 premise re-checked inside the chain) **37/39**: two difference families, both intended and",
  "   still to register as named EXPECTED_DIFFS (never a re-baseline) — R4-K's not-found robots tag in 32 cells (\"index,",
  "   follow\\nnoindex\" → \"noindex\\nnoindex, nofollow\") and the classic sell confirm at 360 (R5-A F20: the ✕ moved from the",
  "   panel's corner into the title row, 13px lower, the title column 278 → 222px; R6-B B-1: the panel's `tabIndex=-1` and",
  "   `outline-none` — a TRANSPARENT 2px outline, computed \"solid\", nothing drawn). Capture:",
  "   `S/visual/parity-main-e7a979c6.json.current.json`.",
  "   **Round 6's read done** (eight readers, all 333 tiles, `S/visual/reader-r6-1..8.txt` with `read-brief-r6-fixes.md`):",
  "   the record is **`S/visual/triage-r6.md`** (tools branch: `tools/visual/triage-r6.md`) — every finding, its check and",
  "   status. Fixed and merged since (each owes its tile): the hub's Sign out ink (`11e8e628`), the /results spotlight flag",
  "   (`34245fd4`, a regression since R5-A: the tracking take-back made the shrink-to-fit flag break its words). On the",
  "   combined branch `5c13a9a2`: 26 suites green and the R5-L 38, R5-H 41, R5-J 26, R5-K 29, R5-B 36, R5-A 41, R5-C 59, R5-G",
  "   30, R6-C 40, R5-I 58 proofs green. **Still open (the next round): the triage's OPEN list** — one more regression (the",
  "   en 390 Tiketi zangu empty state's \"— your / ticket\" break since R5-E), the zh featured card's split source name, the",
  "   leaderboard ribbon's missing sign, two legal titles ending on \"ya\"/\"wa\", a /fairness tracked label 2px short, two",
  "   eyebrow inks, the podium coin's contrast, the void chip's ink, the notice band's inset, the \"My tickets\" optical edge,",
  "   the payment tile ring, and the parity entries; then re-tile (turn B's tiles step and the invite tiles) and re-read.",
  "",
].join("\n");
s = s.slice(0, start) + text + s.slice(end);
fs.writeFileSync(p, s);
console.log("ok");
