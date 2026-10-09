// TEMPORARY (R5-B) — re-measures `PLAYER_NOTIFIER_HASHES` exactly as house-bot-reports-cases.mts §0.198.2 does
// (decomment(read) → lf → the function declaration's text → trailing spaces and blank lines dropped → sha256), first on the
// committed tree (git show HEAD:…) to prove the replication reproduces the pinned values, then on the working tree.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import { decomment } from "file:///F:/kipindi-r5b/scripts/lib/decomment.mts";

const NOTIFIERS = [
  ["src/lib/server/notification-service.ts", "notifyMarketCancelled"],
  ["src/lib/server/notification-service.ts", "notifyObjectionDecided"],
  ["src/lib/server/notification-service.ts", "notifyVerdictRecorded"],
  ["src/lib/server/email.ts", "marketCancelledRefundHtml"],
  ["src/lib/server/market-service.ts", "notifyVerdictRecordedForMarket"],
] as const;
const PINNED: Record<string, string> = {
  notifyMarketCancelled: "303f06a9fa810c98f8e5864a2977161c8b9f8097f93d77c7ba7e843d3e0539f9",
  notifyObjectionDecided: "72d9f9fe6b0a919bde881b47fc2f7863b54d55b1f9c38a2239fd23c2e219e6a2",
  notifyVerdictRecorded: "42c58491831e558eb3e63b2c2bb1a17ad7637cf41a0bcb1c9b342f28a1c0b222",
  marketCancelledRefundHtml: "9459244bfe07cd3e2166c2c9d56efb330290f00b133ac4a052e0d3159c8a1c9b",
  notifyVerdictRecordedForMarket: "e9589970eac191406dcd3963c0742e795e3374c11d3f1936c8808b3ad63596a8",
};
const lf = (code: string) => code.split("\r\n").join("\n");
const declText = (file: string, code: string, name: string) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let text = "";
  const go = (n: ts.Node) => { if (!text && ts.isFunctionDeclaration(n) && n.name?.text === name) text = n.getText(); ts.forEachChild(n, go); };
  go(sf);
  return text;
};
const norm = (t: string) => lf(t).split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.length > 0).join("\n");
const hashOf = (file: string, raw: string, name: string) => createHash("sha256").update(norm(declText(file, lf(decomment(raw)), name))).digest("hex");
for (const [file, name] of NOTIFIERS) {
  const head = execSync(`git show HEAD:${file}`, { encoding: "utf8", maxBuffer: 64 << 20 });
  const now = readFileSync(file, "utf8");
  const h0 = hashOf(file, head, name), h1 = hashOf(file, now, name);
  console.log(`${name}: HEAD ${h0 === PINNED[name] ? "= pinned" : `≠ pinned (${h0})`} · now ${h1 === h0 ? "unchanged" : h1}`);
}
