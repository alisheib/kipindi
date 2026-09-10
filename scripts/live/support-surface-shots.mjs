/**
 * SUPPORT & CARE — capture every surface, public and admin, for a VISUAL evaluation.
 *
 *   node scripts/live/support-surface-shots.mjs
 *
 * ⚠️ ONE LOGIN AT A TIME. This platform revokes a session when the same account signs in again,
 * so the admin pass is strictly sequential — a parallel context would silently get the sign-in
 * page at HTTP 200 and every shot would be of the login screen.
 *
 * ⭐ IT ALSO MEASURES WHILE IT LOOKS. A screenshot proves a surface renders; it does not prove a
 * control is reachable, that a tel: link can be dialled, or that a field is editable. So each
 * surface also reports the facts a designer cannot see: which inputs are disabled/readonly, what
 * every mailto/tel href actually resolves to, and whether any control is clipped out of reach.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { clippedControls } from "./clip.mjs";

const BASE = process.env.BASE || "https://50pick.tz";
const SHOTS = "scripts/live/.shots/support";
mkdirSync(SHOTS, { recursive: true });

const env = Object.fromEntries(
  readFileSync(".env.qa.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);

const report = [];
const note = (s) => { console.log(s); report.push(s); };

/** The facts a screenshot cannot carry. */
const probe = (page) => page.evaluate(() => {
  const vw = window.innerWidth;
  return {
    // Every way out to a human, and whether it is actually actionable.
    contacts: [...document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]')]
      .map((a) => `${a.getAttribute("href")}  «${(a.textContent || "").trim().slice(0, 40)}»`),
    // Fields an officer might report as "not changing".
    inputs: [...document.querySelectorAll("input, textarea, select")].map((el) => {
      const name = el.getAttribute("name") || el.id || "(unnamed)";
      const flags = [el.disabled ? "disabled" : "", el.readOnly ? "readonly" : ""].filter(Boolean).join("+");
      return `${name}${flags ? ` [${flags}]` : ""} = ${JSON.stringify(String(el.value ?? "").slice(0, 34))}`;
    }),
    // Anything the page says is uneditable — does it explain WHY?
    hints: [...document.querySelectorAll("p, span, small")]
      .map((e) => (e.textContent || "").trim())
      .filter((t) => /not editable|read.only|cannot be changed|statutory/i.test(t))
      .slice(0, 6),
    // ⛔ THE POPULATION IS SCOPED, AND THE FIRST VERSION WAS NOT — it reported 22,345px of
    // "overflow" on /help, which is the LIVE TICKER: a marquee whose track is legitimately
    // ~22,000px because it scrolls. An unscoped box measurement on a page with a marquee produces
    // a number that looks like a catastrophe and means nothing. Excluded here by name, alongside
    // scroll regions (a ScrollX child is WIDER than the viewport by design).
    widest: (() => {
      let worst = 0, tag = "";
      for (const el of document.querySelectorAll("main *, article *")) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.left < -1) continue;
        if (el.closest('[role="region"], .ticker-track, [data-marquee]')) continue;
        const past = Math.round(r.right - vw);
        if (past > worst) { worst = past; tag = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`; }
      }
      return worst > 1 ? `${worst}px (${tag})` : "0";
    })(),
  };
});

async function shoot(page, label, width) {
  await page.setViewportSize({ width, height: 1100 });
  await page.waitForTimeout(400);
  const p = await probe(page);
  const clipped = await clippedControls(page, "body");
  await page.screenshot({ path: `${SHOTS}/${label}_${width}.png`, fullPage: width === 1280 }).catch(() => {});
  note(`\n── ${label} @${width}  ${new URL(page.url()).pathname}`);
  if (p.contacts.length) note(`   contacts: ${p.contacts.join("  |  ")}`); else note("   contacts: (none on this surface)");
  if (p.inputs.length) note(`   inputs:   ${p.inputs.join("  |  ")}`);
  if (p.hints.length) note(`   says:     ${p.hints.join("  |  ")}`);
  note(`   overflow past viewport: ${p.widest} · clipped controls: ${clipped.length}${clipped.length ? " → " + clipped.slice(0, 2).join(" | ") : ""}`);
}

const browser = await chromium.launch();
try {
  // ── 1 · PUBLIC, signed out. Also the only way to see the first-visit primer. ──────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    for (const [route, label] of [["/help", "public-help"], ["/legal/responsible-gambling", "public-rg"], ["/", "public-home"]]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
      for (const w of [360, 1280]) await shoot(page, label, w);
    }
    // The primer fires for a browser that has never visited — this context is exactly that.
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(2500);
    const primer = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"], [aria-modal="true"]');
      return dlg ? { present: true, text: (dlg.textContent || "").trim().slice(0, 220) } : { present: false };
    });
    note(`\n── first-visit primer on a never-seen browser: ${primer.present ? "SHOWN" : "not shown"}`);
    if (primer.present) { note(`   «${primer.text}»`); await shoot(page, "primer", 360); await shoot(page, "primer", 1280); }
    await ctx.close();
  }

  // ── 2 · ADMIN, sequential. The support config and the care desk. ──────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 45_000 }).catch(() => {});
    // ⚠️ TWO SIGN-IN PAGES, TWO FIELD IDS. `/auth/admin` renders `#phone`; `/auth/login` renders
    // `#identifier`. Both mirror their value into a same-named HIDDEN input, so selecting by
    // `[name=…]` finds the invisible twin and `fill` times out on an element that is never visible.
    // Select by id, and accept either page.
    const idField = (await page.locator("#phone").count()) ? "#phone" : "#identifier";
    await page.locator(idField).first().fill(env.ADMIN_LOGIN_PHONE);
    await page.locator("#password").first().fill(env.ADMIN_LOGIN_PASSWORD);
    await Promise.all([
      page.waitForURL((u) => !/\/auth\//.test(new URL(u).pathname), { timeout: 45_000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    note(`\n── admin signed in → ${page.url()}`);
    for (const [route, label] of [
      ["/admin/system", "admin-system-support"],
      ["/admin/players", "admin-care-desk"],
      ["/profile/responsible-gambling", "authed-rg"],
      ["/wallet", "authed-wallet"],
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
      for (const w of [360, 1280]) await shoot(page, label, w);
    }
    await ctx.close();
  }
} catch (err) {
  note(`\n🔴 drive threw — ${err.message}`);
} finally {
  await browser.close();
}

writeFileSync(`${SHOTS}/REPORT.txt`, report.join("\n"));
console.log(`\nshots + REPORT.txt in ${SHOTS}`);
