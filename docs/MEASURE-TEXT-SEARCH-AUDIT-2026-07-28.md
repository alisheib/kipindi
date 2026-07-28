# Measure system · text hierarchy · unified search — audit + delivery log (2026-07-28)

> 🟢 **SHIPPED AND LIVE.** Eight commits, `0b1e3322` → `57cafab2`, all deployed to
> `https://50pick.tz` and verified. Started as an audit; this file is now the record
> of what was found, what was done, what was measured, and what was deliberately
> left alone.
>
> Triggered by Ali (2026-07-28): *"users are claiming that sometimes the pages are
> high in width and input fields as well… also filters don't have regex, this is
> weird when I were searching for long things."*
>
> Both reports were correct. A third defect, larger than either, turned up on the way.

---

## What shipped

| Commit | What |
|---|---|
| `0b1e3322` | Repaired 5 dead Tailwind token bridges (1,325 dead class usages) + introduced the measure system |
| `d331cb2b` | Deleted the dead `micro-patterns.css` shadow kit + closed 5 named width bugs |
| `0637da28` | One search grammar, two executors, `SearchBox`, `SearchHelp`, trilingual keys, `/markets` + `/results` |
| `f940783c` | Finished the search migration — all 12 surfaces + the adoption guard |
| `bb5edf26` | Made the measure enforceable: two-sided QA gate, `DESIGN_AUTHORITY` B7/B8, `RULES.md` 13/14 |
| `7640bab7` | Deleted the dead `PeriodPicker` path (84 call sites), `AdminBlock`, unusable CSS helpers |
| `10f46ce3` | `pg_trgm` GIN indexes on the small tables — tested on a real local PG cluster |
| `57cafab2` | Regex mode, shipped where it is free and withheld where it is not |

**Gate on every push:** `tsc` + `next build` clean · `npm run test:all` (grew 95/97 →
98/100 as new guards landed; the two constant failures are `test:responsive` and
`test:motion`, both `ERR_CONNECTION_REFUSED` against a `:3000` server that is not
running locally — not code) · prod HTTP 200 verified after each deploy.

**Worked from an isolated git worktree** (`C:\kipindi-night`, own `node_modules`,
dev on `:3010`, no `DATABASE_URL`) because a second session held `C:\kipindi-main`
with 27 uncommitted files. Its working directory was never touched.

---

## D1 🔴 — 1,325 utility-class usages generated zero CSS

**The biggest finding, and no prior audit had caught it.**

`tailwind.config.ts` never bridged five token families that `globals.css` defines.
Tailwind only emits a utility for a key present in the theme; there is no safelist
and `plugins: []`. So these were not utilities — they were **typos `tsc` cannot see
and the build does not warn about**, and every one of those elements silently
inherited its parent's ink.

| missing bridge | uses |
|---|---|
| `text` had no `subtle`/`muted`/`faint` | **1,236** |
| `royal` had no numeric steps (unlike `gold`) | 72 |
| **`gilt` had no family at all** — the brand needle's own colour | 6 |
| `brand` stopped at 600 | 6 |
| `danger`/`info`/`warning` had no `.500` | 5 |

Net effect: **a four-step ink ramp rendered as two.** Everything written to recede —
captions, hints, table headers, timestamps — did not recede. That flat,
everything-equally-bright look was the "something is off" nobody could name.

**Bridged** where the CSS variable exists. Where it does not, the **call site was
corrected instead of inventing a colour**: `border-brand-700`→`600` (6 sites),
`border-info-700`→`500`, `text-warning-300`→`text-warning`.

**Contrast was proven, not assumed.** Making the quiet steps render for the first
time is a real darkening, and law 9 names faint body copy as a failure mode.
`npm run test:contrast` now covers the ramp on every surface it lands on:

```
--text-muted   12.67 / 12.33 / 12.51
--text-subtle   7.22 / 7.03 / 7.13 / 7.37
--text-faint    4.87 / 4.74 / 4.81   ← passes AA 4.5, with the least headroom
```

A rendered-DOM sweep (`scripts/contrast-rendered.mjs`, 1,519 text nodes) found ONE
AA failure — leaderboard avatar initials at 1.44:1 — which **reproduces identically
with the changes stashed**, so it is pre-existing and was left alone rather than
absorbed into this work.

⚠️ Why `VISUAL-CONSISTENCY-AUDIT.md` (2026-07-17) signed the UI off as launch-ready:
it grepped for rogue **values** — raw hex, off-palette classes — and correctly found
none. It never checked that the on-palette classes **resolve**. A dead class is
invisible to a value audit. That is the lesson, not the miss.

**Guarded by `npm run test:bridge`** — verified to FAIL on the reintroduced bug
(correctly reporting all 732 `text-text-subtle` usages across 199 files).

---

## D2 — There was no width rule anywhere

`DESIGN_AUTHORITY.md` had B1–B6; the design-system `RULES.md` had 12 laws. **Neither
mentioned width.** The only statement in the repo was a stale `CLAUDE.md` line
describing three tiers against a codebase that had drifted to eight.

- **`admin/layout.tsx` had no cap at all** → all 43 admin pages rendered at
  `100vw − 216px`: 1,704px at 1920, **2,344px at 2560**, while the player chrome
  above them was capped at 1280. Now **1,600px, measured**.
- **The `Input` atom had no width rule** (`size` is height-only), so every field was
  as wide as its page. `/admin/markets/new` measured **1,492px** text boxes;
  they are now **638px**.
- **`notice-bar.tsx` was 1480** against 1280 chrome and renders only on an
  announcement / unconfirmed-email / offline state — so the page was 200px wider on
  some visits and not others. **That is the "sometimes" in the report.**
- `/admin/transactions` was the one admin route with **no body wrapper at all**.
- `/admin/2fa/setup` is `TOTP_EXEMPT`, so it got no sidebar *and* no measure — a
  QR-enrolment form spanning the entire viewport.
- `/updown/[roundId]` was 1232 against its own 1080 skeleton — **a 152px jump on
  every load** that no test could see.

**Why it survived every QA cycle — the part worth remembering:**
`scripts/responsive-audit.mjs` asserted `scrollWidth ≤ clientWidth`, tap targets and
off-screen overlays. **Every one of those is a lower bound**, and the sweep stopped
at 1920. A 2,400px form scored a clean pass. A gate that can only detect *too
narrow* will never report *too wide*.

The gate is now **two-sided**: a 2560 breakpoint, plus per page "exactly one measure
root, within its tier", read from the `data-measure` attribute. **Verified to fail on
the reintroduced bug** — removing the console cap produces `console 2344px > 1600px`
on every admin route.

---

## D3 — Twelve searches, ten of them broken on long queries

Only `/markets` and `/results` matched each word independently. The other ten did a
single contiguous `.toLowerCase().includes(q)`.

Proven in the guard: for `{displayName:"John Mwangi", phoneE164:"+255712345678"}`,
the old join-and-includes returns **false** for `john 712`; the new grammar returns
**true**. A name in one column and a number fragment in another can never match a
single contiguous substring — that is the whole defect.

**One grammar** (`src/lib/search`, isomorphic — `/live` and admin proposals filter on
the client, so it cannot live under `lib/server`):

```
john 712          every word, any field, any order
"long rains"      the phrase, contiguous, inside ONE field
-crypto           exclude
category:sports   one field (title: spans EN/SW/ZH)
/Simba|Yanga/     regex — admin-only, opt-in per call site
```

Two rules that are not negotiable, both asserted:
- **The grammar never errors.** An unknown field degrades to a plain word, so pasting
  a URL or a half-typed phrase still returns results.
- **An unparseable query matches nothing, never everything.** On a compliance surface
  a silently-dropped filter shows the full ledger and reads as "this record does not
  exist".

**Two executors, one parse**, asserted equivalent over 26 queries × 5 rows by an
in-test `where` interpreter — closing the `txn-filters.ts` failure mode (two
definitions of one truth, drifting) by construction.

**Verified live on production:** `usd` → 5 · `will usd` → 5 · `-usd` → 18 of 23 ·
`ewura` → 2 · `moshi rain` → correctly 0.

---

## Also fixed on the way

- **`micro-patterns.css` deleted** — 176 lines loaded on every page, **0 of its 35
  classes and 0 of its 17 variables referenced anywhere**. A hardcoded-hex parallel
  kit (`#0A0E33`, `#6CA2FF`) sitting inside the design-system layer; it is the file
  that silently killed motion platform-wide once already (B5). The three apparent
  references were all false positives (a Playwright selector, a word in a comment, a
  substring of an unrelated class).
- **`reports/page.tsx` used `admin-table`** — a class that does not exist anywhere.
  That table rendered with no cell padding, no header styling, no row borders.
- **`PeriodPicker`** defaulted to ON while all 84 call sites passed `period={false}`,
  so it rendered in exactly one place: `finance/loading.tsx`, whose comment claimed it
  matched the page. It did not — every visit to `/admin/finance` shifted. Whole path
  deleted.
- **Admin filter placeholders were hardcoded English.** Now trilingual (1,573 keys × 3).

---

## Measured, not assumed

The trigram work produced a number that changed a decision:

```
PredictionMarket,  20,000 rows → planner picks Seq Scan (cost 675), IGNORES the index
PredictionMarket, 320,000 rows → Bitmap Index Scan 10.9 ms  vs  Parallel Seq 59.6 ms
```

At today's scale **scanning is simply cheap**. The indexes are a bet on growth and the
migration says so. This is also why the SQL-side regex work was withheld (below):
the benefit today is zero and the risk is not.

⚠️ **The audit skill says the local PG cluster lives at `F:\pg-loadtest`. That drive
does not exist on this machine — it is now `C:\pg-loadtest`.** Worth correcting in
`.claude/skills/50pick-audit/SKILL.md`; it nearly cost the migration its test.

---

## Deliberately NOT done, and why

- **`/admin/transactions` + `/admin/ai-usage` search into SQL** (money-adjacent).
  Designed and safe to do, but the measurement above says those searches are already
  fast at current row counts, so the change buys nothing today while touching a money
  file. Needs a supervised session.
- **Regex on those two SQL surfaces.** Postgres `~*` is unindexable in the general
  case — a sequential scan with a backtracking match per row, holding a pooled
  connection, and `admission.ts` sizes the bet gate off that same pool. The full
  envelope (statement_timeout 3000 ms, forced LIMIT 200, no `count(*)`, rate limit,
  audit-chain entry per search) is written down and ready. It should not be switched
  on unattended for a benefit the numbers say is not there yet.
- **`User` / `Transaction` trigram indexes.** A plain `CREATE INDEX` blocks writes —
  and blocking `Transaction` writes means **blocking deposits**. Needs
  `CREATE INDEX CONCURRENTLY` by hand via `psql` in a quiet window, outside the
  migration runner.
- **The ~58 hand-typed page widths.** Already correctly capped; the rename to
  `<PageContainer>` is cosmetic. They are held in a **ratchet list** in
  `scripts/measure-system.test.mts` that may only shrink, so no new one can appear.
- **`AdminFunnel`/`AdminFunnelChart` and `AdminStackedBar`/`AdminStackedBars`.**
  Genuinely duplicated, but **both halves of each pair have 4 real consumers** —
  consolidating them is a visual change to live admin charts, not a dead-code
  deletion.
- **The `text-[Npx]` convention** (1,478 uses incl. half-pixel steps the named scale
  cannot express) and the Tailwind-vs-CSS radius/spacing offset. Both real, both
  self-consistent, both large lossy codemods with no user-visible gain.

---

## New guards (all verified to fail on the bug they prevent)

| Command | Prevents |
|---|---|
| `npm run test:bridge` | a colour class naming a key the config does not have |
| `npm run test:measure` | width drift; page/loading tier mismatch; a missing field cap |
| `npm run test:search` | grammar regressions; executor divergence; ReDoS patterns reaching an engine |
| `npm run test:search-adoption` | a new hand-rolled `.includes()` search; regex leaking to a player route |
| `npm run test:contrast` | the ink ramp falling below AA |
| `scripts/responsive-audit.mjs` | a page wider than its tier, now at 2560 |
