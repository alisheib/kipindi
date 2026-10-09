import { readFileSync } from "node:fs";
const ROOT = "F:/kipindi-r6b";
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
const names = readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean);
const MARK = { db: /DATABASE_URL|PrismaClient|@prisma\/client|prisma-dal|db:scratch|withScratchDb|pg\.Client|new Pool\(/, browser: /playwright|chromium\.launch|puppeteer/, server: /localhost:\d|BASE_URL|KP_BASE|spawn\(\s*["']npm["'],\s*\[\s*["']run["'],\s*["'](?:dev|start)/ };
for (const n of names) {
  const cmd = pkg.scripts[n];
  const m = /scripts\/([\w./-]+\.(?:mts|mjs|ts|cjs|js))/.exec(cmd);
  let s = ""; try { s = readFileSync(`${ROOT}/scripts/${m[1]}`, "utf8"); } catch {}
  const tags = Object.entries(MARK).filter(([, re]) => re.test(s)).map(([k]) => k);
  console.log(`${n}\t${tags.join(",") || "static"}\t${cmd.length > 80 ? cmd.slice(0, 80) + "…" : cmd}`);
}
