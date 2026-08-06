# What is wrong today — the critique, with evidence

Written by the engineer who has been driving this product on production. Blunt on purpose:
external consultants told the owner it *"doesn't look like a million-dollar system"* and were
right, but not specific enough to act on. This is the specific version.

Every claim below is from a production screenshot in `shots/`, not from a mockup.

---

## The one-line diagnosis

**It is not the motion. It is the material.**

The motion vocabulary is disciplined — one signature easing, one hover displacement, one press
scale, a six-step duration ladder. That is more rigour than most production apps have.

**But nothing in the product has a light source.** Every surface is flat colour on flat colour.
Gold is a fill, not a metal. Cards are all on the same plane. That absence is what reads as
cheap, and no amount of added animation will cover it.

---

## 1 · The win celebration — `shots/win-celebration-en-1280.png`

This is the most screenshot-able screen in the product and it is the weakest.

| # | Problem |
|---|---|
| **1** | **The rays are eight straight lines.** No light source, no falloff, no bloom — strokes at angles. It is a child's-drawing sun and it reads as unfinished from across the room. |
| **2** | **"Won! · Congratulations" is placeholder-grade copy** — two separate strings joined by a middot, saying the same thing twice. It is the loudest text after the amount, so the first thing read is redundancy. |
| **3** | **Four type treatments in a 200px column** — bold sans, *italic*, letter-spaced mono, small mono, italic again. Not a hierarchy; a sample sheet. |
| **4** | **The close `×` is the loudest element in the frame** (bright focus ring, top-right). On a celebration the eye lands on the dismiss control first. |
| **5** | **The amount reads like a serial number.** `TZS 3,470` in letter-spaced mono is the treatment you would give a transaction ID. Money should have weight. |
| **6** | **Nothing has material.** Flat gold ring, flat gold button, flat card, one 2px gold edge line. |

**What is right and must survive:** the information is complete and correct — realised payout,
net, side, game. The backdrop blur is good. Gold-means-earned-money is correctly applied. It
works in all three languages (`shots/win-celebration-sw-360.png`, `-zh-360.png`).

**So the substance is right and the surface is failing it.**

---

## 2 · The podium — `shots/podium-and-avatars.png`

- **The podium does not podium.** #1 is barely larger than #2/#3 and sits ~26px higher. No
  stage, no elevation, no light. A podium's entire job is hierarchy you can feel.
- **The crown on #1 is a tiny outline mark** — reads as a placeholder.
- **Three flat circles on a flat panel.** The panel shares its background with everything else,
  so the "hero" area is not a surface at all.

## 3 · The identity system is invisible — `components/identity-avatar.tsx`

⭐ **The most surprising finding.** This is not a missing feature; it is a dial turned to zero.

The product has a **generative heraldic crest** system: four crest kinds, deterministic PRNG per
seed, gilt chief with pips, radial gradients, tier rings, dependency-free SVG that renders on the
server. Real work.

It renders today with the gilt chief at **`opacity="0.16"`** over a **`strokeWidth="0.8"`** line.
At the 56px the podium uses, that is sub-pixel. **The identity system was designed, built, and
then dialled below the threshold of visibility.** What ships looks like initials in a circle.

## 4 · The board card — `shots/board-card-settled.png`

- **The biggest element on a settled card is a dead timer.** `ROUND SETTLED 00:00` in 28px mono
  dominates; the actual news — `↘ Down wins` — is a small text row beneath it. **The hierarchy is
  inverted: the card leads with nothing-happened and buries what-happened.**
- The up/down split bar is two flat colours, no texture, no depth, no motion.
- The asset mark is small, flat and monochrome.

## 5 · The icons — `components/glyphs-excerpt.tsx`

**185 icons. Zero animation.** Grepping the file for `animate|transition|keyframes` returns **0**.
In a product whose signature easing is literally named *settle*, not one icon settles. No state
morphs, no draw-in, no directional emphasis on the up/down arrows that are the core of the game.

---

## What "million-dollar" is actually made of

Four things, and this product has the fourth only:

1. **Light** — a decided, consistent light source. *(absent)*
2. **Elevation** — surfaces on different planes that catch it. *(absent)*
3. **Weight** — motion with mass, not just fades and slides. *(partly — the easing exists, the mass does not)*
4. **Discipline** — one theme, one type scale, semantic colour. *(present, and strong)*

The fix is (1) and (2). Once surfaces catch light, the celebration, the podium, the crest and the
cards all improve without being redesigned individually.

---

## The trap we would like avoided

The design law bans confetti and casino language, and it is **correct** to. But that rule was
answered with *flatness* rather than with *better material* — and flat is not the same as
restrained.

**Apple Wallet is extremely restrained and feels expensive.** That is the target: restraint with
material, not restraint as absence.
