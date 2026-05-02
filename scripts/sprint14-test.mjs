/**
 * Sprint 14 regression — i18n persistence, 2FA setup, adapter interfaces.
 *
 *   1. Locale cookie persists across reloads
 *   2. Switching to French updates <html lang="fr"> on reload
 *   3. /admin/2fa/setup loads
 *   4. Provisioning a TOTP returns an otpauth URI + secret
 *   5. Verifying the right TOTP code enables 2FA
 *   6. Verifying a wrong code is rejected
 *   7. Removing 2FA flips state back
 *   8. Match-feed mock adapter health is OK
 *   9. /mapigo regression: SPIKE place still works
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function readBal(page) {
  const el = page.locator("[data-testid='wallet-balance']").first();
  if (await el.count() === 0) return null;
  const v = await el.getAttribute("data-balance");
  return v ? parseInt(v, 10) : null;
}

const browser = await chromium.launch();

try {
  // 1. Locale cookie persistence
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    // Open language dropdown + click Kiswahili
    const langBtn = p.locator('button[aria-label^="Language"]').first();
    await langBtn.click().catch(() => {});
    await p.waitForTimeout(200);
    const swItem = p.locator('button[role="menuitem"]').filter({ hasText: /Kiswahili/ }).first();
    await swItem.click().catch(() => {});
    await p.waitForTimeout(400);
    // Reload and check the cookie persists
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const lang = await p.evaluate(() => document.documentElement.lang);
    log("01 locale cookie persists across reload", lang === "sw", `<html lang="${lang}">`);
    await p.close();
    await ctx.close();
  }

  // 2. French locale + html lang
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const langBtn = p.locator('button[aria-label^="Language"]').first();
    await langBtn.click().catch(() => {});
    await p.waitForTimeout(200);
    const frItem = p.locator('button[role="menuitem"]').filter({ hasText: /Français/ }).first();
    await frItem.click().catch(() => {});
    await p.waitForTimeout(400);
    await p.reload({ waitUntil: "networkidle" });
    const lang = await p.evaluate(() => document.documentElement.lang);
    log("02 French selection sets <html lang=\"fr\">", lang === "fr", `lang=${lang}`);
    // Bottom nav should show French strings
    const navText = (await p.locator("nav").first().textContent()) ?? "";
    log("02b French translations driving nav", /Accueil|Paris|Portefeuille/.test(navText));
    await p.close();
    await ctx.close();
  }

  // 3-7. 2FA flow (demo session is admin-equivalent for the layout gate)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
    const p = await ctx.newPage();
    const r = await p.goto(`${BASE}/admin/2fa/setup`, { waitUntil: "networkidle" });
    log("03 /admin/2fa/setup loads", r?.status() === 200);

    // Click "Provision authenticator"
    const startBtn = p.locator('button').filter({ hasText: /Provision authenticator|Re-provision/ }).first();
    await startBtn.click().catch(() => {});
    await p.waitForTimeout(700);
    const body = (await p.locator("body").textContent()) ?? "";
    const hasUri = /otpauth:\/\/totp\/Kipindi/.test(body);
    const hasSecret = /[A-Z2-7]{8}/.test(body);
    log("04 TOTP provisioning returns URI + secret", hasUri && hasSecret);

    // Enter a wrong code → reject
    const codeInput = p.locator('input[aria-label="6-digit verification code"]').first();
    await codeInput.fill("000000");
    const verifyBtn = p.locator('button').filter({ hasText: /Verify and enable/ }).first();
    await verifyBtn.click().catch(() => {});
    await p.waitForTimeout(1_500);
    const afterWrong = (await p.locator("body").textContent()) ?? "";
    log("05 wrong TOTP code rejected", /didn't match|Code didn/i.test(afterWrong) || !/Enabled/.test(afterWrong));

    // Compute the right code from the visible secret then submit
    // We extract the base32 secret by reading the otpauth URL
    const otpauthUrl = (body.match(/otpauth:\/\/totp\/[^\s"]+/) ?? [])[0] ?? "";
    const secretMatch = otpauthUrl.match(/[?&]secret=([A-Z2-7]+)/);
    let realCode = "";
    if (secretMatch) {
      realCode = await p.evaluate(async (b32) => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const bytes = [];
        let bits = 0, value = 0;
        for (const c of b32) {
          const idx = alphabet.indexOf(c);
          if (idx < 0) continue;
          value = (value << 5) | idx; bits += 5;
          if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
        }
        const counter = Math.floor(Date.now() / 1000 / 30);
        const counterBuf = new Uint8Array(8);
        new DataView(counterBuf.buffer).setBigUint64(0, BigInt(counter));
        const key = await crypto.subtle.importKey("raw", new Uint8Array(bytes), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBuf));
        const off = sig[sig.length - 1] & 0x0f;
        const bin = ((sig[off] & 0x7f) << 24) | ((sig[off+1] & 0xff) << 16) | ((sig[off+2] & 0xff) << 8) | (sig[off+3] & 0xff);
        return String(bin % 10**6).padStart(6, "0");
      }, secretMatch[1]);
    }
    if (realCode) {
      await codeInput.fill(realCode);
      await verifyBtn.click().catch(() => {});
      await p.waitForTimeout(1_500);
      const final = (await p.locator("body").textContent()) ?? "";
      log("06 correct TOTP code enables 2FA", /Enabled · Active/.test(final), `code=${realCode}`);
    } else {
      log("06 correct TOTP code enables 2FA", false, "secret extraction failed");
    }

    // Remove 2FA — should return to Not configured
    const removeBtn = p.locator('button').filter({ hasText: /Remove 2FA/ }).first();
    if (await removeBtn.isVisible().catch(() => false)) {
      await removeBtn.click().catch(() => {});
      await p.waitForTimeout(1_500);
      const body2 = (await p.locator("body").textContent()) ?? "";
      log("07 remove 2FA flips back to not-configured", /Not configured/.test(body2));
    } else {
      log("07 remove 2FA flips back to not-configured", false, "Remove button not visible");
    }

    await p.close();
    await ctx.close();
  }

  // 8. Match feed mock adapter (compile-only check via successful page render)
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const r = await p.goto(`${BASE}/live`, { waitUntil: "networkidle" });
    log("08 /live page loads (match-feed adapter compiles)", r?.status() === 200);
    await p.close();
    await ctx.close();
  }

  // 9. Mapigo regression
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.request.get(`${BASE}/auth/demo-mapigo-reset`).catch(() => {});
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
    const mp = await ctx.newPage();
    await mp.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
    await mp.waitForTimeout(900);
    const sp = mp.locator('button[aria-pressed]').filter({ hasText: /Spike/i }).first();
    await sp.click().catch(() => {});
    await mp.waitForTimeout(250);
    const pl = mp.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
    if (await pl.isVisible().catch(() => false)) await pl.click().catch(() => {});
    await mp.waitForTimeout(2_500);
    await mp.close();
    const w = await ctx.newPage();
    await w.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
    await w.waitForTimeout(700);
    const bal = await readBal(w);
    await w.close();
    log("09 Mapigo SPIKE place — wallet at 99,000 (regression)", bal === 99_000, `${bal?.toLocaleString()}`);
    await ctx.close();
  }
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 14  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
