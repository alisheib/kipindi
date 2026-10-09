// Re-sign the one eyebrow-roles key R5-I moved: the bell's "Clear all" (its className became a template literal with the
// journey's hover). Same signature as eyebrow-sweep.mjs's `sig`: the line, " ↵ ", the next non-empty line, cut at 170.
const fs = require("fs");
const ROOT = "F:/kipindi-r5i/";
const lines = fs.readFileSync(ROOT + "src/components/layout/notifications-panel.tsx", "utf8").split("\n");
const i = lines.findIndex((l) => l.includes("text-text-subtle ${clearAllHover} hover:bg-bg-overlay"));
if (i < 0) { console.log("site not found"); process.exit(1); }
let tail = "";
for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) { const t = lines[j].replace(/\s+/g, " ").trim(); if (t) { tail = t; break; } }
const sig = (lines[i].replace(/\s+/g, " ").trim() + " ↵ " + tail).slice(0, 170);
const newKey = `components/layout/notifications-panel.tsx :: ${sig}`;
const p = ROOT + "scripts/design-gate/eyebrow-roles.mjs";
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");
const oldLine = s.split("\n").find((l) => l.includes('notifications-panel.tsx :: className=\\"h-7 px-1.5 rounded-md font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300'));
if (!oldLine) { console.log("old key not found"); process.exit(1); }
const newLine = `  ${JSON.stringify(newKey)}, "CONTROL_LABEL"], // R5-I (2026-10-09): the journey's "Clear all" hover (danger) — same element, role unchanged`;
const fixed = "  [" + newLine.trimStart();
s = s.replace(oldLine, fixed);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("re-signed:\n  old:", oldLine.trim().slice(0, 140), "\n  new:", fixed.trim().slice(0, 200));
