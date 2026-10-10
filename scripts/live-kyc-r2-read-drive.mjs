/**
 * THE ONE CHECK THAT MATTERS after moving identity documents to R2 (audit F-02):
 * CAN A COMPLIANCE OFFICER STILL SEE THEM? Driven on PRODUCTION.
 *
 *   KYC_DOC_CASES=usr_a:NIDA_FRONT:514934,usr_b:PASSPORT:333863 BASE=https://www.50pick.tz npm run qa:kyc-r2-read
 *
 * Row counts prove the column changed shape. They do not prove the bytes come back. The
 * migration's own read-back check ran inside the migration process; this drives the path an
 * officer actually uses — a real session, the real RBAC gate, the real
 * `/api/admin/kyc-doc` route, the real `readKycDocument` seam, over the network.
 *
 * ⚠️ IT ASSERTS THE BYTE LENGTH, NOT "AN IMAGE APPEARED". The review page renders an <img>
 * whether the key is `data:` or `r2:` and whether the object is 3 bytes or 300 kB, so a
 * screenshot alone cannot tell a migrated document from a broken one. Each response is
 * compared against the size the database records — the same columns the upload wrote from
 * the measured bytes — so a truncated or wrong object fails.
 *
 * ⛔ THE TARGETS COME FROM THE ENVIRONMENT, AND THE DRIVE REFUSES WITHOUT THEM (2026-10-10). Until that day the
 * three cases were hard-coded: three submissions migrated in July. Production was RESET on 2026-09-11, so those rows
 * no longer exist, and a drive pointed at them could only report three 404s — a failure about a fixture, read as a
 * failure of the product. And from 2026-10-10 players no longer upload at all (owner ruling, Ali): the images on file
 * are an agent applicant's photo case, or one filed before that day, held read-only for officers. So the operator
 * names the images to read, as `userId:SLOT:bytes` — the slot one of `LEGACY_KYC_DOC_SLOTS`
 * (`src/lib/id-documents.ts`), the bytes the `sizeBytes` the database records for it — read READ-ONLY from production
 * first (e.g. `SELECT s."userId", d."docType", d."sizeBytes" FROM "KycDocument" d JOIN "KycSubmission" s ON
 * s.id = d."submissionId" WHERE d."storageKey" LIKE 'r2:%' LIMIT 3`).
 *
 * ⛔ READ-ONLY. It signs in, GETs the named documents, opens their review pages, and screenshots.
 * It approves nothing, rejects nothing, and moves no money.
 *
 * Needs QA_OFFICER_PASSWORD (the COMPLIANCE officer, +255712000106) in the environment —
 * `.env.qa.local` holds it and is gitignored.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
const SHOT = process.env.SHOT_DIR || ".qa-kyc-r2";
const OFFICER_MSISDN = "712000106";
const PASSWORD = process.env.QA_OFFICER_PASSWORD || "";
mkdirSync(SHOT, { recursive: true });

/** Every slot an image has ever been written under — the officer route's frozen accept-list (`LEGACY_KYC_DOC_SLOTS`). */
const SLOTS = new Set(["NIDA", "NIDA_FRONT", "NIDA_BACK", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD", "SELFIE"]);

/** `userId:SLOT:bytes`, comma-separated. ⛔ A malformed entry refuses the run — it never becomes a quiet skip. */
const CASES = (process.env.KYC_DOC_CASES || "").split(",").map((s) => s.trim()).filter(Boolean).map((entry) => {
  const [user, slot, bytes] = entry.split(":");
  const n = Number(bytes);
  if (!/^usr_[A-Za-z0-9_]+$/.test(user ?? "") || !SLOTS.has(slot ?? "") || !Number.isInteger(n) || n <= 0) {
    console.error(`KYC_DOC_CASES entry "${entry}" is not userId:SLOT:bytes (SLOT one of ${[...SLOTS].join(", ")}). Refusing to run.`);
    process.exit(2);
  }
  return { user, slot, bytes: n };
});
if (CASES.length === 0) {
  console.error("KYC_DOC_CASES is not set. Name the images to read as userId:SLOT:bytes, read read-only from production first —");
  console.error("the drive's old hard-coded rows were deleted by the 2026-09-11 reset, and a drive with nothing to read measures nothing.");
  process.exit(2);
}

let pass = 0;
const failures = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(l); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
};

if (!PASSWORD) {
  console.error("QA_OFFICER_PASSWORD is not set. Source .env.qa.local first — without it this");
  console.error("drive cannot sign in, and a skipped drive is not a passing drive.");
  process.exit(2);
}

/** The image formats `validateDocImage` accepts, by their magic bytes. */
function imageKind(buf) {
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  if (buf.length > 4 && buf[0] === 0x89 && buf.slice(1, 4).toString("latin1") === "PNG") return "png";
  if (buf.length > 12 && buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1480, height: 1000 } });
const page = await ctx.newPage();

console.log("");
console.log(`=== KYC documents in storage — ${CASES.length} named image(s), driven on ${BASE} ===`);
console.log("");

// ── 1 · sign in as the COMPLIANCE officer ────────────────────────────────────────────
await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
// The phone field is a 9-digit MSISDN box; the form submits it under `identifier`.
const phoneBox = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
await phoneBox.fill(OFFICER_MSISDN);
await page.locator('input[name="password"]').fill(PASSWORD);
await Promise.all([
  page.waitForLoadState("networkidle").catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(2500);
const signedIn = !/[/]auth[/]login/.test(page.url());
ok("the COMPLIANCE officer is signed in", signedIn, page.url());
await page.screenshot({ path: `${SHOT}/01-after-signin.png`, fullPage: false });
if (!signedIn) {
  console.error("Could not sign in — the rest of the drive would measure nothing. Stopping.");
  await browser.close();
  process.exit(1);
}

// ── 2 · the officer's actual read path, per document ─────────────────────────────────
for (const [i, c] of CASES.entries()) {
  const url = `${BASE}/api/admin/kyc-doc?user=${encodeURIComponent(c.user)}&type=${c.slot}`;
  const res = await ctx.request.get(url);
  const body = res.ok() ? await res.body() : Buffer.alloc(0);
  ok(`doc ${i + 1} · /api/admin/kyc-doc returns 200 for ${c.slot}`, res.status() === 200, `status ${res.status()}`);
  ok(`doc ${i + 1} · content-type is an image`, /^image[/]/.test(res.headers()["content-type"] ?? ""),
    res.headers()["content-type"] ?? "(none)");
  // 🔴 THE REAL ASSERTION. Exact byte length against what the DB records.
  ok(`doc ${i + 1} · byte length matches the stored record exactly`, body.length === c.bytes,
    `got ${body.length}, expected ${c.bytes}`);
  const kind = imageKind(body);
  ok(`doc ${i + 1} · the bytes are a real image (magic bytes)`, !!kind, `first bytes ${body.slice(0, 4).toString("hex")}`);
  if (body.length) writeFileSync(`${SHOT}/doc-${i + 1}-${c.slot}.${kind ?? "bin"}`, body);
}

// ── 3 · and the review page an officer looks at actually renders them ────────────────
// ⚠️ THE WORKSTATION IS ADDRESSED BY THE PLAYER, NOT THE SUBMISSION (`/admin/kyc/[id]` takes a userId) — the
// hard-coded version opened `/admin/kyc/<kyc_…>`, a page about nobody.
for (const [i, c] of CASES.entries()) {
  await page.goto(`${BASE}/admin/kyc/${encodeURIComponent(c.user)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shown = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((im) => /kyc-doc/.test(im.src));
    return {
      count: imgs.length,
      // naturalWidth > 0 is the browser confirming it DECODED the bytes, not just that a
      // tag exists — a 404 or a corrupt object leaves it at 0.
      decoded: imgs.filter((im) => im.complete && im.naturalWidth > 0).length,
    };
  });
  ok(`page ${i + 1} · the review page requests document images`, shown.count > 0, `${shown.count} <img>`);
  ok(`page ${i + 1} · the browser DECODED them (naturalWidth > 0)`, shown.decoded > 0,
    `${shown.decoded}/${shown.count} decoded`);
  await page.screenshot({ path: `${SHOT}/02-review-${i + 1}.png`, fullPage: false });
}

await browser.close();

console.log("");
console.log("─".repeat(64));
console.log(`  KYC documents in storage: ${pass} passed, ${failures.length} failed`);
console.log(`  Shots + retrieved bytes: ${SHOT}/`);
if (failures.length) { console.log(""); console.log("  FAILED:"); failures.forEach((f) => console.log(`   - ${f}`)); }
console.log("─".repeat(64));
process.exit(failures.length ? 1 : 0);
