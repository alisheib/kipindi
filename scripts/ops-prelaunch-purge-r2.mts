/**
 * `ops-prelaunch-purge-r2.mts` — the R2 half of the pre-launch reset.
 *
 * Two object stores hold data the database reset cannot reach:
 *
 *   50pick-kyc       114 objects, 16.6 MB — every test player's NIDA, passport and selfie,
 *                    keyed `kyc/<userId>/<DOCTYPE>/<hash>.jpg`. Deleting a KycDocument row
 *                    does not delete the image; erasing a player without this step leaves
 *                    their identity documents sitting in a bucket with no row pointing at
 *                    them, which is the worst of both worlds — undiscoverable and retained.
 *   50pick-backups    43 objects, 1,075 MB — daily sealed dumps, 2026-07-31 → 2026-09-11.
 *                    Every one of them contains the full player table it was taken from.
 *
 *   npm run ops:prelaunch-purge -- --plan
 *   npm run ops:prelaunch-purge -- --purge-kyc     --confirm "PURGE 50PICK R2"
 *   npm run ops:prelaunch-purge -- --purge-backups --confirm "PURGE 50PICK R2"
 *
 * ⛔ ORDERING IS THE WHOLE SAFETY ARGUMENT, AND IT RUNS BACKWARDS FROM THE ASK.
 * "Remove old backups" is the last step, never the first. Deleting them before the reset
 * is verified destroys the only rollback path at the exact moment it is most likely to be
 * needed. So --purge-backups refuses unless BOTH hold:
 *
 *   1. `.prelaunch-verified.json` exists — the reset's invariants actually passed.
 *   2. A backup object exists that is NEWER than the reset — the clean post-reset dump.
 *      Until that exists, purging leaves the platform with no current backup at all.
 *
 * And it keeps the newest PRE-reset backup (Ali's ruling 2026-09-11), so there is still a
 * way back to the pre-launch state after the purge.
 *
 * ⛔ --purge-kyc refuses while any KycDocument row survives. An object still referenced by
 * a live row is in use; only a bucket whose rows are all gone is safe to empty.
 */
import pg from "pg";
import { existsSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CONFIRM = "PURGE 50PICK R2";
const RECEIPT = ".prelaunch-reset-receipt.json";
const VERIFIED = ".prelaunch-verified.json";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`✖ ${k} is not set. Pull the R2 credentials into the environment first:`);
    console.error(`    railway variables --service 50pick --json   (R2_ENDPOINT, R2_ACCESS_KEY_ID,`);
    console.error(`                                                 R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET)`);
    process.exit(1);
  }
  return v;
};

const fmtMb = (b: number) => (b / 1e6).toFixed(1) + " MB";

async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: env("R2_ENDPOINT"),
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  });
}

type Obj = { Key: string; Size: number; LastModified: Date };

async function listAll(client: any, Bucket: string): Promise<Obj[]> {
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const out: Obj[] = [];
  let ContinuationToken: string | undefined;
  do {
    const r: any = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
    for (const o of r.Contents ?? []) out.push({ Key: o.Key, Size: Number(o.Size ?? 0), LastModified: new Date(o.LastModified) });
    ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out.sort((a, b) => +a.LastModified - +b.LastModified);
}

/** Deletes in batches of 1000; reports what the store actually refused. */
async function deleteObjects(client: any, Bucket: string, keys: string[]) {
  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  let deleted = 0;
  const errors: string[] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const r: any = await client.send(
      new DeleteObjectsCommand({ Bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: false } })
    );
    deleted += (r.Deleted ?? []).length;
    for (const e of r.Errors ?? []) errors.push(`${e.Key}: ${e.Code} ${e.Message}`);
  }
  return { deleted, errors };
}

/** The reset instant, from the receipt. Everything older is "pre-reset". */
function resetAt(): Date | null {
  if (!existsSync(RECEIPT)) return null;
  return new Date(JSON.parse(readFileSync(RECEIPT, "utf8")).at);
}

/** Splits the backup bucket into keep/purge exactly as Ali chose. */
function classifyBackups(objs: Obj[], T: Date) {
  const pre = objs.filter((o) => o.LastModified < T);
  const post = objs.filter((o) => o.LastModified >= T);
  const safetyNet = pre.length ? pre[pre.length - 1] : null; // newest PRE-reset = the rollback point
  const purge = pre.filter((o) => o !== safetyNet);
  return { pre, post, safetyNet, purge };
}

async function main() {
  const client = await s3();
  const backupBucket = env("R2_BACKUP_BUCKET");
  const kycBucket = process.env.R2_BUCKET ?? "50pick-kyc";

  const T = resetAt();
  const verified = existsSync(VERIFIED);

  if (has("--purge-kyc")) {
    if (val("--confirm") !== CONFIRM) return console.error(`✖ needs --confirm "${CONFIRM}"`);
    const db = new pg.Client({
      connectionString: process.env.DATABASE_URL ?? process.env.RESET_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await db.connect();
    const live = Number((await db.query(`SELECT count(*)::int n FROM "KycDocument"`)).rows[0].n);
    await db.end();
    if (live > 0) {
      console.error(`✖ ${live} KycDocument row(s) still reference objects in this bucket.`);
      console.error("  Run the database reset first. Emptying a bucket that live rows point at");
      console.error("  breaks the documents an officer can still open in /admin.");
      process.exit(1);
    }
    const objs = await listAll(client, kycBucket);
    console.log(`${kycBucket}: ${objs.length} object(s), ${fmtMb(objs.reduce((a, o) => a + o.Size, 0))}`);
    console.log(`0 KycDocument rows remain, so every object here is unreferenced. Deleting all.`);
    const r = await deleteObjects(client, kycBucket, objs.map((o) => o.Key));
    console.log(`✔ deleted ${r.deleted}/${objs.length}`);
    for (const e of r.errors) console.error("  ✖ " + e);
    return;
  }

  if (has("--purge-backups")) {
    if (val("--confirm") !== CONFIRM) return console.error(`✖ needs --confirm "${CONFIRM}"`);
    if (!T) {
      console.error(`✖ No ${RECEIPT}. The reset has not run, so every backup here is still current.`);
      process.exit(1);
    }
    if (!verified) {
      console.error(`✖ No ${VERIFIED}. The reset's invariants have not passed.`);
      console.error("  Backups are the rollback path for exactly this situation — run --verify first.");
      process.exit(1);
    }
    const objs = await listAll(client, backupBucket);
    const { post, safetyNet, purge } = classifyBackups(objs, T);
    if (post.length === 0) {
      console.error("✖ No backup exists that is NEWER than the reset.");
      console.error(`    reset at ${T.toISOString()}`);
      console.error(`    newest backup ${objs.length ? objs[objs.length - 1].LastModified.toISOString() : "(none)"}`);
      console.error("  Take the post-reset backup first (`npm run db:backup && npm run db:verify-backup`),");
      console.error("  or this purge leaves the platform with no current backup at all.");
      process.exit(1);
    }
    console.log(`KEEP  ${safetyNet!.Key}  (${fmtMb(safetyNet!.Size)}) — pre-reset rollback point`);
    console.log(`KEEP  ${post.length} post-reset backup(s)`);
    console.log(`PURGE ${purge.length} object(s), ${fmtMb(purge.reduce((a, o) => a + o.Size, 0))}`);
    const r = await deleteObjects(client, backupBucket, purge.map((o) => o.Key));
    console.log(`✔ deleted ${r.deleted}/${purge.length}`);
    for (const e of r.errors) console.error("  ✖ " + e);
    return;
  }

  // ── --plan ──
  for (const [bucket, what] of [[backupBucket, "backups"], [kycBucket, "KYC documents"]] as const) {
    const objs = await listAll(client, bucket);
    const bytes = objs.reduce((a, o) => a + o.Size, 0);
    console.log(`\n${"═".repeat(74)}\n${bucket} — ${what}\n${"═".repeat(74)}`);
    console.log(`  ${objs.length} object(s), ${fmtMb(bytes)}`);
    if (objs.length) {
      console.log(`  oldest ${objs[0].LastModified.toISOString().slice(0, 19)}   newest ${objs[objs.length - 1].LastModified.toISOString().slice(0, 19)}`);
    }
    if (bucket === backupBucket) {
      if (!T) {
        console.log(`\n  Reset has not run yet (no ${RECEIPT}).`);
        console.log(`  ⛔ All ${objs.length} are the CURRENT backups of a live database — nothing is purgeable.`);
        console.log(`     After the reset + --verify + a post-reset backup, this becomes:`);
        console.log(`        keep the newest pre-reset object, keep every post-reset object,`);
        console.log(`        purge the other ${Math.max(0, objs.length - 1)}.`);
      } else {
        const { post, safetyNet, purge } = classifyBackups(objs, T);
        console.log(`\n  reset at ${T.toISOString()} · verified: ${verified ? "yes" : "NO"}`);
        console.log(`  KEEP  ${safetyNet?.Key ?? "(none)"} — pre-reset rollback point`);
        console.log(`  KEEP  ${post.length} post-reset backup(s)`);
        console.log(`  PURGE ${purge.length} object(s), ${fmtMb(purge.reduce((a, o) => a + o.Size, 0))}`);
        if (post.length === 0) console.log(`  ⛔ blocked: no post-reset backup exists yet`);
        if (!verified) console.log(`  ⛔ blocked: --verify has not passed`);
      }
    } else {
      const byUser = new Set(objs.map((o) => o.Key.split("/")[1]));
      console.log(`  ${byUser.size} distinct user folder(s) — all deleted once KycDocument is empty`);
    }
  }
  console.log();
}

await main();
