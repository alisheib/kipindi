/**
 * THE OFFICER'S ATTESTATIONS MUST BE REQUIRED, AND MUST SURVIVE THE DECISION.
 *
 * Campaign §6 E-4. "Name matches the ID · Document appears authentic · Selfie
 * matches the ID photo · Sanctions / PEP clear" are the human judgment in a KYC
 * approval — the auto-checks can compare strings, but only a person can say the
 * selfie is the same face. They lived in `useState` in the decision rail and
 * nowhere else, which was two defects wearing one coat:
 *
 *   NOT RECORDED  the audit payload carried only {riskScore, makerChecker}, so the
 *                 one thing an inspector would ask for existed nowhere afterwards.
 *   NOT ENFORCED  the gate was client-side. `approveKycWorkstationAction` took a
 *                 userId and approved — so an approval that opens the withdrawal
 *                 rail could be made with no attestations at all.
 *
 * The second is the reason this file drives `parseAttestations` directly instead of
 * asserting on source text: a client-side gate is exactly what looks correct in
 * review and is absent on the wire.
 */
import { readFileSync } from "node:fs";
import {
  KYC_ATTESTATIONS,
  KYC_ATTESTATION_KEYS,
  parseAttestations,
} from "../src/lib/kyc-attestations.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const RAIL = read("../src/app/admin/kyc/[id]/kyc-decision-rail.tsx");
const ACTIONS = read("../src/app/admin/kyc/[id]/kyc-actions.ts");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const R = stripComments(RAIL);
const A = stripComments(ACTIONS);

const ALL_PASS = { name_matches: "pass", document_authentic: "pass", selfie_match: "pass", sanctions_clear: "pass" };

// ── 1 · The four attestations, one definition ──────────────────────────────
section("1 · the four attestations exist once");

ok("there are exactly four", KYC_ATTESTATIONS.length === 4, String(KYC_ATTESTATIONS.length));
for (const k of ["name_matches", "document_authentic", "selfie_match", "sanctions_clear"]) {
  ok(`${k} is one of them`, KYC_ATTESTATION_KEYS.includes(k as never));
}
ok("every attestation has a human label", KYC_ATTESTATIONS.every((a) => typeof a.label === "string" && a.label.length > 6));

// The rail must not keep a private copy — that drift is what hid E-1(b).
ok("🔴 the rail imports the shared list rather than re-declaring it",
  /import \{ KYC_ATTESTATIONS \} from "@\/lib\/kyc-attestations"/.test(RAIL) &&
  /const JUDGMENT_CHECKS = KYC_ATTESTATIONS/.test(R),
  "a second copy of these keys can silently diverge from the ones the server requires");
ok("…and no literal attestation key is hard-coded in the rail any more",
  !/key: "name_matches"/.test(R));

// ── 2 · The server REQUIRES them ───────────────────────────────────────────
section("2 · all four, or no approval");

ok("all four passing is accepted", parseAttestations(ALL_PASS).ok === true);
ok("…and it is accepted as the JSON string the form actually sends",
  parseAttestations(JSON.stringify(ALL_PASS)).ok === true);

for (const k of KYC_ATTESTATION_KEYS) {
  const missing = { ...ALL_PASS } as Record<string, string>;
  delete missing[k];
  ok(`a MISSING ${k} is refused`, parseAttestations(missing).ok === false,
    "a missing key is not an implied yes");

  const failed = { ...ALL_PASS, [k]: "fail" };
  ok(`a FAILED ${k} is refused`, parseAttestations(failed).ok === false);

  const pendingOne = { ...ALL_PASS, [k]: "pending" };
  ok(`a PENDING ${k} is refused`, parseAttestations(pendingOne).ok === false);
}

ok("nothing at all is refused", parseAttestations(undefined).ok === false);
ok("an empty string is refused", parseAttestations("").ok === false);
ok("malformed JSON is refused", parseAttestations("{not json").ok === false);
ok("an array is refused", parseAttestations([]).ok === false);
ok("null is refused", parseAttestations(null).ok === false);
ok("a padded payload with an unknown key is refused",
  parseAttestations({ ...ALL_PASS, admin_override: "pass" }).ok === false,
  "ignoring extras would let a forged payload pad itself");

// The refusal has to tell the officer WHICH check is outstanding, or the button
// looks broken rather than un-armed.
const partial = parseAttestations({ ...ALL_PASS, selfie_match: "pending" });
ok("the refusal names the outstanding check",
  partial.ok === false && /Selfie matches the ID photo/.test(partial.error), partial.ok === false ? partial.error : "");

// ── 3 · Both officer steps carry them ──────────────────────────────────────
section("3 · approve AND recommend");

ok("the rail sends the attestations with Approve",
  /approveKycWorkstationAction, "Identity approved", \{ attestations: JSON\.stringify\(judg\) \}/.test(R));
ok("the rail sends them with Recommend approval too",
  /recommendKycApprovalAction, "Approval recommended", \{ attestations: JSON\.stringify\(judg\) \}/.test(R),
  "a recommendation is what the second officer relies on");

const approveBody = A.slice(A.indexOf("export async function approveKycWorkstationAction"));
ok("the approve action parses them",
  /parseAttestations\(formData\.get\("attestations"\)\)/.test(approveBody));
ok("…and refuses before it reaches reviewKyc",
  approveBody.indexOf("parseAttestations") < approveBody.indexOf("reviewKyc"),
  "validating after the write would approve first and complain second");

const recBody = A.slice(A.indexOf("export async function recommendKycApprovalAction"), A.indexOf("export async function approveKycWorkstationAction"));
ok("the recommend action parses them", /parseAttestations\(formData\.get\("attestations"\)\)/.test(recBody));

// ── 4 · They land in the tamper-evident record ─────────────────────────────
section("4 · recorded where an inspector reads");

ok("the approval audit payload carries the attestations",
  /action: "kyc\.workstation\.approved"[\s\S]{0,240}attestations: attest\.attested/.test(A));
ok("the recommendation audit payload carries them too",
  /action: "kyc\.approve\.recommended"[\s\S]{0,240}attestations: attest\.attested/.test(A));
ok("the approval audit still carries riskScore and makerChecker",
  /action: "kyc\.workstation\.approved"[\s\S]{0,240}riskScore[\s\S]{0,80}makerChecker/.test(A),
  "the fix must add evidence, not replace it");

// A bypass attempt must be visible, not a silent validation error.
ok("a missing attestation is audited as SECURITY",
  /category: "SECURITY", action: "kyc\.approve\.attestations_missing"/.test(A));
ok("…on both the approve and the recommend path",
  (A.match(/kyc\.approve\.attestations_missing/g) ?? []).length >= 2);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
