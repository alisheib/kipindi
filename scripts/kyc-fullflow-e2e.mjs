/**
 * Full both-sides KYC integration E2E (browser, real server actions):
 *   NEW PLAYER  → uploads ID front/back/selfie (real resize + loaders) → submits
 *   ADMIN       → opens the deep link (the same URL the admin email links to),
 *                 sees the documents, requests an extra document with a note
 *   PLAYER      → sees "more info needed", uploads the requested doc, resubmits
 *   ADMIN       → sees the uploaded doc, approves
 *   PLAYER      → sees "verified"
 * Plus a desktop-width responsiveness pass on both key pages.
 *
 *   BASE=http://localhost:3009 node scripts/kyc-fullflow-e2e.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };

// 1×1 PNG upload fixture — decodable by the client canvas resize.
const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQAY3Y2wAAAAAElFTkSuQmCC", "base64");
const FILE = { name: "doc.png", mimeType: "image/png", buffer: PNG_1x1 };
const attachErrs = (page, sink) => {
  page.on("console", (m) => { if (m.type() === "error" && !/eval|DevTools|React will never use eval|404|Failed to load resource/.test(m.text())) sink.push(m.text()); });
  page.on("pageerror", (e) => sink.push(String(e)));
};
const overflow = async (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// First-visit primer overlay intercepts clicks — dismiss it if present.
const dismissPrimer = async (page) => {
  const skip = page.locator('[aria-label="Skip primer"]');
  if (await skip.count()) { await skip.first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); }
};

const browser = await chromium.launch();
try {
  // Suppress the first-visit primer overlay (it intercepts clicks) in every context.
  const primerOff = (ctx) => ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });

  // ───────────────── PLAYER (mobile) ─────────────────
  const playerCtx = await browser.newContext({ ...devices["Pixel 7"] });
  await primerOff(playerCtx);
  const pErr = []; const pp = await playerCtx.newPage(); attachErrs(pp, pErr);
  // Brand-new user with NO KYC record — must complete the NIDA identity step.
  const fresh = await (await pp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "none" } })).json();
  ok("fresh player + session created", !!fresh.userId, JSON.stringify(fresh));
  const userId = fresh.userId;
  // Unique 20-digit NIDA per run (one-NIDA-per-account is enforced), never ...0000/9999.
  const NIDA = "19900101" + String(Date.now()).slice(-11) + "7";

  await pp.goto(`${BASE}/profile/kyc`, { waitUntil: "networkidle" });
  await dismissPrimer(pp);
  ok("new user lands on NIDA step", /Verify your NIDA|NIDA verification/i.test(await pp.locator("body").innerText()));
  ok("player kyc page: no overflow (mobile)", (await overflow(pp)) <= 1);

  // Fill the identity form. Date of birth is NO LONGER asked here — it's collected
  // (and 18+ gated) at sign-up and shown read-only on this step, submitted via a
  // hidden field. So the form only needs NIDA + name + email. (Regression guard
  // for commit fc5bdde — re-typing DOB was redundant friction.)
  await pp.fill("#nida", NIDA);
  await pp.fill("#fullName", "Asha Mwamba Juma");
  ok("DOB pre-filled read-only from sign-up (not re-asked)", /From sign-up/i.test(await pp.locator("body").innerText()));
  await pp.fill("#email", `newuser${String(Date.now()).slice(-6)}@example.com`);
  await pp.getByRole("button", { name: /Verify NIDA/ }).click();
  await pp.waitForFunction(() => /Upload documents|NIDA verified/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  const afterNida = await pp.locator("body").innerText();
  ok("NIDA verified — NO snag, reached upload step", /Upload documents|NIDA verified/i.test(afterNida) && !/hit a snag/i.test(afterNida), afterNida.slice(0, 120).replace(/\n+/g, " "));

  // Upload the three documents through the real uploader (resize + action).
  for (const label of ["ID front · Mbele", "ID back · Nyuma", "Selfie · Picha yako"]) {
    await pp.locator(`input[aria-label="${label}"]`).setInputFiles(FILE);
  }
  await pp.waitForFunction(() => (document.body.innerText.match(/Attached/g) || []).length >= 3, null, { timeout: 15000 });
  ok("all three documents attached", (await pp.locator("body").innerText()).match(/Attached/g).length >= 3);

  await pp.getByRole("button", { name: /Submit for review/ }).click();
  await pp.waitForFunction(() => /Submitted for review|Compliance is reviewing|under review/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  ok("player submitted for review", /Submitted for review|Compliance is reviewing|under review/i.test(await pp.locator("body").innerText()));

  // ───────────────── ADMIN (mobile) — via the deep link the email uses ─────────────────
  const adminCtx = await browser.newContext({ ...devices["Pixel 7"] });
  const aErr = []; const ap = await adminCtx.newPage(); attachErrs(ap, aErr);
  ap.on("dialog", (d) => d.accept()); // approve uses confirm()
  await ap.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await ap.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });

  // This is exactly the URL kycSubmittedAdminHtml puts in the admin email.
  const reviewUrl = `${BASE}/admin/players/${userId}?tab=kyc`;
  await ap.goto(reviewUrl, { waitUntil: "networkidle" });
  ok("admin deep link lands on KYC tab", /KYC|NIDA number/i.test(await ap.locator("body").innerText()));
  ok("admin sees the 3 document previews", await ap.locator('img[alt="ID front"], img[alt="ID back"], img[alt="Selfie"]').count() >= 3);
  ok("admin review page: no overflow (mobile)", (await overflow(ap)) <= 1);

  // Request an extra document with a description.
  await ap.getByRole("button", { name: /Request info/ }).first().click();
  await ap.waitForTimeout(150);
  await ap.locator("textarea").first().fill("Please add proof of address.");
  await ap.getByRole("button", { name: /Add a document request/ }).click();
  await ap.locator('input[type="text"]').last().fill("Proof of address (utility bill, < 3 months)");
  await ap.getByRole("button", { name: /Send request/ }).click();
  await ap.waitForTimeout(800);

  // ───────────────── PLAYER — sees the request, uploads it, resubmits ─────────────────
  await pp.goto(`${BASE}/profile/kyc`, { waitUntil: "networkidle" });
  await dismissPrimer(pp);
  const pBody = await pp.locator("body").innerText();
  ok("player sees 'more information needed'", /More information needed/i.test(pBody));
  ok("player sees the requested document description", /Proof of address/.test(pBody));
  await pp.locator('input[aria-label="Proof of address (utility bill, < 3 months)"]').setInputFiles(FILE);
  await pp.waitForFunction(() => /Attached/.test(document.body.innerText), null, { timeout: 15000 });
  ok("player attached the requested doc", /Attached/.test(await pp.locator("body").innerText()));
  await pp.getByRole("button", { name: /Submit for review/ }).click();
  await pp.waitForFunction(() => /Submitted for review|Compliance is reviewing|under review/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  ok("player resubmitted after providing extra doc", /Submitted for review|Compliance is reviewing|under review/i.test(await pp.locator("body").innerText()));

  // ───────────────── ADMIN — sees uploaded extra doc, approves ─────────────────
  await ap.goto(reviewUrl, { waitUntil: "networkidle" });
  ok("admin sees requested doc as uploaded", /Uploaded/.test(await ap.locator("body").innerText()));
  ok("admin sees the requested-doc image", await ap.locator('img[alt="requested document"]').count() >= 1);
  await ap.getByRole("button", { name: /^Approve/ }).click();
  await ap.waitForTimeout(900);

  // ───────────────── PLAYER — verified ─────────────────
  await pp.goto(`${BASE}/profile/kyc`, { waitUntil: "networkidle" });
  await dismissPrimer(pp);
  ok("player sees verified state", /Identity verified|fully verified|verified/i.test(await pp.locator("body").innerText()));

  ok("no player-side console/page errors", pErr.length === 0, pErr.slice(0, 3).join(" | "));
  ok("no admin-side console/page errors", aErr.length === 0, aErr.slice(0, 3).join(" | "));

  // ───────────────── DESKTOP responsiveness pass ─────────────────
  const deskCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); await primerOff(deskCtx);
  const dErr = []; const dp = await deskCtx.newPage(); attachErrs(dp, dErr);
  const fresh2 = await (await dp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "nida_verified" } })).json();
  await dp.goto(`${BASE}/profile/kyc`, { waitUntil: "networkidle" });
  await dismissPrimer(dp);
  ok("player kyc page: no overflow (desktop)", (await overflow(dp)) <= 1);
  // Admin review at desktop.
  const deskAdmin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const da = await deskAdmin.newPage(); attachErrs(da, dErr);
  await da.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await da.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  await da.goto(`${BASE}/admin/players/${fresh2.userId}?tab=kyc`, { waitUntil: "networkidle" });
  ok("admin review page: no overflow (desktop)", (await overflow(da)) <= 1);
  ok("no desktop console/page errors", dErr.length === 0, dErr.slice(0, 3).join(" | "));
} catch (e) {
  ok("e2e ran without throwing", false, String(e));
}
await browser.close();
console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
