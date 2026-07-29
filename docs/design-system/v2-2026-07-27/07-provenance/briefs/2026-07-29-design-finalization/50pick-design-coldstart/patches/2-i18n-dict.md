# Patch 2 — `src/lib/i18n-dict.ts` : four new `market.*` keys, in all three locales

The card references `t.market.newBadge`, `t.market.noBetsYet`, `t.market.beFirst`,
`t.market.noPoolYet`. Add them to the `market: { … }` block of **each** locale.
Put them next to the existing `tipping` / `predictorsCount` keys.

### English — `dict.en.market` (near line ~533 / ~670)
```ts
      newBadge: "New",
      noBetsYet: "No bets yet",
      beFirst: "Be the first to predict",
      noPoolYet: "No pool yet",
```

### Swahili — `dict.sw.market` (near line ~1878 / ~2010)
```ts
      newBadge: "Mpya",
      noBetsYet: "Bila dau bado",
      beFirst: "Kuwa wa kwanza kutabiri",
      noPoolYet: "Hakuna dau bado",
```

### Chinese — `dict.zh.market` (near line ~3207 / ~3339)
```ts
      newBadge: "新",
      noBetsYet: "暂无投注",
      beFirst: "成为第一个预测者",
      noPoolYet: "暂无奖池",
```

> `npm run test:i18n` (parity across locales) must stay green — that's why all
> three are added together. Feel free to refine the SW/ZH wording; keep them short
> enough to fit the card at 360px.
