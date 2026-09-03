# SESSION PROMPT — PLAYER VISUAL 10

> **The implementation programme that closes the player-surface findings of
> [`PLAYER-VISUAL-2026-09.md`](PLAYER-VISUAL-2026-09.md).** This file is the DOOR and the
> PLANNER. It spans multiple sessions on possibly different machines; write for a reader who
> has none of your context. ⛔ It mints no design law — a new *rule* goes in
> [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md), never here.

---

## a · Canon — read before touching anything

- **The filing law:** `DESIGN_AUTHORITY.md` §0 — one fact, one home; a value lives in
  `globals.css`/`motion.css`, a rule in the Authority, a recipe in the kit. If you find a value
  in two places, DELETE one (§0a).
- **The kit + Definition of Done** (§K): extend the kit, never fork it (§K5); new design merges
  in, never sits beside (§B9); ⛔ never hard-code a control height (§K1); one filter control
  `FilterPill` (§K6/K6b); a tab is not a filter (§K7). **DoD failure test: a grep for the thing
  you added finds it in exactly ONE definition site.**
- **The guards** (`DESIGN-BASELINE.md` §3): every one runs in `npm run test:all`; a guard with a
  `red:*` twin plants the defect on a COPY of the tree and proves it fails on its own assertion.
  ⛔ A new guard states its re-derived **population**, its **HEAD count outside any allowlist**
  (must be **zero**), and the **CONTROL** that makes it RED — or it is refused with arithmetic
  (§3 "If you add a guard").
- **DG-P §1's canon table** (the recipes to converge on, unchanged):

  | Family | Canonical recipe | Source |
  |---|---|---|
  | Page title | `PageHeader` — eyebrow 11px mono 0.16em + 28px Sora 700 + 13px italic subtitle | `page-header.tsx` |
  | Card | `.mcardp` (fixed width; `market-grid` auto-fill) — 40px CTA literal is LAW | `globals.css:3503`, `market-card.tsx` |
  | Filter | `FilterPill` / `kp-fchip`, selected-only outline, in-sheet at phone widths | §K6/§K6b |
  | Section rhythm | `--rh-*` = pairs of padding, never margins | `globals.css` |
  | Bottom nav | `.kp-rail__item` 44px pip + `data-on` | `globals.css` |
  | Status words → tone | `status-tone.ts` (§B11) | `src/lib/status-tone.ts` |
  | Side words | `sideWord(t, side, productLine)` — never a raw enum | `src/lib/side-label.ts` |

- ⛔ **Every push to `main` is a LIVE money deploy.** Push a **branch**; merging is Ali's call.
  ⛔ One login per account at a time (a second login revokes the first — product feature).
  ⛔ Never `git add -A` — a parallel session may be mid-edit; `git commit --only <paths>`.

## b · The theme-kit law — binding constraint, quoted verbatim

1. ⛔ **Do not change the identity.** Royal 268, YES=green / NO=rose untouchable, single dark
   theme, gold = money only, mono eyebrows, the display headline, the tipping bar.
2. ⭐ **New things are allowed — but only at the SYSTEM level.** A new token, a new kit
   primitive, a new layout template, so every similar component inherits it at once. ⛔ No
   one-off screen patches. §K5 extend the kit, never fork it. §B9 new design merges in, it never
   sits beside. **DoD failure test: a grep for the thing you added finds it in exactly ONE
   definition site.**
3. ⛔ **Visual and product only.** Do **not** file regulatory, licensing, AML or compliance
   findings — explicitly ruled out of scope.

## b2 · THE ONE-HOME LAW, AND HOW TO WORK IN THIS REPOSITORY

> ⭐ **Ali's standing instruction, 2026-09-03, made operational here:** *"any new design is
> placed in a place where it is the final rule — because we don't want future components being
> added in another way if we have a new place already."* Read this before you create anything.

### The one-home law — what to do when you make something NEW

When this programme tells you to create a new token, primitive, template, helper or guard, you
are not adding *an* option — you are minting **THE** home for that kind of thing, forever. The
law has three clauses and they are not negotiable:

1. **The new place is the FINAL place.** Once `<DetailLayout>` exists, it is *the* way a narrow
   detail page is laid out — every future one adopts it. Once `<DecorMark>` exists, it is *the*
   way a decorative mark is placed. Once `test:motion-timing` exists, it is *the* timing gate. A
   later session that meets the same need and writes a *second* solution has broken this law, no
   matter how reasonable its version looks in isolation. §B9: new design **merges in, it never
   sits beside**. §K5: **extend the kit, never fork it.**
2. **If a home already exists, USE IT — never invent a parallel one.** Before you write a new
   primitive, `grep` for one that already does the job (`rg` the kit, the tokens, the templates).
   The defect this repo has been burned by three times (the dead `micro-patterns.css`, the
   superseded teal kit, 1,325 dead utility classes) is always *a second place a truth could
   live*. If you find yourself about to type a value or a component that resembles one already in
   the tree, **stop and adopt the existing one.**
3. **The proof is a grep that finds ONE site.** The Definition of Done's failure test:
   `rg '<the-thing-you-added>' src` returns **exactly one definition**, plus its consumers. Two
   definitions is a bug — fix it by **deleting one** (§0a: one fact, one home), never by keeping
   them in sync. Two copies do not stay equal; the stale one is always the one somebody reads.

⛔ **"It was easier to add it here" is the exact sentence that ends a design system** — "not in
one decision, but in fifteen reasonable-looking ones" (§K5). When the correct home is
inconvenient, the fix is to reach the correct home, not to open a new one.

### Where everything lives — store what, WHERE (and NEVER where)

| I have a … | Its ONE home | ⛔ Never |
|---|---|---|
| **paint value** (colour, shadow, radius, size, spacing) | `src/app/globals.css` `:root`, with the rule as a comment beside it | any `.md` doc; a `.tsx` `text-[13.7px]`/`h-[42px]` literal; a new `.css` file |
| **motion value** (duration, easing) | `src/app/motion.css` (`--t-*` durations, `--m-*` curves) | a bare `ms` or bare `cubic-bezier()` at a call site (§B5) |
| **a rule / floor / ratio / threshold** | `DESIGN_AUTHORITY.md`, in its lettered section (§B colour, §T type, §S space, §A floors, §E motion, §K kit, §M material) | a new top-level `docs/*.md`; this prompt (this file mints no law) |
| **a component recipe / a new state** | the kit under `src/components/ui/*` — as a **prop on the existing component** | a clone of the component; a per-screen one-off |
| **a layout template / a shell** | `src/components/layout/*` (this programme adds `detail-layout.tsx`) | a hand-typed width/grid repeated per page |
| **a status word's colour** | `src/lib/status-tone.ts` (§B11) | a `chip-*` class hand-typed beside a status label |
| **a side/enum word for a human** | `src/lib/side-label.ts` `sideWord()` (§L2) | interpolating a raw `"YES"`/`"UP"` enum into copy (this is PV-04) |
| **money arithmetic** | `src/lib/payout.ts` (isomorphic) | re-deriving a fee/payout anywhere else |
| **a Tailwind bridge** (name → var) | `tailwind.config.ts` — a bridge only, it originates no value | a value invented in the config |
| **a guard** (offline, runs in `test:all`) | a `scripts/<name>.test.mts` whose key `test:<name>` is in `package.json` (declaring the key registers it) — with a `red:<name>` twin | a check that cannot land at zero; a guard not in `test:all` |
| **a rule that ALREADY has a guard** | a new **section** inside that guard (PV-04 → `test:labels` §3b/§3c) | a new `scripts/*.test.mts` beside it — two guards owning one rule is how they drift apart (§0a) |
| **a scanner two guards share** | **module scope** in the guard that owns the rule, with the token set / population passed as an **argument** (`literalArmHits(src, arm)`) | a second copy of the patterns with one word changed |
| **a LIVE production drive** | `scripts/live/<name>.mjs` + a **`qa:<name>`** key in `package.json`; signs in ONCE via `loginOnce` (⛔ one session per account), reads `BASE` from the harness | ⛔ a `test:<name>` key — it needs the network and a login, so it can never be in `test:all`, and a red `test:all` teaches sessions to ignore it |
| **evidence** (screenshots, sweeps) | gitignored — `.qa-shots/`, `.qa-design*/` (unless a doc cites one as a finding's proof → `shots/<PV-NN>/`) | a committed regenerable PNG |
| **a link from a doc to code** | square-brackets label, then round-brackets `../src/components/x/file.tsx` + `#L145` — **relative to `docs/`**, GitHub anchor form (`#L145` / `#L169-L188`) | ⛔ a target of the shape `src/file.tsx:145`. `docs-links.mjs` resolves it under `docs/` and the `:145` is part of the path, so EVERY link of that shape is dead. Nine of them made `test:docs` red on 2026-09-03. ⚠️ And do not write a live example link in this table — `test:docs` follows it too, which is how this row itself went red once |
| **a session handoff / where you got to** | this file's §j `RESUME AT` block, at the TOP | a new handoff file |

The full filing law is `DESIGN_AUTHORITY.md` §0; the guard-and-blind-spot map is
`DESIGN-BASELINE.md` §3/§5. When those two and this table ever disagree, **the Authority wins**
and this table is corrected — it is a pointer, never a second source.

### The loop — what to actually do, in order

1. **Understand before touching.** Read the authoritative section (Authority §-letter) AND the
   real code path. Asserting a thing's absence is a positive claim — prove it with a grep, don't
   assume it from a convention you expect.
2. **Search before you add.** `rg` for an existing home. If one exists → **extend it** (a prop, a
   token, a consumer). If none exists → **create THE home** and write its rule beside the value.
3. **Land it in one place.** Value → `globals.css`/`motion.css`; rule → the Authority; recipe →
   the kit; template → `layout/`. Bridge in `tailwind.config.ts` only if a class must resolve.
4. **Update the spec + provenance + guard in the SAME commit** — the component's `spec.md`, the
   `CHANGELOG.md`, and the `test:*` that holds the new fact. A rule with no guard rots.
5. **Prove the one-home test:** `rg '<the-thing>' src` → one definition. If two, delete one.
6. **Leave every file better than you found it** — a stale comment, a divergent copy, a dead
   class you pass is yours to fix or log, per §K5.

### For THIS programme, concretely

The three new homes this programme mints — and each is final:

- ~~**`src/components/layout/detail-layout.tsx`** (PV-03) — *the* narrow-detail-page template.~~
  ⛔ **NEVER BUILT, AND DELIBERATELY SO — row 8, 2026-09-03. Do not create this file.** The home
  already existed and the plan had not looked: Authority **§B7 rule 2** — *"a page states its
  width through `<PageContainer tier>` and nothing else"* — with **six** tiers already in
  `globals.css` (`--w-console` 1600 · `--w-board` 1280 · `--w-reading` 1080 · `--w-form` 640 ·
  `--w-receipt` 560 · `--w-auth` 1152), a TS union so an invented width is a **compile error**,
  and a `data-measure` stamp so the width can be measured at runtime rather than trusted. A
  second narrow-page template would be exactly the §K5 fork clause 2 above forbids.
  ⭐ **And the re-derivation dissolved the finding it was meant to serve:** `/wallet/deposit`
  already declares `tier="form"` and is **correct** (a deposit page is a form; its "wasted" width
  is what §B7 exists to produce), while `/positions`' real defect is an **alignment** mismatch
  inside a correctly-measured container — a prop on `EmptyState`, not a layout template. ▶ If a
  page is narrow, the question is *which `tier` does it declare*, never *does it need a template*.
- **`src/components/brand/decor-mark.tsx`** (PV-01, *if* Ali rules to contain the mark) — *the*
  decorative-mark primitive, carrying the §M8 clear-space rule once. Every hero backdrop uses it.
- ~~**`test:motion-timing`** (PV-14) — *the* timing-correctness gate.~~ ⛔ **NEVER BUILT, AND
  DELIBERATELY SO — row 7, 2026-09-03. Do not create this file.** The plan named a new guard
  before anyone had re-derived the finding. When row 7 did, the rule PV-14 needed (*"only
  `motion.css` may declare a curve or a duration"*) turned out to belong to a guard that already
  existed — `test:motion-ladder`, whose whole job is the ladder — and this table's own row for
  *"a rule that ALREADY has a guard"* says the answer is **a new SECTION inside that guard**,
  because two guards owning one rule is how they drift apart (§0a). So PV-14 landed as
  `test:motion-ladder` **§2** (the corpus) + **§3** (the declaration rule), plus the first
  `red:motion-ladder` that guard has ever had. ⭐ **This is the one-home law overruling the
  programme's own plan, which is the law working — a planned home is still a home you must
  search for before you open.** ▶ A future timing rule extends §2/§3; it does not get a file.

Everything else in §c is an EXISTING home being extended (`sideWord`, the cold-start rule,
`--h-control-*`, the chip family, `status-tone.ts`) — which is the law working as intended: the
home already exists, so you reach for it rather than open a new one.

### Homes minted so far — the running ruling (append as rows close)

| minted | its ONE home | by | the law it now carries |
|---|---|---|---|
| **`qa:side-words`** — *the* live side-word drive | `scripts/live/pv04-side-words-drive.mjs` | row 1 | Any future "does the right WORD reach the screen" question is answered by extending this drive's locale loop, never by a second live script. It is also the template for every `qa:*` drive this programme adds: sign in once, refuse on a missing premise, and pair every absence check with a positive control. |
| **`test:labels` §3b** — *the* check for an enum TYPED where a player reads it | `scripts/label-lexicon.test.mts` §3b | row 1 | Judges a POSITION, not an identifier's name. Shares `literalArmHits` with §11b — one scanner, two token sets. ⛔ A future "raw enum on a player surface" rule extends §3b; it does not get its own file. |
| **`test:labels` §3c** — *the* check that a `{side}`/`{outcome}`/`{status}` placeholder is lexicon-filled | `scripts/label-lexicon.test.mts` §3c | row 1 | Keys on the **dictionary's own placeholder**, which is the only signal that survives a variable being renamed. |
| **the programme's working rule** — validate technically AND visually, as you go | `.claude/skills/pv10-validate-as-you-go/SKILL.md` | Ali, row 2 | ⛔ **TEMPORARY — deleted by this planner's closing ceremony.** The four-gate bar (technical · visual · consistency · responsiveness), the ALL-PASS trap, and how the visual gate is met while the fix is on a branch. Its evergreen half stays in `50pick-standards`; ⛔ never copy rules between the two. |
| **the UP share of an Up & Down pool** | `pricedYesPct(yesPool, noPool)` in `src/lib/markets/discovery.ts` | row 2 | ⛔ **Never `impliedYesPct`** on a player surface — it returns a hardcoded **50** on an empty pool (`market-service.ts:315`) and that is PV-06. The honest rule returns `null`; the surface renders an empty state. |
| **a pool-split bar** | `<TippingBar empty={…}>` in `src/components/brand.tsx` | row 2 | ⛔ Never a hand-rolled two-span split. Its own doc says it: *"A STATE OF THIS BAR, not a second component — DESIGN_AUTHORITY B9."* Three files drew this bar; two have been deleted into the primitive. **Enforced by `test:ui-consistency` → `hand-rolled-split-bar` (`red:split-bar`).** |
| **`qa:cold-start`** — *the* live cold-start invariant drive | `scripts/live/pv06-cold-start-drive.mjs` | row 2 | Asserts **`a split with percentages ⟺ volumeTzs > 0`** per card, against the card's own printed volume, and refuses to claim green unless it saw BOTH an empty and a funded round. ⛔ Any future "does this surface fabricate a price on an empty pool" question extends this drive's card loop — never a second script. |
| **a LOCAL server to look at a change on** | `npx next dev -p 3100` + `POST /api/dev-test/updown-seed` → `/updown-advance` → `/stress-bulk-bet` | row 2 | ⛔ `next start` REFUSES to boot without `DATABASE_URL` (a deliberate production guard in `store.ts` — do not defeat it); `next dev` uses the in-memory store. This is how the visual gate is met while the fix is on a branch. `BASE=http://localhost:3100` also runs `test:responsive` and `test:motion`, which otherwise fail locally for want of a server. ⭐ A market needs `/api/dev-test/seed-real-markets` + `/api/dev-test/stress-bulk-bet {marketId,n,yesRatio,stake}` to carry a real price at all — `seed-real-markets` alone makes 0-volume markets, which correctly show NO `@pct%` (PV-06's cold-start gate), so a contrast check on the suffix needs a FUNDED market. Sign in locally with `GET /auth/demo` (404s in production; a fixed "Demo Player" with a TZS 100,000 wallet) rather than the live-drive `loginOnce` fleet personas, which need production. |
| **`test:tap-target` §6** — *the* rung-membership check for a control whose height is set OUTSIDE the interactive tag's own JSX attributes | `scripts/tap-target.test.mts` §6 | row 3/4 | §3's tag scan reads a height declared ON the open tag it is looking at; it is blind to a kit-component wrapper (`<CashEye className="h-[42px]">`) and to a value declared in a CSS rule (`.mcardp-info`). §6 is a NAMED, small population (found by grep, stated in the guard's own header) — not a blanket sweep of the 377 hand-typed `h-[Npx]` literals in `src/`, which cannot land at zero (most are decorative). ⛔ A future "a control's height lives somewhere §3 cannot see" finding extends §6's `NAMED_CONTROLS` array; it does not get a new file. RED-proven by `red:tap-rung` (`anchors/tap-rung.anchors.mjs`, 2/2). |
| **`test:contrast` §P-u2** — *the* check for a call-site `opacity-NN` dimming a label inside a SOLID money button (`btn-yes`/`btn-no`/`btn-danger`/`btn-gold`) | `scripts/contrast-audit.mts` §P-u2 | row 6 | §P-u only ever matched the Tailwind slash-alpha idiom (`text-text-subtle/NN`) on ink classes; nothing looked INSIDE a `<button>`'s own children for an `opacity-NN` utility composited against the button's own known (ink, fill) pair. ⛔ Scoped to the four SOLID families this file already resolves to one literal pair — `btn-primary`/`btn-claret` are gradients and are out of scope until a genuinely unconditional (non-`disabled:`) opacity appears inside one. Needed its own small JSX-tag lexer (`endOfButtonOpenTag`, cited from `tap-target.test.mts` §0 — the same `=>`-inside-a-handler trap) plus a `decomment` pass. RED-proven by `red:contrast-callsite` (`anchors/contrast-callsite.anchors.mjs`, 5/5). |

| **`test:motion-ladder` §2** — *the* pin on **what corpus a motion guard reads** | `scripts/motion-ladder.test.mts` §2 | row 7 | Pins the walk by **EXTENSION** (`.tsx`/`.ts`/`.css`) and by `src/styles/`. ⛔ It exists because §1.3 — the pin added for exactly this failure — pins by **DIRECTORY**, and all three of its directories hold `.tsx`, so it passed green for the guard's whole life while every stylesheet under `src/` was invisible. **A pin on one axis certifies nothing about another.** §2.1 asserts a **count** (≥6), not presence: "at least one `.css`" would pass while a directory of them was skipped. ▶ Any future "is this guard reading the right corpus" question extends §2. |
| **`test:motion-ladder` §3** — *the* check that **only `motion.css` DECLARES a curve or a duration** | `scripts/motion-ladder.test.mts` §3 | row 7 | Judges a **custom-property declaration**, which is a shape no `transition:`/`animation:` line filter can see in **any** file type — `--cm-ease-arrive: cubic-bezier(…)` carries neither keyword. That is why it is a section, not a widened regex. A namespace over the ladder is legitimate (`--cm-*` exists for a real name collision); a namespace with its own **values** is a second ladder. Exemptions are **named**, never pattern-excluded: `motion.css` (the definition site, printed every run) and `--dur-stage` (frozen by a prior ruling at `motion.css:138`). Rule: Authority **§E9**. |
| **the ambient-loop carve-out** — *the* statement of what a loop keeps | `isAmbientLoop()` in `scripts/motion-ladder.test.mts`, rule in Authority **§E10** | row 7 | A loop keeps its raw **period** (the ladder stops at `--t-max` 620ms and has no rung for `2.4s`) and ⛔ **never** its curve. ⭐ Written down, it **retired** a per-file exemption instead of adding one — `ui/spinner.tsx` had been allowlisted since 2026-08-21 with a note saying it stayed *"until the ladder gains a period rung"*, and §1.2 reported it stale on the widened guard's first run. RED-proven **at the boundary**: keep the loop, keep the period, hand-type the curve → §1.1 must still catch it. |
| **`red:motion-ladder`** — *the* control for the ladder gate | `scripts/red-motion-ladder.mjs` + `scripts/anchors/motion-ladder.anchors.mjs` | row 7 | ⛔ **This guard had NO control for its entire life** — it is the ratchet this programme's record cites for "the tokens are pinned", it reached zero once, and nobody had ever watched it fail. ⭐ Carries the pattern worth copying: a **CORPUS mutation** (strip every `.css` from a copied tree; §2 must go RED **while §1.1 stays GREEN**) — the only way to prove a corpus pin, because *a gate reporting `0 offenders` over the wrong corpus reads exactly like a gate reporting `0 offenders`*. Also: it demands a **NAMED section** in the output and never trusts the exit code, since a crash and a catch both exit 1 — the first run scored 0/5 on an indentation bug in the harness's own parser (`  FAIL` vs `FAIL`), and under-reported rather than over-reported, which is the safe direction. |

⭐ **Why this table exists** (Ali, 2026-09-03): *"update the location of where files should be
regarding any design or instruction, to keep a clean final ruling."* A home that is minted and not
written down is a home the next session cannot find — and a home nobody can find gets re-invented,
which is §K5's fifteen reasonable-looking decisions, one row at a time.

## c · Every finding as a kit-level change

| id | The kit intervention | ONE definition site (`file:line`) | What changes on screen | Surfaces inherited | Guard | RED control | Owner |
|---|---|---|---|---|---|---|---|
| **PV-04** | Resolve the side word through `sideWord(t, side, productLine)` at the two market-detail commit surfaces (never the raw enum). | `side-picker.tsx:140,148` + `conviction-dial.tsx:1643,1660` → both call `sideWord` (already imported) | SW dial commit reads "Weka NDIO"; ZH pick-gate reads "是 @ 62%" | market-detail (both commit paths) | `test:labels` §10 (extend render population to the dial + side-picker) | revert to `effectiveSide`; assert a ZH/SW render carries no `YES`/`NO` token | Code |
| **PV-06** | Wire the Up & Down card as the **sixth** cold-start consumer: gate the split bar + `Up/Down %` on `volumeTzs === 0` → dashed empty bar + "No bets yet", mirroring `.mcardp`. | `updown-card.tsx:857-862`, gated on the shared `pricedYesPct` rule in `lib/markets/discovery.ts` | a 0-volume round shows the dashed empty bar, not a fabricated 50/50 | `/updown`, `/updown/[roundId]`, `/live` Up & Down cards | `test:discovery-contract` / `test:hero-contract` (add the 6th consumer) | a 0-volume round emits a split-bar `width` ≠ 0 → RED | Code |
| **PV-03** | A shared `<DetailLayout>` template (a new **primitive**) for narrow single-column detail pages, or a two-track shell. | new `src/components/layout/detail-layout.tsx`; adopt on `wallet/deposit` + `positions` empty state | deposit/positions fill the desktop measure instead of a ~600px centred column | every narrow detail page | extend `responsive-audit.mjs`: content root < ~65% of tier at ≥1280 with no sibling track = finding | shrink a page's root below the threshold → RED | Code (template) · Design (the flank content → §d) |
| **PV-13a** | Move the "Hide balances" eye toggle off the hand-typed `h-[42px]` onto a `--h-control-*` rung. | `top-app-bar.tsx` (the balance toggle) | the eye button is 40/44, not 42 | the shell (every page) | `test:tap-target` + a **new rung-membership assertion** (an interactive height must equal a `--h-control` value) | a hand-typed `h-[42px]` on a control → RED | Code |
| **PV-13b** | `mcardp-info` → 44 (the card's other CTA rung). | `globals.css` `.mcardp-info` | "How it works" sits on 44 like its siblings | every market card | `test:design-frozen` ratchet | — | Code |
| **PV-13c** | One height per chip size in the chip family (collapse 18·20·21·22·23·25·27 → the rung set). | `chip.tsx` + `globals.css` chip heights | one chip height per size across board + landing | every chip | `test:chip-contract` (one height per size) | two heights for one size → RED | Code · Design (which sizes) |
| **PV-10** | Drop the `opacity-85` on the `@pct%` suffix (use the label's full ink). ⛔ Never re-hue the green. | `market-card.tsx:429-432` + `side-picker.tsx:140,148` | the odds readout clears AA on the money buttons | every priced card + the side-picker | `test:contrast` — confirm its population includes this span; if not, that gap is the fix | the suffix at `opacity-85` on `btn-yes` scores < 4.5 → RED | Code (or Design if the fill must darken) |
| **PV-14** | The atoms carrying `duration-150` / bare `transition-*` → `--t-quick` + a named `--m-*` curve. | the Input atom + the census's `inline-flex min-h-[44px]` control; systemic at the kit | motion lands on the ladder; no imperceptible 10ms-off drift | platform-wide | **new** `test:motion-timing` (Part C §f) | a bare `ms` or bare cubic-bezier outside `motion.css` → RED | Code + the new guard |
| **PV-01** | If contained: one `<DecorMark>` primitive with a §M8 clear-space rule. | new `src/components/brand/decor-mark.tsx` | the mark keeps clear space of the headline | every hero backdrop | `test:needle`-family `--m-pivot`/clear-space assertion | mark within 0.25×diameter of text → RED | **Design/Ali first** (keep-as-backdrop is a live option) |
| **PV-05** | The bet-panel dial weight + the term unification (YOUR PICK / × / conviction). | the dial's visual spec (not a value sweep) | a heavier, legible dial; one word for one idea | market-detail | visual (screenshots) | — | **Design commission (§d)** |

## d · What needs Claude Design, and its bounds

Two items are **judgment, not a sweep** — commission a **bounded** handover with the `design`
skill, following `docs/SESSION-PROMPT-MASWALI-DESIGN.md`:

1. **The bet panel + dial weight** (lens 5/9/13) — the dial is *physically* perfect (measured:
   1:1 tracking, RG clamp, holds on release) but reads thin, and one idea wears three words.
2. **The commit-sequence motion spec** (lens 7/14) — the choreography of side pick → panel →
   dial settle → confirm modal → seal, **with every duration named in `--t-*` rungs**.

Bounds: lands in `docs/design-brief/player-visual-2026-09/handover/`; ships `TOKENS-USED.md`,
`DECISIONS.md`, a `MOTION.md`, and `sources/*.dc.html`. ⛔ **The mechanical check runs first** —
every `var(--token)` the handover claims must already exist in `globals.css :root` / `motion.css`;
an invented token **fails** the handover, it is not negotiated. Must show **EN + SW + ZH** at
**390 and ≥lg**. ⛔ Never unzip a handover package in-repo (`test:design-one-door` went 4-red once).

## e · Responsiveness, size & consistency law

The matrix **390 · 768 · 1024 · 1280 · 1920 × EN · SW · ZH**; zero horizontal overflow at 390
(already true — 255/255 clean, keep it); every container measured against its **own**
`scrollWidth`; tap ≥ 44 (§A2); **control heights only from `--h-control-*`** (§K1); one chip
height per size; radius and shadow from tokens (`test:design-frozen`); nothing behind the bottom
rail; text fits its container (§M4a / `qa:fit`); **SW/ZH parity with no English enum token**
(§L4 — PV-04); the mark's clear space 0.25 × diameter (§M8 — PV-01); one measure per shell
(§B7); the filter language §K6/K6b and the section-rail law §K7 (a tab is not a filter).

## f · Motion & physics law

`--m-*` / `--t-*` only, never a bare curve or a bare `ms`. `--m-pivot` is reserved for the
needle and dials. `--m-press` is the only scale a control may take. **A duration must be matched
to its distance and role, not merely to the ladder** — the new rule this programme mints; it goes
in `DESIGN_AUTHORITY.md` §E, not here. Every animation still works with motion off and lands on
the **same end state** (§M6, three gates). Guards `test:motion-ladder` · `test:reduce-motion` ·
`test:keyframes` · `test:needle`.

✅ **ROW 7 CLOSED THE GUARD HALF OF THIS, 2026-09-03 — and not where this section expected.**
The timing-correctness gate is `test:motion-ladder` **§2 + §3** (+ the first `red:motion-ladder`
it has ever had), **not** a new `test:motion-timing` — see §b2 for why the one-home law overruled
the plan. The rules it now holds are Authority **§E9** (only `motion.css` may *declare* a curve
or a duration; a namespace may alias it, never re-value it) and **§E10** (a loop keeps its
period, never its curve). ⭐ The finding was not call-site drift at all: the guard walked only
`.tsx`/`.ts` and had **never read a stylesheet**, and a fourth motion vocabulary was living in
that blind spot.

⚠️ **STILL OPEN from this section, scoped OUT of row 7 on purpose, and it needs one decision:**
extending `test:needle`'s `--m-pivot` population to `conviction-dial.tsx`, and the **named
breach** `motion.css`'s own header records — `orm-pop` in
[`operation-result-modal.tsx`](../src/components/markets/operation-result-modal.tsx) animates on
`--m-pivot`, which §M8 reserves for the needle and dials; a result-modal crest is neither, and
its keyframe already carries its own 1.06 overshoot, so `--m-settle` is the honest curve. The
**fix is one line**. ⛔ **The GUARD for it is `test:needle` — the parallel session's file — and
"who may USE `--m-pivot`" is a different rule from "who may DECLARE a curve", so it must not be
smuggled into `test:motion-ladder` §3 as a second home.** A fix without its guard rots, so this
is filed whole rather than half-done. 👤 Either the needle session takes it, or it waits for
that session to land.

## g · THE PROGRESS PLANNER

States: `☐ not started` · `◐ in progress` · `⧗ blocked (why)` · `✎ awaiting Claude Design` ·
`👤 Ali` · `☑ done · pushed · verified on production`.

| # | Item | Lens | Owner | State | Definition site | Guard | Commit | Evidence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | PV-04 · side words via `sideWord` at **all 8** commit surfaces | 3,6 | Code | ☑ | `side-picker.tsx:140,148` · `conviction-dial.tsx:1099,1124,1398,1419,1643,1660` | `test:labels` **§3b+§3c** · `qa:side-words` | `c50d2e82` | `.qa-shots/pv04/` | ✅ **VERIFIED ON PRODUCTION 2026-09-03** — `qa:side-words` **28/28** (was 20 RED). Merged in `79c3b65b`. The 7.5px CJK knob flag is CLOSED: 是 renders cleanly at 4× |
| 2 | PV-06 · Up & Down cold-start — **and the second + third split bar deleted** | 1,3,11 | Code | ☑ | `updown-board.ts` → `pricedYesPct`; `updown-card.tsx` + `updown/[roundId]/page.tsx` → `<TippingBar>` | `test:ui-consistency` **hand-rolled-split-bar** · `qa:cold-start` | `79c3b65b` | `.qa-shots/pv06/` | ✅ **VERIFIED ON PRODUCTION 2026-09-03** — `qa:cold-start` **30/30** (was 12 RED); both live cards show the dashed rail at VOL 0. ⚠️ the FUNDED arm was not exercised on prod (no funded round existed) — proven locally instead |
| 3 | PV-13a · eye toggle off `h-[42px]` | 13 | Code | ◐ | `wallet-balance-pill.tsx` (not `top-app-bar.tsx` — filed one file off) | `test:tap-target` **§6** (new) · `red:tap-rung` | `pv10/rows-3-4-6` (unmerged) | `.qa-shots/pv13-local/` (gitignored, local-only — production evidence owed on merge) | code-complete, guarded, RED-proven, visually verified locally (390/1280, EN/SW/ZH). ⛔ **NOT proven on production** — pushed to a branch only |
| 4 | PV-13b · `mcardp-info` → 44 | 13 | Code | ◐ | `globals.css .mcardp-info` | `test:tap-target` **§6** (folded in with row 3, not `test:design-frozen` — see session-6 note) | `pv10/rows-3-4-6` (unmerged) | `.qa-shots/pv13-local/` | same branch as row 3; `MARKET_CARD_H` re-derived 349→347 as a consequence, `qa:card-geometry` owed on merge. ⛔ **NOT proven on production** |
| 5 | PV-13c · one chip height per size | 13 | Code+Design | ☐ | `chip.tsx` + `globals.css` | `test:chip-contract` | — | — | which sizes = Design — untouched this session |
| 6 | PV-10 · `@pct%`/`×N` suffix contrast | 6 | Code | ◐ | `market-card.tsx` · `side-picker.tsx` · `updown-card.tsx` · `updown-stake-controls.tsx` · `conviction-dial.tsx` (filed as 4 sites, was **9**) | `test:contrast` **§P-u2** (new) · `red:contrast-callsite` | `pv10/rows-3-4-6` (unmerged) | `.qa-shots/pv10-local/` (gitignored, local-only) | guard population gap WAS the finding, confirmed; guard's own sweep found a 9th site (the bet-panel commit button). ⛔ **NOT proven on production** |
| 7 | PV-14 · timing correctness — **the ladder's ratchet had never read a stylesheet** | 14 | Code | ◐ | `chat-tokens.css:82-85` (the `--cm-*` aliases) + 5 call sites in `chat-styles.css` — ⛔ **NOT** the Input atom, and **no** `test:motion-timing`: see the note | `test:motion-ladder` **§2+§3** (extended, not a new file) · `red:motion-ladder` (new — the guard had **no** control) | `pv10/row-7-motion-ladder` (unmerged) | `.qa-shots/pv14-local/` (gitignored, local-only) | code-complete, guarded, **RED-proven 5/5**, browser-verified locally **72/0** at 390+1280 × EN/SW/ZH. ⛔ **NOT proven on production.** ⭐ The filed census was stale ×124 (`duration-150` was **3**, not 373; bare Tailwind curves **0**, not 391) and the real defect was a **corpus hole** — `walk()` took only `.tsx`/`.ts`, so a **fourth motion vocabulary** (8 hand-typed values) lived in `src/styles/chat/`. New law: Authority **§E9/§E10**. Ratchet moved **4 → 5 → 4** (`needle.css` in, scheduling; `spinner.tsx` out, §E10 covered it) |
| 8 | PV-03 · narrow detail pages — **re-derived: half overturned, half mis-diagnosed** | 3,5,10 | 👤 **Ali** (a design ruling, 45 surfaces) | ◐ **re-derived, not built** | ⛔ **NOT** `detail-layout.tsx` — never build it (§b2, struck). The real site is `empty-state.tsx:45` (`max-w-[360px] mx-auto`) | `responsive-audit.mjs` (the ~65%-of-tier rule is **refused** — see note) | — | `.qa-shots/pv03-local/` (6 routes @1280, gitignored) | ✅ **`/wallet/deposit` OVERTURNED** — `tier="form"` (640px) is CORRECT; a deposit page is a form and its "wasted 53%" is what §B7 exists to produce. 🔴 **`/positions` is real but mis-filed**: the measure is right (`reading`/1080, container 1016px); the defect is that section headings sit left at x=132 while `EmptyState`'s `mx-auto` centres the card at 460–820. ⚠️ **45 call sites in 33 files inherit that `mx-auto`** → a design ruling, not a session's call. The primitive's own docstring already promises the *"(or full-width)"* variant that has never existed |
| 9 | PV-01 · `<DecorMark>` clear-space (or keep) | 4,5 | 👤 Ali → Design | ☐ | new `decor-mark.tsx` | `--m-pivot`/clear-space | — | — | keep-as-backdrop is live |
| 10 | PV-05 · dial weight + term unification | 5,9,13 | ✎ Design | ☐ | handover | visual | — | — | commission §d |
| 11 | Lens 12 · `/markets` filter correctness — **2 of 4 already covered, 1 overturned, 1 open** | 12 | Code | ◐ **re-derived locally; production owed** | ⛔ **NOT** a new drive — the home is **`qa:filter-stress`** (`scripts/filter-stress.mjs`), which §5 never names | extend `qa:filter-stress` with 2 sections (count-vs-rendered, monotonicity) | — | local drive **10/1**, `.qa-shots/pv11-local/` | ⛔ Both instruments §5 names are wrong: `qa:filter-scan` is a filter-*language* check. `qa:filter-stress` **already** drives all **360** status×sort×odds×pool combinations asserting "promise equals delivery" — so **combined-filter intersection was already covered**. ✅ **count==rendered HOLDS 5/5 exact** (incl. the zero case). ✅ **URL-backed OVERTURNED — it IS**: 4 of 5 pills wrote the URL; §5's doubt came from clicking **"Open"**, the *default*, which correctly writes nothing. ⚠️ **monotonicity + lazy-load UNPROVEN** (a 6-card board with 0 printed volumes cannot exercise either) → **production owed**, reported unproven not passed |
| 12 | Invite & Earn gold on zero-bonus card | — | 👤 Ali | ☐ | `wallet-client.tsx:314` | `test:gold-is-money` | — | — | passes today (15/15) → ruling to record, not a fix |

Seed state: every row `☐`. ⛔ Do not tick a row by intention — only by evidence (§h).

## h · The fill protocol — what "done" means, per item, in order

1. **Re-derive the finding on production.** If it does not reproduce → mark `OVERTURNED` with
   evidence and stop (this already happened to 7 hypotheses; it is a result, not a miss).
2. One fix, at the ONE definition site.
3. The guard, **proven RED on a copy of the tree before you believe it**, stating its re-derived
   population, its HEAD count outside any allowlist (must be **zero**), and the control that makes
   it fail. If it cannot land at zero, **refuse it and say so with arithmetic**.
4. Docs updated in the **same commit**. A new *rule* goes in `DESIGN_AUTHORITY.md`, never here.
5. `npx tsc --noEmit` · `npm run build` · the item's `test:*` + `red:*` · then
   `test:ui-consistency` · `test:design-frozen` · `test:design-one-door` · `test:contrast` ·
   `test:type-scale` · `test:tap-target` · `test:chip-contract` · `test:motion-ladder` ·
   `test:reduce-motion` · `test:keyframes` · `test:i18n` · `test:labels` · `test:filter-language`.
6. One push (to your branch). One production re-verification **by re-running the instrument,
   never by reading a log** — screenshot and LOOK (`player-matrix-sweep.mjs` / `ceremony-drive.mjs`
   scoped to the touched surface).
7. Tick the planner row with the commit SHA and the evidence path.

> ⛔ **NOT DONE until it is pushed AND functional 100% on production, re-measured.**
> A row is ticked by evidence, not by intention.

## i · The per-session ritual

**Start:** read §a canon, `git fetch` + `git pull --ff-only origin main`, read the **topmost**
`RESUME AT (session N)` block below — only the topmost is current truth.
**End:** update the planner (§g), write a new `RESUME AT` block at the TOP of §j-resume, merge
`main` into your branch **while you still have the context** (not at hand-off), push your branch.

## j · Provenance — how to regenerate every piece of evidence

- The record: [`PLAYER-VISUAL-2026-09.md`](PLAYER-VISUAL-2026-09.md) §0 names each instrument.
- The matrix sweep, the ceremony drive, the contrast region-reader, the filter drive and the
  analyzer are in the session scratchpad; each is self-contained and read-only against
  `https://50pick.tz`, signed in once as a QA-fleet player (`loginOnce`, storageState reused).
- Evidence lands in `.qa-shots/pv2026-09/` (gitignored). ⛔ A screenshot cited as a finding's
  proof must live in `shots/<PV-NN>/` so `test:docs` can enforce it (§0b).

### j-resume — RESUME AT (newest at the top)

**RESUME AT (session 7) — 2026-09-03. ROW 7 IS `◐` on branch `pv10/row-7-motion-ladder`. Rows 3,
4, 6 remain `◐` on their two branches — ⛔ NEITHER HAS MERGED (`main` is still `8a800e9f`, the
same tip session 6 handed over). Rows 5, 9, 10, 12 need Ali; rows 8 and 11 are the code work left.**

⭐ **THE HEADLINE, AND IT IS A METHOD LESSON, NOT A MOTION ONE: the filed census was stale by two
orders of magnitude, and the real defect was in the INSTRUMENT.** PV-14 was filed as
`duration-150` ×**373** and bare Tailwind curves ×**391**. Re-measured: **3** and **0**. Both filed
numbers had been taken through `getComputedStyle` in a browser — they counted *consequences*
(every element sharing a class) where a fix has to count *definition sites*. ~124× apart. ⭐ **A
census taken through the browser answers a different question from the one a fix asks.** §g2 had
already flagged this ("the record's census is STALE — re-derive before planning") and was right.

**What was actually wrong:** ⛔ **`test:motion-ladder` had never read a stylesheet in its life.**
`walk()` accepted `.tsx`/`.ts` only, so all six `.css` files under `src/` — **including
`motion.css`, the ladder the guard exists to enforce** — were outside its corpus from the day it
was written. And its own **anti-narrowing pin (§1.3), added for exactly this failure**, passed
throughout: it pins by **DIRECTORY**, and every directory it names holds `.tsx`. ⭐ **A pin on one
axis certifies nothing about another.** `src/styles/` was never named at all.

**Living in that blind spot: a FOURTH motion vocabulary.** `chat-tokens.css` declared
`--cm-ease-*`/`--cm-dur-*` — eight hand-typed beziers and ms literals answering to nothing in
`motion.css` — under a header reading *"brief names → kit easings"* while resolving to none of
them; plus four hand-typed shorthands in `chat-styles.css`, one of them (`transform 120ms
ease-out`) **hiding at the end of a line whose other three properties were correctly tokenised**.
The chat surface mounts in the **root layout**, so this is platform-wide player surface. It is
the exact defect `state-tokens.css` deleted from ITSELF on 2026-08-21 and eulogised twice in its
own header — one directory away, where nothing was looking.

**The fix took an existing ruling rather than making a new one:** `globals.css:2187-2190` had
already bridged these same four names, so the `--cm-*` twins inherit that mapping. `--cm-*-sink`
was **deleted** (zero consumers, measured). ⚠️ One real feel change, said plainly: 22 consumers
move **180 → 140ms** on chat hover — `--t-quick`, the rung the kit's own `.btn` already uses.

**⛔ NO `test:motion-timing` WAS BUILT, AND THAT IS DELIBERATE — do not create it.** §b2 promised
it as one of this programme's three minted homes. Once the finding was re-derived, the rule it
needed belonged to a guard that already existed, and §b2's own table says a rule with a guard
gets **a new SECTION**, not a new file. PV-14 landed as `test:motion-ladder` **§2** (corpus,
pinned by extension) + **§3** (only `motion.css` may *declare*). The strike-through and the
reason are in §b2 so the next session cannot re-invent it. New law: Authority **§E9** + **§E10**.

⭐ **This guard had NEVER had a RED control** — the ratchet this record cites for "the tokens are
pinned", green over an entire missing file type. `red:motion-ladder` is **5/5** and one mutation
is worth copying anywhere a guard has a corpus: ⭐ **strip every `.css` from a copied tree and
assert §2 goes RED *while §1.1 stays GREEN*.** That reproduces the exact failure on demand — *a
gate reporting `0 offenders` over the wrong corpus reads exactly like a gate reporting `0
offenders`.*

⭐ **The ratchet moved 4 → 5 → 4, and the shrink is the better half.** `needle.css` joined as a
**scheduling** exemption (5 raw timings, another session owns that file — the same call this
allowlist already made for `updown-card.tsx`/`round-countdown.tsx`, which their owner then
cleared). `ui/spinner.tsx` **left**: its entry had said since 2026-08-21 that it stayed *"until
the ladder gains a period rung"*, and §E10 gave it a written **rule** instead. §1.2 reported it
stale unprompted on the widened guard's first run.

⚠️ **TWO INSTRUMENT BUGS, BOTH CAUGHT BY A CONTROL AND NOT BY LUCK — the transferable part:**
1. The first browser drive reported **43 failures**. The CSS build **minifies** computed values
   (`340ms`→`.34s`, `0.97`→`.97`), so string-comparing against `motion.css`'s source text
   "proved" six tokens hadn't resolved. ⭐ **The positive control is what exonerated the
   product:** `--m-press`, untouched by this row, failed in the identical shape — only possible
   if the comparator is the fault. Without it, *"the @import ordering broke the cascade"* was the
   honest-looking conclusion, and the next move would have been to fix correct code.
2. The drive's three locales were **all English** and it passed **66/66** that way. `?lang=` is
   not the switch — `i18n.tsx:41` reads a `kp-locale` **cookie**. ⭐ **The screenshot caught it**
   (the SW cell rendered *"How do I deposit?"*). It now proves the locale by **discrimination**:
   ZH must render CJK **and EN must render none**; SW must carry a word only SW owns. Final: **72/0**.

**Validated:** `tsc` ✓ · `build` ✓ · `test:motion-ladder` **10/0** (HEAD count outside the
allowlist = **zero**, both new sections) · `red:motion-ladder` **5/5** · `test:red-anchors`
**1123/0** (§4's ceiling held at 67 — the new harness declares its anchors) · `reduce-motion` ·
`keyframes` · `tokens` · `design-frozen` · `design-one-door` · `ui-consistency` ✓ · browser drive
**72/0** at 390 + 1280 × EN/SW/ZH, **shots opened and read**.

🔴 **`test:all` IS RED ON `main` AND IT IS NOT THIS ROW'S — `test:type-scale` §4 counts 920
against a ratchet of 918 (+2).** Traced by arithmetic, not inherited from the handoff that
predicted it: this row's ONLY `src/` changes are two `.css` files containing **zero** `text-[`,
and §4's population is `text-[Npx]`/inline `fontSize`. `needle-drawer.tsx` carries **7** such
literals and is **byte-identical to HEAD**, committed by the parallel session in `4579295c`. So
the +2 landed on `main` with the needle work and the ratchet was not addressed in the same
commit. ⛔ **Not mine to fix** (their file, and a ratchet may only shrink — the honest options are
to move those two literals onto the type scale or to justify them). 👤 **Ali: this needs to reach
the needle session.** Everything else in `test:all` is green.

⚠️ **Scoped OUT of row 7, filed whole rather than half-done — one Ali/needle decision:** §f also
asked for `test:needle`'s `--m-pivot` population to reach `conviction-dial.tsx`, and `motion.css`
records a **named breach** (`orm-pop` in `operation-result-modal.tsx` uses `--m-pivot`, which §M8
reserves for the needle and dials). **The fix is one line** (`--m-settle`). ⛔ But its guard is
`test:needle` — the parallel session's file — and *"who may USE `--m-pivot`"* is a different rule
from *"who may DECLARE a curve"*, so it must **not** be smuggled into `test:motion-ladder` §3 as
a second home. A fix without its guard rots. Also filed: `chat-styles.css`'s stagger delays
(`animation-delay: 100ms/180ms`) are off `--m-stagger` and invisible to this guard by its written
scope — a real finding, a different shape, worth a look with row 8.

---

### ROWS 8 AND 11 WERE ALSO RE-DERIVED THIS SESSION — AND ⛔ **NEITHER SHOULD BE BUILT AS FILED.**

⭐ **Three rows, three wrong definition sites, and in every case the correct home already
existed.** That is now the most reliable finding of this whole programme: budget the
re-derivation, not the fix.

**ROW 8 (PV-03) — ⛔ do NOT create `detail-layout.tsx`.** Authority **§B7 rule 2** already owns a
page's width: *"a page states its width through `<PageContainer tier>` and nothing else"*, six
tiers in `globals.css`, a TS union so an invented width is a **compile error**, and a
`data-measure` stamp so it can be measured rather than trusted. Measured at 1280 and 1920 on all
six candidate routes **plus `/markets` as a control**:
- ✅ **`/wallet/deposit` is OVERTURNED.** It declares `tier="form"` (640px) and **a deposit page is
  a form** — symmetric gutters, centred card, readable fields, methods 3-up (shot opened). The
  filed *"53% of desktop width unused"* is a **true number with the wrong conclusion**: that
  emptiness is precisely what §B7 was written to produce, after users said pages and input fields
  were *"too wide"*. **Widening it would re-introduce the defect §B7 exists to fix.**
- 🔴 **`/positions` is real but MIS-DIAGNOSED.** Its measure is correct (`reading`/1080 →
  container 1016px). The defect is **alignment**: headings sit left at x=132 while
  `empty-state.tsx:45`'s `mx-auto` centres a 360px card at 460–820. ⚠️ **45 call sites in 33
  files** inherit that `mx-auto` → **👤 Ali's ruling**, (a) fill the section's measure or (b) stay
  360 and align left. The primitive's docstring already promises the *"(or full-width)"* variant
  that never existed.
- ⛔ **§5's proposed guard is REFUSED with arithmetic**: *"narrower than ~65% of its tier at
  ≥1280"* cannot land at zero — at 1920 it condemns `/notifications` (53%) **and `/markets`, the
  control** (63%), both correct. The honest rule is tier-relative: *does content reach the measure
  its own declared `tier` sets?* (1016 vs `/positions`' 639.)

**ROW 11 (lens 12) — ⛔ do NOT write a new drive.** Both instruments §5 names are wrong
(`qa:filter-scan` is a filter-*language* check), and the real home — **`qa:filter-stress`** —
goes unmentioned while already driving **all 360** status×sort×odds×pool combinations asserting
*"the promise still equals the delivery"*. So **combined-filter intersection was already
covered.** Of §5's four questions: ✅ **count==rendered HOLDS 5/5 exact** (including the zero
case); ✅ **URL-backed is OVERTURNED — it IS URL-backed**, 4 of 5 pills wrote the URL and §5's
doubt came from clicking **"Open"**, the *default*, which correctly writes nothing; ⚠️
**monotonicity and lazy-load are UNPROVEN, reported as unproven** — a 6-card local board printing
zero volumes cannot exercise either. ▶ Row 11 = **two sections added to `qa:filter-stress`**, run
against **production**.

⚠️ **A THIRD INSTRUMENT BUG, and the pattern across all four is the real lesson.** Row 11's first
counter used `[class*="mcardp"]` — a **substring** match that also counts every child of a card
(`.mcardp-top`, `.mcardp-info`, `.mcardp-share` …), so a **6-card board counted 126**. On that
number `"Closing today 3"`→"63" looked like a spectacular count defect and "126 before scrolling,
126 after" looked like proof of no lazy-loading. Fixed to `[class~="mcardp"]` and trusted only
after **three independent measures converged** (token-match, `<article>`, `.market-grid` children
— all 6). ⭐ **Every one of this session's four instrument bugs was caught by a CONTROL, never by
inspection**: the untouched token (`--m-press`), the screenshot (the English "SW" cell), the
in-run control page (`/markets` reading 95% where the wrapper-probe said 100%), and three
converging counts. **Measure the control in the same run, always** — with the two filed pages
alone, row 8's vacuous probe would have read as a clean double overturn.

🔴 **AND ONE MEASUREMENT WAS THROWN AWAY RATHER THAN REPORTED.** The first `test:responsive` run
came back **5243/193** against session 3's baseline of 5386/33, with 180 of the failures reading
*"no `<main>` at all"* across 9 routes. ⛔ **Invalid, and not a finding**: it ran concurrently with
three other browser drives and market seeding against one `next dev`. Checked directly —
`/legal/terms`, `/help`, `/fairness` and `/markets` each serve **200 with exactly one `<main>`**;
`/profile/sessions` is a 307 (signed out). A contended dev server renders partial pages and the
sweep reads that as absence. ▶ A clean re-run on an idle server was started; **compare it against
5386/33 before trusting any responsiveness claim.** The 320px `button[Account menu]` clip in
the other cluster is the pre-existing one session 3 already named.

**Next — what is actually left.** No code row remains that should be built as filed. The queue is:
👤 **Ali** — (1) the `EmptyState` alignment ruling (row 8, 45 surfaces); (2) row **5**, which chip
sizes; (3) row **10**, the dial Design commission; (4) whether to merge the three `pv10/*`
branches; (5) get the `test:type-scale` +2 / `test:spacing-scale` +4 to the **needle session** —
`test:all` is red on `main` and it is their `needle-drawer.tsx`. **Code, once Ali rules** — row 8's
one-prop fix + the tier-relative guard; row 11's two `qa:filter-stress` sections against
production; the `--m-pivot`/`orm-pop` one-liner **if** the needle session hands over `test:needle`.
⛔ On merging any branch: re-run that row's drive against production, and `qa:card-geometry`
before/after for row 4 (`MARKET_CARD_H` 349→347).

**RESUME AT (session 6) — 2026-09-03. ROWS 3, 4, 6 ARE `◐` — code-complete, guarded, RED-proven,
visually verified LOCALLY (EN/SW/ZH, 390/1280) — but pushed to branch `pv10/rows-3-4-6`
(unmerged) and therefore ⛔ NOT yet proven on production. Rows 5, 9, 10, 12 still need a
ruling/commission and were not touched. Row 7 and rows 8/11 are next (see §g2).**

**Re-derived all three on production FIRST**, per the bar: `.mcardp-info` measured 46px, the eye
toggle 42px inside a 44px capsule, and the `@pct%` suffix region-read at 3.87:1 — all three
confirmed, none overturned. Screenshots in the session scratchpad (not committed).

⭐ **Both PV-13 controls were invisible to `test:tap-target` for DIFFERENT reasons, and PV-10 was
filed as 4 sites and found as 9 — the same "ask where else this shape lives" payoff PV-04/PV-06
already taught this programme once each.** Full write-ups are in the record
(`PLAYER-VISUAL-2026-09.md` → PV-13a/PV-13b and PV-10, both "RE-DERIVED AND FIXED"). The two new
guard sections are `test:tap-target` §6 and `test:contrast` §P-u2 — see the filing table above
for exactly why each is scoped the way it is, and why the general "every `h-[Npx]`"/"every
`opacity-NN`" sweep is refused with arithmetic in both cases.

⚠️ **Three pre-existing, UNRELATED guards broke on these fixes, honestly, and were corrected —
not silenced.** This is worth carrying forward as its own lesson: a legitimate accessibility/
one-home fix can break a guard that was pinned to the OLD implementation rather than to the rule
it exists to enforce, and the fix is to correct the guard's assertion, never to leave it stale
or delete it.
- `test:wallet-reach` §1 asserted the literal string `border: flashing` and `height: 44` — PV-13a
  moved the capsule's border to an `inset` box-shadow (a real `border` was eating 2px off the
  CONTENT height a child's `h-full` resolves against, which is why the eye first measured 42px
  even after the naive fix) and the bare `44` to `var(--h-control-md)`. Rewritten to check the
  RULE (one bordered shape, the 44px rung by name) rather than the old spelling.
- `red:wallet-reach`'s `capsule-loses-its-border` anchor mutated the now-gone `border:` property;
  re-anchored to `boxShadow:`, same mutation shape.
- `test:updown-pricing` §7.2 ("no size escalation") fingerprinted "muted" as the literal string
  `opacity-85` beside `text-[12.5px]` — a vocabulary match, not a measurement. Dropping
  `opacity-85` for a real AA fix broke the CHECK without breaking the RULE (still `text-
  [12.5px]`, still no bold, still no gold). Rewritten to assert the span's own full class list.
  `red:updown-pricing`'s "multiplier escapes into gold" mutation was ALSO separately found to
  have been silently `ANCHOR NOT FOUND` (proving nothing) since before this row touched the file
  — a stale " est." suffix — and was re-anchored to the literal that ships (10/11 → 11/11).

⛔ **`.mcardp-info`'s shrink moved card geometry, and it was traced rather than left stale.**
`.mcardp-info` is the tallest child of a LIVE card's meta row, so 46→44 shrank `MARKET_CARD_H`
(the skeleton reserve both `/markets` skeletons import) from **349 → 347** — measured before/
after on the same board. The `.mcardp-details::after` overlay's clearance to it (10px above/
14px below) is UNCHANGED (the row above absorbed the shrink, not the gap) — confirmed by
`tap-hit-test.mjs` against a local server, not assumed. **`qa:card-geometry` before/after is
owed on production once this merges**, per the existing convention every prior card-geometry
change in this file has followed.

**Two new RED-provable homes minted, both extensions of an existing guard, neither a new file
class:** `test:tap-target` §6 (`red:tap-rung`) and `test:contrast` §P-u2 (`red:contrast-callsite`)
— both declare their mutations in `scripts/anchors/*.anchors.mjs` (the newer declarative pattern
`red-tap-floor.mjs`/`red-wallet-reach.mjs` already use) rather than hand-rolling them inline, so
`test:red-anchors` §4's ceiling did not need to rise — it stayed exactly at 67.

**Validated:** `tsc` ✓ · `build` ✓ · `test:tap-target` **29/0** · `red:tap-rung` **2/2** ·
`test:contrast` **69 checks, 0 failures** · `red:contrast-callsite` **5/5** · `test:wallet-reach`
**34/0** (corrected) · `red:wallet-reach` **6/6** (re-anchored) · `test:updown-pricing` **61/0**
(corrected) · `red:updown-pricing` **11/11** (re-anchored, was 10/11) · `test:card-share` **26/0**
· `tap-hit-test.mjs` locally: every Details target ≥40px, no info button swallowed, 4 widths ·
`test:red-anchors` **1113/0** · full `npm run test:all` **278/282 green** — the 4 failures are
`test:type-scale` and `test:spacing-scale` (both from the PARALLEL SESSION's uncommitted
`needle-drawer.tsx`, traced by hand — `text-[13.5px]`/`text-[13px]` and `mt-3.5`/`pt-3.5` on the
new theme-menu it is building, confirmed by isolating the diff per file — NOT this row's) and
`test:responsive`/`test:motion`, which need a live server and are excluded from `test:all` for
that reason (documented since session 3) — both re-run against `next dev -p 3100` locally:
`test:motion` **43/0**. `test:responsive` was started against the same server (a ~5,400-cell
whole-site sweep, several minutes) but not waited on to completion this session — the three
touched surfaces were instead proven directly and more precisely by `tap-hit-test.mjs` (every
Details target ≥40px at 4 widths, no info button swallowed) and the local verification script
above (0 clipping on the wallet capsule/eye or the `@pct%`/`×N` suffix at 390, EN/SW/ZH). ▶
**Whoever merges this branch should still run `BASE=<server> npm run test:responsive` once** and
compare against session 3's known-clean baseline (5386/33, the 33 pre-existing and unrelated to
any PV row) before trusting this row's responsiveness claim as complete. ⚠️ **Do not
touch `needle-drawer.tsx`, `needle.tsx`, `needle.css`, `haptics.ts`, `needle-bridge.ts`,
`.spin-strip.mjs`, `src/lib/needle-art.ts`** — the parallel session's own uncommitted work,
visible in `git diff` because this tree is shared; none of it is this row's and none of it was
staged.

**Next.** Per §g2: row 7 (motion timing) next — ⚠️ `git fetch` and check whether the needle work
has landed before touching `motion.css`/`--m-*`, that row is the one exception to "no collision".
Then rows 8/11. Rows 5, 9, 10, 12 still need Ali's ruling/a Design commission before anyone
starts them. Merging `pv10/rows-3-4-6` is Ali's call; once merged, re-run `qa:card-geometry`
before/after and re-screenshot the three surfaces on production to tick rows 3/4/6 to ☑.

**RESUME AT (session 5) — 2026-09-03. ROWS 1–2 ☑ AND FULLY VERIFIED ON PRODUCTION. Rows 3–12 are
untouched; this programme needs at least three more sessions (see §g2 below).**

`main` = **`35188277`**. Three deploys today, each verified by an uptime reset, never by a 200.

**Row 2 grew a second pass, and it is the important part of this handoff.** Asked to prove rows
1–2 were finished, the answer was **no**: the record names `/live` as a PV-06 surface and the first
pass never looked there. It carried the same defect in a shape the first guard could not see —
`pulse-grid.tsx` used the kit bar *correctly* but passed **no `empty` prop**, and `topContested`
sorted an unpriced market (score exactly 50) **FIRST** into the hero carousel as "most contested".
⭐ **Measured on production after the fix: 13 honest rails where there had been fabricated 50/50s,
and a real contested market in the hero.**

| drive | before | after |
|---|---|---|
| `qa:side-words` (PV-04) | 20 RED | **28 / 0** |
| `qa:cold-start` (PV-06) | 12 RED | **36 / 0** |

**Three lessons this programme should not have to re-learn:**
1. ⭐ **"The finding is fixed" and "the defect class is gone" are different claims.** PV-06 was
   filed as one surface and was five. Ask *where else does this shape live* before ticking.
2. A guard catches a **shape**, not a defect. `hand-rolled-split-bar` (a surface drawing its own
   bar) was blind to `/live` (the kit's bar with no `empty`). Two rules, both needed, both 0.
3. ⛔ **The RED proof exposed a limit in my own guard**: rewriting a branch to `{false ? (` left
   the empty arm's text in place and the mutation PASSED. The harness deletes the arm instead.

**⚠️ A PARALLEL SESSION IS LIVE IN THIS TREE — and the blocker it caused has already cleared.**
`docs/design-brief/sponsor-2026-09/` is another session's **untracked** sponsor package (it cites
commit `79c3b65`, and it has an uncommitted `.gitignore` edit in flight). At ~13:00 an extracted
`New folder/01-rules/DESIGN_AUTHORITY.md` inside it turned **`test:design-one-door` RED** — the
"never unzip a handover in-repo" trap, which that session's own `.gitignore` note warns about in
so many words. **By 13:15 they had removed it and the guard is GREEN again (re-run, not assumed).**

⭐ **Recorded because the correction is the lesson, not the incident.** This handoff said "RED"
for fifteen minutes and it was already false. ⛔ **Re-derive an inherited blocker before you plan
around it** — `qa:personas` taught this repo the same thing once ("all six are dead" was true of
two). ⛔ Do not commit or delete anything under that folder; it is someone's live work.

🟢 **SCOPE OF THE PARALLEL SESSION, from Ali 2026-09-03: it is working ONLY on the fidget
spinner** (the Needle — `needle-drawer.tsx`, `needle*`, `--m-pivot`, `test:needle`). So rows 3–6,
8, 11 and 12 cannot collide with it and need no coordination. ⚠️ **Row 7 is the one exception**:
motion timing touches `motion.css` and the `--m-*` curve set, and `--m-pivot` is reserved for the
needle and dials. Before starting row 7, `git fetch` and check whether the needle work has landed
— and ⛔ never write a `--m-*` token inside a `/* */` block (a recorded trap in this repo).
`test:all` is **281/282** with only `responsive` + `motion` failing, and both need a server on
`:3000` (`BASE=http://localhost:3100 npm run test:responsive` runs them green — see §b2).

**▶ START HERE NEXT SESSION:** read `.claude/skills/pv10-validate-as-you-go` first, then §g2.

## g2 · WHAT IS LEFT, HONESTLY SIZED

Rows 1–2 took a full session **each half**, because Ali's bar is re-derive → fix → guard → RED
proof → local visual → suite → deploy → re-verify. Sizing the rest against that measured rate:

| session | rows | why grouped |
|---|---|---|
| **next** | **3, 4, 6** — eye toggle off `h-[42px]`, `mcardp-info` → 44, `@pct%` contrast | all size/contrast, all in the same guards (`test:tap-target`, `test:design-frozen`, `test:contrast`). ⚠️ Row 3's guard is the work, not the fix: **374 hand-typed `h-[…]` literals** exist (102×44, 95×40, 24×36 …), so a "control heights come only from `--h-control-*`" rule needs a measured population before it can land at zero |
| **+1** | **8, 11** — `<DetailLayout>`, and the `/markets` filter drive | both are investigate-then-build; row 11 may surface new findings |
| **+2** | **7** — motion timing | ⚠️ **re-measured today: only 3 `duration-150` and 2 bare Tailwind curves remain in `src/`, not the 373/391 the record claims.** The record's census is STALE — re-derive before planning; this may be a small row, not the largest |
| **👤 Ali** | **9, 12** (rulings) · **5** (which chip sizes) · **10** (Design commission) | none of these are code, and all four can be answered in parallel with the sessions above |

⛔ **Do not start rows 9/10 without a ruling or a commission** (§d bounds the handover).

**RESUME AT (session 4) — 2026-09-03. ✅ ROWS 1 AND 2 ARE ☑ — MERGED AND VERIFIED ON PRODUCTION.**
Ali authorised the merge; `main` is at **`79c3b65b`**, the deploy landed (uptime reset 32,872s → 3s,
clean boot, `/updown` and `/markets` both 200), and **both drives were re-run against production
and went green**:

| drive | before the merge | after |
|---|---|---|
| `npm run qa:side-words` (PV-04) | **20 RED** | **28 / 0** |
| `npm run qa:cold-start` (PV-06) | **12 RED** | **30 / 0** |

⭐ **That before/after pair is the evidence, not the green run on its own.** Each drive was proven
able to see its defect on production BEFORE the fix existed there; a suite that has only ever been
green cannot tell you it works.

**Looked at, on production**: the ZH dial reads `是` on the pole tile, the readout and the commit
button (`下注 是 TZS 1,000`) while the board cards behind it read `是 @ 56%` — one word everywhere.
Both Up & Down cards show the dashed empty rail at `VOL TZS 0`, including the **resolved** one that
used to paint a 50/50. **The 7.5px CJK knob flag raised in the record is CLOSED** — a 4× clipped
capture shows `是` well-formed, so no size change is needed.

⚠️ **One honest gap, and the drive is what reported it.** Production carried no FUNDED Up & Down
round at verification time, so `qa:cold-start` exercised only the cold-start arm there and said so
(`NO FUNDED ROUND ON THE BOARD — the positive control was not exercised here`). The funded arm was
proven **locally** instead (a real 83/17 split with the needle). ▶ **Re-run `qa:cold-start` when a
funded round exists on production** to close that arm properly — it costs one command.

**Next.** Row 3 (PV-13a, the `h-[42px]` eye toggle off the `--h-control-*` rungs). Rows 9/10 still
need Ali's ruling / a Design commission. ⛔ `main` now carries rows 1–2, so branch from it fresh.

**RESUME AT (session 3) — 2026-09-03.** Branch **`pv10/side-words`** (⛔ not merged). Rows 1 and 2
are code-complete, guarded and **visually validated**; rows 3–12 untouched. ⭐ Ali added a standing
instruction this session — **`.claude/skills/pv10-validate-as-you-go`**, read it first; it is the
four-gate bar (technical · visual · consistency · responsiveness) and it is why both rows below
carry screenshots rather than only suites.

**Row 2 (PV-06) — the defect was a SECOND BAR, not a missing gate.** Production served a LIVE
round at `VOL TZS 0` with **0 predictors** showing a filled `Up 50% · 50% Down`, and a **resolved**
one doing the same. The cause ran two layers deeper than filed: `updown-board.ts` read
`impliedYesPct` (hardcoded **50** on an empty pool) instead of `pricedYesPct` (**null**) — two
functions for one fact — and *three files drew the split bar*, only one of them the kit's. The two
hand-rolled copies **could not inherit** `TippingBar`'s cold-start rail, so the gate had somewhere
to be missing from. Both are deleted into the primitive; `upPct` is `number | null` end to end
with no `?? 50` anywhere. Full write-up in the record.

**How to look at a change before it is merged — this session's most reusable finding.**
`next start` REFUSES to boot without `DATABASE_URL` (a deliberate guard in `store.ts` — ⛔ do not
defeat it), but `next dev` uses the in-memory store:

    npx next dev -p 3100
    curl -X POST localhost:3100/api/dev-test/updown-seed -d '{"durations":[5,15]}' -H 'Content-Type: application/json'
    curl -X POST localhost:3100/api/dev-test/updown-advance          # opens a round
    curl -X POST localhost:3100/api/dev-test/stress-bulk-bet -d '{"marketId":"mkt_…","n":6,"stake":2000}' -H 'Content-Type: application/json'
    LIVE_BASE=http://localhost:3100 npm run qa:cold-start
    BASE=http://localhost:3100 npm run test:responsive   # and test:motion — both need a server

⚠️ That also settles the two suites that "fail locally": `test:motion` is **43/0** against a real
server and `test:responsive` is **5386 pass / 33 fail**, none of the 33 on a surface this
programme touched (a pre-existing 320px account-menu clip, plus signed-out `/admin` redirects).

**Three things worth carrying, all found by LOOKING rather than by a suite.**
1. The first PV-06 fix mirrored `.mcardp`'s `mcardp-nobets` caption — and printed *"No bets yet"*
   **twice** inside 200px, because the card already says it better below. Removed. ⭐ Consistency
   is one idea stated once, not the same words pasted twice.
2. A `qa:cold-start` screenshot came out **blank** while every assertion on that page had passed —
   the round resolved mid-capture and `UpDownHandover` navigated away. The checks were right and
   the *evidence* was a lie. The drive now asserts the shot is of a rendered page.
3. The new `hand-rolled-split-bar` rule found a **fourth** bar nobody knew about (`/positions`).
   It is exempted **with its reason** (it shows the viewer's OWN stake, is gated on real money, and
   a "where the crowd is tipping" needle would misdescribe it) — and filed as a kit follow-up: the
   honest end state is one primitive with `needle` as a prop.

**⛔ What is NOT done, for both rows: production.** Pushing a branch does not deploy. Both drives
are RED against production right now — `qa:side-words` 20 RED, `qa:cold-start` 12 RED — which is
the re-derivation, not a regression. On merge run **both**; they must go green, and those runs are
what tick rows 1 and 2 to ☑.

**Next.** Row 3 (PV-13a, the `h-[42px]` eye toggle) is small and independent. Rows 9/10 still need
Ali's ruling / a Design commission before anyone starts them.

**RESUME AT (session 2) — 2026-09-03.** Branch **`pv10/side-words`** (⛔ not merged; every
production claim below is about the DEFECT, not the fix). Row 1 (PV-04) is code-complete and
guarded; rows 2–12 are untouched.

**What happened.** Re-derived PV-04 on production first, as §h demands — and the finding was
**twice the size filed**: eight render sites, not four. The four the record missed are the ones a
reader meets first (the 22px "you are picking" readout, the locked-pole tiles reading `YES 是`, the
dial knob, and a `role="img"` aria-label). All eight now go through the lexicon. Full write-up:
`PLAYER-VISUAL-2026-09.md` → PV-04 → "RE-DERIVED AND FIXED".

**What is proven, and how.** `npx tsc --noEmit` ✓ · `npm run build` ✓ · `test:labels` green with
new **§3b/§3c** · `red:labels` **12/12** · the twelve cross-cutting design guards from §h step 5 all
✓ · `qa:side-words` (new) driven on production **RED at 20 checks**, which is the re-derivation.
⛔ **The one thing NOT proven is the fix on production** — pushing a branch does not deploy. The
instant `main` carries it, run `npm run qa:side-words`; it must go **28/28 green**, and the same
run is the evidence for ticking row 1 to ☑.

**Two things worth more than the fix, for whoever writes the next guard.**
1. `test:labels` §3 was **ALL PASS over all eight defects**. It matches a *vocabulary of identifier
   names* (`side|outcome|status`); the variables are called `effectiveSide`, `s` and `lock`. ⭐ **A
   guard that reads the source's vocabulary cannot see a defect that renames its variable.** §3b
   judges a POSITION (a token typed where a person reads it); §3c keys on the **dictionary's own
   `{side}` placeholder**, which is the only signal that survives any renaming.
2. ⛔ **§3b was GREEN against the real defect twice before the RED proof forced it honest** — a JSX
   text run may close on `{` and not only `<`, and a blanked comment's ~200 columns of spaces push
   the run past the 160-char cap. *The guard was defeated by the length of the comment explaining
   the fix.* Write the mutation before you believe the check.

**Two things filed, not fixed — both need a ruling, neither is mine to take.**
- `legal/terms/page.tsx:301` renders `«所有注金——YES 与 NO——汇入同一资金池»` — the ASCII enum inside
  Chinese legal prose. Allowlisted **with its reason** (§b3 rules legal wording out of scope). 👤 Ali.
- `.mcardp-share` measured `scrollWidth 19 > clientWidth 13` at 390 on the similar-markets rail —
  found incidentally, outside this row's surface, so it was scoped OUT of `qa:side-words` rather
  than silently swept in. Belongs to whoever owns `.mcardp`; worth a look under row 4/5.

**Next.** Row 2 (PV-06, Up & Down cold-start) is the other HIGH and is independent of the merge.

**RESUME AT (session 1) — 2026-09-02.** Programme opened. The record
(`PLAYER-VISUAL-2026-09.md`) is complete: 255-cell matrix + ceremony + contrast + filter drives
done, 8 findings filed, 8 hypotheses overturned. **Nothing implemented yet** — every planner row
is `☐`. Start with row 1 (PV-04): it is HIGH, one file pair, `sideWord` already imported, and the
RED control is a two-line ZH/SW render assertion. Then row 2 (PV-06). Do not start rows 9/10
(Design/Ali) without a commission or a ruling. ⚠️ Re-derive every finding on production first —
the surface moves, and this record is a snapshot of `c1a6a5e2`.
