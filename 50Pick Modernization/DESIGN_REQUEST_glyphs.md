# Design Request → Claude Design: 9 kit glyphs to finish the icon system

**For:** 50pick (Kipindi) — Tanzania pari-mutuel prediction-market platform, "Dark Glass" kit.
**From:** engineering. **Why:** we are removing all `lucide-react` icons from player-facing
screens for full kit consistency. ~90% map to existing kit glyphs; **these 9 have no kit
equivalent.** Rather than hand-draw them (and risk off-brand quality), please draw them to
match the existing kit glyph style so they slot straight into our icon set.

## The icon system they must match
All kit glyphs live in `src/components/ui/glyphs.tsx` and share ONE construction:

```jsx
const G = ({ children, s, ...p }) => (
  <svg viewBox="0 0 24 24" width={s||24} height={s||24} fill="none"
       stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
// each glyph:  name: (p) => <G {...p}>…paths…</G>,
```

**Style rules (match exactly):**
- 24×24 viewBox, **1.9px stroke**, `stroke="currentColor"`, `fill="none"` (no fills except
  tiny accent dots, which existing glyphs draw with `fill="currentColor" stroke="none"`).
- Round caps + round joins. Optical weight + corner radii consistent with the existing set.
- Single color (inherits `currentColor`); no gradients, no two-tone.
- Legible down to **12–14px** (these render small in chips/rows) and clean at 18–22px.
- Geometric, calm, "financial-grade" — same family as the existing `economy`, `crypto`,
  `shieldcheck`, `wallet`, `trophy` glyphs (see that file for reference).

**Deliver:** for each, the inner SVG markup (the children of `<G>`) — i.e. the `<path>/<rect>/
<circle>` lines — so we can paste as `name: (p) => <G {...p}>…</G>`. A small preview sheet at
14px + 22px on a dark royal background (`oklch(15% 0.13 268)`) would help us validate.

## The 9 glyphs (camelCase key · semantic · where it's used · reference)

| key | meaning | used on | reference |
|---|---|---|---|
| `mail` | envelope | help page, forgot-password, account (email/contact) | lucide `Mail` |
| `calendar` | date picker / scheduled date | proposals/new (resolution date), account (DOB) | lucide `Calendar` |
| `device` | a person's logged-in device (phone/laptop) | profile → sessions (active sessions list) | lucide `MonitorSmartphone` |
| `vibrate` | haptic feedback toggle | settings → sound & feedback | lucide `Vibrate` |
| `smartphone` | mobile handset (distinct from `phone` which is a call handset) | auth screens (mobile-money / app) | lucide `Smartphone` |
| `shieldQuestion` | shield with a query mark — account recovery / "why we ask" | forgot-password, privacy | lucide `ShieldQuestion` |
| `fileSignature` | document being signed — source-of-funds declaration | profile → source-of-funds | lucide `FileSignature` |
| `percent` | percentage — affiliate commission | profile → invite (Invite & Earn) | lucide `Percent` |
| `link` | chain link — copyable referral link | profile → invite (share link) | lucide `Link2` |

> Note: we already have these kit glyphs (do NOT redraw): chevronLeft/Right/Up/Down, check,
> x, info, warning, alertCircle, edit, camera, trash, phone, lock, unlock, user(s), wallet,
> coins, gift, ticket, share, comment, copy, download, upload, clock, pause, sparkle, trophy,
> shield, shieldcheck, logOut/In, activity, settings, star, crown, flag, bell, search, plus,
> + all category sigils (football, crypto, weather, economy, entertainment, tech, politics).
> Loaders use our `Spinner` component, not a glyph.

## Optional (nice-to-have, only if quick)
- A `messageWhatsapp` glyph (we share referral via WhatsApp; currently lucide `MessageCircle`).
- If any of the 9 above already exist in a newer kit drop, just point us to them.

## Theme context (so they read right on our surfaces)
Royal-indigo canvas (hue 268), gilt accent (hue ~80), aqua chrome (195). Icons render in
`--text` / `--text-muted` / `--text-subtle` and occasionally `--gold-300` — always single-color
via currentColor, so just nail the line work.

_Once delivered, we paste each into `glyphs.tsx` and swap the remaining lucide imports →
`I.<key>`, completing the player-facing icon system._
