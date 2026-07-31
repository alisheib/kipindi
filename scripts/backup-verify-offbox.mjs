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
