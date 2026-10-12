/**
 * ROUND 9 OF THE VISUAL PASS, FIXER A (2026-10-11) — EDGES AND GLYPHS: a glyph's ink sits where its row says, and every
 * sign-out draws a sign-out. Rounds 7–8's read (333 tiles; S/r78/read/triage.md, "R9-A"): R7-F1 the hub's podium glyph
 * 2px low, R8-F1 every sign-out drawing a sign-in, R8-D3 the Toka box 2px short, the edge-icon family (R2-F2 the card's
 * "Maelezo ›", R4-D6 the Wallet's "Risiti zote ›", R2-D5 the deposit head's glyph, R2-F1 the held capsule), three readers'
 * 8px YES/NO pair on the card (R1-D6 R2-D3 R4-D1), and R5's one-sided dashed track ending on a 2px stub (tile 194).
 *
 *   npx tsx scripts/visual-pass-r9a.test.mts        (npm run test:visual-pass-r9a)
 *
 *   §1 A1 every glyph's drawing centred in its box, and inside it — the podium, then the whole family
 *   §2 A2 logOut is a log-out: the door's bracket on the left, the arrow leaving it
 *   §3 A3 the Toka box is a one-row card's height
 *   §4 A4 the edge-icon rule — the engine against this file's own reading of each drawing, the stems against the fonts, the
 *         two eyebrow slots, and every edge mark and eyebrow glyph on a player surface classified
 *   §5 A5 one 12px gap for a pair of buttons, and the card's labels still fit at 320
 *   §6 A6 every dashed track starts and ends on a whole dash
 *   §7 no dictionary word changed
 * The owner's rules (Ali): only perfect visual and logical results; consistency and perfection in each move — a finding is
 * fixed with every sibling it has. Each check stands beside a control or a planted defect.
 * ⛔ It reads, renders and computes in memory; it writes nothing. The on-disk mutation proof is S/r9/a/mutation-r9a.mjs (S =
 * the session scratchpad).
 * ⚠️ This file holds no backslash: every pattern that needs a space, a newline or a special character is built from
 * character codes and bracket classes (the editing tools turn some escapes into control characters).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
const CR = String.fromCharCode(13), NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
const QUOTE = String.fromCharCode(34), BACKTICK = String.fromCharCode(96);
/** Any run of blanks, written without an escape. */
const WS = `[ ${TAB}${NL}]`;
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`${NL}── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => { const s = readFileSync(p, "utf8").split(CR).join(""); return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; };
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(new RegExp(`${WS}+`, "g"), " ").trim();
const j = (v: unknown) => JSON.stringify(v);
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.split(String.fromCharCode(92)).join("/")] : [];
});
/** Player surfaces: everything but the console, the API, the server and the marketing engine (R6-C's population). */
const OUT = new RegExp("^src/(?:app/admin|components/admin|app/api|lib/server|lib/marketing)/");
const PLAYER_TSX = walk("src", new RegExp("[.]tsx$")).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));
/** A stylesheet rule's body by its exact selector (the first one). */
const rule = (sel: string) => {
  const at = CSS.indexOf(`${sel} {`);
  if (at < 0) return "";
  return CSS.slice(at + sel.length + 2, CSS.indexOf("}", at));
};
const tokenPx = (name: string) => Number(new RegExp(`${name}:${WS}*([0-9.]+)px`).exec(CSS)?.[1] ?? NaN);

/* ── the world the components render in ────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type GlyphFn = (p: Record<string, unknown>) => import("react").ReactElement;
const glyphs = req("../src/components/ui/glyphs.tsx") as {
  I: Record<string, GlyphFn>;
  GLYPH_STEM: Record<string, number>;
  edgeGlyph: (n: unknown, e: "start" | "end") => unknown;
};
const { I, GLYPH_STEM } = glyphs;
const render = (el: unknown) => renderToStaticMarkup(el as import("react").ReactElement);

/* ══ AN INDEPENDENT READING OF A DRAWING — this file's own path reader (sampled curves and arcs), never the engine's ══ */
type Pt = [number, number];
type Sub = { verts: Pt[]; samples: Pt[]; arc: boolean };
const NUM = new RegExp("[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?", "y");
function parsePath(d: string): Sub[] {
  const subs: Sub[] = [];
  let i = 0, cmd = "", last = "", x = 0, y = 0, sx = 0, sy = 0, kx = 0, ky = 0;
  let cur: Sub = { verts: [], samples: [], arc: false };
  const sep = (c: number) => c === 32 || c === 44 || c === 9 || c === 10 || c === 13;
  const skip = () => { while (i < d.length && sep(d.charCodeAt(i))) i++; };
  const num = () => { skip(); NUM.lastIndex = i; const m = NUM.exec(d); if (!m) throw new Error(`no number at ${i}: ${d}`); i = NUM.lastIndex; return Number(m[0]); };
  const flag = () => { skip(); return d[i++] === "1"; };
  const to = (px: number, py: number) => { cur.verts.push([px, py]); cur.samples.push([px, py]); };
  const sample = (fx: (t: number) => number, fy: (t: number) => number) => { for (let k = 1; k < 400; k++) cur.samples.push([fx(k / 400), fy(k / 400)]); };
  const cub = (a: number, b: number, c: number, e: number) => (t: number) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * e; };
  const qua = (a: number, b: number, e: number) => (t: number) => { const u = 1 - t; return u * u * a + 2 * u * t * b + t * t * e; };
  for (;;) {
    skip();
    if (i >= d.length) break;
    const ch = d[i];
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) { cmd = ch; i++; }
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd >= "a" && cmd <= "z", up = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (up === "Z") { x = sx; y = sy; }
    else if (up === "M") { x = ox + num(); y = oy + num(); sx = x; sy = y; cur = { verts: [[x, y]], samples: [[x, y]], arc: false }; subs.push(cur); }
    else if (up === "L") { x = ox + num(); y = oy + num(); to(x, y); }
    else if (up === "H") { x = ox + num(); to(x, y); }
    else if (up === "V") { y = oy + num(); to(x, y); }
    else if (up === "C" || up === "S") {
      const reflect = up === "S" && (last === "C" || last === "S");
      const x1 = up === "C" ? ox + num() : reflect ? 2 * x - kx : x, y1 = up === "C" ? oy + num() : reflect ? 2 * y - ky : y;
      const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
      sample(cub(x, x1, x2, ex), cub(y, y1, y2, ey)); to(ex, ey); kx = x2; ky = y2; x = ex; y = ey;
    } else if (up === "Q" || up === "T") {
      const reflect = up === "T" && (last === "Q" || last === "T");
      const x1 = up === "Q" ? ox + num() : reflect ? 2 * x - kx : x, y1 = up === "Q" ? oy + num() : reflect ? 2 * y - ky : y;
      const ex = ox + num(), ey = oy + num();
      sample(qua(x, x1, ex), qua(y, y1, ey)); to(ex, ey); kx = x1; ky = y1; x = ex; y = ey;
    } else if (up === "A") {
      let rx = Math.abs(num()), ry = Math.abs(num());
      const deg = num(), large = flag(), sweep = flag(), ex = ox + num(), ey = oy + num();
      cur.arc = true;
      if (rx && ry && !(x === ex && y === ey)) {
        const ph = (deg * Math.PI) / 180, cp = Math.cos(ph), sp = Math.sin(ph);
        const dx = (x - ex) / 2, dy = (y - ey) / 2, xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
        const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
        if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const den = rx * rx * yp * yp + ry * ry * xp * xp;
        let co = den ? Math.sqrt(Math.max(0, (rx * rx * ry * ry - den) / den)) : 0;
        if (large === sweep) co = -co;
        const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx;
        const cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
        const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
        let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
        if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
        for (let k = 1; k < 2000; k++) {
          const th = t1 + (dt * k) / 2000;
          cur.samples.push([cx + rx * Math.cos(th) * cp - ry * Math.sin(th) * sp, cy + rx * Math.cos(th) * sp + ry * Math.sin(th) * cp]);
        }
      }
      to(ex, ey); x = ex; y = ey;
    } else throw new Error(`command ${cmd} in ${d}`);
    last = up;
  }
  return subs;
}
type Part = { tag: string; box: { x0: number; y0: number; x1: number; y1: number }; w: number; own: boolean; d?: string };
const attrs = (s: string) => Object.fromEntries([...s.matchAll(new RegExp('([A-Za-z][A-Za-z0-9-]*)="([^"]*)"', "g"))].map((m) => [m[1], m[2]]));
const ELEM = new RegExp("<(path|circle|rect|line|ellipse|polyline)([^>]*?)/?>", "g");
/** A drawing's parts, from its source markup: each part's geometry box and its stroke (own, the wrapper's, or none). */
function partsOfMarkup(body: string, base = 1.9): Part[] {
  return [...body.matchAll(ELEM)].map((m) => {
    const a = attrs(m[2]);
    let pts: Pt[] = [];
    const n = (k: string) => Number(a[k] ?? 0);
    if (m[1] === "path") pts = parsePath(a.d).flatMap((s) => s.samples);
    else if (m[1] === "circle") pts = [[n("cx") - n("r"), n("cy") - n("r")], [n("cx") + n("r"), n("cy") + n("r")]];
    else if (m[1] === "ellipse") pts = [[n("cx") - n("rx"), n("cy") - n("ry")], [n("cx") + n("rx"), n("cy") + n("ry")]];
    else if (m[1] === "rect") pts = [[n("x"), n("y")], [n("x") + n("width"), n("y") + n("height")]];
    else if (m[1] === "line") pts = [[n("x1"), n("y1")], [n("x2"), n("y2")]];
    else { const v = (a.points ?? "").split(new RegExp("[ ,]+")).filter(Boolean).map(Number); for (let k = 0; k < v.length; k += 2) pts.push([v[k], v[k + 1]]); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const stroked = a.stroke !== "none";
    return { tag: m[1], box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, w: stroked ? Number(a.strokeWidth ?? base) : 0, own: a.strokeWidth != null || !stroked, d: a.d };
  });
}
const inkBox = (parts: Part[]) => ({
  x0: Math.min(...parts.map((q) => q.box.x0 - q.w / 2)), y0: Math.min(...parts.map((q) => q.box.y0 - q.w / 2)),
  x1: Math.max(...parts.map((q) => q.box.x1 + q.w / 2)), y1: Math.max(...parts.map((q) => q.box.y1 + q.w / 2)),
});
/** Every glyph of the family as its source draws it: name → grid and body. */
const GLYPH_SRC = raw("src/components/ui/glyphs.tsx");
const ENTRY = new RegExp("^[ ]*([A-Za-z0-9_]+): [(]p: GlyphProps[)] => <(G|GL) [{][.][.][.]p[}]>(.*)</(?:G|GL)>,[ ]*$", "gm");
const FAMILY = new Map([...GLYPH_SRC.matchAll(ENTRY)].map((m) => [m[1], { grid: m[2] === "G" ? 24 : 64, body: m[3] }]));
const partsOf = (name: string) => partsOfMarkup(FAMILY.get(name)?.body ?? "");

/* ══ §1 · A1 · A DRAWING IS CENTRED IN ITS BOX, AND INSIDE IT ══════════════════════════════════════════════════════════ */
section("1 · A1 every glyph's drawing centred in its box (the podium, R7-F1) and inside it (the coins' back coin)");
const centreOff = (body: string, grid: number) => { const b = inkBox(partsOfMarkup(body)); return { dx: (b.x0 + b.x1) / 2 - grid / 2, dy: (b.y0 + b.y1) / 2 - grid / 2, b }; };
{
  const pod = centreOff(FAMILY.get("podium")!.body, 24);
  ok(`1.1 · the podium's drawing is centred in its viewBox — ink y${pod.b.y0.toFixed(2)}–${pod.b.y1.toFixed(2)}, centre (12, 12) (it was y8.05–21.45, 2.75 units low: 2.29px at the hub's 20px)`,
    near(pod.dx, 0, 1e-6) && near(pod.dy, 0, 1e-6) && near(pod.b.y0, 5.3, 1e-6) && near(pod.b.y1, 18.7, 1e-6), j(pod));
  const OLD_PODIUM = '<path d="M3.5 20.5h17"/><path d="M9 20.5V9h6v11.5"/><path d="M3.5 20.5v-6H9M20.5 20.5v-4.5H15"/>';
  ok("1.1′ CONTROL · the old drawing reads 2.75 units low by the same reader", near(centreOff(OLD_PODIUM, 24).dy, 2.75, 1e-6));
  // Its rows in the hub: a 56px rung centres a 20px glyph box, so a drawing centred in its box is centred on the row.
  const k20 = 20 / 24;
  ok(`1.2 · on the hub's Leaderboard row (56px rung, 20px glyph) the ink centre now falls on the row's centre — it fell ${(2.75 * k20).toFixed(2)}px below (tile 262: ink y624–635, centre 630.0 in the row y600–655, centre 628.0)`,
    near(pod.dy * k20, 0, 1e-6) && near(2.75 * k20, 2.2917, 1e-3));

  // The census: every glyph of the family within ONE grid unit of its box's centre (0.83px at the hub's 20px — the hub's
  // other glyphs as the readers measured them), at the 64-grid the same fraction of its box.
  const names = [...FAMILY.keys()];
  const OPTICAL = new Set(["playBare"]);
  const off = names.filter((n) => {
    if (OPTICAL.has(n)) return false;
    const { grid, body } = FAMILY.get(n)!;
    const c = centreOff(body, grid);
    return Math.abs(c.dx) > grid / 24 + 1e-9 || Math.abs(c.dy) > grid / 24 + 1e-9;
  });
  ok(`1.3 · every one of the family's ${names.length} drawings is centred within one grid unit — no exception but playBare's optical centre`,
    names.length >= 180 && off.length === 0, j(off.map((n) => [n, centreOff(FAMILY.get(n)!.body, FAMILY.get(n)!.grid)])));
  // playBare is a filled triangle: its CENTROID is centred (the eye centres a triangle on its centroid), its box is not.
  const tri = parsePath(attrs((FAMILY.get("playBare")!.body.match(new RegExp("<path([^>]*)/?>")) ?? ["", ""])[1]).d)[0].verts.slice(0, 3);
  const cx = tri.reduce((s, p) => s + p[0], 0) / 3, cy = tri.reduce((s, p) => s + p[1], 0) / 3;
  ok(`1.3′ · …and the one exception keeps its reason: playBare's triangle centroid stands at (${cx.toFixed(3)}, ${cy.toFixed(3)}) — the box's centre`, near(cx, 12, 1e-9) && near(cy, 12, 1e-9));
  const OLD_HEADSET = '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="13" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="13" width="3.8" height="6" rx="1.7"/><path d="M19.1 19v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/>';
  const OLD_FLAME2 = '<path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" />';
  ok("1.3″ PLANT · the old headset (1.25 low, the hub's Msaada row) and the old flame2 (3.5 high, the proposals HOT flag) are each reported by the census rule",
    Math.abs(centreOff(OLD_HEADSET, 24).dy) > 1 && Math.abs(centreOff(OLD_FLAME2, 24).dy) > 1);

  // Inside the box: the svg clips at its box, so a drawing past it is cut.
  const OVER: Record<string, string> = { resolved: "its eight rays' round caps reach 0.25 past the box (0.2px at 20px), drawn the same in the frozen classic menu — named, not changed this round" };
  const outside = names.filter((n) => { const { grid, body } = FAMILY.get(n)!; const b = inkBox(partsOfMarkup(body)); return !(n in OVER) && (b.x0 < -1e-9 || b.y0 < -1e-9 || b.x1 > grid + 1e-9 || b.y1 > grid + 1e-9); });
  ok("1.4 · every drawing stays inside its box (the coins' back coin reached x26.32 and lost 2.32 units to the clip) — the one named overreach is `resolved`'s ray caps, 0.25",
    outside.length === 0 && (() => { const b = inkBox(partsOf("resolved")); return near(b.x1, 24.25, 1e-6) && near(b.x0, -0.25, 1e-6); })(), j(outside));
  const OLD_COINS = '<circle cx="10" cy="10" r="6" /><path d="M14.5 13.5a6 6 0 1 0 0-7" /><path d="M10 8v4M8.5 10.5h3" />';
  const oc = inkBox(partsOfMarkup(OLD_COINS));
  ok(`1.4′ CONTROL · the old coins reached x${oc.x1.toFixed(2)} — past the box — and the new one ends at x${inkBox(partsOf("coins")).x1.toFixed(2)}`, oc.x1 > 26.3 && inkBox(partsOf("coins")).x1 < 24);
  // Where the podium is drawn: the hub's Leaderboard row, and nowhere else.
  const podiumUses = PLAYER_TSX.concat(walk("src", new RegExp("[.]ts$")).filter((f) => !OUT.test(f))).filter((f) => f !== "src/components/ui/glyphs.tsx")
    .filter((f) => new RegExp('I[.]podium[^A-Za-z]|glyph: "podium"').test(code(f)));
  ok(`1.5 · the podium has one use — the hub's Bingwa / Leaderboard / 排行榜 row (${podiumUses.join(", ")}), every reader's hub, guest and member`,
    podiumUses.length === 1 && podiumUses[0] === "src/components/journey/account/hub-rows.ts" && code(podiumUses[0]).includes('label: "leaderboard.title", glyph: "podium"'));
}

/* ══ §2 · A2 · logOut IS A LOG-OUT ══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · A2 logOut draws a log-out: the door's bracket on the left, the arrow leaving it — and never logIn's geometry");
/** A door-and-arrow drawing read as one: its bracket (the part with arcs), its shaft (one straight level line), its head. */
function doorArrow(d: string) {
  const subs = parsePath(d);
  const bracket = subs.find((s) => s.arc);
  const shaft = subs.find((s) => !s.arc && s.verts.length === 2 && near(s.verts[0][1], s.verts[1][1]));
  const head = subs.find((s) => !s.arc && s.verts.length === 3);
  if (!bracket || !shaft || !head) return { ok: false, why: "not a door and an arrow" };
  const bx1 = Math.max(...bracket.samples.map((p) => p[0])), bx0 = Math.min(...bracket.samples.map((p) => p[0]));
  const sx0 = Math.min(shaft.verts[0][0], shaft.verts[1][0]), sx1 = Math.max(shaft.verts[0][0], shaft.verts[1][0]);
  const tip = head.verts[1], wings = [head.verts[0], head.verts[2]];
  const out = bx1 <= sx0 + 1e-9                          // the bracket stands left of the arrow's tail
    && near(tip[0], sx1) && near(tip[1], shaft.verts[0][1]) // the head's point is the shaft's far end
    && wings.every((w) => w[0] < tip[0])                // its wings trail back: it points right, away from the door
    && near(wings[0][1] + wings[1][1], 2 * tip[1]);     // and symmetrically about the shaft
  return { ok: out, why: j({ bracket: [bx0, bx1], shaft: [sx0, sx1], tip, wings }) };
}
{
  const dOf = (name: string) => attrs((FAMILY.get(name)!.body.match(new RegExp("<path([^>]*)/?>")) ?? ["", ""])[1]).d ?? "";
  const out = doorArrow(dOf("logOut"));
  ok("2.1 · logOut's bracket stands on the LEFT (x3–9), its arrow starts at the bracket's open side and its head points right, away from it (x21)", out.ok, out.why);
  ok("2.1′ CONTROL · logIn is not a log-out by the same reading (its bracket on the right, the arrow running into it)", !doorArrow(dOf("logIn")).ok);
  ok("2.1″ PLANT · the old logOut — logIn's geometry, segment order aside — is reported", !doorArrow("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3").ok);
  const bo = inkBox(partsOf("logOut")), bi = inkBox(partsOf("logIn"));
  ok(`2.2 · the same grid, stroke and reach as logIn — ink x${bo.x0.toFixed(2)}–${bo.x1.toFixed(2)}, y${bo.y0.toFixed(2)}–${bo.y1.toFixed(2)} — so it stands where it stood; and it is not logIn's path`,
    near(bo.x0, bi.x0) && near(bo.x1, bi.x1) && near(bo.y0, bi.y0) && near(bo.y1, bi.y1) && dOf("logOut") !== dOf("logIn")
      && render(h(I.logOut, { s: 20 })).includes('stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'));
  const SIGN_OUTS = ["src/components/journey/account/sign-out-row.tsx", "src/components/layout/avatar-menu.tsx", "src/app/profile/page.tsx", "src/app/profile/sessions/page.tsx"];
  ok("2.3 · every sign-out draws it — the hub's Toka, the account menu (classic and journey), /profile and /profile/sessions — and nothing draws logIn",
    SIGN_OUTS.every((f) => code(f).includes("<I.logOut")) && PLAYER_TSX.every((f) => !code(f).includes("I.logIn")));
}

/* ══ §3 · A3 · THE TOKA BOX IS A CARD'S HEIGHT ══════════════════════════════════════════════════════════════════════════ */
section("3 · A3 the hub's sign-out box is a one-row card's height: the 56px rung inside a 1px border");
{
  const xl = tokenPx("--h-control-xl");
  /** Every box here is border-box (Tailwind's preflight), so a min-height counts the border. */
  const outer = (body: string) => {
    const m = new RegExp(`min-height:${WS}*(calc[(]var[(]--h-control-xl[)]${WS}*[+]${WS}*([0-9]+)px[)]|var[(]--h-control-xl[)])`).exec(body);
    return m ? xl + Number(m[2] ?? 0) : NaN;
  };
  const card = 2 * 1 + (rule(".kp-hub__row").includes("min-height: var(--h-control-xl)") ? xl : NaN);
  const toka = outer(rule(".kp-hub__exit"));
  ok(`3.1 · a one-row card is ${card}px (its 1px border around the ${xl}px rung) and Toka is ${toka}px — equal (it was ${xl})`,
    card === 58 && toka === card && rule(".kp-hub__card").includes("border: 1px solid var(--border)") && rule(".kp-hub__exit").includes("border: 1px solid var(--border)"));
  ok("3.1′ CONTROL · the old rule (`min-height: var(--h-control-xl)`) reads 56 by the same reckoning", outer("min-height: var(--h-control-xl); padding: 0") === 56);
  ok("3.2 · the boxes are border-box: Tailwind's preflight is on (the config never turns it off)", !new RegExp("preflight[^,}]*false").test(code("tailwind.config.ts")));
}

/* ══ §4 · A4 · THE EDGE-ICON RULE ════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · A4 a glyph at a run's start or end puts its INK on the edge (`edge`), a mark in words strokes at their stem (`text`)");
type Margin = { side: "start" | "end"; px: number; em: number } | null;
const marginOf = (markup: string): Margin => {
  const m = new RegExp("margin-inline-(start|end):(?:calc[(](-?[0-9.]+)px [+] ([0-9.]+)em[)]|(-?[0-9.]+)px)").exec(markup);
  return m ? { side: m[1] as "start" | "end", px: Number(m[2] ?? m[4]), em: Number(m[3] ?? 0) } : null;
};
/** This file's own expectation: the gap between the glyph's box and its ink, from the drawing (and, for a text mark, the
 *  half stem in em beyond its geometry). */
const expected = (name: string, s: number, side: "start" | "end", text?: string): Margin => {
  const parts = partsOf(name);
  const run = text ? parts.filter((q) => !q.own) : [];
  const own = text ? parts.filter((q) => q.own) : parts;
  const k = s / 24;
  if (side === "end") {
    const reach = Math.max(...own.map((q) => q.box.x1 + q.w / 2), ...run.map((q) => q.box.x1));
    return { side, px: -(24 - reach) * k, em: text ? GLYPH_STEM[text] / 2 : 0 };
  }
  const reach = Math.min(...own.map((q) => q.box.x0 - q.w / 2), ...run.map((q) => q.box.x0));
  return { side, px: -reach * k, em: text ? GLYPH_STEM[text] / 2 : 0 };
};
const sameMargin = (a: Margin, b: Margin) => !!a && !!b && a.side === b.side && Math.abs(a.px - b.px) <= 0.0015 && Math.abs(a.em - b.em) <= 1e-9;
{
  // 4.1 · the named sites, the engine against this file's reading.
  const CASES: Array<[string, number, "start" | "end", string | undefined, string]> = [
    ["chevronRight", 11, "end", "display-600", "the card's “Maelezo ›” (Sora 600 11.5px)"],
    ["chevronRight", 14, "end", "body-600", "the Wallet's “Risiti zote ›” (Inter 600 13px)"],
    ["chevronRight", 18, "end", undefined, "every hub row's chevron"],
    ["externalLink", 18, "end", undefined, "the hub's staff console mark"],
    ["lock", 16, "start", undefined, "the held capsule's lock"],
    ["arrowDownToLine", 14, "start", undefined, "the deposit head's eyebrow glyph"],
    ["chevronLeft", 11, "start", "mono-400", "the back link"],
    ["ext", 12, "end", "mono-400", "the market page's source link (R4-D's typed 2px, now measured)"],
  ];
  const rows = CASES.map(([n, s, side, text, what]) => {
    const got = marginOf(render(h(I[n], { s, edge: side, text })));
    const want = expected(n, s, side, text);
    return { what, got, want, same: sameMargin(got, want) };
  });
  ok(`4.1 · the engine pulls each named glyph by exactly its ink's gap, as this file reads it from the drawing — ${rows.map((r) => `${r.what}: ${r.got ? `${r.got.px}px${r.got.em ? ` + ${r.got.em}em` : ""}` : "none"}`).join("; ")}`,
    rows.every((r) => r.same), j(rows.filter((r) => !r.same)));
  // The afters, in pixels on the tiles' faces.
  const mae = expected("chevronRight", 11, "end", "display-600")!;
  const maePx = -mae.px - mae.em * 11.5;
  ok(`4.1′ · the card's chevron: its ink ended ${(9 / 24 * 11 - 0.95 * 11 / 24).toFixed(2)}px short of the card's content edge (the readers: 3–4px; x1228 against x1231); pulled ${maePx.toFixed(2)}px it ends ON it, its stroke ${(GLYPH_STEM["display-600"] * 11.5).toFixed(2)}px where the family's painted ${(1.9 * 11 / 24).toFixed(2)}px`,
    near(maePx, 9 / 24 * 11 - GLYPH_STEM["display-600"] * 11.5 / 2, 1e-9) && GLYPH_STEM["display-600"] * 11.5 > 1.6);
  const hub = -expected("chevronRight", 18, "end")!.px;
  ok(`4.1″ · the hub's chevrons end on the card-size switch's edge: they stood ${hub.toFixed(3)}px inside it (tile 264: ink x345–350 against the switch's x356, its content edge x357)`, near(hub, 6.0375, 1e-9));

  // 4.2 · a glyph without `edge` or `text` is byte for byte what it was: the classic chrome's glyphs are parity-captured.
  const OldG = ({ children, s, ...p }: Record<string, unknown>) =>
    h("svg", { viewBox: "0 0 24 24", width: (s as number) ?? 24, height: (s as number) ?? 24, fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, ...p }, children as never);
  const kids = (n: string) => (I[n]({}) as unknown as { props: { children: unknown } }).props.children;
  const PROPS: Array<Record<string, unknown>> = [{ s: 20 }, { s: 16, className: "kp-x", "aria-hidden": true }, { s: 12, strokeWidth: 2.5 }, { s: 14, style: { opacity: 0.5 }, className: "a b" }];
  const diffs: string[] = [];
  for (const n of ["bell", "wallet", "chevronRight", "lock", "logOut", "receipt"]) for (const p of PROPS) {
    const now = render(h(I[n], p)), was = render(h(OldG, p, kids(n) as never));
    if (now !== was) diffs.push(`${n} ${j(p)}`);
  }
  ok("4.2 · CONTROL · without `edge` or `text` a glyph renders exactly the markup the old wrapper rendered — every attribute, in its order (6 glyphs × 4 prop sets)", diffs.length === 0, j(diffs));

  // 4.3 · the text stroke.
  const tm = render(h(I.chevronRight, { s: 11, text: "display-600", className: "x" }));
  ok("4.3 · a text mark carries its words' stem — `kp-gtext` and `--g-stem` in em — and the sheet strokes it at that length on the screen (`non-scaling-stroke`)",
    tm.includes('class="kp-gtext x"') && tm.includes("--g-stem:0.142em") && CSS.includes(".kp-gtext { stroke-width: var(--g-stem); }") && CSS.includes(".kp-gtext * { vector-effect: non-scaling-stroke; }"), tm);

  // 4.4 · the stems against the faces.
  const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { bbox: { minX: number; maxX: number }; path: { commands: Array<{ command: string; args: number[] }> } } } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
  const bar = (n: string) => { const f = F(n); const g = f.glyphForCodePoint(108); return (g.bbox.maxX - g.bbox.minX) / f.unitsPerEm; };   // Inter's l
  const stemH = (n: string) => {   // JetBrains Mono's H: its left stem, from the outline's straight points
    const f = F(n); const g = f.glyphForCodePoint(72);
    const xs = [...new Set(g.path.commands.filter((c) => c.command === "moveTo" || c.command === "lineTo").map((c) => Math.round(c.args[0])))].sort((a, b) => a - b);
    return (xs[1] - xs[0]) / f.unitsPerEm;
  };
  const faces: Record<string, number> = {
    "body-400": bar("Inter-Regular"), "body-500": bar("Inter-Medium"), "body-700": bar("Inter-Bold"),
    "body-600": (bar("Inter-Medium") + bar("Inter-Bold")) / 2,
    "mono-400": stemH("JetBrainsMono-Regular"), "mono-700": stemH("JetBrainsMono-Bold"),
    "mono-600": (stemH("JetBrainsMono-Regular") + stemH("JetBrainsMono-Bold")) / 2,
  };
  const SORA = { "display-600": 0.142, "display-700": 0.164 };   // Sora v17's I (not in the repo; read from fonts.gstatic.com's TTF)
  const badStem = Object.entries(faces).filter(([k, v]) => Math.abs(GLYPH_STEM[k] - v) > 0.0015);
  ok(`4.4 · every stem is its face's own: ${Object.entries(faces).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(" · ")} (the repo's Inter and JetBrains Mono), display-600/700 Sora's 0.142/0.164`,
    badStem.length === 0 && Object.entries(SORA).every(([k, v]) => GLYPH_STEM[k] === v) && Object.keys(GLYPH_STEM).length === 9, j(badStem));
  ok("4.4′ CONTROL · one value per weight could not say it: at 700 JetBrains Mono's stem is 15% under Inter's", faces["mono-700"] < faces["body-700"] * 0.86);

  // 4.5 · the two eyebrow slots pull a family glyph, and leave anything else as given.
  const { PageHeader } = req("../src/components/ui/page-header.tsx") as { PageHeader: (p: Record<string, unknown>) => unknown };
  const { AuthHeader } = req("../src/components/auth/auth-panel.tsx") as { AuthHeader: (p: Record<string, unknown>) => unknown };
  const ph = render(h(PageHeader as never, { icon: h(I.arrowDownToLine, { s: 14, className: "text-text-subtle" }), eyebrow: "WEKA PESA", title: "Weka pesa" }));
  const phSpan = render(h(PageHeader as never, { icon: h("span", { className: "inline-block h-[14px] w-[14px]" }), eyebrow: "X", title: "Y" }));
  const ah = render(h(AuthHeader as never, { icon: h(I.shieldcheck, { s: 13 }), eyebrow: "2FA", title: "Thibitisha" }));
  const phPull = marginOf(ph);
  ok(`4.5 · PageHeader and AuthHeader pull the eyebrow's glyph onto the column's edge — the deposit head's by ${phPull ? `${(-phPull.px).toFixed(4)}px` : "nothing"} (its ink stood 2.36px in; the readers saw it 1.3px inside the title's ink)`,
    sameMargin(marginOf(ph), expected("arrowDownToLine", 14, "start")) && sameMargin(marginOf(ah), expected("shieldcheck", 13, "start")) && ph.includes('class="text-text-subtle"'));
  ok("4.5′ CONTROL · a slot handed something that is not a glyph draws it as given", !phSpan.includes("margin-inline") && phSpan.includes('<span class="inline-block h-[14px] w-[14px]"></span>'));
  ok('4.5″ · …and the slot does it in its source (edgeGlyph(icon, "start")): a slot without it is reported', code("src/components/ui/page-header.tsx").includes('edgeGlyph(icon, "start")') && code("src/components/auth/auth-panel.tsx").includes('edgeGlyph(icon, "start")'));
  // The deposit return's ghost draws an unpainted clock where the page draws one of four outcome glyphs: all four share
  // one ink start, so the ghost's eyebrow lands where the page's does.
  const four = ["checkCircle", "alertCircle", "rotateCcw", "clock"].map((n) => inkBox(partsOf(n)).x0);
  ok(`4.6 · the deposit return's four outcome glyphs share one ink start (x${four.map((v) => v.toFixed(2)).join(" · ")}), so its ghost's unpainted clock lands its eyebrow where the page does`,
    four.every((v) => near(v, four[0], 1e-3)) && code("src/app/wallet/deposit/return/loading.tsx").includes('icon={<I.clock s={14} className="shrink-0 text-transparent" />}'),
    j({ four, ghost: code("src/app/wallet/deposit/return/loading.tsx").includes('<I.clock s={14} className="shrink-0 text-transparent" />') }));

  // 4.7 · the held capsule: lock pulled by its gap, so lock and caption centre between the rings.
  const lock = -expected("lock", 16, "start")!.px;
  const inter = F("Inter-Regular");
  const rsb = (ch: string, size: number) => { const g = inter.glyphForCodePoint(ch.codePointAt(0)!) as unknown as { advanceWidth: number; bbox: { maxX: number } }; return (g.advanceWidth - g.bbox.maxX) / inter.unitsPerEm * size; };
  const pad = Number(new RegExp(`padding: 0 ([0-9]+)px`).exec(rule(".kp-jbal"))?.[1] ?? NaN);
  const left = pad, rights = { sw: pad + rsb("a", 11), en: pad + rsb("n", 11) };
  // The capsule's file also holds the frozen classic capsule (r7c §6.2, byte for byte), so the pull is the journey-only
  // class's, written as its derivation: x0 of the lock's ink × its size / 24 — read back here from the drawing and the call.
  const lockX0 = inkBox(partsOf("lock")).x0;
  const lockCss = new RegExp("margin-inline-start: calc[(]-([0-9.]+) [*] ([0-9]+)px / 24[)];").exec(rule(".kp-jbal__lock"));
  const lockCall = code("src/components/layout/wallet-balance-pill.tsx").includes('{held && <I.lock s={16} className="kp-jbal__lock" />}');
  const engineLock = marginOf(render(h(I.lock, { s: 16, edge: "start" })));
  ok(`4.7 · the held capsule: the lock's ink starts on the ${pad}px padding — pulled by calc(-${lockCss?.[1]} × ${lockCss?.[2]}px / 24), the lock's own ink start (x${lockX0.toFixed(2)}) at its 16px, the engine's edge number (${engineLock?.px}px) — so its contents centre within ${Math.max(...Object.values(rights).map((r) => Math.abs(r - left) / 2)).toFixed(2)}px (sw "…limegandishwa", en "…frozen"); they sat ${(lock / 2).toFixed(2)}px right`,
    near(lock, 2.7, 1e-9) && !!lockCss && near(Number(lockCss[1]), lockX0, 1e-9) && Number(lockCss[2]) === 16 && lockCall
      && !!engineLock && near(-Number(lockCss[1]) * 16 / 24, engineLock.px, 0.0015) && Object.values(rights).every((r) => Math.abs(r - left) / 2 < 0.5), j({ rights, lockCss: lockCss?.slice(1), lockCall, engineLock }));
  // 4.8 · the language row's chevron turns about its box: the turn steps back by the difference of the two reaches.
  const down = inkBox(partsOf("chevronDown")), right = inkBox(partsOf("chevronRight"));
  const step = ((down.x1 - down.x0) / 2 - (right.x1 - 12)) * 18 / 24;
  ok(`4.8 · the hub's language row, open: its turned chevron reaches ${((down.x1 - down.x0) / 2).toFixed(2)} units from its centre against ${(right.x1 - 12).toFixed(2)} closed, so the turn steps back ${step}px and ends on the same edge`,
    near(step, 2.25, 1e-9) && CSS.includes(".kp-hub__lang[open] > summary .kp-hub__chev { transform: translateX(-2.25px) rotate(90deg); }"));
  ok("4.9 · the typed margins the rule replaces are gone: the back link's 3px and the source link's 2px",
    !code("src/components/ui/back-link.tsx").includes("-ml-[3px]") && !code("src/app/markets/[id]/page.tsx").includes("-mr-[2px]"));
}

/* ── 4.10 · THE CENSUS: every edge mark on a player surface, classified ────────────────────────────────────────────── */
{
  /** Every chevron, arrow and external mark drawn on a player surface: edge (its ink on its run's edge), text (its words'
   *  stroke), or the reason it keeps its box. A new site fails until it is added here with its class. */
  // Round 10 (R10-A6) moved this pin: a centred control frames its INK, so a Button slot's mark is pulled onto the button's
  // padding by the slot itself at render (`edgeGlyph`, button.tsx) and its SOURCE carries the stroke alone; a hand-built
  // control's mark carries `edge` in its source (kind `text`). R9-A's reason — the spinner's swap — did not hold: Button's
  // spinner was already 2px narrower than its glyph at lg (test:visual-pass-r10 §A6).
  const B = "a Button slot's mark: the slot pulls its ink onto the button's padding at render (edgeGlyph, R10-A6), so its source carries the stroke alone";
  /** Each site's kind says what it must carry: `row` and `ghost` an edge (a row's end mark keeps the family's stroke),
   *  `text` an edge and its words' stroke, `button` and `float-text` the stroke alone (no edge to land on), `float-row`,
   *  `alone` and `frozen` neither. */
  type Kind = "row" | "ghost" | "text" | "button" | "float-text" | "float-row" | "alone" | "frozen";
  const SITES: Array<[string, string, number, Kind, string]> = [
    ['src/app/account/page.tsx', '<I.externalLink s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's staff row end"],
    ['src/app/agent/apply/apply-client.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", B],
    ['src/app/agent/apply/loading.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/apply/loading.tsx', '<I.chevronLeft s={14} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/apply/apply-client.tsx', '<I.chevronLeft s={14} text="body-600" />', 1, "button", B],
    ['src/app/agent/loading.tsx', '<I.arrowRight s={16} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/page.tsx', '<I.arrowRight s={16} text="body-600" />', 2, "button", B],
    ['src/app/agent/status/page.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", B],
    ['src/app/auth/admin/page.tsx', '<I.chevronRight s={16} edge="end" className="text-text-subtle group-hover:text-text transition-colors" />', 1, "row", "the player row's end on the staff sign-in"],
    ['src/app/auth/forgot-password/page.tsx', '<I.chevronLeft s={14} edge="start" text="mono-400" />', 1, "text", "a back link's start"],
    ['src/app/auth/login/page.tsx', '<I.arrowRight s={13} edge="end" text="display-700" />', 1, "text", "the error panel's way-on pill's end — round 10 (R10-A6) drew its typed → as the family's arrow at its Sora 700 stem"],
    ['src/app/auth/register/register-form.tsx', '<I.arrowRight s={13} edge="end" text="display-700" />', 1, "text", "the error panel's way-on pill's end — the login page's twin (R10-A6)"],
    ['src/app/auth/reset-password/page.tsx', '<I.chevronLeft s={14} edge="start" text="mono-400" />', 1, "text", "a back link's start"],
    ['src/app/fairness/page.tsx', '<I.ext s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/app/legal/rules/page.tsx', '<I.chevronRight s={14} className="shrink-0 text-text-subtle" />', 1, "frozen", "a rules card's row end — the file is in the published-words population D19a pins byte for byte (test:house-bot-disclosure 5.1) — named for the integrator"],
    ['src/app/markets/[id]/page.tsx', '<I.ext s={11} edge="start" text="mono-400" />', 1, "text", "the source address line's start"],
    ['src/app/markets/[id]/page.tsx', '<I.ext s={12} edge="end" text="mono-400" />', 1, "text", "the source link's end"],
    ['src/app/profile/activity/page.tsx', '<I.chevronRight s={12} edge="end" text="mono-400" />', 1, "text", "a text link's end"],
    ['src/app/profile/kyc/page.tsx', '<I.arrowRight s={13} edge="end" text="display-600" />', 1, "text", "the footer's wallet link's end — round 10 (R10-A6): its typed arrow became the family's"],
    ['src/app/profile/loading.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-transparent" />', 2, "ghost", "the ghost of /profile's row ends, pulled as the page's are"],
    ['src/app/profile/notifications/page.tsx', '<I.chevronRight s={12} edge="end" text="mono-400" />', 1, "text", "a row cue's end, after its count"],
    ['src/app/profile/page.tsx', '<I.chevronRight s={16} edge="end" />', 2, "row", "the setting rows' and the sign-out row's end"],
    ['src/app/proposals/[id]/page.tsx', '<I.arrowRight s={15} text="body-600" />', 1, "button", B],
    ['src/app/proposals/page.tsx', '<I.arrowRight s={12} edge="end" text="mono-400" />', 1, "text", "a link cue's end"],
    ['src/app/proposals/page.tsx', '<I.chevronRight s={14} />', 1, "float-row", "it trails a start-aligned meta row: no edge to land on"],
    ['src/app/updown/page.tsx', '<I.chevronRight s={11} edge="end" text="mono-400" />', 1, "text", "the history pill's end"],
    ['src/app/wallet/receipts/loading.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 rounded bg-bg-overlay/60 text-transparent" />', 1, "ghost", "the ghost of the receipt row's end"],
    ['src/app/wallet/wallet-client.tsx', '<I.chevronRight s={14} edge="end" text="body-600" aria-hidden />', 1, "text", "“Risiti zote ›”"],
    ['src/app/wallet/wallet-client.tsx', '<I.chevronRight s={16} edge="end" className="text-text-subtle" />', 1, "row", "the limits row's end"],
    ['src/components/charts/outcome-cubes.tsx', '<I.arrowRight s={9} />', 1, "alone", "alone in a cube: centred by its box"],
    ['src/components/home/landing-hero.tsx', '<I.arrowRight s={14} edge="end" text="body-600" />', 2, "text", "the home block's two text links"],
    ['src/components/home/landing-hero.tsx', '<I.arrowRight s={16} edge="end" text="body-600" />', 1, "text", "the hero CTA's end: a centred control frames its ink (R10-A6)"],
    ['src/components/home/landing-hero.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/topic-tiles.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/trust-band.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/trust-band.tsx', '<I.externalLink s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/components/home/updown-band.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/updown-band.tsx', '<I.chevronRight s={14} edge="end" text="body-600" />', 3, "text", "the Watch link's end, and the band's two buttons' ends: a centred control frames its ink (R10-A6)"],
    ['src/components/journey/account/hub-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's row end"],
    ['src/components/journey/account/language-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's row end (and its turn, 4.8)"],
    ['src/components/journey/account/unread-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's row end"],
    ['src/components/journey/home/howto-card.tsx', '<I.chevronRight s={20} edge="end" className="kp-jhowto__chev" />', 1, "row", "the journey home's How-to card's end: a door's end mark on its content edge (the Vodacom plan S7, WP6)"],
    ['src/components/layout/avatar-menu.tsx', '<I.arrowRight s={14} className={journey ? "text-brand-300/70 transition-colors group-hover:text-brand-300" : "text-gold-300/70 transition-colors group-hover:text-gold-300"} aria-hidden />', 1, "frozen", "the account menu is classic chrome, frozen until the flip — named for the integrator"],
    ['src/components/layout/needle-drawer.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's Needle row end"],
    ['src/components/layout/notifications-panel.tsx', '<I.chevronRight s={11} />', 1, "frozen", "the bell is frozen (qa:bell-untouched) — named for the integrator"],
    ['src/components/markets/market-card.tsx', '<I.chevronRight s={11} edge="end" text="display-600" />', 1, "text", "“Maelezo ›”"],
    ['src/components/markets/market-card.tsx', '<I.chevronRight s={12} edge="end" text="body-400" />', 1, "text", "the rules link's end"],
    ['src/components/markets/resolution-panel.tsx', '<I.ext s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/components/markets/side-picker.tsx', '<I.chevronLeft s={10} text="mono-400" />', 1, "float-text", "it leads a right-aligned change-side link: no edge to land on, its words' stroke"],
    ['src/components/onboarding/first-visit-primer.tsx', '<I.chevronRight s={14} edge="end" text="body-600" />', 1, "text", "the primer's Next: a centred control frames its ink (R10-A6)"],
    ['src/components/proposals/proposals-state-views.tsx', '<I.arrowRight s={15} text="body-600" />', 1, "button", B],
    ['src/components/proposals/proposals-state-views.tsx', '<I.chevronLeft s={15} text="body-600" />', 1, "button", B],
    ['src/components/ui/back-link.tsx', '<I.chevronLeft s={11} edge="start" text="mono-400" />', 1, "text", "the back link's start"],
    ['src/components/ui/date-select.tsx', '<I.chevronLeft s={16} />', 1, "alone", "alone in a control: centred by its box"],
    ['src/components/ui/date-select.tsx', '<I.chevronRight s={16} />', 1, "alone", "alone in a control: centred by its box"],
    ['src/components/ui/not-found-view.tsx', '<I.arrowRight s={12} edge="end" text="mono-400" />', 1, "text", "a centred link's end (centred by its ink)"],
    ['src/components/ui/not-found-view.tsx', '<I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />', 1, "alone", "alone on a plate: centred by its box"],
    ['src/components/ui/pagination.tsx', '<I.chevronLeft s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronRight s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronsLeft s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronsRight s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/propose-promo.tsx', '<I.arrowRight s={18} edge="end" />', 1, "row", "the promo card's row end"],
    ['src/components/ui/route-error.tsx', '<I.arrowRight s={14} edge="end" text="body-600" />', 1, "text", "the error view's way-back button's end: a centred control frames its ink (R10-A6)"],
    ['src/components/updown/updown-card.tsx', '<I.chevronRight s={10} text="mono-600" />', 1, "button", B],
    ['src/components/wallet/receipt-list-row.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle transition-colors duration-quick group-hover:text-text" aria-hidden />', 1, "row", "the receipt row's end"],
  ];
  const MARK = new RegExp("<I[.](?:chevronRight|chevronLeft|chevronsRight|chevronsLeft|arrowRight|ext|externalLink)(?![A-Za-z])(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?/>", "g");
  const seen = new Map<string, number>();
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(MARK)) { const k = `${f} ${squash(m[0])}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  const listed = new Map(SITES.map(([f, el, n]) => [`${f} ${el}`, n]));
  const unlisted = [...seen].filter(([k]) => !listed.has(k));
  const missing = [...listed].filter(([k, n]) => seen.get(k) !== n);
  ok(`4.10 · every chevron, arrow and external mark on a player surface is classified — ${[...seen.values()].reduce((a, b) => a + b, 0)} marks at ${seen.size} spellings: ${SITES.filter((s) => s[1].includes("edge=")).reduce((a, s) => a + s[2], 0)} on their run's edge, ${SITES.filter((s) => s[1].includes(" text=")).reduce((a, s) => a + s[2], 0)} at their words' stroke, the rest keeping their box for a stated reason`,
    unlisted.length === 0 && missing.length === 0, j({ unlisted, missing }));
  // A mark between words or in a button keeps its box but takes its words' stroke: every one that sits in a run of words
  // carries `text` (the icon-only controls, the plate, the cube and the two frozen files excepted).
  const WANT: Record<Kind, [boolean, boolean]> = { row: [true, false], ghost: [true, false], text: [true, true], button: [false, true], "float-text": [false, true], "float-row": [false, false], alone: [false, false], frozen: [false, false] };
  const wrong = SITES.filter(([, el, , kind]) => el.includes(" edge=") !== WANT[kind][0] || el.includes(" text=") !== WANT[kind][1]);
  ok("4.11 · each site carries what its kind says — a row end its edge in the family's stroke, a mark in words its words' stroke (with the edge where its run has one), a button's mark the stroke alone", wrong.length === 0, j(wrong));
  const planted = new Map(seen); planted.set("src/components/markets/market-card.tsx <I.chevronRight s={11} />", 1); planted.delete('src/components/markets/market-card.tsx <I.chevronRight s={11} edge="end" text="display-600" />');
  ok("4.10′ PLANT · “Maelezo ›” without its edge (the old element) is an unclassified site", [...planted].some(([k]) => !listed.has(k)));

  // 4.12 · eyebrow glyphs: a glyph that leads an eyebrow line stands on the column's edge.
  const EYEBROW_FIRST = new RegExp(`className="[^"]*eyebrow[^"]*"[^>]*>${WS}*<I[.]([A-Za-z]+)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)/>`, "g");
  const EYEBROW_NEXT = new RegExp(`<I[.]([A-Za-z]+)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)/>${WS}*<p[^>]*className="[^"]*eyebrow`, "g");
  const KEEP_EYEBROW: Record<string, string> = {
    "src/components/profile/password-section.tsx": "one key glyph in the two states of one control (the closed row and the open form) — it holds its card's icon column",
    "src/app/legal/layout.tsx": "the legal head's eyebrow — the file is in the published-words population D19a pins byte for byte (test:house-bot-disclosure 5.1) — named for the integrator",
    "src/components/ui/unsaved-changes.tsx":"the console's pending-changes bar (its SAVED word): admin pages only — players meet only the guard dialog",
  };
  const eyebrows: Array<{ f: string; g: string; edge: boolean }> = [];
  for (const f of PLAYER_TSX) {
    const c = code(f);
    for (const re of [EYEBROW_FIRST, EYEBROW_NEXT]) for (const m of c.matchAll(re)) eyebrows.push({ f, g: m[1], edge: m[2].includes('edge="start"') });
  }
  const loose = eyebrows.filter((e) => !e.edge && !(e.f in KEEP_EYEBROW));
  ok(`4.12 · every glyph that leads an eyebrow line puts its ink on the column's edge — ${eyebrows.length} hand-drawn eyebrows (${[...new Set(eyebrows.map((e) => e.g))].join(", ")}), plus every PageHeader and AuthHeader by their slot; the password section's key keeps its column`,
    eyebrows.length >= 10 && loose.length === 0, j(loose));
}

/* ══ §5 · A5 · ONE 12px GAP FOR A PAIR OF BUTTONS ═══════════════════════════════════════════════════════════════════════ */
section("5 · A5 every pair of buttons stands 12px apart — the card's YES/NO and the home rows' included — and the labels fit at 320");
{
  const sp3 = tokenPx("--sp-3"), sp2 = tokenPx("--sp-2");
  ok(`5.1 · the card's pair and the home rows' pair stand on --sp-3 (${sp3}px), the card's buttons pad --sp-2 (${sp2}px) a side`,
    sp3 === 12 && sp2 === 8 && rule(".mcardp-actions").includes("gap: var(--sp-3);") && rule(".kp-qrow__act").includes("gap: var(--sp-3);")
      && rule(".mcardp-actions .btn").includes("padding: 0 var(--sp-2);"));
  // The census: every element whose own children hold two or more buttons (a `btn` class, a Button, a SubmitButton).
  const TAGRE = new RegExp("<([a-zA-Z][A-Za-z0-9_.]*)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)(/?)>|</([a-zA-Z][A-Za-z0-9_.]*)>", "g");
  const CLS = new RegExp('className=(?:"([^"]*)"|[{]`([^`]*)`[}])');
  const isBtn = (tag: string, a: string) => tag === "Button" || tag === "SubmitButton" || (new RegExp("[ " + QUOTE + "'" + BACKTICK + "]btn[ " + QUOTE + "'" + BACKTICK + "]").test(` ${a} `) && a.includes("btn-"));
  const pairs: Array<{ f: string; line: number; cls: string; n: number }> = [];
  for (const f of PLAYER_TSX) {
    const src = code(f);
    const stack: Array<{ tag: string; cls: string; line: number; n: number }> = [];
    for (const m of src.matchAll(TAGRE)) {
      if (m[4]) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === m[4]) { if (stack[i].n >= 2) pairs.push({ f, ...stack[i] }); stack.length = i; break; }
        continue;
      }
      const c = CLS.exec(m[2] ?? "");
      if (isBtn(m[1], m[2] ?? "") && stack.length) stack[stack.length - 1].n++;
      if (m[3] !== "/") stack.push({ tag: m[1], cls: c ? (c[1] ?? c[2] ?? "") : "", line: src.slice(0, m.index).split(NL).length, n: 0 });
    }
  }
  const CSS_PAIRS: Record<string, string> = { "mcardp-actions": ".mcardp-actions", "kp-qrow__act": ".kp-qrow__act", "kp-wsheet__pair": ".kp-wsheet__pair", "kp-hero__ctas": ".kp-hero__ctas" };
  const KEEP_PAIR: Array<[string, string, string]> = [
    ["src/app/agent/apply/apply-client.tsx", "flex items-center justify-between", "Back and Next at the row's two ends (`justify-between`): the gap is a floor, not their distance"],
    ["src/components/onboarding/first-visit-primer.tsx", "mt-6 flex items-center justify-between gap-3", "Back and Next at the row's two ends"],
    ["src/components/home/updown-band.tsx", "", "the score plate's two halves: its 4px gap is the plate's own 4px inset (concentric radii, G2), not a pair"],
    ["src/components/journey/journey-top-bar.tsx", "kp-jhdr__cluster", "the header's control cluster, on the header's own gaps"],
    ["src/app/profile/kyc/page.tsx", "", "either one button or the other (a condition), never two side by side"],
    ["src/app/profile/kyc/page.tsx", "rounded-xl border border-success-border bg-bg-elevated p-5 lg:p-6 text-center", "two branches of one condition"],
    ["src/app/profile/security/security-client.tsx", "rounded-xl glass-panel p-5 space-y-4", "a section's stacked rows, not a pair"],
    ["src/app/updown/history/page.tsx", "mt-6", "two branches of one condition"],
    ["src/app/watchlist/page.tsx", "space-y-5", "a page's stacked sections, not a pair"],
    // The Vodacom plan S7 (WP7, 2026-10-12): the journey home's column holds Onyesha zaidi under the list, or (the list
    // empty) an empty category's way out inside the kit's EmptyState — never both.
    ["src/components/journey/home/journey-home.tsx", "kp-jhome", "two branches of one condition"],
  ];
  const at12 = (cls: string) => new RegExp("(?:^| )gap(?:-x)?-2(?: |$)").test(cls) || Object.keys(CSS_PAIRS).some((k) => cls.split(" ").includes(k) && rule(CSS_PAIRS[k]).includes("gap: var(--sp-3)"));
  const kept = (p: { f: string; cls: string }) => KEEP_PAIR.some(([f, cls]) => f === p.f && cls === p.cls);
  const offPairs = pairs.filter((p) => !at12(p.cls) && !kept(p));
  ok(`5.2 · every pair of buttons on a player surface stands 12px apart (gap-2 on the override scale, or a pair class on --sp-3) — ${pairs.length} containers, ${pairs.filter((p) => kept(p)).length} named for what they are instead (ends of a row, a plate, a cluster, branches)`,
    pairs.length >= 35 && offPairs.length === 0, j(offPairs));
  ok("5.2′ · the error view's pair is on `gap-2` — it stood on the stock 10px step, which R6-C's large-button census could not see (its buttons are `btn-md`)",
    code("src/components/ui/route-error.tsx").includes('<div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">'));
  const plantedPairs = [{ f: "src/components/ui/route-error.tsx", cls: "mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center" }, { f: "x.tsx", cls: "grid grid-cols-2 gap-1.5" }];
  ok("5.2″ PLANT · a 10px pair (the stock 2.5 step) and an 8px pair (1.5) are each reported", plantedPairs.every((p) => !at12(p.cls) && !kept(p)));

  // 5.3 · the labels at 320, by the fonts' own advances (no kerning: Inter's kerning only tightens these pairs, so this is
  // an upper bound), every character's tracking counted (a browser adds it after the last one too).
  const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { advanceWidth: number } } };
  const fMed = fontkit.openSync("src/lib/server/reports/fonts/Inter-Medium.ttf"), fBold = fontkit.openSync("src/lib/server/reports/fonts/Inter-Bold.ttf");
  const adv = (f: typeof fMed, s: string, size: number) => [...s].reduce((w, ch) => w + (ch.codePointAt(0)! >= 0x3400 ? size : f.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / f.unitsPerEm * size), 0);
  const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, { common: Record<string, string>; market: Record<string, string> }> };
  const words = ["sw", "en", "zh"].flatMap((l) => [dict[l].common.yes, dict[l].common.no, dict[l].market.udUp, dict[l].market.udDown]);
  const PRICE = " @ 99%";
  // The card: Inter 600 13px (Medium and Bold advances averaged), 0.04em = 0.52px tracking inherited by the 11.5px mono price.
  const cardLabel = (w: string, price: boolean) => (adv(fMed, w, 13) + adv(fBold, w, 13)) / 2 + [...w].length * 0.52 + (price ? PRICE.length * (0.6 * 11.5 + 0.52) : 0);
  const content320 = 320 - 2 * 16 - 2 * 1 - 2 * 15;
  const btn = (content320 - sp3) / 2;
  const room = btn - 2 * sp2 - 2 * 1, roomOld = btn - 2 * 10 - 2 * 1;
  const widest = Math.max(...words.flatMap((w) => [cardLabel(w, false), cardLabel(w, true)]));
  ok(`5.3 · at 320 each of the card's buttons is ${btn}px (the content box ${content320}px less 12) and leaves its label ${room}px; the widest label, Swahili's priced "HAPANA @ 99%", is ${widest.toFixed(2)}px — it fits, ${((btn - 2 - widest) / 2).toFixed(2)}px from each border`,
    content320 === 256 && btn === 122 && widest <= room && widest > 100);
  ok(`5.3′ CONTROL · at the old 10px padding the same label ran ${(widest - roomOld).toFixed(2)}px into it (room ${roomOld}px) — the padding is part of the fit, not decoration`, widest > roomOld);
  // The home rows: 288px at 320 (the rule's own note), Inter 700 14px tracked 0.06em = 0.84px, a 13px mono price, 8px padding.
  const rowLabel = (w: string, price: boolean) => adv(fBold, w, 14) + [...w].length * 0.84 + (price ? PRICE.length * (0.6 * 13 + 0.84) : 0);
  const half = (288 - sp3) / 2, rowRoom = half - 2 * 8 - 2;
  const rowWidest = Math.max(...["sw", "en", "zh"].flatMap((l) => [dict[l].common.yes, dict[l].common.no]).flatMap((w) => [rowLabel(w, false), rowLabel(w, true)]));
  ok(`5.4 · the home rows' halves are ${half}px at 320 and the widest label is ${rowWidest.toFixed(2)}px (Inter Bold — the weight it is set in — no kerning) against ${rowRoom}px`, rowWidest <= rowRoom);
}

/* ══ §6 · A6 · EVERY DASHED TRACK STARTS AND ENDS ON A WHOLE DASH ══════════════════════════════════════════════════════ */
section("6 · A6 a dashed track starts and ends on a whole dash at every width — one rule (`.kp-dashfit`), and every sibling");
{
  ok("6.1 · `.kp-dashfit` lays whole tiles with `space` on a layer one gap past its host's end, clipped by the host",
    rule(".kp-dashfit").includes("overflow: hidden;")
      && rule(".kp-dashfit::before").includes("inset-inline-end: calc(var(--dash-len) - var(--dash-pitch));")
      && rule(".kp-dashfit::before").includes("background: var(--dash-tile) 0 0 / var(--dash-pitch) 100% space no-repeat;"));
  // The model of `background-repeat: space` on an area of W + (pitch − dash): n whole tiles, the first at 0, the last ending
  // its dash at W, the spare width shared between them.
  const fit = (W: number, dash: number, pitch: number) => {
    const area = W + pitch - dash, n = Math.floor(area / pitch), s = n > 1 ? (area - n * pitch) / (n - 1) : 0;
    return { n, lastEnd: (n - 1) * (pitch + s) + dash, gap: pitch - dash + s };
  };
  const widths = Array.from({ length: 1300 }, (_, i) => 40 + i);
  const bad = (dash: number, pitch: number) => widths.filter((W) => { const r = fit(W, dash, pitch); return !(r.n >= 2 && near(r.lastEnd, W, 1e-9) && r.gap >= pitch - dash - 1e-9); });
  const r362 = fit(362, 8, 15);
  ok(`6.2 · at every width from 40 to 1339px both tracks end their last dash on the edge with gaps never under their own — the board's one-sided rail at 362px: ${r362.n} dashes, ${r362.gap.toFixed(2)}px apart`,
    bad(8, 15).length === 0 && bad(2, 7).length === 0 && r362.n === 24, j({ rail: bad(8, 15).slice(0, 5), locked: bad(2, 7).slice(0, 5) }));
  ok("6.2′ CONTROL · the old pattern, repeated from the left end, ended the 362px rail on a 2px stub (362 = 24 × 15 + 2)", 362 % 15 === 2 && 362 % 15 < 8);
  const tok = new RegExp(`--bar-empty-track:${WS}*([^;]*);`).exec(CSS)?.[1] ?? "";
  ok("6.3 · the rail's token is ONE dash tile (no repeating gradient), and `.tipbar-empty` lays it by the rule: positioned, its three variables, its 1px ring over the dashes",
    tok === "linear-gradient(90deg, var(--border-strong) 0 8px, transparent 8px)" && tokenPx("--bar-empty-dash") === 8 && tokenPx("--bar-empty-pitch") === 15
      && rule(".tipbar-empty").includes("position: relative;") && rule(".tipbar-empty").includes("--dash-tile: var(--bar-empty-track);")
      && rule(".tipbar-empty").includes("--dash-len: var(--bar-empty-dash);") && rule(".tipbar-empty").includes("--dash-pitch: var(--bar-empty-pitch);")
      && !rule(".tipbar-empty").includes("background") && rule(".tipbar-empty::after").includes("box-shadow: inset 0 0 0 1px var(--border);")
      && code("src/components/brand.tsx").includes('className="tipbar-empty kp-dashfit"'));
  ok("6.4 · Up & Down's locked stretch is an html line of the same rule — whole 2px dashes on a 7px pitch, post to post, in its own ink and 0.55 — no svg line dashes it any more",
    code("src/components/charts/updown-match-track.tsx").includes('<span className="kp-udtrack__locked kp-dashfit" style={at(g.gatePct)} />')
      && !code("src/components/charts/updown-match-track.tsx").includes('<line className="kp-udtrack__locked"')
      && ["position: absolute;", "left: calc(var(--x) + 0.5px);", "right: 0.5px;", "height: 1px;", "color: var(--text-subtle);", "opacity: 0.55;", "--dash-len: 2px;", "--dash-pitch: 7px;", "--dash-tile: linear-gradient(90deg, currentColor 0 2px, transparent 2px);"].every((d) => rule(".kp-udtrack__locked").includes(d)));
  // Fixed-length dashed lines (in a viewBox) end on a whole dash by their numbers; a dashed circle by `pathLength`.
  const wholeEnd = (len: number, dash: number, gap: number) => { const r = len % (dash + gap); return near(r, 0, 1e-9) || r >= dash - 1e-9; };
  const pnl = code("src/components/charts/pnl-chart.tsx");
  const X0 = Number(new RegExp("const X0 = ([0-9.]+)").exec(pnl)?.[1]), X1 = Number(new RegExp("X1 = ([0-9.]+)").exec(pnl)?.[1]);
  const hero = code("src/components/updown/price-hero.tsx");
  const heroLines = [...hero.matchAll(new RegExp('x1="0" y1=[{][A-Za-z]+[}] x2="([0-9.]+)" y2=[{][A-Za-z]+[}][^>]*strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))];
  const pnlLines = [...pnl.matchAll(new RegExp('strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))];
  ok(`6.5 · the P&L chart's three dashed lines (${X1 - X0} units) and the price hero's three (${heroLines.map((m) => m[1]).join(", ")} units) each end on a whole dash`,
    pnlLines.length === 3 && pnlLines.every((m) => wholeEnd(X1 - X0, Number(m[1]), Number(m[2]))) && heroLines.length === 3 && heroLines.every((m) => wholeEnd(Number(m[1]), Number(m[2]), Number(m[3]))));
  const circlePeriods = (src: string) => [...src.matchAll(new RegExp('<circle[^>]*pathLength=[{"]?([0-9.]+)[}"]?[^>]*strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))].map((m) => Number(m[1]) / (Number(m[2]) + Number(m[3])));
  const rings = [...circlePeriods(code("src/components/brand.tsx")), ...circlePeriods(raw("src/components/ui/glyphs.tsx"))];
  ok(`6.6 · every dashed ring closes on whole dashes by pathLength — the dial's empty ring and clockPending: ${rings.map((p) => `${p} periods`).join(", ")}`,
    rings.length === 2 && rings.every((p) => near(p, Math.round(p), 1e-9)));
  ok("6.6′ PLANT · clockPending as it was — 3.4 + 3 on its 54.04-unit ring, no pathLength — is 8.44 periods", !near((2 * Math.PI * 8.6) / 6.4, Math.round((2 * Math.PI * 8.6) / 6.4), 1e-3));
  // The census: every dash pattern on a player surface is one of these, or not a pattern at all (a ring's progress arc, a
  // draw-on), or a texture.
  const DASHES = new RegExp("strokeDasharray|stroke-dasharray|repeating-linear-gradient|repeating-radial-gradient", "g");
  const KNOWN: Record<string, string> = {
    "src/components/charts/pnl-chart.tsx": "three fixed lines, 6.5", "src/components/updown/price-hero.tsx": "three fixed lines, 6.5",
    "src/components/brand.tsx": "the dial's empty ring by pathLength, 6.6", "src/components/ui/glyphs.tsx": "clockPending by pathLength, 6.6",
    "src/components/badges/Badge.tsx": "a progress arc (dasharray = its circumference), not a pattern", "src/components/charts/ring.tsx": "donut segments, not a pattern",
    "src/components/positions/countdown-ring.tsx": "a progress arc, not a pattern",
  };
  const found = PLAYER_TSX.filter((f) => DASHES.test(code(f)));
  DASHES.lastIndex = 0;
  const cssDashes = [...CSS.matchAll(new RegExp("[^;{}]*(?:stroke-dasharray|repeating-(?:linear|radial)-gradient)[^;]*;", "g"))].map((m) => squash(m[0]));
  const CSS_KNOWN = [new RegExp("mcardp-spark-line|stroke-dasharray:1;|stroke-dasharray: ?1;|stroke-dasharray:none"), new RegExp("repeating-linear-gradient[(](?:45|-45)deg, transparent 0 22px"), new RegExp("repeating-radial-gradient")];
  ok(`6.7 · every dash pattern on a player surface is accounted for — ${found.length} files and ${cssDashes.length} stylesheet declarations: fitted tracks, fixed lines, rings, progress arcs, a draw-on and two textures`,
    found.every((f) => f in KNOWN) && cssDashes.every((d) => CSS_KNOWN.some((re) => re.test(d))) && !CSS.includes("repeating-linear-gradient(90deg"), j({ files: found.filter((f) => !(f in KNOWN)), css: cssDashes.filter((d) => !CSS_KNOWN.some((re) => re.test(d))) }));
}

/* ══ §7 · NO DICTIONARY WORD CHANGED ════════════════════════════════════════════════════════════════════════════════════ */
section("7 · composition only: the dictionary is the commit's, byte for byte");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).split(CR).join(""); } catch { head = "‹git unavailable›"; }
  ok("7.1 · src/lib/i18n-dict.ts is the commit's own", head === raw("src/lib/i18n-dict.ts"));
}

console.log(`${NL}visual-pass-r9a: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log(`${NL}FAILURES:`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
