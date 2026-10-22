import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const ROOT = "C:/50pick-ssd/kipindi-mln-ddoor/src";
const walk = (d, out = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith(".tsx")) out.push(p); } return out; };
const { dict } = await import("file:///C:/50pick-ssd/kipindi-mln-ddoor/src/lib/i18n-dict.ts");
const seen = new Map();
for (const f of walk(ROOT)) {
  if (f.includes("\admin\\") || f.includes("/admin/")) continue;
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/<EmptyState\b([^]*?)\/?>/g)) {
    const t = /title=\{(?:[^{}]*\?\s*)?t\.(\w+)\.(\w+)/.exec(m[1]);
    if (t) seen.set(`${t[1]}.${t[2]}`, f.replace(/^.*[\/]src[\/]/, "src/"));
  }
}
const dot = [], plain = [];
for (const [k, f] of seen) { const [ns, key] = k.split("."); const v = dict.en?.[ns]?.[key]; if (typeof v !== "string") continue; (/[.!?]$/.test(v) ? dot : plain).push(`${k}="${v}" (${f})`); }
console.log(`EmptyState titles read (en, player side): ${plain.length} with no end mark, ${dot.length} with one`);
console.log(dot.join("\n"));
console.log("e.g. without:", plain.slice(0, 6).join(" | "));
