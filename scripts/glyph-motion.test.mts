/**
 * DA-2 · M5 — A GLYPH MOVES FOR A REASON, AND ALL 178 MOVE THE SAME WAY.
 *
 *   npm run test:glyph-motion
 *
 * Four primitives (`.g-settle`, `.g-nudge-up/-down`, `.g-ring`, `.g-swap*`) are the ONLY
 * motion a glyph may take. Triggers are mount, data change or state change — never hover.
 * A glyph with bespoke keyframes is a violation (DESIGN_AUTHORITY §M / EXTEND.md M5).
 *
 * What this gate READS (the lesson of the three under-sized corpora, session 35): every
 * `.tsx` under src/ — components AND app routes — plus `src/app/motion.css` for the
 * primitive definitions and their reduced-motion branches. It checks:
 *
 *   1. No Tailwind bespoke animation (`animate-spin|pulse|ping|bounce`) rides ON a kit
 *      glyph (`<I.xxx …>`), or on a wrapper whose next-few-lines child is a kit glyph.
 *      Skeletons, spinner circles and status dots carry no `<I.` child and pass.
 *      (The kit `Spinner` is progress feedback, not a glyph — it is the sanctioned
 *      in-flight indicator and is exempt by construction: it renders a raw `<svg>`.)
 *   2. No hover-triggered glyph motion: no `hover:animate-*`, and no `.g-*` primitive
 *      behind a `hover:` / `group-hover:` variant.
 *   3. The four primitives exist in motion.css, each with BOTH clamped reduced-motion
 *      branches (`prefers-reduced-motion` + `html.kp-reduce-motion`). They are
 *      single-shot, so the third gate (`data-motion="reduced"`, the ambient-loop
 *      throttle) does not apply to them.
 *   4. Adoption floor — each primitive family has at least one consumer in src/**.tsx.
 *      This may only GROW; a vocabulary with zero consumers is a suggestion (E-116).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith(".tsx")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

let pass = 0; const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const files = walk("src");
const BESPOKE = /animate-(spin|pulse|ping|bounce)/g;

/* 1 · bespoke Tailwind animation on (or immediately wrapping) a glyph */
const bespokeOffenders: string[] = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let m: RegExpExecArray | null;
  BESPOKE.lastIndex = 0;
  while ((m = BESPOKE.exec(src))) {
    // The enclosing JSX opening tag: from the last `<` before the match to the next `>`.
    const open = src.lastIndexOf("<", m.index);
    const close = src.indexOf(">", m.index);
    const tag = src.slice(open, close + 1);
    // Direct hit: the animated element IS a kit glyph.
    const onGlyph = /^<I\./.test(tag);
    // Wrapper hit: the animated element's immediate content is a kit glyph
    // (the pulsing-motif pattern). Window = the 200 chars after the tag closes.
    const wrapsGlyph = !onGlyph && src.slice(close, close + 200).includes("<I.");
    if (onGlyph || wrapsGlyph) {
      const line = src.slice(0, m.index).split("\n").length;
      bespokeOffenders.push(`${f}:${line}`);
    }
  }
}
ok("1.0 the probe actually read files (never measure an empty list)", files.length > 300, `${files.length}`);
ok("1.1 ⭐ no kit glyph (or glyph wrapper) wears a bespoke Tailwind animation",
  bespokeOffenders.length === 0, bespokeOffenders.slice(0, 6).join(" · "));

/* 2 · never hover */
const hoverOffenders: string[] = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  src.split("\n").forEach((line, i) => {
    if (/(?:group-)?hover:[^"'\s}]*(?:animate-|g-(?:settle|nudge|ring|swap))/.test(line)) {
      hoverOffenders.push(`${f}:${i + 1}`);
    }
  });
}
ok("2.1 ⭐ no glyph motion triggers on hover (icons respond, they do not perform)",
  hoverOffenders.length === 0, hoverOffenders.slice(0, 6).join(" · "));

/* 3 · the primitives exist, with both clamped reduced-motion branches (M6) */
const motionCss = readFileSync("src/app/motion.css", "utf8");
const PRIMS = ["g-settle", "g-nudge-up", "g-nudge-down", "g-ring", "g-swap-in", "g-swap-out"];
/* Brace-balanced extraction of EVERY prefers-reduced-motion block — the first
   non-greedy attempt at this stopped at the file's earlier clamp block and
   called the real branches missing (suspect the instrument first). */
function reducedMotionBlocks(css: string): string {
  const out: string[] = [];
  const marker = "@media (prefers-reduced-motion: reduce)";
  let idx = css.indexOf(marker);
  while (idx !== -1) {
    let i = css.indexOf("{", idx); let depth = 1; const start = i + 1;
    while (depth > 0 && ++i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    out.push(css.slice(start, i));
    idx = css.indexOf(marker, i);
  }
  return out.join("\n");
}
const prmBlock = reducedMotionBlocks(motionCss);
for (const p of PRIMS) {
  ok(`3.1 .${p} is defined in motion.css`, new RegExp(`\\.${p}\\b`).test(motionCss));
  ok(`3.2 .${p} has the prefers-reduced-motion branch`, prmBlock.includes(`.${p}`));
  ok(`3.3 .${p} has the kp-reduce-motion mirror`, motionCss.includes(`html.kp-reduce-motion .${p}`));
}

/* 4 · adoption floor — each family has a consumer (count "g-xxx" string usage in tsx) */
const corpus = files.map((f) => readFileSync(f, "utf8")).join("\n");
const FAMILIES: Record<string, RegExp> = {
  "settle (arrival)": /"[^"]*\bg-settle\b|g-settle"/,
  "nudge-up (directional)": /\bg-nudge-up\b/,
  "nudge-down (directional)": /\bg-nudge-down\b/,
  "ring (alert)": /\bg-ring\b/,
  "swap (state morph)": /\bg-swap(-in|-out)?\b/,
};
for (const [name, re] of Object.entries(FAMILIES)) {
  ok(`4.1 primitive family "${name}" has at least one consumer`, re.test(corpus));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
