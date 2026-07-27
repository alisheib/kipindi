# 50pick haptics

A named vibration vocabulary, not `navigator.vibrate()` scattered through interaction
code.

```js
import { haptic, hapticImpact, setMuted, getMuted, hapticsAvailable } from "./needle-haptics.js";

haptic("grab");            // named pattern
hapticImpact(0.9);         // scaled by real impact speed (px/ms)
setMuted(true);            // for the settings panel
```

| Pattern | Fires on | ms |
|---|---|---|
| `grab` | picking an object up | 5 |
| `wake` | tap-to-wake from a screen edge | 4 · 26 · 7 |
| `cross` | the needle sweeping past true at speed | 3 |
| `tuck` | arriving parked at an edge | 8 |
| `settled` | coming to rest — two soft beats, like a latch closing | 5 · 34 · 9 |
| `hapticImpact(speed)` | wall contact, proportional | 5–16 |

## Rules
- **Physical events only.** Contact, passing true, coming to rest. Never encouragement,
  never reward, never to pull attention back.
- **Proportional.** A hard hit buzzes harder because it *is* harder. Under 0.35 px/ms
  nothing fires — a graze you should see but not feel.
- **Rate-limited to 40ms.** Closer than that is indistinguishable to skin and only
  costs battery.
- **Silent when asked.** `prefers-reduced-motion`, the in-app mute
  (`50pick.haptics.muted`), or a hidden document suppress everything.
- **Fails silently** where unsupported. No feature-detection in calling code.

## iOS
The Vibration API does not exist in Safari, so iOS gets no haptics. There is no
legitimate web substitute — the AudioContext trick is a dark pattern and behaves
inconsistently. **Do not add a fake one.**
