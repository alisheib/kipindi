/**
 * READ-ONLY drive of /admin/affiliate — the player referral programme while the invite is UNPAID
 * (docs/PLAYER-INVITE-UNPAID.md §3, §12). It never clicks a toggle or Save.
 *
 *   LIVE_BASE=https://www.50pick.tz SHOT_DIR=<dir> npm run qa:invite-admin
 *
 * ⛔ Production allows ONE session per account: signing in as `admin` (Ali's own console login) signs
 * him out everywhere else once. Run it only with his go-ahead, and never re-mint that password.
 * Locally: LIVE_BASE=http://localhost:<port> ADMIN_SEED=1 uses POST /api/dev-test/seed-admin instead.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { BASE, loginOnce } from "./harness.mjs";

const OUT = process.env.SHOT_DIR ?? "invite-admin-shots";
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (w, name, ok, detail = "") => {
  results.push({ w, name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${w}] ${name}${detail ? " — " + detail : ""}`);
};

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let state;
if (process.env.ADMIN_SEED === "1") {
  const ctx = await b.newContext();
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`);
  if (!r.ok()) throw new Error(`seed-admin ${r.status()}`);
  state = await ctx.storageState();
  await ctx.close();
} else {
  state = await loginOnce(b, "admin");
}

for (const [w, h] of [[1440, 1000], [390, 844]]) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: w, height: h }, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
  check(w, "stays on /admin/affiliate", /\/admin\/affiliate/.test(page.url()), page.url());
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check(w, "not the 2FA setup / sign-in screen", !/provision authenticator|admin sign in/i.test(body));
  check(w, 'chip reads "Unpaid — tracking only"', await page.getByText("Unpaid — tracking only", { exact: true }).first().isVisible().catch(() => false));
  check(w, "master-switch line says Unpaid", /Unpaid — every player (in good standing )?has a(n active)? referral link,? and the platform credits nothing/.test(body));
  check(w, "banner: the reward switches are stored, not applied", /These three switches are stored, not applied\./.test(body));
  const toggles = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label$=" enabled"]')].map((e) => ({
      label: e.getAttribute("aria-label"),
      disabled: e.hasAttribute("disabled") || e.getAttribute("aria-disabled") === "true",
    })));
  const rewardToggles = toggles.filter((t) => t.label !== "Program master switch enabled");
  check(w, "the three reward toggles exist", rewardToggles.length === 3, rewardToggles.map((t) => t.label).join(" | "));
  check(w, "every reward toggle is disabled", rewardToggles.length > 0 && rewardToggles.every((t) => t.disabled),
    rewardToggles.map((t) => `${t.label}=${t.disabled ? "disabled" : "ENABLED"}`).join(" | "));
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll("main button, main a[role=button]")]
      .filter((e) => !e.hasAttribute("disabled"))
      .map((e) => (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
      .filter(Boolean));
  const payButton = buttons.find((t) => /(start|enable|activate|turn on|begin|resume)\b.*\b(pay|payment|payout|reward|commission)|pay (now|out|all)|send payment/i.test(t));
  check(w, "no enabled control offers to start payments", !payButton, payButton ? `found "${payButton}"` : `${buttons.length} enabled buttons: ${buttons.slice(0, 14).join(" · ")}`);
  const paidTile = body.match(/Paid by 50pick\s*(TZS\s*[\d,]+|[\d,]+\s*TZS|TSh\s*[\d,]+|[\d,]+)/i);
  check(w, '"Paid by 50pick" KPI reads zero', paidTile && /^(TZS|TSh)?\s*0$|^0\s*TZS$/i.test(paidTile[1].trim()), paidTile ? paidTile[0] : "tile not found");
  check(w, 'roster "Invites by player" present', /Invites by player/i.test(body));
  check(w, "no page errors", errors.length === 0, errors.slice(0, 2).join(" · "));
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = h - 96;
  for (let y = 0, n = 1; y < total && n <= 6; y += step, n++) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/admin-affiliate-${w}-${n}.png` });
  }
  await ctx.close();
}
await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? " — FAILED: " + failed.map((f) => `[${f.w}] ${f.name}`).join("; ") : ""}`);
process.exit(failed.length ? 1 : 0);
