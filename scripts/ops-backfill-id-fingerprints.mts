/**
 * BACKFILL `KycSubmission.idFingerprint` for the rows that predate it.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-backfill-id-fingerprints.mts --dry
 *   railway run --service 50pick -- npx tsx scripts/ops-backfill-id-fingerprints.mts --write
 *
 * ── WHY THE MIGRATION COULD NOT DO THIS ──────────────────────────────────────
 * `idFingerprint` is a KEYED HMAC and the key (`OTP_PEPPER`) lives in the application, not
 * in Postgres. Putting it in `20260821140000_kyc_identity_fingerprint/migration.sql` would
 * commit a production secret to git — so the column ships NULL and this fills it in, running
 * inside the container where the pepper already is.
 *
 * ── ⚠️ AND WHY NOTHING BREAKS WHILE IT HAS NOT RUN ───────────────────────────
 * Correctness does not depend on this script, and saying so is the point — an ops step that
 * is load-bearing and manual is an outage waiting for the person who forgets it.
 *
 *   · While a submission still holds its RAW `idNumber`, the TUPLE index
 *     ("KycSubmission_idType_idNumber_active_key") is doing the uniqueness work.
 *   · `anonymizeClosedAccount` computes the fingerprint itself, from the raw number, at the
 *     one moment it still can — immediately before destroying it.
 *
 * What this script buys is the INVARIANT: *every active submission carries a fingerprint*.
 * With it true, the fingerprint index is a second live enforcement of one-document-one-account
 * for every existing player rather than only for future ones, and a row with a NULL
 * fingerprint becomes a thing worth investigating rather than the normal case.
 *
 * ⛔ IT NEVER OVERWRITES. `WHERE "idFingerprint" IS NULL` — a value the application has
 * written since (including an erasure's) always wins, and a re-run is a no-op.
 *
 * ⛔ IT REFUSES TO WRITE A FINGERPRINT THAT WOULD COLLIDE. Two active rows hashing to the
 * same value means two active rows on one document, which the tuple index has forbidden since
 * 2026-08-20 — so it cannot happen, and if it somehow has, the UNIQUE index would abort this
 * script mid-run. The pre-flight below finds it first and reports the pair instead, because a
 * failed `UPDATE` inside a loop leaves a half-backfilled table and no explanation.
 */
import { Client } from "pg";
import { identityFingerprint } from "../src/lib/server/crypto.ts";

const WRITE = process.argv.includes("--write");
const DRY = process.argv.includes("--dry") || !WRITE;

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) {
  console.error("no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}
if (!process.env.OTP_PEPPER) {
  // ⛔ REFUSE, LOUDLY. `requireSecret` falls back to a dev pepper outside production, so
  // running this on a laptop without the real one would write 67 fingerprints that the live
  // application can never reproduce — silently disarming the index it exists to arm.
  console.error("REFUSING: OTP_PEPPER is not set. Fingerprints written under the dev fallback");
  console.error("          would never match the ones production computes, which disarms the");
  console.error("          index instead of arming it. Run inside the container.");
  process.exit(2);
}

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

try {
  const { rows } = await c.query<{ id: string; idType: string; idNumber: string; status: string }>(
    `select id, "idType"::text as "idType", "idNumber", status::text as status
       from "KycSubmission"
      where "idNumber" IS NOT NULL
        AND "idType" IS NOT NULL
        AND "idFingerprint" IS NULL
      order by "createdAt"`,
  );
  console.log(`${rows.length} submission(s) need a fingerprint\n`);

  // Pre-flight: would any two ACTIVE rows land on the same value?
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  const plan: { id: string; fp: string; status: string }[] = [];
  for (const r of rows) {
    const fp = identityFingerprint(r.idType, r.idNumber.trim());
    plan.push({ id: r.id, fp, status: r.status });
    if (r.status === "REJECTED") continue;            // partial index ignores these
    const prior = seen.get(fp);
    if (prior) clashes.push(`${prior} and ${r.id} hash alike — two active rows, one document`);
    else seen.set(fp, r.id);
  }
  if (clashes.length > 0) {
    console.error("🔴 REFUSING — the backfill would violate the unique index:");
    for (const l of clashes) console.error(`   ${l}`);
    console.error("\nThat should be impossible: the tuple index has forbidden it since 2026-08-20.");
    console.error("Investigate the pair before writing anything.");
    process.exit(1);
  }

  for (const p of plan) {
    // ⛔ Print the first 12 hex only. The full value is not a secret, but a log line is a
    // place data goes to live for ever and a stable per-document identifier in one is a
    // correlation key (audit F-06 masked seven of these).
    console.log(`  ${DRY ? "would set" : "set     "} ${p.id}  ${p.fp.slice(0, 12)}…  (${p.status})`);
    if (WRITE) {
      await c.query(
        `update "KycSubmission" set "idFingerprint" = $1 where id = $2 and "idFingerprint" IS NULL`,
        [p.fp, p.id],
      );
    }
  }

  if (WRITE) {
    // Read-your-write, against the table rather than the loop above.
    const { rows: left } = await c.query<{ n: string }>(
      `select count(*)::text as n from "KycSubmission"
        where "idNumber" IS NOT NULL AND "idType" IS NOT NULL AND "idFingerprint" IS NULL`,
    );
    console.log(`\n${plan.length} written · ${left[0].n} still without a fingerprint (want 0)`);
    if (left[0].n !== "0") process.exit(1);
  } else {
    console.log(`\nDRY RUN — nothing written. Re-run with --write.`);
  }
} finally {
  await c.end();
}
