/**
 * Anchors for `red:maswali-licence-gate` (MASWALI-BUILD LICBASIS) — each puts back, in the real source, one way the
 * Owner's ruling of 2026-10-23 could stand in where it must not (or stop standing in where it must), and names the
 * assertion of `test:maswali-licence-gate` that must turn red, and in which run:
 *   · child — the suite's memory run (`scripts/lib/maswali-licence-gate-child.mts`, HB_MONEY_STORE=memory)
 *   · pg    — the whole two-store suite on a scratch Postgres (`db-scratch --run`): a stored row reaches the rule only
 *             through the config factory's `migrate`, which only Postgres exercises
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const LIC = "src/lib/server/maswali-licence.ts";

export const MUTATIONS = [
  {
    name: "(1) the default applied over a recorded NONE: a withdrawal falls through to the ruling's basis",
    file: LIC,
    from: "    if (record.kind === \"NONE\") return closed(\"RECORD\", LICENCE_WITHDRAWN);",
    to: "    if (record.kind === \"NONE\") return licenceStandingOf(null, licenceNumber ?? getSupportConfig().licenceNumber);",
    expect: "1.5 · ⛔ a recorded NONE",
    suite: "child",
  },
  {
    name: "(2) the default applied with no licence number: the setting is never validated",
    file: LIC,
    from: "  if (licenceNumber === null || licenceProblem(licenceNumber) !== null) return closed(\"RULING\", LICENCE_NO_NUMBER);",
    to: "  if (licenceNumber === null) return closed(\"RULING\", LICENCE_NO_NUMBER);",
    expect: "1.2 · ⛔ no record + an EMPTY licence number",
    suite: "child",
  },
  {
    name: "(3) the stored record ignored: every read takes the store for one that never held a record",
    file: LIC,
    from: "const recordOf = (stored: StoredLicence): LicenceBasis | null => (stored.kind === NOTHING_RECORDED ? null : ({ ...stored } as LicenceBasis));",
    to: "const recordOf = (stored: StoredLicence): LicenceBasis | null => (stored.kind === NOTHING_RECORDED || true ? null : ({ ...stored } as LicenceBasis));",
    expect: "5.1 · ⛔ a recorded None keeps the gate shut",
    suite: "child",
  },
  {
    name: "(4) a kindless stored row read as nothing recorded: `migrate` leaves the kind to the factory's default",
    file: LIC,
    from: "  out.kind = typeof p.kind === \"string\" && p.kind !== NOTHING_RECORDED ? (p.kind as LicenceBasisKind) : UNREADABLE_KIND;",
    to: "  if (typeof p.kind === \"string\") out.kind = p.kind as LicenceBasisKind;",
    expect: "8.2 · ⛔ a stored row with no kind at all",
    suite: "pg",
  },
  {
    name: "(5) the ruling written into the store as a record at boot",
    file: LIC,
    from: "/** The Owner's record, or null when none was ever made. */",
    to: "void cfg.setVerified(rulingLicenceBasis(getSupportConfig().licenceNumber), \"boot\");\n/** The Owner's record, or null when none was ever made. */",
    expect: "2.1 · ⭐ nothing is recorded",
    suite: "child",
  },
];
