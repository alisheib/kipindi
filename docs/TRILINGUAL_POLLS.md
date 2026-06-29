# Trilingual poll/market titles (EN · SW · ZH)

Shipped 2026-06-30. Markets, AI-polls, candidates and proposals now carry a
Chinese (`zh`) display title alongside the existing English + Swahili. Players
see the title in the language they picked; English remains the canonical text
used to settle markets.

## Core decisions

1. **English is canonical for settlement.** The resolver (Market Sentinel) and
   the two human officers judge outcomes against the **English** title + the
   `resolutionCriterion` + the source URL. Translations are display-only. This
   is why the AI resolver costs **$0 extra** for trilingual polls — it never
   ingests a third language (triage is English-only; the deep check uses English
   as the decision driver). See `src/lib/server/market-sentinel.ts`.
2. **The resolution criterion stays English** (binding rule), shown to every
   player as-is. It is the de-facto "official version" signal — no separate
   per-market banner is rendered. Translating the binding rule would create
   real-money ambiguity, so it is deliberately out of scope.
3. **Generate-and-store, in one call.** The Chinese title is produced by the
   *same* Sonnet generation call that already writes Swahili (`submit_poll` tool
   schema + system-prompt rule #8 in `src/lib/server/ai-provider-claude.ts`).
   No second LLM call, no extra web search → ~+$0.002–0.004 per poll.
4. **Everything is nullable + English-fallback.** `pickLocalized(locale, en, sw, zh)`
   (`src/lib/localized.ts`) returns English whenever a translation is missing, so
   the migration is additive and nothing can render blank.

## Data model (migration `20260629120000_trilingual_poll_titles`)

Additive, backward-compatible (all new columns NULLABLE):

| Model | New column |
|---|---|
| `PredictionMarket` | `titleZh` |
| `AIPoll` | `titleZh` |
| `MarketCandidate` | `proposedTitleZh` |
| `Proposal` | `titleZh` |
| `Notification` | `titleZh`, `bodyZh` |
| enum `Locale` | `+ ZH` |

Option descriptions also gained `descriptionZh` (stored in the existing `options`
JSON — no migration). The full data path (`AIPollGeneration` → `StoredAIPoll` →
`createMarket` → `StoredMarket` → market DAL) threads `titleZh` end-to-end.

## Surfaces wired

**Player (shows the picked language):** market card (all grids + home), market
detail title + browser `<title>`, positions / "my bets" cards, proposals list +
detail, fairness table, `/live` "most contested" + pulse grid + search.

**Admin (English chrome; Chinese is an editable content field):** market
creation wizard, AI-poll review list + detail, AI-poll edit modal + generate,
admin markets list/detail, resolver queue, candidates queue.

**Fonts:** a CJK system-font fallback (`--font-cjk` in `globals.css`) is appended
to every font stack, so Chinese glyphs render in the platform's native CJK font
(PingFang / YaHei / Noto) with zero webfont download.

## Deliberate exceptions (English-only, by design)

- **Social-share / OG image** (`/api/og/market/[id]`) and the OG/Twitter card
  titles — crawlers and share previews carry no locale cookie, so English is the
  correct canonical choice. (Browser tab `<title>` *is* localized.)
- **Share-sheet text** — goes to external recipients; English canonical.
- **Live ticker** (`ticker-feed.ts`) — static demo/marketing strings, not real
  market data; left English.
- **Notifications** — `titleZh`/`bodyZh` columns exist and the panel already
  reads them (falls back to English), but the notification *generators* don't yet
  produce Chinese. Follow-up: add `zh` templates to the `notify*` functions.

## Cost

- Generation: +~$0.002–0.004/poll (extra output tokens on the existing call).
- Resolver: **$0** (English canonical).
- Usage is metered per call in `AiUsageEvent` (`feature: "polls"`).

## Backfilling existing markets

Markets created before this feature have `titleZh = NULL` (Chinese players see
English). Translate them once with the cheap, idempotent, metered script — run
it **inside Railway** (needs prod `DATABASE_URL` + `ANTHROPIC_API_KEY`; never
point it at prod from a laptop):

```sh
railway run npm run backfill:zh -- --dry-run     # preview + cost estimate
railway run npm run backfill:zh -- --limit 50    # do 50
railway run npm run backfill:zh                  # do the rest
```

Uses Haiku, no web search (~$0.0008/market). Idempotent — only `titleZh IS NULL`
is selected, so re-running retries failures. See `scripts/backfill-zh-titles.mts`.
