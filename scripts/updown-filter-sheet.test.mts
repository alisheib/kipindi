/**
 * UD-13b — THE UP & DOWN BOARD'S PHONE FILTERS, AND THE ONE THING THAT MAKES THEM SAFE.
 *
 *   npm run test:updown-filter-sheet     (proven by: npm run red:updown-filter-sheet)
 *
 * > *"For the mobile version, the filters — the bitcoin, ethereum, durations etc. — use design
 * >  to create something aesthetically and performance-wise good; a drawer or any type of
 * >  filtering, not to keep everything visible at the same time. But we don't want to create
 * >  anything outside the box — it's all from our UI kit."* — Ali, 2026-08-25
 *
 * 🔴 THE DEFECT, MEASURED ON PRODUCTION BEFORE ANY CODE MOVED (`/updown`, signed in):
 * at 360 and 414 the asset rail and the duration rail wrap to FOUR rows of chips — **196px**
 * — and the first game card sits at **top 652 of a 900px viewport**. At 768 and 1280 each rail
 * is a single 44px row and there is nothing wrong with them. **That is why §3 pins the split
 * at `sm` and not at `lg`: the defect has a band, and widening the fix past it would remove
 * working controls from tablets.**
 *
 * ── ⭐ WHAT THIS SUITE IS REALLY GUARDING ────────────────────────────────────────────────
 * Not "is there a sheet". **§2 is the one that matters: the trigger must NAME THE ACTIVE
 * ASSET AND DURATION.** A collapsed filter whose trigger says only "Filters" is *worse* than
 * four rows of visible chips, because the player loses the answer to *"what am I looking
 * at?"* — and every other assertion in this file would stay green while that happened. That
 * exact regression is `red:updown-filter-sheet`'s positive control.
 *
 * §4 guards the other direction: nothing outside the kit. The sheet must be the EXISTING
 * `FilterSheet` and the options must be the EXISTING `FilterPill`, because "compose the kit"
 * and "build a second drawer that looks like the kit" are indistinguishable in a screenshot.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const TABS = "src/components/updown/updown-board-tabs.tsx";
const PAGE = "src/app/updown/page.tsx";
const tabs = decomment(readFileSync(join(ROOT, TABS), "utf8"));
const page = decomment(readFileSync(join(ROOT, PAGE), "utf8"));
const { dict } = await import("../src/lib/i18n-dict.ts");

// ── 1 · THE SHEET EXISTS, AND ONLY BELOW `sm` ──────────────────────────────
{
  ok("1: the board renders a FilterSheet", /<FilterSheet/.test(tabs));
  ok("1: …inside a wrapper that hides it from `sm` up",
     /className="mt-4 sm:hidden"[\s\S]{0,200}<FilterSheet/.test(tabs));
  // ⚠️ The two rails must still EXIST — this is a disclosure, not a deletion. A guard that
  // only checked "the sheet is there" would pass on a change that threw the chips away at
  // every width, which is a different product and not the one Ali asked for.
  ok("1: the asset rail still exists and is shown from `sm` up",
     /aria-label=\{assetsLabel\} data-filter-rail className="mt-4 hidden flex-wrap gap-2 sm:flex"/.test(tabs));
  ok("1: the duration rail still exists and is shown from `sm` up",
     /aria-label=\{durationsLabel\} data-filter-rail className="mt-2 hidden flex-wrap gap-1.5 sm:flex"/.test(tabs));
}

// ── 2 · ⭐ THE TRIGGER NAMES THE ACTIVE SELECTION — the assertion this file is for ──
{
  // The label must be built from BOTH axes. Either half alone loses half the answer.
  ok("2: ⭐ the trigger label is composed from the active ASSET and the active DURATION",
     /label=\{`\$\{activeAssetText\} · \$\{activeDurText\}`\}/.test(tabs));
  ok("2: the active asset is resolved from the chips' own on-state, not re-derived",
     /const activeAsset = assetTabs\.find\(\(a\) => assetOn\(a\)\)/.test(tabs));
  ok("2: the active duration likewise", /const activeDur = durationTabs\.find\(\(d\) => durationOn\(d\)\)/.test(tabs));
  // ⛔ AND IT MUST NEVER FALL BACK TO A BARE WORD. If no chip is on, the label falls back to
  // the axis NAMES ("Asset", "Duration") — which still says what the two slots are — rather
  // than to a generic "Filters" that says nothing about the board.
  ok("2: ⛔ …with a fallback that still names the axes rather than saying 'Filters'",
     /activeAsset\?\.label \?\? assetsLabel/.test(tabs) && /: durationsLabel/.test(tabs));
  // The accessible name carries the same two facts, for a player who cannot see the label.
  ok("2: the accessible name interpolates both axes too",
     /ariaLabel=\{sheetAria\.replace\("\{asset\}", activeAssetText\)\.replace\("\{duration\}", activeDurText\)\}/.test(tabs));
}

// ── 3 · THE BAND IS `sm`, BECAUSE THAT IS WHERE THE DEFECT IS ──────────────
{
  // ⛔ `lg` would collapse the filters on tablets, where the rails measured a single clean
  // 44px row. The measurement is the reason; pin it so a later "tidy-up" cannot widen it.
  ok("3: ⛔ the split is at `sm`, never at `md` or `lg`",
     /sm:hidden/.test(tabs) && /sm:flex/.test(tabs) && !/\b(md|lg):(hidden|flex)\b/.test(tabs));
}

// ── 4 · ⛔ NOTHING OUTSIDE THE KIT ──────────────────────────────────────────
{
  ok("4: the sheet is the EXISTING kit component, imported not re-implemented",
     /import \{ FilterSheet, FilterSheetGroup \} from "@\/components\/markets\/filter-sheet"/.test(tabs));
  ok("4: the options are the EXISTING FilterPill", /import \{ FilterPill \} from "@\/components\/ui\/filter-pill"/.test(tabs));
  // ⛔ No second drawer. A locally-declared sheet would be invisible to every other assertion.
  ok("4: ⛔ no locally-declared sheet/drawer component",
     !/function\s+\w*(Sheet|Drawer)\w*\s*\(/.test(tabs));
  // ⛔ Motion comes from the sheet. The legacy `--ease-*` / `--dur-*` are ALIASES and must
  // never be re-introduced as literals (`test:motion` guards the family; this pins the call site).
  ok("4: ⛔ no motion vocabulary at this call site",
     !/--ease-|--dur-|@keyframes|transition:\s*all/.test(tabs));
  ok("4: ⛔ and no hand-written paint values either",
     !/style=\{\{[^}]*(background|boxShadow|color)\s*:/.test(tabs.replace(/opacity: isPending[\s\S]{0,120}?\}\}/, "")));
}

// ── 5 · THE COPY EXISTS IN ALL THREE LANGUAGES ─────────────────────────────
{
  ok("5: the page passes the sheet's copy from the dictionary",
     /sheetTitle=\{t\.market\.udFilterTitle\}/.test(page) && /sheetAria=\{t\.market\.udFilterAria\}/.test(page));
  ok("5: …and reuses the kit's existing close label rather than minting a second one",
     /sheetClose=\{t\.market\.filtersClose\}/.test(page));
  for (const lang of ["en", "sw", "zh"] as const) {
    const m = (dict as Record<string, Record<string, Record<string, string>>>)[lang].market;
    ok(`5: ${lang} has udFilterTitle`, typeof m.udFilterTitle === "string" && m.udFilterTitle.length > 0);
    ok(`5: ${lang} has udFilterAria naming both axes`,
       (m.udFilterAria ?? "").includes("{asset}") && (m.udFilterAria ?? "").includes("{duration}"),
       m.udFilterAria);
  }
  // ⭐ THE CONTROL FOR §5: the three must not be the same string. `udFilterTrigger` was
  // written first as `"{asset} · {duration}"` in all three languages — a key with nothing to
  // translate — and `test:i18n`'s untranslated-values check refused it, correctly. It is
  // composed in the component instead. This pins that the REMAINING keys are real prose.
  const titles = (["en", "sw", "zh"] as const).map(
    (l) => (dict as Record<string, Record<string, Record<string, string>>>)[l].market.udFilterTitle);
  ok("5: ⭐ the title is genuinely translated, not one string three times",
     new Set(titles).size === 3, titles.join(" / "));
}

console.log(`\nupdown-filter-sheet: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
