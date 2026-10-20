import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkOpenChecklist } from "./maswali-admin-checklist.mjs";

const attestation = "A second reader has not attested that English, Swahili and Chinese agree (MB-79).";
const licence = "No licence basis is recorded. The Owner records it before any week opens (OD-01).";
const guarantee = "The guarantee holds TZS 0; TZS 1,000,000 is needed to open (OD-02).";
const seeded = { licence: "Owner ruling", guarantee: "TZS 7,056,000", requirement: "TZS 1,000,000" };
const fresh = { licence: "None", guarantee: "TZS 0", requirement: "TZS 0" };
const drivePath = fileURLToPath(new URL("./maswali-admin-drive.mjs", import.meta.url));
const driveSource = readFileSync(drivePath, "utf8");
const hasFreshRequirementRead = (source) => {
  const afterSave = source.split("driveCode = clip(await h1.textContent());")[1]?.split("const problems =")[0] ?? "";
  const pools = afterSave.indexOf('await go(page, "/admin/maswali/pools");');
  const needed = afterSave.indexOf("standing.requirement = /Needed now:");
  const back = afterSave.indexOf("await go(page, weekPath);");
  return pools >= 0 && pools < needed && needed < back;
};

assert.equal(checkOpenChecklist(seeded, [attestation]).ok, true, "seeded standing needs only the second reader");
assert.equal(checkOpenChecklist(fresh, [licence, attestation, guarantee]).ok, true, "fresh standing names all three blockers");
assert.equal(checkOpenChecklist(fresh, [attestation]).ok, false, "a missing licence and guarantee must fail");
assert.equal(checkOpenChecklist(fresh, [licence, attestation, guarantee.replace("1,000,000", "0")]).ok, false,
  "the prospective open must demand more than the balance held");
assert.equal(checkOpenChecklist({ ...fresh, guarantee: "TZS 750,000", requirement: "TZS 1,000,000" },
  [licence, attestation, "The guarantee holds TZS 750,000; TZS 900,000 is needed to open (OD-02)."]).ok, false,
  "the prospective open requirement must not be below the existing open-weeks requirement");
assert.equal(checkOpenChecklist(seeded, [attestation, "Unknown blocker"]).ok, false, "an unexpected blocker must fail");
assert.equal(hasFreshRequirementRead(driveSource), true, "drive must reread the pools requirement after the draft saves and before comparing the checklist");
console.log("maswali admin checklist: seeded, fresh, missing and wrong-amount states PASS");

if (process.argv.includes("--prove-red")) {
  const path = fileURLToPath(new URL("./maswali-admin-checklist.mjs", import.meta.url));
  const source = readFileSync(path, "utf8");
  const mutant = source.replace('if (current === 0 || current < required) expected.push("guarantee");', 'if (false) expected.push("guarantee");');
  assert.notEqual(mutant, source, "guarantee mutation must plant");
  const broken = (await import(`data:text/javascript,${encodeURIComponent(mutant)}`)).checkOpenChecklist;
  assert.equal(broken(fresh, [licence, attestation, guarantee]).ok, false, "omitting the guarantee must turn the fresh case red");
  const requirementLine = 'standing.requirement = /Needed now:\\s*(TZS [\\d,]+)/.exec(await page.locator("main").textContent())?.[1] ?? "?";';
  const plantAt = driveSource.lastIndexOf(requirementLine);
  assert.ok(plantAt > driveSource.indexOf("driveCode = clip(await h1.textContent());"), "stale standing mutation must plant after the draft");
  const stale = driveSource.slice(0, plantAt) + 'standing.requirement = "TZS 0";' + driveSource.slice(plantAt + requirementLine.length);
  assert.equal(hasFreshRequirementRead(stale), false, "keeping the pre-draft requirement must turn the timing guard red");
  console.log("maswali admin checklist RED: omitted guarantee and stale requirement are caught");
}
