# Changelog (reconstructed)

## 2026-07-27 (repo · feature) — The Needle: Spin/Bounce mode + an aesthetic controls drawer
A second, user-selectable interaction plus a small settings surface — no new physics, just a
new input on the proven engine.
- **Bounce mode.** Every tap REPELS the object away from the finger: a viewport-normalised
  linear impulse (`maxLin()*0.92`, so the kick is the same fraction of the screen on phone and
  desktop), a little spin, a kick-squash and a proportional impact haptic; the engine's swept
  collisions + restitution do the bouncing and it settles to the logo, ready for the next tap.
  No grab/drag in bounce mode. "Spin" (grab/flick) stays the default. Persisted as
  `needleMode` in `50pick:feedback` and read live in `needle.tsx`.
- **Aesthetic controls drawer** (`src/components/layout/needle-drawer.tsx`) — a bottom sheet on
  mobile / small centred panel on desktop, opened from the avatar menu ("The Needle ›") and
  Settings → Sound & feedback ("Manage the Needle"). Holds the view-sight toggle (Show on
  screen) + the Spin | Bounce segmented control with one-line hints; all tokens, trilingual,
  reduced-motion-gated, ≥44px targets, `role="dialog"`.
- **Robust by construction:** the prefs loader coerces any unknown `needleMode`→`"spin"` and
  non-true `needleHidden`→`false`, so hostile localStorage can't break it; the engine guards
  (proven) keep the physics finite under repel-spam.
- **Verified:** `test:needle` §17 — every tap repels AWAY, bounces + settles to the logo, kick
  viewport-normalised (ratio spread 0.000000), 5,000-tap repel-spam never corrupts — ALL PASS;
  `needle-visual.mjs` — a right-side tap sends it left in a real browser — PASS; typecheck +
  `test:tokens` + `next build` green.

## 2026-07-27 (repo · fix) — The Needle floats OVER the nav bars, never trapped behind one
Bug (reported by users): it stuck to the bottom nav on phones + the top bar on desktop, and
vanished on some pages — all one root cause: it sat at z-25, BELOW the nav chrome, so a bar
covered it (hidden AND unclickable). An interim attempt walled it OUT of the bars via insets,
but the object is supposed to pass OVER them, not avoid them. Final fix: **z-index 45** —
ABOVE the top bar (z-30) and bottom nav (z-40) so it floats over them and passes through
freely, but BELOW every dropdown (50) / menu (60) / popover (90) / modal (100), so it never
covers a decision. No app-bar insets (it is not walled out — it floats over); it still respects
device safe-area insets, and `nearestEdge` is overridden on the instance to rest on the
LEFT/RIGHT rails only (off the reading column / nav centre). Show/hide is a persisted toggle in
the avatar menu + Settings → Sound & feedback (reachable at every width). Verified: `test:needle`
§16 (floats free, reaches ALL FOUR corners, rests on a side rail as the logo) + `needle-visual.mjs`
(z=45 above both bars; rests on a rail) — ALL PASS.

Also: **diameter cap 88 → 64.** The strokes hold a constant ~2.3 CSS px, so on the big 88px
desktop disc they read thin and washed while the crisp, premium mobile look came from the
smaller disc making the gold needle + rim proportionally bolder. Keeping it FAB-scale (56–64)
at every width makes desktop as refined as mobile (screenshots re-verified at 360/768/1280/1920).

## 2026-07-27 (repo) — The Needle wired into the app, and torture-verified
Integration of `09-needle/` into the live 50pick app (physics/spec/renderer unchanged;
this is integration, not redesign).
- **Engine vendored unedited** → `src/lib/needle-physics.js` + `needle-haptics.js`, typed
  with hand-written `.d.ts` shims (repo is `allowJs:false`).
- **Host ported verbatim** from `Needle Playground.html` into a React client component
  `src/components/layout/needle.tsx`; mounted ONCE in `AppShell` for signed-in players.
  Adaptations are integration-only: elements looked up WITHIN `#needle-root` and the SVG
  paint-def ids namespaced `ndl-*`, and all CSS scoped under `#needle-root`
  (`src/components/layout/needle.css`), so nothing — not the bare `svg{}` rule, not a
  `url(#faceL)` — can leak onto an app glyph. The demo page's `html,body` reset was dropped.
- **z-index DEVIATION 900 → 25.** The brief assumed app modals at 1000; 50pick's real stack
  is top bar 30 / dropdowns 50 / menus 60 / popover 90 / MODALS 100 / selects 120–130 /
  banners 200 / toasts 1800. At 25 the object sits above page content but below every
  overlay and the top bar, so a fidget can never obscure navigation or a live money commit.
- **Hidden on money surfaces**: `/wallet*` routes, plus a navbar/settings show/hide toggle
  (persisted in the shared `50pick:feedback` prefs) and `50pick:needle-suppress/-release`
  events for money modals. Signed-in players only (every viewer can hide it via the menu).
- **Wired**: `session()` (per-tab clock drives presence), `acknowledge()` (on a held-win
  dismiss — no win/loss variant), `onInteraction`/`onRecord` → analytics events
  (`needle:interaction` / `needle:record` — the personal best is NEVER rendered),
  `onDetent`/`onCatch`/`onTrue` → haptics. The vendored haptics honour the app's master
  "Sound & feedback" switch (mute bridged); the raw `navigator.vibrate(12)` in the Up&Down
  quick-bet was replaced with the named `haptics.confirm()`.
- **Verified**: `npm run test:needle` — 15,000+ randomised throws/spins + 21 adversarial
  assertions (every wall/corner, interior/overlapping/enclosing obstacles, full spin range
  with cross/detent/true/catch, restitution/energy laws, NaN/∞/huge-dt/degenerate-viewport
  injection, resize storms, callback hygiene) — ALL PASS. `scripts/needle-visual.mjs` —
  real-browser render/responsiveness (56→88px)/scoping/spin-to-logo/suppress at
  360/768/1280/1920 — ALL PASS. typecheck + `test:tokens` clean. Signature invariant holds:
  it always comes to rest as the logo, exactly.

## 2026-07-27 (repo) — installed into the app as the single design-system home
Consolidation performed in the 50pick app repo (`F:\kipindi-main`) so a future session
sees exactly one design archive and one token truth. "One fact, one home."
- **Installed here.** This archive was moved from `New developments/Full Final Archive/…`
  to `docs/design-system/v2-2026-07-27/` and registered in `docs/design-system/README.md`
  as the current (and only) version.
- **Duplicates deleted, content-hash verified.** The four sibling kits under
  `New developments/` (`Haptics Vocabulary/`, `Motion Language + haptics/`,
  `The Needle Fidget Object/`, `Up and down d3 round detail/`) were byte-identical subsets
  of this archive — every one of their files' SHA-256 was confirmed present here before
  deletion. The only non-duplicate was one package `README.md` (a redundant quick-start
  index; its substance lives in the D3 spec + OPEN-GAPS). The loose `New developments/`
  staging folder was then removed entirely (it was untracked and not git-ignored — a
  `git add .` would have committed ~2.1 MB of cruft).
- **v1 retired.** `docs/design-system/v1-2026-07-24/` was **100% contained in this v2**
  (all 16 files hash-verified) and referenced by no code, so it was deleted — its history
  remains in git, its content here.
- **Code repointed.** The two `src/` JSDoc "built to spec" comments
  (`src/components/updown/updown-card.tsx`, `src/app/updown/page.tsx`) were repointed from
  the v1 spec paths to `02-components/_specs-as-delivered/D1|D2-updown-*-spec.md`.
- **Config residue pruned.** Dead `tsconfig.json` excludes (`50PICK`,
  `Final UI enhancement Kit` — long gone from disk) and stale `.gitignore` lines
  (`/Haptics/`, `/Motion Language/`, `/Needle Fidget Project/` — never matched anything)
  were removed.
- **Token truth unchanged.** The live `src/app/globals.css` remains the single token
  authority; `01-foundations/tokens.css` here is a dated snapshot, per README §1.

## 2026-07-27 — Up & Down D3 (round detail) designed
Closed the first item in OPEN-GAPS. Four frames (open + resolved, 1280 + 360), redlines
and contract per brief §5.
- **Price hero** answers "am I above or below?" before any number is read: the open price
  is a gilt dashed marker and the area tints `--yes-400` above it, `--no-400` below,
  clipped at the line. No axis, no gridlines, per brief.
- **Locked pick** rendered as a chip statement, not a switch — the side was chosen on the
  D1 card.
- **Gold used exactly twice**, both defensible: the confirm button (money commit) and a
  winning payout (earned money). The projection stays neutral ink — a projection is not
  earned money.
- **Settlement proof as a receipt**: open + close observations each with source link,
  quoted timestamp AND observed timestamp with timezone; outcome with the movement in
  absolute and percent; the raw evidence excerpt; and the stated rule
  ("close > open ⇒ UP") so a player can check the outcome rather than take it on trust.
  Proof prices are deliberately uncoloured — colour there would re-read facts of record
  as live direction.
- New values flagged: 26px hero price, 44px page-scale asset icon, `ud-point` keyframe,
  area-tint gradient recipe, 6px pool bar.
- Three open questions raised and logged rather than silently decided: exact-tie policy,
  whether leaving a round exists, and per-duration series sampling.

## 2026-07-27 (feel) — response, texture, discovery, and mobile restraint
Brief was "make it addictive". Declined and renegotiated to "make it satisfying" — the
reasons are in CLAUDE-CODE-BRIEF §3d, and the short version is that a compulsive toy
inside a gambling app is the argument that removes it in a license review. What shipped
instead:
- **Gesture response.** A flick, shove and nudge now behave like three different objects
  (gain ×1.18 / ×0.74 / ×0.22), classified on peak-speed-to-distance ratio.
  **Viewport-normalised** — absolute px gates classified every phone flick as a shove,
  which would have made the object feel dead on the devices most people use.
- **Bearing detents.** A quarter-turn tick scaled by speed, so one mechanism reads as
  discrete clicks slowly and a continuous purr fast. This is the most-noticed thing in
  the hand and the difference between a machined object and a notification buzz.
- **Catching it mid-spin** is its own event — firmer haptic plus body compression,
  because you absorbed real momentum. Grabbing at rest does not qualify.
- **Two discoveries, neither rewarded:** the clean pass (edge to edge, zero bounces,
  tracked but never displayed) and the closed ring (the trail completes into a whole
  circle above 88% of max spin).
- **Mobile footprint cut from 32% to a measured max of 10.5%** of the narrow viewport.
  Diameter is now FAB-scale on phones (56px at 360px wide), the halo scales with
  viewport, and the touch target is decoupled from the visible sliver — the earlier
  version forced 79% of a phone disc on screen chasing the 44px floor, when the floor
  applies to the hit area, not to the pixels. 44px touch at every size.
- Fixed a double-counted run: endRun() is reachable from both stepPark() and sleep(),
  and sleep() fires on consecutive frames, so one clean pass counted 342 times.

## 2026-07-27 (fix) — keep-out zones were dead code
Caught in review: interior keep-out zones never fired in the one integration that
matters. Two stacked bugs, both of the same family — **cached state that goes stale
exactly when the feature is needed**:
- A boot-time "do any keep-outs exist" flag could never flip true, because it was only
  recomputed inside the function it was gating. A docked bet slip mounts on interaction,
  so it was never seen.
- The replacement gated the read on a frame counter incremented by the rAF loop — which
  sleeps at rest, so anything mounted during sleep was still invisible.

Fixed by letting the engine's own `obstacles()` callback trigger the read, cached on
elapsed time (8ms) so it is self-invalidating regardless of who drives the simulation.
Re-verified with the obstacle mounted AFTER boot: 0 frames past a 12px wall at max
velocity, 18.8 rpm from a glancing hit, clears on removal. Documented as two named traps
in NEEDLE-SPEC §3.4c and CLAUDE-CODE-BRIEF §5.3b so a reimplementation cannot repeat it.

## 2026-07-27 (final) — swept collision, and the two documents the object needed
- **Collision is now swept, not discrete.** Conservative advancement subdivides each
  substep so no motion step exceeds 35% of the radius. Verified against a 12px wall hit
  at 35px-per-substep: zero frames past it, where discrete collision tunnels every time.
  This removes the last physics limitation and unlocks interior obstacles.
- **Interior keep-out zones** — `obstacles: () => rects`, or `data-needle-keepout` on any
  element. The object deflects off a docked panel, slides along its edges and takes spin
  off its corners. Recovers cleanly if a rect appears underneath it.
- **MEASUREMENT-PLAN.md** — four questions, and kill criteria agreed IN ADVANCE (remove
  it below 3% session interaction). Written because the object had no evidence and
  "it's beautiful" is not a reason to keep something.
- **COMPLIANCE-MEMO.md** — draft responsible-play memo, explicitly NOT approved,
  including the honest counter-argument that an interactive toy in a betting app could
  be read as gamification. Design cannot self-certify this claim.

## 2026-07-27 (later) — Needle refinements from a ten-role review
Rated the object as gamer, student, manager, gaming CEO, betting CEO, graphic designer,
motion engineer, haptics engineer, UI/UX engineer, game developer and player. Six real
gaps closed:
- **Silent mastery** — the engine now tracks a personal best (turns, bounces, spin
  time) and never displays it. A fidget with no skill ceiling gets boring; a displayed
  score would violate the no-gamification rule. Both problems solved at once.
- **Instrumentation** — `onInteraction` fires once per completed interaction with
  turns/bounces/spinSeconds/presence. This is what answers "does anyone use this",
  which was the manager's and CEO's only real objection.
- **`trueFound` haptic** — the moment the needle corrects onto true had no haptic,
  despite being the object's most meaningful event. Now a single crisp 11ms tick.
- **Stroke scaling** — a 2.6-unit inlay renders at 1.66 CSS px on a 68px phone disc,
  sub-pixel on 1x displays. Strokes now scale inversely with diameter, holding 2.29
  CSS px at every size.
- **Accessibility label rewritten** to lead with "an optional fidget toy. Nothing here
  affects your account" so screen-reader users can skip it knowingly, rather than
  hiding it from them.
- **Two limitations documented honestly** rather than left to be discovered: haptic
  duration is not amplitude (web API has no amplitude control), and collision is
  discrete not swept (would tunnel through thin interior obstacles if any are ever
  added).

## 2026-07-27 — v1.1 archive
- **Motion identity shipped: "The Settle."** Derived from the mark (a needle on a
  pivot): anchored, settled, weighted. Four curves, six duration tiers (90–620ms
  ceiling), four z-planes where depth is blur not dimming, and the −14° signature axis
  every sweep and reveal travels on. `theme/motion.css`.
- **The Needle** — persistent edge-parked pause object with a deterministic rigid-disc
  simulator (fixed 120Hz substeps, viscous + Coulomb friction, impulse collisions with
  tangential→spin transfer). Always comes to rest as the logo, exactly.
- **Haptic vocabulary** — named patterns for physical events only; rate-limited,
  mutable, reduced-motion aware.
- **Needle livery decided: enamel.** Flat brand hues were built, rejected (prize-wheel
  read + stole betting semantics), a monochrome version was built and rejected too
  (brand disappeared). Shipped: same hues fired as deep cloisonné with polished inlay.
  Rationale in 09-needle/NEEDLE-SPEC.md §0.
- Eight defects found in verification and fixed; logged in NEEDLE-SPEC.md §12.

Newest first. Dates are as known from the design sessions; earlier kit history is reconstructed from comments inside the given files and marked (inferred).

## 2026-07-24 — v1.0 archive assembled
This archive. Contents frozen: given kit + Positions/P&L + Up & Down D1–D2.

## 2026-07 (this month) — Up & Down, surfaces D1 + D2
- UpDownCard designed: 7 states + stress variant, 360/1280. New: ud-count-pulse keyframe, asset icon chip recipe, 8.5–9.5px mono micro-labels, 28px countdown digits, pool split bar, result pips.
- /updown board (D2): price tape, asset/duration tab hierarchy, results pip strip, paused-chain empty state, card-mirroring skeleton.
- Verifier fixes: resolvedDown countdown label; footer now preserves "· quoted HH:MM:SS" under truncation.
- D3 (round detail), D4 (admin console), D5 (nav glyph) — briefed, NOT designed.

## 2026-06/07 — Positions "Portfolio" surface (Brief #1)
- "Your standing" ledger strip replaced the old 4× SummaryCell grid; gilt NeedleDial (win rate) introduced.
- Performance page recomposed: net-P&L ledger hero, PnlChart (raw-TZS axis + gilt break-even) replacing a 0–1-normalised PriceChart usage; dignified loss copy.
- New i18n keys listed in _specs-as-delivered/README-handoff.md.

## 2026-05 (inferred from brief) — licence review
Compliance spec: per-position potential payout hidden pre-resolution; "if settled now" captions on unrealised value.

## ~2025–2026 (inferred) — v2 kit re-theme: teal → royal indigo
globals.css comments record: canvas re-anchored to #060a50 (hue 268); "v2 kit: one flat-solid button family" (YES/NO/gold became solid fills, primary kept its gradient); --accent-* aqua chrome tokens defined after being referenced-but-undefined; spinning win sunburst replaced with win-aura-breathe; compat aliases (--bg-base, --surface, --teal-*) kept so first-generation components still render.

## earlier (inferred) — first-generation concept kit
atoms/markets/brand/microstructure specimens authored on the older near-neutral dark (oklch hue ~240 backgrounds) with teal as the brand accent. Superseded visually; contracts still authoritative.
