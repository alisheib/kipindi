// Remove every `millionea: { … }` block (brace-matched, strings and comments respected) and compare the rest.
import { readFileSync } from "node:fs";
const strip = (s) => {
  let out = "", i = 0, cut = 0;
  const re = /\n(\s*)millionea: \{/g; let m;
  while ((m = re.exec(s))) {
    let j = m.index + m[0].length, depth = 1, q = null;
    while (j < s.length && depth > 0) {
      const c = s[j];
      if (q) { if (c === "\\") j++; else if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === "`") q = c;
      else if (c === "/" && s[j + 1] === "/") { while (j < s.length && s[j] !== "\n") j++; }
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      j++;
    }
    out += s.slice(cut, m.index) + "\n<MLN-BLOCK>"; cut = j; cut++; re.lastIndex = j; cut = j; i++;
  }
  return { rest: out + s.slice(cut), blocks: i };
};
const a = strip(readFileSync(process.argv[2], "utf8").replace(/\r\n/g, "\n"));
const b = strip(readFileSync(process.argv[3], "utf8").replace(/\r\n/g, "\n"));
console.log(`millionea blocks: old ${a.blocks}, new ${b.blocks}`);
if (a.rest === b.rest) { console.log("OUTSIDE the millionea namespace: IDENTICAL"); process.exit(0); }
const al = a.rest.split("\n"), bl = b.rest.split("\n");
let k = 0; while (k < al.length && al[k] === bl[k]) k++;
console.log("OUTSIDE differs from line", k, "\n- " + (al[k] ?? "").slice(0, 160) + "\n+ " + (bl[k] ?? "").slice(0, 160));
process.exit(1);
