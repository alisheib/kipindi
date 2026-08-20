/**
 * THE ONE CHECK THAT MATTERS after moving identity documents to R2 (audit F-02):
 * CAN A COMPLIANCE OFFICER STILL SEE THEM? Driven on PRODUCTION.
 *
 *   BASE=https://www.50pick.tz node scripts/live-kyc-r2-read-drive.mjs
 *
 * Row counts prove the column changed shape. They do not prove the bytes come back. The
 * migration's own read-back check ran inside the migration process; this drives the path an
 * officer actually uses — a real session, the real RBAC gate, the real
 * `/api/admin/kyc-doc` route, the real `readKycDocument` seam, over the network.
 *
 * ⚠️ IT ASSERTS THE BYTE LENGTH, NOT "AN IMAGE APPEARED". The review page renders an <img>
 * whether the key is `data:` or `r2:` and whether the object is 3 bytes or 300 kB, so a
 * screenshot alone cannot tell a migrated document from a broken one. Each response is
 * compared against the size the database now records — the same columns the migration wrote
 * from the measured bytes — so a truncated or wrong object fails.
 *
 * ⛔ READ-ONLY. It signs in, GETs three documents, opens three review pages, and screenshots.
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

// The three migrated submissions, with the size the DB records for their NIDA_FRONT.
const CASES = [
  { sub: "kyc_a3502b0b5b8dbd0f0e26", user: "usr_32cd7238385b38c026dd32dc", bytes: 514934 },
  { sub: "kyc_6376007799e619b748b3", user: "usr_c2e76620736f55891b8a5801", bytes: 333863 },
  { sub: "kyc_0374bea960bd6cf35d2e", user: "usr_e7cf2e83c18bb24bbeb3e0f2", bytes: 745109 },
];

let pass = 0;
const failures = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(l); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
};

if (!PASSWORD) {
  console.error("QA_OFFICER_PASSWORD is not set. Source .env.qa.local first — without it this\n" +
                "drive cannot sign in, and a skipped drive is not a passing drive.");
  process.exit(2);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1480, height: 1000 } });
const page = await ctx.newPage();

console.log(`\n=== KYC documents after the R2 migration — driven on ${BASE} ===\n`);

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
const signedIn = !/\/auth\/login/.test(page.url());
ok("the COMPLIANCE officer is signed in", signedIn, page.url());
await page.screenshot({ path: `${SHOT}/01-after-signin.png`, fullPage: false });
if (!signedIn) {
  console.error("\nCould not sign in — the rest of the drive would measure nothing. Stopping.");
  await browser.close();
  process.exit(1);
}

// ── 2 · the officer's actual read path, per document ─────────────────────────────────
for (const [i, c] of CASES.entries()) {
  const url = `${BASE}/api/admin/kyc-doc?user=${c.user}&type=NIDA_FRONT`;
  const res = await ctx.request.get(url);
  const body = res.ok() ? await res.body() : Buffer.alloc(0);
  ok(`doc ${i + 1} · /api/admin/kyc-doc returns 200`, res.status() === 200, `status ${res.status()}`);
  ok(`doc ${i + 1} · content-type is an image`, /^image\//.test(res.headers()["content-type"] ?? ""),
    res.headers()["content-type"] ?? "(none)");
  // 🔴 THE REAL ASSERTION. Exact byte length against what the DB now records.
  ok(`doc ${i + 1} · byte length matches the migrated record exactly`, body.length === c.bytes,
    `got ${body.length}, expected ${c.bytes}`);
  ok(`doc ${i + 1} · the bytes are a real JPEG (SOI marker)`,
    body.length > 2 && body[0] === 0xff && body[1] === 0xd8,
    `first bytes ${body.slice(0, 2).toString("hex")}`);
  if (body.length) writeFileSync(`${SHOT}/doc-${i + 1}-NIDA_FRONT.jpg`, body);
}

// ── 3 · and the review page an officer looks at actually renders them ────────────────
for (const [i, c] of CASES.entries()) {
  await page.goto(`${BASE}/admin/kyc/${c.sub}`, { waitUntil: "domcontentloaded" });
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

console.log(`\n${"─".repeat(64)}`);
console.log(`  KYC-after-R2 drive: ${pass} passed, ${failures.length} failed`);
console.log(`  Shots + retrieved bytes: ${SHOT}/`);
if (failures.length) { console.log(`\n  FAILED:\n${failures.map((f) => `   - ${f}`).join("\n")}`); }
console.log(`${"─".repeat(64)}\n`);
process.exit(failures.length ? 1 : 0);
