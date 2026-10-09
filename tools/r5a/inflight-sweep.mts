// Sweep every <Modal …> / <ConfirmModal …> opening tag in src: its ✕ (showClose), its close guards and its in-flight props.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r5a/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5a/src";
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk(ROOT);

function openingTag(src: string, at: number): string {
  let depth = 0, i = at, q: string | null = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
    if (depth > 0 && (c === '"' || c === "'" || c === "`")) { q = c; continue; }
    if (depth === 0 && c === '"') { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) break;
  }
  return src.slice(at, i + 1);
}
const prop = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}(=)?`).exec(tag);
  if (!m) return null;
  if (!m[1]) return "true";
  let i = m.index + m[0].length;
  if (tag[i] === '"') return tag.slice(i, tag.indexOf('"', i + 1) + 1);
  let depth = 0, j = i;
  for (; j < tag.length; j++) { if (tag[j] === "{") depth++; else if (tag[j] === "}" && --depth === 0) break; }
  return tag.slice(i, j + 1).replace(/\s+/g, " ");
};
for (const f of files) {
  const src = decomment(readFileSync(f, "utf8").replace(/\r\n/g, "\n"));
  const re = /<(Modal|ConfirmModal)(?=[\s>])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const tag = openingTag(src, m.index);
    const line = src.slice(0, m.index).split("\n").length;
    const rel = f.replace("F:/kipindi-r5a/", "");
    const busyState = /\b(pending|loading|busy|inFlight|submitting|saving|running|isPending|working)\b/.test(src);
    console.log(`${rel}:${line} <${m[1]}> showClose=${prop(tag, "showClose")} onClose=${prop(tag, "onClose")} closeOnScrim=${prop(tag, "closeOnScrim")} closeOnEsc=${prop(tag, "closeOnEsc")} ariaBusy=${prop(tag, "ariaBusy")} loading=${prop(tag, "loading")} confirmHeld=${prop(tag, "confirmHeld")} fileHasBusyWord=${busyState}`);
  }
}
