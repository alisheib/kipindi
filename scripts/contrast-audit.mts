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
function ruleValue(selector: string, prop: string): Oklch {
  const at = CSS.indexOf(`\n${selector} {`) >= 0 ? CSS.indexOf(`\n${selector} {`) : CSS.indexOf(`\n${selector}{`);
  if (at < 0) throw new Error(`contrast-audit: rule "${selector}" not found in ${GLOBALS}`);
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("}", open);
  if (close < 0) throw new Error(`contrast-audit: rule "${selector}" is unterminated`);
  const body = CSS.slice(open + 1, close);
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`).exec(body);
  if (!m) throw new Error(`contrast-audit: "${selector}" declares no ${prop}`);
  const raw = m[1].trim();
  const lit = parseOklch(raw);
  if (lit) return lit;
  const v = /^var\(\s*--([a-z0-9-]+)\s*\)$/i.exec(raw);
  if (v) return token(v[1]);
  throw new Error(
    `contrast-audit: "${selector} { ${prop}: ${raw} }" is neither a literal oklch() nor a plain ` +
      `var(--token). It cannot be scored, and a gate that silently skips a control is worse than one that stops.`,
  );
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
function luminance(o: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(o);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg: Oklch, bg: Oklch): number {
  const a = luminance(fg), b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
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
};

// `decorative: true` = WCAG 1.4.11 exempt (a divider that is NOT the sole means
// of identifying a control). Printed for reference but never fails the gate.
type Check = { name: string; fg: Oklch; bg: Oklch; min: number; decorative?: boolean };
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
  // Dark ink on a light ramp is worst at the DARK stop, so gold-500 is the honest
  // background to score — checking the 300 would flatter it by ~2 points.
  { name: "chip-resolved label on gold ramp (worst stop, gold-500)", fg: T.chipResolvedFg, bg: T.gold500, min: 4.5 },
  { name: "--gold-300 on --bg (objection chip ink)", fg: T.gold300, bg: T.bg, min: 4.5 },
];

// ✅ AUDIT H10 IS CLOSED, and its fixes are now PARSED rather than described.
// `.btn-yes` 57%→53%, `--danger-500` 60%→57% and the new `--border-control`
// all shipped; this block used to carry them as a to-do list *and* as the
// hand-typed inputs above, which is how `--text` drifted unnoticed. The values
// are read off globals.css now, so the record belongs in the log, not here.

let fails = 0;
for (const c of CHECKS) {
  const r = contrast(c.fg, c.bg);
  const pass = r >= c.min;
  const tag = c.decorative ? (pass ? "PASS" : "INFO") : pass ? "PASS" : "FAIL";
  if (!pass && !c.decorative) fails++;
  console.log(`${tag}  ${c.name.padEnd(52)} ${r.toFixed(2)} (need ${c.min})`);
}
console.log(`\ncontrast-audit: ${fails} gate failure(s) (decorative dividers are WCAG 1.4.11-exempt)`);
if (fails > 0) process.exit(1);
