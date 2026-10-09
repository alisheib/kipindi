// PRODUCTION, approved by Ali on 2026-10-07 ("You reset it"): QA Mobile 01's saved password stopped working, and
// WP12's live check signs in with it once. Through the live admin console, exactly as an officer would: sign in with
// the admin persona (Ali's console login — an ADMIN-only act), open QA Mobile 01's player page, Reset password →
// "Generate temporary password", read the new password off the page, write it to the shared secrets file
// (F:/kipindi-main/.env.qa.local, QA_MOBILE01_PASSWORD) and to this worktree's copy, then prove it: one sign-in as
// mobile01. ⛔ The password is NEVER printed; only its length. Writes on production: that account's password (with
// its audit row, its sessions revoked, the "password changed" alert to its undeliverable address) and one sign-in.
process.env.LIVE_BASE = "https://www.50pick.tz";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-c5docs";
const req = createRequire(ROOT + "/package.json");
const { chromium } = req("playwright");
const H = await import("file:///F:/kipindi-c5docs/scripts/live/harness.mjs");
const SHARED = "F:/kipindi-main/.env.qa.local", LOCAL = `${ROOT}/.env.qa.local`;
const PHONE = "712000110";

const setSecret = (file, value) => {
  const raw = readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const i = lines.findIndex((l) => /^QA_MOBILE01_PASSWORD\s*=/.test(l));
  if (i < 0) throw new Error(`no QA_MOBILE01_PASSWORD line in ${file}`);
  lines[i] = `QA_MOBILE01_PASSWORD=${value}`;
  writeFileSync(file, lines.join(eol));
};

const b = await chromium.launch({ headless: true });
let ok = false;
try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await H.login(page, "admin");
  console.log("1 · signed in to the console as the admin persona");
  await page.goto(`${H.BASE}/admin/players?q=${PHONE}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const link = page.locator('a[href^="/admin/players/"]').filter({ hasText: /QA Mobile 01|712000110|712 000 110/ }).first();
  await link.waitFor({ timeout: 60_000 });
  const href = await link.getAttribute("href");
  if (!/^\/admin\/players\/[A-Za-z0-9_-]+$/.test(href ?? "")) throw new Error(`unexpected player link: ${href}`);
  const found = new Set(await page.locator('a[href^="/admin/players/usr_"]').evaluateAll((as) => as.map((a) => a.getAttribute("href"))));
  if (found.size !== 1) throw new Error(`the search by phone found ${found.size} players, not one — stopping before any change`);
  await page.goto(`${H.BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  const body = (await page.locator("main").first().innerText()).replace(/\s+/g, " ");
  const uid = href.split("/").pop();
  // The page masks the phone and the email: the identity is the name, the masked phone ending 10, the masked
  // @50pick.test address, and the one id the search BY PHONE returned.
  if (!/QA Mobile 01/.test(body) || !/\+255\S*10\b/.test(body) || !/@50pick\.test/.test(body) || !body.includes(uid.slice(0, 12)))
    throw new Error("the page opened is not QA Mobile 01's — stopping before any change");
  console.log("2 · QA Mobile 01's player page is open (its name, masked phone, test address and id on it)");
  await page.getByRole("button", { name: "Reset password" }).click();
  const dlg = page.getByRole("alertdialog", { name: /Reset password/ });
  await dlg.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200); // past the entrance and the arming beat (S6 A8i-2)
  // Playwright never found the button "stable" (2026-10-07, a 30 s timeout), while a read-only probe showed it enabled,
  // opaque, not inert and on top at its centre. So that is asserted here, then the click skips only the stability wait.
  const confirm = dlg.getByRole("button", { name: "Generate temporary password" });
  const pressable = await confirm.evaluate((btn) => {
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !btn.disabled && !btn.closest("[inert]") && (top === btn || btn.contains(top));
  });
  if (!pressable) throw new Error("the confirm button is not pressable — stopping before any change");
  await confirm.click({ force: true });
  const shown = page.locator("p.select-all").first();
  await shown.waitFor({ timeout: 60_000 });
  const pw = (await shown.innerText()).trim();
  if (!/^\S{10,}$/.test(pw)) throw new Error(`the new password did not read back as one word of 10+ characters (length ${pw.length})`);
  console.log(`3 · a new password was issued (${pw.length} characters, not shown)`);
  setSecret(SHARED, pw);
  setSecret(LOCAL, pw);
  console.log("4 · saved to QA_MOBILE01_PASSWORD in F:/kipindi-main/.env.qa.local and this worktree's copy");
  await ctx.close();
  // 5 · the proof: one sign-in as mobile01 with the saved password
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await c2.newPage();
  await H.login(p2, "mobile01");
  const session = (await c2.cookies(H.BASE)).some((c) => c.name === "kp_session");
  console.log(`5 · QA Mobile 01 signs in with the saved password: ${session ? "yes (a session cookie)" : "NO"}`);
  ok = session;
  await c2.close();
} catch (e) {
  console.log(`STOPPED: ${String(e.message).slice(0, 300)}`);
} finally {
  await b.close();
}
process.exit(ok ? 0 : 1);
