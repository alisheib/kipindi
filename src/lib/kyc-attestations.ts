/**
 * The officer's KYC attestations — ONE definition, shared by the decision rail
 * that collects them and the server action that requires and records them.
 *
 * Campaign §6 E-4. These four statements are the human judgment in a KYC
 * decision: the auto-checks can compare strings, but only a person can say the
 * selfie is the same face. They used to live in `useState` inside
 * `kyc-decision-rail.tsx` and nothing else — they armed the Approve button and
 * were then discarded at the moment they were made. Two separate defects:
 *
 *  1. NOT RECORDED. The audit payload carried `{riskScore, makerChecker}`, so the
 *     one thing an inspector would ask for — that a named officer positively
 *     attested the selfie matched the ID — existed nowhere afterwards.
 *  2. NOT ENFORCED. The gate was client-side only. The server took `userId` and
 *     approved, so an approval that opens the withdrawal gate could be made with
 *     no attestations at all — the checklist was decorative from the server's
 *     point of view.
 *
 * WHY THE AUDIT PAYLOAD AND NOT A COLUMN. A column on `KycSubmission` would be
 * queryable, but it is also mutable: an attestation that can be silently edited
 * later is weaker evidence, not stronger. The audit log is append-only and
 * hash-chained (`AUDIT_CHAIN_SECRET`), and it is retained — `privacy.ts` blocks
 * DSAR erasure precisely to preserve the 7-year AML window. So the attestation
 * lands in the same tamper-evident record, at the same instant, attributed to the
 * same officer, as the decision it justifies.
 *
 * The list lives here rather than in the client so the two halves cannot drift.
 * That drift is exactly what hid E-1(b), where a label map was keyed on six enum
 * members that did not exist.
 */

export const KYC_ATTESTATIONS = [
  { key: "name_matches", label: "Name matches the ID" },
  { key: "document_authentic", label: "Document appears authentic" },
  { key: "selfie_match", label: "Selfie matches the ID photo" },
  { key: "sanctions_clear", label: "Sanctions / PEP clear" },
] as const;

export type KycAttestationKey = (typeof KYC_ATTESTATIONS)[number]["key"];

export const KYC_ATTESTATION_KEYS: readonly KycAttestationKey[] =
  KYC_ATTESTATIONS.map((a) => a.key);

/** What the officer's rail sends: one tri-state per attestation. */
export type AttestationState = "pass" | "fail" | "pending";

export type ParsedAttestations =
  | { ok: true; attested: Record<KycAttestationKey, "pass"> }
  | { ok: false; error: string };

/**
 * Require the officer's four attestations, server-side.
 *
 * Deliberately strict, because this is the last gate before an identity is
 * marked verified and the withdrawal rail opens:
 *   · every one of the four must be present and exactly `pass` — `fail` and
 *     `pending` are both refusals, and a missing key is not an implied yes;
 *   · unknown keys are refused rather than ignored. Ignoring them would let a
 *     forged payload pad itself, and because the list is shared, a legitimately
 *     new attestation reaches both halves at once and can never look unknown.
 */
export function parseAttestations(raw: unknown): ParsedAttestations {
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return { ok: false, error: "The verification attestations are missing." };
    try { value = JSON.parse(raw); } catch { return { ok: false, error: "The verification attestations could not be read." }; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "The verification attestations are missing." };
  }

  const got = value as Record<string, unknown>;
  const unknown = Object.keys(got).filter((k) => !KYC_ATTESTATION_KEYS.includes(k as KycAttestationKey));
  if (unknown.length) {
    return { ok: false, error: `Unrecognised attestation: ${unknown.slice(0, 3).join(", ")}.` };
  }

  const unmet = KYC_ATTESTATION_KEYS.filter((k) => got[k] !== "pass");
  if (unmet.length) {
    const labels = unmet.map((k) => KYC_ATTESTATIONS.find((a) => a.key === k)?.label ?? k);
    return { ok: false, error: `Confirm every check first — outstanding: ${labels.join("; ")}.` };
  }

  return {
    ok: true,
    attested: Object.fromEntries(KYC_ATTESTATION_KEYS.map((k) => [k, "pass"])) as Record<KycAttestationKey, "pass">,
  };
}
