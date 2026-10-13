> RECORD, NOT RULE. The design laws are in `docs/DESIGN_AUTHORITY.md`; token values are in `src/app/globals.css`.

# Journey bet sheet — S8 WP6, effective at the S15 flip

The stake surface built from the agency's frame 2 and frame 3 and the approved S4 boards. It is available only inside
the journey rollout; the classic dial keeps its surface until the flip. Implementation:
`src/components/journey/bet-sheet/bet-sheet.tsx` and `sheet-parts.tsx`. The host owns requests, keys and history;
`src/lib/journey/sheet-state.ts` decides every frame and figure.

- The kit Modal is a phone sheet below lg and a centred dialog from lg, with its own chosen-side header and kit CloseX.
  Its one middle region scrolls under a viewport cap; the header and the commit stay visible. No drag gesture is added.
- The side is locked. The question names edit, low, loss-room and pending frames; a blocking/closed title names those
  frames, with the question above it; the receipt is named by its side and committed stake. Each frame re-arms heading
  focus. The CloseX is the safe way out after a covering dialog leaves.
- The grouped stake uses Input's xl rung. Low, pending and loss-room use neutral attention plus aria-invalid and a
  reason association. The chip ring uses an outline that survives forced colours. Placing locks input/chips/commit and
  withholds CloseX, scrim and Escape. In doubt keeps the frozen quote and the same key; the host decides the retry.
- The estimate uses inset paint and neutral money ink. The amount, multiple and fee read the frozen-market engine.
  Empty, one-sided, hidden legacy, thin, below-bound and newly updated estimates each have their own supplied copy.
  Balance and a low frame's current-balance figure use Cash privacy. No estimate appears on a committed receipt.
- The low frame shows only the deposit/bet-instead offers the engine permits. The deposit row names the open phone
  wallets, holding each wallet name whole. The selected deposit chip's remainder is the deposit engine's. A pause
  sentence names mobile money only, because Card is outside this gate. Pending is described at its server-clock age.
- Keyboard geometry comes from visualViewport while the field is focused: the panel lifts, its middle cap follows
  the visible height, the chips step aside and the estimate becomes compact. The kit handles keys; this surface has no
  form, submit control or key prop.
- Closed/blocked messages speak once as alerts; inline refusals speak as status; the one polite region announces
  low/loss-room/pending, the receipt and pool-driven estimate updates. Keystrokes never repeat it.
- The receipt links to the exact position. Its shared five-second timer banks while focus is visible or the pointer
  actually moves in the panel, resumes only when all holds leave, and clears its timeout on unmount. Place time writes
  only `50pick-notify-markets`, never a projected payout.

Provenance: GIVEN deck flow and S4 canvases; kit adaptation decided by S8-PLAN A12–A14 and A18–A20. Tests:
`test:bet-sheet` §§7–9 with its in-process plants, `test:enter-where-pressed` 2.2s/5.10, popup/stack/colour/translation
gates and WP11's real-frame drives and visual reads. A static render proves content/order; the browser proof measures
fit, focus, keyboard lift and the timed receipt.
