// Re-sign the two eyebrow-roles entries for /results' flag with the sweep's own signature (line + " ↵ " + next, ≤170).
const fs = require("fs");
const R = "F:/kipindi-vis/";
const sig = (lines, i) => {
  const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
  let tail = "";
  for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
    const t = (lines[j] ?? "").replace(/\s+/g, " ").trim();
    if (t) { tail = t; break; }
  }
  return (head + " ↵ " + tail).slice(0, 170);
};
const NEEDLE = 'className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-micro uppercase tracking-[0.16em] font-bold';
const reg = R + "scripts/design-gate/eyebrow-roles.mjs";
let regText = fs.readFileSync(reg, "utf8");
for (const rel of ["app/results/page.tsx", "app/results/loading.tsx"]) {
  const lines = fs.readFileSync(R + "src/" + rel, "utf8").split(/\r?\n/);
  const i = lines.findIndex((l) => l.includes(NEEDLE));
  if (i < 0) throw new Error("not found in " + rel);
  const key = `${rel} :: ${sig(lines, i)}`;
  // The registry's current entry for this file's flag (re-signed earlier with the old 170-char cut).
  const re = new RegExp(`\\["${rel.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")} :: <span className=\\\\"ml-auto inline-flex items-center gap-1\\.5 whitespace-nowrap[^\\n]*?", (\\[?"STATUS_CHIP"[^\\]]*\\]?|"STATUS_CHIP")`);
  const m = re.exec(regText);
  if (!m) throw new Error("registry entry not found for " + rel);
  const replacement = `[${JSON.stringify(key)}, ${m[1]}`;
  regText = regText.replace(m[0], () => replacement);
  console.log("re-signed", rel, "→", key.slice(0, 60) + "…");
}
fs.writeFileSync(reg, regText);
