/** S12 F14: the classic Up & Down stake rail may wrap, and no money chip is narrow. */
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/updown/updown-stake-controls.tsx", "utf8");
const arms = /const chipBase = compact\s*\? "([^"]+)"\s*: "([^"]+)"/.exec(source);
const groupAt = source.indexOf('role="radiogroup" aria-label={t.market.udStake}');
const group = groupAt >= 0
  ? /<div className=\{cn\("([^"]+)"/.exec(source.slice(Math.max(0, groupAt - 170), groupAt))?.[1] ?? ""
  : "";
let pass = 0, fail = 0;
const ok = (name: string, condition: boolean) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? pass++ : fail++;
};
const safe = (rail: string, compact: string, full: string) =>
  /\bflex-wrap\b/.test(rail) && /\bgap-y-1\b/.test(rail) &&
  [compact, full].every((classes) =>
    classes.includes("min-h-[44px]") && classes.includes("min-w-[44px]") &&
    /\bshrink-0\b/.test(classes) && /\bwhitespace-nowrap\b/.test(classes)) &&
  compact.includes("text-[11px]") && full.includes("text-[12px]");

ok("0 · the two chip densities and the real stake radiogroup were located", !!arms && !!group);
if (arms) {
  ok("1 · the rail wraps at 320 while every chip keeps a 44×44 floor and ladder type", safe(group, arms[1], arms[2]));
  ok("2 · PLANT: nowrap would clip Custom again", !safe(group.replace("flex-wrap", "flex-nowrap"), arms[1], arms[2]));
  ok("3 · PLANT: one narrow chip would fall below the width floor", !safe(group, arms[1].replace("min-w-[44px]", ""), arms[2]));
  ok("4 · PLANT: the old off-ladder chip type is caught", !safe(group, arms[1], arms[2].replace("text-[12px]", "text-[11.5px]")));
}
console.log(`updown-stake-rail: ${pass} passed, ${fail} failed`);
if (pass < 5 || fail) process.exit(1);
