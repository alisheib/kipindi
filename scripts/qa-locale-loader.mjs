#!/usr/bin/env node
/**
 * qa:locale-loader — THE LANGUAGE-CHANGE ANIMATION IS IN ITS GREEN AND RED, MEASURED IN A REAL BROWSER.
 *
 *   BASE=http://localhost:3600 npm run qa:locale-loader          a LOCAL IN-MEMORY dev server started with
 *                                                                 DISABLE_ADMIN_TOTP=true (the journey reader's preview
 *                                                                 pass is minted there); refused for a public host
 *   LL_QUICK=1                                                   the guest only, one width, one change, motion on — the
 *                                                                 red twin's pass
 *
 * ⭐ WHY (Ali, 2026-10-22): "on change language the colored animation is still on grey scale — give it back its color".
 * The animation is `LocaleChangeOverlay` (src/lib/i18n.tsx): six glyphs orbit the brand pulse while a language change
 * re-renders the app. Born green and red (2026-06-29, the YES and NO inks alternating), R5-I moved them to the pale brand
 * steps on 2026-10-09 — measured on that loader: inks rgb(153,196,255) and rgb(183,216,255) drawn at 0.4–1 opacity on a
 * dark royal scrim, a blue-grey ring. Ali chose "its green and red" back: the ring alternates `--yes-400` and `--no-400`,
 * the centre dot stays the brand blue — DESIGN_AUTHORITY §B2a's owner exception of 2026-10-22, where the measurements
 * that chose the -400 step over -300 are written.
 *
 * THREE READERS, each held to its premise before it is measured: a GUEST in the classic shell (the sign-in pills on the
 * page), the demo PLAYER signed in to the classic shell (no sign-in pill), and a JOURNEY reader — the same player through
 * a real staff preview pass (`live/journey-pass.mjs`), `<html data-shell="journey">`. Each changes the language through
 * its own control: the header menu (the journey's from 1024), and below 1024 in the journey the Akaunti hub's language
 * row, on /account.
 * WHAT IS MEASURED — values in the browser, never source text (AGENTS §8). For each reader, 360 and 1280, each change
 * (sw→en, en→zh, zh→sw), and again under reduced motion (the still ring):
 *   1. the loader shows six glyphs (the refresh is held back, so a fast server cannot make the reading a race);
 *   2. each glyph's COMPUTED ink is the token its place names — `--yes-400` on Hi/Ha/Sw, `--no-400` on 语/好/En — as the
 *      browser resolves both (a probe painted with the token), compared in sRGB;
 *   3. each ink clears the chroma floor (OKLCH from the browser's own sRGB) and 4.5:1 against the backdrop MEASURED
 *      behind the ring (the scrim over the blurred page — the darkest pixels of the shot);
 *   4. ON SCREEN the ring is green and red: of its ink pixels (OKLab L ≥ 0.5 — the glyphs and the hot core of their glow;
 *      the dark royal backdrop is itself chroma ~0.1, so an average over the box would read the scrim), at least a fifth
 *      sit in the YES hue band and a fifth in the NO band, and at most a fifth in the brand band. This catches what (2)
 *      cannot: an ancestor filter or a blend that leaves the inks right and the picture grey;
 *   5. AGAINST THE LOADER AS IT WAS before R5-I, on the SAME FRAME: the animation is paused at one instant, the ring is
 *      shot, the pre-R5-I inks (oklch 78% 0.16 at hues 152 / 22, written inline as they were, glow included) are laid
 *      over it, and the ring is shot again. The ink pixels' mean chroma now must be at least 0.9× then's. Both means
 *      print — the owner's comparison, "as clearly green-and-red as the old one";
 *   6. the loader leaves and `<html lang>` is the new language.
 * ⚠️ No `pngjs`: a shot is decoded on a blank page's canvas, so the drive needs nothing the repository does not declare.
 * Its red twin is `red:locale-loader` (`scripts/qa-locale-loader-red.mjs`): the plants it puts back must fail here.
 */
import { chromium } from "playwright";
import { demoSession, mintStaffPass, premise } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || process.env.KP_BASE || "http://localhost:3600";
const QUICK = process.env.LL_QUICK === "1";
const READERS = QUICK ? ["guest"] : ["guest", "player", "journey"];
const INKS = ["--yes-400", "--no-400"];             // Hi, 语, Ha, 好, Sw, En — alternating, from Hi
const BEFORE_R5I = ["oklch(78% 0.16 152)", "oklch(78% 0.16 22)"];   // the loader's inks 2026-06-29 → 2026-10-09, inline
const INK_CHROMA_FLOOR = 0.12;
const CONTRAST_FLOOR = 4.5;
const SHARE_FLOOR = 0.2;
const RATIO_FLOOR = 0.9;
const HOLD_MS = 2500;
const NAMES = { en: "English", sw: "Kiswahili", zh: "中文" };

if (/50pick\.tz|railway\.app/.test(BASE)) { console.error(`refused: ${BASE} — this drive runs against a local server`); process.exit(2); }

let pass = 0;
const fails = [];
const ok = (label, cond, evidence = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}${evidence ? ` — ${evidence}` : ""}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${evidence ? ` — ${evidence}` : ""}`); }
};

const oklch = ([r, g, b]) => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, Bb), h: ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360 };
};
const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const near = (a, b) => Math.abs(a - b) <= 25 || Math.abs(a - b) >= 335;

/** In the app page: each glyph's computed ink and box, the named tokens' inks — the browser's own sRGB, via a canvas. */
const READ_INKS = (tokens) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return Array.from(cx.getImageData(0, 0, 1, 1).data).slice(0, 3); };
  // ⚠️ A FRESH PROBE PER TOKEN, NEVER ONE RE-PAINTED: re-painting one element read the FIRST token back for the second
  // under reduced motion (measured, 2026-10-22: both "want" inks green), so each token is read on its own element.
  const want = tokens.map((t) => {
    const probe = document.createElement("i");
    probe.setAttribute("style", `transition:none;color:var(${t})`);
    document.body.appendChild(probe);
    const c = rgb(getComputedStyle(probe).color);
    probe.remove();
    return c;
  });
  const glyphs = Array.from(document.querySelectorAll(".lcl-glyph")).map((g) => {
    const r = g.getBoundingClientRect();
    return { ch: g.textContent, rgb: rgb(getComputedStyle(g).color), box: [r.x, r.y, r.width, r.height] };
  });
  return { want, glyphs };
};

/** On a blank page: decode a viewport shot, crop the ring's box out of it, and return its pixels. */
const DECODE = async ({ b64, box: [x, y, w, h] }) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, x, y, w, h, 0, 0, w, h);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  return px;
};

function sortPixels(px) {
  const ink = [], dark = [];
  for (const p of px) { const o = oklch(p); if (o.L >= 0.5) ink.push(o); else if (o.L < 0.3) dark.push(p); }
  const share = (hue) => (ink.length ? ink.filter((o) => o.C >= 0.04 && near(o.h, hue)).length / ink.length : 0);
  dark.sort((a, b) => lum(a) - lum(b));
  return {
    n: ink.length,
    chroma: ink.length ? ink.reduce((s, o) => s + o.C, 0) / ink.length : 0,
    yes: share(152), no: share(22), brand: share(262),
    backdrop: dark.length ? dark[Math.floor(dark.length / 2)] : [0, 0, 0],
  };
}

/** ⚠️ THE WHOLE VIEWPORT IS SHOT AND THE RING CROPPED FROM IT — never `screenshot({ clip })`. Measured 2026-10-22: a
 *  clipped capture does not composite the scrim's backdrop blur (the page behind came out sharp), so it is not the frame
 *  a reader sees; the full viewport is. */
async function shootRing(page, blank, glyphs) {
  const xs = glyphs.map((g) => g.box);
  const pad = 6;
  const x = Math.max(0, Math.floor(Math.min(...xs.map((b) => b[0])) - pad)), y = Math.max(0, Math.floor(Math.min(...xs.map((b) => b[1])) - pad));
  const w = Math.ceil(Math.max(...xs.map((b) => b[0] + b[2])) + pad - x), h = Math.ceil(Math.max(...xs.map((b) => b[1] + b[3])) + pad - y);
  const buf = await page.screenshot();
  return sortPixels(await blank.evaluate(DECODE, { b64: buf.toString("base64"), box: [x, y, w, h] }));
}

/** The reader's own control: the header menu where it shows; else (the journey below 1024) the hub's language row. */
async function changeTo(page, code) {
  const menu = page.locator('details.kp-menu:has([role="listbox"])').first();
  if (await menu.count() && await menu.locator("summary").isVisible()) {
    await menu.locator("summary").click();
    await menu.locator('[role="option"]', { hasText: NAMES[code] }).first().click();
    return "header";
  }
  const row = page.locator("details.kp-hub__lang").first();
  await row.locator("summary").click();
  await row.locator('[role="option"]', { hasText: NAMES[code] }).first().click();
  return "hub";
}

const browser = await chromium.launch();
const blank = await browser.newPage();
const means = [];
try {
  for (const reader of READERS) {
    let cookies = [];
    if (reader !== "guest") {
      if (reader === "journey") {
        const p = await premise(BASE);
        if (p.refuse) { ok(`${reader}: premise — a local in-memory server whose rollout a preview pass can see`, false, p.refuse); continue; }
      }
      try {
        cookies = [await demoSession(browser, BASE)];
        if (reader === "journey") cookies.push(await mintStaffPass(browser, BASE));
      } catch (e) { ok(`${reader}: premise — the reader's session${reader === "journey" ? " and preview pass" : ""}`, false, String(e).slice(0, 200)); continue; }
    }
    const runs = QUICK ? [["no-preference", 360]] : [["no-preference", 360], ["no-preference", 1280], ["reduce", 360], ["reduce", 1280]];
    for (const [motion, width] of runs) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, reducedMotion: motion });
      await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }, ...cookies]);
      const page = await ctx.newPage();
      // Hold every RSC payload back, so the loader stays up long enough to be read whatever the server's speed.
      await page.route("**/*", async (route) => {
        const h = route.request().headers();
        if (h["rsc"] === "1" && !h["next-router-prefetch"]) await new Promise((r) => setTimeout(r, HOLD_MS));
        await route.continue().catch(() => {});
      });
      // The journey's language lives in the Akaunti hub below 1024 (one language control per width, the kit's rule).
      const start = reader === "journey" && width < 1024 ? "/account" : "/";
      await page.goto(`${BASE}${start}`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(1500);
      const seen = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        shell: document.documentElement.getAttribute("data-shell") || "classic",
        guestPills: document.querySelectorAll('a[href^="/auth/login"]').length,
      }));
      const want = { guest: ["classic", true], player: ["classic", false], journey: ["journey", false] }[reader];
      const premiseOk = seen.lang === "sw" && seen.shell === want[0] && (seen.guestPills > 0) === want[1];
      ok(`${reader} ${width} ${motion}: premise — ${start} in Swahili, the ${want[0]} shell, ${want[1] ? "signed out" : "signed in"}`,
        premiseOk, `lang ${seen.lang} · shell ${seen.shell} · sign-in links ${seen.guestPills}`);
      if (!premiseOk) { await ctx.close(); continue; }
      for (const code of QUICK ? ["en"] : ["en", "zh", "sw"]) {
        const tag = `${reader} ${width} ${motion === "reduce" ? "reduced motion" : "motion"} → ${code}`;
        const via = await changeTo(page, code);
        if (reader === "journey") ok(`${tag}: changed through the journey's own control for this width (${width < 1024 ? "the hub row" : "the header menu"})`, via === (width < 1024 ? "hub" : "header"), via);
        await page.waitForSelector(".lcl-scrim", { timeout: 10_000 });
        await page.waitForTimeout(260);
        const live = await page.evaluate(READ_INKS, INKS);
        ok(`${tag}: the loader draws six glyphs`, live.glyphs.length === 6, `${live.glyphs.length}`);
        const inksOk = live.glyphs.length === 6 && live.glyphs.every((g, i) => g.rgb.every((v, k) => Math.abs(v - live.want[i % 2][k]) <= 2));
        ok(`${tag}: each glyph wears its place's token — ${INKS.join(" / ")} alternating from Hi`, inksOk,
          `${live.glyphs.map((g) => `${g.ch} rgb(${g.rgb})`).join(" · ")} | want rgb(${live.want[0]}) / rgb(${live.want[1]})`);
        const cmin = live.glyphs.length ? Math.min(...live.glyphs.map((g) => oklch(g.rgb).C)) : 0;
        ok(`${tag}: every ink's OKLCH chroma ≥ ${INK_CHROMA_FLOOR}`, cmin >= INK_CHROMA_FLOOR, `lowest ${cmin.toFixed(3)}`);
        // the ring as it is, and (first change of a run) frozen on one frame against the loader as it was
        const first = code === "en";
        if (first) await page.evaluate(() => { for (const a of document.getAnimations()) { const t = a.effect && a.effect.target; if (t && t.closest && t.closest(".lcl-scrim")) { a.pause(); a.currentTime = 700; } } });
        const now = await shootRing(page, blank, live.glyphs);
        const worst = live.glyphs.length ? Math.min(...live.glyphs.map((g) => contrast(g.rgb, now.backdrop))) : 0;
        ok(`${tag}: every ink ≥ ${CONTRAST_FLOOR}:1 on the backdrop measured behind the ring`, worst >= CONTRAST_FLOOR, `lowest ${worst.toFixed(2)}:1 on rgb(${now.backdrop})`);
        ok(`${tag}: on screen the ring is green and red — ink pixels YES-band ≥ ${SHARE_FLOOR}, NO-band ≥ ${SHARE_FLOOR}, brand-band ≤ ${SHARE_FLOOR}`,
          now.n > 50 && now.yes >= SHARE_FLOOR && now.no >= SHARE_FLOOR && now.brand <= SHARE_FLOOR,
          `${now.n} ink px: YES ${now.yes.toFixed(2)} · NO ${now.no.toFixed(2)} · brand ${now.brand.toFixed(2)}; ink chroma mean ${now.chroma.toFixed(4)}`);
        if (first) {
          // ⚠️ `transition: none` first: under reduced motion the clamp's near-zero transition would otherwise start the
          // swap FROM the live ink (measured: a read straight after the swap returned the previous colour).
          await page.evaluate((inks) => {
            document.querySelectorAll(".lcl-glyph").forEach((g, i) => { const c = inks[i % 2]; g.style.setProperty("transition", "none"); g.style.setProperty("color", c); g.style.setProperty("text-shadow", `0 0 18px ${c}`); });
          }, BEFORE_R5I);
          await page.waitForTimeout(120);
          const then = await shootRing(page, blank, live.glyphs);
          means.push(`${reader} ${width} ${motion}: now ${now.chroma.toFixed(4)} · before R5-I ${then.chroma.toFixed(4)} (×${(now.chroma / (then.chroma || 1e-9)).toFixed(3)})`);
          ok(`${tag}: CONTROL · the loader as it was (pre-R5-I inks, same frame) reads as green and red to this instrument`,
            then.n > 50 && then.yes >= SHARE_FLOOR && then.no >= SHARE_FLOOR, `YES ${then.yes.toFixed(2)} · NO ${then.no.toFixed(2)} · chroma ${then.chroma.toFixed(4)}`);
          ok(`${tag}: the ring is as colourful as before R5-I — ink chroma mean ≥ ${RATIO_FLOOR}× the old ring's on the same frame`,
            then.chroma > 0 && now.chroma >= RATIO_FLOOR * then.chroma, `now ${now.chroma.toFixed(4)} · before ${then.chroma.toFixed(4)}`);
          await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
        }
        await page.waitForFunction((c) => !document.querySelector(".lcl-scrim") && document.documentElement.lang === c, code, { timeout: 120_000 });
        ok(`${tag}: the loader leaves and <html lang> is ${code}`, true);
        await page.waitForTimeout(800);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`\nthe ring's ink chroma, now against the loader before R5-I:\n  ${means.join("\n  ")}`);
console.log(`\nqa:locale-loader: ${pass} passed, ${fails.length} failed${fails.length ? `\n  ${fails.join("\n  ")}` : ""}`);
process.exitCode = fails.length ? 1 : 0;
