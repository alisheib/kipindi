// The four commit messages, corrected by the review of 2026-10-07 (each replacement must occur exactly once).
const fs = require("fs");
const D = __dirname;
const edit = (sha, pairs) => {
  const p = `${D}/msg-${sha}.txt`;
  let m = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = m.split(a).length - 1;
    if (n !== 1) throw new Error(`${sha}: ${JSON.stringify(a.slice(0, 50))} occurs ${n}x`);
    m = m.replace(a, b);
  }
  fs.writeFileSync(p, m);
  console.log(`${sha}: ${pairs.length} edit(s)`);
};
edit("8adafb15", [[
  "fails only when its set-up does not hold;",
  "fails only when its set-up does not hold (and then names no rule: on the tree before A8j there is no control to skip);",
]]);
edit("f95364e8", [[
  "- The canvas README records the revision.",
  "- canvas.json's three notes beside those rows: the low-balance note's draft sentence carries the TZS 1,000 version\n  beside it (as S4-COPY-AUDIT does), and the deposit row's title and notes mark the code step superseded.\n- The canvas README records the revision.",
]]);
edit("dc51d591", [
  ["its link an anchor stretched under it, the controls raised over it", "its link an anchor stretched over its content, the controls raised above the link"],
  ["The card's link has since become an anchor stretched UNDER the card (.mcardp-open) with the\naction block raised over it (.ud-act), so a tap in the controls area never reaches the link, and the wrapper's\nclick and Enter/Space swallowing is defence in depth.",
   "The card's link has since become an anchor stretched OVER the card's content (.mcardp-open, z-index 2 over its\nrows at 1) with the action block raised above it (.ud-act, z-index 3), so a tap in the controls area never reaches\nthe link, and the wrapper's click and Enter/Space swallowing is defence in depth; the header, countdown and stats sit\nbeneath the link, so a tap there opens the round."],
]);
edit("a582d056", [
  ["- 2.5c, the control: the pass holder's own page carries them, so 1.3 and 3.3 can fail.",
   "- 2.5c, the control: the pass holder's own page carries EACH of the shell's two test ids, read apart from the\n  preview's trace (one pattern holding both would pass there on the marker alone), so 1.3 and 3.3 can fail on them."],
  ["its trace pattern, read out of the file, holds 10 cases as intended\n(attribute, escaped attribute, JSON prop and escaped JSON prop caught; a chunk file name, another test id and a longer\nid not).",
   "its trace helpers, read out of the file, hold 8 cases as intended (the\nids as attributes and as JSON props caught; the marker alone does not satisfy 2.5c; a classic page, a chunk file name\nand a longer id not)."],
]);
