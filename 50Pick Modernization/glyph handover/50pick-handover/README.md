# 50pick — Dark Glass · Handover

Finishing the kit to 100%: the net-new glyphs and the design-authority calls so engineering
can run the lucide purge + unify refactors without guessing.

## Contents

| File | What it is |
|---|---|
| **`Glyph Pack & Decisions.html`** | Open this first. The full delivery rendered on the royal canvas — all 30 glyphs at 14px + 22px, a validation strip, the empty-state line-arts, and Part B/C decisions. Click any glyph card to copy its `key: (p) => …` line. |
| **`glyphs-additions.tsx`** | Paste targets for `src/components/ui/glyphs.tsx`. The 30 glyphs + 3 empty-state line-arts as drop-in members of `I`, each tagged with its lucide ref. |
| **`DESIGN_AUTHORITY_DECISIONS.md`** | Plain-text record of the Part B (B1–B6) + Part C calls for engineering to action. |

## Part A — glyphs (30)

**Player (10):** `mail` · `calendar` · `device` · `vibrate` · `smartphone` · `shieldQuestion` ·
`fileSignature` · `percent` · `link` · `messageWhatsapp`

**Admin (20):** `keyRound` · `megaphone` · `database` · `server` · `landmark` · `fileText` ·
`fileCheck` · `fileSpreadsheet` · `brain` · `bot` · `shieldAlert` · `shieldOff` · `heartPulse` ·
`rotateCcw` · `archive` · `xCircle` · `alertOctagon` · `arrowUpFromLine` · `arrowDownToLine` ·
`scrollText`

**Bonus (3 empty-states):** `emptyMarkets` · `emptyPositions` · `emptyLeaderboard`

All drawn to the kit construction: 24×24 grid · 1.9 stroke · round caps + joins · `currentColor` ·
`fill="none"` (tiny accent dots fill). The shield-family glyphs reuse the kit `shield` path so they
sit identically beside `shieldcheck`.

## Part B / C — decisions

B1 one `.surface` primitive · B2 4px-base spacing + radius scale · B3 kill light mode ·
B4 motion tiers (keep only live status-dot at `reduced`) · B5 move upvote off gold → aqua ·
B6 chips static on mount, pulse on in-place change. Part C: empty-states delivered, win-celebration
final, classic-reading surfaces flagged.

See the HTML for the rendered version and the `.md` for the actionable spec.
