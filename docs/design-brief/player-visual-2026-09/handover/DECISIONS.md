# DECISIONS — PV-05 / row 10

> The bounded handover §d commissions. **Part 2 (the commit-sequence motion spec) is DELIVERED**
> — [`MOTION.md`](MOTION.md), with its mechanical gate run and passing in
> [`TOKENS-USED.md`](TOKENS-USED.md). **Part 1 (the dial's visual weight) is NOT, and this file
> says exactly why and exactly what would close it.**

---

## 1 · What was decided, and on what evidence

| # | Decision | Evidence |
|---|---|---|
| D1 | **The commit sequence's timing is CORRECT as it ships.** Four of five beats already name the right rung for their real travel distance; the spec documents them rather than changing them. | Read out of `motion.css` / `globals.css`, beat by beat — see MOTION.md §2 |
| D2 | **`--m-pivot` on the result crest was a real breach and is fixed.** `orm-pop` now takes `--m-settle`. | §M8 reserves the pivot for the needle and dials; the keyframe already overshoots 1.06 at 60%, so a second overshoot was never intended. `motion.css` had named this in prose since 2026-08-21 |
| D3 | **The reservation is now a GUARD, not a comment.** `test:motion-ladder` §4, RED-proven. | Nothing in the repo had ever asserted it — measured, not assumed. The handoff's belief that `test:needle` owned it was wrong (that is a physics suite) |
| D4 | **The dial must NOT animate while dragging.** Motion belongs to the release. | PV-12 measured the dial's 1:1 tracking as sound; a transition on the tracked value would break exactly that |
| D5 | **`chat-styles.css`'s hand-typed `animation-delay: 100ms/180ms` is off `--m-stagger` and is FILED, not fixed.** | Found during row 7, scoped out because it is a different shape (an `animation-delay:` is outside `test:motion-ladder`'s written scope) — reported rather than swept in |

---

## 2 · ⛔ What is NOT delivered, and why that is the honest answer

**Part 1 — the dial's visual weight, and one idea wearing three words** (lens 5/9/13) — is
**still open.** It is not deliverable from this seat, and pretending otherwise would be worse than
leaving it open. The record's own words: *"the dial is physically sound (PV-12 sound) but visually
a thin 5px-ish slider with a small knob; the panel says 'YOUR PICK' + the knob '21.08×' + the modal
'conviction' — three registers for one concept."*

Two distinct problems live in that sentence, and only one of them is a design commission:

### 2a · The **term unification** is a RULING, and it is small
Three words name one idea across three surfaces. Picking the word is a product decision, not an
artboard: it needs someone to choose **one** of *"your pick"* / *"conviction"* / the multiplier
framing, after which it is a `t.*` change at three call sites plus SW/ZH. 👤 **This is a one-line
answer from Ali, not a Design commission** — and separating it out is the point of this section,
because bundling it into an artboard request is how a cheap decision waits on an expensive one.

⚠️ Note what is already **overturned** and must not be re-opened: *"the panel commit is side-green
(`btn-yes`), the modal confirm is gold"* is **CORRECT** per §M3a/D1 — the green states *which
side*, the gold states *money committed*. That half of the original hypothesis is settled.

### 2b · The **visual weight** genuinely wants artboards
"Reads thin" is a judgment about stroke, knob mass, track contrast and the dial's relationship to
the panel around it. §d is right that this needs `sources/*.dc.html` at **390 and ≥lg in EN + SW +
ZH**, and it needs them because the answer is comparative — you cannot argue a knob is 2px too
small in prose, you have to see three of them beside each other.

⛔ **This handover therefore ships no `sources/*.dc.html`, and that absence is deliberate rather
than an oversight.** A directory with three documents and no artboards is an honest partial
delivery; a directory with artboards invented from a text description would be the more damaging
outcome, because it would look finished.

---

## 3 · What would close Part 1

Bounded, so it cannot expand:

1. **One ruling from Ali** (2a): which single word names the idea. Costs a sentence; unblocks three
   call sites and their SW/ZH.
2. **A `design`-skill commission** for the dial's weight only (2b), with these bounds already
   fixed by §d and by this document:
   - lands in `sources/*.dc.html` **beside this file** — ⛔ never unzipped in-repo
     (`test:design-one-door` went 4-red on exactly that once);
   - **390 and ≥lg, EN + SW + ZH**;
   - ⛔ **no new token.** Every `var(--token)` must already exist — the check in
     `TOKENS-USED.md` is the gate, and `test:motion-ladder` §3 now fails an invented one
     automatically;
   - ⛔ **the dial's physics are out of scope.** They are measured-sound and are not to be
     "improved" alongside the paint.
3. **Then** the timing spec in `MOTION.md` applies unchanged — the choreography does not depend on
   how heavy the knob looks.

---

## 4 · Status

| part | state |
|---|---|
| Commit-sequence motion spec (lens 7/14) | ✅ **delivered** — `MOTION.md`, mechanical gate passed 14/14 |
| `--m-pivot` breach | ✅ **fixed and guarded** (`test:motion-ladder` §4, `red:motion-ladder` 6/6) |
| Term unification (one word for one idea) | 👤 **awaiting one ruling from Ali** — not a Design commission |
| Dial visual weight | ✎ **awaiting a `design` commission**, bounded by §3 above |
