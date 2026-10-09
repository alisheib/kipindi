// Which script files quote a source line this change removed or rewrote? A red harness whose anchor is such a line can
// no longer plant ("anchor not found"). Every removed `-` line of src/ (trimmed, ≥ 24 chars, not a comment) is searched
// for in every file under scripts/, with JS string escapes undone loosely (\` and \$ and \\).
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
process.chdir('F:/kipindi-r4i');
const diff = execSync('git diff -U0 -- src', { encoding: 'utf8', maxBuffer: 1 << 28 });
let file = '';
const removed = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('--- a/')) file = line.slice(6);
  else if (line.startsWith('-') && !line.startsWith('---')) {
    const t = line.slice(1).trim();
    if (t.length >= 24 && !/^(\/\/|\*|\/\*|\{\/\*)/.test(t)) removed.push({ file, text: t });
  }
}
const scripts = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    if (fs.statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); }
    else if (/\.(mts|mjs|cjs|ts|js|json)$/.test(e)) scripts.push(p.split(path.sep).join('/'));
  }
})('scripts');
const unescape = (s) => s.replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\').replace(/\\"/g, '"');
const hits = [];
for (const f of scripts) {
  const raw = fs.readFileSync(f, 'utf8');
  const s = unescape(raw);
  for (const r of removed) {
    // A shorter probe too: the line's longest run without a quote is what an anchor usually holds.
    if (s.includes(r.text) || raw.includes(r.text)) hits.push(`${f} quotes ${r.file}: ${r.text.slice(0, 110)}`);
  }
}
console.log([...new Set(hits)].join('\n') || 'no script quotes a removed line');
console.log(`(${removed.length} removed lines searched in ${scripts.length} script files)`);
