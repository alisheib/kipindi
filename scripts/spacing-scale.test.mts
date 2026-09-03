/**
 * THE SPACING SCALE MUST NOT RUN BACKWARDS.
 *
 * 🔴 THE DEFECT (S-09, scan #1, 2026-08-28). `tailwind.config.ts` overrides `spacing` keys
 * 0.5 … 12 inside `theme.extend`, so it MERGES with the stock scale rather than replacing it.
 * The override is much coarser than stock, so at every key it does not cover, the scale
 * INVERTS — you write a bigger number and paint a smaller box:
 *
 *     gap-2.5 = 10px (stock)   while  gap-2 = 12px (overridden)   — 2px SMALLER
 *     gap-3.5 = 14px (stock)   while  gap-3 = 16px (overridden)   — 2px SMALLER
 *     h-14    = 56px (stock)   while  h-12  = 128px (overridden)  — 72px SMALLER
 *
 * Measured against `tailwindcss/defaultTheme` at a 16px root (globals.css sets no html
 * font-size): the scale rises 0.5→12 (2…128px), falls off a cliff at 14, TIES key 12 exactly
 * at 32, and only resumes rising at 36. This is the mechanism behind cramped, uneven, subtly
 * wrong rows — the symptom is diffuse, which is why it survived.
 *
 * ⛔ WHAT THIS GUARD DOES NOT DO. It does not ban non-overridden keys. `p-0`, `p-px`, `w-36`
 * and up are all fine — they are monotonic. Banning "not in the override" would flag ~250
 * correct usages and be suppressed within a week. The rule is the DEFECT: a key whose stock
 * value is smaller than a LOWER key's overridden value. That is a fact about two numbers, and
 * it is computed here from the config rather than typed in, so re-tuning the override
 * re-derives the forbidden set instead of silently invalidating this file.
 *
 * ⛔ AND THE OVERRIDE IS NOT RENUMBERED. tailwind.config.ts records that Ali deliberately
 * deferred that (it is written against `borderRadius`, but the same argument holds and is
 * stronger here): renumbering would move every margin, pad and gap in the product at once.
 * The scale is frozen as legacy; this gate stops the backlog GROWING while it stands.
 *
 * Run: npm run test:spacing-scale
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";
import defaultTheme from "tailwindcss/defaultTheme";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// ── The two scales, both read rather than remembered ─────────────────────────
const twConfig = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
/** ⚠️ The same parse `tap-target.test.mts` uses — one way to read this block, not two. */
const block = /spacing:\s*\{([\s\S]*?)\n\s{6}\},/.exec(twConfig);
const OVERRIDE = new Map<string, number>();
for (const m of (block?.[1] ?? "").matchAll(/"([\d.]+)":\s*"(\d+)px"/g)) OVERRIDE.set(m[1], Number(m[2]));

/** Stock keys, in px at a 16px root. `defaultTheme.spacing` values are rem strings. */
const STOCK = new Map<string, number>();
for (const [k, v] of Object.entries(defaultTheme.spacing as Record<string, string>)) {
  const rem = /^([\d.]+)rem$/.exec(v);
  if (rem) STOCK.set(k, Number(rem[1]) * 16);
  else if (v === "1px") STOCK.set(k, 1);
  else if (v === "0px") STOCK.set(k, 0);
}

ok("0: the override block was parsed", OVERRIDE.size >= 10, `${OVERRIDE.size} keys`);
ok("0: the stock scale was resolved from tailwindcss", STOCK.size >= 20, `${STOCK.size} keys`);

/**
 * ⭐ THE FORBIDDEN SET, DERIVED. A key is forbidden when it is NOT overridden and its stock
 * value is <= the overridden value of some numerically LOWER key — i.e. writing a bigger
 * number paints an equal or smaller box. Computed, so the set follows the config.
 */
const numeric = (k: string) => Number(k);
const inverted: { key: string; px: number; beaten: string; beatenPx: number }[] = [];
for (const [k, px] of STOCK) {
  if (OVERRIDE.has(k) || !/^[\d.]+$/.test(k)) continue;
  for (const [ok2, opx] of OVERRIDE) {
    if (numeric(ok2) < numeric(k) && opx >= px) {
      inverted.push({ key: k, px, beaten: ok2, beatenPx: opx });
      break;
    }
  }
}
const FORBIDDEN = new Set(inverted.map((i) => i.key));
ok("0: ⭐ the inverted keys were DERIVED from the two scales, not typed in",
  FORBIDDEN.size > 0, [...inverted].map((i) => `${i.key}=${i.px}px < ${i.beaten}=${i.beatenPx}px`).join(" · "));
// The three the scan named by hand must be in the derived set, or the derivation is wrong.
for (const k of ["2.5", "3.5", "14"]) {
  ok(`0: …and it contains ${k}, which the scan measured by hand`, FORBIDDEN.has(k));
}

// ── The corpus ───────────────────────────────────────────────────────────────
const PREFIX = "(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|start|end|inset|inset-x|inset-y|translate-x|translate-y|basis|scroll-mt|scroll-mb|scroll-pt|scroll-pb)";
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(${[...FORBIDDEN].map((k) => k.replace(".", "\\.")).join("|")})\\b`, "g");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

const hits = new Map<string, number>();
let total = 0;
for (const f of walk(SRC)) {
  const src = decomment(readFileSync(f, "utf8"));
  const n = [...src.matchAll(USE)].length;
  if (n > 0) { hits.set(relative(ROOT, f).replace(/\\/g, "/"), n); total += n; }
}

/**
 * ⛔ THE RATCHET, AND THE HONEST NUMBER. This is a real backlog — roughly seven hundred
 * usages, every one of them reading as a step UP and painting a step DOWN. Renumbering the
 * override is the actual fix and it is deferred by decision, so the job here is to stop the
 * backlog GROWING. MAY ONLY SHRINK.
 *
 * ⚠️ Set from the measured tree, comments stripped. If it drops, lower it in the same commit —
 * a ceiling above the real count stops being a ratchet.
 */
const CEILING = 554;   // -7, 2026-09-03: `layout/needle-drawer.tsx` — the Needle's theme menu shipped ELEVEN inverted keys (3× `gap-2.5`, 3× `py-2.5`, `px-2.5`, 2× `pt-3.5`, `py-3.5`, `mt-3.5`), which is what took this ratchet 561 → 565 and held `test:all` red on `main`. All eleven moved onto the scale: 2.5 (Tailwind STOCK 10px) → 2 (this product's OVERRIDDEN 12px) and 3.5 (stock 14px) → 3 (override 16px). ⚠️ EVERY MOVE IS +2px AND IS A RENDERED CHANGE, said plainly rather than folded in — a drawer menu's gaps and paddings each grow 2px, verified at 320/390 not to overflow or clip. ⭐ AND NOTE WHICH DIRECTION THE DEFECT RAN: `gap-2.5` painted 10px where `gap-2` paints 12, so the file's author had written the LARGER-looking key for the SMALLER box, four times, without any way to notice. That inversion is derived from the two scales by §0, not typed in — which is why this guard could name it. ⛔ The file belongs to a parallel session; the change is 2px of air on the product's own scale, and the eleven sites are listed here so its owner can see exactly what moved.   // -1, 2026-08-31, DG-S-03: `/admin/roles`'s hand-rolled section rail declared its height as `py-2.5` — 10px on a scale where `py-2` is 12 — and it went with the rail when the page adopted the kit `<Tabs variant="line">`, whose 44px is a declared height rather than padding. ⭐ Worth reading twice, because it is the same defect in two guards at once: `tap-target` §3 reads a DECLARED height and is structurally blind to one made of padding, so `/admin/players/[id]`'s 52px `py-3` rail has never been visible to it either. A control that states its height as padding is invisible to the tap gate AND, at a `.5` step, counted by this one.   // -59, 2026-08-30, session 82 -- the largest fall this ratchet has taken, and it is a SIDE EFFECT: DG-A-08 replaced ~24 hand-rolled admin controls with kit `<Button>`s, and every one of them took its hand-typed `px-2.5 py-1.5` inverted-key padding with it. ⛔ The matcher was NOT touched this session (`git status` on this file: clean), which is the check that separates a cleanup from a collapse -- and §3 still sees 566 usages across 188 files. # 2026-08-30: -3 (DG-A-06). `px-2.5` left three hand-rolled selection capsules as they converted to FilterPill — CardSortControl's two byte-identical copies and /admin/proposals' queue rail. ⭐ The primitive's dense rank writes `px-2.5` too, so the win is real but SMALLER than the conversion looks: the inverted key moved from three call sites into ONE definition site, which is the shape this ratchet wants. Before that — 2026-08-29: -3, AdminKpi x2 + its skeleton left p-3.5 (14px) for p-2 (12px) — DG-A-16. Then -1 on 2026-08-30 (DG-P-03): the BackLink ghost's `w-16`. ⚠️ AND THIS GUARD EARNED ITS KEEP THE SAME DAY — adopting `PageHeader` in the deposit and withdraw skeletons meant COPYING that ghost into two more files, and this suite caught it at 631 before it shipped. A ratchet's job is not only to shrink a backlog; it is to stop a sweep from spreading one while it tidies something else.

ok(`1: 🔴 inverted spacing usages may only shrink (${total}, ceiling ${CEILING})`,
  total <= CEILING,
  total > CEILING ? `${total - CEILING} NEW — a key that reads bigger and paints smaller` : "");
ok("2: ⛔ …and if it drops, LOWER THE CEILING in the same commit",
  total === CEILING,
  `${total} vs ${CEILING} — a ceiling above the real count stops being a ratchet`);

/**
 * ⭐ THE RECONCILIATION. Everything above hangs off one regex over one corpus. If the matcher
 * or the walk breaks, `total` falls to 0 and check 1 passes while check 2 reports a number
 * nobody reads as a failure of SIGHT. So the population is asserted to exist: this is a known
 * backlog, and a sudden zero means the instrument, not the fix.
 */
ok("3: ⛔ the scanner can still SEE the backlog it is ratcheting",
  total > 100 && hits.size > 20,
  `${total} usages across ${hits.size} files — a collapse here is the matcher, not a cleanup`);

/**
 * 🔴 THE ONE CONFIRMED INVERSION, asserted by name. `admin-proposals-client.tsx` reads
 * `gap-3 … sm:flex-row sm:items-center sm:gap-3.5` — plainly "a little more air once this
 * becomes a horizontal row", and it TIGHTENS from 16px to 14px at exactly the breakpoint where
 * the content goes side by side and needs more.
 */
{
  const f = "src/app/admin/proposals/admin-proposals-client.tsx";
  const src = decomment(readFileSync(join(ROOT, f), "utf8"));
  ok("4: 🔴 the proposals row no longer tightens at the sm breakpoint",
    !/gap-3\b[^"'`]*sm:gap-3\.5/.test(src),
    "sm:gap-3.5 is 14px against a base gap-3 of 16px — wider layout, tighter gutter");
}

console.log(`\nspacing-scale: ${pass} passed, ${fail} failed · ${total} inverted usages in ${hits.size} files`);
if (fail > 0) process.exit(1);
