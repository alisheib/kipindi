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
import { mkdirSync, writeFileSync } from "node:fs";
import { clippedControls } from "./clip.mjs";
import { login } from "./harness.mjs";

const BASE = process.env.BASE || "https://50pick.tz";
const SHOTS = "scripts/live/.shots/support";
mkdirSync(SHOTS, { recursive: true });

// ⛔ No local `.env.qa.local` parse here. `harness.mjs` owns reading that file (`qaEnv`), and a
// second parser in this file is what let the two non-existent key names above survive unnoticed.

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

/**
 * Navigate and let the page come to rest.
 *
 * ⛔ NOT `networkidle`. Every navigation here used to ask for it, and on 2026-09-10 the drive
 * timed out on `/help` at 45s — a page that `curl` fetches in 1.8s and that production serves at
 * HTTP 200 with a 3ms database. `networkidle` waits for a 500ms window with no in-flight
 * requests, and these surfaces carry a LIVE TICKER and pollers that keep the connection working
 * indefinitely, so that window may never arrive. It had succeeded on earlier runs, which is the
 * worst property a wait condition can have: it fails as a function of how busy the site is, not
 * of whether the page is ready, so the drive looked flaky rather than wrong.
 * ⭐ The thing we actually need is the DOM plus hydration, so wait for the body and give React a
 * beat. `shoot()` then adds its own settle before measuring.
 */
async function settle(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("body", { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

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
      await settle(page, `${BASE}${route}`);
      for (const w of [360, 1280]) await shoot(page, label, w);
    }
    await ctx.close();
  }

  // ── 1b · THE FIRST-VISIT PRIMER — MEASURED, NOT INFERRED ─────────────────────────────────
  //
  // 🔴 EVERY DESIGN VERDICT ON THIS MODAL HAS BEEN SOURCE-DERIVED, and this is why: the
  // component returned early on `/HeadlessChrome|Playwright/i.test(navigator.userAgent)`, so
  // every browser gate on this platform — all of them default-UA Chromium — photographed a page
  // where it never opened. This drive reported "not shown" on 2026-09-10 and that was the whole
  // finding. The block is still there (about ten drives assume the primer is absent); it now
  // takes an explicit `?primer=1` opt-in, so a driver can ASK for it.
  //
  // ⭐ AND IT MEASURES A RECTANGLE, not just presence. A screenshot proves a surface renders; it
  // does not prove the dialog fits, that its controls are reachable, or that Swahili — the
  // longest of the three languages — does not push it past the viewport. 393 is in the matrix
  // because it is the modern-phone width the 360/1280 pair skips.
  // ⚠️ The locale cookie is `kp-locale`, NOT `locale`, and a page that silently served English
  // would satisfy every assertion below — so each row asserts a POSITIVE CONTROL that the
  // dialog's text actually changed language.
  {
    const LOCALES = [
      { code: "en", expect: /bet|market|welcome/i },
      { code: "sw", expect: /dau|soko|karibu/i },
      { code: "zh", expect: /投注|市场|欢迎/ },
    ];
    for (const { code, expect } of LOCALES) {
      for (const w of [360, 393, 768]) {
        const c = await browser.newContext({ viewport: { width: w, height: 900 } });
        await c.addCookies([{ name: "kp-locale", value: code, domain: new URL(BASE).hostname, path: "/" }]);
        const pg = await c.newPage();
        pg.setDefaultNavigationTimeout(60_000);
        await settle(pg, `${BASE}/?primer=1`);
        await pg.waitForTimeout(2200);
        const m = await pg.evaluate(() => {
          const dlg = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!dlg) return { present: false };
          const r = dlg.getBoundingClientRect();
          const focusable = dlg.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
          return {
            present: true,
            x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
            vw: window.innerWidth, vh: window.innerHeight,
            overflowsX: r.right > window.innerWidth + 1 || r.left < -1,
            offscreenY: r.top < -1,
            controls: focusable.length,
            text: (dlg.textContent || "").trim().slice(0, 120),
          };
        });
        if (!m.present) {
          note(`\n── primer ${code} @${w}: ⛔ NOT SHOWN (the opt-in did not reach the component)`);
        } else {
          note(`\n── primer ${code} @${w}: ${m.w}×${m.h} at (${m.x},${m.y}) in ${m.vw}×${m.vh}`
            + ` · overflowsX=${m.overflowsX} offscreenY=${m.offscreenY} · ${m.controls} controls`);
          note(`   «${m.text}»`);
          // ⭐ The positive control: without it, a page that silently served English would pass
          // the geometry assertions for all three locales and prove nothing about translation.
          note(`   locale control (${code}): ${expect.test(m.text) ? "OK — text is in the expected language" : "⛔ FAILED — served the wrong language"}`);
          await pg.screenshot({ path: `${SHOTS}/primer_${code}_${w}.png` }).catch(() => {});
        }
        await c.close();
      }
    }
  }

  // ── 2 · ADMIN, sequential. The support config and the care desk. ──────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    // 🔴 SIGN IN THROUGH THE HARNESS, NOT BY HAND. This block used to re-implement the login
    // and read `ADMIN_LOGIN_PHONE` / `ADMIN_LOGIN_PASSWORD` from `.env.qa.local` — two keys that
    // have never existed in that file (it holds `QA_*_PASSWORD`, and no phone at all). So both
    // fills received `undefined`, Playwright threw `locator.fill: expected string, got undefined`,
    // and the whole ADMIN half of this drive — the support form and the care desk, i.e. the two
    // surfaces it was written for — was skipped on every run. The public half still printed, so
    // the output looked like a successful drive with a footnote.
    // ⭐ `login()` also carries the traps this copy had already drifted away from: the PhoneInput
    // hidden-mirror sync (fill before hydration and the form posts a blank identifier, which
    // reads as a wrong password), and the staff-vs-player routing that decides `#phone` against
    // `#identifier`. One sign-in path, maintained once.
    // ⚠️ RAISE THE DEFAULTS FIRST. `login()` waits for `networkidle` and takes no timeout
    // argument, so it inherits Playwright's 30s — and every public navigation in this same file
    // already asks for 45s because 30 is not enough for this site. On 2026-09-10 that mismatch
    // timed the drive out on `/auth/admin` and skipped the admin half a second time, for a
    // completely different reason than the first. Both surfaces this drive exists for sit behind
    // that one call, so it gets room rather than the framework default.
    page.setDefaultNavigationTimeout(90_000);
    page.setDefaultTimeout(90_000);
    await login(page, "admin");
    // ⛔ A POSITIVE CONTROL, because this platform's revoked-session page is HTTP 200. If another
    // session took this account mid-drive we land on the sign-in form, every later assertion
    // passes against a login screen, and the shots are of the login screen too.
    if (/\/auth\//.test(new URL(page.url()).pathname)) {
      throw new Error(`admin sign-in did not land: still on ${page.url()} — another session may hold this account`);
    }
    note(`\n── admin signed in → ${page.url()}`);
    for (const [route, label] of [
      ["/admin/system", "admin-system-support"],
      ["/admin/players", "admin-care-desk"],
      ["/profile/responsible-gambling", "authed-rg"],
      ["/wallet", "authed-wallet"],
    ]) {
      await settle(page, `${BASE}${route}`);
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
