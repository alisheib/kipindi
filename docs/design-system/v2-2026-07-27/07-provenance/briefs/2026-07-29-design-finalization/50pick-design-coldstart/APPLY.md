# Cold-start design — apply guide (Batch 1, done for real)

This is the finished, mergeable implementation of the single highest-impact
go-live design fix: **new / low-liquidity markets no longer look empty or broken.**
It's real drop-in code matched to your conventions, not a mockup.

## What changes (and why it's safe)

| Before (today) | After |
|---|---|
| A brand-new market shows a fake **50%**, a centred needle, and a **"TIPPING"** badge | Shows **—**, a neutral "awaiting first bet" bar, and a **NEW** badge |
| `0 predictors` | **"Be the first to predict · Kuwa wa kwanza"** |
| `TZS 0` | **"No pool yet · Hakuna dau bado"** |
| `YES @ 50% / NO @ 50%` on an empty market | **YES / NO** (no fabricated price) |
| Category chip shows English `SPORTS` in SW/ZH | Localised (`MICHEZO` / 体育) — POLISH-BACKLOG §1.1, folded in |

Honest by construction (design law "real data or nothing"): it never invents a
price — it shows emptiness as an *invitation*. `fresh` is derived from real fields
(`volume === 0 && predictors === 0` on a live, open market), so it's correct even
if the board doesn't pass the optional `isNew` prop.

## Files

1. **Replace** `src/components/markets/market-card.tsx` with the one in this bundle.
2. **Patch** `src/components/brand.tsx` — `patches/1-brand-tippingbar.md` (add the
   `empty` variant to `TippingBar`).
3. **Patch** `src/lib/i18n-dict.ts` — `patches/2-i18n-dict.md` (4 keys × 3 locales).
4. **Patch** `src/app/globals.css` — `patches/3-globals-chip-new.md` (`.chip-new`).

## Verify (must be green before Ali pushes)

```bash
npx tsc --noEmit
npm run build
npm run test:i18n        # locale parity — the 4 new keys exist in en/sw/zh
npm run test:bridge      # .chip-new / every colour class resolves
npm run test:contrast    # NEW badge + em-dash ink still AA
npm run test:measure
npm run qa:live
```

Then drive `/markets` and a fresh market at **360 / 768 / 1280 / 1920 in EN, SW,
ZH**: confirm no card shows a fake 50% or "TIPPING" when it has zero activity, the
NEW badge reads brand-blue (not gold), and SW/ZH fit at 360px.

## Not in this bundle (continues via DESIGN-PLAN.md)

- **Board fill / featured strip** (Batch 1 board half) — needs `markets/page.tsx`.
- **Desktop right rail** on market detail (Batch 2).
- **Depth tokens** (Batch 3) and the rest of the **polish sweep** (Batch 5).

Reason: those touch files best edited in-repo where the guard tests run live. This
bundle is the piece that most directly removes the "it looks empty" worry, shipped
as real code you can merge now.

## Reminder

Every push is a live prod deploy — apply on a branch, run the gates, review live,
then **you** push.
