# S4 design canvas — the durable copy (2026-10-03)

The agency's five journey screens re-drawn in 50pick's design system (the Vodacom plan, S4; `docs/VODACOM-PLAN.md`
§0g). These 102 boards plus `canvas.json` (the board layout) and `Main.dc.html` (the index board) were authored on a
claude.ai Design artifact, which was the only copy until now.

**Why this folder exists.** On 2026-10-03 the artifact (`UGVgjpiQFwep2hzfYLf3M6`) could no longer be read ("artifact
not found" — deleted, or not shared with the signed-in account). The working copy that sessions read the boards from
lived only in one session's temporary scratchpad, so it is committed here, unchanged, as the frames' durable home.

- **Functionality authority** for the journey's screens (the plan's rule: functionality = the deck, LOOK = 50pick):
  the S6 change sets cite these boards by file name (for example `s4-9-tiketi-open.dc.html`).
- **Format:** each `*.dc.html` is one board, self-contained HTML with its own styles; open it in a browser to view it.
- **Not app code:** nothing under `src/` imports these files, and Tailwind's content scan (`src/**`) never reads them.
- **Revising a board:** edit it here, in the same commit as the change it records; the artifact is no longer the source.
