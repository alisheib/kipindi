// Right-aligned tracked labels: an element whose class list tracks its letters (`eyebrow`, `tracking-[…em]`,
// `tracking-wide*`) and that is right-aligned — by its own `text-right` or by the nearest enclosing element's
// (`text-right`, `sm:text-right`, `items-end` column) — and whether it carries `kp-track-end`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r6c/scripts/lib/decomment.mts";
const R = "F:/kipindi-r6c/";
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk(R + "src");
const OUT = /src\/(?:app\/admin|components\/admin)\//;
const TRACKED = /(?<![\w-])(?:eyebrow|tracking-\[0?\.\d+em\]|tracking-wide|tracking-wider|tracking-widest)(?![\w-])/;
const RIGHT = /(?<![\w-])(?:[a-z]+:)?text-right(?![\w-])/;
for (const file of files) {
  if (OUT.test(file)) continue;
  const src = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  const tags = [...src.matchAll(/<([a-zA-Z][\w.]*)\b([^<>]*?)(\/?)>|<\/([a-zA-Z][\w.]*)>/g)];
  const stack: Array<{ tag: string; cls: string; at: number }> = [];
  for (const m of tags) {
    if (m[4]) { // close
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === m[4]) { stack.length = i; break; }
      continue;
    }
    const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/.exec(m[2] ?? "");
    const c = cls ? (cls[1] ?? cls[2] ?? cls[3] ?? "") : "";
    if (c && TRACKED.test(c)) {
      const self = RIGHT.test(c);
      const parent = stack.length ? stack[stack.length - 1] : null;
      const viaParent = !!parent && RIGHT.test(parent.cls);
      if ((self || viaParent) && !/\bkp-track-end\b/.test(c)) {
        const line = src.slice(0, m.index).split("\n").length;
        console.log(`${file.slice(R.length)}:${line}  ${self ? "self" : "parent"}-right  <${m[1]} class="${c.slice(0, 110)}">`);
      }
    }
    if (m[3] !== "/") stack.push({ tag: m[1], cls: c, at: m.index ?? 0 });
  }
}
