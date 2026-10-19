/** W5: a category is the same readable Duotone sigil on a royal plate wherever it is offered. */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryPlate } from "../src/components/ui/category-plate";
import { categoryGlyph } from "../src/components/ui/glyphs";
import { MARKET_CATEGORIES } from "../src/lib/markets/categories";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string) => readFileSync(`${ROOT}/${path}`, "utf8");
const files = {
  plate: read("src/components/ui/category-plate.tsx"),
  card: read("src/components/markets/market-card.tsx"),
  detail: read("src/app/markets/[id]/page.tsx"),
  discovery: read("src/components/markets/discovery-bar.tsx"),
  journey: read("src/components/journey/home/home-chips.tsx"),
  css: read("src/app/globals.css"),
};

function contracts(s: typeof files): string[] {
  const bad: string[] = [];
  if (!s.plate.includes('variant="identity"') || !s.plate.includes('tier="duo"') || !s.plate.includes("plateGlyph(size)")) bad.push("the shared category plate lost its identity material, Duotone tier or derived glyph size");
  for (const [name, source] of [["card", s.card], ["detail", s.detail], ["discovery", s.discovery], ["journey", s.journey]] as const) {
    if (!source.includes("<CategoryPlate ")) bad.push(`${name} does not render the shared category plate`);
  }
  if (s.card.includes("mcardp-watermark") || s.css.includes(".mcardp-watermark")) bad.push("the card's faint category watermark returned");
  if (s.detail.includes("opacity-[0.07]") || s.detail.includes("pr-[calc(2em+12px)]")) bad.push("the detail page's watermark or its reserved blank question measure returned");
  return bad;
}

let failures = 0;
const check = (label: string, okay: boolean, detail = "") => {
  console.log(`${okay ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!okay) failures++;
};

if (process.argv.includes("--prove-red")) {
  const plants: Array<[string, keyof typeof files, string, string]> = [
    ["category tier becomes Line", "plate", 'tier="duo"', 'tier="line"'],
    ["card loses the shared plate", "card", "<CategoryPlate ", "<RetiredCategoryPlate "],
    ["faint watermark returns", "css", ".mcardp-catico {", ".mcardp-watermark { opacity: 0.055; }\n.mcardp-catico {"],
    ["detail reserves space for the old watermark", "detail", "text-balance\"", "text-balance pr-[calc(2em+12px)]\""],
  ];
  check("green control", contracts(files).length === 0, contracts(files).join("; "));
  for (const [name, key, from, to] of plants) {
    const source = files[key];
    if (!source.includes(from)) { check(name, false, "plant anchor absent"); continue; }
    const mutant = { ...files, [key]: source.replace(from, to) };
    check(name, contracts(mutant).length > 0, contracts(mutant).join("; "));
  }
} else {
  check("every category surface uses the shared plate", contracts(files).length === 0, contracts(files).join("; "));
  for (const category of [...MARKET_CATEGORIES, null]) {
    const key = category === null ? "layoutGrid" : categoryGlyph(category);
    const html = renderToStaticMarkup(createElement(CategoryPlate, { category }));
    check(`${category ?? "all"} renders ${key} in Duotone on the identity plate`,
      html.includes("kp-plate--identity") && html.includes(`data-g="${key}.duo"`)
      && html.includes('style="width:26px;height:26px"') && html.includes('width="14"'));
  }
}

console.log(`category plates: ${failures} failure(s)`);
if (failures) process.exit(1);
