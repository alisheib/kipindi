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
  ["payments", "/admin/payments"], ["transactions", "/admin/finance/transactions"],
  ["roster", "/admin/players"], ["cohorts", "/admin/retention"], ["events", "/admin/events"],
  ["ai-polls", "/admin/ai-polls"], ["candidates", "/admin/candidates"], ["proposals", "/admin/proposals"],
  ["curation", "/admin/moderation"], ["resolver-queue", "/admin/resolver-queue"],
  ["sources", "/admin/sources"], ["config", "/admin/config"], ["objections", "/admin/objections"],
  ["staff", "/admin/staff"], ["roles", "/admin/roles"], ["markets", "/admin/markets"],
  ["updown", "/admin/updown"], ["kyc", "/admin/kyc"], ["aml", "/admin/aml"], ["audit", "/admin/audit"],
];
const PLAYER = [
  ["board", "/updown"], ["markets", "/markets"], ["positions", "/positions"],
  ["ud-history", "/updown/history"], ["wallet", "/wallet"], ["deposit", "/wallet/deposit"],
  ["withdraw", "/wallet/withdraw"], ["history", "/history"], ["inbox", "/inbox"],
  ["profile", "/profile"], ["kyc", "/kyc"], ["responsible", "/responsible-gaming"],
  ["leaderboard", "/leaderboard"], ["results", "/results"], ["live", "/live"], ["help", "/help"],
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
  // Wide BY DESIGN — see the header note. Skipping these is not leniency, it is correctness.
  const byDesign = (el) => {
    if (el.closest(".live-ticker, [data-ticker], .sr-only, [aria-hidden='true']")) return true;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.position === "sticky") return false;
    return false;
  };

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // 1 · anything painting OUTSIDE the viewport horizontally
    if (!byDesign(el) && (rect.right > vw + 1 || rect.left < -1) && el.children.length === 0) {
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
    await page.goto(`${BASE}/api/locale?set=${locale}&next=/`, { waitUntil: "domcontentloaded" }).catch(() => {});
    for (const [name, path] of routes) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: w < 768 ? 780 : 900 });
        let status = "ok";
        try {
          const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
          if (res && res.status() >= 400) status = `HTTP ${res.status()}`;
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
