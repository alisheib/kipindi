// Scan every .tsx/.ts under src for a NUMBER-ish expression followed by a dict key in running text, and report the
// key's sw/en values when either starts with a capital (a label key used mid-line after a count). Rough; read by hand.
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
// {expr} {t.ns.key}   |   {expr}{" "}{t.ns.key}   |  `${expr} ${t.ns.key}`
const re = /\{([^{}]{1,80})\}(?:\s|\{" "\}|&nbsp;)+\{t\.(\w+)\.(\w+)\}|\$\{([^{}]{1,80})\} \$\{t\.(\w+)\.(\w+)\}/g;
const numeric = /count|Count|length|total|Total|formatNumber|toLocaleString|\bn\b|num|Num|predictor|size|Size|open|markets|rounds|players|\d/;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(re)) {
    const expr = m[1] ?? m[4], ns = m[2] ?? m[5], key = m[3] ?? m[6];
    if (!numeric.test(expr)) continue;
    const sw = get("sw", ns, key), en = get("en", ns, key);
    if (!cap(sw) && !cap(en)) continue;
    const line = src.slice(0, m.index).split("\n").length;
    console.log(`${f.replace(ROOT + "\\", "").replace(ROOT + "/", "")}:${line}  {${expr}} t.${ns}.${key}  sw="${sw}" en="${en}"`);
  }
}
