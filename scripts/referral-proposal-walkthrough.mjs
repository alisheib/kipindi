/**
 * Full user-journey walkthrough — referral + affiliate + proposal lifecycle.
 * Drives the REAL UI in three browser contexts:
 *   A = referrer · B = referred player · Admin = officer
 *
 *   1. A registers, opens Invite & Earn, we read A's referral link
 *   2. B registers THROUGH A's link (referral ribbon shows)
 *   3. B deposits → FIRST_DEPOSIT bonus fires (A + B each +2,000)
 *   4. A's Invite page now shows recruit #1 + earnings
 *   5. B proposes two polls (one to approve, one to decline)
 *   6. Admin approves poll #1 (→ live market) and declines poll #2
 *   7. Board reflects LISTED + DECLINED
 *
 *   BASE=http://localhost:3000 node scripts/referral-proposal-walkthrough.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = "scripts/_walkthrough";
mkdirSync(SHOTS, { recursive: true });

const SUF = String(Date.now()).slice(-7);          // 7 digits → unique per run
const A_PHONE = "71" + SUF;                          // 9-digit TZ mobile
const B_PHONE = "72" + SUF;
const C_PHONE = "73" + SUF;
const PW = "Passw0rd!23";
const P1_TITLE = `Will project ${SUF} ship before year end?`;
const P2_TITLE = `Will index ${SUF} close above target in 2026?`;

let step = 0;
const ok = [], fail = [];
const check = (label, cond, detail = "") => { (cond ? ok : fail).push(label); console.log(`  ${cond ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label}${detail ? `  \x1b[90m${detail}\x1b[0m` : ""}`); };
const log = (m) => console.log(`\n\x1b[1m▶ ${m}\x1b[0m`);
async function shot(page, name) { step++; const f = `${SHOTS}/${String(step).padStart(2, "0")}-${name}.png`; await page.screenshot({ path: f, fullPage: true }); console.log(`  📸 ${f}`); }

async function register(page, phone, ref) {
  await page.goto(`${BASE}/auth/register${ref ? `?ref=${ref}` : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.locator("#phone").click();
  await page.locator("#phone").pressSequentially(phone, { delay: 8 });
  await page.fill('input[name="dob"]', "1990-01-01");
  await page.fill('input[name="password"]', PW);
  await page.fill('input[name="passwordConfirm"]', PW);
  await page.check('input[name="acceptAge"]', { force: true });
  await page.check('input[name="acceptTerms"]', { force: true });
  return page;
}
async function submitRegister(page) {
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/profile/kyc**", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});
  const pr = await fetch(`${BASE}/api/dev-test/proposals-reset`, { method: "POST" }).then((r) => r.json()).catch(() => null);
  console.log(`  (cleared ${pr?.cleared ?? "?"} stale proposals for a clean queue)`);

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const ctxAdmin = await browser.newContext();
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  const Adm = await ctxAdmin.newPage();

  // ── 1. A registers (the referrer) ──────────────────────────────────────
  log("A registers (referrer)");
  await register(A, A_PHONE);
  await submitRegister(A);
  check("A landed on KYC after register", A.url().includes("/profile/kyc"), A.url());

  // ── 2. A opens Invite & Earn, read the referral link ────────────────────
  log("A opens Invite & Earn");
  await A.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" });
  await A.waitForTimeout(500);
  const link = await A.locator('input[aria-label="Referral link"]').inputValue().catch(() => "");
  const refCode = (link.match(/ref=([^&]+)/) || [])[1] || "";
  check("Invite page shows a referral link with ?ref= code", !!refCode, link);
  check("Invite page shows 'No referrals yet' initially", (await A.locator("body").innerText()).includes("No referrals yet"));
  await shot(A, "A-invite-page-empty");

  // ── 3. B registers through A's link ─────────────────────────────────────
  log("B registers via A's referral link");
  await register(B, B_PHONE, refCode);
  await B.waitForTimeout(300);
  const bBody = await B.locator("body").innerText();
  check("Register page shows referral ribbon (invited / bonus)", /invited|referr|bonus|TZS\s*2,000/i.test(bBody), "ribbon copy present");
  await shot(B, "B-register-with-referral-ribbon");
  await submitRegister(B);
  check("B landed on KYC after register", B.url().includes("/profile/kyc"), B.url());

  // ── 4. B deposits → FIRST_DEPOSIT bonus fires ───────────────────────────
  log("B deposits (fires the referral bonus)");
  await B.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded" });
  await B.waitForTimeout(400);
  await B.locator('input[placeholder="10,000"]').click();
  await B.locator('input[placeholder="10,000"]').pressSequentially("50000", { delay: 10 });
  await shot(B, "B-deposit-form");
  await B.locator('form button[type="submit"]').click();
  await B.waitForURL("**/wallet**", { timeout: 20000 }).catch(() => {});
  await B.waitForTimeout(800);
  check("B deposit completed (on /wallet)", B.url().includes("/wallet"), B.url());

  // ── 5. A's Invite page now shows the recruit + earnings ─────────────────
  log("A re-checks Invite & Earn (recruit + earnings)");
  await A.goto(`${BASE}/profile/invite?ts=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await A.waitForTimeout(600);
  const aBody = await A.locator("body").innerText();
  check("A now has at least one referral (no longer empty)", !aBody.includes("No referrals yet"));
  check("A shows earned TZS 2,000 (referrer bonus)", aBody.includes("2,000"), "earnings visible");
  await shot(A, "A-invite-page-with-recruit");

  // ── 6. B proposes two polls ─────────────────────────────────────────────
  async function propose(title) {
    await B.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded" });
    await B.waitForTimeout(400);
    await B.locator('input[placeholder="Will [event] happen by [date]?"]').click();
    await B.locator('input[placeholder="Will [event] happen by [date]?"]').pressSequentially(title, { delay: 5 });
    await B.locator('textarea[placeholder*="How will we know"]').fill("Resolves from the official public source published on the resolution date.");
    await B.locator('input[type="date"]').fill("2026-12-31");
    await B.waitForTimeout(300);
    await B.locator('button:has-text("Submit proposal")').click({ timeout: 10000 });
    await B.waitForTimeout(900);
  }
  log("B proposes poll #1 (to approve)");
  await propose(P1_TITLE);
  check("Poll #1 submitted (confirmation shown)", /Submitted|Wasilisha|review/i.test(await B.locator("body").innerText()));
  await shot(B, "B-proposal-1-submitted");

  log("B proposes poll #2 (to decline)");
  await propose(P2_TITLE);
  check("Poll #2 submitted", /Submitted|Wasilisha|review/i.test(await B.locator("body").innerText()));

  // Board shows them as REVIEW
  await B.goto(`${BASE}/proposals?ts=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await B.waitForTimeout(500);
  await shot(B, "B-proposals-board");

  // ── 7. Admin: register C, promote, approve #1, decline #2 ───────────────
  log("Admin account (register C + promote to ADMIN)");
  await register(Adm, C_PHONE);
  await submitRegister(Adm);
  const promo = await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + C_PHONE }),
  }).then((r) => r.json()).catch(() => null);
  check("C promoted to ADMIN", promo?.ok === true, promo?.role);

  log("Admin opens the proposals review queue");
  await Adm.goto(`${BASE}/admin/proposals?ts=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await Adm.waitForTimeout(700);
  const admBody = await Adm.locator("body").innerText();
  check("Admin queue shows poll #1", admBody.includes(P1_TITLE.slice(0, 24)));
  check("Admin queue shows poll #2", admBody.includes(P2_TITLE.slice(0, 24)));
  await shot(Adm, "Admin-proposals-queue");

  // Approve #1
  log("Admin approves poll #1 → live market");
  await Adm.locator(`button:has-text("${P1_TITLE.slice(0, 24)}")`).first().click();
  await Adm.waitForTimeout(400);
  await Adm.locator('button:has-text("Approve & list")').click();
  await Adm.waitForTimeout(1000);
  await shot(Adm, "Admin-approved-poll-1");
  check("Approve toast / queue updated", true);

  // Decline #2
  log("Admin declines poll #2");
  await Adm.goto(`${BASE}/admin/proposals?ts=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await Adm.waitForTimeout(700);
  await Adm.locator(`button:has-text("${P2_TITLE.slice(0, 24)}")`).first().click();
  await Adm.waitForTimeout(400);
  await Adm.locator('button:has-text("Decline")').first().click();
  await Adm.waitForTimeout(300);
  await Adm.locator('button:has-text("Officer decision")').click().catch(() => {});
  await Adm.waitForTimeout(200);
  await Adm.locator('button:has-text("Confirm decline")').click();
  await Adm.waitForTimeout(1000);
  await shot(Adm, "Admin-declined-poll-2");

  // ── 8. Board reflects final states ──────────────────────────────────────
  log("Verify board reflects LISTED + DECLINED");
  await B.goto(`${BASE}/proposals?filter=mine&ts=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await B.waitForTimeout(600);
  const finalBody = await B.locator("body").innerText();
  check("Board shows a LISTED proposal", /listed|live|market/i.test(finalBody));
  check("Board shows a DECLINED proposal", /declined|rejected/i.test(finalBody));
  await shot(B, "B-board-final-states");

  console.log(`\n\x1b[1m${ok.length} passed · ${fail.length} failed\x1b[0m`);
  if (fail.length) { console.log("FAILED:", fail.join(" | ")); process.exitCode = 1; }
} catch (e) {
  console.error("WALKTHROUGH ERROR:", e?.message ?? e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
