/**
 * R5-E · THE BROWSER CHECK FOR THE LOCK TURN — F1, F4 and the Chinese gap, in a real engine.
 *
 * Run from the R5-E worktree (or the integration tree), with a LOCAL IN-MEMORY dev server running
 * (DISABLE_ADMIN_TOTP=true, no DATABASE_URL — `scripts/live/journey-pass.mjs` refuses anything else):
 *   node <this file> http://localhost:<port>            (Chromium asserts; WebKit and Firefox report when installed)
 *
 *   §A  the landing's featured question, journey shell (a staff preview pass, as tiles 023 026 029) and classic:
 *       its computed `text-wrap-style` is balance, and its line boxes read, with the tile's exact string —
 *         zh 320 "达累斯萨拉姆七月" / "降雨超过200毫米" (F1: never "…降雨超" / "过200毫米"), zh 360 and 390 one line,
 *         en 390 and 1024 "Dar es Salaam rainfall" / "exceeds 200mm in July" (F4: never "… / in July"),
 *         sw 320 and 360 "Mvua Dar es Salaam" / "yazidi 200mm Julai", sw 390 one line, sw 1024 two balanced lines;
 *       and every board row (`.kp-qrow__q`) at zh 320: its lines, any break inside a word flagged (Intl.Segmenter).
 *   §B  the Chinese gap (`hangCjkMarks`, round 5): on the zh not-found page the hint's textContent and a selection's
 *       text equal the dictionary's (no space after a mark), a find for "，市场" matches, and each mid-line mark plus its
 *       gap advances a full em (the trim paid back by the generated space), within 0.5px.
 * Exit 0 when every Chromium check holds; 1 otherwise. Nothing in the repository is touched.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const pw = require("playwright");
const { premise, mintStaffPass, LOCALE_COOKIE } = await import(pathToFileURL(join(process.cwd(), "scripts/live/journey-pass.mjs")).href);

const BASE = process.argv[2] ?? "http://localhost:3000";
const gate = await premise(BASE);
if (gate.refuse) { console.error(`REFUSED: ${gate.refuse}`); process.exit(2); }

const TITLE = { zh: "达累斯萨拉姆七月降雨超过200毫米", en: "Dar es Salaam rainfall exceeds 200mm in July", sw: "Mvua Dar es Salaam yazidi 200mm Julai" };
const WANT = [
  ["zh", 320, ["达累斯萨拉姆七月", "降雨超过200毫米"]], ["zh", 360, [TITLE.zh]], ["zh", 390, [TITLE.zh]],
  ["en", 390, ["Dar es Salaam rainfall", "exceeds 200mm in July"]], ["en", 1024, ["Dar es Salaam rainfall", "exceeds 200mm in July"]],
  ["sw", 320, ["Mvua Dar es Salaam", "yazidi 200mm Julai"]], ["sw", 360, ["Mvua Dar es Salaam", "yazidi 200mm Julai"]], ["sw", 390, [TITLE.sw]],
  ["sw", 1024, ["Mvua Dar es Salaam", "yazidi 200mm Julai"]],
];

/** In the page: an element's visible lines, from each character's own box (a nowrap run keeps its characters' boxes). */
const LINES = (el) => {
  const out = [];
  let cur = null, lastTop = null;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = n.data;
    for (let i = 0; i < s.length;) {
      const len = s.codePointAt(i) > 0xffff ? 2 : 1;
      range.setStart(n, i); range.setEnd(n, i + len);
      const r = range.getClientRects()[0];
      const ch = s.slice(i, i + len);
      if (r && r.width > 0) {
        if (lastTop === null || Math.abs(r.top - lastTop) > r.height / 2) { cur = { top: r.top, text: "", left: r.left, right: r.right }; out.push(cur); lastTop = r.top; }
        cur.text += ch; cur.right = Math.max(cur.right, r.right);
      } else if (cur) cur.text += ch;
      i += len;
    }
  }
  return out.map((l) => ({ text: l.text.trim(), w: Math.round((l.right - l.left) * 10) / 10 }));
};

let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`${ok ? "  ok  " : "  FAIL"} ${line}`); };
const engines = [["chromium", true], ["webkit", false], ["firefox", false]];
let pass = null;

for (const [name, asserts] of engines) {
  let browser;
  try { browser = await pw[name].launch(); } catch (e) { console.log(`\n── ${name}: not installed here (${String(e.message).split("\n")[0].slice(0, 100)})`); continue; }
  console.log(`\n── ${name}${asserts ? "" : " (reported, not asserted)"} ${"─".repeat(60)}`);
  const check = (ok, line) => (asserts ? say(ok, line) : console.log(`  ${ok ? "same" : "DIFF"}  ${line}`));
  try {
    if (!pass) pass = await mintStaffPass(browser, BASE);
    for (const shell of ["journey", "classic"]) {
      for (const [loc, vw, want] of WANT) {
        const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
        // The pass as `qa-journey-shell` hands it on: the cookie object the officer's context was given.
        await ctx.addCookies([{ name: LOCALE_COOKIE, value: loc, url: BASE }, ...(shell === "journey" ? [pass] : [])]);
        const page = await ctx.newPage();
        await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 240_000 });
        await page.evaluate(() => document.fonts.ready);
        const el = await page.$(".mcardp--featured .mcardp-q");
        if (!el) { check(false, `${shell} ${loc} ${vw}: no featured question on /`); await ctx.close(); continue; }
        const got = await el.evaluate((n, src) => ({ text: n.textContent, style: getComputedStyle(n).textWrapStyle || getComputedStyle(n).textWrap || "", lines: new Function(`return (${src})`)()(n) }), LINES.toString());
        const lines = got.lines.map((l) => l.text);
        if (got.text !== TITLE[loc]) { console.log(`  note ${shell} ${loc} ${vw}: the featured market is "${got.text}", not the tile's — its lines: ${lines.join(" / ")}`); await ctx.close(); continue; }
        const cut = loc === "zh" && lines.some((l, i) => i < lines.length - 1 && l.endsWith("超"));
        check(JSON.stringify(lines) === JSON.stringify(want) && /balance/.test(got.style) && !cut,
          `${shell} ${loc} ${vw}: ${got.lines.map((l) => `"${l.text}" ${l.w}px`).join(" / ")} · text-wrap ${got.style}${cut ? " · 超过 CUT" : ""}`);
        if (loc === "zh" && vw === 320) {
          const rows = await page.$$eval(".kp-qrow__q", (ns, src) => ns.map((n) => ({ t: n.textContent, lines: new Function(`return (${src})`)()(n).map((l) => l.text) })), LINES.toString());
          const seg = new Intl.Segmenter("zh", { granularity: "word" });
          for (const r of rows) {
            const inside = new Set();
            for (const w of seg.segment(r.t)) { const n = Array.from(w.segment).length; if (n > 1 && w.isWordLike) { const at = Array.from(r.t.slice(0, w.index)).length; for (let k = 1; k < n; k++) inside.add(at + k); } }
            let at = 0;
            const cuts = r.lines.slice(0, -1).map((l) => (at += Array.from(l).length));
            console.log(`        board row: ${r.lines.join(" / ")}${cuts.some((c) => inside.has(c)) ? "   ← a line break inside a word (ICU's dictionary — report, not assert)" : ""}`);
          }
        }
        await ctx.close();
      }
    }
    // §B — the Chinese gap on the not-found page (a centred hint with mid-line marks).
    for (const vw of [320, 390]) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
      await ctx.addCookies([{ name: LOCALE_COOKIE, value: "zh", url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/does-not-exist-r5e`, { waitUntil: "load", timeout: 240_000 });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const mark = document.querySelector(".kp-cjk-mark");
        const p = mark?.closest("p");
        if (!p) return null;
        const sel = getSelection(); const range = document.createRange(); range.selectNodeContents(p); sel.removeAllRanges(); sel.addRange(range);
        const copied = sel.toString(); sel.removeAllRanges();
        const text = p.textContent;
        const found = typeof window.find === "function" ? window.find("，市场") : null;
        // Each mid-line mark followed by its gap: from the mark's left to the next character's left is one em.
        const em = parseFloat(getComputedStyle(p).fontSize);
        const steps = [];
        for (const m of p.querySelectorAll(".kp-cjk-mark")) {
          const gap = m.nextElementSibling;
          if (!gap || !gap.classList.contains("kp-cjk-gap")) continue;
          const next = gap.nextSibling;
          if (!next || next.nodeType !== 3) continue;
          const rg = document.createRange(); rg.setStart(next, 0); rg.setEnd(next, 1);
          const a = m.getBoundingClientRect(), b = rg.getClientRects()[0];
          if (b && Math.abs(b.top - a.top) < a.height / 2) steps.push(Math.round((b.left - a.left) / em * 1000) / 1000);
          else steps.push("line end: gap " + Math.round(gap.getBoundingClientRect().width * 10) / 10 + "px");
        }
        return { text, copied, found, steps, gaps: [...p.querySelectorAll(".kp-cjk-gap")].map((g) => g.textContent) };
      });
      if (!r) { check(false, `not-found zh ${vw}: no hung mark found`); await ctx.close(); continue; }
      check(!/[，、。；：！？] /.test(r.text) && !/[，、。；：！？] /.test(r.copied) && r.gaps.every((g) => g === ""), `not-found zh ${vw}: text and copy carry no space after a mark ("${r.text.slice(0, 24)}…")`);
      check(r.found !== false, `not-found zh ${vw}: find-in-page "，市场" ${r.found === null ? "(window.find absent)" : r.found ? "matches" : "MISSES"}`);
      check(r.steps.every((s) => typeof s === "string" || Math.abs(s - 1) <= 0.5 / 16), `not-found zh ${vw}: mark + gap advance ${JSON.stringify(r.steps)} em (1 mid-line; 0px at a line end)`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}
console.log(`\nlock-check-r5e: ${fails ? `${fails} Chromium check(s) FAILED` : "every Chromium check holds"}`);
process.exit(fails ? 1 : 0);
