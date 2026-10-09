// Which `test:*` suites read a file this change touches — strict: the file's repo path, its path under src/ (an "@/…"
// import or a relative path), or its import specifier without the extension. Prints one script name per line with the
// touched files it reads. Static suites only are RUN later; this lists them all.
const fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
process.chdir('F:/kipindi-r4i');
const touched = execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n')
  .concat(execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).trim().split('\n'))
  .filter((f) => f && f.startsWith('src/'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    if (fs.statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); }
    else if (/\.(mts|mjs|cjs|ts|js|json)$/.test(e)) files.push(p.split(path.sep).join('/'));
  }
})('scripts');
const needles = touched.map((t) => {
  const rel = t.replace(/^src\//, '');
  const noExt = rel.replace(/\.(tsx?|mts)$/, '');
  return [t, [t, rel, `@/${noExt}"`, `@/${noExt}'`, `/${noExt}.`, `/${noExt}"`, `/${noExt}'`]];
});
const readers = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const [full, keys] of needles) {
    if (keys.some((k) => s.includes(k))) { if (!readers.has(f)) readers.set(f, new Set()); readers.get(f).add(full); }
  }
}
const scriptsFor = (f) => Object.entries(pkg).filter(([k, v]) => (k.startsWith('test:') || k.startsWith('red:')) && k !== 'test:all'
  && new RegExp(`(^|[\\s/])${path.basename(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(v)).map(([k]) => k);
// A reader that is a lib/anchor file: the suites whose test file imports it.
const importers = (f) => files.filter((g) => g !== f && /\.(mts|mjs|cjs|ts|js)$/.test(g) && fs.readFileSync(g, 'utf8').includes(path.basename(f)));
const names = new Map();
const orphans = [];
for (const [f, set] of readers) {
  let ks = scriptsFor(f);
  if (ks.length === 0) for (const g of importers(f)) ks = ks.concat(scriptsFor(g));
  for (const k of ks) { if (!names.has(k)) names.set(k, new Set()); for (const x of set) names.get(k).add(x); }
  if (ks.length === 0) orphans.push(`${f} :: ${[...set].map((x) => path.basename(x)).join(',')}`);
}
for (const [k, set] of [...names].sort()) console.log(k.padEnd(44), [...set].map((x) => path.basename(x)).join(','));
console.error('NO SCRIPT:\n' + orphans.join('\n'));
