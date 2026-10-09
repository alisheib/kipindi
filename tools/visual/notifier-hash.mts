// Re-measures house-bot-reports' PLAYER_NOTIFIER hashes exactly as playerNotifierProblems does — run with cwd = the tree.
// argv: [label, path-to-a-source-file-or-"-"] pairs are not needed; it reads the tree, or `git show <rev>:<file>` when
// REV is set, so the method can be proven on main (whose hash is the stored one) before it measures the branch.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { decomment } from "../../../../../../../../../F:/kipindi-vis/scripts/lib/decomment.mts";

const require = createRequire(process.cwd() + "/package.json");
const ts = require("typescript");
const REV = process.env.REV ?? "";
const read = (rel: string) => REV ? execFileSync("git", ["show", `${REV}:${rel}`], { encoding: "utf8", maxBuffer: 64 << 20 }) : readFileSync(rel, "utf8");
const lf = (s: string) => s.split("\r\n").join("\n");
const parse = (file: string, code: string) => ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
function fnText(file: string, code: string, name: string): string {
  let text = "";
  const walk = (n: any) => { if (!text && ts.isFunctionDeclaration(n) && n.name?.text === name) text = n.getText(); ts.forEachChild(n, walk); };
  walk(parse(file, code));
  return text;
}
const norm = (t: string) => lf(t).split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.length > 0).join("\n");
const NOTIFIERS = [
  ["src/lib/server/notification-service.ts", "notifyMarketCancelled"],
  ["src/lib/server/notification-service.ts", "notifyObjectionDecided"],
  ["src/lib/server/notification-service.ts", "notifyVerdictRecorded"],
  ["src/lib/server/email.ts", "marketCancelledRefundHtml"],
  ["src/lib/server/market-service.ts", "notifyVerdictRecordedForMarket"],
];
for (const [rel, name] of NOTIFIERS) {
  const t = fnText(rel, lf(decomment(read(rel))), name);
  console.log(`${name} ${createHash("sha256").update(norm(t)).digest("hex")} (${t.length} chars)`);
}
