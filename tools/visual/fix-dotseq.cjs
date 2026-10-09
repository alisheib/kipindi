// DotSeq: real spaces around the hidden dot, so the text reads "A · B" when copied or read (cwd = F:/kipindi-vis).
const fs = require("fs");
const ed = (p, pairs) => {
  let s = fs.readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: anchor ×${n}: ${a.slice(0, 70)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};

ed("src/components/ui/dot-seq.tsx", [
  [" * A string with no \" · \" renders as one plain span — byte-identical to the text it replaces.\n */",
   " * A string with no \" · \" renders as one plain span — byte-identical to the text it replaces.\n" +
   " * ⭐ THE SPACES AROUND THE DOT ARE REAL TEXT (2026-10-09, M7's local qa:live: \"[sw] /legal/rules no words run together\n" +
   " * after an inline tag · ·</span>Imetolewa\"). A dot span followed straight by the next word reads \"…2026-10-07·Imetolewa\"\n" +
   " * to a copy and paste, and to a reader that does not separate flex items. One space before and one after the hidden dot\n" +
   " * make the text the dictionary wrote, \"A · B\". Both sit at the start of a flex item, where white space collapses, so\n" +
   " * nothing moves on the screen.\n */"],
  ["          {i > 0 && <span className=\"kp-seq__dot\" aria-hidden>·</span>}\n",
   "          {i > 0 && <>{\" \"}<span className=\"kp-seq__dot\" aria-hidden>·</span>{\" \"}</>}\n"],
]);
console.log("ok");
