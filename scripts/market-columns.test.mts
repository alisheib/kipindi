/**
 * THE MARKET PAGE'S TWO COLUMNS — the primary one must not be the empty one.
 *
 * Ali, 2026-08-25, looking at a live market: *"is this blue empty space inside market detail
 * fine? or is there something wrong with the distribution?"* — and then, on the fix:
 * *"decide what should work based on how the platform looks and software architecture and
 * layout standards, but most importantly CONSISTENTLY, not just a fix on one screen."*
 *
 * ── WHAT WAS WRONG, AND IT WAS A STALE PREMISE, NOT A STALE LAYOUT ───────────
 * The related-markets rail was moved INTO the right column on 2026-08-06 to fill dead space
 * under the sticky bet widget, justified in a comment reading *"the left column ran on for
 * another 1,500px."* That was true of the markets that existed then. It was never
 * re-measured. Measured 2026-08-25 on production at 1536: the bet panel is **209px** and the
 * rail is **1,127px**, so the right column totalled **1,360px** against a left column of
 * **842–989px** — the rail ALONE was taller than the entire left column, and **8 of 8 LIVE
 * markets left a 371–518px void in the PRIMARY column.**
 *
 * ⭐ SO THE VOID NEVER WENT AWAY; IT MOVED — from the secondary column to the primary one,
 * which is the conspicuous place to leave a hole. And nothing guarded it, which is why it
 * survived until an owner noticed it in a screenshot.
 *
 * ⛔ THE RULE THIS PINS IS THE PREMISE, NOT THE PIXELS. A layout that depends on "the left
 * column runs long" is a layout that breaks when the content changes, which is a thing this
 * product does every day. Related markets now span BOTH columns below them, so neither
 * column's height depends on the other's and the arrangement is correct for any content.
 * `npm run qa:market-columns` measures the actual void on production; this file stops the
 * structure regressing between those runs.
 *
 * Run: npm run test:market-columns
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const page = decomment(readFileSync(join(ROOT, "src/app/markets/[id]/page.tsx"), "utf8"));

// ── 1 · The grid still has the shape the page is built on ───────────────────
{
  ok("1: the desktop layout is still a 2-column grid with a fixed rail",
     /lg:grid-cols-\[1fr_360px\]/.test(page));
  ok("1: …and it still declares two rows", /lg:grid-rows-\[auto_auto\]/.test(page));
  // The premise is not empty: if the page stopped rendering related markets at all, every
  // rule below would pass over nothing.
  ok("1: the page still renders a related-markets section",
     /aria-labelledby="similar-markets-heading"/.test(page));
}

// ── 2 · ⭐ NEITHER COLUMN'S HEIGHT DEPENDS ON THE OTHER'S ───────────────────
{
  const sim = page.slice(page.indexOf('aria-labelledby="similar-markets-heading"') - 300,
                         page.indexOf('aria-labelledby="similar-markets-heading"'));
  ok("2: ⭐ related markets span BOTH columns", /lg:col-span-2/.test(sim), sim.slice(-140));
  ok("2: ⛔ …and are NOT parked in the right column, where they outgrew the left one",
     !/lg:col-start-2 lg:row-start-2/.test(page));
  // If the left column still spanned both rows there would be nowhere for a full-width
  // row 2 to go, and the grid would silently overlap.
  ok("2: ⛔ the left column no longer spans both rows", !/lg:row-span-2/.test(page));
  // 2026-09-14 — the sticky panel sits INSIDE a row-1 wrapper, so it can never slide down over row 2 (it covered the
  // third "Similar markets" card at 1280).
  ok("2: the bet widget sticks ONLY within row 1", /lg:col-start-2 lg:row-start-1 lg:self-stretch">\s*<aside className="[^"]*lg:sticky/.test(page));
}

// ── 3 · The cards get the shared grid, not a forced single column ───────────
{
  // ⛔ `lg:!grid-cols-1` existed ONLY because the block lived in a 360px rail. Full width it
  // truncates titles mid-word for no reason.
  ok("3: the cards use the shared board grid", /className="market-grid"/.test(page));
  ok("3: ⛔ …with no forced single column left over from the rail",
     !/market-grid lg:!grid-cols-1/.test(page));
}

// ── 4 · MOBILE IS UNTOUCHED — the constraint the original move also respected ─
{
  // On a phone this section has always rendered after both columns and before comments.
  // Moving it between desktop grid areas must not reorder the phone.
  ok("4: related markets keep `order-3`, so the phone renders exactly as before",
     /order-3 lg:col-span-2/.test(page));
  ok("4: the aside is still first on mobile — the bet widget stays above the fold",
     /order-1 lg:order-2/.test(page));
  ok("4: …and the content column still follows it", /order-2 lg:order-1/.test(page));
}

// ── 5 · THE TWO COLUMNS START ON ONE LINE, AND THE HEADER'S PARTS KEEP TO THEIR OWN ROWS ──────────────────
// 2026-10-09, the visual pass's round 3 (tiles 161, 162, 199). The bet column opened on the D40 heading, which is
// `sr-only`, and `space-y-3` counts it, so the first card a player sees began 16px below the probability bar (y370
// against y354). The category watermark hung from the whole header at 96px and climbed into the chips row: the gilt
// hairline ran through it and its top sat under SHIRIKI. And the three actions wrapped one by one, leaving the star's
// glyph at the left edge of line 2 on a phone.
{
  const asideAt = page.indexOf("<aside ");
  const aside = asideAt < 0 ? "" : page.slice(asideAt, page.indexOf(">", asideAt));
  ok("5: ⭐ the bet column spaces its cards with a flex gap, which an out-of-flow heading cannot take a rung of",
     /className="flex flex-col gap-3 lg:sticky/.test(aside) && !/space-y-/.test(aside), aside.slice(0, 90));
  // The heading the fix is about must still be there, first in its branch — or the check above guards nothing.
  ok("5: ⭐ …and the signed-in branch still opens on the D40 sr-only heading (the premise)",
     /<h2 id=\{BET_PANEL_HEADING\} className="sr-only">/.test(page));
  const h1At = page.indexOf("<h1 ");
  const boxAt = h1At < 0 ? -1 : page.lastIndexOf(`<div className="relative isolate">`, h1At);
  const box = boxAt < 0 ? "" : page.slice(boxAt, h1At);
  ok("5: the category watermark is drawn on the question's own box — centred on it, two of its ems, behind it",
     box.length > 0 && /absolute right-1 top-1\/2 -z-10 flex -translate-y-1\/2/.test(box)
       && /text-title-lg md:text-display-3/.test(box) && /className="h-\[2em\] w-\[2em\]"/.test(box), `${box.length} chars between the box and the <h1>`);
  ok("5: ⛔ …and never again from the whole header's bottom edge",
     !/absolute right-1 bottom-0 -z-10/.test(page) && /<header className="mt-3 mb-5">/.test(page));
  const groupAt = page.indexOf(`<div className="ml-auto flex items-center gap-2">`);
  const group = groupAt < 0 ? "" : page.slice(groupAt, page.indexOf("</div>", groupAt));
  ok("5: the source link, the star and SHARE are ONE right-aligned group, so they wrap together",
     group.includes("{t.common.source}") && group.includes("<WatchStar") && group.includes("<ShareButton")
       && !/ml-auto min-h-\[var\(--tap-min\)\]/.test(page), groupAt < 0 ? "no group" : "");
}

// ── 6 · THE KPI STRIP IS THE KIT'S, AND EVERY FIGURE IN IT IS MONO ─────────────────────────────────────────
// Tile 162: the pool figure "TZS 5K" and the predictor count were set in the display face (§M4, §T5), and the close
// time sat on a local fork with no glyph, its value 2px above its neighbours'.
{
  const stripAt = page.indexOf("label={t.market.volume}");
  const strip = stripAt < 0 ? "" : page.slice(page.lastIndexOf("<Stat", stripAt), page.indexOf("</div>", stripAt));
  ok("6: ⭐ the pool figure is an .amount on the mono face (words only when there is no pool yet)",
     strip.includes(`font={freshMarket ? undefined : "mono"}`) && strip.includes(`<span className="amount">{formatTzsCompact(m.yesPool + m.noPool)}</span>`));
  ok("6: …the predictor count is mono", /label=\{t\.market\.predictors\} font="mono"/.test(strip));
  ok("6: …and the close time is a kit Stat on the sm-plain rung, with its glyph",
     // R4-I (2026-10-09): labelled `common.resolves` — Swahili `market.resolves` read "Inaisha", "it ends".
     /<Stat size="sm-plain" labelStyle="widest" boxed="card" label=\{t\.common\.resolves\}/.test(strip)
       && strip.includes("icon={<I.calendarClock s={14} />}"));
  ok("6: ⛔ the local KPI fork is gone", !/function KPI\(/.test(page) && !/<KPI /.test(page));
}

// ── 7 · A TICKET NUMBER STANDS OFF ITS GLYPH AS THE CLOCK LINE'S WORDS DO ─────────────────────────────────
// Tile 162: the ticket glyph sat inline with a 2px margin (ink x174–183, "pos_…" from 186) while the clock line's glyph
// stood in a flex row with `gap-1` (ink x361–369, words from 375). One shape, here and on the classic position card.
{
  const card = decomment(readFileSync(join(ROOT, "src/components/markets/position-card.tsx"), "utf8"));
  const SHAPE = /<p className="flex min-w-0 items-center gap-1 [^"]*">\s*<I\.ticket s=\{10\} className="shrink-0 opacity-60" \/>/;
  ok("7: the question page's ticket line is the clock line's flex shape (4px)", SHAPE.test(page));
  ok("7: …and so is the classic position card's", SHAPE.test(card));
  ok("7: ⛔ no ticket glyph is set inline with a margin any more",
     ![page, card].some((s) => /<I\.ticket s=\{10\} className="inline/.test(s)));
  ok("7: ⭐ CONTROL — the shape matcher still reads the shape it is written for",
     SHAPE.test(`<p className="flex min-w-0 items-center gap-1 font-mono">\n  <I.ticket s={10} className="shrink-0 opacity-60" />`)
       && !SHAPE.test(`<p className="font-mono">\n  <I.ticket s={10} className="inline -mt-px mr-0.5 opacity-60" />`));
}

console.log(`\nmarket-columns: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
