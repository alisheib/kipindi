#!/usr/bin/env node
/**
 * red:filter-language — proves `test:filter-language` actually catches the defects it names.
 *
 * ⛔ A GATE NOBODY HAS SEEN FAIL IS A SUGGESTION. Batch 5's own scan found three instruments that
 * had been green for the wrong reason, and the batch before it found a formatter copy that lived
 * through two gates. So every defect this gate claims to refuse is reintroduced here, one at a
 * time, and the gate must go red **on that defect's own assertion** — not merely red.
 *
 * The seven cases are the seven ways the one filter language actually broke, in the tree, before
 * batch 5:
 *
 *   · square          — the 8px `rounded-md` five rails carried instead of the pill
 *   · below-the-floor — a Tailwind height class, which on THIS repo's overridden scale is a
 *                       silent 48 or 64px (this is how /updown shipped 64px tabs from `h-9`)
 *   · always-outlined — every control outlined, the defect that is not cosmetic
 *   · inline-paint    — the law-82 breach: the selected fill written at the call site
 *   · unhooked-rail   — a surface that stops consuming the primitive and rolls its own
 *   · gilded-range    — the chart range back in the money ink
 *   · split-attrs     — `data-chip` and `data-count` no longer adjacent, which makes
 *                       `qa:discovery-probe` find ZERO controls and blame the product
 *
 * Batch 6 adds seven more, for the phone filter sheet — the surface that now holds EVERY filter
 * at 360px, so every way it can break is a way the board loses its filters entirely:
 *
 *   · nested-details  — a disclosure inside the scrolling sheet: §8.7c's 4px listbox, re-created
 *   · sheet-as-menu   — the sheet joins the `.kp-menu` count and breaks `qa:discovery-board`
 *   · focus-thrash    — the effect dependency that dragged focus onto a MONEY dialog's confirm
 *   · sheet-under-nav — the stacking lift dropped, so the sheet opens under the bottom nav
 *   · sheet-captured  — `transform:none` for `animation:none`: the fix that looks right and does
 *                       nothing, because an animation's applied value beats a normal declaration
 *   · panel-scrolls   — the scroll moves to the panel and the dismiss button scrolls away
 *   · range-reverted  — `44px` swapped for `var(--tap-min)`: Ali's ruling, silently undone
 *   · both-layouts    — the sheet loses `lg:hidden` and renders beside the desktop row
 *
 * ⭐ AND A CASE THAT IS NOT A PRODUCT DEFECT AT ALL — `vacuity`. It renames the rail hook
 * so the gate's subject set goes EMPTY. A structural rule of the form "every filter surface must
 * do X" passes vacuously over an empty set, and this harness exists partly to prove that §0's
 * positive control refuses that. If `vacuity` ever comes back GREEN, the gate has stopped looking
 * at anything and every other case above it is worthless.
 *
 * The tree is restored after every case and verified byte-identical at the end.
 *
 * Run: npm run red:filter-language
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const GATE = "scripts/filter-language.test.mts";
const PRIMITIVE = "src/components/ui/filter-pill.tsx";
const CSS = "src/app/globals.css";
const POSITIONS = "src/app/positions/page.tsx";
const SHEET = "src/components/markets/filter-sheet.tsx";
const BAR = "src/components/markets/discovery-bar.tsx";
/* S-07 — the admin rail used for the two admin-scope plants. candidates rather than ai-polls
   because it carries BOTH the state and category rails and the shorter vocabulary. */
const ADMIN_RAIL = "src/app/admin/candidates/candidate-filters.tsx";

const CASES = [
  {
    name: "square (the 8px rounded-md five rails carried instead of the pill)",
    file: PRIMITIVE,
    /* ⚠️ RE-ANCHORED 2026-08-28 (S-07): the height moved out of this string into the rank fork
       below it, because the admin rank takes --h-control-xs (32px) while the player ranks keep
       the 44px tap floor. The shape assertion itself is unaffected. */
    from: `"kp-fchip inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border",`,
    to: `"kp-fchip inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border",`,
    expect: "1.1",
  },
  {
    name: "below-the-floor (a scale class, which is silently 48px on this repo's overridden scale)",
    file: PRIMITIVE,
    /* ⚠️ RE-ANCHORED 2026-08-28 (S-07) onto the rank fork, where the floor now lives.
       ⭐ AND IT IS A BETTER PLANT THERE. `h-8` reads as 32px and is silently 48px on this
       repo's overridden scale — so this injects the defect at exactly the seam where a future
       reader is most likely to write it for real: reaching for a scale class because the admin
       rank "is 32px anyway". That is the trap the 44px floor was made arbitrary to avoid. */
    from: `        rank === "dense" ? "min-h-[32px]" : "min-h-[44px]",`,
    to: `        rank === "dense" ? "h-8" : "min-h-[44px]",`,
    expect: "1.4",
  },
  {
    name: "always-outlined (every control outlined — the defect that is not cosmetic)",
    file: PRIMITIVE,
    from: `          : "border-transparent text-text-muted hover:bg-bg-overlay hover:text-text",`,
    to: `          : "border-border text-text-muted hover:bg-bg-overlay hover:text-text",`,
    expect: "1.5",
  },
  {
    name: "split-attrs (data-chip and data-count no longer adjacent — the probe finds ZERO controls)",
    file: PRIMITIVE,
    from: `      data-chip={testId}
      data-count={count}`,
    to: `      data-chip={testId}
      title={title}
      data-count={count}`,
    expect: "1.8",
  },
  {
    name: "inline-paint (the law-82 breach: the selected fill written at the call site)",
    file: POSITIONS,
    from: `              on={activeTab === tab.id}
              semantics="tab"`,
    to: `              on={activeTab === tab.id}
              semantics="tab"
              style={activeTab === tab.id ? { background: "var(--pill-active)" } : undefined}`,
    expect: "3.3",
  },
  {
    name: "unhooked-rail (a surface stops consuming the primitive and rolls its own)",
    file: POSITIONS,
    from: `import { FilterPill } from "@/components/ui/filter-pill";\n`,
    to: ``,
    expect: "3.1",
  },
  {
    name: "gilded-range (the chart range back in the money ink)",
    file: CSS,
    from: `.pchart-range.is-active { color: var(--text); background: var(--pill-active); }`,
    to: `.pchart-range.is-active { color: var(--gold-fg); background: var(--gilt); }`,
    expect: "4.1",
  },
  {
    // ⭐ NOT A PRODUCT DEFECT — the INSTRUMENT's failure mode. If this comes back green the gate
    //   has stopped looking at anything, and every case above it proved nothing.
    name: "vacuity (the rail hook is renamed, so the gate's subject set goes EMPTY)",
    file: POSITIONS,
    from: `          data-filter-rail\n`,
    to: ``,
    expect: "0.5",
  },

  /* ── S-07 · the admin rails (scan #1, 2026-08-28) ───────────────────────────────────────
     The console had a SECOND filter language: 16 hand-rolled chips per rail across two
     surfaces, every one outlined AND filled, none from the kit. The rule set is split — the
     idiom is shared, only the density forks — so both halves of that split need a plant. */
  {
    // 🔴 THE DEFECT AS IT SHIPPED: a rail stops consuming the primitive and rolls its own.
    name: "admin-rolls-its-own (an admin rail leaves the shared language again)",
    file: ADMIN_RAIL,
    from: `import { FilterPill } from "@/components/ui/filter-pill";`,
    to: ``,
    expect: "6.1",
  },
  {
    // ⭐ THE FORK ITSELF. Take the player floor on an admin rail and the density ruling is
    //   silently reversed — the rail still LOOKS right, and every idiom assertion stays green.
    name: "admin-loses-its-density (the dense rank is dropped for the 44px player floor)",
    file: ADMIN_RAIL,
    from: `              rank="dense"`,
    to: ``,
    expect: "6.6",
  },
  {
    // 🔴 S-07b, VERBATIM: selection stated with FONT WEIGHT in a mono face, which is wider —
    //   so choosing a chip changes its own width and shoves every chip after it sideways.
    //   A filter rail that walks under the cursor as you use it, and no type can see it.
    name: "admin-reflows (selection stated with bold mono, so the rail moves as you use it)",
    file: ADMIN_RAIL,
    from: `              on={currentState === s.id}`,
    to: `              className={currentState === s.id ? "font-bold" : ""}\n              on={currentState === s.id}`,
    expect: "6.8",
  },

  /* ── batch 6 · the phone sheet ─────────────────────────────────────────────────────────
     Seven more, and not one of them is hypothetical: every case below is either a defect
     this surface has ALREADY shipped, or the exact silent reversal of a ruling Ali made. */
  {
    // 🔴 §8.7c, verbatim: a 362px panel clipped to FOUR PIXELS by a scrolling ancestor — 1%,
    //    zero of eight topics reachable, every automated check green, closed control perfect.
    name: "nested-details (a disclosure inside the sheet — the 4px listbox, re-created)",
    file: SHEET,
    from: `        <div className="kp-fsheet-body">{children}</div>`,
    to: `        <details className="kp-fsheet-body">{children}</details>`,
    expect: "5.2",
  },
  {
    // `qa:discovery-board` asserts EXACTLY TWO `details.kp-menu > summary` under the bar.
    name: "sheet-as-menu (the sheet joins the menu count and breaks a guard that is right)",
    file: SHEET,
    from: `      className="kp-fsheet lg:hidden"`,
    to: `      className="kp-fsheet kp-menu lg:hidden"`,
    expect: "5.3",
  },
  {
    // 🔴 THE MONEY-DIALOG DEFECT. A non-`[open]` dependency re-runs the effect on every render
    //    and drags focus onto the first control — on the bet-confirm that happened once a
    //    second, so a keyboard user who tabbed to Cancel had focus pulled onto Confirm.
    name: "focus-thrash (the effect re-runs on every render and drags focus — Modal's own bug)",
    file: SHEET,
    from: `  }, [open]);`,
    to: `  }, [open, close]);`,
    expect: "5.6",
  },
  {
    // The bar is z-20, the bottom nav z-40: without the lift the sheet opens UNDER the nav.
    name: "sheet-under-nav (the no-JavaScript stacking lift is dropped)",
    file: CSS,
    from: `.kp-discovery-bar:has(.kp-fsheet[open]),\nhtml[data-sheet-open] .kp-discovery-bar { z-index: 100; }`,
    to: `html[data-sheet-open] .kp-discovery-bar { z-index: 100; }`,
    expect: "5.9",
  },
  {
    /* 🔴 MEASURED, NOT IMAGINED — this is the state the sheet's first build actually shipped in:
       `top: -32px, bottom: 608px` in a 780px window, heading off the top of the screen, and a
       scrim covering neither end. ⛔ The mutation swaps `animation: none` for `transform: none`
       precisely because that is the fix that LOOKS right and does nothing: an animation's
       applied value beats a normal author declaration. A gate that accepts it is green over a
       sheet that is still captured by the page-transition wrapper. */
    name: "sheet-captured (transform:none instead of animation:none — the fix that does nothing)",
    file: CSS,
    from: `.route-enter:has(.kp-fsheet[open]),\nhtml[data-sheet-open] .route-enter { animation: none; }`,
    to: `.route-enter:has(.kp-fsheet[open]),\nhtml[data-sheet-open] .route-enter { transform: none; }`,
    expect: "5.11",
  },
  {
    /* 🔴 SHIPPED, THEN CAUGHT BY `responsive-audit`, THEN FIXED. Chrome leaves a closed
       <details>'s content with real layout boxes, and the phantom panel — positioned against
       `.route-enter` rather than the window while shut — measured past the right edge of the
       viewport at SIX widths (`button[Close filters] l363 r427 > vw390`). Invisible to the eye,
       a real horizontal-overflow finding. */
    name: "closed-sheet-lays-out (the shut sheet keeps a box and overflows the viewport)",
    file: CSS,
    from: `.kp-fsheet:not([open]) > .kp-fsheet-scrim,\n.kp-fsheet:not([open]) > .kp-fsheet-panel { display: none; }`,
    to: ``,
    expect: "5.23",
  },
  {
    // If the PANEL scrolls, the heading and the dismiss button scroll away with the content —
    // so the count a player is accepting is the thing they must scroll past to accept it.
    name: "panel-scrolls (the scroll moves off the body and onto the panel)",
    file: CSS,
    from: `  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2;\n  display: flex; flex-direction: column;`,
    to: `  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2;\n  display: flex; flex-direction: column; overflow-y: auto;`,
    expect: "5.15",
  },
  {
    // ⭐ A RULING, SILENTLY UNDONE. `--tap-min` is 40; swapping the literal back for the token
    //    reads like respecting a floor and is actually reverting Ali's 2026-08-14 decision.
    name: "range-reverted (the chart range back to 40 via the token, which reads like a floor)",
    file: CSS,
    from: `  min-height: 44px;\n}`,
    to: `  min-height: var(--tap-min);\n}`,
    expect: "4.3",
  },
  {
    // Two live copies of one control on one screen, every count rendered twice.
    name: "both-layouts (the sheet loses lg:hidden and renders beside the desktop groups)",
    file: SHEET,
    from: `      className="kp-fsheet lg:hidden"`,
    to: `      className="kp-fsheet"`,
    expect: "5.17",
  },
  {
    /* ⛔ THE DRIFT THAT ALREADY HAPPENED ONCE. The kit says in four places that sort stays in the
       bar at every width — *"they answer the first two questions a punter has and must never cost
       a tap"* — and this sheet's first build put it inside anyway, following a PLAN-OF-RECORD
       line whose real concern was nested `<details>`. Nothing but this assertion notices. */
    name: "sort-in-the-sheet (sort moves behind the Filters button, against COMPONENTS §21)",
    file: BAR,
    from: `          <FilterSheetGroup label={t.market.oddsKey}>`,
    to: `          <FilterSheetGroup label={t.common.sort}>{null}</FilterSheetGroup>\n          <FilterSheetGroup label={t.market.oddsKey}>`,
    expect: "5.20",
  },
];

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", GATE], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:filter-language is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1200));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(CASES.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
    problems.push(`case ${i + 1}: ANCHOR — ${e.message}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${lines.join(" | ")}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    console.log(`  ${i + 1}. ✓ RED on ${c.expect}  ${c.name}`);
  }
}

// ⛔ The tree must be exactly as it was found. A harness that leaves a defect behind is worse
//    than no harness — the next run's precondition would refuse, and the next COMMIT would ship it.
let dirty = 0;
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) { console.error(`🔴 NOT RESTORED: ${f}`); dirty++; }
}
if (dirty === 0) console.log("\ntree restored byte-identical");

const after = runGate();
if (after.code !== 0) {
  problems.push("the gate is RED on the restored tree — the restore did not restore");
}

console.log(`\n${CASES.length - problems.length}/${CASES.length} defects caught, each on its own assertion`);
if (problems.length || dirty) {
  console.error("");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("red:filter-language OK — the gate refuses every defect it names.");
