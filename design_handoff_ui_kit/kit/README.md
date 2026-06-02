# Kit — shared primitives

Defined **once**, used platform-wide. Features import these; they never copy
them. Two groups:

## brand/
- `brand.tsx` — the brand surface: logo/wordmark, marks, `BrandSpinner`, and
  small brand bits like the `SignalPip` and `TippingBar` used across markets.
- `brand-topo.tsx` — the topographic/heraldic background motif.
- `theme-provider.tsx` — wires the token theme + reduced-motion handling.

## ui/  (the primitive library)
| File | Component |
|---|---|
| `button.tsx` | Buttons — variants (primary/gold/royal/yes/no/ghost) + sizes (sm/md/lg). |
| `chip.tsx` | Chips — status/category/signal pills (the `.chip` CSS in `globals.css`). |
| `card.tsx` | Generic surface/card container. |
| `input.tsx` / `password-input.tsx` / `phone-input.tsx` | Form fields (phone = Tanzania `+255`). |
| `submit-button.tsx` | Form submit with pending state. |
| `tabs.tsx` | Tab switcher. |
| `toggle.tsx` | On/off toggle. |
| `language-toggle.tsx` | EN · SW switch. |
| `toast.tsx` | Toast notifications. |
| `tooltip.tsx` / `info-hint.tsx` | Tooltip + inline info hint. |
| `avatar.tsx` | User avatar. |
| `countdown-pill.tsx` | Compact time-remaining pill. |
| `empty-state.tsx` | Calm empty/zero-data treatment. |
| `confirm-dialog.tsx` | Generic confirm modal. |
| `skeleton.tsx` | Loading shimmer. |
| `spinner.tsx` | Spinner. |

All of these read from the tokens in `tokens/globals.css` — restyle by moving
tokens/classes, not by hardcoding values.
