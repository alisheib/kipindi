const fs = require('fs'), path = require('path');
process.chdir('F:/kipindi-r4i');
const touched = require('child_process').execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
touched.push('scripts/visual-pass-r4i.test.mts');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    if (fs.statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); }
    else if (/\.(mts|mjs|cjs|ts|js|json)$/.test(e)) files.push(p.split(path.sep).join('/'));
  }
})('scripts');
const generic = new Set(['page.tsx', 'globals.css', 'package.json']);
const needles = touched.filter((t) => t.startsWith('src/') || t === 'package.json').map((t) => [t, t.replace(/^src\//, ''), path.basename(t)]);
const readers = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const [full, rel, base] of needles) {
    const hit = s.includes(full) || (rel !== full && s.includes(rel)) || (!generic.has(base) && s.includes(base));
    if (hit) { if (!readers.has(f)) readers.set(f, new Set()); readers.get(f).add(full); }
  }
}
// A reader that is a lib/anchor file: find the test files that import it.
const importers = (f) => files.filter((g) => g !== f && fs.readFileSync(g, 'utf8').includes(path.basename(f).replace(/\.(mts|mjs|cjs|ts|js)$/, '')));
const names = new Map();
const scriptsFor = (f) => Object.entries(pkg).filter(([k, v]) => k.startsWith('test:') && k !== 'test:all' && (v.includes(f) || v.includes(' ' + path.basename(f)) || v.includes('/' + path.basename(f)))).map(([k]) => k);
for (const [f, set] of readers) {
  let ks = scriptsFor(f);
  if (ks.length === 0) for (const g of importers(f)) ks = ks.concat(scriptsFor(g));
  for (const k of ks) { if (!names.has(k)) names.set(k, new Set()); for (const x of set) names.get(k).add(x); }
  if (ks.length === 0) console.error('NO SCRIPT:', f, [...set].join(','));
}
for (const [k, set] of [...names].sort()) console.log(k.padEnd(40), [...set].map((x) => path.basename(x)).join(','));
