# ⏭️ NEXT SESSION — THE MATERIAL SYSTEM IS MERGED; THE ADOPTION IS 2 OF 31

**Rewritten 2026-08-07 at the close of session 35.** Sessions 34–35 merged the whole delivery
into `src/` and landed the first surfaces. What is left is **adoption**, not law.

> ⚠️ **TRACKER MOVED (2026-08-07, later the same day):** the outstanding items below were
> carried into `docs/ux-audit-2026-08/MASTER-PLAN.md` §6's **DA tracker**, which is now the
> ONE live tracker (one fact, one home). Work and tick items THERE. Status at handover:
> item 1 (toast) = DA-1 ✅ · item 3 (178 glyphs) = DA-2 ✅ (kit `GlyphSwap`, gate
> `test:glyph-motion`) · item 4 (E-112) = DA-3 ⚪ · item 5 (E-115) = DA-5 ⚪ (money rules) ·
> item 6 (ATOM J) = DA-6 ⚪. This file stays as the design session's context/instrument notes.

> ## Read this table before anything else
>
> | | state |
> |---|---|
> | §A tokens · §B 12 keyframes · §C 29 utilities | ✅ **merged, live, verified in the production bundle** |
> | §C utility classes **taken by a component** | ⚠️ **2 of 31** |
> | surfaces that have picked a rung | cards (rung 1) · kit `Modal` (rung 3) · money-in CTA (`.gilt-metal`) |
> | M1 one-sided lamps anywhere in `src/**` | **0**, over 6 stylesheets **+ 430 component files** |
> | `EXTEND.md` M1–M8 → `DESIGN_AUTHORITY.md` §M | ⚪ not done (ATOM J) |
>
> ⛔ **§A, §B and §C were DELETED from `docs/design-system/v2-2026-07-27/11-material/material.css`
> as they merged**, per that folder's own rule. Do not restore them from git to see what was
> delivered — in **four** places what shipped is deliberately not what the delivery said, and a
> diff would mislead. All four are recorded at the top of that file with the measurement behind
> them.

---

## THE PROMPT — copy from here

Continue the Claude Design material-system merge in `F:\kipindi-main` on branch `main`.
Production is https://50pick.tz, Railway project 50pick. **EVERY PUSH TO MAIN DEPLOYS LIVE.**

The loop: land one atom → commit → push → **wait for the deploy and verify on production** →
record the validation → next atom.

### ⛔ READ FIRST, IN THIS ORDER

1. `docs/design-system/README.md` — the index. **§0b says where a new design doc may go.**
2. `docs/LIVE-QA-CAMPAIGN.md` §6b — the **topmost** `RESUME AT` block.
3. `docs/design-system/v2-2026-07-27/11-material/README.md` — the STATUS table, then
   `material.css`'s header: where each merged section went and the four departures.
4. `docs/design-brief/INTAKE.md` **§2b** (the wash is a class per surface, never a redefinition
   of `--bg-elevated`), **§3b** (what DIES when each piece lands), **§4a** (the four-part exit
   gate), **§4b** (motion is physics), **§4c** (contrast is three instruments).

### ▶ WHAT IS LEFT, IN ORDER

1. **THE TOAST.** It paints `shadow-[var(--shadow-card)]` — **rung 1, where M2 puts a toast at
   rung 4.** All six variants set `bg-bg-elevated`, which is **already dead**: an inline
   `style={{ background: "var(--bg-elevated2)" }}` at `toast.tsx:357` overrides them. Each
   variant also hand-writes its own border colour, which is exactly what `.mat-tint-*` now
   composes — `.mat-toast` + `.mat-tint-no` says everything `.mat-edge-no` would have.
   ⭐ Direction of travel is safe: `--bg-elevated2` is a flat **26%**, above the 24% ink cap, so
   `--wash-float` makes the toast **darker** and contrast can only improve.
   ⛔ **Land E-114 in its own commit right after**: the VOID/refund toast uses
   `variant: "default"`, which paints `checkCircle` — **a confirmation tick over a returned
   stake**, three lines from the loss toast that was moved to `factual` for exactly that reason.
   ⚠️ The kit `.toast` CSS family (10 rules in `globals.css`) has **zero** consumers; sweep it
   with the adoption, not before.
2. **The rest of the rung families** — `.mat-float` (dropdown, popover, tooltip, select,
   avatar-menu), `.mat-inset` (wells), `.mat-flat` (form rows — flat is a RUNG, not a failure).
   ⚠️ **A surface taking `.mat-float` or `.mat-toast` MUST drop its own border**: those two
   rungs carry an outer 1px ring at 42% / 46%, and a 44% border outside it reads as one muddy
   2px edge. ⛔ **`.mat-modal` does NOT** — its cast carries only the inset `--edge-lit-strong`,
   so dropping the dialog's border would cost it its edge. Rung-specific, checked not assumed.
3. **The 178 glyphs (M5).** Four primitives exist and **no glyph uses one**. 107 of the 178 keys
   are referenced, ~71 dead. Triggers are mount / data change / state change — ⛔ **never hover.**
4. **E-112** — the five Up & Down stake chips render **26px** against the platform's own **40px**
   money-control floor, in all three languages at 360, and they choose how much a player stakes.
   ⛔ Fix with the control-height tokens, not per-component: `chipBase` in
   `updown-stake-controls.tsx:86-88` is padding-sized with **no height property at all** and is a
   **fourth** independent chip implementation. `globals.css:200-213` already schedules the bump
   (`--h-control-sm` 30→40, `-md` 38→44, `-lg` 46→48) and notes **148 call sites including admin**.
   ⚠️ The chip VALUES come from live config, not the code default — `quickStakes(min,max)` derives
   them, the code default `minStake` is 1,000 while the live global is 500. **A code default is
   not a live setting.**
5. **E-115 — ⛔ THE MONEY ATOM. ISOLATE IT.** The long-form win celebration headlines a
   place-time projection from `localStorage` and **infers** the win from the round outcome instead
   of reading the position row. Ali authorised fixing it. It crosses into `src/lib/server/`, so:
   its own commit, verified **against the LEDGER, not a screenshot**, and a fresh money census is
   owed at that point. `.gilt-ink` belongs to this surface (M4: money is mono, tabular, never
   letter-spaced).
6. **ATOM J — M1–M8 into `docs/DESIGN_AUTHORITY.md` as section M**, in the authority's voice, in
   the same commit as the last code that proves them. Then delete `EXTEND.md` and §D.
   ⚠️ **M6 MUST BE WRITTEN WITH THREE GATES.** The delivery's text names two;
   `theme-provider.tsx:43` writes a third, `data-motion="reduced"`, for low-end Android — our
   target device (E-125).

### ⚪ FILED, NOT SWEPT — each has a written reason

- **E-128** — five dead `win-*` classes remain. ⛔ `badge-seal-rays` is REUSED by §C's
  `.seal-sheen`; do not delete it. Entangles `.badge-unlock-*`, which shares `celebrate-pop`.
- **E-132** — `--bg-elevated2` is a flat 26%, above the 24% ink cap, and rung 2 supersedes it.
  Three consumers: `toast.tsx:357`, `avatar-menu.tsx:101`, `page.tsx:384`. The toast atom retires
  the first.
- `share-button.tsx` — a hand-rolled overlay with its own scrim, `bg-bg-elevated` and
  `shadow-e5`; not the kit `Modal` at all. `test:ui-consistency` misses it because it is a fixed
  div rather than a portal.
- `cashback-promo.tsx` and the second wallet panel carry **byte-identical** background, border and
  boxShadow — one recipe in two files.

### 🔴 OWED EVIDENCE, AND WHY IT IS NOT A GAP IN THE WORK

The kit `Modal`'s **rendered** photograph. Its CSS is verified in the shipped bundle, but no
driver can reach an instance today, and every route was measured rather than assumed:
`market-card.tsx`'s how-it-works is `{live && …}` and the board holds resolved markets ·
`first-visit-primer.tsx:226` **deliberately hides from Playwright** by user-agent ·
bet-confirm / sell-confirm / win-celebration need a money action · `share-button` is not the kit
Modal. Same shape as the chat surfaces: the CSS is live, the photograph is owed the day the state
exists. **An open market on the board would close it** — that is operator state on a board shared
with another operator, so it needs Ali.

### 🔧 THE INSTRUMENTS — and three of them grew this session

```
npm run build && npm run qa:bundle-css      # the SHIPPED bundle. For a CSS atom the source is
npm run qa:bundle-css -- --live             #   not evidence. `--live` reads production's own
                                            #   stylesheets AND the served MARKUP, and is the
                                            #   deploy detector — there is no commit-SHA endpoint.
                                            #   ⛔ Add your atom's expectations to its EXPECT list.
npm run test:reduce-motion                  # M6's THREE gates + the comment-close trap · 12 checks
npm run red:reduce-motion                   #   12/12, every mutation on a COPY
npm run test:keyframes                      # one name one definition; the shimmer-gilt layer rule
npm run red:keyframes                       #   7/7
npm run test:m1-light                       # 0 lamps over 6 stylesheets + 430 COMPONENT files
npm run red:m1-light                        #   8/8, incl. a must-stay-GREEN mutation
npm run test:contrast                       # 57 checks over FOUR sheets (motion.css is one now)
npm run red:contrast                        #   23/23
npm run qa:calm                             # production, all three reduce gates, 4 widths x 3 locales
npm run qa:material-probe  <surfaces>       # 4x corner crops + computed geometry
npm run qa:material-preview                 # LOOK BEFORE YOU SHIP — injects into a real prod page
npm run qa:sweep / qa:win-popup             # layout sweeps
```

⚠️ `qa:contrast-rendered` and `qa:material-preview` need **PowerShell**, not Git Bash (MSYS
mangles `ONLY=` / `--route=`). `test:motion-ladder` and `test:crest-legibility` need the repo root.
`test:responsive` / `test:motion` need a live `:3000`. `npm run qa` does not exist.

### ⛔ STANDING RULES THAT HAVE ALL COST SOMETHING

- **TWO SESSIONS SHARE THIS TREE.** `git add <path>`, **never `git add -A`**; check
  `git branch --show-current` before every commit. `docs/ux-audit-2026-08/` is the other
  session's — leave it.
- ⛔ **Never write a glob or starred path inside a block comment.** A star-slash closes it. In CSS
  the browser then drops the whole rule **silently** (E-127 — it deleted the rule its own commit
  existed to add); in JS it is a parse error. `test:reduce-motion` rule 0.1 gates the CSS case.
- ⛔ **Never build a tracker string with `node -e "…"` containing backticks** — bash
  command-substitutes them and eats the content. Write the text to a file and read it in.
- **Re-grep finding ids at the moment you file. `E-132` is the last one taken.**
- ⛔ `src/lib/updown-pricing.ts` and `updown-movement.ts` stay untouched — money and gate logic.
- 🔴 The support chat is **switched off in production**, so its four probe surfaces cannot be
  reached. Their CSS is live; the shots are owed the day the switch flips.

### ⭐ THE ONE LESSON THIS SESSION WOULD SEND BACK

**Three corpora were each smaller than the claim made on them, and every one of them was
printing a green number.** `test:contrast` could not see the money CTA, because §C put a control
in `motion.css` and the gate read three sheets. `test:m1-light` printed *"THE M1 SWEEP IS
COMPLETE"* while reading **no component files** — there were seven one-sided lamps in `.tsx`
inline styles, four of them pure white, on the persistent chrome and the wallet. And **both** RED
harnesses carried their own copies of the file list: `red:contrast` went from **21/21 caught to
0/21** in the single edit that added a sheet, which is indistinguishable from "the gate stopped
working". `scripts/contrast-corpus.mjs` and `scripts/m1-corpus.mjs` are the one-definition fixes.

⚠️ And twice a gate was **right by accident**. `test:m1-light` flagged seven real lamps but would
have flagged the fixes identically, because a JSX value is a JS string and the leading quote
parsed as a geometry token. That earned the harness a third mutation kind — **`green`**, a
compliant mutation the gate must stay silent on — because a harness made only of failures cannot
catch a gate that condemns working code, and that is the direction that sends the next session to
un-fix something right.

**So: before trusting a green, ask what the check READ, not just what it said.** And for anything
compiled, read the artefact — `qa:bundle-css`.
