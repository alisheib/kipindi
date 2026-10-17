/**
 * MASWALI MILLIONEA — THE LICENCE BASIS, THE OWNER'S RECORD (MASWALI-BUILD S1; OD-01, MB-39).
 *
 * ⛔ NO WEEK OPENS WHILE THIS SAYS `NONE`. The product may only sell once the Owner has recorded what it sells under:
 *   · `GBT_WRITTEN`  — the Gaming Board's written confirmation (OD-01 (a), the recommended basis);
 *   · `OWNER_RULING` — the Owner's dated ruling recording a verbal Board answer and accepting the risk (OD-01 (b)).
 * Either one must name the fixed price, the house floor, the rollover across weeks, the payout-only fee and the sunset;
 * `ref` carries the reference that says where that record is kept.
 *
 * ⛔ A SEPARATE KEY FROM `maswali.config`, ON PURPOSE. That form is a trading officer's, posted whole on every save; a
 * field there could be set by anyone who can change the price. This key has ONE writer, `recordLicenceBasis`, and the
 * action that calls it is Owner-only (S4, `requireOwner`). Validated, read back before "saved", and audited COMPLIANCE.
 *
 * The open reads it FRESH (`readLicenceBasisFresh`) and fails closed: a read that could not ask refuses the open.
 */
import { defineConfig } from "./define-config";

export const MASWALI_LICENCE_KEY = "maswali.licenceBasis";

export type LicenceBasisKind = "NONE" | "GBT_WRITTEN" | "OWNER_RULING";
export const LICENCE_BASIS_KINDS: readonly LicenceBasisKind[] = ["NONE", "GBT_WRITTEN", "OWNER_RULING"];

export type LicenceBasis = {
  kind: LicenceBasisKind;
  /** Where the confirmation or ruling is kept (a letter's reference, a dated ruling's document). Null only for NONE. */
  ref: string | null;
  /** ISO 8601. Null only for NONE. */
  recordedAt: string | null;
  /** The Owner who recorded it. Null only for NONE. */
  recordedBy: string | null;
};

export const LICENCE_BASIS_NONE: LicenceBasis = { kind: "NONE", ref: null, recordedAt: null, recordedBy: null };

export const LICENCE_REF_MIN = 5;
export const LICENCE_REF_MAX = 500;

/** Why a licence record is refused, or null. */
export function licenceBasisProblem(b: LicenceBasis): string | null {
  if (!(LICENCE_BASIS_KINDS as readonly unknown[]).includes(b.kind)) return "The licence basis is not one the platform knows.";
  if (b.kind === "NONE") {
    return b.ref === null && b.recordedAt === null && b.recordedBy === null ? null : "A basis of NONE carries no reference, date or author.";
  }
  const ref = (b.ref ?? "").trim();
  if (ref.length < LICENCE_REF_MIN) return `Say where the ${b.kind === "GBT_WRITTEN" ? "Board's letter" : "ruling"} is kept (at least ${LICENCE_REF_MIN} characters).`;
  if (ref.length > LICENCE_REF_MAX) return `Keep the reference under ${LICENCE_REF_MAX} characters.`;
  if (typeof b.recordedAt !== "string" || Number.isNaN(Date.parse(b.recordedAt))) return "The record carries no date.";
  if (typeof b.recordedBy !== "string" || b.recordedBy.length === 0) return "The record names no Owner.";
  return null;
}

/** ⭐ The gate itself: a week may open only on a recorded basis that validates. */
export function licenceBasisAllowsOpen(b: LicenceBasis): boolean {
  return b.kind !== "NONE" && licenceBasisProblem(b) === null;
}

const migrate = (p: Record<string, unknown>): Partial<LicenceBasis> => {
  const out: Partial<LicenceBasis> = {};
  if (typeof p.kind === "string") out.kind = p.kind as LicenceBasisKind;
  if (typeof p.ref === "string" || p.ref === null) out.ref = p.ref as string | null;
  if (typeof p.recordedAt === "string" || p.recordedAt === null) out.recordedAt = p.recordedAt as string | null;
  if (typeof p.recordedBy === "string" || p.recordedBy === null) out.recordedBy = p.recordedBy as string | null;
  return out;
};

const cfg = defineConfig<LicenceBasis>({
  key: MASWALI_LICENCE_KEY,
  defaults: LICENCE_BASIS_NONE,
  migrate,
  validate: (b) => {
    const why = licenceBasisProblem(b);
    return why ? { ok: false, reason: why } : { ok: true };
  },
  // ⚠️ The factory audits ADMIN; the ceremony action (S4) adds the COMPLIANCE row beside it.
  audit: { action: "maswali.licence_basis.recorded", targetType: "MaswaliLicenceBasis" },
});

/** For screens (the pools page, the health line). Sync; may be this container's boot value. */
export function getLicenceBasis(): LicenceBasis {
  return { ...cfg.get() };
}

/** ⭐ For the open: FRESH, and fail closed — an unreadable or invalid record reads as NONE. */
export async function readLicenceBasisFresh(): Promise<{ ok: true; basis: LicenceBasis } | { ok: false; error: string }> {
  const r = await cfg.reload();
  if (!r.ok) return { ok: false, error: r.error };
  if (licenceBasisProblem(r.config)) return { ok: true, basis: { ...LICENCE_BASIS_NONE } };
  return { ok: true, basis: { ...r.config } };
}

/**
 * Record (or withdraw, with `kind: "NONE"`) the licence basis. The ONE writer; its caller is the Owner's ceremony.
 * Verified: "recorded" only after the row was read back.
 */
export async function recordLicenceBasis(
  input: { kind: LicenceBasisKind; ref: string | null },
  ownerId: string,
  now: Date = new Date(),
): Promise<{ ok: true; basis: LicenceBasis } | { ok: false; error: string }> {
  const next: LicenceBasis = input.kind === "NONE"
    ? { ...LICENCE_BASIS_NONE }
    : { kind: input.kind, ref: (input.ref ?? "").trim().replace(/\s+/g, " "), recordedAt: now.toISOString(), recordedBy: ownerId };
  const why = licenceBasisProblem(next);
  if (why) return { ok: false, error: why };
  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The current licence record could not be read, so nothing was changed. Please try again." };
  const res = await cfg.setVerified(next, ownerId);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, basis: { ...res.config } };
}
