import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkOpenChecklist } from "./maswali-admin-checklist.mjs";

// The open's checklist in the service's own words (S6-ADMIN: words, never a programme code — DESIGN_AUTHORITY §M8a item 29).
const attestation = "A second reader has not attested that English, Swahili and Chinese agree.";
const licence = "No licence basis is recorded. The Owner records it before any week opens.";
const guarantee = "The guarantee holds TZS 0; TZS 1,000,000 is needed to open.";
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
/**
 * S5-FIX-SRV · one truth for every act: the open, a move, the week void and the stop each run once with their audit row
 * LOST (armed through the dev-only fault route), and the drive reads the console's warning for each, whole at 360 and 1280.
 */
const hasUnrecordedActs = (source) => {
  const reads = source.split("async function auditWarningReads(")[1]?.split("async function part(")[0] ?? "";
  return [
    ['loseNextAuditRow("maswali.week.opened")', 'await auditWarningReads("4.6", page.locator("main"), UNRECORDED.open,'],
    ['loseNextAuditRow("maswali.week.close_moved")', 'await auditWarningReads("5.3b", mv, UNRECORDED.move,'],
    ['loseNextAuditRow("maswali.week.voided")', 'await auditWarningReads("6.4c", vw, UNRECORDED.void,'],
    ['loseNextAuditRow("maswali.sunset.ordered")', 'await auditWarningReads("6.6b", stop, UNRECORDED.stop,'],
  ].every(([arm, read]) => source.includes(arm) && source.includes(read) && source.indexOf(arm) < source.indexOf(read))
    && reads.includes("for (const width of [360, 1280]) {")
    && reads.includes("fit.left >= 0 && fit.right <= width + 1 && fit.width > 0 && fit.root <= 1")
    && reads.includes("await shot(page, `${tile}-${width}`);");
};
const hasCalendarFixture = (source) => {
  const draft = source.split('await part("3 · draft"')[1]?.split('await part("4 · attest and open"')[0] ?? "";
  const event = draft.indexOf('await go(page, "/admin/events");');
  const add = draft.indexOf('eventForm.getByRole("button", { name: "Add event", exact: true }).click();');
  const returnToBuilder = draft.indexOf('await go(page, "/admin/maswali/new");', add);
  const suggestion = draft.indexOf('Fill a slot with ${fixtureTitle}', returnToBuilder);
  const reviewed = draft.indexOf('await m1.fill(ROWS[0].en);', suggestion);
  return event >= 0 && event < add && add < returnToBuilder && returnToBuilder < suggestion && suggestion < reviewed
    && draft.includes('getByText(fixtureTitle, { exact: true })')
    && draft.includes('sgText === fixtureTitle')
    && !draft.includes('skipped("3.3');
};
const hasHardWeekReviews = (source) => {
  const attest = source.split('await part("4 · attest and open"')[1]?.split('await part("5 · move the close"')[0] ?? "";
  const move = source.split('await part("5 · move the close"')[1]?.split('await part("6.0 · seed"')[0] ?? "";
  const seal = source.split('await part("6.1 · seal"')[1]?.split('await part("6.2 · preview and release"')[0] ?? "";
  return (attest.match(/confirmDialog\([^,]+, `Attest \$\{driveCode\}'s three languages\?`/g) ?? []).length === 2
    && (attest.match(/word: "ATTEST", confirm: "Record the attestation", alert: \(dlg\) => dlg\.getByRole\("alert"\)/g) ?? []).length === 2
    && attest.includes('ownReview.gated && !ownReview.closed') && attest.includes('await ownReview.cancel();')
    && attest.includes('secondReview.gated && !!attested')
    // S5-FIX-SRV · three moves: the refused late one, the earlier one, and one more whose audit row is lost (5.3).
    && (move.match(/confirmDialog\([^,]+, `Move \$\{driveCode\}'s sales close\?`/g) ?? []).length === 3
    && (move.match(/word: "MOVE CLOSE", confirm: "Move the close", alert: \(dlg\) => dlg\.getByRole\("alert"\)/g) ?? []).length === 3
    && move.includes('armedMove && unrecordedMove.gated && !!movedAgain')
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
  [licence, attestation, "The guarantee holds TZS 750,000; TZS 900,000 is needed to open."]).ok, false,
  "the prospective open requirement must not be below the existing open-weeks requirement");
assert.equal(checkOpenChecklist(seeded, [attestation, "Unknown blocker"]).ok, false, "an unexpected blocker must fail");
assert.equal(hasFreshRequirementRead(driveSource), true, "drive must reread the pools requirement after the draft saves and before comparing the checklist");
assert.equal(hasCalendarFixture(driveSource), true, "drive must add a local fixture through the admin UI, read the suggestion, and edit it before saving");
assert.equal(hasHardWeekReviews(driveSource), true,
  "drive must gate and read both attestation and close reviews, cancel refused modals, and use the labelled evidence input");
assert.equal(hasUnrecordedActs(driveSource), true,
  "drive must lose each reported act's audit row once and read the console's warning for it, whole at 360 and 1280");
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
  const noFixture = driveSource.replace('await go(page, "/admin/events");', 'void fixtureTitle;');
  assert.notEqual(noFixture, driveSource, "calendar-fixture mutation must plant");
  assert.equal(hasCalendarFixture(noFixture), false, "omitting the local event-console visit must turn the fixture guard red");
  const unreviewed = driveSource.replace('await m1.fill(ROWS[0].en);', 'void m1;');
  assert.notEqual(unreviewed, driveSource, "calendar-review mutation must plant");
  assert.equal(hasCalendarFixture(unreviewed), false, "leaving a starter event title as a question must turn the guard red");
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
  const voidKeepsItsRow = driveSource.replace('loseNextAuditRow("maswali.week.voided")', "Promise.resolve(true)");
  assert.notEqual(voidKeepsItsRow, driveSource, "lost-row mutation must plant");
  assert.equal(hasUnrecordedActs(voidKeepsItsRow), false, "a void that never loses its audit row must turn the drive guard red");
  const unmeasured = driveSource.replace("fit.left >= 0 && fit.right <= width + 1 && fit.width > 0 && fit.root <= 1", "fit.width >= 0");
  assert.notEqual(unmeasured, driveSource, "warning-fit mutation must plant");
  assert.equal(hasUnrecordedActs(unmeasured), false, "a warning no longer measured inside the viewport must turn the drive guard red");
  console.log("maswali admin checklist RED: omitted guarantee, stale requirement, lost dialog gates, second-officer policy restore and evidence label are caught");
}
