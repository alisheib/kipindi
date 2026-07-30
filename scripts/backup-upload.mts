/**
 * `npm run db:backup-upload -- --file <artifact>` — ship a sealed backup OFF-BOX.
 *
 * WHY THIS IS A SEPARATE SCRIPT. `db:backup` is read-only by construction and its
 * documentation says so; that promise is worth more than the convenience of folding an
 * upload into it. This is the only piece of the toolchain that writes anywhere outside
 * the repo, and it is the difference between a backup and a copy of the database sitting
 * on the same disk as the database.
 *
 * WHAT IT REFUSES TO SEND. An unsealed artifact. A 50pick dump is every phone number,
 * NIDA, KYC OCR string and email on the platform; the whole point of AES-256-GCM is that
 * the bucket holding it is not also the thing protecting it. There is no override.
 *
 * Uses the R2 credentials the platform already has for KYC storage (`R2_ENDPOINT`,
 * `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), but a SEPARATE bucket via
 * `R2_BACKUP_BUCKET` — a backup and the documents it contains should not share a blast
 * radius, and the KYC bucket is reachable from the running app.
 *
 * Prints `::upload-result::{...}` so the nightly workflow can pass `BACKUP_DESTINATION`
 * to `db:verify-backup --record` and the compliance card can say where the artifact went.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { isSealed } from "../src/lib/server/backup/core.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(msg: string): never {
  console.error(`\n!! ${msg}\n`);
  process.exit(2);
}

async function main(): Promise<void> {
  const file = arg("file");
  if (!file) die("usage: npm run db:backup-upload -- --file <artifact>");

  const bytes = readFileSync(file);
  if (!isSealed(bytes)) {
    die(
      "REFUSING to upload an UNSEALED backup.\n" +
        "   This file is every balance, phone number, NIDA and KYC record on the platform in\n" +
        "   plaintext. Re-take it with BACKUP_ENCRYPTION_KEY set.",
    );
  }

  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BACKUP_BUCKET;
  const keyId = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !keyId || !secret) {
    die(
      "R2 is not configured for backups. Needs R2_ENDPOINT, R2_BACKUP_BUCKET,\n" +
        "   R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.\n" +
        "   ⚠️  R2_BACKUP_BUCKET is deliberately NOT the KYC bucket: the running app can\n" +
        "   reach that one, and a backup should not share a blast radius with the data in it.",
    );
  }

  // Foldered by date so a bucket lifecycle rule can expire old backups by prefix,
  // and so a human can find "the one from Tuesday" without listing 400 objects.
  const key = `${new Date().toISOString().slice(0, 10)}/${basename(file)}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: "application/octet-stream",
      // Travels with the object so its integrity can be checked without the manifest.
      Metadata: { sha256, sealed: "aes-256-gcm" },
    }),
  );

  const destination = `r2://${bucket}/${key}`;
  console.log(`Uploaded ${(statSync(file).size / 1_048_576).toFixed(2)} MB → ${destination}`);
  console.log(`sha256:  ${sha256}`);
  console.log(`\n::upload-result::${JSON.stringify({ destination, sha256, bucket, key })}`);
}

main().catch((e: unknown) => {
  console.error("\nUPLOAD FAILED:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
