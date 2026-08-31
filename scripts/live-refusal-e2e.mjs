/**
 * `npm run qa:refusal-live` — THE REFUSAL SEAM, DRIVEN ON PRODUCTION AS A REAL ADMIN.
 *
 * 🔬 WHY THIS EXISTS BESIDE `qa:refusal`. The bench proves the card FITS by rendering the markup
 * over production's stylesheet. It cannot prove the card is REACHABLE: that the route in
 * `fix.href` resolves, that the `#anchor` lands on the right card, that the console still loads
 * for a real signed-in officer. A remedy button that fits perfectly and goes nowhere is the same
 * defect as the sentence it replaced — the owner asked "where do I fix it, which screen?" and a
 * broken anchor answers that question exactly as badly.
 *
 * ⛔ IT RUNS AS ADMIN, AND THAT IS A DELIBERATE, NARROW CHOICE. `harness.mjs` warns that ADMIN
 * bypasses every domain check, so a SWEEP run as ADMIN measures nothing about RBAC. This is not a
 * sweep: `/admin/ai-usage` is where the money controls live and ADMIN is who operates them.
 *
 * ⛔ IT DOES NOT SPEND, AND IT DOES NOT TOUCH THE SPEND CAP. Making the gate refuse for real
 * would mean lowering the live ceiling below current spend, which would also refuse the Market
 * Sentinel and the Up & Down oracle for the duration — real markets, real money, to take a
 * screenshot. So this drives everything AROUND the refusal (the remedy path, the anchors, the
 * figures the card would quote) and leaves triggering the refusal itself to `test:operator-error`
 * §5, which drives the REAL gate in-process against a genuinely overspent window.
 *
 * Usage: node scripts/live-refusal-e2e.mjs        (LIVE_BASE=… to point elsewhere)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, login, BASE, measureClipping, describeClipping } from "./live/harness.mjs";

/**
 * ⛔ EVIDENCE GOES TO THE GITIGNORED DIR, NOT THE REPO ROOT. The harness's `shot()` defaults
 * `SHOT_DIR` to `"."` (harness.mjs:30), and the first run of this driver dropped two PNGs beside
 * package.json — where a careless `git add -A` commits them. The ignored evidence convention in
 * this repo is the `.qa-design-` prefix (.gitignore:61) — ⚠️ written WITHOUT its trailing glob on
 * purpose, because the two characters that follow it would close this block comment and turn the
 * rest of the paragraph into code. Writing the file here rather than exporting SHOT_DIR keeps it
 * correct however the script is invoked, on any shell.
 */
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), "..", ".qa-design-gate", "refusal-live");
mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) =>
  writeFileSync(join(SHOTS, name + ".png"), await page.screenshot({ fullPage: true }));

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// `browser()` returns { b, ctx } and already opens a context at the requested viewport.
const { b, ctx } = await browser({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

try {
  await login(page, "admin");
  ok("§1 signed in as ADMIN on production", true, BASE);

  /* ── §2 · the Credit budget card, and the figures the refusal quotes ─────────────────── */
  const res = await page.goto(`${BASE}/admin/ai-usage`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("§2.1 /admin/ai-usage loads", !!res && res.ok(), `HTTP ${res && res.status()}`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  // ⛔ THE ANCHOR IS THE CONTRACT. `aiBudgetRefusal()` sends `#ai-credit-budget`; if that id is
  // not rendered the button lands at the top of a very long page, which is where the operator
  // already was when they could not find the control.
  const hasCredit = await page.locator("#ai-credit-budget").count();
  const hasCycles = await page.locator("#ai-cycles").count();
  ok("§2.2 #ai-credit-budget exists on the live page", hasCredit === 1, `count=${hasCredit}`);
  ok("§2.3 #ai-cycles exists on the live page", hasCycles === 1, `count=${hasCycles}`);

  const creditText = hasCredit ? (await page.locator("#ai-credit-budget").innerText()).replace(/\s+/g, " ") : "";
  ok("§2.4 the Credit budget card names the top-up window limit",
    /Spend limit per top-up window/i.test(creditText), creditText.slice(0, 90));

  /**
   * ⛔ DO NOT PIN THE LIMIT TO A CONSTANT. This asserted `=== 70`, which meant the suite went RED
   * the moment an operator did the thing the refusal tells them to do — raise the limit. A guard
   * that fails when the product is used correctly trains people to ignore it.
   * ⭐ The invariant that IS true for any ceiling: the input and the meter's cap agree, and the
   * cap is a positive number. That is re-derived from the live screen every run.
   */
  const limitVal = hasCredit ? await page.locator('#ai-credit-budget input[name="limitUsd"]').inputValue().catch(() => "") : "";
  const meter = /Top-up window spend[^\n]*/i.exec(creditText)?.[0] ?? "";
  const meterCap = /\/\s*\$([\d,]+(?:\.\d+)?)/.exec(meter)?.[1]?.replace(/,/g, "") ?? "";
  ok("§2.5 the live limit is a real ceiling, and the input agrees with the meter",
    Number(limitVal) > 0 && Number(meterCap) > 0 && Math.abs(Number(limitVal) - Number(meterCap)) < 0.005,
    `input="${limitVal}" meterCap="${meterCap}"`);

  ok("§2.6 the top-up window meter is rendered", meter.length > 0, meter.slice(0, 80));

  await shot(page, "refusal-e2e-credit-budget");

  /* ── §3 · the remedy link actually lands on that card ────────────────────────────────── */
  await page.goto(`${BASE}/admin/ai-usage#ai-credit-budget`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900); // let the anchor scroll settle

  const land = await page.evaluate(() => {
    const el = document.getElementById("ai-credit-budget");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), vh: window.innerHeight, scrollY: Math.round(window.scrollY) };
  });
  ok("§3.1 the anchor target is present after navigation", land !== null);
  // ⛔ "IN THE VIEWPORT" IS THE ASSERTION, not "the URL contains a hash". A hash that does not
  // scroll is the failure this is here to catch.
  ok("§3.2 …and the browser actually scrolled to it",
    !!land && land.scrollY > 100 && land.top > -200 && land.top < land.vh,
    land ? `card top=${land.top}px, viewport=${land.vh}px, scrollY=${land.scrollY}` : "no element");

  /* ── §4 · the console that renders the refusal still loads ───────────────────────────── */
  // ⛔ LISTEN BEFORE NAVIGATING. This attached the `pageerror` handler AFTER the page had loaded
  // and hydrated, so the hydration failure it claims to smoke-test had already happened and could
  // never be seen — the assertion passed on every run for the wrong reason.
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const pollsRes = await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("§4.1 /admin/ai-polls loads", !!pollsRes && pollsRes.ok(), `HTTP ${pollsRes && pollsRes.status()}`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  ok("§4.2 the generation console rendered (not an empty shell)",
    bodyText.length > 400 && /generat/i.test(bodyText), `${bodyText.length} chars`);

  // The console imports `operator-refusal` at module scope — a bad import would blank the page
  // or throw in the client bundle, so a rendered console is also a smoke test of that module.
  await page.waitForTimeout(1200);
  ok("§4.3 no client-side exception on the refusal-rendering console", errors.length === 0, errors.join(" | ").slice(0, 120));

  await shot(page, "refusal-e2e-ai-polls");

  /* ── §5 · text fitting — CLIPPED WITHOUT AN AFFORDANCE ──────────────────────────────── */
  /**
   * ⛔ THE FIRST VERSION OF THIS CHECK WAS WRONG, AND IT WOULD HAVE "FIXED" A CORRECT COMPONENT.
   * It used `measureClipping` bare and failed on eight elements of `/admin/ai-polls` — the
   * `AdminKpi` labels and the poll titles. Those are `truncate` **with a `title` attribute**, and
   * `admin-shell.tsx`'s own DG-A-10 comment states that as the component's deliberate answer,
   * explicitly rejecting both obvious repairs (wrapping to two lines, dropping the tracking) and
   * concluding "shorter labels are the real fix". Ellipsis WITH a reachable full string is a
   * design decision. Ellipsis with NO affordance is the defect.
   *
   * ⚠️ So the assertion is narrowed to clipping that offers the reader nothing: no `title`, no
   * `aria-label`, not line-clamped. Intentional truncation is still COUNTED and printed, because
   * a silently-ignored category is how a real regression hides inside an accepted one.
   */
  for (const [label, url] of [["ai-usage", "/admin/ai-usage"], ["ai-polls", "/admin/ai-polls"]]) {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(300);
      const res = await page.evaluate(() => {
        const affordanced = [], bare = [];
        const root = document.querySelector("main") ?? document.body;
        for (const el of root.querySelectorAll("*")) {
          if (el.children.length) continue;
          const text = (el.textContent || "").trim();
          if (!text) continue;
          const w = el.clientWidth, h = el.clientHeight;
          if (w < 12 || h < 6) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
          const hides = /hidden|clip|auto|scroll/.test(cs.overflowX) || cs.textOverflow === "ellipsis";
          if (!hides || el.scrollWidth <= w + 1) continue;
          // The affordances that make truncation a CHOICE rather than a loss.
          const hasTitle = !!(el.getAttribute("title") || el.closest("[title]"));
          const hasAria = !!(el.getAttribute("aria-label") || el.closest("[aria-label]"));
          const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
          const row = { text: text.slice(0, 40), box: w, content: el.scrollWidth };
          (hasTitle || hasAria || clamped ? affordanced : bare).push(row);
        }
        return { affordanced, bare: bare.slice(0, 8) };
      });
      ok(`§5 ${label} @${w} — nothing clipped WITHOUT an affordance`, res.bare.length === 0,
        res.bare.length
          ? res.bare.map((r) => `"${r.text}" ${r.box}px<${r.content}px`).join(" · ")
          : `${res.affordanced.length} intentional truncation(s), each with title/aria/line-clamp`);
    }
  }
} finally {
  await ctx.close();
  await b.close();
}

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
