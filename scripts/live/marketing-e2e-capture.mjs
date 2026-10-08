// S7c · THE END-TO-END CAPTURE of every marketing screen (tracked since 2026-09-28 so any PC can run it).
// PRODUCTION (`prod`): public pages only, read-only. LOCAL (`local`): `next dev` on :3043 with the
// in-memory store + a stub Blackball on :3999 — the U8 opt-out drive, the consent screens (OFF, ON, HELD,
// read failure), help / privacy / RG detail, and the /admin/system SMS credit tile in ten states
// (unreachable, refused, pending, healthy, seven figures, low, below floor, unconfirmed, stale). `tail`
// runs only the consent-HELD, public-detail and admin parts. Sends NO SMS (the stub refuses sends).
// ⛔ `rm -rf .next` FIRST — a stale `.next` 404s every /api/dev-test route and this drive then shoots the
//    admin SIGN-IN page (it now exits 3 if an admin shot is not the SMS tile).
// ⛔ Heavy: run it through `bash ~/heavy-node-lock.sh run <who> node scripts/live/marketing-e2e-capture.mjs local`.
// Viewport tiles only (never full-page), HeadlessChrome in the UA. Shots land in .qa-shots/e2e (gitignored).
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = ".qa-shots/e2e";
mkdirSync(OUT, { recursive: true });
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36";
const PROD = "https://www.50pick.tz";
const LOCAL = "http://localhost:3043";
const WIDTHS = [[1280, 800], [360, 780]];
const log = [];
const badShots = [];
const note = (o) => { log.push(o); console.log(JSON.stringify(o)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const which = process.argv[2] || "all";

// ── the stub vendor ─────────────────────────────────────────────────────────────────────────
let stubMode = { mode: "down", balance: 185 };
let balanceReads = 0, sends = 0;
const stub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c)).on("end", () => {
    res.setHeader("content-type", "application/json");
    if (req.url?.includes("/api/account/balance")) {
      balanceReads++;
      const ok = () => res.end(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: stubMode.balance }));
      if (stubMode.mode === "refused") { res.statusCode = 401; res.end(JSON.stringify({ status: false, message: "Unauthenticated.", data: null, balance: 0 })); return; }
      if (stubMode.mode === "slow") { setTimeout(ok, 6000); return; }
      if (stubMode.fail || stubMode.mode === "down") { res.statusCode = 503; res.end(JSON.stringify({ status: false, message: "stub: vendor down", data: null, balance: 0 })); return; }
      ok();
    } else { sends++; res.statusCode = 400; res.end(JSON.stringify({ status: false, message: "stub: no sends", data: null, balance: 0 })); }
  });
});

async function tile(page, file, locator) {
  if (locator) {
    await locator.first().scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -90)).catch(() => {});
    await sleep(250);
  }
  await page.screenshot({ path: `${OUT}/${file}.png` });
}

async function overflow(page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
}

/** The sign-up form's ticks, shot at the terms box. ⛔ The SMS-offers box was REMOVED on 2026-10-07 (COMPLIANCE-DECISIONS
 *  § "2026-10-07 · Marketing SMS go to anyone with a phone — consent is not a condition"): a `marketingOptIn` box found on
 *  the page makes the capture invalid, and a page with no terms box is not the form. */
async function registerTicks(page, file, at) {
  const boxes = await page.locator('input[name="marketingOptIn"]').count().catch(() => 0);
  const terms = page.locator('input[name="acceptTerms"]');
  const found = await terms.count().catch(() => 0);
  const label = found ? await terms.first().locator("xpath=ancestor::label[1]").innerText().catch(() => "") : "";
  await tile(page, file, found ? terms : null);
  note({ ...at, page: "/auth/register ticks", marketingBoxes: boxes, termsBox: found, overflowPx: await overflow(page), label: label.replace(/\s+/g, " ").slice(0, 200) });
  if (boxes > 0 || found === 0) {
    badShots.push(`register ${at.where} ${at.loc} ${at.w}`);
    console.log(`!! ${boxes > 0 ? "THE REMOVED SMS-OFFERS BOX IS ON THE PAGE" : "NOT THE SIGN-UP FORM"}: ${at.where} ${at.loc} ${at.w}`);
  }
}

// ── PRODUCTION (public, read-only) ─────────────────────────────────────────────────────────
async function prod(browser) {
  for (const [w, h] of WIDTHS) {
    for (const loc of ["sw", "en", "zh"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: PROD }]);
      const page = await ctx.newPage();
      const r = await page.goto(`${PROD}/legal/responsible-gambling`, { waitUntil: "networkidle" });
      const h4 = page.locator("h2", { hasText: /^\s*4\./ });
      const s4 = await h4.first().locator("xpath=ancestor::section[1]").innerText().catch(() => "");
      await tile(page, `prod-rg-s4-${loc}-${w}`, h4);
      note({ where: "prod", page: "/legal/responsible-gambling §4", loc, w, status: r?.status(), overflowPx: await overflow(page), s4: s4.replace(/\s+/g, " ").slice(0, 400) });
      if (loc !== "zh") {
        const rr = await page.goto(`${PROD}/auth/register`, { waitUntil: "networkidle" });
        await registerTicks(page, `prod-register-ticks-${loc}-${w}`, { where: "prod", loc, w, status: rr?.status() });
      }
      await ctx.close();
    }
  }
}

// ── LOCAL (dev server + stub) ──────────────────────────────────────────────────────────────
async function adminState(browser, name) {
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA });
    const page = await ctx.newPage();
    await page.request.post(`${LOCAL}/api/dev-test/seed-admin`, { data: { phone: `+25571100${w}` } });
    const r = await page.goto(`${LOCAL}/admin/system`, { waitUntil: "load", timeout: 90_000 }); await sleep(1500);
    const kpi = page.locator(".admin-kpi", { hasText: /SMS/i });
    const text = await kpi.first().innerText().catch(() => "");
    await tile(page, `local-admin-system-${name}-${w}`, kpi);
    await kpi.first().screenshot({ path: `${OUT}/local-admin-sms-tile-${name}-${w}.png` }).catch(() => {});
    note({ where: "local", page: "/admin/system SMS tile", state: name, w, status: r?.status(), overflowPx: await overflow(page), tile: text.replace(/\s+/g, " ") });
    if (!/SMS credit/i.test(text)) { badShots.push(`admin ${name} ${w}`); console.log(`!! NOT THE SMS TILE: admin ${name} ${w}`); }
    await ctx.close();
  }
}

async function player(browser) {
  for (const [w, h] of WIDTHS) {
    for (const loc of ["sw", "en", "zh"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: LOCAL }]);
      const page = await ctx.newPage();
      await page.goto(`${LOCAL}/auth/demo`, { waitUntil: "load", timeout: 90_000 });
      const r = await page.goto(`${LOCAL}/profile/notifications`, { waitUntil: "load", timeout: 90_000 }); await sleep(2500);
      const sw = page.getByRole("switch").or(page.locator('[role="switch"], button[aria-pressed]'));
      const count = await sw.count().catch(() => 0);
      const body = await page.locator("main").innerText().catch(() => "");
      // What is the half-hidden round thing on the right edge?
      const probe = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const chain = [];
        for (let n = el; n && chain.length < 6; n = n.parentElement) chain.push(`${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}.${String(n.className || "").slice(0, 80)}`);
        return chain;
      }, [w - 6, 400]).catch(() => null);
      await tile(page, `local-profile-notifications-${loc}-${w}`, page.getByText(/SMS|短信/i));
      note({ where: "local", page: "/profile/notifications", loc, w, status: r?.status(), switches: count, overflowPx: await overflow(page), rightEdgeProbe: probe, main: body.replace(/\s+/g, " ").slice(0, 700) });
      // The sign-up form's ticks (signed-out context) — no SMS-offers box since 2026-10-07.
      const ctx2 = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA });
      await ctx2.addCookies([{ name: "kp-locale", value: loc, url: LOCAL }]);
      const p2 = await ctx2.newPage();
      const rr = await p2.goto(`${LOCAL}/auth/register`, { waitUntil: "load", timeout: 90_000 }); await sleep(1500);
      await registerTicks(p2, `local-register-ticks-${loc}-${w}`, { where: "local", loc, w, status: rr?.status() });
      // Help FAQ helpline + privacy processors + RG §4.
      for (const [path, find, tag] of [["/help", /0800/, "help"], ["/legal/privacy", /Blackball/i, "privacy"], ["/legal/responsible-gambling", /^\s*4\./, "rg"]]) {
        const r3 = await p2.goto(`${LOCAL}${path}`, { waitUntil: "load", timeout: 90_000 }); await sleep(1200);
        const target = tag === "rg" ? p2.locator("h2", { hasText: find }) : p2.getByText(find);
        const n = await target.count().catch(() => 0);
        const txt = n ? await target.first().locator("xpath=ancestor::*[self::li or self::section or self::details or self::p][1]").innerText().catch(() => "") : "";
        await tile(p2, `local-${tag}-${loc}-${w}`, n ? target : null);
        note({ where: "local", page: path, loc, w, status: r3?.status(), found: n, overflowPx: await overflow(p2), text: txt.replace(/\s+/g, " ").slice(0, 400) });
      }
      await ctx2.close();
      await ctx.close();
    }
  }
}

// The toggle's ON state — a separate pass AFTER every OFF shot, because the demo player is shared.
async function playerOn(browser) {
  for (const [w, h] of WIDTHS) {
    for (const loc of ["sw", "en", "zh"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: LOCAL }]);
      const page = await ctx.newPage();
      await page.goto(`${LOCAL}/auth/demo`, { waitUntil: "load", timeout: 90_000 });
      await page.goto(`${LOCAL}/profile/notifications`, { waitUntil: "load", timeout: 90_000 }); await sleep(2500);
      const sms = page.getByRole("switch", { name: /SMS|短信/ });
      const n = await sms.count().catch(() => 0);
      let before = null, after = null;
      if (n) {
        before = await sms.first().getAttribute("aria-checked");
        if (before !== "true") { await sms.first().click(); await sleep(2500); }
        after = await sms.first().getAttribute("aria-checked");
      }
      const card = await (n ? sms.first().locator("xpath=ancestor::*[contains(@class,'glass') or self::section][1]").innerText().catch(() => "") : "");
      await tile(page, `local-profile-notifications-on-${loc}-${w}`, n ? sms : null);
      note({ where: "local", page: "/profile/notifications ON", loc, w, found: n, before, after, card: card.replace(/\s+/g, " ").slice(0, 400) });
      await ctx.close();
    }
  }
}

// Consent states that need the RG seed: HELD (during a break), PAUSED (after it ended), and a read failure.
async function consentStates(browser) {
  for (const loc of ["sw", "en", "zh"]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: LOCAL }]);
    const page = await ctx.newPage();
    await page.goto(`${LOCAL}/auth/demo`, { waitUntil: "load", timeout: 90_000 });
    const shoot = async (tag, url = `${LOCAL}/profile/notifications`) => {
      await page.goto(url, { waitUntil: "load", timeout: 90_000 }); await sleep(2500);
      const sms = page.getByRole("switch", { name: /SMS|短信/ });
      const n = await sms.count().catch(() => 0);
      const checked = n ? await sms.first().getAttribute("aria-checked") : null;
      const disabled = n ? await sms.first().isDisabled().catch(() => null) : null;
      const main = await page.locator("main").innerText().catch(() => "");
      await tile(page, `local-consent-${tag}-${loc}-360`, n ? sms : page.getByText(/SMS|短信/));
      note({ where: "local", page: `/profile/notifications ${tag}`, loc, found: n, checked, disabled, main: main.replace(/\s+/g, " ").slice(0, 700) });
    };
    // make sure it is ON first (the HELD state is only meaningful over a consent)
    await page.goto(`${LOCAL}/profile/notifications`, { waitUntil: "load", timeout: 90_000 }); await sleep(2000);
    const sms = page.getByRole("switch", { name: /SMS|短信/ });
    if ((await sms.count()) && !(await sms.first().isDisabled().catch(() => true)) && (await sms.first().getAttribute("aria-checked")) !== "true") { await sms.first().click({ timeout: 5000 }).catch(() => {}); await sleep(2500); }
    const b = await page.request.post(`${LOCAL}/api/dev-test/marketing-consent-seed?do=break`);
    note({ where: "local", seed: "break", loc, status: b.status(), body: (await b.text()).slice(0, 200) });
    await shoot("held");
    // PAUSED is not photographed: it needs a real 1-hour break to end (end-break answers 410 by design).

    await shoot("unreadable", `${LOCAL}/profile/notifications?qa_consent=unreadable`);
    await ctx.close();
  }
}

// Help FAQ 5 opened, RG §3 and Privacy §1 — the zh/sw line-breaking fixes.
async function publicDetail(browser) {
  for (const loc of ["sw", "en", "zh"]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: LOCAL }]);
    const page = await ctx.newPage();
    await page.goto(`${LOCAL}/help`, { waitUntil: "load", timeout: 90_000 }); await sleep(1200);
    const faq = page.locator("details", { has: page.locator('a[href="tel:0800110011"]') });
    const nf = await faq.count().catch(() => 0);
    if (nf) { await faq.first().locator("summary").click(); await sleep(600); }
    const faqText = nf ? await faq.first().innerText().catch(() => "") : "";
    await tile(page, `local-help-faq5-${loc}-360`, nf ? faq.first().locator('a[href="tel:0800110011"]') : null);
    note({ where: "local", page: "/help FAQ5 open", loc, found: nf, text: faqText.replace(/\s+/g, " ").slice(0, 400) });
    for (const [path, n, tag] of [["/legal/responsible-gambling", "3", "rg-s3"], ["/legal/responsible-gambling", "2", "rg-s2"], ["/legal/privacy", "1", "privacy-s1"]]) {
      await page.goto(`${LOCAL}${path}`, { waitUntil: "load", timeout: 90_000 }); await sleep(1000);
      const h = page.locator("h2", { hasText: new RegExp(`^\\s*${n}\\.`) });
      const txt = await h.first().locator("xpath=ancestor::section[1]").innerText().catch(() => "");
      await tile(page, `local-${tag}-${loc}-360`, h);
      note({ where: "local", page: `${path} §${n}`, loc, text: txt.replace(/\s+/g, " ").slice(0, 500) });
    }
    await ctx.close();
  }
}

const browser = await chromium.launch();
let dev = null;
try {
  if (which === "all" || which === "prod") await prod(browser);
  if (which === "all" || which === "local" || which === "local-rest" || which === "tail") {
    await new Promise((r) => stub.listen(3999, "127.0.0.1", r));
    try { await fetch(LOCAL + "/", { signal: AbortSignal.timeout(2000) }); console.log("PORT 3043 ALREADY IN USE — refusing"); process.exit(2); } catch {}
    const env = {
      ...process.env,
      SESSION_SECRET: "e2e-local-render-proof-session-secret-0123456789",
      OTP_PEPPER: "e2e-local-pepper-0123",
      DISABLE_ADMIN_TOTP: "true",
      SMS_PROVIDER: "blackball",
      SMS_SENDER_ID: "50pick",
      BLACKBALL_CLIENT_ID: "stub-client",
      BLACKBALL_CLIENT_SECRET: "stub-secret",
      BLACKBALL_API_URL: "http://127.0.0.1:3999/api/sms/send",
      SMS_BALANCE_TTL_MS: "90000",
    };
    delete env.DATABASE_URL;
    dev = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3043"], { env, stdio: "ignore" });
    for (let i = 0; i < 90; i++) { try { if ((await fetch(LOCAL + "/")).status === 200) break; } catch {} await sleep(4000); }
    // Warm the admin route so the first measured render is not a compile.
    await fetch(LOCAL + "/admin/system").catch(() => {});
    if (which !== "local-rest" && which !== "tail") {
      await new Promise((resolve) => {
        const d = spawn(process.execPath, ["scripts/live/marketing-u8-optout-drive.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
        let out = ""; d.stdout.on("data", (c) => (out += c)); d.stderr.on("data", (c) => (out += c));
        d.on("close", (code) => { writeFileSync(`${OUT}/u8-local.log`, out); note({ where: "local", page: "/s/<token> (U8 drive)", exit: code, tail: out.trim().split("\n").slice(-2).join(" | ") }); resolve(); });
      });
    }
    if (which !== "tail") { await player(browser); await playerOn(browser); }
    await consentStates(browser);
    await publicDetail(browser);
    // Each failure is remembered for 30 s by design, so every state after a failure waits it out.
    stubMode = { mode: "down", balance: 0 };
    await adminState(browser, "unknown-unreachable");
    await sleep(32_000); stubMode = { mode: "refused", balance: 0 };
    await adminState(browser, "refused");
    await sleep(32_000); stubMode = { mode: "slow", balance: 185 };
    await adminState(browser, "pending");
    await sleep(9_000); stubMode = { mode: "ok", balance: 185 };
    await adminState(browser, "healthy-185");
    await sleep(62_000); stubMode = { mode: "ok", balance: 1234567 };
    await adminState(browser, "seven-figures");
    await sleep(62_000); stubMode = { mode: "ok", balance: 120 };
    await adminState(browser, "below-alert-120");
    await sleep(62_000); stubMode = { mode: "ok", balance: 30 };
    await adminState(browser, "below-floor-30");
    // A reading exists, then the vendor stops answering: first inside the 90 s TTL, then past it.
    stubMode = { mode: "down", balance: 0 }; await sleep(62_000);
    await adminState(browser, "unconfirmed-within-ttl");
    await sleep(40_000);
    await adminState(browser, "stale-after-failure");
    note({ where: "local", vendorBalanceReads: balanceReads, sendRequests: sends });
  }
} finally {
  await browser.close();
  dev?.kill();
  stub.close();
  writeFileSync(`${OUT}/capture-${which}.json`, JSON.stringify(log, null, 1));
}
if (badShots.length) { console.log("!! CAPTURE INVALID — " + badShots.join(", ")); process.exit(3); }
process.exit(0);
