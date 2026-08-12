# Language and real content — measured, not asserted

Every number here was computed from the real dictionary (`src/lib/i18n-dict.ts`, 1,706 keys
per locale, in exact parity). Nothing is quoted from a design document. Where our own
documentation disagreed with the measurement, **the measurement won** — and it did, twice.

---

## 1 · Swahili expansion — our own docs were wrong in both directions

Our rulebook says *"Swahili at ~35–40% longer"*. Four other documents repeat ~35%.
Measured over all 1,703 shared keys with a non-empty English value:

| | ratio SW/EN |
|---|---|
| median | **1.083** |
| mean | 1.167 |
| p75 | 1.322 |
| **p90** | **1.600** |
| **p95** | **1.889** |
| max | 6.333 |

Aggregate over total characters: 48,863 → 51,461 = **+5.3%**. And 508 of 1,703 Swahili
strings are *shorter* than English.

So "+35–40%" **overstates the typical case by 2–4×**. But it also **understates the tail**,
and the tail is the only part that breaks a control:

| slice | n | median | p90 | p95 | max |
|---|---|---|---|---|---|
| short labels (EN ≤ 24 chars) | 1,175 | 1.167 | 1.741 | 2.000 | 6.333 |
| button-sized (EN ≤ 14 chars) | 805 | 1.182 | 1.889 | 2.250 | 6.333 |
| prose (EN ≥ 60 chars) | 216 | 1.009 | 1.160 | 1.224 | 1.384 |

**30.0% of control-sized labels exceed 1.35×.** A control designed to "1.35×" breaks on
roughly one label in three.

> ### The budget to design to
> **Short labels: fit at 1.75× (p90). Prove at 2.25× (p95 of button-sized).**
> **Prose: no extra room needed — Swahili prose is the same length as English (median 1.009).**
> Expansion is a *label* problem here, not a paragraph problem. Spend the room where it is used.

## 2 · Chinese is not narrower on screen

Our rulebook says *"Chinese at ~50% shorter"*. By characters it is **62.5% shorter**
(mean 0.375; 89% of keys ≤ 0.50). So the compression is real — and irrelevant.

**88.2%** of Chinese characters here are fullwidth CJK, which advance about **twice** a Latin
character. Modelled advance width (fullwidth = 1em, halfwidth = 0.5em — *modelled, not
measured in a browser*): **mean 0.715, median 0.667, p90 1.000.**

> **Chinese is ~62% shorter in characters but only ~28% narrower on screen, and at p90 it is
> exactly as wide as English. ⛔ Do not shrink any container for Chinese.**

Its real problems are different, and both are ours to hand you:
- The **8.5px and 9.5px** micro tiers are **illegible in CJK**. A CJK glyph at 8.5px is a smudge.
- **No CJK webfont is downloaded, deliberately** — a CJK face is megabytes and our players are
  on Tanzanian mobile data. Chinese renders through system fallback, so it will **not** match
  whatever Latin face you choose. Design for a face you do not control.

## 3 · The worst label on the platform, and it is in the global chrome

| key | EN | SW | ratio |
|---|---|---|---|
| `nav.leaderboard` | `Top` (3) | `Jedwali la Washindi` (19) | **×6.33** |
| `nav.live` | `Live` (4) | `Mubashara` (9) | ×2.25 |
| `market.udSourceFx` | `Live currency market` (20) | `Soko la fedha za kigeni la moja kwa moja` (40) | ×2.00 |
| `help.faqTitle` | `Frequently asked` (16) | `Maswali yanayoulizwa mara kwa mara` (34) | ×2.13 |
| `Tech` (category chip) | `Tech` (4) | `Teknolojia` (10) | ×2.50 |
| `Weather` (category chip) | `Weather` (7) | `Hali ya hewa` (12) | ×1.71 |

A **three-character English tab becomes a nineteen-character Swahili one**, in a top bar that
is already known to overflow between 1024 and 1279px. If the new navigation cannot hold
`Jedwali la Washindi`, it does not work in Swahili.

## 4 · Real content to lay out against — do not use lorem

**The 7 categories** (Politics is deliberately absent — Gaming Board licence). All eight chips,
including a leading "All", must fit **one scrolling line at 360px**:

`Sports/Michezo/体育` · `Macro/Uchumi/宏观` · `Weather/Hali ya hewa/天气` ·
`Crypto/Kripto/加密货币` · `Culture/Utamaduni/文化` · `Tech/Teknolojia/科技` · `Other/Nyingine/其他`

**Real market questions that ran on production** — these are the strings the card must hold:

- `Will EWURA's August 2026 petrol retail cap for Dar es Salaam fall below TZS 3,900 per litre?` (91 chars — the longest the board has carried)
- `Will Dar es Salaam receive measurable rainfall on Saturday August 1 OR Sunday August 2, 2026?` (92)
- `Will a Tanzanian runner break 28:00 in the next World Athletics 10K?` (68)
  → SW `Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?` (84)
- `Will Simba SC win the next Kariakoo Derby?` (42) → SW (48)
- `Will the S&P 500 close higher this week?` (40) → SW (35 — **shorter**)

Measured over the 40-market catalogue: EN mean **53.0** chars (max 76); SW mean **59.4** (max 84);
ratio 1.124. **Every Swahili question opens with `Je, `** — a fixed 4-character prefix on every
card title.

⚠️ **The card clamps the question to two lines** (15px display face, line-height 1.34,
`-webkit-line-clamp: 2`). Comfortable against EN mean 53. Not comfortable against SW max 84.
This is the single hardest layout constraint in the product, and it is worth solving properly
rather than inheriting.

⚠️ **None of the 40 catalogue questions has a Chinese translation.** A Chinese player reads
the English question. That is a content gap, not a design one — but it means a ZH layout must
survive an English string inside it.

**Real money figures, as production formatted them:**
`TZS 59,450` · `TZS 3,740` · `TZS 260` · `TZS 8,700` · `TZS 96,250` · `TZS 90,653` · `TZS 1,000,000`
Quick-stake chips render bare magnitudes on one 360px line: `100 · 200 · 500 · 1K · 100K`.
Widest realistic figure: **TZS 1,000,000** — 11 glyphs plus prefix.

## 5 · How money is written today

`TZS 1,234` — code as a **prefix**, one space, comma thousands, **zero decimals**. Negative uses
a real minus sign **U+2212**, never a hyphen. Signed form puts the sign outside the code:
`+TZS 1,234` / `−TZS 1,234`. Compact: `TZS 25K` · `TZS 1.5M` · `TZS 1.5B`.

⚠️ **The number locale is hardcoded `en-US` for all three languages.** Chinese and Swahili
players see en-US grouping. Nothing localises the numeral. Worth a recommendation from you.

## 6 · Two claims in our own docs that the code does not honour

Told to you plainly, because you would otherwise inherit them as rules:

**"Every numeral is JetBrains Mono, no exceptions" — false in the code.** Four numeral surfaces
render on the *display* face, and three are the platform's most prominent numbers:
`.mterm-pct` (the big probability %), `.pool-amt` (**a money figure**), `.num-roll` (the rolling
number), `.countdown-ring .ring-num`. A replacement type system must decide these four
deliberately rather than assume the rule held.

**`.tabular` was used ~230× before it was ever defined** — so every one of those was silently a
no-op. The lesson generalises: in the system you deliver, **a class that does not resolve must
be impossible**, not merely discouraged.

---

*Measured 2026-08-11 from `src/lib/i18n-dict.ts` (1,706 keys × 3 locales, 0 missing, 0 extra),
`src/lib/utils.ts`, `src/lib/server/market-service.ts`, `src/app/globals.css`. Character counts,
not rendered pixel widths — the Chinese advance-width figure is explicitly modelled from a
measured 88.2% fullwidth share, not captured from a browser.*
