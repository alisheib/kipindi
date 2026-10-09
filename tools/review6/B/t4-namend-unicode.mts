// keepNameEnd (keep-words.tsx 270–275) on a name holding a combining mark that is new in Unicode 16.0 (U+0897 ARABIC
// PEPET, General_Category Mn since 16.0; unassigned — Cn, so `\S` and not `\p{M}` — in every engine on Unicode ≤ 15.1).
// The name editor (a client component) draws keepNameEnd(currentName) on the server AND in the browser, so the two must
// cut the name at the same place. Node's cut is the server's; the "older engine" cut is the same pattern with U+0897
// taken out of \p{M} (the `v` flag's set difference), which is how an engine whose tables predate 16.0 reads it.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h, Fragment } from "react";
import { keepNameEnd, characterSpans } from "file:///F:/kipindi-rev/src/components/ui/keep-words.tsx";

const name = "Neema Juma" + "\u0897";
console.log("node", process.versions.node, "icu", process.versions.icu, "unicode", process.versions.unicode);
console.log("U+0897 is \\p{M} here:", /\p{M}/u.test("\u0897"));

const server = renderToStaticMarkup(h(Fragment, null, keepNameEnd(name)));
console.log("server (Node) markup :", JSON.stringify(server));

// The CHARACTER pattern as keep-words.tsx builds it, with \p{M} narrowed to what a Unicode-15.1 engine knows of U+0897.
const PREPEND = "\\u0600-\\u0605\\u06DD\\u070F\\u0890\\u0891\\u08E2\\u0D4E\\u{110BD}\\u{110CD}\\u{111C2}\\u{111C3}\\u{113D1}\\u{1193F}\\u{11941}\\u{11A3A}\\u{11A84}-\\u{11A89}\\u{11D46}\\u{11F02}";
const LINKER = "\\u094D\\u09CD\\u0ACD\\u0B4D\\u0C4D\\u0D4D";
const M_OLD = "[\\p{M}--[\\u0897]]";
const EXTEND_OLD = `${M_OLD}\\u200C\\u200D\\u0E33\\u0EB3\\uFF9E\\uFF9F\\u{1F3FB}-\\u{1F3FF}\\u{E0020}-\\u{E007F}\\u1160-\\u11FF\\uD7B0-\\uD7FF\\u{16D63}\\u{16D67}-\\u{16D6A}`;
const L_JAMO = "\\u1100-\\u115F\\uA960-\\uA97C";
const OPENER = `\\p{RI}\\p{RI}|[${PREPEND}]*(?:[${L_JAMO}]+[\\uAC00-\\uD7A3]?|\\S)`;
const CHAR_OLD = new RegExp(`(?:${OPENER}|\\s(?=[${EXTEND_OLD}]))(?:[${LINKER}][${M_OLD}\\u200D]{0,4}\\p{L}|\\u200D(?:${OPENER})|[${EXTEND_OLD}])*`, "gv");
const spansNode = characterSpans(name);
const spansOld = [...name.matchAll(CHAR_OLD)].map((m) => [m.index, m.index + m[0].length]);
console.log("last two characters, Node      :", JSON.stringify(spansNode.slice(-2).map(([a, b]) => name.slice(a, b))));
console.log("last two characters, Unicode15 :", JSON.stringify(spansOld.slice(-2).map(([a, b]) => name.slice(a, b))));
const cutNode = spansNode.at(-2)[0], cutOld = spansOld.at(-2)[0];
console.log(`the nowrap span starts at ${cutNode} on the server and at ${cutOld} in the older browser →`,
  cutNode === cutOld ? "same markup" : "DIFFERENT markup (hydration text mismatch)");
