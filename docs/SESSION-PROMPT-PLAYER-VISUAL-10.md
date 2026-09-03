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

- **`src/components/layout/detail-layout.tsx`** (PV-03) — *the* narrow-detail-page template.
  Every future single-column detail page adopts it. ⛔ A later session must never write a second
  narrow-page fix; if a page is narrow, it takes `<DetailLayout>`.
- **`src/components/brand/decor-mark.tsx`** (PV-01, *if* Ali rules to contain the mark) — *the*
  decorative-mark primitive, carrying the §M8 clear-space rule once. Every hero backdrop uses it.
- **`test:motion-timing`** (PV-14) — *the* timing-correctness gate. It is the one place a
  duration is checked against its distance; no second timing check is added beside it.

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
| **a LOCAL server to look at a change on** | `npx next dev -p 3100` + `POST /api/dev-test/updown-seed` → `/updown-advance` → `/stress-bulk-bet` | row 2 | ⛔ `next start` REFUSES to boot without `DATABASE_URL` (a deliberate production guard in `store.ts` — do not defeat it); `next dev` uses the in-memory store. This is how the visual gate is met while the fix is on a branch. `BASE=http://localhost:3100` also runs `test:responsive` and `test:motion`, which otherwise fail locally for want of a server. |

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
`test:keyframes` · `test:needle` — extend `test:needle`'s `--m-pivot` population to
`conviction-dial.tsx`, and add **`test:motion-timing`** (PV-14): the timing-correctness guard
lens 14 found missing — it fails a bare `ms`/bare cubic-bezier outside `motion.css`, and (the
harder half) flags a duration a rung or more from its measured travel distance.

## g · THE PROGRESS PLANNER

States: `☐ not started` · `◐ in progress` · `⧗ blocked (why)` · `✎ awaiting Claude Design` ·
`👤 Ali` · `☑ done · pushed · verified on production`.

| # | Item | Lens | Owner | State | Definition site | Guard | Commit | Evidence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | PV-04 · side words via `sideWord` at **all 8** commit surfaces | 3,6 | Code | ◐ | `side-picker.tsx:140,148` · `conviction-dial.tsx:1099,1124,1398,1419,1643,1660` | `test:labels` **§3b+§3c** · `qa:side-words` | *pending* | `.qa-shots/pv04/` | **Re-derived live: it was EIGHT sites, not 4** (20 RED). Code + guards DONE; `red:labels` 12/12. ⧗ **production re-verification blocked on Ali's merge** — the branch does not deploy |
| 2 | PV-06 · Up & Down cold-start — **and the second + third split bar deleted** | 1,3,11 | Code | ◐ | `updown-board.ts` → `pricedYesPct`; `updown-card.tsx` + `updown/[roundId]/page.tsx` → `<TippingBar>` | `test:ui-consistency` **hand-rolled-split-bar** · `qa:cold-start` | *pending* | `.qa-shots/pv06/` | **The defect was a SECOND BAR, not a missing gate.** `red:split-bar` 2/2; `qa:cold-start` **32/32 green local / 12 RED prod**; `test:motion` 43/0. ⧗ **production re-verification blocked on Ali's merge** |
| 3 | PV-13a · eye toggle off `h-[42px]` | 13 | Code | ☐ | `top-app-bar.tsx` | `test:tap-target` + new rung check | — | — | §K1 |
| 4 | PV-13b · `mcardp-info` → 44 | 13 | Code | ☐ | `globals.css .mcardp-info` | `test:design-frozen` | — | — | — |
| 5 | PV-13c · one chip height per size | 13 | Code+Design | ☐ | `chip.tsx` + `globals.css` | `test:chip-contract` | — | — | which sizes = Design |
| 6 | PV-10 · `@pct%` suffix contrast | 6 | Code | ☐ | `market-card.tsx:429-432` · `side-picker.tsx:140,148` | `test:contrast` | — | — | confirm guard population first |
| 7 | PV-14 · timing off `duration-150`/bare curves | 14 | Code | ☐ | Input atom + kit | new `test:motion-timing` | — | — | build the guard first |
| 8 | PV-03 · `<DetailLayout>` template | 3,5,10 | Code+Design | ☐ | new `detail-layout.tsx` | `responsive-audit.mjs` | — | — | deposit + positions-empty |
| 9 | PV-01 · `<DecorMark>` clear-space (or keep) | 4,5 | 👤 Ali → Design | ☐ | new `decor-mark.tsx` | `--m-pivot`/clear-space | — | — | keep-as-backdrop is live |
| 10 | PV-05 · dial weight + term unification | 5,9,13 | ✎ Design | ☐ | handover | visual | — | — | commission §d |
| 11 | Lens 12 · finish the `/markets` filter-correctness drive | 12 | Code | ☐ | — | `test:board-discovery` + `qa:filter-scan` | — | — | §5 of the record — count-vs-rendered, URL state, monotonicity |
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
