// R5-L · were these four imports already unused at HEAD (before the skeletons left)?
import { execSync } from "node:child_process";
const { decomment } = await import("file:///F:/kipindi-r5l/scripts/lib/decomment.mts");
for (const [f, syms] of [["src/app/markets/page.tsx", ["isClosedByTime", "MarketCategory"]], ["src/app/results/page.tsx", ["categoryGlyph", "FilterGroupKey"]]] as const) {
  const s = decomment(execSync(`git -C F:/kipindi-r5l show HEAD:${f}`, { encoding: "utf8" }));
  for (const sym of syms) console.log(`${f} @HEAD ${sym}: ${(s.match(new RegExp(`\b${sym}\b`, "g")) ?? []).length} occurrence(s) after decomment`);
}
