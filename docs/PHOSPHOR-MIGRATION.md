# PHOSPHOR MIGRATION — every icon and glyph on 50pick moves to Phosphor (`PHOSPHOR-MIGRATION`)

> **Board row ▶ 0j** in [`NEXT-PLAN.md`](NEXT-PLAN.md). Say **"continue phosphor migration"**: open this file at §0
> (RESUME AT), then §1 (the board). Guarded by `npm run test:phosphor-plan` (red twin `npm run red:phosphor-plan`).
> The ruling, in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md):
> § "2026-10-17 · Icons — every icon and glyph moves to Phosphor, in waves, live as each is proven (owner)".
> The design law it changes lives in [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) (§K3 points here until the swap
> rewrites it).

---

## §0 · RESUME AT

**State (2026-10-17):** W0, W1 and W2 are LIVE. W2, the swap, went live at **`732efbc5`**, pushed at 23:10 UTC on Ali's
*"push lov enayhtng please"*:
- **What it does.** Every icon on the platform is drawn by Phosphor. The chrome's twelve glyphs are inlined in every
  page; the rest come from one immutable sprite file. Every route's first load is 6.4–6.5 KB lighter, gzipped.
- **The proof before the push:**
  - typecheck 0 and `next build` 0;
  - local `qa:live`: 377 passed. Its last section, [M], was cut off when the machine guard stopped the dev server at
    26 MB free, and production reads it again;
  - a 103-suite battery green, except `main`'s known reds;
  - an independent code review and a four-reader screenshot review, read and fixed.
- **Ali's review page:** https://claude.ai/artifact/5v3yaDeeZYn7igGoVJVgEo, with seven calls he may overrule.
- **Production, read back:** all three hosts served `732efbc5` 220 s after the push, health is reachable and migrated,
  the sprite is served 200 and immutable, `qa:chunks-prod` passes on both origins, and production `qa:live` passed
  363/363 (23:30 UTC).

**Next:**
1. The swap's follow-ups:
   - release part two: section [M] alone, the review's fixes and the checkbox drive in a real browser;
   - a parity compare at `732efbc5`, then `npm run glyphs:parity-entries` on its capture, then the clean compare with
     `--prove-red`;
   - Ali's answers to the review page's calls.
2. W3, selected states (R-INDICATOR 3B, R-RAIL 4B):
   - the classic rail, the journey tabs, the desktop bars and the admin sidebar;
   - Line when inactive, Fill on one opaque royal pill when selected, tab glyphs at 24px (which also balances the
     journey's Akaunti person);
   - the codegen keeps the previous sprite for one release (deploy skew).

### Where the work happens
- Branch **`phosphor-migration`** off `origin/main`. On Ali-Blade15 the worktree is `C:\kipindi-phosphor`, with its own
  real `node_modules` (installed 2026-10-17; the earlier junction was unlinked first, never deleted through).
- **Who pushes `main` for this programme.** The board's release owner is the OMEGA-COMPILE01 session (Ali, 2026-10-16).
  Asked whether this session should take the Phosphor migration to production itself, Ali answered *"until live"*
  (2026-10-17, to the Ali-Blade15 session) — so this programme's releases are pushed to `main` by the session working it,
  recorded in the board's header. Every release: rebase on `origin/main` immediately before the push, the release
  checklist of AGENTS.md §4 (typecheck, `next build`, local `qa:live`, then the production read-back), and never a push
  while another lane's release is mid-flight (`git log origin/main` first). Between releases, the branch is pushed at
  every step, so a session on another machine resumes with `git fetch && git worktree add <dir> origin/phosphor-migration`.
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
| W0 | Tracking + specimen + recognition check | ✅ | d7a1b697 — Ali ruled the specimen; answers in §2 and §3; the specimen is stored at `design-brief/phosphor-2026-10/` |
| W1 | Codegen + engine + guards, zero visual change | ✅ | cf3202ab — live at 9b604d8e (2026-10-17): the codegen, the generated glyph files, test:glyph-source in predeploy (R-ONE-SOURCE); production read back |
| W2 | The swap: the whole platform on Phosphor in one commit | ✅ | 732efbc5 — live 2026-10-17 23:10 UTC: every icon drawn by Phosphor (twelve chrome glyphs inline, the rest one immutable sprite), 6.4 KB gzip lighter per route; production read back |
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
| R-WEIGHT | **1B** — the Line tier is Phosphor **Bold up to 26 px** (20 px paints 1.88 px, 24 px 2.25 px) and Regular from 27 px. §5 W1 carries the table |
| R-TONE | **2B** — the Duo tier is Phosphor's own Duotone: its Regular outline with the tone layer at **20%** (`--glyph-tone: 0.2`) |
| R-INDICATOR | **3B** — a selected destination is its **Fill** glyph on an **opaque royal pill** with a lit edge, everywhere (W3) |
| R-RAIL | **4B** — tab-bar glyphs are **24 px** (Android and iPhone size), in a pill grown to fit (W3) |
| R-LEXICON | **5.1A–5.7A** — the board `squares-four` (both the classic "Masoko" and the journey "Maswali" tab) · Live `broadcast` · deposit / withdraw `arrow-line-down` / `arrow-line-up` · Up & Down `arrows-down-up` · results `seal-check` · proposals `lightbulb` · limits and breaks `hand-palm`. §3 and §4 carry them |
| R-BADGES | **6A** — the profile badge medallions keep their hand-drawn art: identity art like the brand mark, outside the Phosphor family |
| R-ONE-SOURCE | *"we need to have 1 source of glyphs and icons so mark tsi as rule and let na fuutre deins gor pages tkae fomr our new souerce clenaly perfclet loically"* (Ali, 2026-10-17, during W2) — ONE source: the family `I`. An icon it lacks becomes a key in `scripts/glyphs/map.ts` (or a house extra) before any page draws it; a design delivered for a page is built from the keys, never from its own drawings. AGENTS.md §7, DESIGN_AUTHORITY §K3 and the design master brief state it; `test:glyph-source` §3/§5/§6 hold its three doors (inline `<svg>`, SVG data URIs, images under `public/`) |

**W0's answers** — Ali, 2026-10-17, after opening the specimen: *"good i saw them proceed oerfcetly syroe anuthgi enede
int h erpeo and keep going"*, then *"until live"*. The specimen's pre-selected line `1B 2B 3B 4B 5.1A 5.2A 5.3A 5.4A 5.5A
5.6A 5.7A 6A` is therefore his answer, recorded above as R-WEIGHT … R-BADGES. The recognition check (§3) is answered by
his review; a label-less check with players stays open to him at W2's full contact sheet.

**The specimen** (https://claude.ai/artifact/74HNKPSDZLNdaLJvTbXGWW, published 2026-10-17). Every "today" drawing is
read from `glyphs.tsx` at main `380edd31`; every Phosphor drawing from `@phosphor-icons/core` 2.1.1 (registry sha512
`v4ARvrip4q…zM4eZilxQ==`, verified), only its path data, embedded as `<symbol>`s and drawn with `<use>` — the W1
delivery in miniature. Rendered and read in Chromium at 390 and 1280 px before publishing: no horizontal overflow, all
three faces loaded, no console error. Its recommended line, pre-selected: **`1B 2B 3B 4B 5.1A 5.2A 5.3A 5.4A 5.5A 5.6A
5.7A 6A`**.
- ⚠️ **The render changed one recommendation.** The plan's size → weight table (§5 W1: Bold ≤ 18 px, Regular 19–26 px)
  paints tab-bar icons THINNER than today (20 px: 1.25 px against the house's 1.58 px), which works against "more
  life". The specimen therefore recommends **1B — Bold up to 26 px** (20 px → 1.88 px, 24 px → 2.25 px), with Regular
  only for large art (plates, empty states); 1C kept the plan's even table. Ali chose 1B (R-WEIGHT), so §5 W1's table
  is now 1B's.
- 5.1 merges two meanings found by the inspection into one: the classic "Masoko" tab and the journey "Maswali" tab are
  the same board, so one glyph serves both.
- 6A keeps the badge medallions as hand-drawn identity art (like the brand mark), outside the Phosphor family.

---

## §3 · Lexicon — one meaning, one glyph (ruled 2026-10-17, R-LEXICON; applied in W2)

**The picks:** the board → `squares-four` · Live → `broadcast` · deposit / withdraw → `arrow-line-down` /
`arrow-line-up` · Up & Down → `arrows-down-up` · results → `seal-check` · proposals → `lightbulb` · limits and breaks →
`hand-palm`. The rows below without a pick (positions, the Needle, a result recorded, trust) follow the same rule in W2:
positions are `ticket`; a result recorded is `seal-check`; `shield-check` means verified only; the Needle is a house extra.

**Call sites that move in W2** so each meaning has one key: the journey tab "Maswali" from `questionCircle` (which keeps
meaning Help) to the board's key; the classic rail's Live from `bolt` to `live`; the classic rail's Up & Down from
`trendingUp` (which keeps meaning a rising trend) to `trade`; the hub's proposals row from `sparkle` to a new key `idea`;
the hub's limits row from the shield to a new key `limits`; every deposit / withdraw door to `arrowDownToLine` /
`arrowUpFromLine`. **And one W2 found (the lead engineer's call, 2026-10-17):** with results on `seal-check`, the hub's
Uthibitisho wa utatuzi row (`sealCheck`) drew the same seal as its neighbour Matokeo — the pair R5-A had parted — so it
wears a new key `attestation` (`stamp`, the resolution's official attestation); `sealCheck` stays `seal-check`, aliased
with `resolved`, for the resolution panel's attestation lines and Maswali's marks.

The conflicts the inspection found (Appendix A), and the candidates Ali chose from:

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

Recognition check: answered by Ali's review of the specimen (2026-10-17). A label-less check with 3–5 players or staff
("what does this do?") stays open to him at W2's full contact sheet; a glyph most of them misread is swapped there.

---

## §4 · Mapping — house key → Phosphor

**The one source is [`scripts/glyphs/map.ts`](../scripts/glyphs/map.ts)** (R-ONE-SOURCE): every key with its Phosphor name,
or its retirement and the reason; the aliases (two names, one meaning); the keys new in this migration; the house extras
where Phosphor has nothing ([`extras.ts`](../scripts/glyphs/extras.ts): `needle`, `mobileMoney`, `ussd`, each with its
reason); and the marks that stand among words ([`marks.ts`](../scripts/glyphs/marks.ts)). `test:glyph-map` checks every
name against the pinned `@phosphor-icons/core`; the contact sheet (`npx tsx scripts/glyphs/codegen.mts --sheet <file.html>`)
shows every live key in all its weights. This section held W0's draft of the mapping; it is not copied here, so it cannot
drift from the file (the draft already had: `politics` draws `flag-banner`, `logIn` is retired).

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

**As built (2026-10-17).** W1 landed purely additive, so "no visual change" holds by construction — nothing on the
site imports a new file yet:
- `@phosphor-icons/core` 2.1.1, an exact devDependency (lockfile integrity = the registry's sha512, verified).
- `scripts/glyphs/`: `map.ts` (all 182 house keys: 144 stay — Phosphor names, 3 house extras, 9 alias pairs — and 38
  retire, each with its reason; plus the two new keys `idea` / `limits`, so 146 live), `extras.ts` (the needle, mobileMoney and ussd in Phosphor's grammar),
  `reach.mts` (the house's own bounds reader, x and y), `codegen.mts` (`glyphs:gen`; `--check`; `--sheet <out>` writes
  the contact sheet for W2).
- Generated: `src/components/ui/glyph-registry.generated.ts` (per key: symbol stem + ink box per variant),
  `public/icons/g/glyphs.<hash8>.svg` (548 symbols — every variant of every live key, 281 KB raw / 55 KB gzip; W2 ships
  only the variants each surface draws, split by reach), `THIRD_PARTY_NOTICES.md` (the MIT text, verbatim).
- Guards, each with an in-process red twin: `test:glyph-map` (14/14 plants caught), `test:glyph-sync` (7/7 — it also
  carries the licence checks), `test:glyph-source` (8/8; **in `predeploy`** — the law for every page; its inline-`<svg>`
  ratchet starts at the census: 40 files, 75 drawings, each with its reason).
- `next.config.ts`: the stale `lucide-react` entry left `optimizePackageImports`.

**Moved to W2, on purpose:** the engine rewrite (a "bridge" engine in W1 would have been deleted again by the swap,
and eight guards read the house entries' exact text), parity harness v5 with its baseline (it must be taken against the
`main` the swap lands on), the `qa:first-load` gzip rows, the sprite's split by reach, and the amendments of the guards
that read the house drawings. W2's list below carries them.
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
- **API:** one new prop, `tier?: "line" | "fill" | "duo"` (default `line`) — no call-site edits. The Line tier's weight
  is derived from the size (R-WEIGHT, Ali's 1B):

  | Size | Line weight | Painted px (house today) |
  |---|---|---|
  | ≤ 26 px | bold | 12 → 1.13 (0.95) · 14 → 1.31 (1.11) · 16 → 1.50 (1.27) · 18 → 1.69 (1.43) · 20 → 1.88 (1.58) · 24 → 2.25 (1.9) |
  | ≥ 27 px | regular | 28 → 1.75 · 32 → 2.0 · 48 → 3.0 |

  Fill is Phosphor's fill at any size. Duo is Phosphor's own Duotone — its Regular outline plus the tone layer, exactly
  as Ali saw it in the specimen — and the tone's 0.2 becomes `--glyph-tone` (R-TONE).
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
0. **Carried from W1:** parity harness v5 and its baseline against the `main` the swap lands on; the `qa:first-load`
   gzip/brotli rows and the `GlyphRegistry` / `GlyphPaths` markers; the sprite trimmed to the variants each surface draws
   and split by reach (shell / app / admin); the three CSS literals that carry house geometry; `test:glyph-tiers` and
   `test:glyph-keys`; the amendments of every guard that reads the house drawings (§5 W1 lists them).
1. Ali reviews the FULL contact sheet (`glyphs:gen --sheet`, every key in its weights); `map.ts` is frozen.
2. `glyphs.tsx`: the entries and `G`/`GL` go; `I` is built from the registry (sprite renderer + inline centrelines);
   `GLYPH_SET`/`KEY_OF` rebuilt. Call sites unchanged.
3. The offline page uses the server renderer; the generated CSS variables take Phosphor's values; `sw.js` prunes
   superseded sprites, keeping the previous hash one release (deploy skew).
4. Dead keys go — `voidX` too: Ali's 2026-10-17 Millionea ruling (§6) ended its reservation. The §3 picks land.
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

**As built (live at `732efbc5`, 2026-10-17 23:10 UTC):**
- **The engine is Phosphor's.** `glyphs.tsx` builds `I` from the generated registry: `<svg><use>` into the content-hashed
  app / admin sprites, the chrome's Bold and Fill as symbols the root layout inlines (`GlyphShellSprite`), the ten marks
  among words as strokes on Phosphor's centrelines; tiers line / fill / duo with the Bold-to-26px rule; the offline page
  from `offline-glyphs.generated.ts`. The CSS that carried house geometry is re-derived from Phosphor's ink:
  `.kp-jbal__lock` `calc(-28 * 16px / 256)`, `.kp-jhdr__pill` `calc(11px + 28 * 14px / 512)`, `.kp-udbug__arrow`
  `calc(0.082em - 56 / 256 * 0.8em)`; the hub chevron's `translateX(-2.25px)` is still exact.
- **The lexicon landed** (§3): the board `markets` on both tabs, Up & Down `trade`, Live `live`, the deposit / withdraw
  arrows on every money door, proposals `idea`, limits `limits`. Decided in W2 (the lead engineer — Ali may overrule
  in one line): `resolved` and `sealCheck` share Phosphor's seal-check (5.5A; the seal Maswali's marks build on), so the
  hub's Uthibitisho wa utatuzi row wears a new key, `attestation` (Phosphor `stamp`) — R5-A had parted that row from
  Matokeo once already. `voidX` retired.
- **Two costs of Phosphor's fuller drawings, fixed at the source:** Button's spinner takes the glyph's room
  (`glyphRoom`, as the search box's `slotPull`), so an lg button's label no longer jumps 1.64px when it starts loading;
  the search box's ⓘ is 14px (on a whole pixel), so the field's two insets are 14.00 and 14.09.
- **The first Fill on a page** (decided in W2, the lead engineer — Ali may overrule in one line): the How-to card's play
  on its royal plate is drawn solid, `<I.playBare s={plateGlyph(48)} tier="fill" />` (`playBare` in `FILL_KEYS`), as the
  hand-drawn triangle was — a play button on a plate reads solid, and Phosphor's Bold play is an outline.
  `test:journey-home` 5.plate pins it in source and as drawn (`p-play-fill`, with two new plants); r9a §1.3′ proves the
  Fill triangle, like the Bold one, is centred on its centroid.
- **The checkbox tick keeps Phosphor's Bold check at 13px** (decided in W2, the lead engineer): 1.22px arms over a 10.6px
  tick, where the hand-drawn one painted 1.63px over 9.2px — about the same ink, longer and finer. Its `strokeWidth: 3`
  went: a filled Phosphor outline has no stroke to thicken. Rejected: check-fat (3.1px arms at that size, heavy in a 19px
  box) and the check's Fill (a tick knocked out of a square). To be read at the tiles.
- **The chrome never waits for a file** (found in W2's own review): the balance pill's eye (`CashEye`) and its lock are
  header chrome, yet they were served from the app sprite, so a slow first visit would have shown the header's eye blank
  until that file arrived. `eye`, `eyeOff` and `lock` joined `SHELL_KEYS`: twelve inline symbols, 1.5 KB brotli on
  every page; the app sprite is 138 symbols, 16.9 KB brotli, one immutable file. `test:glyph-map` §9 now holds the
  chrome to it: every key the two tab bars and the two headers draw before a tap is a shell key, a key drawn only in an
  opened menu or panel is named with where, and every shell key is drawn by the chrome (six new plants, 25/25 caught).
  The skew case is Next's: a tab opened before the deploy loads a whole new page on its next navigation (the router
  compares the build id), so it never draws a shell glyph without the inline symbols beside it.
- **W2's adversarial review** (2026-10-17: an independent read of the whole diff, set to refute it) found six defects,
  all fixed here:
  1. The three focus traps (`Modal`, the notifications panel, the filter sheet) counted a bare `[href]`, so every glyph's
     `<use href>` was "focusable". In ConfirmModal (the deposit and withdraw confirms, sign-out, 63 admin confirms) Tab
     died on Cancel, and Shift+Tab left the dialog. They now read `a[href], area[href]`.
     `test:visual-pass-r6b` 1.2 had caught it. It reads the same selector, with a new control showing the in-flight
     panels draw 3 and 2 glyphs it no longer counts.
  2. A followed market's star lost its fill: a class cannot fill a Phosphor drawing. WatchStar now draws the star's
     Fill when on (`star` in `FILL_KEYS`).
  3. R-WEIGHT at 27px and up: RewardBurst's 36px glyphs (trophy, shieldcheck, resolved, star) and the cashback coins
     now ship Regular, where they fell back to Bold.
  4. The category Other, and any category the map does not know, drew the board's key. It read as "All" beside it and
     as the board tab. It has its own key, `assorted` (Phosphor `shapes`).
  5. Proposals: W2 had moved only the hub row to the lexicon's lightbulb, leaving three marks. Now `idea` is on every
     player-facing proposals mark: the page header and its loading states, the promo card, the avatar menu.
  6. `.g-ring` swings from Phosphor's bell crown (7.8125%, not the hand-drawn 15%). `test:glyph-motion` §5 reads the
     pivot from the drawing.
- **W2's screenshot review** (2026-10-17). Four readers went through every before/after tile, 204 pairs from the parity
  runs, each tile's changed regions zoomed 3× by `w2tiles/tilediff.mjs`. They found no blank, clipped or off-centre
  glyph. Fixed here:
  1. The LIVE strip's pause read as "00": two hollow bars at 14px beside the run's mono text. Its pause and play are now
     solid (`tier="fill"`, `pause` in `FILL_KEYS`).
  2. The journey bell's count badge touched Phosphor's bigger dome: 0.16px at rest, and the fill on the outline at the
     pulse's peak. It rose 1px (`top: -4px`), giving 0.94px at rest and 0.33px for "99+" at the peak.
     `test:journey-shell` 7.bell′ reads both from the drawing, with a plant at −3.
  3. The lexicon, completed where W2 had moved only the hub row:
     - limits and breaks draw `limits` on the help card, the profile row and the responsible-gambling page's header (a
       shield and a gear before);
     - the profile's Msaada row draws the hub's `headset` (a heartbeat before);
     - /fairness wears its hub row's `attestation` (a shield-check before);
     - the 404 page's Masoko card draws the board's `markets` (a bar chart before);
     - a resolved journey card's tag is `resolved`, the seal (a check-circle before).
  4. Weather is `cloud-sun`: `cloud-rain` at 11–13px read as a speech balloon.
  5. Two guards W2 had turned red, fixed:
     - `test:chart-one-home` names `glyphs.tsx`: its marks among words draw a static centreline in a `d={}`;
     - `test:orphans` now reaches `scripts/glyphs/`, through imports with their extensions and
       `npm run glyphs:parity-entries`.
- **Seen and left, with reasons:**
  - The journey's Akaunti tab person is 17px wide beside the other tabs' 14px: Phosphor's `user` fills 216/256 of its
    box, the others 184. R-RAIL (4B) redraws the tab bars at 24px in W3, which balances the four there.
  - The receipt at 14–16px reads close to a message box. `file-text` is the documents' glyph, and the other receipt
    drawings read worse. Its words name it everywhere it is drawn; W5's money doors give it a plate.
  - Glyph boxes 1–2px wider move their neighbours by as much: buttons, chips, a search field's placeholder. Nothing
    wraps; the parity entries name every move in the classic shell.
  - The market card's 140px category watermark draws Bold: it is drawn at `s=24` and scaled by CSS, and W5 retires it.
  - The inline shell symbols also travel in the page's RSC payload, as every server-rendered element does; brotli
    compresses the twin.
  - The rail coin's drawn "+" sits beside the header's ↓ deposit; W5 brings the one deposit glyph.
  - A missing sprite cannot be pinned at the edge: production answers a 404 under `/icons/` with `private, no-cache,
    no-store` (Cloudflare `BYPASS`), and only a real file gets the year-long `immutable`.
  - The plan's 2G film strip asked whether the chrome would be blank on a slow first visit. The inline shell (§9)
    answers it by design; content glyphs come in one immutable file, 17 KB brotli.
- **Every guard that read the hand-drawn entries is re-pointed** at the drawings as shipped, through one shared reader
  (`scripts/lib/glyph-drawings.mts`): r4d, r4e, r5a, r5b, r7c, r8a, r9a, r10, journey-home, journey-shell,
  measure-system, offline-neutral, pager-reach, wallet-reach, glyph-motion's header. Old tile numbers stay as history;
  Phosphor's numbers are pinned from the drawings; the hand-drawn controls and plants are kept verbatim. r9a §1.3 names
  the 19 drawings Phosphor centres by eye, the Fill play among them (their offsets pinned). Seen on the way and fixed: `red:journey-shell` was red
  on `main` (a plant's needle predated the classic row's c3e28b47 spelling), and `test:journey-home` counted a glyph's
  `<use href>` as a link.
- **R-ONE-SOURCE** (Ali, during W2 — §2): AGENTS.md §7, DESIGN_AUTHORITY §K3, the decisions log and the design master
  brief state it; `test:glyph-source` gained §5 (SVG data URIs, a census of one: the Needle's drag cursor) and §6 (every
  image under `public/` named for what it is — 33, none an interface icon but the three PWA shortcuts W7 redraws).
- **DESIGN_AUTHORITY rewritten:** §K3, §S3 rule 3 (the weight law), §C6, §C7, the §M5 heading, the §0d row.
- **Parity:** `qa-classic-shell-parity` reads a sprite's content hash as `~` (an asset hash, as a chunk's), the symbol
  after `#` still compared; its proof is P.1b.
  - The baseline was taken at W2's base, `862aa757`: 52/52, 224 cells.
  - The first compare ran at `4fffe9b1`: 64/68, its four failures the glyph differences.
  - `scripts/glyphs/parity-entries.mjs` generated 21 entries from them into `qa-parity-glyph-swap.generated.mjs`:
    - the header, footer and rail of all 224 matrix cells;
    - the Sell confirm;
    - the book's main, similar rail and LIVE strip;
    - the question page's main, panel and holder.
  - The generator learned two rules on the way:
    - An `auto` margin that absorbs the new width of a glyph the element holds is layout, not style: the question
      header's `ml-auto` row around its Source ↗ mark, 56 cells.
    - When one glyph box rounds to another half pixel in some cells, those cells get a further entry, tried after the
      first: the Swahili language menu's ✓ at 1024px, 4 cells.
  - Left unexplained, correctly: the `/watchlist` card's date line in 4 cells. Its text is the row's seeding moment,
    already masked by `eat-dates` (the 090bbf76 pair proved it differs between servers), but its width still varies
    with the digits. This is a harness gap, not W2. The question page's canonical time before geometry would close it,
    and it is filed for the harness's owner.
- **What `test:all` says about `main`** (`b090e420`'s run: 557/610 green; each failure read, and the non-database
  ones re-run on `main` `862aa757` itself):
  - 27 need a scratch Postgres or a server this machine's battery does not start: `db-scratch` suites, and three
    live drives on :3009.
  - 16 fail on `main` the same way:
    - from the Maswali console: `ui-consistency`, `type-scale`, `measure`, `labels`, `integrity`, `grid-paging`,
      `layout-staleness`, `unsaved-changes`, `failure-reasons`, `predictor-shown`, `house-bot-seam`, `bet-sheet`,
      `spacing-scale`, `eyebrow-roles`, `visual-pass-r5e`; all fixed on `maswali-s4`, and W2 takes them on its rebase;
    - `house-bot-disclosure` 5.1 compares a Windows checkout's CRLF bytes, which are identical to the blob once the CRs
      are dropped.
  - 2 were W2's, `chart-one-home` and `orphans`, fixed in the screenshot review's commit.
- **The release** (`732efbc5`, its proof as a v4 `run` job):
  - typecheck 0 and `next build` 0; every route's first load read, and 6.4–6.5 KB lighter gzipped than W1's.
  - Local `qa:live`: 377 passed, then the machine guard stopped the dev server at 26 MB free during its last section,
    [M]. That section is Millionea's darkness, which W2 does not touch; production `qa:live` reads it again.
  - **Lesson:** Turbopack compiles the whole crawl in native memory that no V8 heap cap bounds. Warm routes one by
    one; a browser step waits for 3.0 GB with the server up; the machine guard is the backstop.
  - Pushed as a fast-forward of `main` at 23:10 UTC on Ali's *"push lov enayhtng please"*.
- **Owed after the push:**
  - release part two: [M] alone, the review's fixes and the checkbox drive, in a real browser;
  - the parity compare at `732efbc5`, its entries regenerated, and the clean compare with `--prove-red`.

  **For W3:** the codegen deletes a superseded sprite; from the first wave that changes a live drawing, the previous
  sprite is kept one release (deploy skew).

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
- **Maswali D2 ✅ (2026-10-17, main `380edd31`):** the R2 delivery is filed at
  `design-system/v6-2026-10-17-millionea/`, and its INHERIT-MANIFEST adopted three hand-drawn glyphs — `sealNil`,
  `sealX` (the rename of `voidX`) and `millionea` (a coronet). **Then Ali ruled (2026-10-17, MASWALI-PLAN §10c, main
  `c218979d`) that Millionea uses NO hand-drawn glyph: every Millionea icon is Phosphor, through `I`** — R-ONE-SOURCE
  for the third product. The Maswali lane will add its keys through `map.ts` and `glyphs:gen` when its S5 starts (its
  list, sent to this session the same day: millionea → diamond, markPending → circle-dashed, reserve → lifebuoy, standIn →
  arrow-bend-down-right, floor → vault, register → notebook, fairness → fingerprint, refund → arrow-u-down-left, howTo →
  book-open-text, cap → stack, finalWeek → flag-checkered, and more). Answered the same day: `pause` is an existing key,
  `lock` draws `lock` (not lock-simple), and seven proposed drawings already belong to a key (`checkCircle`, `xCircle`,
  `coins`, `rotateCcw`, `eye`, `hourglassHalf`, `sofSavings`) — reuse the key or pick another drawing (glyph-map §4).
  Nothing is reserved for Maswali any more; `voidX` is retired in W2. **The Maswali lane adopted the review (MASWALI-PLAN
  §10c, main `d12ab9d7`):** it reuses `checkCircle`, `xCircle`, `coins`, `hourglassHalf`, `rotateCcw`, `eye`, `lock` and
  `sealCheck`, and adds 13 keys through `map.ts` and `glyphs:gen` at its S5 — `millionea` diamond, `markPending`
  circle-dashed, `reserve` lifebuoy, `standIn` arrow-bend-down-right, `carry` arrow-bend-double-up-right, `floor` vault,
  `register` notebook, `commitment` fingerprint, `refund` arrow-u-down-left, `salesPaused` pause-circle, `howTo`
  book-open-text, `cap` stack, `finalWeek` flag-checkered — each re-checked free in 2.1.1's four weights. Its draft key
  `fairness` was renamed `commitment` (main `ce752dc4`): it marks Millionea's own ticket proof (each ticket fixed at the
  week's close as a salted commitment and a Merkle root, MR-13), not the platform's resolution proof — /fairness keeps
  `attestation` (its hub row) and `shieldcheck` (its page head).
- **Vodacom** (S14–S16 open): classic-shell changes reach `main` as named parity entries, so its branches inherit them on
  rebase. A wave touching home or cards checks `git log` and the worktrees first and goes after that lane's merge.
- **Parallel sessions:** own worktree; heavy Node only through the machine's lock; stage by name; never `git add -A`.

## §7 · Seen on the way (not icons — for their own lanes)
- The chat button covers content on many phone tiles (the hub's "Kiswahili ›", a toggle, a card's time-left).
- The Needle disc sits half off-screen over content on most phone tiles.
- At 320 px the header drops the ⊕ on "Weka pesa" and "Tiketi zangu" wraps to two lines.
- **For the owner of `qa-classic-shell-parity` (found 2026-10-17 in W2's compare):** a book cell's server-rendered EAT
  moment is masked as text (`eat-dates`), but its geometry is not. The `/watchlist` card's date line (`.mcardp-timeleft`,
  `data-market-part="time"`) is the row's seeding moment, and Inter's digits are not tabular, so its width, and the
  `ml-auto` row around it, differ between any two fresh servers whose moments differ in digits. W2's compare saw 78px
  against 82px, in the 4 player `/watchlist` cells.
  The question page already solves this: `break-end-clock` writes one canonical same-format time before geometry,
  calibrated from the ff8c pair. The same treatment for book cells would close it; the 090bbf76 pair already proves the
  moments differ.

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
