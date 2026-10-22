/** U43 B1: one visible stake row, with a 44px floor on every money chip. */
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/updown/updown-stake-controls.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const arms = /const chipBase = compact\s*\? "([^"]+)"\s*: "([^"]+)"/.exec(source);
const groupAt = source.indexOf('role="radiogroup" aria-label={t.market.udStake}');
const group = groupAt >= 0
  ? source.slice(Math.max(0, groupAt - 220), groupAt)
  : "";
let pass = 0, fail = 0;
const ok = (name: string, condition: boolean) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? pass++ : fail++;
};
const safe = (rail: string, compact: string, full: string, styles: string) =>
  /ud-stake-rail flex items-center/.test(rail)
  && /compact \? "mb-1 flex-nowrap"/.test(rail)
  && /\.ud-stake-rail \{[^}]*max-width: 100%; overflow-x: auto;/.test(styles)
  && /@media \(max-width: 359px\) \{[\s\S]*?\.ud-custom-word \{ display: none; \}/.test(styles)
  && source.includes('className={compact ? "ud-custom-word" : undefined}') &&
  [compact, full].every((classes) =>
    classes.includes("min-h-[44px]") && classes.includes("min-w-[44px]") &&
    /\bshrink-0\b/.test(classes) && /\bwhitespace-nowrap\b/.test(classes)) &&
  compact.includes("text-micro") && full.includes("text-body-sm");

ok("0 · the two chip densities and the real stake radiogroup were located", !!arms && !!group);
if (arms) {
  ok("1 · the compact rail stays on one row, the Custom word clears at 320, and each chip keeps its 44×44 floor", safe(group, arms[1], arms[2], css));
  ok("2 · PLANT: restoring the Custom word at 320 fails", !safe(group, arms[1], arms[2], css.replace(".ud-custom-word { display: none; }", "")));
  ok("3 · PLANT: one narrow chip falls below the width floor", !safe(group, arms[1].replace("min-w-[44px]", ""), arms[2], css));
  ok("4 · PLANT: the old off-ladder chip type is caught", !safe(group, arms[1], arms[2].replace("text-body-sm", "text-[11.5px]"), css));
}
console.log(`updown-stake-rail: ${pass} passed, ${fail} failed`);
if (pass < 5 || fail) process.exit(1);
