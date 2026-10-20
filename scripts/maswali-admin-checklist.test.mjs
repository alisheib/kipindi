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
const hasHardWeekReviews = (source) => {
  const attest = source.split('await part("4 · attest and open"')[1]?.split('await part("5 · move the close"')[0] ?? "";
  const move = source.split('await part("5 · move the close"')[1]?.split('await part("6.0 · seed"')[0] ?? "";
  const seal = source.split('await part("6.1 · seal"')[1]?.split('await part("6.2 · preview and release"')[0] ?? "";
  return (attest.match(/confirmDialog\([^,]+, `Attest \$\{driveCode\}'s three languages\?`/g) ?? []).length === 2
    && (attest.match(/word: "ATTEST", confirm: "Record the attestation", alert: \(dlg\) => dlg\.getByRole\("alert"\)/g) ?? []).length === 2
    && attest.includes('ownReview.gated && !ownReview.closed') && attest.includes('await ownReview.cancel();')
    && attest.includes('secondReview.gated && !!attested')
    && (move.match(/confirmDialog\([^,]+, `Move \$\{driveCode\}'s sales close\?`/g) ?? []).length === 2
    && (move.match(/word: "MOVE CLOSE", confirm: "Move the close", alert: \(dlg\) => dlg\.getByRole\("alert"\)/g) ?? []).length === 2
    && move.includes('Current close: ${was} (EAT)') && move.includes('New close: ${SAT} 12:00 (EAT)')
    && move.includes('New close: ${THU} 17:00 (EAT)')
    && move.includes('lateReview.gated && !lateReview.closed') && move.includes('await lateReview.cancel();')
    && move.includes('earlyReview.gated && !!moved')
    && seal.includes('await single.click();') && seal.includes('await go(page, closedPath);')
    && seal.includes('Seal 1 result?') && seal.includes('awaitingSecond')
    && seal.includes('role: "MODERATOR", phone: "+255700000074"')
    && seal.includes('Confirm ${code} M1 as second officer?')
    && seal.includes('word: "CONFIRM", confirm: "Confirm this seal"')
    && seal.includes('secondSeal.gated && !!confirmed')
    && seal.includes('Allow single-admin resolution?')
    && seal.includes('Seal 14 results?')
    && seal.includes('plan.slice(1)')
    && seal.includes('getByRole("textbox", { name: `${first.label} seal evidence`, exact: true })')
    && seal.includes('getByRole("textbox", { name: `${s.label} seal evidence`, exact: true })');
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
assert.equal(hasHardWeekReviews(driveSource), true,
  "drive must gate and read both attestation and close reviews, cancel refused modals, and use the labelled evidence input");
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
  const noAttestGate = driveSource.replace('word: "ATTEST", confirm: "Record the attestation"', 'word: "", confirm: "Record the attestation"');
  assert.notEqual(noAttestGate, driveSource, "attest-gate mutation must plant");
  assert.equal(hasHardWeekReviews(noAttestGate), false, "losing a typed attestation gate must turn the drive guard red");
  const noCancel = driveSource.replace('await lateReview.cancel();', 'void lateReview;');
  assert.notEqual(noCancel, driveSource, "refused-modal mutation must plant");
  assert.equal(hasHardWeekReviews(noCancel), false, "leaving a refused close modal open must turn the drive guard red");
  const noEvidenceLabel = driveSource.replace('getByRole("textbox", { name: `${s.label} seal evidence`, exact: true })', 'getByPlaceholder("What the source says", { exact: true })');
  assert.notEqual(noEvidenceLabel, driveSource, "evidence-label mutation must plant");
  assert.equal(hasHardWeekReviews(noEvidenceLabel), false, "losing the accessible evidence selector must turn the drive guard red");
  const noSecondGate = driveSource.replace('word: "CONFIRM", confirm: "Confirm this seal"', 'word: "", confirm: "Confirm this seal"');
  assert.notEqual(noSecondGate, driveSource, "second-officer gate mutation must plant");
  assert.equal(hasHardWeekReviews(noSecondGate), false, "losing the second-officer typed gate must turn the drive guard red");
  const noPolicyRestore = driveSource.replace('"Allow single-admin resolution?"', '"No policy restore?"');
  assert.notEqual(noPolicyRestore, driveSource, "policy-restore mutation must plant");
  assert.equal(hasHardWeekReviews(noPolicyRestore), false, "omitting the local policy restore must turn the drive guard red");
  console.log("maswali admin checklist RED: omitted guarantee, stale requirement, lost dialog gates, second-officer policy restore and evidence label are caught");
}
