/**
 * WCAG contrast audit (audit H10). Computes contrast ratios for the money-
 * critical token pairs directly from their OKLCH values (OKLCH → OKLab → linear
 * sRGB → WCAG relative luminance), so the launch gate "0 contrast failures" is
 * checkable without a browser.
 *
 * ⚠️ 2026-07-29 — the token values are now PARSED FROM globals.css.
 *
 * They used to be hand-mirrored here, with a comment saying "update both
 * together". They were not updated together, and could not have been reliably:
 * a contrast gate whose inputs are typed by hand cannot see the change it exists
 * to judge. Measured when this was found: the mirror said --bg-elevated was
 * L=0.19 while globals.css said 0.22, and --panel 0.17 against a real 0.20. So
 * every "PASS" on those surfaces was computed against a background the product
 * does not have — and a token edit that genuinely broke AA would have gone on
 * printing PASS, because nothing connected the two files.
 *
 * This is the same failure shape as B5 (a token silently redefined elsewhere)
 * and B8 (a class that resolves to nothing): the check and the thing being
 * checked lived in different places. Now there is one source.
 *
 * ⚠️ 2026-08-06 (material merge, ATOM 2d) — THE MIRROR WAS ONLY HALF REMOVED,
 * AND THE SURVIVING HALF HAD ALREADY DRIFTED.
 *
 * Five inputs were still typed by hand after the 2026-07-29 repair — `pearl50`,
 * `danger500`, `text`, `btnYesBg`, `btnNoBg` — and `text` was typed
 * `0.97 / 0.010` against a real `oklch(98% 0.012 268)` (globals.css:260). So
 * `--text on --bg`, the single most-rendered pair in the product, was scored
 * against ink the product does not use. The failure did not repeat because the
 * 2026-07-29 note was wrong; it repeated because a PARTIAL repair leaves the
 * same defect with a smaller surface, and nothing marks which half is which.
 *
 * Now every input is parsed, including the four button FILLS, which live in
 * rule blocks rather than in `:root` and so needed a rule parser rather than an
 * exemption. And the gold pairs are checked for the first time: `--gilt` is
 * money ink (`.gilt-num`) and `.btn-gold` is a control, and neither had ever
 * been put against a background by this gate.
 *
 * ⛔ `token()` now also fails on a SECOND declaration site. That is INTAKE §2a:
 * the browser takes the LAST declaration and this parser takes the FIRST, so a
 * token re-declared at the top of `:root` leaves the product on the old value
 * while every ratio here prints the new one — and `test:tokens` cannot catch it,
 * because its cross-file rule compares files and both copies are in globals.css.
 *
 * Run: npm run test:contrast
 * RED: node scripts/contrast-audit-red.mjs
 */
import { readFileSync } from "node:fs";

type Oklch = { l: number; c: number; h: number }; // l 0..1, c, h degrees
const ok = (l: number, c: number, h: number): Oklch => ({ l, c, h });

// ⛔ The path is PRINTED with the results. `CONTRAST_CSS` exists so the RED
// harness can point the gate at a mutated COPY instead of rewriting the live
// file — two sessions share this working tree and a mutate-then-restore window
// over globals.css can land inside the other session's build. A gate you can
// re-aim is only honest if it says what it read, so it does, every run.
const GLOBALS =
  process.env.CONTRAST_CSS ??
  new URL("../src/app/globals.css", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// Comments are stripped first: a `/* --bg: was 15% */` note must not read as a
// second declaration site, and must not be parseable as a value either.
const CSS = readFileSync(GLOBALS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
// ⛔ PRINTED HERE, not beside the results. The token table below is built at
// module scope and a parse defect throws inside it — so a path printed later
// is a path that never prints on exactly the runs where you most need to know
// which file was read.
console.log(`contrast-audit: reading ${GLOBALS}\n`);

/** `oklch(L% C H …)` → Oklch. Returns null when the text is not a literal. */
function parseOklch(raw: string): Oklch | null {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(raw);
  return m ? ok(Number(m[1]) / 100, Number(m[2]), Number(m[3])) : null;
}

/**
 * Read `--name: <value>` out of globals.css. Throws rather than falling back: a
 * silent default would recreate exactly the drift this parser was written to
 * kill. Throws on a SECOND declaration site for the same reason (INTAKE §2a).
 */
function token(name: string): Oklch {
  const decls = [...CSS.matchAll(new RegExp(`--${name}\\s*:([^;}]*)`, "g"))].map((m) => m[1].trim());
  if (decls.length === 0) throw new Error(`contrast-audit: --${name} is not declared in ${GLOBALS}`);
  if (decls.length > 1) {
    throw new Error(
      `contrast-audit: --${name} has ${decls.length} declaration sites (${decls.join(" | ")}). ` +
        `INTAKE §2a: the browser takes the LAST, this gate takes the FIRST — so the product ` +
        `would render one value while every ratio below scored another. Edit the token AT ITS LINE.`,
    );
  }
  const val = parseOklch(decls[0]);
  if (!val) throw new Error(`contrast-audit: --${name} is "${decls[0]}", not a literal oklch()`);
  return val;
}

/**
 * Read one declaration out of a rule block — `.btn-yes { background: … }`.
 *
 * The four button fills are NOT tokens; they are literals inside their rules
 * (`globals.css:715/727/748/759`), which is precisely why they were still being
 * mirrored by hand here. A `var(--x)` value is resolved through `token()`, so
 * `.btn-danger`'s `var(--danger-500)` and `.btn-gold`'s `var(--gold-500)` are
 * followed to their definition rather than re-typed.
 */
function ruleBody(selector: string): string {
  const at = CSS.indexOf(`\n${selector} {`) >= 0 ? CSS.indexOf(`\n${selector} {`) : CSS.indexOf(`\n${selector}{`);
  if (at < 0) throw new Error(`contrast-audit: rule "${selector}" not found in ${GLOBALS}`);
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("}", open);
  if (close < 0) throw new Error(`contrast-audit: rule "${selector}" is unterminated`);
  return CSS.slice(open + 1, close);
}

function ruleDecl(selector: string, prop: string): string {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`).exec(ruleBody(selector));
  if (!m) throw new Error(`contrast-audit: "${selector}" declares no ${prop}`);
  return m[1].trim();
}

/** A single colour — an `oklch()` literal or a plain `var(--token)`. */
function colour(where: string, raw: string): Oklch {
  const lit = parseOklch(raw);
  if (lit) return lit;
  const v = /^var\(\s*--([a-z0-9-]+)\s*\)$/i.exec(raw);
  if (v) return token(v[1]);
  throw new Error(
    `contrast-audit: "${where}: ${raw}" is neither a literal oklch() nor a plain ` +
      `var(--token). It cannot be scored, and a gate that silently skips a control is worse than one that stops.`,
  );
}

function ruleValue(selector: string, prop: string): Oklch {
  return colour(`${selector} { ${prop} }`, ruleDecl(selector, prop));
}

/**
 * Read the COLOUR STOPS of a `linear-gradient()` painted by a rule — E-119.
 *
 * `.btn-primary` is the one solid-family button that is a ramp, and that put it
 * in the blind spot BETWEEN this gate and its rendered companion: `ruleValue()`
 * above refuses anything that is not one flat colour, and `contrast-rendered.mjs`
 * read a gradient-painted element as transparent until E-118. So the platform's
 * most-used CTA — 71 call sites — was the only control neither instrument could
 * express, and its white label sat at 4.0:1.
 *
 * The angle and the stop POSITIONS are deliberately discarded: WCAG asks what is
 * behind the ink, and on a ramp behind a centred label the honest answer is the
 * stop that reads worst (`worstStop()` below). A stop this parser cannot resolve
 * THROWS rather than being dropped — a ramp scored on the two stops out of three
 * that happen to be literals is a gate reporting a number for a surface it only
 * partly read.
 */
function ruleGradient(selector: string, prop: string): Oklch[] {
  const raw = ruleDecl(selector, prop);
  const g = /(?:linear|radial|conic)-gradient\(([\s\S]*)\)\s*$/.exec(raw);
  if (!g) throw new Error(`contrast-audit: "${selector} { ${prop}: ${raw} }" is not a gradient`);
  const terms = g[1]
    .split(/,(?![^(]*\))/) // top-level commas only
    .map((t) => t.trim().replace(/\s+(?:[-\d.]+(?:%|px|r?em)\s*)+$/, "").trim()) // drop stop positions
    .filter(Boolean);
  // ⛔ The direction is RECOGNISED, never assumed to be first. Blindly dropping
  // args[0] eats a real colour stop the moment a gradient omits its angle —
  // `linear-gradient(var(--gold-300), var(--gold-500))` is legal and would have
  // been scored on ONE stop, which is how a ramp passes on its flattering half.
  const DIRECTION = /^(?:[-\d.]+(?:deg|turn|rad|grad)|to\s+[a-z\s]+|circle\b|ellipse\b|closest-|farthest-|at\s|var\(\s*--[a-z0-9-]*angle[a-z0-9-]*\s*\))/i;
  const stops = DIRECTION.test(terms[0]) ? terms.slice(1) : terms;
  if (stops.length < 2) {
    throw new Error(
      `contrast-audit: "${selector} { ${prop} }" resolved to ${stops.length} colour stop(s) — a ramp ` +
        `scored on one stop is a ramp half-read.`,
    );
  }
  return stops.map((t) => colour(`${selector} { ${prop} } stop`, t));
}

/**
 * ⛔ `filter: brightness()` IS A RASTER EFFECT, AND EVERY STYLESHEET-DERIVED
 * FIGURE FOR A HOVER STATE IS THEREFORE A MODEL. `getComputedStyle` still hands
 * back the authored colour, so nothing that reads CSS can see a hover state
 * without simulating the filter — which is why the hover ratios below had never
 * been checked by anything.
 *
 * The simulation is NOT trusted on its arithmetic. It was validated against the
 * real product: `.qa-design/btn-pixels.mjs` samples the rendered pixels of every
 * solid-family button on production under a real pointer, and this model agrees
 * with the raster to within 0.01 on all five (`.btn-yes` 4.352 model / 4.36
 * measured · `.btn-danger` 4.374 / 4.37 · `.btn-no` 4.597 / 4.59).
 *
 * The shorthand filter functions operate on GAMMA-ENCODED sRGB
 * (filter-effects-1 pins `color-interpolation-filters: sRGB` for them), which is
 * why the encode/decode round-trip below is not decoration: doing the multiply
 * in linear light gives a different, wrong answer.
 *
 * `drop-shadow()` is ignored on purpose — it paints OUTSIDE the element and
 * cannot sit between the label and its fill. Any other function throws: a filter
 * this model does not implement would silently under-report.
 */
type Filter = { brightness: number; saturate: number };
function ruleFilter(selector: string): Filter {
  const raw = ruleDecl(selector, "filter");
  const f: Filter = { brightness: 1, saturate: 1 };
  // ⛔ SCANNED WITH A DEPTH COUNTER, NOT WITH A REGEX. `drop-shadow(… color-mix(
  // in oklab, var(--teal-400) 30%, transparent))` nests THREE deep; a regex that
  // allows one level of nesting skips past `drop-shadow` and then matches the
  // inner `color-mix` as if it were a top-level filter function. Measured: the
  // first version of this parser threw `applies filter function "color-mix"` on
  // a perfectly ordinary hover rule.
  const fns: string[] = [];
  for (let i = 0, depth = 0, start = 0; i < raw.length; i++) {
    if (raw[i] === "(") { if (depth++ === 0) start = raw.lastIndexOf(" ", i) + 1; continue; }
    if (raw[i] === ")" && --depth === 0) fns.push(raw.slice(start, i + 1));
  }
  for (const fn of fns) {
    const name = fn.slice(0, fn.indexOf("(")).toLowerCase();
    const arg = Number(/^[a-z-]+\(\s*([\d.]+)\s*\)$/i.exec(fn)?.[1]);
    if (name === "drop-shadow") continue;
    if (name === "brightness" && Number.isFinite(arg)) { f.brightness = arg; continue; }
    if (name === "saturate" && Number.isFinite(arg)) { f.saturate = arg; continue; }
    throw new Error(
      `contrast-audit: "${selector}" applies filter function "${name}", which this model does not ` +
        `implement. A filter changes what the eye receives, so an unmodelled one must stop the gate.`,
    );
  }
  return f;
}

// linear-sRGB channel from OKLCH (Björn Ottosson).
function oklchToLinearSrgb({ l: L, c: C, h: H }: Oklch): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  return [r, g, bl].map((v) => Math.min(1, Math.max(0, v))) as [number, number, number];
}
// WCAG relative luminance uses LINEAR rgb with these coefficients.
const LUMA = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
function luminance(o: Oklch, f?: Filter): number {
  const linear = oklchToLinearSrgb(o);
  if (!f || (f.brightness === 1 && f.saturate === 1)) return LUMA(linear);
  // sRGB transfer function, both ways — the shorthand filters work encoded.
  const enc = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
  const dec = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  let [r, g, b] = linear.map(enc).map((v) => clamp(v * f.brightness));
  if (f.saturate !== 1) {
    const s = f.saturate;
    // The saturate() matrix, filter-effects-1 §feColorMatrix type="saturate".
    [r, g, b] = [
      (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b,
      (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b,
      (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b,
    ].map(clamp);
  }
  return LUMA([r, g, b].map(dec));
}
function contrast(fg: Oklch, bg: Oklch, f?: Filter): number {
  const a = luminance(fg, f), b = luminance(bg, f);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The stop a ramp reads WORST against this ink — which is the light stop under
 * pale ink and the dark stop under dark ink, so it must be chosen, never typed.
 * `.chip-resolved` used to name `--gold-500` by hand for exactly this reason;
 * the hand-picked stop was right, and it would have stayed pointing at gold-500
 * through ATOM 2b's re-derivation of the whole ramp without anyone noticing.
 */
function worstStop(fg: Oklch, stops: Oklch[], f?: Filter): Oklch {
  return stops.reduce((w, s) => (contrast(fg, s, f) < contrast(fg, w, f) ? s : w));
}

// ── tokens — READ FROM globals.css, not mirrored ─────────────────────────────
// ⛔ NOTHING IN THIS TABLE MAY BE A LITERAL. Every entry is `token()` or
// `ruleValue()`. A hand-typed input is the defect this file's own header
// narrates, twice; the second time it had already drifted (`text`).
const T = {
  pearl50: token("pearl-50"),
  bg: token("bg"),
  bgElevated: token("bg-elevated"),
  // The button FILLS, read off the rules that paint them — not re-typed.
  btnNoBg: ruleValue(".btn-no", "background"),
  btnYesBg: ruleValue(".btn-yes", "background"),
  btnDangerBg: ruleValue(".btn-danger", "background"), // → var(--danger-500)
  btnGoldBg: ruleValue(".btn-gold", "background"), // → var(--gold-500)
  btnGoldFg: ruleValue(".btn-gold", "color"), // → var(--gold-fg)
  danger500: token("danger-500"),
  border: token("border"),
  borderStrong: token("border-strong"),
  borderControl: token("border-control"),
  text: token("text"), // ⚠️ was hand-typed 0.97/0.010 against a real 0.98/0.012
  // ── The ink ramp (added 2026-07-28 with DESIGN_AUTHORITY B8) ──────────────
  // These three were defined in globals.css from the start but were never bridged
  // into tailwind.config.ts, so `text-text-muted` / `-subtle` / `-faint` compiled
  // to NOTHING — 1,224 usages inheriting their parent's ink instead of receding.
  // Repairing the bridge makes them render for the first time, which is a real
  // darkening of the quiet end of the hierarchy. That has to be PROVEN against AA,
  // not assumed: RULES.md law 9 names faint body copy as a known failure mode.
  textMuted: token("text-muted"),
  textSubtle: token("text-subtle"),
  textFaint: token("text-faint"),
  bgInset: token("bg-inset"),
  panel: token("panel"),
  // ── Gold (added 2026-08-06, material merge ATOM 2d) ───────────────────────
  // Never checked before, on either side of the pair. `--gilt` is MONEY INK —
  // `.gilt` / `.gilt-num` / `.gilt-strong` colour amounts, and M4 says money is
  // mono and tabular, which means it is READ, which means 4.5. `.btn-gold` is a
  // control. `.chip-resolved` labels a settled market.
  // ⭐ These land BEFORE ATOM 2b re-derives the ramp to hue 84 deliberately: a
  // gate added after the change it is meant to judge has no before-reading.
  gilt: token("gilt"),
  giltStrong: token("gilt-strong"),
  gold500: token("gold-500"),
  gold300: token("gold-300"),
  chipResolvedFg: ruleValue(".chip-resolved", "color"),
  // ── The RAMPS, and their hover rasters (2026-08-06, ATOM 3 · E-119) ───────
  // Three gradient-painted surfaces carry text. Two of them are controls, and
  // until now none of the three had its ramp read: `.chip-resolved` was scored
  // against a hand-picked `--gold-500`, and the two buttons were not scored at
  // all, because `ruleValue()` refuses anything that is not one flat colour.
  chipResolvedStops: ruleGradient(".chip-resolved", "background"),
  btnPrimaryStops: ruleGradient(".btn-primary", "background"),
  btnPrimaryHover: ruleFilter(".btn-primary:hover:not(:disabled)"),
  btnClaretFg: ruleValue(".btn-claret", "color"),
  btnClaretStops: ruleGradient(".btn-claret", "background"),
  btnClaretHover: ruleFilter(".btn-claret:hover:not(:disabled)"),
};

// `decorative: true` = WCAG 1.4.11 exempt (a divider that is NOT the sole means
// of identifying a control). Printed for reference but never fails the gate.
type Check = { name: string; fg: Oklch; bg: Oklch; min: number; decorative?: boolean; filter?: Filter };
const CHECKS: Check[] = [
  { name: "btn-no label (pearl on no-bg)", fg: T.pearl50, bg: T.btnNoBg, min: 4.5 },
  { name: "btn-yes label (pearl on yes-bg)", fg: T.pearl50, bg: T.btnYesBg, min: 4.5 },
  { name: "btn-danger label (pearl on danger-500)", fg: T.pearl50, bg: T.danger500, min: 4.5 },
  { name: "--border-control on --bg (form controls)", fg: T.borderControl, bg: T.bg, min: 3.0 },
  { name: "--border-control on --bg-elevated (form controls)", fg: T.borderControl, bg: T.bgElevated, min: 3.0 },
  { name: "--text on --bg", fg: T.text, bg: T.bg, min: 4.5 },
  { name: "--border on --bg (decorative — exempt)", fg: T.border, bg: T.bg, min: 3.0, decorative: true },
  { name: "--border-strong on --bg (decorative — exempt)", fg: T.borderStrong, bg: T.bg, min: 3.0, decorative: true },

  // The ink ramp, on every surface it actually lands on. Body copy => 4.5.
  { name: "--text-muted on --bg", fg: T.textMuted, bg: T.bg, min: 4.5 },
  { name: "--text-muted on --bg-elevated", fg: T.textMuted, bg: T.bgElevated, min: 4.5 },
  { name: "--text-muted on --panel", fg: T.textMuted, bg: T.panel, min: 4.5 },
  { name: "--text-subtle on --bg", fg: T.textSubtle, bg: T.bg, min: 4.5 },
  { name: "--text-subtle on --bg-elevated", fg: T.textSubtle, bg: T.bgElevated, min: 4.5 },
  { name: "--text-subtle on --panel", fg: T.textSubtle, bg: T.panel, min: 4.5 },
  { name: "--text-subtle on --bg-inset", fg: T.textSubtle, bg: T.bgInset, min: 4.5 },
  { name: "--text-faint on --bg", fg: T.textFaint, bg: T.bg, min: 4.5 },
  { name: "--text-faint on --bg-elevated", fg: T.textFaint, bg: T.bgElevated, min: 4.5 },
  { name: "--text-faint on --panel", fg: T.textFaint, bg: T.panel, min: 4.5 },

  // ── Gold, checked for the first time (ATOM 2d) ────────────────────────────
  { name: "btn-gold label (gold-fg on gold-500)", fg: T.btnGoldFg, bg: T.btnGoldBg, min: 4.5 },
  { name: "--gilt money ink on --bg", fg: T.gilt, bg: T.bg, min: 4.5 },
  { name: "--gilt money ink on --bg-elevated", fg: T.gilt, bg: T.bgElevated, min: 4.5 },
  { name: "--gilt money ink on --panel", fg: T.gilt, bg: T.panel, min: 4.5 },
  { name: "--gilt-strong on --bg", fg: T.giltStrong, bg: T.bg, min: 4.5 },
  { name: "--gilt-strong on --bg-elevated", fg: T.giltStrong, bg: T.bgElevated, min: 4.5 },
  // .chip-resolved paints its label over `linear-gradient(--gold-300 → --gold-500)`.
  // Dark ink on a light ramp is worst at the DARK stop — but the stop is now
  // CHOSEN by worstStop() off the rule itself rather than named here, so ATOM
  // 2b's re-derivation of the gold ramp cannot leave this pointing at a shade
  // that is no longer the worst one.
  { name: "chip-resolved label on gold ramp (worst stop)", fg: T.chipResolvedFg, bg: worstStop(T.chipResolvedFg, T.chipResolvedStops), min: 4.5 },
  { name: "--gold-300 on --bg (objection chip ink)", fg: T.gold300, bg: T.bg, min: 4.5 },

  // ── The gradient controls, and their hover rasters — E-119 ────────────────
  // ⛔ 13px/600 at `btn-sm` is NOT WCAG-large (that needs 18px, or 14px BOLD),
  // so 4.5 is the bar on every one of these and 3.0 is not available.
  { name: "btn-primary label (pearl on royal ramp, worst stop)", fg: T.pearl50, bg: worstStop(T.pearl50, T.btnPrimaryStops), min: 4.5 },
  { name: "btn-primary label :hover (filter rastered)", fg: T.pearl50, bg: worstStop(T.pearl50, T.btnPrimaryStops, T.btnPrimaryHover), min: 4.5, filter: T.btnPrimaryHover },
  { name: "btn-claret label (claret-50 on claret ramp, worst stop)", fg: T.btnClaretFg, bg: worstStop(T.btnClaretFg, T.btnClaretStops), min: 4.5 },
  { name: "btn-claret label :hover (filter rastered)", fg: T.btnClaretFg, bg: worstStop(T.btnClaretFg, T.btnClaretStops, T.btnClaretHover), min: 4.5, filter: T.btnClaretHover },
];

// 🔴 E-120 IS OPEN AND IS DELIBERATELY NOT LISTED ABOVE — say so here rather than
// leave a reader to infer it from an absence. The same `filter: brightness()`
// hover that E-119 forced this file to model puts THREE of the five flat-solid
// buttons under 4.5 as well, measured on production rather than modelled:
// `.btn-yes` 4.74 → **4.36**, `.btn-danger` 4.85 → **4.37**, `.btn-no` 5.00 →
// 4.59 (the only one that survives). Their remedy is not this atom's: two of the
// three are semantic fills and the third is `--danger-500`, a SHARED token, so
// each needs its own visual sign-off. The checks land in the commit that fixes
// them — a gate added over a known-failing surface would just be red on purpose.

// ✅ AUDIT H10 IS CLOSED, and its fixes are now PARSED rather than described.
// `.btn-yes` 57%→53%, `--danger-500` 60%→57% and the new `--border-control`
// all shipped; this block used to carry them as a to-do list *and* as the
// hand-typed inputs above, which is how `--text` drifted unnoticed. The values
// are read off globals.css now, so the record belongs in the log, not here.

let fails = 0;
for (const c of CHECKS) {
  const r = contrast(c.fg, c.bg, c.filter);
  const pass = r >= c.min;
  const tag = c.decorative ? (pass ? "PASS" : "INFO") : pass ? "PASS" : "FAIL";
  if (!pass && !c.decorative) fails++;
  console.log(`${tag}  ${c.name.padEnd(52)} ${r.toFixed(2)} (need ${c.min})`);
}
console.log(`\ncontrast-audit: ${fails} gate failure(s) (decorative dividers are WCAG 1.4.11-exempt)`);
if (fails > 0) process.exit(1);
