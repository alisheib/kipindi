/**
 * THE ANCHORS `red:dead-schema` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason `updown-readiness.anchors.mjs` sets out at length: the fleet
 * auditor must answer *"does every anchor still resolve, exactly once?"* WITHOUT executing a
 * harness that rewrites real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHAT THESE MUTATIONS ARE ──────────────────────────────────────────────────
 * F-05 has two ways to go wrong and they are on opposite sides of a rolling deploy. Cases 1–2
 * put a DECLARATION back — which is fatal *after* the DDL runs, because Prisma selects every
 * scalar column and the table is gone. Cases 5–6 put the DDL in the shape that takes production
 * down on the way in: a statement that is not re-runnable, or a CONCURRENTLY inside Prisma's
 * transaction. Case 4 is the quiet one: a real delegate read of a table that no longer exists.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const SCHEMA = "prisma/schema.prisma";
const PRIVACY = "src/lib/server/privacy.ts";
const MIGRATION = "prisma/migrations/20260821140000_kyc_identity_fingerprint/migration.sql";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // 🔴 The declaration back without its table. After the contract migration this is a 42703
    // on every read of that model — and `prisma generate` bakes it from this file, so it is the
    // previously-deployed container's client that carries it into a rolling deploy.
    name: "Device declared again (a column list naming a table that is gone)",
    file: SCHEMA,
    suite: "dead-schema",
    from: `model Wallet {`,
    to: `model Device {\n  id     String @id @default(cuid())\n  userId String\n}\n\nmodel Wallet {`,
  },
  {
    // The same defect on a column of a model that STAYS — the harder one to spot, because the
    // table is still there and only two columns are not.
    name: "KycDocument.ocrText declared again (a dead column back in the SELECT list)",
    file: SCHEMA,
    suite: "dead-schema",
    from: `  rejected     Boolean       @default(false)`,
    to: `  ocrText      String?\n  rejected     Boolean       @default(false)`,
  },
  {
    // ⭐ The annotation removed. Nothing breaks — which is the problem: the next reader finds
    // an empty table with no explanation and deletes it for being empty, and `Session` has code
    // paths that `Device` never had.
    name: "Session's DORMANT note deleted (an empty table that reads as an oversight)",
    file: SCHEMA,
    suite: "dead-schema",
    from: `/// ⭐ DORMANT, DELIBERATELY KEPT (audit F-05, 2026-08-21). **0 rows on production, measured.**
///
/// It is on this side of the line and \`Device\` was not,`,
    to: `/// (note removed)
///
/// It is on this side of the line and \`Device\` was not,`,
  },
  {
    // The model itself deleted — F-05 applied as "drop the empty tables", which is the reading
    // this suite exists to refuse.
    name: "Session deleted too (F-05 read as 'drop the empty tables')",
    file: SCHEMA,
    suite: "dead-schema",
    from: `model Session {`,
    to: `model SessionRemoved {`,
  },
  {
    // A genuine delegate read of a dropped table. `tsc` catches this one TODAY, because the
    // generated client no longer has the delegate — but a cast to `any` erases that, which is
    // exactly how `(prisma as any).upDownProposal` shipped and threw on production for weeks.
    name: "a real delegate read of AntiFraudFlag (the shape a cast hides from tsc)",
    file: PRIVACY,
    suite: "dead-schema",
    from: `  const responsible = await db.responsible.get(userId);`,
    to: `  const responsible = await db.responsible.get(userId);\n  void (db as unknown as { antiFraudFlag: { findMany: () => unknown } }).antiFraudFlag.findMany();`,
  },
  {
    // 🔴 A drop that is not re-runnable. CI replays each migration exactly once against a fresh
    // database, so this is GREEN in CI and fatal on production — where pre-applying by hand is
    // normal practice, the statement fails the second time, `migrate deploy` aborts, and
    // `next start` is never reached.
    name: "contract DDL without IF EXISTS (green in CI, fatal on production)",
    file: MIGRATION,
    suite: "dead-schema",
    from: `ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idFingerprint" TEXT;`,
    to: `ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idFingerprint" TEXT;\nDROP TABLE "Device";`,
  },
  {
    // ⛔ CONCURRENTLY inside Prisma's transaction — 25001, and it takes the boot with it.
    name: "contract DDL with CONCURRENTLY (25001 inside migrate deploy's transaction)",
    file: MIGRATION,
    suite: "dead-schema",
    from: `CREATE INDEX IF NOT EXISTS "KycSubmission_idFingerprint_idx"`,
    to: `DROP TABLE IF EXISTS "Device";\nDROP INDEX CONCURRENTLY IF EXISTS "Device_fingerprint_idx";\nCREATE INDEX IF NOT EXISTS "KycSubmission_idFingerprint_idx"`,
  },
];
