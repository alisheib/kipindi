# Trilingual poll/market titles (EN · SW · ZH)

Shipped 2026-06-30. Markets, AI-polls, candidates and proposals now carry a
Chinese (`zh`) display title alongside the existing English + Swahili. Players
see the title in the language they picked; English remains the canonical text
used to settle markets.

> **Existing markets are TRANSLATED, never deleted.** Markets created before
> this feature have `titleZh = NULL` and a Chinese player sees the English title
> (safe fallback). The fix is the backfill below — it adds the Chinese title.
> Do NOT "delete markets missing a Chinese title": until the backfill runs that
> set is *every* market, and they carry live player positions, pools and money.

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
- **Notifications** — fully wired end-to-end (`StoredNotification.titleZh`/`bodyZh`,
  Prisma read + create, panel reads typed fields). The only remaining piece is the
  *generators*: the `notify*` helpers don't emit Chinese strings yet, so zh users
  see the English notification (graceful). Follow-up: add `zh` templates to the
  `notify*` functions — no schema/DAL change needed.

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

## Hardening (post-review)

A four-lane adversarial review (generation/insert · data+migration · viewing ·
resolution+admin) ran after the first cut. Fixes applied:

- **Controlled-mode title integrity:** when an operator pins the English question,
  the pinned title is forwarded to the generator and SW/ZH are translations of
  *that exact* title — not of a different question the model drafted. (Also fixed
  the pre-existing Swahili case.)
- **Length cap:** `titleSw`/`titleZh` now share the English `MAX_TITLE_LENGTH`
  bound (were unbounded).
- **Bet-confirm modal** title is localized (was English at the moment of betting).
- **Main-board search** matches Chinese titles; admin poll/candidate search and the
  ideation steer include Chinese too.
- **`pickLocalized` is whitespace-safe:** `null` / `""` / whitespace-only all fall
  back to English — a title can never render blank.
- **Backfill meter:** `AiUsageEvent` rows now get an explicit `id` (no DB default);
  failures are logged, not swallowed.

## Validation gate

`npm run test:trilingual` (`scripts/trilingual-titles.test.mts`, wired into
`predeploy`) proves the runtime behavior: `pickLocalized` across every locale ×
data-shape, repeated/mixed language switching (pure + idempotent), the
`createMarket → getMarket` round-trip rendered in all three languages, legacy
(no-zh) fallback, and controlled-mode title pinning — 36 assertions. The AI
resolver was confirmed unaffected (it never reads `titleZh`).

## Operations checklist (each deploy that adds markets)

1. After deploy, confirm the migration applied: `railway logs` → look for
   `20260629120000_trilingual_poll_titles`.
2. Translate existing markets: `railway run npm run backfill:zh -- --dry-run`,
   then run it for real. **Never delete "untranslated" markets** — backfill them.
