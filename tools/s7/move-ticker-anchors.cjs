// S7 WP0 (A4 item 2): red:ticker-honesty's 28 cases move, byte for byte, from the harness into
// scripts/anchors/ticker-honesty.anchors.mjs (declared, so test:red-anchors §3 audits each), and the harness's verdict
// becomes an exact check id with a control. Usage: node move-ticker-anchors.cjs <repo>
const fs = require("fs");
const repo = process.argv[2];
const H = repo + "/scripts/ticker-honesty-red.mjs";
const A = repo + "/scripts/anchors/ticker-honesty.anchors.mjs";
const GATE = repo + "/scripts/ticker-honesty.test.mts";
const raw = fs.readFileSync(H, "utf8");
const crlf = raw.includes("\r\n");
const h = raw.replace(/\r\n/g, "\n");
const once = (s, needle, label) => { const i = s.indexOf(needle); if (i < 0 || s.indexOf(needle, i + 1) >= 0) throw new Error(label + ": not exactly once"); return i; };

// 1 · the constants block and the CASES array, exactly as they stand
const cStart = once(h, 'const PURE = "src/lib/markets/ticker.ts";', "consts start");
const cEnd = once(h, 'const CSS = "src/app/globals.css";\n', "consts end") + 'const CSS = "src/app/globals.css";\n'.length;
const consts = h.slice(cStart, cEnd);
const aStart = once(h, "/** Each case: the defect that was really shipped", "cases doc");
const arrStart = once(h, "const CASES = [", "cases start");
const arrEnd = once(h, "\n];\n\nconst runGate", "cases end") + "\n];\n".length;
const casesDoc = h.slice(aStart, arrStart);
const casesBody = h.slice(arrStart + "const CASES = ".length, arrEnd); // "[ ... ];\n"
const MUT = [];
// sanity: 28 cases, each expect a label the gate prints as "<id> …"
const gate = fs.readFileSync(GATE, "utf8");
const expects = [...casesBody.matchAll(/expect: "([^"]+)"/g)].map((m) => m[1]);
if (expects.length !== 28) throw new Error(`expected 28 cases, found ${expects.length}`);
for (const id of expects) {
  if (!gate.includes(`"${id} `) && !gate.includes("`" + id + " ")) throw new Error(`the gate prints no label "${id} …"`);
}

// 2 · the declaration module (data only, no side effects)
const anchors = `/**
 * THE ANCHORS \`red:ticker-honesty\` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array: \`test:red-anchors\` §3 audits that every anchor below still resolves EXACTLY ONCE
 * against real source, without executing a harness that rewrites that source. ⚠️ NO SIDE EFFECTS: data only,
 * repo-relative POSIX paths.
 *
 * Moved out of \`scripts/ticker-honesty-red.mjs\` by the Vodacom plan's S7 WP0 (S7-PLAN Amendment A4, 2026-10-07), byte
 * for byte: S7 edits \`ticker.ts\` and \`live-ticker.tsx\`, and a twin whose anchors nobody audits cannot give a verdict
 * on them. \`expect\` is the gate's check id; the harness now requires a failing line that STARTS with \`✗ <id> \`, so
 * an expected 11.2 is no longer met by 11.21, nor 1.1 by 1.1-control.
 */
${consts}
${casesDoc.trimEnd()}
export const MUTATIONS = ${casesBody}`;
fs.mkdirSync(repo + "/scripts/anchors", { recursive: true });
if (fs.existsSync(A)) throw new Error("the anchors file already exists");

// 3 · the harness: imports them, and judges by the exact id after a control
let n = h.slice(0, cStart) + h.slice(cEnd, aStart) + h.slice(arrEnd);
n = n.replace('import { injectDefect } from "./red-anchor.mjs";\n',
  'import { injectDefect } from "./red-anchor.mjs";\nimport { MUTATIONS as CASES } from "./anchors/ticker-honesty.anchors.mjs";\n\n// (The cases and their files live with the mutations, in scripts/anchors/ticker-honesty.anchors.mjs: S7 WP0.)\n');
const oldVerdict = `  } else if (!r.out.includes(c.expect)) {`;
once(n, oldVerdict, "old verdict");
n = n.replace(oldVerdict, `  } else if (!caughtOn(r.out, c.expect)) {`);
const control = `/**
 * ⭐ THE VERDICT IS THE WHOLE CHECK ID (S7 WP0, Amendment A4). The gate prints each failure as \`  ✗ <label>\`, and every
 * label starts with its id and a space. It used to be a substring test, so an expected 11.2 was met by a failing 11.21 or
 * 11.22, and an expected 1.1 by 1.1-control: red for the wrong reason, counted as caught.
 */
const caughtOn = (out, id) => out.split("\\n").some((l) => l.trim().startsWith(\`✗ \${id} \`));
// CONTROL, before any case: the matcher must tell an id from its neighbours, both ways, or no verdict below means a thing.
{
  const wrong = [
    ["  ✗ 11.21 starting the run zeroes the buffer", "11.2"],
    ["  ✗ 11.22 the copy restarts", "11.2"],
    ["  ✗ 11.2j the journey list", "11.2"],
    ["  ✗ 1.1-control the settled sibling", "1.1"],
    ["  ✗ 11.1 the strip shows on /live", "1.1"],
  ];
  const right = [["  ✗ 11.2 the strip never shows on /", "11.2"], ["  ✗ 1.1 an unsettled row is dropped — got 1", "1.1"]];
  const bad = [...wrong.filter(([o, id]) => caughtOn(o, id)), ...right.filter(([o, id]) => !caughtOn(o, id))];
  if (bad.length) {
    console.error("REFUSING TO RUN: the verdict's matcher cannot tell a check id from its neighbours:");
    bad.forEach(([o, id]) => console.error(\`  ✗ wanted \${id}, line \${JSON.stringify(o)}\`));
    process.exit(1);
  }
  console.log("control: the verdict matches whole check ids (11.2 is not 11.21, 11.22 or 11.2j; 1.1 is not 1.1-control)");
}

`;
n = n.replace("const runGate = () => {", control + "const runGate = () => {");
// the harness's own file list is derived from the mutations, as board-discovery's is
fs.writeFileSync(A, crlf ? anchors.replace(/\n/g, "\r\n") : anchors);
fs.writeFileSync(H, crlf ? n.replace(/\n/g, "\r\n") : n);
console.log(`moved ${expects.length} cases; harness and anchors written`);
