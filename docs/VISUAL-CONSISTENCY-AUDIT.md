# 50pick — Visual Consistency Audit & Sign-off (pre-launch)

> Systematic colour / theme / kit / type audit run 2026-07-17 before go-live.
> Verdict: **the UI is consistent to a high standard.** One real drift found and
> fixed; the rest of what a naïve sweep flags is deliberate, self-consistent house
> style — documented here so it is never "re-fixed" into a regression.

## Method
Grepped the whole `src/components` + `src/app` tree against the canonical design
system (`src/app/globals.css` OKLCH token ramps + `tailwind.config.ts` token map).
Counted every deviation class; judged each in context (not by count alone).

## The canonical system (what "consistent" means here)
- **Single dark theme**, royal-indigo canvas (hue 268), pearl ink. No light mode.
- Semantic colour tokens: `royal` (chrome), `yes`/`no` (untouchable), `gold`/`gilt`,
  `claret` (editorial only), `aqua` (finishing ≤8%), `brand`, `success/warning/
  danger/info`, `bet-*`. All OKLCH, all via CSS vars → Tailwind classes.
- Full type / spacing / radius / shadow / z-index / motion scales in the config.

## Findings

| Check | Result |
|---|---|
| Raw hex in components (`#rrggbb`) | **0** |
| Arbitrary colour values (`bg-[#…]`, `-[oklch/rgb]`) | **0** |
| Off-palette "rainbow" classes (blue/red/green/amber/indigo/…) | **0** |
| Light-theme leaks (`dark:` variants) | **0** real — the 3 `dark:` hits are `QRCode.toDataURL({color:{dark,light}})` options, not Tailwind |
| Deprecated `teal-*` classes | **16 → FIXED** (converted to `royal-*`) |
| `bg-black/40…60` | Modal/overlay **scrims** — the canonical `modal.tsx` uses `bg-black/60`; consistent, kept |
| `bg-white` | QR-code backgrounds (must be white to scan) + toggle knobs — legitimate, kept |
| `text-white` (13) | White text on the `brand-500` pill (a self-consistent active-state group) + a few banners; the `--text-on-brand` token is **dark**, so converting would INVERT the colour — kept |

## The one fix (shipped @1f30f5d)
16 `teal-*` class / inline-var usages (admin source-links, the stepped-progress
bar, the home tone map) → `royal-*`. `teal-*` are **exact aliases** of `royal-*`
(`--teal-300: var(--royal-300)`), so this is **zero visual change** — it removes
the deprecated name (audit L5) from the component layer. tsc + build + integrity green.

## Deliberately NOT changed (intentional house style — changing = regression)
1. **Precise-pixel typography.** `text-[Npx]` is used **1478×** vs 265 named-scale
   uses — the dominant, intentional convention, including half-pixels (`12.5px`,
   `10.5px`, `11.5px`) the named scale literally cannot express. Converting would be
   lossy (changing sizes) and massive. The pixel values ARE the consistent system.
2. **White-on-brand-pill text** (13). A self-consistent group; the matching fg
   token is dark, so "fixing" it would flip the text colour. Left as the convention.
3. **`bg-black/*` scrims** — match the canonical `modal.tsx`; kept.
4. **The `--teal-*` CSS var block** stays as a compat shim — still load-bearing for
   `--royal` / `--bet-*` / gradients inside `globals.css`. Fully retiring it (rewire
   those internals + rename the `"teal"` tone API label) is optional post-launch
   tidy with no visual effect; not worth the core-token risk right before launch.

## Sign-off
Zero rogue colour, single enforced theme, disciplined token palette, and the last
deprecated-class drift removed. **The app is visually consistent and launch-ready.**
Remaining items are invisible internal naming, safe to tidy after go-live.
