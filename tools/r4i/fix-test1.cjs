const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/visual-pass-r4i.test.mts", [
  [`/** Sora is not in the repo's font folder: Inter Bold scaled by the two faces' average advance (Sora Bold 0.517em,
 *  Inter Bold 0.492em — next's capsize metrics), plus 5% for safety. */
const soraW = (s: string, size: number) => widthMixed(interBold, s, size) * (0.517 / 0.492) * 1.05;`,
   `/** Sora is not in the repo's font folder: Inter Bold scaled by the two faces' average advance (Sora Bold 0.517em,
 *  Inter Bold 0.492em — next's capsize metrics), less the heading's −0.02em tracking. Calibrated in §2 against the tiles:
 *  it must not read a measured heading narrower than its ink. */
const soraW = (s: string, size: number, track = 0) => widthMixed(interBold, s, size) * (0.517 / 0.492) + track * size * ([...s].length - 1);`],
  [`          const w = sf.face === "sora" ? soraW(run, sf.size) : widthMixed(inter, run, sf.size);`,
   `          const w = sf.face === "sora" ? soraW(run, sf.size, -0.02) : widthMixed(inter, run, sf.size);`],
  [`  ok(\`2.8 · every kept run fits its narrowest line, in every language (widest: \${widest.what})\`, over.length === 0, over.join(" | "));`,
   `  // The heading model's calibration: "Karibu tena" and "Welcome back" (Sora 28px bold, tracked −0.02em) ink 158px and 208px
  // on tiles 113 and 116 — their advances are 2–3px wider than their ink. The model must not read them narrower.
  const cal = [soraW("Karibu tena", 28, -0.02), soraW("Welcome back", 28, -0.02)];
  ok(\`2.7′ · the heading model is calibrated on the tiles: "Karibu tena" \${cal[0].toFixed(0)}px (ink 158), "Welcome back" \${cal[1].toFixed(0)}px (ink 208) — never narrower than the ink, within 6%\`,
    cal[0] >= 158 && cal[0] <= 158 * 1.06 && cal[1] >= 208 && cal[1] <= 208 * 1.06);
  ok(\`2.8 · every kept run fits its narrowest line, in every language (widest: \${widest.what})\`, over.length === 0, over.join(" | "));`],
  ["  const sizeOf = (rung: string) => Number(new RegExp(`\"${rung}\":\\\\s*\\\\[\"([0-9.]+)px\"`).exec(TW)?.[1] ?? NaN);",
   "  const sizeOf = (rung: string) => Number(new RegExp(`\"?${rung}\"?:\\\\s*\\\\[\"([0-9.]+)px\"`).exec(TW)?.[1] ?? NaN);"],
  ["  const forms = RG.match(/<form action=\\{(coolOffAction|selfExcludeAction)\\} className=\"flex flex-wrap items-end gap-2\">\\s*<div style=\\{\\{ width: periodFieldPx \\}\\}>/g) ?? [];",
   "  const forms = RG.match(/<form action=\\{(coolOffAction|selfExcludeAction)\\} className=\"flex flex-wrap items-end gap-2\">\\s*(?:\\{\\}\\s*)?<div style=\\{\\{ width: periodFieldPx \\}\\}>/g) ?? [];"],
  ["  const oneForm = RG.replace(\"<form action={coolOffAction} className=\\\"flex flex-wrap items-end gap-2\\\">\\n          <div style={{ width: periodFieldPx }}>\", \"<form action={coolOffAction} className=\\\"flex flex-wrap items-end gap-2\\\">\\n          <div>\");",
   "  const oneForm = RG.replace(\"<div style={{ width: periodFieldPx }}>\", \"<div>\");"],
  ["    if (s.ticks.length !== 2 * 9) problems.push(`${w}: ${s.ticks.length} ticks (every detent keeps its tick)`);",
   "    if (s.ticks.length !== 2 * dialDetents(1000, 1000).length || dialDetents(1000, 1000).length !== 10) problems.push(`${w}: ${s.ticks.length} ticks (every detent keeps its tick)`);"],
  [`import { dialScale, dialTickLabel, DIAL_LABEL_PX } from "../src/components/markets/dial-scale.ts";`,
   `import { dialScale, dialTickLabel, dialDetents, DIAL_LABEL_PX } from "../src/components/markets/dial-scale.ts";`],
]);
