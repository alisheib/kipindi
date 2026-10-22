// Classify a list of npm scripts: node classify.mjs <tree> <list>
// Prints one line per script: kind (writer|heavy|light) + its command; heavy = boots a DB, a server, a browser or a build.
import { readFileSync } from "node:fs";
const [tree, list] = process.argv.slice(2);
const pkg = JSON.parse(readFileSync(`${tree}/package.json`, "utf8")).scripts;
const names = readFileSync(list, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const fileOf = (cmd) => /scripts\/[^\s"']+\.(?:mjs|mts|ts|js|cjs)/.exec(cmd ?? "")?.[0];
const out = { writer: [], heavy: [], light: [], missing: [] };
for (const n of names) {
  const cmd = pkg[n];
  if (!cmd) { out.missing.push(n); continue; }
  const f = fileOf(cmd);
  let src = "";
  try { src = f ? readFileSync(`${tree}/${f}`, "utf8") : ""; } catch { /* none */ }
  const heavy = /db-scratch|embedded-postgres|KP_SCRATCH|pgscratch|DATABASE_URL|chromium|playwright|next (?:build|dev|start)|BOTH_STORES|both stores/i.test(cmd + "\n" + src.slice(0, 20000));
  const writes = n.startsWith("red:") || (/writeFileSync\(|copyFileSync\(|renameSync\(/.test(src) && /src\//.test(src) && /restore|original|backup|finally/i.test(src));
  const kind = writes ? "writer" : heavy ? "heavy" : "light";
  out[kind].push(n);
  console.log(`${kind.padEnd(6)} ${n} :: ${cmd.slice(0, 140)}`);
}
console.log(`\nwriter ${out.writer.length} · heavy ${out.heavy.length} · light ${out.light.length} · missing ${out.missing.length} ${out.missing.join(" ")}`);
