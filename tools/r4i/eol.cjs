const { execSync } = require('child_process');
const fs = require('fs');
process.chdir('F:/kipindi-r4i');
const files = execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n').concat(execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).trim().split('\n')).filter(Boolean);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length;
  let head = '';
  try { const h = execSync(`git show HEAD:"${f}"`, { encoding: 'utf8', maxBuffer: 1e8 }); const c = (h.match(/\r\n/g) || []).length, l = (h.match(/\n/g) || []).length; head = c === l ? 'CRLF' : c === 0 ? 'LF' : `MIXED ${c}/${l}`; } catch { head = 'new'; }
  const now = crlf === lf ? 'CRLF' : crlf === 0 ? 'LF' : `MIXED ${crlf}/${lf}`;
  if (now !== head) console.log(f, 'now', now, 'head', head);
}
console.log('checked', files.length);
