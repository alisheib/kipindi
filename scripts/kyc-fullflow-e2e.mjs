/**
 * D1 · qa:cert-d1 — the KYC journey in a real browser, against real server actions.
 *
 *   NEW PLAYER → the typed identity form for ONE of the four accepted documents → ONE press
 *                → verified AT ONCE, with no upload slot anywhere on the page
 *   OFFICER    → opens the KYC workstation on that automatic approval: a TYPED case (no image
 *                card), the live checks, and the post-check outcomes (Mark checked · Ask for
 *                corrections · Reject · Escalate AML)
 *   Plus a desktop-width responsiveness pass and a console/page-error sweep.
 *
 * ⭐ THE 2026-10-10 JOURNEY (owner ruling, Ali, relaying the Gaming Board's request that players no
 * longer upload identity documents — docs/COMPLIANCE-DECISIONS.md). Until that day this drive
 * uploaded the document's photos and a selfie and submitted them for an officer; a player now types
 * the details and is approved when the automatic checks pass, and an officer checks afterwards.
 * Agent applicants keep the photo track — `qa:agent-drive` drives it.
 *
 * ⚠️ ADOPTED 2026-07-31 after sitting UNRUN in scripts/orphan-allowlist.json. It could not have
 * passed as written, for four independent reasons — which is exactly what an unrun script decays
 * into: `networkidle` can never fire on this app (/api/events is an SSE stream); the submit button
 * had been renamed; the upload slots lost their bilingual aria-labels; officer review moved from
 * /admin/players/[id]?tab=kyc to the workstation at /admin/kyc/[id].
 *
 * It anchors on STRUCTURE (field ids, the form's own submit, the `?verified=` outcome) rather than
 * copy, so a rename cannot rot it again, and it survives a locale switch.
 *
 * The officer DECISION state machine (approve / reject / corrections / post-check / versions, with
 * its emails and notifications) is proven headlessly by `npm run test:kyc` and
 * `npm run test:kyc-typed-only` — this drive proves what only a browser can: that the player can
 * actually complete the journey and the officer can actually see the case.
 *
 * ⭐ FOUR DOCUMENTS, ONE JOURNEY (2026-08-20). A player proves identity with any ONE of NIDA /
 * passport / driving licence / voter's card, so this driver takes the type as a parameter.
 *
 * Needs a running server (NODE_ENV != production, so /api/dev-test/* answers):
 *   BASE=http://localhost:3009 npm run qa:cert-d1
 *   ID_TYPE=PASSPORT BASE=... npm run qa:cert-d1
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const NL = String.fromCharCode(10);
/**
 * Which of the four documents this run proves. ⛔ Everything below is derived from this — the
 * number, the expiry — because a driver that hard-writes NIDA's shape can only ever prove NIDA works.
 */
const ID_TYPE = (process.env.ID_TYPE || "NIDA").toUpperCase();
const RUN = String(Date.now()).slice(-9);
const ID_SPEC = {
  // 20 digits = "19900101" (a real YYYYMMDD, the fixture account's own birth date) + run digits.
  // ⛔ Never ending ...0000 or ...9999 — those are the NIDA mock's sanctioned / mismatch QA hooks,
  // and a run that tripped one would read as a product refusal.
  NIDA:           { number: "19900101" + RUN + "123", expiry: null },
  PASSPORT:       { number: "AB" + RUN.slice(-7),     expiry: "2032-06-30" },
  DRIVER_LICENSE: { number: "DL" + RUN.slice(-7),     expiry: "2031-06-30" },
  VOTER_CARD:     { number: "VC" + RUN.slice(-7),     expiry: null },
}[ID_TYPE];
if (!ID_SPEC) { console.error(`unknown ID_TYPE "${ID_TYPE}" — one of NIDA / PASSPORT / DRIVER_LICENSE / VOTER_CARD`); process.exit(1); }
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };
const oneLine = (s) => String(s).split(NL).join(" ");

const attachErrs = (page, sink) => {
  page.on("console", (m) => { if (m.type() === "error" && !/eval|DevTools|React will never use eval|404|Failed to load resource|navigator.vibrate/.test(m.text())) sink.push(m.text()); });
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
  // Brand-new user with NO KYC record.
  const fresh = await (await pp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "none" } })).json();
  ok("fresh player + session created", !!fresh.userId, JSON.stringify(fresh));
  const userId = fresh.userId;
  // ⛔ A UNIQUE NUMBER PER RUN — one document, one account, is enforced by a partial
  // unique index, so re-using last run's number is refused and reads as a product bug.
  const NUMBER = ID_TYPE === "NIDA" ? "19900101" + String(Date.now()).slice(-11) + "7" : ID_SPEC.number;

  await pp.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
  await dismissPrimer(pp);
  ok("new user lands on the identity form", (await pp.locator("#idNumber").count()) === 1);
  // ⭐ THE CHOOSER IS PART OF THE CONTRACT. All four documents must be offered, and
  // choosing one must round-trip through the URL so the form works with no JS.
  ok("all four documents are offered", (await pp.locator('[data-chip^="idType:"]').count()) === 4,
     `found ${await pp.locator('[data-chip^="idType:"]').count()}`);
  if (ID_TYPE !== "NIDA") {
    await pp.locator(`[data-chip="idType:${ID_TYPE}"]`).click();
    await pp.waitForFunction((t) => new URL(location.href).searchParams.get("idType") === t, ID_TYPE, { timeout: 8000 });
    ok(`chooser selected ${ID_TYPE} and put it in the URL`, true);
  }
  // ⛔ THE TYPED TRACK UPLOADS NOTHING (2026-10-10) — for any of the four documents.
  ok(`⛔ the ${ID_TYPE} form asks for no upload — no file input on the page`, (await pp.locator('input[type="file"]').count()) === 0);
  ok("player kyc page: no overflow (mobile)", (await overflow(pp)) <= 1);

  await pp.fill("#idNumber", NUMBER);
  // ⛔ ASKED FOR ONLY WHERE THE DOCUMENT HAS ONE — a NIDA and a voter's card do not
  // expire, so an expiry field on either is itself a defect.
  const expiryPresent = (await pp.locator("#idExpiry").count()) > 0;
  ok(`expiry field ${ID_SPEC.expiry ? "IS" : "is NOT"} asked for on ${ID_TYPE}`, expiryPresent === !!ID_SPEC.expiry);
  if (ID_SPEC.expiry) {
    // ⚠️ DateSelect is a SEGMENTED field: DD / MM / YYYY as three visible text inputs, with the ISO
    // value on a HIDDEN input carrying the id. Playwright cannot `fill` the hidden one; typing into the
    // segments is also what a player does (`date-mask.ts`).
    const [ey, em, ed] = ID_SPEC.expiry.split("-");
    const box = pp.locator("div").filter({ has: pp.locator("#idExpiry") }).last();
    const segInputs = box.locator('input[type="text"]');
    await segInputs.nth(0).fill(ed);
    await segInputs.nth(1).fill(em);
    await segInputs.nth(2).fill(ey);
    await pp.waitForFunction((iso) => document.querySelector("#idExpiry")?.value === iso, ID_SPEC.expiry, { timeout: 8000 });
    ok(`expiry ${ID_SPEC.expiry} typed into the segmented field and reached the form`, true);
  }
  await pp.fill("#fullName", "Asha Mwamba Juma");
  // ⭐ The date of birth is the ACCOUNT's (2026-10-10): shown read-only, never a field, never posted.
  ok("DOB shown read-only from sign-up (not re-asked, not posted)",
    /From sign-up/i.test(await pp.locator("body").innerText()) && (await pp.locator('form:has(#idNumber) input[name="dob"]').count()) === 0);
  // ⚠️ FILLED ONLY WHERE IT EXISTS (route audit 2026-10-06, A1): the identity step renders no `#email` field.
  const emailField = pp.locator("#email");
  if (await emailField.count() > 0 && !(await emailField.inputValue())) await emailField.fill(`newuser${String(Date.now()).slice(-6)}@example.com`);
  // ⭐ ONE PRESS. The form's OWN submit (structure, not the button's words), and the outcome read from the URL the
  // action redirects to: `?verified=1` approved · `?sent=1` with an officer · `?reason=` refused.
  await Promise.all([
    pp.waitForURL((u) => u.searchParams.has("verified") || u.searchParams.has("sent") || u.searchParams.has("reason"), { timeout: 30000 }).catch(() => {}),
    pp.locator('form:has(#idNumber) button[type="submit"]').first().click(),
  ]);
  const q = new URL(pp.url()).searchParams;
  ok(`${ID_TYPE} verified at ONCE by one press — no snag, no upload, no officer wait`,
    q.get("verified") === "1", q.has("reason") ? `refused: ${q.get("reason")}` : q.has("sent") ? "sent to an officer (sent=1)" : pp.url());
  await pp.waitForFunction(() => /Your identity is verified|ID verified/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  const afterPress = await pp.locator("body").innerText();
  ok("the verified card says so", /Your identity is verified|ID verified/i.test(afterPress) && !/hit a snag/i.test(afterPress), oneLine(afterPress.slice(0, 160)));
  ok("⛔ …and still no file input after the press", (await pp.locator('input[type="file"]').count()) === 0);

  // ───────────────── ADMIN (mobile) — via the deep link the email uses ─────────────────
  const adminCtx = await browser.newContext({ ...devices["Pixel 7"] });
  const aErr = []; const ap = await adminCtx.newPage(); attachErrs(ap, aErr);
  ap.on("dialog", (d) => d.accept()); // accept any stray native dialog (decisions use an in-DOM ConfirmDialog)
  await ap.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  await ap.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });

  // The KYC WORKSTATION at /admin/kyc/[id] is where the checklist and the decisions live. The players tab is gated on a
  // data-backed compliance grant a dev in-memory store does not seed, so this drive uses the workstation.
  const workstation = `${BASE}/admin/kyc/${userId}`;
  await ap.goto(workstation, { waitUntil: "domcontentloaded" });
  await ap.waitForTimeout(1200);
  const wsBody = await ap.locator("body").innerText();
  ok("officer reaches the KYC workstation", /Mark checked|Reject/i.test(wsBody), oneLine(wsBody.slice(0, 140)));
  ok("⭐ the case is a TYPED one — no document image card, no image on the page",
    /Typed details/i.test(wsBody) && (await ap.locator('img[alt="ID front"], img[alt="Selfie"]').count()) === 0);
  ok("⭐ an automatic approval offers the post-check outcomes (Mark checked · Ask for corrections · Reject · Escalate AML)",
    /Mark checked/i.test(wsBody) && /Ask for corrections/i.test(wsBody) && /Reject/i.test(wsBody) && /Escalate AML/i.test(wsBody));
  ok("⛔ …and no Approve on an identity already approved", !/Approve identity/i.test(wsBody));
  ok("🔴 the checklist does NOT claim a government match",
    !/government match|NIDA verified/i.test(wsBody) && /no authority check/i.test(wsBody),
    "docs/IDENTITY-POLICY.md: format + uniqueness only. An officer acting on a 'NIDA verified' tick would be acting on evidence that does not exist.");
  ok("workstation: no overflow (mobile)", (await overflow(ap)) <= 1);

  ok("no player-side console/page errors", pErr.length === 0, pErr.slice(0, 3).join(" | "));
  ok("no admin-side console/page errors", aErr.length === 0, aErr.slice(0, 3).join(" | "));

  // ───────────────── DESKTOP responsiveness pass ─────────────────
  // `nida_verified` = details saved before 2026-10-10 with no photos (IN_PROGRESS): the typed form, prefilled.
  const deskCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); await primerOff(deskCtx);
  const dErr = []; const dp = await deskCtx.newPage(); attachErrs(dp, dErr);
  const fresh2 = await (await dp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "nida_verified" } })).json();
  await dp.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
  await dismissPrimer(dp);
  ok("player kyc page: no overflow (desktop)", (await overflow(dp)) <= 1);
  ok("⛔ the prefilled typed form (details saved, no photos) asks for no upload either", (await dp.locator('input[type="file"]').count()) === 0);
  // Admin review at desktop.
  const deskAdmin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const da = await deskAdmin.newPage(); attachErrs(da, dErr);
  await da.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  await da.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  await da.goto(`${BASE}/admin/players/${fresh2.userId}?tab=kyc`, { waitUntil: "domcontentloaded" });
  ok("admin review page: no overflow (desktop)", (await overflow(da)) <= 1);
  ok("no desktop console/page errors", dErr.length === 0, dErr.slice(0, 3).join(" | "));
} catch (e) {
  ok("e2e ran without throwing", false, String(e));
}
await browser.close();
console.log("");
console.log(`${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
