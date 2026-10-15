#!/usr/bin/env node
/**
 * qa:journey-updown — release J's real-browser proof: Juu/Chini in the journey's language, seen through a staff preview
 * pass (the Vodacom plan S12, WP15 step 1 — `docs/design-system/v5-2026-09-29-simplified-journey/S12-PLAN.md`).
 *
 *   KP_BASE=http://localhost:3111 npm run qa:journey-updown -- <OUTPUT_DIR_OUTSIDE_THE_REPO>
 *   KP_ONLY=chip,tap,side,low,back,closed,keys,tiles   KP_LOCALES=sw,en,zh   KP_WIDTHS=320,360,390,768,1280,1920
 *   ENGINE=webkit|firefox runs the same cells on another engine (Chromium by default).
 *
 * Drives a LOCAL in-memory dev server. Every cell signs in a FRESH player (`seed-admin`, role PLAYER, its own balance),
 * so no cell inherits another's money; the chain is stood up by `/api/dev-test/updown-seed` (the `mock` feed) and armed
 * by `updown-advance`, and the closed-round cells take a round through `updown-handover` (arm → its betting shuts → its
 * close → settle, which opens the successor where it ended) — the production service functions, unmodified.
 * Money is read from the SERVER — the classic /wallet pill over the player's own session (no preview pass), and the
 * round's own "you're in" row on a fresh load — and every bet a page SENDS is counted at the network (a server action
 * whose body carries an idempotency key), passively.
 *
 *   chip    a chip sets the stake: the box, the one pressed chip, the prompt and the side buttons' names carry it
 *   tap     one tap is one bet: the board card's Up, then the round page's Down (requests, wallet, the round's rows)
 *   side    the ?side= panel: the chosen-side chip, a CTA that names the stake, a projection equal to the classic
 *           panel's `projectedReturn` at the same stake and instant, and one press of the gold commit is one bet
 *   low     balance 0 (the deposit door alone) · part of the stake ("Use … instead" SETS, never places) · a bonus that
 *           covers the stake (no low state, and the server takes the bet) · every rail paused · a deposit in flight
 *   back    the deposit door's address and this tab's marker; the way back opens preset; the same link in another tab
 *           opens at the minimum; nothing is placed
 *   closed  a round that shut while the player was away: the notice with no button while it is undecided, then the
 *           button once its successor exists, then the successor's panel preset; nothing is placed
 *   keys    Enter in the stake box places nothing; Enter HELD on the commit and on Up places exactly one bet; Enter on
 *           "Use … instead" sets the stake and places nothing (the A8i rules, `qa:enter-where-pressed`'s method)
 *   tiles   the board card's arm, the round page's two-way arm, its ?side= panel, the low block and the closed notice in
 *           every language × width: an element tile and a viewport tile each, a contact sheet per surface and
 *           language, and the measurable layout rules checked on every tile. ⛔ A tile is evidence only once a person
 *           has READ it.
 *
 * ⭐ THE TAB MARKER IS READ FROM THIS CHECKOUT (`JUD_TAB_MARKER`, `src/lib/journey/updown-arm.ts`): with it, the way
 *   back and the successor open at the carried stake; without it (release J before WP10b's privacy line), at the
 *   round's minimum, and no marker is written. Run the drive from the checkout the server serves.
 * Exit 0 every selected cell PASS · 1 a FAIL · 2 a refused premise · 3 a BLOCKED or NOT MEASURED cell outstanding.
 * ⛔ LOCAL ONLY: it places bets and toggles the local server's deposit rails (each restored in a `finally`).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import * as playwright from "playwright";
import { premise, mintStaffPass, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.KP_BASE ?? "http://localhost:3111").replace(/\/$/, "");
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-journey-updown-${Date.now()}`));
const refuse = (why) => { console.error(`REFUSED: ${why}`); process.exit(2); };
{ const rel = relative(ROOT, OUT); if (!rel.startsWith("..") && !isAbsolute(rel)) refuse("the output must be outside the repository"); }
const SECTIONS = ["chip", "tap", "side", "low", "back", "closed", "keys", "tiles"];
const ONLY = (process.env.KP_ONLY ?? "").split(",").filter(Boolean);
if (ONLY.some((s) => !SECTIONS.includes(s))) refuse(`KP_ONLY names ${SECTIONS.join(",")}`);
const run = (s) => !ONLY.length || ONLY.includes(s);
const LOCALES = (process.env.KP_LOCALES ?? "sw,en,zh").split(",");
const WIDTHS = (process.env.KP_WIDTHS ?? "320,360,390,768,1280,1920").split(",").map(Number);
if (LOCALES.some((l) => !["sw", "en", "zh"].includes(l))) refuse("KP_LOCALES takes sw,en,zh");
if (WIDTHS.some((w) => ![320, 360, 390, 768, 1280, 1920].includes(w))) refuse("KP_WIDTHS takes 320,360,390,768,1280,1920");
const HEIGHT = (w) => (w <= 360 ? 640 : w === 390 ? 844 : w === 768 ? 1024 : w === 1280 ? 900 : 1080);
const ENGINE = process.env.ENGINE || "chromium";
if (!["chromium", "webkit", "firefox"].includes(ENGINE)) refuse("ENGINE is chromium, webkit or firefox");

const MARKER = /export const JUD_TAB_MARKER\s*=\s*(true|false)/.exec(readFileSync(join(ROOT, "src/lib/journey/updown-arm.ts"), "utf8"))?.[1];
if (!MARKER) refuse("JUD_TAB_MARKER is not readable in src/lib/journey/updown-arm.ts");
const MARKS = MARKER === "true";
/** The chain this drive stands up: BTC, 15-minute rounds. Betting shuts exactly DURATION minutes after a round opens. */
const DURATION = 15;
const LOCK_MS = DURATION * 60_000;

const pre = await premise(BASE);
if (pre.refuse) refuse(pre.refuse);
if (pre.health?.security?.adminTotp !== "DISABLED") refuse("start the local server with DISABLE_ADMIN_TOTP=true (the preview door and the officer pages need it)");
mkdirSync(join(OUT, "tiles"), { recursive: true });
mkdirSync(join(OUT, "sheets"), { recursive: true });

const results = [], consoleRows = [], tileRows = [];
const result = (state, label, detail = "") => { results.push({ state, label, detail }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); };
const ok = (label, cond, detail = "") => result(cond ? "PASS" : "FAIL", label, detail);
const blocked = (label, why) => result("BLOCKED", label, why);
const notMeasured = (label, why) => result("NOT MEASURED", label, why);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** "TZS 2,500" → 2500; the first shilling figure in a string, else NaN. */
const tzsIn = (s) => { const m = /TZS[^0-9]{0,3}([0-9][0-9,]*)/.exec(String(s ?? "").replace(/ |&nbsp;|&#160;/g, " ")); return m ? Number(m[1].split(",").join("")) : Number.NaN; };
/** Every digit in a string, as one number ("2,500" → 2500); NaN when there is none. */
const digits = (s) => { const d = String(s ?? "").replace(/[^0-9]/g, ""); return d ? Number(d) : Number.NaN; };
const grouped = (n) => n.toLocaleString("en-US");
/** Whether a chosen-side chip names Up, in any language (chips set their text in capitals). */
const namesUp = (s) => /\bup\b|juu|涨/i.test(String(s ?? ""));

const browser = await playwright[ENGINE].launch();
const bare = await playwright.request.newContext();
const host = new URL(BASE).hostname;
const asCookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
console.log(`qa:journey-updown ${BASE} · ${ENGINE} ${browser.version()} · tab marker ${MARKS ? "ON" : "OFF"} · output ${OUT}`);

let PASS;
try { PASS = await mintStaffPass(browser, BASE, { phone: "+255700000091", name: "Juu Chini QA Support" }); }
catch (e) { await browser.close(); refuse(`no staff preview pass: ${String(e.message).split("Call log:")[0].trim()}`); }
const contexts = new Set();
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.add(admin);
async function post(ctx, name, data = {}) {
  const res = await (ctx ? ctx.request : bare).post(`${BASE}/api/dev-test/${name}`, { data, timeout: 240_000 });
  const body = await res.json().catch(() => null);
  if (!res.ok() || body?.ok === false) throw new Error(`${name} answered ${res.status()}${body?.error ? `: ${body.error}` : ""}`);
  return body;
}
await post(admin, "seed-admin", { role: "ADMIN", phone: "+255700000092", name: "Juu Chini QA Admin" });
await post(null, "reset-rate-limits");
try {
  const seeded = await post(null, "updown-seed", { durations: [DURATION], assets: ["BTC"] });
  if (seeded.notes?.length) throw new Error(seeded.notes.join("; "));
} catch (e) { await browser.close(); refuse(`no Up & Down chain: ${e.message}`); }

/** Keeps the first-visit primer shut and the dev overlay out of the tiles (it is not the product). */
const INIT = () => {
  try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ }
  const hide = () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.head?.append(s); };
  if (document.head) hide(); else document.addEventListener("DOMContentLoaded", hide, { once: true });
};

/** A FRESH player, signed in on a context that holds the staff pass and `locale`. */
async function player({ balance = 100_000, locale = "en", viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport }); contexts.add(ctx);
  await ctx.addInitScript(INIT);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, asCookie(PASS)]);
  const phone = `+25571${String(parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
  const seeded = await post(ctx, "seed-admin", { role: "PLAYER", phone, name: "Juu Chini QA Player", balance });
  if (seeded.note) throw new Error("the synthetic player already existed — not a fresh account");
  const session = (await ctx.cookies(BASE)).find((c) => c.name === SESSION_COOKIE);
  if (!session) throw new Error("seed-admin set no session");
  return { ctx, phone, userId: seeded.userId, session, locale };
}
/** The same account in the CLASSIC product: its session, no preview pass. */
async function classicOf(p, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport }); contexts.add(ctx);
  await ctx.addInitScript(INIT);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, asCookie(p.session)]);
  return ctx;
}
/** The balance as the server draws it on /wallet's pill, over the player's own session and no pass. NaN if unreadable. */
async function balanceOf(p) {
  const res = await bare.get(`${BASE}/wallet`, { headers: { cookie: `${SESSION_COOKIE}=${p.session.value}; ${LOCALE_COOKIE}=en` }, maxRedirects: 0, timeout: 240_000 });
  const html = await res.text();
  const at = html.indexOf('data-testid="wallet-balance-pill"');
  if (at < 0) return Number.NaN;
  const open = html.lastIndexOf("<", at), close = html.indexOf(">", at);
  const label = /aria-label="([^"]*)"/.exec(html.slice(open, close + 1))?.[1];
  const fromLabel = tzsIn(label);
  if (Number.isFinite(fromLabel)) return fromLabel;
  return tzsIn(html.slice(close + 1, close + 6000).replace(/<[^>]*>/g, " "));
}
/** The balance once nothing is still moving: read after a settle and again two seconds later; the later is compared. */
async function settledBalance(p) { await sleep(1500); const first = await balanceOf(p); await sleep(2000); return { first, now: await balanceOf(p) }; }

/** Opens `route` on a new page of `ctx`, counting the bets that page SENDS. */
async function pageIn(ctx, route) {
  const page = await ctx.newPage();
  const sent = { bets: 0 };
  page.on("request", (r) => {
    if (r.method() !== "POST" || !r.headers()["next-action"]) return;
    let body = ""; try { body = r.postData() ?? ""; } catch { body = ""; }
    if (body.includes("idempotencyKey")) sent.bets += 1;
  });
  page.on("pageerror", (e) => consoleRows.push({ route, type: "pageerror", text: e.message }));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) consoleRows.push({ route, type: m.type(), text: m.text().slice(0, 400) });
    if (/hydrat/i.test(m.text()) && /mismatch|failed|didn't match/i.test(m.text())) result("FAIL", `${route}: hydration mismatch`, m.text().slice(0, 200));
  });
  await go(page, route);
  return { page, sent };
}
async function go(page, route) {
  const url = route.startsWith("http") ? route : BASE + route;
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 240_000 }); }
  catch (e) {
    if (!/interrupted by another navigation|NS_BINDING_ABORTED|frame was detached|ERR_ABORTED/i.test(String(e?.message ?? e))) throw e;
    await sleep(1000); await page.goto(url, { waitUntil: "domcontentloaded", timeout: 240_000 });
  }
  await page.waitForFunction(() => document.querySelector("main"), null, { timeout: 120_000 });
}
/** Waits until `locator` (a button) carries React's click handler: a click before hydration does nothing. */
async function hydrated(locator, timeout = 120_000) {
  const start = Date.now();
  await locator.waitFor({ state: "attached", timeout });
  while (Date.now() - start < timeout) {
    const ready = await locator.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$") && (typeof el[k]?.onClick === "function" || typeof el[k]?.onChange === "function"))).catch(() => false);
    if (ready) return;
    await sleep(250);
  }
  throw new Error("the control never hydrated");
}
/** The arm `kind` (two-way · confirm · closed), visible and hydrated, plus a beat for its after-hydration effects. */
async function arm(page, kind, size = null) {
  const loc = page.locator(`[data-jud="${kind}"]${size ? `[data-size="${size}"]` : ""}`).first();
  await loc.waitFor({ state: "visible", timeout: 120_000 });
  const control = loc.locator(kind === "closed" ? "a, button" : '[data-testid="jud-stake"]').first();
  if (await control.count()) await hydrated(control);
  await page.waitForTimeout(900);
  return loc;
}
const stakeOf = async (loc) => digits(await loc.locator('[data-testid="jud-stake"]').inputValue());
async function chip(loc, amount) {
  const button = loc.locator('[data-testid="jud-chips"] button').filter({ hasText: new RegExp(`^\\s*${grouped(amount).replace(",", "[,.\\s]?")}\\s*$`) }).first();
  await hydrated(button); await button.click(); await loc.page().waitForTimeout(400);
}
/** Holds `key` down: one press, `n` auto-repeats 35 ms apart, the release. */
async function hold(page, key, n = 20) {
  await page.keyboard.down(key); await page.waitForTimeout(60);
  for (let i = 0; i < n; i++) { await page.keyboard.down(key); await page.waitForTimeout(35); }
  await page.keyboard.up(key);
}
/** Closes a receipt the bet opened, if any (Escape answers the top dialog). */
async function dismissDialogs(page) {
  for (let i = 0; i < 3; i++) {
    const open = page.locator('[role="dialog"]:not([aria-hidden="true"]), [role="alertdialog"]:not([aria-hidden="true"])');
    if (!(await open.count())) return;
    await page.waitForTimeout(500); await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  }
}
/** The round BTC is running now, read without writing (`updown-observe` dry run); null when none. */
async function currentRound() { try { return (await post(null, "updown-observe", { asset: "BTC", dryRun: true })).round; } catch { return null; } }
/** A round open for betting with at least `minLeftMs` left: the current one, else a fresh one (`updown-advance`). */
async function openRound(minLeftMs = 5 * 60_000) {
  const left = (r) => (r ? Date.parse(r.opensAt) + LOCK_MS - Date.now() : -1);
  let r = await currentRound();
  if (left(r) < minLeftMs) { await post(null, "updown-advance"); r = await currentRound(); }
  if (left(r) < minLeftMs) throw new Error(`no BTC round with ${Math.round(minLeftMs / 1000)} s of betting left`);
  return r.roundId;
}
/** The round's own "you're in" row on a FRESH load: the server's record of this account's stakes. */
async function stakesOnRound(p, roundId) {
  const { page } = await pageIn(p.ctx, `/updown/${roundId}`);
  try {
    const loc = await arm(page, "two-way", "detail");
    const row = loc.locator(".kp-jud__in");
    if (!(await row.count())) return { up: 0, down: 0, text: "" };
    const up = await row.locator('[data-kit-chip-variant="yes"]').allInnerTexts(), down = await row.locator('[data-kit-chip-variant="no"]').allInnerTexts();
    return { up: up.length ? tzsIn(up[0]) : 0, down: down.length ? tzsIn(down[0]) : 0, text: (await row.innerText()).replace(/\s+/g, " ") };
  } finally { await page.close(); }
}
async function runCell(id, words, body) {
  try { await body(); } catch (e) { blocked(`${id} · ${words}`, String(e?.message ?? e).split("\n")[0].slice(0, 300)); }
}

/* ───────────────────────── chip · tap — the board card, then the round page ───────────────────────── */
if (run("chip") || run("tap")) await runCell("chip/tap", "the board card's chips and one-tap bets", async () => {
  await openRound(4 * 60_000);
  const p = await player({ balance: 100_000 });
  const { page, sent } = await pageIn(p.ctx, "/updown");
  const card = page.locator('article.mcardp:has([data-jud="two-way"])').first();
  const loc = await arm(page, "two-way", "card");
  const cardRound = (await card.locator("a.mcardp-open").getAttribute("href"))?.split("/").pop() ?? "";
  const min = await stakeOf(loc);
  const chips = (await loc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits);
  ok("chip.0 · fixture · the board card draws the journey arm: the stake box at the round's minimum, four chips in full figures, the first one the minimum",
    /^udr_/.test(cardRound) && min > 0 && chips.length === 4 && chips[0] === min && chips.every((c, i) => i === 0 || c > chips[i - 1]), JSON.stringify({ cardRound, min, chips }));
  const target = chips.includes(2500) ? 2500 : chips[2];
  await chip(loc, target);
  const after = await stakeOf(loc);
  const pressed = (await loc.locator('[data-testid="jud-chips"] button[aria-pressed="true"]').allInnerTexts()).map(digits);
  const prompt = await loc.locator(".kp-jud__prompt").innerText().catch(() => "");
  const upName = await loc.locator('[data-testid="jud-up"]').getAttribute("aria-label");
  const downName = await loc.locator('[data-testid="jud-down"]').getAttribute("aria-label");
  if (run("chip")) {
    ok(`chip.1 · a chip sets the stake: the box reads ${grouped(target)}, that chip alone is pressed, and the prompt and both side buttons' names carry it`,
      after === target && pressed.length === 1 && pressed[0] === target && tzsIn(prompt) === target && tzsIn(upName) === target && tzsIn(downName) === target,
      JSON.stringify({ after, pressed, prompt, upName, downName }));
    ok("chip.2 · a chip places nothing", sent.bets === 0, `bets sent ${sent.bets}`);
  }
  if (!run("tap")) return;
  const before = await balanceOf(p);
  await hydrated(loc.locator('[data-testid="jud-up"]'));
  await loc.locator('[data-testid="jud-up"]').click();
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') || document.querySelector(".kp-jud__in"), null, { timeout: 45_000 }).catch(() => {});
  const { first, now } = await settledBalance(p);
  ok(`tap.1 · one tap on the board card's Up is one bet: one request, the wallet down by exactly ${grouped(target)}`,
    sent.bets === 1 && now === before - target, JSON.stringify({ bets: sent.bets, before, first, now }));
  const rows1 = await stakesOnRound(p, cardRound);
  ok(`tap.2 · the round's own "you're in" row, read on a fresh load, holds Up TZS ${grouped(target)} and nothing on Down`, rows1.up === target && rows1.down === 0, JSON.stringify(rows1));
  // The round page's two-way arm (no side chosen): a chip, then Down.
  const rp = await pageIn(p.ctx, `/updown/${cardRound}`);
  const rloc = await arm(rp.page, "two-way", "detail");
  const down = (await rloc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits).includes(1000) ? 1000 : min;
  await chip(rloc, down);
  const b2 = await balanceOf(p);
  await hydrated(rloc.locator('[data-testid="jud-down"]'));
  await rloc.locator('[data-testid="jud-down"]').click();
  await rp.page.waitForFunction(() => document.querySelector('[role="dialog"]'), null, { timeout: 45_000 }).catch(() => {});
  const s2 = await settledBalance(p);
  ok(`tap.3 · one tap on the round page's Down is one bet: one request, the wallet down by exactly ${grouped(down)}`,
    rp.sent.bets === 1 && s2.now === b2 - down, JSON.stringify({ bets: rp.sent.bets, before: b2, first: s2.first, now: s2.now }));
  const rows2 = await stakesOnRound(p, cardRound);
  ok(`tap.4 · the round's own rows on a fresh load: Up TZS ${grouped(target)} and Down TZS ${grouped(down)}`, rows2.up === target && rows2.down === down, JSON.stringify(rows2));
  await page.close(); await rp.page.close();
});

/* ───────────────────────── side — the ?side= panel against the classic panel ───────────────────────── */
if (run("side")) await runCell("side", "the ?side= panel", async () => {
  const roundId = await openRound(4 * 60_000);
  // Both sides backed first, so the projection is a real figure and not the empty round's refund.
  const crowd = await player({ balance: 100_000 });
  {
    const c = await pageIn(crowd.ctx, `/updown/${roundId}`);
    const cl = await arm(c.page, "two-way", "detail");
    await chip(cl, (await cl.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits)[3]);
    await hydrated(cl.locator('[data-testid="jud-up"]')); await cl.locator('[data-testid="jud-up"]').click();
    await c.page.waitForTimeout(2500); await dismissDialogs(c.page);
    await chip(cl, (await cl.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits)[1]);
    await cl.locator('[data-testid="jud-down"]').click();
    await c.page.waitForTimeout(2500);
    ok("side.0 · fixture · another player backs both sides first (two bets), so the projection is a real figure", c.sent.bets === 2, `bets ${c.sent.bets}`);
    await c.page.close();
  }
  const p = await player({ balance: 100_000 });
  const j = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
  const loc = await arm(j.page, "confirm");
  const chosen = (await loc.locator('[data-testid="jud-chosen"]').innerText()).replace(/\s+/g, " ");
  const min = await stakeOf(loc);
  const ctaMin = await loc.locator('[data-testid="jud-place"]').innerText();
  ok("side.1 · the ?side=UP panel: the chosen-side chip names Up, the box opens at the minimum, and the gold commit names that stake",
    namesUp(chosen) && min > 0 && tzsIn(ctaMin) === min && !(await loc.locator('[data-testid="jud-place"]').isDisabled()),
    JSON.stringify({ chosen, min, cta: ctaMin.replace(/\s+/g, " ") }));
  // The classic panel on the same round, same account, no pass: its projection is `projectedReturn` too.
  const cctx = await classicOf(p);
  const cp = await cctx.newPage();
  await go(cp, `/updown/${roundId}?side=UP`);
  const panel = cp.locator('[data-testid="updown-stake-panel"]');
  await panel.waitFor({ state: "visible", timeout: 120_000 });
  await hydrated(panel.locator('[role="radio"]').first());
  const classicStakes = await panel.locator('[role="radio"][title]').evaluateAll((els) => els.map((e) => e.getAttribute("title")));
  const jchips = (await loc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits);
  const common = jchips.filter((v) => classicStakes.some((t) => tzsIn(t) === v)).slice(0, 2);
  ok("side.2 · fixture · the classic panel and the journey chips share stakes to compare at", common.length > 0, JSON.stringify({ classicStakes, jchips }));
  const classicAt = async (v) => {
    const idx = classicStakes.findIndex((t) => tzsIn(t) === v);
    await panel.locator('[role="radio"][title]').nth(idx).click(); await cp.waitForTimeout(500);
    return tzsIn(await panel.locator("span[title] .amount").first().innerText().catch(() => ""));
  };
  for (const v of common) {
    let c1 = await classicAt(v);
    await chip(loc, v);
    let jv = tzsIn(await loc.locator('[data-testid="jud-projection"]').innerText().catch(() => ""));
    let c2 = await classicAt(v);
    if (c1 !== c2) { c1 = await classicAt(v); await chip(loc, jchips[0] === v ? jchips[1] : jchips[0]); await chip(loc, v); jv = tzsIn(await loc.locator('[data-testid="jud-projection"]').innerText().catch(() => "")); c2 = await classicAt(v); }
    const cta = await loc.locator('[data-testid="jud-place"]').innerText();
    ok(`side.3 · at TZS ${grouped(v)} the journey's projection equals the classic panel's (the one engine, projectedReturn, at the same instant), and the commit names the stake`,
      Number.isFinite(jv) && jv === c1 && c1 === c2 && tzsIn(cta) === v, JSON.stringify({ stake: v, journey: jv, classicBefore: c1, classicAfter: c2, cta: cta.replace(/\s+/g, " ") }));
  }
  const note = await loc.locator(".kp-jud__note").allInnerTexts();
  ok("side.4 · the qualifier stands under the commit while a projection shows (udEstimateNote)", note.some((n) => n.trim().length > 20), JSON.stringify(note));
  ok("side.5 · reading and choosing placed nothing", j.sent.bets === 0, `bets ${j.sent.bets}`);
  const stake = await stakeOf(loc);
  const before = await balanceOf(p);
  await hydrated(loc.locator('[data-testid="jud-place"]'));
  await loc.locator('[data-testid="jud-place"]').click();
  await j.page.waitForFunction(() => document.querySelector('[role="dialog"]'), null, { timeout: 45_000 }).catch(() => {});
  const s = await settledBalance(p);
  ok(`side.6 · one press of the gold commit is one bet: one request, the wallet down by exactly ${grouped(stake)}`, j.sent.bets === 1 && s.now === before - stake, JSON.stringify({ bets: j.sent.bets, before, first: s.first, now: s.now }));
  const rows = await stakesOnRound(p, roundId);
  ok(`side.7 · the round's own row on a fresh load holds Up TZS ${grouped(stake)}`, rows.up === stake && rows.down === 0, JSON.stringify(rows));
  await j.page.close(); await cp.close();
});

/* ───────────────────────── low — every branch the drive can seed ───────────────────────── */
async function lowProbe(loc) {
  return loc.evaluate((root) => {
    const vis = (el) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
    const stake = root.querySelector('[data-testid="jud-stake"]'), place = root.querySelector('[data-testid="jud-place"]');
    const deposit = root.querySelector('[data-testid="journey-sheet-deposit"]'), instead = root.querySelector('[data-testid="jud-use-instead"]');
    return {
      stake: stake?.value, invalid: stake?.getAttribute("aria-invalid"), describedBy: place?.getAttribute("aria-describedby"),
      placeDisabled: !!place?.disabled, cta: place?.innerText.replace(/\s+/g, " "),
      deposit: vis(deposit) ? deposit.innerText.replace(/\s+/g, " ") : null, depositGilt: deposit ? getComputedStyle(deposit).backgroundImage.includes("gradient(") : null,
      instead: vis(instead) ? instead.innerText.replace(/\s+/g, " ") : null,
      callout: [...root.querySelectorAll('[role="note"], .callout, [class*="callout"]')].map((c) => c.innerText.replace(/\s+/g, " ")).join(" | "),
      text: root.innerText.replace(/\s+/g, " "),
    };
  });
}
if (run("low")) {
  await runCell("low.zero", "balance 0", async () => {
    const roundId = await openRound(4 * 60_000);
    const p = await player({ balance: 0 });
    const { page, sent } = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
    const loc = await arm(page, "confirm");
    const g = await lowProbe(loc);
    ok("low.1 · balance 0: the low block — the gilt deposit door naming its amount and the rails, no 'Use … instead', the box flagged, the commit shut and described",
      !!g.deposit && g.depositGilt === true && Number.isFinite(tzsIn(g.deposit)) && g.instead === null && g.invalid === "true" && g.placeDisabled && !!g.describedBy, JSON.stringify(g));
    ok("low.2 · nothing is placed in a low state", sent.bets === 0, `bets ${sent.bets}`);
    await page.close();
  });
  await runCell("low.part", "part of the stake", async () => {
    const roundId = await openRound(4 * 60_000);
    const p = await player({ balance: 1200 });
    const { page, sent } = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
    const loc = await arm(page, "confirm");
    const top = (await loc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits).at(-1);
    await chip(loc, top);
    const g = await lowProbe(loc);
    const insteadAt = tzsIn(g.instead);
    ok(`low.3 · balance 1,200 at TZS ${grouped(top)}: the deposit door AND "Use TZS … instead" at no more than the balance`,
      !!g.deposit && Number.isFinite(insteadAt) && insteadAt > 0 && insteadAt <= 1200 && g.placeDisabled, JSON.stringify(g));
    const b = await balanceOf(p);
    await hydrated(loc.locator('[data-testid="jud-use-instead"]'));
    await loc.locator('[data-testid="jud-use-instead"]').click(); await page.waitForTimeout(700);
    const h = await lowProbe(loc);
    const s = await settledBalance(p);
    ok("low.4 · \"Use … instead\" SETS the stake and places nothing: the box reads it, the low block is gone, the commit is open and names it, no request, the wallet unchanged",
      digits(h.stake) === insteadAt && h.deposit === null && !h.placeDisabled && tzsIn(h.cta) === insteadAt && sent.bets === 0 && s.now === b, JSON.stringify({ after: h, bets: sent.bets, before: b, now: s.now }));
    await page.close();
  });
  // ⛔ A bonus that covers the stake cannot be SEEDED: the bonus wallet is withdrawn from the product, so every grant door
  // refuses ("The bonus wallet is withdrawn from the product, so no new bonus can be granted." — `creditBonus`, code
  // WITHDRAWN; /admin/bonuses shows WITHDRAWN). Only a legacy balance can still exist, and no dev door writes one.
  notMeasured("low.5 · a bonus that covers the stake draws no low state, and the server takes the bet",
    "the bonus wallet is withdrawn from the product: every grant refuses (creditBonus WITHDRAWN), and no dev door writes a bonus balance. The arm's arithmetic (balance + bonus is spendable) is rendered by test:journey-updown 5.5 and proved in §2; the server's bonus spend is the classic bet path's");
  await runCell("low.pending", "a deposit in flight", async () => {
    const officer = await admin.newPage();
    await go(officer, "/admin/payments?tab=rails");
    const mock = officer.getByRole("radio", { name: /Mock/ });
    await officer.waitForTimeout(1500);
    if (!(await mock.count()) || (await mock.getAttribute("aria-checked")) !== "true") throw new Error("the pending cell needs the mock payment adapter selected; no external provider may be called");
    const asyncSwitch = officer.locator('[aria-label^="Demo async (test):"]');
    const wasOn = (await asyncSwitch.getAttribute("aria-label")) === "Demo async (test): on";
    try {
      if (!wasOn) { await asyncSwitch.click(); await officer.locator('[aria-label="Demo async (test): on"]').waitFor({ timeout: 60_000 }); }
      const roundId = await openRound(4 * 60_000);
      const p = await player({ balance: 0 });
      const d = await pageIn(p.ctx, "/wallet/deposit?amount=1000");
      await railOpen(d.page);
      await d.page.locator("label:has(input#provider-MPESA)").click();
      await d.page.getByRole("button", { name: "Confirm deposit", exact: true }).click();
      await d.page.getByRole("alertdialog").getByRole("button", { name: "Deposit", exact: true }).click();
      await d.page.waitForURL((u) => u.pathname !== "/wallet/deposit", { timeout: 120_000 });
      await d.page.close();
      const { page, sent } = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
      const loc = await arm(page, "confirm");
      const g = await lowProbe(loc);
      const track = await loc.locator('a[href^="/wallet/receipt/"]').count();
      ok("low.9 · a deposit in flight (the mock rail's PROCESSING): the pending note with its receipt link, no second deposit door, no \"instead\", the commit shut, nothing placed",
        track === 1 && g.deposit === null && g.instead === null && g.placeDisabled && sent.bets === 0, JSON.stringify({ track, ...g }));
      await page.close();
    } finally {
      if (!wasOn && (await asyncSwitch.getAttribute("aria-label")) === "Demo async (test): on") { await asyncSwitch.click(); await officer.locator('[aria-label="Demo async (test): off"]').waitFor({ timeout: 60_000 }); }
      await officer.close();
    }
  });
  await runCell("low.rails", "every rail paused", async () => {
    const officer = await admin.newPage();
    await go(officer, "/admin/payments?tab=health");
    const live = officer.getByRole("button", { name: "Deposits LIVE", exact: true }), paused = officer.getByRole("button", { name: "Deposits PAUSED", exact: true });
    await officer.waitForTimeout(1500);
    const startLive = await live.count(), startPaused = await paused.count();
    if (startLive < 1 || startPaused !== 0) throw new Error(`the all-rails cell needs every rail open first; live=${startLive} paused=${startPaused}`);
    try {
      while (await live.count()) {
        const prior = await paused.count();
        await hydrated(live.first()); await live.first().click();
        await officer.getByPlaceholder("PAUSE", { exact: true }).fill("PAUSE");
        await officer.getByRole("button", { name: "Pause", exact: true }).click();
        await officer.getByPlaceholder("PAUSE", { exact: true }).waitFor({ state: "hidden" });
        await officer.waitForFunction((n) => [...document.querySelectorAll("button")].filter((b) => b.textContent.replace(/\s/g, "") === "DepositsPAUSED").length === n, prior + 1);
      }
      for (const balance of [0, 1200]) {
        const roundId = await openRound(3 * 60_000);
        const p = await player({ balance });
        const { page, sent } = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
        // The rails' state reaches a page on its next read: reload until the pause shows (at most a minute).
        let loc = null, g = null;
        for (let i = 0; i < 6; i++) {
          loc = await arm(page, "confirm");
          const top = (await loc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits).at(-1);
          if (top) await chip(loc, top); // at balance 0 the minimum is already short, and a low frame draws no stake chips
          g = await lowProbe(loc);
          if (g.deposit === null) break;
          await sleep(10_000); await go(page, `/updown/${roundId}?side=UP`);
        }
        ok(`low.7 · every rail paused, balance ${grouped(balance)}: no deposit door, the paused line, ${balance ? "\"Use … instead\" still offered" : "no money option at all"}, nothing placed`,
          g.deposit === null && (g.instead !== null) === (balance > 0) && /paused|unavailable|imesimamishwa|暂停/i.test(g.text) && g.placeDisabled && sent.bets === 0, JSON.stringify(g));
        await page.close();
      }
    } finally {
      for (let n = 0; n < 12 && (await paused.count()); n++) {
        const prior = await live.count();
        await hydrated(paused.first()); await paused.first().click();
        await officer.waitForFunction((k) => [...document.querySelectorAll("button")].filter((b) => b.textContent.replace(/\s/g, "") === "DepositsLIVE").length === k, prior + 1).catch(() => {});
      }
      ok("low.8 · fixture · every rail is open again", (await live.count()) === startLive && (await paused.count()) === 0, `live ${await live.count()} paused ${await paused.count()}`);
      await officer.close();
    }
    // …and open to a player again before any later cell needs a deposit door.
    const q = await player({ balance: 0 });
    const d = await pageIn(q.ctx, "/wallet/deposit?amount=1000");
    await railOpen(d.page);
    await d.page.close();
  });
}

/** Waits (reloading, at most two minutes) until the deposit page offers M-Pesa again: a rail's state reaches a page on
 *  its next read, and Playwright retargets a click on a label to its control, so a paused rail's tile waits forever. */
async function railOpen(page) {
  for (let i = 0; i < 12; i++) {
    const radio = page.locator("input#provider-MPESA");
    if ((await radio.count()) && !(await radio.isDisabled())) return;
    await sleep(10_000); await go(page, page.url());
  }
  throw new Error("M-Pesa stayed unavailable on the deposit page for two minutes");
}

/* ───────────────────────── back — the deposit door, the marker, the way back ───────────────────────── */
async function depositDoor(p, roundId, stake) {
  const view = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
  const loc = await arm(view.page, "confirm");
  await chip(loc, stake);
  const door = loc.locator('[data-testid="journey-sheet-deposit"]');
  const offer = tzsIn(await door.innerText());
  await hydrated(door);
  await door.click();
  await view.page.waitForURL((u) => u.pathname === "/wallet/deposit", { timeout: 120_000 });
  const url = new URL(view.page.url());
  const marker = await view.page.evaluate(() => sessionStorage.getItem("kp-pending-bet"));
  return { ...view, offer, url, marker };
}
function markerVerdict(raw, bet, owner) {
  if (!MARKS) return raw === null;
  try { const m = JSON.parse(raw); return m.bet === bet && m.owner === owner && m.k === undefined && Math.abs(Date.now() - m.at) < 10 * 60_000; } catch { return false; }
}
if (run("back")) await runCell("back", "the deposit door and the way back", async () => {
  const roundId = await openRound(5 * 60_000);
  // TZS 1,000: the minimum is affordable (so the chips show), the chosen 2,500 is not — the deposit door's story.
  const p = await player({ balance: 1000 });
  const stake = 2500;
  const d = await depositDoor(p, roundId, stake);
  ok(`back.1 · the deposit door's address: /wallet/deposit, amount = the offer (TZS ${grouped(d.offer)}), bet = ${roundId}.UP.${stake}, from = low-balance`,
    d.url.searchParams.get("amount") === String(d.offer) && d.url.searchParams.get("bet") === `${roundId}.UP.${stake}` && d.url.searchParams.get("from") === "low-balance", d.url.search);
  ok(MARKS ? "back.2 · this tab's marker names the round's bet and its owner, with no key (a selection, never an intent)" : "back.2 · the tab marker is OFF in this checkout: nothing is written",
    markerVerdict(d.marker, `${roundId}.UP.${stake}`, p.userId), String(d.marker));
  await post(null, "seed-wallet", { phone: p.phone, amount: 5000 });
  await go(d.page, `/updown/${roundId}?bet=${roundId}.UP.${stake}`);
  const loc = await arm(d.page, "confirm");
  const min = digits((await loc.locator('[data-testid="jud-chips"] button').allInnerTexts())[0]);
  const v = await stakeOf(loc), chosen = await loc.locator('[data-testid="jud-chosen"]').innerText(), cta = await loc.locator('[data-testid="jud-place"]').innerText();
  ok(MARKS ? `back.3 · the way back (the deposit landed) opens the round's panel on Up, preset to the carried TZS ${grouped(stake)}, the commit naming it` : "back.3 · the way back opens the round's panel on Up at the minimum (no marker)",
    v === (MARKS ? stake : min) && namesUp(chosen) && tzsIn(cta) === v && !(await loc.locator('[data-testid="jud-place"]').isDisabled()), JSON.stringify({ v, chosen, cta: cta.replace(/\s+/g, " ") }));
  const other = await pageIn(p.ctx, `/updown/${roundId}?bet=${roundId}.UP.${stake}`);
  const oloc = await arm(other.page, "confirm");
  const ov = await stakeOf(oloc);
  ok("back.4 · the same link in another tab (no marker) opens at the minimum: a link never sets a stake", ov === min, JSON.stringify({ ov, min }));
  const s = await settledBalance(p);
  ok("back.5 · nothing was placed anywhere on the way: no bet request, the wallet holds the 1,000 plus what landed", d.sent.bets === 0 && other.sent.bets === 0 && s.now === 6000, JSON.stringify({ bets: d.sent.bets + other.sent.bets, now: s.now }));
  await d.page.close(); await other.page.close();
});

/* ───────────────────────── closed — the round that shut while the player was away ───────────────────────── */
let closedFixture = null;
if (run("closed") || run("tiles")) await runCell("closed", "the round that closed", async () => {
  // ⭐ A DECIDED round needs the DATED dev feed. `mock` quotes the price of now, which is stale for a boundary minutes back,
  // so a close would wait forever ("open price … not published yet — will retry this boundary"); `mock-bars` prices each
  // boundary (dev only, refused in production by construction). Switched through the seed's own door, restored after.
  await post(null, "updown-seed", { durations: [DURATION], assets: ["BTC"], feedProvider: "mock-bars" });
  try { await closedCells(); } finally { await post(null, "updown-seed", { durations: [DURATION], assets: ["BTC"], feedProvider: "mock" }).catch(() => {}); }
});
async function closedCells() {
  const OPEN_FOR_S = 75;
  const armed = await post(null, "updown-handover", { phase: "arm", leadSeconds: OPEN_FOR_S + DURATION * 60 * 0.2 });
  const r2 = armed.out?.[0]?.round;
  if (!r2?.id) throw new Error(`the handover arm opened no round: ${JSON.stringify(armed).slice(0, 300)}`);
  if (Date.parse(r2.opensAt) + LOCK_MS - Date.now() > (OPEN_FOR_S + 60) * 1000) throw new Error(`the arm returned an older round (${r2.id}, opens ${r2.opensAt}) — the chain is still retrying an earlier boundary: ${JSON.stringify(armed.out?.[0]?.result).slice(0, 200)}`);
  const lockAt = Date.parse(r2.opensAt) + LOCK_MS, closeAt = Date.parse(r2.closesAt);
  if (lockAt - Date.now() < 30_000) throw new Error(`the armed round shuts in ${Math.round((lockAt - Date.now()) / 1000)} s — too soon to reach its deposit door`);
  const p = await player({ balance: 1000 });
  const stake = 2500;
  const d = await depositDoor(p, r2.id, stake);
  ok(`closed.0 · fixture · the deposit door on the round about to shut carries ${r2.id}.UP.${stake}${MARKS ? " and this tab's marker" : ""}`,
    d.url.searchParams.get("bet") === `${r2.id}.UP.${stake}` && markerVerdict(d.marker, `${r2.id}.UP.${stake}`, p.userId), d.url.search);
  await post(null, "seed-wallet", { phone: p.phone, amount: 5000 });
  await sleep(Math.max(0, lockAt - Date.now() + 3000));
  await go(d.page, `/updown/${r2.id}?bet=${r2.id}.UP.${stake}`);
  const shut = await arm(d.page, "closed");
  const t1 = (await shut.innerText()).replace(/\s+/g, " ");
  ok("closed.1 · back after betting shut, before the result: the notice alone — no button (its successor is not known yet), no stake panel",
    t1.length > 5 && (await shut.locator('[data-testid="jud-next-round"]').count()) === 0 && (await d.page.locator('[data-testid="jud-place"]').count()) === 0, t1);
  await sleep(Math.max(0, closeAt - Date.now() + 1500));
  // ⛔ The settle acts on the chain's LATEST round, whatever it is: asked twice, it settles the successor it just opened
  // and opens the next — a chain marched into the future (measured: 30 rounds in eight minutes). So it is asked AT MOST
  // ONCE, and only while the round's own page shows no successor (the scheduler, on the dated feed, may already have
  // closed it at its boundary through the same `advanceChain`). After that, the page is only read.
  const button0 = async () => {
    await go(d.page, `/updown/${r2.id}?bet=${r2.id}.UP.${stake}`);
    const shown = d.page.locator('[data-jud="closed"] [data-testid="jud-next-round"]');
    return (await shown.count()) ? (await shown.getAttribute("href"))?.split("?")[0].split("/").pop() ?? null : null;
  };
  let r3 = await button0(), settledBy = r3 ? "the scheduler" : null, last = null;
  if (!r3) {
    const settled = await post(null, "updown-handover", { phase: "settle" }).catch((e) => ({ error: e.message }));
    last = settled.out?.[0] ?? settled;
    if (last?.closed?.id === r2.id && last?.opened?.id) { r3 = last.opened.id; settledBy = "the handover settle"; }
    else if (last?.closed?.id && last.closed.id !== r2.id) throw new Error(`the settle closed another round (${last.closed.id}), not ${r2.id}: the chain moved under the drive — restart the local server for a clean chain`);
  }
  for (const until = Date.now() + 4 * 60_000; !r3 && Date.now() < until;) { await sleep(15_000); r3 = await button0(); if (r3) settledBy = "the scheduler"; }
  if (!r3) throw new Error(`no successor at the round's close within four minutes: ${JSON.stringify(last).slice(0, 400)}`);
  result("INFO", `closed · ${r2.id} settled by ${settledBy}; successor ${r3}`);
  await go(d.page, `/updown/${r2.id}?bet=${r2.id}.UP.${stake}`);
  const done = await arm(d.page, "closed");
  const button = done.locator('[data-testid="jud-next-round"]');
  const href = await button.getAttribute("href").catch(() => null);
  ok(`closed.2 · once the round is settled and its successor exists: the notice and the button to ${r3}, carrying Up${MARKS ? ` and TZS ${grouped(stake)}` : ""}`,
    (await button.count()) === 1 && href === `/updown/${r3}?bet=${r3}.UP${MARKS ? `.${stake}` : ""}`, String(href));
  closedFixture = { round: r2.id, successor: r3, stake };
  await hydrated(button); await button.click();
  await d.page.waitForURL((u) => u.pathname === `/updown/${r3}`, { timeout: 120_000 });
  const next = await arm(d.page, "confirm");
  const v = await stakeOf(next), chosen = await next.locator('[data-testid="jud-chosen"]').innerText();
  const min = digits((await next.locator('[data-testid="jud-chips"] button').allInnerTexts())[0]);
  ok(`closed.3 · the successor's panel opens on Up${MARKS ? `, preset to TZS ${grouped(stake)}` : " at the minimum"}, its commit open — and waiting for a tap`,
    v === (MARKS ? stake : min) && namesUp(chosen) && !(await next.locator('[data-testid="jud-place"]').isDisabled()), JSON.stringify({ v, chosen }));
  await d.page.waitForTimeout(3000);
  const s = await settledBalance(p);
  ok("closed.4 · nothing was placed by the notice, the button or the successor's panel: no bet request, the wallet holds the 1,000 plus what landed", d.sent.bets === 0 && s.now === 6000, JSON.stringify({ bets: d.sent.bets, now: s.now }));
  await d.page.close();
}
if (run("closed")) {
  notMeasured("closed.5 · the notice's \"next round starts at\" line", "not producible through the dev doors without a shortcut: it needs a SETTLED round with no successor row while its chain runs and its next boundary is ahead (`updown-handover` settles and opens in one call). Rendered in en, sw and zh by test:journey-updown 5.6; its rule (a future server instant only) proved in §4");
  notMeasured("closed.6 · the notice's money line (\"your money is in\")", "it reads only a CONFIRMED deposit from S9's owned status, which is not on this base: the page passes null, so the line cannot show. Rendered in en, sw and zh by test:journey-updown 5.6 with a confirmed figure; its rule (never the address) proved in §4");
}

/* ───────────────────────── keys — Enter where pressed, a held key presses once ───────────────────────── */
if (run("keys")) await runCell("keys", "Enter where pressed", async () => {
  const roundId = await openRound(4 * 60_000);
  const p = await player({ balance: 100_000 });
  const { page, sent } = await pageIn(p.ctx, `/updown/${roundId}?side=UP`);
  const loc = await arm(page, "confirm");
  const stake = await stakeOf(loc);
  const b0 = await balanceOf(p);
  await loc.locator('[data-testid="jud-stake"]').focus();
  await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
  const s0 = await settledBalance(p);
  ok("keys.1 · Enter in the stake box places nothing", sent.bets === 0 && s0.now === b0, JSON.stringify({ bets: sent.bets, before: b0, now: s0.now }));
  await hydrated(loc.locator('[data-testid="jud-place"]'));
  await loc.locator('[data-testid="jud-place"]').focus();
  await hold(page, "Enter");
  await page.waitForTimeout(900);
  const s1 = await settledBalance(p);
  ok(`keys.2 · Enter HELD on the gold commit: exactly one bet (the first press; its repeats press nothing) — the wallet down by TZS ${grouped(stake)}`,
    sent.bets === 1 && s1.now === b0 - stake, JSON.stringify({ bets: sent.bets, before: b0, now: s1.now }));
  await dismissDialogs(page);
  const two = await pageIn(p.ctx, `/updown/${roundId}`);
  const tloc = await arm(two.page, "two-way", "detail");
  const st = await stakeOf(tloc);
  await hydrated(tloc.locator('[data-testid="jud-up"]'));
  await tloc.locator('[data-testid="jud-up"]').focus();
  await hold(two.page, "Enter");
  await two.page.waitForTimeout(900);
  const s2 = await settledBalance(p);
  ok(`keys.3 · Enter HELD on the two-way arm's Up: exactly one bet — the wallet down by TZS ${grouped(st)}`, two.sent.bets === 1 && s2.now === s1.now - st, JSON.stringify({ bets: two.sent.bets, before: s1.now, now: s2.now }));
  const q = await player({ balance: 1200 });
  const lp = await pageIn(q.ctx, `/updown/${roundId}?side=UP`);
  const lloc = await arm(lp.page, "confirm");
  await chip(lloc, (await lloc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits).at(-1));
  const instead = lloc.locator('[data-testid="jud-use-instead"]');
  const at = tzsIn(await instead.innerText());
  await hydrated(instead); await instead.focus();
  await lp.page.keyboard.press("Enter"); await lp.page.waitForTimeout(900);
  const sq = await settledBalance(q);
  ok("keys.4 · Enter on \"Use … instead\" sets the stake and places nothing", (await stakeOf(lloc)) === at && lp.sent.bets === 0 && sq.now === 1200, JSON.stringify({ at, stake: await stakeOf(lloc), bets: lp.sent.bets, now: sq.now }));
  await page.close(); await two.page.close(); await lp.page.close();
});

/* ───────────────────────── tiles — every language × width, read by a person ───────────────────────── */
/**
 * The measurable rules on one tile (the owner's rule of 2026-10-15: "responsiveness and UI consistency is a rule"): no
 * sideways page scroll; the surface inside the viewport; nothing clipped or line-clamped short (Swahili and Chinese never
 * truncate); every tap target at least 40px in BOTH axes; the arm's buttons 12px apart; and every numeral in the mono
 * figure face (DA T5). Each finding names its element, so a person reading the tile knows where to look.
 */
async function layoutOf(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { present: false };
    const r = root.getBoundingClientRect();
    const seen = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && !el.closest('[aria-hidden="true"]'); };
    const name = (el) => (el.innerText || el.getAttribute("aria-label") || el.getAttribute("data-testid") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 32);
    const all = [...root.querySelectorAll("*")].filter(seen);
    const clipped = all.filter((el) => { const cs = getComputedStyle(el); return el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis") && el.innerText.trim(); }).map(name);
    const clamped = all.filter((el) => { const cs = getComputedStyle(el); const clamp = cs.webkitLineClamp || cs.getPropertyValue("-webkit-line-clamp"); return clamp && clamp !== "none" && el.scrollHeight > el.clientHeight + 1; }).map(name);
    const short = [...root.querySelectorAll("button, a[href], input, [role='button'], [role='radio']")].filter(seen).filter((el) => { const b = el.getBoundingClientRect(); return b.width < 40 || b.height < 40; })
      .map((el) => `${name(el)}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    // Numerals outside the mono face: a text node with a digit whose element is not set in JetBrains Mono.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const notMono = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !/\d/.test(n.textContent) || !seen(el)) continue;
      if (!/JetBrains Mono/i.test(getComputedStyle(el).fontFamily)) notMono.add(`${n.textContent.trim().slice(0, 28)} (${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")})`);
    }
    const sides = root.querySelector(".kp-jud__sides"), column = root.matches(".kp-jud") ? root : root.querySelector(".kp-jud");
    return {
      present: true, pageOverflow: document.scrollingElement.scrollWidth - innerWidth, left: Math.round(r.left), right: Math.round(innerWidth - r.right), width: Math.round(r.width),
      clipped, clamped, short, notMono: [...notMono], sidesGap: sides ? getComputedStyle(sides).columnGap : null, columnGap: column ? getComputedStyle(column).rowGap : null,
    };
  }, selector);
}
/** Photographs `selector` (and the viewport around it) and measures `checkSel` — the arm itself, when the photograph is
 *  a whole classic card around it. The card's other parts are measured too, as information (`around`): they are the
 *  classic card's, which release J does not change. */
async function tile(page, selector, name, checkSel = selector) {
  const loc = page.locator(selector).first();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(350);
  await loc.screenshot({ path: join(OUT, "tiles", `${name}.png`), animations: "disabled" });
  await page.screenshot({ path: join(OUT, "tiles", `${name}-view.png`), animations: "disabled" });
  const g = await layoutOf(page, checkSel);
  const around = checkSel === selector ? null : await layoutOf(page, selector);
  tileRows.push({ name, ...g, around });
  return g;
}
async function sheet(name, files, columns = 3) {
  const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(join(OUT, "tiles", `${f}.png`)).toString("base64")}"><figcaption>${f}</figcaption></figure>`).join("");
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.setContent(`<style>body{margin:0;background:#1a1a2e;font:12px monospace;color:#ccc}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:16px;padding:16px;align-items:start}figure{margin:0}img{max-width:100%;display:block;border:1px solid #444}</style><main>${imgs}</main>`);
  await page.screenshot({ path: join(OUT, "sheets", `${name}.png`), fullPage: true });
  await page.close();
}
if (run("tiles")) await runCell("tiles", "every language × width", async () => {
  const roundId = await openRound(9 * 60_000);
  const surfaces = [
    { key: "board", route: "/updown", sel: 'article.mcardp:has([data-jud="two-way"])', check: '[data-jud="two-way"][data-size="card"]', kind: ["two-way", "card"], balance: 100_000 },
    { key: "round", route: `/updown/${roundId}`, sel: '[data-jud="two-way"][data-size="detail"]', kind: ["two-way", "detail"], balance: 100_000 },
    { key: "side", route: `/updown/${roundId}?side=UP`, sel: '[data-jud="confirm"]', kind: ["confirm"], balance: 100_000 },
    { key: "low", route: `/updown/${roundId}?side=UP`, sel: '[data-jud="confirm"]', kind: ["confirm"], balance: 1200, chipTop: true },
    { key: "low0", route: `/updown/${roundId}?side=UP`, sel: '[data-jud="confirm"]', kind: ["confirm"], balance: 0 },
  ];
  if (closedFixture) surfaces.push({ key: "closed", route: `/updown/${closedFixture.round}?bet=${closedFixture.round}.UP.${closedFixture.stake}`, sel: '[data-jud="closed"]', kind: ["closed"], balance: 5000 });
  else notMeasured("tiles · the closed notice", "the closed cells did not produce a settled round with a successor");
  let fails = 0, count = 0;
  for (const s of surfaces) for (const locale of LOCALES) {
    const p = await player({ balance: s.balance, locale, viewport: { width: WIDTHS[0], height: HEIGHT(WIDTHS[0]) } });
    const page = await p.ctx.newPage();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT(width) });
      await go(page, s.route);
      const loc = await arm(page, ...s.kind);
      if (s.chipTop) await chip(loc, (await loc.locator('[data-testid="jud-chips"] button').allInnerTexts()).map(digits).at(-1));
      const g = await tile(page, s.sel, `${s.key}-${locale}-${width}`, s.check ?? s.sel);
      count++;
      const problems = [];
      if (!g.present) problems.push("absent");
      if (g.pageOverflow > 0) problems.push(`page scrolls sideways ${g.pageOverflow}px`);
      if (g.left < 0 || g.right < 0) problems.push(`outside the viewport (left ${g.left}, right ${g.right})`);
      if (g.clipped?.length) problems.push(`clipped: ${g.clipped.join(" | ")}`);
      if (g.clamped?.length) problems.push(`line-clamped short: ${g.clamped.join(" | ")}`);
      if (g.short?.length) problems.push(`a tap target under 40x40: ${g.short.join(" | ")}`);
      if (g.notMono?.length) problems.push(`numerals outside the mono face: ${g.notMono.join(" | ")}`);
      if (g.sidesGap && g.sidesGap !== "12px") problems.push(`side buttons ${g.sidesGap} apart`);
      if (g.columnGap && g.columnGap !== "12px") problems.push(`column gap ${g.columnGap}`);
      if (problems.length) { fails++; result("FAIL", `tiles · ${s.key} ${locale} ${width}`, problems.join("; ")); }
    }
    await page.close();
    await sheet(`${s.key}-${locale}`, WIDTHS.map((w) => `${s.key}-${locale}-${w}`));
    await sheet(`${s.key}-${locale}-view`, WIDTHS.map((w) => `${s.key}-${locale}-${w}-view`));
  }
  ok(`tiles · ${count} tiles taken (${surfaces.length} surfaces × ${LOCALES.length} languages × ${WIDTHS.length} widths), every measurable layout rule held`, fails === 0 && count === surfaces.length * LOCALES.length * WIDTHS.length, `${fails} failing tile(s)`);
  result("READ", "tiles · every tile and contact sheet must be READ by a person before this section counts", join(OUT, "sheets"));
});

for (const ctx of contexts) await ctx.close().catch(() => {});
await bare.dispose(); await browser.close();
writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ base: BASE, engine: ENGINE, marker: MARKS, results, consoleRows, tileRows }, null, 2));
const n = (s) => results.filter((r) => r.state === s).length;
console.log(`\nqa:journey-updown — ${n("PASS")} PASS · ${n("FAIL")} FAIL · ${n("BLOCKED")} BLOCKED · ${n("NOT MEASURED")} NOT MEASURED · console errors ${consoleRows.filter((r) => r.type !== "warning").length} · warnings ${consoleRows.filter((r) => r.type === "warning").length} (evidence.json)`);
process.exit(n("FAIL") ? 1 : n("BLOCKED") || n("NOT MEASURED") ? 3 : 0);
