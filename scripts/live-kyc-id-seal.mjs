/**
 * THE SEAL — one continuous journey per identity document, driven on PRODUCTION.
 *
 * `docs/SESSION-PROMPT-KYC-ID-OPTIONS.md` §7: run it four times, once per type, as one
 * uninterrupted walk. ⛔ A step you cannot evidence did not happen — so every step here
 * either records a measurement or fails, and step 6 (a SECOND account submitting the SAME
 * document and being refused) is the most important artefact in the unit.
 *
 * ⭐ THE 2026-10-10 JOURNEY (owner ruling, Ali, relaying the Gaming Board's request that players
 * no longer upload identity documents — docs/COMPLIANCE-DECISIONS.md). A player types the
 * document's details and ONE press verifies them at once when the automatic checks pass; an
 * officer checks the approval afterwards (`live-kyc-id-review.mjs`, the post-check). Until that
 * day steps 4–5 here uploaded photos and a selfie, and an oversize image probed the uploader.
 *
 *   1. register a fresh player          5. a good value → ONE press → verified at once
 *   2. choose the document              6. 🔴 a second account, same document → refused
 *   3. a deliberately BAD value         7. an officer checks it afterwards (live-kyc-id-review.mjs)
 *   4. ⛔ no attachment asked, before or after the press
 *
 * ⚠️ WHY IT REGISTERS RATHER THAN SEEDING. `/api/dev-test/*` is double-gated OUT of
 * production, so there is no fixture route here — the journey starts at the real sign-up
 * form, which is also the only way to prove a brand-new player can complete it.
 *
 * ⛔ IT NEVER MOVES MONEY. No deposit, no stake, no withdrawal, no grant. The only writes
 * are the accounts it registers and the identities it verifies — each one lands on the
 * officers' post-check list, which is where they are cleared.
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
const flat = (s) => String(s).replace(/\s+/g, " ");

const TYPES = {
  NIDA: {
    label: "NIDA",
    // Digits 1-8 are the registered date of birth (1990-01-01): the NIDA's own date agrees with the account.
    good: () => "19900101" + String(Date.now()).slice(-9) + "123",
    // 🔴 TWENTY DIGITS, AND STILL NOT A NIDA — month 31 does not exist.
    //
    // ⛔ The first run used "12345", and all three server-side assertions failed for a
    // reason that was the PRODUCT BEING RIGHT: NIDA is the one document with a PUBLISHED
    // rule, so its field carries a 20-digit `pattern` and the BROWSER refuses a five-digit
    // value before the form ever posts. There is then no server refusal to read and no URL
    // to round-trip. (That is also exactly why the licence and voter card carry NO pattern:
    // a browser-enforced rule nobody published would be a lockout wearing a tooltip.)
    //
    // ⭐ So the bad value has to clear the browser and fail the SERVER — which makes this a
    // far better probe than the old one: it proves the calendar-date check on production.
    bad: "19993101456712345678",
    badWhy: "twenty digits, but month 31 — the first eight are a date",
    expiry: null,
  },
  PASSPORT: {
    label: "Passport",
    good: () => "AB" + String(Date.now()).slice(-7),
    bad: "!!",
    badWhy: "punctuation, and below the sanity floor",
    expiry: "2032-06-30",
  },
  DRIVER_LICENSE: {
    label: "Driving licence",
    good: () => "DL" + String(Date.now()).slice(-7),
    bad: "A",
    badWhy: "one character — below the sanity floor",
    expiry: "2031-06-30",
  },
  VOTER_CARD: {
    label: "Voter's card",
    good: () => "VC" + String(Date.now()).slice(-7),
    bad: "#",
    badWhy: "a symbol — no document number is punctuation",
    expiry: null,
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
  // 'div:has(#dob)' — that reached the phone field. ⭐ From 2026-10-10 this IS the identity's date of birth.
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

/**
 * Fill the typed identity form for `type` and press it ONCE. Returns the outcome the action states in the URL
 * (`verified` · `sent` · the refusal `reason`) and the page body after.
 * ⚠️ WAIT FOR THE OUTCOME IN THE URL, never a fixed delay: a wait names what it waits FOR.
 */
async function verifyIdentity(page, type, number, { withExpiry = true } = {}) {
  const spec = TYPES[type];
  if (type !== "NIDA" && new URL(page.url()).searchParams.get("idType") !== type) {
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
  await Promise.all([
    page.waitForURL((u) => u.searchParams.has("verified") || u.searchParams.has("sent") || u.searchParams.has("reason"), { timeout: 30000 }).catch(() => {}),
    page.locator('form:has(#idNumber) button[type="submit"]').first().click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  const q = new URL(page.url()).searchParams;
  return { verified: q.get("verified") === "1", sent: q.get("sent") === "1", reason: q.get("reason"), body: await page.locator("body").innerText() };
}

const browser = await chromium.launch();
const results = [];
try {
  for (const type of Object.keys(TYPES)) {
    if (ONLY && ONLY !== type) continue;
    const spec = TYPES[type];
    console.log("");
    console.log(`═══ ${type} ═══════════════════════════════════════════`);
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
    const bad = await verifyIdentity(page, type, spec.bad);
    ok(`3 · a bad ${type} value (${spec.badWhy}) is REFUSED`, !bad.verified && !bad.sent && !!bad.reason,
       flat(bad.body).slice(0, 140));
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
    ok(`3 · …and it NAMES ${type}'s OWN rule rather than saying "invalid"`, alerts.some((t) => RULE.test(t)),
       JSON.stringify(alerts).slice(0, 300));
    // ⭐ And the URL carried the type back, so the form round-tripped to the SAME document.
    ok("3 · …and the refusal round-trips the chosen document in the URL",
       new URL(page.url()).searchParams.get("idType") === type, page.url().slice(0, 120));
    await page.screenshot({ path: `${SHOT}/${type}-02-bad-value-393.png`, fullPage: true });

    // ── 4 · ⛔ no attachment is asked for (2026-10-10) ─────────────────────
    ok(`4 · ⛔ the ${type} form asks for NO attachment — no file input on the page`, (await page.locator('input[type="file"]').count()) === 0);

    // ── 5 · the good value, ONE press, verified at once ───────────────────
    const number = spec.good();
    await page.goto(`${BASE}/profile/kyc?idType=${type}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const good = await verifyIdentity(page, type, number);
    ok(`5 · a good ${type} value is VERIFIED AT ONCE by one press`, good.verified,
       good.verified ? number : good.sent ? "sent to an officer (sent=1) — something on this fresh account routes" : `${good.reason ?? ""} ${flat(good.body).slice(0, 200)}`);
    ok("5 · …the page says the identity is verified", /identity is verified|ID verified|umethibitishwa|已验证/i.test(good.body), flat(good.body).slice(0, 160));
    ok("5 · ⛔ …and still no file input after the press", (await page.locator('input[type="file"]').count()) === 0);
    await page.screenshot({ path: `${SHOT}/${type}-03-verified-393.png`, fullPage: true });
    if (!good.verified) { await ctx.close(); results.push({ type, number, ok: false }); continue; }
    note(`${type} · verified automatically — on the officers' post-check list until an officer marks it checked`);

    // ── 6 · 🔴 A SECOND ACCOUNT, THE SAME DOCUMENT ────────────────────────
    const ctx2 = await browser.newContext({ ...devices["Pixel 7"] });
    await ctx2.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const page2 = await ctx2.newPage();
    const who2 = await register(page2, `${type.toLowerCase()}dup`);
    await page2.goto(`${BASE}/profile/kyc?idType=${type}`, { waitUntil: "domcontentloaded" });
    await page2.waitForTimeout(1200);
    const dup = await verifyIdentity(page2, type, number);
    const dupRefused = !dup.verified && /already linked to another account|tayari imeunganishwa|已与其他账户绑定/i.test(dup.body);
    ok("6 · 🔴 a SECOND account submitting the SAME document is REFUSED (never verified)", dupRefused,
       flat(dup.body).slice(0, 220));
    await page2.screenshot({ path: `${SHOT}/${type}-05-duplicate-refused-393.png`, fullPage: true });
    await ctx2.close();

    results.push({ type, number, phone: who.phone, phone2: who2.phone, ok: true });
    await ctx.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${SHOT}/seal-results.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, notes }, null, 2));
console.log("");
console.log("─".repeat(64));
console.log(`  SEAL: ${pass} passed, ${failures.length} failed · shots in ${SHOT}`);
console.log(`  identities: ${results.map((r) => `${r.type}=${r.number}`).join(" · ")}`);
console.log("─".repeat(64));
if (failures.length) { console.log(""); console.log("FAILURES:"); failures.forEach((f) => console.log("  ✗ " + f)); }
process.exit(failures.length ? 1 : 0);
