# FROZEN — do not change any of this

Read this before `BRIEF.md`. It exists because a previous design round changed things it should not
have changed.

**Everything listed here was designed by our designer, reviewed, and signed off. It is in production.
It is not up for redesign, not on the landing page, not on the markets page, not anywhere.**

If something in this list looks wrong to you, put it in `OPEN-QUESTIONS.md` and carry on using it
as-is. Do not "improve" it in the deliverable. A proposal we can read and reject costs us nothing.
A silent change costs us a whole round.

---

## 1. The colour palette — every token, every value

**All colour tokens are locked.** Use `04-design-system/tokens-LOCKED.css` verbatim.

You may not:

- change any colour value, including "slightly"
- add a new colour token
- introduce a new accent, tint, shade or gradient colour
- convert colours to a different colour space
- "consolidate", "harmonise" or "de-duplicate" tokens
- change which colour is used for which semantic role

You may:

- use any existing token in a new place
- use existing tokens at different opacities where the codebase already does so

**There is no `TOKEN-DIFF` deliverable in this round.** If you find yourself writing one, stop.

## 2. The market card

The market card is final. All of it:

- layout and internal structure
- the LIVE / HOT / CLOSED / category chips
- the question treatment
- the big YES percentage and its subscript `%`
- the predictor avatar stack
- the pool figure, comment count, and time-left row
- the info button and the `Details ›` link
- the category watermark glyph
- card border, radius, background and hover state
- the closed state and the "Waiting for results" treatment

See `01-approved-design/screens/APPROVED-market-card-*.jpg` and
`01-approved-design/market-card.tsx`.

**You will use the market card as-is, as a black box.** You may decide *how many* appear, in what
grid, in what order, with what heading above them. You may not touch what is inside one.

## 3. The conviction bar / progress bars

The green-to-red track with the gold needle is locked — its height, its colours, its gradient, its
needle, its glow, its animation. Same for every stepped/progress bar in the product.

See `01-approved-design/screens/APPROVED-conviction-bar.jpg` and
`04-design-system/needle.css`.

## 4. The YES / NO buttons

Locked. Their colour, their fill, their size, their radius, their label format (`YES @ 99%`), their
side-by-side arrangement.

We are aware of the accessibility argument about red/green pairs. **It has been considered and
declined for this round.** Do not raise it in the deliverable and do not work around it.

## 5. Typography families

Sora (display), Inter (body), JetBrains Mono (numbers and labels). No new fonts. No swapping which
family does which job.

Font *sizes* and *weights* in new landing-page composition are yours to choose — but they must come
from what the codebase already uses, and they must not change inside any frozen component.

## 6. Brand

The mark, the lockups, the wordmark, the favicon and the app tile are final. Files in `03-brand/`.
Use them; do not redraw them, recolour them, or produce variants.

## 7. Existing component library

These ship today and are not being redesigned. Use them:

`market-card` · `side-picker` · `conviction-dial` / needle · `countdown` · `probability-bar` ·
`stepped-progress` · `circular-progress` · `watch-star` · `share-button` · `chart-toggle` ·
`price-chart` · `probability-chart` · `bottom-nav` · `live-ticker` · `public-footer` ·
`wallet-balance-pill` · `avatar-menu`

---

## The one-line test

Before you put anything in the deliverable, ask: **"could an engineer implement this without editing
`market-card.tsx`, `side-picker.tsx`, `needle.css`, or any colour token?"**

If the answer is no, it is out of scope. Move it to `OPEN-QUESTIONS.md`.
