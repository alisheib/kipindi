/**
 * THE ANCHORS `red:id-documents` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ WHY A SIDECAR. `test:red-anchors` must answer *"does every anchor in the fleet still
 * resolve, exactly once?"* WITHOUT executing anything — a harness rewrites real source, so an
 * auditor that ran one would be the mutation-left-in-the-tree hazard wearing a lab coat. It
 * can only audit a harness that declares its targets as importable data, and its §4 ratchet
 * counts the ones that do not. ⛔ Raising that ceiling is the one edit that file forbids, so a
 * new harness declares rather than widening the gap.
 *
 * ⭐ ONE DEFINITION, TWO CONSUMERS. `id-documents-red.mjs` imports `CASES` to run them;
 * `red-anchors.test.mts` imports `MUTATIONS` — DERIVED from `CASES` below — to audit them.
 * There is no hand-kept second list to go stale, which is the defect
 * `docs/FAILURE-INVENTORY.md` §3.9 records a restore-list dying of.
 *
 * ⚠️ A CASE MAY CARRY SEVERAL EDITS, and that is load-bearing rather than convenience. The
 * age gate is held by TWO independent locks — `validators.dateOfBirth` at parse time and
 * `kyc-service` above the per-document branch — so "the age gate becomes NIDA-only" is only a
 * real defect once both are cut. A case that edited one would report "not caught" while the
 * product was, correctly, still safe.
 *
 * ⚠️ NO SIDE EFFECTS. This module is imported by a suite that runs inside `test:all`. No file
 * reads, no writes, no child processes — data only. Paths are repo-relative POSIX strings,
 * resolved by whoever imports them, so this module never touches the filesystem to describe it.
 */

/** @typedef {{ file: string, from: string, to: string }} RedEdit */
/** @typedef {{ name: string, gate: string[], expect: string, edits: RedEdit[] }} RedCase */
const CAT = "src/lib/id-documents.ts";
const SVC = "src/lib/server/kyc-service.ts";
const VAL = "src/lib/server/validators.ts";
const MIG = "prisma/migrations/20260820120000_kyc_identity_document/migration.sql";
const ROUTE = "src/app/api/admin/kyc-doc/route.ts";
const PAGE = "src/app/profile/kyc/page.tsx";
const SCHEMA = "prisma/schema.prisma";
const STORE = "src/lib/server/store.ts";
const DROP_MIG = "prisma/migrations/20260821090000_kyc_drop_nida_legacy/migration.sql";

export const GATE_ID = ["tsx", "scripts/id-documents.test.mts"];
export const GATE_D1 = ["tsx", "scripts/kyc-cert-d1.test.mts"];

/**
 * Each case: a defect that this unit really closed (or really could reintroduce),
 * the gate that must catch it, and a distinctive fragment of the assertion that must
 * be the one to go red.
 */
export const CASES = [
  // ── 🔴 THE UNIQUENESS RULE ────────────────────────────────────────────────
  {
    name: "the unique index drops the TYPE, so it is on the number alone",
    gate: GATE_D1,
    expect: "the identity index is on the TUPLE",
    edits: [{
      file: MIG,
      from: `    ON "KycSubmission" ("idType", "idNumber")\n    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED';`,
      to: `    ON "KycSubmission" ("idNumber")\n    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED';`,
    }],
  },
  {
    name: "the index is made TOTAL, so a rejected submission burns the document forever",
    gate: GATE_D1,
    expect: "identity tuple · is PARTIAL",
    edits: [{
      file: MIG,
      from: `    ON "KycSubmission" ("idType", "idNumber")\n    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED';`,
      to: `    ON "KycSubmission" ("idType", "idNumber");`,
    }],
  },
  {
    name: "the expand migration also DROPS the deprecated column (500s the previous container mid-deploy)",
    gate: GATE_D1,
    expect: "does NOT drop the deprecated columns",
    edits: [{
      file: MIG,
      from: `CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idType_idNumber_active_key"`,
      to: `ALTER TABLE "KycSubmission" DROP COLUMN "nidaNumber";\nCREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idType_idNumber_active_key"`,
    }],
  },
  {
    name: "the duplicate read is pinned to NIDA, so a passport can be reused on a second account",
    gate: GATE_ID,
    expect: "PASSPORT · the SAME document is refused for a SECOND account",
    // ⭐ THIS CASE GREW A SECOND EDIT ON 2026-08-21, and the reason is worth reading — it is
    // the same shape as the age gate above. The duplicate check is now held by TWO
    // independent reads, each mirroring one of the two partial unique indexes: the tuple
    // read (`findActiveByIdNumber`) and the fingerprint read (`findActiveByFingerprint`,
    // added so a document that was ERASED is still spent — the erased row holds a hash, not
    // a number, so the tuple read cannot see it).
    //
    // The fingerprint is computed over the PAIR, so it catches every live duplicate the
    // tuple read catches. Pinning only the tuple read to "NIDA" therefore no longer lets a
    // passport through — the product is genuinely safer — and a one-edit case would report
    // "not caught" while nothing was wrong. So the defect needs both sites, and the list is
    // the honest description of it.
    edits: [{
      file: SVC,
      from: `    (await db.kyc.findActiveByIdNumber(idType, idNumber, userId)) ??`,
      to: `    (await db.kyc.findActiveByIdNumber("NIDA", idNumber, userId)) ??`,
    }, {
      file: SVC,
      from: `    (await db.kyc.findActiveByFingerprint(fingerprint, userId));`,
      to: `    (await db.kyc.findActiveByFingerprint("NIDA:" + fingerprint, userId));`,
    }],
  },
  {
    name: "normalisation stops stripping separators, so `AB 123456` opens a second account on one passport",
    gate: GATE_ID,
    expect: "separators and case collapse to ONE canonical value",
    edits: [{
      file: CAT,
      from: `  return (raw ?? "").replace(/[\\s\\-/.]/g, "").toUpperCase();`,
      to: `  return (raw ?? "").trim().toUpperCase();`,
    }],
  },

  // ── 🔴 THE FORMATS THIS UNIT REFUSES TO GUESS ─────────────────────────────
  {
    name: "somebody invents a driving-licence format TRA has never published",
    gate: GATE_ID,
    expect: "DRIVER_LICENSE declares that NO authoritative format exists",
    edits: [{
      file: CAT,
      from: `      kind: "unpublished",\n      absenceNote:\n        "No authoritative TRA format for a driving-licence number was found`,
      to: `      kind: "published",\n      pattern: /^TZ\\d{7}$/,\n      sourceNote: "invented",\n      absenceNote:\n        "No authoritative TRA format for a driving-licence number was found`,
    }],
  },
  {
    name: "the passport's SECONDARY shape is promoted to a hard refusal (a rumour becomes a lockout)",
    gate: GATE_ID,
    expect: "PASSPORT is SECONDARY-sourced, so ADVISORY",
    edits: [{
      file: CAT,
      from: `      kind: "secondary",\n      pattern: /^[A-Z]{1,2}[0-9]{7,8}$/,`,
      to: `      kind: "published",\n      pattern: /^[A-Z]{1,2}[0-9]{7,8}$/,`,
    }],
  },
  {
    name: "the NIDA rule is loosened from 20 digits to 'some digits'",
    gate: GATE_ID,
    expect: "that rule is still exactly 20 digits",
    edits: [{
      file: CAT,
      from: `      pattern: /^\\d{20}$/,\n      sourceNote:`,
      to: `      pattern: /^\\d+$/,\n      sourceNote:`,
    }],
  },
  {
    name: "the NIDA date check stops round-tripping, so 30 February passes as a date of birth",
    gate: GATE_ID,
    expect: "30 February is refused",
    edits: [{
      file: CAT,
      from: `  return parsed.toISOString().slice(0, 10) === iso ? iso : null;`,
      to: `  return iso;`,
    }],
  },
  {
    name: "a browser `pattern` is synthesised for the voter's card from our own sanity band",
    gate: GATE_ID,
    expect: "VOTER_CARD therefore offers the browser NO pattern",
    edits: [{
      file: CAT,
      from: `    numberLabelKey: "voterCardNumber",\n    hintKey: "openIdHint",\n    ruleKey: "openIdValidation",\n    htmlPattern: null,`,
      to: `    numberLabelKey: "voterCardNumber",\n    hintKey: "openIdHint",\n    ruleKey: "openIdValidation",\n    htmlPattern: "[A-Za-z0-9]{4,20}",`,
    }],
  },

  // ── 🔴 THE HUMAN CONTROL ──────────────────────────────────────────────────
  {
    name: "the selfie is dropped for a passport — the officer's face-match attestation loses its evidence",
    gate: GATE_ID,
    expect: "PASSPORT · requires at least one document image and a selfie",
    edits: [{
      file: CAT,
      from: `    requiredSlots: ["PASSPORT", "SELFIE"],`,
      to: `    requiredSlots: ["PASSPORT"],`,
    }],
  },
  {
    name: "the submit gate goes back to a COUNT, so a complete two-slot passport can never be submitted",
    gate: GATE_ID,
    expect: "control · card + selfie · reaches review",
    edits: [{
      file: SVC,
      from: `  const missing = missingSlots(k.idType as IdDocType, k.documents.map((d: { docType: string }) => d.docType));\n  if (missing.length > 0) {`,
      to: `  const missing = k.documents.length < 3 ? (["docs"] as unknown as ReturnType<typeof missingSlots>) : [];\n  if (missing.length > 0) {`,
    }],
  },
  {
    name: "an expired document is accepted-and-flagged instead of refused",
    gate: GATE_ID,
    expect: "an EXPIRED passport is refused at submit",
    edits: [{
      file: SVC,
      from: `    if (isExpired(expiryRaw, new Date())) {`,
      to: `    if (false && isExpired(expiryRaw, new Date())) {`,
    }],
  },
  {
    name: "🔴 the age gate becomes NIDA-only — BOTH locks, because either alone still holds it",
    gate: GATE_ID,
    expect: "PASSPORT · an under-18 applicant is refused",
    edits: [
      {
        file: VAL,
        from: `    return age >= 18;`,
        to: `    return true;`,
      },
      {
        file: SVC,
        from: `  if (!Number.isFinite(declaredAge) || declaredAge < MIN_AGE_YEARS) {`,
        to: `  if (idType === "NIDA" && (!Number.isFinite(declaredAge) || declaredAge < MIN_AGE_YEARS)) {`,
      },
    ],
  },

  // ── 🔴 THE SURFACES ───────────────────────────────────────────────────────
  {
    name: "the officer's document route goes back to a hand-written slot list (the passport bio page becomes unopenable)",
    gate: GATE_ID,
    expect: "the document route's accept-list is DERIVED from the catalogue",
    edits: [{
      file: ROUTE,
      from: `const DOC_TYPES = new Set<string>(ALL_DOC_SLOTS);`,
      to: `const DOC_TYPES = new Set<string>(["NIDA_FRONT", "NIDA_BACK", "SELFIE"]);`,
    }],
  },
  {
    name: "the form validates the type from the URL instead of its own field (a stale link picks the rule)",
    gate: GATE_ID,
    expect: "the FORM carries its own copy",
    edits: [{
      file: PAGE,
      from: `            <input type="hidden" name="idType" value={chosenType} />`,
      to: `            {/* removed */}`,
    }],
  },
  {
    name: "a greyed example returns to the identity-number box (A-5: a placeholder becomes a value)",
    gate: GATE_ID,
    expect: "no placeholder on the identity number field",
    edits: [{
      file: PAGE,
      from: `              inputMode={spec.inputMode}\n              defaultValue={(sp as Record<string, string | undefined>).idNumber ?? ""}`,
      to: `              inputMode={spec.inputMode}\n              placeholder="19950101123456789012"\n              defaultValue={(sp as Record<string, string | undefined>).idNumber ?? ""}`,
    }],
  },
  {
    name: "a surface reads the DEPRECATED nida* mirror, so one fact has two homes again",
    gate: GATE_ID,
    // ⚠️ RE-POINTED 2026-08-20 with the contract migration. It used to expect
    // "nothing outside the store layer reads the deprecated nida* columns" — an
    // assertion that became impossible to fail once the columns were dropped, and
    // whose locator exempted the two files that actually held the reads.
    expect: "no spelling of the deprecated nida* columns survives anywhere under src/",
    edits: [{
      file: PAGE,
      from: `  const idDone = !!kyc?.idVerifiedAt;`,
      to: `  const idDone = !!kyc?.idVerifiedAt || !!kyc?.nidaVerifiedAt;`,
    }],
  },
  {
    // ⭐ THE OTHER HALF OF THE CONTRACT STEP, and the one that would actually take
    // production down. The column list every generated client selects comes from
    // schema.prisma via `postinstall: prisma generate`; re-adding the field there
    // re-adds `"nidaNumber"` to every KYC SELECT, and the column no longer exists.
    name: "the deprecated column is re-added to the SCHEMA, so every KYC read names a dropped column",
    gate: GATE_ID,
    expect: "KycSubmission declares NO nida* field and NO index on one",
    edits: [{
      file: SCHEMA,
      from: `  /// WHICH of the four documents this submission is built on. Null only before the`,
      to: `  nidaNumber     String?\n  /// WHICH of the four documents this submission is built on. Null only before the`,
    }],
  },
  {
    // ⭐ THE CONTRACT MIGRATION'S RE-BACKFILL. Without it, a row written by a pre-tuple
    // container mid-deploy (or after a rollback) is held ONLY by the legacy column, and
    // the drop destroys that player's identity number while silently freeing a national
    // ID that is in use. Nothing in the repo read a contract migration before this.
    name: "the contract migration drops the column without re-running the backfill",
    gate: GATE_D1,
    expect: "it RE-RUNS the backfill, before the drop, in the same transaction",
    edits: [{
      file: DROP_MIG,
      from: `UPDATE "KycSubmission"`,
      to: `SELECT 1; -- UPDATE "KycSubmission"`,
    }],
  },
  {
    // ⭐ DROP INDEX after DROP COLUMN cannot find its target; migrate deploy runs the
    // file in one transaction, so the migration aborts and `next start` never runs.
    name: "the contract migration drops the index AFTER the column",
    gate: GATE_D1,
    expect: "with the index drops BEFORE the column drop",
    edits: [{
      file: DROP_MIG,
      // ⚠️ The two statement groups are separated by a comment, so the anchor cannot
      // span them. Moving the FIRST index drop below the columns is enough: the guard
      // compares the positions of that statement and the column drop.
      from: `DROP INDEX IF EXISTS "KycSubmission_nidaNumber_active_key";\nDROP INDEX IF EXISTS "KycSubmission_nidaNumber_idx";`,
      to: `DROP INDEX IF EXISTS "KycSubmission_nidaNumber_idx";\nALTER TABLE "KycSubmission" DROP COLUMN IF EXISTS "nidaNumber";\nDROP INDEX IF EXISTS "KycSubmission_nidaNumber_active_key";`,
    }],
  },
  {
    // ⭐ Hand-applying a migration before pushing is normal practice here, and CI replays
    // each migration exactly once — so a non-re-runnable file is GREEN in CI and fatal on
    // production, where it aborts migrate deploy and stops the container booting.
    name: "the contract migration is not re-runnable (no IF EXISTS)",
    gate: GATE_D1,
    expect: "every DDL statement is IF EXISTS",
    edits: [{
      file: DROP_MIG,
      from: `ALTER TABLE "KycSubmission" DROP COLUMN IF EXISTS "nidaNumber";`,
      to: `ALTER TABLE "KycSubmission" DROP COLUMN "nidaNumber";`,
    }],
  },
  {
    // ⭐ A number-only duplicate read is the route AROUND a rejection: blocked on your
    // NIDA, re-register on your passport. It was deleted with the column; this proves
    // the guard notices if it comes back.
    name: "a number-only duplicate read returns to the store layer",
    gate: GATE_ID,
    expect: "store.ts exposes no number-only duplicate read",
    edits: [{
      file: STORE,
      from: `    findActiveByIdNumber: (`,
      to: `    findByNida: (n: string): StoredKyc | null => null,\n    findActiveByIdNumber: (`,
    }],
  },
];

/**
 * The flat view `test:red-anchors` §3 audits: one entry per EDIT, because one entry per case
 * would leave the second half of every two-site defect unaudited.
 * ⛔ DERIVED, never hand-written — see the header.
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
