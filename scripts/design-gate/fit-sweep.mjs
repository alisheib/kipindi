/**
 * `npm run qa:fit` — DOES TEXT FIT ITS CONTAINER, EVERYWHERE?
 *
 * 🔬 A PLATFORM-WIDE SWEEP, admin and player, at the widths where fitting actually breaks. Built
 * after `qa:refusal` found one button that pushed its own card open: that defect class is not
 * specific to one card, and a per-card fix leaves the rest of the platform holding it.
 *
 * ⛔ THE METRIC IS "CLIPPED WITH NOTHING OFFERED", NOT "CLIPPED". This distinction is the whole
 * instrument, and getting it wrong nearly made me "fix" a correct component. `AdminKpi` truncates
 * its label ON PURPOSE and carries a `title`, and `admin-shell.tsx`'s DG-A-10 comment records that
 * decision, explicitly rejecting the two obvious repairs. Ellipsis WITH a reachable full string is
 * a design choice; ellipsis with no affordance loses text with no way back. So four categories are
 * measured and reported separately, and only the last three are defects:
 *
 *   · affordanced  — clipped, but has title / aria-label / line-clamp. NOT a defect. Counted.
 *   · bare         — clipped horizontally with NO affordance. Text is simply gone.
 *   · vclip        — clipped VERTICALLY inside a fixed-height box (descenders sheared, second
 *                    line eaten). Invisible to any scrollWidth-only check, which is why this
 *                    exists — a `h-8` pill holding two lines of label looks fine to a width test.
 *   · escape       — the element's own box extends past the viewport. Nothing can read it.
 *
 * ⭐ IT GROUPS BY CLASS SIGNATURE, NOT BY PAGE. A defect that appears on eleven pages under one
 * className is ONE component bug, and reporting it eleven times invites eleven local patches —
 * which is this repo's `E-108` shape. The signature is what makes the general fix visible.
 *
 * ⛔ IT RUNS AGAINST PRODUCTION, SIGNED IN, so it reads the real cascade, the real fonts and real
 * data — the only population where "does it fit" is a meaningful question. Read-only: navigation
 * and measurement, no clicks, no writes.
 *
 * Usage:
 *   npm run qa:fit                          # default widths, admin + player
 *   FIT_WIDTHS=320,360 npm run qa:fit
 *   FIT_ONLY=admin npm run qa:fit           # or: player
 *   FIT_ROUTES=/admin/finance,/markets npm run qa:fit
 * Output: `.qa-design-gate/fit-sweep/` (evidence — gitignored, regenerable).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, login, BASE } from "../live/harness.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".qa-design-gate", "fit-sweep");
mkdirSync(OUT, { recursive: true });

const WIDTHS = (process.env.FIT_WIDTHS ?? "320,360,430,1280").split(",").map((n) => Number(n.trim()));
const ONLY = process.env.FIT_ONLY ?? "";

/** ⚠️ 320 and 360 are not optional rows: `G-5` lost a card heading to width at 360, and 320 is the
 *  narrowest phone still in use in this market. 1280 is the control — a defect that appears there
 *  too is not a responsive bug, it is a plain layout bug. */
const PLAYER = [
  "/", "/markets", "/live", "/results", "/leaderboard", "/updown", "/updown/history",
  "/help", "/fairness", "/legal/terms", "/legal/privacy", "/legal/responsible-gambling",
  "/legal/aml", "/auth/login", "/auth/register", "/auth/forgot-password", "/proposals",
];

const ADMIN = [
  "/admin", "/admin/insights", "/admin/finance", "/admin/settlement", "/admin/reports",
  "/admin/payments", "/admin/transactions", "/admin/players", "/admin/players/cohorts",
  "/admin/markets", "/admin/markets/new", "/admin/events", "/admin/ai-polls", "/admin/ai-usage",
  "/admin/candidates", "/admin/proposals", "/admin/resolver-queue", "/admin/sources",
  "/admin/updown", "/admin/updown/proposals", "/admin/updown/rounds", "/admin/config",
  "/admin/roles", "/admin/staff", "/admin/invites", "/admin/bonuses", "/admin/affiliate",
  "/admin/aml", "/admin/approvals", "/admin/compliance", "/admin/objections", "/admin/moderation",
  "/admin/kyc", "/admin/self-exclusions", "/admin/privacy", "/admin/retention", "/admin/audit",
  "/admin/system", "/admin/live",
];

const ROUTES = process.env.FIT_ROUTES
  ? process.env.FIT_ROUTES.split(",").map((r) => ({ path: r.trim(), area: r.includes("/admin") ? "admin" : "player" }))
  : [
      ...(ONLY === "admin" ? [] : PLAYER.map((p) => ({ path: p, area: "player" }))),
      ...(ONLY === "player" ? [] : ADMIN.map((p) => ({ path: p, area: "admin" }))),
    ];

/**
 * The measurement, run inside the page.
 *
 * ⛔ LEAF ELEMENTS ONLY. A container reports its children's overflow as its own, so measuring every
 * node double-counts one defect as many and buries the element actually at fault.
 */
const MEASURE = () => {
  const out = { bare: [], vclip: [], escape: [], affordanced: 0, scanned: 0, excused: 0 };
  const vw = document.documentElement.clientWidth;
  const sig = (el) => (el.getAttribute("class") || "(no class)").trim().replace(/\s+/g, " ").slice(0, 120);
  const root = document.body;
  for (const el of root.querySelectorAll("*")) {
    if (el.children.length) continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    const w = el.clientWidth, h = el.clientHeight;
    if (w < 12 || h < 6) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    if (cs.position === "fixed" && parseFloat(cs.opacity) === 0) continue;
    out.scanned++;

    const hasTitle = !!(el.getAttribute("title") || el.closest("[title]"));
    const hasAria = !!(el.getAttribute("aria-label") || el.closest("[aria-label]"));
    const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    const affordance = hasTitle || hasAria || clamped;

    const hidesX = /hidden|clip/.test(cs.overflowX) || cs.textOverflow === "ellipsis";
    const hidesY = /hidden|clip/.test(cs.overflowY);
    const overX = el.scrollWidth - w;
    const overY = el.scrollHeight - h;
    const rect = el.getBoundingClientRect();
    // ⛔ ESCAPING IS ONLY A DEFECT IF NOTHING CAN REACH IT. A table cell inside an
    // `overflow-x: auto` wrapper extends past the viewport BY DESIGN — that is this repo's own
    // rule for wide content, and flagging it reports the design as the bug. The first run of this
    // sweep did exactly that and returned nothing but table cells. So: an element is only
    // "escaping" when no ancestor can scroll it back into view.
    // ⛔ AND A MOVING TRACK IS NOT AN OVERFLOW EITHER. `live-ticker.tsx` is a marquee: its items
    // sit outside the container by design, and its own comment (line ~145) records an EARLIER
    // probe that measured it mid-flight and reported the movement as a defect. This sweep hit the
    // identical false positive on /markets — 67 "escapes" that were one animating ticker. An
    // ancestor with a running animation means the geometry is a frame, not a layout.
    // 🔴 AND THE ANIMATION CHECK ALONE IS NOT ENOUGH, WHICH COST TWO ROUNDS TO LEARN. Headless
    // Chromium reports `prefers-reduced-motion: reduce`, and this repo gates every animation on
    // that (§M6) — so the ticker's `animationName` is `none` in ANY headless probe and the
    // exclusion silently stopped firing. The full sweep then re-reported the same marquee as 36
    // escapes across 14 routes, including /legal and /auth. An exclusion that depends on motion
    // actually RUNNING cannot work in the one environment this instrument runs in.
    // ⭐ So a marquee is excused by its own marker class as well. Explicit, narrow, and readable —
    // and it survives motion being off, which is the state the sweep always measures in.
    let excused = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (/auto|scroll/.test(acs.overflowX) && a.scrollWidth > a.clientWidth + 1) { excused = true; break; }
      if (acs.animationName && acs.animationName !== "none") { excused = true; break; }
      if (/ticker|marquee/i.test(a.getAttribute("class") || "")) { excused = true; break; }
    }
    if (excused) out.excused++;
    const esc = excused ? 0 : Math.round(rect.right - vw);

    const row = { text: text.slice(0, 48), sig: sig(el), box: w, content: el.scrollWidth, over: overX };

    if (hidesX && overX > 1) { affordance ? out.affordanced++ : out.bare.push(row); }
    // ⛔ VERTICAL is judged on the BOX, not on an overflow property: a `h-8` pill with two lines of
    // text shears the second line even at `overflow: visible`, because the ink lands outside the
    // painted background. A width-only sweep cannot see it.
    if (overY > 2 && (hidesY || cs.overflow === "hidden" || /rounded|badge|pill|chip|btn/.test(sig(el)))) {
      if (!clamped) out.vclip.push({ ...row, boxH: h, contentH: el.scrollHeight, over: overY });
    }
    if (esc > 1 && rect.width > 0) out.escape.push({ ...row, escapes: esc });
  }
  const doc = document.documentElement;
  out.pageOverflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
  return out;
};

const b = await browser({ viewport: { width: 1280, height: 900 } });
const page = await b.ctx.newPage();
page.setDefaultTimeout(30_000);

let adminOk = false;
try { await login(page, "admin"); adminOk = true; console.log("signed in as ADMIN"); }
catch (e) { console.log(`⚠️  ADMIN sign-in failed (${String(e).slice(0, 60)}) — admin routes will be skipped`); }

const findings = [];
let scanned = 0, affordanced = 0, pages = 0, skipped = 0, excused = 0;

for (const r of ROUTES) {
  if (r.area === "admin" && !adminOk) { skipped++; continue; }
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    let res;
    try { res = await page.goto(BASE + r.path, { waitUntil: "domcontentloaded", timeout: 45_000 }); }
    catch { skipped++; continue; }
    if (!res || !res.ok()) { skipped++; continue; }
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(180);
    // ⛔ THE CONTROL. A sweep that reports "0 defects" is worthless until it has been shown to
    // detect one, and this file has already produced two rounds of confident false POSITIVES
    // (table cells in a scroller, then a marquee mid-flight) — the same instrument can just as
    // easily produce a false negative. `FIT_PROVE_RED=1` injects one horizontally-clipped span
    // and one vertically-sheared pill into every page and REQUIRES both to be caught.
    if (process.env.FIT_PROVE_RED) {
      await page.evaluate(() => {
        const d = document.createElement("div");
        d.innerHTML =
          '<span id="__fit_bare" style="display:block;width:60px;overflow:hidden;white-space:nowrap">' +
          'a deliberately long string that cannot fit sixty pixels</span>' +
          '<span id="__fit_vclip" class="rounded-pill" style="display:block;width:70px;height:14px;overflow:hidden">' +
          'two lines of label text that will be sheared vertically</span>';
        document.body.appendChild(d);
      });
    }
    let m;
    try { m = await page.evaluate(MEASURE); } catch { skipped++; continue; }
    if (process.env.FIT_PROVE_RED) {
      // ⚠️ Match INSIDE the 48-char slice `MEASURE` stores — the first draft looked for
      // "sheared vertically", which falls past the cut, and the control failed itself.
      const gotBare = m.bare.some((r) => r.text.includes("deliberately long"));
      const gotV = m.vclip.some((r) => r.text.includes("two lines of label"));
      if (!gotBare || !gotV) {
        console.error(`\nCONTROL FAILED on ${r.path}@${w} — bare:${gotBare} vclip:${gotV}. This sweep cannot see the defects it claims to measure.`);
        process.exit(1);
      }
    }
    pages++; scanned += m.scanned; affordanced += m.affordanced; excused += (m.excused || 0);
    for (const kind of ["bare", "vclip", "escape"]) {
      for (const row of m[kind]) findings.push({ kind, route: r.path, area: r.area, w, ...row });
    }
    if (m.pageOverflow > 1) {
      findings.push({ kind: "page", route: r.path, area: r.area, w, text: "(document)", sig: "html", over: m.pageOverflow });
    }
  }
  process.stdout.write(".");
}
await b.ctx.close();
await b.b.close();

/* ── Group by CLASS SIGNATURE — one component bug, not eleven page bugs ─────────────────── */
const byComponent = new Map();
for (const f of findings) {
  const key = `${f.kind}|${f.sig}`;
  if (!byComponent.has(key)) byComponent.set(key, { kind: f.kind, sig: f.sig, hits: [], routes: new Set(), widths: new Set() });
  const g = byComponent.get(key);
  g.hits.push(f); g.routes.add(f.route); g.widths.add(f.w);
}
const groups = [...byComponent.values()].sort((a, b) => b.hits.length - a.hits.length);

console.log(`\n\n${pages} page-views · ${scanned} text leaves measured · ${affordanced} intentional truncations (not defects) · ${excused} excused as scroller/marquee · ${skipped} skipped`);
console.log(`${findings.length} defect instances in ${groups.length} distinct component signatures\n`);

const LABEL = { bare: "CLIPPED, no affordance", vclip: "CLIPPED VERTICALLY", escape: "ESCAPES VIEWPORT", page: "PAGE SCROLLS SIDEWAYS" };
for (const g of groups) {
  console.log(`── ${LABEL[g.kind]} · ${g.hits.length} hit(s) · ${g.routes.size} route(s) · widths ${[...g.widths].join("/")}`);
  console.log(`   class: ${g.sig}`);
  console.log(`   e.g.  "${g.hits[0].text}"  box=${g.hits[0].box ?? "-"} content=${g.hits[0].content ?? "-"} over=${g.hits[0].over}`);
  console.log(`   routes: ${[...g.routes].slice(0, 6).join(", ")}${g.routes.size > 6 ? ` +${g.routes.size - 6}` : ""}\n`);
}

writeFileSync(join(OUT, "findings.json"), JSON.stringify({ pages, scanned, affordanced, skipped, groups: groups.map((g) => ({ ...g, routes: [...g.routes], widths: [...g.widths] })) }, null, 2));
console.log(`full report → .qa-design-gate/fit-sweep/findings.json`);
process.exit(0);
