#!/usr/bin/env bash
# S5-R3-FIX 8 verification (R3-2B): the static readers; qa:maswali-register-shots — `states` (the index and a rolled week's
# drawings, their hops judged band by band within 1px) and How's drawing on `sunset` and `empty`; qa:millionea-ghost-hops
# and its --prove-red. On the same seeded stores, in Chromium AND WebKit at ratios 2.625, 3 and 1 with WebKit's classic
# scrollbar removed: every DATA paragraph's lines (How's steps 1 and 3; a week's facts, times and the root's time line) —
# the counts printed beside the drawings' tables — and every STATIC paragraph's GhostWords construction (its children
# wrapped in the band and the unseen words) read against the paragraph as the page draws it: same lines, same height.
. "$CI_RUN/lib.sh"
step cjk-font bash -c 'sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends fonts-noto-cjk && fc-cache -f && fc-list :lang=zh family | sort -u | head -4'
step tsc npx tsc --noEmit
for s in maswali-ui maswali-register maswali-design-register maswali-design visual-pass-r5h visual-pass-r4j visual-pass-r9a visual-pass-r5j spacing-scale docs source-bytes; do
  step "static-$s" npm run "test:$s"
done

cat > "$OUT/measure-lines.mjs" <<'JS'
import { chromium, webkit } from "playwright";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE;
const WHAT = process.env.WHAT;
const WIDTHS = [320, 330, 340, 359, 360, 375, 412, 767, 768, 1280];
/** WebKit on the runner draws a classic scrollbar an iPhone does not: hidden in both engines, so the page is the viewport's width. */
const NO_SCROLLBAR = "html{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}";
const PROBE = (what) => {
  const L = (el) => {
    if (!el) return "-";
    const rects = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest(".sr-only") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      for (const x of r.getClientRects()) if (x.width > 0.5 && x.height > 0) rects.push(x);
    }
    const mids = [];
    for (const x of rects.sort((a, b) => a.top - b.top)) { const m = x.top + x.height / 2; if (!mids.some((y) => Math.abs(y - m) < 5)) mids.push(m); }
    return String(mids.length);
  };
  const H = (el) => Math.round(el.getBoundingClientRect().height * 100) / 100;
  // GhostWords' construction (maswali-ghost-words.tsx): the element's children inside the band and the unseen words.
  const NEUTRAL = (el) => {
    if (!el) return "-";
    const before = `${L(el)}/${H(el)}`;
    const band = document.createElement("span"); band.className = "kp-ghost-words";
    const words = document.createElement("span"); words.className = "kp-ghost-words__words";
    band.appendChild(words);
    const kids = [...el.childNodes];
    for (const k of kids) words.appendChild(k);
    el.appendChild(band);
    const after = `${L(el)}/${H(el)}`;
    for (const k of kids) el.appendChild(k);
    band.remove();
    return before === after ? `=${L(el)}` : `DIFFERS ${before} vs ${after}`;
  };
  const q = (s) => document.querySelector(s);
  const sb = `sb${innerWidth - document.documentElement.clientWidth}`;
  if (what === "how") {
    const steps = [...document.querySelectorAll('[data-testid="millionea-how"] > ol > li')].map((li) => li.lastElementChild);
    const cap = q('article[aria-labelledby="mln-how-ex-swap"] p');
    return `${sb} data s1 ${L(steps[0])} s3 ${L(steps[2])} | words s2 ${NEUTRAL(steps[1])} s4 ${NEUTRAL(steps[3])} caption ${NEUTRAL(cap)}`;
  }
  if (what === "index") return `${sb} | words intro ${NEUTRAL(q('[data-testid="millionea-register-intro"]'))}`;
  const facts = q('[data-testid="millionea-week-head-facts"]');
  const commit = q('[data-testid="millionea-commitments"] > div');
  const cols = commit ? [...commit.querySelectorAll(":scope > div")] : [];
  const labelOf = (row) => { const lab = row.firstElementChild ? row.firstElementChild.firstElementChild : null; return (lab && lab.querySelector(":scope > span.inline-flex > span:first-child")) || lab; };
  const rows = [...document.querySelectorAll('[data-testid="millionea-ledger"] > [data-ledger-row]')];
  return `${sb} data facts ${L(facts)} times ${L(facts ? facts.nextElementSibling : null)} root ${L(cols[1] ? cols[1].children[2] : null)}`
    + ` | words ledger ${rows.map((r) => `${r.getAttribute("data-ledger-row")}:${NEUTRAL(labelOf(r))}`).join(",")}`
    + ` fingerprints ${cols.map((c) => NEUTRAL(c.children[1] || null)).join(",")} explainer ${NEUTRAL(commit ? commit.querySelector(":scope > p") : null)}`;
};
const frames = (page) => page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))));
async function sweep(type, engine, what, path) {
  const browser = await type.launch();
  for (const dsf of [2.625, 3, 1]) {
    for (const l of ["en", "sw", "zh"]) {
      const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 780 }, deviceScaleFactor: dsf });
      await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); localStorage.setItem("50pick-howto-seen", "1"); } catch {} });
      await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(BASE + path, { waitUntil: "load", timeout: 240000 });
      await page.addStyleTag({ content: NO_SCROLLBAR });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(1200);
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 780 });
        await frames(page);
        await page.waitForTimeout(60);
        console.log(`LINES ${engine} dsf${dsf} ${what} ${l} ${w}: ${await page.evaluate(PROBE, what)}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
}
let rolled = null;
if (WHAT === "register") {
  const m = /weeks: (\{.*\})/.exec(readFileSync(`${process.env.OUT}/reg-states.log`, "utf8"));
  rolled = m ? JSON.parse(m[1]).rolled ?? null : null;
  console.log(`ROLLED ${rolled}`);
}
for (const [engine, type] of [["chromium", chromium], ["webkit", webkit]]) {
  if (WHAT === "register") {
    await sweep(type, engine, "index", "/millionea/register");
    if (rolled) await sweep(type, engine, "week", `/millionea/register/${encodeURIComponent(rolled)}`);
  } else {
    await sweep(type, engine, "how", "/millionea/how");
  }
}
JS
cp "$OUT/measure-lines.mjs" measure-lines.tmp.mjs
QUIET="MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false"
step reg-states serve 3901 FEATURE_MILLIONEA=ACTIVE $QUIET -- bash -c "MASWALI_REGISTER_SCENARIO=states node scripts/maswali-register-shots.mjs; rc=\$?; WHAT=register OUT=\"\$OUT\" node measure-lines.tmp.mjs > \"\$OUT/lines-register.log\" 2>&1; exit \$rc"
step how-sunset serve 3902 FEATURE_MILLIONEA=ACTIVE $QUIET -- bash -c "MASWALI_REGISTER_SCENARIO=sunset MASWALI_SHOTS_PAGES=how-ghost node scripts/maswali-register-shots.mjs; rc=\$?; WHAT=how OUT=\"\$OUT\" node measure-lines.tmp.mjs > \"\$OUT/lines-how.log\" 2>&1; exit \$rc"
rm -f measure-lines.tmp.mjs
step how-empty serve 3903 FEATURE_MILLIONEA=ACTIVE $QUIET -- env MASWALI_REGISTER_SCENARIO=empty MASWALI_SHOTS_PAGES=how-ghost node scripts/maswali-register-shots.mjs
step ghost-hops serve 3904 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-millionea-ghost-hops.mjs
step ghost-hops-red serve 3905 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-millionea-ghost-hops.mjs --prove-red
finish
