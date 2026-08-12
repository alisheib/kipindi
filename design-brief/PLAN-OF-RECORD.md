# PLAN OF RECORD — inherit the round-2 design kit, apply it, clean up

**Living document — updated after every batch.** Started 2026-08-12 (session: FINAL inherit-apply-cleanup).
Operator authorization: Ali, 2026-08-12 evening — full autonomy, commits + pushes approved
("apply all changes in the new design kit literally · don't touch market cards and progress bars ·
just the things we agreed on · organize the design files first").

**STATUS: organization session COMPLETE — implementation starts in a NEW session.**
Ali re-scoped on 2026-08-12 evening: this session is dedicated to organizing the design files,
cleaning up old docs, wiring the gates, and writing the plan; the implementation (batches 2a–2d
below) runs in a fresh session from the copy-paste prompt at
`design-brief/00-NEXT-SESSION-PROMPT.md`.

| Phase | State |
|---|---|
| 0 · Locate kit, acceptance record | ✅ done — kit filed at `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` (commit `78b7f000`) |
| 1a · Organize design files | ✅ done — commit `78b7f000`, pushed. Everything removed archived at `F:\50pick-design-archive\2026-08-12-final\` |
| 1b · Wire 22 design gates into predeploy | ✅ done — all 22 wired; 2 ghost steps removed; **baseline: all 22 gates GREEN** on `78b7f000` (each run individually, exit 0, 2026-08-12) — no pre-existing red to carry |
| 1c · Old-doc cleanup (stale glyph archive, old-version sweep) | ✅ this session — see CLEANUP-MANIFEST |
| 2a · /markets data contract | ⬜ NEXT SESSION |
| 2b · /markets UI (filter bar replaces rail) | ⬜ NEXT SESSION |
| 2c · Hero replacement (photo out, same commit) | ⬜ NEXT SESSION |
| 2d · Landing composition + header | ⬜ NEXT SESSION |
| 3 · Post-implementation cleanup remainder | ⬜ NEXT SESSION |

---

## 1 · The strategy (final — supersedes the total-replacement plan)

The existing system stays: tokens, primitives, laws, the ~200 incident-bought decisions.
From the returned round-2 kit we inherit **three surfaces only** — the hero/banner, the
`/markets` discovery layer (filter + sort + data contract), the landing composition (incl.
header) — expressed **entirely through existing tokens**. The kit's own token file is a proven
byte-identical copy of ours (0/323 value mismatches — verified 2026-08-12); the only new tokens
are the four rhythm-scale derivations the kit documents (`--rh-tight/close/section/chapter`,
all `calc()` of `--sp-*`), which will be defined once in `globals.css` in the existing grammar.

**Frozen and untouched:** `market-card.tsx`, `side-picker.tsx`, the conviction bar/needle,
`needle.css`, the palette, the type scale, the footer, all licence/RG/legal copy. (Kit contract
+ Ali's instruction, 2026-08-12.)

Kit acceptance record (file-by-file INHERIT/IGNORE + reconciliations): see `ACCEPTANCE.md`
beside the filed kit.

## 2 · Design-file organization (Phase 1a)

Ali emptied `design-brief/` on 2026-08-12 18:58–18:59 (Explorer delete) and dropped in the
returned kit zip. Everything deleted was recovered from the Recycle Bin to
`F:\50pick-design-archive\2026-08-12-final\recovered-from-recycle-bin\` (verified: v3 = 267
files, matching its documented count). Filing, per DESIGN_AUTHORITY §0b:

| Thing | Goes to | Why |
|---|---|---|
| The returned kit (raw, complete, incl. its LOCKED token copy + brand copies + the rejected 07 hero) | `docs/design-system/v3-2026-08-11-landing-discovery/` + `ACCEPTANCE.md` | §0b: incoming commission, raw and untouched, with an acceptance record |
| `LAWS.md` · `INVENTORY.md` · `LANGUAGE-AND-CONTENT.md` · `integration-notes/` (the four live references that were only inside the deleted v3 package) | `docs/design-brief/handover-2026-08/` | §0c: `docs/design-brief/` is the commission record. A package links to the rulebook; it never bundles the only copy |
| `design-brief/` (repo root) | ends holding ONLY: `PLAN-OF-RECORD.md` (this file), `CLEANUP-MANIFEST.md`, `00-NEXT-SESSION-PROMPT.md` — all tracked | the brief's end state |
| Kit zip, stale root `NEXT-SESSION-PROMPT.md` (Aug 10), `scripts/build-design-handover.mts` | archive, then delete from tree | superseded / one-shot generator for the dead strategy (untracked, non-npm, undeclared `sharp` dep — `test:orphans` would flag it) |
| `design-brief/handover-v2-2026-08-11/` tracked files (Ali-deleted, ` D` in git) | commit the deletion | round sent + kit returned; §0b banner says delete on send; archived copy kept |
| Citers to fix in the same commit | `docs/DESIGN_AUTHORITY.md:85` (stale "under review" banner) · `docs/README.md:55` (stale v2 row) | cite-check 2026-08-12: these are the only two doc citers |

## 3 · The 22 design gates (Phase 1b)

`predeploy` currently runs 4 of 22 static design gates — and is **broken**: it names
`test:sentinel-timer` and `test:sentinel-pause`, which do not exist, so the chain dies at step
44 and `build`/`qa:live` never run. Fix: remove the two ghost entries (coverage lives in
`test:sentinel-guards`, already in the chain), then wire in the 18 missing gates.

Roster (all static, no server needed — verified):

In predeploy already: `test:tokens` · `test:design-frozen` · `test:outcome` · `test:history`
To add (18): `test:bridge` · `test:design-one-door` · `test:measure` · `test:contrast` ·
`test:ui-consistency` · `test:motion-ladder` · `test:glyph-motion` · `test:reduce-motion` ·
`test:keyframes` · `test:m1-light` · `test:gold-is-money` · `test:crest-legibility` ·
`test:chip-contract` · `test:shell-boundary` · `test:admin-clip` · `test:search-adoption` ·
`test:integrity` · `test:overdue-format`

Note: the "22" count is not written anywhere in the repo — this roster is the derivation that
matches the handover's premise exactly (4 in predeploy, 22 total). Recording it here makes this
file the missing citation.

⛔ The five ratchet allowlists are **NOT regenerated at zero** (that order belonged to the dead
strategy): `design-frozen` FROZEN_ALLOWLIST (41) · `motion-ladder` ALLOWLIST (0) · `measure`
RAW_WIDTH_ALLOWLIST (58) · `m1-light` PENDING (0) · `reduce-motion` KEPT (4). Entries move only
when a change in this plan legitimately moves a measured value.

**Gate baseline (2026-08-12, tree `78b7f000`): all 22 gates GREEN** — run individually,
`test:tokens … test:overdue-format -> EXIT=0` for every one. The two ghost predeploy steps
(`test:sentinel-timer`, `test:sentinel-pause` — scripts that never existed) are removed, so the
chain no longer dies at step 44 before `build`; all 72 remaining steps resolve to real scripts
(verified by parsing `package.json`).

## 4 · The /markets data contract (Phase 2a) — concrete values, from the kit

State model (kit README §"State management", adopted verbatim):

```
status:   'open' | 'today' | 'new' | 'watch' | 'all'    default 'open'  ← default view excludes CLOSED
sort:     'closing' | 'pool' | 'people' | 'close' | 'move' | 'new'      default 'closing'
sortDir:  'asc' | 'desc' | null (null = the sort's natural direction)
odds:     'any' | 'call' (40–60%) | 'cont' (25–75%) | 'long' (<15%)     numeric boundaries fixed
pool:     'any' | '10k' (≥ TZS 10,000) | '50k' (≥ TZS 50,000)
topics:   string[] (multi-select; [] = all)
query:    string
density:  'grid' | 'list'   persisted (localStorage 50pick.discovery.v1)
watch:    string[]          persisted (same key)
shown:    paging cursor — page size 12 (2–3 col grid) / 6 (1 col); resets on any change
```

URL contract: `/markets?status=…&sort=…&odds=…&pool=…&topic=a,b&q=…` — defaults omitted
(clean board = clean URL); server-renderable; controls write `replaceState`, only `q` uses
`pushState` (debounced 300ms). Sort options + hints: Closing soonest (default) · Biggest pool ·
Most predictors · Closest call · Biggest move (absent `move24h` sorts LAST, not zero) · Newest
first. Result count in the sticky bar **is** the pager total — same value, same source.
Empty states per cause: filter-miss (computed relaxations with real counts) ≠ search-miss
(catalogue gap: search-all-including-closed + suggest). `New` follows `market-card.tsx`'s
`isNew` definition. Definitions to pin during 2a implementation: does "live" include
`selectionClosed`; what `All` includes — record the answers here when pinned.

_Open items to pin in 2a (recorded when implemented): the exact status→MarketStatus mapping,
topic taxonomy source of truth, whether search is server-side._

## 5 · Decisions log (reconciliations — decided calls beat the kit)

1. **Hero = kit's `01` recommendation** (question board + brand-mark backdrop + live
   `<MarketCard/>` in the hero foot). Headline **"The wisdom of YES & NO."** verbatim.
   `public/hero/hero-bg.webp` + its `page.tsx:80` reference removed in the SAME commit the new
   hero lands. The `07` alternative hero: not chosen, filed as provenance only.
2. **Cold start:** hero becomes the FOURTH consumer of the existing cold-start rule — concrete
   behaviour to be pinned here before batch 2c (awaiting codebase map).
3. **Measured widths beat the kit's +25% stress assumption:** short labels sized to SW
   1.74× p90 / 2.25× p95 (source: `docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md`).
   Mobile verification at **360px**, not the kit's 390.
4. **Gold discipline Q5 narrows the kit's palette rule:** gold stays on pool figures + settled
   payouts (real money); NO gold on sort (kit's final agrees), watch star, result count,
   question-board YES-% — unless stripping it guts the hero, in which case it goes to Ali as a
   named question, not decided silently.
5. **First-visit modal copy:** how-it-works band and the modal read the SAME i18n keys.
6. **RG line above footer + public source attributions (TMA/Transfermarkt/TwelveData):** built
   as designed (strings verbatim from `public-footer.tsx`), flagged for Ali/compliance in the
   final report; one deletion each if refused.
7. **Frozen-card tap targets + type-nano/label raise:** NOT touched (kit's own contract +
   Ali's instruction). Recorded as open items for a later Phase-3-token decision.

## 6 · Batch log (updated after each push)

| Batch | Commit(s) | Gates | Verified | Notes |
|---|---|---|---|---|
| 1a organize | _pending_ | | | |
| 1b gates | _pending_ | | | |
| 2a contract | _pending_ | | | |
| 2b markets UI | _pending_ | | | |
| 2c hero | _pending_ | | | |
| 2d landing | _pending_ | | | |
| 3 cleanup | _pending_ | | | |
