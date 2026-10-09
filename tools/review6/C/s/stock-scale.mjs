// List ADDED diff lines (src only) that use stock-scale spacing keys on the overridden scale, outside comments.
import { readFileSync } from "node:fs";
const D = process.argv[2];
const lines = readFileSync(D, "utf8").split("\n");
let file = "", newLine = 0;
const re = /(?<![\w-])(?:[a-z]+:)*-?(?:m|p|gap|space|inset|top|bottom|left|right|w|h|min-w|min-h|max-w|max-h|mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|ps|pe|ms|me|gap-x|gap-y|space-x|space-y|scroll-m[tblrxy]?|scroll-p[tblrxy]?|translate-[xy]|size|basis)-(2\.5|3\.5|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)(?![\w.-])/g;
for (const ln of lines) {
  if (ln.startsWith("+++ b/")) { file = ln.slice(6); continue; }
  const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(ln); if (h) { newLine = Number(h[1]); continue; }
  if (ln.startsWith("-")) continue;
  if (ln.startsWith("+")) {
    const body = ln.slice(1);
    const t = body.trim();
    const isComment = t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*");
    if (!isComment && /\.(tsx|ts)$/.test(file)) {
      // strip inline JSX comments and // tails
      const code = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s\/\/.*$/, "");
      const hits = [...code.matchAll(re)].map((m) => m[0]);
      if (hits.length) console.log(`${file}:${newLine}  ${hits.join(" ")}   | ${t.slice(0, 150)}`);
    }
    newLine++;
  } else if (!ln.startsWith("\\")) newLine++;
}
