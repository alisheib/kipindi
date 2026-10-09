/**
 * ROUND 5 OF THE VISUAL PASS, HELPER F (2026-10-09) — `qa:bar-geometry` guards again. The drive read RED ON MAIN (88
 * failures at a6331ca1, 92 on the tip) and its red twin refused to run, so neither proved anything; every failure was the
 * instrument (the R5-F report classifies all 92). The repair lives in `scripts/live/bar-geometry-rules.mjs`, shared by the
 * drive, its red twin and this suite, so the three cannot drift. A browser cannot run here, so this suite replays the
 * MEASUREMENTS the failing runs logged through the new rules — and keeps every real defect the drive exists for red.
 *
 *   npx tsx scripts/visual-pass-r5f.test.mts        (npm run test:visual-pass-r5f)
 *
 *   §1  no bar on the page: rows and no bar FAILS; no rows is NOT MEASURED, never a pass; a declared surface measured
 *       nowhere makes a skipped run — and the route list matches the app (every sticky query bar, no stale route)
 *   §2  overlap over PAINTED boxes: the 14 logged /markets-360 overlaps (sw · en · zh) reproduce under the old rule and
 *       vanish under the new one; the overlap the drive was built for stays red; the probe's clip walk (fake DOM)
 *   §3  the stick inside its own range: the 18 logged positions (tip + main) reproduce at the page's end and the bar sits
 *       on its offset where the drive now scrolls; the 247px wrapper, a non-sticky bar, a band at the bar's offset and a
 *       bar off its offset stay red; a thin page is NOT MEASURED; the probes (fake DOM)
 *   §4  the red twin: per route × shape, green-AND-measured, `expect` on ✗ lines only; every case's route, shape and words
 *   §5  the drive's wiring: the rules are what it runs, the sign-in builds the receipts book, a skipped surface exits 3
 * The mutation proof (each defect planted on disk, this suite failing on its check, every file restored byte-identical)
 * is the scratchpad's `r5f/mutate.mjs`; its result is in R5-F's report.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";
import {
  BOOK_PROBE, CONTROL_PROBE, MIN_TRAVEL, REACH, STICK_AFTER_PROBE, STICK_PROBE,
  failLines, findOverlaps, judgeMissingRail, judgeStick, notMeasuredLines, overlapLine, planStick,
} from "./live/bar-geometry-rules.mjs";
import { MUTATIONS } from "./anchors/bar-geometry.anchors.mjs";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const code = (p: string) => decomment(raw(p));

const DRIVE = "scripts/live/bar-geometry-drive.mjs";
const RULES = "scripts/live/bar-geometry-rules.mjs";
const TWIN = "scripts/red-bar-geometry.mjs";

/** The drive's SURFACES, evaluated from its own source (the drive launches a browser on import, so it is read, not run). */
function driveSurfaces(): Array<{ id: string; path: string; minControls: number; sticky?: boolean; withheld?: string }> {
  const src = code(DRIVE);
  const at = src.indexOf("const SURFACES = [");
  const end = src.indexOf("\n];", at);
  if (at < 0 || end < 0) return [];
  return new Function(`return ${src.slice(at + "const SURFACES = ".length, end + 3).replace(/;\s*$/, "")}`)();
}

/* ── a fake DOM, just large enough for the probes ─────────────────────────────────────────────────────────────── */
type Style = Record<string, string>;
const STYLE_DEFAULTS: Style = {
  position: "static", overflowX: "visible", overflowY: "visible", display: "block", visibility: "visible",
  transform: "none", filter: "none", perspective: "none", contain: "none", top: "auto",
  marginBottom: "0px", paddingBottom: "0px", borderBottomWidth: "0px",
};
class El {
  tagName: string; parentElement: El | null = null; kids: El[] = []; style: Style; attrs: Record<string, string>;
  textContent: string; className: string; open = true; clientLeft = 0; clientTop = 0;
  x: number; y: number; w: number; h: number; scrollW: number;
  constructor(tag: string, box: [number, number, number, number], style: Style = {}, o: { text?: string; cls?: string; attrs?: Record<string, string>; scrollW?: number; open?: boolean } = {}) {
    this.tagName = tag.toUpperCase(); [this.x, this.y, this.w, this.h] = box; this.style = style;
    this.textContent = o.text ?? ""; this.className = o.cls ?? ""; this.attrs = o.attrs ?? {}; this.scrollW = o.scrollW ?? box[2];
    if (o.open === false) this.open = false;
  }
  add(...k: El[]) { for (const c of k) { c.parentElement = this; this.kids.push(c); } return this; }
  get clientWidth() { return this.w; } get clientHeight() { return this.h; } get scrollWidth() { return this.scrollW; }
  getBoundingClientRect() { return { x: this.x, y: this.y, left: this.x, top: this.y, width: this.w, height: this.h, right: this.x + this.w, bottom: this.y + this.h }; }
  contains(o: El) { for (let n: El | null = o; n; n = n.parentElement) if (n === this) return true; return false; }
  all(): El[] { return this.kids.flatMap((k) => [k, ...k.all()]); }
}
function installDom(html: El, body: El, scroll = { scrollY: 0, innerHeight: 1000, scrollHeight: 2000 }) {
  const g = globalThis as Record<string, unknown>;
  g.getComputedStyle = (e: El) => ({ ...STYLE_DEFAULTS, ...e.style });
  const pick = (sel: string) => {
    if (sel === "body *") return body.all();
    const attrs = sel.split(",").map((s) => s.trim().replace(/^\[|\]$/g, ""));
    return html.all().filter((e) => attrs.some((a) => a in e.attrs));
  };
  Object.defineProperty(html, "scrollHeight", { value: scroll.scrollHeight, configurable: true });
  g.document = { documentElement: html, querySelector: (s: string) => pick(s)[0] ?? null, querySelectorAll: (s: string) => pick(s) };
  g.window = { scrollY: scroll.scrollY, innerHeight: scroll.innerHeight };
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · no bar on the page — a defect, a page with nothing to filter, or a stale route");
{
  const surface = { id: "/proposals" };
  const withRows = judgeMissingRail({ rows: 12, emptyStates: 0 }, surface);
  ok("1.1 · ⛔ rows and no bar FAILS, in the words every reader greps for", withRows.kind === "fail" && withRows.why.startsWith("NO [data-filter-rail]"), JSON.stringify(withRows));
  const empty = judgeMissingRail({ rows: 0, emptyStates: 1 }, surface);
  ok("1.2 · no rows + its empty state is NOT MEASURED (§A5 withholds the bar), never a pass, and it SKIPS the surface",
    empty.kind === "not-measured" && empty.skips === true && empty.why.includes("BAR NOT MEASURED") && empty.why.includes("fixture:player"), JSON.stringify(empty));
  const bare = judgeMissingRail({ rows: 0, emptyStates: 0 }, surface);
  ok("1.3 · no rows and no empty state (a COMING_SOON board) is NOT MEASURED too, and skips", bare.kind === "not-measured" && bare.skips === true, JSON.stringify(bare));
  const held = judgeMissingRail({ rows: 0, emptyStates: 0 }, { id: "/positions/performance", withheld: "two products" });
  ok("1.4 · a surface that DECLARES its bar may be withheld is NOT MEASURED with its reason, and does not skip the run",
    held.kind === "not-measured" && held.skips === false && held.why.includes("two products"), JSON.stringify(held));
  const heldRows = judgeMissingRail({ rows: 3, emptyStates: 0 }, { id: "/x", withheld: "reason" });
  ok("1.5 · …but a declaration never excuses rows without a bar", heldRows.kind === "fail");

  // The route list must match the app as it is: every STICKY query bar (`data-filter-rail className={QUERY_BAR_CLASS}`)
  // is a surface of the drive, and every surface the drive declares sticky still has one.
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p); } };
  walk("src");
  const sticky = files.filter((f) => /data-filter-rail className=\{QUERY_BAR_CLASS\}/.test(code(f)));
  const routeOf = (f: string) => {
    const rel = relative("src", f).replace(/\\/g, "/");
    if (rel === "components/markets/discovery-bar.tsx") return "/markets";
    const m = rel.match(/^app\/(.+)\/[^/]+\.tsx$/);
    return m ? `/${m[1]}` : `?${rel}`;
  };
  const stickyRoutes = new Map(sticky.map((f) => [routeOf(f), f.replace(/\\/g, "/")]));
  /** ⛔ The one deliberate absence, with its reason — the same reason `count-truth-drive.mjs` records for all four drives. */
  const EXCLUDED: Record<string, string> = { "/profile/invite": "the agent recruit book renders only for an approved agent; /auth/demo mints a player" };
  const surfaces = driveSurfaces();
  const ids = new Set(surfaces.map((s) => s.id));
  ok("1.6 · fixture · the drive's SURFACES evaluate, and the census finds the sticky bars", surfaces.length >= 12 && stickyRoutes.size >= 12, `${surfaces.length} surfaces · ${stickyRoutes.size} sticky bars`);
  const missing = [...stickyRoutes.keys()].filter((r) => !ids.has(r) && !(r in EXCLUDED));
  ok("1.7 · every sticky query bar in the app is a surface of the drive (or a named exclusion)", missing.length === 0,
    missing.map((r) => `${r} (${stickyRoutes.get(r)})`).join(", "));
  ok("1.8 · …including /wallet/receipts, the one that shipped (2026-10-07, 012cccbc9) after the list was last edited", ids.has("/wallet/receipts"));
  const stale = surfaces.filter((s) => s.sticky !== false && !stickyRoutes.has(s.id)).map((s) => s.id);
  ok("1.9 · ⛔ no surface the drive asserts a stick on has lost its sticky bar (a stale route)", stale.length === 0, stale.join(", "));
  const panel = code("src/app/profile/account/account-bar.tsx");
  const board = code("src/app/leaderboard/page.tsx");
  ok("1.10 · the two `sticky: false` declarations are true: /profile/account takes QUERY_BAR_CLASS_PANEL, /leaderboard no bar class",
    surfaces.filter((s) => s.sticky === false).map((s) => s.id).sort().join(",") === "/leaderboard,/profile/account"
      && /data-filter-rail className=\{QUERY_BAR_CLASS_PANEL\}/.test(panel) && !/QUERY_BAR_CLASS\b/.test(board));
  ok("1.11 · only /positions/performance declares a withheld bar, and its page still withholds it for one product",
    surfaces.filter((s) => s.withheld).map((s) => s.id).join(",") === "/positions/performance"
      && /settledAll\.length > 0 && lenses\.length > 2 && \(/.test(code("src/app/positions/performance/page.tsx")));
  const receipts = surfaces.find((s) => s.id === "/wallet/receipts");
  const rb = code("src/app/wallet/receipts/receipts-bar.tsx");
  ok("1.12 · /wallet/receipts' floor is the data-independent count: 3 lenses + 5 states + 5 windows, every one a FilterPill link",
    receipts?.minControls === 13 && /RECEIPT_LENSES\.map/.test(rb) && /RECEIPT_STATES\.map[\s\S]*RECEIPT_STATES\.map/.test(rb) && /RECEIPT_WHEN_IDS\.map[\s\S]*RECEIPT_WHEN_IDS\.map/.test(rb)
      && /export const RECEIPT_LENSES = \["all", "in", "out"\]/.test(code("src/lib/wallet/receipts.ts"))
      && /export const LEDGER_STATES = \["any", "flight", "confirmed", "failed", "reversed"\]/.test(code("src/lib/wallet/ledger.ts"))
      && /export const PLAYER_PRESETS = \["today", "yesterday", "7d", "30d", "all"\]/.test(code("src/lib/query/windows.ts")));
}

section("§2 · overlap over PAINTED boxes — what a person can see, and only that");
{
  /** One logged /markets row at 360: the strip's chips, the sort summary, the direction button, the Filters trigger. */
  type Box = { text: string; x: number; w: number };
  const ROWS: Record<string, { strip: number; chips: Box[]; summary: Box; dir: Box; filters: Box; logged: number[] }> = {
    // `S/runs/wbm-bar.log` (main a6331ca1) — identical on the tip (`wm15-bar.log`) and at 90cb52ea (`wm11-bar.log`).
    sw: { strip: 176, chips: [{ text: "chip0", x: 16, w: 79 }, { text: "Zinafunga leo0", x: 99, w: 135 }, { text: "Mpya0", x: 238, w: 83 }, { text: "Inasubiri matokeo0", x: 326, w: 160 }],
      summary: { text: "PangaPesa nyingi", x: 182, w: 67 }, dir: { text: "↑", x: 249, w: 44 }, filters: { text: "Vichujio", x: 299, w: 45 }, logged: [52, 11, 44, 22, 18] },
    en: { strip: 182, chips: [{ text: "chip0", x: 16, w: 82 }, { text: "Closing today0", x: 102, w: 135 }, { text: "New0", x: 241, w: 77 }, { text: "In progress0", x: 322, w: 119 }],
      summary: { text: "SortBiggest pool", x: 188, w: 61 }, dir: { text: "↑", x: 249, w: 44 }, filters: { text: "Filters", x: 299, w: 45 }, logged: [49, 8, 44, 19, 22] },
    zh: { strip: 189, chips: [{ text: "chip0", x: 16, w: 90 }, { text: "chip1", x: 110, w: 85 }, { text: "新增0", x: 199, w: 75 }, { text: "等待结果0", x: 278, w: 101 }],
      summary: { text: "排序奖池最大", x: 195, w: 54 }, dir: { text: "↑", x: 249, w: 44 }, filters: { text: "筛选", x: 299, w: 45 }, logged: [50, 25, 15, 45] },
  };
  const Y = 70, H = 44;
  for (const [loc, row] of Object.entries(ROWS)) {
    // The DOM as U4 lays it out below 640: body clips sideways; the bar is a grid; its rows are `display: contents`; the
    // strip (`overflow-x: auto` → `overflow-y` computes to auto) carries 12px of padding/negative margin (round 3, [319]).
    const html = new El("html", [0, 0, 360, 900]);
    const body = new El("body", [0, 0, 360, 900], { overflowX: "clip" });
    const bar = new El("div", [0, 56, 360, 120], { display: "grid", position: "sticky", top: "56px" }, { attrs: { "data-filter-rail": "" } });
    const row1 = new El("div", [0, 0, 0, 0], { display: "contents" });
    const row2 = new El("div", [0, 0, 0, 0], { display: "contents", overflowX: "hidden" }); // ⛔ a contents box clips nothing, whatever it says
    const strip = new El("nav", [4, Y - 12, row.strip - 4, H + 24], { overflowX: "auto", overflowY: "auto", display: "flex" }, { scrollW: 600 });
    const chips = row.chips.map((c) => new El("a", [c.x, Y, c.w, H], {}, { text: c.text }));
    const cell = new El("div", [row.summary.x, Y, row.dir.x + row.dir.w - row.summary.x, H], { display: "flex" });
    const details = new El("details", [row.summary.x, Y, row.summary.w, H]);
    const summary = new El("summary", [row.summary.x, Y, row.summary.w, H], {}, { text: row.summary.text });
    const dir = new El("a", [row.dir.x, Y, row.dir.w, H], {}, { text: row.dir.text });
    const sheet = new El("details", [row.filters.x, Y, row.filters.w, H], {}, { open: false });
    const trigger = new El("summary", [row.filters.x, Y, row.filters.w, H], {}, { text: row.filters.text });
    html.add(body.add(bar.add(row1.add(strip.add(...chips)), row2.add(cell.add(details.add(summary), dir), sheet.add(trigger)))));
    installDom(html, body);
    const controls = (CONTROL_PROBE as (els: El[]) => Array<{ text: string; x: number; w: number; seen: { x: number; w: number } | null; vis: boolean; inClosed: boolean; scrolls: boolean }>)(
      [...chips, summary, dir, trigger]);
    const vis = controls.filter((c) => c.vis && !c.inClosed);
    // The old instrument: painted = layout. It must reproduce exactly what the failing run logged.
    const asBefore = findOverlaps(vis.map((c) => ({ ...c, seen: { x: c.x, y: Y, w: c.w, h: H } })));
    ok(`2.${loc}.1 · the logged run is reproduced: the LAYOUT boxes give exactly the ${row.logged.length} overlaps wbm-bar.log printed (${row.logged.join(", ")}px)`,
      asBefore.map((o) => o.hOv).join(",") === row.logged.join(","), asBefore.map((o) => `${o.hOv} ${o.a.text}/${o.b.text}`).join(" · "));
    const now = findOverlaps(vis);
    ok(`2.${loc}.2 · ⭐ over PAINTED boxes there are none: the strip clips its chips at x${row.strip}, before the sort cell at x${row.summary.x}`,
      now.length === 0, now.map(overlapLine).join(" · "));
    // ⛔ …and not because the controls vanished: the sort, the arrow and the trigger are painted whole (the `display:
    //    contents` row that says `overflow-x: hidden` generates no box and clips nothing).
    const whole = [summary, dir, trigger].map((e) => controls[[...chips, summary, dir, trigger].indexOf(e)]);
    ok(`2.${loc}.2b · the controls beside the strip are painted whole, so "none" is a measurement, not an absence`,
      whole.every((c) => c.seen !== null && c.seen.x === c.x && c.seen.w === c.w), JSON.stringify(whole.map((c) => c.seen)));
    const cut = controls.find((c) => c.text === row.chips[2].text)!;
    ok(`2.${loc}.3 · the probe's walk: a chip past the strip's edge has nothing painted; one straddling it is cut at the edge`,
      cut.seen === null && (loc !== "sw" || controls[1].seen?.x === 99 && controls[1].seen.x + controls[1].seen.w === row.strip), JSON.stringify(controls.map((c) => c.seen)));
    ok(`2.${loc}.4 · exemption 2 still holds for the CLIPPED assertion: every chip lives in a strip that scrolls`, controls.slice(0, row.chips.length).every((c) => c.scrolls));
    ok(`2.${loc}.5 · exemption 1 still holds: the Filters <summary> of a SHUT sheet is measured (its own disclosure is not "inside" it)`,
      controls[controls.length - 1].inClosed === false);
  }

  // ⛔ THE DEFECT THE DRIVE WAS BUILT FOR STAYS RED — a two-row bar, nothing between the summary and body clips it.
  {
    const html = new El("html", [0, 0, 360, 900]);
    const body = new El("body", [0, 0, 360, 900], { overflowX: "clip" });
    const row2 = new El("div", [16, 120, 328, 44], { display: "flex" });
    const cell = new El("div", [16, 120, 182, 44], { display: "flex" });
    const details = new El("details", [16, 120, 138, 44]);
    const summary = new El("summary", [16, 120, 190, 44], {}, { text: "PangaYaliyoongezwa karibu" }); // unbound: its max-content
    const dir = new El("a", [154, 120, 44, 44], {}, { text: "↑" });
    const trigger = new El("summary", [210, 120, 134, 44], {}, { text: "Vichujio" });
    html.add(body.add(row2.add(cell.add(details.add(summary), dir), new El("details", [210, 120, 134, 44], {}, { open: false }).add(trigger))));
    installDom(html, body);
    const controls = (CONTROL_PROBE as (els: El[]) => never[])([summary, dir, trigger]);
    const o = findOverlaps(controls);
    ok("2.6 · ⛔ PLANT · the summary run across the direction button (16→206 vs 154→198) is still a 44px OVERLAP",
      o.length === 1 && o[0].hOv === 44 && overlapLine(o[0]).startsWith("OVERLAP 44px"), o.map(overlapLine).join(" · "));
    // …and the 2026-09-08 shipped numbers, straight through the judgement.
    const shipped = findOverlaps([
      { text: "summary", x: 16, w: 239, seen: { x: 16, y: 0, w: 239, h: 44 } },
      { text: "↑", x: 154, w: 44, seen: { x: 154, y: 0, w: 44, h: 44 } },
    ]);
    ok("2.7 · ⛔ PLANT · the shipped defect (sw summary 16→255 · button 154→198) is a 44px OVERLAP", shipped.length === 1 && shipped[0].hOv === 44);
  }

  // The walk follows the containing-block chain and paints only what each box's clip lets through.
  {
    const html = new El("html", [0, 0, 1280, 1000]);
    const body = new El("body", [0, 0, 1280, 1000]);
    const posd = new El("div", [0, 0, 1280, 400], { position: "relative" });
    const hider = new El("div", [100, 100, 100, 100], { overflowX: "hidden", overflowY: "hidden" });
    const absA = new El("a", [150, 120, 200, 44], { position: "absolute" }, { text: "abs" });
    const inFlow = new El("a", [150, 120, 200, 44], {}, { text: "flow" });
    const fixedA = new El("a", [150, 120, 200, 44], { position: "fixed" }, { text: "fixed" });
    const yOnly = new El("div", [0, 300, 1280, 20], { overflowY: "hidden" });
    const tall = new El("a", [10, 290, 2000, 44], {}, { text: "tall" });
    const contained = new El("div", [500, 500, 50, 50], { contain: "paint" });
    const big = new El("a", [480, 480, 200, 200], {}, { text: "contain" });
    const inline = new El("span", [600, 600, 10, 10], { display: "inline", overflowX: "hidden" });
    const inl = new El("a", [600, 600, 100, 44], {}, { text: "inline" });
    html.add(body.add(posd.add(hider.add(absA, inFlow, fixedA)), yOnly.add(tall), contained.add(big), inline.add(inl)));
    installDom(html, body);
    const [a, f, x, t, c, i] = (CONTROL_PROBE as (els: El[]) => Array<{ seen: { x: number; y: number; w: number; h: number } | null }>)([absA, inFlow, fixedA, tall, big, inl]).map((r) => r.seen);
    ok("2.8 · an in-flow control is cut by its overflow-hidden ancestor (150→200 of 150→350)", f?.x === 150 && f.w === 50 && f.h === 44, JSON.stringify(f));
    ok("2.9 · an ABSOLUTE control escapes a non-positioned clipper below its containing block", a?.w === 200, JSON.stringify(a));
    ok("2.10 · a FIXED control escapes every ancestor's clip", x?.w === 200, JSON.stringify(x));
    ok("2.11 · `overflow-y` alone cuts only the vertical span", t?.w === 2000 && t.y === 300 && t.h === 20, JSON.stringify(t));
    ok("2.12 · `contain: paint` cuts both", c?.x === 500 && c.w === 50 && c.h === 50, JSON.stringify(c));
    ok("2.13 · an INLINE ancestor clips nothing, whatever its overflow says", i?.w === 100, JSON.stringify(i));
  }
}

section("§3 · the stick, measured inside its own range");
{
  /**
   * The 18 rows `S/stick-probe.mjs` measured after `scrollTo(0, 1200)` at 1280×900 (`S/runs/wm16e-stick-tip.log`,
   * `wm16e-stick-main.log`): every page clamped at 559/559. [route, natural top, bar top @559, bar h, parent bottom
   * @559, parent's bottom padding ("room below bar in parent")].
   */
  const RUNS: Record<string, Array<[string, number, number, number, number, number]>> = {
    tip: [
      ["sw /results", 210, -27, 176, 149, 0], ["sw /notifications", 321, 12, 120, 164, 32], ["sw /markets", 194, -104, 176, 104, 32],
      ["en /results", 210, -27, 176, 149, 0], ["en /notifications", 321, 12, 120, 164, 32], ["en /markets", 194, -104, 176, 104, 32],
      ["zh /results", 210, -49, 176, 127, 0], ["zh /notifications", 321, -10, 120, 142, 32], ["zh /markets", 194, -125, 120, 27, 32],
    ],
    main: [
      ["sw /results", 245, 22, 172, 194, 0], ["sw /notifications", 336, 27, 116, 175, 32], ["sw /markets", 194, -98, 172, 106, 32],
      ["en /results", 245, 22, 172, 194, 0], ["en /notifications", 336, 27, 116, 175, 32], ["en /markets", 194, -98, 172, 106, 32],
      ["zh /results", 245, 0, 172, 172, 0], ["zh /notifications", 336, 5, 116, 153, 32], ["zh /markets", 194, -119, 116, 29, 32],
    ],
  };
  const MAX = 559, OFFSET = 56;
  /** Where a sticky box sits after a scroll (CSS Positioned Layout 3): its offset, unless its parent's end pushes it up. */
  const stuckTop = (natural: number, h: number, cbBottom: number, y: number) =>
    natural - y >= OFFSET ? natural - y : Math.min(OFFSET, cbBottom - h - y);
  for (const [tree, rows] of Object.entries(RUNS)) {
    let reproduced = 0, measured = 0, onOffset = 0, worst = Infinity;
    const off: string[] = [];
    for (const [name, natural, topAt559, h, parentBottom, pad] of rows) {
      const cbBottom = parentBottom + MAX - pad;
      if (stuckTop(natural, h, cbBottom, MAX) === topAt559) reproduced++; else off.push(`${name} model ${stuckTop(natural, h, cbBottom, MAX)} vs logged ${topAt559}`);
      const g = { position: "sticky", offset: OFFSET, docTop: natural, h, mb: 0, cbBottom, cb: "div", rowsBelow: 0, maxScroll: MAX };
      const plan = planStick(g);
      if (plan.kind === "measure") {
        measured++; worst = Math.min(worst, plan.travel);
        const top = stuckTop(natural, h, cbBottom, plan.y);
        const v = judgeStick(g, plan, { scrollY: plan.y, top, hits: [] });
        if (top === OFFSET && v.problems.length === 0 && !v.notMeasured) onOffset++; else off.push(`${name} at ${plan.y}: top ${top}`);
      } else off.push(`${name}: ${plan.kind} ${"why" in plan ? plan.why : ""}`);
    }
    ok(`3.${tree}.1 · the logged run is reproduced: at the page's end (559) each bar sits where its PARENT's end pushed it — ${rows.length}/${rows.length} logged tops`,
      reproduced === rows.length, off.join(" · "));
    ok(`3.${tree}.2 · ⭐ where the drive now scrolls (inside each bar's range, ≥ ${MIN_TRAVEL}px past its place) all ${rows.length} are MEASURED and on their offset`,
      measured === rows.length && onOffset === rows.length, `${measured} measured, ${onOffset} on offset, shortest travel ${worst}px · ${off.join(" · ")}`);
  }
  const g0 = { position: "sticky", offset: 56, docTop: 194, h: 176, mb: 0, cbBottom: 631, cb: "div", rowsBelow: 0, maxScroll: 559 };
  const p0 = planStick(g0);
  ok("3.1 · /markets tip sw: the drive scrolls to 398 (one pixel before its release at 399), 260px of travel — not to 1200",
    p0.kind === "measure" && p0.y === 398 && p0.travel === 260, JSON.stringify(p0));
  const long = planStick({ ...g0, cbBottom: 6000, maxScroll: 5000 });
  ok(`3.2 · on a long page it still scrolls ${REACH}px past the bar's place, as the old drive did`, long.kind === "measure" && long.travel === REACH, JSON.stringify(long));
  const thin = planStick({ ...g0, cbBottom: 420, maxScroll: 559 });
  ok("3.3 · a parent that ends before the bar can travel 200px, with no row below it, is STICK NOT MEASURED — not a pass, not a fail",
    thin.kind === "not-measured" && thin.why.includes("STICK NOT MEASURED"), JSON.stringify(thin));
  const flat = planStick({ ...g0, maxScroll: 120 });
  ok("3.4 · a page that cannot scroll is STICK NOT MEASURED (rule ①)", flat.kind === "not-measured" && flat.why.includes("scrolls only 120px"), JSON.stringify(flat));
  // ⛔ PLANTS — every defect assertion 4 exists for stays red.
  const wrapper = planStick({ ...g0, cbBottom: 194 + 247, rowsBelow: 400 });
  ok("3.5 · ⛔ PLANT · /updown/history's 247px wrapper (rows run on below the bar's parent) FAILS — whatever the page's length",
    wrapper.kind === "fail" && wrapper.why.startsWith("THE BAR DID NOT STICK") && wrapper.why.includes("400 row(s)"), JSON.stringify(wrapper));
  const wrapperLong = planStick({ ...g0, cbBottom: 6000, maxScroll: 5000, rowsBelow: 3 });
  ok("3.6 · ⛔ …even when the parent is long enough to pass the travel test (the rows below it are the defect)", wrapperLong.kind === "fail");
  const relG = { ...g0, position: "relative", offset: null };
  const relPlan = planStick(relG);
  const rel = relPlan.kind === "measure" ? judgeStick(relG, relPlan, { scrollY: relPlan.y, top: 194 - relPlan.y, hits: [] }) : null;
  ok("3.7 · ⛔ PLANT (red:bar-geometry `bar-is-not-sticky`) · a bar that is position: relative is measured and FAILS in its arm's words",
    relPlan.kind === "measure" && relPlan.y === 559 && rel !== null && rel.problems.length === 1 && rel.problems[0].startsWith("THE BAR DID NOT STICK — it is position: relative"),
    JSON.stringify(rel));
  const band = judgeStick(g0, p0 as never, { scrollY: 398, top: 56, hits: ["div.sticky.top-[56px] by 79px"] });
  ok("3.8 · ⛔ PLANT (`search-band-shares-the-bar-offset`) · a band stuck at the bar's offset is ANOTHER STICKY SURFACE",
    band.problems.length === 1 && band.problems[0].startsWith("ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR — div.sticky.top-[56px] by 79px"), JSON.stringify(band));
  const offIt = judgeStick(g0, p0 as never, { scrollY: 398, top: -150, hits: [] });
  ok("3.9 · ⛔ PLANT · a sticky bar that is NOT on its offset inside its own range FAILS", offIt.problems.length === 1 && offIt.problems[0].includes("instead of its own offset 56"), JSON.stringify(offIt));
  const nudge = judgeStick(g0, p0 as never, { scrollY: 398, top: 57.5, hits: [] });
  ok("3.10 · a stuck bar within 2px of its offset passes (sub-pixel layout, nothing more)", nudge.problems.length === 0);
  const landed = judgeStick(g0, p0 as never, { scrollY: 200, top: 56, hits: [] });
  ok("3.11 · a scroll that lands short of 200px of travel is NOT MEASURED, never read as a pass", landed.problems.length === 0 && !!landed.notMeasured, JSON.stringify(landed));

  // The probes themselves, on a fake page: a sticky bar, its padded parent, rows inside and outside it, the header.
  {
    const html = new El("html", [0, 0, 1280, 1000]);
    const body = new El("body", [0, 0, 1280, 1459]);
    const header = new El("header", [0, 0, 1280, 56], { position: "sticky", top: "0px" }, { cls: "sticky top-0 z-40" });
    const contentsWrap = new El("div", [0, 0, 0, 0], { display: "contents" });
    const parent = new El("div", [104, 56, 1072, 607], { paddingBottom: "32px" }, { cls: "mx-auto w-full max-w-board px-3" });
    const bar = new El("div", [104, 194, 1072, 176], { position: "sticky", top: "56px" }, { attrs: { "data-filter-rail": "" } });
    const rowIn = new El("article", [104, 400, 300, 200], {}, { attrs: { "data-row-id": "m1" } });
    const rowOut = new El("article", [104, 700, 300, 200], {}, { attrs: { "data-row-id": "m2" } });
    const empty = new El("div", [104, 400, 300, 100], {}, { attrs: { "data-empty-state": "boxed" } });
    html.add(body.add(header, parent.add(contentsWrap.add(bar), rowIn, empty), rowOut));
    installDom(html, body, { scrollY: 0, innerHeight: 900, scrollHeight: 1459 });
    const g = (STICK_PROBE as () => Record<string, unknown>)();
    ok("3.12 · STICK_PROBE: the bar's own position and offset, its place, and its CONTAINING block's content bottom (padding off, `display: contents` skipped)",
      g.position === "sticky" && g.offset === 56 && g.docTop === 194 && g.h === 176 && g.cbBottom === 631 && String(g.cb).startsWith("div.mx-auto") && g.maxScroll === 559,
      JSON.stringify(g));
    ok("3.13 · STICK_PROBE counts the rows BELOW the parent's end and outside it — one here", g.rowsBelow === 1, JSON.stringify(g));
    const book = (BOOK_PROBE as () => { rows: number; emptyStates: number })();
    ok("3.14 · BOOK_PROBE counts rows and empty states", book.rows === 2 && book.emptyStates === 1, JSON.stringify(book));
    // After a scroll that leaves the bar stuck at 56: the header ends where the bar begins — touching is not drawing through.
    bar.y = 56; installDom(html, body, { scrollY: 398, innerHeight: 900, scrollHeight: 1459 });
    const after = (STICK_AFTER_PROBE as () => { scrollY: number; top: number; hits: string[] })();
    ok("3.15 · STICK_AFTER_PROBE: a stuck bar at 56 under a 56px header has NO hit (they touch, they do not overlap)",
      after.top === 56 && after.scrollY === 398 && after.hits.length === 0, JSON.stringify(after));
    const bandEl = new El("div", [104, 56, 1072, 79], { position: "sticky", top: "56px" }, { cls: "sticky top-[56px] z-20 kp-search-band" });
    const pip = new El("div", [1200, 60, 20, 20], { position: "fixed" });
    parent.add(bandEl, pip); installDom(html, body, { scrollY: 398, innerHeight: 900, scrollHeight: 1459 });
    const hit = (STICK_AFTER_PROBE as () => { hits: string[] })();
    ok("3.16 · ⛔ PLANT · …and a band stuck at the same offset IS a hit, while a 20px pip is not a band",
      hit.hits.length === 1 && hit.hits[0] === "div.sticky.top-[56px] by 79px", JSON.stringify(hit.hits));
    bar.y = -104; installDom(html, body, { scrollY: 559, innerHeight: 900, scrollHeight: 1459 });
    const pushed = (STICK_AFTER_PROBE as () => { hits: string[] })();
    ok("3.17 · the logged 'header drawn through the bar' is the bar PUSHED under it at the page's end (the old scroll), not a shared offset",
      pushed.hits.includes("header.sticky.top-0 by 56px"), JSON.stringify(pushed.hits));
  }
}

section("§4 · the red twin — per route × shape, green AND measured, `expect` on the failure lines");
{
  const twin = code(TWIN);
  const shapeKeys = [...twin.matchAll(/^\s*"([a-z-]+)": \{ widths: "(\d+)", locales: "(\w+)" \}/gm)].map((m) => ({ name: m[1], widths: m[2], locales: m[3] }));
  const shape = new Map(shapeKeys.map((s) => [s.name, s]));
  ok("4.1 · every declared case has a CHOSEN shape (width and locale), never a default", MUTATIONS.every((c: { name: string }) => shape.has(c.name)),
    MUTATIONS.filter((c: { name: string }) => !shape.has(c.name)).map((c: { name: string }) => c.name).join(", "));
  ok("4.2 · ⛔ the precondition and the after-check run per route × WIDTH × LOCALE (`proofs`), not per route",
    /const keyOf = \(c\) => `\$\{c\.route\} @ \$\{shapeOf\(c\)\.widths/.test(twin) && /for \(const c of proofs\) \{\s*const b = baseline\(c\)/.test(twin)
      && /for \(const c of proofs\) \{\s*if \(!baseline\(c\)\.ok\)/.test(twin) && !/routesUnderProof/.test(twin));
  ok("4.3 · ⛔ 'green' is exit 0 AND no NOT MEASURED line for the route", /ok: b\.code === 0 && unposed\.length === 0/.test(twin) && /notMeasuredLines\(b\.out, c\.route\)/.test(twin));
  ok("4.4 · ⛔ `expect` is matched on the ✗ lines only", /failLines\(r\.out\)\.some\(\(l\) => l\.includes\(c\.expect\)\)/.test(twin) && !/r\.out\.includes\(c\.expect\)/.test(twin));
  const out = [
    "  🔶 /markets sw 1280: STICK NOT MEASURED — the page scrolls only 120px; a stick needs 200px to prove.",
    "🔴 problems:",
    "  ✗ /markets sw 1280: ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR — header.sticky.top-0 by 56px. Two sticky surfaces cannot share one offset.",
    "   /positions/performance sw 1280: BAR NOT MEASURED — no bar and no row: two products",
  ].join("\n");
  ok("4.5 · failLines keeps the ✗ lines and nothing else", failLines(out).length === 1 && failLines(out)[0].startsWith("✗ /markets"));
  ok("4.6 · ⛔ CONTROL · the old expect \"stick\" is satisfied by the OTHER arm's line — why it changed", failLines(out).some((l) => l.includes("stick")));
  ok("4.7 · …and the arm's own words are not", !failLines(out).some((l) => l.includes("THE BAR DID NOT STICK")));
  ok("4.8 · notMeasuredLines finds the route's own lines, and `/positions` is not `/positions/performance`",
    notMeasuredLines(out, "/markets").length === 1 && notMeasuredLines(out, "/positions").length === 0 && notMeasuredLines(out, "/positions/performance").length === 1);
  const byName = new Map(MUTATIONS.map((c: { name: string }) => [c.name, c]));
  const notSticky = byName.get("bar-is-not-sticky") as { expect: string; route: string };
  ok("4.9 · `bar-is-not-sticky` expects its own arm's words", notSticky?.expect === "THE BAR DID NOT STICK");
  const unbound = byName.get("sort-summary-unbound") as { route: string };
  ok("4.10 · `sort-summary-unbound` is proved on /watchlist at 360/sw (U4 made /markets' phone sort column content-sized)",
    unbound?.route === "/watchlist" && shape.get("sort-summary-unbound")?.widths === "360" && shape.get("sort-summary-unbound")?.locales === "sw");
  const wl = code("src/app/watchlist/watchlist-bar.tsx");
  ok("4.11 · /watchlist is a TWO-ROW bar (no `data-bar-row`), sort + Filters in row 2, and `starred` is its default sort",
    !/data-bar-row/.test(wl) && /<QuerySort[\s\S]*<FilterSheet/.test(wl) && /sort: "starred" as FollowSortId/.test(code("src/lib/watchlist/following.ts")));
  const surfaces = driveSurfaces();
  const ids = new Map(surfaces.map((s) => [s.id, s]));
  const words = code(RULES) + code(DRIVE);
  for (const c of MUTATIONS as Array<{ name: string; route: string; expect: string }>) {
    const s = ids.get(c.route);
    const stickArm = /STICK|STICKY/.test(c.expect);
    ok(`4.12.${c.name} · its route is a surface of the drive, its words are words the drive prints${stickArm ? ", and a stick arm is proved at 1280 on a sticky surface" : ""}`,
      !!s && words.includes(c.expect) && (!stickArm || (shape.get(c.name)?.widths === "1280" && s.sticky !== false)), `${c.route} · "${c.expect}"`);
  }
}

section("§5 · the drive runs the rules, builds its receipts book, and refuses a skipped run");
{
  const drive = code(DRIVE);
  ok("5.1 · the overlap is `findOverlaps` over `CONTROL_PROBE` — no layout-box loop left in the drive",
    /\$\$eval\(\s*"\[data-filter-rail\] a, \[data-filter-rail\] button, \[data-filter-rail\] summary",\s*CONTROL_PROBE,?\s*\)/.test(drive)
      && /for \(const o of findOverlaps\(vis\)\)/.test(drive) && !/const vOv =/.test(drive));
  ok("5.2 · ⛔ the stick is `planStick` + `judgeStick` — no fixed `scrollTo(0, 1200)` left", /planStick\(g\)/.test(drive) && /judgeStick\(g, plan,/.test(drive) && !/scrollTo\(0, 1200\)/.test(drive));
  ok("5.3 · a page without a bar goes through `judgeMissingRail`", /judgeMissingRail\(await page\.evaluate\(BOOK_PROBE\), s\)/.test(drive));
  ok("5.4 · the sign-in builds the receipts book, and the demo route still honours it",
    /\/auth\/demo\?receipts=1/.test(drive) && /searchParams\.get\("receipts"\) === "1"\) await ensureDemoReceipts/.test(code("src/app/auth/demo/route.ts")));
  ok("5.5 · ⛔ a declared surface measured nowhere exits 3 (a skipped run), after the failures and the zero check",
    /if \(skipped\.length\) \{ console\.error\("\\n" \+ skippedLine\); process\.exit\(3\); \}/.test(drive) && /!s\.withheld && !measuredSurfaces\.has\(s\.id\)/.test(drive));
  ok("5.6 · NOT MEASURED is printed and summarised, never folded into `measured`",
    /const notMeasure = \(tag, why\) => \{/.test(drive) && /notMeasured\.forEach/.test(drive));
}

console.log(`\n${pass} passed · ${fails.length} failed`);
if (fails.length) { console.error("\nFAILED:"); fails.forEach((f) => console.error("  ✗ " + f)); process.exit(1); }
