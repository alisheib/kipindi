import { readFileSync, writeFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const s = readFileSync(f, 'utf8');
  const out = s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  writeFileSync(f, out);
  console.log(f, (out.match(/\r\n/g) || []).length, 'CRLF lines');
}
