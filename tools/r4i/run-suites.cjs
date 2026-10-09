// Runs npm scripts ONE AT A TIME from F:\kipindi-r4i, logging each exit code, duration and output.
// Usage: node run-suites.cjs <outdir> name1 name2 ...   (or --from-map <suite-map2.txt> plus extra names)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = 'F:/kipindi-r4i';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
let names = process.argv.slice(3);
const at = names.indexOf('--from-map');
if (at >= 0) {
  const map = fs.readFileSync(names[at + 1], 'utf8').split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean);
  const twins = new Set(['red:market-columns', 'red:wallet-reach', 'red:journey-account', 'red:journey-tickets', 'red:pending-bet', 'red:rg-doors', 'red:simple-journey-flag', 'red:timer-date']);
  names = names.slice(0, at).concat(names.slice(at + 2)).concat(map.filter((k) => k.startsWith('test:') || twins.has(k)));
}
names = [...new Set(names)];
const summary = path.join(out, 'summary.txt');
fs.writeFileSync(summary, `# ${new Date().toISOString()} · ${names.length} scripts\n`);
for (const n of names) {
  const t0 = Date.now();
  const r = spawnSync('npm', ['run', '-s', n], { cwd: ROOT, encoding: 'utf8', shell: true, timeout: 900_000, maxBuffer: 1 << 28, env: { ...process.env, CI: '1' } });
  const secs = Math.round((Date.now() - t0) / 1000);
  const code = r.error && r.error.code === 'ETIMEDOUT' ? 'TIMEOUT' : r.status;
  const text = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(path.join(out, n.replace(/[:/]/g, '_') + '.log'), text);
  const tail = text.trim().split('\n').slice(-1)[0] || '';
  fs.appendFileSync(summary, `${n} exit=${code} ${secs}s :: ${tail.slice(0, 160)}\n`);
}
fs.appendFileSync(summary, 'DONE\n');
