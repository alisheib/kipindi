// Every element whose own children include two or more `btn-lg` controls: its class list and its gap.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r6c/scripts/lib/decomment.mts";
const R = "F:/kipindi-r6c/";
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk(R + "src");
const OUT = /src\/(?:app\/admin|components\/admin)\//;
for (const file of files) {
  if (OUT.test(file)) continue;
  const src = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  // a stack of open elements; for each, the count of btn-lg controls among its DIRECT children
  const stack: Array<{ tag: string; cls: string; line: number; lg: number }> = [];
  const re = /<([a-zA-Z][\w.]*)\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>|<\/([a-zA-Z][\w.]*)>/g;
  for (const m of src.matchAll(re)) {
    if (m[4]) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === m[4]) {
        const el = stack[i];
        if (el.lg >= 2) console.log(`${file.slice(R.length)}:${el.line}  lg=${el.lg}  gap=${(/(?:^|\s)((?:sm:)?gap(?:-[xy])?-[\w.[\]]+)/g.exec(el.cls) ?? [])[1] ?? "none"}  <${el.tag} "${el.cls.slice(0, 90)}">`);
        stack.length = i; break;
      }
      continue;
    }
    const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(m[2] ?? "")?.[1] ?? /className=\{`([^`]*)`\}/.exec(m[2] ?? "")?.[1] ?? "";
    const isLg = /\bbtn-lg\b/.test(m[2] ?? "") || /\bsize="lg"/.test(m[2] ?? "");
    if (isLg && stack.length) stack[stack.length - 1].lg++;
    if (m[3] !== "/") stack.push({ tag: m[1], cls, line: src.slice(0, m.index).split("\n").length, lg: 0 });
  }
}
