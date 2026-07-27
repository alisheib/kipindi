# Typography

## Families (tokens)
| Token | Stack | Job |
|---|---|---|
| --font-display | 'Sora', system-ui, CJK fallbacks, sans-serif | headings, card titles, empty-state titles |
| --font-body | 'Inter', system-ui, CJK, sans-serif | body copy, button labels |
| --font-mono | 'JetBrains Mono', ui-monospace, CJK, monospace | **every number**: prices, countdowns, TZS amounts, %, counts, timestamps, IDs; micro-labels |
| --font-cjk | PingFang SC / Hiragino Sans GB / Microsoft YaHei / Noto Sans CJK SC… | per-glyph Chinese fallback — no CJK webfont download (Tanzanian mobile data) |

Live product loads via Google Fonts: Sora 400–800, Inter 400–700, JetBrains Mono 400–600 (import removed in this offline archive; documented at the top of tokens.css).

## The number law
Every numeral is JetBrains Mono with `font-variant-numeric: tabular-nums`. No exceptions — including numbers inside body sentences when they are data (stakes, odds, times).

## Type scale (tokens)
--type-hero 72 · display-1 60 · display-2 44 · h1 32 · h2 24 · h3 20 · h4 17 · body 15 · small 13 · micro 11 (px).

## Working sizes as used (GIVEN kit + 2026 surfaces)
| Role | Spec |
|---|---|
| Page title | Sora 28/700, ls −0.02em, lh 1.15 |
| Page eyebrow | mono 11/700, ls 0.16em, uppercase, --text-subtle |
| Section head | Sora 20/600 |
| Card title (MarketCard) | Sora 17/600, lh 1.3, ls −0.01em |
| Card title (UpDownCard) | Sora 14.5/600, lh 1.25, ls −0.01em, single-line ellipsis |
| Countdown digits (D1) | mono 28/700 tabular, ls 0.05em, lh 1 |
| Hero money value | mono 34/700 tabular, ls −0.02em, lh 1 |
| Ledger value | mono 18–19/700 tabular, lh 1.1 |
| Body copy | Inter 13–13.5, lh 1.5–1.6 |
| Stat label | mono 9.5/600, ls 0.10em, uppercase |
| Micro label / footer | mono 8.5–10, ls 0.03–0.14em |
| Chip text | uppercase, 700, ~0.06em tracking (kit .chip) |
| gilt-eyebrow | mono 10, ls per class (kit) |

Note: the 8.5–9.5px mono micro-labels were INVENTED for card density at 360px (flagged in the D1 spec §New values) — uppercase tracking labels only, never reading copy. Print floor stays 12pt; app reading copy floor is 12.5px.

## Multi-language
Copy ships in English, Swahili, Chinese. Every label must survive ~35% text expansion without clipping — prefer wrap or ellipsis-with-title, never fixed-width truncation of money or timestamps. Chinese renders through --font-cjk per-glyph substitution.
