# Superseded — do not resurrect these

The team has been bitten before by an old kit resurfacing and being treated as current. This file is the antidote. If you find any of the following in kit-source/, it is HISTORY, not guidance.

## 1 · Teal as the brand accent (first-generation kit)
**What:** --teal-* used for primary buttons, hover borders (MarketCard hover: --teal-500), empty-state art, SteppedProgress, --royal aliases.
**Replaced by:** brand blue hue 262 (--brand-*) for chrome/focus/hover, royal indigo canvas hue 268, aqua 195 strictly for links/nav/finishing.
**Why:** the royal indigo re-theme (~2025–26) anchored the product to #060a50; teal fought both the new canvas and aqua. Tokens remain only as compat aliases.
**Status in code:** kit specimens still reference teal; tokens.css keeps the ramp so they render. New surfaces must not.

## 2 · Near-neutral dark canvas (hue ~240, low chroma)
**What:** specimen backgrounds like oklch(15% 0.012 240).
**Replaced by:** the royal canvas — oklch(15% 0.130 268) and friends.
**Why:** brand distinctiveness; cards needed chromatic depth to stack.

## 3 · 🔥 streak chip (LeaderboardRow specimen)
**Replaced by:** plain mono number (+ optional streak-tick scale animation).
**Why:** no-emoji invariant; gamification restraint (no flames).

## 4 · Spinning win sunburst
**Replaced by:** win-aura-breathe — a calm gilt glow that breathes, no rotation.
**Why:** read as slot-machine; casino-energy ban.

## 5 · Gradient YES/NO/gold buttons (v1 kit)
**Replaced by:** flat solid fills + 1px inset top highlight (v2 kit note in tokens.css). Primary alone keeps its gradient.
**Why:** one coherent button family; gradients read as gambling chrome.

## 6 · 4× SummaryCell grid on /positions (app code, position summary)
**Replaced by:** the "Your standing" glass-panel ledger strip (2026-06, _specs-as-delivered/pnl-summary-strip.tsx).
**Why:** four loose boxes had no hierarchy; the strip reads as one ledger and carries the win-rate needle.

## 7 · Normalised (0–1) P&L chart on /positions/performance
**Replaced by:** PnlChart with real cumulative TZS axis (max / 0 / min) and a gilt break-even line.
**Why:** an axis-less normalised line hid whether the player was actually up or down — violates unrealised-honesty spirit.

## 8 · Emoji toast icons (any) and sun/moon theme toggle glyphs
sun.svg / moon.svg exist in the glyph set from the kit era; a theme toggle is banned (one dark theme). The glyphs stay archived for completeness — they must not ship a toggle.

## 9 · Flat brand hues on The Needle
**What:** the fidget painted in `#1EA362` / `#B03A3E` at full saturation, as the mark is.
**Replaced by:** the enamel livery — same hues (152, 22), lightness and chroma pulled
down, plus polished inlay arcs at the rim.
**Why:** a saturated red/green disc that spins reads as a carnival prize wheel, which is
the exact wrong signal for a responsible-play object; and it diluted the YES/NO
semantics that must mean one thing only on betting surfaces. It also simply looked
cheap — near-complementary hues vibrate along their boundary and #B03A3E reads vintage.
**Also rejected:** a fully monochrome indigo-steel version. Premium, but the brand
vanished. Details in 09-needle/NEEDLE-SPEC.md §0.

## 9b · Photoreal enamel on The Needle
**What:** three-stop enamel faces, a wet gloss crescent and a vignette.
**Replaced by:** the SIGNAL livery — near-flat faces, luminous hue edges, emissive needle.
**Why:** the object ships at 80px (40px tucked) and all of that nuance averages to a dark
blob at that size. It looked superb in a 4x screenshot and invisible on a live board.
Hierarchy, not material simulation, is what stops it reading as a prize wheel.

## 10 · `navigator.vibrate()` inline in interaction code
**Replaced by:** `needle-haptics.js` — a named vocabulary with rate limiting, a mute
setting and reduced-motion awareness.
**Why:** scattered calls cannot be rate-limited, muted, or reasoned about, and they
drifted toward haptics-as-reward, which the invariants forbid.
