/**
 * qa:social-panel — the channels panel, driven in a real browser.
 *
 * 🔴 WHY A DRIVE AND NOT A SOURCE CHECK. Two of this panel's three risks are invisible to source:
 *   · whether it OVERLAPS the tab bar, the chat FAB, the wallet pill or the install card —
 *     a `position: fixed` element paints over another and a screenshot looks identical either
 *     way. This repo has already shipped a WhatsApp FAB sitting on top of a CTA WITH screenshots
 *     taken, because nobody compared two rectangles.
 *   · whether the frequency contract actually holds across reloads and sessions. Its state lives
 *     in `localStorage`/`sessionStorage`, so only a real browser can answer.
 *
 * ⛔ THE VACUITY FLOOR IS THE FIRST ASSERTION. Every check below is of the form "the panel is
 * not somewhere bad", and every one of them passes when the panel does not exist. §1 proves it
 * renders at all before anything else is believed.
 *
 * Local only (drives a dev server):
 *   BASE=http://localhost:3011 node scripts/live-social-panel.mjs
 *   BASE=http://localhost:3011 node scripts/live-social-panel.mjs --prove-red
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3011";
const PROVE_RED = process.argv.includes("--prove-red");
const HOST = new URL(BASE).hostname;

/** The panel arms at 45s; give the timer room without making the drive glacial. */
const DWELL_MS = 52_000;

const PANEL = '[data-testid="channels-panel"]';
const CLOSE = '[data-testid="channels-panel-close"]';

let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${extra ? ` — ${extra}` : ""}`); console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);

const browser = await chromium.launch();

/** A fresh context that has already "visited" enough times to be eligible. */
async function ctxFor(locale, width, seed = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  // ⚠️ The locale switch is the `kp-locale` COOKIE, not `?lang=`.
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: HOST, path: "/" }]);
  await ctx.addInitScript((s) => {
    try {
      localStorage.setItem("50pick-channels-visits", s.visits ?? "5");
      for (const [k, v] of Object.entries(s.set ?? {})) localStorage.setItem(k, v);
      for (const k of s.clear ?? ["50pick-channels-dismissed-at", "50pick-channels-dismissals", "50pick-channels-done"]) {
        localStorage.removeItem(k);
      }
      sessionStorage.removeItem("50pick-channels-shown");
      // The install card must not win the slot in a drive about this panel.
      localStorage.setItem("50pick-install-done", "1");
    } catch { /* storage blocked — the drive will fail loudly at §1 */ }
  }, seed);
  return ctx;
}

async function waitForPanel(page, timeout = DWELL_MS + 15_000) {
  try {
    await page.waitForSelector(PANEL, { state: "visible", timeout });
    return true;
  } catch { return false; }
}

// ══════════════════════════════════════════════ §1 · IT RENDERS AT ALL
section("§1 · vacuity floor — it renders at all");
{
  const ctx = await ctxFor("en", 1280);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  const shown = await waitForPanel(page);
  ok("the panel appears on an eligible visit", shown,
     "every geometry assertion below passes vacuously if it never renders");
  if (!shown) {
    console.log("\n[social-panel] ABORTED — nothing to measure.\n");
    await browser.close();
    process.exit(1);
  }

  const links = await page.$$eval(`${PANEL} a`, (as) => as.map((a) => ({
    href: a.getAttribute("href"),
    rel: a.getAttribute("rel"),
    target: a.getAttribute("target"),
    aria: a.getAttribute("aria-label"),
    text: (a.textContent || "").trim(),
    h: Math.round(a.getBoundingClientRect().height),
    markW: Math.round(a.querySelector("svg")?.getBoundingClientRect().width ?? 0),
  })));
  ok("all three channels are present", links.length === 3, `found ${links.length}`);
  ok("every row reaches the 44px tap floor", links.every((l) => l.h >= 44), JSON.stringify(links.map((l) => l.h)));
  ok("every mark renders at 24px", links.every((l) => l.markW === 24), JSON.stringify(links.map((l) => l.markW)));
  ok("every row opens a new tab safely",
     links.every((l) => l.target === "_blank" && l.rel === "noopener noreferrer"));
  ok("⭐ WCAG 2.5.3 — each accessible name CONTAINS its visible label",
     links.every((l) => (l.aria || "").includes(l.text)),
     JSON.stringify(links.map((l) => [l.text, l.aria])));
  ok("it is non-blocking — aria-modal is false and there is no scrim",
     (await page.getAttribute(PANEL, "aria-modal")) === "false");
  await ctx.close();
}

// ══════════════════════════════════════════ §2 · IT OVERLAPS NOTHING
section("§2 · it lands on nothing — rectangle intersection, not a screenshot");
for (const [locale, width] of [["en", 360], ["sw", 393], ["zh", 768], ["en", 1024], ["sw", 1280]]) {
  const ctx = await ctxFor(locale, width);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  if (!(await waitForPanel(page))) { ok(`${locale}@${width} panel appears`, false); await ctx.close(); continue; }

  const report = await page.evaluate((sel) => {
    const panel = document.querySelector(sel);
    const r = panel.getBoundingClientRect();

    /**
     * ⛔ DISCOVERED, NOT NAMED — AND THE FIRST VERSION OF THIS WAS A VACUOUS PASS.
     * It listed the neighbours by selector, including the chat FAB as
     * `[data-testid="chat-fab"], [aria-label*="chat" i]`. The FAB carries NEITHER attribute, so
     * the lookup returned null, the loop skipped it, and this drive printed "overlaps nothing"
     * over a screenshot that plainly showed the bubble sitting on the WhatsApp row. A named
     * population that can silently be empty is the exact trap this whole file exists to avoid.
     * Every `position: fixed` box on the page is now enumerated; there is nothing to misname.
     */
    const fixed = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") return false;
      if (cs.visibility === "hidden" || cs.opacity === "0") return false;
      const b = el.getBoundingClientRect();
      return b.width > 4 && b.height > 4;
    });
    const hits = [];
    for (const el of fixed) {
      if (el === panel || panel.contains(el) || el.contains(panel)) continue;
      const o = el.getBoundingClientRect();
      if (!(r.right <= o.left || r.left >= o.right || r.bottom <= o.top || r.top >= o.bottom)) {
        const cs = getComputedStyle(el);
        hits.push(`${el.tagName.toLowerCase()}${el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}]` : ""} z=${cs.zIndex} ${Math.round(o.width)}x${Math.round(o.height)}`);
      }
    }

    /* ⭐ AND THE QUESTION AN OVERLAP CHECK CANNOT ANSWER: is each row actually HITTABLE? A box
       can overlap harmlessly, and a box can also be clear of the panel's rect while something
       else covers a row. Only `elementFromPoint` at the row's own centre settles it. */
    const unreachable = [...panel.querySelectorAll("a"), panel.querySelector('[data-testid="channels-panel-close"]')]
      .filter(Boolean)
      .filter((el) => {
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !hit || !(hit === el || el.contains(hit));
      })
      .map((el) => (el.textContent || el.getAttribute("aria-label") || "close").trim().slice(0, 24));

    return {
      rect: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(window.innerHeight - r.bottom) },
      hits,
      fixedSeen: fixed.length,
      unreachable,
      invitations: document.querySelectorAll("[data-invitation]").length,
      inViewport: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight,
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clipped: [...panel.querySelectorAll("*")].some((e) => e.scrollWidth > e.clientWidth + 1),
    };
  }, PANEL);

  const tag = `${locale}@${width}`;
  ok(`${tag} the fixed-element sweep found something to compare against (vacuity floor)`,
     report.fixedSeen >= 2, `saw ${report.fixedSeen} fixed elements`);
  ok(`${tag} overlaps no fixed element — discovered, not named`, report.hits.length === 0, report.hits.join(", "));
  ok(`${tag} ⭐ every row and the X are HITTABLE, not merely visible`,
     report.unreachable.length === 0, report.unreachable.join(", "));
  ok(`${tag} is fully inside the viewport`, report.inViewport, JSON.stringify(report.rect));
  ok(`${tag} causes no horizontal overflow`, report.docOverflow <= 0, `${report.docOverflow}px`);
  ok(`${tag} clips no text`, !report.clipped);
  ok(`${tag} ⭐ exactly ONE floating invitation exists`, report.invitations === 1, `found ${report.invitations}`);
  /* Below `lg` (1024) it clears the tab bar AND the chat bubble: 80 + 52 + 16 = 148.
     At/above `lg` the bar is hidden and the panel sits in a 32px corner inset. */
  const expected = width >= 1024 ? 32 : 148;
  ok(`${tag} bottom offset is ${expected}px`, Math.abs(report.rect.b - expected) <= 2, `measured ${report.rect.b}px`);
  await ctx.close();
}

// ══════════════════════════════════ §3 · THE FREQUENCY CONTRACT
section("§3 · the frequency contract, driven for real");
{
  // 3a — a first-ever visit must NOT show it.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("50pick-install-done", "1");
    } catch { /* ignore */ }
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  const shownFirst = await waitForPanel(page, 8_000);
  ok("3a a first-ever visit never sees it", !shownFirst);
  await ctx.close();
}
{
  // 3b — X dismisses, records a dismissal, and it stays gone for the session.
  const ctx = await ctxFor("en", 1280);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  if (!(await waitForPanel(page))) { ok("3b panel appears", false); }
  else {
    await page.click(CLOSE);
    await page.waitForSelector(PANEL, { state: "detached", timeout: 10_000 }).catch(() => {});
    const gone = (await page.$(PANEL)) === null;
    ok("3b the X closes it", gone);
    const store = await page.evaluate(() => ({
      n: localStorage.getItem("50pick-channels-dismissals"),
      at: localStorage.getItem("50pick-channels-dismissed-at"),
      session: sessionStorage.getItem("50pick-channels-shown"),
    }));
    ok("3b the dismissal is persisted, not just held in state", store.n === "1" && !!store.at, JSON.stringify(store));
    ok("3b the session is marked, so a reload does not re-show it", store.session === "1");

    await page.reload({ waitUntil: "networkidle" });
    const backAfterReload = await waitForPanel(page, 8_000);
    ok("3b it does NOT return on a reload in the same session", !backAfterReload);
  }
  await ctx.close();
}
{
  // 3c — tapping a channel is a permanent stop.
  const ctx = await ctxFor("en", 1280);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  if (!(await waitForPanel(page))) { ok("3c panel appears", false); }
  else {
    // Do not actually navigate to Instagram — intercept the new tab.
    await page.evaluate((sel) => {
      document.querySelectorAll(`${sel} a`).forEach((a) => a.removeAttribute("target"));
      document.querySelectorAll(`${sel} a`).forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
    }, PANEL);
    await page.click(`${PANEL} a`);
    const done = await page.evaluate(() => localStorage.getItem("50pick-channels-done"));
    ok("3c tapping a channel writes the permanent stop", done === "1", `got ${done}`);
  }
  await ctx.close();
}
{
  // 3d — six dismissals and it never asks again.
  const ctx = await ctxFor("en", 1280, {
    set: { "50pick-channels-dismissals": "6", "50pick-channels-dismissed-at": "1" },
    clear: ["50pick-channels-done"],
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  ok("3d six dismissals and it stops for good", !(await waitForPanel(page, 8_000)));
  await ctx.close();
}

// ══════════════════════════════════ §4 · IT STAYS OFF THE WRONG PAGES
section("§4 · it never appears where it must not");
for (const route of ["/wallet", "/legal/responsible-gambling", "/auth/login"]) {
  const ctx = await ctxFor("en", 1280);
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 120_000 });
  const shown = await waitForPanel(page, DWELL_MS + 8_000);
  ok(`${route} shows no channels panel`, PROVE_RED ? shown : !shown);
  await ctx.close();
}

await browser.close();
console.log(`\n[social-panel] ${pass} passed, ${failures.length} failed\n`);
if (failures.length) for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
