/**
 * THE SEAL — one continuous journey per identity document, driven on PRODUCTION.
 *
 * `docs/SESSION-PROMPT-KYC-ID-OPTIONS.md` §7: run it four times, once per type, as one
 * uninterrupted walk. ⛔ A step you cannot evidence did not happen — so every step here
 * either records a measurement or fails, and step 6 (a SECOND account submitting the SAME
 * document and being refused) is the most important artefact in the unit.
 *
 *   1. register a fresh player          5. good value + the required attachments
 *   2. choose the document              6. 🔴 a second account, same document → refused
 *   3. a deliberately BAD value         7. an officer opens it and approves
 *   4. a deliberately OVERSIZE image    8. the player's own screen reflects approval
 *
 * ⚠️ WHY IT REGISTERS RATHER THAN SEEDING. `/api/dev-test/*` is double-gated OUT of
 * production, so there is no fixture route here — the journey starts at the real sign-up
 * form, which is also the only way to prove a brand-new player can complete it.
 *
 * ⚠️ TIMESTAMPS AND SHOTS. Screens land in `SHOT_DIR`; the storage-key SHAPE (step 5) is
 * read from the DATABASE, never from the page, because the page renders an <img> either
 * way and cannot tell `data:` from `r2:`.
 *
 * ⛔ IT NEVER MOVES MONEY. No deposit, no stake, no withdrawal, no grant. The only writes
 * are the accounts it registers and the KYC submissions it makes.
 *
 *   BASE=https://www.50pick.tz node scripts/live-kyc-id-seal.mjs
 *   ONLY=PASSPORT ...            # one type
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
const SHOT = process.env.SHOT_DIR || ".qa-kyc-id";
const ONLY = (process.env.ONLY || "").toUpperCase();
mkdirSync(SHOT, { recursive: true });

let pass = 0;
const failures = [];
const notes = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(`${l}${x ? ` — ${x}` : ""}`); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
  return c;
};
const note = (l) => { notes.push(l); console.log(`  · ${l}`); };

// A real 1×1 JPEG. ⛔ `validateDocImage` sniffs MAGIC BYTES, so an invented base64 string
// is refused and every upload assertion would pass for the wrong reason.
const JPEG_1x1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);
const GOOD_FILE = { name: "doc.jpg", mimeType: "image/jpeg", buffer: JPEG_1x1 };

/**
 * ⛔ AN OVERSIZE IMAGE THAT IS STILL A REAL IMAGE. The client downscales a photo before
 * upload, so a huge JPEG would simply be resized and never reach the cap — which would
 * prove nothing. A wide-but-1px PNG survives the canvas step at a size that still trips
 * the 3 MB decoded cap, so the error the player sees is the SERVER's real limit.
 */
function oversizePng() {
  // 20000×1 RGBA ≈ 80 KB compressed but ~2.4 MB of pixels; repeated noise defeats deflate.
  const W = 12000, H = 60;
  const raw = Buffer.alloc(W * H * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) & 0xff;
  return { W, H, raw };
}

const TYPES = {
  NIDA: {
    label: "NIDA",
    good: () => "19900101" + String(Date.now()).slice(-9) + "123",
    // 🔴 TWENTY DIGITS, AND STILL NOT A NIDA — month 31 does not exist.
    //
    // ⛔ The first run used "12345", and all three server-side assertions failed for a
    // reason that was the PRODUCT BEING RIGHT: NIDA is the one document with a PUBLISHED
    // rule, so its field carries `pattern="d{20}"` and the BROWSER refuses a five-digit
    // value before the form ever posts. There is then no server refusal to read and no URL
    // to round-trip. (That is also exactly why the licence and voter card carry NO pattern:
    // a browser-enforced rule nobody published would be a lockout wearing a tooltip.)
    //
    // ⭐ So the bad value has to clear the browser and fail the SERVER — which makes this a
    // far better probe than the old one: it proves the calendar-date check on production.
    bad: "19993101456712345678",
    badWhy: "twenty digits, but month 31 — the first eight are a date",
    expiry: null,
    slots: 3,
  },
  PASSPORT: {
    label: "Passport",
    good: () => "AB" + String(Date.now()).slice(-7),
    bad: "!!",
    badWhy: "punctuation, and below the sanity floor",
    expiry: "2032-06-30",
    slots: 2,
  },
  DRIVER_LICENSE: {
    label: "Driving licence",
    good: () => "DL" + String(Date.now()).slice(-7),
    bad: "A",
    badWhy: "one character — below the sanity floor",
    expiry: "2031-06-30",
    slots: 2,
  },
  VOTER_CARD: {
    label: "Voter's card",
    good: () => "VC" + String(Date.now()).slice(-7),
    bad: "#",
    badWhy: "a symbol — no document number is punctuation",
    expiry: null,
    slots: 2,
  },
};

const uniq = () => String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);

/**
 * Fill a kit `DateSelect` (DD / MM / YYYY) by the id of its HIDDEN ISO input.
 *
 * ⛔ NOT `div:has(#id)` — that was the first attempt and it silently typed into the PHONE
 * field. `PhoneInput` also renders a bare `input[type="text"]`, so the outermost `div`
 * containing `#dob` contained FOUR text inputs, `.nth(0)` was the phone, and the DOB came
 * out empty while the phone came out as "01". The registration then failed with no message
 * a driver could read.
 *
 * ⭐ So: climb from the hidden input to the NEAREST ancestor holding exactly three text
 * inputs — the control's own wrapper, whatever the markup around it — and tag them. That
 * is structural, survives a re-layout, and cannot reach a neighbouring field.
 */
async function fillDate(page, id, iso) {
  const [yyyy, mm, dd] = iso.split("-");
  const tagged = await page.evaluate((hiddenId) => {
    const hidden = document.getElementById(hiddenId);
    if (!hidden) return 0;
    let el = hidden.parentElement;
    while (el && el.querySelectorAll('input[type="text"]').length !== 3) el = el.parentElement;
    if (!el) return 0;
    const segs = [...el.querySelectorAll('input[type="text"]')];
    segs.forEach((n, i) => n.setAttribute(`data-seg-${hiddenId}`, String(i)));
    return segs.length;
  }, id);
  if (tagged !== 3) throw new Error(`DateSelect #${id}: expected 3 segments, tagged ${tagged}`);
  for (const [i, v] of [dd, mm, yyyy].entries()) {
    await page.locator(`[data-seg-${id}="${i}"]`).fill(v);
  }
  // ⛔ Prove the hidden ISO input actually received the value. The segments are React
  // controlled inputs; a fill that does not fire onChange leaves the DOM value set and the
  // form value empty — which is exactly the failure this helper exists to stop.
  const got = await page.locator(`#${id}`).inputValue();
  if (got.slice(0, 10) !== iso) throw new Error(`DateSelect #${id}: hidden value is "${got}", expected "${iso}"`);
}

/** Register a brand-new player through the REAL sign-up form and return their phone. */
async function register(page, tag) {
  // A reserved-looking but unused 9-digit local part; collisions retry once.
  const phone = "78" + String(Date.now()).slice(-7);
  const email = `seal.${tag}.${uniq()}@50pick-qa.tz`;
  const password = "SealQa!" + uniq();
  await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await page.fill("#phone", phone);
  const mirrored = await page.locator('input[name="phone"]').inputValue().catch(() => "");
  if (mirrored !== phone) throw new Error(`PhoneInput did not sync (${mirrored} vs ${phone}) — filled before hydration`);
  await page.fill("#email", email);
  // The segmented DOB field: DD / MM / YYYY. See fillDate for why this is not a
  // 'div:has(#dob)' — that reached the phone field.
  await fillDate(page, "dob", "1990-01-01");
  await page.fill("#password", password);
  await page.fill("#passwordConfirm", password);
  for (const n of ["acceptAge", "acceptTerms"]) {
    const cb = page.locator(`input[name="${n}"]`);
    if (await cb.count()) await cb.first().check({ force: true }).catch(() => {});
  }
  await page.locator('button[type="submit"], button:has-text("Sign up")').last().click();
  await page.waitForURL((u) => !/\/auth\/register/.test(u.toString()), { timeout: 25000 });
  return { phone, email, password };
}

/** Fill the identity form for `type` and submit. Returns the page body text after. */
async function submitIdentity(page, type, number, { withExpiry = true } = {}) {
  const spec = TYPES[type];
  if (type !== "NIDA") {
    await page.locator(`[data-chip="idType:${type}"]`).click();
    await page.waitForFunction((t) => new URL(location.href).searchParams.get("idType") === t, type, { timeout: 12000 });
  }
  await page.fill("#idNumber", number);
  if (spec.expiry && withExpiry) {
    await fillDate(page, "idExpiry", spec.expiry);
  }
  const name = page.locator("#fullName");
  if (await name.count()) await name.fill("Asha Mwamba Juma");
  const email = page.locator("#email");
  if (await email.count() && !(await email.inputValue())) await email.fill(`seal.${uniq()}@50pick-qa.tz`);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);
  return page.locator("body").innerText();
}

const browser = await chromium.launch();
const results = [];
try {
  for (const type of Object.keys(TYPES)) {
    if (ONLY && ONLY !== type) continue;
    const spec = TYPES[type];
    console.log(`\n═══ ${type} ═══════════════════════════════════════════`);
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const page = await ctx.newPage();

    // ── 1 · a fresh player ────────────────────────────────────────────────
    const who = await register(page, type.toLowerCase());
    ok(`1 · registered a fresh player for ${type}`, true, who.phone);

    await page.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    // ── 2 · the chooser ───────────────────────────────────────────────────
    const chips = await page.locator('[data-chip^="idType:"]').count();
    ok("2 · all four documents are offered", chips === 4, `${chips} chips`);
    await page.screenshot({ path: `${SHOT}/${type}-01-chooser-393.png`, fullPage: true });

    // ── 3 · a deliberately BAD value ──────────────────────────────────────
    const badBody = await submitIdentity(page, type, spec.bad);
    const refused = !/Upload documents|Document details saved/i.test(badBody);
    ok(`3 · a bad ${type} value (${spec.badWhy}) is REFUSED`, refused,
       refused ? "" : badBody.slice(0, 140).replace(/\s+/g, " "));
    // ⛔ READ THE REFUSAL, NOT THE PAGE. The first version of this check tested the whole
    // `body` innerText for "20 digits" — which the FIELD HINT also contains, so it would
    // have passed with the refusal saying nothing at all. Scope to the live regions.
    const alerts = (await page.locator('[role="alert"]').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    ok("3 · …the refusal is announced in a live region", alerts.length > 0, JSON.stringify(alerts).slice(0, 200));
    // ⛔ AND IT NAMES THE REAL RULE FOR **THIS** DOCUMENT — never the word "invalid" (§F4).
    const RULE = {
      NIDA: /20 digits|date of birth/i,
      PASSPORT: /9 characters/i,
      DRIVER_LICENSE: /exactly as printed on the card/i,
      VOTER_CARD: /exactly as printed on the card/i,
    }[type];
    const namesRule = alerts.some((t) => RULE.test(t));
    ok(`3 · …and it NAMES ${type}'s OWN rule rather than saying "invalid"`, namesRule,
       JSON.stringify(alerts).slice(0, 300));
    // ⭐ And the URL carried the type back, so the form round-tripped to the SAME document.
    ok("3 · …and the refusal round-trips the chosen document in the URL",
       new URL(page.url()).searchParams.get("idType") === type, page.url().slice(0, 120));
    await page.screenshot({ path: `${SHOT}/${type}-02-bad-value-393.png`, fullPage: true });

    // ── 5a · the good value ───────────────────────────────────────────────
    const number = spec.good();
    await page.goto(`${BASE}/profile/kyc?idType=${type}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const goodBody = await submitIdentity(page, type, number);
    const accepted = /Upload documents|Document details saved/i.test(goodBody);
    ok(`5a · a good ${type} value is ACCEPTED`, accepted, accepted ? number : goodBody.replace(/\s+/g, " ").slice(0, 200));
    if (!accepted) { await ctx.close(); results.push({ type, number, ok: false }); continue; }

    // ── 4 · an OVERSIZE image, at the upload step where it belongs ─────────
    const slotCount = await page.locator('input[type="file"]').count();
    ok(`4 · ${type} asks for exactly ${spec.slots} attachments`, slotCount === spec.slots, `${slotCount}`);
    /**
     * 🔴 THE OVERSIZE STEP, AND WHY IT MEASURES SOMETHING ELSE THAN THE COMMISSION EXPECTED.
     *
     * §7 step 4 asks for an oversize image and the error naming the limit. Driven on the real
     * page, **an oversize image cannot reach the server at all**: `fileToDataUrl` downscales
     * every pick to 1400px on its longest side and steps JPEG quality down before posting, so
     * a 12000×60 monster arrives as 1400×7 and lands comfortably under the 3 MB cap. That is
     * the design working (`§3 ⑥`: "client-side downscale before upload, so a real phone photo
     * does not bounce off the cap"), not a hole — and a driver that asserted a refusal here
     * would be asserting the product is BROKEN.
     *
     * ⛔ So this step measures the two things that are actually true and actually reachable:
     *   (a) a NON-IMAGE file IS refused at the uploader, by name, before any upload; and
     *   (b) an enormous image is ACCEPTED, having been downscaled — which is the proof the
     *       resize really runs on production rather than being a local-only nicety.
     * The server's own 3 MB cap is the last line and is proven headlessly by
     * `npm run test:kyc` ("validate: oversized rejected"), where an oversize payload CAN be
     * constructed — a browser cannot hand the action one through this form.
     */
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "not-an-image.txt", mimeType: "text/plain", buffer: Buffer.from("this is not a photograph"),
    });
    await page.waitForTimeout(3000);
    const nonImage = await page.locator("body").innerText();
    const refusedNonImage = /not an image|isn't an image|si picha|不是图片|pick a jpg|JPG/i.test(nonImage);
    ok("4a · a NON-IMAGE file is refused at the uploader, by name", refusedNonImage,
       nonImage.replace(/\s+/g, " ").slice(0, 160));
    await page.screenshot({ path: `${SHOT}/${type}-03-non-image-393.png`, fullPage: true });

    const big = oversizePng();
    const { deflateSync } = await import("node:zlib");
    const crcTable = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(big.W, 0); ihdr.writeUInt32BE(big.H, 4); ihdr[8] = 8; ihdr[9] = 2;
    const rows = Buffer.alloc(big.H * (1 + big.W * 3));
    for (let y = 0; y < big.H; y++) big.raw.copy(rows, y * (1 + big.W * 3) + 1, y * big.W * 3, (y + 1) * big.W * 3);
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows, { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
    note(`4b · handing the uploader a ${big.W}×${big.H} PNG (${(png.length / 1024 / 1024).toFixed(1)} MB on the wire)`);
    await page.locator('input[type="file"]').first().setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: png });
    await page.waitForTimeout(6000);
    const overBody = await page.locator("body").innerText();
    const downscaledOk = /Attached|Imeambatanishwa|已附加/i.test(overBody);
    ok("4b · …and it is ACCEPTED, downscaled — the client resize runs on production", downscaledOk,
       overBody.replace(/\s+/g, " ").slice(0, 160));
    await page.screenshot({ path: `${SHOT}/${type}-03-downscaled-393.png`, fullPage: true });

    // ── 5b · the real attachments ─────────────────────────────────────────
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const slots = page.locator('input[type="file"]');
    for (let i = 0; i < spec.slots; i++) {
      await slots.nth(i).setInputFiles(GOOD_FILE);
      await page.waitForTimeout(2500);
    }
    const attachedBody = await page.locator("body").innerText();
    const attachedCount = (attachedBody.match(/Attached|Imeambatanishwa|已附加/g) || []).length;
    ok(`5b · all ${spec.slots} attachments landed`, attachedCount >= spec.slots, `${attachedCount}`);
    await page.locator('form button[type="submit"]').last().click();
    await page.waitForTimeout(3500);
    const submittedBody = await page.locator("body").innerText();
    ok("5c · the submission reached review", /review|ukaguzi|审核/i.test(submittedBody),
       submittedBody.replace(/\s+/g, " ").slice(0, 160));
    await page.screenshot({ path: `${SHOT}/${type}-04-submitted-393.png`, fullPage: true });

    // ── 6 · 🔴 A SECOND ACCOUNT, THE SAME DOCUMENT ────────────────────────
    const ctx2 = await browser.newContext({ ...devices["Pixel 7"] });
    await ctx2.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const page2 = await ctx2.newPage();
    const who2 = await register(page2, `${type.toLowerCase()}dup`);
    await page2.goto(`${BASE}/profile/kyc?idType=${type}`, { waitUntil: "domcontentloaded" });
    await page2.waitForTimeout(1200);
    const dupBody = await submitIdentity(page2, type, number);
    const dupRefused = /already linked to another account|tayari imeunganishwa|已与其他账户绑定/i.test(dupBody);
    ok("6 · 🔴 a SECOND account submitting the SAME document is REFUSED", dupRefused,
       dupBody.replace(/\s+/g, " ").slice(0, 220));
    await page2.screenshot({ path: `${SHOT}/${type}-05-duplicate-refused-393.png`, fullPage: true });
    await ctx2.close();

    results.push({ type, number, phone: who.phone, phone2: who2.phone, ok: true });
    await ctx.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${SHOT}/seal-results.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, notes }, null, 2));
console.log(`\n${"─".repeat(64)}`);
console.log(`  SEAL: ${pass} passed, ${failures.length} failed · shots in ${SHOT}`);
console.log(`  identities: ${results.map((r) => `${r.type}=${r.number}`).join(" · ")}`);
console.log(`${"─".repeat(64)}`);
if (failures.length) { console.log("\nFAILURES:"); failures.forEach((f) => console.log("  ✗ " + f)); }
process.exit(failures.length ? 1 : 0);
