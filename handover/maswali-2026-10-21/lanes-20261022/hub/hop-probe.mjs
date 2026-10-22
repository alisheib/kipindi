// HUB scratch probe (not committed; REGISTER commits the hop drive qa:millionea-ghost-hops): on a throttled client hop
// between Millionea pages, WHICH loading drawing is painted — the destination's own, or another page's (the defect: the
// hub's, from millionea/loading.tsx, which wraps every Millionea page)?
//  1. For each destination, a throttled DOCUMENT load paints the destination's own loading file (the nearest boundary):
//     its drawing's markup, normalised (no text, no ids), is the reference.
//  2. Each hop (window.next.router.push, throttled 400 ms / 12 KB/s): every animation frame, the busy drawing's markup is
//     compared with the references; the hop passes when every drawing painted on the way is the destination's own.
// Run from the tree: node <this> (BASE, OUT env), on a fresh in-memory next dev with FEATURE_MILLIONEA=ACTIVE.
import { chromium } from "file:///C:/50pick-ssd/kipindi-mln-dhub/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "file:///C:/50pick-ssd/kipindi-mln-dhub/scripts/live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3551";
const OUT = process.env.OUT || ".50pick-shots/hub-hop-probe";
mkdirSync(OUT, { recursive: true });
const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
const browser = await chromium.launch();
const owner = await browser.newContext();
await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
console.log(`seed ${seed.status()}`);
const session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
const reader = await browser.newContext({ viewport: { width: 360, height: 780 } });
await reader.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
await reader.request.post(`${BASE}/api/dev-test/maswali-hub-act`, { data: { act: "tickets", n: 1, lose: true }, timeout: 240_000 });

// The addresses: a week's register page and a ticket of this reader's, read off the pages themselves.
const page0 = await reader.newPage();
await page0.goto(`${BASE}/millionea/register`, { waitUntil: "load", timeout: 180_000 });
const week = await page0.evaluate(() => document.querySelector('a[href^="/millionea/register/MLN-"]')?.getAttribute("href") ?? null);
await page0.goto(`${BASE}/millionea/tickets`, { waitUntil: "load", timeout: 180_000 });
const ticket = await page0.evaluate(() => document.querySelector('a[href^="/millionea/tickets/MLN-"]')?.getAttribute("href") ?? null);
await page0.close();
console.log(`addresses: week ${week} · ticket ${ticket}`);
const PAGES = { hub: "/millionea", how: "/millionea/how", register: "/millionea/register", week, slip: "/millionea/slip", tickets: "/millionea/tickets", ticket };

const THROTTLE = { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 };
/** A loading drawing is up when the page's own landmark holds no visible word (every Millionea drawing is wordless but for
 *  the screen reader's "loading"): then its markup with no words, no ids and no inline style — its structure and classes.
 *  A page (the one being left, or the one landed) has words: null. Only `#main-content` is read (the header may be busy). */
const SIGN = () => {
  const main = document.getElementById("main-content");
  if (!main || !main.firstElementChild) return null;
  const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!(n.textContent ?? "").trim() || !el || el.closest(".sr-only") || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    return null;
  }
  // The drawing itself: its own measure (every Millionea drawing stands in a PageContainer, which stamps data-measure) —
  // never the wrappers around it, which differ between a document's first paint and a hop.
  const own = main.querySelector("[data-measure]");
  if (!own) return null;
  const c = own.cloneNode(true);
  [c, ...c.querySelectorAll("*")].forEach((el) => { el.removeAttribute("id"); el.removeAttribute("style"); });
  const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) texts.push(n);
  texts.forEach((n) => { n.textContent = ""; });
  return c.outerHTML.replace(/\s+/g, " ");
};

// 1. References: each page's own drawing, from a throttled document load.
const refs = {};
for (const [name, path] of Object.entries(PAGES)) {
  if (!path) { console.log(`REF ${name}: no address`); continue; }
  const page = await reader.newPage();
  const cdp = await reader.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", THROTTLE);
  const nav = page.goto(`${BASE}${path}`, { waitUntil: "commit", timeout: 180_000 }).catch(() => null);
  // Every wordless state the document paints until the page has words: the LAST is the deepest boundary's drawing — the
  // page's own loading file (outer boundaries' drawings stream first, if at all).
  const states = [];
  const t0 = Date.now();
  let landed = false;
  while (Date.now() - t0 < 120_000) {
    const sig = await page.evaluate(SIGN).catch(() => null);
    if (sig && states[states.length - 1] !== sig) states.push(sig);
    if (!sig && states.length > 0) { landed = true; break; }
    await page.waitForTimeout(50);
  }
  refs[name] = states[states.length - 1] ?? null;
  console.log(`REF ${name} (${path}): ${states.length} drawing(s) on the way, the last ${refs[name] ? `${refs[name].length} chars` : "—"}${landed ? "" : " (did not land in 120 s)"}`);
  await nav;
  await page.close();
}
for (const [a, sa] of Object.entries(refs)) for (const [b, sb] of Object.entries(refs)) if (a < b && sa && sa === sb) console.log(`NOTE ${a} and ${b} draw the same markup`);
/** What a hop to `to` painted: the destination's own drawing ("own"), the hub's while going elsewhere ("HUB"), else another. */
const nameOf = (sig, to) => (!sig ? null : sig === refs[to] ? "own" : sig === refs.hub ? "HUB" : (Object.entries(refs).find(([, s]) => s === sig)?.[0] ?? "unknown"));

// 2. The hops.
const HOPS = [["register", "how"], ["how", "register"], ["hub", "how"], ["how", "hub"], ["register", "week"], ["week", "register"], ["hub", "slip"], ["hub", "tickets"], ["tickets", "ticket"], ["ticket", "hub"]];
let ok = 0, bad = 0;
for (const [from, to] of HOPS) {
  if (!PAGES[from] || !PAGES[to]) { console.log(`SKIP ${from}→${to}: no address`); continue; }
  const page = await reader.newPage();
  await page.goto(`${BASE}${PAGES[from]}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForTimeout(1000);
  const cdp = await reader.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", THROTTLE);
  const seen = [];
  const t0 = Date.now();
  await page.evaluate((to) => { window.next?.router?.push(to); }, PAGES[to]);
  let shot = 0;
  while (Date.now() - t0 < 45_000) {
    const sig = await page.evaluate(SIGN);
    const here = await page.evaluate(() => location.pathname);
    const name = nameOf(sig, to);
    const last = seen[seen.length - 1];
    if (name && (!last || last.name !== name)) {
      seen.push({ at: Date.now() - t0, name });
      await page.screenshot({ path: `${OUT}/${from}-to-${to}-${shot++}-${name}.png` });
    }
    if (!sig && here === PAGES[to] && seen.length > 0) break;
    if (!sig && here === PAGES[to] && Date.now() - t0 > 8000) break;
    await page.waitForTimeout(40);
  }
  const wrong = seen.filter((s) => s.name !== "own");
  const pass = seen.length > 0 && wrong.length === 0;
  pass ? ok++ : bad++;
  console.log(`${pass ? "PASS" : "FAIL"} ${from}→${to}: ${seen.map((s) => `${s.at}ms ${s.name}`).join(" → ") || "no drawing painted"}`);
  await page.close();
}
await browser.close();
console.log(`\nhop-probe: ${ok} hops drew the destination's own drawing, ${bad} did not`);
process.exit(bad === 0 ? 0 : 1);
