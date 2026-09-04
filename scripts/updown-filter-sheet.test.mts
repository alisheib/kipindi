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
// ⛔ NOT decommented: §6 asserts on CSS SELECTORS, and stripping comments from a
// stylesheet would also strip the reasoning that explains why each rule exists.
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
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
  // ⚠️ UD-13c MOVED IT FROM `label` TO `value` AND THE ASSERTION IS UNCHANGED IN MEANING.
  // `label` is now the control's KEY ("Filters") and `value` is the selection — the same two
  // axes, in the prop that makes `FilterSheet` render its field shape. What §2 protects is
  // that the SELECTION is on the trigger, not which attribute carries it.
  ok("2: ⭐ the trigger label is composed from the active ASSET and the active DURATION",
     /value=\{`\$\{activeAssetText\} · \$\{activeDurText\}`\}/.test(tabs));
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

// ── 6 · 🔴 THE SHEET LIFTS ITSELF — the latent defect this unit exposed ──
{
  // 🔴 FOUND THE FIRST TIME `FilterSheet` GAINED A SECOND CALL SITE. The only stacking rule
  // was `.kp-discovery-bar:has(.kp-fsheet[open]) { z-index: 100 }` — scoped to ONE component —
  // so the sheet was safe only because its single host happened to BE that component. On
  // `/updown` it opened at `z-index: 2` beneath a `z-40` bottom nav: visible, correctly laid
  // out, correctly translated, and its dismiss button UNPRESSABLE.
  //
  // ⭐ Caught by `elementFromPoint` on production, and it could not have been caught any other
  // way: the two surfaces had byte-identical geometry (panel bottom 900, footer 841→899, nav
  // top 835). At the footer's centre /markets returned the dismiss BUTTON and /updown returned
  // the nav's `svg`. A bounding box reports both as fine. Same family as the share control that
  // shipped "visible, named, translated and unclickable".
  ok("6: \u{1F534} the sheet lifts ITSELF, so any host inherits the fix",
     /\.kp-fsheet\[open\]\s*\{[^}]*z-index:\s*100/.test(css));
  ok("6: \u2026and is positioned, or z-index would not apply to a <details> at all",
     /\.kp-fsheet\[open\]\s*\{[^}]*position:\s*relative/.test(css));
  // ⚠️ The bar rule must STAY. `.kp-discovery-bar` is itself a `z-20` stacking context, so a
  // sheet inside it cannot escape by raising its own z-index — the BAR has to rise. The two
  // rules solve different halves; deleting either re-opens one of them.
  ok("6: \u26a0\uFE0F \u2026and the discovery-bar lift is still there, because it solves the other half",
     /\.kp-discovery-bar:has\(\.kp-fsheet\[open\]\)/.test(css));
}

// ── 7 · 🔴 UD-13c — THE TRIGGER MUST LOOK LIKE A CONTROL, NOT LIKE A CAPTION ──
/**
 * 🔴 THE DEFECT §2 COULD NOT SEE. §2 proved the trigger SAID the right thing and every
 * assertion above it stayed green while players reported not noticing the filter at all —
 * *"users are reporting they are not noticing that there is a filter"* (Ali, 2026-09-05).
 * Naming the selection is necessary and it is not sufficient: `⚙ Bitcoin · 5 min` in an
 * outlined hug pill is read as a third caption on a screen whose tape already says
 * `BITCOIN $79,811.94` and whose card already says `Bitcoin Up & Down · 5 MIN` — and an
 * outline is this product's own word for "selected" (`.kp-fchip[data-on]`).
 *
 * ⭐ SO §7 GUARDS THE AFFORDANCE, WHICH IS THE HALF §2 IS BLIND TO: a caret that rotates on
 * open, and the field shape. ⛔ It asserts on `filter-sheet.tsx` and the stylesheet rather
 * than on the call site, because the call site only passes `value` — the shape is the
 * primitive's, so guarding the call site would prove nothing about what renders.
 */
{
  const sheet = decomment(readFileSync(join(ROOT, "src/components/markets/filter-sheet.tsx"), "utf8"));
  ok("7: 🔴 the trigger carries a caret — the affordance every other disclosure has",
     /kp-fsheet-caret/.test(sheet) && /I\.chevronDown/.test(sheet));
  ok("7: …and it rotates when the sheet opens, so the caret is live and not an ornament",
     /\.kp-fsheet\[open\]\s*>\s*summary\s+\.kp-fsheet-caret\s*\{[^}]*rotate\(180deg\)/.test(css));
  // ⛔ The caret must NOT be `kp-menu-caret` — §5.3 of `test:filter-language` asserts the
  // string `kp-menu` never appears in this file so the desktop row's two menus stay countable.
  ok("7: ⛔ …without joining the `.kp-menu` count that qa:discovery-board asserts",
     !/kp-menu/.test(sheet));
  ok("7: the /updown trigger asks for the FIELD shape by passing a value",
     /value=\{`\$\{activeAssetText\} · \$\{activeDurText\}`\}/.test(tabs));
  ok("7: …and the field shape is defined as a full-width control-radius row",
     /\.kp-fsheet-trigger\[data-shape="field"\]\s*\{[^}]*width:\s*100%/.test(css));
}

// ── 8 · 🔴 THE PANEL HAS REAL PADDING — the `var(--gutter)` that never existed ──
/**
 * 🔴 SHIPPED IN THIS SHEET'S FIRST COMMIT (1cfa155c, 2026-08-15) AND LIVE FOR 21 DAYS.
 * `padding: 10px var(--gutter) calc(…)` — and `--gutter` was defined NOWHERE in the repo. An
 * unresolved `var()` makes the whole declaration invalid at computed-value time, so `padding`
 * fell back to `unset` → `0`, destroying the top rung and the bottom safe-area inset as well
 * as the sides. Measured on production, /updown 390×844: `0px` on all four sides, the heading
 * at x=1, the close ✕ at l345 r393 on a 390 viewport, and "Done" 1px off the bottom with no
 * safe-area inset — i.e. under the iPhone home indicator.
 *
 * ⚠️ THIS ASSERTION IS A BACKSTOP, NOT THE INSTRUMENT. Text in a stylesheet cannot tell you
 * whether a reference RESOLVES — that is `test:css-vars-defined`, which is the gate that
 * would actually have caught this on the day it was written. What §8 pins is the specific
 * value: the sheet's gutter is the PAGE's gutter, so the two cannot drift apart.
 */
{
  const panelRule = css.match(/(?:^|\n)\.kp-fsheet-panel\s*\{([^}]*)\}/);
  ok("8: CONTROL: the panel rule exists to be checked", !!panelRule);
  const decls = panelRule?.[1] ?? "";
  ok("8: 🔴 the panel's padding does not reference the undefined `--gutter`", !/--gutter/.test(decls), decls.trim());
  ok("8: …the horizontal gutter is --sp-5 (20px), the same inset the page lays out on",
     /padding:[^;]*var\(--sp-5\)/.test(decls), decls.trim());
  ok("8: …and the bottom keeps the safe-area inset, so `Done` clears the home indicator",
     /padding:[^;]*env\(safe-area-inset-bottom/.test(decls), decls.trim());
}

// ── 9 · 🔴 THE OPTIMISM MUST NOT OUTLIVE THE TRANSITION THAT OWNS IT ──
/**
 * 🔴 UD-13d, MEASURED ON PRODUCTION 2026-09-05 — the same URL reached two ways disagreed,
 * permanently. `pendingHref` was set on every click and cleared by NOTHING, so the optimistic
 * branch won for the rest of the page's life. Tapping an asset navigates to `?asset=ETH`,
 * which equals no duration href, so every duration chip read OFF for ever:
 *
 *   direct load /updown?asset=ETH  →  `Ethereum · 5 min`,  rail `[5 min]`
 *   TAP `Ethereum` on the board    →  `Ethereum · Duration`, rail: nothing selected
 *   reload                         →  correct again
 *
 * ⛔ The board was filtered to the 5-minute round while its own control said no duration was
 * chosen — a false statement about what a player is betting on. §2 stayed green throughout,
 * because §2 asks what the trigger is COMPOSED FROM, not whether the answer is true.
 * ⚠️ It is the same family as every other finding in this file: visible, correctly laid out,
 * correctly translated, and wrong — invisible to a screenshot and to a bounding box.
 */
{
  ok("9: 🔴 the optimistic on-state is scoped to `isPending`, so it cannot outlive the navigation",
     /const pending = isPending && pendingHref != null/.test(tabs));
  /* ⚠️ WRITTEN AS A COUNT, NOT AS AN ABSENCE, because the CORRECT line contains the defect's
     own substring (`isPending && pendingHref != null ?`). The first draft of this assertion
     was `!/pendingHref != null \?/` and it failed on the fix — a guard that cannot tell the
     repair from the disease. Every reference must be the scoped one. */
  const refs = (tabs.match(/pendingHref != null/g) ?? []).length;
  const scoped = (tabs.match(/isPending && pendingHref != null/g) ?? []).length;
  ok("9: ⛔ …and EVERY `pendingHref != null` reference is the `isPending`-scoped one",
     refs > 0 && refs === scoped, `${scoped} scoped of ${refs}`);
  // ⚠️ A substring match is true for any key that is a PREFIX of another, and can hit the
  // wrong parameter entirely. The pending href is a URL; parse it.
  ok("9: ⚠️ the pending href is PARSED, never substring-matched",
     !/pendingHref\.includes\(/.test(tabs) && /new URLSearchParams\(pendingHref/.test(tabs));
  ok("9: …the asset is compared against the parsed `asset` param",
     /pending\.get\("asset"\) === tab\.key/.test(tabs));
  // ⛔ An asset-only href carries no `d`. The duration must then fall through to the REAL
  // active duration, never to "none" — which is the exact shape of the defect.
  ok("9: ⛔ …and a pending href with no `d` falls through to the real active duration",
     /pending != null && pending\.has\("d"\)/.test(tabs) && /: t\.d === activeDuration/.test(tabs));
}

console.log(`\nupdown-filter-sheet: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
