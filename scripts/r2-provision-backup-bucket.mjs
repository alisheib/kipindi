/**
 * Create the R2 bucket the nightly backup uploads into — once, idempotently.
 *
 * `docs/BACKUP-RUNBOOK.md` listed "create R2_BACKUP_BUCKET" as a manual operator step,
 * which meant the nightly workflow stayed red on its config check with nobody sure what
 * exactly was missing. This does it, and says plainly what it found.
 *
 *   railway run node scripts/r2-provision-backup-bucket.mjs          # report only
 *   railway run node scripts/r2-provision-backup-bucket.mjs --create # actually create
 *
 * 🔴 It REFUSES to reuse the KYC bucket. A backup and the identity documents inside it
 * must not share a blast radius — that is the whole reason for a second bucket.
 *
 * ⚠️ Separate bucket is not separate credentials. This uses the R2 key the running app
 * already holds, so that one key still reaches both buckets. Narrowing it to a
 * backup-only token is a Cloudflare dashboard action and is still worth doing.
 */

const CREATE = process.argv.includes("--create");
const DEFAULT_BACKUP_BUCKET = "50pick-backups";

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const kycBucket = process.env.R2_BUCKET;
const backupBucket = process.env.R2_BACKUP_BUCKET || DEFAULT_BACKUP_BUCKET;

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!endpoint || !accessKeyId || !secretAccessKey) {
  die(
    "R2 credentials are not in this environment. Run through Railway so they are injected:\n" +
      "   railway run node scripts/r2-provision-backup-bucket.mjs --create",
  );
}

if (kycBucket && backupBucket === kycBucket) {
  die(
    `R2_BACKUP_BUCKET is the KYC bucket (${kycBucket}). Refusing.\n` +
      "   The running app can reach the KYC bucket; a backup must not share that blast radius.",
  );
}

const { S3Client, ListBucketsCommand, CreateBucketCommand, HeadBucketCommand } =
  await import("@aws-sdk/client-s3");

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

console.log(`\nR2 endpoint : ${endpoint.replace(/https:\/\/([^.]{4})[^.]*/, "https://$1…")}`);
console.log(`KYC bucket  : ${kycBucket ?? "(R2_BUCKET unset)"}`);
console.log(`Backup targ.: ${backupBucket}${process.env.R2_BACKUP_BUCKET ? "" : "  (default — R2_BACKUP_BUCKET is unset)"}`);

let existing = null;
try {
  const listed = await client.send(new ListBucketsCommand({}));
  existing = (listed.Buckets ?? []).map((b) => b.Name);
  console.log(`\nBuckets this key can see: ${existing.length ? existing.join(", ") : "(none)"}`);
} catch (e) {
  // A bucket-scoped token cannot list. Fall back to a direct probe.
  console.log(`\nListBuckets refused (${e.name}) — token is probably bucket-scoped. Probing directly.`);
}

let present = false;
try {
  await client.send(new HeadBucketCommand({ Bucket: backupBucket }));
  present = true;
} catch (e) {
  if (e.$metadata?.httpStatusCode !== 404 && e.name !== "NotFound" && e.name !== "NoSuchBucket") {
    console.log(`HeadBucket(${backupBucket}) -> ${e.name} (${e.$metadata?.httpStatusCode})`);
  }
}

if (present) {
  console.log(`\n✅ ${backupBucket} already exists and this key can reach it.`);
} else if (!CREATE) {
  console.log(`\n⚠️  ${backupBucket} does NOT exist. Re-run with --create to make it.`);
  process.exit(2);
} else {
  try {
    await client.send(new CreateBucketCommand({ Bucket: backupBucket }));
    console.log(`\n✅ created ${backupBucket}`);
  } catch (e) {
    if (e.name === "BucketAlreadyOwnedByYou") {
      console.log(`\n✅ ${backupBucket} already owned by this account.`);
    } else {
      die(
        `could not create ${backupBucket}: ${e.name} — ${e.message}\n` +
          "   An R2 API token scoped to a single bucket cannot create buckets. Create it in the\n" +
          "   Cloudflare dashboard (R2 -> Create bucket) and set R2_BACKUP_BUCKET.",
      );
    }
  }
}

console.log(
  `\nNext: set R2_BACKUP_BUCKET=${backupBucket} as a GitHub repository secret (the nightly\n` +
    `workflow reads it there, not from Railway), alongside BACKUP_SOURCE_DATABASE_URL,\n` +
    `BACKUP_ENCRYPTION_KEY, AUDIT_CHAIN_SECRET, R2_ENDPOINT, R2_ACCESS_KEY_ID,\n` +
    `R2_SECRET_ACCESS_KEY. See docs/BACKUP-RUNBOOK.md.\n`,
);
