// visual-pass-r3c 9.1 pins DotSeq's markup; the dot now has real spaces around it (cwd = F:/kipindi-vis).
const fs = require("fs");
const p = "scripts/visual-pass-r3c.test.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const a = '<span class="kp-seq__item"><span class="kp-seq__dot" aria-hidden="true">·</span>Imeoanishwa na Tanzania</span></span>`';
const b = '<span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> Imeoanishwa na Tanzania</span></span>`\n' +
  "      // …and no word fused to the dot's closing tag — qa:live's own rule (pre-deploy-live-check.mjs spanFusedIn: a </span>\n" +
  "      // whose last character is not a space, followed by a word, inside running text). M7 caught \"·</span>Imetolewa\".\n" +
  "      && !/\\S<\\/span>[A-Za-zÀ-ɏ]{2,}/.test(two)";
const n = s.split(a).length - 1;
if (n !== 1) throw new Error(`anchor ×${n}`);
s = s.replace(a, b);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
