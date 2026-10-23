/**
 * test:nav-tabs-alike — EVERY NAV TAB ALIKE: NO PRODUCT-LINE DOT, NO DESTINATION'S OWN INK (owner ruling, 2026-10-23).
 *
 *   npx tsx scripts/nav-tabs-alike.test.mts               (npm run test:nav-tabs-alike)
 *   npx tsx scripts/nav-tabs-alike.test.mts --prove-red   (npm run red:nav-tabs-alike — every defect below planted IN MEMORY)
 *
 * Ali, 2026-10-23, on players reading Up & Down's gold dot as a notification: "people are misunderstanding and thinking
 * there is a certain notification there" … "please remove the golden dot, make it like other tabs please, cleanly,
 * perfect … make it everywhere needed"; asked which change he wanted, he chose "Remove Up & Down's dot". The rule is
 * DESIGN_AUTHORITY §K 3, "Every nav tab alike"; the ruling is docs/COMPLIANCE-DECISIONS.md, "2026-10-23 · Up & Down
 * loses its golden dot".
 *
 * The four bars of destinations are drawn for real — the classic phone rail (`BottomNav`) and desktop bar (`TopAppBar`),
 * the journey's rail (`JourneyTabs`) and desktop bar (`JourneyTopBar`) — server-rendered inside the app's own providers,
 * for a guest and a player, with Millionea's door drawn and not, in sw, en and zh, on Up & Down's page, on the reference
 * sibling's page (Markets; the journey's Maswali) and on a page that lights neither; then laid out with the real
 * stylesheet (globals.css through the repo's Tailwind config, `scripts/lib/v2a-stage.mts`) in Chromium — the rails at 360,
 * the bars at 1280.
 *
 * §0 · PREMISE — every bar is drawn, and Up & Down and its reference are destination links in it (no vacuous pass).
 * §1 · MARKUP — each destination link reduced to its SHAPE: the tags, classes and attribute values of it and every
 *      descendant, its address, its words, its lit state and its glyph's drawing set aside. Up & Down's equals the
 *      reference's (unlit on the neutral page; lit, each on its own page) and every other unlit link's on the same page.
 *      Millionea's equals it once its ONE ruled difference is set aside (`kp-millionea-ink` around its words,
 *      `kp-millionea-glyph` on its pip — §M8a item 11), and no other destination wears either class. A notification dot
 *      (`.kp-rail__badge`) is a state, allowed on the journey's Akaunti alone.
 * §2 · PAINT — read in the laid-out page: the link's own ink, weight, size, face, background, shadow, outline, radius
 *      and height; every painted box inside it and on its pseudo-elements (a background, a border, a shadow, an
 *      outline), with its size, place and paint; each glyph's ink, size and place; its words' ink and type. Up & Down's
 *      equal the reference's and every other unlit link's. ⛔ A box Up & Down paints and Markets does not is the dot.
 * §3 · THE STYLESHEET — the compiled rules: no selector names a product-line dot (`.kp-rail__dot`) or an accent marker
 *      (`[data-accent]`), and a rule that picks a destination out by its address (`[href…]` on a rail item or a desktop
 *      link — today only the Swahili rail's wrap of "Juu na Chini") sets layout alone (white-space, text-overflow,
 *      text-align), never ink, fill, border, shadow, content or type, in any state (:hover included, which §2 cannot see).
 * §4 · THE RECORD — DESIGN_AUTHORITY carries the rule and COMPLIANCE-DECISIONS the dated ruling, the Owner's words quoted.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in memory — a component compiled from edited source at
 * its real path, the stylesheet's text edited before it is compiled, a document's text — and requires the check named
 * for it to fail (in sw, a player, Millionea's door not drawn, unless the plant needs it drawn). This file makes no
 * file-system change, so `test:red-anchors` §4 counts `red:nav-tabs-alike` in the in-process class.
 */
import "next/dist/server/node-environment.js";
import { Module as NodeModule } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import postcss from "postcss";
import { Stage, stylesheet, draw, h, load, read, LOCALES, type Loc } from "./lib/v2a-stage.mts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
process.exitCode = 1; // failure is the default

/* ── the four bars ───────────────────────────────────────────────────────────────────────────────────────────────── */
type Comp = (p: Record<string, unknown>) => unknown;
const RAIL = "src/components/layout/bottom-nav.tsx";
const BAR = "src/components/layout/top-app-bar.tsx";
const JRAIL = "src/components/journey/journey-tabs.tsx";
const JBAR = "src/components/journey/journey-top-bar.tsx";

/** A module built from PLANTED source at its real path, so its own imports resolve as the real file's do. */
function fromSource<T>(rel: string, source: string): T {
  const file = join(ROOT, rel);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
  const m = new NodeModule(file) as NodeModule & { _compile: (code: string, filename: string) => void; paths: string[] };
  m.filename = file;
  m.paths = (NodeModule as unknown as { _nodeModulePaths: (d: string) => string[] })._nodeModulePaths(join(file, ".."));
  m._compile(js, file);
  return m.exports as T;
}
/** One exact edit; a plant whose anchor is gone is a broken plant, never a quiet pass. */
const plant = (src: string, from: string, to: string) => {
  if (src.split(from).length !== 2) throw new Error(`plant did not apply exactly once: ${from.slice(0, 90)}`);
  return src.replace(from, to);
};
const squash = (s: string) => s.replace(/\s+/g, " ");

type World = {
  rail: Comp; bar: Comp; jrail: Comp; jbar: Comp;
  /** The stylesheet's text, edited before it is compiled (a plant's door). */
  edit?: (globals: string) => string;
  authority: string; compliance: string;
};
const REAL: World = {
  rail: load<{ BottomNav: Comp }>(RAIL).BottomNav,
  bar: load<{ TopAppBar: Comp }>(BAR).TopAppBar,
  jrail: load<{ JourneyTabs: Comp }>(JRAIL).JourneyTabs,
  jbar: load<{ JourneyTopBar: Comp }>(JBAR).JourneyTopBar,
  authority: read("docs/DESIGN_AUTHORITY.md"),
  compliance: read("docs/COMPLIANCE-DECISIONS.md"),
};

type NavKey = "rail" | "bar" | "jrail" | "jbar";
type Nav = { key: NavKey; name: string; width: number; journey: boolean; ref: string; neutral: string; sel: string };
/** Each bar: where it is drawn, its reference sibling's page, a page lighting neither, and its destination links. */
const NAVS: Nav[] = [
  { key: "rail", name: "the classic phone rail", width: 360, journey: false, ref: "/markets", neutral: "/results",
    sel: "nav.kp-rail:not(.kp-rail--journey) a.kp-rail__item:not(.kp-rail__item--coin)" },
  { key: "bar", name: "the classic desktop bar", width: 1280, journey: false, ref: "/markets", neutral: "/results",
    sel: "header nav a.kp-navlink" },
  { key: "jrail", name: "the journey's rail", width: 360, journey: true, ref: "/", neutral: "/positions",
    sel: "nav.kp-rail--journey a.kp-rail__item" },
  { key: "jbar", name: "the journey's desktop bar", width: 1280, journey: true, ref: "/", neutral: "/positions",
    sel: "header nav.kp-jnav a.kp-jnav__link" },
];
const UPDOWN = "/updown";
const MILLIONEA = "/millionea";
const ACCOUNT = "/account";

const PLAYER = { initials: "DP", name: "Demo Player", phone: "+255•••84", isAuthed: true, balance: 25_000 };
const GUEST = { initials: "G", name: "Guest", phone: "", isAuthed: false, balance: null };
/** One bar's element for a reader, as AppShell hands it (`millionea` only while true, D3). */
function element(w: World, nav: NavKey, player: boolean, mln: boolean): unknown {
  const door = mln ? { millionea: true } : {};
  switch (nav) {
    case "rail": return h(w.rail as never, { isAuthed: player, proposalsState: "DISABLED", inviteVisible: player, ...door } as never);
    case "bar": return h(w.bar as never, { user: player ? PLAYER : GUEST, proposalsState: "DISABLED", inviteVisible: player, ...door } as never);
    case "jrail": return h(w.jrail as never, { userId: player ? "u1" : null, ...door } as never);
    case "jbar": return h(w.jbar as never, { user: player ? PLAYER : GUEST, onBreak: false, proposalsState: "DISABLED", inviteVisible: player, ...door } as never);
  }
}

type Cell = { nav: Nav; l: Loc; player: boolean; mln: boolean; path: string };
type Matrix = { locales: Loc[]; players: boolean[]; mlns: boolean[] };
const FULL: Matrix = { locales: LOCALES, players: [false, true], mlns: [false, true] };
/** The plants' matrix: Swahili (the default language), a player, the door not drawn. */
const SMALL: Matrix = { locales: ["sw"], players: [true], mlns: [false] };
const cellsOf = (m: Matrix): Cell[] => NAVS.flatMap((nav) => m.locales.flatMap((l) => m.players.flatMap((player) => m.mlns.flatMap((mln) =>
  [nav.neutral, nav.ref, UPDOWN].map((path) => ({ nav, l, player, mln, path }))))));
const cellName = (c: Cell) => `${c.nav.key} ${c.l} ${c.player ? "player" : "guest"}${c.mln ? " +Millionea" : ""} ${c.path}`;

/* ── what the page reads ─────────────────────────────────────────────────────────────────────────────────────────── */
type Dest = {
  href: string; lit: boolean; text: string;
  shape: string; ruledShape: string; ruled: boolean; badge: boolean;
  selfPainted: boolean; self: string; boxes: string[]; glyphs: string[]; words: string[];
};
/** In the page: each destination link of the bar — its shape, and what it paints. Runs in Chromium. */
const PROBE = (arg: { sel: string }): { drawn: boolean; dests: Dest[] } => {
  const els = [...document.querySelectorAll(arg.sel)] as HTMLElement[];
  const IGNORE = new Set(["href", "aria-label", "aria-current", "data-on"]);
  const SVG_VALUES = new Set(["class", "width", "height", "viewBox"]);
  const clear = (c: string) => c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c);
  const paints = (cs: CSSStyleDeclaration) => !clear(cs.backgroundColor) || cs.backgroundImage !== "none" || cs.boxShadow !== "none"
    || (["Top", "Right", "Bottom", "Left"] as const).some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none" && !clear(cs[`border${s}Color`]))
    || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0);
  const paintOf = (cs: CSSStyleDeclaration) => [cs.backgroundColor, cs.backgroundImage, cs.boxShadow,
    `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, `${cs.borderRightWidth} ${cs.borderRightStyle} ${cs.borderRightColor}`,
    `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`, `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
    `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, cs.borderRadius, cs.opacity].join(" | ");
  const n1 = (v: number) => (Math.round(v * 2) / 2).toFixed(1);
  const dests: Dest[] = els.map((el) => {
    const href = el.getAttribute("href") ?? "";
    const account = href === "/account";
    // A notification dot is a state: the journey's Akaunti may carry one, nothing else (and its words for a reader).
    const skipped = (n: Element) => account && (n.classList.contains("kp-rail__badge") || n.classList.contains("sr-only"));
    const shapeOf = (n: Element, inSvg: boolean, ruled: boolean): string => {
      const tag = n.tagName.toLowerCase();
      const svg = inSvg || tag === "svg";
      const attrs = [...n.attributes].filter((a) => !IGNORE.has(a.name)).map((a) => {
        if (svg && !SVG_VALUES.has(a.name)) return a.name;
        if (ruled && a.name === "class") return `class=${a.value.split(/\s+/).filter((c) => c !== "kp-millionea-glyph").join(" ")}`;
        return `${a.name}=${a.value}`;
      }).sort();
      const kids = tag === "svg" ? "" : [...n.children].filter((c) => !skipped(c)).map((c) =>
        ruled && c.classList.contains("kp-millionea-ink") ? [...c.children].map((g) => shapeOf(g, svg, ruled)).join("") : shapeOf(c, svg, ruled)).join("");
      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${kids}</${tag}>`;
    };
    const d = el.getBoundingClientRect();
    const at = (r: DOMRect) => `${n1(r.width)}x${n1(r.height)} @${n1((r.left + r.right) / 2 - (d.left + d.right) / 2)},${n1(r.top - d.top)}`;
    const cs = getComputedStyle(el);
    const self = [cs.color, cs.fontFamily, cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.textTransform, cs.textDecorationLine,
      cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, n1(d.height), paintOf(cs)].join(" ¦ ");
    const boxes: string[] = [];
    const pseudo = (n: Element, path: string) => {
      for (const pe of ["::before", "::after"]) {
        const ps = getComputedStyle(n, pe);
        if (ps.content !== "none" && ps.content !== "normal" && ps.display !== "none") boxes.push(`${path}${pe} ${ps.width}x${ps.height} content=${ps.content} ${paintOf(ps)}`);
      }
    };
    pseudo(el, "self");
    const walk = (n: Element, path: string) => {
      for (const c of [...n.children]) {
        if (skipped(c)) continue;
        const tag = c.tagName.toLowerCase();
        const p = `${path}>${tag}${[...c.classList].filter((x) => x !== "kp-millionea-glyph" && x !== "kp-millionea-ink").map((x) => `.${x}`).join("")}`;
        if (tag === "svg") continue; // a glyph: read below as one
        const ccs = getComputedStyle(c);
        const r = c.getBoundingClientRect();
        if (ccs.display !== "none" && ccs.visibility !== "hidden" && r.width > 0 && r.height > 0 && paints(ccs)) boxes.push(`${p} ${at(r)} ${paintOf(ccs)}`);
        pseudo(c, p);
        walk(c, p);
      }
    };
    walk(el, "self");
    const glyphs = [...el.querySelectorAll("svg")].map((s) => {
      const gs = getComputedStyle(s);
      return `${gs.display === "none" ? "hidden" : at(s.getBoundingClientRect())} ink=${gs.color} fill=${gs.fill} stroke=${gs.stroke}`;
    });
    const words: string[] = [];
    for (const c of [el, ...el.querySelectorAll("*")]) {
      if (c.closest("svg")) continue;
      let hidden = false;
      for (let a: Element | null = c; a && a !== el.parentElement; a = a.parentElement) if (skipped(a)) hidden = true;
      if (hidden) continue;
      if (![...c.childNodes].some((t) => t.nodeType === 3 && (t.textContent ?? "").trim())) continue;
      const ws = getComputedStyle(c);
      words.push(`${ws.fontFamily} ${ws.fontSize} ${ws.fontWeight} ${ws.letterSpacing} ${ws.textTransform} ${ws.fontStyle} ${ws.lineHeight} ink=${ws.color} deco=${ws.textDecorationLine} top=${n1(c.getBoundingClientRect().top - d.top)}`);
    }
    const ruled = !!el.querySelector(".kp-millionea-ink, .kp-millionea-glyph");
    return {
      href, lit: el.hasAttribute("aria-current") || el.hasAttribute("data-on"), text: (el.textContent ?? "").trim(),
      shape: shapeOf(el, false, false), ruledShape: shapeOf(el, false, true), ruled,
      badge: !!el.querySelector(".kp-rail__badge"), selfPainted: paints(cs), self, boxes, glyphs, words,
    };
  });
  return { drawn: els.length > 0, dests };
};

/* ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
type Read = { cell: Cell; drawn: boolean; dests: Dest[] };
/** The paint signature: everything §2 compares. */
const paint = (d: Dest) => JSON.stringify({ self: d.self, boxes: d.boxes, glyphs: d.glyphs, words: d.words });
const firsts = (xs: string[], n = 3) => `${xs.length} — ${xs.slice(0, n).join(" ‖ ")}${xs.length > n ? " ‖ …" : ""}`;

async function run(w: World, m: Matrix, stage: Stage, report: (id: string, cond: boolean, label: string, detail: string) => void) {
  const cells = cellsOf(m);
  const html = new Map<Cell, string>(cells.map((c) => [c, draw(c.l, element(w, c.nav.key, c.player, c.mln), c.path)]));
  // ONE compile for every cell: Tailwind's content is all of the drawn markup (the planted world's too), so the
  // stylesheet only changes when a plant edits its text.
  const css = await stylesheet([...html.values()].join("\n"), w.edit);
  const reads: Read[] = [];
  for (const c of cells) {
    const r = await stage.measure({ body: html.get(c) ?? "", css, width: c.nav.width, height: 800, lang: c.l, shell: c.nav.journey ? "journey" : undefined, arg: { sel: c.nav.sel }, fn: PROBE });
    reads.push({ cell: c, ...r });
  }
  const byKey = new Map<string, Read>(reads.map((r) => [cellName(r.cell), r]));
  const peer = (c: Cell, path: string) => byKey.get(cellName({ ...c, path }));

  // §0 · premise
  {
    const gaps = reads.flatMap((r) => {
      const has = (href: string) => r.dests.some((d) => d.href === href);
      return !r.drawn ? [`${cellName(r.cell)}: not drawn`] : !has(UPDOWN) || !has(r.cell.nav.ref) ? [`${cellName(r.cell)}: ${has(UPDOWN) ? "" : "no Up & Down "}${has(r.cell.nav.ref) ? "" : "no reference"}`] : [];
    });
    const lit = reads.filter((r) => r.cell.path === UPDOWN).flatMap((r) => (r.dests.find((d) => d.href === UPDOWN)?.lit ? [] : [`${cellName(r.cell)}: Up & Down not lit on its page`]))
      .concat(reads.filter((r) => r.cell.path === r.cell.nav.ref).flatMap((r) => (r.dests.find((d) => d.href === r.cell.nav.ref)?.lit ? [] : [`${cellName(r.cell)}: the reference not lit on its page`])))
      .concat(reads.filter((r) => r.cell.path === r.cell.nav.neutral).flatMap((r) => (r.dests.some((d) => (d.href === UPDOWN || d.href === r.cell.nav.ref) && d.lit) ? [`${cellName(r.cell)}: Up & Down or the reference lit on the neutral page`] : [])));
    const controls = reads.filter((r) => r.cell.path === r.cell.nav.ref).flatMap((r) => {
      const ref = r.dests.find((d) => d.href === r.cell.nav.ref);
      // ⭐ CONTROL: the lit reference paints its pill (the rails' pip, the bars' link) — the box reader can see a box.
      const pill = r.cell.nav.key === "rail" || r.cell.nav.key === "jrail" ? (ref?.boxes.length ?? 0) > 0 : !!ref?.selfPainted;
      return pill ? [] : [`${cellName(r.cell)}: the lit reference paints nothing the reader can see`];
    });
    report("0.premise", gaps.length === 0 && lit.length === 0 && controls.length === 0,
      `§0 · every bar is drawn in ${reads.length} cells, with Up & Down and its reference as destination links, each lit on its own page and neither on the neutral one; the lit reference's pill is seen (a CONTROL on the box reader)`,
      firsts([...gaps, ...lit, ...controls]));
  }

  for (const nav of NAVS) {
    const mine = reads.filter((r) => r.cell.nav.key === nav.key);
    // §1 · markup
    const shapeGaps: string[] = [];
    const ruledGaps: string[] = [];
    const mlnGaps: string[] = [];
    for (const r of mine) {
      const c = r.cell;
      const plain = r.dests.filter((d) => d.href !== MILLIONEA);
      if (c.path === c.nav.neutral) {
        const ud = plain.find((d) => d.href === UPDOWN);
        const ref = plain.find((d) => d.href === c.nav.ref);
        for (const d of plain.filter((x) => !x.lit && x.href !== c.nav.ref)) if (ref && d.shape !== ref.shape) shapeGaps.push(`${cellName(c)}: ${d.href} ${d.shape} ≠ ${c.nav.ref} ${ref.shape}`);
        if (!ud || !ref) shapeGaps.push(`${cellName(c)}: missing`);
        const mln = r.dests.find((d) => d.href === MILLIONEA);
        if (c.mln && !mln) mlnGaps.push(`${cellName(c)}: Millionea's door not drawn`);
        if (mln && ref && mln.ruledShape !== ref.shape) mlnGaps.push(`${cellName(c)}: Millionea ${mln.ruledShape} ≠ ${ref.shape}`);
      }
      if (c.path === UPDOWN) {
        const ud = plain.find((d) => d.href === UPDOWN);
        const ref = peer(c, c.nav.ref)?.dests.find((d) => d.href === c.nav.ref);
        if (!ud || !ref || ud.shape !== ref.shape) shapeGaps.push(`${cellName(c)} lit: ${ud?.shape ?? "—"} ≠ ${c.nav.ref} lit ${ref?.shape ?? "—"}`);
      }
      for (const d of plain) {
        if (d.ruled) ruledGaps.push(`${cellName(c)}: ${d.href} wears Millionea's ink`);
        if (d.badge && d.href !== ACCOUNT) ruledGaps.push(`${cellName(c)}: ${d.href} wears a notification dot`);
      }
    }
    report(`1.${nav.key}`, shapeGaps.length === 0,
      `§1 · ${nav.name}: Up & Down's link has its siblings' markup — the reference's, unlit and lit, and every unlit link's (${mine.length} cells: sw · en · zh, guest and player, Millionea drawn and not)`,
      firsts(shapeGaps, 2));
    report(`1.${nav.key}.ruled`, ruledGaps.length === 0 && mlnGaps.length === 0,
      `§1 · ${nav.name}: Millionea's ruled ink (§M8a item 11) is its ONE difference and is worn by Millionea alone; a notification dot only on Akaunti`,
      firsts([...ruledGaps, ...mlnGaps], 2));

    // §2 · paint
    const paintGaps: string[] = [];
    for (const r of mine) {
      const c = r.cell;
      const plain = r.dests.filter((d) => d.href !== MILLIONEA);
      if (c.path === c.nav.neutral) {
        const ref = plain.find((d) => d.href === c.nav.ref);
        for (const d of plain.filter((x) => !x.lit && x.href !== c.nav.ref)) if (ref && paint(d) !== paint(ref)) paintGaps.push(`${cellName(c)}: ${d.href} ${paint(d)} ≠ ${c.nav.ref} ${paint(ref)}`);
      }
      if (c.path === UPDOWN) {
        const ud = plain.find((d) => d.href === UPDOWN);
        const ref = peer(c, c.nav.ref)?.dests.find((d) => d.href === c.nav.ref);
        if (!ud || !ref || paint(ud) !== paint(ref)) paintGaps.push(`${cellName(c)} lit: ${ud ? paint(ud) : "—"} ≠ ${c.nav.ref} lit ${ref ? paint(ref) : "—"}`);
      }
    }
    report(`2.${nav.key}`, paintGaps.length === 0,
      `§2 · ${nav.name}: Up & Down paints exactly what its siblings paint — the link's ink, type, fill and height, every box inside it, its glyph, its words; no dot — unlit and lit`,
      firsts(paintGaps, 1));
  }

  // §3 · the stylesheet
  {
    const NAV_ITEM = /kp-rail__item|kp-navlink|kp-jnav__link/;
    const LAYOUT_ONLY = new Set(["white-space", "text-overflow", "text-align"]);
    const dotRules: string[] = [];
    const addressPaint: string[] = [];
    let addressed = 0;
    postcss.parse(css).walkRules((rule) => {
      for (const sel of rule.selectors ?? []) {
        if (/kp-rail__dot|data-accent/.test(sel)) dotRules.push(sel);
        if (NAV_ITEM.test(sel) && /\[href/.test(sel)) {
          addressed++;
          const props: string[] = [];
          rule.walkDecls((d) => { props.push(d.prop); });
          const painting = props.filter((p) => !LAYOUT_ONLY.has(p));
          if (painting.length) addressPaint.push(`${sel} { ${painting.join(", ")} }`);
        }
      }
    });
    report("3.dot", dotRules.length === 0,
      "§3 · no rule names a product-line dot (`.kp-rail__dot`) or an accent marker (`[data-accent]`)", firsts(dotRules));
    report("3.address", addressPaint.length === 0,
      `§3 · a rule that picks a destination out by its address sets layout alone, in every state (${addressed} such selector(s): white-space, text-overflow, text-align only)`,
      firsts(addressPaint));
  }

  // §4 · the record
  {
    const da = squash(w.authority);
    const cd = squash(w.compliance);
    report("4.authority", da.includes("EVERY NAV TAB ALIKE — NO PRODUCT-LINE DOT, NO DESTINATION'S OWN INK (Ali, 2026-10-23:")
      && da.includes("please remove the golden dot, make it like other tabs please, cleanly, perfect … make it everywhere needed")
      && da.includes("Remove Up & Down's dot") && !/its distinction moves to a 5px gilt dot/.test(da),
      "§4 · DESIGN_AUTHORITY §K 3 states the rule — every nav tab alike — in the Owner's words", "");
    report("4.compliance", cd.includes("## 2026-10-23 · Up & Down loses its golden dot — every nav tab alike (owner ruling)")
      && cd.includes("people are misunderstanding and thinking there is a certain notification there")
      && cd.includes("Remove Up & Down's dot"),
      "§4 · COMPLIANCE-DECISIONS carries the dated ruling, the Owner's words quoted", "");
  }
}

/* ── the plants ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const DOT_RULE = ".kp-rail__dot {\n  position: absolute;\n  top: 2px;\n  right: 9px;\n  width: 5px;\n  height: 5px;\n  border-radius: var(--r-pill);\n  background: var(--gilt);\n}\n";
const CSS_ANCHOR = ".kp-rail__item[data-on] .kp-rail__label { font-weight: 700; }";
const addCss = (rule: string) => (g: string) => plant(g, CSS_ANCHOR, `${CSS_ANCHOR}\n${rule}`);
const raw = (rel: string) => read(rel);
type Plant = { name: string; expect: string[]; world: () => World; matrix?: Matrix };
const PLANTS: Plant[] = [
  { name: "the classic rail's gilt dot back on Up & Down's pip (its element and its rule)", expect: ["1.rail", "2.rail", "3.dot"],
    world: () => ({ ...REAL, edit: addCss(DOT_RULE),
      rail: fromSource<{ BottomNav: Comp }>(RAIL, plant(raw(RAIL), "<NavGlyph glyph={glyph} on={on} s={24} />",
        '<NavGlyph glyph={glyph} on={on} s={24} />\n          {href === "/updown" && <span className="kp-rail__dot" aria-hidden />}')).BottomNav }) },
  { name: "the classic bar's 5px gilt dot back before Up & Down's words", expect: ["1.bar", "2.bar"],
    world: () => ({ ...REAL,
      bar: fromSource<{ TopAppBar: Comp }>(BAR, plant(raw(BAR), '{it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}',
        '{it.href === "/updown" && <span aria-hidden style={{ flex: "none", width: 5, height: 5, borderRadius: "var(--r-pill)", background: "var(--gilt)" }} />}\n      {it.ink ? <span className="kp-millionea-ink">{it.label}</span> : it.label}')).TopAppBar }) },
  { name: "the classic bar's accent ink back (`data-accent` on Up & Down, `.kp-navlink[data-accent]` in --brand-300)", expect: ["1.bar", "2.bar", "3.dot"],
    world: () => ({ ...REAL, edit: (g) => plant(g, "/* TWO WAYS TO SAY", ".kp-navlink[data-accent] { color: var(--brand-300); }\n/* TWO WAYS TO SAY"),
      bar: fromSource<{ TopAppBar: Comp }>(BAR, plant(raw(BAR), 'className="kp-navlink inline-flex items-center gap-1.5 whitespace-nowrap"',
        'data-accent={it.href === "/updown" ? "" : undefined}\n      className="kp-navlink inline-flex items-center gap-1.5 whitespace-nowrap"')).TopAppBar }) },
  { name: "a gilt dot on the journey rail's Juu/Chini pip (its element and its rule)", expect: ["1.jrail", "2.jrail", "3.dot"],
    world: () => ({ ...REAL, edit: addCss(DOT_RULE),
      jrail: fromSource<{ JourneyTabs: Comp }>(JRAIL, plant(raw(JRAIL), "<NavGlyph glyph={d.glyph} on={on} s={24} restsUnlit />",
        '<NavGlyph glyph={d.glyph} on={on} s={24} restsUnlit />\n                  {d.key === "updown" && <span className="kp-rail__dot" aria-hidden />}')).JourneyTabs }) },
  { name: "the journey bar's Juu/Chini in an ink of its own, picked out by its address", expect: ["2.jbar", "3.address"],
    world: () => ({ ...REAL, edit: addCss('.kp-jnav__link[href="/updown"] { color: var(--gilt); }') }) },
  { name: "a hover-only ink for Up & Down on the classic bar (§2 cannot see a hover; §3 reads the rule)", expect: ["3.address"],
    world: () => ({ ...REAL, edit: addCss('.kp-navlink[href="/updown"]:hover { color: var(--gilt); }') }) },
  { name: "Millionea's ink lent to Up & Down on the classic rail (the ruled exception is not a loophole)", expect: ["1.rail", "1.rail.ruled", "2.rail"],
    world: () => ({ ...REAL,
      rail: fromSource<{ BottomNav: Comp }>(RAIL, plant(raw(RAIL), '{ href: "/updown",  glyph: "trade",      label: t.nav.updown },',
        '{ href: "/updown",  glyph: "trade",      label: t.nav.updown, ink: true },')).BottomNav }) },
  { name: "a notification-style dot (`.kp-rail__badge`) worn by Juu/Chini for good (a state is Akaunti's alone)", expect: ["1.jrail", "1.jrail.ruled"],
    world: () => ({ ...REAL,
      jrail: fromSource<{ JourneyTabs: Comp }>(JRAIL, plant(raw(JRAIL), "<NavGlyph glyph={d.glyph} on={on} s={24} restsUnlit />",
        '<NavGlyph glyph={d.glyph} on={on} s={24} restsUnlit />\n                  {d.key === "updown" && <span className="kp-rail__badge" aria-hidden />}')).JourneyTabs }) },
  { name: "the rule erased from DESIGN_AUTHORITY §K 3", expect: ["4.authority"],
    world: () => ({ ...REAL, authority: REAL.authority.replace("EVERY NAV TAB ALIKE", "EVERY NAV TAB") }) },
  { name: "the dated ruling erased from COMPLIANCE-DECISIONS", expect: ["4.compliance"],
    world: () => ({ ...REAL, compliance: REAL.compliance.replace("## 2026-10-23 · Up & Down loses its golden dot", "## 2026-10-23 · Up & Down keeps its golden dot") }) },
];

/* ── main ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const stage = await Stage.open();
try {
  if (!PROVE_RED) {
    console.log("nav-tabs-alike — every nav tab alike: no product-line dot, no destination's own ink (Ali, 2026-10-23)\n");
    let pass = 0;
    const fails: string[] = [];
    await run(REAL, FULL, stage, (id, cond, label, detail) => {
      if (cond) { pass++; console.log(`  PASS ${id} ${label}`); }
      else { fails.push(id); console.log(`  FAIL ${id} ${label}${detail ? ` — ${detail}` : ""}`); }
    });
    console.log(`\nnav-tabs-alike: ${pass} passed, ${fails.length} failed`);
    process.exitCode = pass > 0 && fails.length === 0 ? 0 : 1;
  } else {
    console.log("RED CONTROL — nav-tabs-alike's defects, planted in memory (sw, a player, the door not drawn)\n");
    let pass = 0, fail = 0;
    const ok = (label: string, cond: boolean, extra = "") => {
      if (cond) { pass++; console.log(`  ok   ${label}`); }
      else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
    };
    const verdicts = async (w: World, m: Matrix) => {
      const failed: string[] = [];
      const why = new Map<string, string>();
      let total = 0;
      await run(w, m, stage, (id, cond, _label, detail) => { total++; if (!cond) { failed.push(id); why.set(id, detail); } });
      return { failed, total, why };
    };
    const baseline = await verdicts(REAL, SMALL);
    if (baseline.total === 0 || baseline.failed.length > 0) {
      ok("baseline · the shipped bars pass before anything is planted", false, `failed ${baseline.failed.join(", ") || "(0 checks ran)"}`);
    } else {
      ok(`baseline · the shipped bars pass all ${baseline.total} checks before anything is planted`, true);
      for (const p of PLANTS) {
        let got: { failed: string[]; total: number; why: Map<string, string> };
        try { got = await verdicts(p.world(), p.matrix ?? SMALL); }
        catch (e) { ok(`PLANT · ${p.name}`, false, `the plant did not apply: ${String(e)}`); continue; }
        const missed = p.expect.filter((id) => !got.failed.includes(id));
        ok(`PLANT · ${p.name} → red at ${p.expect.join(", ")}`, missed.length === 0, `missed ${missed.join(", ")}; red: ${got.failed.join(", ") || "none"}`);
        // ⭐ WHY each expected check went red, so a catch for the wrong reason shows (AGENTS §8).
        for (const id of p.expect.filter((x) => got.why.has(x))) console.log(`         ${id}: ${(got.why.get(id) ?? "").slice(0, 260)}`);
      }
    }
    console.log(`\nnav-tabs-alike red: ${pass} caught, ${fail} missed`);
    process.exitCode = fail === 0 && pass > 1 ? 0 : 1;
  }
} finally {
  await stage.close();
}
