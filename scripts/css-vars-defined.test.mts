/**
 * EVERY `var(--x)` RESOLVES TO A REAL DEFINITION.
 *
 *   npm run test:css-vars-defined      (proven by: npm run red:css-vars-defined)
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, LIVE FOR 21 DAYS AND FOUND BY A PLAYER, NOT BY A GATE.
 * `src/app/globals.css` shipped, in the phone filter sheet's very first commit (1cfa155c,
 * 2026-08-15):
 *
 *     .kp-fsheet-panel { … padding: 10px var(--gutter) calc(env(safe-area-inset-bottom,0px) + 14px); }
 *
 * `--gutter` was defined NOWHERE in the repository — it was used exactly once and declared
 * never. The sheet therefore rendered with **zero padding on all four sides**: heading and
 * chips against the screen edge, the close ✕ overflowing a 390px viewport by 3px, and the
 * primary button under the iPhone home indicator because the safe-area inset went with it.
 *
 * ⭐ WHY EVERY EXISTING INSTRUMENT WAS GREEN, AND WHY THIS ONE IS DIFFERENT. An unresolved
 * `var()` is NOT a syntax error. The declaration parses, survives PostCSS, survives Tailwind,
 * survives the minifier and arrives in the browser byte-for-byte; it is discarded only at
 * COMPUTED-VALUE time, where `padding` — not being inherited — falls back to `unset`, i.e. 0.
 * So:
 *   · `tsc` does not read CSS.                     · `next build` exits 0.
 *   · `test:tokens` checks for DOUBLE definitions — the opposite failure, and it needs a
 *     token to be defined twice before it has anything to say about it.
 *   · `qa:bundle-css` greps the SHIPPED bundle and correctly reports the rule present —
 *     the text is there. Reading the artefact is not enough when the artefact is a reference.
 *   · every design gate greps `src/`, where the string is also present.
 * ⛔ The only check that can catch this is one that RESOLVES the reference. That is this file.
 *
 * ── WHAT COUNTS AS A DEFINITION ───────────────────────────────────────────────────────────
 * A custom property is legitimately declared in three places in this repo, and all three are
 * collected, because a gate that only read `.css` would report every JS-driven variable as
 * undefined and be switched off within a week:
 *   1. a stylesheet          `--x: value;`  or  `@property --x { … }`
 *   2. a component           `style={{ "--x": … }}` / `setProperty("--x", …)`
 *   3. next/font             `variable: "--font-display"` in the loader config
 *
 * ── WHAT IS ALLOWED TO BE UNDEFINED ───────────────────────────────────────────────────────
 * `var(--x, fallback)` — a reference WITH a fallback is a deliberate optional hook and cannot
 * compute to nothing, so it is exempt. That exemption is also the honest repair for a genuine
 * optional: give it a fallback and the reference stops being a landmine.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";

/**
 * ⛔ COMMENTS MUST GO FIRST, AND THIS GATE PROVED IT ON ITSELF. Its first run reported
 * `--royal-N` and `--x` undefined — both from PROSE explaining a trap ("each alias below is
 * literally `var(--royal-N)`"), and one of them from the very paragraph documenting the
 * `--gutter` bug this file exists for. A guard that greps raw text finds the paragraph about
 * the fix instead of the fix; `scripts/lib/decomment.mts` is this repo's one stripper for
 * exactly that, and its header is worth reading before touching this.
 *
 * ⚠️ CSS GETS ITS OWN SCANNER RATHER THAN `decomment`. CSS has no `//` line comment, but it
 * does have `//` inside `url(https://…)` — handing that to a stripper that removes line
 * comments would delete the rest of the line and, with it, real declarations. So: block
 * comments only, string literals copied through verbatim, and NEWLINES PRESERVED so reported
 * line numbers still point at the offending line.
 */
function decommentCss(src: string): string {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const quote = c;
      out += c;
      for (i++; i < src.length; i++) {
        out += src[i];
        if (src[i] === "\\") { if (++i < src.length) out += src[i]; continue; }
        if (src[i] === quote) break;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      // ⛔ Unterminated: KEEP it. Text wrongly kept is a loud false positive; text wrongly
      // removed is a silent false negative, which is the failure mode this gate is for.
      if (end === -1) { out += src.slice(i); break; }
      for (const ch of src.slice(i, end + 2)) if (ch === "\n") out += "\n";
      i = end + 1;
      continue;
    }
    out += c;
  }
  return out;
}

/** ⛔ RE-AIMABLE, AND IT PRINTS WHAT IT READ — the same contract `test:tokens` follows, so the
 *  RED harness can point this at a COPY of the stylesheets instead of mutating real source. */
const ROOT = process.env.CSSVARS_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/**
 * Names the browser or the toolchain owns, which no file in this repo declares.
 * ⛔ KEEP THIS LIST SHORT AND ARGUED. Every entry is a hole in the gate, and the reflex when
 * this test goes red is to add one — which is how a gate stops being a gate. A genuinely
 * optional hook takes a `var(--x, fallback)` instead; that is not an exemption, it is a fix.
 */
const EXTERNAL = [
  /^--tw-/,   // Tailwind's own internals (ring, shadow, gradient plumbing), emitted by the engine
];

const files: string[] = [];
(function walk(dir: string) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(css|tsx?|mts|mjs)$/.test(e)) files.push(p);
  }
})(SRC);

const defined = new Set<string>();
/** name -> where it is referenced without a fallback */
const used = new Map<string, { file: string; line: number; text: string }[]>();

for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const isCss = f.endsWith(".css");
  const src = isCss ? decommentCss(raw) : decomment(raw);

  /* ── definitions ────────────────────────────────────────────────────────────────────────
     🔴 A DEFINITION IS A **WRITE**, AND THE FIRST VERSION COULD NOT TELL A WRITE FROM A READ.
     It collected any `--name` appearing inside ANY string literal in a `.ts`/`.tsx`, so a READ
     certified its own token: `exitBeatMs("--t-quick")` and `getPropertyValue("--gilt")` both
     made the gate believe those properties were declared.

     ⭐ MEASURED 2026-09-05 by deleting the real declaration and re-running:
       · remove `--gilt: var(--gold-300);` from globals.css  → gate still GREEN, while all 32
         `var(--gilt)` declarations become invalid at computed-value time;
       · remove `--t-quick: 140ms` from motion.css           → gate still GREEN, while roughly a
         hundred transitions and animations silently lose their duration.
     Sixteen live tokens were self-certifying that way — so the gate was blind to exactly the
     class of defect it exists for, on exactly the tokens it most needed to watch.

     ⛔ A WRITE IS NOW MATCHED BY ITS SHAPE, never by the name alone. */
  // A declaration — `--x: value` — in a stylesheet, or inside a component's `<style>` block,
  // which is CSS that happens to live in a template literal. ⚠️ Running this on TS/TSX too is
  // what makes a component-scoped `<style>` variable visible; a READ has no colon after the
  // name, and a quoted key is caught by the pattern below instead, so neither can slip in here.
  for (const m of src.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)) defined.add(m[2]);
  // `@property --x { … }` — a registered custom property is a definition too.
  for (const m of src.matchAll(/@property\s+(--[\w-]+)/g)) defined.add(m[1]);
  if (!isCss) {
    // `style={{ "--x": v }}` — an object KEY, so the closing quote is followed by a colon.
    for (const m of src.matchAll(/["'`](--[\w-]+)["'`]\s*:/g)) defined.add(m[1]);
    /* `style={{ ["--x" as string]: v }}` — a COMPUTED key, which is how this repo actually
       writes them (a custom property is not in `React.CSSProperties`, so the cast is needed):
       `toast.tsx:708` and `i18n.tsx:196` both use it. ⚠️ Found by this very hardening: tightening
       the quoted form to require a colon correctly stopped counting reads, and immediately
       reported `--toast-dwell` and `--lcl-a` as undefined — they are written, in this shape.
       ⛔ Still a WRITE-only pattern: a read has no `[ … ]:` wrapper around it. */
    for (const m of src.matchAll(/\[\s*["'`](--[\w-]+)["'`][^\]\n]*\]\s*:/g)) defined.add(m[1]);
    // `el.style.setProperty("--x", v)` — the name is the FIRST argument, never a read.
    for (const m of src.matchAll(/setProperty\(\s*["'`](--[\w-]+)["'`]/g)) defined.add(m[1]);
    // next/font: `variable: "--font-display"` in the loader config.
    for (const m of src.matchAll(/variable:\s*["'`](--[\w-]+)["'`]/g)) defined.add(m[1]);
  }

  /* ── uses, in stylesheets and in inline styles alike ─────────────────────────────────────
     ⛔ SCANNED OVER THE WHOLE FILE, NOT LINE BY LINE. The first version split on newlines, so a
     `var(` whose name wrapped to the next line was not judged AND not counted — the reference
     was invisible rather than reported, which is the same silence this gate exists to end.
     Reproduced: wrapping the sheet's own padding as `var(\n  --probe-multiline\n)` restored the
     E-270 defect in full and the gate stayed green with an unchanged reference count.
     `\s` already spans newlines; the line number is derived from the match index instead. */
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
    if (m[2] === ",") continue;                 // has a fallback — cannot compute to nothing
    const name = m[1];
    if (EXTERNAL.some((re) => re.test(name))) continue;
    const line = 1 + (src.slice(0, m.index ?? 0).match(/\n/g) ?? []).length;
    const text = (src.split(/\r?\n/)[line - 1] ?? "").trim().slice(0, 120);
    if (!used.has(name)) used.set(name, []);
    used.get(name)!.push({ file: relative(ROOT, f), line, text });
  }
}

console.log(`css-vars-defined: read ${files.length} files under ${SRC}`);
console.log(`  ${defined.size} custom properties defined · ${used.size} referenced without a fallback\n`);

const orphans = [...used.entries()].filter(([name]) => !defined.has(name));

for (const [name, sites] of orphans) {
  console.log(`FAIL ${name} is referenced but never defined`);
  for (const s of sites) console.log(`       ${s.file}:${s.line}  ${s.text}`);
}

/**
 * ⚠️ THE CONTROL. "0 orphans" and "0 references examined" print the same green tick, and the
 * second means the walker found nothing — a moved directory, a changed extension, a bad ROOT.
 * A gate that cannot tell those apart is the one this repo has been bitten by most.
 */
if (used.size === 0 || defined.size === 0) {
  console.log(`\n⛔ INCONCLUSIVE — the scan found ${defined.size} definitions and ${used.size} references.`);
  console.log(`   Exiting 2, never 0: "measured nothing" must not read as "found nothing wrong".`);
  process.exit(2);
}

if (orphans.length > 0) {
  console.log(`\ncss-vars-defined: ${orphans.length} undefined custom ${orphans.length === 1 ? "property" : "properties"}.`);
  console.log(`⛔ An unresolved var() is not an error — the declaration is dropped at computed-value time`);
  console.log(`   and the property silently becomes 'unset'. Define it, or give the reference a fallback.`);
  process.exit(1);
}

console.log(`PASS every var() reference resolves to a definition`);
console.log(`\ncss-vars-defined: ${used.size} references checked, 0 undefined.`);
