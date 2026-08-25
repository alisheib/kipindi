/**
 * THE PAGER REACHES BOTH ENDS — Ali's request, 2026-08-25:
 * *"a player should be able to jump to the FIRST and LAST page directly — arrow controls,
 * not only numbers — instead of clicking forward page by page."*
 *
 * ⚠️ AND THE HONEST FRAMING FIRST, because it decides what is worth asserting. The numbered
 * window has ALWAYS carried `1` and `totalPages`, so both edges were already reachable in
 * one click BY NUMBER. **The arrows did not fix a reachability defect.** What they fix is
 * the affordance: a numbered button moves as the window slides, so "jump to the end" is a
 * different target on every page and looks like any other page number; `»` at a fixed end of
 * the row is one target that always means the same thing.
 *
 * So this suite pins three different kinds of thing, and only §1 is about reachability:
 *
 *   §1  the INVARIANT a future simplification of `pageWindow` would silently break —
 *       swept over every (page, totalPages) pair, not eyeballed on three of them
 *   §2  the CONTROLS exist, are named, and are disabled at the ends
 *   §3  every dict-driven call site passes the new labels — a half-localised pager is
 *       worse than an English one, because only some of it announces in Swahili
 *
 * ⛔ ONE PAGER, NOT FORTY. `src/components/ui/pagination.tsx` is the only implementation and
 * `admin/admin-pagination` is a thin re-export of it, so §2 reads one file. §3 is what stops
 * that being a false economy: a shared component with per-caller labels is only as localised
 * as its worst call site.
 *
 * Run: npm run test:pager-reach
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { pageWindow, reachablePages } = await import("../src/components/ui/pagination.tsx");

// ── 1 · THE INVARIANT, swept ────────────────────────────────────────────────
{
  let bothEnds = 0, badTarget = 0, dupes = 0, checked = 0;
  const sizes = [1, 2, 3, 6, 7, 8, 9, 12, 25, 60, 199, 1000];
  for (const total of sizes) {
    for (let page = 1; page <= total; page++) {
      checked++;
      const r = reachablePages(page, total);
      if (!r.includes(1) || !r.includes(total)) bothEnds++;
      if (r.some((p) => p < 1 || p > total || !Number.isInteger(p))) badTarget++;
      if (new Set(r).size !== r.length) dupes++;
      if (total > 400 && page > 40) break; // 1000 pages: the shape repeats; sweeping the head is enough
    }
  }
  ok(`1: swept ${checked} (page, totalPages) pairs across ${sizes.length} sizes`, checked > 300, String(checked));
  ok("1: ⭐ page 1 and the LAST page are reachable from EVERY page", bothEnds === 0, `${bothEnds} pairs could not reach an end`);
  ok("1: no target is outside 1..totalPages", badTarget === 0, `${badTarget} pairs offered an impossible page`);
  ok("1: no target is offered twice", dupes === 0, `${dupes} pairs had duplicates`);

  // ⛔ A CONTROL FOR §1, because "always contains 1 and total" is the kind of claim that
  // passes for a function returning every page from 1..total — which would be a different
  // (and much worse) pager. Pin the window's SIZE too.
  ok("1: the window stays bounded — 7 entries at most, however many pages there are",
     [8, 25, 199, 1000].every((t) => pageWindow(Math.ceil(t / 2), t).length <= 7),
     [8, 25, 199, 1000].map((t) => `${t}:${pageWindow(Math.ceil(t / 2), t).length}`).join(" "));
  ok("1: …and it really does elide, rather than listing everything",
     pageWindow(50, 100).includes("..."), JSON.stringify(pageWindow(50, 100)));
  ok("1: a small set is shown whole, with no ellipsis",
     pageWindow(3, 6).join(",") === "1,2,3,4,5,6", pageWindow(3, 6).join(","));
  // The edges the window computes, stated rather than assumed.
  ok("1: the first page's window starts at 1 and ends at the last page",
     JSON.stringify(pageWindow(1, 20)) === JSON.stringify([1, 2, "...", 20]), JSON.stringify(pageWindow(1, 20)));
  ok("1: the last page's window does too",
     JSON.stringify(pageWindow(20, 20)) === JSON.stringify([1, "...", 19, 20]), JSON.stringify(pageWindow(20, 20)));
  // Out-of-range input must clamp, not throw or emit nonsense: `page` comes from a URL.
  ok("1: a page beyond the end clamps instead of inventing targets",
     reachablePages(999, 5).every((p) => p >= 1 && p <= 5), JSON.stringify(reachablePages(999, 5)));
  ok("1: a page below 1 clamps too", reachablePages(-4, 5).every((p) => p >= 1 && p <= 5), JSON.stringify(reachablePages(-4, 5)));
}

// ── 2 · THE CONTROLS — present, named, and dead at the ends ─────────────────
{
  const pager = decomment(readFileSync(join(ROOT, "src/components/ui/pagination.tsx"), "utf8"));

  ok("2: a FIRST control targets page 1", /<Control\s+to=\{1\}/.test(pager));
  ok("2: a LAST control targets the final page", /<Control\s+to=\{totalPages\}/.test(pager));
  ok("2: first is disabled when there is no previous page", /<Control\s+to=\{1\}\s+disabled=\{!hasPrev\}/.test(pager));
  ok("2: last is disabled when there is no next page", /<Control\s+to=\{totalPages\}\s+disabled=\{!hasNext\}/.test(pager));
  // ⛔ An icon-only control with no accessible name is an unnamed control. The whole point
  // of a double chevron is that it is NOT self-describing.
  ok("2: first carries an aria-label", /to=\{1\}[^>]*aria=\{firstLabel\}/.test(pager));
  ok("2: last carries an aria-label", /to=\{totalPages\}[^>]*aria=\{lastLabel\}/.test(pager));

  // ⛔ EXTEND THE KIT, NEVER HAND-ROLL. An inline <svg> here would be a second icon family
  // inside one component, at whatever stroke this file felt like.
  ok("2: the pager draws no SVG of its own", !/<svg/.test(pager));
  ok("2: the double chevrons come from the glyph kit", /I\.chevronsLeft/.test(pager) && /I\.chevronsRight/.test(pager));

  const glyphs = decomment(readFileSync(join(ROOT, "src/components/ui/glyphs.tsx"), "utf8"));
  ok("2: …and the kit actually defines them", /chevronsLeft:/.test(glyphs) && /chevronsRight:/.test(glyphs));
  // Same wrapper as every other glyph ⇒ same 24 grid and same 1.9 stroke (DESIGN_AUTHORITY §S3).
  ok("2: they use the kit's own 24-grid wrapper, not a bespoke svg",
     /chevronsLeft:\s*\(p: GlyphProps\)\s*=>\s*<G\b/.test(glyphs) && /chevronsRight:\s*\(p: GlyphProps\)\s*=>\s*<G\b/.test(glyphs));

  // ⚠️ 44px is written LITERALLY here on purpose — `h-10` is 80px under this project's
  // overridden spacing scale (finding G-2). The new controls must not have re-introduced it.
  ok("2: the control box is still the literal 44px tap floor", /h-\[44px\] min-w-\[44px\]/.test(pager));
  ok("2: and no scale token crept in beside it", !/\bh-10\b|\bh-11\b/.test(pager));
}

// ── 3 · THE CALL SITES — a half-localised pager is worse than an English one ─
{
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { if (e !== "node_modules" && e !== ".next") walk(p); }
      else if (e.endsWith(".tsx")) files.push(p);
    }
  };
  walk(join(ROOT, "src"));

  // ⭐ THE POPULATION IS "PAGERS THAT LOCALISE AT ALL", not "every pager". The admin console
  // is deliberately NOT dict-driven (measured: 4 of 149 admin .tsx use `useT`), so an admin
  // pager taking the component's English defaults is the documented convention, not a defect.
  // The rule is: whoever passes prevLabel must pass all four, or the row announces in two
  // languages at once.
  const localising = files.filter((f) => /prevLabel=\{t\./.test(decomment(readFileSync(f, "utf8"))));
  ok("3: the population is not empty — a rule over zero files passes vacuously",
     localising.length >= 8, `${localising.length} localising pager call site(s)`);

  const half = localising.filter((f) => {
    const s = decomment(readFileSync(f, "utf8"));
    return !/firstLabel=\{t\./.test(s) || !/lastLabel=\{t\./.test(s);
  }).map((f) => relative(ROOT, f).replace(/\\/g, "/"));
  ok("3: every localising call site passes firstLabel AND lastLabel", half.length === 0, half.join(", "));

  // And the dict has them, in all three languages — `test:i18n` pins parity, this pins presence.
  const dict = readFileSync(join(ROOT, "src/lib/i18n-dict.ts"), "utf8");
  ok("3: the dict defines firstPage in all three locales", (dict.match(/firstPage:/g) ?? []).length === 3,
     String((dict.match(/firstPage:/g) ?? []).length));
  ok("3: …and lastPage", (dict.match(/lastPage:/g) ?? []).length === 3,
     String((dict.match(/lastPage:/g) ?? []).length));
  // ⛔ Not English-in-a-Swahili-slot. A copied default is the usual way a "translated" key
  // ships untranslated, and it looks correct in every count.
  const sw = dict.slice(dict.indexOf('previousPage: "Ukurasa uliopita"'));
  ok("3: the Swahili labels are Swahili, not the English defaults copied across",
     /firstPage: "Ukurasa wa kwanza"/.test(sw) && /lastPage: "Ukurasa wa mwisho"/.test(sw));
  const zh = dict.slice(dict.indexOf('previousPage: "上一页"'));
  ok("3: and the Chinese ones are Chinese", /firstPage: "第一页"/.test(zh) && /lastPage: "最后一页"/.test(zh));

  // ⛔ ONE PAGER. If a second implementation appears, everything above stops covering it.
  const rivals = files.filter((f) => {
    const s = decomment(readFileSync(f, "utf8"));
    return /chevronsLeft|chevronsRight/.test(s);
  }).map((f) => relative(ROOT, f).replace(/\\/g, "/"))
    .filter((f) => f !== "src/components/ui/pagination.tsx" && f !== "src/components/ui/glyphs.tsx");
  ok("3: nothing else draws page-jump chevrons — the pager is still ONE component", rivals.length === 0, rivals.join(", "));
}

console.log(`\npager-reach: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
