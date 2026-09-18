/**
 * "Page not found when I try to bet" — driven on the REAL up/down tap path.
 *
 * The HTTP logs show NO 404 status on any /updown/<roundId>, so if the 404 page is
 * really being shown it must arrive through a CLIENT-SIDE navigation (router.push),
 * which Next serves as an RSC 200 carrying the not-found UI. Only a browser can see it.
 *
 * ⛔ Asserts real content before judging (a dead page must not read as "no 404").
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE ?? "https://50pick.tz";
const NOT_FOUND = ["page not found", "hakuna ukurasa", "couldn't find that page", "couldn’t find that page", "404"];

const b = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});

const results = [];
function rec(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const text = (p) => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim().toLowerCase());
const heading = (p) => p.evaluate(() => (document.querySelector("h1")?.innerText || "").trim());

/** Is the CURRENT page the 404? Asks the heading + body, not the status. */
async function is404(p) {
  const h = (await heading(p)).toLowerCase();
  const t = await text(p);
  const hit = NOT_FOUND.find((n) => h.includes(n) || t.slice(0, 400).includes(n));
  return { hit: hit ?? null, h1: await heading(p), url: p.url() };
}

async function page404Probes(path, label) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const consoleErrors = [];
  p.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  const bad = [];
  p.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 90)}`); });
  try {
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p.waitForTimeout(5_000);

    // Gate: the page must actually have rendered before any verdict.
    const h1 = await heading(p);
    if (!h1) { rec(`${label} · rendered`, false, "no h1 — page did not render, verdict withheld"); return; }
    rec(`${label} · rendered`, true, `h1="${h1}"`);

    // Every clickable thing that leads into a round: the card itself + its two side buttons.
    const targets = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      const out = [];
      // The board/live cards. role=link articles (board) and <a href="/updown/..."> (live).
      document.querySelectorAll('a[href*="/updown/"]').forEach((el, i) => {
        if (vis(el)) out.push({ kind: "anchor", idx: i, label: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50), href: el.getAttribute("href") });
      });
      document.querySelectorAll('article[role="link"]').forEach((el, i) => {
        if (!vis(el)) return;
        out.push({ kind: "card", idx: i, label: (el.getAttribute("aria-label") || "").slice(0, 60), href: null });
        el.querySelectorAll("button").forEach((btn, j) => {
          const t = (btn.innerText || "").replace(/\s+/g, " ").trim();
          if (vis(btn) && /up|down|juu|chini/i.test(t)) out.push({ kind: "sidebtn", idx: i, sub: j, label: t.slice(0, 40), href: null });
        });
      });
      return out;
    });
    rec(`${label} · has up/down entry points`, targets.length > 0, `${targets.length} found`);
    console.log(`       targets: ${JSON.stringify(targets.slice(0, 12))}`);

    // Click each DISTINCT entry point in a fresh page so one 404 cannot poison the next.
    const plan = [];
    const seenCards = new Set();
    for (const t of targets) {
      const key = `${t.kind}:${t.idx}:${t.sub ?? ""}`;
      if (t.kind === "card" && seenCards.has(t.idx)) continue;
      if (t.kind === "card") seenCards.add(t.idx);
      plan.push({ ...t, key });
      if (plan.length >= 8) break;
    }

    for (const t of plan) {
      const c2 = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
      const p2 = await c2.newPage();
      const bad2 = [];
      p2.on("response", (r) => { if (r.status() >= 400) bad2.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 80)}`); });
      try {
        await p2.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await p2.waitForTimeout(4_500);
        const before = p2.url();
        const clicked = await p2.evaluate(({ kind, idx, sub }) => {
          const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
          if (kind === "anchor") {
            const el = [...document.querySelectorAll('a[href*="/updown/"]')].filter(vis)[idx];
            if (!el) return null; el.click(); return el.getAttribute("href");
          }
          const cards = [...document.querySelectorAll('article[role="link"]')].filter(vis);
          const card = cards[idx];
          if (!card) return null;
          if (kind === "card") { card.click(); return "card-body"; }
          const btn = [...card.querySelectorAll("button")].filter(vis)[sub];
          if (!btn) return null; btn.click();
          return (btn.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
        }, t);
        if (!clicked) { rec(`${label} · ${t.key} clickable`, false, "target vanished before click"); continue; }
        await p2.waitForTimeout(6_000);
        const v = await is404(p2);
        const moved = p2.url() !== before;
        rec(
          `${label} · tap ${t.kind} "${t.label || clicked}" does NOT 404`,
          !v.hit,
          v.hit ? `SHOWS "${v.h1}" at ${v.url}` : `landed ${v.url.replace(BASE, "")} h1="${v.h1}"${moved ? "" : " (no navigation)"}${bad2.length ? ` [bad responses: ${bad2.slice(0, 4).join(", ")}]` : ""}`,
        );
      } finally { await c2.close(); }
    }
    if (bad.length) console.log(`       ${label} bad responses on load: ${bad.slice(0, 8).join(", ")}`);
    if (consoleErrors.length) console.log(`       ${label} console errors: ${consoleErrors.slice(0, 4).join(" | ")}`);
  } finally { await ctx.close(); }
}

console.log(`\n"Page not found" on the up/down bet tap — ${BASE} (signed out)\n`);
await page404Probes("/updown", "board /updown");
await page404Probes("/live", "/live wall");
await page404Probes("/updown?asset=BTC", "board BTC tab");

await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`);
for (const f of failed) console.log(`  · ${f.name} — ${f.detail}`);
process.exit(failed.length ? 1 : 0);
