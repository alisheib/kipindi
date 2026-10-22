/**
 * qa:millionea-ghost-hops — ON A MOVE BETWEEN MILLIONEA'S PAGES, ONLY THE DESTINATION'S OWN LOADING DRAWING IS EVER UP
 * (MASWALI-BUILD S5-R2-REGISTER, the lead's ruling of 2026-10-22).
 *
 *   BASE=http://localhost:3583 node scripts/qa-millionea-ghost-hops.mjs
 *   HOPS=register>week,week>register node scripts/qa-millionea-ghost-hops.mjs     a focused set (the names below)
 *   node scripts/qa-millionea-ghost-hops.mjs --prove-red                          the plant (below), alone
 *
 * WHY. A segment's `loading.tsx` wraps its page AND its child routes, so on a client move the first loading boundary under
 * the segment both pages share is the PARENT's. Measured on a throttled hop (2026-10-22): from the register to How the
 * HUB's drawing stood 1.4s → 21.7s and How's own never came in 30s; from How to the register the hub's, then the index's;
 * from the register's index to a week the INDEX's, and the week's own never. A parent's loading file therefore draws the
 * destination's own drawing, picked by the address (`RoutePick`: during a move `usePathname()` already names it).
 *
 * WHAT IS MEASURED. Each hop is an app-router move (what a Link calls) from the source page, loaded and settled, on a
 * throttled network (latency 400ms, 12 KB/s down — THROTTLE_KBPS to change it). Every animation frame until the destination
 * lands, the page records every loading drawing on screen: each names its page (`data-ghost-page` on its root; until a lane
 * adds its own, the hub's drawing is known by `[data-ghost="strip"]` and the slip's by `[data-testid="slip-ghost"]`). A
 * frame passes when every drawing up is the destination's own; a drawing that names no page — an `[aria-busy]` or a
 * `.kp-shimmer-track` outside a named root — is UNMARKED and fails, never a silent pass. Nodes on screen before the move
 * (the source page's own) and inside the landed page are not drawings of the move. A hop that never lands (90s) fails.
 * Each state's first frame is a tile (`.50pick-shots/millionea-ghost-hops/`).
 *
 * --prove-red. Plants the defect this drive exists for — the register's loading file drawing the index for every page
 * under it, as it did — runs the index → week hop, and requires the drive to report the index's drawing there; the file is
 * put back (`armRestoreGuard`: on every exit, and on a stop), and the run refuses to START while that file differs from
 * the commit (a plant must never land on uncommitted work).
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` (FEATURE_MILLIONEA=ACTIVE, MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false). The
 *    drive signs the demo reader in (`/auth/demo`, a local server only) and seeds the tickets chain
 *    (`/api/dev-test/seed-maswali-tickets`, step "weeks": public final weeks, a week on sale, the demo reader's tickets).
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { armRestoreGuard } from "./lib/red-restore-guard.mjs";

const BASE = process.env.BASE || "http://localhost:3583";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = ".50pick-shots/millionea-ghost-hops";
const PROVE_RED = process.argv.includes("--prove-red");
const KBPS = Number(process.env.THROTTLE_KBPS || 12);
const LAND_MS = 90_000;
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

// ── the plant (before any server read, so a refusal costs nothing) ───────────────────────────────────────────────────
const PLANT_FILE = "src/app/millionea/register/loading.tsx";
const PLANT_FROM = /return \(\s*<RoutePick[\s\S]*?\/>\s*\);/;
const PLANT_TO = "return <MillioneaRegisterGhost />;";
let restore = null;
if (PROVE_RED) {
  const dirty = execFileSync("git", ["status", "--porcelain", "--", PLANT_FILE], { cwd: ROOT, encoding: "utf8" }).trim();
  if (dirty) die(`${PLANT_FILE} differs from the commit (${dirty}) — commit it first; a plant never lands on uncommitted work`);
}

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
if (pre.health?.millionea?.state !== "ACTIVE") die(`/api/health says millionea = ${JSON.stringify(pre.health?.millionea)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);

const browser = await chromium.launch();
const session = await demoSession(browser, BASE);
const api = await browser.newContext();
await api.addCookies([{ ...session, url: BASE, domain: undefined, path: undefined }]);
const seeded = await api.request.post(`${BASE}/api/dev-test/seed-maswali-tickets`, { data: { step: "weeks" }, timeout: 600_000 })
  .then(async (r) => ({ status: r.status(), body: await r.json().catch(() => ({})) }));
const info = seeded.body?.ok ? seeded.body : await api.request.post(`${BASE}/api/dev-test/seed-maswali-tickets`, { data: { step: "info" } }).then((r) => r.json()).catch(() => ({}));
await api.close();
const week = info?.weeks?.rollover;
const ticket = Object.values(info?.tickets ?? {})[0];
if (!week || !ticket) die(`the tickets chain is not seeded (${seeded.status} ${JSON.stringify(seeded.body).slice(0, 200)})`);

/** Each page, its address and the element that says it landed. */
const PAGES = {
  hub: ["/millionea", '[data-testid="millionea-hub"]'],
  how: ["/millionea/how", '[data-testid="millionea-how"]'],
  register: ["/millionea/register", '[data-testid="millionea-register"]'],
  week: [`/millionea/register/${encodeURIComponent(week)}`, '[data-testid="millionea-register-week"]'],
  slip: ["/millionea/slip", '[data-testid="millionea-slip"]'],
  tickets: ["/millionea/tickets", '[data-testid="millionea-tickets"]'],
  ticket: [`/millionea/tickets/${encodeURIComponent(ticket)}`, '[data-testid="millionea-ticket"]'],
};
const ALL_HOPS = ["hub>how", "how>hub", "hub>register", "register>hub", "hub>slip", "slip>hub", "hub>tickets", "tickets>hub",
  "how>register", "register>how", "register>week", "week>register", "week>how", "slip>tickets", "tickets>slip", "tickets>ticket", "ticket>tickets"];
const chosen = (process.env.HOPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const HOPS = PROVE_RED ? ["register>week"] : chosen.length ? ALL_HOPS.filter((h) => chosen.includes(h)) : ALL_HOPS;
if (chosen.length && !PROVE_RED) console.log(`FOCUSED RUN — ${HOPS.join(", ")} (not the full set)`);

/** One hop: the frames it showed, as [ms since the move, "drawing+drawing PAGE"] transitions, and the tiles of each. */
async function hop(name) {
  const [fromName, toName] = name.split(">");
  const [from, fromReady] = PAGES[fromName];
  const [to, ready] = PAGES[toName];
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${from}`, { waitUntil: "load", timeout: 180_000 });
  const started = await page.waitForSelector(fromReady, { timeout: 60_000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: KBPS * 1024, uploadThroughput: 64 * 1024 });
  await page.evaluate(({ ready }) => {
    // The source page's own nodes are not drawings of the move.
    for (const el of document.querySelectorAll('[data-ghost-page], [aria-busy="true"], .kp-shimmer-track')) el.setAttribute("data-pre-hop", "");
    const nameOf = (root) => root.getAttribute("data-ghost-page")
      ?? (root.matches('[data-testid="slip-ghost"]') ? "slip" : root.querySelector('[data-ghost="strip"]') ? "hub" : null);
    const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    window.__frames = [];
    const t0 = performance.now();
    const tick = () => {
      const page = document.querySelector(ready);
      const names = new Set();
      for (const el of document.querySelectorAll('[data-ghost-page], [aria-busy="true"], .kp-shimmer-track')) {
        if (el.closest("[data-pre-hop]") || (page && page.contains(el)) || !shown(el)) continue;
        const root = el.closest('[data-ghost-page], [data-testid="slip-ghost"], [aria-busy="true"]');
        const named = root ? nameOf(root) : null;
        names.add(named ?? "UNMARKED");
      }
      const state = `${[...names].sort().join("+") || "-"}${page ? " PAGE" : ""}`;
      const last = window.__frames[window.__frames.length - 1];
      if (!last || last.state !== state) window.__frames.push({ at: Math.round(performance.now() - t0), state });
      if (!(page && names.size === 0)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { ready });
  await page.evaluate((to) => { window.next?.router?.push(to); }, to);
  const t0 = Date.now();
  const tiled = new Set();
  let landed = false;
  while (Date.now() - t0 < LAND_MS) {
    const last = await page.evaluate(() => window.__frames[window.__frames.length - 1]?.state ?? "-");
    const drawings = last.replace(/ PAGE$/, "");
    if (drawings !== "-" && !tiled.has(drawings)) {
      tiled.add(drawings);
      await page.screenshot({ path: `${OUT}/${name.replace(">", "-to-")}${PROVE_RED ? "-red" : ""}-${drawings.replace(/[^A-Za-z0-9]+/g, "_")}.png` }).catch(() => {});
    }
    if (last.endsWith(" PAGE") && drawings === "-") { landed = true; break; }
    await page.waitForTimeout(40);
  }
  const frames = await page.evaluate(() => window.__frames);
  await ctx.close();
  return { started, landed, frames };
}

/** The drawings a hop showed that are not the destination's own. */
const strangers = (frames, own) => [...new Set(frames.flatMap((f) => f.state.replace(/ PAGE$/, "").split("+")).filter((d) => d !== "-" && d !== own))];

if (PROVE_RED) {
  const abs = join(ROOT, PLANT_FILE);
  const original = readFileSync(abs, "utf8");
  const planted = original.replace(PLANT_FROM, PLANT_TO);
  if (planted === original || (original.match(new RegExp(PLANT_FROM.source, "g")) ?? []).length !== 1) die(`the plant does not apply to ${PLANT_FILE} (its RoutePick return is not there exactly once)`);
  restore = armRestoreGuard({ original: new Map([[abs, original]]), write: (p, s) => writeFileSync(p, s), releaseLock: () => {}, label: "qa:millionea-ghost-hops --prove-red" });
  writeFileSync(abs, planted);
  console.log(`PLANTED ${PLANT_FILE}: the register's loading draws the index for every page under it (its pick undone)`);
  try {
    // The dev server compiles the planted file on the next request of the register; the hop loads its source page anew.
    await fetch(`${BASE}/millionea/register`).catch(() => {});
    const r = await hop("register>week");
    console.log(`TIMELINE register>week (planted) ${r.frames.map((f) => `${f.at}ms ${f.state}`).join(" → ")}`);
    const seen = strangers(r.frames, "week");
    ok("CONTROL · with the register's loading file drawing the index for every page under it, the index → week hop is reported (the index's drawing, not the week's own)",
      seen.includes("register"), JSON.stringify({ seen, landed: r.landed }));
  } finally {
    restore("the plant's run ended", true);
  }
  const back = execFileSync("git", ["status", "--porcelain", "--", PLANT_FILE], { cwd: ROOT, encoding: "utf8" }).trim();
  ok(`${PLANT_FILE} is back as committed`, back === "", back);
} else {
  for (const name of HOPS) {
    const own = name.split(">")[1];
    const r = await hop(name);
    console.log(`TIMELINE ${name} ${r.frames.map((f) => `${f.at}ms ${f.state}`).join(" → ")}`);
    ok(`${name} · the source page drew before the move`, r.started);
    const seen = strangers(r.frames, own);
    ok(`${name} · only ${own}'s own loading drawing (or none) was ever up — never a parent's, a sibling's or an unmarked one`, seen.length === 0, `also up: ${seen.join(", ")}`);
    ok(`${name} · ${own} landed within ${LAND_MS / 1000}s`, r.landed);
  }
}
await browser.close();
console.log(`\nqa:millionea-ghost-hops${PROVE_RED ? " --prove-red" : ""}: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
