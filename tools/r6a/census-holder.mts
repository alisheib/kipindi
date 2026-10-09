// R6-A · replica of test:house-bot-holder-lifecycle §2's script census (read-only): which scripts/ files write an account
// fact, on the working tree and at HEAD (blobs via git), so a red can be told apart as R6-A's or pre-existing.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { decomment } from "file:///F:/kipindi-r6a/scripts/lib/decomment.mts";
const ROOT = "F:/kipindi-r6a";
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(m?ts|mjs|cjs|js)$/.test(p) ? [p] : []; });
const SQL_FIELD = /"passwordHash"|'passwordHash'|passwordHash\s*=/;
const WRITTEN_FIELDS = ["passwordHash", "role", "status", "phoneE164", "twoFactorEnabled", "email", "closedAt"];
const USER_WRITE = /db\.user\.update\(/;
const OTHER = [/db\.responsible\.upsert\(/, /queue\.push\(r\);/, /db\.wallet\.update\([^)]*freezeReasons/];
const writes = (code: string) => {
  const lines = code.split(/\r?\n/);
  return lines.some((line, i) => {
    const stmt = lines.slice(i, i + 8).join("\n");
    if (USER_WRITE.test(line) && WRITTEN_FIELDS.some((f) => new RegExp(`\\b${f}\\b`).test(stmt.split(/\)\s*;/)[0] ?? stmt))) return true;
    return OTHER.some((re) => re.test(line));
  });
};
const member = (code: string) => SQL_FIELD.test(code) || writes(code);
const files = walk(join(ROOT, "scripts")).map((p) => relative(ROOT, p).split("\\").join("/"));
const work = files.filter((f) => member(decomment(readFileSync(join(ROOT, f), "utf8"))));
const headList = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "scripts"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter((f) => /\.(m?ts|mjs|cjs|js)$/.test(f));
const head = headList.filter((f) => { try { return member(decomment(execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }))); } catch { return false; } });
console.log(`working tree: ${work.length} · HEAD: ${head.length}`);
console.log("only in the working tree:", work.filter((f) => !head.includes(f)).join(", ") || "none");
console.log("only at HEAD:", head.filter((f) => !work.includes(f)).join(", ") || "none");
console.log("HEAD members:", head.join(" · "));
