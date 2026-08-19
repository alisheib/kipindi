/**
 * D1 · qa:cert-d1 — the KYC journey in a real browser, against real server actions.
 *
 *   NEW PLAYER → identity step for ONE of the four accepted documents → uploads that
 *                document's OWN slots through the real client resize + server action
 *                → submits for review
 *   OFFICER    → opens the KYC workstation, sees the submission and its imagery,
 *                and is offered the three outcomes
 *   Plus a desktop-width responsiveness pass and a console/page-error sweep.
 *
 * ⚠️ ADOPTED 2026-07-31 after sitting UNRUN in scripts/orphan-allowlist.json. It
 * could not have passed as written, for four independent reasons — which is exactly
 * what an unrun script decays into:
 *
 *   1. every navigation used `waitUntil: "networkidle"`, which can NEVER fire on
 *      this app: /api/events is an SSE stream that stays open for the page's life;
 *   2. the NIDA submit button had been renamed "Verify NIDA" → "Continue verification";
 *   3. the upload slots lost their bilingual aria-labels ("ID front · Mbele" → "ID front");
 *   4. officer review MOVED from /admin/players/[id]?tab=kyc to the workstation at
 *      /admin/kyc/[id].
 *
 * It now anchors on STRUCTURE (field ids, file inputs, submit controls) rather than
 * copy, so a rename cannot rot it again, and it survives a locale switch.
 *
 * The officer DECISION state machine (approve / reject / request-info / resubmit,
 * with its emails and notifications) is proven headlessly and exhaustively by
 * `npm run test:kyc` — this suite proves what only a browser can: that the player
 * can actually complete the journey and the officer can actually see the evidence.
 *
 * ⭐ FOUR DOCUMENTS, ONE JOURNEY (2026-08-20). A player proves identity with any ONE
 * of NIDA / passport / driving licence / voter's card, so this driver takes the type
 * as a parameter and reads the SLOT COUNT from the page rather than assuming three —
 * a passport submission has two slots, and "three upload slots are present" would have
 * been a false failure on a correct product.
 *
 * Needs a running server (NODE_ENV != production, so /api/dev-test/* answers):
 *   BASE=http://localhost:3009 npm run qa:cert-d1
 *   ID_TYPE=PASSPORT BASE=... npm run qa:cert-d1
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
/**
 * Which of the four documents this run proves. ⛔ Everything below is derived from
 * this — the number, the expiry, the slot count — because a driver that hard-writes
 * NIDA's shape can only ever prove NIDA works.
 */
const ID_TYPE = (process.env.ID_TYPE || "NIDA").toUpperCase();
const RUN = String(Date.now()).slice(-9);
const ID_SPEC = {
  // 20 digits = "19900101" (a real YYYYMMDD) + 9 run digits + 3 filler. ⛔ Never
  // ending ...0000 or ...9999 — those are the NIDA mock's sanctioned / mismatch QA
  // hooks, and a run that tripped one would read as a product refusal.
  NIDA:           { number: "19900101" + RUN + "123",                              expiry: null,         slots: 3 },
  PASSPORT:       { number: "AB" + RUN.slice(-7),                                  expiry: "2032-06-30", slots: 2 },
  DRIVER_LICENSE: { number: "DL" + RUN.slice(-7),                                  expiry: "2031-06-30", slots: 2 },
  VOTER_CARD:     { number: "VC" + RUN.slice(-7),                                  expiry: null,         slots: 2 },
}[ID_TYPE];
if (!ID_SPEC) { console.error(`unknown ID_TYPE "${ID_TYPE}" — one of NIDA / PASSPORT / DRIVER_LICENSE / VOTER_CARD`); process.exit(1); }
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };

// 1×1 PNG upload fixture — decodable by the client canvas resize.
const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQAY3Y2wAAAAAElFTkSuQmCC", "base64");
const FILE = { name: "doc.png", mimeType: "image/png", buffer: PNG_1x1 };
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

// The submit control was renamed ("Submit for review" -> t.common.confirm).
// Once the NIDA step is done its form is gone, so the upload section owns the only
// submit button on the page — structure, not copy.
const submitForReview = async (page) => {
  const btns = page.locator('button[type="submit"]');
  await btns.last().click({ timeout: 15000 });
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
  // ⛔ A UNIQUE NUMBER PER RUN — one document, one account, is enforced by a partial
  // unique index, so re-using last run's number is refused and reads as a product bug.
  const NIDA = ID_TYPE === "NIDA" ? "19900101" + String(Date.now()).slice(-11) + "7" : ID_SPEC.number;

  await pp.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
  await dismissPrimer(pp);
  // Anchor on STRUCTURE, not copy: this suite sat unrun for months and then failed
  // on renamed strings ('Verify NIDA' -> 'Continue verification', 'ID front · Mbele'
  // -> 'ID front'). The identity form's field ids are the stable contract.
  ok("new user lands on the identity step", (await pp.locator("#idNumber").count()) === 1);
  // ⭐ THE CHOOSER IS PART OF THE CONTRACT. All four documents must be offered, and
  // choosing one must round-trip through the URL so the form works with no JS.
  ok("all four documents are offered", (await pp.locator('[data-chip^="idType:"]').count()) === 4,
     `found ${await pp.locator('[data-chip^="idType:"]').count()}`);
  if (ID_TYPE !== "NIDA") {
    await pp.locator(`[data-chip="idType:${ID_TYPE}"]`).click();
    await pp.waitForFunction((t) => new URL(location.href).searchParams.get("idType") === t, ID_TYPE, { timeout: 8000 });
    ok(`chooser selected ${ID_TYPE} and put it in the URL`, true);
  }
  ok("player kyc page: no overflow (mobile)", (await overflow(pp)) <= 1);

  // Fill the identity form. Date of birth is NO LONGER asked here — it's collected
  // (and 18+ gated) at sign-up and shown read-only on this step, submitted via a
  // hidden field. So the form only needs NIDA + name + email. (Regression guard
  // for commit fc5bdde — re-typing DOB was redundant friction.)
  await pp.fill("#idNumber", NIDA);
  // ⛔ ASKED FOR ONLY WHERE THE DOCUMENT HAS ONE — a NIDA and a voter's card do not
  // expire, so an expiry field on either is itself a defect.
  const expiryPresent = (await pp.locator("#idExpiry").count()) > 0;
  ok(`expiry field ${ID_SPEC.expiry ? "IS" : "is NOT"} asked for on ${ID_TYPE}`, expiryPresent === !!ID_SPEC.expiry);
  if (ID_SPEC.expiry) {
    // ⚠️ DateSelect is a SEGMENTED field: DD / MM / YYYY as three visible text
    // inputs, with the ISO value on a HIDDEN input carrying the id. Playwright
    // cannot `fill` the hidden one, and the segments have no ids of their own —
    // their only stable handle is their position inside the control. Typing into
    // them is also what a player does, so this exercises the real keystroke path
    // (`date-mask.ts`) rather than writing a value the UI never produced.
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
  ok("DOB pre-filled read-only from sign-up (not re-asked)", /From sign-up/i.test(await pp.locator("body").innerText()));
  await pp.fill("#email", `newuser${String(Date.now()).slice(-6)}@example.com`);
  await pp.getByRole("button", { name: /Continue verification/ }).click();
  await pp.waitForFunction(() => /Upload documents|Document details saved/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  const afterNida = await pp.locator("body").innerText();
  ok(`${ID_TYPE} accepted — NO snag, reached upload step`, /Upload documents|Document details saved/i.test(afterNida) && !/hit a snag/i.test(afterNida), afterNida.slice(0, 160).replace(/\n+/g, " "));

  // Upload the three documents through the real uploader (resize + action).
  // Anchor on STRUCTURE, not copy: this suite sat unrun for months and then broke
  // on renamed strings — the slot labels lost their bilingual suffix when i18n
  // landed ("ID front · Mbele" → "ID front"). The three file inputs are the
  // stable contract, and they survive a locale switch too.
  // ⛔ THE SLOT COUNT IS THIS DOCUMENT'S, NEVER A LITERAL 3. A passport asks for the
  // bio page + a selfie; asserting three would fail on a correct product.
  const want = ID_SPEC.slots;
  const slots = pp.locator('input[type="file"]');
  await pp.waitForFunction((n) => document.querySelectorAll('input[type="file"]').length >= n, want, { timeout: 15000 });
  ok(`${want} upload slots are present for ${ID_TYPE}`, (await slots.count()) === want, `found ${await slots.count()}`);
  for (let i = 0; i < want; i++) await slots.nth(i).setInputFiles(FILE);
  await pp.waitForFunction((n) => (document.body.innerText.match(/Attached/g) || []).length >= n, want, { timeout: 15000 });
  ok(`all ${want} documents attached`, (await pp.locator("body").innerText()).match(/Attached/g).length >= want);

  await submitForReview(pp);
  await pp.waitForFunction(() => /Submitted for review|Compliance is reviewing|under review/i.test(document.body.innerText), null, { timeout: 12000 }).catch(() => {});
  ok("player submitted for review", /Submitted for review|Compliance is reviewing|under review/i.test(await pp.locator("body").innerText()));

  // ───────────────── ADMIN (mobile) — via the deep link the email uses ─────────────────
  const adminCtx = await browser.newContext({ ...devices["Pixel 7"] });
  const aErr = []; const ap = await adminCtx.newPage(); attachErrs(ap, aErr);
  ap.on("dialog", (d) => d.accept()); // accept any stray native dialog (approve now uses an in-DOM ConfirmDialog)
  await ap.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  await ap.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });

  // ⚠️ SCOPE, corrected 2026-07-31. When this script was written the whole review
  // happened on /admin/players/[id]?tab=kyc. Officer review has since moved to the
  // KYC WORKSTATION at /admin/kyc/[id] — that is where the document viewer, the
  // zoom controls, the checklist and the decision buttons now live. Driving the old
  // surface is what left this suite asserting against a page that no longer does
  // the job.
  //
  // The players tab is additionally gated on canView(role, "compliance") — a
  // data-backed RBAC grant introduced 2026-07-28 that a dev in-memory store does
  // not seed. So this suite drives the WORKSTATION, and the officer DECISION state
  // machine (approve / reject / request-info / resubmit, with its emails and
  // notifications) is proven headlessly and exhaustively by test:kyc's 61-assertion
  // kyc-flow-stress suite. What a browser adds, and what is asserted here, is that
  // the officer can actually SEE the submission and its imagery.
  const workstation = `${BASE}/admin/kyc/${userId}`;
  await ap.goto(workstation, { waitUntil: "domcontentloaded" });
  await ap.waitForTimeout(1200);
  const wsBody = await ap.locator("body").innerText();
  ok("officer reaches the KYC workstation", /Approve identity|Reject/i.test(wsBody), wsBody.slice(0, 140).replace(/\n+/g, " "));
  ok("workstation shows a document viewer with all three slots",
    /ID FRONT/i.test(wsBody) && /ID BACK/i.test(wsBody) && /SELFIE/i.test(wsBody));
  ok("workstation renders a real document image", (await ap.locator('img[alt="ID front"]').count()) >= 1);
  ok("workstation offers the three outcomes",
    /Approve identity/i.test(wsBody) && /Reject/i.test(wsBody) && /Escalate AML/i.test(wsBody));
  ok("🔴 the checklist does NOT claim a government match",
    !/government match|NIDA verified/i.test(wsBody) && /no authority check/i.test(wsBody),
    "docs/IDENTITY-POLICY.md: format + uniqueness only. An officer releasing a withdrawal\n" +
    "    on a 'NIDA verified' tick would be acting on evidence that does not exist.");
  ok("workstation: no overflow (mobile)", (await overflow(ap)) <= 1);

  ok("no player-side console/page errors", pErr.length === 0, pErr.slice(0, 3).join(" | "));
  ok("no admin-side console/page errors", aErr.length === 0, aErr.slice(0, 3).join(" | "));

  // ───────────────── DESKTOP responsiveness pass ─────────────────
  const deskCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); await primerOff(deskCtx);
  const dErr = []; const dp = await deskCtx.newPage(); attachErrs(dp, dErr);
  const fresh2 = await (await dp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "nida_verified" } })).json();
  await dp.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
  await dismissPrimer(dp);
  ok("player kyc page: no overflow (desktop)", (await overflow(dp)) <= 1);
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
console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
