# Mapigo — Claude Code Handoff Brief

**For:** Claude Code (engineering implementation)
**From:** Design
**Status:** Spec locked. Build the route.

---

## What you have

| File | Purpose |
|---|---|
| `01_MAPIGO_REQUEST.md` | Original product brief from engineering/product. Read first. |
| `Mapigo Design Spec.html` | **The canonical spec.** Open it — it's a self-contained, navigable design canvas with 18 artboards: tokens, logo system, hub tiles, full game canvas at desktop / tablet / mobile, every component with all 18 states, motion specs, onboarding, copy table EN/SW, accessibility & performance budgets. |

Open the spec HTML in a browser. Pan/zoom across the canvas. Click any artboard to view fullscreen. Everything you need to ship is there.

---

## Build instructions (paste this to Claude Code)

> Build **Mapigo** — the signature mini-game for **Kipindi**.
>
> Full design spec is in `Mapigo Design Spec.html` (open it; it's a navigable design-canvas document with 18 artboards: tokens, logo system, hub tiles, game canvas at 3 breakpoints, every component with all states, motion specs, onboarding, copy table EN/SW, accessibility & performance budgets).
>
> **Mandatory inheritance:** Mapigo extends Kipindi `DESIGN_SYSTEM v1.0` — do **not** redefine base tokens. Only the `extensions.mapigo` namespace is new. All colors, type (Sora / Inter / JetBrains Mono), spacing, radii, motion easings, glows, and gradients come from the parent system.
>
> **Scope to ship in one sprint:**
> 1. New route `/mapigo` using Next.js + SVG + the existing Kipindi component library.
> 2. Components, exactly as named in the spec: `MapigoWaveform`, `RoundBand`, `PredictionTray`, `MapigoStakeInput`, `RoundResultCard`, `RoundsFeed`, `StreakBadge`, `MatchSelector`, `MapigoHelpSheet`, `GoalFlash`, `MapigoLeaderboardMini`, `OutcomePill`. Each must implement all 18 states from parent system §2.23.
> 3. Add `extensions.mapigo` block to `tokens.json` (values in spec § Tokens).
> 4. Waveform: SVG, 60fps target on 3GB Android / 3G, ≤100KB JS budget on top of platform shell. Math is specified (amplitude, period, spike profile, decay) — implement it deterministically so it's reproducible.
> 5. Every string EN + SW from day one (copy table in spec).
> 6. Respect `prefers-reduced-motion` (replace live animation with 5s static snapshots — gameplay still viable).
> 7. Keyboard: 1/2/3 = SPIKE/DRIFT/CALM, +/− stake, Enter = place.
> 8. **Delete** the 5 placeholder mini-games (Tribal Clash, Lucky Interval, Momentum Rush, Streak Chain, Voice Bet).
> 9. Mini-Games hub becomes a single hero tile pointing at Mapigo.
> 10. Add Mapigo to the mobile bottom-nav (replaces the generic FAB).
>
> **Hard constraints:** mobile-first; no team marks / player names / copyrighted music; compliance footer reserved on every screen; game must be fully playable muted (visual + haptic cues sufficient); logo works at 16px monogram and 200px hero.
>
> **Acceptance:** an engineer can implement Mapigo from `Mapigo Design Spec.html` + the asset bundle without asking a single follow-up question. Hub-tile image is launch-ready as a marketing banner. All AA contrast verified.
>
> Ping me when the `/mapigo` route is wired up against the live match feed.

---

## Acceptance checklist

- [ ] `/mapigo` route renders against the live match feed
- [ ] All 12 components implemented with their 18 states
- [ ] `extensions.mapigo` block added to `tokens.json` and passes AA contrast
- [ ] Waveform sustains 60fps on a 3GB Android over 3G
- [ ] EN + SW strings present for every visible string
- [ ] `prefers-reduced-motion` path works (5s snapshots, gameplay viable)
- [ ] Keyboard shortcuts: 1/2/3, +/−, Enter
- [ ] 5 placeholder mini-games removed from codebase
- [ ] Mini-Games hub is a single hero tile
- [ ] Mobile bottom-nav includes Mapigo
- [ ] Compliance footer reserved on every screen
- [ ] Game fully playable with audio muted

---

## Out of scope (do not do)

- Don't redesign the Kipindi parent system. Inherit it.
- Don't propose a different tech stack — Next.js + SVG + existing component library.
- Don't include real broadcast clips, player photos, real team marks. Abstract only.
