#!/usr/bin/env bash
# S5-R3-FIX measure 1 (register): the register's and How's loading drawings against their pages on the runner, BEFORE any
# change, with the phones' Chinese face installed — the focused drives (register-ghosts on `states`, how-ghost on `sunset`)
# print each band's offset; then, on the same seeded store, a probe prints the lines each modelled paragraph takes on the
# landed page (the rolled week, the index, How) at every tier's widths, en/sw/zh.
. "$CI_RUN/lib.sh"
step cjk-font bash -c 'sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends fonts-noto-cjk && fc-cache -f'
echo "CJK faces: $(fc-list :lang=zh family | sort -u | head -4 | paste -sd ';')"

cat > "$OUT/measure-register.mjs" <<'JS'
import { chromium } from "playwright";
const BASE = process.env.BASE;
const WHAT = process.env.WHAT;
const WIDTHS = process.env.WIDTHS.split(",").map(Number);
const browser = await chromium.launch();
const frames = (page) => page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))));
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
    return `${mids.length}l/${el.getBoundingClientRect().height.toFixed(1)}`;
  };
  const q = (s) => document.querySelector(s);
  if (what === "index") {
    const intro = q('[data-testid="millionea-register-intro"]');
    const head = q('[data-testid="millionea-register"] > :first-child');
    const running = q('[data-testid="millionea-register-running"]');
    const row = running ? running.querySelector("li") : null;
    const facts = row ? [...row.querySelectorAll(".kp-mln-facts")].map(L).join(",") : "-";
    return `head ${L(head)} intro ${L(intro)} row1 ${row ? row.getBoundingClientRect().height.toFixed(1) : "-"} facts ${facts}`;
  }
  if (what === "week") {
    const root = q('[data-testid="millionea-register-week"]');
    const facts = q('[data-testid="millionea-week-head-facts"]');
    const times = facts ? facts.nextElementSibling : null;
    const rows = [...document.querySelectorAll('[data-testid="millionea-ledger"] > [data-ledger-row]')].map((row) => {
      const rr = row.firstElementChild;
      return `${row.getAttribute("data-ledger-row")}:${L(rr ? rr.firstElementChild : null)}|${L(rr ? rr.lastElementChild : null)}${row.children[1] ? "|note " + L(row.children[1]) : ""}`;
    });
    const commit = q('[data-testid="millionea-commitments"] > div');
    const cols = commit ? [...commit.querySelectorAll(":scope > div")] : [];
    const cs = cols.map((c) => `[${L(c.children[0])} ${L(c.children[1])} ${L(c.children[2] || null)}]`);
    return `head ${L(root ? root.children[1] : null)} facts ${L(facts)} "${facts ? facts.textContent.replace(/\s+/g, " ").trim().slice(0, 70) : ""}" times ${L(times)} ledger ${rows.join(" ")} commit ${cs.join(" ")} explainer ${L(commit ? commit.querySelector(":scope > p") : null)}`;
  }
  if (what === "how") {
    const steps = [...document.querySelectorAll('[data-testid="millionea-how"] > ol > li')].map((li) => L(li.lastElementChild));
    const timeline = q('section[aria-labelledby="mln-how-timeline"]');
    const phases = timeline ? [...timeline.querySelectorAll(":scope > div > div, :scope > ol > li, :scope > div > ol > li")].map(L) : [];
    const swap = q('article[aria-labelledby="mln-how-ex-swap"]');
    return `steps ${steps.join(",")} timeline ${L(timeline)} phases ${phases.join(",")} swapTitle ${L(swap ? swap.querySelector("h3, h4, [id]") : null)} caption ${L(swap ? swap.querySelector("p") : null)} swap ${L(swap)}`;
  }
  return "?";
};
async function sweep(what, path) {
  for (const l of ["en", "sw", "zh"]) {
    const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 780 } });
    await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "load", timeout: 240000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(1200);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 780 });
      await frames(page);
      await page.waitForTimeout(60);
      console.log(`LINES ${what} ${l} ${w}: ${await page.evaluate(PROBE, what)}`);
    }
    await ctx.close();
  }
}
if (WHAT === "register") {
  await sweep("index", "/millionea/register");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/millionea/register", { waitUntil: "load", timeout: 240000 });
  const hrefs = [...new Set(await page.$$eval('a[href^="/millionea/register/"]', (as) => as.map((a) => a.getAttribute("href"))))];
  let rolled = null;
  for (const h of hrefs) {
    await page.goto(BASE + h, { waitUntil: "load", timeout: 240000 });
    const f = await page.evaluate(() => { const e = document.querySelector('[data-testid="millionea-week-head-facts"]'); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; });
    console.log(`WEEK ${h}: ${f.slice(0, 90)}`);
    if (!rolled && f.startsWith("No 10/10")) rolled = h;
  }
  await ctx.close();
  console.log(`ROLLED ${rolled}`);
  if (rolled) await sweep("week", rolled);
} else {
  await sweep("how", "/millionea/how");
}
await browser.close();
JS

cp "$OUT/measure-register.mjs" measure-register.tmp.mjs
QUIET="MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false"
W=320,330,340,350,359,360,375,390,412,480,600,700,767,768,900,1023,1024,1280
step reg-states serve 3611 FEATURE_MILLIONEA=ACTIVE $QUIET -- bash -c "MASWALI_REGISTER_SCENARIO=states MASWALI_SHOTS_PAGES=register-ghosts node scripts/maswali-register-shots.mjs; echo \"drive rc=\$?\"; WHAT=register WIDTHS=$W node measure-register.tmp.mjs"
step how-sunset serve 3612 FEATURE_MILLIONEA=ACTIVE $QUIET -- bash -c "MASWALI_REGISTER_SCENARIO=sunset MASWALI_SHOTS_PAGES=how-ghost node scripts/maswali-register-shots.mjs; echo \"drive rc=\$?\"; WHAT=how WIDTHS=$W node measure-register.tmp.mjs"
rm -f measure-register.tmp.mjs
finish
