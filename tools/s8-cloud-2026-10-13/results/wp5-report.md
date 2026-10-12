# S8 WP5 — the kit additions: report

**Branch** `vodacom-s8-wp5`, cut from `origin/vodacom-s8-wp0-draft` `bbbf2cb7`. **One commit:** `5c9a653c5`
"Vodacom S8 WP5: the kit additions - Input grouped and attention, size xl, and the bet sheet's own disabled gold".
Built to S8-PLAN WP5, as amended by A15, A16, A18 and A24. Machine: fresh Linux cloud VM, Node v24.21.0 (SHA256-checked),
`npm ci`, `npx prisma generate`. No server, no browser and no production access were used.

## What was built, file by file

- **`src/components/ui/input.tsx`** — three props. Each is inert unless set.
  - **`grouped`**: a whole-number box that shows thousands groups while you type ("5,000"). Whatever the box
    declares, it is numeric, whole and non-negative, and it opens the numeric keypad.
    - Every change is carried from the shown text into digits, read by the unchanged `numericStep`, and carried back.
      Only the box's own separators are taken out. What arrived reaches `numericStep` as it arrived, so the paste rules
      stay the same: "9 500,00" keeps 9500, and "12,500.00" keeps 12500 and owes the dot's line.
    - The caret is mapped by digit index. A refused dot's hold is kept in digit coordinates.
    - The cap is 9 digits (`GROUPED_MAX_DIGITS`). A change past it is **refused whole**, never cut to nine digits,
      because cutting would change the number's size (vb6's rule).
    - Leading zeros are dropped ("0500" holds 500).
    - The caller reads digits: `readsDigits` swaps the element to its digits for the caller's `onChange`, then hands it
      back its grouped text and caret before React compares.
    - A grouped box with a `name` gives that name to a hidden field that carries the digits, so a form posts "12500".
    - New exports: `groupedText`, `groupedDigits`, `groupedStep`, `groupedBox`, `readsDigits`, `GROUPED_MAX_DIGITS`.
      `groupedBox` implements the `NumericBox` interface, so the Input's five existing handlers drive it unchanged.
  - **`attention`**: the strong neutral edge `--input-attention`.
    - It gives way to an error and to a locked box. It never paints red, gold or NO ink.
    - It sets **no `aria-invalid`** (A15 item 3, A18 item 3). The caller's `aria-describedby` passes through as before.
  - **`size="xl"`** (A18 item 4): the box reads `--h-control-xl` (56px), the figure `--type-h2` (24px) and the
    prefix/trailing unit `--type-h4` (17px).
  - **How the new props reach the page**: all three read their tokens as the element's own `style`, applied only when
    set. The first draft used Tailwind arbitrary classes. That would have added four new utility rules to the
    stylesheet every page loads, which breaks the "one token, one scoped rule" CSS budget, so I took them out.
  - The `sm 36` comment on `size` was stale (sm is 40 since DG-A-04) and is corrected.
- **`src/app/globals.css`**:
  - the token `--input-attention: oklch(78% 0.06 268)`, declared beside `--border-control` (the control-edge family),
    with its invariant comment;
  - the one rule `.kp-bsheet .btn-gold:disabled { opacity: 1; background: oklch(28% 0.12 268); color:
    var(--text-subtle); border-color: var(--border); box-shadow: none }`, scoped and commented. `.btn:disabled` is
    unchanged.
- **`scripts/numeric-input.test.mts`** (test:numeric):
  - the grouped box driven key by key: 9 judges and 12 plants, plus an ungrouped control with its plant;
  - the **A15 census**: every `<Input` call site in src/, with comments stripped first. That is 174 classic sites in
    53 files, 267 configurations, each rendered with `renderToStaticMarkup` alone and inside a Field (534 renders).
    The kit before WP5 (blob `c8be959a`, content-addressed; the kit at origin/main `5da3db0f`, unchanged to S8's base)
    and the kit now render them **byte-equal**. 4 plants: a stray `aria-invalid="false"` while `attention` is unset;
    the grouped path without its prop; the attention edge without its prop; the xl figure leaking onto another size.
  - set-path judges: 5 judges and 7 plants covering grouped controlled and uncontrolled, attention, attention under an
    error, and xl.
  - Call sites that set a WP5 prop are counted and named as "new path", never rendered against the old kit (today: 0).
- **`scripts/contrast-audit.mts`**: two pairs.
  - `--input-attention` on `--bg-inset`: **10.04** (need 3.0, non-text).
  - The plate's words on its navy fill: **5.57** (need 4.5).
  - The gate refuses a scoped rule that drops `opacity: 1`. Without it, `.btn:disabled`'s 0.45 would dim plate and
    words together, which the gate does not model.
- **`scripts/contrast-audit-red.mjs`**: 4 plants (the edge darkened, the words darkened, the plate lightened, the
  opacity dropped).
- **`scripts/visual-pass-r5c.test.mts`**: globals.css's registered gold-use count goes from 92 to 93, with the ruling
  written beside it. The census counts the `.btn-gold` selector of the scoped rule. The rule removes gold from the
  button, it is ruled by §0g design call 4, and it is scoped by Open point 20. The census's own message asks for
  exactly this ("must be RULED, then registered with its reason").

## Gates (final run on `5c9a653c5`, Node 24)

Every suite whose script reads `ui/input`, `input.tsx` or `globals.css` was run: 82 `test:*`, plus test:guards-exist,
test:orphans, test:docs and typecheck. `test:responsive`, `test:lifecycle-e2e` and `test:mixed-flow` need a server and
were not run. The same list was run first on the untouched base in a separate worktree.

| Gate | Exit | Summary line |
|---|---|---|
| test:numeric | 0 | `numeric-input: 140 passed, 0 failed` (base: 98) |
| test:contrast | 0 | `contrast-audit: 129 checks · 0 gate failure(s)` |
| red:contrast (alone) | 0 | `RED HARNESS (contrast) — 33/33 caught · 4 sheet(s) untouched` (base 29/29) |
| test:tokens | 0 | `ALL PASS — 6 css files, 49 guarded tokens` |
| test:design-frozen | 0 | `PASS — design primitives are frozen` |
| test:ui-consistency | 0 | `ALL PASS — no new UI-consistency drift beyond the tracked baseline.` |
| test:gold-is-money | 0 | `gold-is-money: OK — identity is metallic, money is gold, and the two do not overlap.` |
| test:betting-ink | 0 | `ALL PASS — 35 passed, 0 failed` |
| test:visual-pass-r5c | 0 | `visual-pass-r5c: 93 passed, 0 failed` (after the registration above) |
| typecheck | 0 | (clean) |
| test:guards-exist | 0 | `GUARDS EXIST: 9 passed, 0 failed` |
| test:docs | 0 | `✅ every reference in docs/ resolves.` |
| **test:dead-css** | **1** | `FAIL 1.1 ⭐ nothing renders these and they are not on the baseline (baseline 47, may only SHRINK)` — `.kp-bsheet  src/app/globals.css:1446` — **WP5's, see below** |
| **test:orphans** | **1** | `🔴 2 UNDECLARED orphan(s)`: `scripts/qa/landing-v3/panels/band-panel.js`, `hero-panel.js` — **pre-existing, red on the base too** (not mine) |

The other 72 suites in the list all exit 0. These are test:client-graph-safe, css-vars-defined, type-scale, bridge,
integrity, stacking, tap-target, design-one-door, money-format, spacing-scale, measure, keyframes, reduce-motion,
m1-light, motion-ladder, chip-contract, density-contract, eyebrow-roles, every visual-pass-r3c…r10 in the list,
journey-shell, journey-home, journey-account, journey-tickets, offline-neutral, sell-grace-truth, and the rest. The
TSVs are kept on the VM; I can re-run any of them on request.

**Red twins** of those suites, each run alone after the commit, each followed by a `git diff` check that came back
clean every time:
- sell-grace-truth 156/156
- journey-shell 208/208
- journey-home 243/243
- journey-account 61/61
- journey-tickets 112/112
- offline-neutral 35/35
- visual-pass-r4k 17/17
- deposit-phone 7/7
- phone-normalize 56 proofs
- tz-msisdn 46 proofs
- contrast 33/33
- m1-light 8/8
- tokens 3/3
- reduce-motion 12/12
- hero-copy 29 caught
- density-contract 5/5
- contacts-form, chain-purge and money-format: complete
- css-vars-defined and filter-language: OK

Two exceptions:
- **red:keyframes 6/7**: `MISSED: move mark-breathe's definition INTO the calm branch … (second anchor missing)`.
  It is the same 6/7 on the untouched base, so it is **pre-existing**, not mine.
- **red:journey-header-fit**: exit 2, `PREMISE ABSENT`. It needs `KP_BASE` and a live server, so it was not run.

**Skipped by instruction:** the parity gate (`qa:classic-shell-parity` v4 `--compare`) needs WP1, so the coordinator
runs it on the integrated tip. A15 also removes it from WP5's gates.

## The one red that is WP5's: test:dead-css 1.1

`.kp-bsheet .btn-gold:disabled` is the rule the plan gives WP5. Nothing renders `.kp-bsheet` until WP6 draws the sheet.
The ratchet says "Delete the rule, or wire it up — do not add it to BASELINE". I did not grow the baseline, and I did
not plant a fake consumer. The red clears on the first WP6 commit that renders `kp-bsheet`.
- **Candidate amendment:** land WP5 together with WP6 (or before WP6 in one release), or move the scoped rule and its
  two contrast pairs into WP6. Either way, add test:dead-css to WP5's gate list as "red until WP6".

## Served bytes for a classic viewer

- **JS, on the pages that draw a kit Input** (deposit, withdraw, profile, limits, admin): the Input module grows from
  9,882 to 12,717 B minified (+2,835 B), and from 4,271 to 5,254 B gzipped (+983 B). I measured this as an esbuild
  minify of the module alone; Next's chunking will differ slightly. **Output is unchanged**: the A15 census proves 267
  configurations byte-equal, alone and inside a Field. One `useState` and one `useRef` are added per Input; neither
  renders anything.
- **CSS:** exactly one token, `--input-attention:oklch(78% 0.06 268);` (38 B minified), and one scoped rule,
  `.kp-bsheet .btn-gold:disabled{…}` (139 B minified). It matches nothing on a classic page. No Tailwind utility was
  added, because the new props read their tokens through inline style, and only when set.
- **HTML:** none.

## Calls taken under delegation (each with its overrule)

1. **The 9-digit cap refuses a change whole** instead of cutting it: a pasted 10-digit number leaves the box as it was,
   silently, like `maxLength`. *Overrule:* truncate to nine digits, or refuse with a line in the Field. The line would
   need new dictionary words, which is WP4's.
2. **The new props read their tokens as inline style**, not as Tailwind arbitrary classes, to keep the CSS budget to
   one token and one rule. *Overrule:* classes reading the same tokens, which adds about four utilities to the global
   stylesheet.
3. **xl's unit cell is `--type-h4` (17px)**. The canvas drew "TZS" at 18px, and 17px is the nearest token rung. It is
   one more drift for Open point 40. *Overrule:* the figure's own 24px, or Tailwind's `title-sm` 18px, which carries
   letter-spacing.
4. **Attention gives way to an error and to a locked box** (red edge and `aria-invalid="true"` win). *Overrule:* draw
   attention over a locked box.
5. **A grouped box posts its digits through a hidden field** that carries its `name`. The visible box loses the name.
   *Overrule:* no hidden field; a caller in a form strips the commas itself.
6. **Grouped ignores `allowDecimal`, `allowNegative` and `type="tel"`**: it is always a whole, non-negative number.

## Where the plan and the code disagreed

- **WP5's Files did not list two suites the change trips.** test:visual-pass-r5c (the `.btn-gold` selector census) was
  registered openly, as described above. test:dead-css 1.1 is left red, as described above. Both belong in WP5's Gates
  under A16's rule.
- **The Summary (c) budget, "one token is added", predates A18's `xl`.** With classes, `xl` and `attention` would have
  added Tailwind utilities to the stylesheet. I kept the budget by using inline token reads.
- **WP5 step 1 says "shows the value through `formatNumber`"** — and it does, through `groupedText`. "Keeps the field's
  value as digits" is read as: what the caller and a form read is the digits.
- **The comment at `input.tsx` on `size` said `sm 36`**, which has been stale since DG-A-04; it is corrected.

## Left undone, and why

- The parity v4 `--compare` run: it needs WP1 (skipped by instruction).
- The served-bytes figure is measured on the module alone, not on a production build. A `next build` was not run.
- Browser drives were not run: WP5 mounts nothing, and the grouped box's DOM behaviour, the caret after React's commit,
  is WP6's and WP11's to drive. In process, `groupedBox` is driven key by key and `readsDigits` is checked on a stand-in
  element.
