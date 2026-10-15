/** Synthetic questions for the exact-build, local-memory S8 receipt geometry proof.
 * Run only after bet-sheet-prod-bootstrap.mts in the same next start process. No HTTP seeder or real database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

if (process.env.KP_QA_MEMORY_BOOTSTRAP !== "bet-sheet-local-production" || process.env.NODE_ENV !== "production" || process.env.DATABASE_URL) {
  throw new Error("Receipt matrix requires the local guarded memory fixture.");
}
const cli = (process.argv[1] ?? "").replace(/\\/g, "/");
if (!/\/node_modules\/next\/dist\/bin\/next(?:\.js)?$/.test(cli) ||
    JSON.stringify(process.argv.slice(2)) !== JSON.stringify(["start", "--hostname", "127.0.0.1", "--port", "3044"])) {
  throw new Error("Receipt matrix requires next start on 127.0.0.1:3044 exactly.");
}
const root = process.cwd();
const first = JSON.parse(readFileSync(resolve(root, ".qa-artifacts/s8-production/fixture.json"), "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const required = JSON.parse(readFileSync(resolve(root, ".next/required-server-files.json"), "utf8"));
if (required.config?.deploymentId !== head || typeof first.marketId !== "string" || typeof first.userId !== "string" || !Array.isArray(first.cookies)) {
  throw new Error("Receipt matrix fixture and exact source/build identity are absent.");
}
const { createMarket } = await import(pathToFileURL(resolve(root, "src/lib/server/market-service.ts")).href);
const { marketStore } = await import(pathToFileURL(resolve(root, "src/lib/server/market-dal.ts")).href);
const ids = [first.marketId];
for (let n = 1; n < 12; n++) {
  const market = await createMarket({
    titleEn: `Local receipt matrix question ${n + 1}`,
    titleSw: `Swali la majaribio la tiketi ${n + 1}`,
    titleZh: `本地投注凭证测试问题 ${n + 1}`,
    shortTitleEn: `Receipt matrix ${n + 1}`,
    shortTitleSw: `Tiketi ${n + 1}`,
    shortTitleZh: `凭证 ${n + 1}`,
    category: "sports",
    sourceUrl: "https://example.invalid/local-receipt-matrix",
    resolutionCriterion: "Local synthetic visual fixture only",
    resolutionAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
    selectionClosedAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
    proposedBy: first.userId,
  });
  await marketStore.set({ ...market, yesPool: 24_825, noPool: 50_462 });
  ids.push(market.id);
}
writeFileSync(resolve(root, ".qa-artifacts/s8-production/receipt-matrix.json"), JSON.stringify({ sourceHead: head, ids }));
console.log(`[S8 QA] ${ids.length} local receipt matrix markets ready at ${head.slice(0, 10)}; no production database.`);
