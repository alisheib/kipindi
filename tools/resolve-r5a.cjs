// R5-A onto R5-B/C/D/E/F (rebased on 118fc75c). CRLF kept.
const fs = require("fs");
const R = "F:/kipindi-vis/";
const RE = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/;
const rd = (p) => fs.readFileSync(R + p, "utf8"), wr = (p, s) => fs.writeFileSync(R + p, s);
const once = (s, a, b, what) => { if (s.split(a).length !== 2) throw new Error("anchor " + what + ": " + a); return s.replace(a, b); };
// package.json: r5a before r5b/r5c/r5e
{ const p = "package.json"; let s = rd(p); if (!RE.test(s)) throw new Error(p);
  s = s.replace(RE, (_, a, b) => b + a); JSON.parse(s); wr(p, s); }
// eyebrow-roles: R5-A's span with R5-C's brand ink (the key re-derived below by the gate itself)
{ const p = "scripts/design-gate/eyebrow-roles.mjs"; let s = rd(p); if (!RE.test(s)) throw new Error(p);
  s = s.replace(RE, (_, a, b) => once(b, "text-gold-300\\\"> ↵ <I.crown s={13} /> <span className=\"", "text-brand-300\\\"> ↵ <I.crown s={13} /> <span className\"", "eyebrow key")
    .replace("// Round 5 (R5-A, F19): the flag's words sit in a span of their own (`kp-track-end`, its trailing tracking taken back).",
             "// Round 5 (R5-A, F19): the flag's words sit in a span of their own (`kp-track-end`, its trailing tracking taken back);\r\n  // its ink is R5-C's brand-300 (the second gold audit)."));
  wr(p, s); }
// results/page.tsx: R5-A's span and note, R5-C's brand ink
{ const p = "src/app/results/page.tsx"; let s = rd(p); if (!RE.test(s)) throw new Error(p);
  s = s.replace(RE, (_, a, b) => once(b, "font-bold text-gold-300\">", "font-bold text-brand-300\">", "flag ink"));
  wr(p, s); }
for (const p of ["package.json", "scripts/design-gate/eyebrow-roles.mjs", "src/app/results/page.tsx"])
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(rd(p))) throw new Error("markers in " + p);
console.log("resolved");
