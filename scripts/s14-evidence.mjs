/** `test:s14-evidence` is green while honestly pending; `gate:s14/s15/s16` fail closed until real evidence exists. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateS14Evidence } from "./lib/s14-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const record = JSON.parse(readFileSync(resolve(root, "docs/qa/vodacom-s14-evidence.json"), "utf8"));
const mode = process.argv[2] ?? "--validate";
if (!["--validate", "--require-s14", "--require-s15", "--require-s16"].includes(mode)) {
  console.error("Use --validate, --require-s14, --require-s15 or --require-s16.");
  process.exit(2);
}
const errors = validateS14Evidence(record, {
  root,
  requireS14: mode === "--require-s14",
  requireS15: mode === "--require-s15",
  requireS16: mode === "--require-s16",
});
if (errors.length) {
  console.error(`${mode} failed (${errors.length}):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
const checked = record.frames.reduce((n, frame) => n + frame.checks.filter((check) => check.checked).length, 0);
const total = record.frames.reduce((n, frame) => n + frame.checks.length, 0);
const proofs = record.proofs.filter((proof) => proof.evidence !== null).length;
console.log(`${mode}: structurally valid · frame elements ${checked}/${total} · local proofs ${proofs}/${record.proofs.length} · agency ${record.agencyDecision.decision}`);
