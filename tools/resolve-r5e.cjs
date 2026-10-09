// R5-E onto the rebased branch (R5-B/C/D/F + r4e fix). CRLF kept.
const fs = require("fs");
const R = "F:/kipindi-vis/";
const RE = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/;
const rd = (p) => fs.readFileSync(R + p, "utf8"), wr = (p, s) => fs.writeFileSync(R + p, s);
{ const p = "package.json"; let s = rd(p); if (!RE.test(s)) throw new Error(p);
  s = s.replace(RE, (_, a, b) => a + b); JSON.parse(s); wr(p, s); }
{ const p = "src/app/results/page.tsx"; let s = rd(p); if (!RE.test(s)) throw new Error(p);
  s = s.replace(RE, (_, a, b) => {
    if (!a.includes("group-hover:text-brand-200") || !b.includes("text-balance group-hover:text-gold-100")) throw new Error("hunk shape");
    return b.replace("text-balance group-hover:text-gold-100", "text-balance group-hover:text-brand-200");
  });
  if (!/import \{[^}]*\bkeepFigures\b[^}]*\} from "@\/components\/ui\/keep-words"/.test(s)) throw new Error("keepFigures import missing");
  wr(p, s); }
for (const p of ["package.json", "src/app/results/page.tsx"]) if (/^(<<<<<<<|=======|>>>>>>>)/m.test(rd(p))) throw new Error("markers in " + p);
console.log("resolved");
