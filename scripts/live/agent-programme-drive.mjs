/**
 * qa:agent-drive — the agent programme driven as FIVE PEOPLE through the real screens.
 *
 * Runs against a local `next dev` on :3210 with the in-memory DAL (no DATABASE_URL), the
 * console SMS provider (OTPs are read back from the server log) and
 * `ADMIN_BOOTSTRAP_PHONES` unused — the officer is minted by the dev-only seed-admin route and
 * then enrols 2FA THROUGH THE REAL SETUP PAGE, computing TOTP codes from the secret the page
 * shows, so the step-up gate on `/admin/agents` is crossed the way an officer crosses it.
 *
 *   1 · Officer   — seed → /admin/agents → 2FA enrolment → step-up → console renders (3 tabs)
 *   2 · Applicant — demo player (KYC approved) → /agent → wizard: 7 documents, referees, fee,
 *                   terms → submit → /agent/status
 *   3 · Officer   — queue → workstation → every document through the gated route → reconcile →
 *                   approve at the default rate → roster
 *   4 · Agent     — /agent CTA → dashboard (code · link · QR) · /agent/status redirects ·
 *                   register page shows the Verified badge for the code · a recruit registers
 *                   through the link (OTP) and appears on the roster
 *   5 · Invitee   — officer issues an invitation → link → create account (OTP) → "Text me a
 *                   code" (OTP) → accept → application opens; officer's Approve names why it
 *                   cannot fire yet
 *   6 · Player    — an ordinary signed-in player finds no invite / bonus solicitation
 *
 * ⛔ Every assertion is against RENDERED TEXT OR GEOMETRY, never against a status code alone.
 * A page that 200s with an empty body fails the CONTROL assertions.
 *
 * Usage: BASE=http://localhost:3210 SERVER_LOG=<path to the dev server log> node scripts/live/agent-programme-drive.mjs
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const LOG = process.env.SERVER_LOG ?? "";
if (!LOG) { console.error("⛔ SERVER_LOG=<path to the dev server log> is required — OTPs and invitation texts are read from it."); process.exit(2); }
const OUT = process.env.OUT ?? "shots/agent-drive";
const HOST = new URL(BASE).hostname;
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
const ok = (label, cond, extra) => { if (cond) { pass++; console.log(`  ok    ${label}`); } else { fail++; failures.push(`${label}${extra ? " — " + extra : ""}`); console.log(`  FAIL  ${label}${extra ? " — " + String(extra).slice(0, 300) : ""}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }).catch(() => {});

// A real 1×1 PNG — the validator sniffs the bytes.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const png = (name) => ({ name, mimeType: "image/png", buffer: PNG });

/** The last OTP the console SMS provider printed for a phone — read from the server log. */
function otpFor(phone) {
  if (!LOG) throw new Error("SERVER_LOG is required to read OTPs");
  const log = readFileSync(LOG, "utf8");
  const re = new RegExp(`\\[SMS → ${phone.replace(/\+/g, "\\+")}\\]\\s*\\n\\s*([^\\n]+)`, "g");
  let last = null, m;
  while ((m = re.exec(log))) last = m[1];
  const code = last?.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`no OTP in the server log for ${phone}`);
  return code;
}
function lastSmsFor(phone) {
  const log = readFileSync(LOG, "utf8");
  const re = new RegExp(`\\[SMS → ${phone.replace(/\+/g, "\\+")}\\]\\s*\\n\\s*([^\\n]+)`, "g");
  let last = null, m;
  while ((m = re.exec(log))) last = m[1];
  return last;
}

/** RFC 6238 — six digits, 30-second step, SHA-1 — from the base32 secret the setup page shows. */
function totp(secretB32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secretB32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", bytes).update(counter).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % 1_000_000;
  return String(code).padStart(6, "0");
}

async function cookiesFromResponse(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => { const [pair] = c.split(";"); const i = pair.indexOf("="); return { name: pair.slice(0, i), value: pair.slice(i + 1), domain: HOST, path: "/" }; });
}
/** The officer's TOTP secret once enrolled — the step-up interstitial can appear on ANY admin
 *  navigation (it renders in place of the page, same URL), so every goto answers it. */
let officerSecret = "";
async function stepUpIfAsked(page) {
  if (!officerSecret) return;
  const asked = await page.locator('input[inputmode="numeric"]').locator("visible=true").count();
  if (!asked) return;
  const body = await page.locator("body").innerText().catch(() => "");
  if (!/6-digit code|nambari sita/i.test(body)) return;
  await page.locator('input[inputmode="numeric"]').locator("visible=true").first().fill(totp(officerSecret));
  await page.getByRole("button").filter({ hasText: /verify|confirm|continue|sign|thibitisha/i }).locator("visible=true").first().click();
  await page.waitForFunction(() => !/Enter your 6-digit code/i.test(document.body.innerText), null, { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}
async function goto(page, path) {
  // "load", not domcontentloaded — a streamed RSC document keeps its response open until the last
  // chunk, so load is the honest "the page is all here"; domcontentloaded fires on the shell alone.
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
  // ⛔ A streamed page has a <main> before it has CONTENT — the loading skeleton carries no text,
  // so an assertion taken at domcontentloaded reads the admin chrome and nothing else. Wait for
  // the main region to carry real text (or a sign-in form) before anyone asserts on it.
  // …and for the loading skeleton to have LEFT — the admin shell alone carries more than 120 characters.
  await page.waitForFunction(() => { const m = document.querySelector("main"); if (!m) return false; if (m.querySelector(".kp-shimmer-track")) return false; return (m.innerText || "").trim().length > 120; }, null, { timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(400);
  await stepUpIfAsked(page);
}
// One run, one set of phones — the memory DAL keeps state for the life of the server.
const RUN = String(Date.now()).slice(-4);
const PHONE_RECRUIT = `7190${RUN}1`.slice(0, 9), PHONE_INVITEE = `7190${RUN}2`.slice(0, 9), PHONE_PLAYER = `7190${RUN}3`.slice(0, 9);
async function clickButton(page, name, opts = {}) {
  const b = page.getByRole("button", { name }).locator("visible=true").first();
  await b.waitFor({ state: "visible", timeout: opts.timeout ?? 30_000 });
  await b.click();
}
async function waitText(page, re, timeout = 60_000) {
  await page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re.source, { timeout });
}
/** Attach the PNG to every EMPTY file input on the current step and wait for the "Attached" count to rise. */
async function attachAll(page, expected) {
  const inputs = page.locator('input[type="file"]');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) await inputs.nth(i).setInputFiles(png(`doc-${i}.png`));
  await page.waitForFunction((want) => (document.body.innerText.match(/\bAttached\b/g) ?? []).length >= want, expected, { timeout: 120_000 });
  return n;
}
async function register(page, { phone9, email, next, ref }) {
  const q = new URLSearchParams(); if (next) q.set("next", next); if (ref) q.set("ref", ref);
  await goto(page, `/auth/register${q.toString() ? `?${q}` : ""}`);
  await page.fill("#phone", phone9);
  await page.fill("#email", email);
  await page.fill('input[name="password"]', "Drive2026!pass");
  await page.fill('input[name="passwordConfirm"]', "Drive2026!pass");
  // The date of birth is three segment inputs that write a hidden `dob` — fill the segments.
  const segs = page.locator('form input[type="text"]:not([name])');
  await segs.nth(1).fill("05"); await segs.nth(2).fill("05"); await segs.nth(3).fill("1995");
  for (const n of ["acceptAge", "acceptTerms"]) { const c = page.locator(`input[name="${n}"]`); if (!(await c.isChecked())) await c.check({ force: true }); }
  await page.locator('form button[type="submit"]').first().click();
  // Registration lands on /profile/kyc?welcome=new (the OTP-driven register flow is legacy and
  // only re-enabled with a live SMS provider) — accept either landing and answer the OTP if asked.
  await page.waitForURL((u) => !/\/auth\/register/i.test(u.toString()), { timeout: 120_000 });
  if (/\/auth\/otp/i.test(page.url())) {
    await sleep(800);
    const code = otpFor(`+255${phone9}`);
    await page.fill("#code", code);
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForURL((u) => !/\/auth\/otp/i.test(u.toString()), { timeout: 120_000 });
  }
  await sleep(500);
}

const browser = await chromium.launch();
console.log(`\nagent-programme-drive — ${BASE}\n`);

// ═══════════════════════ 1 · OFFICER — seed, 2FA enrolment, step-up, console ═══════════════════════
const officerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const officer = await officerCtx.newPage();
{
  const res = await fetch(`${BASE}/api/dev-test/seed-admin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "+255700000009", password: "Admin2026!", name: "Officer Zuri" }) });
  ok("1.seed · the dev-only seed-admin route minted the officer", res.ok, String(res.status));
  await officerCtx.addCookies(await cookiesFromResponse(res));
  await goto(officer, "/admin/agents");
  await officer.waitForURL(/\/admin\/(2fa\/setup|totp-verify|agents)/, { timeout: 180_000 });
  await officer.waitForLoadState("networkidle").catch(() => {});
  // ⛔ The step-up is ENFORCED unless DISABLE_ADMIN_TOTP=true — a drive that found the console
  // without it would be measuring a disabled gate. Say which world we are in.
  const enforced = process.env.DISABLE_ADMIN_TOTP !== "true";
  if (enforced && /\/admin\/totp-verify/i.test(officer.url())) {
    console.log("\n⛔ The officer is ALREADY enrolled in 2FA — this is a warm server carrying an earlier run's memory DAL.");
    console.log("   The drive needs a FRESH dev server (the in-memory DAL resets on restart). Restart `next dev -p 3210` and re-run.");
    console.log("   Not a product failure — a precondition failure. Exiting 2.");
    await browser.close(); process.exit(2);
  }
  ok("1.stepup · an un-enrolled officer is sent to 2FA setup before the agent console", !enforced || /\/admin\/2fa\/setup/i.test(officer.url()), officer.url());
  let secret = "";
  if (/\/admin\/2fa\/setup/i.test(officer.url())) {
    await clickButton(officer, /Provision authenticator/i);
    await waitText(officer, /secret manually/i);
    const secretText = await officer.locator("span.font-mono").filter({ hasText: /^[A-Z2-7 ]{16,}$/ }).first().innerText();
    secret = secretText.replace(/\s+/g, "");
    officerSecret = secret;
    ok("1.secret · the setup page shows a base32 secret", secret.length >= 16, secret.length);
    await officer.locator('input[placeholder="123 456"]').locator("visible=true").first().fill(totp(secret));
    await clickButton(officer, /Verify and enable/i);
    await officer.waitForLoadState("networkidle").catch(() => {});
    await sleep(1500);
    await shot(officer, "1_2fa-enrolled");
    await goto(officer, "/admin/agents");
    await officer.waitForURL(/\/admin\/(totp-verify|agents)/, { timeout: 180_000 });
  }
  if (/\/admin\/totp-verify/i.test(officer.url())) {
    ok("1.verify · after enrolment the console asks for a fresh code (step-up)", true);
    await officer.locator('input[placeholder="123 456"]').first().fill(totp(secret));
    await officer.getByRole("button", { name: /verify|confirm|continue/i }).first().click();
    await officer.waitForURL(/\/admin\/agents/, { timeout: 180_000 });
    await officer.waitForLoadState("networkidle").catch(() => {});
  }
  ok("1.console · /admin/agents renders after step-up", /\/admin\/agents/.test(officer.url()), officer.url());
  const t = await text(officer);
  ok("1.head · the page head reads Agents · Mawakala", /Agents/.test(t) && /Mawakala/i.test(t));
  ok("1.tabs · Applications · Agents · Settings", /Applications/.test(t) && /Settings/.test(t));
  // The KPI label is painted uppercase by CSS and innerText carries the transform — compare case-blind.
  ok("1.kpi · the four KPIs are on screen", /Awaiting review/i.test(t) && /Active agents/i.test(t) && /Commission payable/i.test(t) && /Refunds owed/i.test(t), t.slice(0, 200));
  ok("1.empty · the queue says so, in words", /Nothing to review/.test(t));
  ok("1.invite · the invitation composer is on the Applications tab", /Invitations/.test(t) && (await officer.locator('input[name="phone"]').count()) > 0);
  await shot(officer, "1_admin-agents-applications-1280");
  await goto(officer, "/admin/agents?tab=settings");
  const ts = await text(officer);
  ok("1.settings · Programme settings + In force now", /Programme settings/.test(ts) && /In force now/.test(ts) && /TZS\s?100,000/i.test(ts) && /20% default/i.test(ts) && /40% ceiling/.test(ts), ts.slice(0, 200));
  await shot(officer, "1_admin-agents-settings-1280");
  await goto(officer, "/admin/agents?tab=agents");
  ok("1.roster · the empty roster says so", /No approved agents/.test(await text(officer)));
  for (const w of [768, 360]) { await officer.setViewportSize({ width: w, height: 900 }); await goto(officer, "/admin/agents"); await shot(officer, `1_admin-agents-${w}`); ok(`1.overflow@${w} · no horizontal overflow on the console`, (await officer.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1); }
  await officer.setViewportSize({ width: 1280, height: 900 });
}

// ═══════════════════════ 2 · APPLICANT — demo player, the wizard ═══════════════════════
const applicantCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const applicant = await applicantCtx.newPage();
{
  await goto(applicant, "/auth/demo?kyc=approved");
  await goto(applicant, "/agent");
  const t = await text(applicant);
  ok("2.public · /agent explains the programme with the fee and the rate", /TZS\s?100,000/i.test(t) && /20%/i.test(t), t.slice(0, 200));
  ok("2.cta · a verified player sees Apply now", /Apply now/.test(t));
  ok("2.footer · the footer carries the agent link", (await applicant.locator('footer a[href="/agent"]').count()) > 0);
  await shot(applicant, "2_agent-public-1280");
  await clickButton(applicant, /Apply now/);
  await applicant.waitForURL(/\/agent\/apply/, { timeout: 120_000 });
  await sleep(800);
  ok("2.wizard · the wizard opens on About you", /About you/i.test(await text(applicant)));
  const n0 = await attachAll(applicant, 2);
  ok("2.step0 · two documents attached on step 1", n0 >= 2);
  await shot(applicant, "2_apply-step1");
  await clickButton(applicant, /^(Continue|Next|Endelea)$/i);
  await attachAll(applicant, 1);
  await clickButton(applicant, /^(Continue|Next|Endelea)$/i);
  // Referees — two names, two contacts, four documents, the consent, Save.
  const textInputs = applicant.locator('main input[type="text"], main input:not([type])').locator("visible=true");
  ok("2.referees · four text fields on the referees step", (await textInputs.count()) >= 4, await textInputs.count());
  await textInputs.nth(0).fill("Amina Juma");
  await textInputs.nth(1).fill("+255711000001");
  await textInputs.nth(2).fill("Baraka Kessy");
  await textInputs.nth(3).fill("+255711000002");
  await attachAll(applicant, 4);
  await applicant.getByText(/Both referees know/).click();
  await clickButton(applicant, /^Save/i);
  await waitText(applicant, /saved|imehifadhiwa|已保存/i, 60_000).catch(() => {});
  await shot(applicant, "2_apply-referees");
  await clickButton(applicant, /^(Continue|Next|Endelea)$/i);
  // Payment — receipt first, then the reference.
  await attachAll(applicant, 1);
  await applicant.locator('input[placeholder="As printed on the receipt"]').fill("RCPT-DRIVE-001");
  await clickButton(applicant, /^Save/i);
  await sleep(1200);
  await applicant.getByText(/I accept the agent terms/).click();
  await shot(applicant, "2_apply-payment");
  await clickButton(applicant, /Submit for approval/);
  await waitText(applicant, /Application submitted|Awaiting/i, 120_000);
  ok("2.submitted · the application is submitted", /Application submitted|Awaiting/i.test(await text(applicant)));
  await goto(applicant, "/agent/status");
  const st = await text(applicant);
  ok("2.status · /agent/status shows Awaiting Compliance Approval with the SLA", /Awaiting/i.test(st) && /within \d+ days/i.test(st), st.slice(0, 300));
  await shot(applicant, "2_agent-status");
  await goto(applicant, "/agent");
  ok("2.cta2 · /agent now offers View your application", /View your application/.test(await text(applicant)));
}

// ═══════════════════════ 3 · OFFICER — review, documents, reconcile, approve ═══════════════════════
{
  await goto(officer, "/admin/agents");
  const t = await text(officer);
  ok("3.queue · the queue shows the applicant, oldest first", /Demo Player/i.test(t) && !/Nothing to review/.test(t));
  ok("3.kpi · Awaiting review reads 1", /Awaiting review\s*1\b/.test(t) || /1\s*queue|within/.test(t));
  await officer.getByRole("link", { name: /Review/ }).first().click();
  await officer.waitForURL(/\/admin\/agents\/agp_/, { timeout: 120_000 });
  await sleep(800);
  const w = await text(officer);
  ok("3.workstation · the workstation renders the applicant, documents and the fee", /Documents/i.test(w) && /Registration fee/i.test(w) && /TZS\s?100,000/i.test(w));
  ok("3.blocks · the rail names why Approve cannot fire yet", /neither reconciled nor waived/i.test(w), w.slice(0, 200));
  await shot(officer, "3_workstation-before");
  // Every document through the gated route.
  const tiles = officer.locator("main button:has-text('Supplied by applicant')");
  const tileCount = await tiles.count();
  ok("3.tiles · eight documents supplied by the applicant", tileCount === 8, tileCount);
  let loaded = 0;
  for (let i = 0; i < tileCount; i++) {
    await tiles.nth(i).click();
    const img = officer.locator('[role="dialog"] img').first();
    await img.waitFor({ state: "visible", timeout: 30_000 });
    const nat = await img.evaluate((el) => new Promise((r) => { if (el.complete) r(el.naturalWidth); else { el.onload = () => r(el.naturalWidth); el.onerror = () => r(0); } }));
    if (nat > 0) loaded++;
    await officer.keyboard.press("Escape");
    await sleep(200);
  }
  // ⛔ NOT vacuous: zero tiles must fail here too, or an empty grid reads as "every image loaded".
  ok("3.gated · every document image loads through /api/admin/agent-doc", tileCount === 8 && loaded === 8, `${loaded}/${tileCount}`);
  // Reconcile.
  // The attestation is typed, never pre-filled — the officer reads the receipt.
  await officer.locator('input[name="attestedTzs"]').fill("100000");
  await officer.locator('input[name="statementRef"]').fill("STMT-DRIVE-1");
  await officer.locator('input[name="sourceAccount"]').fill("07•• ••• 877");
  await clickButton(officer, /Reconcile/i);
  // The overlay reports the outcome; the page is then RE-LOADED rather than trusting a refresh.
  await waitText(officer, /Fee reconciled|Not applied|Server error/i, 90_000);
  const reconcileSaid = (await text(officer)).match(/(Fee reconciled[^.]*.|Not applied[^.]*.[^.]*.?|Server error[^.]*.)/i)?.[0] ?? "(no overlay text)";
  await officer.keyboard.press("Escape").catch(() => {});
  const wsUrl = new URL(officer.url()).pathname;
  await goto(officer, wsUrl);
  await waitText(officer, /Collected/i, 60_000).catch(() => {});
  const reconciledText = await text(officer);
  // ⛔ When this fails, say what the page WAS — a regex with a literal 0x08 in it once cost two runs here.
  if (!/Collected/i.test(reconciledText)) { await shot(officer, "3_reconcile-FAIL"); console.log(`      url=${officer.url()}\n      body=${reconciledText.slice(0, 700)}`); }
  ok("3.reconciled · the fee is reconciled (chip reads Collected after reload)", /Collected/i.test(reconciledText), reconcileSaid);
  // Approve at the default rate.
  await clickButton(officer, /^Approve$/);
  // ConfirmDialog is an alertdialog (irreversible tier) — match either role.
  await officer.locator('[role="dialog"], [role="alertdialog"]').getByRole("button", { name: /^Approve$/ }).locator("visible=true").first().click();
  await waitText(officer, /Agent approved|Not applied|Server error/i, 90_000);
  const approveSaid = (await text(officer)).match(/(Agent approved[^.]*.|Not applied[^.]*.[^.]*.?|Server error[^.]*.)/i)?.[0] ?? "(no overlay text)";
  ok("3.approve.overlay · the overlay reports the approval", /Agent approved/i.test(approveSaid), approveSaid);
  await officer.keyboard.press("Escape").catch(() => {});
  await goto(officer, wsUrl);
  const after = await text(officer);
  const code = after.match(/50PICK-AG-[A-Z2-9]{6}/)?.[0] ?? null;
  ok("3.approved · the workstation shows the minted code", !!code, after.slice(0, 200));
  await shot(officer, "3_workstation-approved");
  await goto(officer, "/admin/agents?tab=agents");
  const r = await text(officer);
  ok("3.roster · the roster lists the new agent with the code and controls", !!code && r.includes(code) && /Rate · standing/i.test(r), r.slice(0, 300));
  await shot(officer, "3_roster");
  globalThis.__code = code;
}

// ═══════════════════════ 4 · AGENT — dashboard, badge, a recruit ═══════════════════════
{
  const code = globalThis.__code;
  // ⭐ Approval REVOKES the new agent's sessions on purpose (the role rides in the signed
  // cookie), so the applicant signs in again — the demo route issues a fresh session.
  await goto(applicant, "/auth/demo?kyc=approved");
  await goto(applicant, "/agent");
  ok("4.cta · /agent offers the dashboard to the approved agent", /Open your agent dashboard/.test(await text(applicant)));
  await goto(applicant, "/profile/invite");
  const d = await text(applicant);
  ok("4.dashboard · the dashboard shows the code, the rate and the cash destination", !!code && d.includes(code) && /20%/i.test(d), d.slice(0, 300));
  ok("4.qr · a QR is rendered", (await applicant.locator("main svg, main img").count()) > 0);
  ok("4.link · the share link carries the code", (await applicant.locator(`main :text("${code}")`).count()) > 0);
  await shot(applicant, "4_dashboard-1280");
  await applicant.setViewportSize({ width: 360, height: 900 }); await goto(applicant, "/profile/invite"); await shot(applicant, "4_dashboard-360");
  ok("4.overflow@360 · the dashboard does not overflow", (await applicant.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await applicant.setViewportSize({ width: 1280, height: 900 });
  await goto(applicant, "/agent/status");
  ok("4.redirect · /agent/status sends an approved agent to the dashboard", /\/profile\/invite/.test(applicant.url()), applicant.url());

  // The badge on the register page, signed OUT.
  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestCtx.newPage();
  await goto(guest, `/auth/register?ref=${encodeURIComponent(code)}`);
  ok("4.badge · the register page shows Verified 50pick Agent for the code", /Verified 50pick Agent/i.test(await text(guest)));
  await shot(guest, "4_register-badge-390");
  // …and the recruit registers through it.
  await register(guest, { phone9: PHONE_RECRUIT, email: "recruit.drive@50pick.test", next: null, ref: code });
  ok("4.recruit · the recruit is registered and signed in (past the auth screens)", !/\/auth\//.test(guest.url()), guest.url());
  await goto(officer, "/admin/agents?tab=agents");
  const r = await text(officer);
  ok("4.rosterRecruit · the roster counts the recruit", new RegExp(`${code}[\\s\\S]{0,200}\\b1\\b`).test(r), r.slice(0, 300));
  await guestCtx.close();
}

// ═══════════════════════ 5 · INVITEE — invitation, OTP, acceptance ═══════════════════════
{
  await goto(officer, "/admin/agents");
  await officer.locator('input[name="phone"]').fill(`+255${PHONE_INVITEE}`);
  await officer.locator('input[name="displayName"]').fill("Neema Invitee");
  await clickButton(officer, /^Invite$/);
  await waitText(officer, /Invitation issued/i, 60_000);
  const t = await text(officer);
  const link = t.match(/https?:\/\/\S+\/agent\/invite\/\S+/)?.[0]?.replace(/[).,]+$/, "");
  ok("5.issued · the invitation is issued and the link shown once", !!link, t.slice(0, 200));
  ok("5.sms · the link was texted to the invited number", (lastSmsFor(`+255${PHONE_INVITEE}`) ?? "").includes("/agent/invite/"));
  ok("5.table · the invitations table lists it as Issued with a Withdraw control", /Issued/i.test(t) && /Withdraw/i.test(t));
  await shot(officer, "5_invitation-issued");

  const inviteeCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const invitee = await inviteeCtx.newPage();
  const path = new URL(link).pathname;
  await goto(invitee, path);
  const p = await text(invitee);
  ok("5.landing · the invitation page reads the invitation and offers sign in / create account", /invited to become a Verified 50pick Agent/i.test(p) && /Create account|Sign in/i.test(p), p.slice(0, 200));
  await shot(invitee, "5_invite-landing-390");
  await register(invitee, { phone9: PHONE_INVITEE, email: "neema.drive@50pick.test", next: path });
  if (!invitee.url().includes("/agent/invite/")) await goto(invitee, path);
  await clickButton(invitee, /Text me a code/i);
  await waitText(invitee, /Enter the 6-digit code/i, 60_000);
  await sleep(500);
  const otp = otpFor(`+255${PHONE_INVITEE}`);
  await invitee.locator('input[inputmode="numeric"]').first().fill(otp);
  await clickButton(invitee, /Accept and continue/i);
  await waitText(invitee, /Invitation accepted|About you|Continue your application/i, 120_000);
  ok("5.accepted · the invitee accepted with the code delivered to THEIR phone", /Invitation accepted|About you|Continue your application/i.test(await text(invitee)));
  await shot(invitee, "5_invite-accepted-390");
  await goto(invitee, "/agent");
  ok("5.cta · /agent now offers Continue your application to the invitee", /Continue your application/.test(await text(invitee)));

  await goto(officer, "/admin/agents");
  const q = await text(officer);
  ok("5.progress · the officer sees the invitee In progress as a draft, and the invitation Accepted", /Neema/i.test(q) && /Accepted/i.test(q), q.slice(0, 300));
  await officer.getByRole("row", { name: /Neema/ }).getByRole("link", { name: /Open/ }).first().click().catch(async () => { await officer.locator('a:has-text("Open")').first().click(); });
  await officer.waitForURL(/\/admin\/agents\/agp_/, { timeout: 120_000 });
  await sleep(600);
  const w = await text(officer);
  ok("5.blocked · the rail names the reason Approve cannot fire (not submitted yet)", /Not submitted yet/i.test(w), w.slice(0, 200));
  ok("5.approveDisabled · the Approve control is disabled", await officer.getByRole("button", { name: /^Approve$/ }).first().isDisabled());
  await shot(officer, "5_workstation-invitee");
  await inviteeCtx.close();
}

// ═══════════════════════ 6 · ORDINARY PLAYER — nothing solicits ═══════════════════════
{
  const playerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerCtx.newPage();
  await register(player, { phone9: PHONE_PLAYER, email: "ordinary.drive@50pick.test", next: null });
  for (const route of ["/markets", "/profile", "/wallet"]) {
    await goto(player, route);
    const nav = await player.locator("nav, header").allInnerTexts().then((a) => a.join(" "));
    ok(`6.nav${route} · no Invite entry point in the chrome`, !/\binvite\b|\bearn\b/i.test(nav), nav.slice(0, 200));
  }
  await goto(player, "/profile/invite");
  const inv = await text(player);
  ok("6.invite · /profile/invite is the not-found view for a player (no code, no link)", !/50PICK-/i.test(inv) && !/Open your agent dashboard/.test(inv), inv.slice(0, 200));
  await goto(player, "/agent");
  const a = await text(player);
  ok("6.agent · /agent explains without soliciting: the CTA asks the player to verify identity first", /Verify your identity first/.test(a) && !/Apply now/.test(a), a.slice(0, 200));
  await playerCtx.close();
}

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
if (fail) { console.log("\nFAILURES:"); failures.forEach((f) => console.log("  · " + f)); }
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
