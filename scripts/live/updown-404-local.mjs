/**
 * "PAGE NOT FOUND WHEN I TRY TO BET" — the SIGNED-IN up/down bet path, driven locally.
 *
 * Reported by Ali 2026-09-18: players on the Bitcoin (and other) Up & Down markets are
 * shown "Page not found" when they try to bet. Production HTTP logs carry NO 404 status on
 * any /updown/<roundId>, and signed-out taps are clean on production — so whatever is being
 * hit is either a CLIENT-SIDE not-found (Next serves those as an RSC 200) or a surface only
 * a signed-in, funded player reaches. This drives exactly that player.
 *
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3017
 *   LOCAL_BASE=http://localhost:3017 node scripts/live/updown-404-local.mjs
 *
 * ⛔ Every leg asserts the page actually RENDERED (an h1) before it judges 404 or not —
 * a dead page must never read as "no 404 here".
 */
import { chromium } from "playwright";

const BASE = process.env.LOCAL_BASE ?? "http://localhost:3017";
const NF = ["page not found", "hakuna ukurasa", "couldn't find that page", "couldn’t find that page"];

const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});

let pass = 0; const fails = [];
function rec(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return ok;
}
const note = (m) => console.log(`       ${m}`);

const h1of = (p) => p.evaluate(() => (document.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim());
const bodyOf = (p) => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim().toLowerCase());

/** Verdict on the CURRENT page: did it render, and is it the not-found page? */
async function verdict(p) {
  const h1 = await h1of(p);
  const body = await bodyOf(p);
  const nf = NF.find((n) => h1.toLowerCase().includes(n) || body.slice(0, 500).includes(n)) ?? null;
  return { h1, nf, url: p.url().replace(BASE, ""), rendered: h1.length > 0 };
}

async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const t = await r.text();
  return { status: r.status, body: t.slice(0, 300) };
}

// ── 0 · seed the two games ────────────────────────────────────────────────────
console.log(`\n"Page not found" on the up/down BET — signed in, ${BASE}\n`);
const seedM = await api("/api/dev-test/seed-markets");
const seedU = await api("/api/dev-test/updown-seed", { durations: [5, 15] });
rec("seed · markets", seedM.status < 400, `${seedM.status}`);
rec("seed · up/down rounds", seedU.status < 400, `${seedU.status} ${seedU.body.slice(0, 120)}`);

// ── a funded, signed-in player ────────────────────────────────────────────────
const ctx = await b.newContext({ viewport: { width: 1280, height: 950 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const badResponses = [];
page.on("response", (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 90)}`); });
await page.goto(`${BASE}/auth/demo?deposit=1&email=verified`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(3_000);
{
  const v = await verdict(page);
  rec("signed in as demo player", v.rendered && !v.nf, `landed ${v.url} h1="${v.h1}"`);
}
const state = await ctx.storageState();

/** A fresh signed-in page. */
async function authed() {
  const c = await b.newContext({ storageState: state, viewport: { width: 1280, height: 950 }, reducedMotion: "reduce" });
  const p = await c.newPage();
  const bad = [];
  p.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 90)}`); });
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  return { c, p, bad, errs };
}

/** Describe every up/down entry point visible on the page. */
const scan = (p) => p.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const out = [];
  [...document.querySelectorAll('a[href*="/updown/"]')].filter(vis).forEach((el, i) =>
    out.push({ kind: "anchor", idx: i, label: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 44), href: el.getAttribute("href") }));
  [...document.querySelectorAll('article[role="link"]')].filter(vis).forEach((el, i) => {
    out.push({ kind: "card", idx: i, label: (el.getAttribute("aria-label") || "").slice(0, 50) });
    [...el.querySelectorAll("button")].filter(vis).forEach((btn, j) => {
      const t = (btn.innerText || "").replace(/\s+/g, " ").trim();
      if (/up|down|juu|chini/i.test(t)) out.push({ kind: "sidebtn", idx: i, sub: j, label: t.slice(0, 36) });
    });
  });
  return out;
});

const clickTarget = (p, t) => p.evaluate(({ kind, idx, sub }) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  if (kind === "anchor") {
    const el = [...document.querySelectorAll('a[href*="/updown/"]')].filter(vis)[idx];
    if (!el) return null; el.click(); return el.getAttribute("href");
  }
  const card = [...document.querySelectorAll('article[role="link"]')].filter(vis)[idx];
  if (!card) return null;
  if (kind === "card") { card.click(); return "card-body"; }
  const btn = [...card.querySelectorAll("button")].filter(vis)[sub];
  if (!btn) return null; btn.click();
  return (btn.innerText || "").replace(/\s+/g, " ").trim().slice(0, 36);
}, t);

/** Open `path`, tap every up/down entry point (each in a fresh page), and judge the landing. */
async function tapEverything(path, label, { settleMs = 5_000 } = {}) {
  const { c, p, bad, errs } = await authed();
  let targets = [];
  try {
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p.waitForTimeout(settleMs);
    const v = await verdict(p);
    if (!rec(`${label} · rendered`, v.rendered, v.rendered ? `h1="${v.h1}"` : "no h1 — verdict withheld")) return;
    rec(`${label} · is not itself the 404`, !v.nf, v.nf ? `h1="${v.h1}"` : `h1="${v.h1}"`);
    targets = await scan(p);
    rec(`${label} · has up/down entry points`, targets.length > 0, `${targets.length}`);
    note(`targets: ${JSON.stringify(targets.slice(0, 10))}`);
    if (bad.length) note(`bad responses: ${bad.slice(0, 6).join(", ")}`);
    if (errs.length) note(`console errors: ${errs.slice(0, 3).join(" | ")}`);
  } finally { await c.close(); }

  const plan = []; const seen = new Set();
  for (const t of targets) {
    const key = `${t.kind}:${t.idx}:${t.sub ?? ""}`;
    if (seen.has(key)) continue; seen.add(key);
    plan.push({ ...t, key });
    if (plan.length >= 8) break;
  }
  for (const t of plan) {
    const { c: c2, p: p2, bad: bad2 } = await authed();
    try {
      await p2.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await p2.waitForTimeout(settleMs);
      const clicked = await clickTarget(p2, t);
      if (!clicked) { rec(`${label} · tap ${t.key}`, false, "target vanished"); continue; }
      await p2.waitForTimeout(6_000);
      const v = await verdict(p2);
      rec(
        `${label} · tap ${t.kind} "${t.label || clicked}" is NOT page-not-found`,
        v.rendered && !v.nf,
        v.nf ? `⛔ SHOWS "${v.h1}" at ${v.url}` : `landed ${v.url} h1="${v.h1}"${bad2.length ? ` [bad: ${bad2.slice(0, 3).join(", ")}]` : ""}`,
      );
    } finally { await c2.close(); }
  }
}

// ── 1 · the board, every entry point ─────────────────────────────────────────
await tapEverything("/updown", "board");
await tapEverything("/updown?asset=BTC", "board BTC");
// ── 2 · the mixed wall ───────────────────────────────────────────────────────
await tapEverything("/live", "/live");
// ── 3 · the player's own up/down portfolio ───────────────────────────────────
await tapEverything("/updown/history", "history");

// ── 4 · ACTUALLY PLACE A BET, from the card and from the round page ──────────
async function placeBet(path, label) {
  const { c, p, bad, errs } = await authed();
  try {
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p.waitForTimeout(6_000);
    const v0 = await verdict(p);
    if (!rec(`${label} · page for betting rendered`, v0.rendered && !v0.nf, `${v0.url} h1="${v0.h1}"`)) return;
    // The stake button by its accessible name — the kit renders type=button and submits in JS.
    const hit = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      const btn = [...document.querySelectorAll("button")].filter(vis)
        .find((el) => /^(juu|up|chini|down)\b/i.test((el.innerText || "").replace(/\s+/g, " ").trim()) && !el.disabled);
      if (!btn) return null;
      const t = (btn.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
      btn.click();
      return t;
    });
    if (!hit) { rec(`${label} · a bet button was available`, false, "no enabled Up/Down button (round may be locked)"); return; }
    rec(`${label} · a bet button was available`, true, `"${hit}"`);
    await p.waitForTimeout(8_000);
    const v = await verdict(p);
    const body = await bodyOf(p);
    rec(`${label} · after tapping "${hit}" the page is NOT page-not-found`, v.rendered && !v.nf,
      v.nf ? `⛔ SHOWS "${v.h1}" at ${v.url}` : `still ${v.url} h1="${v.h1}"`);
    const placed = /imewekwa|placed|bet placed|umeweka|risiti|receipt/i.test(body);
    rec(`${label} · the bet was acknowledged`, placed, placed ? "confirmation copy present" : `no confirmation in body: "${body.slice(0, 200)}"`);
    if (bad.length) note(`bad responses: ${bad.slice(0, 6).join(", ")}`);
    if (errs.length) note(`console errors: ${errs.slice(0, 3).join(" | ")}`);

    // Follow whatever the receipt offers — this is where a signed-in-only dead link would live.
    const links = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      return [...document.querySelectorAll('[role="dialog"] a[href], [role="dialog"] button')].filter(vis)
        .map((el) => ({ tag: el.tagName, href: el.getAttribute?.("href") ?? null, label: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40) }));
    });
    note(`receipt controls: ${JSON.stringify(links.slice(0, 8))}`);
    for (const [i, l] of links.entries()) {
      if (!l.href || l.href.startsWith("#") || l.href.startsWith("http")) continue;
      const { c: c3, p: p3 } = await authed();
      try {
        await p3.goto(`${BASE}${l.href}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await p3.waitForTimeout(4_000);
        const vv = await verdict(p3);
        rec(`${label} · receipt link ${i} "${l.label}" (${l.href}) is NOT page-not-found`, vv.rendered && !vv.nf,
          vv.nf ? `⛔ SHOWS "${vv.h1}"` : `h1="${vv.h1}"`);
      } finally { await c3.close(); }
    }
  } finally { await c.close(); }
}
await placeBet("/updown?asset=BTC", "bet on the BOARD card");
// The round page's own stake panel: find a live round first.
{
  const { c, p } = await authed();
  let roundHref = null;
  try {
    await p.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p.waitForTimeout(5_000);
    roundHref = await p.evaluate(() => {
      const m = (document.body.innerHTML.match(/\/updown\/(udr_[a-z0-9]+)/i) || [])[0];
      return m ?? null;
    });
  } finally { await c.close(); }
  if (roundHref) await placeBet(roundHref, `bet on the ROUND page (${roundHref})`);
  else rec("found a round page to bet on", false, "no udr_ id on the board");
}

// ── 5 · THE STALE CARD: the round rolls over while the board is open ─────────
{
  const { c, p } = await authed();
  try {
    await p.goto(`${BASE}/updown?asset=BTC`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p.waitForTimeout(6_000);
    const before = await scan(p);
    rec("stale-card setup · board has a card", before.length > 0, `${before.length} targets`);
    const adv1 = await api("/api/dev-test/updown-advance");
    const adv2 = await api("/api/dev-test/updown-advance");
    note(`advance: ${adv1.status} / ${adv2.status} ${adv2.body.slice(0, 140)}`);
    // Do NOT refresh — this is the player who was already looking at the board.
    const clicked = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      const card = [...document.querySelectorAll('article[role="link"]')].filter(vis)[0];
      if (!card) return null;
      const btn = [...card.querySelectorAll("button")].filter(vis)
        .find((el) => /^(juu|up|chini|down)\b/i.test((el.innerText || "").replace(/\s+/g, " ").trim()));
      if (btn) { btn.click(); return (btn.innerText || "").trim().slice(0, 30); }
      card.click(); return "card-body";
    });
    if (clicked) {
      await p.waitForTimeout(8_000);
      const v = await verdict(p);
      rec(`STALE CARD · tapping "${clicked}" after the round rolled over is NOT page-not-found`,
        v.rendered && !v.nf, v.nf ? `⛔ SHOWS "${v.h1}" at ${v.url}` : `landed ${v.url} h1="${v.h1}"`);
    } else rec("stale-card · something to tap", false, "no card on the board after advance");
  } finally { await c.close(); }
}

// ── 6 · the whole board again AFTER two advances (settled + successor rounds) ─
await tapEverything("/updown?asset=BTC", "board after rollover");

await b.close();
console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
