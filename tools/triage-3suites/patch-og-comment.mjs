// Corrects the attribution in the OG lean RE-KEYED note: 871b0844 moved the text to `{price.lean}`, 3d4480c6 to the settled form.
// CRLF-preserving; both comment lines must be found exactly once.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "F:/kipindi-rot2/scripts/design-gate/eyebrow-roles.mjs";
const raw = readFileSync(FILE, "utf8");
const NL = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(NL);

const OLD1 = "  // ⚠️ RE-KEYED 2026-10-08. Same element, same role: the lean word between the YES and NO figures. 871b0844 (2026-09-27)";
const OLD2 = "  // made its text `{settled ? settled.poolCaption : price.lean}` — a settled card says \"Final pool\", an open one still leans.";
const NEW1 = "  // ⚠️ RE-KEYED 2026-10-08. Same element, same role: the lean word between the YES and NO figures. 871b0844 moved its text to";
const NEW2 = "  // `{price.lean}` and 3d4480c6 (both 2026-09-27) to `{settled ? settled.poolCaption : price.lean}` — a settled card says \"Final pool\".";

const i = lines.indexOf(OLD1);
if (i < 0 || lines.filter((l) => l === OLD1).length !== 1 || lines[i + 1] !== OLD2) throw new Error("old note not found exactly once");
lines.splice(i, 2, NEW1, NEW2);
writeFileSync(FILE, lines.join(NL), "utf8");
console.log("note corrected at line", i + 1);
