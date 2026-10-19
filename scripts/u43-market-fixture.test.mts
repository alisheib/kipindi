/** U43: the dev-only market board must exercise Chinese card titles honestly. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

let failed = 0;
const check = (id: string, yes: boolean, note = "") => {
  console.log(`${yes ? "PASS" : "FAIL"} ${id}${note ? ` — ${note}` : ""}`);
  if (!yes) failed++;
};
const source = readFileSync("src/lib/server/market-service.ts", "utf8");
const start = source.indexOf("export async function seedDemoMarkets() {");
const seedStart = source.indexOf("const seed: CreateMarketInput[] = [", start);
const loopStart = source.indexOf("for (const s of seed)", seedStart);
const seed = start >= 0 && seedStart > start && loopStart > seedStart ? source.slice(seedStart, loopStart) : "";
const titleStarts = [...seed.matchAll(/\btitleEn:\s*"([^"]+)"/g)];
const rows = titleStarts.map((m, i) => ({
  en: m[1],
  source: seed.slice(m.index, i + 1 < titleStarts.length ? titleStarts[i + 1].index : undefined),
}));
const parsed = rows.map(({ en, source: row }) => ({
  en,
  sw: /\btitleSw:\s*"([^"]+)"/.exec(row)?.[1] ?? "",
  zh: /\btitleZh:\s*"([^"]+)"/.exec(row)?.[1] ?? "",
}));

check("1.1 canonical dev market seed parses all 40 distinct rows",
  parsed.length === 40 && new Set(parsed.map((r) => r.en)).size === 40,
  `${parsed.length} rows`);
check("1.2 every dev market has English, Swahili and Chinese question text",
  parsed.length === 40 && parsed.every((r) => r.en && r.sw && r.zh && /\p{Script=Han}/u.test(r.zh) && r.zh.endsWith("？") && Array.from(r.zh).length <= 120),
  `${parsed.filter((r) => !r.zh).length} missing Chinese`);

const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
});
const seedConsumers = sourceFiles("src").filter((path) => path !== join("src", "lib", "server", "market-service.ts")
  && readFileSync(path, "utf8").includes("seedDemoMarkets("));
const seedRoute = join("src", "app", "api", "dev-test", "seed-markets", "route.ts");
const resolveRoute = join("src", "app", "api", "dev-test", "resolve-seed-markets", "route.ts");
check("2.0 the seed has only two dev-test callers, never a production boot caller",
  JSON.stringify(seedConsumers.sort()) === JSON.stringify([seedRoute, resolveRoute].sort()), seedConsumers.join(", "));
for (const [id, path] of [["2.1", seedRoute], ["2.3", resolveRoute]] as const) {
  const route = readFileSync(path, "utf8");
  check(`${id} fixture route refuses production before seeding`,
    route.includes('if (process.env.NODE_ENV === "production")')
    && route.indexOf('if (process.env.NODE_ENV === "production")') < route.indexOf("await seedDemoMarkets()"));
}
const card = readFileSync("src/components/markets/market-card.tsx", "utf8");
const display = readFileSync("src/lib/updown-round-name.ts", "utf8");
check("2.2 market card actually selects the Chinese stored title",
  card.includes("titleZh: titleZh ?? null")
  && display.includes("pickLocalized(locale, market.titleEn, market.titleSw, market.titleZh)"));

console.log(`U43 market fixture: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
