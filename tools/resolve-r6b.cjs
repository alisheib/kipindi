// R6-B onto cef12387 (R5-J): name-editor keeps R5-K's shared face and takes R6-B's server-decided cut; the suite list
// keeps both lines.
const fs = require("fs");
const R = "F:/kipindi-wip/";
const RE = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/g;
{ const p = "package.json"; let s = fs.readFileSync(R + p, "utf8");
  s = s.replace(RE, (_, a, b) => a + b); JSON.parse(s); fs.writeFileSync(R + p, s); }
{ const p = "src/components/profile/name-editor.tsx"; let s = fs.readFileSync(R + p, "utf8");
  let n = 0;
  s = s.replace(RE, (_, a, b) => {
    n++;
    if (a.includes('import { keepNameEnd } from "@/components/ui/keep-words";')) {
      return b + a.split(/\r?\n/).filter((l) => l.includes("PROFILE_NAME_FACE")).join("\r\n") + "\r\n";
    }
    if (a.includes("${PROFILE_NAME_FACE}")) {
      const spanOurs = a.split(/\r?\n/)[0];
      const nameTheirs = b.split(/\r?\n/)[1];
      return spanOurs + "\r\n" + nameTheirs + "\r\n";
    }
    throw new Error("unexpected hunk");
  });
  if (n !== 2) throw new Error("expected 2 hunks, got " + n);
  fs.writeFileSync(R + p, s); }
for (const p of ["package.json", "src/components/profile/name-editor.tsx"])
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(fs.readFileSync(R + p, "utf8"))) throw new Error("markers left in " + p);
console.log("ok");
