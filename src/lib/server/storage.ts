/**
 * KYC document storage seam (audit H8).
 *
 * KYC ID imagery is sensitive PII. Today it is stored INLINE as a base64 image
 * data URL on the KYC submission row (Postgres) — simple, but it bloats the row
 * and keeps raw ID photos in the primary DB. This module is the single seam that
 * lets those bytes move to object storage (Cloudflare **R2**, S3-compatible) the
 * moment it is configured, with ZERO behavior change until then.
 *
 * Mode is env-gated:
 *   - default (no R2 env) → INLINE: `putKycDocument` returns the data URL
 *     unchanged (exactly today's behavior); `readKycDocument` decodes it.
 *   - `KYC_STORAGE=r2` + R2 creds → R2: `putKycDocument` uploads the bytes and
 *     returns an `r2:<key>` reference; `readKycDocument` fetches it back.
 *
 * The `@aws-sdk/client-s3` dependency is OPTIONAL and loaded via a computed
 * specifier, so the build never requires it (verified: it stays out of the graph
 * exactly like the Sentry seam). To activate (Ali):
 *   1. `npm i @aws-sdk/client-s3`
 *   2. set `KYC_STORAGE=r2`, `R2_ENDPOINT` (https://<account>.r2.cloudflarestorage.com),
 *      `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
 *   3. round-trip a KYC upload + admin view in STAGING before production.
 * Existing INLINE documents keep working after activation (readKycDocument routes
 * by the stored key's shape), so no backfill is required to switch new uploads to R2.
 */
import { randomId } from "./crypto";

const DATAURL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function kycStorageMode(): "r2" | "inline" {
  return process.env.KYC_STORAGE === "r2" && !!process.env.R2_BUCKET ? "r2" : "inline";
}

function extFor(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

/**
 * Persist an uploaded document (a validated image data URL) and return the value
 * to store in `storageKey`. INLINE → the data URL itself (unchanged). R2 → an
 * `r2:<key>` reference. `keyHint` (e.g. `userId/NIDA_FRONT`) namespaces the object.
 */
export async function putKycDocument(dataUrl: string, keyHint: string): Promise<string> {
  if (kycStorageMode() === "inline") return dataUrl;
  const m = DATAURL_RE.exec(dataUrl);
  if (!m) throw new Error("putKycDocument: value is not a supported image data URL");
  const bytes = Buffer.from(m[2], "base64");
  const key = `kyc/${keyHint.replace(/[^a-zA-Z0-9/_-]/g, "_")}/${randomId(12)}.${extFor(m[1])}`;
  await r2Put(key, bytes, m[1]);
  return `r2:${key}`;
}

/** Read a stored document back to raw bytes + mime, routing by the key shape.
 *  Returns null if the key holds no readable image. */
export async function readKycDocument(storageKey: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (storageKey.startsWith("r2:")) {
    return r2Get(storageKey.slice(3));
  }
  const m = DATAURL_RE.exec(storageKey);
  if (!m) return null; // legacy placeholder / unknown reference
  try {
    return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

// ── R2 (S3-compatible) — optional dependency, loaded only when configured ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3Client: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getS3(): Promise<{ client: any; mod: any }> {
  // Computed specifier keeps @aws-sdk/client-s3 out of the static build graph.
  const spec = ["@aws-sdk", "client-s3"].join("/");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import(/* @vite-ignore */ spec).catch(() => {
    throw new Error("KYC_STORAGE=r2 but @aws-sdk/client-s3 is not installed — run `npm i @aws-sdk/client-s3`.");
  });
  if (!s3Client) {
    const endpoint = process.env.R2_ENDPOINT;
    if (!endpoint) throw new Error("R2_ENDPOINT is not set.");
    s3Client = new mod.S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return { client: s3Client, mod };
}

async function r2Put(key: string, bytes: Buffer, contentType: string): Promise<void> {
  const { client, mod } = await getS3();
  await client.send(new mod.PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: bytes,
    ContentType: contentType,
  }));
}

async function r2Get(key: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const { client, mod } = await getS3();
  try {
    const res = await client.send(new mod.GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
    const arr = await res.Body.transformToByteArray();
    return { mime: res.ContentType ?? "image/jpeg", bytes: Buffer.from(arr) };
  } catch {
    return null;
  }
}
