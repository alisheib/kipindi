import { readFileSync, globSync } from 'node:fs';
const files = globSync('src/**/*.{ts,tsx}');
const blank = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
const re = /(?<![\w-])skeleton(?![\w-])/;
for (const f of files) {
  const t = blank(readFileSync(f, 'utf8'));
  const m = t.match(re);
  if (m) {
    const line = t.slice(0, m.index).split('\n').length;
    console.log(f.split(String.fromCharCode(92)).join('/'), line, JSON.stringify(t.split('\n')[line - 1].trim().slice(0, 160)));
  }
}
