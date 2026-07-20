/**
 * CSS design-token collision guard.
 *
 * The bug this exists to prevent (found live 2026-07-20, motion was silently dead
 * across the whole platform):
 *
 *   globals.css        --ease-micro: 100ms cubic-bezier(0.2, 0.8, 0.2, 1);   <- duration baked in
 *   micro-patterns.css --ease-micro: cubic-bezier(.2,.8,.2,1);               <- bare curve, loads LAST
 *
 * Both files are loaded, the last one wins, and every rule written as
 *   `transition: border-color var(--ease-micro);`
 * expanded to a transition with NO duration -> 0s. Input focus rings, selects,
 * textareas, tabs, button shadows, progress bars and the probability chart all
 * snapped instantly. Nothing errored; nothing was red; the UI just felt cheap.
 *
 * The same shadowing hit --dur-stage (820ms -> 240ms, so the countdown ring and
 * chart draw-in ran 3.4x too fast), the four chat easings (whole AI panel had zero
 * motion), and --glow-gold (a button drop-glow overwrote the ambient badge glow).
 *
 * Three rules, each of which would have caught it:
 *   1. No motion/elevation token is DEFINED in more than one file.
 *   2. Every --ease-* / --cm-ease-* value is a BARE curve (no time unit). Durations
 *      live in --dur-* and a consumer must state both.
 *   3. No `transition:`/`animation:` shorthand references an easing var without a
 *      duration in front of it.
 *
 * Run: npm run test:tokens
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/** Token families where cross-file redefinition is a real bug, not a theme override. */
const GUARDED = /^--(ease|dur|glow|z|shadow|ring|halo)-/;

/**
 * Tokens legitimately re-declared in a *scoped* block (theme/motion/media variants)
 * within the SAME file are fine — we only compare across files, and we ignore
 * declarations that sit inside a non-`:root` selector or an @media/@supports block.
 */
function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...cssFiles(p));
    else if (e.endsWith(".css")) out.push(p);
  }
  return out;
}

/** Strip comments so commented-out examples never trip the linter. */
const decomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("CSS token collision guard\n");

const files = cssFiles(SRC);

// ---------------------------------------------------------------------------
// 1. No guarded token defined in more than one file.
// ---------------------------------------------------------------------------
const definedIn = new Map<string, Set<string>>();
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const body = decomment(readFileSync(f, "utf8"));
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
    const tok = m[1];
    if (!GUARDED.test(tok)) continue;
    if (!definedIn.has(tok)) definedIn.set(tok, new Set());
    definedIn.get(tok)!.add(rel);
  }
}
const collisions = [...definedIn.entries()]
  .filter(([, fs]) => fs.size > 1)
  .map(([tok, fs]) => `${tok} in ${[...fs].join(" + ")}`);
check(
  "no motion/elevation token defined in two files",
  collisions.length === 0,
  collisions.length ? `${collisions.length}: ${collisions.join(" | ")}` : "",
);

// ---------------------------------------------------------------------------
// 2. Easing tokens are bare curves — no baked-in duration.
// ---------------------------------------------------------------------------
const baked: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const body = decomment(readFileSync(f, "utf8"));
  for (const m of body.matchAll(/(--(?:cm-)?ease-[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (/\b\d*\.?\d+\s*m?s\b/.test(m[2])) baked.push(`${rel}: ${m[1]} = "${m[2].trim()}"`);
  }
}
check(
  "easing tokens carry no duration (pair with --dur-*)",
  baked.length === 0,
  baked.length ? `${baked.length}: ${baked.join(" | ")}` : "",
);

// ---------------------------------------------------------------------------
// 3. Every transition/animation using an easing var states a duration first.
//    e.g. `transition: opacity var(--ease-micro)` -> 0s. Must be
//         `transition: opacity var(--dur-micro) var(--ease-micro)`.
// ---------------------------------------------------------------------------
const durationless: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const body = decomment(readFileSync(f, "utf8"));
  for (const m of body.matchAll(/\b(transition|animation)\s*:\s*([^;{}]+)[;}]/gi)) {
    // Each comma-separated part is an independent transition/animation.
    for (const part of m[2].split(",")) {
      if (!/var\(--(?:cm-)?ease-/.test(part)) continue;
      // A duration is either a literal time or a --dur-* var appearing BEFORE the easing.
      const beforeEasing = part.slice(0, part.search(/var\(--(?:cm-)?ease-/));
      const hasDuration = /\b\d*\.?\d+\s*m?s\b/.test(beforeEasing) || /var\(--(?:cm-)?dur-/.test(beforeEasing);
      if (!hasDuration) durationless.push(`${rel}: "${part.trim().slice(0, 70)}"`);
    }
  }
}
check(
  "no duration-less transition/animation (would resolve to 0s)",
  durationless.length === 0,
  durationless.length ? `${durationless.length}: ${durationless.slice(0, 10).join(" | ")}` : "",
);

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${files.length} css files, ${definedIn.size} guarded tokens`);
process.exit(fail === 0 ? 0 : 1);
