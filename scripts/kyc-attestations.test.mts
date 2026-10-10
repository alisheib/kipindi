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
 *
 * ⭐ TWO SETS SINCE 2026-10-10 (owner ruling: players verify identity with TYPED
 * details, agents keep photo ID + selfie). A typed case has no image, so "the selfie
 * matches" would be an officer signing for something they never saw. The PHOTO set
 * (the four statements above) stays for a case with the full photo set on file; a
 * TYPED case takes its own four (details genuine · number and its flags reviewed ·
 * no other account · sanctions/PEP clear). The single list `KYC_ATTESTATIONS` was
 * REMOVED, so §1 proves it is gone rather than counting it, and every check below
 * runs once per set: the strict parser now also refuses a key of the OTHER set —
 * a photo attestation posted on a typed case is the forgery this file exists for.
 */
import { readFileSync } from "node:fs";
import { decomment as stripComments } from "./lib/decomment.mts";
import * as ATTEST from "../src/lib/kyc-attestations.ts";
import {
  KYC_ATTESTATION_SETS,
  ATTESTATION_SET_ID,
  attestationKeys,
  parseAttestations,
  type KycAttestationMode,
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
const SERVICE = read("../src/lib/server/kyc-service.ts");
const R = stripComments(RAIL);
const A = stripComments(ACTIONS);
const S = stripComments(SERVICE);

const PHOTO_KEYS = ["name_matches", "document_authentic", "selfie_match", "sanctions_clear"];
const TYPED_KEYS = ["details_genuine", "number_reviewed", "no_other_account", "sanctions_clear"];
const allPass = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, "pass"])) as Record<string, string>;
const ALL_PASS: Record<KycAttestationMode, Record<string, string>> = { photo: allPass(PHOTO_KEYS), typed: allPass(TYPED_KEYS) };
const MODES: KycAttestationMode[] = ["photo", "typed"];

// ── 1 · Two sets, one definition — and the old single list is gone ─────────
section("1 · the two attestation sets exist once");

for (const [mode, want] of [["photo", PHOTO_KEYS], ["typed", TYPED_KEYS]] as const) {
  const set = KYC_ATTESTATION_SETS[mode];
  ok(`the ${mode} set has exactly four`, set.length === 4, String(set.length));
  ok(`the ${mode} set is exactly ${want.join(" · ")}, in that order`,
    JSON.stringify(attestationKeys(mode)) === JSON.stringify(want), JSON.stringify(attestationKeys(mode)));
  ok(`every ${mode} attestation has a human label`,
    set.every((a) => typeof a.label === "string" && a.label.length > 6));
}
// 🔴 The point of the second set: a typed case has no image, so nothing in its set may attest to one.
ok("🔴 the TYPED set attests to no image — no selfie, no document's appearance",
  !attestationKeys("typed").some((k) => /selfie|photo|image|document_authentic/.test(k)) &&
  !KYC_ATTESTATION_SETS.typed.some((a) => /selfie|photo|image|appears authentic/i.test(a.label)),
  JSON.stringify(KYC_ATTESTATION_SETS.typed));
ok("…and the PHOTO set still carries the selfie statement (an agent's photo case keeps it)",
  attestationKeys("photo").includes("selfie_match"));
ok("each set has its dated id, carried by every audit row that records attestations",
  ATTESTATION_SET_ID.photo === "photo-2026-09" && ATTESTATION_SET_ID.typed === "typed-2026-10",
  JSON.stringify(ATTESTATION_SET_ID));
// ⛔ REMOVED, NOT RENAMED (2026-10-10): a caller still importing the single list would parse a typed case
// against the photo set. Proving the export is gone is the only honest replacement for counting it.
ok("🔴 the single list KYC_ATTESTATIONS is no longer exported", !("KYC_ATTESTATIONS" in ATTEST));
ok("…nor KYC_ATTESTATION_KEYS", !("KYC_ATTESTATION_KEYS" in ATTEST));

// The rail must not keep a private copy — that drift is what hid E-1(b).
ok("🔴 the rail imports the shared sets rather than re-declaring them",
  /import \{ KYC_ATTESTATION_SETS, type KycAttestationMode \} from "@\/lib\/kyc-attestations"/.test(RAIL) &&
  /KYC_ATTESTATION_SETS\[judgmentMode\]/.test(R),
  "a second copy of these keys can silently diverge from the ones the server requires");
ok("…and no literal attestation key of either set is hard-coded in the rail",
  ![...PHOTO_KEYS, ...TYPED_KEYS].some((k) => new RegExp(`key: "${k}"`).test(R)));
ok("…and a post-check always takes the TYPED set",
  /const judgmentMode: KycAttestationMode = stage === "post_check" \? "typed" : mode/.test(R));

// ── 2 · The server REQUIRES them, per set ──────────────────────────────────
section("2 · all four of THIS case's set, or no approval");

for (const mode of MODES) {
  const other: KycAttestationMode = mode === "photo" ? "typed" : "photo";
  const full = ALL_PASS[mode];
  const parsed = parseAttestations(full, mode);
  ok(`[${mode}] all four passing is accepted`, parsed.ok === true);
  ok(`[${mode}] …and the parse carries the set's dated id`, parsed.ok === true && parsed.setId === ATTESTATION_SET_ID[mode] && parsed.mode === mode);
  ok(`[${mode}] …and it is accepted as the JSON string the form actually sends`,
    parseAttestations(JSON.stringify(full), mode).ok === true);

  for (const k of attestationKeys(mode)) {
    const missing = { ...full } as Record<string, string>;
    delete missing[k];
    ok(`[${mode}] a MISSING ${k} is refused`, parseAttestations(missing, mode).ok === false,
      "a missing key is not an implied yes");

    const failed = { ...full, [k]: "fail" };
    ok(`[${mode}] a FAILED ${k} is refused`, parseAttestations(failed, mode).ok === false);

    const pendingOne = { ...full, [k]: "pending" };
    ok(`[${mode}] a PENDING ${k} is refused`, parseAttestations(pendingOne, mode).ok === false);
  }

  ok(`[${mode}] nothing at all is refused`, parseAttestations(undefined, mode).ok === false);
  ok(`[${mode}] an empty string is refused`, parseAttestations("", mode).ok === false);
  ok(`[${mode}] malformed JSON is refused`, parseAttestations("{not json", mode).ok === false);
  ok(`[${mode}] an array is refused`, parseAttestations([], mode).ok === false);
  ok(`[${mode}] null is refused`, parseAttestations(null, mode).ok === false);
  ok(`[${mode}] a padded payload with an unknown key is refused`,
    parseAttestations({ ...full, admin_override: "pass" }, mode).ok === false,
    "ignoring extras would let a forged payload pad itself");

  // 🔴 THE CROSS-SET FORGERY. Every key of THIS set passes, plus one key that exists only in the other set — the
  // shape a stale rail (or a forged post) would send. The other set's key is UNKNOWN here, and refused.
  const foreign = attestationKeys(other).find((k) => !attestationKeys(mode).includes(k)) as string;
  ok(`[${mode}] 🔴 a key of the ${other} set (${foreign}) on a ${mode} case is refused`,
    parseAttestations({ ...full, [foreign]: "pass" }, mode).ok === false);
  ok(`[${mode}] …and the ${other} set's full payload is refused on a ${mode} case`,
    parseAttestations(ALL_PASS[other], mode).ok === false);
}

// A mode the parser does not know is not "the photo set by default" — it is a refusal.
ok("an unknown mode is refused", parseAttestations(ALL_PASS.photo, "selfie" as never).ok === false);
ok("…and a missing mode is refused", parseAttestations(ALL_PASS.typed, undefined as never).ok === false);

// The refusal has to tell the officer WHICH check is outstanding, or the button
// looks broken rather than un-armed.
const partialPhoto = parseAttestations({ ...ALL_PASS.photo, selfie_match: "pending" }, "photo");
ok("[photo] the refusal names the outstanding check",
  partialPhoto.ok === false && /Selfie matches the ID photo/.test(partialPhoto.error), partialPhoto.ok === false ? partialPhoto.error : "");
const partialTyped = parseAttestations({ ...ALL_PASS.typed, number_reviewed: "pending" }, "typed");
ok("[typed] the refusal names the outstanding check",
  partialTyped.ok === false && /Document number and its flags reviewed/.test(partialTyped.error), partialTyped.ok === false ? partialTyped.error : "");

// ── 3 · Every officer step carries them ────────────────────────────────────
section("3 · approve, recommend AND mark checked");

ok("the rail sends the attestations (and the mode it rendered) with Approve",
  /approveKycWorkstationAction, "Identity approved", \{ mode, attestations: attested\(\) \}/.test(R));
ok("the rail sends them with Recommend approval too",
  /recommendKycApprovalAction, "Approval recommended", \{ attestations: attested\(\) \}/.test(R),
  "a recommendation is what the second officer relies on");
ok("the rail sends them with Mark checked (a post-check of an automatic approval)",
  /markPostCheckedAction, "Marked checked", \{ attestations: attested\(\) \}/.test(R));
ok("…and the payload is rebuilt from the set ON SCREEN, so a stale key of the other set never travels",
  /const attested = \(\) => JSON\.stringify\(Object\.fromEntries\(judgmentChecks\.map\(/.test(R));

const approveBody = A.slice(A.indexOf("export async function approveKycWorkstationAction"), A.indexOf("export async function rejectKycWorkstationAction"));
ok("the approve action parses them against THIS case's set",
  /parseAttestations\(formData\.get\("attestations"\), mode\)/.test(approveBody));
ok("…and the set comes from the ROW, never from the form",
  /const mode = caseMode\(kyc\)/.test(approveBody) && /postedMode !== mode/.test(approveBody),
  "a form that names its own set could post the typed set on a photo case");
ok("…and refuses before it reaches reviewKyc",
  approveBody.indexOf("parseAttestations") > -1 && approveBody.indexOf("parseAttestations") < approveBody.indexOf("reviewKyc"),
  "validating after the write would approve first and complain second");

const recBody = A.slice(A.indexOf("export async function recommendKycApprovalAction"), A.indexOf("export async function approveKycWorkstationAction"));
ok("the recommend action parses them against THIS case's set",
  /parseAttestations\(formData\.get\("attestations"\), mode\)/.test(recBody) && /const mode = caseMode\(kyc\)/.test(recBody));

const postBody = A.slice(A.indexOf("export async function markPostCheckedAction"), A.indexOf("export async function correctDateOfBirthAction"));
ok("the mark-checked action requires the TYPED set",
  /parseAttestations\(formData\.get\("attestations"\), "typed"\)/.test(postBody) &&
  postBody.indexOf("parseAttestations") < postBody.indexOf("markPostChecked("));

// The action is manners; the service is the law. Both re-validate on the server side of the wire.
ok("🔴 reviewKyc re-validates posted attestations against the case's own set",
  /parseAttestations\(opts\.attestations, caseMode\)/.test(S));
ok("🔴 markPostChecked re-validates against the typed set",
  /parseAttestations\(opts\.attestations, "typed"\)/.test(S));

// ── 4 · They land in the tamper-evident record ─────────────────────────────
section("4 · recorded where an inspector reads");

ok("the approval audit payload carries the attestations and which set they are",
  /action: "kyc\.workstation\.approved"[\s\S]{0,260}attestationSet: attest\.setId, attestations: attest\.attested/.test(A));
ok("the recommendation audit payload carries them too — bound to the version recommended",
  /action: "kyc\.approve\.recommended"[\s\S]{0,260}version: kycRowVersion\(kyc\)[\s\S]{0,80}attestations: attest\.attested/.test(A));
ok("the approval audit still carries riskScore and makerChecker",
  /action: "kyc\.workstation\.approved"[\s\S]{0,240}riskScore[\s\S]{0,80}makerChecker/.test(A),
  "the fix must add evidence, not replace it");
ok("the post-check audit carries the typed set's id and the attestations",
  /action: "kyc\.post_checked"[\s\S]{0,260}attestationSet: ATTESTATION_SET_ID\.typed, attestations: attest\.attested/.test(S));
// ⭐ …and ONLY when the officer posted it (2026-10-10, reviews R1.5/R4.2): the agent-approval call posts no attestations,
// and an inspector reads a set id as "this officer made these statements", so that approval records a null set.
ok("the service's approval audit names the set an officer used — and null when none was posted",
  /action: "kyc\.approved"[\s\S]{0,260}officer\.attested \? \{ attestationSet: ATTESTATION_SET_ID\[officer\.mode\] \} : \{ attestationSet: null \}/.test(S)
  && /attested: opts\.attestations !== undefined/.test(S));

// A bypass attempt must be visible, not a silent validation error.
ok("a missing attestation is audited as SECURITY",
  /category: "SECURITY", action: "kyc\.approve\.attestations_missing"/.test(A));
ok("…on both the approve and the recommend path",
  (A.match(/kyc\.approve\.attestations_missing/g) ?? []).length >= 2);
ok("…and on the mark-checked path",
  /category: "SECURITY", action: "kyc\.post_check\.attestations_missing"/.test(A));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
