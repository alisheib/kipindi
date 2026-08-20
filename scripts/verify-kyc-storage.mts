/**
 * Every KYC document must be retrievable through the storage seam, and its recorded
 * metadata must match the bytes that actually come back.
 *
 *   Run:  railway run npx tsx scripts/verify-kyc-storage.mts
 *
 * ⛔ READ-ONLY. It reads objects and rows. It writes nothing.
 *
 * ── WHY (audit F-02, 2026-08-20) ───────────────────────────────────────────────────────
 *
 * The inline → R2 migration proved each row it touched by reading it back inside its own
 * process. That is the right check at write time, but it is not a standing one, and it says
 * nothing about the 43 documents that were already in R2 — one of which turned out to carry
 * `application/octet-stream / 0 bytes` for a real national ID.
 *
 * This walks EVERY document and answers the only question that matters about identity
 * evidence: if a compliance officer opens this submission, do the bytes come back, and are
 * they the bytes we say they are?
 *
 * It calls `readKycDocument` — the same function `/api/admin/kyc-doc` calls — so a pass here
 * means the officer's read path works for that document. It deliberately does NOT go through
 * HTTP: that would need a live session, and the migration changed the storage layer, not the
 * route or its RBAC gate. (A UI drive over the route lives in
 * `scripts/live-kyc-r2-read-drive.mjs`; it needs current QA credentials.)
 *
 * ⚠️ Run it with `railway run` — the R2 credentials exist only in that environment, and
 * without them every `r2:` key returns null and this suite would report a catastrophe that
 * is really just a missing variable. The guard below refuses rather than lying.
 */
import { PrismaClient } from "@prisma/client";
import { readKycDocument, kycStorageMode } from "../src/lib/server/storage.ts";

const prisma = new PrismaClient();

let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; }
  else { failures.push(`${label}${extra ? ` — ${extra}` : ""}`); console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`); }
};

async function main() {
  const docs = await prisma.kycDocument.findMany({
    select: {
      id: true, docType: true, storageKey: true, mimeType: true, sizeBytes: true,
      submission: { select: { userId: true } },
    },
    orderBy: { uploadedAt: "asc" },
  });

  const onR2 = docs.filter((d) => d.storageKey.startsWith("r2:")).length;
  const inline = docs.filter((d) => d.storageKey.startsWith("data:")).length;
  const other = docs.length - onR2 - inline;

  console.log(`\n=== KYC storage verification — ${docs.length} document(s) ===`);
  console.log(`  on R2: ${onR2} · inline: ${inline} · neither shape: ${other}`);
  console.log(`  storage mode in this process: ${kycStorageMode()}\n`);

  // ⛔ Without R2 credentials every r2: read returns null and this suite would report every
  // identity document as lost. Refuse instead of producing a terrifying false result.
  if (onR2 > 0 && kycStorageMode() !== "r2") {
    console.error(
      `REFUSING TO RUN: ${onR2} document(s) live in R2 but this process has no R2 configuration,\n` +
      `  so every one of them would read back as null and this suite would claim they are gone.\n` +
      `  Run it as:  railway run npx tsx scripts/verify-kyc-storage.mts\n`);
    process.exit(2);
  }

  // CONTROL — a suite that verifies nothing must not report success.
  ok("CONTROL: there are documents to verify", docs.length > 0,
    "An empty table makes every assertion below vacuous.");

  let bytesTotal = 0;
  const unreadable: string[] = [];
  const mismatched: string[] = [];

  for (const d of docs) {
    const got = await readKycDocument(d.storageKey);
    const who = `${d.id.slice(0, 12)} ${d.docType} user=${d.submission?.userId ?? "?"}`;
    if (!got) {
      unreadable.push(who);
      ok(`${who} · retrievable through the seam`, false, `key shape ${d.storageKey.slice(0, 12)}…`);
      continue;
    }
    bytesTotal += got.bytes.length;
    ok(`${who} · retrievable through the seam`, true);
    // The recorded metadata is the ONLY evidence for an r2: key — an officer is shown these
    // columns, not the object. They must agree with the bytes.
    if (got.bytes.length !== d.sizeBytes || got.mime !== d.mimeType) {
      mismatched.push(`${who}: recorded ${d.mimeType}/${d.sizeBytes}B, actual ${got.mime}/${got.bytes.length}B`);
    }
    ok(`${who} · recorded metadata matches the bytes`,
      got.bytes.length === d.sizeBytes && got.mime === d.mimeType,
      `recorded ${d.mimeType}/${d.sizeBytes}B vs actual ${got.mime}/${got.bytes.length}B`);
    // A real image, not a placeholder or an error page stored by mistake.
    ok(`${who} · decodes as a real image (magic bytes)`,
      (got.bytes[0] === 0xff && got.bytes[1] === 0xd8)                     // JPEG
      || (got.bytes[0] === 0x89 && got.bytes[1] === 0x50)                  // PNG
      || got.bytes.slice(8, 12).toString("ascii") === "WEBP",              // WEBP
      `first bytes ${got.bytes.slice(0, 4).toString("hex")}`);
  }

  console.log(`\n  Total bytes retrieved: ${(bytesTotal / 1024 / 1024).toFixed(2)} MB`);
  if (unreadable.length) console.log(`\n  🔴 UNREADABLE (${unreadable.length}):\n${unreadable.map((u) => `     ${u}`).join("\n")}`);
  if (mismatched.length) console.log(`\n  ⚠️  METADATA MISMATCH (${mismatched.length}):\n${mismatched.map((m) => `     ${m}`).join("\n")}`);

  console.log(`\n${"─".repeat(64)}`);
  console.log(`  KYC STORAGE: ${pass} passed, ${failures.length} failed`);
  console.log(`  An identity document that cannot be retrieved is evidence we do not have.`);
  console.log(`${"─".repeat(64)}\n`);
  if (failures.length) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
