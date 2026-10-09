// Looser: every {t.ns.key} (or t.ns.key inside a template/expression) whose sw or en value starts with a capital, with a
// numeric-looking expression in the 70 characters before it on the same line. Also every dict value lower-cased in code.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const { dict } = await import("file:///F:/kipindi-r5a/src/lib/i18n-dict.ts");
const ROOT = "F:/kipindi-r5a/src";
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f) && !/i18n-dict/.test(f)) files.push(p);
  }
};
walk(ROOT);
const get = (loc: string, ns: string, key: string): unknown => (dict as any)[loc]?.[ns]?.[key];
const cap = (v: unknown) => typeof v === "string" && /^\p{Lu}/u.test(v);
const numeric = /\{[^{}]*(count|Count|\.length|total|Total|formatNumber|toLocaleString|\bn\b|predictor|Predictor|open|Open|rounds|Rounds|players|Players|markets|Markets|\bnum\b)[^{}]*\}|\$\{[^{}]*(count|Count|\.length|total|formatNumber|toLocaleString|\bn\b)[^{}]*\}/;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/t\.(\w+)\.(\w+)\b(?!\s*[.(\[])/g)) {
      const ns = m[1], key = m[2];
      const sw = get("sw", ns, key), en = get("en", ns, key);
      if (!cap(sw) && !cap(en)) continue;
      const before = line.slice(Math.max(0, (m.index ?? 0) - 70), m.index);
      if (!numeric.test(before)) continue;
      if (/label=|title=|aria-label|placeholder|heading=|eyebrow|caption=/.test(before.slice(-25))) continue;
      console.log(`${f.replace(/\\/g, "/").replace(ROOT + "/", "")}:${i + 1}  t.${ns}.${key} sw="${sw}" en="${en}"\n      …${line.trim().slice(0, 220)}`);
    }
    for (const m of line.matchAll(/t\.(\w+)\.(\w+)\.(toLowerCase|toLocaleLowerCase)\(/g)) {
      console.log(`LOWERCASED ${f.replace(/\\/g, "/").replace(ROOT + "/", "")}:${i + 1}  t.${m[1]}.${m[2]}`);
    }
  });
}
