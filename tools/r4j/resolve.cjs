// Resolves a git merge-file conflict block by taking "theirs" (R4-J's side) and applying fixups to it.
const fs = require("fs");
const [file, ...fix] = process.argv.slice(2); // fixups: pairs "from=>to"
let s = fs.readFileSync(file, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const re = /<<<<<<< ours\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> theirs\n/g;
let n = 0;
s = s.replace(re, (_m, ours, theirs) => {
  n++;
  let out = theirs;
  for (const f of fix) {
    const [from, to] = f.split("=>");
    const c = out.split(from).length - 1;
    if (c !== 1) throw new Error(`fixup ${JSON.stringify(from)} found ${c}x in block ${n}`);
    out = out.replace(from, to);
  }
  return out;
});
if (!n) throw new Error("no conflict block");
fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log(`${file}: ${n} block(s) resolved`);
