# Request #1 — Haptics system

## What we want
A small, centralized **haptics vocabulary** mapped to product events, so the app *feels* tactile on mobile without being noisy. Today we have zero haptics. We want a single helper (e.g. `haptics.success()`, `haptics.tap()`) plus a clear rule for which events fire which pattern.

## Constraints
- Target the **Web Vibration API** (`navigator.vibrate(pattern)`) for Android/Chrome; gracefully no-op where unsupported (iOS Safari ignores it — design so the *animation* still carries the moment there).
- **User-disablable** + respect a "reduce" preference (tie to the same setting surface as reduced-motion if sensible). Default: ON for key money/outcome moments, OFF for routine taps.
- **Restraint:** haptics are punctuation, not a drumbeat. No vibration on every tap/scroll. Reserve them for moments that matter (money moved, outcome decided, action confirmed, error).

## Please specify
1. A **named pattern set** (the "haptic tokens"), e.g. `tap` (light, ~10ms), `select`, `confirm`, `success`, `warning`, `error`, `celebrate` (a richer multi-pulse for a win) — with exact `vibrate()` millisecond patterns for each.
2. An **event → pattern mapping table** covering at least:
   - Place prediction / confirm bet · cash-out
   - Deposit success · withdrawal submitted · transaction failed
   - Win reveal (celebrate) · loss (soft, or none)
   - Reward earned (referral/affiliate/proposal prize)
   - Vote up/down on a proposal · proposal submitted
   - Toggle / chip select (light) · destructive confirm (self-exclude, close account)
   - Form validation error
3. How haptics **pair with the existing animations** (e.g. `celebrate` haptic fires on the same frame as `win-burst`).
4. The **opt-out UX** (where the setting lives — likely `/profile/responsible-gambling` or a new "Sound & feedback" row — and the persistence approach).

## Deliverable
- A spec doc with the pattern set + mapping table.
- A tiny helper module sketch: `src/lib/haptics.ts` exporting the named functions (feature-detect + respect the setting).
- Notes on the iOS fallback (lean on motion since vibration is unavailable).
