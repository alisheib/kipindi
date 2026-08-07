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
// ⛔ ONE definition of the corpus, shared with the RED harness. See contrast-corpus.mjs
// for why it is not a list in each file: two copies cost 21/21 → 0/21 in one edit.
import { CONTRAST_CORPUS } from "./contrast-corpus.mjs";

type Oklch = { l: number; c: number; h: number }; // l 0..1, c, h degrees
const ok = (l: number, c: number, h: number): Oklch => ({ l, c, h });

// ⛔ The path is PRINTED with the results. `CONTRAST_CSS` exists so the RED
// harness can point the gate at a mutated COPY instead of rewriting the live
// file — two sessions share this working tree and a mutate-then-restore window
// over globals.css can land inside the other session's build. A gate you can
// re-aim is only honest if it says what it read, so it does, every run.
/**
 * ⛔ RE-AIMED BY ROOT, NOT BY FILE — changed at ATOM 8 with the corpus.
 * It used to be `CONTRAST_CSS`, one path to one stylesheet, which worked exactly
 * as long as there was one stylesheet. With three, a single-file override would
 * have meant the RED harness ran a gate whose chat checks were SKIPPED — so the
 * four controls E-121 was filed against would have had no RED proof at all,
 * while the harness reported a full sheet of catches. `M1_ROOT` and `TOKENS_ROOT`
 * already work this way; this is the third of three, and now they agree.
 */
const ROOT = process.env.CONTRAST_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * ⭐ THE CORPUS IS MORE THAN ONE FILE — E-121, ATOM 2c-c.
 *
 * This gate read `globals.css` and nothing else, which is why `.cm-send`'s glyph
 * could sit at 2.55 against WCAG 1.4.11's 3.0 floor with every instrument green:
 * the support chat lives in `src/styles/chat/`, and a control the gate cannot
 * SEE is a control the gate cannot fail on. Adding a file is therefore not
 * housekeeping, it is coverage.
 *
 * ⛔ THIS WAS BLOCKED UNTIL E-122 WAS FIXED, and the reason is `declValue()`'s
 * own rule three functions below: it THROWS on a second declaration site,
 * because the browser takes the last and this parser takes the first. Three
 * tokens (`--claret`, `--claret-edge`, `--gilt`) were declared in globals AND in
 * chat-tokens, so a corpus containing both would have refused to start — and
 * "make the gate stop throwing" would have been the wrong repair. The duplicates
 * were the defect; they are gone, and `test:tokens` rule 1b now keeps them gone.
 *
 * ⛔ ORDER IS THE CASCADE'S ORDER, not alphabetical: chat-tokens and chat-styles
 * are `@import`ed at the TOP of globals.css, so globals is emitted LAST and wins
 * at equal specificity. `declValue()` refuses duplicates outright, so ordering
 * cannot silently pick a winner here — but a future reader must not have to
 * guess which way it would lean, so it is written the way the browser sees it.
 *
 * ⭐ A FOURTH SHEET, 2026-08-07 (ATOM C) — `src/app/motion.css`, AND FOR THE SAME
 * REASON E-121 ADDED THE CHAT PAIR: §C puts a CONTROL there. `.gilt-metal` is the
 * platform's earned-money CTA — Deposit, Continue — painted on a re-derived gold
 * ramp with `--gold-fg` ink, and until it was added the gate could not see the file
 * it lives in. **A control the gate cannot SEE is a control the gate cannot fail
 * on**, which is exactly how `.cm-send`'s glyph sat at 2.55 against a 3.0 floor with
 * everything green. Adding a file is coverage, not housekeeping.
 *
 * ⛔ AND THE LIST NO LONGER LIVES HERE. It is imported from `contrast-corpus.mjs`,
 * because the RED harness held a SECOND copy and adding the fourth sheet took it
 * from 21/21 caught to 0/21 in a single edit — the harness was still copying three
 * files, so every mutation ran against a corpus the gate refused to start on. That
 * is E-108's shape one document over, and the answer is the same: one definition,
 * imported by both.
 */
const CORPUS = CONTRAST_CORPUS.map((p) => `${ROOT.replace(/[\\/]+$/, "")}/${p}`);
const SHEETS = CORPUS.map((f) => ({
  path: f,
  // Comments are stripped first: a `/* --bg: was 15% */` note must not read as a
  // second declaration site, and must not be parseable as a value either.
  text: readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));
const CSS = SHEETS.map((s) => s.text).join("\n");
// ⛔ PRINTED HERE, not beside the results. The token table below is built at
// module scope and a parse defect throws inside it — so a path printed later
// is a path that never prints on exactly the runs where you most need to know
// which file was read.
console.log(`contrast-audit: reading ${SHEETS.length} sheet(s)`);
for (const s of SHEETS) console.log(`  · ${s.path}`);
console.log("");

/** `oklch(L% C H …)` → Oklch. Returns null when the text is not a literal. */
function parseOklch(raw: string): Oklch | null {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(raw);
  return m ? ok(Number(m[1]) / 100, Number(m[2]), Number(m[3])) : null;
}

/**
 * ⭐ A HEX LITERAL — added with the chat sheets (ATOM 2c-c). `.cm-send` writes
 * `color: #fff`, and until the corpus grew there was no hex anywhere in it.
 *
 * ⛔ IT IS CONVERTED, NOT APPROXIMATED. The tempting shortcut for `#fff` is to
 * return `ok(1, 0, 0)` by inspection — correct for white and wrong for the next
 * hex somebody writes, silently. This is the exact inverse of
 * `oklchToLinearSrgb()` below (Ottosson's matrices), so a hex and an oklch()
 * naming the same colour produce the same luminance. Verified on the round trip:
 * `#fff` → L 1.000 C 0.000, and its luminance comes out 1.0 to 15 places.
 */
function parseHex(raw: string): Oklch | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(raw.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const dec = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => dec(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m_ - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m_ + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m_ - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return ok(L, C, H);
}

/**
 * Read `--name: <value>` out of globals.css. Throws rather than falling back: a
 * silent default would recreate exactly the drift this parser was written to
 * kill. Throws on a SECOND declaration site for the same reason (INTAKE §2a).
 */
function declValue(name: string): string {
  const decls = [...CSS.matchAll(new RegExp(`--${name}\\s*:([^;}]*)`, "g"))].map((m) => m[1].trim());
  if (decls.length === 0) throw new Error(`contrast-audit: --${name} is not declared in the corpus (${SHEETS.map((s) => s.path).join(", ")})`);
  if (decls.length > 1) {
    throw new Error(
      `contrast-audit: --${name} has ${decls.length} declaration sites (${decls.join(" | ")}). ` +
        `INTAKE §2a: the browser takes the LAST, this gate takes the FIRST — so the product ` +
        `would render one value while every ratio below scored another. Edit the token AT ITS LINE. ` +
        `⚠️ Since the corpus is more than one file, this now also catches a CROSS-FILE duplicate ` +
        `(E-122) — the same rule test:tokens 1b enforces, arriving here as a hard stop.`,
    );
  }
  return decls[0];
}

/**
 * ⛔ A TOKEN MAY BE AN ALIAS, AND THE CHAIN IS FOLLOWED — not refused.
 * This used to demand a literal `oklch()` and throw otherwise, which was fine
 * while the corpus was one file of leaf colours. It is not fine now:
 * `--claret: var(--claret-600)` is a legitimate one-hop alias, and the chat's
 * escalate pill paints its ramp from it. Refusing the alias would have meant
 * hand-typing `--claret-600` into the check — the exact mirroring this file's
 * header narrates as the defect (`--text` had already drifted that way).
 * Resolution is bounded and reports the whole chain in the error, so a cycle
 * names itself instead of hanging.
 */
function token(name: string): Oklch {
  return colour(`--${name}`, declValue(name));
}

/**
 * A plain numeric token — `--btn-hover-gain: 1.03` (E-120). It carries the same
 * one-declaration-site rule as a colour, and for the same reason: the browser
 * takes the last and this gate takes the first, so a second copy would leave the
 * product on one hover gain while every ratio here scored another.
 */
function numberToken(name: string): number {
  const raw = declValue(name);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`contrast-audit: --${name} is "${raw}", not a plain number`);
  return n;
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
  // ⛔ EVERY OCCURRENCE, NOT THE FIRST — the same rule `declValue()` applies to a
  // token, for the same reason, and it only became reachable when the corpus grew
  // past one file (ATOM 2c-c). A selector written twice means the browser takes
  // the last and this parser takes the first, so the gate would score a rule the
  // product does not paint. `.cm-send` in the chat sheet and a hypothetical
  // `.cm-send` in globals is exactly that shape.
  const hits: number[] = [];
  for (const pat of [`\n${selector} {`, `\n${selector}{`]) {
    let i = CSS.indexOf(pat);
    while (i >= 0) { hits.push(i); i = CSS.indexOf(pat, i + 1); }
  }
  if (hits.length === 0) throw new Error(`contrast-audit: rule "${selector}" not found in the corpus`);
  if (hits.length > 1) {
    throw new Error(
      `contrast-audit: rule "${selector}" is declared ${hits.length} times in the corpus. ` +
        `The browser takes the LAST and this gate takes the FIRST, so the ratio below would ` +
        `describe a rule the product does not paint. One rule, one place.`,
    );
  }
  const open = CSS.indexOf("{", hits[0]);
  const close = CSS.indexOf("}", open);
  if (close < 0) throw new Error(`contrast-audit: rule "${selector}" is unterminated`);
  return CSS.slice(open + 1, close);
}

function ruleDecl(selector: string, prop: string): string {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`).exec(ruleBody(selector));
  if (!m) throw new Error(`contrast-audit: "${selector}" declares no ${prop}`);
  return m[1].trim();
}

/** A single colour — an `oklch()` literal, a `#hex`, or a `var(--token)` chain. */
function colour(where: string, raw: string, depth = 0): Oklch {
  const lit = parseOklch(raw);
  if (lit) return lit;
  const hex = parseHex(raw);
  if (hex) return hex;
  const v = /^var\(\s*--([a-z0-9-]+)\s*\)$/i.exec(raw.trim());
  if (v) {
    // Bounded, and the bound is not a style choice: a var() cycle would otherwise
    // recurse until the stack dies, and a stack overflow in a contrast gate reads
    // as "the gate is broken" rather than "the stylesheet has a cycle".
    if (depth >= 8) throw new Error(`contrast-audit: "${where}" — var() chain deeper than 8 hops, or a cycle`);
    return colour(`${where} → --${v[1]}`, declValue(v[1]), depth + 1);
  }
  throw new Error(
    `contrast-audit: "${where}: ${raw}" is not a literal oklch(), a #hex, or a plain ` +
      `var(--token). It cannot be scored, and a gate that silently skips a control is worse than one that stops.`,
  );
}

function ruleValue(selector: string, prop: string): Oklch {
  return colour(`${selector} { ${prop} }`, ruleDecl(selector, prop));
}

/**
 * 🔴 THE FILL A STATE ACTUALLY PAINTS — and this is a hole the RED harness found
 * in the first version of the chat checks (ATOM 8).
 *
 * A hover ratio was scored as "the REST fill, with the hover FILTER applied",
 * which is right only while no `:hover` rule overrides the fill itself. E-121 was
 * exactly such an override — `.cm-send:hover { background: var(--brand-400) }` —
 * so the check written to defend against E-121 could not have SEEN E-121. The
 * RED mutation that restores it scored the rest fill and passed.
 *
 * ⛔ THE STATE'S OWN DECLARATION WINS, and its absence falls back to the base
 * rule — which is what the cascade does. A hover that has no fill of its own is
 * still the base fill; a hover that has one is that one.
 */
function ruleValueForState(stateSelector: string, baseSelector: string, prop: string): Oklch {
  const body = ruleBody(stateSelector);
  const own = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`).exec(body);
  return own
    ? colour(`${stateSelector} { ${prop} }`, own[1].trim())
    : ruleValue(baseSelector, prop);
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
 * ⭐ A RAMP THAT LIVES IN A TOKEN, NOT IN A RULE — added 2026-08-07 (ATOM C).
 *
 * `ruleGradient()` above reads a gradient written inline in a rule. §C's money control
 * does not have one: `.gilt-metal { background-image: var(--gilt-sheen), var(--gilt-metal) }`
 * points at two TOKENS, and the ramp a label actually sits on is `--gilt-metal`'s own
 * value. Without this, the platform's earned-money CTA would have landed with **zero
 * contrast coverage** — and INTAKE §4c is explicit that a new surface taking a ramp gets
 * its worst-stop pair in the same commit, precisely because `.btn-primary` spent months
 * as the one control neither colour instrument could score (E-119).
 *
 * ⛔ It reuses `declValue()`, so a token with two declaration sites is a hard failure
 * here too (INTAKE §2a) rather than being silently read from the first one.
 */
function tokenGradient(name: string): Oklch[] {
  const raw = declValue(name);
  const g = /(?:linear|radial|conic)-gradient\(([\s\S]*)\)\s*$/.exec(raw);
  if (!g) throw new Error(`contrast-audit: --${name} is "${raw}", which is not a gradient`);
  const terms = g[1]
    .split(/,(?![^(]*\))/)
    .map((t) => t.trim().replace(/\s+(?:[-\d.]+(?:%|px|r?em)\s*)+$/, "").trim())
    .filter(Boolean);
  const DIRECTION = /^(?:[-\d.]+(?:deg|turn|rad|grad)|to\s+[a-z\s]+|circle\b|ellipse\b|closest-|farthest-|at\s|var\(\s*--[a-z0-9-]*angle[a-z0-9-]*\s*\))/i;
  const stops = DIRECTION.test(terms[0]) ? terms.slice(1) : terms;
  if (stops.length < 2) {
    throw new Error(`contrast-audit: --${name} resolved to ${stops.length} colour stop(s) — a ramp scored on one stop is a ramp half-read.`);
  }
  return stops.map((t) => colour(`--${name} stop`, t));
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
    const lit = /^[a-z-]+\(\s*([\d.]+)\s*\)$/i.exec(fn)?.[1];
    // `brightness(var(--btn-hover-gain))` — E-120 moved the gain into one token so
    // it cannot drift across five rules, and the gate has to follow it there or it
    // would be scoring a literal the product no longer contains.
    const ref = /^[a-z-]+\(\s*var\(\s*--([a-z0-9-]+)\s*\)\s*\)$/i.exec(fn)?.[1];
    const arg = lit !== undefined ? Number(lit) : ref ? numberToken(ref) : NaN;
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
  // ── The flat-solid family's hover rasters (2026-08-06, ATOM 4 · E-120) ────
  btnYesHover: ruleFilter(".btn-yes:hover:not(:disabled)"),
  btnNoHover: ruleFilter(".btn-no:hover:not(:disabled)"),
  btnDangerHover: ruleFilter(".btn-danger:hover:not(:disabled)"),
  btnGoldHover: ruleFilter(".btn-gold:hover:not(:disabled)"),

  /**
   * ── §C's STRUCK-GILT CONTROL (2026-08-07, ATOM C) ─────────────────────────
   * The earned-money CTA. Its ink is `--gold-fg` and its ramp is `--gilt-metal`,
   * whose three chromas were re-derived from the MEASURED trademark (E-124) rather
   * than pasted, so this pair is also the check that the re-derivation did not cost
   * legibility while it was fixing saturation.
   * ⚠️ REST IS THE WORST CASE HERE, and that is worth stating rather than leaving
   * to be re-derived: `--gilt-sheen` is the first background layer, parked
   * off-canvas at `background-position: 200% 0` until a hover sweeps it, and it is
   * a band of near-WHITE at 22% alpha. Against `--gold-fg`'s dark ink a lighter
   * background can only raise the ratio, so the resting metal is the honest
   * measurement and the hover cannot be worse.
   */
  giltMetalFg: ruleValue(".gilt-metal", "color"),
  giltMetalStops: tokenGradient("gilt-metal"),
  /** Money ink, `.gilt-ink` — the same question one layer up: struck metal as TYPE. */
  giltInkStops: tokenGradient("gilt-ink"),

  /**
   * ── THE RAISED WASH (2026-08-07, ATOM D) ──────────────────────────────────
   * The surface every market and Up & Down card sits on once `.mcardp` picks rung 1.
   * ⛔ Read as a RAMP, not as a colour: it runs 24% → 20.5% on the lamp's axis, and
   * the pair that matters is each ink against whichever stop reads WORST — the top-left
   * lit end for light ink. Scoring it as one colour is how a wash quietly costs the
   * accessibility budget the canvas atom earned.
   */
  washRaisedStops: tokenGradient("wash-raised"),
  washModalStops: tokenGradient("wash-modal"),
  /* `bg-elevated2` left the corpus 2026-08-07 (DA-9/E-132): the token is retired —
     the toast sits on `.mat-toast` (--wash-float) and both remaining consumers took
     the float wash. The two pairs it anchored moved to the wash stops below. */
  washFloatStops: tokenGradient("wash-float"),
};

/**
 * ── The SUPPORT CHAT (2026-08-06, ATOM 8 · 2c-c · E-121) ────────────────────
 *
 * The first controls this gate has ever scored outside `globals.css`. E-121 was
 * exactly the cost of that blindness: `.cm-send`'s white glyph sat at 2.55
 * against WCAG 1.4.11's 3.0 floor on hover, and no instrument in the repo could
 * see it — the token gate did not read the file, the DOM sweep cannot reach a
 * `:hover`, and the raster probe only knows about buttons.
 *
 * ⛔ NOTHING HERE IS TYPED. Both fills, both inks and both hover filters are read
 * off the rules that paint them, so an edit to `chat-styles.css` moves these
 * numbers rather than leaving them describing a file nobody re-read.
 *
 * ⭐ UNCONDITIONAL, deliberately. These were briefly built only when the corpus
 * happened to contain the chat sheets — which meant the RED harness, aiming the
 * gate at one file, ran a sheet of catches while the four controls E-121 was
 * FILED against were silently not in the run. That is a harness proving a gate
 * it is not exercising. The whole corpus is now aimed by ROOT, so these always
 * run, and a missing sheet is a hard read error rather than a quiet skip.
 */
const CHAT = {
  sendFg: ruleValue(".cm-send", "color"), // #fff — the first hex in the corpus
  sendBg: ruleValue(".cm-send", "background"), // var(--brand-500)
  // ⛔ The HOVER's own fill if it declares one, the rest fill if it does not —
  // see ruleValueForState(). Without this, the check written to defend against
  // E-121 could not see E-121, which the RED harness proved on its first run.
  sendHoverBg: ruleValueForState(".cm-send:hover", ".cm-send", "background"),
  sendHover: ruleFilter(".cm-send:hover"),
  escalateFg: ruleValue(".cm-escalate", "color"),
  escalateStops: ruleGradient(".cm-escalate", "background"),
  escalateHover: ruleFilter(".cm-escalate:hover"),
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
  /**
   * ── THE WASH, SCORED (2026-08-07, ATOM D) ─────────────────────────────────
   * ⛔ ADDED BEFORE THE CARD WAS ALLOWED TO ADOPT IT, not after. `.mcardp` moves from
   * a FLAT `--bg-elevated` at 22% lightness to `--wash-raised`, a 24% → 20.5%
   * gradient on the lamp's 166deg axis — so the surface behind card text gets
   * LIGHTER at the top-left, and lighter background means LOWER contrast for light
   * ink. `--text-faint on --bg-elevated` was already the tightest pair in the whole
   * ramp at 4.88 against a 4.5 floor, so this is the exact pair a wash could push
   * under, and "the card looks better" would have shipped over it.
   * ⭐ `worstStop()` picks the stop that reads worst against each ink, so these are
   * the honest figures rather than the flattering end of the ramp — which is the
   * lesson E-119 cost: a ramp scored on one stop is a ramp half-read.
   */
  { name: "--text-faint on --wash-raised (worst stop)", fg: T.textFaint, bg: worstStop(T.textFaint, T.washRaisedStops), min: 4.5 },
  { name: "--text-subtle on --wash-raised (worst stop)", fg: T.textSubtle, bg: worstStop(T.textSubtle, T.washRaisedStops), min: 4.5 },
  { name: "--text-muted on --wash-raised (worst stop)", fg: T.textMuted, bg: worstStop(T.textMuted, T.washRaisedStops), min: 4.5 },
  { name: "--text on --wash-raised (worst stop)", fg: T.text, bg: worstStop(T.text, T.washRaisedStops), min: 4.5 },
  /**
   * The card's own edge, and a FORM CONTROL's edge on a card — two different rules,
   * which the gate already encodes and my first version of these two lines did not.
   * 🔴 The card border went in without `decorative: true` and FAILED at 1.53, over a
   * value the gate has classified as exempt since it was written: `--border on --bg`
   * sits three lines above carrying that flag, because a card's edge is not the sole
   * means of identifying a control (WCAG 1.4.11's actual wording). **My check invented
   * a floor the repo deliberately does not apply** — and a gate that fails on correct
   * code is the failure mode this campaign has paid for more than any other.
   * ⭐ It stays MEASURED and printed as INFO rather than deleted: the number is worth
   * watching, it just is not a gate. `--border-control` IS held to 3.0, because a form
   * control's boundary genuinely is required information, and inputs do sit on cards.
   */
  { name: "--border on --wash-raised (decorative — exempt)", fg: T.border, bg: worstStop(T.border, T.washRaisedStops), min: 3.0, decorative: true },
  { name: "--border-control on --wash-raised (form controls on a card)", fg: T.borderControl, bg: worstStop(T.borderControl, T.washRaisedStops), min: 3.0 },
  // MEASURED BEFORE THE MODAL AND THE MENUS ARE ALLOWED TO ADOPT THEIR WASHES.
  // --wash-modal lifts to 28% lightness and --wash-float to 26.5%, both well above
  // the 22% flat fill they replace, so these are the pairs a lighter surface could
  // push under. A dialog carries body copy and form controls, not just headings.
  { name: "--text-faint on --wash-modal (worst stop)", fg: T.textFaint, bg: worstStop(T.textFaint, T.washModalStops), min: 4.5 },
  { name: "--text-subtle on --wash-modal (worst stop)", fg: T.textSubtle, bg: worstStop(T.textSubtle, T.washModalStops), min: 4.5 },
  { name: "--text on --wash-modal (worst stop)", fg: T.text, bg: worstStop(T.text, T.washModalStops), min: 4.5 },
  { name: "--border-control on --wash-modal (form controls in a dialog)", fg: T.borderControl, bg: worstStop(T.borderControl, T.washModalStops), min: 3.0 },
  { name: "--text-muted on --wash-float (worst stop)", fg: T.textMuted, bg: worstStop(T.textMuted, T.washFloatStops), min: 4.5 },
  // ⭐ THE TOAST NOW SITS ON RUNG 4 (`.mat-toast` → --wash-float; DA-1, 2026-08-07),
  // so its money-surface ink is scored against the wash's WORST stop below —
  // `--text on --wash-float` and `--text-muted on --wash-float`. The retired flat
  // `--bg-elevated2` (26%, above the 24% cap) predicted this move could only RAISE
  // contrast, and the wash pairs assert exactly that.
  { name: "--text on --wash-float (worst stop — the toast fill)", fg: T.text, bg: worstStop(T.text, T.washFloatStops), min: 4.5 },
  /* (Historical: `--text-faint on --bg-elevated2` measured 4.41 and was deliberately
     never asserted — no surface painted that pair. The token itself is retired now
     (DA-9/E-132), which closes that latent risk for good.) */
  { name: "--text-faint on --wash-float (worst stop)", fg: T.textFaint, bg: worstStop(T.textFaint, T.washFloatStops), min: 4.5 },
  { name: "--text-subtle on --wash-float (worst stop)", fg: T.textSubtle, bg: worstStop(T.textSubtle, T.washFloatStops), min: 4.5 },
  { name: "--text on --wash-float (worst stop)", fg: T.text, bg: worstStop(T.text, T.washFloatStops), min: 4.5 },
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

  // ── E-120 · the flat-solid family on :hover ───────────────────────────────
  // ⛔ EVERY ONE OF THESE WAS BELOW ITS RESTING RATIO AND NOTHING COULD SEE IT.
  // A `filter` is a raster effect, so the fill lightens while a `oklch(99%)` label
  // is already clipped: `.btn-yes` 4.74 → 4.36 and `.btn-danger` 4.85 → 4.37 on
  // production, both under the floor. The gain is now ONE token (`--btn-hover-gain`)
  // read straight off globals.css, so these four cannot be satisfied by a literal
  // that has drifted away from the one the product paints.
  { name: "btn-yes label :hover (filter rastered)", fg: T.pearl50, bg: T.btnYesBg, min: 4.5, filter: T.btnYesHover },
  { name: "btn-no label :hover (filter rastered)", fg: T.pearl50, bg: T.btnNoBg, min: 4.5, filter: T.btnNoHover },
  { name: "btn-danger label :hover (filter rastered)", fg: T.pearl50, bg: T.danger500, min: 4.5, filter: T.btnDangerHover },
  { name: "btn-gold label :hover (filter rastered)", fg: T.btnGoldFg, bg: T.btnGoldBg, min: 4.5, filter: T.btnGoldHover },
  // ── §C's money control and money ink (ATOM C). A new ramp gets its worst-stop
  // pair in the SAME commit — INTAKE §4c, written after `.btn-primary` spent months
  // as the one control neither colour instrument could score.
  { name: "gilt-metal label (gold-fg on the struck ramp, worst stop)", fg: T.giltMetalFg, bg: worstStop(T.giltMetalFg, T.giltMetalStops), min: 4.5 },
  // ⭐ `.gilt-ink` is background-clipped TYPE, so the ramp is the INK and the surface
  // behind it is the page. It is read as money, so it is held to 4.5 like any amount —
  // scored at the ramp's worst stop against the deepest surface it can land on.
  { name: "gilt-ink amount (struck-metal type on --bg, worst stop)", fg: worstStop(T.bg, T.giltInkStops), bg: T.bg, min: 4.5 },
  { name: "gilt-ink amount on --bg-elevated (worst stop)", fg: worstStop(T.bgElevated, T.giltInkStops), bg: T.bgElevated, min: 4.5 },

  // ── The support chat — E-121, and the first checks outside globals.css ─────
  // ⛔ 3.0, NOT 4.5, on the send control: it is a GLYPH, so WCAG 1.4.11 (non-text
  // contrast) is the applicable rule. Scoring it at 4.5 would overstate the
  // defect, which is the arithmetic this campaign has had to retract before.
  // The escalate pill carries TEXT at 13px/600, which is not WCAG-large, so 4.5.
  { name: "cm-send glyph (#fff on brand-500)", fg: CHAT.sendFg, bg: CHAT.sendBg, min: 3.0 },
  { name: "cm-send glyph :hover (own fill + filter rastered)", fg: CHAT.sendFg, bg: CHAT.sendHoverBg, min: 3.0, filter: CHAT.sendHover },
  { name: "cm-escalate label on claret ramp (worst stop)", fg: CHAT.escalateFg, bg: worstStop(CHAT.escalateFg, CHAT.escalateStops), min: 4.5 },
  { name: "cm-escalate label :hover (filter rastered)", fg: CHAT.escalateFg, bg: worstStop(CHAT.escalateFg, CHAT.escalateStops, CHAT.escalateHover), min: 4.5, filter: CHAT.escalateHover },
];

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
// ⛔ THE COUNT IS PRINTED, not just the failures. "0 failures" over 34 checks and
// over 38 read identically, and a check that silently stops running is the
// campaign's own named `checks-that-lie` shape.
console.log(`\ncontrast-audit: ${CHECKS.length} checks · ${fails} gate failure(s) (decorative dividers are WCAG 1.4.11-exempt)`);
if (fails > 0) process.exit(1);
