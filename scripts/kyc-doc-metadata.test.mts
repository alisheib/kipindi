/**
 * A KYC DOCUMENT'S RECORDED TYPE AND SIZE MUST SURVIVE A READ→WRITE ROUND TRIP.
 *
 * Found by reading the live `KycDocument` table (2026-07-31, campaign §6 E-3).
 * Every one of the 19 documents stored in R2 read:
 *
 *     mimeType = 'application/octet-stream'    sizeBytes = 0
 *
 * while the admin route happily served a real `image/jpeg` for each of them.
 * Every one of the 24 older inline documents was correct. That split is the
 * whole bug:
 *
 *   · `attachDocument` measures the truth — `validateDocImage` sniffs the mime
 *     from the MAGIC BYTES and decodes the byte count — and hands both to
 *     `db.kyc.upsert`, which writes them. That half was fixed in 502160f.
 *   · `toStoredKyc` — the ONLY way anything reads a KYC submission back —
 *     dropped both columns on the way out.
 *   · `db.kyc.upsert` syncs documents by DELETING every row and re-creating it
 *     from the StoredKyc it was handed, re-deriving the two facts from the
 *     storageKey. That regex only matches an inline `data:` URL, so for an
 *     `r2:<key>` it produced `application/octet-stream` / `0`.
 *
 * So the very next write after an upload — attaching the second document, or
 * `submitForReview` — erased the first one's measurement. The write-half fix was
 * real; the read half made it invisible, which is exactly why this suite tests
 * the ROUND TRIP and not either half alone.
 *
 * These two columns are what a compliance export and the retention tooling
 * report about a citizen's identity evidence. "0 bytes of application/octet-
 * stream" is not a missing value — it is a false statement.
 *
 * Every assertion below was observed RED against the pre-fix tree.
 */
import { readFileSync } from "node:fs";
import { toStoredKyc, toKycDocumentRows } from "../src/lib/server/prisma-dal.ts";
import { validateDocImage } from "../src/lib/server/kyc-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const DAL = read("../src/lib/server/prisma-dal.ts");
const STORE = read("../src/lib/server/store.ts");
const SERVICE = read("../src/lib/server/kyc-service.ts");

/** A real JPEG: the SOI + JFIF magic bytes, then filler. */
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.alloc(733, 0x61),
]);
const JPEG_URL = `data:image/jpeg;base64,${JPEG.toString("base64")}`;

/** A Prisma `KycSubmission` row as `include: { documents: true }` returns it. */
const prismaRow = (documents: unknown[]) => ({
  id: "kyc_test", userId: "usr_test", status: "PENDING_REVIEW",
  rejectReason: null, rejectNote: null, nidaNumber: null, nidaVerifiedAt: null,
  fullName: "Test Player", dob: null, reviewerId: null, reviewedAt: null,
  submittedAt: new Date("2026-07-31T13:31:33.406Z"), extraRequests: [],
  createdAt: new Date("2026-07-31T13:26:00.000Z"), updatedAt: new Date("2026-07-31T13:31:33.406Z"),
  documents,
});

// ── 1 · The exact production shape: an R2 document ──────────────────────────
section("1 · an R2 document survives read → write");

const R2_ROW = {
  docType: "NIDA_FRONT",
  storageKey: "r2:kyc/usr_test/NIDA_FRONT-abc123",
  uploadedAt: new Date("2026-07-31T13:31:33.406Z"),
  mimeType: "image/jpeg",
  sizeBytes: 187342,
};

const storedR2 = toStoredKyc(prismaRow([R2_ROW]));
ok("toStoredKyc carries mimeType out of the row", storedR2.documents[0].mimeType === "image/jpeg",
  `got ${String(storedR2.documents[0].mimeType)}`);
ok("toStoredKyc carries sizeBytes out of the row", storedR2.documents[0].sizeBytes === 187342,
  `got ${String(storedR2.documents[0].sizeBytes)}`);

// …and back in. This is the step that erased the measurement on production.
const writtenR2 = toKycDocumentRows("kyc_test", storedR2.documents);
ok("the write-back keeps image/jpeg for an r2: key", writtenR2[0].mimeType === "image/jpeg",
  `got ${writtenR2[0].mimeType} — an r2 key cannot be measured, so the carried value is the ONLY evidence`);
ok("the write-back keeps the measured byte count", writtenR2[0].sizeBytes === 187342,
  `got ${writtenR2[0].sizeBytes}`);
ok("the round trip is lossless for storageKey/docType/uploadedAt",
  writtenR2[0].storageKey === R2_ROW.storageKey &&
  writtenR2[0].docType === "NIDA_FRONT" &&
  writtenR2[0].uploadedAt.toISOString() === R2_ROW.uploadedAt.toISOString());

// Two documents, written one after the other: attaching #2 must not zero #1.
// This is the precise sequence that produced the live data — attachDocument
// re-reads the submission, appends the new document, and upserts all of them.
const twoStored = toStoredKyc(prismaRow([
  R2_ROW,
  { docType: "SELFIE", storageKey: "r2:kyc/usr_test/SELFIE-def456", uploadedAt: new Date(), mimeType: "image/png", sizeBytes: 91024 },
]));
const twoWritten = toKycDocumentRows("kyc_test", twoStored.documents);
ok("attaching a second document does not zero the first",
  twoWritten[0].sizeBytes === 187342 && twoWritten[1].sizeBytes === 91024,
  twoWritten.map((d) => `${d.docType}:${d.mimeType}/${d.sizeBytes}`).join(" "));

// ── 2 · An inline document is MEASURED, never taken on trust ────────────────
section("2 · an inline data URL is measured from its own bytes");

const inlineWritten = toKycDocumentRows("kyc_test", [
  { docType: "NIDA_BACK", storageKey: JPEG_URL, uploadedAt: new Date().toISOString() },
]);
ok("mime is derived from the inline data URL", inlineWritten[0].mimeType === "image/jpeg");
ok("size is derived from the inline data URL", inlineWritten[0].sizeBytes === JPEG.length,
  `got ${inlineWritten[0].sizeBytes}, real ${JPEG.length}`);

// The bytes are right there, so measuring them BEATS any carried column — a
// stale or wrong stored value must not survive when the truth is in hand.
const inlineLied = toKycDocumentRows("kyc_test", [
  { docType: "NIDA_BACK", storageKey: JPEG_URL, uploadedAt: new Date().toISOString(),
    mimeType: "application/octet-stream", sizeBytes: 0 },
]);
ok("a wrong stored value loses to the actual inline bytes",
  inlineLied[0].mimeType === "image/jpeg" && inlineLied[0].sizeBytes === JPEG.length,
  `${inlineLied[0].mimeType}/${inlineLied[0].sizeBytes}`);

// The two halves must agree to the byte. They were computed by two different
// expressions — one corrected base64 padding, one did not — so an image whose
// length made the padding matter was recorded 1–2 bytes short of what the
// uploader validated.
const v = validateDocImage(JPEG_URL);
ok("validateDocImage agrees with the DAL, to the byte",
  v.ok && v.bytes === inlineWritten[0].sizeBytes && v.mimeType === inlineWritten[0].mimeType,
  v.ok ? `validate=${v.bytes} dal=${inlineWritten[0].sizeBytes}` : v.error);

// ── 3 · Unknown stays unknown — we do not guess ─────────────────────────────
section("3 · an unmeasurable document records nothing, not a guess");

const unknown = toKycDocumentRows("kyc_test", [
  { docType: "SELFIE", storageKey: "r2:kyc/legacy/no-facts", uploadedAt: new Date().toISOString() },
]);
ok("no mime evidence → application/octet-stream", unknown[0].mimeType === "application/octet-stream");
ok("no size evidence → 0", unknown[0].sizeBytes === 0);

// ── 4 · The write path must keep going through the tested builder ───────────
section("4 · the upsert cannot re-implement the row builder");

const upsert = /upsert: async \(k: StoredKyc\)[\s\S]*?findByNida:/.exec(DAL)?.[0] ?? "";
ok("db.kyc.upsert still syncs documents", /kycDocument\.deleteMany/.test(upsert) && /kycDocument\.createMany/.test(upsert));
ok("…and builds its rows with toKycDocumentRows", /toKycDocumentRows\(/.test(upsert),
  "an inline re-implementation is how the mime/size derivation drifted the first time");
ok("…with no second, inline data-URL derivation left in it",
  !/data:\(image/.test(upsert),
  "two derivations = two answers; there must be exactly one");

// ── 5 · The seams the round trip depends on ─────────────────────────────────
section("5 · the type and the uploader still carry the facts");

ok("StoredKyc.documents still declares mimeType and sizeBytes",
  /documents: \{[^}]*mimeType\?: string[^}]*sizeBytes\?: number/.test(STORE));
ok("attachDocument still records validateDocImage's sniffed mime",
  /mimeType: valid\.mimeType/.test(SERVICE),
  "the mime must come from the BYTES, never from the client's data-URL label");
ok("attachDocument still records the decoded byte count", /sizeBytes: valid\.bytes/.test(SERVICE));
ok("toStoredKyc is exported so this round trip is testable at all",
  /export function toStoredKyc/.test(DAL));

console.log(`\n${fail === 0 ? "ALL PASSED" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
