/**
 * Learn the Up & Down quick-bet controls from the LIVE page, rather than guessing them.
 *
 * The long-form dial already cost the campaign four selector traps (§6h "Harness contract
 * for the betting dial"); this asks the running product what its controls are actually
 * called before a single bet is automated. Read-only — it never clicks a money control.
 */
import { BASE, browser, login } from "./harness.mjs";

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "alpha");
  // ⚠️ NOT `networkidle` — /updown holds an open event-stream connection for the live
  // board, so the network never goes idle and the navigation times out on a healthy page.
  await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("button", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3_000);   // let the board hydrate and paint its round

  const map = await page.evaluate(() => {
    const acc = (el) =>
      el.getAttribute("aria-label") || el.getAttribute("title") ||
      (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60) || null;
    return {
      url: location.pathname,
      headings: [...document.querySelectorAll("h1,h2,h3")]
        .map((h) => h.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 12),
      buttons: [...document.querySelectorAll("button")]
        .map((e) => ({ name: acc(e), disabled: e.disabled,
                       visible: !!e.offsetParent })).filter((x) => x.name).slice(0, 40),
      links: [...document.querySelectorAll("a[href*='updown']")]
        .map((a) => ({ href: a.getAttribute("href"), text: acc(a) })).slice(0, 15),
      inputs: [...document.querySelectorAll("input")]
        .map((e) => ({ id: e.id || null, name: e.name || null, type: e.getAttribute("type"),
                       inputmode: e.getAttribute("inputmode"),
                       placeholder: e.placeholder || null, aria: e.getAttribute("aria-label"),
                       hidden: e.type === "hidden" || !e.offsetParent })),
    };
  });
  console.log(JSON.stringify(map, null, 1));
} finally { await b.close(); }
