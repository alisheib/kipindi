/**
 * READ-ONLY production drive of the UNPAID player invite (docs/PLAYER-INVITE-UNPAID.md), at PHONE width.
 *
 *   LIVE_BASE=https://www.50pick.tz SHOT_DIR=<dir> npm run qa:invite-phone          # production
 *   LIVE_BASE=http://localhost:<port> LOCAL_DEMO=1 npm run qa:invite-phone          # local, /auth/demo
 *
 * Signs in ONCE as `mobile01` (a never-funded QA player; a second login revokes the first, so never
 * while the mobile/landing lanes are driving it) and, per locale (sw default, en, zh):
 *   1. every door a phone offers to /profile/invite — the bottom rail's More (☰ Zaidi) sheet, the
 *      avatar menu, the footer, the /profile settings row — each VISIBLE and TAPPABLE, not merely in
 *      the DOM, and each carrying the page's own name ("Alika marafiki · Invite friends · 邀请朋友");
 *   2. the page itself — code, link carrying ?ref= to /auth/register, QR, the joined count, the
 *      no-reward line — and NOTHING offering money inside <main> (money words, TZS, gilt);
 *   3. the link, opened SIGNED OUT, reaches /auth/register with the code in the form (GET only —
 *      it never submits, so no account is created).
 * ⚠️ Visiting /profile/invite mints the viewer's referral code on first view (a row for the QA
 * player), which is what any player's visit does. Nothing else is written.
 * Screenshots are VIEWPORT tiles, never full-page (fixed layers paint at their first-viewport spot).
 * ⚠️ Two traps measured 2026-09-26: the live board never reaches `networkidle` (it streams), so wait
 * for ELEMENTS; and a fresh browser gets the first-visit primer dialog over the rail, so the drive
 * marks it seen (`50pick-primer-seen`) as any returning player's browser already has.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { BASE, loginOnce } from "./harness.mjs";

const OUT = process.env.SHOT_DIR ?? "invite-prod-shots";
mkdirSync(OUT, { recursive: true });
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844);
const LOCALES = (process.env.LOCALES ?? "sw,en,zh").split(",");

const L = {
  en: { more: /^more$/i, account: "Account menu", invite: "Invite friends", note: "50pick pays no reward for invites. 18+.",
        joined: /friends joined/i, invitedBy: /invited by|introduced by/i,
        money: /\b(earn|earned|earning|earnings|commission|bonus|prize|payout|cash ?back|tzs|tsh)\b|invite & earn/i },
  sw: { more: /^zaidi$/i, account: "Menyu ya akaunti", invite: "Alika marafiki", note: "50pick hailipi zawadi kwa mialiko. Miaka 18+.",
        joined: /marafiki waliojiunga|waliojiunga/i, invitedBy: /umealikwa na|umetambulishwa na/i,
        money: /\b(upate|zawadi|kamisheni|bonasi|tuzo|malipo|tzs|tsh)\b/i },
  zh: { more: /^更多$/, account: "账户菜单", invite: "邀请朋友", note: "50pick 不为邀请支付任何奖励。18+。",
        joined: /已加入|加入的朋友/, invitedBy: /邀请|推荐/,
        money: /赚|奖励|佣金|奖金|返现|TZS/ },
};

const results = [];
const check = (loc, name, ok, detail = "") => {
  results.push({ loc, name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${loc}] ${name}${detail ? " — " + detail : ""}`);
};

async function tiles(page, name, max = 5) {
  const h = await page.evaluate(() => innerHeight);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = h - 96;
  let n = 0;
  for (let y = 0; y < total && n < max; y += step, n++) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}-${n + 1}.png` });
  }
  await page.evaluate(() => scrollTo(0, 0));
  return n;
}

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let state;
if (process.env.LOCAL_DEMO === "1") {
  // Local only: /auth/demo mints a PLAYER session (404 on production).
  const c = await b.newContext();
  const pg = await c.newPage();
  await pg.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  state = await c.storageState();
  await c.close();
} else {
  state = await loginOnce(b, "mobile01");
}
console.log(`signed in once as ${process.env.LOCAL_DEMO === "1" ? "a /auth/demo player" : "mobile01"}; target ${BASE}; viewport ${W}x${H}`);

let shareLink = null;
for (const loc of LOCALES) {
  const t = L[loc];
  const ctx = await b.newContext({
    storageState: state, viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  });
  await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
  // A returning player has dismissed the first-visit primer once; it would otherwise cover the rail.
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // ── 1a · bottom rail → More sheet
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await page.locator("nav.kp-rail").waitFor({ state: "visible", timeout: 30000 }); await page.waitForTimeout(1500);
  const signedIn = await page.locator(`button[aria-label="${t.account}"]`).count();
  check(loc, "signed in (account menu present)", signedIn > 0);
  const rail = page.locator("nav.kp-rail");
  check(loc, "bottom rail visible at phone width", await rail.isVisible());
  const moreBtn = rail.locator('button[aria-haspopup="menu"]');
  await moreBtn.click();
  const sheetInvite = page.locator('nav.kp-rail [role="menu"] a[href="/profile/invite"]');
  await sheetInvite.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const sheetVisible = await sheetInvite.isVisible();
  const sheetItems = await page.locator('nav.kp-rail [role="menu"] a').allInnerTexts().catch(() => []);
  const sheetLabel = sheetVisible ? (await sheetInvite.innerText()).trim() : "";
  check(loc, "More-sheet row carries the page's own name", sheetLabel === t.invite, `label "${sheetLabel}" want "${t.invite}"`);
  check(loc, "More sheet shows Invite", sheetVisible, `items: ${sheetItems.map((s) => s.trim()).join(" | ")}`);
  if (sheetVisible) {
    const box = await sheetInvite.boundingBox();
    check(loc, "More-sheet Invite row fully on screen and ≥44px tall", box && box.y >= 0 && box.y + box.height <= H && box.height >= 44,
      box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "no box");
  }
  await page.screenshot({ path: `${OUT}/${loc}-${W}-01-more-sheet.png` });
  if (sheetVisible) {
    await sheetInvite.click();
    await page.waitForURL(/\/profile\/invite/, { timeout: 15000 }).catch(() => {});
    check(loc, "tapping the More-sheet row lands on /profile/invite", /\/profile\/invite/.test(page.url()), page.url());
  }

  // ── 1b · avatar menu
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await page.locator("nav.kp-rail").waitFor({ state: "visible", timeout: 30000 }); await page.waitForTimeout(1500);
  await page.locator(`button[aria-label="${t.account}"]`).click();
  // ⚠️ At phone width the menu opens as a centred sheet OUTSIDE <header> — scope to the open menu, not the bar.
  const menuInvite = page.locator('[role="menu"] a[href="/profile/invite"]').filter({ visible: true }).first();
  await menuInvite.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const menuVisible = await menuInvite.isVisible();
  const menuLabel = menuVisible ? (await menuInvite.innerText()).trim() : "";
  check(loc, "avatar menu shows Invite", menuVisible, `label "${menuLabel}"`);
  check(loc, "avatar-menu label is the neutral one", menuLabel === t.invite, `want "${t.invite}"`);
  await page.screenshot({ path: `${OUT}/${loc}-${W}-02-avatar-menu.png` });

  // ── 1b2 · the footer door — present, and TAPPABLE (a fixed rail once buried the last footer row)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  const foot = page.locator('footer a[href="/profile/invite"]');
  const footCount = await foot.count();
  check(loc, "footer has an Invite link", footCount === 1, `${footCount} links`);
  if (footCount) {
    await foot.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const footText = (await foot.innerText()).trim();
    const hit = await foot.evaluate((a) => { const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === a || a.contains(e)); });
    check(loc, "footer Invite link is neutral and not covered", footText === t.invite && hit, `"${footText}" hit=${hit}`);
    await page.screenshot({ path: `${OUT}/${loc}-${W}-02b-footer.png` });
  }

  // ── 1c · /profile settings row
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" }); await page.locator("main").waitFor(); await page.waitForTimeout(1500);
  const row = page.locator('main a[href="/profile/invite"]').first();
  const rowCount = await page.locator('main a[href="/profile/invite"]').count();
  check(loc, "/profile has an Invite row", rowCount > 0);
  if (rowCount) {
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    check(loc, "/profile Invite row is visible and neutral", (await row.isVisible()) && rowText.includes(t.invite) && !t.money.test(rowText), rowText);
    await page.screenshot({ path: `${OUT}/${loc}-${W}-03-profile-row.png` });
  }

  // ── 2 · the page
  await page.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" }); await page.locator("main h1, h1").first().waitFor({ state: "attached", timeout: 30000 }); await page.waitForTimeout(1500);
  check(loc, "/profile/invite does not redirect", /\/profile\/invite/.test(page.url()), page.url());
  const h1 = (await page.locator("h1").first().textContent().catch(() => ""))?.trim();
  check(loc, "page h1 is the unpaid title", h1 === t.invite, `h1 "${h1}"`);
  const main = page.locator("main");
  const mainText = (await main.innerText()).replace(/\s+/g, " ");
  const code = (await page.locator("main span.font-mono.font-bold").first().textContent().catch(() => ""))?.trim();
  check(loc, "a referral code is shown", !!code && code !== "—" && code.length >= 4, `code "${code}"`);
  const linkText = await page.evaluate(() => {
    const hay = [document.querySelector("main")?.innerText ?? "", ...[...document.querySelectorAll("main input, main textarea, main a[href]")].map((e) => e.value || e.getAttribute("href") || "")].join("\n");
    const m = hay.match(/https?:\/\/[^\s"']+\/auth\/register\?ref=[^\s"'&]+/);
    return m ? m[0] : null;
  });
  check(loc, "the link carries ?ref= to /auth/register", !!linkText && (!code || linkText.endsWith(encodeURIComponent(code))), linkText ?? "no link found");
  if (linkText) shareLink = linkText;
  const qr = await page.locator('main img[src^="data:image/png"]').count();
  check(loc, "QR is rendered", qr > 0);
  check(loc, "joined count is shown", t.joined.test(mainText));
  check(loc, "the no-reward line is shown, in this language", mainText.includes(t.note), t.note);
  const stripped = mainText.split(t.note).join(" ");
  const moneyHit = stripped.match(t.money);
  check(loc, "nothing in <main> offers money", !moneyHit, moneyHit ? `found "${moneyHit[0]}" in: …${stripped.slice(Math.max(0, moneyHit.index - 60), moneyHit.index + 60)}…` : "");
  const gilt = await page.evaluate(() =>
    [...document.querySelectorAll("main *")].filter((e) => /(^|\s)(text|bg|border|from|to|ring)-gold-/.test(e.getAttribute("class") || "")).length);
  check(loc, "no gilt (gold) classes in <main>", gilt === 0, `${gilt} gold-classed elements`);
  check(loc, "no page errors", errors.length === 0, errors.slice(0, 3).join(" · "));
  const n = await tiles(page, `${loc}-${W}-04-invite-page`);
  console.log(`  [${loc}] ${n} viewport tiles of /profile/invite`);
  await ctx.close();
}

// ── 3 · the link, opened signed OUT (GET only — the form is never submitted)
if (shareLink) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const target = shareLink.replace(/^https?:\/\/[^/]+/, BASE);
  await page.goto(target, { waitUntil: "domcontentloaded" }); await page.locator("form").first().waitFor({ timeout: 30000 }); await page.waitForTimeout(1500);
  const url = page.url();
  check("sw", "signed-out link lands on /auth/register with ref kept", /\/auth\/register/.test(url) && /[?&]ref=/.test(url), url);
  const code = new URL(target).searchParams.get("ref");
  const formHasRef = await page.evaluate((c) =>
    [...document.querySelectorAll('form input[name="ref"]')].some((i) => i.value.toUpperCase() === String(c).toUpperCase()), code);
  check("sw", "the register form carries the code", formHasRef, `ref=${code}`);
  const txt = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
  check("sw", "register page names the inviter", L.sw.invitedBy.test(txt));
  const offer = txt.match(/\b(bonasi|zawadi|tuzo|bure|bonus|free bet)\b/i);
  check("sw", "register page makes no offer", !offer, offer ? `found "${offer[0]}"` : "");
  await page.screenshot({ path: `${OUT}/sw-${W}-05-register-from-link.png` });
  await ctx.close();
} else {
  check("-", "signed-out link check", false, "no share link was found on the page");
}

await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? " — FAILED: " + failed.map((f) => `[${f.loc}] ${f.name}`).join("; ") : ""}`);
process.exit(failed.length ? 1 : 0);
