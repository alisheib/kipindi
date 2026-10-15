/**
 * S15's ACTIVE replacement for landing-ten's classic V15/V16/V19/V22/V25/V26.
 * Run against an isolated local in-memory ACTIVE server after building the
 * candidate. It never accepts a production URL or a staff-preview rollout.
 * The ordinary run measures a signed-in demo player at four widths and three
 * locales, then plants each named defect in the DOM and requires a new finding.
 */
import { chromium } from "playwright";
import { demoSession, localBase, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3047";
if (!localBase(BASE)) {
  console.error(`REFUSED: qa:s15-active-rulings is local-only (${BASE})`);
  process.exit(2);
}
const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
if (!health || health.database?.configured !== false || health.simpleJourney?.state !== "ACTIVE") {
  console.error(`REFUSED: require an in-memory ACTIVE server; got db=${health?.database?.configured}, rollout=${health?.simpleJourney?.state}`);
  process.exit(2);
}

const browser = await chromium.launch();
const errors = [];
const log = (label, findings) => {
  if (findings.length) errors.push(...findings.map((f) => `${label}: ${f}`));
  console.log(`${label}: ${findings.length ? findings.join("; ") : "PASS"}`);
};
const host = new URL(BASE).hostname;
const asCookie = (cookie) => ({ name: cookie.name, value: cookie.value, domain: host, path: cookie.path || "/" });

/** Every visible-ruling measurement is a DOM read, with no mocked app module. */
function probe() {
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  };
  const visible = (selector, within = document) => [...within.querySelectorAll(selector)].filter(shown);
  const findings = { V15: [], V16: [], V19: [], V22: [], V25: [], V26: [] };
  const home = document.querySelector('[data-testid="journey-home"]');
  const card = home?.querySelector('[data-testid="journey-card"]');
  const header = document.querySelector('[data-testid="journey-top-bar"]');
  const rail = document.querySelector('[data-testid="journey-tabs"]');
  const sheet = document.querySelector('[data-testid="wallet-sheet"]');
  if (!home || !card || !header || visible('[data-testid="journey-preview-marker"]').length) {
    findings.V15.push("missing ACTIVE home/card/header or a visible preview marker");
  }
  // V15: at 360x740 the first card's two actual picks clear the tab bar.
  if (innerWidth === 360 && innerHeight === 740) {
    const picks = card?.querySelector(".kp-jcard__picks");
    if (!shown(picks) || !shown(rail)) findings.V15.push("first picks or tab bar are absent");
    else {
      const line = Math.min(740, rail.getBoundingClientRect().top);
      const bottom = picks.getBoundingClientRect().bottom;
      if (bottom > line + 1) findings.V15.push(`first picks bottom ${bottom.toFixed(1)} exceeds ${line.toFixed(1)}`);
    }
  }
  // V16: card estimates always qualify the multiplier; an exact payout is a
  // decision in the sheet. Also reject an explicit payout promise on the card.
  for (const mult of visible(".kp-jcard__mult", home ?? document)) {
    if (!mult.textContent?.includes("≈")) findings.V16.push(`unqualified card multiplier: ${mult.textContent}`);
  }
  const claim = /\bwin\s+(?:up\s+to\s+)?TZS\s*[\d,.]+|\butashinda\s+TZS\s*[\d,.]+|赢得\s*TZS\s*[\d,.]+|TZS\s*[\d,.]+\s*[×x]\s*\d/i;
  for (const el of visible(".kp-jcard__line, .kp-jcard__note", home ?? document)) {
    if (claim.test(el.textContent ?? "")) findings.V16.push(`card promises a payout: ${(el.textContent ?? "").slice(0, 70)}`);
  }
  // V22's negative half is independent of the retired hero claim. It applies
  // to all visible page copy and share metadata, in all three languages.
  const first = /\bfirst\s+(?:licensed\s+)?prediction\s+market\b|\bfirst\s+licensed\b|\bsoko\s+la\s+kwanza\b|首家|首个[^。]{0,16}预测/i;
  for (const el of visible("h1,h2,h3,p,span,li,a,button", document.body)) {
    if (el.children.length) continue;
    if (first.test(el.textContent ?? "")) findings.V22.push(`visible first claim: ${(el.textContent ?? "").slice(0, 70)}`);
  }
  for (const meta of document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"]')) {
    if (first.test(meta.content ?? "")) findings.V22.push(`metadata first claim: ${meta.getAttribute("name") ?? meta.getAttribute("property")}`);
  }
  if (first.test(document.title)) findings.V22.push("title first claim");
  // V25: one reachable Deposit in each non-inert money region, no centre
  // Deposit control. A hidden modal does not count until the capsule opens.
  const deposits = (root) => root ? visible('a[href="/wallet/deposit"],a[href^="/wallet/deposit?"]', root).length : 0;
  const headerDeposit = deposits(header);
  if (headerDeposit !== 1) findings.V25.push(`header has ${headerDeposit} visible Deposit doors`);
  if (sheet && shown(sheet) && deposits(sheet) !== 1) findings.V25.push(`open wallet has ${deposits(sheet)} visible Deposit doors`);
  if (rail && deposits(rail) !== 0) findings.V25.push("tab bar has a Deposit door");
  if (sheet && shown(sheet) && visible('a[href="/wallet/withdraw"]', sheet).length !== 1) {
    findings.V19.push("one press on the capsule did not expose one Withdraw door");
  }
  if (visible(".kp-coin,.kp-rail__item--coin").length) findings.V26.push("classic centre Deposit coin is mounted");
  // V26: four equal tabs below lg, and the same four section links above it.
  if (innerWidth < 1024) {
    const items = visible("li", rail ?? document);
    if (!shown(rail) || items.length !== 4) findings.V26.push(`mobile tabs: ${items.length}, rail visible=${shown(rail)}`);
    if (items.length === 4) {
      const widths = items.map((el) => el.getBoundingClientRect().width);
      if (Math.max(...widths) - Math.min(...widths) > 1.5) findings.V26.push(`four tab widths differ: ${widths.map((v) => v.toFixed(1)).join(",")}`);
    }
  } else {
    const links = visible(".kp-jnav__link", header ?? document);
    if (links.length !== 4) findings.V26.push(`desktop has ${links.length} section links, expected four`);
  }
  // V19 is tested with actual interactions by the driver after this probe.
  return findings;
}
const flat = (result) => Object.entries(result).flatMap(([name, issues]) => issues.map((issue) => `${name} ${issue}`));
let session;
try {
  const seeded = await browser.newContext().then(async (ctx) => {
    try { return await ctx.request.post(`${BASE}/api/dev-test/seed-markets`, { timeout: 240_000 }); }
    finally { await ctx.close(); }
  });
  if (!seeded.ok()) throw new Error(`seed-markets HTTP ${seeded.status()}`);
  session = await demoSession(browser, BASE);
  const cells = [
    { width: 360, height: 740 }, { width: 390, height: 844 },
    { width: 768, height: 960 }, { width: 1280, height: 900 },
  ];
  for (const vp of cells) for (const locale of ["sw", "en", "zh"]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: "reduce" });
    try {
      await ctx.addCookies([asCookie(session), { name: LOCALE_COOKIE, value: locale, domain: host, path: "/" }]);
      const page = await ctx.newPage();
      const response = await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120_000 });
      if (response?.status() !== 200) throw new Error(`home HTTP ${response?.status()}`);
      await page.locator('[data-testid="journey-card"]').first().waitFor({ state: "visible", timeout: 90_000 });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(probe);
      log(`${vp.width}x${vp.height} ${locale}`, flat(result));
      if (vp.width === 360 && locale === "sw") {
        // Red plants mutate only this page's DOM. Each must increase its own
        // class count over the clean reading; then it is removed before the
        // next plant, so one defect cannot certify another.
        for (const cls of ["V15", "V16", "V22", "V25", "V26"]) {
          const before = await page.evaluate(probe);
          const planted = await page.evaluate((name) => {
            const red = document.createElement("span");
            red.setAttribute("data-s15-red", name);
            if (name === "V15") {
              const card = document.querySelector('[data-testid="journey-card"]');
              if (!card) return false;
              card.style.marginTop = "800px";
              return true;
            }
            if (name === "V16") {
              red.className = "kp-jcard__mult";
              red.textContent = "2.8×";
              document.querySelector(".kp-jcard__pick")?.append(red);
              return red.isConnected;
            }
            if (name === "V22") {
              red.textContent = "Tanzania's first licensed prediction market";
              document.querySelector("main")?.prepend(red);
              return red.isConnected;
            }
            if (name === "V25") {
              const header = document.querySelector('[data-testid="journey-top-bar"]');
              const link = header?.querySelector('a[href="/wallet/deposit"]');
              if (!link) return false;
              const copy = link.cloneNode(true);
              copy.setAttribute("data-s15-red", name);
              header.append(copy);
              return copy.isConnected;
            }
            if (name === "V26") {
              const rail = document.querySelector('[data-testid="journey-tabs"] ul');
              const item = rail?.querySelector("li");
              if (!item) return false;
              const copy = item.cloneNode(true);
              copy.setAttribute("data-s15-red", name);
              rail.append(copy);
              return copy.isConnected;
            }
            return false;
          }, cls);
          const after = await page.evaluate(probe);
          log(`RED ${cls}`, planted && after[cls].length > before[cls].length ? [] : [`the plant was not caught (${before[cls].length} -> ${after[cls].length})`]);
          await page.evaluate((name) => {
            document.querySelectorAll(`[data-s15-red="${name}"]`).forEach((el) => el.remove());
            if (name === "V15") document.querySelector('[data-testid="journey-card"]')?.style.removeProperty("margin-top");
          }, cls);
        }
        // V19: a signed-in reader reaches Withdraw in one press from the
        // balance capsule, and the Akaunti hub has its own direct door.
        await page.getByTestId("journey-balance").click();
        const wallet = await page.getByTestId("wallet-sheet-withdraw").isVisible();
        const href = wallet ? await page.getByTestId("wallet-sheet-withdraw").getAttribute("href") : null;
        log("V19 balance capsule", wallet && href === "/wallet/withdraw" ? [] : ["one press did not expose the Withdraw door"]);
        const openResult = await page.evaluate(probe);
        log("V19/V25 open wallet", [...openResult.V19, ...openResult.V25]);
        await page.evaluate(() => document.querySelector('[data-testid="wallet-sheet-withdraw"]')?.remove());
        const broken = await page.evaluate(probe);
        log("RED V19", broken.V19.length > openResult.V19.length ? [] : ["the missing Withdraw door was not caught"]);
        await page.goto(`${BASE}/account`, { waitUntil: "load", timeout: 120_000 });
        const account = await page.locator('[data-testid="journey-account-hub"]').count();
        const withdraw = await page.locator('main a[href="/wallet/withdraw"]').count();
        log("V19 account", account === 1 && withdraw === 1 ? [] : [`hub=${account}, direct Withdraw links=${withdraw}`]);
      }
    } catch (error) { log(`${vp.width}x${vp.height} ${locale} INSTRUMENT`, [String(error?.message ?? error).split("\n")[0]]); }
    finally { await ctx.close(); }
  }
} catch (error) { log("INSTRUMENT", [String(error?.message ?? error)]); }
finally { await browser.close(); }
console.log(`qa:s15-active-rulings: ${errors.length} finding(s)`);
process.exit(errors.length ? 1 : 0);
