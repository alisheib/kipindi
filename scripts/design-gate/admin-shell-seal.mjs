/**
 * `npm run qa:dg-shell` — THE ADMIN SHELL SEAL. DESIGN-GATE-2026-08-28, DG-A-18.
 *
 * 🔴 WHY IT EXISTS: the admin landmark was asserted by NOTHING, while a file was cited as
 * asserting it. `scripts/landmark-seal.mjs` is the PLAYER seal — it contains zero occurrences
 * of "/admin", its route lists are `/wallet /profile /positions …`, and it signs in as a
 * player — yet DG-A-18's close-out quoted it as proof that "one `<main>` per page" already
 * held for the console. It is the programme's signature failure in one citation: a guard
 * named for a population it never visits.
 * ⛔ `scripts/responsive-audit.mjs` DOES assert the landmark properly, and it is not a
 * substitute here: it needs a live local server plus `/api/dev-test/*` (NODE_ENV-gated, 404
 * under `next start`), its ADMIN list holds neither TOTP-exempt route, and when admin
 * coverage is gated it prints a `console.warn` while its own comment argues that a gated
 * admin pass is "FALSE coverage".
 *
 * ⭐ SO THIS ONE RUNS ON PRODUCTION, WHERE THE ADMIN CREDENTIAL ACTUALLY WORKS. Read-only,
 * GET only, one sign-in. It walks the SAME `routes.mjs` population every other design-gate
 * instrument walks — plus the two routes that population has always excluded.
 *
 * 🔴 AND IT INCLUDES THE TWO ROUTES NOBODY MEASURED. `admin/layout.tsx` returns
 * `<>{children}</>` for `TOTP_EXEMPT` ABOVE the shell's `<main>`, so `/admin/totp-verify`
 * and `/admin/2fa/setup` carried no landmark at all — and `ADMIN_ROUTES` contains neither.
 * The two routes without the landmark were exactly the two outside the population.
 * ⚠️ Their `<main>` is BARE by design: no `max-w-console` (they set their own `max-w-md`)
 * and no skip link (there is no nav to skip), so this gate asserts the id, not the shell.
 *
 * Usage:  node scripts/design-gate/admin-shell-seal.mjs
 *         ONLY=/admin/system,/admin/roles   (filter)
 *         SKIP_NAV=1                        (landmarks only, no 390 drawer pass)
 */
import { chromium } from "playwright";
import { loginOnce, BASE } from "../live/harness.mjs";
import { ADMIN_ROUTES } from "./routes.mjs";

/** ⛔ The two the shared population has always excluded — see the header. */
const TOTP_EXEMPT_ROUTES = ["/admin/totp-verify", "/admin/2fa/setup"];
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").filter(Boolean) : null;
const ALL = [...ADMIN_ROUTES, ...TOTP_EXEMPT_ROUTES];
const ROUTES = ONLY ? ALL.filter((r) => ONLY.includes(r)) : ALL;

let fail = 0, probed = 0, revoked = 0;
const bad = [];
const ok = (name, pass, detail) => {
  if (!pass) { fail++; bad.push(`${name} — ${detail}`); }
  return pass;
};

const browser = await chromium.launch();

/* ⛔ THE CONTROL, AND IT RUNS FIRST BECAUSE THE GATE IS WORTHLESS WITHOUT IT.
   Measured 2026-08-29: the SIGN-IN page `/auth/admin` also renders exactly one
   `<main id="main-content">`. So the landmark assertions below would pass, route for route,
   on a drive whose session died at cell 3 — which is precisely how a 44-route drive once
   recorded the sign-in page as data and lost 30 of 44 records. The landmark is NOT what
   distinguishes a real console page from the sign-in page; the URL is. This proves the
   revocation detector fires on a page that is HTTP 200, renders, and has the right landmark. */
{
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const resp = await ap.goto(BASE + "/admin/system", { waitUntil: "load", timeout: 90_000 });
  const seen = await ap.evaluate(() => ({
    path: location.pathname,
    mains: document.querySelectorAll("main").length,
    id: document.querySelector("main") ? document.querySelector("main").id : null,
  }));
  const detected = /\/auth\//.test(seen.path);
  ok("⛔ CONTROL · a signed-OUT /admin/system is detected as revoked", detected,
    `landed on ${seen.path} — if this is not under /auth/ the detector is dead`);
  ok("⛔ CONTROL · …and it would otherwise have PASSED the landmark check", seen.mains === 1 && seen.id === "main-content",
    `mains=${seen.mains} id=${seen.id} — if the sign-in page had no landmark this control proves nothing`);
  console.log(`  CONTROL: signed-out /admin/system → HTTP ${resp.status()} · ${seen.path} · main=${seen.mains} #${seen.id} · revocation ${detected ? "DETECTED" : "MISSED"}`);
  await anon.close();
}

const state = await loginOnce(browser, "admin");
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: state });
const page = await ctx.newPage();

console.log(`\nADMIN SHELL SEAL — ${BASE}  ·  ${ROUTES.length} routes (${ADMIN_ROUTES.length} + ${TOTP_EXEMPT_ROUTES.length} TOTP-exempt)\n`);

for (const route of ROUTES) {
  let resp;
  try { resp = await page.goto(BASE + route, { waitUntil: "load", timeout: 90_000 }); }
  catch (e) { ok(`${route} loads`, false, String(e).slice(0, 90)); continue; }
  await page.waitForTimeout(350);

  /* ⛔ EVERY REVOKED PAGE RETURNS HTTP 200 AND RENDERS. Only the URL tells the truth —
     this programme lost 30 of 44 records once to a drive that believed the status code. */
  if (/\/auth\//.test(page.url())) {
    revoked++;
    const fresh = await loginOnce(browser, "admin");
    await ctx.addCookies(fresh.cookies);
    resp = await page.goto(BASE + route, { waitUntil: "load", timeout: 90_000 });
    await page.waitForTimeout(350);
    if (/\/auth\//.test(page.url())) { ok(`${route} keeps its session`, false, `still ${page.url()}`); continue; }
  }

  const m = await page.evaluate(() => {
    const mains = [...document.querySelectorAll("main")];
    return {
      n: mains.length,
      ids: mains.map((x) => x.id || "(no id)"),
      nested: mains.filter((x) => x.parentElement && x.parentElement.closest("main")).length,
      skip: Boolean(document.querySelector('a[href="#main-content"]')),
      h1: document.querySelectorAll("h1").length,
    };
  });
  probed++;
  const exempt = TOTP_EXEMPT_ROUTES.includes(route);
  ok(`${route} exactly one <main>`, m.n === 1,
    m.n === 0 ? "NO <main> — the landmark is gone" : `${m.n}: ${m.ids.join(" | ")}`);
  ok(`${route} the <main> is #main-content`, m.n === 1 && m.ids[0] === "main-content" && m.nested === 0,
    `ids=${m.ids.join("|")} nested=${m.nested}`);
  /* The console's shell carries a skip link; the two gate pages deliberately do not. */
  ok(`${route} skip link ${exempt ? "absent (gate page)" : "present"}`, exempt ? true : m.skip,
    `skip=${m.skip}`);
  console.log(`  ${m.n === 1 && m.ids[0] === "main-content" ? "✓" : "✗"} ${route.padEnd(30)} main=${m.n} #${m.ids[0]} h1=${m.h1}${exempt ? "  (TOTP-exempt)" : ""}`);
}

/* ── The mobile drawer, at the width it exists for ─────────────────────────────────── */
if (!process.env.SKIP_NAV) {
  console.log("\n── DRAWER at 390 — DG-A-18's row rung and active fill ──");
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  const mp = await mob.newPage();
  await mp.goto(BASE + "/admin/system", { waitUntil: "load", timeout: 90_000 });
  await mp.waitForTimeout(500);
  if (/\/auth\//.test(mp.url())) {
    ok("drawer: session survives to 390", false, mp.url());
  } else {
    const opened = await mp.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /menu|nav/i.test(b.getAttribute("aria-label") || "") || b.querySelector("svg"));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await mp.waitForTimeout(600);
    const rows = await mp.evaluate(() => {
      const nav = document.querySelector("aside nav") || document.querySelector("nav");
      if (!nav) return null;
      return [...nav.querySelectorAll("a")].map((a) => {
        const r = a.getBoundingClientRect(), cs = getComputedStyle(a);
        return { h: Math.round(r.height * 10) / 10, bg: cs.backgroundColor,
                 current: a.getAttribute("aria-current") === "page", text: (a.textContent || "").trim().slice(0, 22) };
      });
    });
    if (!rows || !rows.length) {
      ok("drawer: rows found at 390", false, `opened=${opened} rows=${rows ? rows.length : "null"} — ZERO PROBES IS A SKIPPED RUN, NOT A PASS`);
    } else {
      const short = rows.filter((r) => r.h > 0 && r.h < 44);
      console.log(`  ${rows.length} drawer rows · heights ${[...new Set(rows.map((r) => r.h))].sort((a, b) => a - b).join(", ")}`);
      ok(`drawer rows reach the 44px mobile rung (§A2)`, short.length === 0,
        `${short.length} under 44: ${short.slice(0, 4).map((r) => `"${r.text}" ${r.h}`).join(", ")}`);
      const cur = rows.find((r) => r.current);
      if (cur) console.log(`  active row "${cur.text}" bg=${cur.bg}`);
      ok("the active drawer row is painted (a fill, not transparent)",
        !cur || (cur.bg !== "rgba(0, 0, 0, 0)" && cur.bg !== "transparent"),
        cur ? `bg=${cur.bg}` : "no aria-current row in the drawer");
      probed += rows.length;
    }
  }
  await mob.close();
}

await browser.close();
console.log(`\n${probed} probe(s) · ${ROUTES.length} route(s) · ${revoked} re-sign-in(s) · ${fail} failing`);
/** ⛔ Zero probes is a SKIPPED RUN, never a pass. */
if (!probed) { console.error("🔴 ZERO PROBES — this is a skipped run, not a pass."); process.exit(3); }
if (fail) { console.error(`🔴 ${bad.length} failure(s):\n${bad.map((b) => "   " + b).join("\n")}`); process.exit(1); }
console.log("✅ ADMIN SHELL SEAL GREEN\n");
