/**
 * admin-section-gate — E-381 §6 item 10: the console's VIEW and ACT gates must be re-decided on every navigation.
 *
 * 🔴 WHAT THIS CATCHES. The gates lived in `app/admin/layout.tsx`, computed from the request path — and a layout is not
 * re-executed on a soft navigation. So the verdict of the page an officer HARD-loaded governed every page they clicked to:
 *   ① LEAK · an AUDITOR on /admin/kyc (compliance — may view) follows the queue's own player link into
 *     /admin/players/[id] (support — AUDITOR may not view) and the player page RENDERED.
 *   ② STUCK · the same officer hard-loads a blocked page, then clicks an allowed one in the sidebar: still "Restricted".
 *   ③ ACT · a COMPLIANCE officer on /admin/kyc (may act) clicks into /admin/players (view only): the page's controls
 *     kept the previous domain's "may act", with no read-only banner.
 * Every navigation below is a SOFT one — a click on the app's own <Link> — because a `goto` is a hard load and would
 * re-run the layout and pass on the broken code (see memory: a layout is not re-executed on soft nav).
 * §0 enumerates the console's pages from disk: every page must sit under `AdminSectionGate` (a section layout that
 * renders it, or the page itself), except the two-factor setup and verify pages.
 *
 * Local only (drives /auth/demo and /api/dev-test/seed-admin, both 404 in production).
 *   BASE=http://localhost:3009 node scripts/admin-section-gate.test.mjs
 */
import { chromium } from "playwright";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const BASE = process.env.BASE || "http://localhost:3009";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); } else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

// ── §0 · every console page is under the gate ───────────────────────────────────────────────────────────────
console.log("\n[admin-section-gate] §0 every console page sits under AdminSectionGate");
{
  const ADMIN = join(process.cwd(), "src", "app", "admin");
  const EXEMPT = new Set(["2fa/setup", "totp-verify"]);
  const pages = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n === "page.tsx") pages.push(p); } };
  walk(ADMIN);
  // W25: a PAGE gates with AdminPageGate (refuse only — the layout above it already carries the read-only banner),
  // a LAYOUT gates with AdminSectionGate. Both are the same gate and the same refusal, so both count as gated here.
  const gated = (file) => /<(AdminSectionGate|AdminPageGate)\b/.test(readFileSync(file, "utf8"));
  const ungated = [];
  for (const page of pages) {
    const rel = relative(ADMIN, page).split(sep).slice(0, -1).join("/");
    if (EXEMPT.has(rel)) continue;
    if (gated(page)) continue;
    // Walk up to (not including) the admin root: a section layout on the way must render the gate.
    let dir = join(page, ".."), found = false;
    while (dir.length > ADMIN.length) {
      const lay = join(dir, "layout.tsx");
      if (existsSync(lay) && gated(lay)) { found = true; break; }
      dir = join(dir, "..");
    }
    if (!found) ungated.push(rel || "(root)");
  }
  ok(`§0 ratchet · ${pages.length} console pages found`, pages.length >= 45, String(pages.length));
  ok("§0 every page is gated where a navigation re-runs the gate", ungated.length === 0, ungated.join(", "));

  // ── §0b · W25 · A LAYOUT IS NOT ENOUGH. The gate must be IN THE PAGE. ──
  // ⛔ WHY THIS ASSERTION EXISTS, measured not supposed. Until W25 this suite passed a page whose ONLY gate was an
  // ancestor layout — the `found` walk above. A layout is skippable: a flight request whose `Next-Router-State-Tree`
  // names the admin layouts skips them, and the page under them still runs its own async function and streams its
  // whole server payload. `qa:platform-pii-probe` measured the consequence on the unfixed build — two ordinary PLAYER
  // accounts received another player's display name and stake from 13 admin route instances, every one a 200.
  // So the walk above is kept (it still proves a navigation re-runs a gate) and this is added beside it: the page
  // itself must refuse, because the page itself is the thing that cannot be skipped.
  const layoutOnly = [];
  for (const page of pages) {
    const rel = relative(ADMIN, page).split(sep).slice(0, -1).join("/");
    if (EXEMPT.has(rel)) continue;
    if (!gated(page)) layoutOnly.push(rel || "(root)");
  }
  ok("§0b W25 · every page carries its OWN gate, because a flight can skip every layout above it",
    layoutOnly.length === 0, layoutOnly.join(", "));
  // A control: the assertion must be able to fail. If the EXEMPT set ever swallowed every page, §0b would pass
  // vacuously and stop meaning anything.
  ok("§0b CONTROL · §0b actually inspected pages (it is not vacuous)",
    pages.length - EXEMPT.size >= 45, `${pages.length} pages − ${EXEMPT.size} exempt`);

  // ── §0c · W25 · NO ADMIN PAGE MAY NAME A RECORD IN ITS DOCUMENT TITLE. ──
  // ⛔ `generateMetadata` runs BEFORE and INDEPENDENTLY of the page body, so neither belt reaches it. Belt 1 refuses
  // a non-staff cookie, but belt 2 exists for the cookie that still SAYS staff after a demotion — and such a viewer
  // was refused the body while still being handed the record's title in the tab, the history entry and the flight
  // payload. Measured: FOUR admin pages did this (players/[id] named the player; ai-polls/[id], house/[marketId] and
  // markets/[id] named the record), and the first count of it said ONE, because the grep window was eight lines and
  // the other three reach their data through different accessors. A count is not a measurement until it can fail.
  // ⛔ It was also an ORACLE: "Market not found" for a missing record versus a real title for a live one enumerated
  // which ids exist, with no gate consulted. `/admin/desk/[id]` states the same rule for itself (ruling 402).
  const titled = [];
  for (const page of pages) {
    const rel = relative(ADMIN, page).split(sep).slice(0, -1).join("/");
    const src = readFileSync(page, "utf8");
    const i = src.indexOf("export async function generateMetadata");
    if (i < 0) continue;                       // a static `export const metadata` is the shape this asks for
    const open = src.indexOf("{", src.indexOf(")", i));
    let d = 0, end = -1;
    for (let j = open; j < src.length; j++) {
      if (src[j] === "{") d++;
      else if (src[j] === "}") { d--; if (d === 0) { end = j; break; } }
    }
    const body = end > 0 ? src.slice(open, end + 1) : src.slice(i);
    // Any read at all inside generateMetadata: the title can then only be built from what was read.
    if (/\b(db|prisma|pc)\s*[.(]|\bget[A-Z]\w*\s*\(|\bStore\s*\.|\bfindById\s*\(/.test(body)) titled.push(rel || "(root)");
  }
  ok("§0c W25 · no admin page reads a record inside generateMetadata (it runs outside every gate)",
    titled.length === 0, titled.join(", "));
  // Code only: line comments first, then block and JSX comments (the history of the move is written in comments).
  const root = readFileSync(join(ADMIN, "layout.tsx"), "utf8").replace(/^[ \t]*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  ok("§0 the root admin layout no longer decides view/act (it is frozen across soft navigations)",
    !/AdminActProvider|AdminRestricted|canView\(|canAct\(/.test(root));
}

for (let i = 0; i < 30; i++) { if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break; await wait(1500); }
const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});

// A player with an identity file, so /admin/players/[id] and /admin/kyc/[id] both exist.
const P = await browser.newContext();
const pp = await P.newPage();
await pp.goto(BASE + "/auth/demo?kyc=pending", { waitUntil: "domcontentloaded" });
await wait(1500);
const who = await pp.request.get(BASE + "/api/dev-test/whoami").then((r) => r.json()).catch(() => ({}));
const uid = who?.session?.userId ?? who?.user?.id;
ok("precondition · the demo player exists", !!uid, JSON.stringify(who).slice(0, 120));
await P.close();

async function staff(role, phone) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  ok(`precondition · a ${role} console session`, r.ok());
  return { ctx, page };
}
const state = (page) => page.evaluate(() => {
  const main = document.querySelector("main#main-content");
  const text = main?.innerText ?? "";
  return {
    path: location.pathname,
    restricted: /Restricted/.test(text) && /access|Owner \(ADMIN\) only|staff sign-in/.test(text),
    readOnly: [...document.querySelectorAll('main#main-content [role="status"]')].some((n) => /read-only/i.test(n.textContent || "")),
    len: text.length,
  };
});

// ① LEAK — AUDITOR, the KYC queue → the queue's own player link.
console.log("\n[admin-section-gate] ① AUDITOR follows an in-page link into a domain it cannot view");
{
  const { ctx, page } = await staff("AUDITOR", "+255700000070");
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: "domcontentloaded" });
  await wait(6000);
  const a = await state(page);
  ok("① /admin/kyc renders for AUDITOR (hard load)", a.path === "/admin/kyc" && !a.restricted && a.len > 300, JSON.stringify(a));
  const link = page.locator(`main a[href^="/admin/players/${uid}"]`).first();
  ok("① the queue's own link to the player page is there", (await link.count()) > 0);
  if (await link.count()) {
    await link.click();
    await wait(6000);
    const b = await state(page);
    ok("① after the SOFT navigation the URL is the player page", b.path === `/admin/players/${uid}`, b.path);
    ok("① …and it shows RESTRICTED, not the player profile", b.restricted && !/Account actions|Player profile/.test(await page.innerText("main#main-content").catch(() => "")), JSON.stringify(b));
  }
  await ctx.close();
}

// ② STUCK — SUPPORT hard-loads a blocked page, then the sidebar's allowed link.
{
  const { ctx, page } = await staff("SUPPORT", "+255700000071");
  console.log("\n[admin-section-gate] ② SUPPORT leaves a blocked page for an allowed one");
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: "domcontentloaded" });
  await wait(5000);
  const c = await state(page);
  ok("② /admin/kyc is restricted for SUPPORT (hard load)", c.restricted, JSON.stringify(c));
  const side = page.locator('a[href="/admin/players"]').first();
  ok("② the sidebar offers /admin/players", (await side.count()) > 0);
  if (await side.count()) {
    await side.click();
    await wait(6000);
    const d = await state(page);
    ok("② after the SOFT navigation the players list renders (not the frozen restricted panel)", d.path === "/admin/players" && !d.restricted && d.len > 200, JSON.stringify(d));
  }
  await ctx.close();
}

// ③ ACT — COMPLIANCE on its own domain, then into a view-only one.
console.log("\n[admin-section-gate] ③ COMPLIANCE moves from a domain it acts in to one it only views");
{
  const { ctx, page } = await staff("COMPLIANCE", "+255700000072");
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: "domcontentloaded" });
  await wait(5000);
  const e = await state(page);
  ok("③ /admin/kyc renders without the read-only banner (COMPLIANCE may act there)", !e.restricted && !e.readOnly, JSON.stringify(e));
  const side = page.locator('a[href="/admin/players"]').first();
  if (await side.count()) {
    await side.click();
    await wait(6000);
    const f = await state(page);
    ok("③ after the SOFT navigation to /admin/players the READ-ONLY banner is shown", f.path === "/admin/players" && f.readOnly && !f.restricted, JSON.stringify(f));
  } else ok("③ the sidebar offers /admin/players", false);
  await ctx.close();
}

await browser.close();
console.log(`\n[admin-section-gate] ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILURES:"); for (const f of failures) console.log("  · " + f); process.exit(1); }
