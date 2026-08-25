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
  ok("2: the bet widget still sticks in row 1", /lg:col-start-2 lg:row-start-1[^"]*lg:sticky/.test(page));
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

console.log(`\nmarket-columns: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
