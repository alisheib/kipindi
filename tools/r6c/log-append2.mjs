import fs from "node:fs";
const p = process.argv[2];
const lines = [
  "- run4 (36 suites) ALL OK, incl. the 8 modal.tsx readers (campaign-gates OK too).",
  "- C17 SIBLING SWEEP (clamps on market titles in player code): win-celebration.tsx:339 `line-clamp-2` on the won market's",
  "  name (no tap behind it: the seal closes itself -> the end was simply lost) -> whole + text-balance + keepFigures (R5-E's",
  "  F1/F4 for a title that now wraps); popup-fit's CLIP_DEBT entry for it removed (its ratchet 2.2 requires a stale entry go).",
  "  Ruled, kept: /fairness resolved table (browsing, the name is its link), /live pulse grid (browsing, Q6), performance best-win",
  "  card (inside its link; the page's own tap-to-whole note), proposals description (browsing board). Performance recent rows",
  "  `truncate` = compact ledger row with a tap (wallet-client's compact-clips/full-wraps idiom). r6c 14.6/14.7/14.7' + plant P35.",
  "- run5 started: 37 suites (every win-celebration/keep-words reader + popup-fit + required list + red twins + r6c).",
];
fs.appendFileSync(p, lines.join("\r\n") + "\r\n");
