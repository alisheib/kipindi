/**
 * S16 gate. --inventory-only is safe to run before launch; the normal command
 * is deliberately red until the final source unmount lands. package.json runs
 * typecheck before normal mode, proving retained source still compiles.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SHELVED_ITEMS, validatePositionsShelving, validateShelvedInventory, validateShelvedSource, readShelvedSource,
} from "./lib/s16-shelved.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = readShelvedSource(root);
const markdown = read("docs/SHELVED.md");
const scripts = JSON.parse(read("package.json")).scripts;
const mode = process.argv[2] ?? "--require-unmounted";

if (mode === "--prove-red") {
  const rows = markdown.split(/\r?\n/);
  const first = rows.findIndex((line) => line.startsWith("| The classic header,"));
  if (first < 0) throw new Error("SHELVED.md control row missing");
  const cases = [
    ["deleted row", rows.filter((_, i) => i !== first).join("\n"), scripts, "missing The classic header"],
    ["source file gone", markdown.replace("`src/components/layout/top-app-bar.tsx`", "`src/components/layout/vanished-s16.tsx`"), scripts, "source path missing"],
    ["test unwired", markdown, { ...scripts, "test:simple-journey-flag": undefined }, "test command is not wired"],
    ["date impossible", markdown.replace("2026-10-02", "2026-02-30"), scripts, "reason, real date"],
    ["re-mount missing", markdown.replace("In `src/components/layout/app-shell.tsx`, render the header ternary's else arm for every request", ""), scripts, "re-mount instructions"],
  ];
  let passed = 0;
  for (const [label, text, commandMap, expected] of cases) {
    const errors = validateShelvedInventory(text, commandMap, { root });
    if (!errors.some((error) => error.includes(expected))) throw new Error(`${label}: mutation escaped: ${errors.join("; ")}`);
    passed++;
  }
  const liveSourceErrors = validateShelvedSource(read);
  for (const expected of ["chrome", "tickets", "markets", "preview"]) {
    if (!liveSourceErrors.some((error) => error.startsWith(`${expected}:`))) {
      throw new Error(`current pre-S16 ${expected} branch was not refused`);
    }
    passed++;
  }
  // Build the future parked shape from the actual retained classic JSX. Once
  // S16 lands, the real page itself becomes the control. Neither plant edits
  // the checkout: one calls the parked helper again; the other deletes a
  // retained classic piece that SHELVED.md promises can be re-mounted.
  const positions = read("src/app/positions/page.tsx");
  let parkedControl = positions;
  if (validatePositionsShelving(positions).length) {
    const open = positions.indexOf("<PageContainer");
    const close = positions.lastIndexOf("</PageContainer>");
    if (open < 0 || close <= open) throw new Error("classic positions JSX control missing");
    const classic = positions.slice(open, close + "</PageContainer>".length);
    parkedControl = `export default async function PositionsPage() { return <TicketsView />; }\nfunction ShelvedClassicPositionsPage() { return (${classic}); }`;
  }
  const controlErrors = validatePositionsShelving(parkedControl);
  if (controlErrors.length) throw new Error(`parked positions control failed: ${controlErrors.join("; ")}`);
  const body = /export default async function PositionsPage\([\s\S]*?\)\s*\{/.exec(parkedControl);
  if (!body) throw new Error("exported positions function body not found");
  const at = body.index + body[0].length;
  const remounted = `${parkedControl.slice(0, at)}\nreturn ShelvedClassicPositionsPage();${parkedControl.slice(at)}`;
  if (!validatePositionsShelving(remounted).some((error) => error.includes("can still reach classic JSX"))) {
    throw new Error("calling the parked classic positions view escaped the guard");
  }
  passed++;
  const removed = parkedControl.replace("<PnlSummaryStrip", "<RemovedPnlSummaryStrip");
  if (!validatePositionsShelving(removed).some((error) => error.includes("parked classic JSX lost <PnlSummaryStrip"))) {
    throw new Error("deleting the parked P&L strip escaped the guard");
  }
  passed++;
  console.log(`red:shelved ${passed}/${cases.length + 6}: inventory mutations, classic re-mount, retained-code loss and pre-S16 source refused`);
  process.exit(0);
}

if (!["--inventory-only", "--source-only", "--require-unmounted"].includes(mode)) {
  console.error("Use --inventory-only, --source-only, --require-unmounted or --prove-red.");
  process.exit(2);
}
const errors = [
  ...(mode === "--source-only" ? [] : validateShelvedInventory(markdown, scripts, { root })),
  ...(mode === "--inventory-only" ? [] : validateShelvedSource(read)),
];
if (errors.length) {
  console.error(`test:shelved ${mode} closed (${errors.length}):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`test:shelved ${mode}: ${SHELVED_ITEMS.length} recorded items, source and test wiring intact${mode === "--inventory-only" ? " (final unmount not checked)" : ""}`);
