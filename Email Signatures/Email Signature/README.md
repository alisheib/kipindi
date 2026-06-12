# 50pick — Email Signature · Handover

Direction B "Needle" (Brand Kit v2). Two files:

| File | For |
|---|---|
| **`signature-preview.html`** | Open in a browser — self-contained, works offline. Shows the signature in a Gmail context + primary / dark / compact variants, with a **Copy** button that puts the paste-ready markup on your clipboard. Easiest install for Gmail / Apple Mail / most web clients. |
| **`signature.html`** | The raw paste-ready markup (table-based, inline SVG). For Outlook or templating systems. Header comment explains per-person swaps + the SVG→PNG fallback for old Outlook. |

## Install (Gmail / Apple Mail)
Open `signature-preview.html` → click **Copy** → paste into the client's signature box.

## Per-person swap
Change only: name · role · `mailto:` + email text · phone · city.
Keep: brand colors, the gilt needle-rule, the `50pick.tz · Soko la Utabiri` tagline, and the `.tz` suffix.

## Notes for the developer
- **Fonts**: Sora / JetBrains Mono / Inter with `Segoe UI` / `Courier New` / Arial fallbacks — mail clients rarely load web fonts; layout + color hold regardless.
- **Mark**: inline SVG, crisp at any zoom, no hosted image. If a client strips SVG (older desktop Outlook), swap the `<svg>` for `<img src="https://50pick.tz/icons/mark-color-512.png" width="74" height="74">` (the kit PNG).
- Source mark + full kit live one level up in `logo-kit/final/`.
