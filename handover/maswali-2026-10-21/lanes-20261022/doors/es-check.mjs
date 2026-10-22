import { readFileSync } from "node:fs";
const keys = readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);
const { dict } = await import("file:///C:/50pick-ssd/kipindi-mln-ddoor/src/lib/i18n-dict.ts");
let dot = [], plain = [];
for (const k of keys) {
  const [ns, key] = k.split(".");
  const v = dict.en?.[ns]?.[key];
  if (typeof v !== "string") continue;
  (/[.!?]$/.test(v) ? dot : plain).push(`${k}="${v}"`);
}
console.log(`EmptyState titles (en): ${plain.length} without end punctuation, ${dot.length} with`);
console.log(dot.join("\n"));
