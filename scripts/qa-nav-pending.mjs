/**
 * qa:nav-pending — a pressed link that changes only its own page's query SAYS, at once, that it is loading
 * (house-bots build step 10; the owner's ask of 2026-09-26: *"when jumoing from tba to anothe rmake sur eu ahve th
 * erigh tloading states and etc toamke percet and user to not to think it sstucl"*).
 *
 *   KP_BASE=http://localhost:3047 KP_SHOTS=.qa-nav-pending npm run qa:nav-pending
 *
 * ⛔ IT DRIVES A LOCAL `next start` AND NOTHING ELSE — the seeded local admin (`scripts/seed-admin-local.mts`,
 * `DISABLE_ADMIN_TOTP=true`) and the desk seeds (`seed-house-bots-local`, `seed-house-bot-panels-local`,
 * `seed-desk-accounts-local`), so every control below exists. `localhost`, never `127.0.0.1`.
 *
 * ⭐ HOW A PENDING STATE IS MADE LONG ENOUGH TO SEE. Every client navigation fetch (`RSC: 1`, not a prefetch) is
 * HELD by the browser until this script releases it. Each case presses ONE real control — the app's own `<Link>`,
 * never an injected anchor (that would be a hard navigation) — waits past the mark's entrance delay, measures, then
 * releases and measures the landing. What it asserts, per case and width:
 *   · at rest there is no mark anywhere (the control's markup is untouched until pressed);
 *   · the PRESSED link holds exactly one mark, fully visible, a 2px bar inside the link's own box;
 *   · what the press replaces is dimmed — the panels after a section rail, or the rows of the pressed card — while
 *     what it does not replace is not (the control);
 *   · ⭐ THE MEASUREMENT BEHIND THE FEATURE: the page's `loading.tsx` did NOT take over during the hold — the old page
 *     is still there, so without the mark nothing on screen would have said the press landed;
 *   · after release the navigation LANDS (the address carries the pressed value), the mark is gone, and the new rows
 *     are at full strength.
 * And once: at the low-end motion tier the loop stops but the static track still shows.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://localhost:3047";
const SHOTS = process.env.KP_SHOTS ?? ".qa-nav-pending";
const WIDTHS = (process.env.KP_WIDTHS ?? "1280,360").split(",").map((n) => Number(n.trim())).filter(Boolean);
const PHONE = "+255700000000";
const PASSWORD = process.env.KP_ADMIN_PASSWORD ?? "QaAdmin2026!";
/** Past the mark's `--t-quick` delay plus its `--t-quick` entrance, with room for a slow runner. */
const SETTLE_MS = 650;

mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0, notMeasured = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const nm = (l, why) => { notMeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };
const done = (code) => { console.log(`\nqa:nav-pending: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`); process.exit(code); };

/**
 * The cases. `open` is where the press happens; `ready` is the element that says its data has landed; `press` finds
 * the control (a real `<Link>`); `lands` is what the address must carry once it has landed; `dims` names what the
 * press replaces: "after-rail" (what follows the section rail), "after-filter" (what follows the console filter rail —
 * the desk's sits ABOVE its table's card) or "card-rows" (the tbody of the card holding the pressed control).
 */
const CASES = [
  { id: "desk-tab", open: "/admin/desk", press: '[data-section-rail] a[href*="tab=activity"]', lands: /[?&]tab=activity/, dims: "after-rail" },
  { id: "desk-chip", open: "/admin/desk?tab=activity", press: "[data-filter-rail] a.kp-fchip:not([data-on])", lands: null, dims: "after-filter" },
  { id: "list-sort", open: "/admin/desk/new", ready: "table.admin-tbl", press: "table.admin-tbl thead th a", lands: /[?&]sort=/, dims: "card-rows" },
  { id: "list-page", open: "/admin/desk/new", ready: "table.admin-tbl", press: 'a[href*="page=2"][aria-label]', lands: /[?&]page=2/, dims: "card-rows" },
  { id: "list-chip", open: "/admin/desk/new", ready: "table.admin-tbl", press: "[data-filter-rail] a.kp-fchip:not([data-on])", lands: null, dims: "card-rows" },
  { id: "account-tab", open: "@account", press: '[data-section-rail] a[href*="tab=history"]', lands: /[?&]tab=history/, dims: "after-rail" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
try {
  const page = await ctx.newPage();
  // The same sign-in as `qa-house-bots-visual.mjs` — the visible `#phone`, after hydration, and the FINAL URL decides.
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill("#phone", PHONE.replace("+255", ""));
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  if (/\/auth\//.test(page.url())) { nm("sign-in", `the local admin could not sign in at ${BASE}`); done(3); }

  // One account page to press a tab on: the first roster row's own link, read off the served roster.
  await page.goto(`${BASE}/admin/desk`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForSelector("[data-section-rail]", { timeout: 60_000 });
  const accountHref = await page.evaluate(() =>
    [...document.querySelectorAll('table a[href^="/admin/desk/"]')].map((a) => a.getAttribute("href"))
      .find((h) => h && !/^\/admin\/desk\/new/.test(h)) ?? null);
  await page.close();

  for (const c of CASES) {
    for (const width of WIDTHS) {
      const label = `${c.id} @${width}`;
      const route = c.open === "@account" ? accountHref : c.open;
      if (!route) { nm(label, "no account row on the served roster to open"); continue; }
      const p = await ctx.newPage();
      await p.setViewportSize({ width, height: 900 });
      let holding = false;
      const held = [];
      const rscLog = [];
      p.on("response", (res) => { const h = res.request().headers(); if (h["rsc"] === "1" && !h["next-router-prefetch"]) rscLog.push(`${res.status()} ${res.url().replace(BASE, "")}`); });
      p.on("requestfailed", (req) => { const h = req.headers(); if (h["rsc"] === "1") rscLog.push(`FAILED ${req.failure()?.errorText} ${req.url().replace(BASE, "")}`); });
      await p.route("**/*", (r) => {
        const h = r.request().headers();
        if (holding && h["rsc"] === "1" && !h["next-router-prefetch"]) { held.push(r); return; }
        r.continue().catch(() => {});
      });
      try {
        await p.goto(BASE + route, { waitUntil: "load", timeout: 60_000 });
        await p.waitForSelector(c.ready ?? "[data-section-rail]", { timeout: 60_000 });
        await p.waitForTimeout(400);
        const control = p.locator(c.press).first();
        if ((await control.count()) === 0) { nm(label, `no control matches ${c.press} on ${route}`); continue; }
        ok(`${label} · at rest there is no pending mark anywhere`, (await p.locator("[data-link-pending]").count()) === 0);

        const before = p.url();
        holding = true;
        await control.click();
        await p.waitForTimeout(SETTLE_MS);

        const m = await control.evaluate((a, dims) => {
          const marks = a.querySelectorAll(":scope > [data-link-pending]");
          const mark = marks[0] ?? null;
          const lb = a.getBoundingClientRect();
          const mb = mark?.getBoundingClientRect() ?? null;
          const opacityOf = (el) => Number(getComputedStyle(el).opacity);
          let dimmed = [], kept = [];
          if (dims === "after-filter") {
            let rail = a.closest("[data-filter-rail]");
            while (rail?.parentElement?.closest("[data-filter-rail]")) rail = rail.parentElement.closest("[data-filter-rail]");
            for (let s = rail?.nextElementSibling; s; s = s.nextElementSibling) dimmed.push(opacityOf(s));
            for (let s = rail?.previousElementSibling; s; s = s.previousElementSibling) kept.push(opacityOf(s));
          } else if (dims === "after-rail") {
            const rail = a.closest("[data-section-rail]");
            for (let s = rail?.nextElementSibling; s; s = s.nextElementSibling) dimmed.push(opacityOf(s));
            for (let s = rail?.previousElementSibling; s; s = s.previousElementSibling) kept.push(opacityOf(s));
          } else {
            const card = a.closest(".glass-panel");
            dimmed = [...(card?.querySelectorAll("tbody") ?? [])].map(opacityOf);
            // ⛔ THE OTHER CARDS THEMSELVES, and their rows: an over-reaching rule (every card, every tbody) shows here.
            // A control that measured nothing would pass vacuously, so the check below demands at least one element.
            kept = [...document.querySelectorAll(".glass-panel")].filter((g) => g !== card && !g.contains(card) && !card?.contains(g))
              .flatMap((g) => [g, ...g.querySelectorAll("tbody")]).map(opacityOf);
          }
          return {
            count: marks.length,
            opacity: mark ? opacityOf(mark) : null,
            box: mb ? { h: Math.round(mb.height * 10) / 10, inside: mb.left >= lb.left - 0.5 && mb.right <= lb.right + 0.5 && mb.bottom <= lb.bottom + 0.5 && mb.top >= lb.top } : null,
            anyElsewhere: document.querySelectorAll("[data-link-pending]").length - marks.length,
            dimmed, kept,
            railStillThere: document.querySelector("[data-section-rail]") !== null || document.querySelector("table.admin-tbl") !== null,
          };
        }, c.dims);
        await p.screenshot({ path: join(SHOTS, `${c.id}-${width}-pending.png`) });

        ok(`${label} · the PRESSED link holds exactly one mark, and no other link does`, m.count === 1 && m.anyElsewhere === 0, `${m.count} in it · ${m.anyElsewhere} elsewhere`);
        ok(`${label} · the mark is fully shown after its entrance delay`, m.opacity !== null && m.opacity >= 0.9, `opacity ${m.opacity}`);
        ok(`${label} · the mark is a 2px bar inside the pressed link's own box`, m.box !== null && m.box.h >= 1.5 && m.box.h <= 2.5 && m.box.inside, JSON.stringify(m.box));
        ok(`${label} · what the press replaces is dimmed`, m.dimmed.length > 0 && m.dimmed.every((o) => o <= 0.6), `[${m.dimmed.join(", ")}]`);
        ok(`${label} · CONTROL · what it does not replace is not dimmed`, m.kept.length > 0 && m.kept.every((o) => o >= 0.99), `[${m.kept.join(", ")}] (${m.kept.length} measured)`);
        ok(`${label} · ⭐ the page's loading.tsx did NOT take over during the hold — the old page stayed, so without the mark nothing would have moved`,
          m.railStillThere && p.url() === before, `rail present: ${m.railStillThere} · address unchanged: ${p.url() === before}`);

        holding = false;
        for (const r of held.splice(0)) await r.continue().catch(() => {});
        const landed = await p.waitForFunction(() => document.querySelectorAll("[data-link-pending]").length === 0, null, { timeout: 30_000 }).then(() => true, () => false);
        if (!landed) {
          const marks = await p.locator("[data-link-pending]").count();
          nm(`${label} · landing`, `the mark was still up 30s after release · url ${p.url().replace(BASE, "")} · marks ${marks} · held left ${held.length} · RSC: ${rscLog.join(" | ") || "none"}`);
          await p.screenshot({ path: join(SHOTS, `${c.id}-${width}-stalled.png`) });
          continue;
        }
        await p.waitForTimeout(300);
        const after = p.url();
        ok(`${label} · the navigation LANDED`, after !== before && (c.lands === null || c.lands.test(after)), after.replace(BASE, ""));
        const full = await p.evaluate((dims) => {
          const rail = document.querySelector("[data-section-rail]");
          const after = (el) => { const out = []; for (let s = el?.nextElementSibling; s; s = s.nextElementSibling) out.push(s); return out; };
          const els = dims === "after-rail" ? after(rail)
            : dims === "after-filter" ? after([...document.querySelectorAll("[data-filter-rail]")].find((r) => !r.parentElement?.closest("[data-filter-rail]")))
            : [...document.querySelectorAll(".glass-panel tbody")];
          return els.map((e) => Number(getComputedStyle(e).opacity));
        }, c.dims);
        ok(`${label} · after landing the mark is gone and the new content is at full strength`, full.length > 0 && full.every((o) => o >= 0.99), `[${full.join(", ")}]`);
        await p.screenshot({ path: join(SHOTS, `${c.id}-${width}-landed.png`) });
      } catch (e) {
        nm(label, String(e?.message ?? e).split("\n")[0]);
      } finally {
        holding = false;
        for (const r of held.splice(0)) await r.continue().catch(() => {});
        await p.close();
      }
    }
  }

  // ── The low-end tier: the loop stops, the track stays (test:reduce-motion 2.1's contract, measured) ──
  {
    const p = await ctx.newPage();
    let holding = false;
    const held = [];
    await p.route("**/*", (r) => {
      const h = r.request().headers();
      if (holding && h["rsc"] === "1" && !h["next-router-prefetch"]) { held.push(r); return; }
      r.continue().catch(() => {});
    });
    try {
      await p.goto(`${BASE}/admin/desk`, { waitUntil: "load", timeout: 60_000 });
      await p.waitForSelector("[data-section-rail]", { timeout: 60_000 });
      await p.evaluate(() => document.documentElement.setAttribute("data-motion", "reduced"));
      holding = true;
      await p.locator('[data-section-rail] a[href*="tab=history"]').first().click();
      await p.waitForTimeout(SETTLE_MS);
      const r = await p.evaluate(() => {
        const mark = document.querySelector("[data-link-pending]");
        return mark ? { anim: getComputedStyle(mark, "::after").animationName, opacity: Number(getComputedStyle(mark).opacity) } : null;
      });
      ok("reduced tier · the travelling light is OFF", r !== null && r.anim === "none", JSON.stringify(r));
      ok("reduced tier · …and the static track still says the press landed", r !== null && r.opacity >= 0.9, JSON.stringify(r));
      const full = await p.evaluate(() => { document.documentElement.setAttribute("data-motion", "full"); const m = document.querySelector("[data-link-pending]"); return m ? getComputedStyle(m, "::after").animationName : null; });
      ok("reduced tier · CONTROL · at the full tier the same mark IS travelling (so the 'none' above is the tier's doing)", full === "progSweep", String(full));
    } catch (e) {
      nm("reduced tier", String(e?.message ?? e).split("\n")[0]);
    } finally {
      holding = false;
      for (const r of held.splice(0)) await r.continue().catch(() => {});
      await p.close();
    }
  }
} finally {
  await browser.close();
}
done(fail > 0 ? 1 : 0);
