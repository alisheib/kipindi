/**
 * qa:maswali-ticket-ghosts — DOES TIKETI ZANGU LAND WHERE ITS GHOST DREW IT? (MASWALI-BUILD S5-DESIGN-TICKETS; the R1
 * tickets critic's M9, DESIGN_AUTHORITY §B7 rule 3: a loading drawing is the page's own bands at the page's own heights.)
 *
 *   BASE=http://localhost:3570 node scripts/maswali-ticket-ghosts.mjs
 *   G_WIDTHS=320,360 G_LOCALES=sw node scripts/maswali-ticket-ghosts.mjs     (a focused grid)
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` as `qa:maswali-ticket-shots` asks (FEATURE_MILLIONEA=ACTIVE, the Millionea tick
 *    off). The drive seeds the chain (`/api/dev-test/seed-maswali-tickets`, step "weeks") or reads back the one this server
 *    holds (step "info").
 * ⚠️ IT HOPS, IT DOES NOT NAVIGATE (`ghost-landing.mjs`' rule): a route's `loading.tsx` paints only on a CLIENT move, so each
 *    case is reached the way a player reaches it — the ticket's back link to the list (a direct load: no history, so the
 *    link pushes the list), and the list's card to its ticket — on a throttled network and CPU, so the ghost holds the
 *    screen for frames a probe can read.
 * Measured on every frame the ghost is up, then on the landed page — the document y of each shared band, and a height:
 *   the list   — the lens strip; the first card (its top and its height); the second card's top
 *   the ticket — the card's top; the serial's line; the Seal Line's rule-bounded box (its top and height); the first clause
 *   the ticket inside its free cancel — the same, and the free cancel's band (its top and height): a ticket the drive buys
 *               first, opened from its card, which notes the window for the drawing (`maswali-ghost-hint.tsx`)
 * The ghost draws the ticket a player opens most — one running in its week, its results coming in — and the list as it
 * opens. A band whose landed y differs from the ghost's by more than G_TOL px (default 2) FAILS, the first card's height
 * too. A case where no ghost frame was caught proved nothing and FAILS as such.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3570";
const OUT = process.env.MLN_OUT || ".50pick-shots/maswali-ticket-ghosts";
const WIDTHS = (process.env.G_WIDTHS || "320,360,768,1280").split(",").map(Number);
const LOCALES = (process.env.G_LOCALES || "sw,en,zh").split(",");
const TOL = Number(process.env.G_TOL || 2);
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const session = await demoSession(browser, BASE);
const api = await browser.newContext();
const seed = async (data) => {
  const r = await api.request.post(`${BASE}/api/dev-test/seed-maswali-tickets`, { data, timeout: 300_000 });
  const body = await r.json().catch(() => null);
  if (!r.ok() || !body?.ok) throw new Error(`seed ${JSON.stringify(data)}: ${r.status()} ${JSON.stringify(body)}`);
  return body;
};
const info = await seed({ step: "info" }).catch(() => seed({ step: "weeks" }));
const running = info.tickets.resultsAlive;
// A ticket bought now, inside its free cancel for the next ten minutes: its card notes the window, so its drawing draws
// the free cancel's band (`maswali-ghost-hint.tsx`) — those hops go first, well inside the window.
const fresh = (await seed({ step: "fresh" })).serial;
const freshUntil = Date.now() + 9 * 60_000;

/** The bands, read off the ghost (its `[aria-hidden]` drawing) or off the landed page: document y and height, rounded. */
const BANDS = `(kind) => {
  const y = (el) => (el ? Math.round(el.getBoundingClientRect().top + scrollY) : null);
  const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
  if (kind === "list") {
    const ghostCards = [...document.querySelectorAll("[aria-hidden].grid > div.kp-shimmer-track")];
    const ghost = ghostCards.length > 0;
    const strip = ghost ? document.querySelector("[aria-hidden].kp-discovery-bar") : document.querySelector("[data-filter-rail].kp-discovery-bar");
    const cards = ghost ? ghostCards : [...document.querySelectorAll('[data-testid="millionea-tickets"] > li > a')];
    return { ghost, strip: y(strip), stripH: h(strip), card1: y(cards[0]), card1H: h(cards[0]), card2: y(cards[1]) };
  }
  const ghostCard = document.querySelector("div[aria-hidden].mat-raised.rounded-card.kp-shimmer-track");
  const ghost = ghostCard !== null;
  const card = ghost ? ghostCard : document.querySelector('[data-testid="millionea-ticket"] article.mat-raised');
  const serial = ghost ? card?.querySelector(":scope > div:first-child > span:nth-child(2)") : card?.querySelector("h1");
  const seal = card?.querySelector(":scope > .border-y, :scope > div > .border-y") ?? null;
  const clause = ghost ? card?.querySelector(":scope > div.border-t") : card?.querySelector(":scope > ol > li");
  const cancel = ghost ? card?.querySelector('[data-ghost-band="free-cancel"]') : card?.querySelector('[data-testid="millionea-ticket-cancel"]');
  return { ghost, card: y(card), serial: y(serial), seal: y(seal), sealH: h(seal), cancel: y(cancel), cancelH: h(cancel), clause: y(clause) };
}`;
const AT = (target) => (target === "*ticket*" ? "/^\\/millionea\\/tickets\\/MLN-/.test(location.pathname)" : `location.pathname === ${JSON.stringify(target)}`);

async function hop({ name, locale, width, from, click, target, kind }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}${from}`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForTimeout(2_500);
    const link = page.locator(click).first();
    if ((await link.count()) === 0) return { error: `no ${click} on ${from}` };
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // Every frame: while the ghost is up on the target address, keep its bands (the last such frame wins).
    await page.evaluate(`(() => {
      const read = ${BANDS};
      window.__ghost = null;
      const probe = () => {
        if (${AT(target)}) { const b = read(${JSON.stringify(kind)}); if (b.ghost) window.__ghost = b; }
        requestAnimationFrame(probe);
      };
      requestAnimationFrame(probe);
    })()`);
    await link.click();
    await page.waitForFunction(AT(target), null, { timeout: 120_000 });
    await page.waitForSelector(kind === "list" ? '[data-testid="millionea-tickets"] > li > a' : '[data-testid="millionea-ticket"] article', { timeout: 120_000 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.waitForTimeout(1_500);
    const landed = await page.evaluate(`(${BANDS})(${JSON.stringify(kind)})`);
    const ghost = await page.evaluate("window.__ghost");
    await page.screenshot({ path: `${OUT}/${name.replace("+", "-")}-${locale}-${width}-landed.png` });
    return { ghost, landed };
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

const rows = [];
const GRID = LOCALES.flatMap((locale) => WIDTHS.map((width) => ({ locale, width })));
const CASES = [
  // The fresh ticket's card on the list — the ticket's drawing with the free cancel's band (first: inside its window).
  ...GRID.map((g) => ({ ...g, name: "ticket+cancel", kind: "ticket", from: "/millionea/tickets", click: `[data-testid="millionea-tickets"] a[href*="${fresh}"]`, target: "*ticket*", keys: ["card", "serial", "seal", "sealH", "cancel", "cancelH", "clause"] })),
  // The ticket's back link (a button: with no history it pushes the list) — the list's loading drawing.
  ...GRID.map((g) => ({ ...g, name: "list", kind: "list", from: `/millionea/tickets/${encodeURIComponent(running)}`, click: "main button:has(svg)", target: "/millionea/tickets", keys: ["strip", "card1", "card1H", "card2"] })),
  // The running ticket's card on the list — the ticket's loading drawing, no band.
  ...GRID.map((g) => ({ ...g, name: "ticket", kind: "ticket", from: "/millionea/tickets", click: `[data-testid="millionea-tickets"] a[href*="${running}"]`, target: "*ticket*", keys: ["card", "serial", "seal", "sealH", "clause"] })),
];
for (const c of CASES) {
  const { locale, width } = c;
  const tag = `${c.name} @${width} ${locale}`;
  if (c.name === "ticket+cancel" && Date.now() > freshUntil) { ok(`${tag} · measured inside the window`, false, "the fresh ticket's window ran out before this hop"); continue; }
  const r = await hop(c);
  rows.push({ tag, ...r });
  if (r.error) { ok(`${tag} · measured`, false, r.error); continue; }
  if (!r.ghost) { ok(`${tag} · a ghost frame was caught`, false, "no frame with the ghost up — this case proved nothing"); continue; }
  const keys = c.keys;
  const off = keys.filter((k) => r.ghost[k] != null && r.landed[k] != null && Math.abs(r.landed[k] - r.ghost[k]) > TOL)
    .map((k) => `${k}: ghost ${r.ghost[k]} → page ${r.landed[k]} (${r.landed[k] - r.ghost[k] > 0 ? "+" : ""}${r.landed[k] - r.ghost[k]})`);
  const missing = keys.filter((k) => r.ghost[k] == null || r.landed[k] == null);
  console.log(`   ${tag.padEnd(22)} ${keys.map((k) => `${k} ${r.ghost[k]}→${r.landed[k]}`).join(" · ")}`);
  ok(`${tag} · the page lands on its ghost's bands (±${TOL}px)`, off.length === 0 && missing.length === 0, [...off, ...missing.map((k) => `${k} unread`)].join(" | "));
}
writeFileSync(`${OUT}/ghosts.json`, JSON.stringify(rows, null, 2));
await browser.close();
console.log(`\nmaswali-ticket-ghosts: ${pass} passed, ${fail} failed · ${OUT}/ghosts.json`);
process.exit(fail === 0 ? 0 : 1);
