/**
 * RED anchors for `npm run red:motion-ladder` — the control for `test:motion-ladder`
 * §1.1 / §3.1 (PV-14, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE. `red-anchors.test.mts` audits every declared anchor without
 * running the harness that injects it — declaring these here, rather than only inline in
 * `red-motion-ladder.mjs`, is what lets it. Same law as `tap-rung.anchors.mjs` beside this file.
 *
 * ⛔ AND THIS GUARD HAD NO CONTROL AT ALL UNTIL TODAY. `test:motion-ladder` has been the ratchet
 * the design record points at for "the tokens are pinned" since it was written, and nobody had
 * ever watched it fail. That is how it sat green over an entire file type (its hole 3) and over
 * a fourth motion vocabulary. A guard you have not watched fail is decoration.
 *
 * Each mutation restores the EXACT literal that shipped in production before PV-14, so a
 * regression is provable by name rather than by coincidence — except #4, which is not a
 * regression at all but a probe of the loop carve-out's boundary (see its note).
 */

export const MUTATIONS = [
  {
    // §3.1 — the fourth motion vocabulary, as it shipped. A custom-property DECLARATION, on a
    // line carrying neither `transition:` nor `animation:`, so nothing in §1.1 can see it: this
    // is the mutation that proves §3 is a separate section for a reason and not decoration.
    name: "chat-tokens.css — restore the hand-typed glide curve + 180ms (the fourth vocabulary)",
    file: "src/styles/chat/chat-tokens.css",
    from: `  --cm-ease-glide:   var(--m-glide);   --cm-dur-glide:   var(--t-quick);`,
    to: `  --cm-ease-glide:   cubic-bezier(0.2, 0.8, 0.2, 1);    --cm-dur-glide:   180ms;`,
    expect: "3.1",
  },
  {
    // §1.1 through the widened corpus. Before today `chat-styles.css` was not scanned at all,
    // so this mutation would have been invisible — which is the whole of hole 3 in one line.
    name: "chat-styles.css — restore the .cm-row-user send pop to 320ms + a hand-typed bezier",
    file: "src/styles/chat/chat-styles.css",
    from: `  animation: cm-msg-send var(--t-move) var(--m-settle) both;`,
    to: `  animation: cm-msg-send 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;`,
    expect: "1.1",
  },
  {
    // §1.1, and the specific reason a per-LINE check must keep reading past the first `var(`:
    // this raw pair shipped at the END of a four-property transition whose other three were
    // correctly tokenised. A check that stopped at "this line mentions a token" would pass it.
    name: "chat-styles.css — restore `transform 120ms ease-out` hiding at the end of a tokenised line",
    file: "src/styles/chat/chat-styles.css",
    from: `, transform var(--cm-dur-glide) var(--cm-ease-glide);`,
    to: `, transform 120ms ease-out;`,
    expect: "1.1",
  },
  {
    // ⭐ NOT A REGRESSION — A BOUNDARY PROBE ON THE NEW CARVE-OUT, and the one this row would
    // most regret leaving out. `isAmbientLoop` grants every `infinite` line an exemption from
    // the duration rules, which is correct (the ladder tops out at 620ms and a 2.6s breath has
    // no rung) and is also a brand-new hole if it exempts the CURVE too. `state-tokens.css`
    // states the rule this probes, verbatim: *"What they do NOT get to keep is a hand-typed
    // CURVE."* So: keep the loop, keep the period, hand-type the curve — and §1.1 must still
    // catch it. If this mutation ever passes, the carve-out has become a licence.
    name: "globals.css — a LOOP keeps its 2600ms period but hand-types its curve (carve-out boundary)",
    file: "src/app/globals.css",
    from: `  animation: m-breathe 2600ms var(--m-breathe) infinite;`,
    to: `  animation: m-breathe 2600ms cubic-bezier(0.65, 0, 0.35, 1) infinite;`,
    expect: "1.1",
  },
  {
    // §4.1 — restores the §M8 breach `motion.css` named in prose for six weeks and nothing
    // enforced: a result-modal crest animating on the needle's reserved curve. ⚠️ Note it is a
    // fully TOKENISED line — `var(--t-move) var(--m-pivot)` breaks no other rule in this file —
    // so §1.1 and §3.1 both pass it. Only a section that knows WHICH curve this is can object.
    name: "operation-result-modal.tsx — the crest takes back the needle's reserved --m-pivot",
    file: "src/components/markets/operation-result-modal.tsx",
    from: `              : { animation: "orm-pop var(--t-move) var(--m-settle)" }),`,
    to: `              : { animation: "orm-pop var(--t-move) var(--m-pivot)" }),`,
    expect: "4.1",
  },
];
