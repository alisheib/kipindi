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

/**
 * 🔴 Refuse to DEGRADE silently.
 *
 * `kycStorageMode()` answers "inline" whenever R2 is not fully configured — correct
 * as a default, dangerous as a fallback. If an operator has set `KYC_STORAGE=r2`
 * they have stated an intent; resolving that to "inline" because `R2_BUCKET` is
 * missing writes base64 ID photographs into Postgres with no throw, no log and no
 * alert. Not hypothetical: rolling the R2 token once broke KYC storage on
 * production and nothing reported it.
 *
 * So an UNCONFIGURED intent is an error, not a fallback. Failing the upload keeps
 * the photograph out of the primary database and out of every nightly backup; the
 * player retries, and the operator sees a real error instead of silence.
 *
 * Only fires when the intent is explicit — no `KYC_STORAGE` at all is a legitimate
 * inline deployment and stays silent.
 */
export function assertStorageModeIntended(): void {
  if (process.env.KYC_STORAGE === "r2" && !process.env.R2_BUCKET) {
    throw new Error(
      "KYC_STORAGE=r2 but R2_BUCKET is not set. Refusing to fall back to writing " +
      "base64 identity documents into Postgres. Set R2_BUCKET (and the R2_* " +
      "credentials), or unset KYC_STORAGE to choose inline storage deliberately.",
    );
  }
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
  assertStorageModeIntended();
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

/**
 * Delete a stored document, routing by key shape. Returns true when the object is gone
 * (or was never there), false only when R2 refused.
 *
 * 🔴 WHY THIS EXISTS (2026-08-20). It did not, and that was about to become permanent.
 *
 * Erasure — PDPA 2022 §31, GDPR Art. 17 — has to be able to destroy a national ID scan and
 * a selfie. While a document lived INLINE, erasure was implicit: null the `storageKey`
 * column and the base64 bytes are gone with it. Moving the last 24 inline documents to R2
 * (audit F-02) removes that property from the platform: every document becomes an object
 * the application can PUT and GET but has no way to DELETE. The result would have been an
 * erasure routine that reports success while national IDs and selfies sit in the bucket
 * forever, with the database row insisting they are gone. That is the worst possible
 * combination — the record says erased, the data is not.
 *
 * So the delete seam ships WITH the migration, not after it.
 *
 * ⛔ A missing object is SUCCESS, not failure. Erasure must be idempotent and must not be
 * blocked by an object a previous run already removed; `DeleteObject` on S3/R2 is itself
 * idempotent and returns 204 for a key that does not exist.
 */
export async function deleteKycDocument(storageKey: string): Promise<boolean> {
  // An inline document has no external object. The bytes ARE the column, so the caller
  // nulling or overwriting the column is the deletion — nothing to do here, and reporting
  // failure would make an erasure routine think it had not finished.
  if (!storageKey.startsWith("r2:")) return true;
  try {
    const { client, mod } = await getS3();
    await client.send(new mod.DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: storageKey.slice(3),
    }));
    return true;
  } catch {
    // Deliberately does NOT throw: an erasure sweep must be able to record which objects it
    // could not remove and carry on, rather than aborting halfway and leaving the caller
    // unsure what was destroyed. The caller decides what a false means.
    return false;
  }
}

/** One folder name: what `putKycDocument`'s key rule leaves unchanged, and nothing that could name two folders. */
const SINGLE_SEGMENT = /^[A-Za-z0-9_-]+$/;
/** The agent programme's own folder (`kyc/agentapp/<applicationId>/…`, `keyHintFor` in agent-application-service.ts). */
const AGENT_APPLICATION_SEGMENT = "agentapp";
/** A runaway listing stops here and THROWS — 20 pages is 20,000 objects, against a handful in a real folder. */
const MAX_LIST_PAGES = 20;

/**
 * ⭐ THE ACCOUNT'S OWN KYC FOLDER (2026-10-11, Part C) — `kyc/<userId>/`, the folder `putKycDocument` writes this
 * account's identity documents under (its key hint is `<userId>/<docType>`; the inline-to-R2 migration used
 * `<userId>/extra_<requestId>`). Erasure's release destroys every object in it (`erasure.ts`, step 1b), so this answers
 * ONE folder or nothing:
 * ⛔ null for an id the key rule would rewrite (a character outside `[A-Za-z0-9_-]`: two ids could then share a folder,
 * and one account's erasure would reach another's documents), and null for the agent programme's folder name, which
 * holds OTHER people's documents (referees', applicants') under its own purge (`purgeAgentDocumentsForUser`). Every id
 * the platform issues is `usr_` and random hex, so both refusals guard a case that should never arise — and the caller counts a refusal
 * as a failure owed a re-run, never as an empty folder.
 */
export function kycUserKeyPrefix(userId: string): string | null {
  if (!SINGLE_SEGMENT.test(userId) || userId === AGENT_APPLICATION_SEGMENT) return null;
  return `kyc/${userId}/`;
}

/**
 * Every object key in ONE account's KYC folder (`kycUserKeyPrefix`) — for erasure's release (2026-10-11, Part C), which
 * destroys every key this returns. INLINE mode has no bucket and so no folder: `[]`. R2: `ListObjectsV2`, every page.
 *
 * ⛔ FAILS CLOSED, BECAUSE ITS CALLER DESTROYS WHAT IT RETURNS.
 *   · A prefix that is not exactly one folder (`kyc/<one segment>/`), or is the agent programme's, is REFUSED before
 *     anything is read: "" or "kyc/" would be every identity document on the platform.
 *   · An intended-but-unconfigured R2 (`KYC_STORAGE=r2` with no bucket) THROWS, as `putKycDocument` does, instead of
 *     answering "inline, nothing there" — the silent degrade `assertStorageModeIntended` exists to refuse.
 *   · A key outside the folder in R2's answer is DROPPED, not trusted: the folder is the whole contract.
 * ⚠️ AND IT THROWS ON ANY R2 FAILURE, unlike `deleteKycDocument`: a delete that failed leaves its pointer for a re-run,
 * but a listing that failed has no partial answer worth acting on — the caller counts it and runs again later.
 */
export async function listKycDocumentKeys(prefix: string): Promise<string[]> {
  const segment = prefix.startsWith("kyc/") && prefix.endsWith("/") ? prefix.slice(4, -1) : "";
  if (!SINGLE_SEGMENT.test(segment) || segment === AGENT_APPLICATION_SEGMENT) {
    throw new Error(`listKycDocumentKeys: "${prefix}" is not one account's KYC folder (kyc/<id>/) — refusing to list it.`);
  }
  assertStorageModeIntended();
  if (kycStorageMode() === "inline") return [];
  const { client, mod } = await getS3();
  const keys: string[] = [];
  let token: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await client.send(new mod.ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    for (const o of res?.Contents ?? []) {
      if (typeof o?.Key === "string" && o.Key.startsWith(prefix) && o.Key.length > prefix.length) keys.push(o.Key);
    }
    if (!res?.IsTruncated) return keys;
    token = res.NextContinuationToken;
    if (!token) throw new Error("listKycDocumentKeys: R2 said the listing continues but gave no continuation token.");
  }
  throw new Error(`listKycDocumentKeys: more than ${MAX_LIST_PAGES} pages under "${prefix}" — refusing to guess where it ends.`);
}

// ── R2 (S3-compatible) — optional dependency, loaded only when configured ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3Client: any;

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code. Stands a fake S3 client in for R2, so `test:erasure` can
 * drive the REAL `listKycDocumentKeys` and `deleteKycDocument` — the commands, the paging, the folder they name — with
 * no bucket; `null` drops it, and the next R2 call builds the real client again. Refuses in production.
 */
export function __setKycS3ClientForTests(client: unknown): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setKycS3ClientForTests is a test seam and refuses to run in production.");
  s3Client = client ?? undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getS3(): Promise<{ client: any; mod: any }> {
  // @aws-sdk/client-s3 is a real dependency but is loaded lazily (only when
  // KYC_STORAGE=r2) via a plain dynamic import. It MUST be listed in
  // next.config `serverExternalPackages` so the Next server bundler leaves it
  // external and Node resolves it natively at runtime — same as pdfkit/exceljs.
  // A previous "computed specifier" trick hid it from the build graph entirely,
  // which meant the bundled server could not resolve it at runtime and every
  // KYC document upload/view crashed with the message below. (Fixed 2026-07-22.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("@aws-sdk/client-s3").catch((err) => {
    throw new Error(`KYC_STORAGE=r2 but @aws-sdk/client-s3 could not be loaded (${(err as Error)?.message ?? err}). Ensure it is installed and listed in next.config serverExternalPackages.`);
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
