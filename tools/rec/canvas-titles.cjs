// canvas-titles.cjs <canvas.json> : the owner ruling of 2026-10-07 on the S4 canvas's board titles.
// Re-serialises only if JSON.stringify(parse(file), null, 1) reproduces the file exactly (so the diff is the titles).
const fs = require("fs");
const p = process.argv[2];
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
const t = raw.replace(/\r\n/g, "\n");
const j = JSON.parse(t);
const trail = t.endsWith("\n") ? "\n" : "";
if (JSON.stringify(j, null, 1) + trail !== t) throw new Error("the file is not JSON.stringify(_, null, 1): edit by hand");
const boards = j.boards ?? j;
let n = 0;
for (const [key, b] of Object.entries(boards)) {
  if (key === "s4-5-low-min500.dc.html") {
    b.title = "Low balance · short by less than TZS 1,000 (the minimum since the owner's ruling of 2026-10-07)";
    n++;
  } else if (/^s4-6-code-/.test(key)) {
    if (!b.title.startsWith("⛔")) b.title = "⛔ Superseded 2026-10-07 (owner ruling: a deposit asks no email question; S9 not built) · " + b.title;
    n++;
  }
}
const out = JSON.stringify(j, null, 1) + trail;
fs.writeFileSync(p, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log(`titles set: ${n}`);
