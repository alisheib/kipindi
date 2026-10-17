# MOTION — MASWALI-DESIGN-R2

The N-block lives in `motion/maswali-motion.css`, between `/* N-BLOCK BEGIN */` and `/* N-BLOCK END */`. It is the only place a new keyframe exists in this delivery. The prototypes are `motion/SM1.html … SM9.html` (index: `motion/index.html`); styles come only from `motion/tokens/` (unmodified) and the N-block; the harness (`motion/harness.js`) adds or removes classes, sets the runtime custom properties from one measurement before a run, forces a restart with one layout read and listens for animationend — no requestAnimationFrame, setInterval, setTimeout or Web Animations API anywhere.

<!-- RUNTIME:BEGIN -->
- `--carry-dx` · N1 · the horizontal offset from the token's END position back to where it came from (px), measured once before the run.
- `--carry-dy` · N1 · the vertical offset, likewise.
- `--carry-s` · N1 · the start scale (from-width ÷ end-width; 0.75 for an 18px annex socket landing in a 24px main socket; 1 when the figure cell carries at one size).
- `--i` · N1, N2 · the 0-based index of the item in its stagger (clamped to 3 inside the keyframe's delay).
- `--cut-from` · N3 · the start offset of the cut: `calc(-1 * var(--sp-2))` for `.maswali-cut`, `var(--sp-2)` for `.maswali-cut-undo`.
<!-- RUNTIME:END -->

## N1 · Kubeba · The Carry

- **Purpose · the rule it teaches:** a reserve counts only by carrying into a voided main's socket, in order. The annex token leaves its place and becomes a mark where the main was; the annex then reads "→4".
- **Trigger:** SM4, when all 15 results are final (never an un-carry); SM7, the first hub view after a week with no winner; SM9, the How-to example on tap.
- **Keyframes (verbatim):**
  ```
  @keyframes maswali-carry { from { translate: var(--carry-dx) var(--carry-dy); scale: var(--carry-s, 1); }
                             to   { translate: 0 0; scale: 1; } }
  .maswali-carry { animation: maswali-carry var(--t-move) var(--m-settle) both;
                   animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }
  ```
- **Duration and curve:** `--t-move` (340 ms), `--m-settle`. Measured travel, annex A1 → main 4: at 360 (ticket at 328 wide) ≈ 46 px up and ≈ 36–104 px across depending on the annex cell, i.e. 60–115 px → the 40–200 px rung is `--t-base`; an attested result decides money → one rung up → `--t-move`. At 1280 the receipt is 560 wide: ≈ 46 px up, 60–180 px across → the same rung. SM7 (the figure cell): ≈ 118 px up at 360 and 1280 → `--t-base` → money → `--t-move`.
- **Stagger:** `calc(min(var(--i), 3) * --m-stagger)`; four items at most, later items land with the fourth.
- **Properties:** `translate`, `scale` (individual properties) — allowed by 4g. Layers: one composited layer per carried wrapper (≤ 4), plus the GlyphSwap pair inside it; will-change is not declared — the harness restarts with one layout read and the browser promotes for the run.
- **End frame / reduced motion:** the END frame IS the layout (FLIP). Both clamps (`prefers-reduced-motion` and `html.kp-reduce-motion`) set `animation: none`; the token rests in the main socket, the socket shows sealCheck (or sealX) and the annex reads "→4".
- **Throttle tier (`data-motion="reduced"`):** plays once at full duration; not in the reduced list.
- **Haptic:** none.
- **Law line:** In Millionea only, a reserve's socket moves once — from the annex into the vacated main socket, on `--t-move`/`--m-settle` — and nothing else ever travels between sockets.
- **Must never imply:** that a reserve "scored" on its own; that the order can change; that anything is still pending (it plays only when all 15 are final).
- **Fallback if the owner says no:** GlyphSwap in place (`.g-swap-out`/`.g-swap-in`) and the printed "4 → A1" on the ticket and the register.
- **Older engines:** `translate`/`scale` as individual properties are supported by every engine on the support list; where they are not, the wrapper simply renders at rest (the end frame). The runtime values are plain px, so no trig is involved.

## N2 · Kugonga Muhuri · The Attestation Press

- **Purpose:** a result is a stamp pressed onto the register along the mark's own axis — the world's fact, not a verdict on the player. Identical for every outcome and for matched and unmatched rows.
- **Trigger:** SM3, when a result is attested while the player views the ticket or hub (at most 4; a backlog rests).
- **Keyframes (verbatim):**
  ```
  @keyframes maswali-attest {
    0%   { opacity: 0; translate: calc(var(--sp-2) * sin(var(--m-tilt))) calc(-1 * var(--sp-2) * cos(var(--m-tilt))); scale: 1.02; }
    60%  { opacity: 1; translate: 0 0; scale: 0.98; }
    100% { opacity: 1; translate: 0 0; scale: 1; } }
  .maswali-attest { animation: maswali-attest var(--t-base) var(--m-settle) both;
                    animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }
  ```
- **Duration and curve:** `--t-base` (220 ms), `--m-settle`. Travel is `--sp-2` = 8 px along −14° (≈ −1.9 px, −7.8 px) at every width → `--t-quick`; an attested result decides money → one rung up → `--t-base`.
- **Stagger:** as N1; four stamps at most.
- **Properties:** `opacity`, `translate`, `scale`. Layers: one per stamp (≤ 4). The BATILI strike is the kit's `.m-draw` on an SVG hairline (`stroke-dashoffset`); the socket swap is GlyphSwap.
- **End frame / reduced motion:** `animation: none` under both clamps → the stamp at rest, opaque, in the layout; the strike and sealNil present.
- **Throttle tier:** full duration, once.
- **Haptic:** none.
- **Law line:** In Millionea only, a result stamp arrives down the needle's line (`--m-tilt`) by `--sp-2` with the seal-place press stops, on `--t-base`/`--m-settle`; the socket beside it swaps by GlyphSwap.
- **Must never imply:** a win or a loss (same motion for matched and unmatched), urgency (no loop), or an error (a BATILI stamp is the same press).
- **Fallback if no:** the stamp appears with `.g-settle`.
- **Older engines (§B1a):** the from-frame uses the individual `translate` property with `sin()`/`cos()` of `--m-tilt`. Proven in the prototype on Chromium (Edge/Chrome 125+), Firefox 118+ and Safari 15.4+; in an Android WebView older than Chromium 125 the trig may not resolve, the whole `translate` declaration is then invalid at computed-value time and resolves to `none`, so the stamp only scales and fades — still a lawful end frame. The prototype notes this; nothing else in the N-block uses trig.

## N3 · Kukata Tiketi · The Cut

- **Purpose:** the ticket is cut from the register — the stub settles away from the document by one hair on the player's first view; it rejoins on a refund or cancel (the perforation stays as the record).
- **Trigger:** SM1 (first view of a bought ticket, at t0 + `--t-base` after the perforation reveal); SM8 (`.maswali-cut-undo` on a refund or the player's own cancel).
- **Keyframes (verbatim):**
  ```
  @keyframes maswali-cut { from { translate: 0 var(--cut-from); } to { translate: 0 0; } }
  .maswali-cut      { --cut-from: calc(-1 * var(--sp-2)); animation: maswali-cut var(--t-base) var(--m-settle) both; }
  .maswali-cut-undo { --cut-from: var(--sp-2);            animation: maswali-cut var(--t-base) var(--m-glide)  both; }
  ```
- **Duration and curve:** `--t-base` (220 ms); `--m-settle` for the cut (one hair of overshoot), `--m-glide` for the undo (neutral travel). Travel 8 px at every width → `--t-quick`; a purchase moves money → `--t-base`.
- **Stagger:** none (one stub).
- **Properties:** `translate`. Layers: one.
- **End frame / reduced motion:** the end frame IS the layout (the stub in its place, `--sp-2` below the perforation by the layout's own gap). Both clamps: `animation: none`.
- **Throttle tier:** full duration, once.
- **Haptic:** none from N3 itself (the confirm haptic belongs to the purchase and to the player's own cancel, fired by the platform).
- **Law line:** In Millionea only, the stub settles by `--sp-2` on `--t-base` — down on the cut (`--m-settle`), back on a refund (`--m-glide`) — and the perforation never moves.
- **Must never imply:** a prize (the stub is ink; the strip is brand); a loss on a refund (the undo is neutral travel).
- **Fallback if no:** `.m-seal` on the stub.
- **Older engines:** `translate` as an individual property; where unsupported the stub renders at rest.

## N4: unspent

Every moment in SM1–SM9 is carried by the existing vocabulary (.m-axis-reveal, .m-seal, .m-draw, .m-tick, .m-out, .g-swap, .seal-*) plus N1–N3. The candidate we weighed — the needle of the mark sweeping to align the ten sockets before the seal — is a needle alignment on `--m-pivot`, which the brief bans, and it would make a loss feel close by showing the needle miss. The Unbroken Line (an existing `.m-draw` on an SVG hairline in `--success-fg`) already makes the win unmistakably 50pick's: the register's rule, drawn through the ten marks, opening the seal.

## The moments and their end frames (storyboards/SM*.png)

| Moment | t0 | token offsets | end frame | reduced (both clamps) | throttle |
|---|---|---|---|---|---|
| SM1 purchase | crest .seal-commit; perforation .m-axis-reveal (--t-stage) | stub N3 at +--t-base | stub in the layout | static crest, ticket at rest | once, full |
| SM2 close | band .m-axis-reveal | Endelea .m-out (--t-quick); door .g-swap (--t-quick / --t-base); stub lock .m-seal (+--t-base) | band, new door, lock line | same, at rest | once, full |
| SM3 attest | stamp N2 (--i 0) | stamps at --m-stagger steps; BATILI strike .m-draw; sockets .g-swap | stamps + sockets at rest | at rest | once, full |
| SM4 carry | token N1 | GlyphSwap on animationend; "→4" .g-settle | token in socket 4 as sealCheck; annex "→4" | end frame | once, full |
| SM5 win | hairline .m-draw (--t-max) | seal at +--t-stage (seal-arrive, sweep, flip, sheen at shipped offsets); cascade at +2·--t-stage | seal rested, amount struck, ledger shown | seal at rest, sheen unseen | once, full |
| SM6 loss | first rule .m-draw (--t-max) | second at +--t-quick | two rules | both present | once, full |
| SM7 rollover | figure N1 | .m-tick on Jackpot only if the larger-of-two changed (not in the sample) | figure in its line | at rest | once, full |
| SM8 refund | stub N3-undo | stamp .m-axis-reveal at +--t-base; rules .m-draw at +--t-stage | stub rejoined, stamp, rules | at rest | once, full |
| SM9 example | on tap: N1 | as SM4 | as SM4 | end frame | once, full |

Budget: ≤ 12 composited layers at once in every moment (SM5 peaks at the seal's four layers plus the modal, the hairline and five cascade rows); one layout measurement before a run (N1), none during; nothing loops.
