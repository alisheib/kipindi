/**
 * qa:notice-bar-widow — EVERY NOTICE BAR THE DRIVES REACH: A LONE LAST WORD JOINS ITS NEIGHBOUR, AND NO OTHER LINE MOVES
 * (MASWALI-BUILD S5 round 2, 2026-10-22; `test:notice-bar-widow` holds the kit's rule).
 *
 *   FEATURE_MILLIONEA=STAFF_PREVIEW on a fresh in-memory DEV server (DISABLE_ADMIN_TOTP=true), then:
 *   BASE=http://localhost:3501 node scripts/qa-notice-bar-widow.mjs [outDir]       (WIDTHS=…, LOCALES=… to narrow)
 *
 * The bars it reaches, each at 320 · 360 · 768 · 1024 · 1280 · 1920 in sw, en and zh:
 *   · the journey's preview marker (a staff preview pass, minted the officer's way) on the journey home;
 *   · Millionea's staff preview bar (a staff session at Millionea's STAFF_PREVIEW) on /millionea;
 *   · the operator's announcement (published through /admin/system's own form, then read by a guest on /markets);
 *   · the offline notice (the browser taken offline on /markets).
 * For a bar handed PLAIN words (the two preview bars, the announcement) the drive lays the same words out a second time,
 * plain, in a hidden twin of the bar's paragraph at the same width — the bar as it was before the rule — and compares the
 * lines word by word: they are the same, or the twin's last line was one word alone and the bar's joins it to its
 * neighbour with every other line unchanged. Anything else is a failure. A bar handed BUILT words (the offline notice: a
 * bold head and a sentence) is drawn by the kit exactly as before (`barWords` hands them back untouched), so its lines
 * are printed and shot, never compared. ⚠️ Not reached here, all of them built words: the session-ended notice (a second
 * demo sign-in did not end the first session's page with it), the away summary, Millionea's hub notices (fact lines). No bar may overflow its line. Shots of every bar go to
 * outDir (default .qa-artifacts/notice-bar-widow/).
 * ⚠️ It publishes a site-wide announcement on the dev store (and switches it off again at the end): a fresh server only.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { premise, mintStaffPass, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "notice-bar-widow"));
const WIDTHS = (process.env.WIDTHS || "320,360,768,1024,1280,1920").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const ANNOUNCEMENT = "Scheduled maintenance tonight from 23:00 to 23:30. Your balance and your tickets are safe.";
mkdirSync(OUT, { recursive: true });
let pass = 0;
const fails = [];
const rows = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};
const settle = async (page) => {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(400);
};

/** Every notice bar on the page: its test id, whether it was handed plain words, its lines now, and (plain words only)
 *  the lines the same words draw plain in a hidden twin of its paragraph at the same width. */
const BARS = () => {
  const linesOf = (el) => {
    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      const re = /\S+/g;
      let m;
      while ((m = re.exec(text))) {
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        if (rects.length) words.push({ w: m[0], top: Math.round(rects[0].top) });
      }
    }
    const lines = [];
    for (const x of words) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - x.top) <= 3) last.words.push(x.w);
      else lines.push({ top: x.top, words: [x.w] });
    }
    return lines.map((l) => l.words.join(" "));
  };
  return [...document.querySelectorAll('[role="status"], [role="alert"]')].filter((bar) => bar.matches(".border-b") && bar.querySelector(":scope > div > p"))
    .map((bar) => {
      const p = bar.querySelector(":scope > div > p");
      // Plain words: one text node, or the kit's own two (the head and its kept pair, `whitespace-nowrap`).
      const kids = [...p.childNodes];
      const plain = kids.every((k) => k.nodeType === Node.TEXT_NODE || (k.nodeType === Node.ELEMENT_NODE && k.className === "whitespace-nowrap" && k.childNodes.length === 1 && k.firstChild.nodeType === Node.TEXT_NODE));
      const box = p.getBoundingClientRect();
      let before = null;
      if (plain) {
        const twin = p.cloneNode(false);
        twin.textContent = p.textContent;
        twin.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;width:${box.width}px;flex:none;`;
        p.parentElement.appendChild(twin);
        before = linesOf(twin);
        twin.remove();
      }
      const b = bar.getBoundingClientRect();
      return { id: bar.getAttribute("data-testid") ?? "(no id)", plain, after: linesOf(p), before, kept: p.querySelector(".whitespace-nowrap")?.textContent ?? null,
        overflow: p.scrollWidth > p.clientWidth + 1, box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
    });
};
/** Same lines, or the widow joined to its neighbour with every other line unchanged. */
function verdict(before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) return "same";
  const n = before.length;
  if (n < 2 || after.length !== n || before[n - 1].split(" ").length !== 1) return "moved";
  const pen = before[n - 2].split(" ");
  const moved = pen.pop();
  const expect = [...before.slice(0, n - 2), pen.join(" "), `${moved} ${before[n - 1]}`];
  return pen.length > 0 && JSON.stringify(expect) === JSON.stringify(after) ? "widow" : "moved";
}

async function sweep(scene, ctxFor, path, prep) {
  for (const l of LOCALES) {
    for (const w of WIDTHS) {
      const ctx = await ctxFor(w, l);
      const page = await ctx.newPage();
      const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await settle(page);
      if (prep) await prep(page, ctx);
      const bars = await page.evaluate(BARS);
      const want = bars.filter((b) => scene.ids.includes(b.id));
      ok(`PREMISE ${scene.name} ${l} ${w} · ${path} (${r?.status()}) draws ${scene.ids.join(" + ")}`, want.length === scene.ids.length, `(bars: ${bars.map((b) => b.id).join(", ") || "none"})`);
      for (const b of want) {
        const v = b.plain ? verdict(b.before, b.after) : "built";
        rows.push({ scene: scene.name, l, w, ...b, verdict: v });
        const tag = `${scene.name} ${l} ${w} ${b.id}`;
        if (b.plain) ok(`${tag} · ${v === "widow" ? "its lone last word joins its neighbour, every other line unchanged" : "the same lines as the plain words draw"}`,
          (v === "same" || v === "widow") && !b.overflow, `${JSON.stringify(b.after)}${v === "widow" ? ` (was ${JSON.stringify(b.before)})` : ""}`);
        else ok(`${tag} · built words, drawn by the kit as before; no overflow`, !b.overflow, JSON.stringify(b.after));
        await page.screenshot({ path: join(OUT, `${scene.name}-${b.id}-${l}-${w}.png`), clip: { x: 0, y: Math.max(0, b.box.y), width: w, height: Math.max(1, Math.min(b.box.h, 400)) } });
      }
      await ctx.close();
    }
  }
}

const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
const browser = await chromium.launch();
const ctxWith = (cookies) => async (w, l) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: l, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
};
let admin = null;
try {
  // A staff preview pass (the journey's marker) and a staff session (Millionea's bar, the operator's console).
  const pass = await mintStaffPass(browser, BASE);
  const staff = await browser.newContext();
  const seeded = await staff.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
  ok("PREMISE · a staff session (seed-admin)", seeded.ok(), `(${seeded.status()})`);
  const staffSession = (await staff.cookies(BASE)).filter((c) => c.name === "kp_session");
  admin = staff;

  await sweep({ name: "journey-preview", ids: ["journey-preview-marker"] }, ctxWith([pass]), "/");
  await sweep({ name: "millionea-preview", ids: ["millionea-preview-mark"] }, ctxWith(staffSession), "/millionea");

  // The operator's announcement, published through the console's own form.
  {
    const page = await staff.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/admin/system`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await settle(page);
    const field = page.locator('[data-field="announcement-message"] textarea, [data-field="announcement-message"] input').first();
    await field.fill(ANNOUNCEMENT);
    const toggle = page.getByRole("button", { name: "Publish banner" }).or(page.getByRole("switch", { name: "Publish banner" })).first();
    if ((await toggle.getAttribute("aria-pressed")) !== "true" && (await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
    await page.getByRole("button", { name: /^Publish banner$/ }).last().click();
    await page.waitForTimeout(2000);
    await page.close();
  }
  // The announcement bar carries no test id: it is matched by its words.
  {
    const sceneRows = [];
    for (const l of LOCALES) {
      for (const w of WIDTHS) {
        const ctx = await ctxWith([])(w, l);
        const page = await ctx.newPage();
        await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
        await settle(page);
        const bars = (await page.evaluate(BARS)).filter((b) => b.after.join(" ") === ANNOUNCEMENT.split(/\s+/).join(" "));
        ok(`PREMISE announcement ${l} ${w} · /markets draws the operator's announcement`, bars.length === 1, `(${bars.length})`);
        for (const b of bars) {
          const v = verdict(b.before, b.after);
          sceneRows.push({ scene: "announcement", l, w, ...b, verdict: v });
          ok(`announcement ${l} ${w} · ${v === "widow" ? "its lone last word joins its neighbour, every other line unchanged" : "the same lines as the plain words draw"}`,
            (v === "same" || v === "widow") && !b.overflow, `${JSON.stringify(b.after)}${v === "widow" ? ` (was ${JSON.stringify(b.before)})` : ""}`);
          await page.screenshot({ path: join(OUT, `announcement-${l}-${w}.png`), clip: { x: 0, y: Math.max(0, b.box.y), width: w, height: Math.max(1, Math.min(b.box.h, 400)) } });
        }
        await ctx.close();
      }
    }
    rows.push(...sceneRows);
  }

  // The offline notice: the browser taken offline on /markets.
  await sweep({ name: "offline", ids: ["offline-notice"] }, ctxWith([]), "/markets", async (page, ctx) => {
    await ctx.setOffline(true);
    await page.waitForTimeout(600);
  });
} finally {
  // Switch the announcement off again.
  if (admin) {
    try {
      const page = await admin.newPage();
      await page.goto(`${BASE}/admin/system`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await settle(page);
      const toggle = page.getByRole("button", { name: "Publish banner" }).or(page.getByRole("switch", { name: "Publish banner" })).first();
      if ((await toggle.getAttribute("aria-pressed")) === "true" || (await toggle.getAttribute("aria-checked")) === "true") await toggle.click();
      await page.getByRole("button", { name: /^Save$/ }).last().click().catch(() => {});
      await page.close();
    } catch { /* the store is a dev server's, fresh per run */ }
  }
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
const widows = rows.filter((r) => r.verdict === "widow");
console.log(`\nqa:notice-bar-widow: ${pass} passed, ${fails.length} failed — ${rows.length} bars read, ${widows.length} lone last word(s) joined: ${widows.map((r) => `${r.scene} ${r.l} ${r.w}`).join(", ") || "none"} (shots in ${OUT})`);
process.exitCode = fails.length ? 1 : 0;
