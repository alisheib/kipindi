// Rewrite r5i §3.5's scanner lines (a Git Bash heredoc ate their backslashes).
const fs = require("fs");
const p = "F:/kipindi-r5i/scripts/visual-pass-r5i.test.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const a = s.indexOf("  // 3.5 · the slips the sweep turned");
const b = s.indexOf("  ok(\"3.5 · the player's own slips");
if (a < 0 || b < 0) { console.log("anchors missing", a, b); process.exit(1); }
const block = [
  "  // 3.5 · the slips the sweep turned `factual` — counted, so the census cannot pass over nothing.",
  "  const SLIP_TITLES = /t\\.toast\\.(?:notAnImage|imageTooLarge|couldntReadImage|nameEmpty|couldntCopy)\\b/;",
  "  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {",
  "    const p = join(d, n);",
  "    return statSync(p).isDirectory() ? walk(p) : /\\.tsx?$/.test(n) ? [relative(ROOT, p).replace(/\\\\/g, \"/\")] : [];",
  "  });",
  "  const playerFiles = walk(join(ROOT, \"src\")).filter((f) => !OUT_OF_SCOPE.test(f));",
  "  const slipCount = playerFiles.reduce((s, f) => s + ((read(f).match(/toast\\(\\{[^;]*?\\}\\)/g) ?? []).filter((c) => SLIP_TITLES.test(c) && /variant: \"factual\"/.test(c)).length), 0);",
  "",
].join("\n");
s = s.slice(0, a) + block + s.slice(b);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
const bad = [...s.matchAll(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g)].length;
console.log("ok; control chars left:", bad);
