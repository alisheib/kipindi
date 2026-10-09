// The test:/red: scripts whose files mention any of the given needles (paths of files edited after the batch began).
// Usage: node rerun-map.cjs needle1 needle2 ...
const fs = require('fs'), path = require('path');
process.chdir('F:/kipindi-r4i');
const needles = process.argv.slice(2);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    if (fs.statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); }
    else if (/\.(mts|mjs|cjs|ts|js|json)$/.test(e)) files.push(p.split(path.sep).join('/'));
  }
})('scripts');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const scriptsFor = (f) => Object.entries(pkg).filter(([k, v]) => (k.startsWith('test:') || k.startsWith('red:')) && k !== 'test:all'
  && new RegExp(`(^|[\\s/])${esc(path.basename(f))}(\\s|$)`).test(v)).map(([k]) => k);
const hits = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const which = needles.filter((n) => s.includes(n));
  if (!which.length) continue;
  let ks = scriptsFor(f);
  if (!ks.length) {
    // a lib/anchor file: the suites whose test file imports it
    for (const g of files) if (g !== f && /\.(mts|mjs|cjs|ts|js)$/.test(g) && fs.readFileSync(g, 'utf8').includes(path.basename(f).replace(/\.(mts|mjs|cjs|ts|js)$/, ''))) ks = ks.concat(scriptsFor(g));
  }
  for (const k of ks) { if (!hits.has(k)) hits.set(k, new Set()); which.forEach((w) => hits.get(k).add(w)); }
}
for (const [k, s] of [...hits].sort()) console.log(k.padEnd(40), [...s].join(','));
