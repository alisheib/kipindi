# PHOSPHOR MIGRATION — every icon and glyph on 50pick moves to Phosphor (`PHOSPHOR-MIGRATION`)

> **Board row ▶ 0j** in [`NEXT-PLAN.md`](NEXT-PLAN.md). Say **"continue phosphor migration"**: open this file at §0
> (RESUME AT), then §1 (the board). Guarded by `npm run test:phosphor-plan` (red twin `npm run red:phosphor-plan`).
> The ruling, in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md):
> § "2026-10-17 · Icons — every icon and glyph moves to Phosphor, in waves, live as each is proven (owner)".
> The design law it changes lives in [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) (§K3 points here until the swap
> rewrites it).

---

## §0 · RESUME AT

**State (2026-10-17):** W0 in progress. The plan is approved by Ali and filed. This tracker, its board row, its guard,
the AGENTS.md door and the ruling are committed on branch `phosphor-migration`. Nothing visual has changed: every icon on
the live site is still the house family in `src/components/ui/glyphs.tsx`.

**Next:** W0 — build the specimen (§5 W0 step 3) from the real house paths, the real tokens and the pinned Phosphor
package, publish it to Ali as a private Artifact with its numbered choices, then record his answers in §2 and §3.

### Where the work happens
- Branch **`phosphor-migration`** off `origin/main`. On Ali-Blade15 the worktree is `C:\kipindi-phosphor`; its
  `node_modules` is a junction to `C:\kipindi-journey\node_modules` (tsx suites only — Turbopack refuses a junction, so
  builds and dev servers need a real install). ⛔ Unlink the junction before removing the worktree.
- **Only the release owner pushes `main`** (the board's header names it; AGENTS.md §4). This lane pushes its branch at
  every step; the release owner merges it. Until it is merged, a session on another machine finds this file with:
  `git fetch && git worktree add <dir> origin/phosphor-migration`, then opens `docs/PHOSPHOR-MIGRATION.md`.
- Every step, in ONE commit: the work, this §0 rewritten, §1 ticked, the board row's count updated. Then push the
  branch. `npm run test:phosphor-plan` asserts the tracker and the board agree.

### The law for every page, new or old (Ali, 2026-10-17 — R-NEW-PAGES)
Every icon comes from the glyph family `I` in `src/components/ui/glyphs` — never an inline `<svg>` icon, never an
icon-library import, never a text character used as an icon. Until W2 lands, `I` still draws the house family; a page
written with `I` today moves to Phosphor automatically at W2, with no edit. From W1 a guard in `predeploy` enforces it.

---

## §1 · Board

| Wave | Title | Status | Note |
|---|---|---|---|
| W0 | Tracking + specimen + recognition check | 🔨 | tracking filed on `phosphor-migration`; the specimen and Ali's answers are next |
| W1 | Codegen + engine + guards, zero visual change | ⬜ | |
| W2 | The swap: the whole platform on Phosphor in one commit | ⬜ | |
| W3 | Selected states: Fill + one indicator; admin sidebar icons | ⬜ | |
| W4 | Outcomes and status: glyph + ink + word | ⬜ | |
| W5 | Plates, money, hub, categories, stats, admin cards | ⬜ | |
| W6 | Empty states: one family | ⬜ | |
| W7 | Consolidation: inline svgs, text-character icons, PWA, Maswali | ⬜ | |
| W8 | Motion on the existing primitives | ⬜ | |
| W9 | Close: adversarial audit, test:all, full tiles, the law final | ⬜ | |

Statuses: ⬜ not started · 🔨 in progress · ✅ done (the note cites its commit) · ⛔ withdrawn (the note cites an R- key
from §2). Ordering (guarded): W1 needs W0 ✅ · W2 needs W1 ✅ · W3–W8 need W2 ✅ · W9 needs W0–W8 finished.

---

## §2 · Rulings

Ali, 2026-10-17, after the inspection in Appendix A, choosing among numbered options (the session had recommended
keeping the house family and adding Duotone/Fill tiers; **Ali chose Phosphor**).

| Key | Ruling |
|---|---|
| R-PHOSPHOR | *"Switch to Phosphor"* — the icon family moves to Phosphor Icons (MIT). Vendored: an exact-pinned devDependency read only by a codegen script; the generated outputs are committed; no runtime icon package. This reverses DESIGN_AUTHORITY §K3 for Phosphor only, on the charts precedent (§B12.4: pinned, one home, guarded). The call-site API `I.key` stays; the drawings change underneath |
| R-NOW | *"Now, players see it"* — each wave goes live as it is proven, the classic shell included (every change a named `qa:classic-shell-parity` entry, never a re-baseline) |
| R-ADMIN | *"Yes, sidebar + cards"* — the admin console gets icons: the sidebar, stat cards and status chips |
| R-SPECIMEN | *"Yes, show me first"* — a side-by-side specimen before any code change; Ali's numbered answers set the weights, the tone, the selected indicator, the rail size, the lexicon and the badges |
| R-NEW-PAGES | *"if ay new pages are cretaed we tlel them impelemtn on any new pages rth ephosphor plan and they knwow"* — every icon on every page, new or old, comes from `I`; AGENTS.md states it and a `predeploy` guard holds it from W1 |
| R-RESUME | *"when we sya continue phosphor migration they know … dnto tolose any progress … oush rpogress"* — this file is the resume point on any machine; progress is committed and pushed at every step |

**Awaiting Ali (W0's specimen asks them):** 1 the line weight (Regular / Bold / size-switched, the table in §5 W1) ·
2 the Duotone tone strength · 3 the selected indicator (today's pill / an opaque pill) · 4 the rail glyph size (20 / 24) ·
5 the lexicon picks for the ambiguous meanings (§3) · 6 the badge medallions (keep their art / redraw inside with
Phosphor) · and the 18 → 19 px weight jump (Bold 1.69 px → Regular 1.19 px).

---

## §3 · Lexicon — one meaning, one glyph (draft; frozen in W2 after W0's answers and the recognition check)

Conflicts the inspection found (Appendix A), each to be settled by ONE pick:

| Meaning | Today | The conflict | Phosphor candidates |
|---|---|---|---|
| The questions board (journey tab "Maswali") | `questionCircle` | a "?" in a circle means Help everywhere | `squares-four` · `cards` · `list-checks` |
| Markets (classic rail "Masoko") | `markets` = a balance scale | also reads "court / law"; the PWA shortcut reuses it | `scales` · `chart-bar` · `squares-four` |
| Live | lightning (classic rail) · broadcast (hub) · red dot (cards) · teal dot (/live) | four marks for one meaning | `broadcast` · `lightning` · `record` |
| Positions / tickets | `ticket` and a briefcase | two marks | `ticket` |
| Deposit | ⊕ (wallet sheet) and ↓ (wallet page) | two marks | `arrow-line-down` · `download-simple` · `plus-circle` |
| Withdraw | upload icon (hub) and ↑ (wallet page) | two marks, two weights | `arrow-line-up` · `upload-simple` · `minus-circle` |
| Up & Down | `trendingUp` (classic) · `trade` ⇅ (journey) | two marks | `arrows-down-up` · `trend-up` · `chart-line-up` |
| Results | a dashed starburst with a check | reads as a loading spinner | `seal-check` · `flag-checkered` · `check-square` |
| The Needle (hub row) | a half-filled disc | reads as "theme / contrast" | a house extra drawn in Phosphor's grammar |
| A result recorded (notification) | a double circle | reads as "link" or "glasses" | `seal-check` · `flag` |
| Proposals | sparkle (hub) and trophy (its page) | two marks | `lightbulb` · `sparkle` |
| Trust and limits | the shield, about five meanings | overloaded | `shield-check` (verified) · `hand-palm` or `gauge` (limits) |
| The Up & Down empty state | a compass | a weak match | `arrows-down-up` on a plate |
| The two unlabelled Up & Down buttons | a scroll · a ticket with › | no label | labels added (en/sw/zh), glyphs from this table |

Recognition check (W0): each candidate shown without its label — "what does this do?" — to Ali and 3–5 players or
staff. A candidate most people misread is not picked.

---

## §4 · Mapping — house key → Phosphor (draft for the core keys)

From W1 the source of truth is `scripts/glyphs/map.ts`, and every name below is checked against the pinned package
(`test:glyph-map`). Until then this table is the plan. Keys are the house names call sites already use; they do not change.

| House key | Phosphor | House key | Phosphor |
|---|---|---|---|
| shieldcheck | shield-check | chevronRight / Left / Up / Down | caret-right / left / up / down |
| check · checkCircle | check · check-circle | x · xCircle | x · x-circle |
| alertCircle · warning · alertOctagon | warning-circle · warning · warning-octagon | info | info |
| lock · unlock | lock · lock-open | clock | clock |
| mail | envelope-simple | arrowRight / Left / Up / Down | arrow-right / left / up / down |
| pause · play | pause · play | users · user | users · user |
| sparkle | sparkle | search | magnifying-glass |
| plus | plus-circle | coins | coins |
| trophy · crown · star | trophy · crown · star | ticket | ticket |
| wallet | wallet | keyRound | key |
| idCard | identification-card | fileText | file-text |
| trendingUp · trendingDown | trend-up · trend-down | rotateCcw | arrow-counter-clockwise |
| layoutGrid | squares-four | ext · externalLink | arrow-square-out |
| download · upload | download-simple · upload-simple | chart | chart-bar |
| shieldAlert · shieldOff | shield-warning · shield-slash | percent | percent |
| gift · receipt | gift · receipt | edit · trash · copy | pencil-simple · trash · copy |
| activity | pulse | bell · bellRing · bellOff | bell · bell-ringing · bell-slash |
| eye · eyeOff | eye · eye-slash | settings | gear-six |
| logOut · logIn | sign-out · sign-in | link · share | link · share-network |
| home | house | menu | list |
| bolt | lightning | globe | globe |
| phone · smartphone | phone · device-mobile | calendar | calendar-blank |
| football | soccer-ball | politics · landmark · bank | bank |
| economy | chart-line-up | forex | currency-circle-dollar |
| weather | cloud-rain | crypto | currency-btc |
| entertainment | film-slate | tech | cpu |
| shuffle (mixed) | shuffle | markets (other) | per §3 |
| sealCheck · resolved | seal-check | void | prohibit |
| cardPay | credit-card | cashOut | hand-coins |
| headset · compass | headset · compass | qr · simCard | qr-code · sim-card |
| megaphone · database · server | megaphone · database · hard-drives | brain · bot | brain · robot |
| heartPulse · archive · scrollText | heartbeat · archive · scroll | target · gauge | target · gauge |
| watch | bookmark-simple | flame · flame2 · hot | fire |

House extras (no Phosphor match; drawn in Phosphor's grammar — 256 grid, every shipped weight — with a reason in
`map.ts`): at least `needle` (the brand's own geometry); likely `mobileMoney`, `ussd`. The codegen fails on any
unmapped key, so the list is complete by construction.

---

## §5 · The waves

Each wave closes with its own commit and push, §1 ticked, §0 rewritten and the board count updated — in that one commit.

### W0 — Tracking + specimen + recognition check
1. Worktree from `origin/main`, branch `phosphor-migration`. Stage files by name only.
2. File the tracking system: this tracker, board row ▶ 0j, the AGENTS.md door and law, `test:phosphor-plan` + its red
   twin, the COMPLIANCE-DECISIONS ruling, the DESIGN_AUTHORITY §K3 pointer, the docs index row. Push the branch.
3. Specimen, published to Ali as a private Artifact: the real house paths and the real tokens beside Phosphor (from the
   exact pinned `@phosphor-icons/core`, fetched to a scratch directory, never into the repo), at 360 and 1280 px — the
   rail (inactive / selected), hub rows on plates, a market card with its category sigil, the wallet doors, ticket
   outcomes, an empty state, the admin sidebar. Numbered choices: the six in §2 "Awaiting Ali".
4. Recognition check (§3). Record every answer in §2/§3; W0 ✅.

### W1 — Codegen + engine + guards, ZERO visual change
- **Source:** `@phosphor-icons/core` (MIT; 2.1.1 at design time — pin the exact version installed) as an exact-pinned
  devDependency only. Never `@phosphor-icons/react` (each of its modules ships all six weights). Strokes on the 256
  grid: thin 8 · light 12 · regular 16 · bold 24 units; all four weights share one centreline.
- **Codegen** `scripts/glyphs/{map.ts, reach.mts, census.mts, codegen.mts}` (W1 adds its `glyphs:gen` script): `map.ts` is §4
  made executable; `reach.mts` lifts the house's own `pathReachX` (x and y) to build the ink table — an exact box per
  (key, variant), centring baked in by the R9-A1 rule — so `edge`, `glyphInkGaps` and plates read numbers and the runtime
  path parser leaves the client bundle. Committed outputs: `glyph-registry.generated.ts`, a server-only
  `glyph-paths.generated.ts`, `src/app/glyph-geometry.generated.css`, the sprites, `THIRD_PARTY_NOTICES.md` (the MIT
  text, also embedded in every sprite). In W1 the house drawings stay live; the Phosphor outputs are dormant.
- **Delivery:** content-hashed external sprites split by reach — `public/icons/g/{shell,app,admin}.<hash8>.svg` —
  rendered as `<svg><use href>` (estimates: shell ≈8 KB brotli, app ≈22 KB, admin ≈10 KB; players never download
  admin). First-load JS falls from ≈9.5 KB gz to ≈3 KB. `/icons/` is already immutable-cached and the service worker
  serves it. Only the offline page (`lib/offline-document.ts`) renders inline paths, from the server-only module.
  Rejected: a shared `I` object (30–50 KB gz on every route), a codemod (edits 313 files), an icon font or CSS masks.
  **Overturned if** the 2G film strip (CDP 250 kbps / 800 ms RTT, CPU ×4, 360 px; `/`, `/markets`, `/markets/[id]`)
  shows rail or header icons blank at the end of hydration — then the shell group is inlined as `<symbol>`s in the
  root layout.
- **API:** one new prop, `tier?: "line" | "fill" | "duo"` (default `line`) — no call-site edits. The weight is derived
  from the size so the painted line stays near 1.25–1.6 px:

  | Size | Weight | Painted (house today) |
  |---|---|---|
  | ≤ 18 px | bold | 12 → 1.13 (0.95) · 14 → 1.31 (1.11) · 16 → 1.50 (1.27) · 18 → 1.69 (1.43) |
  | 19–26 px | regular | 20 → 1.25 (1.58) · 24 → 1.50 (1.9) |
  | 27–38 px | light | 32 → 1.50 |
  | ≥ 39 px | thin | 48 → 1.50 · 64 → 2.0 |

  Duo is composed at codegen (Phosphor's tone path + the outline at that size's weight); its 0.2 becomes `--glyph-tone`.
- **Marks among words** (`text`: 68 sites on 10 keys) are drawn inline as strokes on Phosphor's own centrelines (e.g.
  caret-right `M96 48l80 80-80 80`) with `.kp-gtext` + `--g-stem`, exactly today's CSS, so they keep the font's stem
  (R9-A4 / R10-A6). A guard proves every sampled outline point lies 8 ± 0.3 units from the centreline.
- **Three CSS literals carry house geometry** and move to generated variables (`.kp-jbal__lock`, `.kp-jhdr__pill`, the
  hub chevron's `translateX(-2.25px)`); `.g-ring`'s origin is pinned to the Phosphor bell.
- **Parity, the harness's own way** (`scripts/qa-classic-shell-parity.mjs` — normalisers only for proven noise; changes
  are exact named entries): v5 adds a per-region `glyphs` field (ordered `data-g` + a sha1 per drawing) and a `norm`
  rule for the hashed sprite URL that keeps the fragment (with its own red check); a new baseline and a null compare.
- **New guards** (each with an in-process `--prove-red` twin): `test:glyph-source` (**in `predeploy`** — what enforces
  R-NEW-PAGES: no Phosphor import outside `scripts/glyphs/`, devDependency only and exact, no other icon package, the
  256 viewBox only in generated files, the inline-`<svg>` and text-character icon lists frozen and only shrinking,
  nothing client-reachable importing `glyph-paths.generated.ts`) · `test:glyph-sync` · `test:glyph-map` ·
  `test:glyph-tiers` · `test:glyph-keys` · `test:glyph-licence`.
- **Amended, derived from the diff:** `test:visual-pass-r9a` (§1.3, §1.1–1.5, §2, §4.1, §4.7, §4.8),
  `test:visual-pass-r10` (§6.9, §6.10, §7), `test:visual-pass-r4d` §6, `test:visual-pass-r4e` §2,
  `test:offline-neutral` §5, `test:pager-reach` §2/§3, `test:journey-shell` §1, `test:design-frozen`,
  `test:measure-system` §8, `test:visual-pass-r5a`, `test:glyph-motion`, `qa:first-load` (gzip/brotli totals + marker
  rows). Unchanged: `test:icon-sizes`, `test:privacy-notice` §2a, `test:css-vars-defined`.
- **Proof:** every key × frozen size × edge × stem gives margins byte-equal to a copy of the old engine; every existing
  glyph guard passes unchanged; the parity null compare passes; first-load moves by no more than ±0.5 KB gz.
- Remove the stale `lucide-react` entry from `next.config.ts` `optimizePackageImports` (the package left 2026-07-20).

### W2 — The swap (one commit: land, measure, add the measured layout entries, squash)
1. Ali reviews the FULL contact sheet (`glyphs:gen --sheet`, every key in its weights); `map.ts` is frozen.
2. `glyphs.tsx`: the entries and `G`/`GL` go; `I` is built from the registry (sprite renderer + inline centrelines);
   `GLYPH_SET`/`KEY_OF` rebuilt. Call sites unchanged.
3. The offline page uses the server renderer; the generated CSS variables take Phosphor's values; `sw.js` prunes
   superseded sprites, keeping the previous hash one release (deploy skew).
4. Dead keys go, except the reserved (`voidX` → `sealX` and the other Maswali R2 glyphs). The §3 picks land.
5. Parity: `scripts/glyphs/parity-entries.mts` generates exact old → new pairs; layout entries come from the first
   compare's `.current.json` (measured, never predicted); every entry seen in all its cells or none; listed where the
   parity register is kept.
6. DESIGN_AUTHORITY: §K3, §C6, §S3 (the weight law), §0d, the §M5 count — rewritten to the new truth.
7. Measure: `qa:first-load` against base (target ≥ 5 KB gz lighter per route), sprite sizes, HTML bytes, the 2G film
   strip; the full tile set; the production read-back.
- Risks: a blank icon on a cold 2G visit (inline the shell sprite if the film strip fails) · deploy skew (previous
  sprite kept one release) · service-worker growth (prune rule) · parity blind inside `<use>` (the digest field) ·
  Phosphor's larger live area (Ali rules from the contact sheet; `plateGlyph` numbers do not move in the swap) · a missing
  variant at a dynamic size (an availability mask + a `RESERVED` list).

### W3 — Selected states
Classic rail, journey tabs, the classic and journey desktop bars, the admin sidebar (icons ADDED): inactive Line in
`--text-subtle` → selected **Fill** in `--text` on ONE opaque indicator, via `GlyphSwap`. The four "active" styles
collapse into one. The rail's square, edge-to-edge focus ring follows the pill.

### W4 — Outcomes and status
Tickets, positions, results, market chips, receipts, notifications: glyph + ink + word, so shape alone tells them apart
(§A4). Inks from `src/lib/status-tone.ts` (§B11). Won = the Fill seal in gold (earned money, §M3a); lost / void / pending
= quiet Line marks (§M7: a loss is bookkeeping); void slate; result crests success/danger (`test:betting-ink` §7a).
"Resolved" stops borrowing the won gold. Callouts, toasts and the result dialog: a Fill status glyph on a role plate.

### W5 — Plates, money, hub, categories, stats, admin cards
`IconPlate` gains `role` tints from tokens (`color-mix` in oklch); one plate everywhere (the ~30 hand-made tiles go).
One deposit glyph, one withdraw glyph. Hub rows: Duotone on plates on the phone too. Categories: a Duotone sigil on a
royal plate on cards, the discovery chips and the journey home chips (the 0.055-opacity watermark retires). Info buttons
and stat tiles: the glyph fills its control per `plateGlyph`. Admin stat cards and status chips get icons.

### W6 — Empty states, one family
`ui/empty-state.tsx`'s private set (48 sites) and the 8 unused `GL` arts retire: an empty state is a large Duotone glyph
on a plate. DA §C7's single accent stays as `--metal-gold` (§Q5), never money gold (`test:visual-pass-r5c` §2.9,
`test:gold-is-money`). Badge medallions per Ali's W0 answer.

### W7 — Consolidation
The 63 inline `<svg>` → family glyphs, or kept with a recorded reason (charts, brand, spinner). Text-character icons
(`→` in buttons, `▲▼`, `↑↓`, `★`, admin `✓ ✗ ⚠ ⛔ ↗ ●`) → glyphs (× as the multiplier stays). The `test:glyph-source`
ratchets reach 0. PWA shortcut icons regenerated from Fill glyphs via `build:brand` (DA §B1a). Maswali's glyphs move to
Phosphor's grammar.

### W8 — Motion: no new keyframes; every moment uses a primitive that already exists (DA §M5)
| Moment | Primitive (`src/app/motion.css`) |
|---|---|
| A destination becomes selected (line → fill) | `GlyphSwap` → `.g-swap-out` / `.g-swap-in` |
| Watch / star / subscribe turned on | `.g-settle` on the Fill glyph's mount |
| A NEW notification (never on page load) | `.g-ring` on the bell, its origin pinned to the Phosphor bell |
| A deposit confirmed / a withdrawal requested | `.g-nudge-down` / `.g-nudge-up` on its arrow, once, on the event (never press or hover) |
| A bet placed / a deposit confirmed | the check draws itself with the dormant `.m-draw` on Phosphor's check centreline |
| A win | the existing seal only (§M7); nothing loops, no confetti (§C5); haptic `success` only (§H1) |
| Live | the existing calm breathe dot |
Each has its reduced-motion branches (§M6). DA's drift that `.m-draw` runs 820 ms is corrected (it runs `--t-max`).

### W9 — Close
An adversarial audit (refute by mutation), `test:all` with the database suites, full tiles (360 / 768 / 1280 / 1920 + 320
× sw / en / zh, both shells, admin) read one by one, the production read-back. DESIGN_AUTHORITY final; §1 all ✅; the
board row struck; memory updated.

### Verification, every wave
Its own guard and red twin; every suite that reads a changed file (grep `scripts/` for the path); typecheck,
`next build`, local `qa:live` per release (a build is not a render); after a release, the production read-back
(`?dpl=` on both hosts, health, chunks). Tiles of what changed, read one by one; named parity entries; a
`test:contrast` row for every new plate/ink pair. Before/after tiles go to Ali as a private Artifact.

---

## §6 · Coordination
- **Maswali R2 is with Claude Design** (it adds `sealNil` and `millionea` and renames `voidX` → `sealX`). Don't disturb
  it: on its D2 receipt its glyphs are metaphor references, drawn in Phosphor's grammar in W7. `voidX` is reserved.
- **Vodacom** (S14–S16 open): classic-shell changes reach `main` as named parity entries, so its branches inherit them on
  rebase. A wave touching home or cards checks `git log` and the worktrees first and goes after that lane's merge.
- **Parallel sessions:** own worktree; heavy Node only through the machine's lock; stage by name; never `git add -A`.

## §7 · Seen on the way (not icons — for their own lanes)
- The chat button covers content on many phone tiles (the hub's "Kiswahili ›", a toggle, a card's time-left).
- The Needle disc sits half off-screen over content on most phone tiles.
- At 320 px the header drops the ⊕ on "Weka pesa" and "Tiketi zangu" wraps to two lines.

---

## Appendix A · The inspection (2026-10-17, read from `origin/main` `7bf0e6eb`)

**Why now.** Players like 50pick but say its icons "don't give enough life". It is the fifth time the weakness was
raised: the 2026-08-06 commission brief ("hairline strokes that nearly vanish against the background",
`design-brief/README.md`), the deferred "stroke 2.0" restyle of the Material commission
(`design-system/v2-2026-07-27/11-material/MANIFEST.md`), critic CP-112 ("Icons are reused and mismatched… No lens
reviewed icons", `MOBILE-VISUAL-FINDINGS-2026-09.md`), and unit U39, never started (`MOBILE-VISUAL-PLAN.md`).

**The census.**

| Finding | Number |
|---|---|
| The family | `I` in `src/components/ui/glyphs.tsx`: 182 glyphs (174 on the 24 grid, 8 on the 64 grid), ONE weight (1.9 stroke), line only |
| Use | 313 files; 1,143 references (631 player, 376 admin direct + 136 by name); 185 client components |
| Reachable / unused | 140 reachable; 42 unused (incl. all 8 64-grid arts, every `cat*`, `home`, `live`, `watch`, `flame`) |
| Duplicates | `profile` = `user` and `bank` = `landmark`, byte-identical; `void` / `voidX` / `xCircle` near-copies |
| Sizes | 14 px is the most common; 65% of all icons render at ≤ 14 px (≈1.1 px stroke); 239 sites at ≤ 12 px; `GLYPH` constants used at 0 call sites; 19 sizes frozen by the ratchet |
| Inks | `text-subtle` 115, `brand-300` 61, `text-muted` 37; 444 sites inherit (mostly muted) |
| Fills | none: 23 drawings carry a small filled dot; no tier, no tone |
| Selected state | no filled icon in any shell; four "active" styles; the phone pill `--pill-active` = 1.18:1 on the bar; admin sidebar has no icons |
| A second family | 63 inline `<svg>` in 35 files, strokes 1.5–2.8 |
| A third family | `ui/empty-state.tsx`: 12 drawings, 56 grid, 1.5 stroke, a hand-typed money-gold accent, 48 sites |
| Outcomes | tickets / positions / results by colour + word only; gold means both "won" and "resolved" |
| Categories | a 140 px watermark at 0.055 opacity + a 13 px muted mark; none on the board's discovery bar or the journey home chips |
| Motion | `GlyphSwap` on 6 sites; `.g-settle` 11, `.g-ring` 2 |
| Text characters as icons | `→` (15 / 14 / 13 per locale) in buttons; `▲▼` deltas, `↑↓` sides, `★` in player code; `✓ ✗ ⚠ ⛔ ↗ ●` in admin |

**The screenshots** (round-10 tiles at 1×, the harshest case — a budget Android; on ALI-BLADE15 under
`C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad/r10v/tiles/` and
`…/r10q/tiles/`): most icons are `#899DD1` (6.4–7.5:1) at 9–16 px with 0.8–1.3 px lines that often straddle two pixels;
the bell is dimmer than its own "25" badge; the classic rail's gold coin is about 10× heavier than the line icons around
it; won / lost / void are tracked capitals only; the profile's badge medallions, the KYC status plates, the payment logos
on white tiles and the ticket detail icons (11:1) are the work to carry over.

**The four lenses.**
- *UI/UX:* one weight from 9 to 64 px is the core flaw; Android (Material 3) and iPhone tab bars mark the selected
  destination with a FILLED icon over an indicator — 50pick has the indicator and not the fill.
- *Motion:* life comes from state change, not decoration; the four existing primitives cover every moment; no win loop.
- *User experience:* filled shapes are recognised faster at small sizes and on bright, low-end screens; one meaning per
  glyph; shape must tell outcomes apart for colour-blind players.
- *Colour:* no new hues — every hue on the board already means something (side, earned money, warning, link, void);
  the Duotone tone is `currentColor`; categories differ by shape; three ink steps for hierarchy.

## Appendix B · Why Phosphor, and how it is delivered
- Phosphor: MIT, ~1,500 icons × six weights (thin, light, regular, bold, fill, duotone), consistent pairs for every icon.
  Its "regular" is thinner than the house family (0.875 px at 14 px), which is why the size → weight table uses bold at
  small sizes.
- Considered and not chosen: Tabler (MIT; strong stroke set, partial filled set), Hugeicons Pro (metered by pageviews,
  a private registry at build time), Solar (licence unclear, an unmaintained repository), Material Symbols and Fluent
  (read as Google / Microsoft), and keeping the house family with tiers (the session's recommendation; Ali chose Phosphor).
- Delivered as vendored, generated sprites — not `@phosphor-icons/react` — so the first download gets lighter, not
  heavier (§5 W1).
