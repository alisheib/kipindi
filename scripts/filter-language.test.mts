/**
 * test:filter-language — every player filter control speaks ONE language, defined ONCE.
 *
 * 🔴 WHY THIS GATE EXISTS. Ali, reading the live platform on 2026-08-14: *"filtering is not
 * designed properly, markets has a different filter design than up and down. This is not
 * acceptable in a consistent professional platform."* He was right, and the scan that followed
 * measured it in a browser rather than arguing it: **four control heights** (40 / 44 / 48 /
 * 64px), **two radii** (8px against the pill's 999px), an inline `style` at the call site on
 * every diverging surface — and the defect that is not cosmetic, **every diverging surface
 * outlined EVERY control**, contradicting the one rule the current design exists to embody.
 *
 * ⛔ NOTHING WAS WATCHING, WHICH IS WHY IT DRIFTED. `test:design-frozen` exempts any line
 * containing `var(--`, and every one of those inline styles did — so the ratchet was green over
 * six law-82 breaches for as long as they existed. `test:ui-consistency` reads no radius and no
 * height. A green suite was not evidence; a person looking at two screens was.
 *
 * The gate asserts four things, because no one of them is satisfiable alone:
 *
 *   §0 THE SURFACE SET — the list of rails is real, complete, and cannot silently empty.
 *   §1 THE PRIMITIVE — the language is defined once, correctly.
 *   §2 THE PAINT — the selected fill is a token consumed through a CLASS, never inline (law 82).
 *   §3 EVERY SURFACE consumes the primitive and re-expresses nothing.
 *   §4 THE CHART RANGE — the eighth filter control, which was painted in the money ink.
 *
 * ⚠️ §0 IS THE POSITIVE CONTROL AND IT IS THE POINT. A rule of the form "every filter surface
 * must do X" passes vacuously the moment the set of filter surfaces becomes empty — a renamed
 * file, a moved component, a changed attribute, and this gate would report "all green" over a
 * tree it never looked at. That is exactly how a THIRD copy of the time-left formatter lived
 * through two batches while its own gate was green. §0 asserts the set is found, is at least as
 * large as the eight rails measured on 2026-08-14, and contains no rail nobody declared.
 *
 * Run: npm run test:filter-language     RED proof: npm run red:filter-language
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
const fails: string[] = [];
function ok(cond: boolean, label: string, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/**
 * ⛔ COMMENTS ARE STRIPPED FIRST. This gate bans strings that its own subjects legitimately
 * DISCUSS: `discovery-bar.tsx` records the inline style it used to carry, in prose, as the
 * tombstone that stops someone reinstating it. Matching on words the code's own documentation
 * contains would fail a file for explaining itself.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "").replace(/\/\/.*$/gm, "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${e}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(rel);
  }
  return out;
}

const PRIMITIVE = "src/components/ui/filter-pill.tsx";
const CSS = "src/app/globals.css";

/**
 * The eight player filter rails, as measured in a browser on 2026-08-14. ⭐ THIS LIST MAY ONLY
 * GROW WITH A DELIBERATE EDIT: §0.3 fails if a rail exists that is not named here, so a new
 * filter surface cannot join the product without someone reading this file.
 * ⚠️ `/updown` holds TWO rails (assets, durations) in one file — the count below is FILES.
 */
const SURFACES = [
  "src/components/markets/discovery-bar.tsx",   // /markets — the reference
  "src/app/results/page.tsx",                   // /results — sort + category
  "src/app/proposals/page.tsx",                 // /proposals — hot/new/listed/mine
  "src/app/positions/page.tsx",                 // /positions — all/open/settled
  "src/components/updown/updown-board-tabs.tsx", // /updown — assets + durations
  "src/app/updown/history/page.tsx",            // /updown/history — the day rail
  "src/app/profile/activity/page.tsx",          // /profile/activity — period
  "src/app/profile/account/page.tsx",           // /profile/account — activity category
];

// ── §0 · THE SURFACE SET — the positive control ───────────────────────────────────────────────

ok(existsSync(join(ROOT, PRIMITIVE)), "0.0 CONTROL: the primitive exists", PRIMITIVE);
const primitive = existsSync(join(ROOT, PRIMITIVE)) ? read(PRIMITIVE) : "";
const primitiveCode = strip(primitive);
ok(primitiveCode.length > 800 && /export function FilterPill/.test(primitiveCode),
  "0.1 CONTROL: the primitive is still real code after stripping comments", `${primitiveCode.length} chars`);

const missing = SURFACES.filter((f) => !existsSync(join(ROOT, f)));
ok(missing.length === 0, "0.2 CONTROL: every declared filter surface still exists", missing.join(", "));

/**
 * Discovered rails — every file that renders the `data-filter-rail` hook. If a rail moves house,
 * this finds it at its new address and §0.3 names the discrepancy instead of going quiet.
 */
const allSrc = walk("src");
const discovered = allSrc.filter((f) => /data-filter-rail/.test(strip(read(f))));
ok(discovered.length >= SURFACES.length,
  "0.3 CONTROL: at least the eight measured rails are present in the tree",
  `found ${discovered.length}: ${discovered.join(", ")}`);

const undeclared = discovered.filter((f) => !SURFACES.includes(f));
ok(undeclared.length === 0,
  "0.4 no filter rail exists that this gate does not know about",
  `undeclared: ${undeclared.join(", ")}`);

const unhooked = SURFACES.filter((f) => existsSync(join(ROOT, f)) && !/data-filter-rail/.test(strip(read(f))));
ok(unhooked.length === 0,
  "0.5 every declared surface exposes the data-filter-rail hook a live probe addresses",
  unhooked.join(", "));

// ── §1 · THE PRIMITIVE — the language, defined once ───────────────────────────────────────────

ok(/rounded-pill/.test(primitiveCode),
  "1.1 the pill is the shape — rounded-pill, not the 8px rounded-md the five diverging rails used");
ok(!/\brounded-md\b/.test(primitiveCode),
  "1.2 the primitive never renders the 8px radius it replaced");

// ⚠️ 44 as an ARBITRARY value is deliberate: this repo overrides Tailwind's spacing scale
// (h-8 = 48px, h-9 = 64px), so a scale class here is silently the wrong size. That override is
// how /updown's asset tabs shipped at 64px from an `h-9` that reads like 36.
ok(/min-h-\[44px\]/.test(primitiveCode),
  "1.3 the 44px floor is written as an arbitrary value, above Law 9's 40px tap minimum");
ok(!/\bh-\d+\b/.test(primitiveCode),
  "1.4 the primitive uses NO Tailwind height scale class — the scale is overridden in this repo");

// ⭐ THE RULE THIS WHOLE BATCH IS ABOUT. `border-transparent` when off is not the same as no
// border: the box must be the same size in both states so selecting cannot reflow the rail.
ok(/border-transparent/.test(primitiveCode),
  "1.5 an UNSELECTED pill is text on transparent — only the selected one carries an outline");
ok(/border-brand-400/.test(primitiveCode),
  "1.6 a SELECTED pill carries a real outline");

ok(!/\bstyle=\{/.test(primitiveCode),
  "1.7 the primitive writes no inline style — every paint value is a token through a class (law 82)");

// ⛔ `qa:discovery-probe` matches these with a REGEX over raw SSR HTML, not a selector:
//    /data-chip="([^"]+)"\s+data-count="(\d+)"/g. Adjacency and order are the contract.
ok(/data-chip=\{testId\}\s*\n\s*(?:\/\*[\s\S]*?\*\/\s*\n\s*)?data-count=\{count\}/.test(primitive),
  "1.8 data-chip is emitted immediately before data-count, as literal adjacent JSX attributes");

// One prop, both semantics — a tab rail must not announce itself as a toggle.
ok(/aria-current=\{semantics === "tab"/.test(primitiveCode),
  "1.9 tab semantics emit aria-current, and only in tab mode");
ok(/aria-pressed=\{semantics === "toggle"/.test(primitiveCode),
  "1.10 toggle semantics emit aria-pressed, and only in toggle mode");

// ── §2 · THE PAINT — a token consumed through a class ─────────────────────────────────────────

const css = read(CSS);
const onRule = css.match(/\.kp-fchip\[data-on\]\s*\{([^}]*)\}/);
ok(!!onRule, "2.1 the selected pill's fill lives in a CSS rule, .kp-fchip[data-on]");
ok(!!onRule && /background:\s*var\(--pill-active\)/.test(onRule[1]),
  "2.2 …and it is the shared --pill-active token, not a literal");
ok(!!onRule && /box-shadow:\s*var\(--glow-selected\)/.test(onRule[1]),
  "2.3 …and the selected halo is the shared --glow-selected token");
ok(/\.kp-fopt\[data-on\]\s*\{[^}]*var\(--pill-active\)/.test(css),
  "2.4 a selected MENU ROW uses the same token, so a row and a pill cannot drift apart");

// The token itself must still have exactly one definition site.
const defs = (css.match(/^\s*--pill-active:/gm) ?? []).length;
ok(defs === 1, "2.5 --pill-active is defined exactly once", `${defs} definitions`);

// ── §3 · EVERY SURFACE CONSUMES IT ────────────────────────────────────────────────────────────

/** The byte-identical class string four rails carried before batch 5. */
const OLD_IDIOM = /rounded-md border px-3(?:\.5)? font-mono/;

for (const f of SURFACES) {
  if (!existsSync(join(ROOT, f))) continue;
  const raw = read(f);
  const src = strip(raw);

  ok(/from "@\/components\/ui\/filter-pill"/.test(src),
    `3.1 ${f} imports the primitive rather than re-expressing it`);
  ok(/<FilterPill\b/.test(src),
    `3.2 ${f} renders its filter controls through the primitive`);

  // 🔴 The law-82 breach itself: a paint value written at the call site.
  ok(!/var\(--pill-active\)/.test(src),
    `3.3 ${f} does not paint a selected control at the call site`);
  ok(!/var\(--glow-selected\)/.test(src),
    `3.4 ${f} does not paint a selected halo at the call site`);

  ok(!OLD_IDIOM.test(src),
    `3.5 ${f} no longer carries the divergent rounded-md filter class`);
}

/**
 * ⭐ AND THE SAME RULE ACROSS THE WHOLE PLAYER TREE, so a NINTH surface cannot be built the old
 * way and simply omit the hook that §0.4 checks. Admin is deliberately out of scope: it is a
 * different audience with its own density rules, and Ali's instruction named the player
 * platform. Nav is out too — an active NAV destination is a settled, separate language.
 */
const NON_FILTER = /\/(admin|api)\//;
const NAV = /(layout\/(top-app-bar|bottom-nav|nav-more)|ui\/language-menu|ui\/tabs)\.tsx$/;
const strays = allSrc
  .filter((f) => /\.tsx$/.test(f) && !NON_FILTER.test(f) && !NAV.test(f) && !SURFACES.includes(f))
  .filter((f) => OLD_IDIOM.test(strip(read(f))));
ok(strays.length === 0,
  "3.6 no player surface anywhere still builds a filter rail the old way",
  strays.join(", "));

// ── §4 · THE CHART RANGE — the filter control that was painted in money ───────────────────────

/**
 * 🔴 `.pchart-range.is-active` shipped `background: var(--gilt); color: var(--gold-fg)`. Gold is
 * money on this platform (Q5, Ali 2026-08-10) and a chart window is view state — the discovery
 * bar had already made this exact call in as many words. `test:gold-is-money` could not see it:
 * that gate is scoped to two IDENTITY surfaces on purpose, because money surfaces MUST use those
 * tokens. A law with a scope is not a law with a gate everywhere.
 */
const rangeRule = css.match(/\.pchart-range\.is-active\s*\{([^}]*)\}/);
ok(!!rangeRule, "4.0 CONTROL: the chart range's active rule still exists to be checked");
ok(!!rangeRule && !/var\(--(gilt|gilt-strong|gilt-ink|gold-(300|400|500)|gold-fg)\)/.test(rangeRule[1]),
  "4.1 the selected chart range wears no money ink", rangeRule?.[1]?.trim());
ok(!!rangeRule && /var\(--pill-active\)/.test(rangeRule[1]),
  "4.2 …it wears the same selected fill as every other filter control");
// ⚠️ `min-height` ON THE CONTROL, not a pseudo-element overlay. The overlay was tried first and
//    MEASURED 36px — paint order gave the pixels back to the chart wrapper below it. See the
//    rule's own comment in globals.css.
ok(/\.pchart-range\s*\{[^}]*min-height:\s*var\(--tap-min\)/.test(css),
  "4.3 the chart range control genuinely reaches the 40px tap floor");

console.log(`filter-language: ${pass} assertions passed · ${SURFACES.length} rails · ${discovered.length} discovered`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
