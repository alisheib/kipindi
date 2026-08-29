/**
 * Type-scale guard.                        DESIGN_AUTHORITY §T (and §M4 for money)
 *
 * ⭐ WHY THIS EXISTS. §T is the only design law in this repo that had ZERO
 * enforcement. Palette has `test:contrast` and `test:bridge`; radius, width and
 * motion have `test:design-frozen`, `test:measure` and `test:motion`; the type
 * ladder had nothing at all — and it shows. Measured at HEAD, 2026-08-21:
 *
 *     1,839 arbitrary `text-[Npx]`   vs   308 semantic `text-<key>`   (~6 : 1)
 *        29 distinct hand-typed sizes, including the off-ladder
 *           8 · 8.5 · 9.5 · 10.5 · 11.5 · 12.5 · 13.5 · 14.5 · 15.5 · 19 · 21 · 26 · 30 · 34 · 38
 *       639 arbitrary `tracking-[…]` across 200 files
 *
 * §T1 says the scale is CLOSED: "a hand-typed `text-[13.7px]` is a violation even
 * if it looks right — the next screen will pick a different number and the product
 * loses its rhythm one component at a time." That is not a hypothetical here; it
 * already happened 1,839 times. DESIGN_AUTHORITY §T2 even files one of them against
 * itself (the market question at `text-[26px] md:text-[34px]`).
 *
 * ⛔ SO THIS IS A RATCHET, NOT A WALL — the same model as `test:measure` and
 * `test:ui-consistency`. A big-bang conversion of 1,839 call sites is not a change
 * anyone can review, and a guard that fails on day one is a guard someone deletes.
 * The counts below are today's, they may only ever SHRINK, and the parts that CAN
 * be absolute are absolute:
 *
 *     HARD (fails immediately, green today):
 *       §1  a money element may not set a non-mono family on itself      (§T5 · §M4)
 *       §2  a money element may not carry a `tracking-` utility          (§M4)
 *       §5  the set of distinct hand-typed sizes may not GAIN a member   (§T1)
 *       §6  the set of distinct hand-typed tracking values may not GAIN  (§T1)
 *     RATCHET (fails on any increase):
 *       §3  reading copy below the 12.5px floor                          (§T4 · §T3)
 *       §4  total arbitrary sizes, incl. inline literal `fontSize`       (§T1)
 *
 * ⭐ THE SET RULES ARE THE STRONGEST LEVER HERE and they cost nothing today: the
 * ladder cannot gain a 30th step. A session that needs "just 23px" has to either
 * use the ladder or come here and argue for it in writing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 WHAT THIS GUARD DELIBERATELY DOES **NOT** ASSERT, AND WHY.
 *
 * The brief for §1 was "an element rendering formatTzs(…) must CARRY font-mono".
 * It cannot be written that way honestly. `font-family` INHERITS, and this product
 * leans on that everywhere: `.admin-tbl`, `.mcardp-meta`, `.pnl-val`, `.mono` and
 * ~40 other classes in globals.css set `--font-mono` on a CONTAINER, and the
 * amounts inside them carry no family class of their own. Measured: of the 121
 * money-rendering elements a regex can isolate, 49 carry no mono token at the
 * element — and essentially all of them render mono, from an ancestor a regex
 * cannot see. Demanding the token would condemn correct code, which is standards
 * §5b rule 9 ("an unconditional presence check demands a false statement on a
 * correct screen") — and a detector that cries wolf is one people learn to ignore.
 *
 * So §1 asserts the DECIDABLE half of the same invariant: an explicit non-mono
 * family written ON the element (`font-display` / `font-sans`) beats any inherited
 * mono, so it is a violation with no ancestor caveat. It found two, both real:
 * an RG sentence and a promo line, each setting Sora over a live TZS figure.
 * §2 is decidable outright — `tracking-` is never inherited from a container in
 * Tailwind's utility model, it is written where it applies.
 *
 * Likewise §1/§2 judge only elements whose ENTIRE content is text (no nested tag),
 * because that is the only case where "the element containing the call" is
 * unambiguous under a regex. Roughly 121 of the 333 `formatTzs` call sites qualify.
 * A wider match would have to guess at nesting and would report guesses as facts.
 * ⛔ Do not "improve" this by widening the match without a parser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 THE FIVE WAYS A GUARD IN THIS REPO HAS BEEN WRONG (standards §5b) — and what
 * each one costs here:
 *   · #3 "a guard and its own red proof can agree and both be wrong". §0 runs the
 *     real scanners over inline FIXTURES on every run, so a scanner that stops
 *     matching the product's shapes fails here rather than going quietly green.
 *   · #3 again — §0d asserts the money helpers still exist under the names §1/§2
 *     search for. Rename `formatTzs` and this guard would otherwise match nothing
 *     and report ALL PASS over an unguarded product.
 *   · #4 "a check written against an unreachable branch proves nothing". §0's
 *     fixtures prove each rule can produce a failure before it is trusted to.
 *   · #6 "a one-character blind spot hides everything". Class tokens are read from
 *     EVERY quoted string, not from `className="…"` — so `cn()`, arrays and
 *     template literals are all in scope. `test:bridge` was blind to 577 usages
 *     for exactly the opposite reason.
 *   · The corpus floors in §0e fail if the scanner's REACH collapses (a refactor
 *     that hides everything from it), which no per-rule count can detect: zero
 *     findings and zero visibility look identical from the outside.
 *
 * Run: npm run test:type-scale
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
/** Strip JS/TS/JSX comments — a guard that greps for a defect otherwise matches
 *  the comment explaining the fix. (`admin/markets/page.tsx` documents the `h-8`
 *  trap in prose; `ui-consistency` learned this the hard way, twice in a day.) */
import { decomment } from "./lib/decomment.mts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

// ───────────────────────────────────────────────────────────────────────────────
// THE RATCHETS. Every number here is a measurement, not a target. They may only
// SHRINK. If a count drops, the guard prints the new number to paste in — locking
// the win in is a one-line edit, and the ratchet can never quietly slip back up.
// ───────────────────────────────────────────────────────────────────────────────

/** §3 — anything below the 12.5px reading floor that is NOT a blessed UPPERCASE tracked
 *  microlabel, written EITHER as `text-[Npx]` OR as one of the three sub-floor semantic
 *  keys. Measured 2026-08-21 across 175 files.
 *
 *  🔴 RE-BASELINED 768 → 1031 on 2026-08-29 (DG-A-12), and this is the second case the
 *  "may only shrink" rule did not anticipate: the POPULATION grew, not the defect.
 *  §3 had only ever scanned `text-[Npx]`, so 263 sites already rendering at 10, 11 or 12px
 *  through `text-micro` / `text-caption` / `text-label` were invisible to it — 174 of them
 *  unblessed `text-caption`, i.e. reading copy at 11px. Nothing was written today; 263
 *  existing violations became countable.
 *
 *  ⛔ AND THE OLD NUMBER WAS WORSE THAN INCOMPLETE — IT WAS A TRAP. Rewriting a
 *  `text-[11px]` paragraph as `text-caption` renders at exactly the same 11px and dropped
 *  the site from §3 AND §4: two ratchets down, nothing lifted, the site now in a population
 *  the guard could not read. 509 of the old 768 could have been deleted that way. §3's own
 *  advice string recommended it in those words. Both are fixed in this commit. */
const RATCHET_SUBFLOOR = 763;   // 2026-08-29: -268 total, the ADMIN then PLAYER prose sweeps (DG-A-12)

/** §4 — every hand-typed size in the product: `text-[Npx]` plus inline literal
 *  `style={{ fontSize: N }}`. Measured 2026-08-21: 1,839 + 38.
 *
 *  ⚠️ RE-BASELINED 1839 → 1841 on 2026-08-22, and this is the ONE case the "may only
 *  shrink" rule above did not anticipate: TWO LANES MERGING, not a session writing new
 *  arbitrary sizes.
 *
 *  The 2026-08-21 measurement was taken on the design lane's tree, which did not contain
 *  the data lane's six unpushed commits. Merging them added five usages that were authored
 *  BEFORE this guard existed, in files this guard had never seen:
 *    · privacy-request-form.tsx  text-[13px] + text-[12px]  → CONVERTED to text-body-sm /
 *      text-label, because that file is wholly new and had no local convention to break.
 *      That is why this is +2 and not +4.
 *    · profile/account/page.tsx  one more `text-[15px]` h2 and one more `text-[12.5px]` p
 *      — the data lane added a sixth section card following the file's own five-times-
 *      repeated pattern. ⛔ NOT converted: 15px has no scale key (body is 14, body-lg is
 *      16), so converting only the new one leaves one heading a pixel out of line with its
 *      five siblings on the same screen. Converting all six is a real design change on a
 *      surface the design campaign has already declared closed and live-verified, and it is
 *      not this session's call to make sight-unseen.
 *    · dsar-controls.tsx  one more `tracking-[0.10em]` on a `font-mono text-micro uppercase`
 *      microlabel — the exact blessed sub-micro shape §T3 describes, matching four
 *      identical microlabels in its sibling files.
 *
 *  ⛔ THE RATCHET STILL MEANS WHAT IT MEANT. It exists so no session writes NEW arbitrary
 *  sizes; nothing was written today. ▶ FOR THE DESIGN LANE: the three above are the honest
 *  next win — convert `account/page.tsx`'s six section cards as one visual decision and
 *  this drops to 1835. */
/*  ⬇️ 1823 → 1821 on 2026-08-25. ⚠️ ONLY ONE OF THE TWO IS THIS COMMIT'S: the countdown's
 *  timer label moved to `text-micro` when the date was added beside it (Jay item #6), which
 *  is −1. The other −1, and the tracking −1 below, were ALREADY TRUE ON HEAD — an earlier
 *  session shrank them and did not lower the ceiling, so the ratchet had been sitting one
 *  step above the real count and would have accepted a new arbitrary size for free.
 *  ⛔ That is the failure mode §4.2 of `test:red-anchors` names for its own ceiling: a
 *  ratchet above the real number has stopped being a ratchet. Re-measured, then locked. */
const RATCHET_ARBITRARY_SIZE = 1439;   // 2026-08-29: -370 total — the prose sweeps (DG-A-12) then 11 FieldLegend adoptions (DG-A-11)
/*  ⬇️ 38 → 37 on 2026-08-25. The wallet balance pill carried `fontSize: 12.5` inline — an
 *  off-ladder literal AND invisible to every class-based gate. It now reads `text-caption`
 *  below `sm` and `text-label` from there, both ON the closed ladder (§T1), which is also
 *  what let the pill get denser on a phone without inventing a size. */
// 2026-08-29 · 37 → 36 (DG-A-10 part 2): `AdminKpi`'s value dropped its inline
// `{ fontSize: 22, letterSpacing: "-0.02em" }` for `text-title-sm sm:text-title-md` + `.amount`.
// ⭐ The letter-spacing half was the real defect — an INLINE style outranks every stylesheet
// rule, so §2 could never have seen -0.44px/glyph over ~170 money tiles.
const RATCHET_INLINE_FONTSIZE = 36;

/** §6 — arbitrary `tracking-[…]`. Measured 2026-08-21 across 200 files.
 *  ⚠️ RE-BASELINED 639 → 640 on 2026-08-22 — same merge, the `dsar-controls.tsx`
 *  microlabel described above. ⛔ There is no `letterSpacing` key in `tailwind.config.ts`
 *  at all, so EVERY one of these 640 is arbitrary by construction and there is no
 *  non-arbitrary form to move it to; the real fix is a tracking scale, not a call-site edit. */
/*  ⬇️ 636 → 635 on 2026-08-25 — pre-existing slack on HEAD, not this commit's doing; see
 *  the note on RATCHET_ARBITRARY_SIZE above. The countdown's date span takes `text-micro`'s
 *  own 0.4px letter-spacing and adds no `tracking-` utility, so this commit is +0 here. */
const RATCHET_ARBITRARY_TRACKING = 620;   // 2026-08-29: -11, FieldLegend adopted where its recipe was hand-retyped (DG-A-11)

/** §5 — the 29 hand-typed sizes that exist today. A member may LEAVE (the guard
 *  says so and this list gets trimmed); a NEW one is a hard failure. This is the
 *  line that stops a 30th step in a closed scale. */
const KNOWN_SIZES = new Set([
  "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5",
  "13", "13.5", "14", "14.5", "15", "15.5", "16", "17", "18", "19",
  "20", "21", "22", "24", "26", "28", "30", "34", "38",
]);

/** §6 — the 17 hand-typed tracking values that exist today. Same contract. */
const KNOWN_TRACKING = new Set([
  "-0.005em", "-0.01em", "-0.018em", "-0.02em",
  "0.02em", "0.04em", "0.06em", "0.08em", "0.1em", "0.10em", "0.12em",
  "0.14em", "0.16em", "0.18em", "0.2em", "0.20em", "0.3em",
]);

/**
 * §1/§2 — the money elements that violate §T5/§M4 today, per file. HARD rules, so
 * these four are called out by name rather than hidden in a total. All four are
 * real; none is in this session's file ownership, so they are recorded, not fixed:
 *
 *   font-display over a live amount (§T5.5 — "including numbers inside body
 *   sentences when they are data"):
 *     · profile/responsible-gambling — "<pendingIncrease> TZS n" set in Sora
 *     · ui/propose-promo             — the proposal prize, same
 *   tracking over an amount (§M4 — money is "never letter-spaced"):
 *     · admin/finance                — a 0.10em uppercase caption wrapping a fee
 *     · admin/players/[id]/balance-adjust-controls — a 0.14em threshold warning
 *
 * The fix in all four is the same and is small: wrap the amount in its own
 * `<span className="font-mono tabular-nums">` so the sentence keeps its voice and
 * the number keeps the ladder. MAY ONLY SHRINK.
 */
const RATCHET_MONEY: Record<string, number> = {
  "non-mono-family::src/app/profile/responsible-gambling/page.tsx": 1,
  "non-mono-family::src/components/ui/propose-promo.tsx": 1,
  "tracked-money::src/app/admin/finance/page.tsx": 2,
  "tracked-money::src/app/admin/players/[id]/balance-adjust-controls.tsx": 2,
  "tracked-money::src/app/auth/register/page.tsx": 1,
  /* ⚠️ The SAME element as the `non-mono-family` entry above: `propose-promo.tsx` sets
     `font-display` (§T5) AND `text-body-sm` (§M4 tracking) over the prize amount. One site,
     two rules, and both are real — the wrap fixes both at once. */
  "tracked-money::src/components/ui/propose-promo.tsx": 1,
  /* 🔴 THE ONE THE `>=` BLIND SPOT WAS HIDING — `positions/performance/page.tsx`'s **34px
     net-P&L**, the largest money numeral on the player's performance page, carrying
     `tracking-[-0.02em]`. It is a PURE money element, so the fix is one line
     (`font-mono … tabular-nums … tracking-[-0.02em]` → `amount`) and NOT a copy call.
     ⛔ NOT DONE BLIND: un-tightening 0.02em at 34px makes the amount ~7.5px WIDER inside a
     `min-w-[220px]` column, and `/positions/performance` is an AUTHED player route — every
     player QA secret is rejected by production, so it can be seen neither before nor after.
     ⭐ FIRST THING TO FIX when a player credential exists; the guard now holds it. */
  "tracked-money::src/app/positions/performance/page.tsx": 1,
};
/**
 * ⭐ 2026-08-29 — WIDENING §2's POPULATION FOUND 10 SITES IT COULD NEVER HAVE SEEN
 * (DESIGN-GATE-2026-08-28, the money-wall ruling; see `neutralisesTracking` below for why).
 * ⛔ THE POPULATION GREW, NOT THE DEFECT — nothing regressed. Of the 10:
 *
 *   FIXED HERE, by adopting `.amount` (globals.css) — five elements whose whole content is
 *   an amount, so the class is exactly right and it also shortens the call site:
 *     · admin/bonuses/page.tsx              `font-mono text-micro`   → tracked OUT +0.4px/glyph
 *     · admin/resolver-queue/bulk-resolve-bar.tsx ×2                 → +0.2px and −0.05px
 *     · admin/payments/selcom-statement-card.tsx ×2 — the live float balance, −0.16px/glyph
 *
 *   RECORDED ABOVE, NOT FIXED — three are an amount inside a SENTENCE, where the flag lands
 *   on the paragraph because the number is not its own element. The fix is this file's own
 *   standing advice ("wrap the amount in its own <span>"), it is a copy edit per site rather
 *   than a class swap, and it belongs to the prose sweep (DG-A-14), not to the type ruling:
 *     · admin/finance 1→2 · admin/players/[id]/balance-adjust-controls 1→2 · auth/register 0→1
 *   ⚠️ Each raises a REAL question of voice — "Total commission this period: TZS 4,300." reads
 *   as a sentence, and monospacing only the numeral is the correct answer but changes how the
 *   line looks. That is a per-site call with a screenshot, which is why it is not done blind here.
 */

// ───────────────────────────────────────────────────────────────────────────────
// Scanners. Pure functions over (body) so §0 can run them on fixtures.
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Every string literal in the file.
 *
 * ⭐ NOT `className="…"`. Reading the attribute is what let `refresh-button.tsx`
 * and `admin/markets` hide a `btn-sm h-8` from every existing className rule —
 * they build their class list in `cn()` and a template literal. A class token is a
 * class token wherever it is written, so the corpus is every string literal.
 * (Cost: a prose string that happens to read like a utility. In practice the
 * patterns below — `text-[12px]`, `tracking-[0.1em]` — do not occur in prose.)
 *
 * 🔴 THE DELIMITER MUST BE MATCHED TO ITSELF — standards §5b#6, "a one-character
 * blind spot hides everything", found in THIS guard by its own §0a self-test.
 * The first draft used one character class for all three quotes,
 * `/["'`]([^"'`\n]*)["'`]/g`, which pairs an OPENING backtick with the next
 * DOUBLE quote. On the product's commonest dynamic class list —
 * `` className={`base ${on ? "text-[13.5px]" : "md:text-[26px]"}`} `` — that
 * shifts the parity by one and every size inside the interpolation lands in the
 * gap BETWEEN matches: 22 real usages were invisible, and the guard reported a
 * total 22 lower than a plain `grep` while looking entirely healthy. The
 * alternation below closes each literal with its own delimiter, so a template
 * literal is one group and its inner strings are read from inside it.
 */
function classGroups(body: string): string[] {
  const out: string[] = [];
  const re = /"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g;
  for (const m of body.matchAll(re)) {
    const v = m[1] ?? m[2] ?? m[3] ?? "";
    if (v.trim()) out.push(v);
  }
  return out;
}

/** A class list's tokens. JS punctuation (quotes, braces, parens, commas, `$`)
 *  becomes whitespace first, so a class list assembled inside a template literal
 *  or a `cn()` argument yields the SAME clean tokens as a plain string. `:` and
 *  `[]` survive — they are part of a Tailwind class, not JS. */
function tokens(group: string): string[] {
  return group.replace(/[`'"{}()$,]/g, " ").split(/\s+/).filter(Boolean);
}

/** `md:hover:text-[10px]` → `text-[10px]`. Variants change WHEN a utility applies,
 *  never WHAT it sets, so they are stripped before any judgement. */
const bare = (t: string) => t.replace(/^(?:[a-z0-9.-]+:)+/, "");

type Hit = { size: string; group: string };

/** §3/§4/§5 — every hand-typed `text-[Npx]`, with the class list it sits in. */
function scanSizes(body: string): Hit[] {
  const out: Hit[] = [];
  for (const g of classGroups(body)) {
    for (const m of g.matchAll(/text-\[([0-9.]+)px\]/g)) out.push({ size: m[1], group: g });
  }
  return out;
}

/** §3 — a size below the floor is legal ONLY as the blessed sub-micro tier: §T3's
 *  UPPERCASE tracked microlabel. Anything else at that size is reading copy under
 *  the 12.5px floor §T4 sets.
 *
 *  ⚠️ The blessing test is `uppercase` + `tracking-`, NOT `+ font-mono`, for the
 *  same inheritance reason §1 documents above: `.admin-tbl thead`, `.mcardp-cat`
 *  and friends set mono on the container, so the label itself often carries none. */
function isBlessedMicrolabel(group: string): boolean {
  const toks = tokens(group).map(bare);
  return toks.includes("uppercase") && toks.some((t) => /^tracking-/.test(t));
}

/**
 * §3 — THE SEMANTIC CLASSES THAT ARE ALSO BELOW THE FLOOR.
 *
 * 🔴 THE BLIND SPOT THIS CLOSES, and it is this guard's own (2026-08-29, DG-A-12).
 * §3 counted only `text-[Npx]`. But three of `tailwind.config.ts`'s twelve `fontSize`
 * keys render BELOW the 12.5px floor §T4 sets — `micro` 10px, `caption` 11px,
 * `label` 12px — and a site written as `text-caption` was invisible to it.
 *
 * ⛔ THAT MADE THE RATCHET REWARD THE WRONG FIX. Rewriting `text-[11px]` as
 * `text-caption` changes no rendered size, yet it deleted the site from §3 AND from §4 —
 * two counters down, one glyph unchanged, still 1.5px under the floor and now in a
 * population the guard could not read. §3's own advice line pushed exactly that edit:
 * it said *"lift it onto the ladder (text-label/text-caption)"*, naming 12px and 11px
 * against the 12.5px floor the same line enforces. Both halves are fixed together,
 * because fixing the advice without fixing the population just moves the trap.
 *
 * ⚠️ The sizes are asserted against `tailwind.config.ts` in §0f, not trusted from here.
 */
const SUBFLOOR_CLASSES: Record<string, number> = { "text-micro": 10, "text-caption": 11, "text-label": 12 };

function scanSubfloorClasses(body: string): Hit[] {
  const out: Hit[] = [];
  for (const g of classGroups(body)) {
    for (const t of tokens(g).map(bare)) {
      if (t in SUBFLOOR_CLASSES) out.push({ size: String(SUBFLOOR_CLASSES[t]), group: g });
    }
  }
  return out;
}

/** §6 — every hand-typed `tracking-[…]`. */
function scanTracking(body: string): string[] {
  return [...body.matchAll(/tracking-\[([^\]\s]+)\]/g)].map((m) => m[1]);
}

/** §4 — an inline literal size is a hand-typed size wearing a different hat.
 *  Only LITERALS count: `fontSize: size * 0.52` is a parametric glyph, not a
 *  number someone picked off the top of their head. */
function scanInlineFontSize(body: string): string[] {
  return [...body.matchAll(/fontSize:\s*(["']?)([0-9.]+)(?:px)?\1\s*[,}]/g)].map((m) => m[2]);
}

/**
 * Three surfaces genuinely have no stylesheet and MUST inline their type. These
 * are exemptions of mechanism, not of taste:
 *   · `src/app/global-error.tsx` — fires when the root layout never ran, so
 *     globals.css is not loaded; the file says so at the top and inlines OKLCH
 *     token literals for the same reason.
 *   · `src/app/api/og/**` — satori renders the OG images with no CSS engine.
 *   · `src/lib/server/**` — transactional email + PDF; inline style is the only
 *     styling HTML email supports at all.
 */
const INLINE_STYLE_EXEMPT = (f: string) =>
  f === "src/app/global-error.tsx" || f.startsWith("src/app/api/og/") || f.startsWith("src/lib/server/");

/** The money formatters, by name. §0d proves these names are still real. */
const MONEY_CALL = /\bformatTzs(?:Compact|Signed|Abs)?\s*\(/;

/**
 * §1/§2 — money elements.
 *
 * Matches a SINGLE element whose whole content is text (`[^<]*` — no nested tag),
 * so "the element that contains the call" is a fact rather than a guess. The
 * attribute match is `(?:[^>]|=>|>=)*?` and not `[^>]*`: `[^>]*` stops at the first
 * `>`, and every `onClick={() => …}` contains one — that one-character blind spot
 * had `ui-consistency`'s `bare-text-button` under-reporting for its whole life.
 *
 * 🔴 `>=` WAS ADDED 2026-08-29, AND IT WAS HIDING A LIVE §M4 VIOLATION.
 * `=>` was handled; the COMPARISON `>=` was not — and a money className is routinely
 * `` {`… ${pnl >= 0 ? "text-gilt" : "text-no-300"}`} ``. The capture stopped at that `>`,
 * so the template literal it had swallowed was UNTERMINATED; `classGroups` needs a closing
 * backtick, found none, and returned no groups. The element was still counted toward
 * `0e scanner reach` and then judged on an EMPTY token list.
 * ⛔ A VACUOUS PASS IS WORSE THAN A MISS: the element is inside the population, so the reach
 * floor says it is covered, and §1/§2 say it is clean — of an element they never read. It
 * hid `positions/performance/page.tsx`'s **34px net-P&L**, the largest money numeral on the
 * player's performance page, carrying `tracking-[-0.02em]`.
 * ⚠️ AND THE FIRST FIX FOR IT DID NOTHING, which is worth keeping: widening the BODY to
 * `(?:[^>]|=>|>=)*?` changes no behaviour on its own, because the quantifier is LAZY — at
 * the `>` of `>=` it prefers to stop and close the tag, and the rest of the pattern still
 * matches, so the alternation is never tried. **The closing delimiter carries the fix:**
 * `(?<!=)>(?!=)` refuses a `>` that is half of `=>` or `>=` and backtracks into it.
 * `0h` asserts all of this, and fails if either half is reverted.
 */
function scanMoneyElements(body: string): Array<{ tag: string; toks: string[]; snippet: string }> {
  const TAGS = "span|p|div|dd|dt|td|th|li|strong|em|b|h1|h2|h3|h4|h5|h6|label|small";
  const re = new RegExp(`<(${TAGS})\\b((?:[^>]|=>|>=)*?)(?<!=)>(?!=)([^<]*?)</\\1>`, "g");
  const out: Array<{ tag: string; toks: string[]; snippet: string }> = [];
  for (const m of body.matchAll(re)) {
    if (!MONEY_CALL.test(m[3])) continue;
    out.push({
      tag: m[1],
      toks: classAttrTokens(m[2]),
      snippet: m[0].replace(/\s+/g, " ").trim().slice(0, 120),
    });
  }
  return out;
}

/**
 * The class tokens of ONE element — every string literal inside its `className=`
 * expression, brace-balanced so `cn(…)`, `[…].join(" ")` and template literals all
 * yield their tokens. (Element-scoped, unlike `classGroups`, because §1/§2 judge a
 * specific element rather than the file.)
 */
function classAttrTokens(attrs: string): string[] {
  const i = attrs.indexOf("className=");
  if (i < 0) return [];
  const rest = attrs.slice(i + "className=".length);
  let expr = "";
  if (rest[0] === "{") {
    let depth = 0;
    for (let k = 0; k < rest.length; k++) {
      if (rest[k] === "{") depth++;
      else if (rest[k] === "}") { depth--; if (depth === 0) { expr = rest.slice(1, k); break; } }
    }
    if (!expr) expr = rest;
  } else {
    const m = rest.match(/^(["'])([^"']*)\1/);
    expr = m ? m[2] : "";
  }
  // Same delimiter-aware reader as the file-wide corpus, so `cn(…)`, an array
  // `.join(" ")` and a template literal all yield the element's real tokens.
  const groups = /["'`]/.test(expr) ? classGroups(expr) : [expr];
  return groups.flatMap(tokens);
}

const setsNonMonoFamily = (toks: string[]) =>
  toks.map(bare).some((t) => t === "font-display" || t === "font-sans");
/**
 * 🔴 §2's POPULATION WAS A SPELLING, AND IT MISSED THE ONLY CASE THAT MATTERS.
 *
 * This used to be `toks.some(t => /^tracking-/.test(t))` alone. But **every Tailwind
 * `fontSize` key is a tuple `[size, {lineHeight, letterSpacing}]`**, so a money element
 * written `text-micro` IS letter-spaced — by +0.4px per glyph, +6.67% over
 * `TZS 1,234,567`, measured on production by `npm run qa:dg-type` — while an element
 * written `tracking-[0.4px]` renders identically and failed. §2 was finding the *word*
 * `tracking`, not the defect §M4 describes; it printed ALL PASS over **8 real violations**
 * (2026-08-29), two of them tracking an amount OUT.
 *
 * ⛔ It is the same shape as `ui-consistency`'s `hardcoded-pill-active`, which matches the
 * token's literal text and so finds copies but never divergence — and the same shape as
 * §3's own 2026-08-29 repair, where three sub-floor sizes written as CLASSES were invisible
 * to a scanner that only read `text-[Npx]`. Third time for this programme.
 *
 * ⭐ THE EXEMPTION IS EXPLICIT, NOT IMPLIED. `tracking-normal` (and an arbitrary
 * `tracking-[0…]`) neutralises the rung — verified in the browser against the served sheet:
 * all 23 `.tracking-*` rules are emitted at bytes 52,048-52,952, strictly after the last
 * fontSize rung at 51,022, so at equal (0,1,0) the tracking wins on source order. `.amount`
 * (globals.css) does the same and is the ADOPTABLE form, because it also carries the meaning.
 */
const RUNG_TRACKING: Record<string, number> = {
  "text-micro": 0.4, "text-caption": 0.2, "text-label": 0.05, "text-body-sm": -0.05,
  "text-body": -0.08, "text-body-lg": -0.16, "text-title-sm": -0.36, "text-title-md": -0.55,
  "text-title-lg": -0.85, "text-display-3": -1.2, "text-display-2": -1.7, "text-display-1": -2.4,
};
/** Anything that explicitly sets letter-spacing back to zero over the rung. */
const neutralisesTracking = (toks: string[]) =>
  toks.map(bare).some((t) => t === "amount" || t === "tracking-normal" || /^tracking-\[0(?:[a-z%]*)?\]$/.test(t));
const isTracked = (toks: string[]) => {
  const t = toks.map(bare);
  if (neutralisesTracking(t)) return false;
  return t.some((x) => /^tracking-/.test(x)) || t.some((x) => x in RUNG_TRACKING);
};

// ───────────────────────────────────────────────────────────────────────────────
// Harness.
// ───────────────────────────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|mts)$/.test(e) && !e.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? `\n         ${detail}` : ""}`); }
}
const SRCFILE = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/** A ratchet: never above `limit`; a drop is a win to lock in, not a failure. */
function ratchet(label: string, n: number, limit: number, constName: string, fixHint: string) {
  if (n > limit) {
    fail++;
    log(`  FAIL ${label} — ${n}, ratchet is ${limit} (+${n - limit} NEW)`);
    log(`         ${fixHint}`);
  } else if (n < limit) {
    log(`  PASS ${label} — ${n} (ratchet ${limit})`);
    log(`         ✓ ${limit - n} fewer than the ratchet. Lock it in: set ${constName} = ${n} in ${rel(SRCFILE)}.`);
  } else {
    log(`  PASS ${label} — ${n} (at the ratchet)`);
  }
}

log("Type-scale guard (DESIGN_AUTHORITY §T · §M4)\n");

// ═══════════════════════════════════════════════════════════════════════════════
// §0 — PROVE THE SCANNERS BEFORE TRUSTING THEM.
//
// Standards §5b#3: "a guard and its own red proof can agree with each other and
// both be wrong" — two guards located a handoff block with a pattern no handoff
// had used for seven sessions, and the RED harness mutated the same dead block.
// The defence is a live self-test: the REAL scanners, over fixtures written in the
// product's own shapes, on every run. If a scanner stops seeing the product, this
// section goes red instead of the rules going quietly green.
// ═══════════════════════════════════════════════════════════════════════════════
log("§0 — self-test: the scanners can see, and can fail");

// 0a — the size scanner sees all three ways a class list is written.
{
  const fx = [
    `<p className="mt-1 text-[11px] text-text-subtle">x</p>`,
    `<p className={cn("flex", size === "sm" && "text-[9.5px] uppercase tracking-[0.14em]")}>x</p>`,
    `<p className={\`base \${on ? "text-[13.5px]" : "md:text-[26px]"}\`}>x</p>`,
  ].join("\n");
  const sizes = scanSizes(fx).map((h) => h.size).sort();
  check("0a size scanner reads plain, cn() and template-literal class lists",
    sizes.join(",") === "11,13.5,26,9.5", `saw [${sizes.join(",")}]`);
}
// 0b — the floor rule blesses a microlabel and condemns reading copy at the same size.
{
  const label = scanSizes(`"text-[9.5px] uppercase tracking-[0.14em] font-mono"`)[0];
  const prose = scanSizes(`"text-[9.5px] text-text-subtle leading-snug"`)[0];
  check("0b floor rule blesses an UPPERCASE tracked microlabel below 12.5px",
    !!label && isBlessedMicrolabel(label.group));
  check("0b floor rule condemns reading copy at the same size",
    !!prose && !isBlessedMicrolabel(prose.group));
}
// 0c — the money-element scanner isolates the element, reads its tokens through
//      cn(), and can produce BOTH failure modes (standards §5b#4: before asserting
//      a failure mode, prove you can produce it).
{
  const ok = scanMoneyElements(`<span className="font-mono tabular-nums">{formatTzs(n)}</span>`);
  const famBad = scanMoneyElements(`<p className="font-display font-semibold">Now {formatTzs(n)}</p>`);
  const trkBad = scanMoneyElements(`<span className={cn("font-mono", "tracking-[0.14em]")}>{formatTzsCompact(n)}</span>`);
  const nested = scanMoneyElements(`<div className="font-display"><span>{formatTzs(n)}</span></div>`);
  check("0c money scanner matches a text-only money element", ok.length === 1 && !setsNonMonoFamily(ok[0].toks) && !isTracked(ok[0].toks));
  check("0c §1 can produce a failure (font-display over an amount)", famBad.length === 1 && setsNonMonoFamily(famBad[0].toks));
  check("0c §2 can produce a failure (tracking over an amount, via cn())", trkBad.length === 1 && isTracked(trkBad[0].toks));
  // The nested case must resolve to the INNER span — the one that actually holds
  // the text — never the outer div, whose family the inner one may well override.
  check("0c money scanner attributes the call to the INNERMOST element",
    nested.length === 1 && nested[0].tag === "span" && !setsNonMonoFamily(nested[0].toks));
}
// 0d — the names §1/§2 hunt for still exist. Rename `formatTzs` and, without this,
//      the money rules would match nothing and print ALL PASS over an unguarded
//      product — the exact shape of standards §5b#3.
{
  const utils = readFileSync(join(SRC, "lib", "utils.ts"), "utf8");
  const missing = ["formatTzs", "formatTzsCompact", "formatTzsSigned", "formatTzsAbs"]
    .filter((n) => !new RegExp(`export function ${n}\\s*\\(`).test(utils));
  check("0d the money formatters §1/§2 search for still exist by name",
    missing.length === 0,
    missing.length ? `src/lib/utils.ts no longer exports: ${missing.join(", ")} — update MONEY_CALL or this guard is blind` : "");
}

// 0f — the sub-floor CLASS scanner can see, can be blessed, and can fail. Without this,
//      §3's new half is a rule written against a branch nobody proved reachable (§5b#4).
{
  const prose = scanSubfloorClasses(`<p className="text-caption text-text-secondary leading-relaxed">x</p>`);
  const label = scanSubfloorClasses(`<span className="text-micro uppercase tracking-[0.14em]">x</span>`);
  const variant = scanSubfloorClasses(`<p className={cn("md:text-label", on && "text-caption")}>x</p>`);
  const above = scanSubfloorClasses(`<p className="text-body-sm text-text">x</p>`);
  check("0f sub-floor class scanner matches text-caption prose",
    prose.length === 1 && prose[0].size === "11" && !isBlessedMicrolabel(prose[0].group));
  check("0f …and the SAME class is exempt when it is a blessed microlabel",
    label.length === 1 && isBlessedMicrolabel(label[0].group));
  check("0f …and it reads variants and cn() the way scanSizes does",
    variant.length === 2 && variant.map((h) => h.size).sort().join(",") === "11,12");
  // ⛔ THE CONTROL THAT MATTERS: a key ABOVE the floor must NOT be counted, or §3 would
  // condemn the very fix its advice string now recommends.
  check("0f ⛔ CONTROL · text-body-sm (13px) is NOT counted — it is the prescribed fix",
    above.length === 0, `matched ${above.length}`);
}
// 0g — the three sizes this guard hard-codes are still what tailwind.config.ts says.
//      Change `caption` to 13px there and, without this, §3 would keep condemning 174
//      sites that had become legal — a guard confidently wrong about the product.
{
  const cfg = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
  const wrong = Object.entries(SUBFLOOR_CLASSES).filter(([cls, px]) => {
    const key = cls.replace(/^text-/, "");
    const m = cfg.match(new RegExp(`\\b${key}:\\s*\\[\\s*"(\\d+(?:\\.\\d+)?)px"`));
    return !m || Number(m[1]) !== px;
  });
  check("0g the sub-floor keys still measure what §3 assumes (micro 10 · caption 11 · label 12)",
    wrong.length === 0,
    wrong.length ? `tailwind.config.ts disagrees about: ${wrong.map(([c]) => c).join(", ")} — re-read the config and update SUBFLOOR_CLASSES` : "");
  // And the floor itself must still sit between them and the prescribed fix.
  // ⚠️ `"body-sm"` is QUOTED in the config (the hyphen forces it) while `micro`/`caption`/
  // `label` are bare — a `\bbody-sm:` pattern misses it and the control fails on correct code.
  check("0g ⛔ CONTROL · body-sm is above the floor and label is below it, or the advice is wrong",
    /["']?body-sm["']?:\s*\[\s*"13px"/.test(cfg) && SUBFLOOR_CLASSES["text-label"] < 12.5,
    "the advice string names text-body-sm as the smallest key above the 12.5px floor");
}

// 0h — §1/§2's element scanner survives a JSX COMPARISON in the className.
//      🔴 Added 2026-08-29 after a VACUOUS PASS: `{`… ${pnl >= 0 ? "a" : "b"}`}` truncated
//      the attribute capture at that `>`, leaving an unterminated template literal that
//      `classGroups` could not read — so the element was COUNTED toward the reach floor and
//      judged on an EMPTY token list. It hid a real `tracking-` on a 34px net-P&L.
//      ⛔ A vacuous pass is worse than a miss: the population says covered, the rule says clean.
{
  const cmp = `<p className={\`font-mono text-[34px] tabular-nums tracking-[-0.02em] \${pnl >= 0 ? "text-gilt" : "text-no-300"}\`}>{formatTzsSigned(pnl)}</p>`;
  const arrow = `<span className="font-mono tabular-nums" onClick={() => go()}>{formatTzs(x)}</span>`;
  const plain = `<span className="font-mono tabular-nums">{formatTzs(x)}</span>`;
  const [c] = scanMoneyElements(cmp), [a] = scanMoneyElements(arrow), [p0] = scanMoneyElements(plain);
  check("0h a className holding a `>=` comparison still yields its tokens (not a vacuous pass)",
    Boolean(c) && c.toks.length > 0 && c.toks.includes("tracking-[-0.02em]"),
    c ? `isolated but toks=[${c.toks.join(" ")}]` : "the element was not isolated at all");
  check("0h …and §2 therefore FAILS it, which is the whole point",
    Boolean(c) && isTracked(c.toks), c ? `isTracked=${isTracked(c.toks)}` : "not isolated");
  // ⚠️ The `=>` case must keep working — the fix touches the same closing delimiter, and an
  // arrow handler is the blind spot this scanner was originally widened for.
  check("0h ⛔ CONTROL · an `onClick={() => …}` element still yields its tokens",
    Boolean(a) && a.toks.includes("font-mono") && !isTracked(a.toks),
    a ? `toks=[${a.toks.join(" ")}]` : "the arrow element was not isolated");
  check("0h ⛔ CONTROL · a plain element is unaffected and is NOT reported as tracked",
    Boolean(p0) && p0.toks.includes("tabular-nums") && !isTracked(p0.toks),
    p0 ? `toks=[${p0.toks.join(" ")}]` : "the plain element was not isolated");
}

const files = walk(SRC);

// ─── Collect ──────────────────────────────────────────────────────────────────
let arbSize = 0, subfloor = 0, inlineFs = 0, arbTrack = 0, moneyEls = 0, groups = 0;
const seenSizes = new Map<string, number>();
const seenTracking = new Map<string, number>();
const newSizes = new Map<string, string[]>();
const newTracking = new Map<string, string[]>();
const subfloorTop = new Map<string, number>();
const subfloorSamples: string[] = [];
let subfloorClassHits = 0;
const subfloorClassSamples: string[] = [];
const moneyCounts = new Map<string, number>();
const moneyDetail = new Map<string, string[]>();

for (const f of files) {
  const where = rel(f);
  const body = decomment(readFileSync(f, "utf8"));
  groups += classGroups(body).length;

  for (const hit of scanSizes(body)) {
    arbSize++;
    seenSizes.set(hit.size, (seenSizes.get(hit.size) ?? 0) + 1);
    if (!KNOWN_SIZES.has(hit.size)) {
      if (!newSizes.has(hit.size)) newSizes.set(hit.size, []);
      newSizes.get(hit.size)!.push(where);
    }
    if (parseFloat(hit.size) < 12.5 && !isBlessedMicrolabel(hit.group)) {
      subfloor++;
      subfloorTop.set(where, (subfloorTop.get(where) ?? 0) + 1);
      if (subfloorSamples.length < 6) subfloorSamples.push(`${where}  "${hit.group.slice(0, 84)}"`);
    }
  }
  // The SAME floor rule over the semantic half of the population — see scanSubfloorClasses.
  // ⛔ Counted into the same `subfloor` total on purpose: two counters would let a session
  // trade one for the other and call it progress, which is the very edit this closes.
  for (const hit of scanSubfloorClasses(body)) {
    if (isBlessedMicrolabel(hit.group)) continue;
    subfloor++;
    subfloorClassHits++;
    subfloorTop.set(where, (subfloorTop.get(where) ?? 0) + 1);
    if (subfloorClassSamples.length < 3) subfloorClassSamples.push(`${where}  "${hit.group.slice(0, 84)}"`);
  }
  for (const t of scanTracking(body)) {
    arbTrack++;
    seenTracking.set(t, (seenTracking.get(t) ?? 0) + 1);
    if (!KNOWN_TRACKING.has(t)) {
      if (!newTracking.has(t)) newTracking.set(t, []);
      newTracking.get(t)!.push(where);
    }
  }
  if (!INLINE_STYLE_EXEMPT(where)) inlineFs += scanInlineFontSize(body).length;

  for (const el of scanMoneyElements(body)) {
    moneyEls++;
    for (const [rule, bad] of [["non-mono-family", setsNonMonoFamily(el.toks)], ["tracked-money", isTracked(el.toks)]] as const) {
      if (!bad) continue;
      const key = `${rule}::${where}`;
      moneyCounts.set(key, (moneyCounts.get(key) ?? 0) + 1);
      if (!moneyDetail.has(key)) moneyDetail.set(key, []);
      moneyDetail.get(key)!.push(el.snippet);
    }
  }
}

// 0e — the scanner's REACH. A rule that finds nothing and a rule that SEES nothing
//      are indistinguishable from the outside; these floors tell them apart. They
//      are structural (how much of the product the scanner can read), NOT counts of
//      violations, so they stay valid after the campaign drives the ratchets to 0.
check(`0e scanner reach: ${files.length} source files (floor 700)`, files.length >= 700,
  `${files.length} files — expected ≥700; the walk is not seeing src/`);
check(`0e scanner reach: ${groups} class-list groups (floor 20000)`, groups >= 20000,
  `${groups} groups — expected ≥20000; the string-literal reader has lost its parity again`);
check(`0e scanner reach: ${moneyEls} isolable money elements (floor 60)`, moneyEls >= 60,
  `${moneyEls} — expected ≥60; §1/§2 may have gone blind`);

// ═══════════════════════════════════════════════════════════════════════════════
// §1 · §2 — MONEY IS MONO, TABULAR, AND NEVER LETTER-SPACED (§T5 · §M4)
// ═══════════════════════════════════════════════════════════════════════════════
log("\n§1/§2 — money type (§T5 · §M4)");
{
  const over: string[] = [];
  for (const [key, n] of moneyCounts) {
    const limit = RATCHET_MONEY[key] ?? 0;
    if (n > limit) over.push(`${key}: ${limit} → ${n}\n           ${(moneyDetail.get(key) ?? []).slice(0, 2).join("\n           ")}`);
  }
  check("§1/§2 no money element sets a non-mono family or letter-spacing on itself",
    over.length === 0,
    over.length
      ? `${over.length} NEW:\n         ${over.join("\n         ")}\n         Fix: wrap the amount in its own <span className="font-mono tabular-nums"> — the sentence keeps its voice, the number keeps the ladder.`
      : "");
  const fixedMoney = Object.entries(RATCHET_MONEY).filter(([k, v]) => (moneyCounts.get(k) ?? 0) < v);
  if (fixedMoney.length) {
    log(`         ✓ ${fixedMoney.length} recorded money violation(s) fixed — delete from RATCHET_MONEY:`);
    for (const [k] of fixedMoney) log(`             ${k}`);
  }
  log(`         (${moneyEls} isolable money elements scanned, ${Object.keys(RATCHET_MONEY).length} recorded violations)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3 — THE 12.5px READING FLOOR (§T4), with §T3's blessed exception
// ═══════════════════════════════════════════════════════════════════════════════
log("\n§3 — the 12.5px reading floor (§T4 · §T3)");
ratchet("§3 reading copy below the 12.5px floor", subfloor, RATCHET_SUBFLOOR, "RATCHET_SUBFLOOR",
  // 🔴 THIS STRING USED TO READ "lift it onto the ladder (text-label/text-caption)" — 12px
  // and 11px, BOTH BELOW the 12.5px floor this very line enforces. Following it satisfied the
  // instrument and left the law broken, and it was the guard telling you to do that.
  // `text-body-sm` (13px) is the smallest key that clears the floor, so it is the one named.
  "Below 12.5px is a LABEL, not prose (§T4). Either lift it to text-body-sm (13px — the " +
  "SMALLEST key above the floor; text-label 12 and text-caption 11 are BELOW it and do not " +
  "count as a fix), or make it a real microlabel: UPPERCASE + a tracking utility (§T3's " +
  "blessed sub-micro tier).");
if (subfloor > 0) {
  const worst = [...subfloorTop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  log(`         ${subfloor - subfloorClassHits} written as text-[Npx], ${subfloorClassHits} as text-micro/caption/label`);
  log(`         heaviest files: ${worst.map(([f, n]) => `${f} (${n})`).join(", ")}`);
  for (const s of subfloorSamples.slice(0, 2)) log(`           e.g. ${s}`);
  for (const s of subfloorClassSamples.slice(0, 2)) log(`           e.g. ${s}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4 — THE SCALE IS CLOSED (§T1): totals may only shrink
// ═══════════════════════════════════════════════════════════════════════════════
log("\n§4 — hand-typed sizes (§T1)");
ratchet("§4 arbitrary text-[Npx]", arbSize, RATCHET_ARBITRARY_SIZE, "RATCHET_ARBITRARY_SIZE",
  "The scale is closed (§T1). Use a fontSize key from tailwind.config.ts (text-micro … text-display-1) " +
  "or a --type-* token in globals.css.");
ratchet("§4 inline literal style={{ fontSize: N }}", inlineFs, RATCHET_INLINE_FONTSIZE, "RATCHET_INLINE_FONTSIZE",
  "An inline literal size is a hand-typed size wearing a different hat. Use a class. " +
  "(global-error.tsx, api/og/** and lib/server/** are exempt — they render with no stylesheet at all.)");

// ═══════════════════════════════════════════════════════════════════════════════
// §5 · §6 — THE CLOSED SETS. Hard. A new step in a closed scale fails today.
// ═══════════════════════════════════════════════════════════════════════════════
log("\n§5/§6 — the closed sets (§T1)");
check("§5 no NEW hand-typed size joins the 29 that exist",
  newSizes.size === 0,
  newSizes.size
    ? [...newSizes.entries()].map(([s, fs]) => `text-[${s}px] — new, in ${[...new Set(fs)].slice(0, 3).join(", ")}`).join("\n         ") +
      "\n         §T1: the scale is CLOSED. Pick a ladder step. If the ladder is genuinely missing a step, that is a " +
      "DESIGN_AUTHORITY §T change plus a globals.css token — not a call-site number."
    : "");
check("§6 no NEW hand-typed tracking value joins the 17 that exist",
  newTracking.size === 0,
  newTracking.size
    ? [...newTracking.entries()].map(([s, fs]) => `tracking-[${s}] — new, in ${[...new Set(fs)].slice(0, 3).join(", ")}`).join("\n         ")
    : "");
ratchet("§6 arbitrary tracking-[…]", arbTrack, RATCHET_ARBITRARY_TRACKING, "RATCHET_ARBITRARY_TRACKING",
  "Letter-spacing belongs to the type step, not the call site.");

// A member leaving the set is a win — say so, so the lists get trimmed and a
// retired value cannot silently return later as if it had always been legal.
{
  const goneS = [...KNOWN_SIZES].filter((s) => !seenSizes.has(s));
  const goneT = [...KNOWN_TRACKING].filter((t) => !seenTracking.has(t));
  if (goneS.length) log(`         ✓ retired sizes (delete from KNOWN_SIZES): ${goneS.map((s) => `${s}px`).join(", ")}`);
  if (goneT.length) log(`         ✓ retired tracking (delete from KNOWN_TRACKING): ${goneT.join(", ")}`);
}

// ───────────────────────────────────────────────────────────────────────────────
// §7 — TWO LADDERS, AND A NAME MAY NOT COME TO MEAN A THIRD SIZE   (DESIGN_AUTHORITY §T7)
//
// `globals.css` defines twelve `--type-*` rungs; `tailwind.config.ts` defines twelve
// `fontSize` keys. Five names appear in BOTH and agree on NONE of their values — which is
// how a session reads `--type-micro` (11px), types `text-micro`, and ships 10px.
//
// ⛔ §T7 FREEZES these five rather than fixing them, and the reasoning is in the authority.
// What this gate exists to stop is GROWTH: a sixth collision, or one of these five drifting
// to a new pair of values, is a build failure. It is deliberately not a ratchet — a
// collision is not a debt to pay down, it is a state to hold still.
//
// ⚠️ CONTROL. The pair values are asserted, not just the names. Re-tuning `--type-micro` to
// 10px to "resolve" the collision would silently satisfy a names-only check while changing
// every one of that token's consumers, so the check must fail on that too.
// ───────────────────────────────────────────────────────────────────────────────
{
  const css = readFileSync(join(SRC, "app", "globals.css"), "utf8");
  const cfg = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
  const cssLadder = new Map<string, string>();
  for (const m of css.matchAll(/--type-([\w-]+):\s*([\d.]+)px/g)) cssLadder.set(m[1], m[2]);
  const twLadder = new Map<string, string>();
  for (const m of cfg.matchAll(/^\s*"?([\w-]+)"?:\s*\["([\d.]+)px"/gm)) twLadder.set(m[1], m[2]);

  check(`§7 both ladders still parse (${cssLadder.size} --type-* · ${twLadder.size} fontSize)`,
    cssLadder.size >= 10 && twLadder.size >= 10,
    `--type-* ${cssLadder.size}, fontSize ${twLadder.size} — if either is 0 this whole section is blind`);

  /** The five frozen collisions, name → [--type-* px, Tailwind px]. §T7. */
  const FROZEN: Record<string, [string, string]> = {
    micro: ["11", "10"], label: ["9.5", "12"], body: ["15", "14"],
    "display-1": ["60", "64"], "display-2": ["44", "48"],
  };
  const live = [...cssLadder.keys()].filter((n) => twLadder.has(n)).sort();
  const expected = Object.keys(FROZEN).sort();
  check("§7 the colliding-name set is exactly the five §T7 freezes — a SIXTH is a failure",
    live.join(",") === expected.join(","),
    live.join(",") === expected.join(",") ? "" :
      `now [${live.join(", ")}] — expected [${expected.join(", ")}]. ` +
      `NEW: ${live.filter((n) => !expected.includes(n)).join(", ") || "none"} · ` +
      `GONE: ${expected.filter((n) => !live.includes(n)).join(", ") || "none"}. ` +
      `A new name meaning two sizes is how "fonts everywhere" comes back — see DESIGN_AUTHORITY §T7.`);

  const drifted = live.filter((n) => FROZEN[n] && (cssLadder.get(n) !== FROZEN[n][0] || twLadder.get(n) !== FROZEN[n][1]));
  check("§7 no frozen collision has DRIFTED to a new pair of values",
    drifted.length === 0,
    drifted.map((n) => `${n}: --type-${n}=${cssLadder.get(n)} / text-${n}=${twLadder.get(n)}, frozen at ${FROZEN[n].join(" / ")}`).join(" · "));

  /* ⭐ The eyebrow rung §T7 rules on. If `text-micro` ever stops being 10px, the ruling
     "the eyebrow takes text-micro, nothing moves" silently starts moving 341 sites. */
  check("§7 CONTROL · `text-micro` is still 10px — the rung §T7 puts the 10px eyebrow on",
    twLadder.get("micro") === "10", `text-micro = ${twLadder.get("micro")}px`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const semantic = (() => {
  let n = 0;
  const KEYS = "micro|caption|label|body-sm|body|body-lg|title-sm|title-md|title-lg|display-3|display-2|display-1";
  const re = new RegExp(`(?<![\\w-])text-(?:${KEYS})(?![\\w-])`, "g");
  for (const f of files) n += [...decomment(readFileSync(f, "utf8")).matchAll(re)].length;
  return n;
})();
log(`\n  Ladder adoption: ${semantic} semantic vs ${arbSize} arbitrary ` +
    `(${((semantic / (semantic + arbSize)) * 100).toFixed(1)}% on the scale). DONE = every ratchet at 0.`);
log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${files.length} source files, ${moneyEls} money elements.`);
process.exit(fail ? 1 : 0);
