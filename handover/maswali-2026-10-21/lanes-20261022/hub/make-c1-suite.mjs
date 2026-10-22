// Derives the commit-1 suite (the loading pick only) from the full suite: drops the frame helpers, 3.2, §13 and §14.
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
let s = readFileSync(src, "utf8");
const cut = (from, to, label) => {
  const a = s.indexOf(from);
  const b = s.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error(`marker not found: ${label}`);
  s = s.slice(0, a) + s.slice(b);
};
const drop = (text, label) => {
  if (!s.includes(text)) throw new Error(`text not found: ${label}`);
  s = s.replace(text, "");
};
drop('const FRAME = req("../src/app/millionea/hub-frame.ts") as typeof import("../src/app/millionea/hub-frame.ts");\n', "FRAME");
drop("/** An attribute's value as react-dom/server writes it (its five escaped characters). */\n", "escAttr doc");
drop('const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");\n', "escAttr");
cut("  // ⭐ S5-R2-HUB · each fact list of the head's rule balances", "}\n\n// ── §4 ·", "3.2");
cut("// ── §13 · L7 (round 2)", "// ── §15 ·", "§13–§14");
drop(" *   §13 L7 (round 2) the loading drawing composes the page's frame: the reader's block last, a guest by the shell's mark,\n *       every block sweeping                              §14 L6/L21 the no-week body keeps its day with its clock\n", "header §13/§14");
if (/\bFRAME\b|\bescAttr\b|noWeekBody|ghostOf\(/.test(s)) throw new Error("a commit-2 reference is left");
writeFileSync(out, s);
console.log(`wrote ${out}: ${s.length} chars`);
