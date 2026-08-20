/**
 * Move the last INLINE base64 identity documents out of Postgres and into R2.
 *
 *   Run:  railway run npx tsx scripts/migrate-kyc-inline-to-r2.mts           (dry run — default)
 *         railway run npx tsx scripts/migrate-kyc-inline-to-r2.mts --apply   (writes)
 *
 * ⛔ IT MUST RUN INSIDE THE RAILWAY ENVIRONMENT (`railway run`). The R2 credentials exist
 * only there, and `putKycDocument` returns its input UNCHANGED when storage mode is inline
 * (storage.ts:72) — so a run from a laptop pointed at the production database would write
 * `data:` over `data:`, pass its own byte-compare, and print "migrated 24 rows" having moved
 * nothing. The mode assertion in `main()` below exists specifically to make that impossible.
 *
 * ── WHY (audit F-02, 2026-08-20) ───────────────────────────────────────────────────────
 *
 * Documents uploaded before the R2 seam landed hold their bytes in `KycDocument.storageKey`
 * as a `data:image/...;base64,…` URL. Measured on production: 24 such rows, 11 MB — national
 * ID scans and selfies. Every logical dump copies them, so the whole set travels in each
 * backup artifact. (Those artifacts ARE sealed: `db-backup.mts` refuses outright to write an
 * unencrypted non-localhost dump, and BACKUP_ENCRYPTION_KEY is set in production. The
 * problem is the surface area, not the encryption.)
 *
 * ── THE ORDER OF OPERATIONS IS THE ENTIRE SAFETY ARGUMENT ──────────────────────────────
 *
 * This is an IN-PLACE, DESTRUCTIVE overwrite of regulated identity evidence on a live
 * platform: once `storageKey` stops being a data URL, the base64 is gone from the database
 * and the only rollback is the sealed backup. So, per row, in this order:
 *
 *   1. READ the inline bytes through `readKycDocument`.
 *   2. UPLOAD through `putKycDocument` — the same seam the product uses, so the key matches
 *      the convention `kyc-cert-d4` pins. Never hand-build a key.
 *   3. Assert the returned key really starts `r2:` — belt and braces against the silent
 *      inline early-return.
 *   4. READ IT BACK through `readKycDocument` and byte-compare. If it does not match, the
 *      row is LEFT ALONE and the R2 object stays behind as a harmless orphan.
 *   5. ONLY THEN update the row.
 *
 * A row is therefore only ever overwritten after its bytes are provably retrievable through
 * the very function the officer's `/api/admin/kyc-doc` route calls. A half-finished run
 * leaves a consistent mixed-shape table — which is the state production has been in since
 * 2026-07-27 and which `kyc-cert-d4` proves works, because `readKycDocument` routes purely
 * on key shape and never consults KYC_STORAGE.
 *
 * ⚠️ `mimeType` and `sizeBytes` are written in the SAME statement as `storageKey`, and that
 * is mandatory. For an inline key the DAL MEASURES those from the bytes and lets the
 * measurement win; for an `r2:` key the stored columns are the only evidence left. The
 * moment the key stops being a data URL, a wrong mimeType can never be re-derived — that is
 * exactly the "application/octet-stream / 0 bytes" false statement `kyc-doc-metadata`
 * exists to prevent.
 *
 * ⛔ DO NOT route this through `db.kyc.upsert`. That deletes every KycDocument row for the
 * submission and recreates them from scratch, so migrating one document would rewrite all
 * three, discard their cuids, and re-derive metadata for rows you never meant to touch.
 * Per-row `prisma.kycDocument.update({ where: { id } })` only.
 *
 * Idempotent: only `data:` keys are selected, so re-running is a no-op and a failed row can
 * be retried by running it again.
 */
import { PrismaClient } from "@prisma/client";
import { putKycDocument, readKycDocument, kycStorageMode } from "../src/lib/server/storage.ts";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

type ExtraRequest = { id: string; storageKey?: string | null; [k: string]: unknown };

async function main() {
  console.log(`\n=== inline KYC → R2 — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"} ===\n`);

  // ⛔ THE GUARD THAT MAKES A SILENT NO-OP IMPOSSIBLE. See the header.
  if (kycStorageMode() !== "r2") {
    console.error(
      "REFUSING TO RUN: KYC_STORAGE=r2 and R2_BUCKET are not both set in this process.\n" +
      "  `putKycDocument` would return each data URL UNCHANGED, the byte-compare would pass\n" +
      "  trivially, and this script would report success while migrating nothing.\n" +
      "  Run it as:  railway run npx tsx scripts/migrate-kyc-inline-to-r2.mts\n");
    process.exit(2);
  }

  // ── Pass 1 · KycDocument.storageKey ──────────────────────────────────────────────────
  const alreadyR2 = await prisma.kycDocument.count({ where: { storageKey: { startsWith: "r2:" } } });
  const inline = await prisma.kycDocument.findMany({
    where: { storageKey: { startsWith: "data:" } },
    select: {
      id: true, docType: true, storageKey: true, mimeType: true, sizeBytes: true,
      submission: { select: { userId: true } },
    },
  });

  // Partition BEFORE writing anything: a row whose base64 the read path rejects (legacy
  // placeholder, malformed) is left strictly alone. Uploading garbage as a citizen's
  // identity document is worse than leaving the garbage where it is.
  const readable: Array<{ row: (typeof inline)[number]; bytes: Buffer; mime: string }> = [];
  const unreadable: string[] = [];
  for (const row of inline) {
    const got = await readKycDocument(row.storageKey);
    if (!got) { unreadable.push(row.id); continue; }
    readable.push({ row, bytes: got.bytes, mime: got.mime });
  }

  console.log(`  KycDocument — already in R2 (skipped, idempotent): ${alreadyR2}`);
  console.log(`  KycDocument — inline: ${inline.length} · unreadable (left alone): ${unreadable.length} · to migrate: ${readable.length}`);
  if (unreadable.length) console.log(`     unreadable ids: ${unreadable.join(", ")}`);
  for (const { row, bytes, mime } of readable) {
    console.log(`     ${row.id.slice(0, 12)} ${row.docType} user=${row.submission?.userId ?? "?"} ${mime}/${bytes.length}B`);
  }

  // ── Pass 2 · KycSubmission.extraRequests — the store the audit missed ────────────────
  // `attachExtraDocument` writes its key into a JSON array on the submission, so a document
  // can be inline THERE while every KycDocument row is already on R2. Migrating only the
  // first store would leave the acceptance query truthful and the finding half open.
  const submissions = await prisma.kycSubmission.findMany({
    where: { extraRequests: { not: null } },
    select: { id: true, userId: true, extraRequests: true },
  });
  const extraTargets: Array<{ subId: string; userId: string; reqId: string; key: string }> = [];
  for (const s of submissions) {
    const reqs = (s.extraRequests as unknown as ExtraRequest[] | null) ?? [];
    if (!Array.isArray(reqs)) continue;
    for (const r of reqs) {
      if (typeof r?.storageKey === "string" && r.storageKey.startsWith("data:")) {
        extraTargets.push({ subId: s.id, userId: s.userId, reqId: r.id, key: r.storageKey });
      }
    }
  }
  console.log(`\n  KycSubmission.extraRequests — inline attachments to migrate: ${extraTargets.length}`);
  for (const t of extraTargets) console.log(`     sub=${t.subId.slice(0, 12)} req=${t.reqId} user=${t.userId}`);

  // Counted in the dry run too, so the operator sees the whole job before authorising it.
  const metadataToRepair = await prisma.kycDocument.count({
    where: {
      storageKey: { startsWith: "r2:" },
      OR: [{ mimeType: "application/octet-stream" }, { sizeBytes: 0 }],
    },
  });
  console.log(`\n  Already-on-R2 rows with placeholder metadata to repair: ${metadataToRepair}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to move ` +
      `${readable.length} document row(s) and ${extraTargets.length} extra attachment(s), ` +
      `and repair metadata on ${metadataToRepair} row(s).\n`);
    return;
  }

  // ── APPLY ────────────────────────────────────────────────────────────────────────────
  let migrated = 0, failed = 0;
  for (const { row, bytes, mime } of readable) {
    const newKey = await putKycDocument(row.storageKey, `${row.submission?.userId ?? "unknown"}/${row.docType}`);
    if (!newKey.startsWith("r2:")) {
      console.error(`\nABORTING: putKycDocument returned a non-r2 key for ${row.id}. Storage mode changed mid-run.`);
      process.exit(3);
    }
    const back = await readKycDocument(newKey);
    if (!back || !back.bytes.equals(bytes) || back.mime !== mime) {
      console.error(`  ✗ ${row.id} — read-back MISMATCH, row left untouched (orphan object ${newKey})`);
      failed++;
      continue;
    }
    await prisma.kycDocument.update({
      where: { id: row.id },
      // mimeType + sizeBytes in the SAME statement — see the header.
      data: { storageKey: newKey, mimeType: mime, sizeBytes: bytes.length },
    });
    console.log(`  ✓ ${row.id.slice(0, 12)} ${bytes.length} B verified -> ${newKey}`);
    migrated++;
  }

  let extraMigrated = 0, extraFailed = 0;
  for (const t of extraTargets) {
    const original = await readKycDocument(t.key);
    if (!original) { console.error(`  ✗ extra ${t.reqId} unreadable, left alone`); extraFailed++; continue; }
    const newKey = await putKycDocument(t.key, `${t.userId}/extra_${t.reqId}`);
    const back = await readKycDocument(newKey);
    if (!newKey.startsWith("r2:") || !back || !back.bytes.equals(original.bytes)) {
      console.error(`  ✗ extra ${t.reqId} — read-back MISMATCH, submission left untouched`);
      extraFailed++;
      continue;
    }
    // Re-read the submission immediately before writing so concurrent edits to OTHER
    // elements of the array are not clobbered by a stale copy.
    const fresh = await prisma.kycSubmission.findUnique({
      where: { id: t.subId }, select: { extraRequests: true },
    });
    const reqs = (fresh?.extraRequests as unknown as ExtraRequest[] | null) ?? [];
    const next = reqs.map((r) => (r.id === t.reqId ? { ...r, storageKey: newKey } : r));
    await prisma.kycSubmission.update({ where: { id: t.subId }, data: { extraRequests: next as never } });
    console.log(`  ✓ extra ${t.reqId} ${original.bytes.length} B verified -> ${newKey}`);
    extraMigrated++;
  }

  // ── Pass 3 · REPAIR metadata on rows that were already in R2 ────────────────────────
  //
  // 🔴 A PRE-EXISTING DEFECT THIS MIGRATION SURFACED, not one it caused. Measured on
  // production 2026-08-20 immediately after the apply run: 16 documents uploaded between
  // 27 and 31 July 2026 — the platform's first R2 window — carry
  // `mimeType = 'application/octet-stream'` and `sizeBytes = 0`. Tonight's 24 rows were
  // verified clean (the control query found 0 bad among them), and none of the 16 was
  // touched, so the era is unambiguous.
  //
  // Why it matters rather than being cosmetic: for an INLINE key the DAL measures mime and
  // size from the bytes and lets the measurement win, so a wrong column is invisible. For an
  // `r2:` key the stored columns are the ONLY evidence — so an officer reviewing a real
  // national ID is shown "application/octet-stream · 0 bytes". That is precisely the false
  // statement `kyc-doc-metadata.test.mts` was written to prevent, on regulated evidence.
  //
  // It is repairable because the bytes are still in R2: read the object back through the
  // seam, measure it, write the truth. Nothing is destroyed and nothing is guessed — a row
  // whose object cannot be read is left exactly as it is and reported.
  const needsMetadata = await prisma.kycDocument.findMany({
    where: {
      storageKey: { startsWith: "r2:" },
      OR: [{ mimeType: "application/octet-stream" }, { sizeBytes: 0 }],
    },
    select: { id: true, docType: true, storageKey: true, mimeType: true, sizeBytes: true },
  });
  let repaired = 0, unrepairable = 0;
  for (const row of needsMetadata) {
    const got = await readKycDocument(row.storageKey);
    if (!got || got.bytes.length === 0) {
      console.error(`  ! ${row.id.slice(0, 12)} ${row.docType} — object unreadable in R2, metadata left as-is`);
      unrepairable++;
      continue;
    }
    await prisma.kycDocument.update({
      where: { id: row.id },
      data: { mimeType: got.mime, sizeBytes: got.bytes.length },
    });
    console.log(`  ⟳ ${row.id.slice(0, 12)} ${row.docType} metadata repaired: ` +
      `${row.mimeType}/${row.sizeBytes}B -> ${got.mime}/${got.bytes.length}B`);
    repaired++;
  }

  console.log(
    `\nAPPLIED — documents: migrated ${migrated}, failed ${failed}, left alone ${unreadable.length}. ` +
    `Extra attachments: migrated ${extraMigrated}, failed ${extraFailed}. ` +
    `Metadata repaired on pre-existing R2 rows: ${repaired}` +
    (unrepairable ? `, unrepairable ${unrepairable}` : "") + `.\n` +
    `Re-run to retry (idempotent — only data: keys are selected, and only placeholder metadata is repaired).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
