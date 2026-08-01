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

## The RESOLUTION half of the same rule (added 2026-07-30)

Generation was gated on the allowlist from the start. **Resolution was not** — and resolution
is the end where money moves. `market-sentinel.ts` put the approved source in the *user* prompt
as soft advice ("resolve against this if given"), and the URL the AI came back with was passed
through with **no host check and no `isSourceTrusted`**, stored as `sentinelSourceUrl`, and
shown to the officer as a plain clickable link with nothing saying whether it was the approved
source. With `resolutionMode: "auto"` there is no officer in the path at all — the sentinel's
assessment stamps `RESOLVED` and the settle timer pays out after the objection window.

It is now gated, and deliberately **differently on the two paths**:

| Path | Behaviour | Why |
|---|---|---|
| **AUTO** | **Hard refusal.** `decideAutoResolve` takes a `sourceMatches` argument folded into `confident`, so a read from an unapproved host is not confident and the market goes to the two-officer ceremony instead of paying. | No human is in the path. Failing closed sends it exactly where it went the day before auto was switched on. |
| **HUMAN** | **Visible flag, never a refusal** — a chip beside the cited link in the resolver queue and the resolver detail page (`SentinelSourceChip`). | The officer is about to open that link themselves. Hiding a read from the wrong site is precisely what would let them seal on it unaware. |

The verdict is **derived at render time** (`sentinelSourceVerdict`), never stored, so it cannot
go stale against an edited market. The prompt was strengthened too: the approved-source
instruction moved out of the user prompt into the numbered **system** rules, mirroring the Up &
Down price reader's gate 2 — moving the base rate beats catching failures after the fact.

The host comparison is `hostMatchesDomain` from `updown-feed.ts` — **one** definition of "is
this host on that domain" on the platform, shared by this gate, the price-reader gates and the
round-level source check. Guarded by `test:scheduler` §7.10–§7.17 and `test:updown-source` §8.

> Related: the same session closed a **pause-switch bypass**. `isPollGenEnabled()` was checked
> only in `admin/ai-polls/actions.ts`, so `generateFromEventAction` generated polls with the
> operator's switch OFF. The check now lives inside `generateAIPoll` itself, before the budget
> gate. That one switch also gates Up & Down proposals — one switch, both generators.

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

## Live registry maintenance (2026-07-22)

The production registry had accumulated duplicates and `www.`-prefixed domains
from before `normalizeDomain` existed. It was normalized + de-duplicated
(**42 → 23 rows**) so every domain is in registrable form and each
(category, domain) appears once; `african-markets.com` is enabled under `macro`
(and `sports`). Because `normalizeDomain` now strips `www.`/scheme/path on every
add, new sources won't reintroduce the drift.

Ops tools (read `DATABASE_URL` from the env — point it at the Railway Postgres
public proxy for prod):
- `scripts/inspect-sources.mjs` — READ-ONLY dump of the registry grouped by
  category (domain · enabled), flags `african-markets` matches.
- `scripts/cleanup-sources.mjs` — normalize + merge duplicate (category, domain)
  rows, preserving enabled state. **Dry-run by default**; set `APPLY=1` to commit
  (runs in a single transaction).

Note: `scripts/r2-roundtrip.mjs` and any `railway run …` smoke run as plain node
scripts (native import) and do NOT exercise the bundled Next server path — see
the KYC/R2 fix in `docs/LIVE-HOSTING-STATUS.md` for why that gave false confidence.
