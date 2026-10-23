/**
 * MASWALI MILLIONEA — THE LICENCE BASIS: THE OWNER'S RECORD, OR HIS RULING OF 2026-10-23 (MASWALI-BUILD S1 and LICBASIS;
 * OD-01, MB-39; `docs/COMPLIANCE-DECISIONS.md` § "2026-10-23 · Maswali Millionea — the licence basis is 50pick's GBT
 * licence …").
 *
 * ⛔ NO WEEK OPENS WITHOUT A BASIS IN FORCE. The basis in force is decided in this order (`licenceStandingOf`):
 *   1. ⭐ THE OWNER'S RECORD, whenever one was ever made — it ALWAYS wins, an explicit "None (withdraw it)" included: a
 *      recorded NONE keeps every week closed, and nothing below overrides it.
 *        · `GBT_WRITTEN`  — the Gaming Board's written confirmation (OD-01 (a));
 *        · `OWNER_RULING` — an Owner's dated ruling recording a Board answer and accepting the risk (OD-01 (b));
 *        · `NONE`         — withdrawn.
 *      A record that does not validate counts as NONE (closed), never as "nothing recorded".
 *   2. ⭐ WHEN NOTHING WAS EVER RECORDED, THE OWNER'S RULING OF 2026-10-23 (Ali: "our licence number enough for any
 *      operation"): Millionea runs under 50pick's Gaming Board of Tanzania licence, and the Board needs nothing further
 *      in writing. The basis is `OWNER_RULING`, its reference built from the platform's licence number — the System
 *      page's `licenceNumber`, the number every footer prints — dated the ruling's day and signed by the ruling, never a
 *      person.
 *   3. ⛔ When nothing was recorded and that licence number is empty or not valid (`licenceProblem`), there is NO
 *      default: the gate holds, and the console says why.
 *
 * ⛔ READ-TIME, IN CODE — NEVER A WRITE. The ruling's basis is derived on every read: nothing is written at boot, no
 *    migration writes it, and the store goes on holding "nothing recorded". So the Owner's own record replaces it the
 *    moment it is made, and a recorded NONE stays the withdrawal it is.
 * ⭐ "NOTHING RECORDED" IS A FACT OF THE STORE, NOT A GUESS FROM A VALUE. The factory's default is a marker no writer can
 *    store (`NOTHING_RECORDED` — the validator refuses it), and `migrate`, which only ever sees a PERSISTED row, never
 *    answers it: any row is a record, and a row without a usable kind reads as a record that does not validate. So a
 *    recorded NONE (a row) and a store that never held one (no row) can never be confused, on either store.
 *
 * ⛔ A SEPARATE KEY FROM `maswali.config`, ON PURPOSE. That form is a trading officer's, posted whole on every save; a
 * field there could be set by anyone who can change the price. This key has ONE writer, `recordLicenceBasis`, and the
 * action that calls it is the Owner's control `setMaswaliLicenceBasis` (the ops domain, `control-gates.ts`). Validated,
 * read back before "saved", and audited (`maswali.licence_basis.recorded`, with the record before and after).
 *
 * The open reads it FRESH — the record and, when the ruling stands in, the licence number (`readLicenceStandingFresh`) —
 * and fails closed: a read that could not ask refuses the open. Screens read this container's copy (`getLicenceStanding`).
 */
import { defineConfig } from "./define-config";
import { getSupportConfig, readSupportConfigFresh } from "./support-config";
import { licenceProblem } from "@/lib/support-config";
import { MASWALI_LICENCE_REF_MIN, MASWALI_LICENCE_REF_MAX } from "@/lib/maswali-ceremony-bounds";

export const MASWALI_LICENCE_KEY = "maswali.licenceBasis";

export type LicenceBasisKind = "NONE" | "GBT_WRITTEN" | "OWNER_RULING";
export const LICENCE_BASIS_KINDS: readonly LicenceBasisKind[] = ["NONE", "GBT_WRITTEN", "OWNER_RULING"];

export type LicenceBasis = {
  kind: LicenceBasisKind;
  /** Where the confirmation or ruling is kept (a letter's reference, a dated ruling's document). Null only for NONE. */
  ref: string | null;
  /** ISO 8601 (a date, or a date and time). Null only for NONE. */
  recordedAt: string | null;
  /** Who recorded it: the Owner's account, or — for the ruling's basis — the ruling itself. Null only for NONE. */
  recordedBy: string | null;
};

export const LICENCE_BASIS_NONE: LicenceBasis = { kind: "NONE", ref: null, recordedAt: null, recordedBy: null };

export const LICENCE_REF_MIN = MASWALI_LICENCE_REF_MIN;
export const LICENCE_REF_MAX = MASWALI_LICENCE_REF_MAX;

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

/** ⭐ The gate on a basis: a week may open only on one that is not NONE and validates. */
export function licenceBasisAllowsOpen(b: LicenceBasis): boolean {
  return b.kind !== "NONE" && licenceBasisProblem(b) === null;
}

// ── THE OWNER'S RULING OF 2026-10-23 ─────────────────────────────────────────────────────────────────

/** The ruling's day: the date its basis carries. */
export const LICENCE_RULING_DATE = "2026-10-23";
/** Who signs the ruling's basis: the ruling, never a person (no account recorded it). */
export const LICENCE_RULING_BY = "the Owner's ruling of 2026-10-23";

/** The basis the ruling supplies, standing on the platform's licence number. */
export function rulingLicenceBasis(licenceNumber: string): LicenceBasis {
  return {
    kind: "OWNER_RULING",
    ref: `50pick's Gaming Board of Tanzania licence no. ${licenceNumber.trim()}, by the Owner's ruling of 2026-10-23: the Board `
      + `needs nothing further in writing for Millionea (COMPLIANCE-DECISIONS § "2026-10-23 · Maswali Millionea — the licence `
      + `basis is 50pick's GBT licence …")`,
    recordedAt: LICENCE_RULING_DATE,
    recordedBy: LICENCE_RULING_BY,
  };
}

// ── THE BASIS IN FORCE, AND WHY THE GATE HOLDS ───────────────────────────────────────────────────────

/**
 * Why no week can open, in the words the open refuses with — the builder's checklist, the console's alert and the Pools
 * card say the same sentence. Each ends "(OD-01)." and no other refusal does (the admin drive reads them by that).
 */
export const LICENCE_WITHDRAWN =
  "The Owner recorded None for the licence basis; the ruling of 2026-10-23 does not override that. No week opens until the Owner records a basis (OD-01).";
export const LICENCE_NO_NUMBER =
  "No licence basis is recorded, and the licence number on the System page is empty or not valid, so the Owner's ruling of 2026-10-23 cannot supply one. Save the licence number there, or the Owner records a basis (OD-01).";
export const LICENCE_RECORD_INVALID =
  "The recorded licence basis does not validate, so it counts as None. No week opens until the Owner records it again (OD-01).";

/** The licence basis as the open and the console read it. */
export type LicenceStanding = {
  /** The basis in force; NONE whenever no week may open. */
  basis: LicenceBasis;
  /** Where it comes from: the Owner's record (it always wins), or the ruling of 2026-10-23 standing in for none. */
  source: "RECORD" | "RULING";
  /** The platform's licence number the ruling's basis stands on; null when the record decides or no basis stands. */
  licenceNumber: string | null;
  /** Why no week can open — one of the three sentences above — or null when a week may open on this basis. */
  holds: string | null;
};

/**
 * ⭐ THE RULE, PURE. `record` is the Owner's record, or null when NONE WAS EVER MADE (never "a record of NONE");
 * `licenceNumber` is the platform's, read only when it can matter.
 */
export function licenceStandingOf(record: LicenceBasis | null, licenceNumber: string | null): LicenceStanding {
  const closed = (source: LicenceStanding["source"], holds: string): LicenceStanding => ({ basis: { ...LICENCE_BASIS_NONE }, source, licenceNumber: null, holds });
  // 1 · the Owner's record — it always wins, a recorded NONE included.
  if (record !== null) {
    if (licenceBasisProblem(record) !== null) return closed("RECORD", LICENCE_RECORD_INVALID);
    if (record.kind === "NONE") return closed("RECORD", LICENCE_WITHDRAWN);
    return { basis: { ...record }, source: "RECORD", licenceNumber: null, holds: null };
  }
  // 2 · nothing was ever recorded: the ruling of 2026-10-23, on the platform's licence number — 3 · or nothing at all.
  if (licenceNumber === null || licenceProblem(licenceNumber) !== null) return closed("RULING", LICENCE_NO_NUMBER);
  const basis = rulingLicenceBasis(licenceNumber);
  // The ruling's basis passes the validator every record passes, or it does not stand.
  if (!licenceBasisAllowsOpen(basis)) return closed("RULING", LICENCE_NO_NUMBER);
  return { basis, source: "RULING", licenceNumber: licenceNumber.trim(), holds: null };
}

// ── THE STORE ────────────────────────────────────────────────────────────────────────────────────────

/** The factory's default: no record was ever made. ⛔ No writer can store it (the validator refuses the kind). */
const NOTHING_RECORDED = "NOTHING_RECORDED";
/** What a persisted row whose kind is missing or unusable reads as — a kind no validator accepts, so it counts as NONE. */
const UNREADABLE_KIND = "UNREADABLE";
type StoredLicence = Omit<LicenceBasis, "kind"> & { kind: LicenceBasisKind | typeof NOTHING_RECORDED | typeof UNREADABLE_KIND };
const NOTHING: StoredLicence = { kind: NOTHING_RECORDED, ref: null, recordedAt: null, recordedBy: null };

/** ⛔ Runs only on a PERSISTED row, so it never answers "nothing recorded": a row is a record, whatever it holds. */
const migrate = (p: Record<string, unknown>): Partial<StoredLicence> => {
  const out: Partial<StoredLicence> = {};
  out.kind = typeof p.kind === "string" && p.kind !== NOTHING_RECORDED ? (p.kind as LicenceBasisKind) : UNREADABLE_KIND;
  if (typeof p.ref === "string" || p.ref === null) out.ref = p.ref as string | null;
  if (typeof p.recordedAt === "string" || p.recordedAt === null) out.recordedAt = p.recordedAt as string | null;
  if (typeof p.recordedBy === "string" || p.recordedBy === null) out.recordedBy = p.recordedBy as string | null;
  return out;
};

const cfg = defineConfig<StoredLicence>({
  key: MASWALI_LICENCE_KEY,
  defaults: NOTHING,
  migrate,
  validate: (b) => {
    const why = licenceBasisProblem(b as LicenceBasis);
    return why ? { ok: false, reason: why } : { ok: true };
  },
  audit: { action: "maswali.licence_basis.recorded", targetType: "MaswaliLicenceBasis" },
});

/** The Owner's record, or null when none was ever made. */
const recordOf = (stored: StoredLicence): LicenceBasis | null => (stored.kind === NOTHING_RECORDED ? null : ({ ...stored } as LicenceBasis));

/** For screens (the console's head, the Pools Owner card, the builder's checklist, the alerts). Sync; may be this
 *  container's boot value. */
export function getLicenceStanding(): LicenceStanding {
  const record = recordOf(cfg.get());
  return licenceStandingOf(record, record === null ? getSupportConfig().licenceNumber : null);
}

/** The basis in force (screens, the dev seeds). */
export function getLicenceBasis(): LicenceBasis {
  return getLicenceStanding().basis;
}

/** ⭐ For the open: FRESH, and fail closed — a store that could not be asked answers `ok: false`, and the open refuses. */
export async function readLicenceStandingFresh(): Promise<{ ok: true; standing: LicenceStanding } | { ok: false; error: string }> {
  const r = await cfg.reload();
  if (!r.ok) return { ok: false, error: r.error };
  const record = recordOf(r.config);
  if (record !== null) return { ok: true, standing: licenceStandingOf(record, null) };
  const support = await readSupportConfigFresh();
  if (!support.ok) return { ok: false, error: support.error };
  return { ok: true, standing: licenceStandingOf(null, support.config.licenceNumber) };
}

/**
 * Record (or withdraw, with `kind: "NONE"`) the licence basis. The ONE writer; its caller is the Owner's ceremony.
 * Verified: "recorded" only after the row was read back. Once anything is recorded, the ruling's basis no longer stands in.
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
  return { ok: true, basis: { ...res.config } as LicenceBasis };
}

// ── THE CONSOLE'S WORDS (one place; the pages render these) ──────────────────────────────────────────

/** The console head's tile: its value and its note. */
export function licenceTile(s: LicenceStanding): { value: string; note: string } {
  if (s.holds !== null) return { value: "None", note: "No week can open" };
  if (s.source === "RULING") return { value: "Owner ruling", note: `GBT licence no. ${s.licenceNumber} · the ruling of 2026-10-23` };
  return { value: s.basis.kind === "GBT_WRITTEN" ? "Board letter" : "Owner ruling", note: s.basis.ref ?? "" };
}

/** The Pools Owner card's line, after "Now: ". */
export function licenceNowLine(s: LicenceStanding): string {
  if (s.holds !== null) return `none. ${s.holds}`;
  if (s.source === "RULING") {
    return `50pick's Gaming Board licence no. ${s.licenceNumber}, by the Owner's ruling of 2026-10-23 — the Board needs nothing `
      + "further in writing. It stands while no basis is recorded here: recording one below replaces it, and recording None "
      + "closes every week.";
  }
  return `${s.basis.kind === "GBT_WRITTEN" ? "the Board's letter" : "the Owner's ruling"} · ${s.basis.ref}`;
}
