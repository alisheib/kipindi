// C2: every dialog close in player src, by ANY glyph spelling — against R5-A's census, which finds only `<I.x`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const R = "F:/kipindi-rev/";
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk(R + "src");
const XPATH = /d="M6 6\s*[lL]\s*12 12\s*M18 6\s*[lL]\s*6 18"|d="M6 6 L18 18 M18 6 L6 18"/; // the ✕'s two strokes, any spelling
const census = readFileSync(R + "scripts/visual-pass-r5a.test.mts", "utf8");
for (const f of files) {
  const s = readFileSync(f, "utf8");
  const rel = f.slice(R.length);
  if (rel.endsWith("glyphs.tsx")) continue;
  const ix = [...s.matchAll(/<I\.x\b/g)].length;
  const svg = s.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => XPATH.test(l));
  if (!svg.length) continue;
  const dialog = /role="(?:alert)?dialog"|<(?:Modal|ConfirmModal)[\s>]/.test(s);
  console.log(`${rel}: hand-drawn svg ✕ at line(s) ${svg.map(([n]) => n).join(",")}; dialog host: ${dialog}; <I.x sites the census sees: ${ix}; named in the census table: ${census.includes(`"${rel}"`)}`);
}
// The needle drawer's geometry, read from its classes (this repo's scale: 4 = 20px, 5 = 24px).
const nd = readFileSync(R + "src/components/layout/needle-drawer.tsx", "utf8");
const title = /<p className="(font-display text-\[15px\] font-bold text-text leading-tight)">\{t\("The Needle"/.exec(nd)?.[1];
const box = /className="(shrink-0 grid h-\[40px\] w-\[40px\][^"]*)"/.exec(nd)?.[1];
const row = /<div className="(flex items-start gap-2 mb-4)">/.exec(nd)?.[1];
const pad = /"(left-0 right-0 bottom-0 rounded-t-modal px-4 pt-4)"/.exec(nd)?.[1], padSm = /(sm:p-5)/.exec(nd)?.[1];
const capCentre = 0.6 * 15; // Sora caps centre 0.6em down a 1.25 line (modal.tsx's own CloseX note)
console.log(`\nneedle drawer: header row "${row}"; title "${title}" -> caps centre ${capCentre}px down the row; the ✕ box "${box}" centres 20px down: ${20 - capCentre}px below the caps`);
console.log(`needle drawer: panel "${pad}" + "${padSm}" -> the ✕ box stands 20px (phone) / 24px (>=640) inside the panel's right edge (convention: 16); box 40px rounded-lg (CloseX: 48px h-8 w-8, rounded-md)`);
const css = readFileSync(R + "src/styles/chat/chat-styles.css", "utf8");
const close = /\.cm-close \{([^}]*)\}/.exec(css)?.[1].replace(/\s+/g, " ");
const hdr = /\.cm-header \{([^}]*)\}/.exec(css)?.[1].replace(/\s+/g, " ");
console.log(`chat panel: .cm-header {${hdr.slice(0, 100)}…}\n            .cm-close {${close.slice(0, 70)}…} — a 32px box centred on the 36px mark and the two-line title block`);
