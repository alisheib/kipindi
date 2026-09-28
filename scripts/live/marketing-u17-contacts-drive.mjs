/**
 * U17 · /admin/contacts — the doors, driven and MEASURED.
 *
 * WHAT THIS PROVES, and what it deliberately does not:
 *   · a session that holds `growth` REACHES the page and reads "Contacts" (doors 1-3b);
 *   · a staff role with no `growth` grant is REFUSED on the page itself (door 3b, the belt a
 *     flight request cannot skip);
 *   · the loading ghost's box height EQUALS the real block's, at both widths — U17's Accept.
 *     |- That equality is the one claim no suite in this repo can make: every guard U17 names
 *     greps zero times for "loading", and `measure-system` section 3 excludes /admin by design
 *     and compares the measure TIER, never a height. So it is measured HERE or it is unverified.
 *   · It does NOT prove `populated` or `error`. There is no `MarketingContact` store until U18
 *     and no loader that can fail, so those two states are U20's. Stated, not dressed up.
 *
 * The ghost is held still by DELAYING the flight request for the route and driving a CLIENT-SIDE
 * navigation into it — a hard load would race the skeleton away and the shot would freeze
 * whichever frame won.
 *
 * Run: BASE=http://localhost:3009 node scripts/live/marketing-u17-contacts-drive.mjs
 * Boot the host first (in-memory, zero prod risk, and remove .next before it — a stale .next
 * 404s every /api/dev-test route):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> npx next dev -p 3009
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3009";
const SHOTS = join(".qa-shots", "marketing-setup", "u17");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();

/** Mint a staff session of `role` in a fresh context. */
async function staffCtx(role, phone, viewport, reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", {
    data: { role, phone, name: `QA ${role}` },
  });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  return { ctx, page };
}

/** The box both states must agree on: the ghost, or the real empty state. */
const boxOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      h: Math.round(r.height * 100) / 100,
      w: Math.round(r.width * 100) / 100,
    };
  }, selector);

const headOf = (page) =>
  page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const gloss = h1?.parentElement?.querySelector("p");
    return { h1: h1?.textContent?.trim() ?? "", gloss: gloss?.textContent?.trim() ?? "" };
  });

/** Hold the ghost still, then measure it and the real block that replaces it. */
async function ghostThenReal(page, label, shotPrefix) {
  // HOW THE GHOST IS HELD STILL, and the two ways that do NOT work — all three measured on this
  // host, because the first two each reported the ghost as `null` at every width:
  //   1. delaying the RSC navigation request fails. `next dev` does not prefetch, so the router
  //      holds no shell for the segment; with the whole response delayed the client has nothing
  //      to render and simply keeps the PREVIOUS page on screen until the payload lands.
  //   2. a hard navigation fails too: nothing this page awaits is slow (the gate reads an
  //      in-memory session), so the real block was already on screen at the first 50ms sample,
  //      0 of 120 frames showed a ghost.
  //   3. THIS works — delay the page segment's own client CHUNK. The shell, which is where
  //      `loading.tsx` lives, arrives and paints; the page cannot take over until its chunk
  //      does. That is exactly what a slow connection does to a real operator, which is the
  //      condition `loading.tsx` exists for. Measured: the ghost held for 46 of 48 frames.
  await page.route("**src_app_admin_contacts_page_tsx**", async (route) => {
    await wait(5000);
    await route.continue();
  });
  await page.goto(BASE + "/admin/bonuses", { waitUntil: "domcontentloaded" });
  await wait(2500);
  // The anchor is in the DOM at both widths — at 360 it sits in the CLOSED drawer (measured:
  // count 1, visible 0), and a JS click still runs Next's <Link> handler, so this is one code
  // path for both widths rather than a width-dependent branch.
  // ⛔ WAIT FOR IT, AND NEVER FALL BACK SILENTLY. An earlier version did `if (a) a.click(); else
  // location.href = …`, and at 360 the drawer is mounted lazily: when it had not mounted yet the
  // fallback quietly performed a HARD navigation, which shows no ghost at all (measured: 0 of 120
  // frames). The run then reported the ghost as `null` about one time in three — a flake that was
  // the INSTRUMENT changing the experiment, not the product. If the anchor never arrives that is
  // a finding about the nav, so it fails loudly here instead.
  const anchor = await page
    .waitForSelector('a[href="/admin/contacts"]', { state: "attached", timeout: 15000 })
    .catch(() => null);
  ok(`${label} · the Contacts nav anchor is in the DOM to click`, !!anchor);
  if (!anchor) return { ghost: null, real: null, delta: null };
  await page.evaluate(() => document.querySelector('a[href="/admin/contacts"]').click());
  await page.waitForSelector('[data-skeleton="contacts-empty"]', { timeout: 15000 }).catch(() => {});
  const ghost = await boxOf(page, '[data-skeleton="contacts-empty"]');
  ok(`${label} · the ghost is on screen with a real rectangle`, !!ghost && ghost.h > 0, JSON.stringify(ghost));
  // THE DISCRIMINATOR. An earlier version asserted the ghost's <h1> read "Contacts / Anwani" and
  // PASSED while the ghost was null — because `AdminPageHead` renders in the loader AND in the
  // page, so that assertion could not tell the two apart. What distinguishes them is that the
  // real block is NOT on screen yet.
  const realYet = await boxOf(page, '[data-empty-state="fill"]');
  ok(`${label} · it is really the LOADING state — the real block is not on screen yet`, realYet === null, JSON.stringify(realYet));
  await page.screenshot({ path: join(SHOTS, `${shotPrefix}-loading.png`), fullPage: true });

  await page.unroute("**/admin/contacts**");
  await page.waitForSelector('[data-empty-state="fill"]', { timeout: 20000 });
  await wait(600);
  const real = await boxOf(page, '[data-empty-state="fill"]');
  ok(`${label} · the real empty block has a rectangle`, !!real && real.h > 0, JSON.stringify(real));
  await page.screenshot({ path: join(SHOTS, `${shotPrefix}-empty.png`), fullPage: true });

  const delta = ghost && real ? Math.round((ghost.h - real.h) * 100) / 100 : null;
  console.log(`       ghost ${ghost?.h}px   real ${real?.h}px   delta ${delta}px`);
  return { ghost: ghost?.h ?? null, real: real?.h ?? null, delta };
}

const measured = {};
const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "360x780", width: 360, height: 780 },
];

for (const vp of VIEWPORTS) {
  console.log(`\n[u17] ${vp.name}`);
  const viewport = { width: vp.width, height: vp.height };
  const { ctx, page } = await staffCtx("GROWTH", "+255700000017", viewport);

  // The UA MUST say HeadlessChrome — the platform's own counters exclude automation by UA, and a
  // drive that hides what it is pollutes the very figures this programme reports on.
  const ua = await page.evaluate(() => navigator.userAgent);
  ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(ua), ua.slice(0, 80));

  measured[vp.name] = await ghostThenReal(page, vp.name, vp.name);
  ok(
    `${vp.name} · the ghost's height equals the real block within 1px`,
    measured[vp.name].delta !== null && Math.abs(measured[vp.name].delta) <= 1,
    `${measured[vp.name].delta}px`,
  );

  const head = await headOf(page);
  ok(`${vp.name} · the page reads "Contacts" with the shipped gloss "Anwani"`, head.h1 === "Contacts" && head.gloss === "Anwani", JSON.stringify(head));
  const bodyText = await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? "");
  ok(`${vp.name} · the empty state says what it is`, /No contacts yet/i.test(bodyText), bodyText.slice(0, 90));
  ok(`${vp.name} · it promises nothing it cannot do`, !/coming soon|will be able|shortly/i.test(bodyText));

  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  ok(`${vp.name} · no horizontal overflow`, overflow === 0, `${overflow}px`);
  await ctx.close();

  // REFUSED · a staff role with no growth grant, refused BY THE PAGE.
  const r2 = await staffCtx("SUPPORT", "+255700000018", viewport);
  await r2.page.goto(BASE + "/admin/contacts", { waitUntil: "domcontentloaded" });
  await wait(2500);
  const refusedText = await r2.page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? "");
  ok(`${vp.name} · SUPPORT is REFUSED on /admin/contacts`, /Restricted/.test(refusedText), refusedText.slice(0, 90));
  ok(`${vp.name} · the refusal names what is needed`, /access|Owner \(ADMIN\) only|staff sign-in/.test(refusedText), refusedText.slice(0, 120));
  await r2.page.screenshot({ path: join(SHOTS, `${vp.name}-refused.png`), fullPage: true });
  await r2.ctx.close();
}

// reduced motion, at the narrow width, where the ghost pulses.
console.log(`\n[u17] prefers-reduced-motion: reduce (360x780)`);
{
  const { ctx, page } = await staffCtx("GROWTH", "+255700000019", { width: 360, height: 780 }, "reduce");
  const reduced = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  ok(`reduced-motion · the context really is reduced-motion`, reduced === true);
  measured["360x780-reduced"] = await ghostThenReal(page, "reduced-motion", "360x780-reduced");
  ok(
    `reduced-motion · the heights still agree within 1px`,
    measured["360x780-reduced"].delta !== null && Math.abs(measured["360x780-reduced"].delta) <= 1,
    `${measured["360x780-reduced"].delta}px`,
  );
  await ctx.close();
}

await browser.close();
console.log(`\nMEASURED ${JSON.stringify(measured)}`);
console.log(`\nu17-contacts-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
