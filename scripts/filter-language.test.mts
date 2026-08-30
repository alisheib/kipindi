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
 *   §5 THE PHONE SHEET — batch 6: the whole filter surface at 360, and the ways it can vanish.
 *   §6 THE ADMIN RAILS — the same idiom at the admin measure, plus the admin stray sweep.
 *   §7 THE SHARED WINDOW PRIMITIVE — in the language, and deliberately NOT an admin surface.
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

/**
 * ⭐ THE ADMIN RAILS — same language, different measure (S-07, scan #1, 2026-08-28).
 *
 * §3.6's scope note read: "Admin is deliberately out of scope: it is a different audience with
 * its own density rules, and Ali's instruction named the player platform." That was a
 * considered decision, not an oversight, and it is preserved in rewritten form below.
 *
 * ⛔ WHAT CHANGED, AND WHAT DID NOT. Ali's 2026-08-28 instruction named admin explicitly, so
 * the scope widens — but the original rationale only ever licensed a different DENSITY, never
 * a different SELECTION IDIOM. So the rule set SPLITS rather than simply widening:
 *   · §6.1–6.5 — the IDIOM rules, identical to §3.1–3.5. Consume the primitive, never paint at
 *     the call site, outline only when selected. That is the design's MEANING, and meaning does
 *     not vary by audience.
 *   · §6.6 — the DENSITY rule FORKS. Player rails keep the 44px tap floor; admin rails take
 *     `--h-control-xs` (32px), the documented dense-admin exception.
 *
 * What these rails were: 8 state chips + 8 category chips, EVERY one outlined AND filled,
 * hand-rolled, on two surfaces — the exact shape filter-pill.tsx's header calls "the single
 * biggest source of the 'chunky' criticism the round-2 brief was answering". No admin surface
 * imported the primitive at all. And they rendered about 26px: UNDER the 32px exception they
 * were nominally claiming.
 */
/**
 * ⛔ AND IT GREW ON 2026-08-30 (DG-A-06), BECAUSE THE 2026-08-28 LIST WAS THE WRONG POPULATION.
 *
 * S-07 converted the two rails it had been told about and guarded them. It did not see:
 *   · `DateTimeRangeFilter` — ONE primitive with SEVEN admin call sites and 54 chips, which
 *     hand-rolled its own 33px capsule and, on `/admin/ai-polls` and `/admin/candidates`,
 *     rendered INSIDE the very same `data-filter-rail` div as the 32px dense pills. The same
 *     control at two sizes on one screen, ten pixels apart, for two days.
 *   · `CardSortControl` — 24px, duplicated byte-for-byte across two pages, and INVISIBLE to the
 *     audit because both call sites sit behind `{pendingSorted.length > 0 && …}` and an empty
 *     production queue renders zero of them.
 *   · `/admin/proposals`' queue rail — 22.5px, painted by an inline conditional `style` in an
 *     alphabet (`color-mix(in oklab, var(--brand-500) …)`) that §6.3/§6.4 cannot see.
 *
 * ⚠️ THE FIVE WINDOW-ONLY ROUTES ARE DECLARED THOUGH THEY EMIT NO HOOK. §0.4 does not force
 * them: they render `<DateTimeRangeFilter>` and nothing else filter-shaped, so nothing would
 * have noticed a 44px player-rank window filter shipping into a 32px console. Declaring them is
 * what makes §6.6 demand the dense rank at those call sites.
 */
const ADMIN_SURFACES = [
  "src/app/admin/ai-polls/poll-filters.tsx",        // /admin/ai-polls — state + category + window
  "src/app/admin/candidates/candidate-filters.tsx", // /admin/candidates — state + category + window
  "src/components/admin/card-sort-control.tsx",     // the hoisted card SORT rail (both consoles)
  "src/app/admin/proposals/admin-proposals-client.tsx", // /admin/proposals — the queue rail
  "src/app/admin/ai-usage/page.tsx",                // window only
  "src/app/admin/finance/page.tsx",                 // window only
  "src/app/admin/reports/page.tsx",                 // window only
  "src/app/admin/transactions/page.tsx",            // window only
  "src/app/admin/updown/page.tsx",                  // window only
];

/**
 * ⭐ EVERY PRIMITIVE THAT TAKES A `rank`, IN ONE PLACE — §6.2 and §6.6 are both derived from it.
 *
 * 🔴 THIS LIST IS WHY §6.6 HAD TO BE RE-KEYED BEFORE A SINGLE `rank="dense"` WAS TYPED. §6.6
 * used to count `<FilterPill` against `rank="dense"` and demand they be EQUAL. Both
 * `poll-filters.tsx` and `candidate-filters.tsx` already rendered a `<DateTimeRangeFilter>`
 * inside their declared rail, so the moment that call site took the dense rank the count went
 * 3 dense of 2 pills and a green 111-assertion suite went RED for doing the right thing.
 *
 * ⛔ SO THE RULE KEEPS COUNTING AND WIDENS WHAT IT COUNTS. Its original reason is correct and is
 * not softened: `/rank="dense"/.test(src)` was the first draft, the red harness caught it, and a
 * rail half at 32px and half at 44px is worse than either. ⚠️ TWO HAND-TYPED COPIES OF THIS LIST
 * IS HOW THE NEXT PRIMITIVE GETS ADDED TO ONE AND NOT THE OTHER — §6.2's regex is derived from
 * the same array, never re-typed.
 */
const RANK_TAKING = ["FilterPill", "DateTimeRangeFilter"];
const RANK_TAG = new RegExp(`<(?:${RANK_TAKING.join("|")})\\b`, "g");
/**
 * ⚠️ AND THE THIRD FORM OF THE SAME THING. `filterPillClass({ rank: "dense", on })` is the
 * primitive's own geometry worn by a control that genuinely cannot be a `<Link>` — the
 * `/admin/proposals` queue rail, which owns no URL. It takes a rank exactly as a JSX prop does,
 * so it counts as a control and its `rank: "dense"` counts as a dense one. A rule that ignored
 * it would let the one chip that is NOT a link be the one chip at the wrong height.
 */
const RANK_HELPER = /\bfilterPillClass\(/g;
const DENSE_ATTR = /rank="dense"/g;
const DENSE_PROP = /rank:\s*"dense"/g;

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

/**
 * ⚠️ BOTH LISTS, because a discovered rail is now legitimately either kind. Before S-07 this
 * compared against `SURFACES` alone, so the moment a converted admin rail emitted the hook a
 * 92-assertion suite went red for the right reason at the wrong time — the rail was BETTER and
 * the gate said worse. Declaring the admin rails is what clears that, and it is why they are a
 * named list rather than a `/admin/` exemption: an exemption would have re-hidden them.
 */
const DECLARED = [...SURFACES, ...ADMIN_SURFACES];
const undeclared = discovered.filter((f) => !DECLARED.includes(f));
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
 * way and simply omit the hook that §0.4 checks. Nav is out — an active NAV destination is a
 * settled, separate language.
 *
 * ⛔ THE ADMIN SCOPE NOTE, REWRITTEN RATHER THAN DELETED (S-07, 2026-08-28). It used to read:
 * "Admin is deliberately out of scope: it is a different audience with its own density rules,
 * and Ali's instruction named the player platform."
 *
 * That was a CONSIDERED DECISION and it is recorded here because deleting it would erase the
 * reasoning along with the rule. What changed is the instruction: Ali's 2026-08-28 scan named
 * admin explicitly. What did NOT change is the rationale — "a different audience with its own
 * density rules" licenses a different MEASURE, and never licensed a different way of saying
 * "this one is chosen". Under the old note both readings looked equally supported, and the
 * console drifted into a second filter language on the strength of the wrong one.
 *
 * So admin is now IN scope, through `ADMIN_SURFACES` and §6, with the density rule forked and
 * the idiom rules shared. `NON_FILTER` still excludes `/admin/` HERE, in §3.6 only, because
 * §3.6 is the PLAYER stray-sweep: an admin rail is not a stray, it is declared and checked by
 * its own section. ⚠️ Widening §3.6 instead of adding §6 would have applied the 44px player
 * floor to admin and forced an exemption — which is how a rule becomes unenforceable.
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
// ⭐ 44, NOT 40 — Ali's ruling 2026-08-14, shipped in batch 6. The eighth filter control now
//    stands at the height of the other seven rails.
const rangeBox = css.match(/\.pchart-range\s*\{([^}]*)\}/);
ok(!!rangeBox, "4.0b CONTROL: the chart range's own rule still exists to be checked");
ok(!!rangeBox && /min-height:\s*44px/.test(rangeBox[1]),
  "4.3 the chart range control genuinely reaches 44px — the height every other filter rail uses",
  rangeBox?.[1]?.trim().slice(0, 120));
// ⛔ AND IT MUST NOT BE `var(--tap-min)`. That token is 40, so "tidying" the literal back into it
//    would silently undo Ali's ruling while still reading like a floor was being respected.
ok(!!rangeBox && !/min-height:\s*var\(--tap-min\)/.test(rangeBox[1]),
  "4.4 …and it is not reached through --tap-min, which is 40 and would silently revert it");

// ── §5 · THE PHONE FILTER SHEET — batch 6 ─────────────────────────────────────────────────────

/**
 * ⭐ THE SHEET IS THE PHONE'S ENTIRE FILTER SURFACE, so the ways it can be wrong are the ways
 * the bar can lose its filters altogether. Every assertion below names a defect this codebase
 * has ALREADY shipped once, on this exact surface.
 *
 * ⚠️ THESE ARE SOURCE ASSERTIONS AND THEY ARE NOT THE PROOF OF BEHAVIOUR. Focus trap, focus
 * return, Escape and the 120px budget are proven by opening the real control in a real browser
 * (`qa:discovery-board`, `qa:filter-scan`). What lives here is the set of facts a diff can
 * destroy silently — the ones no screenshot of a CLOSED control would ever show.
 */
const SHEET = "src/components/markets/filter-sheet.tsx";
const sheetSrc = existsSync(join(ROOT, SHEET)) ? read(SHEET) : "";
// ⭐ THE POSITIVE CONTROL. Without it every rule below passes vacuously the moment the file is
//    renamed — which is precisely how a third copy of the time-left formatter survived two batches.
ok(sheetSrc.length > 0, "5.0 CONTROL: the sheet component exists to be checked", SHEET);

const sheetCode = strip(sheetSrc);
ok(/<details\b/.test(sheetCode),
  "5.1 the sheet is a <details> — it opens and operates with JavaScript disabled");
// ⛔ §8.7c: a sheet that scrolls clips an absolutely-positioned panel. A nested disclosure here
//    re-creates the 4px listbox exactly, and a screenshot of the closed sheet cannot show it.
ok((sheetCode.match(/<details\b/g) ?? []).length === 1,
  "5.2 exactly ONE <details> — no nested disclosure to be clipped by the scrolling body");
// ⛔ `qa:discovery-board` asserts EXACTLY TWO `details.kp-menu > summary` under the bar. A sheet
//    wearing that class reads as a third menu and fails a guard that is right.
ok(!/kp-menu/.test(sheetCode),
  "5.3 the sheet is not a .kp-menu — the desktop row's two menus stay countable");
// The primitive, not a second dialect of it.
ok(!/kp-fchip/.test(sheetCode) && !/var\(--pill-active\)/.test(sheetCode),
  "5.4 the sheet re-expresses no pill of its own — its chips come from the primitive");
// Rung 3 is PICKED, not composed (M2). A second wash/shadow here is a second definition of
// "sheet with a scrim", which the elevation ladder already owns.
ok(/mat-modal/.test(sheetCode) && /m-sheet-in/.test(sheetCode) && /m-scrim/.test(sheetCode),
  "5.5 the panel picks the shipped rung-3 material and the shipped sheet/scrim motion");

/**
 * 🔴 THE FOCUS DEFECT THE SHARED MODAL PAID FOR. Its focus effect once depended on
 * `[open, onClose, initialFocus]`; every caller passed a fresh inline arrow, so the effect
 * re-ran on EVERY render and dragged focus onto the primary button — once a second on the
 * bet-confirm dialog, whose countdown ticks. A keyboard user who tabbed to Cancel had focus
 * pulled onto Confirm inside the second, on a money dialog. Any dependency but `[open]` here
 * reintroduces it, and nothing else in the suite would notice.
 */
ok(/\}, \[open\]\);/.test(sheetCode),
  "5.6 the focus effect depends on [open] alone — the defect that moved focus on a money dialog");
ok(/useModalLock\(open\)/.test(sheetCode),
  "5.7 the sheet takes the SAME body scroll/zoom lock the shared <Modal> takes");
ok(/e\.key === "Escape"/.test(sheetCode) && /restoreTo\?\.focus\?\.\(\)/.test(sheetCode),
  "5.8 Escape closes it, and focus returns to the trigger that opened it");

/**
 * 🔴 THE BAR IS `z-20` AND THE BOTTOM NAV IS `z-40`. Without the lift, the sheet opens
 * UNDERNEATH the navigation — a scrim you can tap through on a dialog claiming `aria-modal`.
 * ⛔ Both selectors are required: `:has()` is the no-JavaScript path and the attribute is the
 * fallback. Losing either leaves a class of browser with a broken modal.
 */
ok(/\.kp-discovery-bar:has\(\.kp-fsheet\[open\]\)/.test(css),
  "5.9 the bar is lifted above the bottom nav while the sheet is open, with no JavaScript");
ok(/html\[data-sheet-open\] \.kp-discovery-bar/.test(css),
  "5.10 …and by attribute too, for a browser without :has()");

/**
 * 🔴 `position: fixed` IS NOT "RELATIVE TO THE VIEWPORT" INSIDE PAGE CONTENT — measured
 * 2026-08-15 on this sheet's first build: `top: -32px, bottom: 608px` in a 780px window. The
 * heading sat above the top of the screen, the sheet floated 172px clear of the bottom, and
 * the scrim covered neither.
 *
 * `.route-enter` is `animation: m-settle-in … both`, and a `both` fill retains the final
 * keyframe's transform for ever — so the page-transition wrapper is the containing block for
 * every fixed descendant, on every route. The shared `<Modal>` never meets it because it
 * portals to `document.body`; this sheet cannot, because it must open with no JavaScript.
 * ⛔ AND `transform: none` DOES NOT UNDO IT — an animation's applied value beats a normal
 * author declaration, so the rule must drop the ANIMATION. A gate that accepted
 * `transform: none` here would be green over a sheet that is still captured.
 */
ok(/\.route-enter:has\(\.kp-fsheet\[open\]\)[\s\S]{0,80}\{[^}]*animation:\s*none/.test(css),
  "5.11 the route wrapper's retained transform is dropped while the sheet is open (no JavaScript)");
ok(/html\[data-sheet-open\] \.route-enter/.test(css),
  "5.12 …and by attribute too, for a browser without :has()");

// ⭐ THE BODY SCROLLS, THE PANEL DOES NOT — so the heading and the dismiss button survive any
//    content length. If the panel became the scroller, the count a player is accepting would be
//    the thing they have to scroll past to reach it.
/**
 * ⛔ ANCHORED TO THE START OF A LINE, WHICH IS NOT PEDANTRY — `red:filter-language` caught this
 * one live. The locator was `/\.kp-fsheet-panel\s*\{/`, and the moment a second rule appeared
 * whose selector ENDS with that class (`.kp-fsheet:not([open]) > .kp-fsheet-panel { display: none }`,
 * added earlier in the file) the gate started reading THAT block instead of the definition —
 * so §5.15 was inspecting `display: none` and the `panel-scrolls` mutation walked straight past
 * it. A guard whose locator can drift onto a neighbour is the §5b rule-7 failure exactly: the
 * check and its RED proof agreeing with each other about the wrong subject.
 */
const panelRule = css.match(/(?:^|\n)\.kp-fsheet-panel\s*\{([^}]*)\}/);
const bodyRule = css.match(/(?:^|\n)\.kp-fsheet-body\s*\{([^}]*)\}/);
ok(!!panelRule && !!bodyRule, "5.13 CONTROL: the sheet's panel and body rules exist to be checked");
ok(!!bodyRule && /overflow-y:\s*auto/.test(bodyRule[1]) && /min-height:\s*0/.test(bodyRule[1]),
  "5.14 the sheet's BODY is the scroll container, and can actually shrink to become one");
ok(!!panelRule && !/overflow-y:\s*auto/.test(panelRule[1]),
  "5.15 …and the panel itself does not scroll, so the header and footer stay put");

/**
 * ⭐ THE TWO LAYOUTS ARE MUTUALLY EXCLUSIVE. The sheet and the desktop row hold the same
 * filters; a width that renders BOTH would show a player two live copies of one control, and
 * every count would appear twice on the page.
 */
const barSrc = strip(read("src/components/markets/discovery-bar.tsx"));
ok(/<FilterSheet\b/.test(barSrc), "5.16 the bar actually renders the sheet");
ok(/className="kp-fsheet lg:hidden"/.test(sheetCode),
  "5.17 the sheet is phone-only (lg:hidden)");
// The desktop copies of the SAME three groups must be desktop-only, or both render at once.
ok((barSrc.match(/className="hidden shrink-0 items-center gap-1 lg:flex"/g) ?? []).length === 2,
  "5.18 …and both desktop chip groups are desktop-only (hidden … lg:flex) — no width renders both");
ok(/rootClassName="hidden max-w-full lg:block"/.test(barSrc),
  "5.19 …and so is the desktop topic menu");

/**
 * ⭐ THE SHEET HOLDS EXACTLY WHAT THE KIT SAYS IT HOLDS — odds, pool, topic (COMPONENTS §21).
 *
 * ⛔ SORT AND STATUS STAY IN THE BAR AT EVERY WIDTH: *"they answer the first two questions a
 * punter has and must never cost a tap"*. The kit states this in four places (COMPONENTS §21,
 * SPEC's responsive table, README §discovery, DISCOVERY-RATIONALE) and the first build of this
 * sheet put sort inside it anyway, following a PLAN-OF-RECORD line whose real concern was
 * nested `<details>`. This assertion is what stops that drift happening twice.
 */
/* ⚠️ TOLERANT OF FORMATTING, DELIBERATELY. The first version required `label` to sit on the same
   line as the tag; reformatting the topic group onto three lines — a whitespace change — dropped
   it from the match and the gate reported TWO groups over a correct product. A guard that a
   prettier run can break is a guard that will be "fixed" by loosening it at the worst moment. */
const sheetGroups = [...barSrc.matchAll(/<FilterSheetGroup[\s\S]{0,160}?label=\{([^}]+)\}/g)].map((m) => m[1].trim());
ok(sheetGroups.length === 3,
  "5.20 the sheet holds exactly three groups, as COMPONENTS §21 lists", sheetGroups.join(", "));
ok(!sheetGroups.some((g) => /common\.sort/.test(g)),
  "5.21 …and sort is NOT one of them — it stays in the bar at every width", sheetGroups.join(", "));
ok(sheetGroups.some((g) => /oddsKey/.test(g)) && sheetGroups.some((g) => /poolKey/.test(g)) && sheetGroups.some((g) => /common\.topic/.test(g)),
  "5.22 …they are odds, pool and topic", sheetGroups.join(", "));

/**
 * 🔴 A CLOSED DISCLOSURE MUST LAY OUT NOTHING — and Chrome does not give you that for free.
 * It hides `<details>` content through the `::details-content` slot, so descendants keep real
 * boxes: a chip in the CLOSED sheet measures 81×44 at y=765. Combined with the `.route-enter`
 * capture (which does not apply while the sheet is shut, so `left: 0; right: 0` resolves against
 * the page wrapper rather than the window), the phantom panel measured PAST THE RIGHT EDGE OF
 * THE VIEWPORT at six widths — `responsive-audit` read
 * `button[Close filters] l363 r427 > vw390`. Shipped, then caught by the audit, then fixed.
 */
ok(/\.kp-fsheet:not\(\[open\]\)[\s\S]{0,140}?\{[^}]*display:\s*none/.test(css),
  "5.23 a CLOSED sheet lays out nothing — otherwise its phantom panel overflows the viewport");

// ── §6 · THE ADMIN RAILS — the same idiom, the admin measure ──────────────────────────────────
/**
 * See the ADMIN_SURFACES note above for the ruling and its date. §6.1–6.5 are §3.1–3.5 applied
 * unchanged: the selection idiom is the design's meaning and does not vary by audience. §6.6 is
 * the one rule that forks.
 */
for (const f of ADMIN_SURFACES) {
  ok(existsSync(join(ROOT, f)), `6.0 CONTROL: the admin rail ${f} still exists`);
  if (!existsSync(join(ROOT, f))) continue;
  const src = strip(read(f));

  /* ⚠️ TWO DOORS INTO THE ONE LANGUAGE, AND NEITHER IS A LOOSENING. Five declared routes render
     `<DateTimeRangeFilter>` and no `FilterPill` of their own, so they import
     `datetime-range-filter` and not `filter-pill` — I ran the old regex over all five and it was
     FALSE on every one. Declaring them with §6.1 unchanged would have been five more red
     assertions. ⛔ The indirection is only safe because §7 pins that primitive to `FilterPill`:
     without §7 this would be a hole, not a door.

     🔴 AND THE FIRST DRAFT OF THIS WIDENING WAS ITSELF A HOLE — `red:filter-language` caught it
     within the same hour, which is the whole reason that harness exists. Written as "imports
     EITHER module", the `admin-rolls-its-own` plant (candidate-filters.tsx drops its
     `FilterPill` import) STAYED GREEN: the file still imported `datetime-range-filter`, so a
     rail that had left the shared language satisfied a rule about a module it does not use.
     ⛔ SO THE RULE IS PER-CONTROL: whatever this file RENDERS, it must import from that
     control's own module. Widening the subject must never widen what counts as satisfaction. */
  const IMPORT_OF: Record<string, RegExp> = {
    FilterPill: /from "@\/components\/ui\/filter-pill"/,
    DateTimeRangeFilter: /from "@\/components\/ui\/datetime-range-filter"/,
  };
  const rendered = new Set(RANK_TAKING.filter((n) => new RegExp(`<${n}\\b`).test(src)));
  // `filterPillClass` is the primitive's own geometry worn by a non-navigating chip — same module.
  if ((src.match(RANK_HELPER) ?? []).length > 0) rendered.add("FilterPill");
  const unimported = [...rendered].filter((n) => !IMPORT_OF[n].test(src));
  ok(rendered.size > 0 && unimported.length === 0,
    `6.1 ${f} imports every shared control it renders, from that control's own module`,
    rendered.size === 0 ? "renders none" : `missing: ${unimported.join(", ")}`);
  /* ⛔ `.match()`, NEVER `.test()`. `RANK_TAG` and `RANK_HELPER` carry the `g` flag, and a
     global regex's `.test()` advances `lastIndex` between calls — inside a `for` loop over nine
     files that means file 2 starts scanning where file 1 stopped and the rule silently reports
     on text it never read. `String.prototype.match` resets `lastIndex` itself. */
  const rankTags = (src.match(RANK_TAG) ?? []).length;
  const rankHelpers = (src.match(RANK_HELPER) ?? []).length;
  ok(rankTags + rankHelpers > 0,
    `6.2 ${f} renders its filter controls through a shared primitive`);
  ok(!/var\(--pill-active\)/.test(src),
    `6.3 ${f} does not paint a selected control at the call site`);
  ok(!/var\(--glow-selected\)/.test(src),
    `6.4 ${f} does not paint a selected halo at the call site`);
  ok(!OLD_IDIOM.test(src),
    `6.5 ${f} no longer carries the divergent rounded-md filter class`);

  /* ⭐ 6.6 — THE FORK. Admin rails take the dense rank; that is the ONLY thing they may vary.
     ⛔ EVERY control, not merely one. `/rank="dense"/.test(src)` was the first draft and the red
     harness caught it: these files render FOUR rails, so dropping the rank from one left three
     behind and the assertion passed on their evidence. A rail half at 32px and half at 44px is
     worse than either — it is the same control at two sizes on one screen. Count, don't test.
     ⛔ AND THE SUBJECT WIDENED ON 2026-08-30 (DG-A-06) WITHOUT THE REASON CHANGING. It counted
     `<FilterPill` alone, so the `<DateTimeRangeFilter>` sitting in the SAME rail — 33px against
     the pills' 32px — was not a control as far as this rule was concerned. See `RANK_TAKING`. */
  const controls = rankTags + rankHelpers;
  const dense = (src.match(DENSE_ATTR) ?? []).length + (src.match(DENSE_PROP) ?? []).length;
  ok(controls > 0 && dense === controls,
    `6.6 EVERY rank-taking control on ${f} takes the DENSE rank — --h-control-xs (32px), the documented admin exception`,
    `${dense} dense of ${controls} controls`);

  /* ⛔ 6.7 — THE DEFECT THAT MADE THIS SECTION NECESSARY, asserted directly. Every chip was
     outlined AND filled, and the selected one switched to `font-bold` in a MONO face — which is
     wider — so choosing a chip changed its own width and shoved every chip after it sideways.
     A filter rail that moves under the cursor as you use it (S-07b). */
  ok(!/\bbg-bg-overlay\b[^`"]*\btext-text-muted\b/.test(src),
    `6.7 ${f} does not fill an UNSELECTED chip — only the selected one carries paint`);
  ok(!/currentState === s\.id[\s\S]{0,200}font-bold/.test(src) && !/currentCategory === c\.id[\s\S]{0,200}font-bold/.test(src),
    `6.8 ${f} does not state selection with FONT WEIGHT — bold mono is wider, so the rail reflows`);
}

/**
 * 🔴 6.8b — THE POSITIVE CONTROL §6.8 NEEDED THE MOMENT THE DECLARED SET GREW (DG-A-06).
 *
 * §6.8 is keyed on two LITERAL strings, `currentState === s.id` and `currentCategory === c.id`.
 * I ran both over the seven files added on 2026-08-30: FALSE on every one. So on those seven
 * files §6.8 passes because its SUBJECT DOES NOT EXIST — an assertion that cannot fail, which is
 * the exact disease this file's own §0 preamble was written to refuse.
 *
 * ⛔ AND IT MEANS THE ASSERTION TOTAL IS NOT THE MEASUREMENT. Declaring a file RAISES the count
 * while LOWERING the coverage per file. This control is what stops a rename from silently
 * emptying the rule: if either key stops existing anywhere in the declared set, someone must
 * come here and re-key §6.8 rather than enjoy a larger green number.
 */
const adminCode = ADMIN_SURFACES.filter((f) => existsSync(join(ROOT, f))).map((f) => strip(read(f)));
ok(adminCode.some((s) => /currentState === s\.id/.test(s)) && adminCode.some((s) => /currentCategory === c\.id/.test(s)),
  "6.8b CONTROL: §6.8's two literal keys still name real code — otherwise the rule is vacuous");

// ── §6.9 · THE ADMIN STRAY SWEEP — RE-KEYED ON THE DEFECT, NOT ON THE DRESSING ────────────────
/**
 * ⛔ WITHOUT THIS, a THIRD admin rail could be hand-rolled tomorrow, omit `data-filter-rail`, and
 * never appear in ADMIN_SURFACES — the exact hole §3.6 closes on the player side.
 *
 * 🔴 AND IT WAS DEAD. `OLD_IDIOM` is `/rounded-md border px-3(?:\.5)? font-mono/`, and I walked
 * the whole tree with this file's own `strip()`: it matches ZERO files in `src/`. It won — the
 * rounded-md idiom is gone — so the rule is kept below as a TOMBSTONE. ⚠️ Do not delete a rule
 * that is green because it succeeded; deleting it is how the idiom comes back.
 *
 * 🔴 BUT EVERY SURVIVING DG-A-06 CAPSULE IS `rounded-pill`, SO THE SWEEP SAW NONE OF THEM, AND
 * THE OBVIOUS WIDENING IS A TRAP THAT WOULD HAVE SHIPPED GREEN OVER THIS VERY ROW. Measured:
 *   (a) `/rounded-pill border px-\d/` — the minimal edit, keeping OLD_IDIOM's word order —
 *       MISSES both `CardSortControl` and the poll-actions picker, because both write `border`
 *       LAST (`px-2.5 py-1 rounded-pill … border`). The two rails this row exists to find would
 *       have stayed invisible while the work item looked done.
 *   (b) An order-insensitive SHAPE key is noise by construction: `rounded-pill` + a bare
 *       `border` + `px-` matches 43 sites tree-wide, and + `font-mono` still matches 27 —
 *       almost all of them status tags, share buttons and progress tracks. THE PILL IS THE
 *       SHARED SHAPE of this product. Keying on it is DG-A-14's lesson repeating one row later:
 *       that instrument counted 48 sentences as labels because it was keyed on the dressing.
 *   (c) `/admin/proposals`' rail was invisible to ANY class-string key at all — it stated
 *       selection through an inline conditional `style={…}`.
 *
 * ⭐ SO THE KEY IS THE DEFECT ITSELF: an INTERACTIVE element (`<button>` / `<a>` / `<Link>`)
 * wearing the capsule (`rounded-pill` + a BARE `border` + a `px-`) that states a binary state AT
 * THE CALL SITE — either by a ternary painting a non-transparent `border-*` in BOTH branches, or
 * by an inline conditional `style`. `border-transparent` is excluded on purpose: it is the
 * primitive's own idiom (same box, only the ink changes), and a control that uses it is
 * conforming, not straying. Measured tree-wide: 13 hits, 7 of them under `/admin/`, and they
 * separate cleanly into the four this row converts and the four named below.
 */
/**
 * ⛔ `=>` COMES FIRST IN THE ALTERNATION AND THAT ORDER IS LOAD-BEARING. With `(?:[^>]|=>)*?`
 * — the spelling `ui-consistency.test.mts` still carries — a LAZY match stops at the first `>`
 * it can reach: on `<button onClick={() => …} className=…>` the engine matches `=` with `[^>]`,
 * finds `>` next, and closes the tag there, so `className` and `style` are never in the captured
 * body. Measured: that spelling found 6 of the 13 capsules and silently dropped every button
 * whose handler is an arrow function — including all three on `/admin/proposals`. Putting `=>`
 * first makes the loop consume the arrow before it can be mistaken for the tag's end.
 */
const CAPSULE_TAG = /<(?:button|a|Link)\b((?:=>|[^>])*?)>/gs;
const BARE_BORDER = /(?:^|[\s"'`])border(?=[\s"'`])/;
const PAINTED_BORDER = /border-(?!transparent\b)[a-z]/g;

/** Every call-site-painted selection capsule in one file, as raw tag bodies. */
function selectionCapsules(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(CAPSULE_TAG)) {
    const body = m[1] ?? "";
    if (!/rounded-pill/.test(body)) continue;
    if (!BARE_BORDER.test(body)) continue;
    if (!/\bpx-/.test(body)) continue;
    const painted = (body.match(PAINTED_BORDER) ?? []).length;
    const ternaryPaint = body.includes("?") && body.includes(":") && painted >= 2;
    const inlineCond = /style=\{[^}]*\?[\s\S]{0,400}?:/.test(body);
    if (!ternaryPaint && !inlineCond) continue;
    out.push(body);
  }
  return out;
}

/**
 * ⭐ NAMED EXEMPTIONS, ONE REASON EACH — mirroring ADMIN_SURFACES' own design note that a named
 * list beats a blanket `/admin/` exemption, which would simply re-hide what this rule found.
 *
 * ⛔ THEY ARE KEYED ON THE CONTROL, NOT ON THE FILE. A file-level exemption for
 * `admin-proposals-client.tsx` would have protected its two form pickers AND its queue rail —
 * the very rail this row just converted — so a regression there would go unnoticed for ever.
 * Each entry names a substring of the control's own tag, so a NEW hand-rolled rail in the same
 * file is still caught.
 *
 * ⚠️ Every one of these is a control that is NOT a view filter. Giving them a filter's
 * outline-only-when-selected idiom would misrepresent what they do — which is the same argument,
 * run the other way, that put the four converted rails into the language.
 */
const SWEEP_EXEMPT: { file: string; key: string; why: string }[] = [
  {
    file: "src/app/admin/ai-polls/poll-actions.tsx",
    key: "setCategory(c.id)",
    why: "the GENERATION category picker — it sets an action parameter (which category the AI writes a poll for) and filters nothing on the page",
  },
  {
    file: "src/app/admin/sources/source-controls.tsx",
    key: "border-yes-700",
    why: "ToggleCategory WRITES — it posts toggleCategoryAction and router.refresh()es. A control that changes the world is not a filter",
  },
  {
    file: "src/app/admin/proposals/admin-proposals-client.tsx",
    key: "setECategory(ct)",
    why: "the edit-form CATEGORY picker inside the review panel — it chooses what to SAVE, not what to see",
  },
  {
    file: "src/app/admin/proposals/admin-proposals-client.tsx",
    key: "setReason(r)",
    why: "the DECLINE REASON picker — a form input on the decline path, not a view filter",
  },
];

const adminStrays: string[] = [];
for (const f of allSrc.filter((x) => /\.tsx$/.test(x) && /\/admin\//.test(x))) {
  const src = strip(read(f));
  if (OLD_IDIOM.test(src)) adminStrays.push(`${f} — the rounded-md idiom is back`);
  for (const body of selectionCapsules(src)) {
    if (SWEEP_EXEMPT.some((e) => e.file === f && body.includes(e.key))) continue;
    adminStrays.push(`${f} — ${body.replace(/\s+/g, " ").trim().slice(0, 90)}`);
  }
}
ok(adminStrays.length === 0,
  "6.9 no admin surface paints a selection capsule at the call site",
  adminStrays.join("  |  "));

/**
 * ⭐ AND THE EXEMPTION LIST'S OWN POSITIVE CONTROL. An exemption that no longer matches anything
 * is worse than no exemption: it protects nothing, it is invisible, and it makes the next reader
 * believe a control was considered when it may have been deleted or rewritten. If one goes
 * stale, someone must come here and decide again rather than inherit a decision that expired.
 */
const staleExempt = SWEEP_EXEMPT.filter(
  (e) => !existsSync(join(ROOT, e.file)) || !selectionCapsules(strip(read(e.file))).some((b) => b.includes(e.key)),
);
ok(staleExempt.length === 0,
  "6.10 CONTROL: every named sweep exemption still matches a real control — and proves the key still matches",
  staleExempt.map((e) => `${e.file} :: ${e.key}`).join(", "));

// ── §7 · THE SHARED WINDOW PRIMITIVE — in the language, but NOT an admin surface ───────────────
/**
 * ⛔ `DateTimeRangeFilter` DELIBERATELY DOES NOT JOIN `ADMIN_SURFACES`, and the reason is the
 * whole point of DG-A-06. Declaring it would make §6.6 demand `rank="dense"` INSIDE it — baking
 * the 32px admin fork into a `components/ui` primitive that also defines `PLAYER_PRESETS` and
 * whose default must stay the 44px tap floor. A shared file that hard-codes one audience's
 * density is the defect, not the fix. So it gets its own block, with the density rule INVERTED:
 * §7.3 fails if the dense rank appears here at all.
 *
 * ⚠️ AND §7 IS WHAT MAKES §6.1's SECOND DOOR SAFE. Five declared routes reach the language only
 * through this file; without §7 pinning it to `FilterPill`, "imports datetime-range-filter"
 * would prove nothing about what those routes render.
 */
const RANGE = "src/components/ui/datetime-range-filter.tsx";
ok(existsSync(join(ROOT, RANGE)), "7.0 CONTROL: the shared window primitive exists to be checked", RANGE);
if (existsSync(join(ROOT, RANGE))) {
  const rangeSrc = strip(read(RANGE));
  ok(/from "@\/components\/ui\/filter-pill"/.test(rangeSrc),
    "7.1 the window filter imports the pill primitive rather than re-expressing it");
  ok((rangeSrc.match(/<FilterPill\b/g) ?? []).length > 0,
    "7.2 …and renders its presets through it — 54 chips over 7 admin call sites");
  /* ⭐ RANK IS A PROP. This is the assertion that keeps an admin decision out of shared code:
     the type must be declared here, and the admin value must NOT appear here. */
  const takesRank = /rank\??:\s*FilterPillRank/.test(rangeSrc);
  const hardCodedDense = (rangeSrc.match(DENSE_ATTR) ?? []).length + (rangeSrc.match(DENSE_PROP) ?? []).length;
  ok(takesRank && hardCodedDense === 0,
    "7.3 the window filter TAKES a rank and never hard-codes the admin one — PLAYER_PRESETS lives here",
    `takesRank=${takesRank} hardCodedDense=${hardCodedDense}`);
  /* ⛔ NO SECOND CAPSULE. The "Custom" chip cannot be a <Link> (it opens a disclosure), so it
     wears `filterPillClass` — the primitive's own string — rather than a re-typed copy of it.
     A `rounded-pill` written in this file would BE that re-typed copy. */
  ok(!/rounded-pill/.test(rangeSrc) && (rangeSrc.match(RANK_HELPER) ?? []).length > 0,
    "7.4 …and re-expresses no capsule of its own — the non-navigating chip wears filterPillClass");
  ok(!/\bbg-bg-overlay\b[^`"]*\btext-text-muted\b/.test(rangeSrc),
    "7.5 …and does not fill an UNSELECTED chip — the defect it shipped for two days");
  ok(!/var\(--pill-active\)/.test(rangeSrc) && !/var\(--glow-selected\)/.test(rangeSrc),
    "7.6 …and paints no selected state itself — the fill and halo are .kp-fchip[data-on] (law 82)");
}

console.log(`filter-language: ${pass} assertions passed · ${SURFACES.length} player + ${ADMIN_SURFACES.length} admin rails · ${discovered.length} discovered`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
