/**
 * S15 publication gate. This branch may carry the ACTIVE source for review, but no
 * release can pass predeploy until the dated legal copy and real S14/S15 evidence
 * are recorded. The date is deliberately null in the preparation branch.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateS14Evidence } from "./lib/s14-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const publication = JSON.parse(read("docs/qa/s15-publication.json"));
const evidence = JSON.parse(read("docs/qa/vodacom-s14-evidence.json"));
const errors = validateS14Evidence(evidence, { root, requireS15: true });
const ownerGoAt = Date.parse(evidence.s15?.ownerGo?.checkedAt ?? "");
if (Number.isFinite(ownerGoAt)) {
  // The launch decision must follow the completed proof, not be recycled from
  // an earlier preview approval. The validator checks presence and identity;
  // this release gate checks the sequence.
  const prerequisites = [
    ["staff journey", evidence.productionStaffJourney?.evidence],
    ["agency decision", evidence.agencyDecision?.evidence],
    ...["baseline14Days", "integratedRelease", "productionConfiguration", "rollbackReady"]
      .map((key) => [key, evidence.s15?.[key]]),
  ];
  for (const [name, record] of prerequisites) {
    const checkedAt = Date.parse(record?.checkedAt ?? "");
    if (Number.isFinite(checkedAt) && ownerGoAt < checkedAt) {
      errors.push(`s15.ownerGo: Ali's go predates the ${name} proof`);
    }
  }
}
const date = publication.publicationDate;
if (typeof date !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(date)
  || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
  errors.push("s15-publication: set the actual publication date after the S14 proof, baseline and Ali go");
} else {
  // Publication dates are East Africa dates: the S15 baseline also closes at
  // midnight EAT, which is 21:00 UTC on the preceding day.
  const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (date > today) errors.push("s15-publication: the publication date is in the future");
  const terms = read("src/lib/terms-version.ts");
  if (!terms.includes(`TERMS_VERSION = "${date}"`)) errors.push("s15-publication: TERMS_VERSION differs from the publication date");
  for (const file of ["src/app/legal/rules/yes-no/page.tsx", "src/app/legal/rules/up-down/page.tsx", "src/app/legal/rules/page.tsx"]) {
    const source = read(file);
    if ((source.match(new RegExp(`Version ${date}|Toleo ${date}|版本 ${date}`, "g")) ?? []).length !== 3) {
      errors.push(`s15-publication: the three displayed ${file} versions must equal ${date}`);
    }
  }
  const decision = read("docs/COMPLIANCE-DECISIONS.md");
  if (!decision.includes(`## ${date} · S15 publication`)) errors.push("s15-publication: the dated compliance decision is missing");
  if (decision.includes("Status: parked on `codex/s15-preflip-rebased-1015`")) errors.push("s15-publication: the legal entry still says parked");
}
const flag = read("src/lib/feature-state.ts");
if (!/SIMPLE_JOURNEY_SHIPPED: RolloutState = "ACTIVE"/.test(flag)) errors.push("s15-publication: the shipped ceiling is not ACTIVE");
if (errors.length) {
  console.error(`S15 release gate closed (${errors.length}):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`S15 release gate: evidence complete and legal publication dated ${date}`);
