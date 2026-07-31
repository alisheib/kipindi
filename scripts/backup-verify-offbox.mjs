/**
 * Prove the nightly artifact actually LANDED in R2 — don't trust a green step.
 *
 *   railway run node scripts/backup-verify-offbox.mjs
 *
 * The 2026-07-31 run reported every step green while `::verify-result::` carried
 * `"destination":""`. A green "Ship it off-box" with no destination is exactly what a
 * silent no-op looks like, and "we have off-box backups" is the single claim you cannot
 * afford to be wrong about. So: list the bucket and show what is really in it.
 */
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BACKUP_BUCKET || "50pick-backups";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("\n❌ R2 credentials absent. Run via `railway run`.\n");
  process.exit(1);
}

const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
const client = new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });

console.log(`\nbucket: ${bucket}\n`);

let res;
try {
  res = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 50 }));
} catch (e) {
  const code = e.$metadata?.httpStatusCode;
  console.error(`❌ cannot list ${bucket}: ${e.name}${code ? ` (${code})` : ""}`);
  if (e.name === "NoSuchBucket" || code === 404) {
    console.error("\n🔴 THE BUCKET DOES NOT EXIST. Nothing has ever been shipped off-box.");
    console.error("   Cloudflare → R2 → Create bucket → " + bucket + "\n");
  }
  process.exit(2);
}

const objs = (res.Contents ?? []).sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
if (!objs.length) {
  console.error("🔴 bucket EXISTS but is EMPTY — no artifact has ever landed.\n");
  process.exit(3);
}

const fmt = (n) => `${(n / 1_048_576).toFixed(2)} MB`;
console.log(`${objs.length} object(s)${res.IsTruncated ? " (truncated at 50)" : ""}:\n`);
for (const o of objs.slice(0, 15)) {
  console.log(`  ${new Date(o.LastModified).toISOString()}  ${fmt(o.Size).padStart(10)}  ${o.Key}`);
}

// ── Retention: is anything ever deleted? ─────────────────────────────────────
//
// 🔴 WHY THIS IS CHECKED HERE, on every run. Each artifact is a FULL copy of every
// balance, phone number, NIDA and KYC record on the platform. Without an expiry rule the
// bucket accumulates all of it forever, and "we keep every player's identity documents
// indefinitely, in duplicate" is a data-protection problem rather than a storage bill.
// It is also invisible: nothing fails, nothing warns, the bucket just grows.
//
// Checked rather than assumed because the rule is set in the Cloudflare dashboard — an
// R2 token with Object Read & Write cannot write bucket configuration (verified
// 2026-07-31: PutBucketLifecycleConfiguration → AccessDenied), so it can be removed or
// never created without anything in this repo noticing.
try {
  const { GetBucketLifecycleConfigurationCommand } = await import("@aws-sdk/client-s3");
  const lc = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
  const rules = (lc.Rules ?? []).filter((r) => r.Status === "Enabled");
  const expiry = rules.find((r) => r.Expiration?.Days);
  if (expiry) {
    console.log(`\nretention: objects expire after ${expiry.Expiration.Days} days (rule "${expiry.ID}").`);
  } else {
    console.error(
      "\n⚠️  NO EXPIRY RULE — backups accumulate FOREVER.\n" +
        "   Every artifact holds every KYC record on the platform, so this is a data-protection\n" +
        "   exposure that grows daily. Cloudflare → R2 → " + bucket + " → Settings →\n" +
        "   Object Lifecycle Rules → expire after 90 days.",
    );
    process.exitCode = 6;
  }
} catch (e) {
  if (e.name === "NoSuchLifecycleConfiguration" || e.$metadata?.httpStatusCode === 404) {
    console.error(
      "\n⚠️  NO EXPIRY RULE — backups accumulate FOREVER.\n" +
        "   Every artifact holds every KYC record on the platform. Cloudflare → R2 → " + bucket +
        " → Settings → Object Lifecycle Rules → expire after 90 days.",
    );
    process.exitCode = 6;
  } else {
    // Do NOT report "no rule" when the answer is "this token may not ask" — that would be a
    // false alarm, and a check that cries wolf gets ignored exactly like a green tick.
    // But do NOT go quiet either: "unverified" is not "fine", and the whole reason this
    // check exists is that an unbounded pile of KYC copies is invisible until someone looks.
    console.error(
      `\n⚠️  RETENTION UNVERIFIED (${e.name}) — this token cannot read bucket configuration,\n` +
        `   so nothing here can confirm the backups are EVER deleted. Each one holds every KYC\n` +
        `   record on the platform. Either confirm the rule by hand at Cloudflare → R2 →\n` +
        `   ${bucket} → Settings → Object Lifecycle Rules (expire after 90 days), or widen the\n` +
        `   token so this check can answer for itself.`,
    );
  }
}

const newest = objs[0];
const ageH = (Date.now() - new Date(newest.LastModified)) / 3_600_000;
console.log(`\nnewest is ${ageH.toFixed(1)}h old.`);
if (newest.Size < 1_000_000) {
  console.error("\n⚠️  Newest artifact is under 1 MB. Production dumps ~13 MB — suspect a truncated upload.\n");
  process.exitCode = 4;
} else if (ageH > 30) {
  console.error("\n⚠️  Newest artifact is over 30h old — the nightly has not run or is failing.\n");
  process.exitCode = 5;
} else {
  console.log("✅ a recent, plausibly-sized artifact is off-box.\n");
}
