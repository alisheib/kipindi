# Mapigo — Signature Mini-Game · Brief for Claude Design

**To:** Claude Design
**From:** Engineering / Product
**Companion files:** `DESIGN_SYSTEM.md`, `tokens.json`, `LOGO_SPEC.md`
**Status:** Concept locked. Need full visual + asset spec to build.

---

## 0. The 30-second pitch

**Mapigo** is the signature in-platform game for Kipindi. *Mapigo* is Swahili for "heartbeats" or "pulses." The game is a live, match-driven prediction loop: players watch a real-time **intensity waveform** of a chosen live football match — a pulsing gold line that spikes when something exciting happens (shot, attack, near-miss, goal) and goes calm when the play is in midfield. Every **60 seconds** a new prediction window opens. The player calls one of three:

- **SPIKE** — at least one big intensity peak in the next 60s
- **DRIFT** — gradual rise or fall, no big peaks
- **CALM** — flatlines, no notable events

All stakes pool together within that 60-second round. Winners share the pool by stake share, same fairness math as the rest of Kipindi.

**Tagline (EN / SW):** *"Feel the match. Bet the pulse."* / *"Hisi mechi. Cheza mapigo."*

---

## 1. Why this and not another mini-game

- No competitor in Africa (or globally, that I know of) has a live-intensity waveform betting game. Aviator/JetX are RNG crash games. We are tying play to **real match feeds we already need to build for the main product** — same data, second product surface.
- Plays on Kipindi's already-locked signature: the **PoolPulseRing** in `DESIGN_SYSTEM §2.12`. Mapigo is "the ring became its own game."
- 60-second cycles are short enough to be addictive but bounded — no whales destroying themselves in one session.
- Educational: players learn to read momentum. That deepens their main-product time-window betting too.
- The **single image** that sells the game is so distinctive that screenshots will go viral on TZ Twitter / WhatsApp. (See §6 below.)

---

## 2. Deliverables Required from Claude Design

Deliver everything below as a single canonical file `MAPIGO_DESIGN.md` plus an asset bundle (`MAPIGO_ASSETS/`).

### 2.1 Brand & Naming

- **Final name confirmation.** I'm proposing *Mapigo*. Validate, propose alternates if conflict.
- **Tagline** EN + SW (3 candidates, recommend one).
- **One-line elevator pitch** EN + SW.
- **Voice & tone** specific to Mapigo — should feel slightly more energetic than the calm parent brand, but never CAPS-shouty. Reads like a calm pulse-monitor that occasionally jumps.

### 2.2 Logo & Icon System

- **Mapigo wordmark** — distinct from but visually compatible with the Kipindi wordmark. Sora Semibold likely; maybe with a small custom mark embedded.
- **Mapigo glyph** — the single iconic mark. My visual concept: a horizontal short waveform fragment with one clear spike, contained in a circle. Gold + royal. Construction grid + clear-space rules + minimum sizes — same depth of spec as `LOGO_SPEC.md`.
- **App tile icon** for the Mini-Games hub on Kipindi (240×240 recommended canvas).
- **App icon variant** (1024×1024) if Mapigo gets its own launcher entry later.
- **Notification icon** (24×24 monochrome).
- **Color variants:** primary, reverse, mono-dark, mono-light, "win moment" gold-glow.

### 2.3 Tile Background (for Mini-Games hub on Kipindi)

The single image that represents Mapigo in the Kipindi mini-games hub. SVG or layered PNG.

- **Aspect:** flexible (will be cropped to ~5:6 portrait or 16:9 banner depending on placement).
- **Concept:** a gold waveform on a deep-navy starfield, with one clear spike. Subtle constellation pattern at 4% opacity behind. Maybe a faint "60s" tick mark on the right edge to hint the time loop.
- **No people, no team logos, no soccer ball.**
- **Provide both 320×128 horizontal (small tile) and 480×600 portrait (feature tile) versions.**

### 2.4 Game Canvas (the screen players see while playing)

Spec the full game canvas at desktop (1280×800), tablet (768×1024), and mobile (390×844). What goes where:

1. **Top bar:** match info (teams, score, minute), back-to-Kipindi link, sound toggle, help (?).
2. **Main waveform area** (60% of vertical real estate): the live waveform itself, scrolling slowly right-to-left. Time labels: −60s ... now.
3. **Active round overlay:** current 60-second round shown as a vertical translucent gold band over the waveform, with a countdown.
4. **Prediction tray** (bottom or right rail): 3 big call-to-action buttons for SPIKE / DRIFT / CALM, with current pool size for each shown live.
5. **Stake input** (when a call is selected): money input + quick chips + place button.
6. **Recent rounds feed** (right rail or below on mobile): last 5–8 rounds with their result ("CALM paid · ×2.4") so players can see streaks/patterns.
7. **Pool pulse ring** at the top of the waveform, scaled-down version of the parent platform's signature.

Spec light + dark backgrounds (Mapigo will inherit Kipindi's theme system but feels more dramatic). All UI states.

### 2.5 The Waveform — Visual Spec

The single most important element. This is where Claude Design earns the brief.

- **Shape:** a continuous SVG path, ~3px stroke, gold gradient (`var(--gold)` core with `var(--gold-hover)` highlights at peaks). Subtle glow at peaks (`--glow-gold`).
- **Behavior:**
  - Calm baseline: gentle sine wiggle, ~10–20% amplitude.
  - Drift: slowly rising or falling baseline over a few seconds.
  - Spike: sharp vertical peak (60–90% amplitude), <1 second wide, with afterglow.
- **Background grid:** very faint horizontal dotted lines at 25/50/75% (`--border-subtle` at 30% opacity).
- **Tick markers:** every 10 seconds along the bottom, with the 60-second round boundary in gold.
- **Player anchor markers:** when a player places a bet, a small gold diamond appears on the waveform at the timestamp of placement, with a chip showing the player's call (SPIKE/DRIFT/CALM). At round resolution, the anchor either lights up gold (won) or fades to grey (lost).
- **Easing:** new data points enter with `cubic-bezier(0.0, 0.0, 0.2, 1.0)` over 200ms. Spikes are punchy — appear over 80ms, decay over 600ms.

### 2.6 Sprites & Animated Elements

These are the per-event visuals that make the game feel alive.

1. **Spike particle burst** — when a real match event triggers a spike, 8–12 small gold particles burst from the peak and drift up before fading.
2. **Round opening transition** — the gold round-band sweeps in from the right edge over 240ms, ease decelerate.
3. **Round resolution reveal** — the band shifts to the result color (green for won-side, neutral for lost-side), with a soft expanding ring.
4. **Anchor placement** — diamond pop-in 240ms spring; small "TZS X,XXX" chip animates above for 1.5s then collapses into the anchor.
5. **Anchor settlement** — won anchors do a 120ms scale-up + glow bloom; lost anchors fade to 30% opacity.
6. **Win celebration** — full-screen overlay reusing parent platform's WinCelebration but with a specific Mapigo treatment: a giant pulse expanding outward across the full screen, gold particles synced to the heartbeat rhythm.
7. **"Connecting to match feed" loader** — a scrubbing waveform that draws itself from left to right while connecting; Mapigo-specific not the platform spinner.
8. **Empty round (no bet placed by you)** — soft greyed-out anchor placeholder hint, "place a bet" CTA breathing gently.
9. **Streak indicator** — when the player gets 3+ rounds right in a row, a "Streak ×3" badge ignites in the top-right with a chain animation linking the won anchors.
10. **Goal moment override** — when the underlying match scores, the entire waveform area momentarily flares gold and a "GOAL" word stamps in for 800ms before settling. This is *the* moment.

### 2.7 UI Components Required

For each: full anatomy, all 18 states (per parent design system §2.23), tokens used, motion behavior, accessibility, props/API.

- `MapigoWaveform` — the canvas component.
- `RoundBand` — the active 60s window overlay.
- `PredictionTray` — 3-button SPIKE/DRIFT/CALM tray with live pool counts.
- `MapigoStakeInput` — variant of platform StakeSlider tuned for Mapigo cycles.
- `RoundResultCard` — settlement card showing what just happened.
- `RoundsFeed` — list of last N rounds with mini-waveform thumbnails per round.
- `StreakBadge` — animated streak indicator.
- `MatchSelector` — modal/sheet to switch which live match the waveform is following.
- `MapigoHelpSheet` — first-time onboarding overlay (see §2.8).
- `GoalFlash` — full-screen goal moment override.
- `MapigoLeaderboardMini` — top 5 of the current session, sticky right-rail.
- `OutcomePill` — small pill with SPIKE/DRIFT/CALM result, used in feeds and history.

### 2.8 First-Run Onboarding

3 screens max, dismissible after first round. Goal: a brand-new player should grok the game in under 15 seconds.

- Screen 1: the waveform + caption "Watch the pulse of the match. Tazama mapigo ya mechi."
- Screen 2: the 3 calls + caption "Every minute, a new round. Will the pulse SPIKE, DRIFT, or stay CALM? Kila dakika, raundi mpya."
- Screen 3: the pool concept + caption "All stakes pool. Winners share. Madau yote bwawani. Washindi hugawana."

Each screen has a tiny animated demo of the concept it explains.

### 2.9 Sound Design (Mapigo-specific)

- **Ambient bed:** very quiet heartbeat at ~60 BPM, looping, sub-bass dominant. -28 LUFS.
- **Spike sound:** soft "thwip" — pitched up rising whoosh, 250ms.
- **Round-open chime:** single warm bell tone, 400ms.
- **Round-resolve chime:** two-note descent (lost) or ascent (won), 600ms.
- **Goal flash:** layered crowd swell + gold shimmer, 1.2s.
- **Mute by default**, respects system mute always, user toggle persists.

### 2.10 Haptics (Mapigo-specific)

- `MAP_BEAT` — single light tick on each ambient heartbeat (only when game is in foreground; throttle to ≤1/s).
- `MAP_SPIKE` — sharp medium pulse on each spike.
- `MAP_PLACE` — `H_TICK` reused, on bet placement.
- `MAP_WIN` — heavy + light + light pattern (reuse `H_WIN`).
- `MAP_GOAL` — heavy single + light double (a small tribute pattern).

### 2.11 Color Palette (Mapigo extensions to Kipindi tokens)

Inherit all Kipindi tokens. Add:

- `mapigo.beat` — the live waveform stroke color (`#DEBC54` dark / `#B58A21` light).
- `mapigo.beat-glow` — peak glow.
- `mapigo.calm-fill` — area fill below the line in calm regions (royal-tinted, ~20% opacity).
- `mapigo.spike-fill` — area fill at spike peaks (gold-tinted, ~40% opacity).
- `mapigo.spike` — SPIKE call accent (`var(--bet-hot)`).
- `mapigo.drift` — DRIFT call accent (`var(--gold)`).
- `mapigo.calm` — CALM call accent (`var(--bet-cold)`).
- `mapigo.round-band` — translucent overlay color for the active 60s window (gold, 8% fill, 1px gold border).
- Goal-flash gradient (specific to Mapigo, not in main system).

Provide hex values + CSS variable names. Add to `tokens.json` under `extensions.mapigo`.

### 2.12 Backgrounds & Atmospheric Imagery

- **Game-canvas background:** layered. Bottom layer = `--g-brand` gradient. Middle layer = subtle constellation/star points (small gold dots, ~0.5% density, 2px max). Top layer = Sokoni/Mfumo pattern from the parent system at 3% opacity. Maybe a very faint horizon glow at the bottom edge.
- **Hub-tile background:** the showpiece image. Featured-tile sized art that captures the entire concept in a single still — gold waveform on starfield, one clear spike, "MAPIGO" wordmark stamp.
- **Splash screen** for direct-launch: same as hub-tile but full-bleed, with the wordmark + tagline + a subtle line "Connecting to live match…" loader.
- **Marketing OG cards** — 1200×630 in 3 variants: launch announcement, "Mapigo just paid TZS X" big-win share, leaderboard reveal.
- **Email header banner** for monthly statement Mapigo-section.

### 2.13 Game Lifecycle & States

For each, deliver UI spec + copy EN/SW:

1. Pre-game: no live match selected. Show "Choose a match · Chagua mechi" picker.
2. Connecting: animated waveform connecting to match feed.
3. Round open: 60s countdown, prediction tray active.
4. Bet placed, round in progress: anchor visible, can't place again this round (one bet per round).
5. Round resolving: 5-second hold while server settles.
6. Round resolved: result card slides in, balance updates, streak updates, recent-rounds feed prepends.
7. Round closed (didn't bet): no resolution shown, just the band moves on.
8. Match goal scored: full-screen flash override.
9. Match halftime: pause overlay, "Resumes at kickoff · Inarudi sasa".
10. Match ended: "Match ended. Switch to another live match? · Mechi imekwisha."
11. Match abandoned: refunds spec.
12. Disconnection: "Reconnecting… · Inajaribu kuunganisha tena", visual: waveform freezes with greyed-out tone.
13. Player self-exclusion active: blocked screen with helpline copy.
14. Player limit reached: blocked with "Daily limit reached · Kikomo cha leo kimefika".
15. Empty pool round (only one player): solo round still pays based on ×rate, but pool indicator notes "low liquidity".

### 2.14 Accessibility

- Waveform also speaks: live region with simple textual updates ("Pulse rising," "Spike at 0:43") — rate-limited.
- Color is never the only signal — SPIKE/DRIFT/CALM also have icons (lightning / wave / flat-line).
- Reduced-motion: replace the live waveform animation with a series of static snapshots updated every 5s. Keep gameplay viable but kill the moving-line.
- Keyboard play: 1/2/3 for SPIKE/DRIFT/CALM, +/− to change stake, Enter to place.

### 2.15 Performance & Data

- Waveform must run at 60fps on a 3GB Android with a 3G connection.
- Live data feed delta-only; full snapshot on connect, incremental every 1–2s.
- Canvas should be SVG-based (so it scales) with `will-change` hints, NOT a heavy canvas/WebGL solution. Budget: 100KB JS for Mapigo on top of the platform shell.

### 2.16 Brand Bundle (final delivery)

```
MAPIGO_ASSETS/
  /logo
    mapigo-wordmark.svg
    mapigo-glyph.svg
    mapigo-stacked.svg
    mapigo-mono-dark.svg
    mapigo-mono-light.svg
    mapigo-reverse.svg
  /tile
    hub-feature-480x600.png  (and svg)
    hub-small-320x128.png    (and svg)
  /splash
    splash-1080x1920.png
    splash-2160x3840.png
  /icon
    app-icon-1024.png
    notification-24.png
  /og
    og-launch.png
    og-bigwin.png
    og-leaderboard.png
  /sprites/
    spike-particles.svg
    round-band.svg
    anchor-states.svg  (default / won / lost)
    streak-chain.svg
    goal-flash.svg
  /sound (24-bit/48kHz wav masters + caf/ogg deliverables)
    mapigo-ambient-loop.wav
    mapigo-spike.wav
    mapigo-round-open.wav
    mapigo-round-win.wav
    mapigo-round-lose.wav
    mapigo-goal-flash.wav
```

### 2.17 Hard Constraints

1. Must inherit all Kipindi design tokens — only add Mapigo-specific extensions.
2. Mobile-first.
3. No literal tribal stereotypes, no acacia trees, no sunsets.
4. Must respect `prefers-reduced-motion` everywhere.
5. EN + SW from day one — every string in both, in the same delivery.
6. Logo/wordmark must work at 16px monogram and at 200px hero size.
7. The hub-tile image must be recognizable and beautiful at 320×128 *and* at 480×600.
8. No copyrighted music, no sports-team marks, no real player names anywhere.
9. Compliance footer space is reserved on every game screen.
10. Game canvas must function with audio fully muted (visual + haptic cues sufficient).

### 2.18 Acceptance Criteria

- A frontend engineer can implement Mapigo from `MAPIGO_DESIGN.md` + the asset bundle without asking a single follow-up question.
- The hub-tile image is beautiful enough to use as the launch promo banner without modification.
- Every UI component lists its 18 states, tokens, motion, a11y, and API.
- Every copy string is paired EN + SW.
- The waveform behavior is specified mathematically (amplitude, period, spike profile) so it's reproducible.
- Color tokens are added to `tokens.json` under `extensions.mapigo` and pass AA contrast.

---

## 3. What's NOT in scope for this brief

- Don't redesign the Kipindi parent system. Inherit it.
- Don't propose tech stack — frontend will be Next.js + SVG + the existing Kipindi component library.
- Don't include real broadcast clips, player photos, real team marks. Abstract only.

---

## 4. After Delivery

Once Claude Design returns `MAPIGO_DESIGN.md` + `MAPIGO_ASSETS/`:
1. The 5 placeholder mini-games (Tribal Clash, Lucky Interval, Momentum Rush, Streak Chain, Voice Bet) are **deleted** from the Kipindi codebase.
2. A new `/mapigo` route is built using the spec.
3. The Mini-Games hub becomes a single hero tile for Mapigo only.
4. Mapigo is added to the bottom-nav as a dedicated entry point on mobile (replacing the generic FAB).
5. Marketing pre-launch teaser uses the hub-tile image.

---

**Once the design comes back, paste it to me and I'll build the route in a single sprint.**
