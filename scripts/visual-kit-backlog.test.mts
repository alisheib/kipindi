/**
 * F38/F39 shared-kit source gate. The browser matrix still decides whether a
 * rung fits a particular translation; this catches drift in the kit's own
 * type and box dictionaries before it reaches every caller.
 *
 * Run: npm run test:visual-kit-backlog
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment, decommentCss } from "./lib/decomment.mts";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const files = {
  chip: readFileSync(join(ROOT, "src/components/ui/chip.tsx"), "utf8"),
  stat: readFileSync(join(ROOT, "src/components/ui/stat.tsx"), "utf8"),
  css: readFileSync(join(ROOT, "src/app/globals.css"), "utf8"),
  tailwind: readFileSync(join(ROOT, "tailwind.config.ts"), "utf8"),
};

type Sources = typeof files;
type Audit = { errors: string[]; chipRows: number; labelRows: number; boxRows: number; legacyStatSizes: number[] };

function dictionary(source: string, name: string): string {
  return new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(source)?.[1] ?? "";
}

function audit(input: Sources): Audit {
  const errors: string[] = [];
  const css = decommentCss(input.css);
  const tailwind = decomment(input.tailwind);
  const chip = decomment(input.chip);
  const stat = decomment(input.stat);
  const typeRungs = new Set(
    [...css.matchAll(/--type-[\w-]+:\s*([\d.]+)px/g)].map((m) => Number(m[1])),
  );
  const tailwindType = /fontSize:\s*\{([\s\S]*?)\n\s{6}\},/.exec(tailwind)?.[1] ?? "";
  for (const m of tailwindType.matchAll(/:\s*\["([\d.]+)px"/g)) typeRungs.add(Number(m[1]));
  if (typeRungs.size < 16 || !typeRungs.has(9.5) || !typeRungs.has(10) || !typeRungs.has(13)) {
    errors.push("type ladders were not resolved from globals.css and tailwind.config.ts");
  }

  const spacing = new Set(
    [...css.matchAll(/--sp-[\d]+:\s*([\d.]+)px/g)].map((m) => Number(m[1])),
  );
  const spacingBlock = /spacing:\s*\{([\s\S]*?)\n\s{6}\},/.exec(tailwind)?.[1] ?? "";
  const spacingBridge = new Map(
    [...spacingBlock.matchAll(/"([\d.]+)":\s*"([\d.]+)px"/g)].map((m) => [m[1], Number(m[2])]),
  );
  if (spacing.size < 10 || spacingBridge.size < 10) {
    errors.push("spacing scale or Tailwind bridge was not resolved");
  }

  const chipTable = dictionary(chip, "sizeStyles");
  const chipFonts = [...chipTable.matchAll(/\b(base|status):\s*\{\s*height:\s*\d+,\s*padding:\s*"[^"]+",\s*fontSize:\s*([\d.]+)\s*\}/g)];
  if (chipFonts.length !== 8) errors.push(`chip size coverage changed: ${chipFonts.length}/8 rows`);
  for (const m of chipFonts) {
    const px = Number(m[2]);
    if (!typeRungs.has(px)) errors.push(`chip ${m[1]} font ${px}px is off both ladders`);
  }

  const labelTable = dictionary(stat, "LABEL");
  const labels = [...labelTable.matchAll(/\b(\w+):\s*"([^"]+)"/g)];
  if (labels.length !== 8) errors.push(`stat label coverage changed: ${labels.length}/8 rows`);
  for (const m of labels) {
    const sizes = [...m[2].matchAll(/\btext-\[([\d.]+)px\]/g)].map((x) => Number(x[1]));
    if (sizes.length !== 1) errors.push(`stat ${m[1]} label has ${sizes.length} explicit sizes`);
    for (const px of sizes) if (!typeRungs.has(px)) errors.push(`stat ${m[1]} label ${px}px is off both ladders`);
  }

  const sizeTable = dictionary(stat, "SIZE");
  const legacyStatSizes = [...sizeTable.matchAll(/text-\[([\d.]+)px\]/g)]
    .map((m) => Number(m[1])).filter((px) => !typeRungs.has(px)).sort((a, b) => a - b);
  // `xs` 13.5 and `2xl` 21 have named, owner-deferred visual decisions in
  // stat.tsx. Hold precisely this debt; a new off-ladder value cannot hide here.
  if (legacyStatSizes.join(",") !== "13.5,21") {
    errors.push(`stat value exception set changed: ${legacyStatSizes.join(",")}`);
  }

  const boxTable = dictionary(stat, "BOX");
  const boxes = [...boxTable.matchAll(/\b(\w+):\s*"([^"]+)"/g)];
  if (boxes.length !== 6) errors.push(`stat box coverage changed: ${boxes.length}/6 rows`);
  for (const m of boxes) {
    const pads = [...m[2].matchAll(/(?:^|\s)(?:p|px|py|pt|pr|pb|pl)-([\d.]+)(?=\s|$)/g)];
    if (pads.length === 0) errors.push(`stat ${m[1]} box has no measured padding`);
    for (const pad of pads) {
      const px = spacingBridge.get(pad[1]);
      if (px === undefined || !spacing.has(px)) {
        errors.push(`stat ${m[1]} box padding ${pad[1]} resolves to ${px === undefined ? "a stock Tailwind value" : `${px}px`}, off the --sp-* scale`);
      }
    }
  }
  return { errors, chipRows: chipFonts.length, labelRows: labels.length, boxRows: boxes.length, legacyStatSizes };
}

let pass = 0;
let fail = 0;
function ok(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  condition ? pass++ : fail++;
}

const actual = audit(files);
ok("kit dictionaries and source ladders are fully covered",
  actual.chipRows === 8 && actual.labelRows === 8 && actual.boxRows === 6,
  `${actual.chipRows} chip rows, ${actual.labelRows} labels, ${actual.boxRows} boxes`);
ok("F38/F39 kit entries resolve to declared type and spacing rungs",
  actual.errors.length === 0, actual.errors.join(" · "));
ok("the two owner-deferred Stat value sizes remain explicit exceptions",
  actual.legacyStatSizes.join(",") === "13.5,21");

// In-memory RED and GREEN controls. A test that rejects all changes is as
// misleading as one that misses a real off-ladder value.
const plants: { name: string; input: Sources; error: string }[] = [
  {
    name: "old 9px market chip",
    input: { ...files, chip: files.chip.replace("fontSize: 9.5", "fontSize: 9") },
    error: "chip base font 9px",
  },
  {
    name: "old 10.5px medium chip",
    input: { ...files, chip: files.chip.replace("height: 21, padding: \"0 8px\", fontSize: 11", "height: 21, padding: \"0 8px\", fontSize: 10.5") },
    error: "chip base font 10.5px",
  },
  {
    name: "old 9px stat label",
    input: { ...files, stat: files.stat.replace("micro:  \"text-[9.5px]", "micro:  \"text-[9px]") },
    error: "stat micro label 9px",
  },
  {
    name: "stock 14px stat padding",
    input: { ...files, stat: files.stat.replace("px-3 py-3\"", "px-3.5 py-3\"") },
    error: "stat tile box padding 3.5",
  },
];
for (const plant of plants) {
  const errors = audit(plant.input).errors;
  ok(`RED · ${plant.name} is caught`, errors.some((e) => e.includes(plant.error)), errors.join(" · "));
}
const compliant = audit({
  ...files,
  chip: files.chip.replace("height: 21, padding: \"0 8px\", fontSize: 11", "height: 21, padding: \"0 8px\", fontSize: 10"),
  stat: files.stat.replace("micro:  \"text-[9.5px]", "micro:  \"text-[10px]")
    .replace("px-3 py-3\"", "px-2 py-3\""),
});
ok("GREEN · other declared type and spacing rungs are accepted", compliant.errors.length === 0,
  compliant.errors.join(" · "));

console.log(`\nvisual-kit-backlog: ${pass} pass · ${fail} fail`);
if (fail) process.exitCode = 1;
