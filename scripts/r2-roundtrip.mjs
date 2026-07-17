/**
 * R2 wiring smoke test — validates the KYC storage creds/bucket/endpoint end to end
 * by writing a throwaway object and reading it back, then deleting it.
 * Run AFTER the R2_* env vars are set:
 *   node scripts/r2-roundtrip.mjs
 * Reads the same env vars the app's src/lib/server/storage.ts reads.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
for (const [k, v] of Object.entries({ R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY })) {
  if (!v) { console.error(`MISSING env: ${k}`); process.exit(2); }
}

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const Key = "kyc/_roundtrip_test/hello.txt";
const payload = "50pick R2 roundtrip OK";

try {
  await client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key, Body: payload, ContentType: "text/plain" }));
  const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key }));
  const got = await res.Body.transformToString();
  const ok = got === payload;
  console.log(`PUT+GET round-trip: ${ok ? "PASS ✅" : "FAIL ❌"} (read back: ${JSON.stringify(got)})`);
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key }));
  console.log("cleanup: deleted test object ✅");
  console.log(`endpoint=${R2_ENDPOINT} bucket=${R2_BUCKET}`);
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error("R2 round-trip ERROR:", e?.name, e?.message);
  process.exit(1);
}
