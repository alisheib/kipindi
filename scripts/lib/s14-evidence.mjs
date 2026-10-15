/**
 * S14–S16 evidence is a record of observations, not an automated approval.
 * This validator catches missing, duplicated and unsupported completion claims;
 * a human still reads the referenced artifacts and performs the owner acts.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

export const FRAME_IDS = {
  home: ["H01", "H02", "H03", "H04", "H05", "H06", "H07", "H08", "H09", "H10", "H11", "H12", "H13"],
  "bet-sheet": ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11"],
  "low-balance": ["L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08", "L09"],
  deposit: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11"],
  "how-to-play": ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"],
};
export const PROOF_IDS = ["local-e2e", "visual-matrix", "adversarial", "gate-census", "agency-preview"];
const EVIDENCE_ROOT = `docs${sep}qa${sep}`;

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const sameSet = (actual, expected) => actual.length === expected.length && new Set(actual).size === actual.length
  && expected.every((id) => actual.includes(id));
const sameOrder = (actual, expected) => actual.length === expected.length
  && expected.every((id, index) => actual[index] === id);

/** A committed, redacted read record; payment credentials and personal data stay out of Git. */
function evidenceError(value, root, now, fileExists) {
  if (!object(value)) return "missing evidence record";
  if (!text(value.path) || !value.path.startsWith("docs/qa/") || value.path.includes("..") || value.path.includes("\\")) {
    return "evidence path must be a relative docs/qa/ file";
  }
  if (value.path === "docs/qa/vodacom-s14-evidence.json") return "the checklist cannot be its own evidence";
  const absolute = resolve(root, value.path);
  if (!absolute.startsWith(resolve(root, EVIDENCE_ROOT))) return "evidence path escapes docs/qa";
  if (!fileExists(absolute)) return "evidence file does not exist";
  if (!text(value.checkedBy)) return "checkedBy is missing";
  if (!/^[0-9a-f]{40}$/i.test(value.commit ?? "")) return "commit must be a full Git SHA";
  const when = Date.parse(value.checkedAt ?? "");
  if (!Number.isFinite(when) || when > now + 5 * 60_000) return "checkedAt must be a real, non-future timestamp";
  return null;
}

/** Return every structural error. `require*` makes a later phase fail closed. */
export function validateS14Evidence(record, {
  root = process.cwd(),
  now = Date.now(),
  fileExists = existsSync,
  requireS14 = false,
  requireS15 = false,
  requireS16 = false,
} = {}) {
  const errors = [];
  const need14 = requireS14 || requireS15 || requireS16;
  const need15 = requireS15 || requireS16;
  const add = (label, message) => errors.push(`${label}: ${message}`);
  const checkEvidence = (label, evidence, required) => {
    if (evidence === null || evidence === undefined) {
      if (required) add(label, "pending evidence");
      return false;
    }
    const error = evidenceError(evidence, root, now, fileExists);
    if (error) add(label, error);
    return !error;
  };

  if (!object(record) || record.schemaVersion !== 1) return ["record: schemaVersion must be 1"];
  if (need14 || requireS16) {
    let scripts = null;
    try { scripts = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts; } catch { /* reported below */ }
    if (need14 && !text(scripts?.["e2e:journey"])) add("local-e2e", "package.json has no e2e:journey command");
    if (requireS16 && !text(scripts?.["test:shelved"])) add("s16", "package.json has no test:shelved command");
  }
  for (const field of ["plan", "deck", "designAuthority"]) {
    if (!text(record[field]) || record[field].includes("..") || !fileExists(resolve(root, record[field]))) {
      add(field, "source document is missing");
    }
  }

  const frames = Array.isArray(record.frames) ? record.frames : [];
  const frameIds = frames.map((f) => f?.id);
  if (!sameOrder(frameIds, Object.keys(FRAME_IDS))) add("frames", "exactly the five deck frames are required in order");
  for (const frame of frames) {
    if (!object(frame) || !FRAME_IDS[frame.id]) continue;
    if (!text(frame.deckImage) || !fileExists(resolve(root, frame.deckImage))) add(frame.id, "deck image is missing");
    const checks = Array.isArray(frame.checks) ? frame.checks : [];
    if (!sameOrder(checks.map((c) => c?.id), FRAME_IDS[frame.id])) add(frame.id, "required per-element checks are missing, reordered or duplicated");
    for (const check of checks) {
      if (!object(check) || !text(check.check) || typeof check.checked !== "boolean") add(`${frame.id}.${check?.id ?? "?"}`, "check text and boolean tick are required");
    }
    const ticked = checks.some((c) => c?.checked === true);
    checkEvidence(`${frame.id}.evidence`, frame.evidence, need14 || ticked);
    if (need14 && checks.some((c) => c?.checked !== true)) add(frame.id, "every element must be ticked");
  }

  const proofs = Array.isArray(record.proofs) ? record.proofs : [];
  if (!sameSet(proofs.map((p) => p?.id), PROOF_IDS)) add("proofs", "the five S14 proofs are required, once each");
  for (const proof of proofs) {
    if (!object(proof) || !PROOF_IDS.includes(proof.id)) continue;
    if (!text(proof.check)) add(proof.id, "proof description is missing");
    checkEvidence(proof.id, proof.evidence, need14);
  }

  const staff = record.productionStaffJourney;
  if (!object(staff) || staff.stakeTzs !== 1000) add("productionStaffJourney", "the planned stake is exactly TZS 1,000");
  else {
    const claimed = staff.evidence !== null && staff.evidence !== undefined;
    checkEvidence("productionStaffJourney.evidence", staff.evidence, need14);
    if (need14 || claimed) {
      if (!["existing-balance", "deposit"].includes(staff.fundingMode)) add("productionStaffJourney", "fundingMode must describe the real path");
      if (!text(staff.betReference)) add("productionStaffJourney", "bet reference is missing");
      if (staff.fundingMode === "deposit" && (staff.depositAmountTzs !== 1000 || !text(staff.depositReference))) {
        add("productionStaffJourney", "a real TZS 1,000 deposit and its reference are required when fundingMode is deposit");
      }
    }
  }

  const agency = record.agencyDecision;
  if (!object(agency) || !["pending", "signed", "owner-override"].includes(agency.decision)) add("agencyDecision", "decision must be pending, signed or owner-override");
  else if (agency.decision !== "pending" || need14) {
    if (agency.decision === "pending") add("agencyDecision", "written sign-off or Ali's explicit override is pending");
    if (agency.decision === "signed" && !text(agency.decidedBy)) add("agencyDecision", "agency signatory is missing");
    if (agency.decision === "owner-override" && agency.decidedBy !== "Ali") add("agencyDecision", "only Ali may record the owner override");
    checkEvidence("agencyDecision.evidence", agency.evidence, agency.decision !== "pending" || need14);
  }

  const s15 = record.s15;
  if (!object(s15)) add("s15", "section is missing");
  else {
    checkEvidence("s15.baseline14Days", s15.baseline14Days, need15);
    checkEvidence("s15.integratedRelease", s15.integratedRelease, need15);
    checkEvidence("s15.productionConfiguration", s15.productionConfiguration, need15);
    checkEvidence("s15.rollbackReady", s15.rollbackReady, need15);
    checkEvidence("s15.ownerGo", s15.ownerGo, need15);
    if (s15.ownerGo && s15.ownerGo.checkedBy !== "Ali") add("s15.ownerGo", "launch go must come from Ali");
    const launchAt = s15.launchAt === null ? null : Date.parse(s15.launchAt);
    if (s15.launchAt !== null && (!Number.isFinite(launchAt) || launchAt > now + 5 * 60_000)) add("s15.launchAt", "invalid or future launch time");
    checkEvidence("s15.productionReadback", s15.productionReadback, requireS16 || s15.launchAt !== null);
  }

  const s16 = record.s16;
  if (!object(s16)) add("s16", "section is missing");
  else {
    for (const field of ["sevenDayMeasures", "noRollback", "agencyAcknowledgment", "shelvingProof"]) {
      checkEvidence(`s16.${field}`, s16[field], requireS16);
    }
  }
  if (requireS16) {
    const launchAt = Date.parse(s15?.launchAt ?? "");
    if (!Number.isFinite(launchAt) || now - launchAt < 7 * 86_400_000) add("s16", "seven full days after the actual S15 launch have not elapsed");
  }
  return errors;
}
