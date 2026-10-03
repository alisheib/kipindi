/**
 * GOVERNMENT TAX REPORT — the rates, admin-editable, effective-dated, audited.
 *
 * The approved model (13% commission on Payout, TRA 10% and GBT 5% of that commission) is the
 * built-in version `APPROVED_VERSION` in `@/lib/tax-report`. This store holds every version an
 * officer has RECORDED since: each one takes effect at 00:00 EAT on its day, and none ever
 * overwrites another — a rate changed in November must not re-price September, and a period that
 * was filed must reproduce from the rates it was filed under (`docs/TAX-REPORT.md` §5).
 *
 * ⛔ A SEPARATE STORE FROM `market.config`, ON PURPOSE. `market.config`'s `traTaxOnCommissionRate`
 * and `gbtLevyOnCommissionRate` are frozen into every new poll's `feeSnapshot` and price the levy
 * SETTLEMENT books on the platform fee. Editing them to change this report would silently re-price
 * the settlement of every future poll — two decisions in one mechanism, the shape that has cost
 * this codebase twice. This report's rates move this report, and nothing else.
 *
 * ⭐ OWNER RULE 2026-10-03: admins can change everything; safety by validation and audit, never a
 * locked box. So: every field is editable by an admin, every version is validated before it is
 * stored, the save is VERIFIED (read back) before the officer is told it worked, and the factory
 * writes the `{ before, after, changes }` audit row.
 */
import { defineConfig } from "./define-config";
import { randomId } from "./crypto";
import {
  GENESIS_DAY,
  isDayKey,
  isValidRateSet,
  normaliseVersions,
  type RateSet,
  type RateVersion,
} from "@/lib/tax-report";

export const TAX_CONFIG_KEY = "tax_report.config";

/** Flat on purpose: `defineConfig` merges shallowly, and `versions` is always replaced whole. */
export type TaxReportConfig = {
  /** Every version an officer has recorded, oldest first. The approved version is implicit. */
  versions: RateVersion[];
};

const DEFAULTS: TaxReportConfig = { versions: [] };

/** The longest note kept with a version — a sentence or two naming the authority for the change. */
export const RATE_NOTE_MAX = 500;
const RATE_NOTE_MIN = 5;

function isVersion(v: unknown): v is RateVersion {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && o.id.length > 0
    && isDayKey(o.effectiveFrom) && (o.effectiveFrom as string) >= GENESIS_DAY
    && isValidRateSet(o.rates)
    && (o.recordedBy === null || typeof o.recordedBy === "string")
    && (o.recordedAt === null || typeof o.recordedAt === "string")
    && (o.note === null || typeof o.note === "string");
}

/** Hydration keeps the versions it can read and nothing else — a malformed row is dropped, never half-used. */
const migrate = (persisted: Record<string, unknown>): Partial<TaxReportConfig> => {
  const raw = Array.isArray(persisted.versions) ? persisted.versions : [];
  return {
    versions: raw.filter(isVersion).map((v) => ({
      id: v.id,
      effectiveFrom: v.effectiveFrom,
      rates: { commissionBp: v.rates.commissionBp, traBp: v.rates.traBp, gbtBp: v.rates.gbtBp },
      recordedBy: v.recordedBy,
      recordedAt: v.recordedAt,
      note: v.note,
    })),
  };
};

const validate = (c: TaxReportConfig): { ok: true } | { ok: false; reason: string } => {
  if (!Array.isArray(c.versions)) return { ok: false, reason: "The rate history is unreadable." };
  const ids = new Set<string>();
  for (const v of c.versions) {
    if (!isVersion(v)) return { ok: false, reason: "A rate version is malformed — every rate must be a whole number of basis points between 0% and 100%, from a real date on or after 1 Jan 2026." };
    if (ids.has(v.id)) return { ok: false, reason: `Two rate versions share the id ${v.id}.` };
    ids.add(v.id);
    const note = (v.note ?? "").trim();
    if (note.length < RATE_NOTE_MIN) return { ok: false, reason: "Every rate change must say why — the notice, letter or decision behind it (at least 5 characters)." };
    if (note.length > RATE_NOTE_MAX) return { ok: false, reason: `Keep the reason under ${RATE_NOTE_MAX} characters.` };
  }
  return { ok: true };
};

const cfg = defineConfig<TaxReportConfig>({
  key: TAX_CONFIG_KEY,
  defaults: DEFAULTS,
  migrate,
  validate,
  audit: { action: "tax_report.config.updated", targetType: "TaxReportConfig" },
});

/**
 * The versions in force, read FRESH. ⛔ Fails closed: a read that could not ask returns `ok:false`
 * and the report refuses to compute a tax line rather than compute it on whatever this container
 * happened to hold — a statutory figure on a stale or default rate is the one outcome worse than
 * no figure.
 */
export async function readTaxRates(): Promise<{ ok: true; versions: RateVersion[]; recorded: RateVersion[] } | { ok: false; error: string }> {
  const r = await cfg.reload();
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, versions: normaliseVersions(r.config.versions), recorded: r.config.versions.map((v) => ({ ...v, rates: { ...v.rates } })) };
}

/**
 * Record a new rate version. The ONLY writer, and it VERIFIES the write (`setVerified`): the
 * officer is told "saved" only after the row was read back.
 * A version for a day that already has one REPLACES it from then on (`normaliseVersions` keeps the
 * last recorded per day) — and both stay in the history, so the correction is itself on record.
 */
export async function recordRateVersion(
  input: { effectiveFrom: string; rates: RateSet; note: string },
  officerId: string,
  nowIso: string = new Date().toISOString(),
): Promise<{ ok: true; version: RateVersion } | { ok: false; error: string; field?: "effectiveFrom" | "commission" | "tra" | "gbt" | "note" }> {
  if (!isDayKey(input.effectiveFrom)) return { ok: false, error: "Pick the day the new rates take effect.", field: "effectiveFrom" };
  if (input.effectiveFrom < GENESIS_DAY) return { ok: false, error: "Rates can only be recorded from 1 January 2026.", field: "effectiveFrom" };
  if (!isValidRateSet(input.rates)) return { ok: false, error: "Each rate must be a percentage between 0 and 100, with at most two decimals.", field: "commission" };
  const note = input.note.trim().replace(/\s+/g, " ");
  if (note.length < RATE_NOTE_MIN) return { ok: false, error: "Say why the rates change — the notice, letter or decision (at least 5 characters).", field: "note" };
  if (note.length > RATE_NOTE_MAX) return { ok: false, error: `Keep the reason under ${RATE_NOTE_MAX} characters.`, field: "note" };

  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The current rates could not be read, so nothing was changed. Please try again." };
  const version: RateVersion = {
    id: `rate_${input.effectiveFrom.replace(/-/g, "")}_${randomId(8)}`,
    effectiveFrom: input.effectiveFrom,
    rates: { commissionBp: input.rates.commissionBp, traBp: input.rates.traBp, gbtBp: input.rates.gbtBp },
    recordedBy: officerId,
    recordedAt: nowIso,
    note,
  };
  const res = await cfg.setVerified({ versions: [...fresh.config.versions, version] }, officerId);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, version };
}
