// Runs ONLY inside the scratch sandbox (cwd = sbx). Never touches the repo.
// Question: which `amount: res.payout,` does the harness's old anchor hit, and which plants does the
// ORIGINAL (unmodified) suite catch?
const { readFileSync, writeFileSync, copyFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const ANN = "src/components/updown/updown-result-announcer.tsx";
const ORIG_SUITE = "scripts/orig-updown-result-announce.test.mts"; // verbatim copy of the repo's suite
const TSX = "F:/kipindi-rot2/node_modules/tsx/dist/cli.mjs";
const original = readFileSync(ANN, "utf8");
const A = "          amount: res.payout,";
const B = "          amount: res.stake,";

const idx = [];
for (let i = original.indexOf(A); i >= 0; i = original.indexOf(A, i + 1)) idx.push(i);
const lineOf = (i) => original.slice(0, i).split("\n").length;
console.log("occurrences of the OLD anchor:", idx.length, "at lines", idx.map(lineOf).join(", "));
for (const i of idx) {
  const around = original.slice(Math.max(0, i - 200), i).split("\n").slice(-3).map((s) => s.trim()).join(" | ");
  console.log(`  line ${lineOf(i)} is preceded by: ${around}`);
}

function runWith(label, mutated) {
  writeFileSync(ANN, mutated, "utf8");
  try {
    const r = spawnSync(process.execPath, [TSX, ORIG_SUITE], { encoding: "utf8" });
    const out = r.stdout + r.stderr;
    const tally = out.match(/^updown-result-announce: (\d+) passed, (\d+) failed$/m);
    const fails = out.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
    console.log(`\n[${label}] exit=${r.status}  ${tally ? tally[0] : "(no tally)"}`);
    for (const f of fails) console.log(`     ${f}`);
  } finally {
    writeFileSync(ANN, original, "utf8");
  }
}

// (a) what `String.replace(oldAnchor, ...)` does: first occurrence only
runWith("old anchor, first occurrence only (what the harness did)", original.replace(A, B));
// (b) the SECOND occurrence only (the away-ledger line)
{
  const second = idx[1];
  runWith("ledger line only (2nd occurrence)", original.slice(0, second) + B + original.slice(second + A.length));
}
// (c) BOTH sites
runWith("BOTH sites", original.split(A).join(B));

if (readFileSync(ANN, "utf8") !== original) { console.error("RESTORE FAILED"); process.exit(2); }
console.log("\nsandbox announcer restored byte-for-byte");
