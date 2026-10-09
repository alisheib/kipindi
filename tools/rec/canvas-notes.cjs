// canvas-notes.cjs <canvas.json> : the owner ruling of 2026-10-07 on the S4 canvas's three notes beside the revised rows.
// Re-serialises only if JSON.stringify(parse(file), null, 1) reproduces the file exactly.
const fs = require("fs");
const p = process.argv[2];
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
const t = raw.replace(/\r\n/g, "\n");
const j = JSON.parse(t);
const trail = t.endsWith("\n") ? "\n" : "";
if (JSON.stringify(j, null, 1) + trail !== t) throw new Error("the file is not JSON.stringify(_, null, 1): edit by hand");
const swap = (s, a, b, label) => {
  if (s.split(a).length - 1 !== 1) throw new Error(`${label}: not exactly once`);
  return s.replace(a, b);
};
const n = j.notes;
n.lownotes.text = swap(n.lownotes.text,
  '"Kiasi cha chini cha kuweka ni TZS 500 — TZS 300 zitabaki kwenye salio lako."',
  '"Kiasi cha chini cha kuweka ni TZS 500 — TZS 300 zitabaki kwenye salio lako." (⚠️ from the owner\'s ruling of 2026-10-07, a TZS 1,000 minimum: "Kiasi cha chini cha kuweka ni TZS 1,000 — TZS 800 zitabaki kwenye salio lako.", as the board now draws it)',
  "lownotes");
n.rowdeposit.text = swap(n.rowdeposit.text,
  "6 · Deposit · the email code and the deposit variants",
  "6 · Deposit · the deposit variants (the email-code boards ⛔ superseded 2026-10-07: a deposit asks no email question)",
  "rowdeposit");
if (!n.depnotes.text.startsWith("⛔")) {
  n.depnotes.text = "⛔ The code step is superseded by the owner's ruling of 2026-10-07 (a deposit asks no email question; S9 is not built): its words below are kept as drawn, and the rest of this note still holds. " + n.depnotes.text;
}
const out = JSON.stringify(j, null, 1) + trail;
fs.writeFileSync(p, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log("three notes annotated");
