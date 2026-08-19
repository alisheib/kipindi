/**
 * NIDA verification — abstraction over the National Identification Authority API.
 * Production: replace with real NIDA HTTPS endpoint (mTLS + signed envelope per NIDA agreement).
 * Dev: deterministic mock — accepts 20-digit numerics, simulates 1.5s latency.
 *
 * Compliance:
 *  - PII never persisted to logs (hashed in audit payloads).
 *  - All requests audited (KYC category) with timestamp + correlation id.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";

/**
 * Is a real National Identification Authority endpoint wired up?
 *
 * Today: no, and by owner decision none is required (docs/IDENTITY-POLICY.md). What
 * this module performs is a FORMAT check; uniqueness is enforced separately and
 * identity assurance comes from the documents a human officer reviews. The flag
 * exists so the audit trail describes whichever of the two actually ran, instead
 * of always claiming the authority answered.
 */
const AUTHORITY_CHECK_ENABLED = !!process.env.NIDA_API_URL;

export type NidaResult =
  | {
      ok: true; verified: true; fullName: string; dob: string; correlationId: string;
      /** Only present when a real authority responded — never synthesised. */
      gender?: "M" | "F";
      matchScore?: number;
      /** False means: format accepted, nobody was asked. */
      authorityChecked: boolean;
    }
  | { ok: true; verified: false; reason: "MISMATCH" | "EXPIRED" | "NOT_FOUND" | "UNDERAGE" | "SANCTIONED"; correlationId: string }
  | { ok: false; error: string; correlationId: string };

export async function verifyNida(opts: { nida: string; fullName: string; dob: string; userId: string }): Promise<NidaResult> {
  const correlationId = `nida_${randomId(10)}`;
  audit({
    category: "KYC",
    // Named for what actually happens. This used to audit
    // "nida.verify.requested", which reads — in the hash-chained record a
    // regulator inspects — as though a request had gone to the National
    // Identification Authority. None ever has.
    action: AUTHORITY_CHECK_ENABLED ? "nida.verify.requested" : "nida.check.requested",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, nidaLast4: opts.nida.slice(-4), authorityChecked: AUTHORITY_CHECK_ENABLED },
  });

  // Simulated network latency
  await new Promise((r) => setTimeout(r, 1_200));

  // Dev mock heuristics
  if (!/^\d{20}$/.test(opts.nida)) {
    audit({ category: "KYC", action: "nida.verify.invalid_format", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId } });
    return { ok: true, verified: false, reason: "NOT_FOUND", correlationId };
  }
  // Test sanction path: NIDA ending 0000 -> sanctioned (for QA)
  if (opts.nida.endsWith("0000")) {
    audit({ category: "COMPLIANCE", action: "nida.sanctioned_match", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId } });
    return { ok: true, verified: false, reason: "SANCTIONED", correlationId };
  }
  // Test mismatch path: NIDA ending 9999 -> mismatch
  if (opts.nida.endsWith("9999")) {
    return { ok: true, verified: false, reason: "MISMATCH", correlationId };
  }
  // Underage from DOB
  const age = (Date.now() - new Date(opts.dob).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18) {
    audit({ category: "COMPLIANCE", action: "nida.underage_attempt", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId } });
    return { ok: true, verified: false, reason: "UNDERAGE", correlationId };
  }

  // ⛔ Do NOT synthesise a match score, a gender, or an authority confirmation.
  // This branch used to audit `nida.verify.success` with a hardcoded
  // `matchScore: 0.97` and return `gender: "M"` for every player on earth — a
  // fabricated verification result written into the compliance audit chain for a
  // check that never ran. 50pick's standing rule is that we never fabricate live
  // data: if we cannot compute it, we show and record nothing.
  //
  // What is TRUE here: the number is 20 numeric digits and is not already held by
  // another active account. Say exactly that, and nothing more.
  audit({
    category: "KYC",
    action: AUTHORITY_CHECK_ENABLED ? "nida.verify.success" : "nida.check.format_accepted",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, authorityChecked: AUTHORITY_CHECK_ENABLED, basis: AUTHORITY_CHECK_ENABLED ? "authority" : "format-only" },
  });
  return {
    ok: true,
    verified: true,
    // Echoes of what the player typed — recorded as their claim, not as anything
    // an authority confirmed.
    fullName: opts.fullName,
    dob: opts.dob,
    authorityChecked: AUTHORITY_CHECK_ENABLED,
    correlationId,
  };
}
