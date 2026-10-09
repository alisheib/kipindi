// A candidate fix for keepNameEnd: whole user-perceived characters, and only collapsible spaces between them.
import { markup, textOf, keyIssues, React } from "./h.ts";
import { keepNameEnd } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";

const CH = String.raw`(?:\p{RI}\p{RI}|\S(?:[\p{M}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]|\u200D\S)*)`;
const NAME_END = new RegExp(`${CH}[\\t\\n\\f\\r ]*${CH}[\\t\\n\\f\\r ]*$`, "u");
export function keepNameEndFixed(name: string): React.ReactNode {
  const at = name.search(NAME_END);
  if (at <= 0) return name;
  return [name.slice(0, at), React.createElement("span", { key: "name-end", className: "whitespace-nowrap" }, name.slice(at))];
}
const esc = (s: string) => s.replace(/[\u00a0\u2000-\u200f\u3000\ufe0f]/g, (c) => "\\u" + c.codePointAt(0)!.toString(16).padStart(4, "0"));
const show = (n: React.ReactNode) => esc(markup(n).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
for (const n of ["Juma K", "Mwanaisha Khamis", "AB", "百里呼延", "Ali 👨‍👩‍👧", "Neema 👩‍💻", "Juma 🏳️‍🌈", "Asha 👍🏽", "Ali 🇹🇿", "Zoe\u0308", "Namba 1️⃣",
  "AB" + "\u3000".repeat(37) + "C", "AB" + "\u2003".repeat(37) + "C", "AB" + " ".repeat(37) + "C", "Player #A3F2K8"]) {
  const a = show(keepNameEnd(n));
  const b = show(keepNameEndFixed(n));
  console.log(a === b ? `   same  ${a.slice(0, 70)}` : `   tip   ${a.slice(0, 70)}\n   fixed ${b.slice(0, 70)}`);
}
let seed = 9;
const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const P = ["a", "B", " ", "  ", "\u3000", "\u00a0", "\u2003", "👩‍💻", "👍🏽", "🇹🇿", "e\u0301", "\u0301", "\u200d", "\ufe0f", "呼", "1️⃣", "\t", "x"];
let bad = 0;
for (let i = 0; i < 20000; i++) {
  let s = "";
  const k = Math.floor(r() * 14);
  for (let j = 0; j < k; j++) s += P[Math.floor(r() * P.length)];
  const node = keepNameEndFixed(s);
  if (textOf(markup(node)) !== s || keyIssues(node).length) bad++;
}
console.log("fixed keepNameEnd text-safety: 20000 cases, failures", bad);
for (const [label, s] of [["a*10000", "a".repeat(10000)], ["mark*10000", "a" + "\u0301".repeat(9999)], ["zwj-chain", "a" + "\u200da".repeat(4999)], ["sp", "a" + " ".repeat(9998) + "b"]] as const) {
  const t0 = performance.now(); keepNameEndFixed(s); console.log(`  timing ${label}: ${(performance.now() - t0).toFixed(1)} ms`);
}
