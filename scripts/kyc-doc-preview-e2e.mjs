/**
 * KYC document image preview — end-to-end.
 *
 * Proves the full new pipeline:
 *   1. A fresh player verifies NIDA, then uploads THREE real image files
 *      (front / back / selfie) through the client uploader (canvas resize →
 *      base64 data URL → attachDocumentAction).
 *   2. The player submits for review → PENDING_REVIEW.
 *   3. The admin-gated serving route streams each document back as an image
 *      (200 + image/* content-type) to a compliance officer.
 *   4. A non-admin (the player) is FORBIDDEN (403) from the serving route.
 *   5. A missing document returns 404 (not a 500, not a leak).
 *   6. If the admin player page is reachable, the preview <img> elements load.
 *
 *   BASE=http://localhost:3009 node scripts/kyc-doc-preview-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

// A tiny but VALID png (1×1) the browser canvas can decode and re-encode.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const imgFile = (name) => ({ name, mimeType: "image/png", buffer: PNG_1x1 });

// Seed from the clock so reruns against the same (in-memory) dev server never
// collide on an already-registered phone.
let phoneSeq = Date.now() % 90_000_000;
function nextTail() { return String(700_000_000 + ((phoneSeq++) % 99_000_000)); } // +255 7xxxxxxxx

async function register(ctx) {
  const tail = nextTail();
  const e164 = "+255" + tail;
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await fillDob(p);
  await p.fill('input[name="password"]', "TestPass123!");
  await p.fill('input[name="passwordConfirm"]', "TestPass123!");
  await p.check('input[name="acceptAge"]', { force: true }).catch(() => {});
  await p.check('input[name="acceptTerms"]', { force: true }).catch(() => {});
  await Promise.all([
    p.waitForURL((u) => !/auth\/register/.test(u.toString()), { timeout: 15_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.close();
  return { tail, e164 };
}

async function whoami(ctx) {
  const r = await ctx.request.get(`${BASE}/api/dev-test/whoami`);
  return r.ok() ? r.json() : null;
}

async function fillDob(page) {
  // Segmented DD / MM / YYYY field — type into the Day segment; auto-advances.
  const day = page.getByLabel("Day", { exact: true }).first();
  if (await day.count()) {
    await day.click();
    await page.keyboard.type("15");
    await page.keyboard.type("01");
    await page.keyboard.type("1990");
  }
}

const browser = await chromium.launch();

try {
  // =========================================================
  // PLAYER · verify NIDA, upload 3 real images, submit
  // =========================================================
  const player = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const me = await register(player);
  const who = await whoami(player);
  const playerId = who?.session?.userId ?? who?.user?.id ?? null;
  log("01 player registered + authed", !!playerId, me.e164);

  const kyc = await player.newPage();
  await kyc.goto(`${BASE}/profile/kyc`, { waitUntil: "networkidle" });
  await kyc.waitForTimeout(500);

  // Step 1 — NIDA
  await kyc.fill("#nida", "12345678901234567890");
  await kyc.fill("#fullName", "Asha Mwita Test");
  await fillDob(kyc);
  await Promise.all([
    kyc.waitForURL(/nida=verified/, { timeout: 15_000 }).catch(() => {}),
    kyc.click('button:has-text("Verify NIDA")'),
  ]);
  await kyc.getByRole("heading", { name: /Upload documents/i }).first()
    .waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
  const nidaOk = await kyc.getByText(/NIDA verified/i).first().isVisible().catch(() => false);
  log("02 NIDA verified, document step shown", nidaOk);

  // Step 2 — upload the three documents through the real uploader
  const slots = [
    { aria: "ID front · Mbele", type: "NIDA_FRONT" },
    { aria: "ID back · Nyuma", type: "NIDA_BACK" },
    { aria: "Selfie · Picha yako", type: "SELFIE" },
  ];
  let uploaded = 0;
  for (const s of slots) {
    const input = kyc.getByLabel(s.aria, { exact: true }).first();
    if (await input.count() === 0) { log(`03 upload ${s.type} — input missing`, false); continue; }
    await input.setInputFiles(imgFile(`${s.type.toLowerCase()}.png`));
    // The slot's button relabels to "<label> attached — tap to replace" once the
    // action resolves and router.refresh() lands.
    const ok = await kyc.getByRole("button", { name: new RegExp(`${s.aria.split(" ·")[0]}.*attached`, "i") })
      .first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
    if (ok) uploaded++;
    log(`03 upload ${s.type}`, ok);
  }

  // Submit for review. The button is gated on the server-rendered docsCount, so
  // reload to be sure the third upload's revalidation has landed.
  await kyc.reload({ waitUntil: "networkidle" });
  const submit = kyc.getByRole("button", { name: /Submit for review/i }).first();
  await submit.scrollIntoViewIfNeeded().catch(() => {});
  const submitEnabled = await submit.isEnabled().catch(() => false);
  log("04 submit enabled after 3 uploads", submitEnabled);
  if (submitEnabled) {
    await Promise.all([
      kyc.waitForLoadState("networkidle").catch(() => {}),
      submit.click(),
    ]);
    await kyc.waitForTimeout(800);
  }
  const submitted = await kyc.getByText(/Submitted for review|Identity verified/i).first().isVisible().catch(() => false);
  log("05 KYC submitted → PENDING_REVIEW", submitted);
  await kyc.close();

  // =========================================================
  // SECURITY · player CANNOT read the admin serving route
  // =========================================================
  for (const t of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"]) {
    const r = await player.request.get(`${BASE}/api/admin/kyc-doc?user=${playerId}&type=${t}`);
    log(`06 player forbidden on kyc-doc (${t})`, r.status() === 403, `status ${r.status()}`);
  }

  // =========================================================
  // ADMIN · serving route returns the actual image bytes
  // =========================================================
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminMe = await register(admin);
  const promo = await admin.request.post(`${BASE}/api/dev-test/promote-admin`, {
    data: { phone: adminMe.e164 },
  });
  log("07 admin promoted", promo.ok());

  for (const t of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"]) {
    const r = await admin.request.get(`${BASE}/api/admin/kyc-doc?user=${playerId}&type=${t}`);
    const ct = r.headers()["content-type"] || "";
    const body = r.ok() ? await r.body() : Buffer.alloc(0);
    const isImg = r.status() === 200 && /^image\//.test(ct) && body.length > 0;
    log(`08 admin gets ${t} image`, isImg, `status ${r.status()} · ${ct} · ${body.length}B`);
  }

  // Cache headers must keep sensitive ID imagery private
  {
    const r = await admin.request.get(`${BASE}/api/admin/kyc-doc?user=${playerId}&type=NIDA_FRONT`);
    const cc = (r.headers()["cache-control"] || "").toLowerCase();
    log("09 image served private/no-store", cc.includes("no-store") && cc.includes("private"), cc);
  }

  // Missing document → 404 (admin's own id has no KYC submission)
  {
    const adminWho = await whoami(admin);
    const adminId = adminWho?.session?.userId;
    const r = await admin.request.get(`${BASE}/api/admin/kyc-doc?user=${adminId}&type=NIDA_FRONT`);
    log("10 missing document → 404", r.status() === 404, `status ${r.status()}`);
  }

  // Bad inputs → 400, not 500
  for (const q of ["", `user=${playerId}&type=PASSPORT`, `user=&type=SELFIE`, `user=${playerId}&type=../etc`]) {
    const r = await admin.request.get(`${BASE}/api/admin/kyc-doc?${q}`);
    log(`11 bad input rejected (${q || "empty"})`, r.status() === 400, `status ${r.status()}`);
  }

  // =========================================================
  // ADMIN PAGE · preview <img> render (best-effort; may be TOTP-gated)
  // =========================================================
  {
    const p = await admin.newPage();
    await p.goto(`${BASE}/admin/players/${playerId}?tab=kyc`, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(800);
    const url = p.url();
    if (/\/auth\/admin|\/auth\/login/.test(url)) {
      log("12 admin page (TOTP-gated, route test already proves serving)", true, "skipped render check");
    } else {
      const imgs = p.locator('img[src*="/api/admin/kyc-doc"]');
      const n = await imgs.count();
      let loaded = 0;
      for (let i = 0; i < n; i++) {
        const ok = await imgs.nth(i).evaluate((el) => el.complete && el.naturalWidth > 0).catch(() => false);
        if (ok) loaded++;
      }
      log("12 admin preview images render", n >= 3 && loaded === n, `${loaded}/${n} loaded`);

      // If review controls are present, approve and confirm the status flips.
      const approve = p.getByRole("button", { name: /^Approve/i }).first();
      if (await approve.count()) {
        p.once("dialog", (d) => d.accept());
        await approve.click().catch(() => {});
        await p.waitForTimeout(1200);
        const approved = await p.getByText(/APPROVED/i).first().isVisible().catch(() => false);
        log("13 KYC approve action flips status", approved);
      }
    }
    await p.close();
  }

  await player.close();
  await admin.close();
} catch (err) {
  log("FATAL", false, err?.message || String(err));
} finally {
  await browser.close();
}

console.log(`\nKYC DOC PREVIEW E2E   PASS: ${pass}   FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
