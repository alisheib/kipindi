// Scratch probe (not committed): every millionea zh template my pages fill, whose placeholder touches a Han character
// directly — the fills that decide whether Millionea's zh spacing ruling holds at that edge.
import { readFileSync } from "node:fs";
const ROOT = "C:/50pick-ssd/kipindi-mln-dreg/";
const files = [
  "src/app/millionea/register/page.tsx",
  "src/app/millionea/register/[week]/page.tsx",
  "src/app/millionea/register/register-parts.tsx",
  "src/app/millionea/how/page.tsx",
  "src/app/millionea/how/how-example.tsx",
  "src/components/maswali/maswali-ledger.tsx",
];
const used = new Set<string>();
for (const f of files) for (const m of readFileSync(ROOT + f, "utf8").matchAll(/t\.millionea\.(\w+)/g)) used.add(m[1]);
const { dict } = await import("file:///C:/50pick-ssd/kipindi-mln-dreg/src/lib/i18n-dict.ts");
const zh = (dict as any).zh.millionea as Record<string, unknown>;
const HAN = "[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]";
const touch = new RegExp(`${HAN}\\{\\w+\\}|\\{\\w+\\}${HAN}`);
for (const k of [...used].sort()) {
  const v = zh[k];
  if (typeof v === "string" && touch.test(v)) console.log(`${k}: ${JSON.stringify(v)}`);
}
