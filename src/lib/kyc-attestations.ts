/**
 * The officer's KYC attestations — ONE definition, shared by the decision rail
 * that collects them and the server action that requires and records them.
 *
 * Campaign §6 E-4. These statements are the human judgment in a KYC decision:
 * the auto-checks can compare strings, but only a person can say the selfie is
 * the same face, or that a typed name looks like a real person's. They used to
 * live in `useState` inside `kyc-decision-rail.tsx` and nothing else — they armed
 * the Approve button and were then discarded at the moment they were made. Two
 * separate defects:
 *
 *  1. NOT RECORDED. The audit payload carried `{riskScore, makerChecker}`, so the
 *     one thing an inspector would ask for — that a named officer positively
 *     attested the selfie matched the ID — existed nowhere afterwards.
 *  2. NOT ENFORCED. The gate was client-side only. The server took `userId` and
 *     approved, so an approval that opens the withdrawal gate could be made with
 *     no attestations at all — the checklist was decorative from the server's
 *     point of view.
 *
 * ⭐ TWO SETS SINCE 2026-10-10 (owner ruling — players verify with typed details,
 * agents keep photo KYC). A PHOTO case (the full photo set and a selfie on file:
 * every agent applicant, and every player before 2026-10-10) keeps the four
 * statements it always had. A TYPED case has no image to attest to, so "the
 * selfie matches" would be an officer signing for something they never saw — it
 * gets its own four, about what the officer CAN check: the details, the number
 * and its flags, other accounts, and the sanctions/PEP lists. Each set has a
 * dated id (`ATTESTATION_SET_ID`) that the audit row carries, so an inspector
 * reading a decision knows which statements the officer made.
 *
 * WHY THE AUDIT PAYLOAD AND NOT A COLUMN. A column on `KycSubmission` would be
 * queryable, but it is also mutable: an attestation that can be silently edited
 * later is weaker evidence, not stronger. The audit log is append-only and
 * hash-chained (`AUDIT_CHAIN_SECRET`), and it is retained — `privacy.ts` blocks
 * DSAR erasure precisely to preserve the 7-year AML window. So the attestation
 * lands in the same tamper-evident record, at the same instant, attributed to the
 * same officer, as the decision it justifies.
 *
 * The sets live here rather than in the client so the two halves cannot drift.
 * That drift is exactly what hid E-1(b), where a label map was keyed on six enum
 * members that did not exist.
 */

/** Which case an officer is deciding: one with the full photo set on file, or typed details only. */
export type KycAttestationMode = "photo" | "typed";

export const KYC_ATTESTATION_SETS = {
  photo: [
    { key: "name_matches", label: "Name matches the ID" },
    { key: "document_authentic", label: "Document appears authentic" },
    { key: "selfie_match", label: "Selfie matches the ID photo" },
    { key: "sanctions_clear", label: "Sanctions / PEP clear" },
  ],
  typed: [
    { key: "details_genuine", label: "Name and date of birth look genuine and complete" },
    { key: "number_reviewed", label: "Document number and its flags reviewed" },
    { key: "no_other_account", label: "No other account found for this person" },
    { key: "sanctions_clear", label: "Sanctions / PEP clear" },
  ],
} as const;

/**
 * The dated id of each set — carried in every audit row that records attestations, so a later
 * change of wording is a NEW id and an old decision still says which statements were made.
 */
export const ATTESTATION_SET_ID = { photo: "photo-2026-09", typed: "typed-2026-10" } as const;

export type KycAttestationKey = (typeof KYC_ATTESTATION_SETS)[KycAttestationMode][number]["key"];

/** Narrow an untrusted string (a form field) to a mode. */
export function isKycAttestationMode(v: unknown): v is KycAttestationMode {
  return v === "photo" || v === "typed";
}

/** The keys of one set, in the order the rail renders them. */
export function attestationKeys(mode: KycAttestationMode): readonly string[] {
  return KYC_ATTESTATION_SETS[mode].map((a) => a.key);
}

/** The label of one key in one set (the key itself when it is not in that set). */
export function attestationLabel(mode: KycAttestationMode, key: string): string {
  return (KYC_ATTESTATION_SETS[mode] as readonly { key: string; label: string }[]).find((a) => a.key === key)?.label ?? key;
}

/** What the officer's rail sends: one tri-state per attestation. */
export type AttestationState = "pass" | "fail" | "pending";

export type ParsedAttestations =
  | { ok: true; mode: KycAttestationMode; setId: string; attested: Record<string, "pass"> }
  | { ok: false; error: string };

/**
 * Require the officer's attestations for THIS case's set, server-side.
 *
 * Deliberately strict, because this is the last gate before an identity is
 * marked verified (or an automatic verification is marked checked):
 *   · every key of the set must be present and exactly `pass` — `fail` and
 *     `pending` are both refusals, and a missing key is not an implied yes;
 *   · unknown keys are refused rather than ignored — and a key of the OTHER set
 *     is unknown here. Ignoring them would let a forged payload pad itself, and a
 *     photo-set "selfie matches" posted on a typed case would put on record an
 *     attestation about an image that does not exist.
 */
export function parseAttestations(raw: unknown, mode: KycAttestationMode): ParsedAttestations {
  if (!isKycAttestationMode(mode)) return { ok: false, error: "The verification case could not be identified." };
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return { ok: false, error: "The verification attestations are missing." };
    try { value = JSON.parse(raw); } catch { return { ok: false, error: "The verification attestations could not be read." }; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "The verification attestations are missing." };
  }

  const keys = attestationKeys(mode);
  const got = value as Record<string, unknown>;
  const unknown = Object.keys(got).filter((k) => !keys.includes(k));
  if (unknown.length) {
    return { ok: false, error: `Unrecognised attestation: ${unknown.slice(0, 3).join(", ")}.` };
  }

  const unmet = keys.filter((k) => got[k] !== "pass");
  if (unmet.length) {
    return { ok: false, error: `Confirm every check first — outstanding: ${unmet.map((k) => attestationLabel(mode, k)).join("; ")}.` };
  }

  return {
    ok: true,
    mode,
    setId: ATTESTATION_SET_ID[mode],
    attested: Object.fromEntries(keys.map((k) => [k, "pass"])) as Record<string, "pass">,
  };
}
