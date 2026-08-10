/**
 * SESSION 29 · ③ — THE VISUAL SWEEP ALI ASKED FOR: *"visually admire everything and
 * responsiveness, and make it perfect."*
 *
 *   node scripts/live-s29-sweep.mjs [admin|player|all] [widths] [locales]
 *   node scripts/live-s29-sweep.mjs admin 360,1280 sw,zh
 *
 * ⛔ THE SCREENSHOTS ARE THE POINT, AND THEY ARE VIEWPORT SHOTS. `fullPage` is banned here for
 * a reason this session paid for again: Playwright scrolls and stitches, so a STICKY header is
 * painted mid-document and lands on top of the content. It reads exactly like a z-index defect
 * and is entirely the harness's. What a player sees is one screen at a time.
 *
 * ⛔ THE SCAN IS A PRE-FLIGHT, NOT EVIDENCE. It exists to tell me WHICH images to open first,
 * because 40 routes × 4 widths × 3 locales is 480 pictures and a human cannot look at all of
 * them with equal attention. Every rule below encodes a trap this campaign has already paid for:
 *
 *  · TRUNCATION — `innerText` returns the full string whatever `text-overflow: ellipsis`
 *    paints, so "the words are still there" passes with a label 100% invisible (E-98/E-100).
 *    Geometry is the only honest measure: `scrollWidth > clientWidth` on a clipping element.
 *  · WRAPPING — once a control stops truncating, `scrollWidth === clientWidth` is true for a
 *    label that FITS and one stacked over three lines alike. So count LINES from
 *    clientHeight / line-height (E-98's refinement).
 *  · OVERFLOW — a document-level `scrollWidth` check reports 0 over text clipped INSIDE a card
 *    (E-30), so the scan is PER ELEMENT. And it must skip what is wide BY DESIGN — `ellipsis`
 *    elements whose hidden tail IS the "…", `sr-only` skip links, and the `LiveTicker` marquee
 *    — or it reports correct code as broken and the "fix" is to undo the fix.
 *  · TAP TARGETS — the standards floor is 40px.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, SHOT, login, browser } from "./live/harness.mjs";

const [WHICH = "all", WIDTHS_ARG = "360,768,1280,1920", LOCALES_ARG = "en,sw,zh"] = process.argv.slice(2);
const WIDTHS = WIDTHS_ARG.split(",").map(Number);
const LOCALES = LOCALES_ARG.split(",");
mkdirSync(SHOT, { recursive: true });

/** Every route worth a human eye, with who has to be signed in to see it. */
const ADMIN = [
  ["overview", "/admin"], ["live-ops", "/admin/live"], ["insights", "/admin/insights"],
  ["settlement", "/admin/settlement"], ["finance", "/admin/finance"], ["reports", "/admin/reports"],
  // ⚠️ `/admin/finance/transactions` NEVER EXISTED — corrected 2026-08-10. The ledger page is
  // `/admin/transactions`; `/admin/finance` is a different screen. Every run since this list
  // was written shot 3 cells of a 404 and reported them as route failures.
  ["payments", "/admin/payments"], ["transactions", "/admin/transactions"],
  ["roster", "/admin/players"], ["cohorts", "/admin/retention"], ["events", "/admin/events"],
  ["ai-polls", "/admin/ai-polls"], ["candidates", "/admin/candidates"], ["proposals", "/admin/proposals"],
  ["curation", "/admin/moderation"], ["resolver-queue", "/admin/resolver-queue"],
  ["sources", "/admin/sources"], ["config", "/admin/config"], ["objections", "/admin/objections"],
  ["staff", "/admin/staff"], ["roles", "/admin/roles"], ["markets", "/admin/markets"],
  // ⚠️ `/admin/kyc` HAS NO INDEX PAGE, BY DESIGN — corrected 2026-08-10. `src/app/admin/kyc/`
  // contains only `[id]`, and `admin-nav-groups.ts:159` says so in as many words:
  // *"/admin/kyc → approvals (KYC review is part of the approvals queue)"*. So the sweep was
  // demanding an index that was deliberately never built, and calling its absence a defect.
  // ⛔ Both of these are the same class of harness lie: **a route list written from memory
  // reports the LIST's staleness as the PRODUCT's failure**, and 6 of 423 cells in the last
  // run were shots of a 404. This file's own banner already says to check the list against
  // the router before believing a run — that instruction existed and was not followed.
  ["updown", "/admin/updown"], ["approvals", "/admin/approvals"], ["aml", "/admin/aml"], ["audit", "/admin/audit"],
];
/**
 * 🔴 READ OFF THE REAL ROUTER, NOT WRITTEN FROM MEMORY.
 *
 * Session 30 found three of these returning **HTTP 404** and deliberately did not file them,
 * saying *"almost certainly three wrong paths in the harness, not three missing pages — one
 * minute against the real router settles it."* It was right, and it was FOUR, not three.
 * Checked against `.next/app-path-routes-manifest.json`:
 *
 *   `/history`            → does not exist. The long-form portfolio is `/positions`; Up & Down
 *                           is `/updown/history`. Both were already in this list, so the entry
 *                           was pure invention.
 *   `/inbox`              → does not exist AT ALL. The nearest real surface is
 *                           `/profile/notifications`.
 *   `/kyc`                → `/profile/kyc`
 *   `/responsible-gaming` → `/profile/responsible-gambling` (the fourth, which nobody had
 *                           flagged because a 404 in a list of sixteen reads as noise)
 *
 * ⛔ A SWEEP THAT PHOTOGRAPHS A 404 IS THE SAME CLASS AS ONE THAT PHOTOGRAPHS THE WRONG
 * LANGUAGE (E-106): the output looks like evidence. Four of sixteen player cells were
 * measuring the not-found page, so a quarter of the player half of Ali's visual mandate was
 * void before it ran — and the run still "looked orderly" because `status` was recorded but
 * nothing refused to continue on it.
 */
const PLAYER = [
  ["board", "/updown"], ["markets", "/markets"], ["positions", "/positions"],
  ["ud-history", "/updown/history"], ["performance", "/positions/performance"],
  ["wallet", "/wallet"], ["deposit", "/wallet/deposit"], ["withdraw", "/wallet/withdraw"],
  ["notifications", "/profile/notifications"], ["profile", "/profile"],
  ["kyc", "/profile/kyc"], ["responsible", "/profile/responsible-gambling"],
  ["account", "/profile/account"], ["security", "/profile/security"],
  ["leaderboard", "/leaderboard"], ["results", "/results"], ["live", "/live"], ["help", "/help"],
  ["proposals", "/proposals"], ["watchlist", "/watchlist"], ["fairness", "/fairness"],
];

/**
 * The per-element scan. Returns only what is WORTH A LOOK — a clean page returns [].
 * ⚠️ Runs in the page, so it must be self-contained.
 */
const SCAN = () => {
  const out = [];
  const vw = window.innerWidth;
  const push = (kind, el, detail) => {
    const t = (el.innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    out.push({ kind, tag: el.tagName.toLowerCase(), cls: String(el.className ?? "").slice(0, 50), text: t, ...detail });
  };
  /**
   * 🔴 WIDE BY DESIGN, AND THIS EXEMPTION USED TO MATCH NOTHING.
   *
   * It named `.live-ticker` — a class that **does not exist**. The marquee's track is
   * `.ticker-track` (`globals.css:796`, `live-ticker.tsx:105`), so every one of its ~36
   * off-screen spans was reported on EVERY page. Measured 2026-08-06 at 360/SW: `/help` and
   * `/updown` returned **40 of 40 byte-identical findings**, because the scan was describing
   * the shared chrome and never the page. ⛔ **A pre-flight that returns the same answer for
   * every input is not ranking anything** — and it had already been handed to the next session
   * as "open these first".
   *
   * ⛔ AND IT WAS ONLY EVER APPLIED TO THE OFF-SCREEN RULE. The `sr-only` skip link was flagged
   * as truncated on all 21 routes for the same reason: the exemption existed, and the branch
   * that needed it never called it. It is applied to every rule now.
   */
  const byDesign = (el) =>
    !!el.closest(".ticker-track, .live-ticker, [data-ticker], .sr-only, [aria-hidden='true'], [hidden]");

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    // ⛔ ONE exemption, checked ONCE, for every rule below — see byDesign.
    if (byDesign(el)) continue;

    // 1 · anything painting OUTSIDE the viewport horizontally
    if ((rect.right > vw + 1 || rect.left < -1) && el.children.length === 0) {
      push("offscreen", el, { left: Math.round(rect.left), right: Math.round(rect.right), vw });
    }
    // 2 · TRUNCATION — geometry, never innerText
    const clips = cs.textOverflow === "ellipsis" || cs.overflow === "hidden" || cs.overflowX === "hidden";
    if (clips && el.children.length === 0 && el.scrollWidth > el.clientWidth + 1) {
      const hiddenPx = el.scrollWidth - el.clientWidth;
      // An ellipsis element hiding a LOT is a label nobody can read; hiding a few px is the "…".
      if (hiddenPx > 12) push("truncated", el, { hiddenPx, shown: Math.round(el.clientWidth) });
    }
    // 3 · WRAPPED CONTROL — a button/label stacked over lines reads as cramped even though
    //     geometry says it fits. Only for controls, where one line is the design intent.
    if (/^(button|a)$/.test(el.tagName.toLowerCase()) || el.getAttribute("role") === "combobox") {
      const lh = parseFloat(cs.lineHeight) || 0;
      const lines = lh > 0 ? Math.round(rect.height / lh) : 1;
      if (lines >= 3 && (el.innerText ?? "").trim().length > 0) push("wrapped-control", el, { lines, h: Math.round(rect.height) });
    }
    // 4 · TAP TARGET below the 40px bar (interactive, visible, not inline text links)
    if (/^(button|select)$/.test(el.tagName.toLowerCase()) || (el.tagName === "A" && cs.display !== "inline")) {
      if (rect.height > 0 && rect.height < 40 && rect.width >= 12) {
        push("tap-target", el, { h: Math.round(rect.height), w: Math.round(rect.width) });
      }
    }
  }
  return {
    docOverflow: Math.max(0, document.documentElement.scrollWidth - vw),
    findings: out.slice(0, 40),
    title: document.title,
    // An empty state should read like a sentence a person wrote — captured so I can read them.
    empties: [...document.querySelectorAll("[data-empty], .empty-state")].map((e) => e.innerText.replace(/\s+/g, " ").trim().slice(0, 140)).slice(0, 4),
  };
};

const results = [];
const { b, ctx } = await browser();

async function sweep(label, routes, who) {
  for (const locale of LOCALES) {
    const c = await ctx.browser().newContext({ viewport: { width: WIDTHS[0], height: 900 } });
    const page = await c.newPage();
    await login(page, who);
    // ⛔⛔ THE LOCALE IS SET BY COOKIE, AND THIS LINE USED TO BE A NO-OP AGAINST A 404.
    // It read `await page.goto(\`${BASE}/api/locale?set=${locale}&next=/\`)` — and there is NO
    // `/api/locale` route in this app. The app resolves language from the **`kp-locale`
    // cookie** (`src/app/layout.tsx:97`, `src/lib/i18n-server.ts:19`). So every SW and ZH cell
    // this sweep has ever captured was **English photographed a second time**: measured on
    // 2026-08-06, `<html lang>` came back `"en"` after `?set=sw`, with **no locale cookie set at
    // all**. 32 player and 104 admin screenshots, and the entire trilingual half of Ali's visual
    // mandate, measured nothing — and would have sent the next session chasing i18n defects that
    // are artefacts of this line.
    await c.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // ⛔ AND THEN REFUSE TO MEASURE IF IT DID NOT TAKE. A sweep that silently captures the wrong
    // language is worse than one that fails, because its output looks like evidence. `<html lang>`
    // is written from the SAME resolved locale the dictionary lookup uses, so it is the honest
    // witness — not the cookie we just set, which only proves we asked.
    const applied = await page.evaluate(() => document.documentElement.lang);
    if (applied !== locale) {
      throw new Error(
        `LOCALE DID NOT APPLY: asked for "${locale}", <html lang> is "${applied}". ` +
        `Refusing to capture — every shot would be mislabelled. Check the kp-locale cookie.`);
    }
    console.log(`  locale ${locale} confirmed (<html lang>="${applied}")`);
    for (const [name, path] of routes) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: w < 768 ? 780 : 900 });
        let status = "ok";
        try {
          const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
          if (res && res.status() >= 400) status = `HTTP ${res.status()}`;
          // ⛔ A 404 STILL PAINTS A PAGE, AND THE SCAN WILL HAPPILY MEASURE IT. `res.status()`
          // can also be 200 on a soft not-found, so witness the RESULT the way E-106's locale
          // check does rather than trusting the response code alone.
          const notFound = await page.evaluate(() =>
            /page not found|not found|ukurasa haujapatikana|页面未找到|404/i.test(
              (document.querySelector("h1,h2")?.textContent ?? "") + " " + document.title));
          if (notFound && status === "ok") status = "SOFT-404 (the page rendered a not-found)";
        } catch (e) { status = `NAV ${String(e.message).slice(0, 40)}`; }
        // Let the dynamic tree stream and any float-in settle — `page.screenshot()` does not
        // wait for animations, and the kit's `.m-float-in` photographs see-through if rushed.
        await page.waitForTimeout(1400);
        const scan = status === "ok" ? await page.evaluate(SCAN).catch(() => null) : null;
        const shot = `${SHOT}/sweep/${label}-${name}-${w}-${locale}.png`;
        await page.screenshot({ path: shot }).catch(() => {});   // ⛔ VIEWPORT — never fullPage
        results.push({ label, name, path, w, locale, status, shot, ...(scan ?? { findings: [] }) });
        const n = scan?.findings?.length ?? 0;
        const over = scan?.docOverflow ?? 0;
        if (status !== "ok" || n || over) {
          console.log(`  ${status === "ok" ? " " : "🔴"} ${label}/${name} ${String(w).padStart(4)} ${locale}  ${status}  overflow=${over}  findings=${n}`);
        }
      }
    }
    await c.close();
  }
}

mkdirSync(`${SHOT}/sweep`, { recursive: true });
try {
  if (WHICH === "admin" || WHICH === "all") await sweep("admin", ADMIN, "admin");
  if (WHICH === "player" || WHICH === "all") await sweep("player", PLAYER, "fleet:07");
} finally {
  await b.close();
}

writeFileSync(`${SHOT}/sweep-findings.json`, JSON.stringify(results, null, 1));

// ── The ranked list: WHICH PICTURES TO OPEN, worst first ────────────────────────────────
const score = (r) => (r.status !== "ok" ? 1000 : 0) + (r.docOverflow ?? 0) + (r.findings?.length ?? 0) * 5;
const ranked = [...results].sort((a, b) => score(b) - score(a));
console.log(`\n── ${results.length} (route × width × locale) captured · ${ranked.filter((r) => score(r) > 0).length} worth opening ──\n`);
for (const r of ranked.slice(0, 30)) {
  if (!score(r)) break;
  const kinds = {};
  for (const f of r.findings ?? []) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
  console.log(`  ${String(score(r)).padStart(5)}  ${r.label}/${r.name} ${String(r.w).padStart(4)} ${r.locale}  ${r.status}  doc=${r.docOverflow ?? "-"}  ${JSON.stringify(kinds)}`);
  console.log(`         ${r.shot}`);
}
const clean = results.filter((r) => !score(r)).length;
console.log(`\n  ${clean} of ${results.length} came back with nothing to flag — those still need eyes, just not first.`);

// ⛔ REFUSE TO EXIT GREEN OVER A ROUTE THAT NEVER RENDERED — the same rule E-106 applied to the
// locale. Four of the sixteen player entries were wrong paths, so a quarter of the player half
// of the sweep was photographing the not-found page while the run "looked orderly": the status
// was recorded and nothing acted on it. A route list is an assumption, and an assumption whose
// failure is only ever *printed* is an assumption nobody checks.
const broken = [...new Set(results.filter((r) => r.status !== "ok").map((r) => `${r.path} → ${r.status}`))];
if (broken.length) {
  console.error(`\n🔴 ${broken.length} route(s) never rendered. Every shot of them is worthless:`);
  for (const b of broken) console.error(`   ${b}`);
  console.error(`\n   Fix the route list against .next/app-path-routes-manifest.json before believing this run.`);
  process.exit(1);
}
