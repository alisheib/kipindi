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

export type NidaResult =
  | { ok: true; verified: true; fullName: string; dob: string; gender: "M" | "F"; matchScore: number; correlationId: string }
  | { ok: true; verified: false; reason: "MISMATCH" | "EXPIRED" | "NOT_FOUND" | "UNDERAGE" | "SANCTIONED"; correlationId: string }
  | { ok: false; error: string; correlationId: string };

export async function verifyNida(opts: { nida: string; fullName: string; dob: string; userId: string }): Promise<NidaResult> {
  const correlationId = `nida_${randomId(10)}`;
  audit({
    category: "KYC",
    action: "nida.verify.requested",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, nidaLast4: opts.nida.slice(-4) },
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

  audit({ category: "KYC", action: "nida.verify.success", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId, matchScore: 0.97 } });
  return {
    ok: true,
    verified: true,
    fullName: opts.fullName,
    dob: opts.dob,
    gender: "M",
    matchScore: 0.97,
    correlationId,
  };
}
