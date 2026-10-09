// r3c §2: the empty state's pair and dash are held by nowrap spans since round 5 (R5-E, review 3 H4), not by characters.
import { readFileSync, writeFileSync } from "node:fs";
const p = "F:/kipindi-r5e/scripts/visual-pass-r3c.test.mts";
let s = readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
const E = (x) => (crlf ? x.split("\n").join("\r\n") : x);
const NL = crlf ? "\r\n" : "\n";

const oldImport = 'import { dashOnItsWord, emptyStateBody, pairOnOneLine } from "../src/components/ui/empty-state-text.ts";';
if (!s.includes(oldImport)) { console.error("import not found"); process.exit(1); }
s = s.replace(oldImport, E('import { emptyStateBody, emptyStateRanges } from "../src/components/ui/empty-state-text.ts";\nimport { runAndDashRanges } from "../src/components/ui/keep-run.tsx";'));

const a = s.indexOf("  const unbound = found.filter");
const b = s.indexOf(NL, s.indexOf('ok("2.4 · EmptyState renders its body through emptyStateBody"'));
if (a < 0 || b < 0) { console.error("block not found", a, b); process.exit(1); }

const block = [
  "  // ⚠️ Pins moved 2026-10-09 (round 5, R5-E, review 3 H4): the pair and the dash are held by nowrap SPANS (`keepRanges`,",
  "  // keep-run.tsx), no longer by no-break spaces and a word joiner inserted into the words — those travelled into a copy,",
  "  // a find-in-page and the accessible text. The same breaks: a held run is what a no-break space held, and nothing more.",
  "  const held = (s: string) => emptyStateRanges(s).map(([a, b]) => s.slice(a, b));",
  "  const unbound = found.filter((s) => !held(s).some((r) => /[A-Z]{2,} (au|or) [A-Z]{2,}/.test(r)));",
  "  ok(\"2.1 · emptyStateBody holds every pair in one nowrap run (\\\"NDIO au HAPANA\\\", \\\"YES or NO\\\")\", unbound.length === 0, unbound.join(\" | \"));",
  "  const body = renderToStaticMarkup(h(\"p\", null, emptyStateBody(\"Chagua swali, bonyeza NDIO au HAPANA — tiketi\")));",
  "  ok(\"2.2 · …and keeps G3's dash rule: the dash is held to the word before it, in the same run — and no character is added\",",
  "    body === `<p>Chagua swali, bonyeza <span class=\"whitespace-nowrap\">NDIO au HAPANA —</span> tiketi</p>` && !body.includes(NBSP), body);",
  "  ok(\"2.3 CONTROL · lower-case \\\"au\\\"/\\\"or\\\" and Chinese are left to break as before\",",
  "    emptyStateRanges(\"Juu au Chini, ndio au hapana\").length === 0 && emptyStateRanges(\"按 是 或 否\").length === 0);",
  "  ok(\"2.3′ PLANT · the dash rule alone does not hold the pair — the pair rule is what does\",",
  "    !runAndDashRanges(\"bonyeza NDIO au HAPANA — tiketi\").some(([a, b]) => \"bonyeza NDIO au HAPANA — tiketi\".slice(a, b).includes(\"NDIO au\")));",
  "  const es = read(\"src/components/ui/empty-state.tsx\");",
  "  // ⚠️ Pin moved 2026-10-09 (round 4, R4-K, E50) to `{hangCjkMarks(emptyStateBody(body))}`, and again in round 5 (R5-E,",
  "  // H4): `emptyStateBody` now draws the spans and hangs each part's marks itself, so the call is `{emptyStateBody(body)}`.",
  "  ok(\"2.4 · EmptyState renders its body through emptyStateBody\", es.includes(\"{emptyStateBody(body)}\") && !/function dashOnItsWord/.test(es));",
].join(NL);
s = s.slice(0, a) + block + s.slice(b);
writeFileSync(p, s);
console.log("ok");
