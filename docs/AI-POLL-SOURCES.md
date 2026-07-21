# AI poll generation is bound to the trusted-source registry

**One rule:** the AI generator can only ever produce a poll in a category that
has an **enabled trusted source**, and it must cite one of that category's
**approved domains**. It is told the allowlist *before* it generates, and any
poll that violates it is filtered before it reaches the review queue — so an
officer never sees a poll that would fail at publish.

This closes the failure that read *"Source not permitted: No enabled trusted
source for macro matching www.african-markets.com"* — that only happened because
the generator was free to cite any domain the web search surfaced, and the
publish gate rejected it after the fact.

## The single source of truth

`getGeneratableCategories()` in [`src/lib/server/source-registry.ts`](../src/lib/server/source-registry.ts)
returns, for every **active** category (not disabled) that has **≥1 enabled
source**, that category's enabled domains. Everything downstream derives from it:

| Consumer | What it uses the list for |
| --- | --- |
| Generation prompt (single + batch) | Tells the model the allowed categories and, per category, the exact domains it may cite. |
| Tool schema (`submit_poll` / `submit_ideas`) | The `category` enum is constrained to the generatable set. |
| Generation-time validation | A poll whose primary source is not on an enabled domain **for its category** is `FILTERED` with reason `source_not_trusted` — a hard fail. |
| Admin generate forms | Non-generatable category pills are disabled with a hint; the batch button is disabled when nothing is generatable. |
| `/admin/sources` | Shows, per category, whether the AI can generate in it. |

`resolvePublishCategory()` in [`src/lib/server/market-service.ts`](../src/lib/server/market-service.ts)
is the **one** mapping the AI-poll path uses for *both* the trusted-source gate
*and* market creation, so a poll is always gated against the exact category it
publishes as. (`infrastructure` folds to `macro`; everything else that is a real
`MarketCategory` passes through unchanged.)

## Operator: how to make a category / domain generatable

Everything is managed at **Admin → Sources & categories** (`/admin/sources`).

1. **Add the source under the right category.** A source added under *sports*
   does **not** make *macro* generatable. If you want the AI to write macro
   markets that resolve against `african-markets.com`, add
   `african-markets.com` with **Category = macro** and enable it. (You can add
   the same domain under more than one category if it legitimately resolves
   markets in each.)
2. **The domain is normalised** to its registrable form — a leading `www.`,
   `https://`, and any path are stripped, so `https://www.african-markets.com/x`
   is stored as `african-markets.com` and matches both `african-markets.com`
   and `www.african-markets.com` URLs.
3. **Enable it.** A disabled source doesn't count. The category card shows
   **"AI can generate"** once at least one enabled source exists.
4. **Don't disable the category** you want to generate in — a disabled category
   is never generatable, even with enabled sources.

Default seeded sources (first boot): `bot.go.tz`, `tra.go.tz` (macro) ·
`meteo.go.tz` (weather) · `nbc.co.tz`, `tff.or.tz` (sports) · `coingecko.com`
(crypto) · `itv.co.tz` (culture) · `tcra.go.tz` (tech). So `other` is **not**
generatable until you add an `other` source.

## Tests

`npm run test:ai-source-allowlist`
([`scripts/ai-poll-source-allowlist.test.mts`](../scripts/ai-poll-source-allowlist.test.mts))
covers the whole guarantee: the generatable list reflects the registry;
untrusted sources are hard-filtered; a trusted source is reordered to primary; a
non-generatable category is refused with **no spend**; a disabled category drops
out; adding a source makes a category generatable; `filterIdeas` drops
non-generatable ideas; and a batch only ever produces generatable categories.
It is part of `npm run test:all`.
