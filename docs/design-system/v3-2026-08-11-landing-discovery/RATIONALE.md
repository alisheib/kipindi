# RATIONALE.md

## The page has a rhythm problem, not a components problem

Seven sections, an identical 80px gap between every one, `padding: 0` on all of them, and a
transparent background under the lot. That is a page with no opinion about what matters. Everything
else on the findings list is downstream of it: the topic band gets skipped because nothing tells the
eye it has arrived somewhere new, and "How it works" reads as a footnote because it is spaced
exactly like the promo box above it.

So the first move is a scale — 24 / 48 / 96 / 144 — and the second is to let **surface** carry the
biggest breaks. Two bands, both `--bg-overlay`, at the two chapter joints. The observed section
gaps now run 144 · 96 · 48 · 96 · 144. Nothing was added to the page to achieve that; the same
sections are simply told how related they are.

## The hero should prove the product, not describe it

Hero A takes your steer: one real live market card, at shipping size, beside the headline. It is
proof the thing works, it teaches the mechanic in a glance, and it is automatically local because
the market itself is. Behind it, the brand mark at 880px, rotated to its own −14° needle axis at
`--hero-mark-opacity`. It is the YES/NO dial, it costs nothing, and it means the F1 photograph
leaves without a replacement being commissioned.

I have built the alternative too, because I am not certain (`07-hero-alternative.html`). Hero B
sets the open **questions** as the hero — Simba, Arusha, the shilling, the SGR — as editorial type
with their prices in gilt. It is a stronger answer to *nothing anchors this page to Tanzania* (A12),
and it scales with the catalogue rather than depending on one card being interesting today. Its
cost is real: it teaches the subject before it teaches the mechanic, and it needs a new component.
A is the recommendation; B is the one worth arguing about.

## The zeros move, they do not get replaced with adjectives

`0 MARKETS SETTLED / TZS 0 PAID OUT` is deleted. `41 live · TZS 1,669,000 in play · 6 close today`
takes the job — **in the hero**, not 4,900px down. A number whose purpose is to prove the platform
is alive is worthless below the fold, and `/markets` was already computing it in 11px mono in a
corner. Written out in full, not as `1669k`: it is a bigger number to a reader and costs four
characters.

The slot the zero band vacated now carries trust — named sources, two signatures, M-Pesa — because
that is what a visitor needs at the bottom of the page. No regulated copy was touched; the footer is
`public-footer.tsx` verbatim, licence stub and all.

## What I deliberately did not do

**I did not make the header transparent over the hero.** It would look better in a screenshot. But
the bug in `BUG-nav-overlap-1440.jpg` is not a tuning problem — a translucent bar over a scrolling
board of conviction bars cannot be made legible by raising the mix percentage, only less bad. One
opaque bar, one border, at every scroll position.

**I did not add a section.** The inventory is the same seven ideas. Up &amp; Down moved below the
grid and got a 920px cap, which is the entire fix for its 500px hole — the hole exists because a
two-item flex row was allowed to span 1232px.

**I did not touch the card, the bar, the buttons or the palette,** including where I disagree.
Where I disagree, it is in `OPEN-QUESTIONS.md`.

**I did not rewrite copy outside the scope you set.** "How it works" is rewritten, because A6 puts
it in scope and its live text is lifted from a spec document — *"signed off by an officer — or two,
when two-admin authorization is enabled"* is not a sentence for a visitor. Section headings changed.
Everything else, including the headline, is yours verbatim.

## The argument you can disagree with

The best writing on the site is in a modal that most people close without reading (A1). I have taken
**"Predict events. Not chance."** and its paragraph out of that modal and made them the heading and
lede of the how-it-works band. If that copy is meant to stay a first-run experience, this is the
change to reject — and then the band needs a heading written for it, because the one it has now is
not doing the job.
