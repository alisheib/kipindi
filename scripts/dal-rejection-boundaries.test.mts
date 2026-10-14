/** Execute the shipped defensive awaits against synchronous and asynchronous DAL outcomes. No DB/HTTP writes. */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");
const sites = [
  { file: "src/app/auth/session-ended/route.ts", call: "db.user.findById(payload.userId)", fallback: null },
  { file: "src/app/api/admin/transactions/export/route.ts", call: "db.user.findById(session.userId)", fallback: null },
  { file: "src/lib/server/push-service.ts", call: "db.pushSub.deleteByEndpoint(s.endpoint)", fallback: undefined },
];
let failures = 0, checks = 0;
const ok = (label: string, pass: boolean) => { checks++; if (!pass) failures++; console.log(`${pass ? "PASS" : "FAIL"} ${label}`); };
function awaits(source: string, call: string) {
  const file = ts.createSourceFile("boundary.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: ts.AwaitExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isAwaitExpression(node) && node.expression.getText(file).includes(call)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  // An enclosing await Promise.all contains the inner source text too; only the nearest defensive await is a site.
  const nearest = found.filter(parent => !found.some(child => child !== parent && child.pos >= parent.pos && child.end <= parent.end));
  if (nearest.length !== 1) throw new Error(`Ambiguous actual boundary: ${call}`);
  return nearest[0].expression.getText(file);
}
async function verdict(source: string, site: typeof sites[number]) {
  const expression = awaits(source, site.call);
  const js = ts.transpileModule(`const run = async () => (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const value = { id: "synthetic-boundary", status: "ACTIVE" };
  const out: Record<string, boolean> = {};
  for (const mode of ["sync-value", "sync-null", "async-value", "async-null", "sync-throw", "async-reject"] as const) {
    const lookup = () => {
      if (mode === "sync-throw") throw new Error("Controlled synchronous DAL read failure");
      if (mode === "async-reject") return Promise.reject(new Error("Controlled asynchronous DAL read failure"));
      const result = mode.endsWith("null") ? null : value;
      return mode.startsWith("async") ? Promise.resolve(result) : result;
    };
    const db = { user: { findById: lookup }, pushSub: { deleteByEndpoint: lookup } };
    const run = new Function("db", "payload", "session", "s", `${js}\nreturn run;`)(db, { userId: "synthetic" }, { userId: "synthetic" }, { endpoint: "https://example.invalid/synthetic" });
    try {
      const result = await run();
      out[mode] = Object.is(result, mode === "sync-throw" || mode === "async-reject" ? site.fallback : mode.endsWith("null") ? null : value);
    } catch { out[mode] = false; }
  }
  return out;
}
const files: string[] = [];
function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path); else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
}
walk(join(ROOT, "src"));
const unsafe: string[] = [];
for (const path of files) {
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "catch"
      && ts.isCallExpression(node.expression.expression) && /^db\./.test(node.expression.expression.expression.getText(file))) unsafe.push(path);
    ts.forEachChild(node, visit);
  };
  visit(file);
}
const inventory = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"], { cwd: ROOT, encoding: "utf8" })
  .trim().split(/\r?\n/).filter(path => /\.tsx?$/.test(path));
const scanned = new Set(files.map(path => relative(ROOT, path).replace(/\\/g, "/")));
ok(`complete AST census rejects bare DAL .catch (${files.length} source files)`, inventory.length === scanned.size
  && inventory.every(path => scanned.has(path)) && sites.every(site => scanned.has(site.file)) && unsafe.length === 0);
for (const site of sites) {
  const source = readFileSync(join(ROOT, site.file), "utf8");
  const rows = await verdict(source, site);
  for (const [mode, pass] of Object.entries(rows)) ok(`${site.file}: ${mode}`, pass);
  if (!process.argv.includes("--prove-red")) continue;
  const deferred = `Promise.resolve().then(() => ${site.call})`;
  if (source.split(deferred).length !== 2) throw new Error(`Stale boundary plant ${site.file}`);
  for (const [label, replacement, expected] of [
    ["bare non-Promise catch", site.call, "sync-value"],
    ["eager resolve misses synchronous throw", `Promise.resolve(${site.call})`, "sync-throw"],
  ]) {
    const plant = await verdict(source.replace(deferred, replacement), site);
    ok(`PLANT ${site.file}: ${label} fails its real outcome`, plant[expected] === false);
  }
}
console.log(`${checks} checks; ${failures} failures`);
if (failures) process.exitCode = 1;
