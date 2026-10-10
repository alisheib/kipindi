/**
 * THE ANCHORS `red:kyc-typed-only` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ WHY A SIDECAR. `test:red-anchors` §3 re-resolves every anchor below on every `test:all` run, WITHOUT executing a
 * mutation (an auditor that ran one would be the mutation-left-in-the-tree hazard wearing a lab coat), and its §4
 * ratchet counts the harnesses that do not declare. ⛔ Raising that ceiling is the one edit that file forbids, so this
 * harness declares from its first day.
 *
 * ⭐ ONE DEFINITION, TWO CONSUMERS. `kyc-typed-only-red.mjs` imports `CASES` to run them; `red-anchors.test.mts`
 * imports `MUTATIONS` — DERIVED from `CASES` below — to audit them. No hand-kept second list to go stale.
 *
 * ⭐ WHAT EACH CASE PUTS BACK is a way the 2026-10-10 ruling (players: typed details, instant approval, officers after;
 * agents: photos and an officer) could quietly come undone: an uploader on the typed track, a routing reason skipped,
 * the officer's durable trail forgotten (review R1.3), the machine lifting a hold, a refusal of an unchecked automatic
 * approval landing with no hold (review R1.2), the approved number released by a correction, the posted date of birth
 * believed, a photo statement recorded on a typed case, the image route's accept-list derived again, an officer
 * approving or marking checked a version they never saw, an agent gate satisfied by an automatic approval — and, from the
 * second review (R5), the freeze skipped for an automatic approval back with an officer, a re-open that lifts the hold
 * of a machine-only approval, a photo stamp satisfied by photos uploaded after it, an agent-rail approval recorded as the
 * post-check, a failed attach keeping its token, an admitted under-18 date that stops routing. Each must turn `test:kyc-typed-only` red on the FAIL line `expect`
 * names — red for another reason is reported as WRONG REASON, never as caught.
 *
 * ⚠️ MULTI-LINE ANCHORS ARE TEMPLATE LITERALS WITH REAL LINE BREAKS; `red-anchor.mjs` matches them in the target
 * file's own line endings (a CRLF checkout included).
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all`: data only, repo-relative POSIX paths.
 */

/** @typedef {{ file: string, from: string, to: string }} RedEdit */
/** @typedef {{ name: string, gate: string[], expect: string, edits: RedEdit[] }} RedCase */
const SVC = "src/lib/server/kyc-service.ts";
const PAGE = "src/app/profile/kyc/page.tsx";
const ROUTE = "src/app/api/admin/kyc-doc/route.ts";
const CHECKS = "src/lib/kyc-auto-checks.ts";
const ATTEST = "src/lib/kyc-attestations.ts";
const AGENT_ID = "src/lib/server/agent-identity.ts";
const APPROVAL = "src/lib/kyc-approval.ts";
const ID_DOCS = "src/lib/id-documents.ts";

export const GATE = ["tsx", "scripts/kyc-typed-only.test.mts"];

/** @type {RedCase[]} */
export const CASES = [
  // ── G1 · the typed track uploads nothing ─────────────────────────────────────────────────────────────────────────
  {
    name: "the uploader comes back on the typed track (planted in the shared identity form)",
    gate: GATE,
    expect: "the typed track draws no uploader",
    edits: [{
      file: PAGE,
      from: `              <SubmitButton
                label={agentMode ? t.profile.continueVerification : needsInfo ? t.profile.sendCorrections : t.kycGate.ctaStart}`,
      to: `              <KycDocUploader label={t.profile.selfie} docType="SELFIE" attached={false} />
              <SubmitButton
                label={agentMode ? t.profile.continueVerification : needsInfo ? t.profile.sendCorrections : t.kycGate.ctaStart}`,
    }],
  },
  {
    name: "attachExtraDocument is exported again (an officer's extra-document upload slot)",
    gate: GATE,
    expect: "exports no attachExtraDocument",
    edits: [{
      file: SVC,
      from: `export async function getKycStatus(userId: string) {`,
      to: `export async function attachExtraDocument(userId: string, reqId: string, image: string): Promise<ServiceResult> {
  return { ok: false, error: [userId, reqId, image.length].join(" "), code: "INVALID" };
}

export async function getKycStatus(userId: string) {`,
    }],
  },

  // ── G3 · routing, provenance, holds ──────────────────────────────────────────────────────────────────────────────
  {
    name: "verifyIdentity skips the officer-provenance route (an officer's refusal is approved by the machine on retry)",
    gate: GATE,
    expect: "retried in one press",
    edits: [{
      file: SVC,
      from: `        officerProvenance: hasOfficerProvenance(base) || side.officerHistory,`,
      to: `        officerProvenance: false,`,
    }],
  },
  {
    // ⭐ 2026-10-10, review R1.3: the ROW alone again — a row the old build restarted (reviewerId null) after an officer's
    // refusal is then approved by the machine, because only the durable trail still remembers the officer.
    name: "verifyIdentity forgets the durable officer trail (provenance read from the row alone)",
    gate: GATE,
    expect: "a durable officer refusal routes",
    edits: [{
      file: SVC,
      from: `        officerProvenance: hasOfficerProvenance(base) || side.officerHistory,`,
      to: `        officerProvenance: hasOfficerProvenance(base),`,
    }],
  },
  {
    // ⭐ 2026-10-10, review R1.2: a recoverable refusal of an unchecked AUTOMATIC approval lands with the money still
    // flowing — `approvedAt` keeps withdrawal open, and no officer hold is required any more.
    name: "reviewKyc stops requiring the freeze on a recoverable refusal of an unchecked automatic approval",
    gate: GATE,
    expect: "refused without the wallet freeze",
    edits: [{
      file: SVC,
      from: `    if (!isFinalRefusal(rejectCode) && uncheckedAutomaticApproval(k) && !freezeWanted.reason) {`,
      to: `    if (false && !isFinalRefusal(rejectCode) && uncheckedAutomaticApproval(k) && !freezeWanted.reason) {`,
    }],
  },
  {
    name: "startKyc's restart drops the officer who refused (the restarted identity is approved by the machine)",
    gate: GATE,
    expect: "restarted by startKyc",
    edits: [{
      file: SVC,
      from: `  const reviewer = existing?.status === "REJECTED" && existing.reviewerId`,
      to: `  const reviewer = false && existing?.status === "REJECTED" && existing.reviewerId`,
    }],
  },
  {
    name: "an OFFICER wallet hold stops routing (only an identity hold still routes)",
    gate: GATE,
    expect: "an OFFICER wallet hold routes",
    edits: [{
      file: CHECKS,
      from: `const ROUTING_HOLDS = new Set(["OFFICER", "IDENTITY_REFUSED"]);`,
      to: `const ROUTING_HOLDS = new Set(["IDENTITY_REFUSED"]);`,
    }],
  },
  {
    name: "the automatic approval lifts a stale identity hold (the lift loses its `if (officer)`)",
    gate: GATE,
    expect: "the automatic path never lifts a hold",
    edits: [{
      file: SVC,
      from: `  if (officer) await liftStaleIdentityHoldAfterDecision(userId, officer.officerId, k.id, "APPROVE");`,
      to: `  await liftStaleIdentityHoldAfterDecision(userId, officer?.officerId ?? "system", k.id, "APPROVE");`,
    }],
  },

  // ── G4 · the approved number stays held through a correction ────────────────────────────────────────────────────
  {
    name: "the approved-once number lock is dropped (a correction can replace the approved number)",
    gate: GATE,
    expect: "refused identity_number_locked",
    edits: [{
      file: SVC,
      from: `    if (k.status === "ADDITIONAL_INFO_REQUIRED" && !!k.approvedAt && next && !!k.idType && !!k.idNumber && !sameTuple(k, next.idType, next.idNumber)) {`,
      to: `    if (false && k.status === "ADDITIONAL_INFO_REQUIRED" && !!k.approvedAt && next && !!k.idType && !!k.idNumber && !sameTuple(k, next.idType, next.idNumber)) {`,
    }],
  },

  // ── G5 · the account's date of birth ─────────────────────────────────────────────────────────────────────────────
  {
    name: "the posted date of birth is believed over the account's",
    gate: GATE,
    expect: "the posted date of birth is ignored",
    edits: [{
      file: SVC,
      from: `  const dob = dobFromAccount ? accountDob : typedDob;`,
      to: `  const dob = typedDob || accountDob;`,
    }],
  },

  // ── G6 · attestation sets by mode ────────────────────────────────────────────────────────────────────────────────
  {
    name: "a photo attestation is accepted on a typed case (the other set's keys stop counting as unknown)",
    gate: GATE,
    expect: "a photo key on a typed case is refused",
    edits: [{
      file: ATTEST,
      from: `  const unknown = Object.keys(got).filter((k) => !keys.includes(k));`,
      to: `  const unknown = Object.keys(got).filter((k) => !keys.includes(k) && !attestationKeys("photo").includes(k));`,
    }],
  },

  // ── G7 · the legacy image route ──────────────────────────────────────────────────────────────────────────────────
  {
    name: "the officer's image route derives its accept-list from ALL_DOC_SLOTS again (legacy NIDA images stop opening)",
    gate: GATE,
    expect: "accepts exactly LEGACY_KYC_DOC_SLOTS",
    edits: [{
      file: ROUTE,
      from: `import { LEGACY_KYC_DOC_SLOTS } from "@/lib/id-documents";`,
      to: `import { ALL_DOC_SLOTS, LEGACY_KYC_DOC_SLOTS } from "@/lib/id-documents";`,
    }, {
      file: ROUTE,
      from: `const DOC_TYPES = new Set<string>(LEGACY_KYC_DOC_SLOTS);`,
      to: `const DOC_TYPES = new Set<string>(ALL_DOC_SLOTS);`,
    }],
  },

  // ── G9 · the agent gate ──────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "the agent gate accepts a bare APPROVED (an automatic typed approval opens the agent programme)",
    gate: GATE,
    expect: "the agent gate refuses an automatic typed approval",
    edits: [{
      file: AGENT_ID,
      from: `  if (!kyc || kyc.status !== "APPROVED" || !kyc.photoVerifiedAt) return false;
  return photoSetStampedBy(kyc.idType, kyc.documents, kyc.photoVerifiedAt);`,
      to: `  return !!kyc && kyc.status === "APPROVED";`,
    }],
  },

  // ── G10 · versions ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "markPostChecked drops its version check (an officer marks checked a row that changed since they opened it)",
    gate: GATE,
    expect: "markPostChecked refuses a version",
    edits: [{
      file: SVC,
      from: `      return { ok: false as const, error: "Only an automatic approval not yet checked can be marked checked.", code: "INVALID" as const };
    }
    if (!sameRowVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };`,
      to: `      return { ok: false as const, error: "Only an automatic approval not yet checked can be marked checked.", code: "INVALID" as const };
    }`,
    }],
  },
  {
    name: "reviewKyc APPROVE drops its version check (an approval lands on details the officer never saw)",
    gate: GATE,
    expect: "reviewKyc APPROVE refuses a stale version",
    edits: [{
      file: SVC,
      from: `      if (!sameRowVersion(k, opts.version)) return { ok: false as const, error: STALE_CASE, code: "INVALID" as const };
      if (!isIdDocType(k.idType) || !k.idNumber) {`,
      to: `      if (!isIdDocType(k.idType) || !k.idNumber) {`,
    }],
  },

  // ── §13 · the second review (R5, 2026-10-10) ─────────────────────────────────────────────────────────────────────
  {
    // R5.1a: the predicate asks a status again — an automatic approval moved to PENDING_REVIEW (a photo send, a routed
    // correction, a corrected date of birth) is refused with the money still flowing.
    name: "the unchecked-automatic-approval predicate skips PENDING_REVIEW again (the freeze is not required there)",
    gate: GATE,
    expect: "is refused WITHOUT the freeze",
    edits: [{
      file: APPROVAL,
      from: `  return !!facts?.approvedAt && !!facts?.autoApprovedAt && !facts?.postCheckedAt;`,
      to: `  return (facts as { status?: string } | null | undefined)?.status !== "PENDING_REVIEW" && !!facts?.approvedAt && !!facts?.autoApprovedAt && !facts?.postCheckedAt;`,
    }],
  },
  {
    // R5.1b: a re-open lifts the identity hold of an approval only the machine made — payouts reopen on it.
    name: "reopenFinalRefusal lifts the identity hold of a machine-only approval again",
    gate: GATE,
    expect: "the IDENTITY_REFUSED hold is KEPT",
    edits: [{
      file: SVC,
      from: `    const keepHold = uncheckedAutomaticApproval(k);`,
      to: `    const keepHold = false;`,
    }],
  },
  {
    // R5.2: the stamp stops asking WHEN its photos were uploaded — a stray stamp is satisfied by photos no officer saw.
    name: "a photo stamp is satisfied by photos uploaded after it (the upload time is no longer asked)",
    gate: GATE,
    expect: "uploaded AFTER the stamp never satisfies it",
    edits: [{
      file: ID_DOCS,
      from: `    return Number.isFinite(uploadedMs) && uploadedMs <= stampMs;`,
      to: `    return true;`,
    }],
  },
  {
    // R5.3: any officer approval counts as the post-check again — the agent rail checks a flagged approval unseen.
    name: "an officer approval without the workstation's statements is recorded as the post-check again",
    gate: GATE,
    expect: "leaves the automatic approval UNCHECKED",
    edits: [{
      file: SVC,
      from: `  const checkedNow = !!officer && officer.via === "workstation" && officer.attested && !!officer.attestations && uncheckedAutomaticApproval(k);`,
      to: `  const checkedNow = !!officer && uncheckedAutomaticApproval(k);`,
    }],
  },
  {
    // R5.5: an attach whose upload failed keeps its token — the player pays for our failure.
    name: "a failed attach no longer hands its rate-limit token back",
    gate: GATE,
    expect: "the failed upload handed its token back",
    edits: [{
      file: SVC,
      from: `    if (!landed) await rateRefundAsync(kycAttachRateKey(userId), "kyc.attach");`,
      to: `    if (false) await rateRefundAsync(kycAttachRateKey(userId), "kyc.attach");`,
    }],
  },
  {
    // R5.8: the admitted under-18 date stops routing — the adult date retyped a minute later is approved at once.
    name: "an admitted under-18 date of birth stops routing the next press",
    gate: GATE,
    expect: "the adult date typed next is ROUTED",
    edits: [{
      file: SVC,
      from: `  const underageAttempt = await readUnderageAttempt(userId);`,
      to: `  const underageAttempt = false;`,
    }],
  },
];

/**
 * The flat view `test:red-anchors` §3 audits: one entry per EDIT, because one entry per case would leave the second
 * half of a two-site defect unaudited. ⛔ DERIVED, never hand-written — see the header.
 * @type {{ name: string, file: string, suite: string, from: string, to: string }[]}
 */
export const MUTATIONS = CASES.flatMap((c) =>
  c.edits.map((e, i) => ({
    name: c.edits.length > 1 ? `${c.name} [${i + 1}/${c.edits.length}]` : c.name,
    file: e.file,
    suite: c.gate[1],
    from: e.from,
    to: e.to,
  })),
);
