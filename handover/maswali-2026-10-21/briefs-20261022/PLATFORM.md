# Lane PLATFORM — S5 round 2 (Millionea's platform layer: edge, shell, route ghosts, preview bar, chat yield, rail, motion)

- Tree `C:/50pick-ssd/kipindi-mln-fplt` · branch `claude/maswali-s5-r2-platform` · head `68b8fab9d` (no WIP; commits 1–4 verified:
  header-fit red 10/10; `.btn-ghost/.btn-claret/.btn-aqua-ghost:hover` gated under `@media (hover: hover)` — D11, its §M8a entry
  UNNUMBERED beside item 11 (the lead numbers it at the merge); qa:live PREVIEW_TESTIDS += `millionea-preview-mark`; the kit
  NoticeBar keeps its last word pair together).
- Step `S5-R2-PLATFORM` · ports 3500–3509 · `KP_SCRATCH_PORT=5489` · scratch `$F/platform/` · slots
  `bash $S/mln-slot-s5x.sh platform …`.
- Critic reports: `$S/critics/R1-motion.md` (in full — two rows have NO owner and are now yours) and the platform items the
  other R1 reports route to you. Read `$F/briefs/S5-R2-COMMON.md` first.

## LEFT (in order)
1. tsc on your head (only notice-bar.tsx was typed).
2. The reader sweep: `$S/s5fplt/sweep7-list.txt` (191 scripts) — the light ones directly, heavy ones through your slot; report
   every red with its proof of origin (green on `7e9a314f0`'s parent / main?).
3. Release-only reds you own:
   - `test:visual-pass-r5h` 3.5 — `ChatRoot.tsx` (D15's census) writes a DOM mark → classify it.
   - `test:visual-pass-r7c` 1.4 — "the session-ended notice, the offline notice, the announcement and maintenance bars, the away
     summary and both preview markers draw through [one component]" (8 files: hub-notices.tsx, millionea/page.tsx,
     announcement-banner, app-shell, away-summary-bar, millionea-preview-bar, preview-marker, offline-banner) — check D12's bar
     and make it hold.
4. The hub's Swahili tab rail is 4.0px tight at 333px (the tab row, your D12–D14 area) — measure, fix, guard.
5. R1-motion's unowned rows: "Reduced-motion parity" (7) and "Perceived performance" (7) — read their findings, implement the
   fixes at the platform level (reduced-motion end states everywhere Millionea moves; ghosts/skeletons/transitions that make the
   wait feel shorter without fabricating anything), each with a guard + plant.
6. Targeted re-shoot only for what you prove: D13 (`qa:millionea-break-nav`), D14 (`qa:journey-rail-gaps`), D15 (the chat-yield
   guard + its red), D10 — through your slot; read the tiles.
7. Note for the lead: when MillioneaPreviewMark is deleted at the merge, qa:live's PREVIEW_TESTIDS must lose
   `millionea-preview-mark` (or keep only the bar) — say exactly what to change.

Also yours if DOORS asks: the shape of `src/components/journey/route-ghost.tsx:118` (D6) — DOORS fixes the dark-safety rule
everywhere; coordinate through the lead, never edit DOORS' files.
