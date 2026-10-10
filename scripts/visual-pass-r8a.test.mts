/**
 * ROUND 8 OF THE VISUAL PASS, HELPER A (2026-10-10) — WARNINGS AMBER, LINKS BLUE: Ali's rulings (1) and (2) of the day.
 *
 *   npx tsx scripts/visual-pass-r8a.test.mts        (npm run test:visual-pass-r8a)
 *
 * (1) "WARNINGS ARE AMBER, NOT GOLD — gold means money only" (owner item 28). Until today `--warning-fg` WAS `--gilt`
 *     (DESIGN_AUTHORITY F3), so a refused sign-in, "more information needed" and a withdrawal hold were painted in the ink
 *     that means money EARNED. The warning family is one amber now — `--warning-500` oklch(74% 0.15 64) and `--warning-fg`
 *     oklch(82% 0.13 64) — and every warning paint reads it.
 * (2) "EVERY LINK IS BLUE — the five aqua links become the blue link ink" (owner item 58). The link ink is the one most
 *     links already wore, `--brand-300` (hover `--brand-200` or an underline); every text link draws it (§B4c).
 *
 *   §1  the amber family — one hue (64) for every stop, off gilt's 84 and danger's 25, saturated past the gold ramp, in
 *       gamut; AA on every surface it lands on, on its own wash and the chip's fill, and as a mark
 *   §2  every warning paint reads the family — the toast, the chip (warning · paused), the Callout and its maintenance
 *       amber, the badge, NoticeBar, Dot, the result crest, the limit ramp, the password meter, the fee row, the apply
 *       slot; rendered where a component renders; and ONE amber word ink
 *   §3  the WARNING census — every warning-family paint in the player's code, file by file, each with its §B11 ruling
 *       (moved here, whole, from R5-C's gold census when the family left gold); nothing paints a warning in gold
 *   §4  the guards that pinned F3 agree, and the record is written (DESIGN_AUTHORITY F3, F3a, Q5, §B4c; globals.css)
 *   §5  THE LINK CENSUS — every <Link>, <a> and link-drawn <button> in the player's code, read by AST: a text link draws
 *       the link ink at rest and on hover, aqua is never a link's ink, and the one held exception is counted by name
 *   §6  the sites the ruling moved, pinned one by one (the five aqua links and the bell's, the gold door, the state and
 *       royal and muted links, /live's title hovers, the chat's citations, the link tokens)
 * The mutation proof (each defect planted on disk, this suite failing on its check, the file restored byte-identical) is
 * the scratchpad's `r8/a/mutation-r8a.py`; its result is in R8-A's report.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { Callout, MAINTENANCE_AMBER } from "../src/components/ui/callout.tsx";
import { Chip } from "../src/components/ui/chip.tsx";
import { MaintenanceBadge } from "../src/components/ui/maintenance-badge.tsx";
import { Dot } from "../src/components/ui/dot.tsx";
import { LimitUsageMeter, limitUsageFill } from "../src/components/rg/limit-usage.tsx";
import { TONE_CHIP, TONE_INK } from "../src/lib/status-tone.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};
const note = (s: string) => console.log(`       ${s}`);
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const ROOT = process.cwd().replace(/\\/g, "/");
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS = decommentCss(raw("src/app/globals.css"));
const MOTION = decommentCss(raw("src/app/motion.css"));
const CHAT = decommentCss(raw("src/styles/chat/chat-styles.css"));
const html = (node: ReactNode) => renderToStaticMarkup(h(Fragment, null, node));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The body of the CSS rule whose selector is EXACTLY `sel`. */
const rule = (css: string, sel: string): string => {
  const m = new RegExp(`(?:^|\\n|\\})\\s*${esc(sel)}\\s*\\{`).exec(css);
  if (!m) return "";
  const open = m.index + m[0].length;
  return css.slice(open, css.indexOf("}", open));
};
/** Out of the player's code, ruled once (R5-C): the console, server artefacts (OG images, e-mail, reports), campaign tooling. */
const OUT_OF_SCOPE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const walk = (d: string, ext: RegExp): string[] => readdirSync(join(ROOT, d)).flatMap((n) => {
  const p = `${d}/${n}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p, ext) : ext.test(n) ? [p] : [];
});
const PLAYER = (ext: RegExp) => walk("src", ext).filter((f) => !OUT_OF_SCOPE.test(f));

/* ══ COLOUR — OKLCH to sRGB, WCAG ratios, the browser's two blends ══════════════════════════════════════════════════════ */
type RGB = [number, number, number];
type Ok = { L: number; C: number; H: number };
const toLinear = ({ L, C, H }: Ok): RGB => {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const dec = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const srgb = (o: Ok): RGB => toLinear(o).map((c) => enc(clamp01(c))) as RGB;
const inGamut = (o: Ok) => toLinear(o).every((c) => c >= -1e-4 && c <= 1 + 1e-4);
const lum = (c: RGB) => 0.2126 * dec(c[0]) + 0.7152 * dec(c[1]) + 0.0722 * dec(c[2]);
const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** An alpha colour painted over its surface — the compositor's blend, in gamma-encoded sRGB (test:contrast's §P proof). */
const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
const toOklab = (c: RGB): [number, number, number] => {
  const [r, g, b] = c.map(dec);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
/** `color-mix(in oklab, a p, b)` for two OPAQUE colours — the other blend, the one the CSS asks for at those sites. */
const mixOklab = (a: RGB, p: number, b: RGB): RGB => {
  const A = toOklab(a), B = toOklab(b);
  const [L, x, y] = A.map((v, i) => v * p + B[i] * (1 - p));
  const C = Math.hypot(x, y), H = (Math.atan2(y, x) * 180) / Math.PI;
  return srgb({ L, C, H });
};
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

/** A token's ONE declaration in globals.css (comment-stripped), or the count when there is not exactly one. */
const decl = (name: string, css = CSS): string => {
  const all = [...css.matchAll(new RegExp(`(?:^|[\\s;{])--${esc(name)}:\\s*([^;]+);`, "g"))];
  return all.length === 1 ? all[0][1].trim().replace(/\s+/g, " ") : `<${all.length} declarations>`;
};
const okOf = (v: string): Ok | null => {
  const m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(v.trim());
  return m ? { L: Number(m[1]) / 100, C: Number(m[2]), H: Number(m[3]) } : null;
};
const token = (name: string, css = CSS, depth = 0): Ok => {
  const v = decl(name, css);
  const via = /^var\(--([\w-]+)\)$/.exec(v);
  if (via && depth < 6) return token(via[1], css, depth + 1);
  const o = okOf(v);
  if (!o) throw new Error(`--${name} unreadable: ${v}`);
  return o;
};
const stops = (name: string): Ok[] =>
  [...decl(name).matchAll(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g)].map((m) => ({ L: Number(m[1]) / 100, C: Number(m[2]), H: Number(m[3]) }));
const show = (o: Ok) => `oklch(${+(o.L * 100).toFixed(2)}% ${o.C} ${o.H})`;

/* ══ §1 · THE AMBER FAMILY ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · the amber family — one hue for every stop, off gilt and off danger, in gamut, AA everywhere it lands");
const FG = token("warning-fg"), STOP = token("warning-500");
const GILT = token("gilt"), GOLD500 = token("gold-500"), DANGER = token("danger-500");
{
  ok("1.1 · the family is defined ONCE each, in globals.css: the stop and the ink as literals, the rest derived from the stop",
    okOf(decl("warning-500")) !== null && okOf(decl("warning-fg")) !== null && decl("warning") === "var(--warning-500)"
      && decl("warning-bg") === "color-mix(in oklab, var(--warning-500) 18%, transparent)"
      && decl("warning-border") === "color-mix(in oklab, var(--warning-500) 36%, transparent)",
    ["warning-500", "warning-fg", "warning", "warning-bg", "warning-border"].map((n) => `--${n}: ${decl(n)}`).join(" · "));
  ok("1.1′ · …and never an alias of the money ink: `--warning-fg` is not `var(--gilt)` (or any gold name) any more",
    !/gilt|gold/.test(decl("warning-fg")) && !/gilt|gold/.test(decl("warning-500")));
  note(`the amber: --warning-500 ${show(STOP)} (sRGB #${srgb(STOP).map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}) · --warning-fg ${show(FG)} (#${srgb(FG).map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase()})`);
  note(`the gold:  --gilt ${show(GILT)} · --gold-500 ${show(GOLD500)} · the danger: --danger-500 ${show(DANGER)}`);
  ok("1.2 · ONE hue for the family's stops — the ink and the stop share it, as `--success-*` (166) and `--danger-*` (25) do",
    FG.H === STOP.H, `${FG.H} / ${STOP.H}`);
  /** The hue rule the ruling asks for: an amber no eye reads as gold, nor as a failure. */
  const amberRule = (fg: Ok, stop: Ok) => {
    const why: string[] = [];
    for (const [n, o] of [["ink", fg], ["stop", stop]] as Array<[string, Ok]>) {
      if (hueGap(o.H, GILT.H) < 18) why.push(`the ${n}'s hue ${o.H} is ${hueGap(o.H, GILT.H).toFixed(1)}° from gilt's ${GILT.H} (< 18)`);
      if (hueGap(o.H, GOLD500.H) < 18) why.push(`the ${n}'s hue ${o.H} is ${hueGap(o.H, GOLD500.H).toFixed(1)}° from --gold-500's ${GOLD500.H} (< 18)`);
      if (hueGap(o.H, DANGER.H) < 30) why.push(`the ${n}'s hue ${o.H} is ${hueGap(o.H, DANGER.H).toFixed(1)}° from --danger's ${DANGER.H} (< 30)`);
      if (o.H < 55 || o.H > 70) why.push(`the ${n}'s hue ${o.H} is outside the amber band 55–70`);
      if (o.C >= 0.04 && o.H >= 70 && o.H < 100) why.push(`the ${n} is GOLD by the gold census's own rule (hue 70–100, chroma ≥ 0.04)`);
    }
    return why;
  };
  const why = amberRule(FG, STOP);
  ok(`1.3 · distinct from gilt BY HUE — ${hueGap(FG.H, GILT.H).toFixed(0)}° from gilt (${GILT.H}) and --gold-500, ${hueGap(FG.H, DANGER.H).toFixed(0)}° from --danger (${DANGER.H}); inside the amber band and outside the gold census's 70–100`,
    why.length === 0, why.join("; "));
  const OLD_STOP: Ok = { L: 0.78, C: 0.13, H: 86 };
  ok("1.3′ PLANT · the family as it stood (the stop `oklch(78% 0.13 86)`, the ink `--gilt`) fails the rule — it was gold",
    amberRule(GILT, OLD_STOP).length >= 4, amberRule(GILT, OLD_STOP).join("; "));
  ok(`1.4 · saturated where gold is satin: the stop's chroma ${STOP.C} is past the gold ramp's ${GOLD500.C}, the ink's ${FG.C} past gilt's ${GILT.C}`,
    STOP.C > GOLD500.C && FG.C > GILT.C);
  ok("1.5 · both stops render EXACTLY in sRGB (inside the gamut, so no browser clips them toward another hue)",
    inGamut(FG) && inGamut(STOP), `ink ${toLinear(FG).map((c) => c.toFixed(4))} · stop ${toLinear(STOP).map((c) => c.toFixed(4))}`);
  ok("1.5′ CONTROL · the gamut test can fail: one chroma step past the ink's edge (0.14 at L 82, hue 64) is outside",
    !inGamut({ L: FG.L, C: FG.C + 0.01, H: FG.H }));

  // Every surface an amber word or mark can land on — the page, the sunken well, the panel, the elevated card, every stop
  // of the three washes (the raised card, the float rung the toast stands on, the modal), and the lightest surface there is.
  const SURFACES: Array<[string, RGB]> = [
    ["--bg", srgb(token("bg"))],
    ["--bg-overlay (inset · sunken)", srgb(token("bg-overlay"))],
    ["--panel", srgb(token("panel"))],
    ["--bg-elevated", srgb(token("bg-elevated"))],
    ...stops("wash-raised").map((o, i) => [`--wash-raised stop ${i + 1}`, srgb(o)] as [string, RGB]),
    ...stops("wash-float").map((o, i) => [`--wash-float stop ${i + 1} (the toast)`, srgb(o)] as [string, RGB]),
    ...stops("wash-modal").map((o, i) => [`--wash-modal stop ${i + 1}`, srgb(o)] as [string, RGB]),
    ["--bg-royal-soft (the lightest surface)", srgb(token("bg-royal-soft"))],
  ];
  ok("1.6.locate · the surfaces were read — four flat, six wash stops, the royal-soft", SURFACES.length === 11, String(SURFACES.length));
  const ink = srgb(FG), stop = srgb(STOP);
  const rows: Array<[string, number, number]> = [];
  for (const [name, s] of SURFACES) {
    rows.push([`the ink on ${name}`, ratio(ink, s), 4.5]);
    rows.push([`the ink on its 18% wash (\`--warning-bg\`) over ${name}`, ratio(ink, over(stop, 0.18, s)), 4.5]);
    rows.push([`the ink on the warning chip's 22% fill over ${name}`, ratio(ink, over(stop, 0.22, s)), 4.5]);
    rows.push([`the stop as a mark (bar · dot · frame) on ${name}`, ratio(stop, s), 3]);
  }
  rows.push(["the ink on the maintenance panel (the stop mixed 18% into --bg-elevated)", ratio(ink, mixOklab(stop, 0.18, srgb(token("bg-elevated")))), 4.5]);
  rows.push(["the limit ramp's caution step (`var(--warning)`) on its sunken track (`--bg-sunken`)", ratio(stop, srgb(token("bg-sunken"))), 3]);
  const worst = (k: string) => rows.filter(([n]) => n.startsWith(k)).reduce((a, r) => (r[1] < a[1] ? r : a));
  for (const k of ["the ink on --", "the ink on its 18%", "the ink on the warning chip", "the stop as a mark"]) {
    const [n, r] = worst(k);
    note(`worst · ${n}: ${r.toFixed(2)}:1`);
  }
  const under = rows.filter(([, r, min]) => r < min);
  ok(`1.6 · AA everywhere — ${rows.length} pairs: words ≥ 4.5 on every surface, on the wash and on the chip's fill; the stop ≥ 3.0 as a mark (the ink's worst ${Math.min(...rows.filter(([n]) => n.startsWith("the ink")).map(([, r]) => r)).toFixed(2)}:1, the stop's ${Math.min(...rows.filter(([n]) => !n.startsWith("the ink")).map(([, r]) => r)).toFixed(2)}:1)`,
    under.length === 0, under.map(([n, r, m]) => `${n} ${r.toFixed(2)} < ${m}`).join(" | "));
  ok("1.6′ CONTROL · the calculator is honest — white on black 21:1, a colour on itself 1:1, and the old gilt ink on its own fill fails AA",
    Math.abs(ratio([1, 1, 1], [0, 0, 0]) - 21) < 1e-9 && Math.abs(ratio(ink, ink) - 1) < 1e-9 && ratio(srgb(GILT), srgb({ L: 0.86, C: 0.11, H: 84 })) < 4.5);
}

/* ══ §2 · EVERY WARNING PAINT READS THE FAMILY ══════════════════════════════════════════════════════════════════════════ */
section("2 · every warning paint reads the family — toast, chip, Callout, badge, NoticeBar, Dot, crest, ramp, meter, rows");
{
  const TOAST = read("src/components/ui/toast.tsx");
  const at = TOAST.indexOf("  warning: {");
  const warn = at < 0 ? "" : TOAST.slice(at, TOAST.indexOf("\n  },", at));
  ok("2.1 · the warning TOAST: the amber stop for its bar and rail, the amber ink for its glyph, the amber ring (`.mat-tint-warn`) — no gold",
    /bar: "bg-warning",/.test(warn) && /rail: "bg-warning",/.test(warn) && /icon: <span className="text-warning-fg"><I\.warning s=\{18\} \/><\/span>,/.test(warn)
      && /surface: "mat-tint-warn",/.test(warn) && !/gold|gilt/.test(warn), warn.slice(0, 160));
  ok("2.1′ · …and `.mat-tint-warn` mixes the warning stop (the ring every rung's box-shadow opens with)",
    /--mat-tint:\s*inset 0 0 0 1px color-mix\(in oklab, var\(--warning-500\) 32%, transparent\)/.test(rule(MOTION, ".mat-tint-warn")) && !/gilt|gold/.test(rule(MOTION, ".mat-tint-warn")));

  const CHIP = read("src/components/ui/chip.tsx");
  const chipLine = (v: string) => new RegExp(`^\\s*${v}:\\s*\\{[^\\n]*\\},?$`, "m").exec(CHIP)?.[0] ?? "";
  ok("2.2 · the CHIP's `warning`: the stop at 22% fill and 50% edge, the family's ink — no hand-typed hue",
    /background: "color-mix\(in oklab, var\(--warning-500\) 22%, transparent\)", color: "var\(--warning-fg\)", borderColor: "color-mix\(in oklab, var\(--warning-500\) 50%, transparent\)"/.test(chipLine("warning"))
      && !/oklch\(/.test(chipLine("warning")), chipLine("warning"));
  ok("2.2′ · …and `paused` the same family at its own quieter weight (18% fill, 40% edge)",
    /background: "color-mix\(in oklab, var\(--warning-500\) 18%, transparent\)", color: "var\(--warning-fg\)", borderColor: "color-mix\(in oklab, var\(--warning-500\) 40%, transparent\)"/.test(chipLine("paused"))
      && !/oklch\(/.test(chipLine("paused")), chipLine("paused"));
  const chipW = html(h(Chip, { variant: "warning" }, "x")), chipP = html(h(Chip, { variant: "paused" }, "x"));
  ok("2.2″ EXECUTED · the rendered chips draw the amber: the ink `var(--warning-fg)`, the fill and edge off `--warning-500`, no hue-80 literal",
    /color:var\(--warning-fg\)/.test(chipW) && /background:color-mix\(in oklab, var\(--warning-500\) 22%, transparent\)/.test(chipW)
      && /color:var\(--warning-fg\)/.test(chipP) && /border-color:color-mix\(in oklab, var\(--warning-500\) 40%, transparent\)/.test(chipP)
      && !/oklch\(\d+% [\d.]+ 80/.test(chipW + chipP), chipW);
  ok("2.2‴ · ONE amber word: the chip's ink IS the dictionary's printed amber (`TONE_CHIP.amber` → `warning`, `TONE_INK.amber` → `text-warning-fg`)",
    TONE_CHIP.amber === "warning" && TONE_INK.amber === "text-warning-fg" && /color:var\(--warning-fg\)/.test(chipW));

  ok("2.3 · the CALLOUT's maintenance amber names the family's ink (`MAINTENANCE_AMBER.fg`), and its boxes the family's tokens",
    MAINTENANCE_AMBER.fg === "var(--warning-fg)" && MAINTENANCE_AMBER.bg === "var(--warning-bg)" && MAINTENANCE_AMBER.border === "var(--warning-border)"
      && /color-mix\(in oklab, var\(--warning-500\) 18%, var\(--bg-elevated\)\)/.test(MAINTENANCE_AMBER.panelBg));
  const cw = html(h(Callout, { tone: "warning" }, "x"));
  const cm = html(h(Callout, { tone: "maintenance", layout: "stack", title: "t" }, "x"));
  ok("2.3′ EXECUTED · a warning Callout draws the amber box and glyph; a maintenance plate the amber ink — no gold in either",
    /border-warning-border bg-warning-bg/.test(cw) && /text-warning-fg/.test(cw) && /color:var\(--warning-fg\)/.test(cm) && !/gold|gilt/.test(cw + cm), cm.slice(0, 200));
  const badge = html(h(MaintenanceBadge, { label: "Back shortly" }));
  ok("2.4 EXECUTED · the MAINTENANCE BADGE's label is the family's ink on the family's wash (it was the stop, `--warning-500`)",
    /color:var\(--warning-fg\)/.test(badge) && /background:var\(--warning-bg\)/.test(badge) && !/color:var\(--warning-500\)/.test(badge), badge);

  const NB = read("src/components/ui/notice-bar.tsx");
  ok("2.5 · NOTICEBAR's warning tone and its action read the family (the session-ended and offline notices ride it)",
    /warning:\s*\{ bar: "border-warning-border bg-warning-bg text-warning-fg",\s*accent: "var\(--warning-fg\)" \}/.test(NB) && /warning:\s*"border-warning-fg\/40 hover:bg-warning-fg\/10",/.test(NB));
  ok("2.6 EXECUTED · DOT's warning tone is the stop (a mark)", /background:var\(--warning-500\)/.test(html(h(Dot, { tone: "warning" }))));
  ok("2.7 · the RESULT crest: the ring off the stop, the glyph in the ink, as every other crest (`success-fg`, `danger-fg`)",
    /warning: \{\s*\.\.\.crest\("var\(--warning-500\)", "var\(--warning-fg\)"\),/.test(read("src/components/markets/operation-result-modal.tsx")));
  ok("2.8 · the ONE limit ramp's caution step is the family (75–90% of a limit the player set), and the meter draws it",
    limitUsageFill(80, false) === "var(--warning)" && /background:var\(--warning\)/.test(html(h(LimitUsageMeter, { label: "x", used: 80, cap: 100, overLabel: "y" }))));
  ok("2.8′ · the password meter's middle step, the fee row's deduction and the apply slot's rejected word read the family",
    /tone === "warning" \? "bg-warning"/.test(read("src/components/ui/password-input.tsx")) && /tone === "warning" \? "text-warning-fg"/.test(read("src/components/ui/password-input.tsx"))
      && /tone === "warning" \? "text-warning-fg"/.test(read("src/components/ui/receipt-row.tsx"))
      && /\$\{rejected \? "text-warning-fg" : done \? "text-success-fg" : "text-text-subtle"\}/.test(read("src/app/agent/apply/apply-client.tsx")));
  // 2.9 · ONE amber WORD ink. The stop (`--warning-500`, `--warning`) is for marks — bars, dots, frames, fills. A word in
  // amber is the ink. The one stop-coloured glyph is the apply slot's disc, which mirrors its `done` twin (`bg-success/15
  // text-success`) — a glyph on a disc, not a word.
  const STOP_AS_INK = /(?<![\w-])(?:[a-z0-9-]+:)*text-warning(?:-500)?(?:\/[\w.[\]]+)?(?![\w-])|(?<![\w-])color:\s*["'`]?var\(--warning(?:-500)?\)/g;
  const stopInk = PLAYER(/\.(tsx|ts)$/).flatMap((f) => read(f).split("\n").flatMap((ln, i) => [...ln.matchAll(STOP_AS_INK)].map((m) => `${f}:${i + 1}:${m[0]}`)));
  ok("2.9 · ONE amber word ink — no player file writes a word in the stop; the only stop-coloured glyph is the apply slot's disc (its `done` twin's shape)",
    stopInk.length === 1 && /^src\/app\/agent\/apply\/apply-client\.tsx:\d+:text-warning$/.test(stopInk[0]) && /rejected \? "bg-warning\/15 text-warning" : done \? "bg-success\/15 text-success"/.test(read("src/app/agent/apply/apply-client.tsx")),
    stopInk.join(" · "));
  ok("2.9′ PLANT · a word in the stop (`text-warning-500`, `color: \"var(--warning-500)\"`) is seen",
    [..."<p className=\"text-warning-500\" style={{ color: \"var(--warning-500)\" }} />".matchAll(STOP_AS_INK)].length === 2);
}

/* ══ §3 · THE WARNING CENSUS ════════════════════════════════════════════════════════════════════════════════════════════ */
/**
 * What counts as a WARNING PAINT, read comment-stripped (R5-C's own spellings for the family, the day it left gold):
 *   var    `var(--warning)`, `--warning-500`, `--warning-bg`, `--warning-border`, `--warning-fg`
 *   tw     a Tailwind colour utility on the family (`warning`, `-fg`, `-500`, `-bg`, `-border`), any variant, any alpha
 *   cls    the warning tint class (`mat-tint-warn`)
 *   name   a "warning" tone or variant asked for by NAME (.tsx — where it picks a painted tone)
 * Each file is REGISTERED with its §B11 ruling — amber means "somebody must act" — carried over word for word from R5-C's
 * gold registry ("the token's" entries) where it ruled them first. A count that rises fails until the new use is ruled;
 * one that falls asks to be locked in.
 */
type Hit = { kind: string; match: string; line: number };
function warnHits(file: string, src: string): Hit[] {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  const out: Hit[] = [];
  code.split("\n").forEach((ln, i) => {
    const push = (kind: string, re: RegExp) => { for (const m of ln.matchAll(re)) out.push({ kind, match: m[0], line: i + 1 }); };
    push("var", /var\(\s*--warning(?:-fg|-500|-bg|-border)?\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-warning(?:-fg|-500|-bg|-border)?(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])mat-tint-warn(?![\w-])/g);
    if (file.endsWith(".tsx")) push("name", /["'`]warning["'`]/g);
  });
  return out;
}
const WARN_REGISTRY: Record<string, [number, string]> = {
  // ── the kit's definitions of the family ───────────────────────────────────────────────────────────────────────────
  "src/app/globals.css": [3, "the family's tokens — `--warning`, `--warning-bg`, `--warning-border` read the one stop"],
  "src/app/motion.css": [2, "the warning toast's ring, `.mat-tint-warn` (its class and its mix of the stop)"],
  "src/components/ui/toast.tsx": [6, "the `warning` variant — amber stop bar and rail, amber glyph, the amber ring; never a fixable refusal's (F3)"],
  "src/components/ui/chip.tsx": [7, "the amber `warning` and `paused` chips — the stop's fill and edge, the family's ink — and the variant's name"],
  "src/components/ui/callout.tsx": [18, "the warning and maintenance tones and MAINTENANCE_AMBER — the family's boxes, panels and ink"],
  "src/components/ui/notice-bar.tsx": [8, "the warning tone and its action (the session-ended and offline notices)"],
  "src/components/ui/dot.tsx": [2, "the `warning` tone — the stop as a mark"],
  "src/components/markets/operation-result-modal.tsx": [4, "the `warning` result (retryable refusals): the crest's ring off the stop, its glyph in the ink"],
  "src/components/ui/receipt-row.tsx": [3, "the fee row's amber (a deduction)"],
  "src/components/ui/modal.tsx": [1, "the tone union (a caution confirm)"],
  "src/components/ui/confirm-dialog.tsx": [1, "the tone union"],
  "src/components/layout/announcement-banner.tsx": [1, "the tone union (a maintenance announcement)"],
  "src/components/markets/circular-progress.tsx": [1, "the tone union (admin-only consumer)"],
  "src/components/updown/updown-bet-blocked-modal.tsx": [1, "the refusal variant union"],
  "src/lib/status-tone.ts": [1, "TONE_INK.amber — §B11's amber word printed as text (`text-warning-fg`)"],
  // ── the family where somebody must act (§B11) — R5-C's rulings, carried over ──────────────────────────────────────
  "src/app/markets/[id]/page.tsx": [5, "the hedge caution's box and words — the player weighs a thin upside before betting"],
  "src/components/markets/resolution-panel.tsx": [6, "the dispute and fee-cap cautions"],
  "src/components/markets/sell-confirm-modal.tsx": [2, "two exit cautions — read before selling"],
  "src/app/agent/apply/apply-client.tsx": [7, "an officer's request · a rejected document to replace — the applicant acts (the rejected slot's frame, wash, glyph disc and word)"],
  "src/app/agent/invite/[token]/invite-client.tsx": [2, "the invite is for another address · a fixable refusal"],
  "src/app/agent/page.tsx": [2, "'an officer has asked for one more thing' — the applicant acts (every other notice is neutral)"],
  "src/app/auth/login/page.tsx": [8, "sign-in refusals the player clears — wait, sign in again, use the password, create the account, ask us about a closed one (F3 severity warning) · their box's frame and wash; the break's panel is neutral"],
  "src/app/auth/register/register-form.tsx": [5, "sign-up refusals the player can fix"],
  // 7 → 5 on 2026-10-10 (typed-only identity): the extra-document card's amber disc — a wash and an ink — went with player
  // uploads; what is left is the corrections box (frame, wash, ink ×3), now "Check your details".
  "src/app/profile/kyc/page.tsx": [5, "'check your details' — ADDITIONAL_INFO_REQUIRED, an officer's request to correct the typed details, player amber (§B11)"],
  "src/app/profile/page.tsx": [5, "the KYC 'more info' pill and a declaration to resubmit (§B11 player amber)"],
  "src/app/profile/security/security-client.tsx": [4, "backup codes: two or fewer left; save them now"],
  "src/app/profile/source-of-funds/page.tsx": [3, "the declaration's legal-attestation caution"],
  "src/app/s/optout-refusal.tsx": [1, "a 'busy, try again' refusal"],
  "src/app/wallet/withdraw/page.tsx": [2, "the hold line and the tax notice — cautions on the player's money"],
  "src/app/wallet/withdraw/withdraw-confirm.tsx": [1, "the fee row's amber (a deduction)"],
  "src/components/kyc/kyc-gate-panel.tsx": [6, "'your move' and a held wallet — somebody must act"],
  "src/components/layout/app-shell.tsx": [2, "the session-ended notice and its Sign in — the player must sign in again"],
  "src/components/markets/comments-thread.tsx": [2, "the character counter's last 40 · the report link's hover — cautions"],
  "src/components/markets/house-lean-warning.tsx": [1, "'the upside is thin' — the Callout's own documented warning"],
  "src/components/markets/objection-dialog.tsx": [5, "the dispute route's caution"],
  "src/components/ui/offline-banner.tsx": [1, "the offline notice"],
  "src/components/ui/password-input.tsx": [5, "'OK, could be stronger' — a caution"],
  "src/components/ui/unsaved-changes.tsx": [2, "unsaved changes — act"],
  "src/components/wallet/payout-status-notice.tsx": [1, "payouts delayed — the maintenance amber ('back shortly')"],
  "src/lib/score-band.ts": [3, "a middling score's caution"],
  "src/app/auth/forgot-password/page.tsx": [2, "the rate-limit box's frame and wash — a refusal the player clears by waiting, as sign-in's (its words the muted ink)"],
  "src/app/profile/account/privacy-request-form.tsx": [2, "the erasure request's caution — what an irreversible erasure keeps by law, read before sending"],
  "src/components/rg/limit-usage.tsx": [1, "THE one limit ramp's caution step, 75–90% of a limit the player set — never gilt"],
};
section("3 · the warning census — every warning paint in the player's code is a §B11 warning, ruled and registered");
const wcensus = new Map<string, Hit[]>();
{
  for (const f of PLAYER(/\.(tsx|ts|css)$/)) {
    const hits = warnHits(f, readFileSync(join(ROOT, f), "utf8"));
    if (hits.length) wcensus.set(f, hits);
  }
  ok("3.0 · CONTROL · the scanner SEES the family where it is — the Callout's tones, the toast's variant, the chip's amber pair, the tokens",
    (wcensus.get("src/components/ui/callout.tsx")?.length ?? 0) >= 10 && (wcensus.get("src/components/ui/toast.tsx")?.length ?? 0) >= 4
      && (wcensus.get("src/components/ui/chip.tsx")?.length ?? 0) >= 6 && (wcensus.get("src/app/globals.css")?.length ?? 0) >= 3);
  const unregistered = [...wcensus.keys()].filter((f) => !(f in WARN_REGISTRY));
  ok("3.1 · no file paints the warning family unruled — every one is in the registry with its §B11 ruling", unregistered.length === 0,
    unregistered.map((f) => `${f}: ${wcensus.get(f)!.length} — ${wcensus.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`).join(" | "));
  const rose: string[] = [], fell: string[] = [];
  for (const [f, [n]] of Object.entries(WARN_REGISTRY)) {
    const got = wcensus.get(f)?.length ?? 0;
    if (got > n) rose.push(`${f}: ${got} > ${n} — ${wcensus.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`);
    else if (got < n) fell.push(`${f}: ${got} < ${n}`);
  }
  ok("3.2 · no registered file gained a warning paint (a new one must be RULED — somebody must act — then registered)", rose.length === 0, rose.join(" | "));
  ok("3.2′ · the registry is exact (a count above the tree is slack, not safety — lock a fall in)", fell.length === 0, fell.join(" · "));
  ok("3.3 · every entry carries its ruling", Object.values(WARN_REGISTRY).every(([n, why]) => n > 0 && why.length > 12));
  const n = (f: string, s: string) => warnHits(f, s).length;
  ok("3.4 PLANT · each spelling is seen — `var(--warning)`, `var(--warning-500)`, `var(--warning-bg)`, `var(--warning-fg)`, `border-warning-border`, `bg-warning-bg/15`, `hover:bg-warning-border`, `text-warning`, `bg-warning/15`, `mat-tint-warn`, a `\"warning\"` tone",
    n("x.tsx", '<i style={{ color: "var(--warning)", fill: "var(--warning-500)", background: "var(--warning-bg)", outlineColor: "var(--warning-fg)" }} className="border-warning-border bg-warning-bg/15 hover:bg-warning-border text-warning bg-warning/15 mat-tint-warn" /><Chip variant="warning" />') === 11);
  ok("3.4′ CONTROL · …and names that only contain the word are not paints: `warningCount`, `text-warning-subtle`, `data-warning`, `--warning-hint`, a comment",
    n("x.tsx", 'const warningCount = 1; const c = "text-warning-subtle"; const d = "data-warning"; const e = "var(--warning-hint)"; // text-warning-fg var(--warning-fg)') === 0);

  // 3.5 · NOTHING PAINTS A WARNING IN GOLD. Every recipe a warning is drawn with, read whole: no gold ramp, no gilt, no
  // hand-typed hue in the gold census's 70–100 band.
  const GOLDISH = /gilt|gold|oklch\(\s*[\d.]+%?\s+(?:0\.0[4-9]|0\.[1-9]\d*)\s+(?:7\d|8\d|9\d)(?:\.\d+)?\b/;
  const CALLOUT = read("src/components/ui/callout.tsx");
  const TOAST = read("src/components/ui/toast.tsx");
  const CHIP = read("src/components/ui/chip.tsx");
  const NB = read("src/components/ui/notice-bar.tsx");
  /** The text between two markers, or "" when either is missing — a recipe that cannot be found is a failure, never a pass. */
  const between = (s: string, from: string, to: string) => {
    const a = s.indexOf(from);
    const b = a < 0 ? -1 : s.indexOf(to, a + from.length);
    return a < 0 || b < 0 ? "" : s.slice(a, b);
  };
  /** A line found by its KEY, whatever its value says — so a recipe re-painted in gold is still found, and judged. */
  const keyed = (s: string, key: string) => new RegExp(`^\\s*${key}:[^\\n]*$`, "m").exec(s)?.[0] ?? "";
  // ⭐ Read by KEY and held PART BY PART (a fix to this suite's own blind spot, found by its mutation proof on 2026-10-10:
  // NoticeBar's action was found by its value `"border-warning…`, so a gold re-paint made the extraction miss — and the
  // miss hid inside a concatenation with the tone's line).
  const recipes: Array<[string, string[]]> = [
    ["the toast's warning variant", [between(TOAST, "  warning: {", "\n  },")]],
    ["the chip's paused and warning", [keyed(CHIP, "paused"), keyed(CHIP, "warning")]],
    ["the Callout's MAINTENANCE_AMBER and its warning and maintenance tones", [between(CALLOUT, "export const MAINTENANCE_AMBER", "} as const;"), between(CALLOUT, "  warning: {", "  info: INFO,"), between(CALLOUT, "  maintenance: {", "  neutral: {")]],
    ["NoticeBar's warning tone and its action", [keyed(between(NB, "const TONE", "};"), "warning"), keyed(between(NB, "const ACTION_TONE", "};"), "warning")]],
    ["Dot's warning tone", [keyed(read("src/components/ui/dot.tsx"), "warning")]],
    ["the result crest's warning", [/warning: \{\s*\.\.\.crest\([^\n]*/.exec(read("src/components/markets/operation-result-modal.tsx"))?.[0] ?? ""]],
    [".mat-tint-warn", [rule(MOTION, ".mat-tint-warn")]],
    ["the warning tokens", ["warning-500", "warning-fg", "warning", "warning-bg", "warning-border"].map((t) => decl(t))],
  ];
  const golden = recipes.filter(([, parts]) => parts.some((s) => s.length < 10 || /^<\d+ declarations>$/.test(s) || GOLDISH.test(s)));
  ok(`3.5 · nothing paints a warning in gold — ${recipes.length} recipes (${recipes.reduce((n, [, p]) => n + p.length, 0)} parts) read by key, no gold ramp, no gilt, no hand-typed hue 70–100`,
    golden.length === 0, golden.map(([w, p]) => `${w}: ${p.map((s) => s.slice(0, 70) || "‹not found›").join(" ‖ ")}`).join(" | "));
  const nbPlanted = NB.replace(/(const ACTION_TONE[\s\S]*?\n\s*warning:\s*)"[^"\n]*"/, '$1"border-gold-500/40 hover:bg-gold-500/10"');
  ok("3.5″ PLANT · a recipe re-painted in gold is still FOUND by its key — NoticeBar's action planted gold is read and judged gold",
    nbPlanted !== NB && GOLDISH.test(keyed(between(nbPlanted, "const ACTION_TONE", "};"), "warning")));
  ok("3.5′ PLANT · the recipes as they stood are caught — the toast's `bg-gold-500`, the chip's `oklch(82% 0.16 80)`, a `var(--gilt)` ink",
    GOLDISH.test('bar: "bg-gold-500",') && GOLDISH.test('color: "oklch(82% 0.16 80)"') && GOLDISH.test("var(--gilt)") && !GOLDISH.test('color: "var(--warning-fg)", background: "oklch(74% 0.15 64)"'));
}

/* ══ §4 · THE GUARDS AGREE, AND THE RECORD IS WRITTEN ═══════════════════════════════════════════════════════════════════ */
section("4 · the guards that pinned F3 re-pinned with the ruling, and the rulings written where the old rules were");
{
  // The other suites are read RAW: their regex literals hold quotes a comment stripper is not built to keep in step with.
  const gim = raw("scripts/gold-is-money.test.mts");
  const MONEY_INK = /const MONEY_INK = (\/.+\/g);/.exec(gim)?.[1] ?? "";
  ok("4.1 · test:gold-is-money's money ink no longer names the warning ink (it WAS `--gilt`; amber is not money)", MONEY_INK.length > 60 && !/warning/.test(MONEY_INK), MONEY_INK.slice(0, 80));
  const fl = raw("scripts/feedback-law.test.mts");
  ok("4.2 · test:feedback-law §2 pins the NEW premise — the warning toast is the amber family, never gold — and F3's routing stands",
    /bar:\\s\*"bg-warning"/.test(fl) && /rail:\\s\*"bg-warning"/.test(fl) && !/bar:\\s\*"bg-gold-500"\/\.test\(warnStyle/.test(fl));
  const r5c = raw("scripts/visual-pass-r5c.test.mts");
  const pat = (kind: string) => new RegExp(`push\\("${kind}", (/.+/g)\\);`).exec(r5c)?.[1] ?? "";
  ok("4.3 · R5-C's GOLD census no longer counts the warning family (its `var`, `tw` and `name` spellings left with the ruling; §3 counts them)",
    pat("var").length > 40 && !/warning/.test(pat("var")) && !/warning/.test(pat("tw")) && !/warning/.test(/push\("name", (\/.+\/g)\);/.exec(r5c)?.[1] ?? "warning"));
  const red = raw("scripts/red-feedback-law.cjs");
  const anchor = "  warning: {\n    bar: \"bg-warning\",";
  ok("4.4 · red:feedback-law's premise plant now strikes the warning toast in GOLD again — and its anchor resolves exactly once",
    red.includes("find: `  warning: {\n    bar: \"bg-warning\",`") && red.includes("with: `  warning: {\n    bar: \"bg-gold-500\",`") && raw("src/components/ui/toast.tsx").split(anchor).length === 2);
  const DA = raw("docs/DESIGN_AUTHORITY.md");
  ok("4.5 · DESIGN_AUTHORITY F3 records ruling (1) beside the line it supersedes — and quotes the family's values AS globals.css declares them",
    DA.includes("SUPERSEDED IN ITS PREMISE — Ali's ruling (1) of 2026-10-10: WARNINGS ARE AMBER, NOT GOLD")
      && DA.includes(`\`--warning-500\` \`${decl("warning-500")}\``) && DA.includes(`\`--warning-fg\` \`${decl("warning-fg")}\``)
      && DA.includes(`gilt's \`${decl("gold-300")}\``) && DA.includes(`\`--gold-500\`'s \`${decl("gold-500")}\``) && DA.includes("The routing does not move."));
  ok("4.5′ · …F3a and Q5 carry the ruling too (the console's routing unchanged; gold-is-money's ink list without the warning ink)",
    DA.includes("Since Ali's ruling (1) of 2026-10-10 the `warning` toast is AMBER, not gold") && DA.includes("And not the warning ink either — Ali's ruling (1) of 2026-10-10."));
  ok("4.6 · DESIGN_AUTHORITY §B4c writes ruling (2): the link ink `--brand-300`, hover `--brand-200` or an underline, never aqua or gold, the one held exception by name",
    /### B4c — Every link is blue \(Ali's ruling \(2\) of 2026-10-10\)/.test(DA) && DA.includes("**The link ink is `--brand-300`**") && DA.includes("**`--brand-200`**")
      && DA.includes("⛔ **Never aqua**") && DA.includes("the Terms (6, gold;") && DA.includes("the RG policy (3, gold;") && DA.includes("the agent terms (6, the muted ink;"));
  const GL = raw("src/app/globals.css");
  ok("4.7 · globals.css says why at both tokens — the amber ruling above `--warning-500`, the link ruling above `--text-link`",
    /WARNINGS ARE AMBER, NOT GOLD — Ali's ruling \(1\) of 2026-10-10[\s\S]{0,1600}--warning-500: oklch/.test(GL) && /EVERY LINK IS BLUE — Ali's ruling \(2\) of 2026-10-10[\s\S]{0,600}--text-link:\s+var\(--brand-300\);/.test(GL));
  const CA = raw("scripts/contrast-audit.mts");
  ok("4.8 · test:contrast — the AA gate that reads globals.css — scores the amber ink on its surfaces and the stop as a mark (it never had)",
    /warningFg: token\("warning-fg"\)/.test(CA) && /name: "--warning-fg amber ink on --bg-elevated", fg: T\.warningFg, bg: T\.bgElevated, min: 4\.5/.test(CA)
      && /name: "--warning-500 amber mark on --bg-elevated \(bar, dot, frame\)", fg: T\.warning500, bg: T\.bgElevated, min: 3\.0/.test(CA));
}

/* ══ §5 · THE LINK CENSUS ═══════════════════════════════════════════════════════════════════════════════════════════════ */
/**
 * Every `<Link>` (next/link, under any local name) and `<a>` in the player's code, and the `<button>`s drawn as text links,
 * read by AST: its classes (string literals, templates, every branch of a ternary, same-file constants), its inline
 * `color`, the colour and underline of every custom class it names (globals.css, the chat sheet), and its descendants'.
 *   · A TEXT LINK says it is one — a coloured ink, or an underline at rest. It must draw the link ink: `--brand-300` at
 *     rest (`text-brand-300`, a class or style reading it, `text-text-link`), and on hover/focus `--brand-200` or the same
 *     ink (an underline). Not the muted ink, not aqua, not gold, not a state's.
 *   · NAVIGATION (a menu, a tab, the footer's lists and contact rows, a back link, a card or title wholly a link) draws
 *     the text inks; a BUTTON drawn on a link (`btn-*`) keeps its paint. Neither is held to the link ink — but no link of
 *     any kind draws aqua, and a link's hover cue inside it (`group-hover:`) is the link blue or the text ink.
 *   · HELD — the links inside the hashed binding legal texts, counted exactly by file (DESIGN_AUTHORITY §B4c).
 */
type CssInk = { color?: string; hover?: string; underline?: boolean; fill?: boolean };
const cssInks = (() => {
  const map = new Map<string, CssInk>();
  for (const sheet of [CSS, CHAT]) for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const body = m[2];
    const color = /(?:^|[;\s])color\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    const deco = /(?:^|[;\s])text-decoration(?:-line)?\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    // A class that lays its own FILL is a button drawn on a link (the chat's escalate pill, its RG card's actions).
    const bg = /(?:^|[;\s])background(?:-color|-image)?\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    for (const s of m[1].split(",")) {
      const cm = /^\.([\w-]+)(:hover|:focus-visible|:focus)?$/.exec(s.trim());
      if (!cm) continue;
      const e = map.get(cm[1]) ?? {};
      if (cm[2]) { if (color) e.hover = color; }
      else {
        if (color) e.color = color;
        if (deco) e.underline = /\bunderline\b/.test(deco);
        if (bg && !/^(?:none|transparent)$/.test(bg)) e.fill = true;
      }
      map.set(cm[1], e);
    }
  }
  return map;
})();
/** A literal that IS a token's value — global-error ships without the app's CSS and writes its tokens out by value. */
const LITERAL_OF: Record<string, string> = {
  [decl("brand-300")]: "brand-300", [decl("brand-200")]: "brand-200",
  [decl("text")]: "neutral", [decl("text-muted")]: "neutral", [decl("text-subtle")]: "neutral", [decl("text-faint")]: "neutral",
};
/** The family a CSS colour VALUE belongs to. */
const famOfValue = (v: string): string => {
  const t = v.trim().replace(/^["'`]|["'`]$/g, "");
  const ref = /^var\(\s*--([\w-]+)\s*\)$/.exec(t);
  if (ref) {
    const n = ref[1];
    if (n === "brand-300" || n === "text-link") return "brand-300";
    if (n === "brand-200" || n === "text-link-hover") return "brand-200";
    if (/^(?:text(?:-muted|-subtle|-faint|-primary|-secondary|-tertiary)?|pearl[\w-]*|chat-text[\w-]*)$/.test(n)) return "neutral";
    if (/^(?:aqua|accent)/.test(n)) return "aqua";
    if (/^(?:gold|gilt)/.test(n)) return "gold";
    return n.replace(/-\d+$/, "");
  }
  const lit = LITERAL_OF[t.replace(/\s+/g, " ")];
  if (lit) return lit;
  if (/^(?:inherit|currentColor|currentcolor)$/.test(t)) return "neutral";
  return `literal(${t})`;
};
const NOT_COLOUR = /^(?:xs|sm|base|lg|xl|\d?xl|left|right|center|justify|start|end|balance|pretty|wrap|nowrap|ellipsis|clip|micro|caption|label|body|body-sm|body-lg|title-sm|title-md|title-lg|display-\d|\[\d[\w.%]*\])$/;
/** The family of a `text-…` utility's value, or null when it is a size or a layout. */
const famOfClass = (val: string): string | null => {
  if (NOT_COLOUR.test(val)) return null;
  if (val === "text-link") return "brand-300";
  if (val === "text-linkHover") return "brand-200";
  if (/^text(?:-(?:muted|subtle|faint|secondary|tertiary|disabled|inverse|onBrand))?$/.test(val) || /^(?:white|black|pearl(?:-\d+)?|inherit|current|transparent)$/.test(val)) return "neutral";
  const arb = /^\[var\(--([\w-]+)\)\]$/.exec(val);
  if (arb) return famOfValue(`var(--${arb[1]})`);
  if (/^brand-\d+$/.test(val)) return val;
  if (/^(?:aqua|accent)/.test(val)) return "aqua";
  if (/^(?:gold|gilt)/.test(val)) return "gold";
  return val.split("-")[0];
};
const HOVERISH = /(?:^|:)(?:hover|focus|focus-visible|focus-within|active|visited|group-hover|peer-hover)(?=:|$)/;
type Ink = { rest: string[]; hover: string[]; underline: boolean; button: boolean; aqua: string[]; groupHover: string[] };
const inkOf = (cls: string, styleColours: string[]): Ink => {
  const ink: Ink = { rest: [], hover: [], underline: false, button: false, aqua: [], groupHover: [] };
  for (const tok of cls.split(/\s+/).filter(Boolean)) {
    const cut = tok.lastIndexOf(":");
    const prefix = cut < 0 ? "" : tok.slice(0, cut);
    const util = cut < 0 ? tok : tok.slice(cut + 1);
    if (/^btn(?:-[\w-]+)?$/.test(util)) ink.button = true;
    if (util === "underline" && !HOVERISH.test(prefix)) ink.underline = true;
    const m = /^text-(.+?)(?:\/[\w.[\]]+)?$/.exec(util);
    const css = cssInks.get(util);
    if (css) {
      if (css.fill) ink.button = true;
      if (css.color) { const f = famOfValue(css.color); ink.rest.push(f); if (f === "aqua") ink.aqua.push(`.${util}`); }
      if (css.hover) { const f = famOfValue(css.hover); ink.hover.push(f); if (f === "aqua") ink.aqua.push(`.${util}:hover`); }
      if (css.underline) ink.underline = true;
    }
    if (!m) continue;
    const fam = famOfClass(m[1]);
    if (!fam) continue;
    if (fam === "aqua") ink.aqua.push(tok);
    if (/(?:^|:)group-hover(?=:|$)/.test(prefix)) ink.groupHover.push(fam);
    (HOVERISH.test(prefix) ? ink.hover : ink.rest).push(fam);
  }
  for (const c of styleColours) { const f = famOfValue(c); ink.rest.push(f); if (f === "aqua") ink.aqua.push(`style ${c}`); }
  return ink;
};
type LinkSite = { file: string; line: number; tag: string; cls: string; style: string[]; inner: string[]; kind: "link" | "button" };
/** Every link (and every button) in one file, read by AST. */
function linkSites(file: string, src: string): LinkSite[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const linkNames = new Set<string>(["a"]);
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text === "next/link" && st.importClause?.name) linkNames.add(st.importClause.name.text);
  }
  const consts = new Map<string, ts.Expression>();
  sf.forEachChild(function v(n: ts.Node) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) consts.set(n.name.text, n.initializer);
    n.forEachChild(v);
  });
  const strings = (e: ts.Node | undefined, depth = 0): string[] => {
    if (!e || depth > 8) return [];
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
    if (ts.isTemplateExpression(e)) return [e.head.text, ...e.templateSpans.flatMap((s) => [...strings(s.expression, depth + 1), s.literal.text])];
    if (ts.isIdentifier(e)) return consts.has(e.text) ? strings(consts.get(e.text), depth + 1) : [];
    const out: string[] = [];
    e.forEachChild((c) => { out.push(...strings(c, depth + 1)); });
    return out;
  };
  const attr = (open: ts.JsxOpeningLikeElement, name: string) =>
    open.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText(sf) === name);
  const styleColours = (open: ts.JsxOpeningLikeElement): string[] => {
    const a = attr(open, "style");
    if (!a?.initializer) return [];
    const out: string[] = [];
    const v = (n: ts.Node) => {
      if (ts.isPropertyAssignment(n) && n.name.getText(sf).replace(/["']/g, "") === "color") out.push(...strings(n.initializer));
      n.forEachChild(v);
    };
    v(a.initializer);
    return out;
  };
  const out: LinkSite[] = [];
  const visit = (n: ts.Node, link: LinkSite | null) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = open.tagName.getText(sf);
      const c = attr(open, "className");
      const cls = c ? strings(c.initializer).join(" ") : "";
      if (linkNames.has(tag) || tag === "button") {
        const site: LinkSite = { file, line: sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1, tag, cls, style: styleColours(open), inner: [], kind: tag === "button" ? "button" : "link" };
        out.push(site);
        n.forEachChild((ch) => visit(ch, site.kind === "link" ? site : link));
        return;
      }
      if (link) link.inner.push(cls);
    }
    n.forEachChild((ch) => visit(ch, link));
  };
  visit(sf, null);
  return out;
}
/** The links inside the hashed binding legal texts — held until each text's next version (owner item 31; §B4c). */
const HELD: Record<string, { count: number; fam: string; why: string }> = {
  "src/app/legal/terms/page.tsx": { count: 6, fam: "gold", why: "the Terms' RG links — `content()` is hashed (TERMS_TEXT_SHA), so their ink moves with the next Terms version" },
  "src/app/legal/responsible-gambling/page.tsx": { count: 3, fam: "gold", why: "the RG policy's settings links — its binding English is hashed (RG_EN_SHA); the three languages move together with the next policy version" },
  "src/app/legal/agent-terms/page.tsx": { count: 6, fam: "neutral", why: "the agent terms' support addresses — `content` is hashed (AGENT_TERMS_TEXT_SHA), so their ink moves with the next agent-terms version" },
};
/** Links that are not text links though they wear an underline — each named, each matching exactly one site. */
const CONTROLS: Array<{ file: string; match: RegExp; why: string }> = [
  { file: "src/components/markets/comments-thread.tsx", match: /text-text underline/, why: "the comments' two-option sort, drawn with links: the current option underlined in the text ink — a tab's selected state, navigation (§B4c)" },
];
/** Buttons drawn as text links — held to the link ink as links are. */
const LINK_BUTTONS: Array<{ file: string; match: RegExp; why: string }> = [
  { file: "src/app/notifications/row-actions.tsx", match: /min-h-\[44px\] px-2 rounded-md font-mono text-micro font-bold uppercase/, why: "the notifications row's Restore — a text action in the link's place (one of the owner's five)" },
  { file: "src/components/auth/resend-otp-button.tsx", match: /font-mono text-label uppercase tracking-\[0\.14em\]/, why: "the code page's Resend — a text action" },
];
type Verdict = { site: LinkSite; kind: "text" | "nav" | "button" | "held" | "control"; problems: string[] };
const judge = (site: LinkSite): Verdict => {
  const linkDrawn = site.kind === "link" || LINK_BUTTONS.some((b) => b.file === site.file && b.match.test(site.cls));
  // A plain button's INLINE colour is its own state's business (the proposals vote's colour is a vote, not a link);
  // its classes are still read for the retired aqua link ink.
  const ink = inkOf(site.cls, linkDrawn ? site.style : []);
  const problems: string[] = [];
  if (ink.aqua.length) problems.push(`aqua — the retired link ink: ${ink.aqua.join(" ")}`);
  // A descendant that lays its own fill is a PLATE or a chip inside a card (an icon tile, a count pill): its tint is the
  // plate's, not the link's ink. Every other descendant carries the link's words or its hover cue.
  const inner = site.inner.filter((c) => !/(?<![\w:-])bg-(?!transparent\b)[\w[\]/().%-]+/.test(c)).map((c) => inkOf(c, []));
  for (const i of inner) if (i.aqua.length) problems.push(`aqua inside the link: ${i.aqua.join(" ")}`);
  if (!linkDrawn) return { site, kind: "button", problems };
  if (ink.button) return { site, kind: "button", problems };
  const coloured = ink.rest.some((f) => f !== "neutral");
  if (!coloured && !ink.underline) return { site, kind: "nav", problems };
  if (CONTROLS.some((x) => x.file === site.file && x.match.test(site.cls))) return { site, kind: "control", problems };
  const held = HELD[site.file];
  const restOk = ink.rest.length > 0 && ink.rest.every((f) => f === "brand-300");
  const hoverOk = ink.hover.every((f) => f === "brand-200" || f === "brand-300");
  if (held && !restOk && ink.rest.every((f) => f === held.fam)) return { site, kind: "held", problems };
  if (!restOk) problems.push(`rests in ${ink.rest.join(",") || "the inherited ink"} — a text link rests in --brand-300`);
  if (!hoverOk) problems.push(`hovers to ${ink.hover.join(",")} — a text link hovers in --brand-200 (or keeps its ink and underlines)`);
  // A text link's hover cue carried by a descendant (`group-hover:`) is the link blue's, or the text ink's.
  const cue = inner.flatMap((i) => i.groupHover).filter((f) => !["brand-200", "brand-300", "neutral"].includes(f));
  if (cue.length) problems.push(`its hover cue inside draws ${cue.join(",")} — the link blue's or the text ink's only`);
  return { site, kind: "text", problems };
};
section("5 · the link census — every text link draws the link ink, at rest and on hover; aqua is no link's ink");
{
  const sites = PLAYER(/\.tsx$/).flatMap((f) => linkSites(f, readFileSync(join(ROOT, f), "utf8")));
  const verdicts = sites.map(judge);
  const by = (k: Verdict["kind"]) => verdicts.filter((v) => v.kind === k);
  const links = sites.filter((s) => s.kind === "link");
  note(`read ${links.length} links and ${sites.length - links.length} buttons in ${new Set(sites.map((s) => s.file)).size} files: ${by("text").length} text links, ${by("nav").filter((v) => v.site.kind === "link").length} navigation, ${by("button").filter((v) => v.site.kind === "link").length} links drawn as buttons, ${by("held").length} held, ${by("control").length} named control`);
  ok(`5.0 · CONTROL · the reader reaches the population — ≥ 250 links and ≥ 60 text links (it read ${links.length} and ${by("text").length}): a blind reader passes nothing`,
    links.length >= 250 && by("text").length >= 60, `${links.length} links, ${by("text").length} text links`);
  // `R8A_DUMP=<file>` writes every verdict, for an audit of the reader's own judgements (never read by a check).
  if (process.env.R8A_DUMP) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.R8A_DUMP, JSON.stringify(verdicts.map((v) => ({ file: v.site.file, line: v.site.line, tag: v.site.tag, kind: v.kind, cls: v.site.cls.slice(0, 220), style: v.site.style, problems: v.problems })), null, 1));
  }
  const bad = verdicts.filter((v) => v.problems.length);
  ok(`5.1 · every one of the ${by("text").length} text links draws the link ink — --brand-300 at rest, --brand-200 or an underline on hover — and no link draws aqua`,
    bad.length === 0, bad.map((v) => `${v.site.file}:${v.site.line} <${v.site.tag}> ${v.problems.join("; ")}`).join(" | "));
  for (const [file, hold] of Object.entries(HELD)) {
    const got = by("held").filter((v) => v.site.file === file).length;
    ok(`5.2 · HELD · ${file.replace("src/app/legal/", "legal/")}: ${hold.count} links in the ${hold.fam} ink — ${hold.why}`, got === hold.count, `${got} ≠ ${hold.count}`);
  }
  ok("5.2′ · …and nothing else anywhere is held (the exception is three named files, fifteen links)", by("held").every((v) => v.site.file in HELD) && by("held").length === 15, String(by("held").length));
  for (const x of CONTROLS) ok(`5.3 · NAMED · ${x.why}`, by("control").filter((v) => v.site.file === x.file).length === 1);
  for (const b of LINK_BUTTONS) ok(`5.3′ · LINK-DRAWN BUTTON · ${b.why} — held to the link ink`, verdicts.some((v) => v.site.file === b.file && v.site.kind === "button" && v.kind === "text" && v.problems.length === 0));
  // 5.4 · the CSS rules that target an anchor by element (the chat's source list) draw the link ink too.
  const anchorRules = [...[CSS, CHAT].join("\n").matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()).filter((s) => /(?:^|[\s>+~])a(?::(?:hover|focus|focus-visible))?$/.test(s)).map((s) => ({ s, color: /(?:^|[;\s])color\s*:\s*([^;]+)/.exec(m[2])?.[1]?.trim() })));
  const offAnchor = anchorRules.filter((r) => r.color && famOfValue(r.color) !== (/:(?:hover|focus)/.test(r.s) ? "brand-200" : "brand-300"));
  ok(`5.4 · every stylesheet rule that paints an anchor by element (${anchorRules.length}: ${anchorRules.map((r) => r.s).join(", ")}) draws --brand-300, hovering --brand-200`,
    anchorRules.length >= 2 && offAnchor.length === 0, offAnchor.map((r) => `${r.s} { color: ${r.color} }`).join(" | "));
  ok("5.5 · visited is the link's own ink: no rule styles `:visited`, and the preflight (`@tailwind base`, `a { color: inherit }`) keeps the browser's purple off",
    ![CSS, CHAT, MOTION].some((s) => /:visited/.test(s)) && /@tailwind base;/.test(CSS));

  // ⭐ PLANTS — each shape of the defect, judged in memory, is reported; each shape that is not a text link is not.
  const plant = (jsx: string) => linkSites("src/x/plant.tsx", `import Link from "next/link";\nexport function X() { return (<div>${jsx}</div>); }`).map(judge);
  const reported = (jsx: string) => plant(jsx).some((v) => v.problems.length > 0);
  // The card's Maelezo shape: a custom class whose STYLESHEET colour is aqua — planted in the class map for one judgement.
  cssInks.set("kp-plant-aqua", { color: "var(--accent-400)" });
  const viaCss = reported('<Link href="/a" className="kp-plant-aqua">x</Link>');
  cssInks.delete("kp-plant-aqua");
  ok("5.6 PLANT · the owner's five shapes are reported — aqua at rest, aqua via a card's CSS class, aqua inside the link, a hover to white, a muted underlined address",
    reported('<Link href="/a" className="text-accent-400 hover:text-text underline">x</Link>') && viaCss
      && reported('<a href="/a" className="text-brand-300 hover:text-text">x</a>') && reported('<a href="/a" className="text-text-muted underline underline-offset-2">x</a>')
      && reported('<Link href="/a" className="group block"><span className="text-accent-400 group-hover:text-text">3</span></Link>')
      && reported('<Link href="/a" className="group block"><h3 className="text-text group-hover:text-aqua-200">t</h3></Link>'));
  ok("5.6′ PLANT · the gold link, the state-ink link and the royal link are reported",
    reported('<a href="/a" className="text-gold-300 hover:text-gold-200">x</a>') && reported('<a href="/a" className="text-success-fg underline">x</a>') && reported('<a href="/a" className="truncate text-royal-200 hover:underline">x</a>'));
  ok("5.6″ CONTROL · and the shapes that are not text links are not — a back link, a footer row, a primary button, a pill-less no-underline wrapper, the blue link itself",
    !reported('<Link href="/a" className="font-mono text-label uppercase text-text-subtle hover:text-text">← Back</Link>') && !reported('<a href="/a" className="text-text-muted hover:text-text">Contact</a>')
      && !reported('<Link href="/a" className="btn btn-primary btn-md">Go</Link>') && !reported('<Link href="/a" className="no-underline inline-flex">x</Link>')
      && !reported('<a href="/a" className="text-brand-300 hover:underline underline-offset-2">x</a>') && !reported('<a href="/a" className="text-brand-300 hover:text-brand-200 underline">x</a>'));
  ok("5.6‴ CONTROL · the reader sees through a ternary, a same-file constant and an inline style",
    reported('<Link href="/a" className={on ? "text-brand-300" : "text-accent-400"}>x</Link>')
      && plant('<a href="/a" style={{ color: "var(--accent-400)" }}>x</a>').some((v) => v.problems.length > 0)
      && linkSites("src/x/p.tsx", 'const C = "text-gold-300 underline"; export const X = () => <a href="/" className={C}>x</a>;').map(judge).some((v) => v.problems.length > 0));
}

/* ══ §6 · THE SITES THE RULING MOVED ════════════════════════════════════════════════════════════════════════════════════ */
section("6 · the sites ruling (2) moved, each pinned — the five aqua links and the bell's, the gold door, the other inks");
{
  const SITES: Array<[string, string, RegExp]> = [
    ["the notifications row's Restore (aqua → blue, hover included)", "src/app/notifications/row-actions.tsx", /uppercase text-brand-300 hover:text-brand-200 hover:bg-bg-overlay transition-colors disabled:opacity-50/],
    ["/profile/activity's Manage limits (aqua → blue)", "src/app/profile/activity/page.tsx", /text-\[11px\] text-brand-300 hover:text-brand-200 underline">\s*\{t\.activity\.manageLimits\}/],
    ["the resolution panel's contact link (aqua → blue)", "src/components/markets/resolution-panel.tsx", /<a href="\/help" className="text-brand-300 hover:text-brand-200 underline">\{t\.market\.resContact\}<\/a>/],
    ["notification settings' watchlist cue (aqua → blue)", "src/app/profile/notifications/page.tsx", /tabular-nums text-brand-300 group-hover:text-brand-200">\s*\{formatNumber\(watched\.length\)\}/],
    ["the bell panel's See all — BOTH bells (aqua → blue; classic chrome reached by the ruling)", "src/components/layout/notifications-panel.tsx", /className="inline-flex items-center gap-0\.5 min-h-\[44px\] px-2 rounded-md font-mono text-micro font-bold uppercase text-brand-300 hover:text-brand-200 hover:bg-bg-overlay transition-colors whitespace-nowrap"\s*>\s*\{t\.notif\.seeAll\}/],
    ["/live's featured title hover (aqua → the link blue's step)", "src/app/live/featured-contest.tsx", /text-text text-balance group-hover:text-brand-200"/],
    ["/live's card title hover (aqua → the link blue's step)", "src/app/live/pulse-grid.tsx", /text-text text-balance group-hover:text-brand-200 \$\{/],
    ["the wallet's zero-balance Add funds (gold → blue: a text link)", "src/app/wallet/wallet-client.tsx", /tracking-\[0\.14em\] text-brand-300 hover:text-brand-200 transition-colors"\s*>\s*<I\.plus s=\{12\} \/>/],
    ["the RG page's begambleaware.org (the success ink → blue)", "src/app/profile/responsible-gambling/page.tsx", /className="text-brand-300 hover:text-brand-200 underline underline-offset-2">begambleaware\.org<\/a>/],
    ["the proposal's View source (royal-200 → blue)", "src/app/proposals/[id]/page.tsx", /className="truncate text-brand-300 hover:underline">\{t\.proposals\.viewSource\}/],
    ["a proposal row's View market cue (royal-200 → blue)", "src/app/proposals/page.tsx", /<span className="flex items-center gap-1 text-brand-300">\{t\.proposals\.viewMarket\}/],
    ["sign-in's support phone (muted → blue)", "src/app/auth/login/page.tsx", /href=\{`tel:\$\{SUPPORT_PHONE_TEL\(\)\}`\}\s*className="inline-flex items-center gap-1\.5 text-brand-300 underline underline-offset-2 hover:text-brand-200"/],
    ["sign-in's support address (muted → blue)", "src/app/auth/login/page.tsx", /href=\{`mailto:\$\{SUPPORT_EMAIL\(\)\}`\}\s*className="inline-flex items-center gap-1\.5 text-brand-300 underline underline-offset-2 hover:text-brand-200 break-all"/],
    ["/profile/account's support address (muted → blue)", "src/app/profile/account/page.tsx", /className="text-brand-300 hover:text-brand-200 underline underline-offset-2">\{SUPPORT_EMAIL\(\)\}<\/a>/],
    ["/profile/kyc's second address (muted → blue, as its first)", "src/app/profile/kyc/page.tsx", /font-mono text-body-sm text-brand-300 hover:text-brand-200 underline underline-offset-2 select-all/],
    ["the officer sign-in's support address (muted → blue)", "src/app/auth/admin/page.tsx", /className="text-brand-300 hover:text-brand-200 underline underline-offset-2">\{SUPPORT_EMAIL\(\)\}<\/a> with your AML lead/],
    ["the market page's Source ↗ (muted → blue; its box unchanged)", "src/app/markets/[id]/page.tsx", /-my-\[11px\] py-\[11px\] text-\[12px\] font-mono text-brand-300 hover:text-brand-200"/],
    ["the market page's source address (muted → blue)", "src/app/markets/[id]/page.tsx", /items-center text-brand-300 hover:text-brand-200 underline break-all">\{m\.sourceUrl\}/],
    ["the resolution panel's Source ↗ (muted → blue, as /fairness's)", "src/components/markets/resolution-panel.tsx", /className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200 underline"\s*>\s*\{t\.common\.source\}/],
    ["/fairness's Source ↗ — the sibling that was already blue", "src/app/fairness/page.tsx", /font-mono text-\[11px\] text-brand-300 hover:text-brand-200 underline">\s*\{t\.common\.thSource\}/],
    ["Up & Down's deposit route, the round panel (faint → blue)", "src/components/updown/round-stake-panel.tsx", /className="text-brand-300 underline underline-offset-2 hover:text-brand-200">\s*\{t\.market\.udDepositCta\}/],
    ["Up & Down's deposit route, the card's controls (faint → blue)", "src/components/updown/updown-stake-controls.tsx", /className="text-brand-300 underline underline-offset-2 hover:text-brand-200"/],
    ["/markets' All results hover (white → the link blue's step)", "src/app/markets/page.tsx", /text-brand-300 transition-colors hover:text-brand-200"\s*>\s*\{t\.market\.allResults\}/],
  ];
  for (const [what, f, re] of SITES) ok(`6 · ${what}`, re.test(read(f)), f);
  ok("6′ · the cards' Maelezo (`.mcardp-details`) rests in the link blue and keeps its underline hover; the home's settled source (`.kp-settled__src`) rests and hovers blue",
    /color:\s*var\(--brand-300\)/.test(rule(CSS, ".mcardp-details")) && !/accent|aqua/.test(rule(CSS, ".mcardp-details")) && /\.mcardp-details:hover\s*\{\s*text-decoration:\s*underline;/.test(CSS)
      && /color:\s*var\(--brand-300\)/.test(rule(CSS, ".kp-settled__src")) && /color:\s*var\(--brand-200\)/.test(rule(CSS, ".kp-settled__src:hover")));
  ok("6′′ · the census's own finds — the home's \"your bets\" links (`.kp-mine__limits`) and the Wallet sheet's two (`.kp-wsheet__link`) — rest in the link blue; their dim line takes the link's ink on hover",
    /color:\s*var\(--brand-300\)/.test(rule(CSS, ".kp-mine__limits")) && /text-decoration-color:\s*currentColor/.test(rule(CSS, ".kp-mine__limits:hover"))
      && /color:\s*var\(--brand-300\)/.test(rule(CSS, ".kp-wsheet__link")) && /text-decoration-color:\s*currentColor/.test(rule(CSS, ".kp-wsheet__link:hover")));
  ok("6″ · the chat's citations (`.cm-cite`, `.cm-source-row a`) are links in the link blue, their underlines the blue at pearl's weights; the source NUMBER keeps pearl",
    /color:\s*var\(--brand-300\)/.test(rule(CHAT, ".cm-cite")) && /border-bottom:\s*1px dotted color-mix\(in oklab, var\(--brand-300\) 42%, transparent\)/.test(rule(CHAT, ".cm-cite"))
      && /color:\s*var\(--brand-200\)/.test(rule(CHAT, ".cm-cite:hover")) && /color:\s*var\(--brand-300\)/.test(rule(CHAT, ".cm-source-row a")) && /color:\s*var\(--brand-200\)/.test(rule(CHAT, ".cm-source-row a:hover"))
      && /color:\s*var\(--pearl\)/.test(rule(CHAT, ".cm-source-row .cm-source-n")) && !/pearl-edge-hover/.test(CHAT + decommentCss(raw("src/styles/chat/chat-tokens.css"))));
  ok("6‴ · the kit's own words for a link name the link ink — `--text-link: var(--brand-300)`, `--text-link-hover: var(--brand-200)` (they named aqua)",
    decl("text-link") === "var(--brand-300)" && decl("text-link-hover") === "var(--brand-200)");
  const accentInk = PLAYER(/\.tsx$/).filter((f) => /(?<![\w-])(?:[a-z-]+:)*text-accent-\d|group-hover:text-aqua-\d/.test(read(f)));
  ok("6⁗ · the retired aqua link ink is gone from the player's code — no `text-accent-*` utility, no title hovering aqua (the five were the last)",
    accentInk.length === 0, accentInk.join(" · "));
}

console.log(`\nvisual-pass-r8a: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
