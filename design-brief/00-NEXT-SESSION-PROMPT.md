# NEXT SESSION — implement the accepted round-2 design (markets · hero · landing · header)

**Paste this whole file as your opening prompt. Turn ultracode on.**
**The whole implementation ships cleanly in THIS ONE session — plan first, then all four
batches, end to end, every push verified.**

## ⚠️ FIRST — the design files MOVED on 2026-08-12. This machine may hold the OLD layout.

This session may run on a DIFFERENT PC than the one that reorganized the design files.
`git pull` syncs the tracked truth but does NOT remove old **untracked/gitignored** leftovers —
and it will REFUSE to pull if a stale untracked file sits where a new tracked one goes
("untracked working tree file would be overwritten"). So, before anything else:

1. `git fetch origin && git status` — confirm you are on `main`.
2. If `git pull` complains about untracked files in `design-brief/`, that IS the stale layout.
3. Any of these found on disk are pre-reorganization leftovers — canonical copies are in git
   and archived on the main laptop (`F:\50pick-design-archive\2026-08-12-final\`). Move them
   to a local folder OUTSIDE the repo (e.g. `..\50pick-design-stale-localbak\`), then pull:
   - `design-brief/handover-v3-total-2026-08-11/` · `design-brief/handover-v2-2026-08-11/`
     (incl. its gitignored `02-current-state/`, `01-approved-design/screens/` remnants)
   - `design-brief/send/` · `design-brief/*.zip` (any kit/handover zips)
   - a stale `design-brief/00-NEXT-SESSION-PROMPT.md` (the old "total commission" brief —
     if the file does not start with "implement the accepted round-2 design", it is stale)
   - repo-root `NEXT-SESSION-PROMPT.md` · `New Landing Design/` · `scripts/build-design-handover.mts`
4. After the pull, the correct layout is: the kit at
   `docs/design-system/v3-2026-08-11-landing-discovery/` (+ `ACCEPTANCE.md`), the living
   references at `docs/design-brief/handover-2026-08/`, and `design-brief/` holding EXACTLY
   three files (`PLAN-OF-RECORD.md` · `CLEANUP-MANIFEST.md` · this prompt). If that matches,
   you are clean — proceed. If anything else claims to be a design plan or kit, it is stale;
   do not read it, move it out.

Read, in order, before touching anything:
1. `CLAUDE.md` (the mechanics + the ACTIVE-WORK banner)
2. `docs/DESIGN_AUTHORITY.md` §0 (the filing law) — values live in `globals.css`/`motion.css`, never in docs
3. `design-brief/PLAN-OF-RECORD.md` — **the living plan.** §7 is the implementation dossier:
   every file:line anchor, every trap, every decision, measured 2026-08-12. Update the plan
   as you go; it is the record.
4. `docs/design-system/v3-2026-08-11-landing-discovery/ACCEPTANCE.md` — what is inherited,
   what is ignored, and where our laws beat the kit
5. The kit itself (same folder): `START-HERE.md` → `README.md` → `SPEC.md` → `COMPONENTS.md`;
   open `prototype/50pick Discovery Prototype.dc.html` in a browser — the interaction model runs
6. `docs/design-brief/handover-2026-08/LAWS.md` — the contract (85 invariants + 4 licence
   conditions). Do not weaken it.

⛔ `main` is SHARED with another operator and **every push deploys live**. Never `git add -A`;
stage by explicit path; `git branch --show-current` before every commit; `git fetch` and look
for commits newer than the newest handoff before assuming the tree is yours.
⛔ Verify before reporting: run the command, quote the output. A grep is not proof of behaviour.

---

## THE JOB

The organization session (2026-08-12, commits `78b7f000`→`fd66292b`) filed the kit, wired all
22 design gates into `predeploy` (baseline: all green), and wrote the plan. **This session
builds it — everything: the new `/markets` filters and sorting, the new hero/banner, the full
landing composition, the header and rail.** Four deploy-safe batches, in this order — after
each: gates green, verify at 360 and 1280 in en/sw/zh, commit by explicit path, push, verify
live, update the plan's batch log.

### STEP 0 — PLAN FIRST, then build (Ali's instruction, 2026-08-12)

Before touching any code: write the full execution plan into `PLAN-OF-RECORD.md` — a per-batch
checklist of concrete steps, the two open definitions pinned (`All` semantics;
selection-closed counting), the i18n keys each batch adds, and the exact verification each
step needs. Work it **carefully, step by step: one step, verify, record, then the next** —
never two batches in flight, never a change without its verification. If a step's outcome
contradicts the plan, stop and update the plan before proceeding, not after.

### Standing rules for the whole session

- **Docs move with the code.** Every commit updates the doc that owns the subject in the SAME
  commit: the batch log in `PLAN-OF-RECORD.md`, `docs/NEXT-PLAN.md`'s design-lane note when a
  batch lands, `CLEANUP-MANIFEST.md` for anything removed, and DESIGN_AUTHORITY where a rule
  changes (e.g. the cold-start rule gaining its fourth consumer). A future session must be
  able to reconstruct the state from the docs alone.
- **Design files stay filed and findable.** Every design fact goes to its §0b home — a value
  to `globals.css`/`motion.css` beside its rule, a law to `DESIGN_AUTHORITY.md`, records to
  `docs/design-system/` / `docs/design-brief/` — and every new file is registered in
  `docs/README.md`'s index. Never a stray design file anywhere else. At session end verify
  `design-brief/` still holds exactly three files (the plan, the cleanup manifest, the
  next-session prompt) and say so with a quoted listing.

**The integration rule:** take the kit's structure, layout, behaviour and copy; express every
visual value through EXISTING tokens (`var(--…)`). The kit's `tokens-LOCKED.css` is a proven
byte-identical copy of ours — the only new tokens are `--rh-tight/close/section/chapter`
(calc() of `--sp-*`, define once in `globals.css`, rule as the comment beside them). No second
visual language. No new stylesheet file (law 82). New states are props on existing components.

⛔ **Frozen, untouchable:** `market-card.tsx`, `side-picker.tsx`, the conviction bar/needle,
`needle.css`, palette, type scale, footer, all licence/RG/legal copy, the ratchet allowlists
(never regenerate at zero — that order belonged to the dead total-replacement strategy).

### Batch 1 — `/markets` data contract + UI (kit README §3, SPEC, COMPONENTS; dossier §7a)

- The contract is pinned in PLAN-OF-RECORD §4: status/sort/odds/pool/topic/q URL params
  (defaults omitted, server-renderable, `replaceState` except `q`), sort keys with
  `closing` default, status default `open`, page size 12/6 whole rows, result count == pager
  total, per-cause empty states, `New` follows the card, `Biggest move` sorts absent
  `move24h` LAST. Pin the two open definitions (`All` semantics; selection-closed counting)
  in the plan BEFORE implementing them.
- Delete the 13-button rail; build the kit's sticky two-row filter bar (segmented status with
  live counts, sort + direction, density toggle, odds/pool/topic groups, Clear all, count).
  Chips per the kit's six drawn states — sort carries NO gold (view state). Watch star gold is
  challengeable: verify against `test:gold-is-money`; the server-side watchlist service wins
  over the kit's localStorage.
- Compact list density (`role="table"`), watchlist star on every market + `Watching` filter,
  typeahead combobox, paging contract, per-cause empty states, skeletons at real card geometry
  with the 349px literal moved through ONE shared definition (both copies, same commit).
- Migrate the page + loading to `<PageContainer tier="board">` (shrinks the measure ratchet).
  Remove `ProposePromo` from `/markets`. Derive the category list from `MARKET_CATEGORIES`.
- ⚠️ `h-8` here is 48px (spacing override). ⚠️ Thread new params through ALL href builders.
  ⚠️ Size short labels to SW 1.74×/2.25× (`docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md`);
  never shrink a container for ZH.

### Batch 2 — the hero (kit README §1a; dossier §7b)

- The kit's `01` recommendation: `--hero-grad-warm` surface, brand mark backdrop (rotate −14°,
  `--hero-mark-opacity`, never recoloured), eyebrow, headline **"The wisdom of YES & NO."**
  (verbatim, all locales — move to dict keys with identical values), proof rail (REAL figures
  only), aggregate conviction bar (Σ yesPool / Σ pool, server-side, gated on Σ pool > 0),
  the question board (4-col grid of real open markets, closing-soonest), hero foot with lede +
  2 CTAs + one live `<MarketCard/>` (featured, same query as the board).
- **`public/hero/hero-bg.webp` and its `page.tsx:80` reference are removed in the SAME commit
  the replacement lands** — replace, then delete, never before.
- The hero is the FOURTH consumer of the cold-start rule — update
  `docs/DESIGN_AUTHORITY.md:494-498` from three consumers to four in the same commit.
- Licence: never render a guessed number — below Σ pool > 0 the bar shows the dashed empty
  vocabulary, not 50%.

### Batch 3 — landing composition + header + rail (kit README §1b–1i, §2; dossier §7b)

- Section order + rhythm (`--rh-*`: 144·96·96·144), How-it-works band (heading + lede read
  `t.primer.card1Title/Body`; ALSO fix `first-visit-primer.tsx` to read the dict — its inline
  copy duplicates those keys today; the three steps are new copy → new keys + real SW/ZH),
  Pick-a-side-now grid (heading states the sort), topic tiles with real per-topic count+pool
  (fold from the one board read; must reconcile to the header), Up&Down band (920px, fixes the
  1440 hole), trust band (M-Pesa cell via `PaymentLogo` — white tile, never inline the SVG),
  settled strip (re-sort by `settledAt` DESC; amount = pool − fee via `payout.ts` +
  `feeSnapshot`, `formatTzs`, gold correct here; thread `resolvedOutcome` to every new
  resolved-rendering call site), RG line above footer (strings verbatim from
  `public-footer.tsx` — flag placement to Ali, one deletion if refused), footer unchanged.
- `StatsBand` (the zero-counters) is deleted — the proof rail + settled strip replace it.
- Header: opaque `--panel` at every scroll position + `--shadow-2` scrolled; the three-tier
  nav model; ONE active treatment (`--pill-active`); Sign in (ghost) + Sign up (pill) in the
  header at every width; the 44×44 `EN ⌄` language listbox (options DIRECT children of the
  listbox) at every width; skip link. ⚠️ Must hold `Jedwali la Washindi` through 1024–1279.
- Bottom rail: 5 slots `Markets · Up & Down · Live · Results · More`, `--pill-active` active
  treatment (kill the aqua literals), auth not in the rail, More carries
  Positions/Wallet/Top/Invite when authed.
- **The ticker's fabricated feed** (`ticker-feed.ts`) must die in this batch: wire real events
  (recent `settledAt` settlements + recent opens) or render nothing. A-5: nothing over a guess.
- Entry motion last: 550ms budget, existing `--t-*`/`--m-*` tokens, IO reveal (precedent
  `pulse-grid.tsx:83`), `.js` progressive class, all THREE reduced-motion gates, calm branches
  in the same change. ⚠️ `animation-delay` is clamped under reduced motion (motion.css ATOM A).

### Batch 4 — post-implementation cleanup + handoff

- Whatever the batches made stale: cite-check → archive to
  `F:\50pick-design-archive\2026-08-12-final\` (verified counts+bytes, quoted) → delete →
  update `design-brief/CLEANUP-MANIFEST.md`.
- Update `docs/NEXT-PLAN.md` "PICK UP HERE" + the batch log in PLAN-OF-RECORD.
- Replace this file with the next session's prompt.

## DEFINITION OF DONE

1. `/markets` ships the inherited sort + filters + URL contract + count + per-cause empty
   states, verified at 360/1280 × en/sw/zh, with the rail gone and skeleton parity via one
   shared height definition.
2. Hero photograph gone (same commit as its replacement); the live-card hero in; cold-start
   agreement across all FOUR consumers (DESIGN_AUTHORITY updated); headline words intact.
3. Landing composition + header + rail per the kit; StatsBand replaced; ticker honest.
4. Every inherited value expressed through existing tokens; `npm run predeploy` green
   (all 22 design gates are in it now); laws green; ratchets not zeroed.
5. Every push verified live (prod 200, clean boot, screenshot) and every claim in the final
   report backed by quoted output.
6. PLAN-OF-RECORD batch log complete; this prompt replaced for the next session.

## TRAPS — all previously hit for real; do not re-buy them

1. PowerShell 5.1 destroys UTF-8 on round-trip — `[System.IO.File]::ReadAllText/WriteAllText`
   with explicit UTF-8, or use the editor tools; never `Get-Content`/`Out-File` for content.
2. PowerShell variables are case-insensitive — `$p` overwrites `$P` silently.
3. Only depth-0 `:root` is token truth; a brace-blind regex once flattened the reduced-motion
   block and reported all chat motion as 0ms.
4. A check that cannot fail is not a check — `EXIT=$?` after a pipe reads the LAST command
   (use `set -o pipefail`; this session hit it: a failing gate printed green EXIT=0).
5. Never `Compress-Archive` — backslash entry names; use .NET ZipArchive with `/`.
6. `git checkout` applies `core.autocrlf` — read nothing into byte-count deltas after restore.
7. Things that look redundant are load-bearing — cite-check before deleting, always
   (markdown links AND code-span paths; `test:docs` validates links only).
8. Tailwind spacing is overridden: `h-8`=48px, `h-10`=80px — never assume stock scale.
9. The in-memory dev store is SYNC where Prisma is async — `await Promise.resolve(db.x())`.
10. First cold compile of a new page ~30s (Turbopack) — bump Playwright goto timeouts.
11. ⚠️ Do NOT touch: `.dc.html` previews with sibling `theme/` folders, `.qa-*` scratch dirs,
    the unreferenced 8-key glyph family, or another session's untracked files
    (`scripts/live/ops/house-money-census.cjs` was in flight on 2026-08-12).
