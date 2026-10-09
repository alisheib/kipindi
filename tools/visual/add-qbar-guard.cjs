// density-contract: the filter row's kp- hook is its own (cwd = F:/kipindi-vis).
const fs = require("fs");
const p = "scripts/density-contract.test.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const once = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor ×${n}: ${a.slice(0, 80)}`);
  s = s.replace(a, b);
};
once(`import { decomment } from "./lib/decomment.mts";`,
  `import { decomment, decommentCss } from "./lib/decomment.mts";`);
once("if (PROVE_RED) {\n", `// ⛔ THE FILTER ROW'S HOOK IS ITS OWN (2026-10-08, the visual pass's round 3, tile 326). G1 hung the divider rule on a
// \`kp-qrow\` class added to QUERY_BAR_ROW2_CLASS — and \`.kp-qrow\` is the landing board's question row (a grid with
// areas, 16px padding, a bottom border), which beat the row's own utilities: every filter bar was laid out as a board
// row, and /results at sw 390 dropped "Vichujio" to a line of its own over a 69px hole. The row's kp- hook may be styled
// in globals.css ONLY by the divider's \`:has(.kp-qdiv)\` rule, and no other component may wear it.
{
  const qbRel = "src/components/ui/query-bar.tsx";
  const row2Of = (src: string) => (src.match(/export const QUERY_BAR_ROW2_CLASS = "([^"]+)";/) ?? [])[1] ?? "";
  const hookDefects = (row2: string, css: string, code: { rel: string; src: string }[]) => {
    const hooks = row2.split(/\\s+/).filter((c) => c.startsWith("kp-"));
    const bare = decommentCss(css);
    const out: string[] = [];
    if (hooks.length !== 1) out.push(\`\${hooks.length} kp- hooks on the row (want 1)\`);
    for (const h of hooks) {
      const styled = bare.match(new RegExp(\`\\\\.\${h}(?![\\\\w-])[^{,]*\`, "g")) ?? [];
      const foreign = styled.filter((sel) => !/^\\.[\\w-]+:has\\(\\.kp-qdiv\\)\\s*$/.test(sel));
      if (foreign.length) out.push(\`\${h} styled by \${foreign.slice(0, 3).join(" | ")}\`);
      const users = code.filter((f) => f.rel !== qbRel && new RegExp(\`["'\\\\s\\\`]\${h}["'\\\\s\\\`]\`).test(f.src)).map((f) => f.rel);
      if (users.length) out.push(\`\${h} also worn by \${users.slice(0, 3).join(", ")}\`);
    }
    return out;
  };
  const row2 = row2Of(read(qbRel));
  const real = hookDefects(row2, globalsCss, codeFiles);
  // The control: the same measure over a copy with the old collision put back must report it.
  const planted = hookDefects(row2.replace(/^kp-[\\w-]+/, "kp-qrow"), globalsCss.split(".kp-qbar-row:has(").join(".kp-qrow:has("), codeFiles);
  ok("4q · the filter row's kp- hook is its own — globals.css styles it only through the divider's :has rule, and no other component wears it (round 3, tile 326); the old kp-qrow collision, put back in a copy, is reported",
    row2 !== "" && real.length === 0 && planted.some((d) => d.includes("kp-qrow styled by")),
    JSON.stringify({ row2, real, planted }));
}

if (PROVE_RED) {
`);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
