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
const ADMIN_SURFACES = [
  "src/app/admin/ai-polls/poll-filters.tsx",        // /admin/ai-polls — state + category
  "src/app/admin/candidates/candidate-filters.tsx", // /admin/candidates — state + category
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

  ok(/from "@\/components\/ui\/filter-pill"/.test(src),
    `6.1 ${f} imports the primitive rather than re-expressing it`);
  ok(/<FilterPill\b/.test(src),
    `6.2 ${f} renders its filter controls through the primitive`);
  ok(!/var\(--pill-active\)/.test(src),
    `6.3 ${f} does not paint a selected control at the call site`);
  ok(!/var\(--glow-selected\)/.test(src),
    `6.4 ${f} does not paint a selected halo at the call site`);
  ok(!OLD_IDIOM.test(src),
    `6.5 ${f} no longer carries the divergent rounded-md filter class`);

  /* ⭐ 6.6 — THE FORK. Admin rails take the dense rank; that is the ONLY thing they may vary.
     ⛔ EVERY pill, not merely one. `/rank="dense"/.test(src)` was the first draft and the red
     harness caught it: these files render FOUR rails, so dropping the rank from one left three
     behind and the assertion passed on their evidence. A rail half at 32px and half at 44px is
     worse than either — it is the same control at two sizes on one screen. Count, don't test. */
  const pills = (src.match(/<FilterPill\b/g) ?? []).length;
  const dense = (src.match(/rank="dense"/g) ?? []).length;
  ok(pills > 0 && dense === pills,
    `6.6 EVERY pill on ${f} takes the DENSE rank — --h-control-xs (32px), the documented admin exception`,
    `${dense} dense of ${pills} pills`);

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
 * ⛔ AND THE ADMIN STRAY SWEEP, the mirror of §3.6. Without this, a THIRD admin rail could be
 * hand-rolled tomorrow, omit `data-filter-rail`, and never appear in ADMIN_SURFACES — the exact
 * hole §3.6 exists to close on the player side. Scoped to the two console trees that actually
 * carry list filters, so it cannot be satisfied by moving a file.
 */
const adminStrays = allSrc
  .filter((f) => /\.tsx$/.test(f) && /\/admin\//.test(f) && !ADMIN_SURFACES.includes(f))
  .filter((f) => OLD_IDIOM.test(strip(read(f))));
ok(adminStrays.length === 0,
  "6.9 no admin surface builds a filter rail the old way either",
  adminStrays.join(", "));

console.log(`filter-language: ${pass} assertions passed · ${SURFACES.length} player + ${ADMIN_SURFACES.length} admin rails · ${discovered.length} discovered`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
