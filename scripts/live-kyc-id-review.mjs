/**
 * §7 step 7 — THE OFFICER, on production, for each of the four documents: the POST-CHECK.
 *
 * ⭐ SINCE 2026-10-10 (owner ruling, Ali — players verify with typed details and are approved AT ONCE when the
 * automatic checks pass; officers check those approvals afterwards; agents keep photos and an officer), the identities
 * `live-kyc-id-seal.mjs` verifies are AUTOMATIC approvals on the officers' post-check list. A reviewer opens each one
 * on the workstation, sees a TYPED case with the TYPE-CORRECT fields — an expiry for a passport, none for a voter's
 * card, the "no published format" sentence for the two documents that have none — and NO image (there is none), makes
 * the four typed attestations, and marks it checked. Until that day this driver approved a photo case on its images.
 *
 * ⚠️ TOTP. `/api/health` reports `security.adminTotp: "DISABLED"` on production, so the
 * COMPLIANCE persona reaches the workstation without a step-up secret. If that flips, this
 * driver stops at the 2FA wall and says so rather than reporting a product failure.
 *
 * ⛔ IT MOVES NO MONEY. Marking an automatic approval checked changes nothing for the player; nothing is deposited,
 * staked or paid.
 *
 *   USERS=usr_a,usr_b BASE=https://www.50pick.tz node scripts/live-kyc-id-review.mjs
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { PERSONA, qaEnv } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
const SHOT = process.env.SHOT_DIR || ".qa-kyc-id";
const USERS = (process.env.USERS || "").split(",").map((s) => s.trim()).filter(Boolean);
const NL = String.fromCharCode(10);
mkdirSync(SHOT, { recursive: true });
if (!USERS.length) { console.error("USERS=<userId,userId,…> is required"); process.exit(2); }

let pass = 0;
const failures = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(`${l}${x ? ` — ${x}` : ""}`); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
  return c;
};
const flat = (s) => String(s).replace(/\s+/g, " ");

/**
 * The value rendered under a field label — the first non-empty line after it.
 * ⚠️ CASE-INSENSITIVE, AND THE HARNESS ALREADY WARNED ABOUT THIS. Chrome applies `text-transform: uppercase` to the
 * field labels, so `innerText` returns "DOCUMENT TYPE" while the source says "Document type" — the same trap
 * `scripts/live/harness.mjs` documents. The first run of this driver reported FOUR failures against a perfect page.
 */
function valueAfter(body, label) {
  const lines = String(body).split(NL).map((l) => l.trim());
  const i = lines.findIndex((l) => label.test(l));
  return i >= 0 ? (lines.slice(i + 1).find((l) => l.length > 0) ?? "") : "";
}

const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();

  // ── sign in as the COMPLIANCE officer ────────────────────────────────────
  const who = PERSONA.officer;
  await p.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle" });
  const field = (await p.locator("#phone").count()) ? "#phone" : "#identifier";
  await p.fill(field, who.phone);
  const mirror = await p.locator(`input[name="${field.slice(1)}"]`).inputValue().catch(() => "");
  if (mirror !== who.phone) throw new Error(`PhoneInput did not sync (${mirror}) — filled before hydration`);
  await p.fill('input[type="password"]', qaEnv(who.secret));
  await p.locator('button[type="submit"]').last().click();
  await p.waitForTimeout(4000);
  const signedIn = !/\/auth\//.test(p.url());
  ok("officer signed in", signedIn, p.url());
  if (!signedIn) throw new Error("officer sign-in failed — cannot review");

  for (const userId of USERS) {
    console.log("");
    console.log(`── ${userId} ─────────────────────────────────────────────`);
    // ⭐ The post-check list carries this identity until an officer checks it.
    await p.goto(`${BASE}/admin/kyc`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2500);
    ok("7 · the identity is on the officers' post-check list",
      (await p.locator(`tr[data-kyc-queue="post-check"]:has(a[href="/admin/kyc/${userId}"])`).count()) === 1);

    await p.goto(`${BASE}/admin/kyc/${userId}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    if (/2fa|two-factor/i.test(p.url())) { ok("workstation reachable without TOTP", false, p.url()); break; }

    const body = await p.locator("body").innerText();
    const typeRow = valueAfter(body, /^document type$/i);
    ok("7 · the workstation names the DOCUMENT TYPE", !!typeRow && typeRow !== "—", typeRow);
    ok("7 · ⭐ …and the CASE: typed details, not photos", /^typed details$/i.test(valueAfter(body, /^case$/i)), valueAfter(body, /^case$/i));

    // ⛔ The expiry row exists for exactly the two documents that carry one.
    const wantsExpiry = /Passport|Driving licence/i.test(typeRow);
    // ⚠️ CASE-INSENSITIVE — the applicant card renders its labels through a CSS uppercase ("EXPIRY").
    const hasExpiry = /(^|[^a-z])expiry([^a-z]|$)/i.test(body);
    ok(`7 · an Expiry field is ${wantsExpiry ? "SHOWN" : "ABSENT"} for a ${typeRow}`, hasExpiry === wantsExpiry, `shown=${hasExpiry}`);

    // ⛔ Where no format is published the officer is TOLD so, in words.
    const openType = /Driving licence|Voter/i.test(typeRow);
    const saysAbsent = /No authoritative/i.test(body);
    ok(`7 · the officer is ${openType ? "TOLD no format is published" : "given the published rule"}`,
       openType ? saysAbsent : !saysAbsent, openType ? `absence stated=${saysAbsent}` : "published rule shown");

    // ⛔ A TYPED CASE CARRIES NO IMAGE — nothing was uploaded, and a viewer would be an empty frame to approve on.
    const imgs = await p.evaluate(() => [...document.querySelectorAll("img")].filter((n) => /api[/]admin[/]kyc-doc/.test(n.src)).length);
    ok("7 · ⛔ no document image on a typed case", imgs === 0, `${imgs} image(s)`);
    await p.screenshot({ path: `${SHOT}/officer-${userId}-1440.png`, fullPage: true });

    // ── the four typed attestations, then Mark checked ─────────────────────
    const judgments = p.locator('button:has-text("tap to verify")');
    const n = await judgments.count();
    ok("7 · the officer is asked for the four TYPED attestations", n === 4, `${n}`);
    for (let i = 0; i < n; i++) { await judgments.first().click(); await p.waitForTimeout(250); }
    const mark = p.locator('button:has-text("Mark checked")');
    const armed = await mark.first().isEnabled().catch(() => false);
    ok("7 · Mark checked arms only once every attestation is made", armed);
    if (armed) {
      // 🔴 A CONFIRM-DIALOG TRIGGER, NOT THE DECISION — every consequential officer action goes through the kit's
      // `ConfirmDialog`, so the first click only OPENS it.
      await mark.first().click();
      const confirm = p.locator('button:has-text("Yes, mark checked")');
      await confirm.first().waitFor({ state: "visible", timeout: 10000 });
      ok("7 · Mark checked opens the confirmation the officer must read", true);
      await confirm.first().click();
      const outcome = await p.waitForSelector("text=/Marked checked|Blocked/", { timeout: 30000 }).then((h) => h.innerText(), () => "(no outcome within 30s)");
      ok("7 · the check is recorded", /Marked checked/.test(outcome), flat(outcome).slice(0, 140));
      await p.screenshot({ path: `${SHOT}/officer-${userId}-checked-1440.png`, fullPage: true });
      await p.goto(`${BASE}/admin/kyc`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2500);
      ok("7 · …and the identity has left the post-check list",
        (await p.locator(`tr[data-kyc-queue="post-check"]:has(a[href="/admin/kyc/${userId}"])`).count()) === 0);
    }

    // 393 as well — the officer's screen is in the responsiveness matrix.
    const mob = await b.newContext({ ...devices["Pixel 7"], storageState: await ctx.storageState() });
    const mp = await mob.newPage();
    await mp.goto(`${BASE}/admin/kyc/${userId}`, { waitUntil: "domcontentloaded" });
    await mp.waitForTimeout(2500);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("7 · the workstation does not overflow at 393", overflow <= 1, `${overflow}px`);
    await mp.screenshot({ path: `${SHOT}/officer-${userId}-393.png`, fullPage: true });
    await mob.close();
  }
} finally {
  await b.close();
}

console.log("");
console.log("─".repeat(64));
console.log(`  OFFICER: ${pass} passed, ${failures.length} failed`);
console.log("─".repeat(64));
if (failures.length) { console.log(""); console.log("FAILURES:"); failures.forEach((f) => console.log("  ✗ " + f)); }
process.exit(failures.length ? 1 : 0);
