/**
 * Tailwind token-bridge guard.
 *
 * The bug this exists to prevent (found 2026-07-28 — 1,325 class usages compiled to
 * NOTHING, platform-wide, for the entire life of the project):
 *
 *   globals.css        --text-subtle: oklch(70% 0.080 268);   <- the token exists
 *   tailwind.config.ts text: { secondary, tertiary, ... }     <- but `subtle` is NOT here
 *   *.tsx              className="text-text-subtle"           <- so this is a NO-OP
 *
 * Tailwind only emits a utility for a key that exists in the theme. There is no
 * safelist and `plugins: []`, so a class naming a token the config never bridged is
 * not a utility — it is a typo that TypeScript cannot see and the build will not warn
 * about. The element silently inherits its parent's colour.
 *
 * Measured at the time of the fix:
 *   text-text-subtle  732   text-text-muted  433   text-text-faint  59
 *   text-royal-300     56   text-royal-200    13   border-text-subtle 10
 *   text-gilt           4   border-gilt        2   border-brand-700   6
 *   + bg-danger-500 / border-danger-500 / bg-info-500 / border-info-700 / text-warning-300
 *
 * Consequence: a four-step ink ramp (text -> muted -> subtle -> faint) rendered as two,
 * so every caption, hint, table header and timestamp that was written to recede did not
 * recede. The console read as a flat wall of near-equal-brightness text. `gilt` — the
 * brand needle's own colour — had no entry in the config at all.
 *
 * Why the existing gates missed it: `VISUAL-CONSISTENCY-AUDIT.md` (2026-07-17) grepped
 * for rogue *values* (raw hex, off-palette classes) and found none — correctly. It never
 * checked that the on-palette classes actually RESOLVE. A dead class is invisible to a
 * value audit, to tsc, and to the build.
 *
 * The rule: every colour-utility class written in the app must name a key that exists in
 * `tailwind.config.ts`. If a token has no key, either bridge it or stop using it — never
 * leave the class in place hoping it renders.
 *
 * Run: npm run test:bridge
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const CONFIG = join(ROOT, "tailwind.config.ts");

/** Utility prefixes that resolve against the `colors` theme map.
 *
 *  ⚠️ `shadow` is deliberately NOT here (removed 2026-07-29). Tailwind resolves
 *  `shadow-*` against the **boxShadow** map, not `colors` — so checking it here
 *  asked the wrong question and got the wrong answer both ways: `shadow-overlay`
 *  "passed" only because `overlay` happened to collide with a key in the `bg`
 *  colour family, while `shadow-overlay-up` and `shadow-glow-selected` were
 *  reported dead despite being correctly bridged in boxShadow. Section 5 below
 *  checks them against the map Tailwind actually uses. */
const COLOR_PREFIXES = [
  "text", "bg", "border", "ring", "fill", "stroke", "from", "via", "to",
  "divide", "outline", "decoration", "placeholder", "accent", "caret",
];

/**
 * Tailwind ships its own palette (red-500, zinc-800, …) and a set of keywords
 * (white, black, transparent, current, inherit, auto, none). Those resolve without
 * appearing in our `colors` map, so they are not bridge failures — they are a
 * *palette* question, which `VISUAL-CONSISTENCY-AUDIT.md` already governs (verdict:
 * zero off-palette classes). This guard only judges families WE define.
 */
const BUILTIN_KEYWORDS = new Set([
  "white", "black", "transparent", "current", "inherit", "none", "auto",
]);

/** Strip comments + block-comment JSX so commented-out examples never trip the guard. */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function walk(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (ext.test(e)) out.push(p);
  }
  return out;
}

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Tailwind token-bridge guard\n");

// ── 1. Parse the colour map out of tailwind.config.ts ────────────────────────
// Regex rather than an import: the config is TS with a `satisfies Config` tail and
// importing it would drag the whole Tailwind types graph into a test that must stay
// fast and dependency-free. The shape we need (family -> set of keys) is trivially
// extractable, and assertion 3 below proves the parse actually saw the file.
const cfgRaw = decomment(readFileSync(CONFIG, "utf8"));
const colorsStart = cfgRaw.indexOf("colors:");
const colorsBody = cfgRaw.slice(colorsStart, cfgRaw.indexOf("fontFamily:", colorsStart));

/** family -> Set of keys ("DEFAULT", "500", "subtle", …) */
const families = new Map<string, Set<string>>();
// Multi-line blocks:  royal: {  DEFAULT: "…", 300: "…", … }
// Single-line blocks: danger: { DEFAULT: "…", bg: "…" }
const famRe = /(^|\n)\s{6,10}([a-zA-Z][a-zA-Z0-9]*)\s*:\s*\{([\s\S]*?)\n?\s*\},?/g;
for (const m of colorsBody.matchAll(famRe)) {
  const name = m[2];
  const body = m[3];
  const keys = new Set<string>();
  for (const k of body.matchAll(/(?:^|[\s,{])["']?([A-Za-z0-9][A-Za-z0-9_]*)["']?\s*:/g)) keys.add(k[1]);
  if (keys.size) families.set(name, keys);
}
// Flat single-token entries at the TOP level of the map (e.g. `panel: "var(--panel)"`).
// The indent must be exactly 8 — a family sits at 8, its keys at 10. The old
// `\s{6,10}` also swallowed the keys, so `bg: { overlay: … }` silently registered
// a phantom top-level family called `overlay` (and 37 more like it). That inflated
// the reported family count to 58 and, worse, made a genuinely dead `bg-overlay`
// resolve against the phantom instead of failing. Verified 2026-07-29: tightening
// this surfaces zero new dead classes today — it closes a false-pass, it does not
// paper over one.
for (const m of colorsBody.matchAll(/\n {8}([a-zA-Z][a-zA-Z0-9]*)\s*:\s*["']/g)) {
  if (!families.has(m[1])) families.set(m[1], new Set(["DEFAULT"]));
}

check(
  "parsed the colour map from tailwind.config.ts",
  families.size >= 10,
  `only found ${families.size} families — the parser is broken, not the config`,
);

// ── 2. Collect every colour-utility class written in the app ─────────────────
const tsxFiles = walk(SRC, /\.tsx$/);
const prefixAlt = COLOR_PREFIXES.join("|");
// `-?` allows the negative-margin-style leading dash Tailwind permits on some utilities.
const classRe = new RegExp(String.raw`\b(${prefixAlt})-([a-zA-Z][a-zA-Z0-9]*)(?:-([a-zA-Z0-9]+))?(?=[\s"'\`\]/]|$)`, "g");

/** class -> {file, count} */
const dead = new Map<string, { files: Set<string>; count: number }>();

for (const file of tsxFiles) {
  const src = decomment(readFileSync(file, "utf8"));
  for (const m of src.matchAll(classRe)) {
    const [full, , fam, step] = m;
    if (BUILTIN_KEYWORDS.has(fam)) continue;
    const keys = families.get(fam);
    if (!keys) continue;                       // not one of our families — out of scope
    const wanted = step ?? "DEFAULT";
    if (keys.has(wanted)) continue;            // resolves
    // `border-<family>` with no step is legal when the family has DEFAULT; already handled.
    const rec = dead.get(full) ?? { files: new Set<string>(), count: 0 };
    rec.files.add(relative(ROOT, file));
    rec.count++;
    dead.set(full, rec);
  }
}

// ── 3. Report ────────────────────────────────────────────────────────────────
const total = [...dead.values()].reduce((n, r) => n + r.count, 0);
check(
  "every colour-utility class resolves to a key in tailwind.config.ts",
  dead.size === 0,
  dead.size ? `${dead.size} dead class(es), ${total} usage(s)` : "",
);

if (dead.size) {
  log("");
  for (const [cls, rec] of [...dead.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const where = [...rec.files].slice(0, 3).join(", ");
    log(`    ${cls.padEnd(26)} ${String(rec.count).padStart(4)}x  ${where}${rec.files.size > 3 ? ` (+${rec.files.size - 3} more)` : ""}`);
  }
  log("");
  log("  Each of these compiles to NOTHING. Either add the key to tailwind.config.ts");
  log("  (only if the CSS variable genuinely exists in globals.css), or change the");
  log("  call site to a token that does exist. Never leave a dead class in place.");
}

// ── 4. Spot-check the families this guard was written for ────────────────────
// Belt-and-braces: if a future edit deletes these keys, assertion 2 catches it only
// while a call site still uses them. These make the intent explicit and permanent.
for (const [fam, key] of [
  ["text", "subtle"], ["text", "muted"], ["text", "faint"],
  ["royal", "300"], ["gilt", "DEFAULT"], ["danger", "500"], ["info", "500"],
] as const) {
  check(`${fam}.${key} is bridged`, !!families.get(fam)?.has(key));
}

// ── 5. `shadow-*` resolves against the boxShadow map ─────────────────────────
// Added 2026-07-29 with the B10 freeze. The elevation ladder is now a design
// primitive with named rungs (card / modal / overlay / overlay-up / card-top),
// and a mistyped rung is exactly as invisible as a mistyped colour was: Tailwind
// emits nothing, tsc cannot see it, the build does not warn, and the element
// silently renders flat. Same law (B8/law 14), different map.
const shadowStart = cfgRaw.indexOf("boxShadow:");
const shadowBody = shadowStart < 0 ? "" : cfgRaw.slice(shadowStart, cfgRaw.indexOf("}", shadowStart));
const shadowKeys = new Set<string>();
for (const m of shadowBody.matchAll(/(?:^|[\s,{])["']?([A-Za-z0-9][A-Za-z0-9-]*)["']?\s*:/g)) {
  if (m[1] !== "boxShadow") shadowKeys.add(m[1]);
}
check(
  "parsed the boxShadow map from tailwind.config.ts",
  shadowKeys.size >= 5,
  `only found ${shadowKeys.size} keys — the parser is broken, not the config`,
);

// Tailwind's own built-in shadow scale resolves without appearing in our map.
const BUILTIN_SHADOWS = new Set(["sm", "md", "lg", "xl", "2xl", "inner", "none", "DEFAULT"]);
const deadShadows = new Map<string, { files: Set<string>; count: number }>();
// Skips `shadow-[…]` arbitrary values (a bracket follows the dash) — those are
// judged by test:design-frozen, which is the guard that wants them gone.
const shadowRe = /\bshadow-(?!\[)([a-zA-Z][a-zA-Z0-9-]*)(?=[\s"'`\]/]|$)/g;
for (const file of tsxFiles) {
  const src = decomment(readFileSync(file, "utf8"));
  for (const m of src.matchAll(shadowRe)) {
    const key = m[1];
    if (BUILTIN_SHADOWS.has(key) || shadowKeys.has(key)) continue;
    const rec = deadShadows.get(m[0]) ?? { files: new Set<string>(), count: 0 };
    rec.files.add(relative(ROOT, file));
    rec.count++;
    deadShadows.set(m[0], rec);
  }
}
check(
  "every shadow-* class resolves to a key in the boxShadow map",
  deadShadows.size === 0,
  deadShadows.size ? `${deadShadows.size} dead shadow class(es)` : "",
);
for (const [cls, rec] of deadShadows) log(`    ${cls.padEnd(26)} ${String(rec.count).padStart(4)}x  ${[...rec.files].slice(0, 3).join(", ")}`);

// The named rungs the B10 freeze depends on. If a future edit drops one, this
// fails immediately rather than waiting for a call site to notice.
for (const key of ["card", "modal", "overlay", "overlay-up", "card-top", "e1", "e5"]) {
  check(`boxShadow.${key} is bridged`, shadowKeys.has(key));
}

log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${tsxFiles.length} tsx files, ${families.size} colour families, ${shadowKeys.size} shadow rungs`);
process.exit(fail ? 1 : 0);
