// After merging R3-C onto R3-A: the dotted-sequence rule is one selector list (.kp-seq + .mcardp-src__*).
const fs = require("fs");
const read = (p) => fs.readFileSync(p, "utf8");
const ed = (p, pairs) => {
  let s = read(p);
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: anchor ×${n}: ${a.slice(0, 70)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};
const css = read("src/app/globals.css").replace(/\r\n/g, "\n").split("\n");
const seqLine = css.find((l) => l.startsWith(".kp-seq, .mcardp-src__seq {"));
const dotLine = css.find((l) => l.startsWith(".kp-seq__dot, .mcardp-src__dot {"));
if (!seqLine || !dotLine) throw new Error("merged rules not found");
const BS = String.fromCharCode(92);

// 1 · featured-card 2.14 pins the merged rules as written.
ed("scripts/featured-card.test.mts", [
  [`css.includes("${BS}n.kp-hub__seq, .mcardp-src__seq { display: flex; flex-wrap: wrap; column-gap: var(--sp-3); clip-path: inset(-100vmax -100vmax -100vmax 0); }")`,
   `css.includes("${BS}n${seqLine}")`],
  [`css.includes("${BS}n.kp-hub__seq-dot, .mcardp-src__dot { position: absolute; top: 0; right: 100%; width: var(--sp-3); text-align: center; }")`,
   `css.includes("${BS}n${dotLine}")`],
]);

// 2 · visual-pass-r3c's rule() reads a selector inside a selector list too (still the whole selector, not a prefix).
ed("scripts/visual-pass-r3c.test.mts", [
  ["  const m = new RegExp(`(?:^|\\\\n)\\\\s*${esc}\\\\s*\\\\{([^}]*)\\\\}`).exec(src);",
   "  // The selector alone, or one member of a selector list (\".kp-seq__dot, .mcardp-src__dot {\" — round 3's merge put the\n" +
   "  // featured card's meta line on the same rules): never a longer selector that merely starts with it.\n" +
   "  const m = new RegExp(`(?:^|\\\\n)\\\\s*(?:[^{}\\\\n]*,\\\\s*)?${esc}(?![\\\\w-])\\\\s*(?:,[^{}\\\\n]*)?\\\\{([^}]*)\\\\}`).exec(src);"],
]);

// 3 · market-card's comment names the rule by its new name.
ed("src/components/markets/market-card.tsx", [
  ["flex item (`.mcardp-src__seq`, the hub's own idiom beside `.kp-hub__seq`)",
   "flex item (`.mcardp-src__seq`, the dotted-sequence idiom beside `.kp-seq`, dot-seq.tsx)"],
]);
console.log("ok");
