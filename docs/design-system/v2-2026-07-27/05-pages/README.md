# 05-pages — every screen, runnable

Open the .dc.html files directly in a browser **with this folder intact** (they load ./support.js and ./theme/globals.css). Each page has a state/scenario switcher exposed as a component prop; the canvases show the states side by side. All INVENTED 2026-06/07 on GIVEN tokens.

| File | Route it belongs to | Widths designed | States |
|---|---|---|---|
| Positions Page.dc.html | /positions | 1440, 390 | mixed / empty / loading / netloss / bigwin |
| Performance Page.dc.html | /positions/performance | 1440, 390 | mixed / empty / loading / netloss / bigwin |
| Positions Portfolio.dc.html | presentation canvas (frames 1a–1i) | — | all of the above, framed |
| UpDown Card.dc.html | component: the D1 card | 360, fluid | open / final30 / closed / confirming / resolvedUp / resolvedDown / voidState / stress |
| UpDown Board.dc.html | /updown | 1280, 360 (fluid grid 1/2/3/4 col) | default / empty (paused chain) / loading |
| UpDown D1 Canvas.dc.html | presentation canvas (frames 2a–2c) | — | all 7 card states + 1280 grid + stress |
| UpDown D2 Canvas.dc.html | presentation canvas (frames 3a–3d) | — | board desktop/mobile/empty/skeleton |
| UpDown Round.dc.html | /updown/[roundId] — surface D3 | 1280 / 360 | open/betting, resolved-with-settlement-proof |
| UpDown D3 Canvas.dc.html | presentation canvas (frames 4a–4d) | — | D3 open + resolved, desktop + mobile |
| Motion Language.dc.html | the motion identity, documented + live | fluid | every interaction, live, with production values under each |
| Needle Fidget.dc.html | The Needle, documented + live | fluid | all 17 states + 3 feel dials (material · discipline · habitat) |

Not designed (no file, see 07-provenance/OPEN-GAPS.md): /updown/round/:id (D3), admin console (D4), bottom nav (D5), /markets board, /live, wallet, auth.

Note: `Motion Language.dc.html` also loads `theme/motion.css`; `Needle Fidget.dc.html`
additionally loads `needle-physics.js` and `needle-haptics.js` from this folder. ⛔ Those four
files are **load-bearing for these previews, not redundant copies** — deleting them as
duplicates was tried on 2026-08-11 and reverted.

> 🔴 **CORRECTED 2026-08-11 — this note previously stated two things that are not true.**
>
> 1. It said `theme/globals.css` here is *"the offline-safe copy (webfont import removed)"*.
>    **The webfont import is present** — `@import url('https://fonts.googleapis.com/css2?…')`.
>    These previews **fetch Google Fonts and are not offline-safe.** Open them with a network
>    connection, or the type falls back to system fonts and the layout you are judging is not
>    the one that ships.
> 2. It said the byte-exact original is `07-provenance/kit-source/globals.css`. It is not —
>    that file differs. The byte-identical twin of this one is
>    `01-foundations/tokens.css`.
>
> ⚠️ **None of these snapshots is the live theme.** Each now opens with a `DATED SNAPSHOT`
> header naming its own drift: `--bg` is `oklch(15% 0.130 268)` here against a live
> `oklch(6.5% 0.130 268)`, and `--bg-elevated2` is defined here but **retired** in
> `src/app/globals.css:302` with the words *"Do not re-add"*.
