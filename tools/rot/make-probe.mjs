// Scratch: build a NEGATIVE-CONTROL copy of scripts/decomment-red.mjs that runs two custom mutations against the
// repo, to watch the baseline-aware verdicts (VACUOUS / CAUGHT-with-warning) fire. Reads the real harness, writes only
// into the scratchpad. Nothing here touches the repo.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "F:/kipindi-rot3/scripts/decomment-red.mjs";
const OUT = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/rot/decomment-red.probe.mjs";

const PROBE_MUTATIONS = `const MUTATIONS = [
  {
    name: "probe-1-comment-only-change-on-the-red-check",
    why: "a comment-only edit: the ratchet must print the very line it printed before, so the harness must call it VACUOUS",
    file: "scripts/decomment.test.mts",
    from: "const CARRIER_CEILING = 20;",
    to: "const CARRIER_CEILING = 20; // probe",
    check: "2.1 the private-stripper population may only shrink",
  },
  {
    name: "probe-2-real-change-on-the-red-check",
    why: "the real mutation: one more carrier, so the line changes and the harness must call it CAUGHT with the warning",
    file: "scripts/decomment.test.mts",
    from: "  \\"scripts/lib/decomment.mts\\",\\n  \\"scripts/decomment.test.mts\\",",
    to: "  \\"scripts/decomment.test.mts\\",",
    check: "2.1 the private-stripper population may only shrink",
  },
  {
    name: "probe-3-anchor-that-is-not-there",
    why: "an anchor matching nothing must be a BROKEN HARNESS, in the shared resolver's words",
    file: "scripts/lib/decomment.mts",
    from: "this text is nowhere in the stripper",
    to: "x",
    check: "1.1 a",
  },
  {
    name: "probe-4-anchor-that-matches-twice",
    why: "an anchor matching twice must be a BROKEN HARNESS too, never an injection into whichever came first",
    file: "scripts/lib/decomment.mts",
    from: "let out = \\"\\";",
    to: "let out = 'x';",
    check: "1.1 a",
  },
  {
    name: "probe-5-multi-line-anchor-in-a-crlf-copy",
    why: "the CRLF case itself: a \\\\n anchor must resolve in the CRLF working tree and the mutant must still be caught",
    file: "scripts/lib/decomment.mts",
    from: "export function decomment(s: string): string {\\n  let out = \\"\\";",
    to: "export function decomment(s: string): string {\\n  return s;\\n  let out = \\"\\";",
    check: "1.7 CONTROL: a line comment really is removed",
  },
];`;

const lines = readFileSync(SRC, "utf8").split(/\r?\n/);
const out = lines.map((l) => {
  if (l.startsWith("import { MUTATIONS }")) return PROBE_MUTATIONS;
  if (l.startsWith("import { injectDefect }")) return 'import { injectDefect } from "file:///F:/kipindi-rot3/scripts/red-anchor.mjs";';
  if (l.startsWith("const cwd = ")) return 'const cwd = "F:/kipindi-rot3";';
  return l;
});
writeFileSync(OUT, out.join("\n"), "utf8");
console.log("wrote", OUT, "lines:", out.length);
