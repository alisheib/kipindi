# D2 · /updown board — implementation spec

Visuals: `UpDown D2 Canvas.dc.html` (3a desktop 1280, 3b mobile 360, 3c paused-chain empty, 3d loading skeleton).
Cards are D1 (`D1-updown-card-spec.md`) — nothing on them changes here.

---

## 1 · Redlines

Page frame
- canvas `--bg`, padding 22px 16px 56px, content `max-width: 1232px` centred
- vertical stack gap 18px (header → tabs → results strip → grid)

Header
- eyebrow "LIVE ROUNDS": mono 11px/700, ls 0.16em, uppercase, `--text-subtle`
- title: Sora 28px/700, ls −0.02em, `--text`
- explainer: body 13.5px, lh 1.55, `--text-muted`, max-width 560px

Price tape
- bar: bg `--bg-inset`, border 1px `color-mix(--border 70%, transparent)`, radius `--r-md`, padding 9px 14px, flex gap 18px, wraps at 360 (no marquee — wrap keeps it readable and reduced-motion-safe)
- per asset: name mono 9.5px/600 ls 0.10em uppercase `--text-subtle` · price mono 13px/700 tabular · move mono 10.5px/600 + 9px arrow (3px stroke) — price+move in `--yes-300`/`--no-300` by direction, arrow + sign so colour is never the only signal
- right: `.live-dot` + "STREAMING" mono 9.5px `--text-faint`
- a third/fourth asset appends inline and wraps — no layout change

Asset tabs (primary)
- 36px pill-rect, radius `--r-sm`, padding 0 16px, body 13.5px/600
- rest: border `--border`, bg `color-mix(--bg-elevated 60%, transparent)`, ink `--text-muted`
- active: border `--brand-500`, bg `oklch(40% 0.12 262 / 0.35)`, glow `0 0 10px oklch(63% 0.18 262 / 0.15)`, ink `--text` (kit nav-active idiom; cyan reserved for links/nav per rules)
- extensible: flex-wrap row; new assets are new buttons, zero reflow

Duration tabs (secondary)
- 28px, mono 11.5px, padding 0 12px; rest: transparent, ink `--text-subtle`; active: border `--border-strong`, bg `--bg-inset`, ink `--text` — deliberately quieter than asset tabs (no brand ring)

Recent results strip (heartbeat)
- label "LAST ROUNDS" mono 9.5px/600 ls 0.10em `--text-faint`; trailing "oldest → newest" mono 9px
- 12 pips, 18×18, radius `--r-xs`, gap 4px, 9px arrow (3.2px stroke)
- UP pip: bg `oklch(52% 0.15 150 / 0.22)`, edge `oklch(61% 0.16 150 / 0.5)`, ink `--yes-300` (kit `.chip-yes` recipe)
- DOWN pip: `.chip-no` recipe, ink `--no-300`
- VOID pip: transparent bg, edge `--border`, ink `--text-faint`, horizontal dash glyph — neutral, present in history without reading as loss

Card grid
- `repeat(auto-fill, minmax(300px, 1fr))`, gap 16px, `align-items: stretch` → 1 col ≤~630px, 2 at 768, 3 at 1280 (1232 content), 4 at 1920. Equal heights + aligned button baselines come from the D1 card's bottom-pinned footer.

Empty state (operator paused the chain)
- dashed border 1px `--border-strong`, radius `--r-lg`, bg `--bg-elevated`, padding 44px 24px, centred
- line-art paused-chain glyph (dashed 1.5px `--brand-400` path)
- title Sora 16px/600; body 13px `--text-muted` max 360px; `.btn-ghost .btn-sm` "See other durations"
- no error styling, no placeholder cards, copy says the chain restarts automatically

Loading skeleton
- same grid; per card: `.skeleton` blocks mirroring D1 anatomy (40px circle avatar, title lines, 52px countdown band, 5px split bar, 44px stake row, 2×46px buttons) inside the D1 card shell recipe

### New values not in the kit
1. results-strip pip (18×18, `--r-xs`, chip-recipe fills) — propose as `.pip-up/.pip-down/.pip-void`
2. duration-tab quiet-active treatment (border `--border-strong` + `--bg-inset`)
3. price-tape bar (reuses stake-row surface recipe from D1 — same tokens, new context)

---

## 2 · Component contract

```
UpDownBoard (page)
  assets           AssetTape[]           // 1..n, operator-enabled
  activeAsset      string
  activeDuration   5 | 15 | 30
  rounds           UpDownCardProps[]     // filtered by asset+duration
  recentResults    ("UP"|"DOWN"|"VOID")[] // <=12, oldest→newest; fewer renders fewer pips
  chainState       "running" | "paused"  // paused => empty state, even with history
  loading          boolean

AssetTape
  name             string
  livePrice        number | null         // null => name + "—" (never 0); tape entry stays
  movePct          number | null
  dir              "up" | "down" | null
```

Mutually exclusive: `loading` → skeleton; else `chainState === "paused"` → empty state; else grid. Results strip renders whenever `recentResults.length > 0` (also above the paused state — history is real data).

Unknown values: tape with `livePrice null` shows an em-dash and no arrow; `recentResults` empty hides the strip entirely (no grey placeholder pips).

---

## 3 · Notes & open questions

1. Tape updates: recommend value-flash via 220ms `--dur-quick` opacity tick, no movement — needs motion sign-off.
2. Should the paused empty state keep the price tape live? Currently yes (the asset still trades; only our rounds pause).
3. Pip strip is per asset+duration filter. Global instead? Contract assumes filtered.
4. At 1920 the 4-col grid implies max-width lift to ~1648px — flagged, not shown.
