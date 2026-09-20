/**
 * THE REPORT LIBRARY MAY NOT ADVERTISE A FORMAT THE PLATFORM CANNOT PRODUCE.
 *
 *   npm run test:report-formats
 *
 * ⛔ WHAT THIS EXISTS TO STOP, measured on `main` 2026-09-19 (defect L29). `/admin/reports` listed eight report
 * templates and each carried its own `formats: [...]` badge row. SEVEN OF THE EIGHT WERE FALSE: "JSON (signed)",
 * "FIU-format encrypted bundle", "CSV", "GBT cross-operator CSV". `GenerateButton` offers exactly two —
 * `type Format = "xlsx" | "pdf"` — and `/api/admin/reports/[id]` refuses anything else outright
 * ("Format must be xlsx or pdf"). So a compliance officer on a REGULATOR-FACING screen read "FIU-format encrypted
 * bundle", pressed Generate, and received a spreadsheet.
 *
 * ⭐ THE BADGE IS NOT DECORATION. It is the page telling an officer what they are about to send the Gaming Board or
 * the FIU. A false one is a page stating an untruth about a regulator artefact, which is the same defect class this
 * platform treats as a blocker everywhere else.
 *
 * ⛔ AND THE FIX WAS TO DELETE THE FIELD, NOT TO CORRECT IT. Eight copies of a fact that must equal one other fact is
 * a drift generator: correcting all eight leaves the ninth entry free to invent a ninth format. The catalogue now has
 * no `formats` field at all and the badges render from one `REPORT_FORMATS` constant. This suite pins the three files
 * to each other so they cannot drift apart again — and §3 plants the defect to prove it can still fail.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); } else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

const PAGE = join(ROOT, "src/app/admin/reports/page.tsx");
const BUTTON = join(ROOT, "src/app/admin/reports/generate-button.tsx");
const ROUTE = join(ROOT, "src/app/api/admin/reports/[id]/route.ts");
const pageSrc = readFileSync(PAGE, "utf8");
const buttonSrc = readFileSync(BUTTON, "utf8");
const routeSrc = readFileSync(ROUTE, "utf8");

/** The two the button can actually request, read from its own type rather than re-typed here. */
const formatsFromButton = () => {
  const m = buttonSrc.match(/type Format = ([^;]+);/);
  return m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]).sort() : [];
};
/** The two the route will accept, read from its own guard. */
const formatsFromRoute = () => {
  const m = routeSrc.match(/format !== "([a-z]+)" && format !== "([a-z]+)"/);
  return m ? [m[1], m[2]].sort() : [];
};
/** The labels the page paints. */
const labelsFromPage = (src = pageSrc) => {
  const m = src.match(/const REPORT_FORMATS = \[([^\]]+)\]/);
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
};

console.log("\n[report-formats] §1 the page advertises exactly what the platform can produce");
{
  const btn = formatsFromButton();
  const rte = formatsFromRoute();
  const lbl = labelsFromPage();
  ok("§1 the button's Format type and the route's guard name the SAME two formats",
    btn.length === 2 && JSON.stringify(btn) === JSON.stringify(rte), `button=${btn.join("|")} route=${rte.join("|")}`);
  ok("§1 the page paints exactly as many badges as there are producible formats",
    lbl.length === btn.length, `labels=${lbl.join("|")} vs ${btn.length} formats`);
  // The labels are the officer-facing names of those same two; pinned by their known mapping.
  const MAP = { xlsx: "Excel", pdf: "PDF" };
  ok("§1 every badge is the officer-facing name of a format the route accepts",
    lbl.every((l) => Object.values(MAP).includes(l)) && btn.every((f) => lbl.includes(MAP[f])),
    `labels=${lbl.join("|")}`);
}

/**
 * ⛔ COMMENTS ARE STRIPPED BEFORE ANY OF §2's SCANS, and the reason is that this suite caught ITSELF.
 * Its first run reported all four false claims "back on the page" — they were in the explanatory comment the fix
 * had just added, quoting the very strings it removed. A guard that cannot tell code from prose about code reports
 * the documentation of a fix as the defect. That is the same failure mode `admin-section-gate.test.mjs` §0b shipped
 * with — a substring match over raw bytes — and the same remedy applies.
 */
const stripComments = (s) => s
  .replace(/^[ \t]*\/\/.*$/gm, "")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

console.log("\n[report-formats] §2 no template may carry a format of its own");
{
  const code = stripComments(pageSrc);
  // ⛔ The field is GONE, and this is what keeps it gone. A per-entry `formats` is how seven false badges existed.
  ok("§2 the catalogue declares no per-template `formats` field",
    !/^\s*formats:\s*\[/m.test(code), "a template re-introduced its own formats list");
  const FALSE_CLAIMS = ["JSON (signed)", "FIU-format encrypted bundle", "GBT cross-operator CSV", "CSV"];
  const present = FALSE_CLAIMS.filter((c) => code.includes(`"${c}"`));
  ok("§2 none of the four measured false claims is back on the page", present.length === 0, present.join(", "));
}

console.log("\n[report-formats] §3 CONTROL · the assertions can still fail");
{
  // Each plants the exact defect that shipped, and requires the detector to catch it.
  // ⚠️ The plant must be the SHAPE the catalogue actually uses — a field on its own line inside an entry.
  // The first version of this control put `{ formats: ["CSV"] }` on one line, which the detector correctly did not
  // match, and the control failed. The plant was wrong, not the detector: a control that plants a defect the real
  // code could never contain tests nothing, and "fixing" the detector to catch it would have WIDENED it to match
  // `formats:` anywhere on a line — including inside a comment or a prop.
  const withField = stripComments(pageSrc).replace("const TEMPLATES = [", 'const TEMPLATES = [\n  {\n    id: "planted",\n    formats: ["CSV"],\n  },');
  ok("§3 a template that re-adds its own `formats` is caught", /^\s*formats:\s*\[/m.test(withField));
  const withFalse = stripComments(pageSrc).replace('const REPORT_FORMATS = ["Excel", "PDF"] as const;', 'const REPORT_FORMATS = ["Excel", "PDF", "JSON (signed)"] as const;');
  const lbl = labelsFromPage(withFalse);
  ok("§3 a third badge that no format backs is caught", lbl.length !== formatsFromButton().length, `labels=${lbl.length}`);
  ok("§3 CONTROL · and the real page passes both, so §3 is not merely rejecting everything",
    !/^\s*formats:\s*\[/m.test(pageSrc) && labelsFromPage().length === formatsFromButton().length);
}

console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — report-formats: ${pass} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  · ${f}`); process.exit(1); }
